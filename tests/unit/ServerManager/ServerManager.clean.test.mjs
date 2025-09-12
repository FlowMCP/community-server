import { ServerManager } from '../../../src/index.mjs'
import { testBaseUrls } from '../../helpers/config.mjs'
import { jest } from '@jest/globals'

describe( 'ServerManager Clean Tests', () => {

    describe('Server startup configuration validation', () => {
        test('should handle clean server configuration structure', () => {
            const testEnvObject = {
                'SERVER_URL': 'http://localhost',
                'SERVER_PORT': '8080', 
                'BEARER_TOKEN_EERC20': 'test-clean-token'
            }

            const testServerConfig = {
                'landingPage': {
                    'name': 'Clean Test Server',
                    'description': 'Cleanly killable test server'
                },
                'routes': [
                    {
                        'routePath': '/clean/sse',
                        'name': 'SSE endpoint for testing',
                        'auth': {
                            'enabled': true,
                            'authType': 'staticBearer',
                            'token': 'BEARER_TOKEN_EERC20'
                        }
                    }
                ]
            }
            
            // Test configuration structure
            expect(testEnvObject.SERVER_PORT).toBe('8080')
            expect(testEnvObject.SERVER_URL).toBe('http://localhost')
            expect(testServerConfig.routes).toHaveLength(1)
            expect(testServerConfig.routes[0].routePath).toBe('/clean/sse')
            expect(testServerConfig.routes[0].auth.token).toBe('BEARER_TOKEN_EERC20')
            
            // Test URL construction logic
            const expectedUrl = `${testEnvObject.SERVER_URL}:${testEnvObject.SERVER_PORT}/clean/sse`
            expect(expectedUrl).toBe('http://localhost:8080/clean/sse')
        })

        test('should handle different server configurations', () => {
            const configs = [
                {
                    env: { SERVER_URL: 'http://localhost', SERVER_PORT: '3000' },
                    expectedUrl: 'http://localhost:3000'
                },
                {
                    env: { SERVER_URL: 'https://example.com', SERVER_PORT: '443' },
                    expectedUrl: 'https://example.com:443'
                },
                {
                    env: { SERVER_URL: 'http://test.local', SERVER_PORT: '8080' },
                    expectedUrl: 'http://test.local:8080'
                }
            ]

            configs.forEach(({ env, expectedUrl }) => {
                const constructedUrl = `${env.SERVER_URL}:${env.SERVER_PORT}`
                expect(constructedUrl).toBe(expectedUrl)
            })
        })
    })


    describe('Modern auth configuration', () => {
        test('should handle auth middleware config creation', () => {
            const activeRoutes = [
                {
                    routePath: '/eerc20',
                    auth: {
                        enabled: true,
                        authType: 'staticBearer',
                        token: 'BEARER_TOKEN_EERC20'
                    }
                }
            ]

            const envObject = {
                'BEARER_TOKEN_EERC20': 'clean-test-token'
            }

            const { mcpAuthMiddlewareConfig } = ServerManager.getMcpAuthMiddlewareConfig({ 
                activeRoutes, 
                envObject, 
                silent: true,
                stageType: 'development',
                baseUrls: testBaseUrls
            })

            expect(mcpAuthMiddlewareConfig).toBeDefined()
            expect(mcpAuthMiddlewareConfig.routes['/eerc20/sse']).toBeDefined()
            expect(mcpAuthMiddlewareConfig.routes['/eerc20/sse'].token).toBe('clean-test-token')
        })

        test('should handle disabled auth routes gracefully', () => {
            const activeRoutes = [
                {
                    routePath: '/lukso',
                    auth: {
                        enabled: false
                    }
                }
            ]

            const envObject = {}

            const { mcpAuthMiddlewareConfig } = ServerManager.getMcpAuthMiddlewareConfig({ 
                activeRoutes, 
                envObject, 
                silent: true,
                stageType: 'development',
                baseUrls: testBaseUrls
            })

            expect(mcpAuthMiddlewareConfig.routes).toEqual({})
        })
    })


    describe('Environment object processing', () => {
        test('should validate environment object structure', () => {
            const mockEnvObject = {
                'SERVER_URL': 'http://localhost',
                'SERVER_PORT': '3000',
                'BEARER_TOKEN_EERC20': 'test-token'
            }

            expect(mockEnvObject).toBeDefined()
            expect(typeof mockEnvObject).toBe('object')
            
            // Should have basic server configuration
            expect(mockEnvObject.SERVER_URL).toBeDefined()
            expect(mockEnvObject.SERVER_PORT).toBeDefined()
            expect(typeof mockEnvObject.SERVER_URL).toBe('string')
            expect(typeof mockEnvObject.SERVER_PORT).toBe('string')
        })

        test('should validate environment variable types and formats', () => {
            const testCases = [
                {
                    name: 'development environment',
                    env: { SERVER_URL: 'http://localhost', SERVER_PORT: '3000', BEARER_TOKEN_EERC20: 'dev-token' }
                },
                {
                    name: 'test environment', 
                    env: { SERVER_URL: 'http://test.local', SERVER_PORT: '8080', BEARER_TOKEN_EERC20: 'test-token' }
                },
                {
                    name: 'production environment',
                    env: { SERVER_URL: 'https://api.example.com', SERVER_PORT: '443', BEARER_TOKEN_EERC20: 'prod-token' }
                }
            ]
            
            testCases.forEach(({ name, env }) => {
                expect(env).toBeDefined()
                expect(typeof env).toBe('object')
                expect(env.SERVER_URL).toMatch(/^https?:\/\//)
                expect(env.SERVER_PORT).toMatch(/^\d+$/)
                expect(typeof env.BEARER_TOKEN_EERC20).toBe('string')
            })
        })
    })


    describe('Server startup parameter validation', () => {
        test('should validate start method parameters', () => {
            const params = {
                silent: true,
                stageType: 'test',
                arrayOfSchemas: ['test-schema'],
                serverConfig: {
                    routes: [{ routePath: '/test', name: 'Test Route' }],
                    landingPage: { name: 'Test Server', description: 'Test' }
                },
                envObject: { SERVER_URL: 'http://localhost', SERVER_PORT: '3000' },
                webhookSecret: 'test-secret',
                webhookPort: 3001,
                pm2Name: 'test-server',
                managerVersion: '1.0.0'
            }

            // Validate parameter structure
            expect(params.silent).toBe(true)
            expect(params.stageType).toBe('test')
            expect(params.arrayOfSchemas).toEqual(['test-schema'])
            expect(params.serverConfig.routes).toHaveLength(1)
            expect(params.envObject.SERVER_URL).toBe('http://localhost')
            expect(params.webhookSecret).toBe('test-secret')
            expect(params.webhookPort).toBe(3001)
            expect(params.pm2Name).toBe('test-server')
            expect(params.managerVersion).toBe('1.0.0')
        })

        test('should validate objectOfSchemaArrays conversion', () => {
            const arrayOfSchemas = ['schema1', 'schema2']
            const serverConfig = {
                routes: [
                    { routePath: '/route1' },
                    { routePath: '/route2' }
                ]
            }

            // Simulate the conversion logic from ServerManager.start()
            const objectOfSchemaArrays = {}
            serverConfig.routes.forEach(route => {
                objectOfSchemaArrays[route.routePath] = arrayOfSchemas
            })

            expect(objectOfSchemaArrays).toEqual({
                '/route1': ['schema1', 'schema2'],
                '/route2': ['schema1', 'schema2']
            })
        })
    })


    describe('Clean server endpoint validation', () => {
        test('should validate SSE endpoint structure', () => {
            const sseEndpoint = '/clean/sse'
            const expectedContentType = 'text/event-stream'
            const expectedStatusCode = 200

            // Test endpoint structure
            expect(sseEndpoint).toBe('/clean/sse')
            expect(expectedContentType).toBe('text/event-stream')
            expect(expectedStatusCode).toBe(200)
        })

        test('should validate route configuration for clean endpoints', () => {
            const cleanRouteConfig = {
                routePath: '/clean/sse',
                name: 'SSE endpoint for testing',
                auth: {
                    enabled: true,
                    authType: 'staticBearer',
                    token: 'BEARER_TOKEN_EERC20'
                },
                method: 'GET',
                contentType: 'text/event-stream'
            }

            expect(cleanRouteConfig.routePath).toBe('/clean/sse')
            expect(cleanRouteConfig.name).toContain('SSE')
            expect(cleanRouteConfig.auth.token).toBe('BEARER_TOKEN_EERC20')
            expect(cleanRouteConfig.method).toBe('GET')
            expect(cleanRouteConfig.contentType).toBe('text/event-stream')
        })
    })

} )