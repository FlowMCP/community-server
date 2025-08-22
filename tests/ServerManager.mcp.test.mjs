import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js'
import { spawn } from 'child_process'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { setTimeout } from 'timers/promises'

const __filename = fileURLToPath( import.meta.url )
const __dirname = dirname( __filename )


describe( 'MCP Client Integration Tests', () => {
    let serverProcess = null
    let client = null
    let transport = null
    const serverPort = 8080

    afterEach( async () => {
        // Cleanup client connections
        try {
            if( client ) {
                await client.close()
                client = null
            }
            if( transport ) {
                await transport.close()
                transport = null
            }
        } catch( error ) {
            // Ignore cleanup errors
        }

        // Kill server process
        if( serverProcess && !serverProcess.killed ) {
            serverProcess.kill( 'SIGTERM' )
            await setTimeout( 1000 )
            
            if( !serverProcess.killed ) {
                serverProcess.kill( 'SIGKILL' )
            }
        }
    } )


    async function startTestServer() {
        const helperPath = join( __dirname, 'helpers', 'test-server.mjs' )
        serverProcess = spawn( 'node', [ helperPath ], {
            stdio: [ 'ignore', 'pipe', 'pipe' ],
            detached: false
        } )

        let serverReady = false
        let serverOutput = ''

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

        if( !serverReady ) {
            throw new Error( 'Server failed to start' )
        }

        return { serverOutput }
    }


    async function createMCPClient() {
        const testUrl = `http://localhost:${serverPort}`
        transport = new SSEClientTransport(
            new URL( `${testUrl}/clean/sse` )
            // No auth headers needed now
        )

        client = new Client( {
            name: 'mcp-test-client',
            version: '1.0.0'
        } )

        await client.connect( transport )
        return client
    }


    test( 'should connect to server via SSE transport', async () => {
        const { serverOutput } = await startTestServer()
        
        // Debug: Check server output for no auth
        expect( serverOutput ).toContain( 'Bearer token:' )
        
        // Test simple HTTP first (no auth needed)
        const testUrl = `http://localhost:${serverPort}`
        const httpResponse = await fetch( `${testUrl}/clean/sse`, {
            method: 'GET'
        } )
        
        // console.log( 'HTTP Response Status:', httpResponse.status )
        
        expect( httpResponse.status ).toBe( 200 )
        
        // Now try MCP client
        const mcpClient = await createMCPClient()
        expect( mcpClient ).toBeDefined()
        
    }, 30000 )


    test( 'should list available tools via tools/list', async () => {
        await startTestServer()
        const mcpClient = await createMCPClient()
        
        // Call tools/list via MCP Client
        const toolsList = await mcpClient.listTools()
        
        expect( toolsList ).toBeDefined()
        expect( toolsList.tools ).toBeDefined()
        expect( Array.isArray( toolsList.tools ) ).toBe( true )
        expect( toolsList.tools.length ).toBeGreaterThan( 0 )
        
        // Check for x402 ping tools
        const toolNames = toolsList.tools.map( tool => tool.name )
        expect( toolNames ).toContain( 'free_ping_x402' )
        expect( toolNames ).toContain( 'paid_ping_x402' )
        
        // Verify tool structure
        const freePingTool = toolsList.tools.find( tool => tool.name === 'free_ping_x402' )
        expect( freePingTool ).toBeDefined()
        expect( freePingTool.description ).toContain( 'free route' )
        expect( freePingTool.inputSchema ).toBeDefined()
        
    }, 30000 )


    test( 'should call free_ping tool via tools/call', async () => {
        await startTestServer()
        const mcpClient = await createMCPClient()
        
        // Call tools/call for free_ping
        const pingResult = await mcpClient.callTool( {
            name: 'free_ping_x402',
            arguments: {}
        } )
        
        expect( pingResult ).toBeDefined()
        expect( pingResult.content ).toBeDefined()
        expect( Array.isArray( pingResult.content ) ).toBe( true )
        expect( pingResult.content.length ).toBeGreaterThan( 0 )
        
        const resultContent = pingResult.content[ 0 ]
        expect( resultContent.type ).toBe( 'text' )
        
        // Debug response format (remove for final version)
        // console.log( 'Raw response text:', resultContent.text )
        
        // Handle response format (may be "Result: {json}" format)
        let responseText = resultContent.text
        if( responseText.startsWith( 'Result: ' ) ) {
            responseText = responseText.substring( 8 )
        }
        
        const responseData = JSON.parse( responseText )
        expect( responseData.status ).toBe( 'alive' )
        expect( responseData.method ).toBe( 'free_ping' )
        expect( responseData.version ).toBe( 'x402-experiment' )
        expect( responseData.time ).toBeDefined()
        
    }, 30000 )


    test( 'should call paid_ping tool via tools/call', async () => {
        await startTestServer()
        const mcpClient = await createMCPClient()
        
        // Call tools/call for paid_ping
        const pingResult = await mcpClient.callTool( {
            name: 'paid_ping_x402',
            arguments: {}
        } )
        
        expect( pingResult ).toBeDefined()
        expect( pingResult.content ).toBeDefined()
        expect( Array.isArray( pingResult.content ) ).toBe( true )
        
        const resultContent = pingResult.content[ 0 ]
        expect( resultContent.type ).toBe( 'text' )
        
        // Handle response format (may be "Result: {json}" format)
        let responseText = resultContent.text
        if( responseText.startsWith( 'Result: ' ) ) {
            responseText = responseText.substring( 8 )
        }
        
        const responseData = JSON.parse( responseText )
        expect( responseData.method ).toBe( 'paid_ping' )
        expect( responseData.itemId ).toBe( 'XYZ00001' )
        expect( responseData.content ).toContain( 'Encrypted payload' )
        expect( responseData.access_level ).toBe( 'licensed' )
        expect( responseData.metadata ).toBeDefined()
        expect( responseData.metadata.source ).toBe( 'x402-vault-test' )
        
    }, 30000 )


    test( 'should handle invalid tool names gracefully', async () => {
        await startTestServer()
        const mcpClient = await createMCPClient()
        
        // Try to call non-existent tool
        try {
            await mcpClient.callTool( {
                name: 'nonexistent_tool',
                arguments: {}
            } )
            
            // Should not reach here
            expect( true ).toBe( false )
        } catch( error ) {
            expect( error ).toBeDefined()
            expect( error.message ).toContain( 'not found' )
        }
        
    }, 30000 )


    test( 'should handle connection errors gracefully', async () => {
        // Try to connect without starting server
        try {
            await createMCPClient()
            
            // Should not reach here
            expect( true ).toBe( false )
        } catch( error ) {
            expect( error ).toBeDefined()
            // Connection should fail
        }
        
    }, 15000 )
} )