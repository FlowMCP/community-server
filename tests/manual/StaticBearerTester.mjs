class StaticBearerTester {
    static async runTest( { baseUrl, routePath, silent = false, browserTimeout = 30000, bearerToken = null } ) {
        const result = {
            baseUrl,
            routePath,
            authType: 'staticBearer',
            flowResults: {},
            summary: {}
        }

        try {
            // Step 1: Test unauthorized access (should fail)
            if( !silent ) console.log( '\n1️⃣  Testing unauthorized access...' )
            const unauthorizedResult = await this.#testUnauthorizedAccess( { baseUrl, routePath } )
            result.flowResults[ 'Unauthorized Access' ] = unauthorizedResult

            // Step 2: Use provided bearer token or fetch from discovery
            if( !silent ) console.log( '\n2️⃣  Getting bearer token...' )
            const tokenResult = bearerToken
                ? { success: true, bearerToken, source: 'provided' }
                : await this.#fetchBearerToken( { baseUrl } )
            result.flowResults[ 'Token Discovery' ] = tokenResult
            result.bearerToken = tokenResult.bearerToken

            // Prepare summary
            result.summary = {
                status: 'ready',
                tokenType: 'Bearer',
                tokenLength: tokenResult.bearerToken?.length || 0,
                tokenPreview: tokenResult.bearerToken ?
                    `${tokenResult.bearerToken.substring( 0, 8 )}...${tokenResult.bearerToken.slice( -4 )}` :
                    'N/A',
                fullBearerToken: tokenResult.bearerToken
            }

            // Step 3: Test authorized access with bearer token
            if( !silent ) console.log( '\n3️⃣  Testing authorized access with bearer token...' )
            const authorizedResult = await this.#testAuthorizedAccess( {
                baseUrl,
                routePath,
                bearerToken: tokenResult.bearerToken
            } )
            result.flowResults[ 'Authorized Access' ] = authorizedResult

            // Step 4: Fetch MCP tools list
            if( !silent ) console.log( '\n4️⃣  Fetching MCP tools list...' )
            const toolsResult = await this.#fetchMcpTools( {
                baseUrl,
                routePath,
                bearerToken: tokenResult.bearerToken,
                silent
            } )
            result.flowResults[ 'MCP Tools List' ] = toolsResult
            result.tools = toolsResult.tools

            // Step 5: Call first available tool
            if( toolsResult.tools && toolsResult.tools.length > 0 ) {
                if( !silent ) console.log( '\n5️⃣  Calling first available tool...' )
                const toolCallResult = await this.#callMcpTool( {
                    baseUrl,
                    routePath,
                    bearerToken: tokenResult.bearerToken,
                    toolName: toolsResult.tools[ 0 ].name,
                    silent
                } )
                result.flowResults[ 'Tool Call' ] = toolCallResult
            }

            // Prepare demo commands
            result.bearerTokenDemo = {
                apiUsageExample: `fetch('${baseUrl}${routePath}', { headers: { 'Authorization': 'Bearer ${tokenResult.bearerToken}' } })`,
                curlExample: `curl -H "Authorization: Bearer ${tokenResult.bearerToken}" ${baseUrl}${routePath}`
            }

            result.success = true
            return result

        } catch( error ) {
            console.error( '❌ Test failed:', error.message )
            result.success = false
            result.error = error.message
            return result
        }
    }


    static async #testUnauthorizedAccess( { baseUrl, routePath } ) {
        try {
            const response = await fetch( `${baseUrl}${routePath}`, {
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

            // Parse response to get error message
            let errorMessage = ''
            const contentType = response.headers.get( 'content-type' )

            if( contentType && contentType.includes( 'text/event-stream' ) ) {
                const responseText = await response.text()
                const lines = responseText.split( '\n' )
                const dataLine = lines.find( line => line.startsWith( 'data:' ) )
                if( dataLine ) {
                    const jsonStr = dataLine.substring( 5 ).trim()
                    const data = JSON.parse( jsonStr )
                    errorMessage = data.error?.message || 'No error message'
                }
            } else if( contentType && contentType.includes( 'application/json' ) ) {
                const data = await response.json()
                errorMessage = data.error?.message || data.message || 'No error message'
            } else {
                const text = await response.text()
                errorMessage = text || 'No error message'
            }

            console.log( `   ❌ Server rejected request: ${response.status} - ${errorMessage}` )

            return {
                success: response.status === 401 || response.status === 403,
                status: response.status,
                message: response.status === 401 || response.status === 403
                    ? 'Correctly rejected unauthorized access'
                    : 'Unexpected response to unauthorized access',
                serverError: errorMessage
            }
        } catch( error ) {
            return { success: false, error: error.message }
        }
    }


    static async #fetchBearerToken( { baseUrl } ) {
        try {
            // Try to fetch bearer token from discovery endpoint
            const discoveryUrl = `${baseUrl}/.well-known/oauth-protected-resource`
            const response = await fetch( discoveryUrl )

            if( response.ok ) {
                const data = await response.json()
                if( data.bearer_token ) {
                    return {
                        success: true,
                        bearerToken: data.bearer_token,
                        source: 'discovery'
                    }
                }
            }

            // Fallback: Try auth endpoint
            const authResponse = await fetch( `${baseUrl}/auth` )
            if( authResponse.ok ) {
                const authData = await authResponse.json()
                if( authData.bearer_token ) {
                    return {
                        success: true,
                        bearerToken: authData.bearer_token,
                        source: 'auth'
                    }
                }
            }

            // If no token found in discovery, use environment token for testing
            // This would typically come from ConfigManager
            console.log( '   ⚠️  No bearer token in discovery, using test token' )
            return {
                success: true,
                bearerToken: process.env.BEARER_TOKEN_MASTER || 'test-bearer-token',
                source: 'environment'
            }

        } catch( error ) {
            return { success: false, error: error.message }
        }
    }


    static async #testAuthorizedAccess( { baseUrl, routePath, bearerToken } ) {
        try {
            const response = await fetch( `${baseUrl}${routePath}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json, text/event-stream',
                    'Authorization': `Bearer ${bearerToken}`
                },
                body: JSON.stringify( {
                    jsonrpc: '2.0',
                    method: 'initialize',
                    params: {
                        protocolVersion: '2024-11-05',
                        capabilities: {},
                        clientInfo: {
                            name: 'StaticBearerTester',
                            version: '1.0.0'
                        }
                    },
                    id: 1
                } )
            } )

            if( !response.ok ) {
                return {
                    success: false,
                    status: response.status,
                    message: `Authorization failed: ${response.status}`
                }
            }

            // Parse response based on content type
            let data = {}
            const contentType = response.headers.get( 'content-type' )

            if( contentType && contentType.includes( 'text/event-stream' ) ) {
                const responseText = await response.text()
                const lines = responseText.split( '\n' )
                const dataLine = lines.find( line => line.startsWith( 'data:' ) )
                if( dataLine ) {
                    const jsonStr = dataLine.substring( 5 ).trim()
                    data = JSON.parse( jsonStr )
                }
            } else {
                data = await response.json()
            }

            return {
                success: true,
                status: response.status,
                message: 'Successfully authorized with bearer token',
                serverInfo: data.result?.serverInfo
            }
        } catch( error ) {
            return { success: false, error: error.message }
        }
    }


    static async #fetchMcpTools( { baseUrl, routePath, bearerToken, silent = false } ) {
        try {
            const response = await fetch( `${baseUrl}${routePath}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json, text/event-stream',
                    'Authorization': `Bearer ${bearerToken}`
                },
                body: JSON.stringify( {
                    jsonrpc: '2.0',
                    method: 'tools/list',
                    id: 2
                } )
            } )

            if( !response.ok ) {
                throw new Error( `MCP tools fetch failed: ${response.status}` )
            }

            // Parse response based on content type
            let data = {}
            const contentType = response.headers.get( 'content-type' )

            if( contentType && contentType.includes( 'text/event-stream' ) ) {
                const responseText = await response.text()
                const lines = responseText.split( '\n' )
                const dataLine = lines.find( line => line.startsWith( 'data:' ) )
                if( dataLine ) {
                    const jsonStr = dataLine.substring( 5 ).trim()
                    data = JSON.parse( jsonStr )
                }
            } else {
                data = await response.json()
            }

            const tools = data.result?.tools || []
            if( !silent && tools.length > 0 ) {
                console.log( `   ✓ Found ${tools.length} tools:` )
                tools.forEach( ( tool, index ) => {
                    console.log( `     ${index + 1}. ${tool.name}` )
                } )
            }

            return {
                success: true,
                tools,
                toolCount: tools.length
            }
        } catch( error ) {
            return { success: false, error: error.message }
        }
    }


    static async #callMcpTool( { baseUrl, routePath, bearerToken, toolName, silent = false } ) {
        try {
            // Special handling for ping tool
            const params = toolName.includes( 'ping' ) ?
                { name: toolName, arguments: { message: 'Test from StaticBearerTester' } } :
                { name: toolName, arguments: {} }

            const response = await fetch( `${baseUrl}${routePath}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json, text/event-stream',
                    'Authorization': `Bearer ${bearerToken}`
                },
                body: JSON.stringify( {
                    jsonrpc: '2.0',
                    method: 'tools/call',
                    params,
                    id: 3
                } )
            } )

            if( !response.ok ) {
                throw new Error( `Tool call failed: ${response.status}` )
            }

            // Parse response based on content type
            let data = {}
            const contentType = response.headers.get( 'content-type' )

            if( contentType && contentType.includes( 'text/event-stream' ) ) {
                const responseText = await response.text()
                const lines = responseText.split( '\n' )
                const dataLine = lines.find( line => line.startsWith( 'data:' ) )
                if( dataLine ) {
                    const jsonStr = dataLine.substring( 5 ).trim()
                    data = JSON.parse( jsonStr )
                }
            } else {
                data = await response.json()
            }

            if( !silent && data.result ) {
                console.log( `   ✓ Tool '${toolName}' called successfully` )
                if( data.result.content && data.result.content[ 0 ] ) {
                    const content = data.result.content[ 0 ]
                    if( content.type === 'text' ) {
                        console.log( `   Response: ${content.text.substring( 0, 200 )}${content.text.length > 200 ? '...' : ''}` )
                    }
                }
            }

            return {
                success: true,
                toolName,
                result: data.result
            }
        } catch( error ) {
            return { success: false, error: error.message }
        }
    }
}


export { StaticBearerTester }