import { ServerManager } from '../../src/index.mjs'
import { schema as x402PingSchema } from '../../node_modules/schemaImporter/schemas/v1.2.0/x402/ping.mjs'

import { setTimeout } from 'timers/promises'


// Test server that can be killed cleanly
class TestServerHelper {
    static async startTestServer( { port = 3006 } ) {
        const testEnvObject = {
            'SERVER_URL': 'http://localhost',
            'SERVER_PORT': port.toString(),
            'BEARER_TOKEN__0': 'test-clean-token'
        }

        const testServerConfig = {
            'landingPage': {
                'name': 'Clean Test Server',
                'description': 'Cleanly killable test server'
            },
            'routes': [
                {
                    'endpoint': '/clean',
                    'bearerToken': '',  // No auth for testing
                    'tags': [],
                    'routePath': '/clean',
                    'protocol': 'sse',
                    'includeNamespaces': [ 'x402' ],
                    'excludeNamespaces': [],
                    'activateTags': []
                }
            ]
        }

        const result = await ServerManager.start( {
            silent: true,
            stageType: 'test',
            arrayOfSchemas: [ x402PingSchema ],
            serverConfig: testServerConfig,
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
            port: 8080, // DeployAdvanced default port
            bearerToken: '',  // No auth for testing
            endpoint: '/clean/sse'
        }
    }
}

// If called directly, start server and wait for SIGTERM
if( import.meta.url === `file://${process.argv[1]}` ) {
    const { port, bearerToken, endpoint } = await TestServerHelper.startTestServer( {} )
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