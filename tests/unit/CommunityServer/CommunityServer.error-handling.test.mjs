import { jest } from '@jest/globals'

// Mock setup for error handling testing
const mockApp = { get: jest.fn(), use: jest.fn() }
const mockDeployAdvanced = {
    init: jest.fn( () => ({ app: mockApp, mcps: {}, events: {}, argv: [], server: {} }) ),
    start: jest.fn()
}
const mockX402Middleware = {
    create: jest.fn( async () => ({ mcp: jest.fn( () => jest.fn() ) }) )
}
const mockMcpAuthMiddleware = {
    create: jest.fn( async () => ({ router: jest.fn( () => jest.fn() ) }) )
}
const mockNet = {
    createServer: jest.fn( () => ({
        listen: jest.fn( ( port, callback ) => callback() ),
        close: jest.fn( ( callback ) => callback() ),
        on: jest.fn()
    }) ),
    isIP: jest.fn( () => 4 ),
    isIPv4: jest.fn( () => true ),
    isIPv6: jest.fn( () => false )
}
const mockFs = { readFileSync: jest.fn( () => '<html>{{HEADLINE}}</html>' ) }
const mockPath = { dirname: jest.fn( () => '/test' ), join: jest.fn( ( ...args ) => args.join( '/' ) ) }
const mockCors = jest.fn( () => jest.fn() )

// Mock console methods
const consoleSpy = {
    log: jest.spyOn( console, 'log' ).mockImplementation( () => {} ),
    warn: jest.spyOn( console, 'warn' ).mockImplementation( () => {} ),
    error: jest.spyOn( console, 'error' ).mockImplementation( () => {} )
}

jest.unstable_mockModule( 'flowmcpServers', () => ({ Deploy: jest.fn(), DeployAdvanced: mockDeployAdvanced }) )
jest.unstable_mockModule( 'x402-mcp-middleware', () => ({ X402Middleware: mockX402Middleware }) )
jest.unstable_mockModule( 'mcpAuthMiddleware', () => ({ McpAuthMiddleware: mockMcpAuthMiddleware }) )
jest.unstable_mockModule( 'net', () => ({ 
    default: mockNet,
    isIP: mockNet.isIP,
    isIPv4: mockNet.isIPv4,
    isIPv6: mockNet.isIPv6,
    createServer: mockNet.createServer
}) )
jest.unstable_mockModule( 'fs', () => ({ default: mockFs }) )
jest.unstable_mockModule( 'path', () => ({ default: mockPath }) )
jest.unstable_mockModule( 'url', () => ({ fileURLToPath: jest.fn( () => '/test/file.mjs' ) }) )
jest.unstable_mockModule( 'cors', () => ({ default: mockCors }) )

const { CommunityServer } = await import( '../../../src/task/CommunityServer.mjs' )

