import express from 'express';
import crypto from 'crypto';
import { exec } from 'child_process';


class WebhookServer {
    static start( { webhookSecret, webhookPort, pm2Name, managerVersion } ) {
        const app = express()
        this.#addWebhookRoute( { app, webhookSecret, pm2Name, managerVersion } )

        app.listen( webhookPort, () => {
            console.log(`🔒 Webhook server listening at http://localhost:${webhookPort}/webhook`);
        } )

        return true
    }


    static #addWebhookRoute({ app, webhookSecret, pm2Name, managerVersion } ) {
        app.get( '/webhook', ( req, res ) => {
            console.log( '🔒 Endpoint accessed' )
            res.status( 200 ).send( `Webhook endpoint is active: ${managerVersion}` )
        } )

        app.post( '/webhook', express.raw({ type: 'application/json' }), ( req, res ) => {
            console.log( '✅ Webhook received' )

            const signature = req.headers['x-hub-signature-256']

            if( !signature || !Buffer.isBuffer( req.body ) ) {
                console.warn( '❌ Signature missing or body is not a Buffer' )
                return res.status( 400 ).send( 'Invalid request' )
            }

            let digest
            try {
                digest = 'sha256=' + crypto
                    .createHmac( 'sha256', webhookSecret )
                    .update( req.body )
                    .digest( 'hex' )
            } catch( err ) {
                console.error( '❌ HMAC error:', err )
                return res.status( 500 ).send( 'HMAC failed' )
            }

            if( digest !== signature ) {
                console.warn( '❌ Signature mismatch' )
                return res.status( 403 ).send( 'Invalid signature' )
            }

            let payload
            try {
                payload = JSON.parse( req.body.toString( 'utf8' ) )
            } catch ( err ) {
                console.error( '❌ JSON parse error:', err )
                return res.status( 400 ).send( 'Invalid JSON' )
            }

            const event = req.headers['x-github-event']
            console.log( `📩 GitHub event: ${event}` )
            console.log( `🎯 Ref: ${payload.ref}` )

            if (event === 'release' && payload.action === 'published') {
                console.log('📦 New release published:', payload.release?.tag_name);

                exec(
                    `git pull origin main && npm install && pm2 restart ${pm2Name}`, 
                    ( err, stdout, stderr ) => {
                        if( err ) {
                            console.error( '❌ Deploy failed:', stderr )
                            return res.status( 500 ).send( 'Deployment failed' )
                        }

                        console.log( '✅ Deploy successful:\n', stdout )
                        return res.status( 200 ).send( 'Deployment triggered' )
                    } 
                )
            } else {
                console.log( 'ℹ️ No action for this event/ref.' )
                return res.status( 200 ).send( 'No action needed' )
            }
        } )
    }
}

export { WebhookServer }
