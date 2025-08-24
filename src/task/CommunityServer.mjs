import { Deploy, DeployAdvanced } from 'flowmcpServers'
import { X402Middleware } from 'x402-mcp-middleware'

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import net from 'net'

const __filename = fileURLToPath( import.meta.url )
const __dirname = path.dirname( __filename )


class CommunityServer {
    static async start( { silent, stageType, arrayOfSchemas, serverConfig, envObject, managerVersion, x402Config, x402Credentials, x402PrivateKey } ) {
        const { app, mcps, events, argv, server } = DeployAdvanced
            .init( { silent } )
        
        if( stageType !== 'test' ) {
            const { chainId, chainName, contracts, paymentOptions, restrictedCalls } = x402Config
            const middleware = await X402Middleware
                .create( { chainId, chainName, contracts, paymentOptions, restrictedCalls, x402Credentials, x402PrivateKey } )
            app.use( ( await middleware ).mcp() )
        }

        const { SERVER_URL: rootUrl, SERVER_PORT: serverPort } = envObject
        let serverUrl = null

        if( stageType === 'development' ) {
            serverUrl = `${rootUrl}:${serverPort}`
        } else if( stageType === 'production' ) {
            serverUrl = rootUrl
        } else if( stageType === 'test' ) {
            serverUrl = `${rootUrl}:${serverPort}`
        } else {
            throw new Error( `Unknown stageType: ${stageType}` )
        }

        const { routes } = serverConfig
        
        // Check if port is available before starting server
        await CommunityServer.#checkPortAvailability( { serverPort } )
        
        CommunityServer
            .setHTML( { app, serverConfig, serverUrl, managerVersion } )
        
        try {
            DeployAdvanced
                .start( { routes, arrayOfSchemas, envObject, rootUrl, serverPort } )
        } catch( error ) {
            if( error.code === 'EADDRINUSE' || error.message.includes( 'EADDRINUSE' ) ) {
                console.error( `❌ Port ${serverPort} is already in use!` )
                console.error( `💡 Try one of these solutions:` )
                console.error( `   1. Kill the process using port ${serverPort}: lsof -ti:${serverPort} | xargs kill -9` )
                console.error( `   2. Use a different port in your .community.env: SERVER_PORT=8081` )
                console.error( `   3. Check what's running on port ${serverPort}: lsof -i:${serverPort}` )
                process.exit( 1 )
            }
            throw error
        }
        
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
                const currentRoute = routes.find( r => r.routePath === routePath )
                this.#addLRouteLandingPage( { app, routePath, name, description, urlSse, bearer, currentRoute } )
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

    static #addLRouteLandingPage({ app, routePath, name, description, urlSse, bearer, currentRoute } ) {
        app.get(routePath, (req, res) => {
            try {
                const filePath = path.join(__dirname, './../public', 'detail.html')
                
                const { activateTags = [], includeNamespaces = [] } = currentRoute || {}
                let availableMethods = []
                
                if( activateTags.length > 0 ) {
                    availableMethods = activateTags
                        .map( tag => `<li><strong>${tag}</strong> - Activated tool method</li>` )
                } else if( includeNamespaces.length > 0 ) {
                    availableMethods = includeNamespaces
                        .map( namespace => `<li><strong>${namespace}.*</strong> - All methods from ${namespace} namespace</li>` )
                } else {
                    availableMethods = [`<li>No specific methods configured - check server logs for available tools</li>`]
                }
                
                const availableMethodsHtml = availableMethods.join( '' )
                
                // Extract route name from routePath (e.g. '/lukso' becomes 'lukso')
                const routeName = routePath.replace( /^\//, '' ).replace( /\//g, '_' )

                let html = fs.readFileSync(filePath, 'utf8')
                    .replaceAll('{{HEADLINE}}', name )
                    .replaceAll('{{DESCRIPTION}}', description )
                    .replaceAll('{{URL}}', urlSse )
                    .replaceAll('{{TOKEN}}', bearer )
                    .replaceAll('{{SERVICE_NAME}}', routeName )
                    .replaceAll('{{AVAILABLE_ROUTES}}', availableMethodsHtml )

                res.send(html)
            } catch (err) {
                console.error('Fehler beim Verarbeiten der Landingpage:', err)
                res.status(500).send('Serverfehler')
            }
        })
    }


    static async #checkPortAvailability( { serverPort } ) {
        return new Promise( ( resolve, reject ) => {
            const server = net.createServer()
            
            server.listen( serverPort, ( error ) => {
                if( error ) {
                    if( error.code === 'EADDRINUSE' ) {
                        console.error( `❌ Port ${serverPort} is already in use!` )
                        console.error( `💡 Try one of these solutions:` )
                        console.error( `   1. Kill the process using port ${serverPort}: lsof -ti:${serverPort} | xargs kill -9` )
                        console.error( `   2. Use a different port in your .community.env: SERVER_PORT=8081` )
                        console.error( `   3. Check what's running on port ${serverPort}: lsof -i:${serverPort}` )
                        console.error( `   4. Find available ports: netstat -tuln | grep LISTEN` )
                        process.exit( 1 )
                    }
                    reject( error )
                } else {
                    server.close( () => {
                        console.log( `✅ Port ${serverPort} is available` )
                        resolve()
                    } )
                }
            } )
            
            server.on( 'error', ( error ) => {
                if( error.code === 'EADDRINUSE' ) {
                    console.error( `❌ Port ${serverPort} is already in use!` )
                    console.error( `💡 Try one of these solutions:` )
                    console.error( `   1. Kill the process using port ${serverPort}: lsof -ti:${serverPort} | xargs kill -9` )
                    console.error( `   2. Use a different port in your .community.env: SERVER_PORT=8081` )
                    console.error( `   3. Check what's running on port ${serverPort}: lsof -i:${serverPort}` )
                    console.error( `   4. Find available ports: netstat -tuln | grep LISTEN` )
                    process.exit( 1 )
                }
                reject( error )
            } )
        } )
    }
}


export { CommunityServer }