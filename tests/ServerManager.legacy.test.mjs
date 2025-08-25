import { jest } from '@jest/globals'

// Mock dependencies to test ServerManager in isolation
const mockCommunityServer = {
    start: jest.fn( async () => true )
}

const mockWebhookServer = {
    start: jest.fn( () => true )
}

jest.unstable_mockModule( '../src/task/CommunityServer.mjs', () => ({
    CommunityServer: mockCommunityServer
}) )

jest.unstable_mockModule( '../src/task/WebhookServer.mjs', () => ({
    WebhookServer: mockWebhookServer
}) )

const { ServerManager } = await import( '../src/index.mjs' )

describe( 'ServerManager Legacy Support Tests', () => {

    const baseConfig = {
        silent: true,
        stageType: 'test',
        serverConfig: {
            routes: [
                { routePath: '/route1', name: 'Route 1' },
                { routePath: '/route2', name: 'Route 2' }
            ]
        },
        envObject: { SERVER_URL: 'http://localhost', SERVER_PORT: '8080' },
        managerVersion: '1.0.0',
        webhookSecret: 'test-secret',
        webhookPort: 3001,
        pm2Name: 'test-server',
        x402Config: {},
        x402Credentials: {},
        x402PrivateKey: null
    }

    beforeEach( () => {
        jest.clearAllMocks()
    } )


    describe( 'Legacy arrayOfSchemas support', () => {
        test( 'should convert arrayOfSchemas to objectOfSchemaArrays', async () => {
            const arrayOfSchemas = [
                { name: 'schema1', namespace: 'ns1' },
                { name: 'schema2', namespace: 'ns2' }
            ]
            
            const config = {
                ...baseConfig,
                arrayOfSchemas,
                // No objectOfSchemaArrays provided - should trigger legacy conversion
            }
            
            const result = await ServerManager.start( config )
            
            expect( result ).toBe( true )
            expect( mockCommunityServer.start ).toHaveBeenCalledWith( 
                expect.objectContaining( {
                    objectOfSchemaArrays: {
                        '/route1': arrayOfSchemas,
                        '/route2': arrayOfSchemas
                    }
                } )
            )
        } )

        test( 'should use objectOfSchemaArrays when provided', async () => {
            const objectOfSchemaArrays = {
                '/route1': [ { name: 'schema1', namespace: 'ns1' } ],
                '/route2': [ { name: 'schema2', namespace: 'ns2' } ]
            }
            
            const config = {
                ...baseConfig,
                objectOfSchemaArrays,
                arrayOfSchemas: [ { name: 'ignored', namespace: 'ignored' } ]
            }
            
            const result = await ServerManager.start( config )
            
            expect( result ).toBe( true )
            expect( mockCommunityServer.start ).toHaveBeenCalledWith( 
                expect.objectContaining( {
                    objectOfSchemaArrays
                } )
            )
        } )

        test( 'should handle empty routes for legacy conversion', async () => {
            const config = {
                ...baseConfig,
                arrayOfSchemas: [ { name: 'schema1', namespace: 'ns1' } ],
                serverConfig: { routes: [] }
            }
            
            const result = await ServerManager.start( config )
            
            expect( result ).toBe( true )
            expect( mockCommunityServer.start ).toHaveBeenCalledWith( 
                expect.objectContaining( {
                    objectOfSchemaArrays: {}
                } )
            )
        } )
    } )


    describe( 'Server startup integration', () => {
        test( 'should start both CommunityServer and WebhookServer', async () => {
            const config = {
                ...baseConfig,
                objectOfSchemaArrays: {
                    '/test': [ { name: 'test-schema', namespace: 'test' } ]
                }
            }
            
            const result = await ServerManager.start( config )
            
            expect( result ).toBe( true )
            expect( mockCommunityServer.start ).toHaveBeenCalledTimes( 1 )
            expect( mockWebhookServer.start ).toHaveBeenCalledTimes( 1 )
        } )

        test( 'should pass correct parameters to CommunityServer', async () => {
            const config = {
                ...baseConfig,
                objectOfSchemaArrays: {
                    '/test': [ { name: 'test-schema', namespace: 'test' } ]
                }
            }
            
            await ServerManager.start( config )
            
            expect( mockCommunityServer.start ).toHaveBeenCalledWith( {
                silent: config.silent,
                stageType: config.stageType,
                objectOfSchemaArrays: config.objectOfSchemaArrays,
                serverConfig: config.serverConfig,
                envObject: config.envObject,
                pm2Name: config.pm2Name,
                managerVersion: config.managerVersion,
                x402Config: config.x402Config,
                x402Credentials: config.x402Credentials,
                x402PrivateKey: config.x402PrivateKey
            } )
        } )

        test( 'should pass correct parameters to WebhookServer', async () => {
            const config = {
                ...baseConfig,
                objectOfSchemaArrays: {
                    '/test': [ { name: 'test-schema', namespace: 'test' } ]
                }
            }
            
            await ServerManager.start( config )
            
            expect( mockWebhookServer.start ).toHaveBeenCalledWith( {
                webhookSecret: config.webhookSecret,
                webhookPort: config.webhookPort,
                pm2Name: config.pm2Name,
                managerVersion: config.managerVersion
            } )
        } )
    } )


    describe( 'Parameter validation and edge cases', () => {
        test( 'should handle missing arrayOfSchemas and objectOfSchemaArrays', async () => {
            const config = {
                ...baseConfig
                // No arrayOfSchemas or objectOfSchemaArrays
            }
            
            const result = await ServerManager.start( config )
            
            expect( result ).toBe( true )
            expect( mockCommunityServer.start ).toHaveBeenCalledWith( 
                expect.objectContaining( {
                    objectOfSchemaArrays: undefined
                } )
            )
        } )

        test( 'should handle complex route structures for legacy conversion', async () => {
            const arrayOfSchemas = [
                { name: 'schema1', namespace: 'ns1', description: 'Test schema 1' },
                { name: 'schema2', namespace: 'ns2', description: 'Test schema 2' }
            ]
            
            const config = {
                ...baseConfig,
                arrayOfSchemas,
                serverConfig: {
                    routes: [
                        { 
                            routePath: '/complex-route',
                            name: 'Complex Route',
                            description: 'A complex route for testing',
                            bearerToken: 'token-123',
                            additionalProps: { test: true }
                        }
                    ]
                }
            }
            
            const result = await ServerManager.start( config )
            
            expect( result ).toBe( true )
            expect( mockCommunityServer.start ).toHaveBeenCalledWith( 
                expect.objectContaining( {
                    objectOfSchemaArrays: {
                        '/complex-route': arrayOfSchemas
                    }
                } )
            )
        } )

        test( 'should validate return value consistency', async () => {
            const config = {
                ...baseConfig,
                objectOfSchemaArrays: {}
            }
            
            const result = await ServerManager.start( config )
            
            expect( result ).toBe( true )
            expect( typeof result ).toBe( 'boolean' )
        } )
    } )


    describe( 'Async operation handling', () => {
        test( 'should wait for CommunityServer startup before starting WebhookServer', async () => {
            let communityServerStarted = false
            let webhookServerStarted = false
            
            mockCommunityServer.start.mockImplementation( async () => {
                await new Promise( resolve => setTimeout( resolve, 10 ) )
                communityServerStarted = true
                expect( webhookServerStarted ).toBe( false ) // Webhook should not start yet
                return true
            } )
            
            mockWebhookServer.start.mockImplementation( () => {
                expect( communityServerStarted ).toBe( true ) // Community should be started
                webhookServerStarted = true
                return true
            } )
            
            const config = {
                ...baseConfig,
                objectOfSchemaArrays: {}
            }
            
            const result = await ServerManager.start( config )
            
            expect( result ).toBe( true )
            expect( communityServerStarted ).toBe( true )
            expect( webhookServerStarted ).toBe( true )
        } )
    } )

} )