describe( 'CommunityServer Error Handling Tests', () => {

    beforeEach( () => {
        jest.clearAllMocks()
        Object.values( consoleSpy ).forEach( spy => spy.mockClear() )
        
        // Reset DeployAdvanced mock to default working state
        mockDeployAdvanced.init.mockReturnValue( { app: mockApp, mcps: {}, events: {}, argv: [], server: {} } )
        mockDeployAdvanced.start.mockReturnValue( true )
    } )

    afterAll( () => {
        Object.values( consoleSpy ).forEach( spy => spy.mockRestore() )
    } )


    describe( 'Invalid stage type handling', () => {
        
        test( 'should throw error for unknown stage type', async () => {
            const serverConfig = {
                landingPage: { name: 'Test', description: 'Test' },
                routes: []
            }

            // Since invalid stage types are not 'test', x402Config destructuring will fail first
            // But we need to provide x402Config to get to the stage type validation
            await expect( CommunityServer.start( {
                silent: true,
                stageType: 'invalid-stage-type',
                objectOfSchemaArrays: {},
                serverConfig,
                mcpAuthMiddlewareConfig: null,
                envObject: { SERVER_URL: 'http://localhost', SERVER_PORT: '3000' },
                managerVersion: '1.0.0',
                x402Config: { chainId: 1, chainName: 'ethereum', contracts: {}, paymentOptions: {}, restrictedCalls: {} },
                x402Credentials: {},
                x402PrivateKey: null
            } ) ).rejects.toThrow( 'Unknown stageType: invalid-stage-type' )
        } )

        test( 'should throw error for null stage type', async () => {
            const serverConfig = {
                landingPage: { name: 'Test', description: 'Test' },
                routes: []
            }

            await expect( CommunityServer.start( {
                silent: true,
                stageType: null,
                objectOfSchemaArrays: {},
                serverConfig,
                mcpAuthMiddlewareConfig: null,
                envObject: { SERVER_URL: 'http://localhost', SERVER_PORT: '3000' },
                managerVersion: '1.0.0',
                x402Config: { chainId: 1, chainName: 'ethereum', contracts: {}, paymentOptions: {}, restrictedCalls: {} },
                x402Credentials: {},
                x402PrivateKey: null
            } ) ).rejects.toThrow( 'Unknown stageType: null' )
        } )

        test( 'should throw error for undefined stage type', async () => {
            const serverConfig = {
                landingPage: { name: 'Test', description: 'Test' },
                routes: []
            }

            await expect( CommunityServer.start( {
                silent: true,
                stageType: undefined,
                objectOfSchemaArrays: {},
                serverConfig,
                mcpAuthMiddlewareConfig: null,
                envObject: { SERVER_URL: 'http://localhost', SERVER_PORT: '3000' },
                managerVersion: '1.0.0',
                x402Config: { chainId: 1, chainName: 'ethereum', contracts: {}, paymentOptions: {}, restrictedCalls: {} },
                x402Credentials: {},
                x402PrivateKey: null
            } ) ).rejects.toThrow( 'Unknown stageType: undefined' )
        } )
    } )


    describe( 'DeployAdvanced initialization errors', () => {
        
        test( 'should handle DeployAdvanced.init failure', async () => {
            mockDeployAdvanced.init.mockImplementation( () => {
                throw new Error( 'DeployAdvanced initialization failed' )
            } )

            const serverConfig = {
                landingPage: { name: 'Test', description: 'Test' },
                routes: []
            }

            await expect( CommunityServer.start( {
                silent: true,
                stageType: 'test',
                objectOfSchemaArrays: {},
                serverConfig,
                mcpAuthMiddlewareConfig: null,
                envObject: { SERVER_URL: 'http://localhost', SERVER_PORT: '3000' },
                managerVersion: '1.0.0',
                x402Config: null,
                x402Credentials: {},
                x402PrivateKey: null
            } ) ).rejects.toThrow( 'DeployAdvanced initialization failed' )

            expect( mockDeployAdvanced.init ).toHaveBeenCalledWith( { silent: true } )
        } )

        test( 'should handle DeployAdvanced.start failure', async () => {
            // Reset the init mock to work correctly first
            mockDeployAdvanced.init.mockReturnValue( { app: mockApp, mcps: {}, events: {}, argv: [], server: {} } )
            mockDeployAdvanced.start.mockImplementation( () => {
                throw new Error( 'DeployAdvanced start failed' )
            } )

            const serverConfig = {
                landingPage: { name: 'Test', description: 'Test' },
                routes: []
            }

            await expect( CommunityServer.start( {
                silent: true,
                stageType: 'test',
                objectOfSchemaArrays: {},
                serverConfig,
                mcpAuthMiddlewareConfig: null,
                envObject: { SERVER_URL: 'http://localhost', SERVER_PORT: '3000' },
                managerVersion: '1.0.0',
                x402Config: null,
                x402Credentials: {},
                x402PrivateKey: null
            } ) ).rejects.toThrow( 'DeployAdvanced start failed' )

            expect( mockDeployAdvanced.start ).toHaveBeenCalled()
        } )

        test( 'should handle malformed DeployAdvanced.init response', async () => {
            mockDeployAdvanced.init.mockReturnValue( null )

            const serverConfig = {
                landingPage: { name: 'Test', description: 'Test' },
                routes: []
            }

            await expect( CommunityServer.start( {
                silent: true,
                stageType: 'test',
                objectOfSchemaArrays: {},
                serverConfig,
                mcpAuthMiddlewareConfig: null,
                envObject: { SERVER_URL: 'http://localhost', SERVER_PORT: '3000' },
                managerVersion: '1.0.0',
                x402Config: null,
                x402Credentials: {},
                x402PrivateKey: null
            } ) ).rejects.toThrow()
        } )
    } )


    describe( 'X402 middleware errors', () => {
        
        test( 'should skip X402 middleware for test stage', async () => {
            // X402 middleware is not initialized in test stage
            const serverConfig = {
                landingPage: { name: 'Test', description: 'Test' },
                routes: []
            }

            const result = await CommunityServer.start( {
                silent: true,
                stageType: 'test',
                objectOfSchemaArrays: {},
                serverConfig,
                mcpAuthMiddlewareConfig: null,
                envObject: { SERVER_URL: 'http://localhost', SERVER_PORT: '3000' },
                managerVersion: '1.0.0',
                x402Config: { chainId: 1, chainName: 'ethereum', contracts: {}, paymentOptions: {}, restrictedCalls: {} },
                x402Credentials: {},
                x402PrivateKey: null
            } )

            expect( result ).toBe( true )
            expect( mockX402Middleware.create ).not.toHaveBeenCalled()
        } )

        test( 'should initialize X402 middleware for non-test stages', async () => {
            mockX402Middleware.create.mockResolvedValue( { mcp: jest.fn( () => jest.fn() ) } )

            const serverConfig = {
                landingPage: { name: 'Test', description: 'Test' },
                routes: []
            }

            await CommunityServer.start( {
                silent: true,
                stageType: 'development',
                objectOfSchemaArrays: {},
                serverConfig,
                mcpAuthMiddlewareConfig: null,
                envObject: { SERVER_URL: 'http://localhost', SERVER_PORT: '3000' },
                managerVersion: '1.0.0',
                x402Config: { chainId: 1, chainName: 'ethereum', contracts: {}, paymentOptions: {}, restrictedCalls: {} },
                x402Credentials: {},
                x402PrivateKey: null
            } )

            expect( mockX402Middleware.create ).toHaveBeenCalledWith( {
                chainId: 1,
                chainName: 'ethereum',
                contracts: {},
                paymentOptions: {},
                restrictedCalls: {},
                x402Credentials: {},
                x402PrivateKey: null
            } )
        } )
    } )


    describe( 'MCP Auth middleware configuration', () => {
        
        test( 'should skip MCP Auth middleware when config is null', async () => {
            const serverConfig = {
                landingPage: { name: 'Test', description: 'Test' },
                routes: []
            }

            const result = await CommunityServer.start( {
                silent: true,
                stageType: 'test',
                objectOfSchemaArrays: {},
                serverConfig,
                mcpAuthMiddlewareConfig: null,
                envObject: { SERVER_URL: 'http://localhost', SERVER_PORT: '3000' },
                managerVersion: '1.0.0',
                x402Config: null,
                x402Credentials: {},
                x402PrivateKey: null
            } )

            expect( result ).toBe( true )
            expect( mockMcpAuthMiddleware.create ).not.toHaveBeenCalled()
        } )

        test( 'should initialize MCP Auth middleware when config is provided', async () => {
            mockMcpAuthMiddleware.create.mockResolvedValue( { router: jest.fn( () => jest.fn() ) } )

            const serverConfig = {
                landingPage: { name: 'Test', description: 'Test' },
                routes: []
            }

            const mcpAuthMiddlewareConfig = {
                routes: {
                    '/test/sse': { authType: 'staticBearer', token: 'test-token' }
                }
            }

            const result = await CommunityServer.start( {
                silent: true,
                stageType: 'test',
                objectOfSchemaArrays: {},
                serverConfig,
                mcpAuthMiddlewareConfig,
                envObject: { SERVER_URL: 'http://localhost', SERVER_PORT: '3000' },
                managerVersion: '1.0.0',
                x402Config: null,
                x402Credentials: {},
                x402PrivateKey: null
            } )

            expect( result ).toBe( true )
            expect( mockMcpAuthMiddleware.create ).toHaveBeenCalledWith( mcpAuthMiddlewareConfig )
            expect( mockApp.use ).toHaveBeenCalled()
        } )
    } )


    describe( 'CORS middleware configuration', () => {
        
        test( 'should skip CORS middleware when disabled', async () => {
            const serverConfig = {
                cors: {
                    enabled: false,
                    options: { origin: 'http://localhost:3000' }
                },
                landingPage: { name: 'Test', description: 'Test' },
                routes: []
            }

            const result = await CommunityServer.start( {
                silent: true,
                stageType: 'test',
                objectOfSchemaArrays: {},
                serverConfig,
                mcpAuthMiddlewareConfig: null,
                envObject: { SERVER_URL: 'http://localhost', SERVER_PORT: '3000' },
                managerVersion: '1.0.0',
                x402Config: null,
                x402Credentials: {},
                x402PrivateKey: null
            } )

            expect( result ).toBe( true )
            expect( mockCors ).not.toHaveBeenCalled()
        } )

        test( 'should apply CORS middleware when enabled', async () => {
            mockCors.mockReturnValue( jest.fn() )

            const serverConfig = {
                cors: {
                    enabled: true,
                    options: { origin: 'http://localhost:3000' }
                },
                landingPage: { name: 'Test', description: 'Test' },
                routes: []
            }

            const result = await CommunityServer.start( {
                silent: true,
                stageType: 'test',
                objectOfSchemaArrays: {},
                serverConfig,
                mcpAuthMiddlewareConfig: null,
                envObject: { SERVER_URL: 'http://localhost', SERVER_PORT: '3000' },
                managerVersion: '1.0.0',
                x402Config: null,
                x402Credentials: {},
                x402PrivateKey: null
            } )

            expect( result ).toBe( true )
            expect( mockCors ).toHaveBeenCalledWith( { origin: 'http://localhost:3000' } )
            expect( mockApp.use ).toHaveBeenCalled()
        } )
    } )


    describe( 'Configuration validation errors', () => {
        
        test( 'should handle missing serverConfig', async () => {
            await expect( CommunityServer.start( {
                silent: true,
                stageType: 'test',
                objectOfSchemaArrays: {},
                serverConfig: null,
                mcpAuthMiddlewareConfig: null,
                envObject: { SERVER_URL: 'http://localhost', SERVER_PORT: '3000' },
                managerVersion: '1.0.0',
                x402Config: null,
                x402Credentials: {},
                x402PrivateKey: null
            } ) ).rejects.toThrow()
        } )

        test( 'should handle missing envObject', async () => {
            const serverConfig = {
                landingPage: { name: 'Test', description: 'Test' },
                routes: []
            }

            await expect( CommunityServer.start( {
                silent: true,
                stageType: 'test',
                objectOfSchemaArrays: {},
                serverConfig,
                mcpAuthMiddlewareConfig: null,
                envObject: null,
                managerVersion: '1.0.0',
                x402Config: null,
                x402Credentials: {},
                x402PrivateKey: null
            } ) ).rejects.toThrow()
        } )

        test( 'should handle malformed landing page config', async () => {
            const serverConfig = {
                landingPage: null,
                routes: []
            }

            await expect( CommunityServer.start( {
                silent: true,
                stageType: 'test',
                objectOfSchemaArrays: {},
                serverConfig,
                mcpAuthMiddlewareConfig: null,
                envObject: { SERVER_URL: 'http://localhost', SERVER_PORT: '3000' },
                managerVersion: '1.0.0',
                x402Config: null,
                x402Credentials: {},
                x402PrivateKey: null
            } ) ).rejects.toThrow()
        } )

        test( 'should handle missing routes array', async () => {
            const serverConfig = {
                landingPage: { name: 'Test', description: 'Test' },
                routes: null
            }

            await expect( CommunityServer.start( {
                silent: true,
                stageType: 'test',
                objectOfSchemaArrays: {},
                serverConfig,
                mcpAuthMiddlewareConfig: null,
                envObject: { SERVER_URL: 'http://localhost', SERVER_PORT: '3000' },
                managerVersion: '1.0.0',
                x402Config: null,
                x402Credentials: {},
                x402PrivateKey: null
            } ) ).rejects.toThrow()
        } )
    } )


    describe( 'Port availability validation', () => {
        
        test( 'should successfully validate available ports', async () => {
            const mockServer = {
                listen: jest.fn( ( port, callback ) => callback() ),
                close: jest.fn( ( callback ) => callback() ),
                on: jest.fn()
            }
            
            mockNet.createServer.mockReturnValue( mockServer )

            const serverConfig = {
                landingPage: { name: 'Test', description: 'Test' },
                routes: []
            }

            const result = await CommunityServer.start( {
                silent: true,
                stageType: 'test',
                objectOfSchemaArrays: {},
                serverConfig,
                mcpAuthMiddlewareConfig: null,
                envObject: { SERVER_URL: 'http://localhost', SERVER_PORT: '3000' },
                managerVersion: '1.0.0',
                x402Config: null,
                x402Credentials: {},
                x402PrivateKey: null
            } )

            expect( result ).toBe( true )
            expect( mockNet.createServer ).toHaveBeenCalled()
            expect( mockServer.listen ).toHaveBeenCalledWith( '3000', expect.any( Function ) )
        } )

        test( 'should validate different port configurations', async () => {
            const mockServer = {
                listen: jest.fn( ( port, callback ) => callback() ),
                close: jest.fn( ( callback ) => callback() ),
                on: jest.fn()
            }
            
            mockNet.createServer.mockReturnValue( mockServer )

            const portTests = [ '8080', '9000', '4000' ]

            for( const port of portTests ) {
                jest.clearAllMocks()
                
                const serverConfig = {
                    landingPage: { name: 'Test', description: 'Test' },
                    routes: []
                }

                const result = await CommunityServer.start( {
                    silent: true,
                    stageType: 'test',
                    objectOfSchemaArrays: {},
                    serverConfig,
                    mcpAuthMiddlewareConfig: null,
                    envObject: { SERVER_URL: 'http://localhost', SERVER_PORT: port },
                    managerVersion: '1.0.0',
                    x402Config: null,
                    x402Credentials: {},
                    x402PrivateKey: null
                } )

                expect( result ).toBe( true )
                expect( mockServer.listen ).toHaveBeenCalledWith( port, expect.any( Function ) )
            }
        } )
    } )


    describe( 'Server initialization validation', () => {
        
        test( 'should complete server initialization successfully', async () => {
            mockFs.readFileSync.mockReturnValue( '<html>{{HEADLINE}}</html>' )

            const serverConfig = {
                landingPage: { name: 'Test', description: 'Test' },
                routes: []
            }

            const result = await CommunityServer.start( {
                silent: true,
                stageType: 'test',
                objectOfSchemaArrays: {},
                serverConfig,
                mcpAuthMiddlewareConfig: null,
                envObject: { SERVER_URL: 'http://localhost', SERVER_PORT: '3000' },
                managerVersion: '1.0.0',
                x402Config: null,
                x402Credentials: {},
                x402PrivateKey: null
            } )

            expect( result ).toBe( true )
            expect( mockDeployAdvanced.init ).toHaveBeenCalledWith( { silent: true } )
            expect( mockDeployAdvanced.start ).toHaveBeenCalled()
        } )

        test( 'should handle complex server configuration', async () => {
            const serverConfig = {
                landingPage: { name: 'Complex Server', description: 'Testing complex configurations' },
                routes: [
                    { routePath: '/api/v1', name: 'API v1', auth: { enabled: false } },
                    { routePath: '/api/v2', name: 'API v2', auth: { enabled: false } }
                ],
                cors: {
                    enabled: true,
                    options: { origin: '*', credentials: true }
                }
            }

            const result = await CommunityServer.start( {
                silent: true,
                stageType: 'test',
                objectOfSchemaArrays: {
                    '/api/v1': [ { name: 'v1-schema', namespace: 'v1' } ],
                    '/api/v2': [ { name: 'v2-schema', namespace: 'v2' } ]
                },
                serverConfig,
                mcpAuthMiddlewareConfig: null,
                envObject: { SERVER_URL: 'http://localhost', SERVER_PORT: '3000' },
                managerVersion: '1.0.0',
                x402Config: null,
                x402Credentials: {},
                x402PrivateKey: null
            } )

            expect( result ).toBe( true )
            expect( mockCors ).toHaveBeenCalledWith( { origin: '*', credentials: true } )
            expect( mockApp.get ).toHaveBeenCalled() // Route handlers registered
            expect( mockDeployAdvanced.start ).toHaveBeenCalled()
        } )
    } )

} )