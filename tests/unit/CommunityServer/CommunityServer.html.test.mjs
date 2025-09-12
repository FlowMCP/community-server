import { jest } from '@jest/globals'

// Mock setup for simplified HTML testing
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

describe( 'CommunityServer HTML Route Registration', () => {

    beforeEach( () => {
        jest.clearAllMocks()
        Object.values( consoleSpy ).forEach( spy => spy.mockClear() )
    } )

    afterAll( () => {
        Object.values( consoleSpy ).forEach( spy => spy.mockRestore() )
    } )


    describe( 'Route handler registration', () => {
        
        test( 'should register root route handler', async () => {
            const serverConfig = {
                landingPage: { name: 'Test Server', description: 'Testing' },
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

            // Verify route handler registration
            expect( mockApp.get ).toHaveBeenCalled()
            const rootRouteCall = mockApp.get.mock.calls.find( call => call[0] === '/' )
            expect( rootRouteCall ).toBeDefined()
        } )

        test( 'should register route handlers for configured routes', async () => {
            const serverConfig = {
                landingPage: { name: 'Test Server', description: 'Testing' },
                routes: [
                    { routePath: '/api/users', name: 'Users API' },
                    { routePath: '/api/orders', name: 'Orders API' }
                ]
            }

            await CommunityServer.start( {
                silent: true,
                stageType: 'test',
                objectOfSchemaArrays: {
                    '/api/users': [{ name: 'user-schema', namespace: 'users' }],
                    '/api/orders': [{ name: 'order-schema', namespace: 'orders' }]
                },
                serverConfig,
                mcpAuthMiddlewareConfig: null,
                envObject: { SERVER_URL: 'http://localhost', SERVER_PORT: '3000' },
                managerVersion: '1.0.0',
                x402Config: null,
                x402Credentials: {},
                x402PrivateKey: null
            } )

            // Verify all route handlers are registered
            expect( mockApp.get ).toHaveBeenCalled()
            
            const rootRouteCall = mockApp.get.mock.calls.find( call => call[0] === '/' )
            const usersRouteCall = mockApp.get.mock.calls.find( call => call[0] === '/api/users' )
            const ordersRouteCall = mockApp.get.mock.calls.find( call => call[0] === '/api/orders' )
            
            expect( rootRouteCall ).toBeDefined()
            expect( usersRouteCall ).toBeDefined()
            expect( ordersRouteCall ).toBeDefined()
        } )

        test( 'should register route handlers even with empty schema arrays', async () => {
            const serverConfig = {
                landingPage: { name: 'Test Server', description: 'Testing' },
                routes: [
                    { routePath: '/empty-route', name: 'Empty Route' }
                ]
            }

            await CommunityServer.start( {
                silent: true,
                stageType: 'test',
                objectOfSchemaArrays: {
                    '/empty-route': []
                },
                serverConfig,
                mcpAuthMiddlewareConfig: null,
                envObject: { SERVER_URL: 'http://localhost', SERVER_PORT: '3000' },
                managerVersion: '1.0.0',
                x402Config: null,
                x402Credentials: {},
                x402PrivateKey: null
            } )

            const emptyRouteCall = mockApp.get.mock.calls.find( call => call[0] === '/empty-route' )
            expect( emptyRouteCall ).toBeDefined()
        } )
    } )


    describe( 'Schema processing for route configuration', () => {
        
        test( 'should process schemas correctly for DeployAdvanced', async () => {
            const serverConfig = {
                landingPage: { name: 'Test Server', description: 'Testing' },
                routes: [
                    { routePath: '/test', name: 'Test Route' }
                ]
            }

            const schemas = [
                { name: 'test-schema', namespace: 'test', description: 'Test schema' }
            ]

            await CommunityServer.start( {
                silent: true,
                stageType: 'test',
                objectOfSchemaArrays: { '/test': schemas },
                serverConfig,
                mcpAuthMiddlewareConfig: null,
                envObject: { SERVER_URL: 'http://localhost', SERVER_PORT: '3000' },
                managerVersion: '1.0.0',
                x402Config: null,
                x402Credentials: {},
                x402PrivateKey: null
            } )

            // Verify DeployAdvanced.start was called with correct schema configuration
            const startCallArgs = mockDeployAdvanced.start.mock.calls[0][0]
            expect( startCallArgs.objectOfSchemaArrays['/test'] ).toEqual( schemas )
        } )

        test( 'should log warnings for routes with missing schemas when not silent', async () => {
            const serverConfig = {
                landingPage: { name: 'Test Server', description: 'Testing' },
                routes: [
                    { routePath: '/missing-schemas', name: 'Route Without Schemas' }
                ]
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

            expect( consoleSpy.warn ).toHaveBeenCalledWith( '⚠️  No schemas found for route /missing-schemas' )
        } )

        test( 'should suppress warnings when silent mode is enabled', async () => {
            const serverConfig = {
                landingPage: { name: 'Test Server', description: 'Testing' },
                routes: [
                    { routePath: '/missing-schemas', name: 'Route Without Schemas' }
                ]
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

            expect( consoleSpy.warn ).not.toHaveBeenCalledWith( expect.stringContaining( 'No schemas found' ) )
        } )
    } )


    describe( 'URL construction for different environments', () => {
        
        test( 'should construct URLs correctly for different stage types', async () => {
            const testCases = [
                { 
                    stageType: 'test', 
                    expectedRootUrl: 'http://localhost',
                    expectedServerPort: '8080'
                },
                { 
                    stageType: 'development', 
                    expectedRootUrl: 'http://localhost',
                    expectedServerPort: '3000',
                    x402Config: { chainId: 1, chainName: 'ethereum', contracts: {}, paymentOptions: {}, restrictedCalls: {} }
                }
            ]

            for( const testCase of testCases ) {
                jest.clearAllMocks()
                
                const serverConfig = {
                    landingPage: { name: 'Test Server', description: 'Testing' },
                    routes: []
                }

                await CommunityServer.start( {
                    silent: true,
                    stageType: testCase.stageType,
                    objectOfSchemaArrays: {},
                    serverConfig,
                    mcpAuthMiddlewareConfig: null,
                    envObject: { 
                        SERVER_URL: testCase.expectedRootUrl, 
                        SERVER_PORT: testCase.expectedServerPort 
                    },
                    managerVersion: '1.0.0',
                    x402Config: testCase.x402Config || null,
                    x402Credentials: {},
                    x402PrivateKey: null
                } )

                const startCallArgs = mockDeployAdvanced.start.mock.calls[0][0]
                expect( startCallArgs.rootUrl ).toBe( testCase.expectedRootUrl )
                expect( startCallArgs.serverPort ).toBe( testCase.expectedServerPort )
            }
        } )
    } )

} )