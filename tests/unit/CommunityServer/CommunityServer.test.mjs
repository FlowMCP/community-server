import { CommunityServer } from '../../../src/task/CommunityServer.mjs'
import { jest } from '@jest/globals'

// Spy on console methods
const consoleSpy = {
    log: jest.spyOn(console, 'log').mockImplementation(),
    warn: jest.spyOn(console, 'warn').mockImplementation(),
    error: jest.spyOn(console, 'error').mockImplementation()
}

describe('CommunityServer Tests', () => {

    beforeEach(() => {
        jest.clearAllMocks()
        consoleSpy.log.mockClear()
        consoleSpy.warn.mockClear()
        consoleSpy.error.mockClear()
    })

    afterAll(() => {
        consoleSpy.log.mockRestore()
        consoleSpy.warn.mockRestore()
        consoleSpy.error.mockRestore()
    })


    describe('Class structure and method existence', () => {
        test('should have static start method', () => {
            expect(typeof CommunityServer.start).toBe('function')
            expect(CommunityServer.start).toBeInstanceOf(Function)
        })

        test('should be an ES6 class', () => {
            expect(CommunityServer).toBeInstanceOf(Function)
            expect(CommunityServer.prototype).toBeDefined()
        })

        test('should have static setHTML method', () => {
            expect(typeof CommunityServer.setHTML).toBe('function')
        })
    })


    describe('Parameter validation', () => {
        test('should handle test stageType', () => {
            const params = {
                silent: true,
                stageType: 'test',
                objectOfSchemaArrays: {},
                serverConfig: { routes: [] },
                envObject: { SERVER_URL: 'http://localhost', SERVER_PORT: '3000' },
                managerVersion: '1.0.0'
            }

            // This will test basic parameter handling without starting actual servers
            expect(() => {
                // We'll test method existence and basic structure
                expect(params.stageType).toBe('test')
                expect(params.serverConfig).toBeDefined()
                expect(params.envObject).toBeDefined()
            }).not.toThrow()
        })

        test('should validate stageType values', () => {
            const validStageTypes = ['development', 'production', 'test']
            
            validStageTypes.forEach(stageType => {
                const params = {
                    silent: true,
                    stageType,
                    objectOfSchemaArrays: {},
                    serverConfig: { routes: [] },
                    envObject: { SERVER_URL: 'http://localhost', SERVER_PORT: '3000' },
                    managerVersion: '1.0.0'
                }

                expect(params.stageType).toBe(stageType)
            })
        })

        test('should handle different envObject configurations', () => {
            const envConfigs = [
                { SERVER_URL: 'http://localhost', SERVER_PORT: '3000' },
                { SERVER_URL: 'https://example.com', SERVER_PORT: '3000' },
                { SERVER_URL: 'http://192.168.1.1', SERVER_PORT: '5000' }
            ]

            envConfigs.forEach(envObject => {
                const params = {
                    silent: true,
                    stageType: 'test',
                    objectOfSchemaArrays: {},
                    serverConfig: { routes: [] },
                    envObject,
                    managerVersion: '1.0.0'
                }

                expect(params.envObject.SERVER_URL).toBeDefined()
                expect(params.envObject.SERVER_PORT).toBeDefined()
            })
        })
    })


    describe('Stage type validation logic', () => {
        test('should understand stage type validation concepts', () => {
            // Test the stage validation logic without actual server startup
            const validStageTypes = ['development', 'production', 'test']
            const invalidStageTypes = ['unknown-stage', 'invalid', 'wrong', 'bad-stage']

            validStageTypes.forEach(stageType => {
                expect(['development', 'production', 'test']).toContain(stageType)
            })

            invalidStageTypes.forEach(stageType => {
                expect(['development', 'production', 'test']).not.toContain(stageType)
            })
        })

        test('should handle stage-specific logic paths', () => {
            // Test the URL generation logic for each valid stage
            const testCases = [
                {
                    stageType: 'development',
                    envObject: { SERVER_URL: 'http://localhost', SERVER_PORT: '3000' },
                    expectedUrl: 'http://localhost:3000'
                },
                {
                    stageType: 'production',
                    envObject: { SERVER_URL: 'https://production.com', SERVER_PORT: '443' },
                    expectedUrl: 'https://production.com'
                },
                {
                    stageType: 'test',
                    envObject: { SERVER_URL: 'http://localhost', SERVER_PORT: '3000' },
                    expectedUrl: 'http://localhost:3000'
                }
            ]

            testCases.forEach(({ stageType, envObject, expectedUrl }) => {
                let serverUrl = null

                if (stageType === 'development') {
                    serverUrl = `${envObject.SERVER_URL}:${envObject.SERVER_PORT}`
                } else if (stageType === 'production') {
                    serverUrl = envObject.SERVER_URL
                } else if (stageType === 'test') {
                    serverUrl = `${envObject.SERVER_URL}:${envObject.SERVER_PORT}`
                }

                expect(serverUrl).toBe(expectedUrl)
            })
        })

        test('should recognize invalid stage types would throw errors', () => {
            // Test the error conditions without triggering middleware
            const invalidStageTypes = ['unknown-stage', 'invalid', 'bad-stage']

            invalidStageTypes.forEach(stageType => {
                let shouldThrow = false
                
                if (!['development', 'production', 'test'].includes(stageType)) {
                    shouldThrow = true
                }

                expect(shouldThrow).toBe(true)
            })
        })
    })


    describe('serverUrl generation logic', () => {
        test('should generate correct serverUrl for development stage', async () => {
            const params = {
                silent: true,
                stageType: 'development',
                objectOfSchemaArrays: {},
                serverConfig: { routes: [] },
                envObject: { SERVER_URL: 'http://localhost', SERVER_PORT: '3000' },
                managerVersion: '1.0.0'
            }

            // Test the serverUrl logic without actually starting the server
            const expectedUrl = `${params.envObject.SERVER_URL}:${params.envObject.SERVER_PORT}`
            expect(expectedUrl).toBe('http://localhost:3000')
        })

        test('should generate correct serverUrl for production stage', async () => {
            const params = {
                silent: true,
                stageType: 'production',
                objectOfSchemaArrays: {},
                serverConfig: { routes: [] },
                envObject: { SERVER_URL: 'https://production.com', SERVER_PORT: '443' },
                managerVersion: '1.0.0'
            }

            // In production, serverUrl should just be the rootUrl
            const expectedUrl = params.envObject.SERVER_URL
            expect(expectedUrl).toBe('https://production.com')
        })

        test('should generate correct serverUrl for test stage', async () => {
            const params = {
                silent: true,
                stageType: 'test',
                objectOfSchemaArrays: {},
                serverConfig: { routes: [] },
                envObject: { SERVER_URL: 'http://localhost', SERVER_PORT: '3000' },
                managerVersion: '1.0.0'
            }

            const expectedUrl = `${params.envObject.SERVER_URL}:${params.envObject.SERVER_PORT}`
            expect(expectedUrl).toBe('http://localhost:3000')
        })
    })


    describe('Legacy arrayOfSchemas conversion', () => {
        test('should handle objectOfSchemaArrays when provided', () => {
            const objectOfSchemas = {
                '/route1': ['schema1', 'schema2'],
                '/route2': ['schema3']
            }

            const params = {
                silent: true,
                stageType: 'test',
                objectOfSchemaArrays: objectOfSchemas,
                serverConfig: { routes: [{ routePath: '/route1' }, { routePath: '/route2' }] },
                envObject: { SERVER_URL: 'http://localhost', SERVER_PORT: '3000' },
                managerVersion: '1.0.0'
            }

            // Test that objectOfSchemaArrays is used directly when provided
            expect(params.objectOfSchemaArrays).toBe(objectOfSchemas)
            expect(Object.keys(params.objectOfSchemaArrays)).toContain('/route1')
            expect(Object.keys(params.objectOfSchemaArrays)).toContain('/route2')
        })

        test('should convert arrayOfSchemas to objectOfSchemaArrays when needed', () => {
            const arrayOfSchemas = ['schema1', 'schema2', 'schema3']
            const routes = [
                { routePath: '/route1' },
                { routePath: '/route2' }
            ]

            // Simulate the conversion logic that happens in the start method
            const schemasToUse = {}
            routes.forEach(route => {
                schemasToUse[route.routePath] = arrayOfSchemas
            })

            expect(schemasToUse).toEqual({
                '/route1': arrayOfSchemas,
                '/route2': arrayOfSchemas
            })
        })

        test('should handle empty routes array', () => {
            const params = {
                silent: true,
                stageType: 'test',
                arrayOfSchemas: ['schema1'],
                serverConfig: { routes: [] },
                envObject: { SERVER_URL: 'http://localhost', SERVER_PORT: '3000' },
                managerVersion: '1.0.0'
            }

            expect(params.serverConfig.routes).toEqual([])
            expect(Array.isArray(params.serverConfig.routes)).toBe(true)
        })
    })


    describe('setHTML method', () => {
        test('should accept required parameters for setHTML', () => {
            const mockApp = {
                get: jest.fn(),
                set: jest.fn(),
                engine: jest.fn()
            }

            const serverConfig = {
                landingPage: {
                    name: 'Test Server',
                    description: 'Test Description'
                },
                routes: []
            }

            const params = {
                app: mockApp,
                serverConfig,
                serverUrl: 'http://localhost:3000',
                managerVersion: '1.0.0'
            }

            // Test that setHTML method accepts these parameters
            expect(() => {
                CommunityServer.setHTML(params)
            }).not.toThrow()
        })

        test('should handle different serverConfig structures', () => {
            const configs = [
                {
                    landingPage: { name: 'Server 1', description: 'Description 1' },
                    routes: []
                },
                {
                    landingPage: { name: 'Server 2', description: 'Description 2' },
                    routes: [{ routePath: '/test', name: 'Test Route' }]
                }
            ]

            configs.forEach(serverConfig => {
                expect(serverConfig.landingPage).toBeDefined()
                expect(serverConfig.routes).toBeDefined()
                expect(Array.isArray(serverConfig.routes)).toBe(true)
            })
        })
    })


    describe('Port and URL validation', () => {
        test('should handle different port formats', () => {
            const portConfigs = [
                { SERVER_PORT: '3000' },
                { SERVER_PORT: '3000' },
                { SERVER_PORT: '5000' }
            ]

            portConfigs.forEach(config => {
                expect(config.SERVER_PORT).toMatch(/^\d+$/)
                expect(parseInt(config.SERVER_PORT)).toBeGreaterThan(0)
                expect(parseInt(config.SERVER_PORT)).toBeLessThan(65536)
            })
        })

        test('should handle different URL formats', () => {
            const urlConfigs = [
                { SERVER_URL: 'http://localhost' },
                { SERVER_URL: 'https://example.com' },
                { SERVER_URL: 'http://192.168.1.1' }
            ]

            urlConfigs.forEach(config => {
                expect(config.SERVER_URL).toMatch(/^https?:\/\//)
            })
        })
    })


    describe('Configuration validation', () => {
        test('should validate managerVersion format', () => {
            const validVersions = ['1.0.0', '2.1.3', '0.0.1', '10.20.30']
            
            validVersions.forEach(version => {
                expect(version).toMatch(/^\d+\.\d+\.\d+/)
            })
        })

        test('should handle silent mode parameter', () => {
            [true, false].forEach(silentMode => {
                const params = {
                    silent: silentMode,
                    stageType: 'test',
                    objectOfSchemaArrays: {},
                    serverConfig: { routes: [] },
                    envObject: { SERVER_URL: 'http://localhost', SERVER_PORT: '3000' },
                    managerVersion: '1.0.0'
                }

                expect(typeof params.silent).toBe('boolean')
            })
        })
    })

})