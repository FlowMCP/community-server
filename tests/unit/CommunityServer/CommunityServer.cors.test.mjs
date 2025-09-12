import { jest } from '@jest/globals'

// Mock setup
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

describe( 'CommunityServer CORS Tests', () => {

    beforeEach( () => {
        jest.clearAllMocks()
        Object.values( consoleSpy ).forEach( spy => spy.mockClear() )
    } )

    afterAll( () => {
        Object.values( consoleSpy ).forEach( spy => spy.mockRestore() )
    } )


    describe( 'CORS Middleware Configuration', () => {
        
        test( 'should apply CORS middleware when enabled with null options', async () => {
            const serverConfig = {
                cors: {
                    enabled: true,
                    options: null
                },
                landingPage: { name: 'Test', description: 'Test' },
                routes: []
            }

            await CommunityServer.start( {
                silent: false,
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

            expect( mockCors ).toHaveBeenCalledWith( null )
            expect( mockApp.use ).toHaveBeenCalledWith( expect.any( Function ) )
            expect( consoleSpy.log ).toHaveBeenCalledWith( '🌐 CORS middleware enabled with options:', null )
        } )

        test( 'should apply CORS middleware when enabled with custom options', async () => {
            const corsOptions = {
                origin: 'http://localhost:6274',
                credentials: true,
                methods: ['GET', 'POST']
            }
            
            const serverConfig = {
                cors: {
                    enabled: true,
                    options: corsOptions
                },
                landingPage: { name: 'Test', description: 'Test' },
                routes: []
            }

            await CommunityServer.start( {
                silent: false,
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

            expect( mockCors ).toHaveBeenCalledWith( corsOptions )
            expect( mockApp.use ).toHaveBeenCalledWith( expect.any( Function ) )
            expect( consoleSpy.log ).toHaveBeenCalledWith( '🌐 CORS middleware enabled with options:', corsOptions )
        } )

        test( 'should not apply CORS middleware when disabled', async () => {
            const serverConfig = {
                cors: {
                    enabled: false,
                    options: null
                },
                landingPage: { name: 'Test', description: 'Test' },
                routes: []
            }

            await CommunityServer.start( {
                silent: false,
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

            expect( mockCors ).not.toHaveBeenCalled()
            expect( consoleSpy.log ).not.toHaveBeenCalledWith( expect.stringContaining( 'CORS middleware enabled' ), expect.anything() )
        } )

        test( 'should not apply CORS middleware when cors config is missing', async () => {
            const serverConfig = {
                landingPage: { name: 'Test', description: 'Test' },
                routes: []
            }

            await CommunityServer.start( {
                silent: false,
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

            expect( mockCors ).not.toHaveBeenCalled()
            expect( consoleSpy.log ).not.toHaveBeenCalledWith( expect.stringContaining( 'CORS middleware enabled' ), expect.anything() )
        } )

        test( 'should not log CORS message when silent mode is enabled', async () => {
            const serverConfig = {
                cors: {
                    enabled: true,
                    options: null
                },
                landingPage: { name: 'Test', description: 'Test' },
                routes: []
            }

            await CommunityServer.start( {
                silent: true, // Silent mode enabled
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

            expect( mockCors ).toHaveBeenCalledWith( null )
            expect( mockApp.use ).toHaveBeenCalledWith( expect.any( Function ) )
            expect( consoleSpy.log ).not.toHaveBeenCalledWith( '🌐 CORS middleware enabled with options:', null )
        } )

        test( 'should apply CORS before auth middleware', async () => {
            const serverConfig = {
                cors: {
                    enabled: true,
                    options: null
                },
                landingPage: { name: 'Test', description: 'Test' },
                routes: []
            }

            const mcpAuthMiddlewareConfig = {
                routes: {
                    '/test/sse': { authType: 'staticBearer', token: 'test-token' }
                }
            }

            let corsCallOrder = 0
            let authCallOrder = 0
            let callCounter = 0

            mockApp.use.mockImplementation( () => {
                callCounter++
                if( mockCors.mock.calls.length > 0 && corsCallOrder === 0 ) {
                    corsCallOrder = callCounter
                }
            } )

            mockMcpAuthMiddleware.create.mockImplementation( async () => {
                authCallOrder = callCounter + 1
                return { router: jest.fn( () => jest.fn() ) }
            } )

            await CommunityServer.start( {
                silent: false,
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

            expect( mockCors ).toHaveBeenCalled()
            expect( mockMcpAuthMiddleware.create ).toHaveBeenCalled()
            expect( corsCallOrder ).toBeLessThan( authCallOrder )
        } )
    } )


    describe( 'CORS with different stage types', () => {
        
        test( 'should apply CORS in development stage', async () => {
            const serverConfig = {
                cors: {
                    enabled: true,
                    options: null
                },
                landingPage: { name: 'Test', description: 'Test' },
                routes: []
            }

            await CommunityServer.start( {
                silent: false,
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

            expect( mockCors ).toHaveBeenCalledWith( null )
        } )

        test( 'should apply CORS in production stage', async () => {
            const serverConfig = {
                cors: {
                    enabled: true,
                    options: null
                },
                landingPage: { name: 'Test', description: 'Test' },
                routes: []
            }

            await CommunityServer.start( {
                silent: false,
                stageType: 'production',
                objectOfSchemaArrays: {},
                serverConfig,
                mcpAuthMiddlewareConfig: null,
                envObject: { SERVER_URL: 'http://production.com', SERVER_PORT: '443' },
                managerVersion: '1.0.0',
                x402Config: { chainId: 1, chainName: 'ethereum', contracts: {}, paymentOptions: {}, restrictedCalls: {} },
                x402Credentials: {},
                x402PrivateKey: null
            } )

            expect( mockCors ).toHaveBeenCalledWith( null )
        } )
    } )
} )