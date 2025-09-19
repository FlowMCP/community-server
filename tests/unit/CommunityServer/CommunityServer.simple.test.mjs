import { jest } from '@jest/globals'

// Simple mocks for basic coverage
const mockApp = { get: jest.fn(), use: jest.fn() }
const mockDeployAdvanced = {
    init: jest.fn( () => ({ app: mockApp, mcps: {}, events: {}, argv: [], server: {} }) ),
    start: jest.fn()
}
const mockX402Middleware = {
    create: jest.fn( async () => ({ mcp: jest.fn( () => jest.fn() ) }) )
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

jest.unstable_mockModule( 'flowmcpServers', () => ({ Deploy: jest.fn(), DeployAdvanced: mockDeployAdvanced }) )
jest.unstable_mockModule( 'x402-mcp-middleware', () => ({ X402Middleware: mockX402Middleware }) )
jest.unstable_mockModule( 'net', () => ({ 
    default: mockNet,
    isIP: mockNet.isIP,
    isIPv4: mockNet.isIPv4,
    isIPv6: mockNet.isIPv6,
    createServer: mockNet.createServer
}) )
jest.unstable_mockModule( 'fs', () => ({ default: mockFs }) )
jest.unstable_mockModule( 'node:fs', () => ({ 
    default: mockFs,
    readFileSync: mockFs.readFileSync,
    createReadStream: jest.fn(),
    writeFileSync: jest.fn(),
    existsSync: jest.fn(),
    statSync: jest.fn(),
    promises: {
        readFile: jest.fn(),
        writeFile: jest.fn(),
        access: jest.fn()
    }
}) )
jest.unstable_mockModule( 'path', () => ({ default: mockPath }) )
jest.unstable_mockModule( 'node:path', () => ({ 
    default: mockPath,
    dirname: mockPath.dirname,
    join: mockPath.join,
    basename: jest.fn( () => 'file.mjs' )
}) )
jest.unstable_mockModule( 'url', () => ({ 
    fileURLToPath: jest.fn( () => '/test/file.mjs' ),
    format: jest.fn( () => 'http://localhost:3000' )
}) )
jest.unstable_mockModule( 'node:url', () => ({ 
    fileURLToPath: jest.fn( () => '/test/file.mjs' ),
    format: jest.fn( () => 'http://localhost:3000' )
}) )
jest.unstable_mockModule( 'cors', () => ({ default: mockCors }) )

// Mock console methods
const consoleSpy = {
    log: jest.spyOn( console, 'log' ).mockImplementation( () => {} ),
    warn: jest.spyOn( console, 'warn' ).mockImplementation( () => {} ),
    error: jest.spyOn( console, 'error' ).mockImplementation( () => {} )
}

const { CommunityServer } = await import( '../../../src/task/CommunityServer.mjs' )

describe( 'CommunityServer Simple Coverage Tests', () => {

    beforeEach( () => {
        jest.clearAllMocks()
        Object.values( consoleSpy ).forEach( spy => spy.mockClear() )
    } )

    afterAll( () => {
        Object.values( consoleSpy ).forEach( spy => spy.mockRestore() )
    } )


    describe( 'Console logging paths', () => {
        test( 'should log warning for missing schemas when not silent', async () => {
            const config = {
                silent: false,
                stageType: 'test',
                objectOfSchemaArrays: {}, // No schemas
                serverConfig: {
                    landingPage: { name: 'Test', description: 'Test' },
                    routes: [{ routePath: '/test', name: 'Test Route' }]
                },
                envObject: { SERVER_URL: 'http://localhost', SERVER_PORT: '3000' },
                managerVersion: '1.0.0'
            }
            
            await CommunityServer.start( config )
            
            expect( consoleSpy.warn ).toHaveBeenCalledWith( '⚠️  No schemas found for route /test' )
        } )

        test( 'should log schema collection summary when not silent', async () => {
            const config = {
                silent: false,
                stageType: 'test',
                objectOfSchemaArrays: {
                    '/test': [{ name: 'schema1', namespace: 'ns1' }]
                },
                serverConfig: {
                    landingPage: { name: 'Test', description: 'Test' },
                    routes: [{ routePath: '/test', name: 'Test Route' }]
                },
                envObject: { SERVER_URL: 'http://localhost', SERVER_PORT: '3000' },
                managerVersion: '1.0.0'
            }
            
            await CommunityServer.start( config )
            
            expect( consoleSpy.log ).toHaveBeenCalledWith( '🔧 Prepared 1 schemas across 1 routes for route-specific deployment' )
        } )

        test( 'should suppress console output when silent is true', async () => {
            const config = {
                silent: true,
                stageType: 'test',
                objectOfSchemaArrays: {},
                serverConfig: {
                    landingPage: { name: 'Test', description: 'Test' },
                    routes: [{ routePath: '/test', name: 'Test Route' }]
                },
                envObject: { SERVER_URL: 'http://localhost', SERVER_PORT: '3000' },
                managerVersion: '1.0.0'
            }
            
            await CommunityServer.start( config )
            
            expect( consoleSpy.warn ).not.toHaveBeenCalledWith( expect.stringContaining( 'No schemas found' ) )
            expect( consoleSpy.log ).not.toHaveBeenCalledWith( expect.stringContaining( 'Collected' ) )
        } )
    } )


    describe( 'X402 middleware for non-test stages', () => {
        test( 'should initialize X402 middleware for development stage', async () => {
            const config = {
                silent: true,
                stageType: 'development',
                objectOfSchemaArrays: {},
                serverConfig: {
                    landingPage: { name: 'Test', description: 'Test' },
                    routes: []
                },
                envObject: { SERVER_URL: 'http://localhost', SERVER_PORT: '3000' },
                managerVersion: '1.0.0',
                x402Config: {
                    chainId: 1,
                    chainName: 'ethereum',
                    contracts: {},
                    paymentOptions: {},
                    restrictedCalls: {}
                },
                x402Credentials: { key: 'value' },
                x402PrivateKey: 'private-key'
            }
            
            await CommunityServer.start( config )
            
            expect( mockX402Middleware.create ).toHaveBeenCalledWith( {
                chainId: 1,
                chainName: 'ethereum',
                contracts: {},
                paymentOptions: {},
                restrictedCalls: {},
                x402Credentials: { key: 'value' },
                x402PrivateKey: 'private-key'
            } )
            expect( mockApp.use ).toHaveBeenCalled()
        } )

        test( 'should initialize X402 middleware for production stage', async () => {
            const config = {
                silent: true,
                stageType: 'production',
                objectOfSchemaArrays: {},
                serverConfig: {
                    landingPage: { name: 'Test', description: 'Test' },
                    routes: []
                },
                envObject: { SERVER_URL: 'http://localhost', SERVER_PORT: '443' },
                managerVersion: '1.0.0',
                x402Config: {
                    chainId: 84532,
                    chainName: 'base-sepolia',
                    contracts: { test: 'contract' },
                    paymentOptions: { test: 'option' },
                    restrictedCalls: { test: 'call' }
                }
            }
            
            await CommunityServer.start( config )
            
            expect( mockX402Middleware.create ).toHaveBeenCalledWith( {
                chainId: 84532,
                chainName: 'base-sepolia',
                contracts: { test: 'contract' },
                paymentOptions: { test: 'option' },
                restrictedCalls: { test: 'call' },
                x402Credentials: undefined,
                x402PrivateKey: undefined
            } )
        } )
    } )


    describe( 'URL construction for different stages', () => {
        test( 'should construct development URL with port', async () => {
            const config = {
                silent: true,
                stageType: 'development',
                objectOfSchemaArrays: {},
                serverConfig: { landingPage: { name: 'Test', description: 'Test' }, routes: [] },
                envObject: { SERVER_URL: 'http://localhost', SERVER_PORT: '3000' },
                managerVersion: '1.0.0',
                x402Config: { chainId: 1, chainName: 'ethereum', contracts: {}, paymentOptions: {}, restrictedCalls: {} }
            }
            
            await CommunityServer.start( config )
            
            expect( mockDeployAdvanced.start ).toHaveBeenCalledWith( 
                expect.objectContaining( {
                    rootUrl: 'http://localhost',
                    serverPort: '3000'
                } )
            )
        } )

        test( 'should construct production URL without port', async () => {
            const config = {
                silent: true,
                stageType: 'production',
                objectOfSchemaArrays: {},
                serverConfig: { landingPage: { name: 'Test', description: 'Test' }, routes: [] },
                envObject: { SERVER_URL: 'https://api.example.com', SERVER_PORT: '443' },
                managerVersion: '1.0.0',
                x402Config: { chainId: 1, chainName: 'ethereum', contracts: {}, paymentOptions: {}, restrictedCalls: {} }
            }
            
            await CommunityServer.start( config )
            
            expect( mockDeployAdvanced.start ).toHaveBeenCalledWith( 
                expect.objectContaining( {
                    rootUrl: 'https://api.example.com',
                    serverPort: '443'
                } )
            )
        } )
    } )

} )