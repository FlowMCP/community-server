import { spawn } from 'child_process'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { setTimeout } from 'timers/promises'

const __filename = fileURLToPath( import.meta.url )
const __dirname = dirname( __filename )


describe( 'ServerManager Clean Tests', () => {
    let serverProcess = null
    const serverPort = 8080

    afterEach( async () => {
        if( serverProcess && !serverProcess.killed ) {
            serverProcess.kill( 'SIGTERM' )
            await setTimeout( 1000 )
            
            if( !serverProcess.killed ) {
                serverProcess.kill( 'SIGKILL' )
            }
        }
    } )


    test( 'should start server in separate process and test HTTP endpoints', async () => {
        // Start test server in separate process
        const helperPath = join( __dirname, 'helpers', 'test-server.mjs' )
        serverProcess = spawn( 'node', [ helperPath ], {
            stdio: [ 'ignore', 'pipe', 'pipe' ],
            detached: false
        } )

        let serverReady = false
        let serverOutput = ''

        // Capture server output
        serverProcess.stdout.on( 'data', ( data ) => {
            const output = data.toString()
            serverOutput += output
            
            if( output.includes( 'Test server running' ) ) {
                serverReady = true
            }
        } )

        serverProcess.stderr.on( 'data', ( data ) => {
            console.error( 'Server error:', data.toString() )
        } )

        // Wait for server to be ready
        let attempts = 0
        while( !serverReady && attempts < 30 ) {
            await setTimeout( 500 )
            attempts++
        }

        expect( serverReady ).toBe( true )
        expect( serverOutput ).toContain( 'Bearer token:' )
        expect( serverOutput ).toContain( 'Endpoint: /clean/sse' )

        // Test HTTP request to server
        const testUrl = `http://localhost:${serverPort}`
        const response = await fetch( `${testUrl}/clean/sse`, {
            method: 'GET',
            headers: {
                'Authorization': 'Bearer test-clean-token'
            }
        } )

        // Server should respond with SSE stream
        expect( response.status ).toBe( 200 )
        expect( response.headers.get( 'content-type' ) ).toContain( 'text/event-stream' )
        
        // Close response stream
        response.body?.cancel?.()
        
    }, 25000 )


    test( 'should respond correctly without authentication', async () => {
        // Start test server
        const helperPath = join( __dirname, 'helpers', 'test-server.mjs' )
        serverProcess = spawn( 'node', [ helperPath ], {
            stdio: [ 'ignore', 'pipe', 'ignore' ],
            detached: false
        } )

        // Wait for server startup
        await setTimeout( 3000 )

        // Test server response (no auth needed now)  
        const testUrl = `http://localhost:${serverPort}`
        const response = await fetch( `${testUrl}/clean/sse`, {
            method: 'GET'
        } )

        // Should be successful (no auth required)
        expect( response.status ).toBe( 200 )
        expect( response.headers.get( 'content-type' ) ).toContain( 'text/event-stream' )
        
    }, 20000 )
} )