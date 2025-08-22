import { CommunityServer } from './task/CommunityServer.mjs'
import { WebhookServer } from './task/WebhookServer.mjs'
import { serverConfig } from './data/serverConfig.mjs'
import { config } from './data/config.mjs'


import fs from 'fs'


class ServerManager {
    static async start( { silent, stageType, arrayOfSchemas, serverConfig, envObject, managerVersion, webhookSecret, webhookPort, pm2Name, x402Config, x402Credentials, x402PrivateKey } ) {
        await CommunityServer
            .start( { silent, stageType, arrayOfSchemas, serverConfig, envObject, pm2Name, managerVersion, x402Config, x402Credentials, x402PrivateKey } )

        WebhookServer
            .start( { webhookSecret, webhookPort, pm2Name, managerVersion } )

        return true
    }


    static getWebhookEnv( { stageType } ) {
        const { selection } = {
            'selection': [
                [ 'WEBHOOK_SECRET', 'webhookSecret' ],
                [ 'WEBHOOK_PORT',   'webhookPort'   ],
                [ 'PM2_NAME',       'pm2Name'       ],
            ]
        }

        const result = this
            .#loadEnv( { stageType } )
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
                const [ _, value ] = row
                if( !result[ value ]  ) { console.log( `Missing ${key} in .env file` ) } 
                return true
            } )

        return result
    }


    static getX402Credentials( { envObject } ) {
        const messages = []

        const { envSelection } = serverConfig['x402']
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
                    acc['x402PrivateKey'] = value
                } else {
                    acc['x402Credentials'][ key ] = value
                }
                return acc
            }, { 'x402Credentials': {}, 'x402PrivateKey': null } )

        const x402Config = serverConfig['x402']

        return { x402Config, x402Credentials, x402PrivateKey }
    }


    static getServerConfig( { envObject } ) {
        const _new = { ...serverConfig }
        _new['routes'] = _new['routes']
            .map( ( route, index ) => {
                const search = `BEARER_TOKEN__${index}`
                const value = envObject[ search ]
                if( !value ) {
                    console.warn( `Missing ${search} in .env file` )
                    return route
                }
               route['bearerToken'] = value
                return route
            } )

        return { serverConfig: _new  }
    }


    static getEnvObject( { stageType }) {
        const envObject = this
            .#loadEnv( { stageType } )
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
        const { version: managerVersion } = JSON.parse( fs.readFileSync( './package.json', 'utf-8' ) )
        return { managerVersion }
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


    static #loadEnv( { stageType } ) {
        const path = config['env'][ stageType ]
        if( !path ) {
            console.error( `No environment file found for stage type: ${stageType}` )
            return false
        }

        const envFile = fs
            .readFileSync( path, 'utf-8' )

        return envFile
    }
}


export { ServerManager }

