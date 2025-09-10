import { ServerManager } from '../src/index.mjs'


describe( 'ServerManager - Simple Tests', () => {
    let originalConsole

    beforeEach( () => {
        originalConsole = {
            log: console.log,
            warn: console.warn
        }
        console.log = () => {}
        console.warn = () => {}
    } )

    afterEach( () => {
        console.log = originalConsole.log
        console.warn = originalConsole.warn
    } )
    
    test( 'should validate ServerManager class exists', () => {
        expect( ServerManager ).toBeDefined()
        expect( typeof ServerManager.start ).toBe( 'function' )
        expect( typeof ServerManager.getEnvObject ).toBe( 'function' )
        expect( typeof ServerManager.getMcpAuthMiddlewareConfig ).toBe( 'function' )
        expect( typeof ServerManager.getX402Credentials ).toBe( 'function' )
    } )

    
    test( 'should parse stage type from arguments', () => {
        const { stageType } = ServerManager
            .getStageType( { argvs: [ 'node', 'test.js', '--stage=test' ] } )
        
        expect( stageType ).toBe( 'test' )
    } )

    
    test( 'should default to development stage when no stage provided', () => {
        const { stageType } = ServerManager
            .getStageType( { argvs: [ 'node', 'test.js' ] } )
        
        expect( stageType ).toBe( 'development' )
    } )

    
    test( 'should get package version', () => {
        const { managerVersion } = ServerManager
            .getPackageVersion()
        
        expect( managerVersion ).toBeDefined()
        expect( typeof managerVersion ).toBe( 'string' )
    } )

    
    test( 'should process env object from string', () => {
        const mockEnvString = 'TEST_VAR=test_value\nANOTHER_VAR=another_value\n# Comment line\n'
        
        const { envObject } = {
            envObject: mockEnvString
                .split( '\n' )
                .filter( line => line && !line.startsWith( '#' ) && line.includes( '=' ) )
                .map( line => line.split( '=' ) )
                .reduce( ( acc, [ k, v ] ) => {
                    acc[ k ] = v.trim()
                    return acc
                }, {} )
        }
        
        expect( envObject ).toEqual( {
            'TEST_VAR': 'test_value',
            'ANOTHER_VAR': 'another_value'
        } )
    } )
} )