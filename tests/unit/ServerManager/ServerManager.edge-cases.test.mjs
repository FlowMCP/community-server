import { jest } from '@jest/globals'

// Mock fs for error testing
const mockFs = {
    readFileSync: jest.fn(),
    createReadStream: jest.fn(),
    writeFileSync: jest.fn(),
    existsSync: jest.fn()
}

jest.unstable_mockModule( 'fs', () => ({ 
    default: mockFs,
    readFileSync: mockFs.readFileSync,
    createReadStream: mockFs.createReadStream,
    writeFileSync: mockFs.writeFileSync,
    existsSync: mockFs.existsSync
}) )

jest.unstable_mockModule( 'node:fs', () => ({ 
    default: mockFs,
    readFileSync: mockFs.readFileSync,
    createReadStream: mockFs.createReadStream,
    writeFileSync: mockFs.writeFileSync,
    existsSync: mockFs.existsSync,
    statSync: jest.fn(),
    promises: {
        readFile: jest.fn(),
        writeFile: jest.fn(),
        access: jest.fn()
    }
}) )

const { ServerManager } = await import( '../../../src/index.mjs' )
const { testBaseUrl, testEnvPath } = await import( '../../helpers/config.mjs' )

describe( 'ServerManager Edge Cases and Error Handling', () => {

    beforeEach( () => {
        jest.clearAllMocks()
    } )


    describe( 'getPackageVersion error handling', () => {
        test( 'should return default version on file read error', () => {
            mockFs.readFileSync.mockImplementation( () => {
                throw new Error( 'File not found' )
            } )
            
            const { managerVersion } = ServerManager.getPackageVersion()
            
            expect( managerVersion ).toBe( '0.0.0' )
        } )

        test( 'should return default version on JSON parse error', () => {
            mockFs.readFileSync.mockReturnValue( 'invalid json content' )
            
            const { managerVersion } = ServerManager.getPackageVersion()
            
            expect( managerVersion ).toBe( '0.0.0' )
        } )

        test( 'should handle empty file content', () => {
            mockFs.readFileSync.mockReturnValue( '' )
            
            const { managerVersion } = ServerManager.getPackageVersion()
            
            expect( managerVersion ).toBe( '0.0.0' )
        } )

        test( 'should handle malformed package.json', () => {
            mockFs.readFileSync.mockReturnValue( '{"name": "test"}' ) // No version field
            
            const { managerVersion } = ServerManager.getPackageVersion()
            
            expect( managerVersion ).toBeUndefined()
        } )
    } )


    describe( 'getStageType with missing arguments', () => {
        test( 'should default to development when no stage argument provided', () => {
            const consoleSpy = jest.spyOn( console, 'warn' ).mockImplementation( () => {} )
            
            const { stageType } = ServerManager.getStageType( { argvs: [] } )
            
            expect( stageType ).toBe( 'development' )
            expect( consoleSpy ).toHaveBeenCalledWith( 'No stage type provided, defaulting to "development"' )
            
            consoleSpy.mockRestore()
        } )

        test( 'should handle argvs with no stage arguments', () => {
            const consoleSpy = jest.spyOn( console, 'warn' ).mockImplementation( () => {} )
            
            const { stageType } = ServerManager.getStageType( { 
                argvs: [ '--verbose', '--port=3000', '--env=test' ] 
            } )
            
            expect( stageType ).toBe( 'development' )
            expect( consoleSpy ).toHaveBeenCalled()
            
            consoleSpy.mockRestore()
        } )
    } )


    describe( 'X402 credential processing edge cases', () => {
        test( 'should handle x402Config without envSelection', () => {
            const envObject = { SOME_VAR: 'value' }
            const x402Config = { chainId: 1, chainName: 'ethereum' } // No envSelection
            
            const result = ServerManager.getX402Credentials( { envObject, x402Config } )
            
            expect( result ).toEqual( {
                x402Config: x402Config,
                x402Credentials: {},
                x402PrivateKey: null
            } )
        } )

        test( 'should validate environment variable handling for non-array keys', () => {
            const envObject = {} // Empty env object
            const x402Config = {
                chainId: 1,
                chainName: 'ethereum',
                envSelection: [
                    [ 'missingVar', 'MISSING_ENV_VAR' ]
                ]
            }
            
            const result = ServerManager.getX402Credentials( { envObject, x402Config } )
            
            // Non-array env keys don't throw errors, they just get undefined values
            expect( result.x402Credentials.missingVar ).toBeUndefined()
            expect( result.x402PrivateKey ).toBe( null )
        } )

        test( 'should handle array-type environment keys with missing values', () => {
            const envObject = { EXISTING_VAR: 'value' }
            const x402Config = {
                chainId: 1,
                chainName: 'ethereum',
                envSelection: [
                    [ 'arrayVar', [ 'EXISTING_VAR', 'MISSING_VAR' ] ]
                ]
            }
            
            expect( () => {
                ServerManager.getX402Credentials( { envObject, x402Config } )
            } ).toThrow( 'Environment loading failed: Missing environment variable: MISSING_VAR' )
        } )
    } )


    describe( 'Environment file loading error handling', () => {
        test( 'should return empty string when file read fails', () => {
            const serverConfig = {
                env: {
                    'test': '/path/to/nonexistent/.env'
                }
            }
            
            mockFs.readFileSync.mockImplementation( ( path ) => {
                if( path === '/path/to/nonexistent/.env' ) {
                    throw new Error( 'File not found' )
                }
                return ''
            } )
            
            const { envObject } = ServerManager.getEnvObject( {
                stageType: 'test',
                envPath: testEnvPath
            } )
            
            expect( envObject ).toEqual( {} )
        } )

        test( 'should throw error when no environment file configured for stage', () => {
            const serverConfig = {
                env: {
                    'production': '/path/to/prod.env'
                    // No 'development' stage
                }
            }
            
            mockFs.readFileSync.mockImplementation( () => {
                throw new Error( 'File not found' )
            } )

            expect( () => {
                ServerManager.getEnvObject( {
                    stageType: 'development',
                    envPath: 'nonexistent.env'
                } )
            } ).toThrow( 'Error reading environment file' )
        } )
    } )


    describe( 'getWebhookEnv missing values', () => {
        test( 'should log missing environment variables', () => {
            const consoleSpy = jest.spyOn( console, 'log' ).mockImplementation( () => {} )
            
            const serverConfig = {
                env: {
                    'test': '/path/to/test.env'
                }
            }
            
            mockFs.readFileSync.mockReturnValue( 'SOME_OTHER_VAR=value\n' ) // Missing required vars
            
            const result = ServerManager.getWebhookEnv( {
                stageType: 'test',
                envPath: testEnvPath
            } )
            
            expect( consoleSpy ).toHaveBeenCalledWith( 'Missing WEBHOOK_SECRET in .env file' )
            expect( consoleSpy ).toHaveBeenCalledWith( 'Missing WEBHOOK_PORT in .env file' )
            expect( consoleSpy ).toHaveBeenCalledWith( 'Missing PM2_NAME in .env file' )
            
            consoleSpy.mockRestore()
        } )
    } )


    describe( 'Configuration validation edge cases', () => {
        test( 'should handle getMcpAuthMiddlewareConfig with empty routes', () => {
            const activeRoutes = []
            const envObject = {}
            
            const { mcpAuthMiddlewareConfig } = ServerManager.getMcpAuthMiddlewareConfig( { 
                activeRoutes, 
                envObject, 
                silent: true,
                stageType: 'development',
                baseUrl: testBaseUrl
            } )
            
            expect( mcpAuthMiddlewareConfig ).toBeDefined()
            expect( mcpAuthMiddlewareConfig.staticBearer ).toBeUndefined()
            expect( mcpAuthMiddlewareConfig.oauth21 ).toBeUndefined()
            expect( mcpAuthMiddlewareConfig.silent ).toBe( true )
        } )

        test( 'should handle complex serverConfig validation', () => {
            const serverConfig = {
                routes: [],
                env: null
            }
            
            mockFs.readFileSync.mockImplementation( () => {
                throw new Error( 'File not found' )
            } )

            expect( () => {
                ServerManager.getEnvObject( {
                    stageType: 'invalid',
                    envPath: 'invalid/path.env'
                } )
            } ).toThrow( 'Error reading environment file: invalid/path.env' )
        } )
    } )


    describe( 'Multiple private keys warning', () => {
        test( 'should warn about multiple private keys and use first one', () => {
            const consoleSpy = jest.spyOn( console, 'warn' ).mockImplementation( () => {} )
            
            const envObject = {
                'PRIVATE_KEY_1': 'key1',
                'PRIVATE_KEY_2': 'key2'
            }
            
            const x402Config = {
                envSelection: [
                    [ 'firstPrivateKey', 'PRIVATE_KEY_1' ],
                    [ 'secondPrivateKey', 'PRIVATE_KEY_2' ]
                ]
            }
            
            const result = ServerManager.getX402Credentials( { envObject, x402Config } )
            
            expect( consoleSpy ).toHaveBeenCalledWith( 'Multiple private keys found, using the first one' )
            expect( result.x402PrivateKey ).toBe( 'key1' )
            
            consoleSpy.mockRestore()
        } )
    } )

} )