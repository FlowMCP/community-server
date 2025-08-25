import { CommunityServer } from './task/CommunityServer.mjs'
import { WebhookServer } from './task/WebhookServer.mjs'
// Old imports removed - using root serverConfig.mjs now


import fs from 'fs'


class ServerManager {
    static async start( { silent, stageType, objectOfSchemaArrays, arrayOfSchemas, serverConfig, envObject, managerVersion, webhookSecret, webhookPort, pm2Name, x402Config, x402Credentials, x402PrivateKey } ) {
        // Backwards compatibility: convert arrayOfSchemas to objectOfSchemaArrays if needed
        let schemasToUse = objectOfSchemaArrays
        
        if( !objectOfSchemaArrays && arrayOfSchemas ) {
            // Legacy mode: create objectOfSchemaArrays from arrayOfSchemas for all routes
            schemasToUse = {}
            const { routes } = serverConfig
            routes
                .forEach( ( route ) => {
                    const { routePath } = route
                    schemasToUse[ routePath ] = arrayOfSchemas
                } )
            
            // Legacy support warning removed for clean test output
        }
        
        await CommunityServer
            .start( { silent, stageType, objectOfSchemaArrays: schemasToUse, serverConfig, envObject, pm2Name, managerVersion, x402Config, x402Credentials, x402PrivateKey } )

        WebhookServer
            .start( { webhookSecret, webhookPort, pm2Name, managerVersion } )

        return true
    }


    static getWebhookEnv( { stageType, serverConfig } ) {
        const { selection } = {
            'selection': [
                [ 'WEBHOOK_SECRET', 'webhookSecret' ],
                [ 'WEBHOOK_PORT',   'webhookPort'   ],
                [ 'PM2_NAME',       'pm2Name'       ],
            ]
        }

        const result = this
            .#loadEnv( { stageType, serverConfig } )
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
                    [ 'payTo1', 'ACCOUNT_DEVELOPMENT2_PUBLIC_KEY' ],
                    [ 'serverProviderUrl', 'BASE_SEPOLIA_ALCHEMY_HTTP' ]
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


    static getServerConfig( { envObject } ) {
        // Legacy method for backward compatibility with tests
        // Returns full serverConfig structure with bearer tokens replaced from envObject
        
        const baseConfig = {
            landingPage: {
                name: 'FlowMCP Community Servers',
                description: 'Community servers for the FlowMCP project, providing access to various networks and functionalities.'
            },
            routes: [
                {
                    routePath: '/eerc20',
                    name: 'Encrypted ERC20',
                    bearerToken: envObject['BEARER_TOKEN__0'] || 'default-token-0'
                },
                {
                    routePath: '/x402',
                    name: 'AgentPays - MCP with M2M Payment', 
                    bearerToken: envObject['BEARER_TOKEN__1'] || 'default-token-1'
                },
                {
                    routePath: '/lukso',
                    name: 'LUKSO Network - Community MCP Server',
                    bearerToken: envObject['BEARER_TOKEN__2'] || 'default-token-2'
                },
                {
                    routePath: '/chainlink/prices',
                    name: 'ChainProbe - Onchain Chainlink Price Feeds',
                    bearerToken: envObject['BEARER_TOKEN__3'] || 'default-token-3'
                }
            ],
            x402: {
                chainId: 84532,
                chainName: 'base-sepolia',
                envSelection: [
                    [ 'facilitatorPrivateKey', 'ACCOUNT_DEVELOPMENT2_PRIVATE_KEY' ],
                    [ 'payTo1', 'ACCOUNT_DEVELOPMENT2_PUBLIC_KEY' ],
                    [ 'serverProviderUrl', 'BASE_SEPOLIA_ALCHEMY_HTTP' ]
                ]
            }
        }

        // Check for missing bearer tokens and warn
        const requiredTokens = ['BEARER_TOKEN__1', 'BEARER_TOKEN__2', 'BEARER_TOKEN__3']
        requiredTokens
            .forEach( ( tokenKey ) => {
                if( !envObject[tokenKey] ) {
                    console.warn( `Missing ${tokenKey} in .env file` )
                }
            } )

        return { serverConfig: baseConfig }
    }


    static getEnvObject( { stageType, serverConfig }) {
        const envObject = this
            .#loadEnv( { stageType, serverConfig } )
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


    static #loadEnv( { stageType, serverConfig } ) {
        const path = serverConfig?.env?.[ stageType ]
        if( !path ) {
            console.error( `No environment file found for stage type: ${stageType}` )
            throw new Error( `No environment file found for stage type: ${stageType}` )
        }

        try {
            const envFile = fs
                .readFileSync( path, 'utf-8' )
            return envFile
        } catch (error) {
            return ''
        }
    }
}


export { ServerManager }

