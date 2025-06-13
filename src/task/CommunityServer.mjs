import { DeployAdvanced } from 'flowmcpServers'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

class CommunityServer {
    static start({ silent, arrayOfSchemas, serverConfig, envObject, managerVersion }) {
        const { serverType, app, mcps, events, argv } = DeployAdvanced.init({
            silent,
            arrayOfSchemas,
            serverConfig,
            envObject
        })

        const { landingPage: { name, description }, routes } = serverConfig

        const preparedRoutes = routes
            .map( ( route ) => {
                const { name, description, routePath, bearerIsPublic, bearerToken } = route
                const { SERVER_URL } = envObject
                const url = new URL( routePath, SERVER_URL )
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

        DeployAdvanced.start()
        return true
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
                            .readFileSync( filePath, 'utf8' )
                            .replaceAll('{{HEADLINE}}', name )
                            .replaceAll('{{DESCRIPTION}}', description )
                            .replaceAll('{{URL}}', url )
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


export { CommunityServer}