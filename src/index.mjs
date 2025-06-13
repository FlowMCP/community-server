import { serverConfig } from './data/serverConfig.mjs'
import { DeployAdvanced } from 'flowmcpServers'
import express from 'express'
import crypto from 'crypto'
import { exec } from 'child_process';


class CommunityServer {
    static start( { silent, arrayOfSchemas, serverConfig, envObject, webhookSecret, pm2Name } ) {
        const { serverType, app, mcps, events, argv } = DeployAdvanced
            .init( { silent, arrayOfSchemas, serverConfig, envObject } )
        this.#addWebhook( { app, webhookSecret, pm2Name } )
        this.#addLandingPage( { app } )

        DeployAdvanced.start()
        return true
    }


    static #addWebhook({ app, webhookSecret, pm2Name }) {
        console.log('Webhook secret:', webhookSecret);

        // Middleware: Nur /webhook als raw behandeln
        app.use('/webhook', express.raw({ type: 'application/json' }));

        // Signaturprüfung
        function verifySignature({ req, webhookSecret }) {
            const signature = req.headers['x-hub-signature-256'];
            if (!signature) {
                console.warn('Missing signature header');
                return false;
            }

            const hmac = crypto.createHmac('sha256', webhookSecret);
            const digest = 'sha256=' + hmac.update(req.body).digest('hex');
            return signature === digest;
        }

        app.post('/webhook', (req, res) => {
            // Signatur prüfen
            if (!verifySignature({ req, webhookSecret })) {
                console.warn('Invalid signature');
                return res.status(403).send('Invalid signature');
            }

            let payload;
            try {
                payload = JSON.parse(req.body.toString());
            } catch (e) {
                console.error('Failed to parse JSON payload:', e);
                return res.status(400).send('Invalid JSON');
            }

            console.log('Received GitHub event:', req.headers['x-github-event']);
            console.log('Payload ref:', payload.ref);

            if (payload.ref === 'refs/heads/main') {
                console.log('Triggering deployment...');

                exec(
                    `git pull origin main && npm install && pm2 restart ${pm2Name}`,
                    (err, stdout, stderr) => {
                        if (err) {
                            console.error('Deploy error:', stderr);
                            return res.status(500).send('Deployment failed');
                        }

                        console.log('Deployment output:', stdout);
                        res.status(200).send('Deployment triggered');
                    }
                );
            } else {
                res.status(200).send('No action needed');
            }
        });

        return true;
    }


    static #addLandingPage( { app } ) {
        app.get( '/', ( req, res ) => {
            res.send( '<h1>Welcome to the Community Server</h1>' )
        } )
        return true
    }
}


export { CommunityServer }

