import { ServerManager } from '../../../src/index.mjs'
// import { serverConfig } from '../../../serverConfig.mjs' // No longer needed with new architecture
import { getMcpAuthTestParams, testBaseUrl, testEnvPath } from '../../helpers/config.mjs'
import fs from 'fs'


describe( 'ServerManager - Comprehensive Tests for All Public Methods', () => {

    describe( 'getWebhookEnv() method', () => {
        test( 'should extract webhook environment variables from test stage', () => {
            const { webhookSecret, webhookPort, pm2Name } = ServerManager.getWebhookEnv( { stageType: 'test', envPath: testEnvPath } )
            
            expect( webhookSecret ).toBe( 'your-webhook-secret-here' )
            expect( webhookPort ).toBe( '3001' )
            expect( pm2Name ).toBe( 'community-server' )
        } )

        test( 'should handle test stage', () => {
            const result = ServerManager.getWebhookEnv( { stageType: 'test', envPath: testEnvPath } )
            
            expect( result ).toBeDefined()
            expect( typeof result ).toBe( 'object' )
        } )

        test( 'should handle invalid stage type gracefully', () => {
            const originalError = console.error
            let errorMessage = ''
            console.error = ( msg ) => { errorMessage = msg }
            
            expect( () => {
                ServerManager.getWebhookEnv( { stageType: 'nonexistent', envPath: 'nonexistent.env' } )
            } ).toThrow()
            
            expect( errorMessage ).toBe( 'Error reading environment file: nonexistent.env' )
            
            console.error = originalError
        } )
    } )


    describe( 'getX402Credentials() method', () => {
        test( 'should extract x402 credentials from valid envObject', () => {
            const envObject = {
                'ACCOUNT_DEVELOPMENT2_PRIVATE_KEY': '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef12',
                'ACCOUNT_DEVELOPMENT2_PUBLIC_KEY': '0x742d35Cc6634C0532925a3b8D6aC6782d3B5C123',
                'BASE_SEPOLIA_ALCHEMY_HTTP': 'https://base-sepolia.g.alchemy.com/v2/test-api-key-12345'
            }
            
            const { x402Config, x402Credentials, x402PrivateKey } = ServerManager.getX402Credentials( { envObject } )
            
            expect( x402Config ).toBeDefined()
            expect( x402Config.chainId ).toBe( 84532 )
            expect( x402Config.chainName ).toBe( 'base-sepolia' )
            
            expect( x402Credentials ).toBeDefined()
            expect( x402Credentials.payTo1 ).toBe( '0x742d35Cc6634C0532925a3b8D6aC6782d3B5C123' )
            expect( x402Credentials.serverProviderUrl ).toBe( 'https://base-sepolia.g.alchemy.com/v2/test-api-key-12345' )
            
            expect( x402PrivateKey ).toBe( '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef12' )
        } )

        test( 'should return credentials with undefined values for missing environment variables', () => {
            const envObject = {
                'ACCOUNT_DEVELOPMENT2_PRIVATE_KEY': '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef12'
                // Missing other required variables
            }
            
            const { x402Config, x402Credentials, x402PrivateKey } = ServerManager.getX402Credentials( { envObject } )
            
            expect( x402Config ).toBeDefined()
            expect( x402Credentials.payTo1 ).toBeUndefined()
            expect( x402Credentials.serverProviderUrl ).toBeUndefined()
            expect( x402PrivateKey ).toBe( '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef12' )
        } )

        test( 'should handle empty envObject gracefully', () => {
            const envObject = {}
            
            const { x402Config, x402Credentials, x402PrivateKey } = ServerManager.getX402Credentials( { envObject } )
            
            expect( x402Config ).toBeDefined()
            expect( x402Credentials.payTo1 ).toBeUndefined()
            expect( x402Credentials.serverProviderUrl ).toBeUndefined()
            expect( x402PrivateKey ).toBeNull()
        } )
    } )


    describe( 'getMcpAuthMiddlewareConfig() method', () => {
        test( 'should create auth config for routes with auth enabled', () => {
            const activeRoutes = [
                {
                    routePath: '/eerc20',
                    auth: {
                        enabled: true,
                        authType: 'staticBearer',
                        token: 'BEARER_TOKEN_EERC20'
                    }
                },
                {
                    routePath: '/lukso',
                    auth: {
                        enabled: false
                    }
                }
            ]
            
            const envObject = {
                'BEARER_TOKEN_EERC20': 'test-eerc20-token'
            }
            
            const { mcpAuthMiddlewareConfig } = ServerManager.getMcpAuthMiddlewareConfig( { 
                activeRoutes, 
                envObject, 
                silent: true,
                stageType: 'development',
                baseUrl: testBaseUrl
            } )
            
            expect( mcpAuthMiddlewareConfig ).toBeDefined()
            expect( mcpAuthMiddlewareConfig.routes ).toBeDefined()
            expect( mcpAuthMiddlewareConfig.routes[ '/eerc20/sse' ] ).toBeDefined()
            expect( mcpAuthMiddlewareConfig.routes[ '/eerc20/sse' ].authType ).toBe( 'staticBearer' )
            expect( mcpAuthMiddlewareConfig.routes[ '/eerc20/sse' ].token ).toBe( 'test-eerc20-token' )
            expect( mcpAuthMiddlewareConfig.routes[ '/lukso/sse' ] ).toBeUndefined()
        } )

        test( 'should handle OAuth2 Auth0 configuration with template variables', () => {
            const activeRoutes = [
                {
                    routePath: '/etherscan-ping',
                    auth: {
                        enabled: true,
                        authType: 'oauth21_auth0',
                        providerUrl: 'https://{{AUTH0_DOMAIN}}',
                        clientId: '{{AUTH0_CLIENT_ID}}',
                        clientSecret: '{{AUTH0_CLIENT_SECRET}}'
                    }
                }
            ]
            
            const envObject = {
                'AUTH0_DOMAIN': 'dev-example.us.auth0.com',
                'AUTH0_CLIENT_ID': 'test-client-id',
                'AUTH0_CLIENT_SECRET': 'test-client-secret'
            }
            
            const { mcpAuthMiddlewareConfig } = ServerManager.getMcpAuthMiddlewareConfig( { 
                activeRoutes, 
                envObject, 
                silent: true,
                stageType: 'development',
                baseUrl: testBaseUrl
            } )
            
            expect( mcpAuthMiddlewareConfig.routes[ '/etherscan-ping/sse' ] ).toBeDefined()
            expect( mcpAuthMiddlewareConfig.routes[ '/etherscan-ping/sse' ].authType ).toBe( 'oauth21_auth0' )
            expect( mcpAuthMiddlewareConfig.routes[ '/etherscan-ping/sse' ].providerUrl ).toBe( 'https://dev-example.us.auth0.com' )
            expect( mcpAuthMiddlewareConfig.routes[ '/etherscan-ping/sse' ].clientId ).toBe( 'test-client-id' )
            expect( mcpAuthMiddlewareConfig.routes[ '/etherscan-ping/sse' ].clientSecret ).toBe( 'test-client-secret' )
        } )

        test( 'should throw error for missing environment variables', () => {
            const activeRoutes = [
                {
                    routePath: '/eerc20',
                    auth: {
                        enabled: true,
                        authType: 'staticBearer',
                        token: 'MISSING_TOKEN'
                    }
                }
            ]
            
            const envObject = {}
            
            expect( () => {
                ServerManager.getMcpAuthMiddlewareConfig( { 
                    activeRoutes, 
                    envObject, 
                    silent: true,
                    stageType: 'development',
                    baseUrl: testBaseUrl
                } )
            } ).toThrow( 'MCP Auth configuration errors: Missing environment variable: MISSING_TOKEN' )
        } )
    } )


    describe( 'getEnvObject() method with real file reading', () => {
        test( 'should read and parse test environment file', () => {
            const { envObject } = ServerManager.getEnvObject( { stageType: 'test', envPath: testEnvPath } )
            
            expect( envObject ).toBeDefined()
            expect( typeof envObject ).toBe( 'object' )
            
            expect( envObject[ 'WEBHOOK_SECRET' ] ).toBe( 'your-webhook-secret-here' )
            expect( envObject[ 'WEBHOOK_PORT' ] ).toBe( '3001' )
            expect( envObject[ 'PM2_NAME' ] ).toBe( 'community-server' )
            // Modern token naming convention
            expect( envObject[ 'BEARER_TOKEN_EERC20' ] ).toBe( 'example-eerc20-token' )
            expect( envObject[ 'ACCOUNT_DEVELOPMENT2_PRIVATE_KEY' ] ).toBe( '0xEXAMPLE1234567890abcdef1234567890abcdef1234567890abcdef1234567890' )
        } )

        test( 'should filter out comments and empty lines', () => {
            const { envObject } = ServerManager.getEnvObject( { stageType: 'test', envPath: testEnvPath } )
            
            // Should not contain comment keys
            expect( envObject[ '# Test Environment Variables for ServerManager Tests' ] ).toBeUndefined()
            expect( envObject[ '' ] ).toBeUndefined()
        } )

        test( 'should handle test stage environment', () => {
            const { envObject } = ServerManager.getEnvObject( { stageType: 'test', envPath: testEnvPath } )
            
            expect( envObject ).toBeDefined()
            expect( typeof envObject ).toBe( 'object' )
        } )
    } )


    describe( 'Error Handling and Edge Cases', () => {
        test( 'getStageType should default to development for missing stage', () => {
            const originalWarn = console.warn
            let warnMessage = ''
            console.warn = ( msg ) => { warnMessage = msg }
            
            const { stageType } = ServerManager.getStageType( { argvs: [ 'node', 'test.js' ] } )
            
            expect( stageType ).toBe( 'development' )
            expect( warnMessage ).toBe( 'No stage type provided, defaulting to "development"' )
            
            console.warn = originalWarn
        } )

        test( 'getPackageVersion should read actual package.json', () => {
            const { managerVersion } = ServerManager.getPackageVersion()
            
            expect( managerVersion ).toBeDefined()
            expect( typeof managerVersion ).toBe( 'string' )
            expect( managerVersion ).toMatch( /^\d+\.\d+\.\d+/ ) // Semantic version pattern
        } )

        test( 'should handle malformed environment lines gracefully', () => {
            const envContent = `
VALID_KEY=valid_value
MALFORMED_LINE_WITHOUT_EQUALS
# Comment line
=VALUE_WITHOUT_KEY
ANOTHER_VALID=another_value
            `.trim()
            
            // Mock fs to return our test content
            const originalReadFileSync = fs.readFileSync
            fs.readFileSync = () => envContent
            
            const { envObject } = ServerManager.getEnvObject( { stageType: 'test', envPath: testEnvPath } )
            
            expect( envObject[ 'VALID_KEY' ] ).toBe( 'valid_value' )
            expect( envObject[ 'ANOTHER_VALID' ] ).toBe( 'another_value' )
            expect( envObject[ 'MALFORMED_LINE_WITHOUT_EQUALS' ] ).toBeUndefined()
            // Line "=VALUE_WITHOUT_KEY" creates an entry with empty key
            expect( envObject[ '' ] ).toBe( 'VALUE_WITHOUT_KEY' )
            
            // Restore original function
            fs.readFileSync = originalReadFileSync
        } )
    } )

} )