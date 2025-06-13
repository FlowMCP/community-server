import { serverConfig } from './data/serverConfig.mjs'
import { DeployAdvanced } from 'flowmcpServers'
import express from 'express'


class CommunityServer {
    static start( { silent, arrayOfSchemas, serverConfig, envObject, webhookSecret } ) {
        const { serverType, app, mcps, events, argv } = DeployAdvanced
            .init( { silent, arrayOfSchemas, serverConfig, envObject } )
        this.#addWebhook( { app, webhookSecret } )
        this.#addLandingPage( { app } )

        DeployAdvanced.start()
        return true
    }


    static #addWebhook( { app, webhookSecret } ) {
        function verifySignature( { req, body, webhookSecret } ) {
            const signature = req.headers['x-hub-signature-256']
            const hmac = crypto.createHmac( 'sha256', webhookSecret )
            const digest = 'sha256=' + hmac.update( body ).digest( 'hex' )
            return signature === digest
        }

        app.use( '/webhook', express.raw( { type: '*/*' } ) )
        app.post( '/webhook', ( req, res ) => {
            const body = req.body

            if( !verifySignature( { req, body, webhookSecret } ) ) {
                return res.status( 403 ).send( 'Invalid signature' )
            }

            const payload = JSON.parse( body.toString() )
            if( payload.ref === 'refs/heads/main' ) {
                    exec(`
                        git pull origin main &&
                        npm install &&
                        pm2 restart my-app
                    `, ( err, stdout, stderr ) => {
                    if( err ) {
                        console.error( 'Deploy error:', stderr )
                        return res.status( 500 ).send( 'Deployment failed' )
                    }
                    console.log( 'Deployment output:', stdout )
                    res.status( 200 ).send( 'Deployment triggered' )
                } )
            } else {
                res.status( 200 ).send( 'No action needed' )
            }
        } )

        return true
    }


    static #addLandingPage( { app } ) {
        app.get( '/', ( req, res ) => {
            res.send( '<h1>Welcome to the Community Server</h1>' )
        } )
        return true
    }
}


export { CommunityServer }

