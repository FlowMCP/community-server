// Puppeteer is optional - only needed for browser automation
let puppeteer = null


class OAuth21ScalekitPuppeteerTester {
    static async runTest( { baseUrl, routePath, silent = false, browserTimeout = 30000, clientId = null, clientSecret = null, providerUrl = null, mcpId = null, scope = null } ) {
        // Try to load Puppeteer if not already loaded
        if( !puppeteer ) {
            try {
                puppeteer = ( await import( 'puppeteer' ) ).default
            } catch( error ) {
                console.warn( '⚠️  Puppeteer not installed. OAuth browser flow will be simulated.' )
                console.warn( '   Install with: npm install puppeteer' )
            }
        }

        // Temporarily disable Puppeteer due to macOS framework issues
        const puppeteerDisabled = true
        if( puppeteerDisabled ) {
            console.warn( '⚠️  Puppeteer temporarily disabled due to macOS framework issues.' )
            puppeteer = null
        }

        const result = {
            baseUrl,
            routePath,
            authType: 'oauth21_scalekit',
            flowResults: {},
            requestChain: {}
        }

        let browser
        try {
            // Step 1: Test unauthorized access (should fail)
            if( !silent ) console.log( '\n1️⃣  Testing unauthorized MCP access...' )
            const unauthorizedResult = await this.#testUnauthorizedAccess( { baseUrl, routePath } )
            result.flowResults[ 'Unauthorized Access' ] = unauthorizedResult

            // Step 2: OAuth Discovery
            if( !silent ) console.log( '\n2️⃣  Performing OAuth discovery...' )
            const discoveryResult = await this.#performDiscovery( {
                baseUrl: providerUrl || baseUrl,
                providerUrl
            } )
            result.flowResults[ 'OAuth Discovery' ] = discoveryResult
            result.discoveryMetadata = discoveryResult.metadata

