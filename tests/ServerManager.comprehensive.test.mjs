import { ServerManager } from '../src/index.mjs'
import { serverConfig } from '../serverConfig.mjs'
import fs from 'fs'


describe( 'ServerManager - Comprehensive Tests for All Public Methods', () => {

    describe( 'getWebhookEnv() method', () => {
        test( 'should extract webhook environment variables from test stage', () => {
            const { webhookSecret, webhookPort, pm2Name } = ServerManager.getWebhookEnv( { stageType: 'test', serverConfig } )
            
            expect( webhookSecret ).toBe( 'test-webhook-secret-123' )
            expect( webhookPort ).toBe( '3007' )
            expect( pm2Name ).toBe( 'test-community-server' )
        } )

        test( 'should handle development stage', () => {
            const result = ServerManager.getWebhookEnv( { stageType: 'development-test', serverConfig } )
            
            expect( result ).toBeDefined()
            expect( typeof result ).toBe( 'object' )
        } )

        test( 'should handle invalid stage type gracefully', () => {
            const originalError = console.error
            let errorMessage = ''
            console.error = ( msg ) => { errorMessage = msg }
            
            expect( () => {
                ServerManager.getWebhookEnv( { stageType: 'nonexistent' } )
            } ).toThrow()
            
            expect( errorMessage ).toBe( 'No environment file found for stage type: nonexistent' )
            
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


    describe( 'getServerConfig() method', () => {
        test( 'should replace bearer tokens from envObject', () => {
            const envObject = {
                'BEARER_TOKEN__0': 'custom-eerc20-token',
                'BEARER_TOKEN__1': 'custom-agentpays-token',
                'BEARER_TOKEN__2': 'custom-lukso-token',
                'BEARER_TOKEN__3': 'custom-chainlink-token'
            }
            
            const { serverConfig } = ServerManager.getServerConfig( { envObject } )
            
            expect( serverConfig ).toBeDefined()
            expect( serverConfig.routes ).toBeDefined()
            expect( Array.isArray( serverConfig.routes ) ).toBe( true )
            
            expect( serverConfig.routes[ 0 ].bearerToken ).toBe( 'custom-eerc20-token' )
            expect( serverConfig.routes[ 1 ].bearerToken ).toBe( 'custom-agentpays-token' )
            expect( serverConfig.routes[ 2 ].bearerToken ).toBe( 'custom-lukso-token' )
            expect( serverConfig.routes[ 3 ].bearerToken ).toBe( 'custom-chainlink-token' )
        } )

        test( 'should warn for missing bearer tokens', () => {
            const originalWarn = console.warn
            const warnMessages = []
            console.warn = ( msg ) => { warnMessages.push( msg ) }
            
            const envObject = {
                'BEARER_TOKEN__0': 'only-first-token'
                // Missing other tokens
            }
            
            const { serverConfig } = ServerManager.getServerConfig( { envObject } )
            
            expect( warnMessages ).toContain( 'Missing BEARER_TOKEN__1 in .env file' )
            expect( warnMessages ).toContain( 'Missing BEARER_TOKEN__2 in .env file' )
            expect( warnMessages ).toContain( 'Missing BEARER_TOKEN__3 in .env file' )
            
            expect( serverConfig.routes[ 0 ].bearerToken ).toBe( 'only-first-token' )
            // Check that routes without custom tokens get default values
            expect( serverConfig.routes[ 1 ].bearerToken ).toBe( 'default-token-1' )
            expect( serverConfig.routes[ 2 ].bearerToken ).toBe( 'default-token-2' )
            expect( serverConfig.routes[ 3 ].bearerToken ).toBe( 'default-token-3' )
            
            console.warn = originalWarn
        } )

        test( 'should preserve original serverConfig structure', () => {
            const originalWarn = console.warn
            console.warn = () => {} // Suppress warnings for clean output
            
            const envObject = {}
            
            const { serverConfig } = ServerManager.getServerConfig( { envObject } )
            
            expect( serverConfig.landingPage ).toBeDefined()
            expect( serverConfig.landingPage.name ).toBe( 'FlowMCP Community Servers' )
            expect( serverConfig.x402 ).toBeDefined()
            expect( serverConfig.x402.chainId ).toBe( 84532 )
            
            console.warn = originalWarn
        } )
    } )


    describe( 'getEnvObject() method with real file reading', () => {
        test( 'should read and parse test environment file', () => {
            const { envObject } = ServerManager.getEnvObject( { stageType: 'test', serverConfig } )
            
            expect( envObject ).toBeDefined()
            expect( typeof envObject ).toBe( 'object' )
            
            expect( envObject[ 'WEBHOOK_SECRET' ] ).toBe( 'test-webhook-secret-123' )
            expect( envObject[ 'WEBHOOK_PORT' ] ).toBe( '3007' )
            expect( envObject[ 'PM2_NAME' ] ).toBe( 'test-community-server' )
            // GitHub Actions uses different token value than local .test.env file
            expect( envObject[ 'BEARER_TOKEN__0' ] ).toMatch( /^test-(eerc20|avalanche)-token$/ )
            expect( envObject[ 'ACCOUNT_DEVELOPMENT2_PRIVATE_KEY' ] ).toBe( '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef12' )
        } )

        test( 'should filter out comments and empty lines', () => {
            const { envObject } = ServerManager.getEnvObject( { stageType: 'test', serverConfig } )
            
            // Should not contain comment keys
            expect( envObject[ '# Test Environment Variables for ServerManager Tests' ] ).toBeUndefined()
            expect( envObject[ '' ] ).toBeUndefined()
        } )

        test( 'should handle development stage environment', () => {
            const { envObject } = ServerManager.getEnvObject( { stageType: 'development-test', serverConfig } )
            
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
            
            const { envObject } = ServerManager.getEnvObject( { stageType: 'test', serverConfig } )
            
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