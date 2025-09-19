import { spawn } from 'child_process'
import { OAuth21ScalekitPuppeteerTester } from './OAuth21ScalekitPuppeteerTester.mjs'
import { StaticBearerTester } from './StaticBearerTester.mjs'
import { ConfigManager } from './ConfigManager.mjs'


class LocalTesting {
    static parseArgv( { argv } ) {
        const args = argv.slice( 2 )
        const params = {}

        args.forEach( ( arg ) => {
            const [ key, value ] = arg.split( '=' )
            if( key && value ) {
                params[ key ] = value
            }
        } )

        return params
    }


    static validationArgv( { authType, serverPath, authTypes, serverPaths } ) {
        const { status, messages } = [
            [ authType, authTypes   ],
            [ serverPath, serverPaths ]
        ]
            .reduce( ( acc, [ paramValue, validValues ], index, arr ) => {
                if( !paramValue ) {
                    acc.messages.push( `Missing parameter.` )
                }
                else if( !validValues.includes( paramValue ) ) {
                    acc.messages.push( `Invalid parameter value "${paramValue}". Valid values: ${validValues.join(', ')}` )
                }
                if( index === arr.length - 1 && acc.messages.length === 0 ) {
                    acc.status = true
                }
                return acc
            }, { status: false, messages: [] } )

        return { status, messages }
    }


    static async start( { authType = 'oauth21_scalekit', serverPath = 'tests/manual/test-community-server.mjs' } = {} ) {
        this.#printStart( { authType } )
        const { config } = await ConfigManager.getConfig( { authType } )
        const { baseUrl, port, routePath, silent, browserTimeout } = config
        const fullBaseUrl = `${baseUrl}:${port}`

        const serverProcess = await this.#ensureServer( { fullBaseUrl, serverPath } )

        let result
        switch( authType ) {
            case 'oauth21_scalekit':
                console.log( 'Using OAuth21 ScaleKit authentication flow' )
                // Pass ScaleKit credentials from config to the OAuth tester
                result = await OAuth21ScalekitPuppeteerTester
                    .runTest( {
                        baseUrl: fullBaseUrl,
                        routePath,
                        silent,
                        browserTimeout,
                        clientId: config.clientId,
                        clientSecret: config.clientSecret,
                        providerUrl: config.providerUrl,
                        mcpId: config.mcpId,
                        scope: config.scope
                    } )
                this.#printOAuth21Result( { result } )
                break
            case 'staticBearer':
                console.log( 'Using Static Bearer Token authentication flow' )
                result = await StaticBearerTester
                    .runTest( { baseUrl: fullBaseUrl, routePath, silent, browserTimeout, bearerToken: config.bearerToken } )
                this.#printBearerResult( { result } )
                break
            case 'free':
                console.log( 'Testing free route without authentication' )
                result = await this.#testFreeRoute( { baseUrl: fullBaseUrl, routePath, silent } )
                this.#printFreeResult( { result } )
                break
            default:
                throw new Error( `Unsupported authType: ${authType}` )
        }

        await this.#cleanup( { serverProcess } )

        return result
    }


    static async #testFreeRoute( { baseUrl, routePath, silent } ) {
        const url = `${baseUrl}${routePath}`
        if( !silent ) console.log( `Testing free route at: ${url}` )

