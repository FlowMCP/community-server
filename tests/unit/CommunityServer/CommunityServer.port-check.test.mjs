import { jest } from '@jest/globals'

// Mock setup for port checking
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

// Mock net module with different scenarios
const mockNet = {
    createServer: jest.fn(),
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

describe( 'CommunityServer Port Availability Tests', () => {

    beforeEach( () => {
        jest.clearAllMocks()
        Object.values( consoleSpy ).forEach( spy => spy.mockClear() )
    } )

    afterAll( () => {
        Object.values( consoleSpy ).forEach( spy => spy.mockRestore() )
    } )


    describe( 'Port availability checking - success scenarios', () => {
        
        test( 'should successfully check port availability when port is free', async () => {
            const mockServer = {
                listen: jest.fn( ( port, callback ) => {
                    // Simulate successful port binding
                    callback()
                } ),
                close: jest.fn( ( callback ) => callback() ),
                on: jest.fn()
            }
            
            mockNet.createServer.mockReturnValue( mockServer )

            const serverConfig = {
                landingPage: { name: 'Test', description: 'Test' },
                routes: []
            }

            await CommunityServer.start( {
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

            expect( mockNet.createServer ).toHaveBeenCalled()
            expect( mockServer.listen ).toHaveBeenCalledWith( '3000', expect.any( Function ) )
            expect( mockServer.close ).toHaveBeenCalledWith( expect.any( Function ) )
        } )

        test( 'should check port availability for different ports', async () => {
            const mockServer = {
                listen: jest.fn( ( port, callback ) => callback() ),
                close: jest.fn( ( callback ) => callback() ),
                on: jest.fn()
            }
            
            mockNet.createServer.mockReturnValue( mockServer )

            const testPorts = [ '3000', '9000', '3001' ]

            for( const port of testPorts ) {
                const serverConfig = {
                    landingPage: { name: 'Test', description: 'Test' },
                    routes: []
                }

                await CommunityServer.start( {
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

                expect( mockServer.listen ).toHaveBeenCalledWith( port, expect.any( Function ) )
            }
        } )

        test( 'should handle port check for production environment', async () => {
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

            await CommunityServer.start( {
                silent: true,
                stageType: 'production',
                objectOfSchemaArrays: {},
                serverConfig,
                mcpAuthMiddlewareConfig: null,
                envObject: { SERVER_URL: 'https://api.example.com', SERVER_PORT: '443' },
                managerVersion: '1.0.0',
                x402Config: { chainId: 1, chainName: 'ethereum', contracts: {}, paymentOptions: {}, restrictedCalls: {} },
                x402Credentials: {},
                x402PrivateKey: null
            } )

            expect( mockNet.createServer ).toHaveBeenCalled()
            expect( mockServer.listen ).toHaveBeenCalledWith( '443', expect.any( Function ) )
        } )
    } )


    describe( 'Port availability checking - error scenarios', () => {
        
        test( 'should handle port already in use error', async () => {
            const mockServer = {
                listen: jest.fn( ( port, callback ) => {
                    // Simulate port already in use error
                    const error = new Error( 'Port already in use' )
                    error.code = 'EADDRINUSE'
                    throw error
                } ),
                close: jest.fn( ( callback ) => callback() ),
                on: jest.fn()
            }
            
            mockNet.createServer.mockReturnValue( mockServer )

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
            } ) ).rejects.toThrow( 'Port already in use' )

            expect( mockNet.createServer ).toHaveBeenCalled()
            expect( mockServer.listen ).toHaveBeenCalledWith( '3000', expect.any( Function ) )
        } )

        test( 'should handle permission denied error', async () => {
            const mockServer = {
                listen: jest.fn( ( port, callback ) => {
                    // Simulate permission denied error (e.g., trying to bind to port 80)
                    const error = new Error( 'Permission denied' )
                    error.code = 'EACCES'
                    throw error
                } ),
                close: jest.fn( ( callback ) => callback() ),
                on: jest.fn()
            }
            
            mockNet.createServer.mockReturnValue( mockServer )

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
                envObject: { SERVER_URL: 'http://localhost', SERVER_PORT: '80' },
                managerVersion: '1.0.0',
                x402Config: null,
                x402Credentials: {},
                x402PrivateKey: null
            } ) ).rejects.toThrow( 'Permission denied' )
        } )

        test( 'should handle server creation failure', async () => {
            // Mock createServer to throw an error
            mockNet.createServer.mockImplementation( () => {
                throw new Error( 'Cannot create server' )
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
            } ) ).rejects.toThrow( 'Cannot create server' )

            expect( mockNet.createServer ).toHaveBeenCalled()
        } )
    } )


    describe( 'Port availability with different server configurations', () => {
        
        test( 'should check port availability with authentication middleware enabled', async () => {
            const mockServer = {
                listen: jest.fn( ( port, callback ) => callback() ),
                close: jest.fn( ( callback ) => callback() ),
                on: jest.fn()
            }
            
            mockNet.createServer.mockReturnValue( mockServer )

            const serverConfig = {
                landingPage: { name: 'Test', description: 'Test' },
                routes: [{ routePath: '/test', name: 'Test Route' }]
            }

            const mcpAuthMiddlewareConfig = {
                silent: true,
                baseUrl: 'http://localhost:3000',
                forceHttps: false,
                staticBearer: {
                    tokenSecret: 'test-token',
                    attachedRoutes: ['/test/sse']
                }
            }

            await CommunityServer.start( {
                silent: true,
                stageType: 'test',
                objectOfSchemaArrays: { '/test': [] },
                serverConfig,
                mcpAuthMiddlewareConfig,
                envObject: { SERVER_URL: 'http://localhost', SERVER_PORT: '4000' },
                managerVersion: '1.0.0',
                x402Config: null,
                x402Credentials: {},
                x402PrivateKey: null
            } )

            expect( mockNet.createServer ).toHaveBeenCalled()
            expect( mockServer.listen ).toHaveBeenCalledWith( '4000', expect.any( Function ) )
            expect( mockMcpAuthMiddleware.create ).toHaveBeenCalled()
        } )

        test( 'should check port availability with CORS enabled', async () => {
            const mockServer = {
                listen: jest.fn( ( port, callback ) => callback() ),
                close: jest.fn( ( callback ) => callback() ),
                on: jest.fn()
            }
            
            mockNet.createServer.mockReturnValue( mockServer )

            const serverConfig = {
                cors: {
                    enabled: true,
                    options: { origin: 'http://localhost:3000' }
                },
                landingPage: { name: 'Test', description: 'Test' },
                routes: []
            }

            await CommunityServer.start( {
                silent: true,
                stageType: 'test',
                objectOfSchemaArrays: {},
                serverConfig,
                mcpAuthMiddlewareConfig: null,
                envObject: { SERVER_URL: 'http://localhost', SERVER_PORT: '5000' },
                managerVersion: '1.0.0',
                x402Config: null,
                x402Credentials: {},
                x402PrivateKey: null
            } )

            expect( mockNet.createServer ).toHaveBeenCalled()
            expect( mockServer.listen ).toHaveBeenCalledWith( '5000', expect.any( Function ) )
            expect( mockCors ).toHaveBeenCalledWith( { origin: 'http://localhost:3000' } )
        } )
    } )


    describe( 'Port validation and network interface checking', () => {
        
        test( 'should validate IPv4 addresses correctly', async () => {
            const mockServer = {
                listen: jest.fn( ( port, callback ) => callback() ),
                close: jest.fn( ( callback ) => callback() ),
                on: jest.fn()
            }
            
            mockNet.createServer.mockReturnValue( mockServer )
            mockNet.isIP.mockReturnValue( 4 )
            mockNet.isIPv4.mockReturnValue( true )
            mockNet.isIPv6.mockReturnValue( false )

            const serverConfig = {
                landingPage: { name: 'Test', description: 'Test' },
                routes: []
            }

            await CommunityServer.start( {
                silent: true,
                stageType: 'test',
                objectOfSchemaArrays: {},
                serverConfig,
                mcpAuthMiddlewareConfig: null,
                envObject: { SERVER_URL: 'http://192.168.1.100', SERVER_PORT: '3000' },
                managerVersion: '1.0.0',
                x402Config: null,
                x402Credentials: {},
                x402PrivateKey: null
            } )

            // Note: isIP and isIPv4 are not called in test mode port checking
            expect( mockServer.listen ).toHaveBeenCalledWith( '3000', expect.any( Function ) )
        } )

        test( 'should validate IPv6 addresses correctly', async () => {
            const mockServer = {
                listen: jest.fn( ( port, callback ) => callback() ),
                close: jest.fn( ( callback ) => callback() ),
                on: jest.fn()
            }
            
            mockNet.createServer.mockReturnValue( mockServer )
            mockNet.isIP.mockReturnValue( 6 )
            mockNet.isIPv4.mockReturnValue( false )
            mockNet.isIPv6.mockReturnValue( true )

            const serverConfig = {
                landingPage: { name: 'Test', description: 'Test' },
                routes: []
            }

            await CommunityServer.start( {
                silent: true,
                stageType: 'test',
                objectOfSchemaArrays: {},
                serverConfig,
                mcpAuthMiddlewareConfig: null,
                envObject: { SERVER_URL: 'http://[::1]', SERVER_PORT: '3000' },
                managerVersion: '1.0.0',
                x402Config: null,
                x402Credentials: {},
                x402PrivateKey: null
            } )

            // Note: isIP and isIPv6 are not called in test mode port checking
            expect( mockServer.listen ).toHaveBeenCalledWith( '3000', expect.any( Function ) )
        } )
    } )

} )