import { env } from 'process'
import { CommunityServer } from './task/CommunityServer.mjs'
import { WebhookServer } from './task/WebhookServer.mjs'
// Old imports removed - using root serverConfig.mjs now


import fs from 'fs'


class ServerManager {
    static async start( { silent, stageType, objectOfSchemaArrays, serverConfig, mcpAuthMiddlewareConfig, envObject, managerVersion, webhookSecret, webhookPort, pm2Name, x402Config, x402Credentials, x402PrivateKey } ) {
        await CommunityServer
            .start( { silent, stageType, objectOfSchemaArrays, serverConfig, mcpAuthMiddlewareConfig, envObject, pm2Name, managerVersion, x402Config, x402Credentials, x402PrivateKey } )

        WebhookServer
            .start( { webhookSecret, webhookPort, pm2Name, managerVersion } )

        return true
    }


    static getWebhookEnv( { stageType, envPath } ) {
        const { selection } = {
            'selection': [
                [ 'WEBHOOK_SECRET', 'webhookSecret' ],
                [ 'WEBHOOK_PORT',   'webhookPort'   ],
                [ 'PM2_NAME',       'pm2Name'       ],
            ]
        }

        const result = this
            .#loadEnv( { envPath } )
            .split( "\n" )
            .filter( line => line && !line.startsWith( '#' ) && line.includes( '=' ) )
            .map( line => line.split( '=' ) )
            .reduce( ( acc, [ k, v ] ) => {
                const find = selection.find( ( [ key, _ ] ) => key === k )
                if( find ) { acc[ find[ 1 ] ] = v.trim() }
                return acc
            }, {} )

        selection
            .forEach( ( row ) => {
                const [ key, value ] = row
                if( !result[ value ]  ) { console.log( `Missing ${key} in .env file` ) } 
                return true
            } )

        return result
    }


    static getMcpAuthMiddlewareConfig( { activeRoutes, envObject, silent, stageType, baseUrl } ) {
        // Helper function to resolve environment variables
        function getEnvSecret( { key, envObject } ) {
            let status = false
            let messages = []
            if( !Object.hasOwn( envObject, key ) ) {
                messages.push( `Missing environment variable: ${key}` )
            }
            status = messages.length === 0
            return { status, messages, value: envObject[ key ] }
        }

        const middlewareConfigs = []
        const messages = []

        // Process each route with auth configuration separately
        activeRoutes
            .filter( ( route ) => route.auth && route.auth.enabled && route.auth.authType )
            .forEach( ( route ) => {
                const { routePath, auth, protocol = 'sse' } = route
                const fullRoutePath = routePath + '/' + protocol

                // Create config based on authType following new API structure
                if( auth.authType === 'static-bearer' ) {
                    // Resolve bearer token from env if needed
                    let bearerToken = auth.bearerToken
                    if( typeof bearerToken === 'string' && bearerToken.match( /^[A-Z_]+$/ ) ) {
                        const { status, messages: tokenMessages, value } = getEnvSecret( { key: bearerToken, envObject } )
                        if( !status ) {
                            messages.push( ...tokenMessages )
                            return
                        }
                        bearerToken = value
                    }

                    middlewareConfigs.push( {
                        authType: 'static-bearer',
                        options: { bearerToken },
                        attachedRoutes: [ fullRoutePath ],
                        silent
                    } )
                } else if( auth.authType === 'scalekit' ) {
                    // Process ScaleKit configuration
                    const processedOptions = {}

                    // Process all options, resolving env variables where needed
                    Object.entries( auth.options || {} ).forEach( ( [ key, value ] ) => {
                        if( typeof value === 'string' ) {
                            const regex = /\{\{(.*?)\}\}/
                            const match = value.match( regex )

                            if( match ) {
                                const envKey = match[ 1 ].trim()
                                const { status, messages: envMessages, value: envValue } = getEnvSecret( { key: envKey, envObject } )
                                if( !status ) {
                                    messages.push( ...envMessages )
                                    return
                                }

                                // Don't parse protectedResourceMetadata - ScaleKit expects it as JSON string
                                processedOptions[ key ] = value.replace( `{{${envKey}}}`, envValue )
                            } else {
                                processedOptions[ key ] = value
                            }
                        } else {
                            processedOptions[ key ] = value
                        }
                    } )

                    // Only add if we successfully processed all options
                    if( messages.length === 0 ) {
                        middlewareConfigs.push( {
                            authType: 'scalekit',
                            options: processedOptions,
                            attachedRoutes: auth.attachedRoutes || [ fullRoutePath ],
                            silent
                        } )
                    }
                } else if( auth.authType === 'free-route' ) {
                    // Free route doesn't need middleware
                    return
                } else {
                    messages.push( `Unknown auth type: ${auth.authType} for route ${routePath}` )
                }
            } )

        // Check for errors
        if( messages.length > 0 ) {
            throw new Error( `MCP Auth configuration errors:\n${messages.join( "\n" )}` )
        }

        // Return array of middleware configs for new API
        return { mcpAuthMiddlewareConfig: middlewareConfigs }
    }


