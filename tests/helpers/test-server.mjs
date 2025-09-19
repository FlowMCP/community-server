import { ServerManager } from '../../src/index.mjs'
import { schema as x402PingSchema } from '../../node_modules/schemaImporter/schemas/v1.2.0/x402/ping.mjs'

import { setTimeout } from 'timers/promises'


// Test server that can be killed cleanly
class TestServerHelper {
    static async startTestServer( { port = 3006 } ) {
        const testEnvObject = {
            'SERVER_URL': 'http://localhost',
            'SERVER_PORT': port.toString(),
            'BEARER_TOKEN_MASTER': 'test-clean-token'
        }

        const testServerConfig = {
            'landingPage': {
                'name': 'Clean Test Server',
                'description': 'Cleanly killable test server'
            },
            'routes': [
                {
                    'routePath': '/clean',
                    'name': 'Clean Test Route',
                    'description': 'Test route for clean shutdown testing',
                    'auth': {
                        'enabled': false  // No auth for testing
                    },
                    'protocol': 'sse',
                    'schemas': async () => {
                        return { arrayOfSchemas: [ x402PingSchema ] }
                    }
                }
            ]
        }

        const objectOfSchemaArrays = {
            '/clean': [ x402PingSchema ]
        }

        // Since no auth is enabled, mcpAuthMiddlewareConfig is not needed
        const result = await ServerManager.start( {
            silent: true,
            stageType: 'test',
            objectOfSchemaArrays,
            serverConfig: testServerConfig,
            mcpAuthMiddlewareConfig: null,
            envObject: testEnvObject,
            managerVersion: '0.0.1',
            webhookSecret: 'test-clean',
            webhookPort: '3007',
            pm2Name: 'clean-test',
            x402Config: {},
            x402Credentials: {},
            x402PrivateKey: null
        } )

        return {
            port: port, // Use the actual port passed to the method
            bearerToken: '',  // No auth for testing
            endpoint: '/clean/sse'
        }
    }
}

// If called directly, start server and wait for SIGTERM
if( import.meta.url === `file://${process.argv[1]}` ) {
    // Get port from command line arguments or environment
    const portArg = process.argv[2] ? parseInt(process.argv[2]) :
                   process.env.SERVER_PORT ? parseInt(process.env.SERVER_PORT) :
                   3000
    
    const { port, bearerToken, endpoint } = await TestServerHelper.startTestServer( { port: portArg } )
    console.log( `Test server running on port ${port}` )
    console.log( `Bearer token: ${bearerToken}` )
    console.log( `Endpoint: ${endpoint}` )
    console.log( `Protocol: streamable` )
    
    process.on( 'SIGTERM', () => {
        console.log( 'Received SIGTERM, shutting down gracefully' )
        process.exit( 0 )
    } )
    
    process.on( 'SIGINT', () => {
        console.log( 'Received SIGINT, shutting down gracefully' )
        process.exit( 0 )
    } )
    
    // Keep process alive
    setInterval( () => {}, 1000 )
}

export { TestServerHelper }