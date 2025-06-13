import { CommunityServer } from './task/CommunityServer.mjs'
import { WebhookServer } from './task/WebhookServer.mjs'
import fs from 'fs'


class ServerManager {
    static start( { silent, arrayOfSchemas, serverConfig, envObject, managerVersion, webhookSecret, webhookPort, pm2Name } ) {
        console.log( 'ServerManager initialized:', managerVersion )
        CommunityServer
            .start( { silent, arrayOfSchemas, serverConfig, envObject, pm2Name, managerVersion } )
        WebhookServer
            .start( { webhookSecret, webhookPort, pm2Name, managerVersion } )

        return true
    }


    static getWebhookEnv( { path='.example.env' }={} ) {
        const { selection } = {
            'selection': [
                [ 'WEBHOOK_SECRET', 'webhookSecret' ],
                [ 'WEBHOOK_PORT', 'webhookPort' ],
                [ 'PM2_NAME', 'pm2Name' ],
            ]
        }

        const result = fs
            .readFileSync( path, 'utf-8' )
            .split( "\n" )
            .map( line => line.split( '=' ) )
            .reduce( ( acc, [ k, v ] ) => {
                const find = selection.find( ( [ key, _ ] ) => key === k )
                if( find ) {  acc[ find[ 1 ] ] = v.trim()  }
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


    static getEnvObject( { path='.example.env' }={} ) {
        const envObject = fs
            .readFileSync( path, 'utf-8' )
            .split( "\n" )
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
}


export { ServerManager }