    static normalizeUrlForStage( { url, stageType } ) {
        if( stageType === 'production' &&
            url.startsWith('http://') &&
            !url.includes('localhost') ) {
            return url.replace('http://', 'https://')
        }
        return url
    }


    static getX402Credentials( { envObject, x402Config = null } ) {
        const messages = []

        // Import serverConfig synchronously if needed for tests
        let configToUse = x402Config
        if( !configToUse ) {
            // Default x402 config for testing
            configToUse = {
                chainId: 84532,
                chainName: 'base-sepolia',
                envSelection: [
                    [ 'facilitatorPrivateKey', 'ACCOUNT_DEVELOPMENT2_PRIVATE_KEY' ],
                    [ 'payTo1',                'ACCOUNT_DEVELOPMENT2_PUBLIC_KEY'  ],
                    [ 'serverProviderUrl',     'BASE_SEPOLIA_ALCHEMY_HTTP'        ]
                ]
            }
        }
        
        if( !configToUse.envSelection ) {
            return { 
                x402Config: configToUse, 
                x402Credentials: {}, 
                x402PrivateKey: null 
            }
        }
        
        const { envSelection } = configToUse
        const selection = envSelection
            .reduce( ( acc, select ) => {
                const [ varName, envKey ] = select
                if( Array.isArray( envKey ) ) {
                    acc[ varName ] = envKey
                        .map( key => {
                            const item = envObject[ key ]
                            if ( item === undefined ) {
                                messages.push( `Missing environment variable: ${key}` )
                            }
                            return item
                        } )
                } else {
                    acc[ varName ] = envObject[ envKey ]
                }
                return acc
            }, {} )

        if( messages.length > 0 ) {
            throw new Error( `Environment loading failed: ${ messages.join( ', ' ) }` )
        }

        const { x402Credentials, x402PrivateKey } = Object
            .entries( selection )
            .reduce( ( acc, [ key, value ] ) => {
                if( key.toLowerCase().includes( 'privatekey' ) ) {
                    if( acc['x402PrivateKey'] !== null ) { console.warn( `Multiple private keys found, using the first one` ); return acc }
                    acc['x402PrivateKey'] = value !== undefined ? value : null
                } else {
                    acc['x402Credentials'][ key ] = value
                }
                return acc
            }, { 'x402Credentials': {}, 'x402PrivateKey': null } )

        return { x402Config: configToUse, x402Credentials, x402PrivateKey }
    }


    static getEnvObject( { stageType, envPath }) {
        const envObject = this
            .#loadEnv( { envPath } )
            .split( "\n" )
            .filter( line => line && !line.startsWith( '#' ) && line.includes( '=' ) )
            .map( line => line.split( '=' ) )
            .reduce( ( acc, [ k, v ] ) => {
                acc[ k ] = v.trim()
                return acc
            }, {} )

        return { envObject }
    }


    static getPackageVersion() {
        try {
            const packagePath = './package.json'
            const packageContent = fs.readFileSync( packagePath, 'utf-8' )
            const { version: managerVersion } = JSON.parse( packageContent )
            return { managerVersion }
        } catch (error) {
            return { managerVersion: '0.0.0' }
        }
    }


    static getStageType( { argvs } ) {
        const finding = argvs
            .find( arg => arg.startsWith( '--stage=' ) )
        if( !finding ) {
            console.warn( 'No stage type provided, defaulting to "development"' )
            return { stageType: 'development' }
        }
        const stageType = finding.split( '=' )[ 1 ].trim()
        console.log( `Stage type: ${stageType}` )
        return { stageType }
    }


    static #loadEnv( { envPath } ) {
        if( !envPath ) {
            console.error( `No environment file path provided` )
            throw new Error( `No environment file path provided` )
        }

        try {
            const envFile = fs
                .readFileSync( envPath, 'utf-8' )
            return envFile
        } catch (error) {
            console.error( `Error reading environment file: ${envPath}`, error )
            throw new Error( `Error reading environment file: ${envPath}` )
        }
    }
}


export { ServerManager }