        try {
            // Step 1: Test MCP list_tools (try both POST and GET for streamable)
            if( !silent ) console.log( '\n1️⃣  Sending MCP list_tools request...' )

            // First try POST (standard MCP with streamable headers)
            let toolsResponse = await fetch( url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json, text/event-stream'
                },
                body: JSON.stringify( {
                    jsonrpc: '2.0',
                    method: 'tools/list',
                    id: 1
                } )
            } )

            if( !silent ) console.log( `   Initial POST Status: ${toolsResponse.status}` )

            // If POST fails with 406, try GET for streamable transport
            if( toolsResponse.status === 406 ) {
                if( !silent ) console.log( '   POST failed (406), trying GET for streamable transport...' )
                toolsResponse = await fetch( `${url}?method=tools/list&id=1`, {
                    method: 'GET',
                    headers: {
                        'Accept': 'application/json'
                    }
                } )
                if( !silent ) console.log( `   GET Status: ${toolsResponse.status}` )
            }

            // Parse response based on content type
            let toolsData = {}
            const contentType = toolsResponse.headers.get( 'content-type' )

            if( contentType && contentType.includes( 'text/event-stream' ) ) {
                // Parse SSE response for streamable transport
                const responseText = await toolsResponse.text()
                const lines = responseText.split( '\n' )
                const dataLine = lines.find( line => line.startsWith( 'data:' ) )
                if( dataLine ) {
                    const jsonStr = dataLine.substring( 5 ).trim()
                    toolsData = JSON.parse( jsonStr )
                }
            } else {
                // Regular JSON response
                toolsData = await toolsResponse.json()
            }

            const toolsSuccess = toolsResponse.ok && toolsData.result?.tools
            const tools = toolsData.result?.tools || []

            if( !silent ) {
                console.log( `   Final Response Status: ${toolsResponse.status}` )
                console.log( `   Response OK: ${toolsResponse.ok}` )
                console.log( `   Found ${tools.length} tools` )
                if( !toolsResponse.ok ) {
                    console.log( `   Error Response: ${JSON.stringify( toolsData, null, 2 )}` )
                }
            }

            let toolCallResult = null
            // Step 2: Call first tool if available
            if( tools.length > 0 ) {
                if( !silent ) console.log( '\n2️⃣  Calling first available tool...' )
                const firstTool = tools[ 0 ]

                const toolResponse = await fetch( url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json, text/event-stream'
                    },
                    body: JSON.stringify( {
                        jsonrpc: '2.0',
                        method: 'tools/call',
                        params: {
                            name: firstTool.name,
                            arguments: firstTool.name.includes( 'ping' ) ? { message: 'Test from free route' } : {}
                        },
                        id: 2
                    } )
                } )

                // Parse response based on content type
                let toolData = {}
                const toolContentType = toolResponse.headers.get( 'content-type' )

                if( toolContentType && toolContentType.includes( 'text/event-stream' ) ) {
                    // Parse SSE response for streamable transport
                    const responseText = await toolResponse.text()
                    const lines = responseText.split( '\n' )
                    const dataLine = lines.find( line => line.startsWith( 'data:' ) )
                    if( dataLine ) {
                        const jsonStr = dataLine.substring( 5 ).trim()
                        toolData = JSON.parse( jsonStr )
                    }
                } else {
                    // Regular JSON response
                    toolData = await toolResponse.json()
                }
                toolCallResult = {
                    success: toolResponse.ok,
                    toolName: firstTool.name,
                    result: toolData
                }

                if( !silent ) console.log( `   Tool call ${toolResponse.ok ? 'succeeded' : 'failed'}` )
            }

            return {
                baseUrl,
                routePath,
                authType: 'free',
                success: toolsSuccess,
                status: toolsResponse.status,
                tools,
                toolCount: tools.length,
                toolCallResult,
                flowResults: {
                    'MCP Tools List': { success: toolsSuccess, toolCount: tools.length },
                    'Tool Call': toolCallResult || { success: false, message: 'No tools available' }
                }
            }
        } catch( error ) {
            return {
                baseUrl,
                routePath,
                authType: 'free',
                success: false,
                error: error.message,
                flowResults: {
                    'Free Access': { success: false, error: error.message }
                }
            }
        }
    }


    static async #ensureServer( { fullBaseUrl, serverPath } ) {
        console.log( `Starting test server at ${fullBaseUrl}...` )
        const serverProcess = await this.#startServer( { serverPath } )
        console.log( 'Server started successfully!' )

        return serverProcess
    }


    static async #checkServerAvailability( { baseUrl } ) {
        try {
            const controller = new AbortController()
            const timeoutId = setTimeout( () => controller.abort(), 5000 )

            const response = await fetch( baseUrl, {
                method: 'HEAD',
                signal: controller.signal
            } )

            clearTimeout( timeoutId )
            return true
        } catch( error ) {
            return false
        }
    }


    static async #startServer( { serverPath } ) {
        const serverProcess = spawn( 'node', [ serverPath, '--stage=development' ], {
            stdio: 'pipe',
            detached: false
        } )

        return new Promise( ( resolve, reject ) => {
            let serverReady = false
            const timeout = setTimeout( () => {
                if( !serverReady ) {
                    serverProcess.kill()
                    reject( new Error( 'Server startup timeout after 30 seconds' ) )
                }
            }, 30000 )

            serverProcess.stdout.on( 'data', ( data ) => {
                const output = data.toString()
                // Format server output with proper indentation
                const lines = output.trim().split( '\n' )
                lines.forEach( line => {
                    if( line.trim() ) {
                        console.log( `  [Server] ${line}` )
                    }
                } )

                if( ( output.includes( 'Server started on' ) ||
                      output.includes( 'Community Server is running' ) ||
                      output.includes( 'listening on port' ) ||
                      output.includes( 'MCP Discovery endpoints registered' ) ) && !serverReady ) {
                    serverReady = true
                    clearTimeout( timeout )
                    console.log( '\nServer is ready!\n' )

                    setTimeout( () => {
                        resolve( serverProcess )
                    }, 3000 )
                }
            } )

            serverProcess.stderr.on( 'data', ( data ) => {
                console.error( `  [Server Error] ${data.toString().trim()}` )
            } )

            serverProcess.on( 'error', ( error ) => {
                clearTimeout( timeout )
                reject( new Error( `Failed to start server: ${error.message}` ) )
            } )

            serverProcess.on( 'exit', ( code ) => {
                clearTimeout( timeout )
                if( !serverReady ) {
                    reject( new Error( `Server exited early with code ${code}` ) )
                }
            } )
        } )
    }


    static #cleanup( { serverProcess } ) {
        if( serverProcess && serverProcess.pid ) {
            console.log( '' )
            console.log( 'Stopping server...' )

            return new Promise( ( resolve ) => {
                // Set up handlers for process termination
                const onExit = () => {
                    console.log( 'Server stopped.' )
                    resolve()
                }

                serverProcess.on( 'exit', onExit )
                serverProcess.on( 'close', onExit )

                // First try graceful termination
                try {
                    serverProcess.kill( 'SIGTERM' )
                } catch( error ) {
                    console.warn( 'Could not send SIGTERM:', error.message )
                }

                // Force kill after 2 seconds if still running
                setTimeout( () => {
                    if( !serverProcess.killed ) {
                        try {
                            serverProcess.kill( 'SIGKILL' )
                        } catch( error ) {
                            console.warn( 'Could not send SIGKILL:', error.message )
                        }
                    }

                    // Ensure we resolve even if events don't fire
                    setTimeout( () => {
                        if( !serverProcess.killed ) {
                            console.log( 'Server stopped (forced).' )
                        }
                        resolve()
                    }, 1000 )
                }, 2000 )
            } )
        } else {
            console.log( 'No server process to stop.' )
            return Promise.resolve()
        }
    }


    static #printFreeResult( { result } ) {
        console.log( '✅ Free Route Test completed!' )
        console.log( '' )
        console.log( '📊 Result Summary:' )
        console.log( `   Base URL: ${result.baseUrl}` )
        console.log( `   Route: ${result.routePath}` )
        console.log( `   Auth Type: ${result.authType} (no authentication)` )
        console.log( `   Status: ${result.status}` )
        console.log( `   Success: ${result.success}` )
        console.log( `   Tools Found: ${result.toolCount || 0}` )
        console.log( '' )

        // Display tools
        if( result.tools && result.tools.length > 0 ) {
            console.log( '🔧 Available Tools:' )
            result.tools.forEach( ( tool, index ) => {
                console.log( `   ${index + 1}. ${tool.name}: ${tool.description || 'No description'}` )
            } )
            console.log( '' )
        }

        // Display tool call result
        if( result.toolCallResult ) {
            console.log( '🎯 Tool Call Result:' )
            console.log( `   Tool: ${result.toolCallResult.toolName}` )
            console.log( `   Success: ${result.toolCallResult.success}` )
            if( result.toolCallResult.result?.result ) {
                console.log( `   Output: ${JSON.stringify( result.toolCallResult.result.result, null, 2 )}` )
            }
            console.log( '' )
        }

        // Display flow results summary
        console.log( '📋 Flow Results:' )
        Object.entries( result.flowResults )
            .forEach( ( [ step, stepResult ] ) => {
                const success = stepResult.success !== false
                const icon = success ? '✅' : '❌'
                console.log( `   ${icon} ${step}: ${success ? 'SUCCESS' : 'FAILED'}` )
            } )

        console.log( '' )
        console.log( '🎯 Free route test completed successfully!' )
    }


    static #printOAuth21Result( { result } ) {
        console.log( '✅ Test completed successfully!' )
        console.log( '' )
        console.log( '📊 Result Summary:' )
        console.log( `   Base URL: ${result.baseUrl}` )
        console.log( `   Route: ${result.routePath}` )
        console.log( `   Client ID: ${result.clientId}` )
        console.log( '' )

        // Display request chain
        if( result.requestChain ) {
            console.log( '🔗 Request Chain:' )
            Object.entries( result.requestChain )
                .forEach( ( [ step, details ] ) => {
                    console.log( `   ${step}:` )
                    console.log( `     Input: ${JSON.stringify( details.input )}` )
                    console.log( `     Derivation: ${details.derivation}` )
                    console.log( `     Output: ${JSON.stringify( details.output )}` )
                    console.log( '' )
                } )
        }

        // Display flow results with details
        console.log( '📋 Flow Results:' )
        Object.entries( result.flowResults )
            .forEach( ( [ step, stepResult ] ) => {
                const success = stepResult.success !== false
                const icon = success ? '✅' : '❌'
                console.log( `   ${icon} ${step}: ${success ? 'SUCCESS' : 'FAILED'}` )

                // Show details for OAuth steps
                if( step === 'Unauthorized Access' && stepResult.status ) {
                    console.log( `      Status Code: ${stepResult.status}` )
                    console.log( `      Message: ${stepResult.message}` )
                    if( stepResult.serverError ) {
                        console.log( `      Server Response: "${stepResult.serverError}"` )
                    }
                }
                if( step === 'OAuth Discovery' && stepResult.metadata ) {
                    console.log( `      Authorization Endpoint: ${stepResult.metadata.authorization_endpoint || 'N/A'}` )
                    console.log( `      Token Endpoint: ${stepResult.metadata.token_endpoint || 'N/A'}` )
                }
                if( step === 'Client Registration' && stepResult.clientId ) {
                    console.log( `      Client ID: ${stepResult.clientId}` )
                }
                if( !success && stepResult.error ) {
                    console.log( `      Error: ${stepResult.error}` )
                }
            } )

        console.log( '' )
        console.log( '🎯 Full result object available in returned value' )
    }


    static #printBearerResult( { result } ) {
        console.log( '✅ Bearer Token Test completed successfully!' )
        console.log( '' )
        console.log( '📊 Result Summary:' )
        console.log( `   Base URL: ${result.baseUrl}` )
        console.log( `   Route: ${result.routePath}` )
        console.log( `   Auth Type: ${result.authType}` )
        console.log( '' )

        // Display bearer token details
        if( result.summary ) {
            console.log( '🔑 Bearer Token Details:' )
            console.log( `   Status: ${result.summary.status}` )
            console.log( `   Token Type: ${result.summary.tokenType}` )
            console.log( `   Token Length: ${result.summary.tokenLength} characters` )
            console.log( `   Token Preview: ${result.summary.tokenPreview}` )
            console.log( '' )
            console.log( '🔐 Full Bearer Token:' )
            console.log( `   ${result.summary.fullBearerToken}` )
            console.log( '' )
        }

        // Display tools found
        if( result.tools && result.tools.length > 0 ) {
            console.log( '🔧 Available Tools:' )
            result.tools.forEach( ( tool, index ) => {
                console.log( `   ${index + 1}. ${tool.name}: ${tool.description || 'No description'}` )
            } )
            console.log( '' )
        }

        // Display usage examples
        if( result.bearerTokenDemo ) {
            console.log( '💡 Usage Examples:' )
            console.log( `   API Usage: ${result.bearerTokenDemo.apiUsageExample}` )
            console.log( `   Curl Command: ${result.bearerTokenDemo.curlExample}` )
            console.log( '' )
        }

        // Display flow results with details
        console.log( '📋 Flow Results:' )
        Object.entries( result.flowResults )
            .forEach( ( [ step, stepResult ] ) => {
                const success = stepResult.success !== false
                const icon = success ? '✅' : '❌'
                console.log( `   ${icon} ${step}: ${success ? 'SUCCESS' : 'FAILED'}` )

                // Show details for each step
                if( step === 'Unauthorized Access' && stepResult.status ) {
                    console.log( `      Status Code: ${stepResult.status}` )
                    console.log( `      Message: ${stepResult.message}` )
                    if( stepResult.serverError ) {
                        console.log( `      Server Response: "${stepResult.serverError}"` )
                    }
                }
                if( step === 'MCP Tools List' && stepResult.toolCount ) {
                    console.log( `      Tools Found: ${stepResult.toolCount}` )
                }
                if( step === 'Tool Call' && stepResult.result ) {
                    console.log( `      Tool: ${stepResult.toolName}` )
                    console.log( `      Response: ${JSON.stringify( stepResult.result, null, 2 ).split( '\n' ).join( '\n      ' )}` )
                }
            } )

        console.log( '' )
        console.log( '🎯 Ready to use in API calls!' )
    }


    static #printStart( { authType } ) {
        console.log( '🚀 Starting Community Server Test' )
        console.log( `📋 Testing auth type: ${authType}` )

        if( authType === 'oauth21_scalekit' ) {
            console.log( '   0. Test unauthorized MCP access (expect 401/403 rejection)' )
            console.log( '   1. Perform OAuth discovery from base URL' )
            console.log( '   2. Register client using discovery results' )
            console.log( '   3. Prepare authorization using real metadata' )
            console.log( '   4. Open browser for real authorization flow' )
            console.log( '   5. Exchange real authorization code for tokens' )
            console.log( '   6. Validate tokens using real userinfo endpoint' )
            console.log( '   7. Send MCP list_tools request to fetch available tools' )
            console.log( '   8. Call the first tool from the list using MCP tools/call' )
        } else if( authType === 'staticBearer' ) {
            console.log( '   1. Fetch bearer token from discovery endpoint' )
            console.log( '   2. Test authenticated access with bearer token' )
            console.log( '   3. Send MCP list_tools request' )
            console.log( '   4. Call available tools' )
        } else if( authType === 'free' ) {
            console.log( '   1. Test direct access without authentication' )
            console.log( '   2. Send MCP list_tools request' )
            console.log( '   3. Call available tools' )
        }

        console.log( '' )
    }
}


export { LocalTesting }