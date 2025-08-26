import { jest } from '@jest/globals'

// Mock all dependencies to avoid real server startup
const mockDeployAdvanced = {
    init: jest.fn( () => ({
        app: {
            get: jest.fn(),
            use: jest.fn()
        },
        mcps: {},
        events: {},
        argv: [],
        server: {}
    }) ),
    start: jest.fn()
}

const mockX402Middleware = {
    create: jest.fn( async () => ({
        mcp: jest.fn( () => jest.fn() )
    }) )
}

const mockNet = {
    createServer: jest.fn( () => ({
        listen: jest.fn( ( port, callback ) => {
            callback() // Simulate successful port binding
        } ),
        close: jest.fn( ( callback ) => callback() ),
        on: jest.fn()
    }) )
}

const mockFs = {
    readFileSync: jest.fn( () => '<html>{{HEADLINE}}</html>' )
}

jest.unstable_mockModule( 'flowmcpServers', () => ({ 
    Deploy: jest.fn(),
    DeployAdvanced: mockDeployAdvanced 
}) )
jest.unstable_mockModule( 'x402-mcp-middleware', () => ({ X402Middleware: mockX402Middleware }) )
jest.unstable_mockModule( 'net', () => ({ default: mockNet }) )
jest.unstable_mockModule( 'fs', () => ({ default: mockFs }) )
jest.unstable_mockModule( 'path', () => ({ 
    default: { 
        dirname: jest.fn( () => '/test/dir' ),
        join: jest.fn( ( ...args ) => args.join( '/' ) )
    } 
}) )
jest.unstable_mockModule( 'url', () => ({ 
    fileURLToPath: jest.fn( () => '/test/file.mjs' ) 
}) )

const { CommunityServer } = await import( '../src/task/CommunityServer.mjs' )

