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
        console.log('🔒 Webhook setup started. PM2 process:', pm2Name);

        // Middleware: Nur /webhook als raw behandeln (für Signaturprüfung)
        app.use('/webhook', express.raw({ type: 'application/json' }));

        // Signaturprüfung via HMAC SHA-256
        function verifySignature(req, secret) {
            const signature = req.headers['x-hub-signature-256'];
            if (!signature) {
                console.warn('⚠️ Missing signature header');
                return false;
            }

            try {
                const hmac = crypto.createHmac('sha256', secret);
                const digest = 'sha256=' + hmac.update(req.body).digest('hex');
                return signature === digest;
            } catch (e) {
                console.error('❌ Signature verification error:', e);
                return false;
            }
        }

        // Webhook-Endpunkt
        app.post('/webhook', (req, res) => {
            if (!verifySignature(req, webhookSecret)) {
                return res.status(403).send('Invalid signature');
            }

            let payload;
            try {
                payload = JSON.parse(req.body.toString());
            } catch (e) {
                console.error('❌ Failed to parse JSON payload:', e);
                return res.status(400).send('Invalid JSON');
            }

            const event = req.headers['x-github-event'];
            console.log(`📩 Received GitHub event: ${event}`);

            // Ping-Event separat behandeln
            if (event === 'ping') {
                return res.status(200).send('Ping received');
            }

            // Nur auf Pushs an main reagieren
            if (event === 'push' && payload.ref === 'refs/heads/main') {
                console.log('🚀 Triggering deployment...');

                exec(
                    `git pull origin main && npm install && pm2 restart ${pm2Name}`,
                    (err, stdout, stderr) => {
                        if (err) {
                            console.error('❌ Deployment error:', stderr);
                            return res.status(500).send('Deployment failed');
                        }

                        console.log('✅ Deployment successful:\n', stdout);
                        return res.status(200).send('Deployment triggered');
                    }
                );
            } else {
                console.log('ℹ️ No action needed for this event or branch:', payload.ref);
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