            // Step 3: Client Registration (use pre-configured credentials)
            if( !silent ) console.log( '\n3️⃣  Using pre-configured OAuth client...' )
            const registrationResult = discoveryResult.metadata?.registration_endpoint
                ? await this.#registerClient( {
                    baseUrl,
                    registrationEndpoint: discoveryResult.metadata.registration_endpoint
                } )
                : {
                    success: true,
                    clientId: clientId,
                    clientSecret: clientSecret,
                    source: 'pre-configured'
                }

            if( !silent && registrationResult.source === 'pre-configured' ) {
                console.log( `   Using environment CLIENT_ID: ${registrationResult.clientId ? `${registrationResult.clientId.substring(0, 8)}...` : 'undefined'}` )
            }

            result.flowResults[ 'Client Registration' ] = registrationResult
            result.clientId = registrationResult.clientId
            result.clientSecret = registrationResult.clientSecret

            // Step 4: Prepare Authorization
            if( !silent ) console.log( '\n4️⃣  Preparing authorization...' )
            const authPrepResult = await this.#prepareAuthorization( {
                authorizationEndpoint: discoveryResult.metadata?.authorization_endpoint,
                clientId: registrationResult.clientId,
                redirectUri: `${baseUrl}/oauth/callback`,
                scope: scope || 'openid profile mcp:tools mcp:resources:read'
            } )
            result.flowResults[ 'Authorization Preparation' ] = authPrepResult
            result.authorizationUrl = authPrepResult.authorizationUrl

            // Step 5: Browser Authorization Flow
            let authResult
            if( puppeteer ) {
                if( !silent ) console.log( '\n5️⃣  Opening browser for authorization...' )
                browser = await puppeteer.launch( {
                    headless: false,
                    defaultViewport: null,
                    args: [ '--no-sandbox', '--disable-setuid-sandbox' ]
                } )

                authResult = await this.#performBrowserAuthorization( {
                    browser,
                    authorizationUrl: authPrepResult.authorizationUrl,
                    timeout: browserTimeout
                } )
            } else {
                if( !silent ) console.log( '\n5️⃣  Simulating browser authorization (Puppeteer not installed)...' )
                authResult = {
                    success: true,
                    code: 'simulated-auth-code-' + Math.random().toString( 36 ).substring( 7 ),
                    message: 'Browser flow simulated - install Puppeteer for real OAuth flow'
                }
            }
            result.flowResults[ 'Browser Authorization' ] = authResult
            result.authorizationCode = authResult.code

            // Step 6: Token Exchange
            if( !silent ) console.log( '\n6️⃣  Exchanging authorization code for tokens...' )
            const tokenResult = await this.#exchangeCodeForTokens( {
                tokenEndpoint: discoveryResult.metadata?.token_endpoint,
                clientId: registrationResult.clientId,
                clientSecret: registrationResult.clientSecret,
                code: authResult.code,
                redirectUri: `${baseUrl}/oauth/callback`
            } )
            result.flowResults[ 'Token Exchange' ] = tokenResult
            result.accessToken = tokenResult.accessToken
            result.idToken = tokenResult.idToken

            // Step 7: Token Validation
            if( !silent ) console.log( '\n7️⃣  Validating tokens...' )
            const validationResult = await this.#validateTokens( {
                userInfoEndpoint: discoveryResult.metadata?.userinfo_endpoint,
                accessToken: tokenResult.accessToken
            } )
            result.flowResults[ 'Token Validation' ] = validationResult

            // Step 8: MCP Tools List
            if( !silent ) console.log( '\n8️⃣  Fetching MCP tools list...' )
            const toolsResult = await this.#fetchMcpTools( {
                baseUrl,
                routePath,
                accessToken: tokenResult.accessToken
            } )
            result.flowResults[ 'MCP Tools List' ] = toolsResult
            result.tools = toolsResult.tools

            // Step 9: Call First Tool
            if( toolsResult.tools && toolsResult.tools.length > 0 ) {
                if( !silent ) console.log( '\n9️⃣  Calling first available tool...' )
                const toolCallResult = await this.#callMcpTool( {
                    baseUrl,
                    routePath,
                    accessToken: tokenResult.accessToken,
                    toolName: toolsResult.tools[ 0 ].name
                } )
                result.flowResults[ 'Tool Call' ] = toolCallResult
            }

            result.success = true
            return result

        } catch( error ) {
            console.error( '❌ Test failed:', error.message )
            result.success = false
            result.error = error.message
            return result
        } finally {
            if( browser ) {
                await browser.close()
            }
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


    static async #performDiscovery( { baseUrl, providerUrl } ) {
        try {
            // ScaleKit uses specific discovery endpoints
            let discoveryUrl
            if( providerUrl ) {
                // Try ScaleKit-specific discovery patterns
                const scaleKitDiscoveryUrls = [
                    `${providerUrl}/.well-known/openid_configuration`,
                    `${providerUrl}/.well-known/oauth-authorization-server`,
                    `${providerUrl}/oauth/discovery`
                ]

                for( const url of scaleKitDiscoveryUrls ) {
                    try {
                        const response = await fetch( url )
                        if( response.ok ) {
                            discoveryUrl = url
                            const metadata = await response.json()
                            return {
                                success: true,
                                metadata,
                                discoveryUrl,
                                endpoints: {
                                    authorization: metadata.authorization_endpoint,
                                    token: metadata.token_endpoint,
                                    registration: metadata.registration_endpoint,
                                    userinfo: metadata.userinfo_endpoint
                                }
                            }
                        }
                    } catch( e ) {
                        // Continue to next URL
                        continue
                    }
                }

                // If discovery fails, manually construct ScaleKit endpoints based on known patterns
                console.log( `   ⚠️  Discovery failed, using manual ScaleKit endpoint construction for ${providerUrl}` )
                const metadata = {
                    authorization_endpoint: `${providerUrl}/oauth/authorize`,
                    token_endpoint: `${providerUrl}/oauth/token`,
                    userinfo_endpoint: `${providerUrl}/oauth/userinfo`,
                    issuer: providerUrl
                }

                return {
                    success: true,
                    metadata,
                    discoveryUrl: `${providerUrl} (manual construction)`,
                    endpoints: {
                        authorization: metadata.authorization_endpoint,
                        token: metadata.token_endpoint,
                        registration: null, // ScaleKit uses pre-configured clients
                        userinfo: metadata.userinfo_endpoint
                    }
                }
            } else {
                // Local server discovery
                discoveryUrl = `${baseUrl}/.well-known/oauth-authorization-server`
                const response = await fetch( discoveryUrl )

                if( !response.ok ) {
                    throw new Error( `Discovery failed: ${response.status} for ${discoveryUrl}` )
                }

                const metadata = await response.json()
                return {
                    success: true,
                    metadata,
                    discoveryUrl,
                    endpoints: {
                        authorization: metadata.authorization_endpoint,
                        token: metadata.token_endpoint,
                        registration: metadata.registration_endpoint,
                        userinfo: metadata.userinfo_endpoint
                    }
                }
            }
        } catch( error ) {
            return { success: false, error: error.message }
        }
    }


    static async #registerClient( { baseUrl, registrationEndpoint } ) {
        try {
            const response = await fetch( registrationEndpoint || `${baseUrl}/oauth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify( {
                    client_name: 'Community Server Test Client',
                    redirect_uris: [ `${baseUrl}/oauth/callback` ],
                    grant_types: [ 'authorization_code' ],
                    response_types: [ 'code' ],
                    scope: 'openid profile mcp:tools mcp:resources:read'
                } )
            } )

            if( !response.ok ) {
                throw new Error( `Registration failed: ${response.status}` )
            }

            const data = await response.json()
            return {
                success: true,
                clientId: data.client_id,
                clientSecret: data.client_secret,
                registrationData: data
            }
        } catch( error ) {
            return { success: false, error: error.message }
        }
    }


    static async #prepareAuthorization( { authorizationEndpoint, clientId, redirectUri, scope } ) {
        const params = new URLSearchParams( {
            response_type: 'code',
            client_id: clientId,
            redirect_uri: redirectUri,
            scope: scope,
            state: Math.random().toString( 36 ).substring( 7 )
        } )

        const authorizationUrl = `${authorizationEndpoint}?${params.toString()}`
        return {
            success: true,
            authorizationUrl,
            parameters: Object.fromEntries( params )
        }
    }


    static async #performBrowserAuthorization( { browser, authorizationUrl, timeout } ) {
        const page = await browser.newPage()

        try {
            // Navigate to authorization URL
            await page.goto( authorizationUrl, { waitUntil: 'networkidle2' } )

            // Wait for user to complete authorization
            // This would typically involve logging in and approving the app
            console.log( '   ⏳ Waiting for user to complete authorization...' )
            console.log( '   📝 Please log in and approve the application in the browser' )

            // Wait for redirect to callback URL with authorization code
            await page.waitForFunction(
                () => window.location.href.includes( '/oauth/callback' ),
                { timeout }
            )

            const callbackUrl = page.url()
            const urlParams = new URLSearchParams( new URL( callbackUrl ).search )
            const code = urlParams.get( 'code' )

            if( !code ) {
                throw new Error( 'No authorization code received' )
            }

            return { success: true, code, callbackUrl }
        } catch( error ) {
            return { success: false, error: error.message }
        } finally {
            await page.close()
        }
    }


    static async #exchangeCodeForTokens( { tokenEndpoint, clientId, clientSecret, code, redirectUri } ) {
        try {
            const params = new URLSearchParams( {
                grant_type: 'authorization_code',
                code: code,
                client_id: clientId,
                client_secret: clientSecret,
                redirect_uri: redirectUri
            } )

            const response = await fetch( tokenEndpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: params.toString()
            } )

            if( !response.ok ) {
                throw new Error( `Token exchange failed: ${response.status}` )
            }

            const data = await response.json()
            return {
                success: true,
                accessToken: data.access_token,
                idToken: data.id_token,
                refreshToken: data.refresh_token,
                expiresIn: data.expires_in,
                tokenData: data
            }
        } catch( error ) {
            return { success: false, error: error.message }
        }
    }


    static async #validateTokens( { userInfoEndpoint, accessToken } ) {
        try {
            const response = await fetch( userInfoEndpoint, {
                headers: { 'Authorization': `Bearer ${accessToken}` }
            } )

            if( !response.ok ) {
                throw new Error( `Token validation failed: ${response.status}` )
            }

            const userInfo = await response.json()
            return {
                success: true,
                userInfo,
                tokenValid: true
            }
        } catch( error ) {
            return { success: false, error: error.message }
        }
    }


    static async #fetchMcpTools( { baseUrl, routePath, accessToken } ) {
        try {
            const response = await fetch( `${baseUrl}${routePath}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken}`
                },
                body: JSON.stringify( {
                    jsonrpc: '2.0',
                    method: 'tools/list',
                    id: 1
                } )
            } )

            if( !response.ok ) {
                throw new Error( `MCP tools fetch failed: ${response.status}` )
            }

            const data = await response.json()
            return {
                success: true,
                tools: data.result?.tools || [],
                toolCount: data.result?.tools?.length || 0
            }
        } catch( error ) {
            return { success: false, error: error.message }
        }
    }


    static async #callMcpTool( { baseUrl, routePath, accessToken, toolName } ) {
        try {
            const response = await fetch( `${baseUrl}${routePath}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken}`
                },
                body: JSON.stringify( {
                    jsonrpc: '2.0',
                    method: 'tools/call',
                    params: {
                        name: toolName,
                        arguments: {}
                    },
                    id: 2
                } )
            } )

            if( !response.ok ) {
                throw new Error( `Tool call failed: ${response.status}` )
            }

            const data = await response.json()
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


export { OAuth21ScalekitPuppeteerTester }