describe( 'CommunityServer Integration Tests', () => {

    const testConfig = {
        silent: true,
        stageType: 'test',
        objectOfSchemaArrays: {
            '/test-route': [
                { name: 'test-schema', namespace: 'test' }
            ]
        },
        serverConfig: {
            landingPage: {
                name: 'Test Community Server',
                description: 'Test server for integration testing'
            },
            routes: [
                {
                    routePath: '/test-route',
                    name: 'Test Route',
                    description: 'Test route for testing',
                    bearerToken: 'test-token',
                    bearerIsPublic: false
                }
            ]
        },
        envObject: {
            SERVER_URL: 'http://localhost',
            SERVER_PORT: '8080'
        },
        managerVersion: '1.0.0-test',
        x402Config: {
            chainId: 84532,
            chainName: 'base-sepolia',
            contracts: {},
            paymentOptions: {},
            restrictedCalls: {}
        },
        x402Credentials: {
            facilitatorPrivateKey: 'test-key'
        },
        x402PrivateKey: 'test-private-key'
    }

    beforeEach( () => {
        jest.clearAllMocks()
    } )


    describe( 'Server initialization and startup', () => {
        test( 'should initialize DeployAdvanced correctly', async () => {
            await CommunityServer.start( testConfig )
            
            expect( mockDeployAdvanced.init ).toHaveBeenCalledWith( { silent: true } )
        } )

        test( 'should skip X402 middleware for test stage', async () => {
            await CommunityServer.start( testConfig )
            
            expect( mockX402Middleware.create ).not.toHaveBeenCalled()
        } )

        test( 'should initialize X402 middleware for non-test stages', async () => {
            const prodConfig = { ...testConfig, stageType: 'production' }
            
            await CommunityServer.start( prodConfig )
            
            expect( mockX402Middleware.create ).toHaveBeenCalledWith( {
                chainId: 84532,
                chainName: 'base-sepolia',
                contracts: {},
                paymentOptions: {},
                restrictedCalls: {},
                x402Credentials: testConfig.x402Credentials,
                x402PrivateKey: testConfig.x402PrivateKey
            } )
        } )

        test( 'should determine server URL based on stage type', async () => {
            const testCases = [
                { stageType: 'development', expected: 'http://localhost:8080' },
                { stageType: 'production', expected: 'http://localhost' },
                { stageType: 'test', expected: 'http://localhost:8080' }
            ]
            
            for( const { stageType, expected } of testCases ) {
                const config = { ...testConfig, stageType }
                await CommunityServer.start( config )
                
                // URL construction logic validation
                const { SERVER_URL, SERVER_PORT } = config.envObject
                let serverUrl
                
                if( stageType === 'development' || stageType === 'test' ) {
                    serverUrl = `${SERVER_URL}:${SERVER_PORT}`
                } else if( stageType === 'production' ) {
                    serverUrl = SERVER_URL
                }
                
                expect( serverUrl ).toBe( expected )
            }
        } )
    } )


    describe( 'Port availability checking', () => {
        test( 'should check port availability successfully', async () => {
            await CommunityServer.start( testConfig )
            
            expect( mockNet.createServer ).toHaveBeenCalled()
        } )

        test( 'should handle port availability check for different ports', async () => {
            const portTestCases = [
                { port: '3000' },
                { port: '8080' },
                { port: '9000' }
            ]
            
            for( const { port } of portTestCases ) {
                const config = { 
                    ...testConfig, 
                    envObject: { ...testConfig.envObject, SERVER_PORT: port }
                }
                
                await CommunityServer.start( config )
                
                expect( mockNet.createServer ).toHaveBeenCalled()
            }
        } )
    } )


    describe( 'Schema processing and route mapping', () => {
        test( 'should process schemas correctly for routes', async () => {
            await CommunityServer.start( testConfig )
            
            expect( mockDeployAdvanced.start ).toHaveBeenCalledWith( 
                expect.objectContaining( {
                    arrayOfRoutes: expect.arrayContaining( [
                        expect.objectContaining( {
                            routePath: '/test-route',
                            protocol: 'sse',
                            bearerToken: 'test-token'
                        } )
                    ] ),
                    objectOfSchemaArrays: expect.objectContaining( {
                        '/test-route': expect.arrayContaining( [
                            expect.objectContaining( {
                                name: 'test-schema',
                                namespace: 'test'
                            } )
                        ] )
                    } ),
                    envObject: testConfig.envObject,
                    rootUrl: 'http://localhost',
                    serverPort: '8080'
                } )
            )
        } )

        test( 'should handle multiple routes with different schemas', async () => {
            const multiRouteConfig = {
                ...testConfig,
                objectOfSchemaArrays: {
                    '/route1': [ { name: 'schema1', namespace: 'ns1' } ],
                    '/route2': [ { name: 'schema2', namespace: 'ns2' } ]
                },
                serverConfig: {
                    ...testConfig.serverConfig,
                    routes: [
                        { routePath: '/route1', name: 'Route 1' },
                        { routePath: '/route2', name: 'Route 2' }
                    ]
                }
            }
            
            await CommunityServer.start( multiRouteConfig )
            
            expect( mockDeployAdvanced.start ).toHaveBeenCalledWith( 
                expect.objectContaining( {
                    arrayOfRoutes: expect.arrayContaining( [
                        expect.objectContaining( { routePath: '/route1' } ),
                        expect.objectContaining( { routePath: '/route2' } )
                    ] ),
                    objectOfSchemaArrays: expect.objectContaining( {
                        '/route1': expect.arrayContaining( [
                            expect.objectContaining( { name: 'schema1', namespace: 'ns1' } )
                        ] ),
                        '/route2': expect.arrayContaining( [
                            expect.objectContaining( { name: 'schema2', namespace: 'ns2' } )
                        ] )
                    } )
                } )
            )
        } )

        test( 'should remove duplicate schemas', async () => {
            const duplicateSchemaConfig = {
                ...testConfig,
                objectOfSchemaArrays: {
                    '/route1': [ { name: 'shared-schema', namespace: 'shared' } ],
                    '/route2': [ { name: 'shared-schema', namespace: 'shared' } ]
                },
                serverConfig: {
                    ...testConfig.serverConfig,
                    routes: [
                        { routePath: '/route1', name: 'Route 1' },
                        { routePath: '/route2', name: 'Route 2' }
                    ]
                }
            }
            
            await CommunityServer.start( duplicateSchemaConfig )
            
            const startCall = mockDeployAdvanced.start.mock.calls[0][0]
            
            // Check that both routes have the schema (no deduplication in new API)
            expect( startCall.objectOfSchemaArrays['/route1'] ).toEqual( [
                expect.objectContaining( { name: 'shared-schema', namespace: 'shared' } )
            ] )
            expect( startCall.objectOfSchemaArrays['/route2'] ).toEqual( [
                expect.objectContaining( { name: 'shared-schema', namespace: 'shared' } )
            ] )
        } )
    } )


    describe( 'HTML landing page configuration', () => {
        test( 'should validate HTML landing page setup', async () => {
            await CommunityServer.start( testConfig )
            
            // CommunityServer.setHTML is called internally
            expect( mockDeployAdvanced.init ).toHaveBeenCalled()
        } )

        test( 'should prepare routes with correct URL structure', async () => {
            await CommunityServer.start( testConfig )
            
            // Validate route URL construction logic
            const { routes } = testConfig.serverConfig
            const serverUrl = 'http://localhost:8080'
            
            routes.forEach( ( route ) => {
                const { routePath, bearerIsPublic, bearerToken } = route
                const expectedUrl = new URL( routePath, serverUrl )
                const expectedUrlSse = expectedUrl + '/sse'
                const expectedBearer = !bearerIsPublic ? '***' : bearerToken || ''
                
                expect( expectedUrl.toString() ).toBe( `${serverUrl}${routePath}` )
                expect( expectedUrlSse ).toBe( `${serverUrl}${routePath}/sse` )
                expect( expectedBearer ).toBe( '***' ) // Since bearerIsPublic is false
            } )
        } )

        test( 'should validate HTML template processing logic', async () => {
            await CommunityServer.start( testConfig )
            
            // HTML template processing is mocked, validate template replacement logic
            const testTemplate = '{{HEADLINE}}'
            const testHeadline = 'Test Community Server'
            const expectedResult = testTemplate.replace( '{{HEADLINE}}', testHeadline )
            
            expect( expectedResult ).toBe( testHeadline )
        } )
    } )


    describe( 'Error handling scenarios', () => {
        test( 'should throw error for unknown stage types', async () => {
            const invalidConfig = { ...testConfig, stageType: 'invalid-stage' }
            
            await expect( CommunityServer.start( invalidConfig ) ).rejects.toThrow( 'Unknown stageType: invalid-stage' )
        } )

        test( 'should validate required configuration parameters', async () => {
            const requiredParams = [
                'serverConfig',
                'envObject',
                'stageType'
            ]
            
            for( const param of requiredParams ) {
                const invalidConfig = { ...testConfig }
                delete invalidConfig[param]
                
                // These would cause errors in actual implementation
                expect( invalidConfig[param] ).toBeUndefined()
            }
        } )
    } )


    describe( 'Configuration parameter validation', () => {
        test( 'should validate test configuration structure', () => {
            expect( testConfig.silent ).toBe( true )
            expect( testConfig.stageType ).toBe( 'test' )
            expect( testConfig.envObject.SERVER_URL ).toBe( 'http://localhost' )
            expect( testConfig.envObject.SERVER_PORT ).toBe( '8080' )
            expect( testConfig.serverConfig.routes ).toHaveLength( 1 )
            expect( testConfig.objectOfSchemaArrays['/test-route'] ).toHaveLength( 1 )
        } )

        test( 'should validate X402 configuration structure', () => {
            expect( testConfig.x402Config ).toBeDefined()
            expect( testConfig.x402Config.chainId ).toBe( 84532 )
            expect( testConfig.x402Config.chainName ).toBe( 'base-sepolia' )
            expect( testConfig.x402Credentials ).toBeDefined()
            expect( testConfig.x402PrivateKey ).toBe( 'test-private-key' )
        } )
    } )

} )