import { Deploy, DeployAdvanced } from 'flowmcpServers'
import { X402Middleware } from 'x402-mcp-middleware'

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath( import.meta.url )
const __dirname = path.dirname( __filename )


class CommunityServer {
    static async start( { silent, stageType, arrayOfSchemas, serverConfig, envObject, managerVersion, x402Config, x402Credentials, x402PrivateKey } ) {
        const { app, mcps, events, argv, server } = DeployAdvanced
            .init( { silent } )
        const { chainId, chainName, contracts, paymentOptions, restrictedCalls } = x402Config
        const middleware = await X402Middleware
            .create( { chainId, chainName, contracts, paymentOptions, restrictedCalls, x402Credentials, x402PrivateKey } )
        app.use( ( await middleware ).mcp() )

        const { SERVER_URL: rootUrl, SERVER_PORT: serverPort } = envObject
        let serverUrl = null

        if( stageType === 'development' ) {
            serverUrl = `${rootUrl}:${serverPort}`
        } else if( stageType === 'production' ) {
            serverUrl = rootUrl
        } else {
            throw new Error( `Unknown stageType: ${stageType}` )
        }

        const { routes } = serverConfig
        CommunityServer
            .setHTML( { app, serverConfig, serverUrl, managerVersion } )
        DeployAdvanced
            .start( { routes, arrayOfSchemas, envObject, rootUrl, serverPort } )
        return true
    }


    static setHTML( { app, serverConfig, serverUrl, managerVersion } ) {
        const { landingPage: { name, description }, routes } = serverConfig

        const preparedRoutes = routes
            .map( ( route ) => {
                const { name, description, routePath, bearerIsPublic, bearerToken } = route
                const url = new URL( routePath, serverUrl )
                const urlSse = url + '/sse'
                const bearer = !bearerIsPublic ? '***' : bearerToken || ''
                return { name, description, routePath, url, bearer, urlSse }
            } )

        this.#addLandingPage( { app, managerVersion, name, description, preparedRoutes } )
        preparedRoutes
            .forEach( ( route ) => {
                const { name, description, routePath, urlSse, bearer } = route
                this.#addLRouteLandingPage( { app, routePath, name, description, urlSse, bearer  } )
            } )
    }


    static #addLandingPage({ app, managerVersion, name, description, preparedRoutes }) {
        app.get('/', (req, res) => {
            try {
                //             res.send(`Community Server ${managerVersion}`)
                const routes = preparedRoutes
                    .map( ( route ) => {

                        const { name, description, routePath, url, bearer } = route
                        const filePath = path.join( __dirname, './../public', 'route.html' )
                        const html = fs
                            .readFileSync( filePath      , 'utf8'      )
                            .replaceAll( '{{HEADLINE}}'  , name        )
                            .replaceAll('{{DESCRIPTION}}', description )
                            .replaceAll('{{URL}}'        , `.${url.pathname}` )
                        return html
                    } )
                    .join( "\n")

                const filePath = path.join(__dirname, './../public', 'root.html')

                let html = fs
                    .readFileSync(filePath, 'utf8')
                   .replaceAll('{{HEADLINE}}', name )
                   .replaceAll('{{DESCRIPTION}}', description )
                   .replaceAll('{{VERSION}}', managerVersion )
                   .replaceAll('{{ROUTES}}', routes )
                //    .replaceAll('{{URL}}', url )
                //    .replaceAll('{{TOKEN}}', bearer )

                res.send(html)
            } catch (err) {
                console.error('Fehler beim Verarbeiten der Landingpage:', err)
                res.status(500).send('Serverfehler')
            }
        })
    }

    static #addLRouteLandingPage({ app, routePath, name, description, urlSse, bearer } ) {
        app.get(routePath, (req, res) => {
            try {
                const filePath = path.join(__dirname, './../public', 'detail.html')

                let html = fs.readFileSync(filePath, 'utf8')
                    .replaceAll('{{HEADLINE}}', name )
                    .replaceAll('{{DESCRIPTION}}', description )
                    .replaceAll('{{URL}}', urlSse )
                    .replaceAll('{{TOKEN}}', bearer )

                res.send(html)
            } catch (err) {
                console.error('Fehler beim Verarbeiten der Landingpage:', err)
                res.status(500).send('Serverfehler')
            }
        })
    }
}


export { CommunityServer }