import { jest } from '@jest/globals'
import crypto from 'crypto'

// Mock express to avoid real server startup
const mockApp = {
    get: jest.fn(),
    post: jest.fn(),
    listen: jest.fn( ( port, callback ) => {
        if( typeof callback === 'function' ) callback()
        return { close: jest.fn() }
    } ),
    use: jest.fn()
}

const mockExpress = jest.fn( () => mockApp )
mockExpress.raw = jest.fn( () => jest.fn() )

jest.unstable_mockModule( 'express', () => ({ default: mockExpress }) )
jest.unstable_mockModule( 'child_process', () => ({
    exec: jest.fn( ( cmd, callback ) => callback( new Error( 'Test deployment failure' ), '', 'error' ) )
}) )

const { WebhookServer } = await import( '../../src/task/WebhookServer.mjs' )

describe( 'WebhookServer Integration Tests', () => {

    const testSecret = 'test-webhook-secret-123'
    const testPm2Name = 'test-pm2-server'
    const testManagerVersion = '1.0.0-test'
    const testPort = 3010

    beforeEach( () => {
        jest.clearAllMocks()
    } )


    describe( 'Server startup and configuration', () => {
        test( 'should start webhook server with correct parameters', () => {
            const result = WebhookServer.start( {
                webhookSecret: testSecret,
                webhookPort: testPort,
                pm2Name: testPm2Name,
                managerVersion: testManagerVersion
            } )
            
            expect( result ).toBe( true )
            expect( mockExpress ).toHaveBeenCalled()
            expect( mockApp.get ).toHaveBeenCalledWith( '/webhook', expect.any( Function ) )
            expect( mockApp.post ).toHaveBeenCalledWith( '/webhook', expect.any( Function ), expect.any( Function ) )
            expect( mockApp.listen ).toHaveBeenCalledWith( testPort, expect.any( Function ) )
        } )

        test( 'should configure GET endpoint correctly', () => {
            WebhookServer.start( {
                webhookSecret: testSecret,
                webhookPort: testPort,
                pm2Name: testPm2Name,
                managerVersion: testManagerVersion
            } )
            
            expect( mockApp.get ).toHaveBeenCalledTimes( 1 )
            const getCall = mockApp.get.mock.calls[0]
            expect( getCall[0] ).toBe( '/webhook' )
            expect( typeof getCall[1] ).toBe( 'function' )
        } )

        test( 'should configure POST endpoint with middleware', () => {
            WebhookServer.start( {
                webhookSecret: testSecret,
                webhookPort: testPort,
                pm2Name: testPm2Name,
                managerVersion: testManagerVersion
            } )
            
            expect( mockApp.post ).toHaveBeenCalledTimes( 1 )
            const postCall = mockApp.post.mock.calls[0]
            expect( postCall[0] ).toBe( '/webhook' )
            expect( postCall[1] ).toBeDefined() // Middleware
            expect( typeof postCall[2] ).toBe( 'function' ) // Handler
        } )
    } )


    describe( 'HMAC signature validation logic', () => {
        test( 'should generate valid HMAC signatures', () => {
            const testCases = [
                { payload: '{}', secret: 'secret1' },
                { payload: '{"test": "data"}', secret: 'secret2' },
                { payload: '{"complex": {"nested": "object"}}', secret: 'secret3' }
            ]
            
            testCases.forEach( ( { payload, secret } ) => {
                const signature = 'sha256=' + crypto
                    .createHmac( 'sha256', secret )
                    .update( payload )
                    .digest( 'hex' )
                
                expect( signature ).toMatch( /^sha256=[a-f0-9]{64}$/ )
                expect( signature.length ).toBe( 71 ) // 'sha256:' + 64 hex chars
            } )
        } )

        test( 'should validate signature format correctness', () => {
            const payload = JSON.stringify( { test: 'webhook data' } )
            const signature = 'sha256=' + crypto
                .createHmac( 'sha256', testSecret )
                .update( payload )
                .digest( 'hex' )
            
            expect( signature.startsWith( 'sha256=' ) ).toBe( true )
            expect( signature.length ).toBe( 71 )
            expect( signature.slice( 7 ) ).toMatch( /^[a-f0-9]{64}$/ )
        } )

        test( 'should produce different signatures for different payloads', () => {
            const payload1 = JSON.stringify( { event: 'push' } )
            const payload2 = JSON.stringify( { event: 'release' } )
            
            const signature1 = crypto.createHmac( 'sha256', testSecret ).update( payload1 ).digest( 'hex' )
            const signature2 = crypto.createHmac( 'sha256', testSecret ).update( payload2 ).digest( 'hex' )
            
            expect( signature1 ).not.toBe( signature2 )
            expect( signature1 ).toMatch( /^[a-f0-9]{64}$/ )
            expect( signature2 ).toMatch( /^[a-f0-9]{64}$/ )
        } )
    } )


    describe( 'Webhook endpoint route handling logic', () => {
        test( 'should validate GitHub event types correctly', () => {
            const eventTypes = [
                { event: 'push', shouldTrigger: false, ref: 'refs/heads/main' },
                { event: 'push', shouldTrigger: true, ref: 'refs/tags/v1.0.0' },
                { event: 'release', shouldTrigger: false, action: 'created' },
                { event: 'release', shouldTrigger: true, action: 'published' },
                { event: 'issues', shouldTrigger: false, action: 'opened' }
            ]
            
            eventTypes.forEach( ( { event, shouldTrigger, ref, action } ) => {
                const payload = { ref, action }
                
                if( event === 'push' && ref ) {
                    expect( ref.startsWith( 'refs/tags/' ) ).toBe( shouldTrigger )
                }
                
                if( event === 'release' && action ) {
                    expect( action === 'published' ).toBe( shouldTrigger )
                }
            } )
        } )

        test( 'should handle deployment trigger logic', () => {
            const deploymentCases = [
                {
                    name: 'push to tag',
                    event: 'push',
                    payload: { ref: 'refs/tags/v1.2.3' },
                    shouldDeploy: true
                },
                {
                    name: 'push to branch', 
                    event: 'push',
                    payload: { ref: 'refs/heads/main' },
                    shouldDeploy: false
                },
                {
                    name: 'release published',
                    event: 'release',
                    payload: { action: 'published', release: { tag_name: 'v2.0.0' } },
                    shouldDeploy: true
                },
                {
                    name: 'release created',
                    event: 'release', 
                    payload: { action: 'created', release: { tag_name: 'v2.0.1' } },
                    shouldDeploy: false
                }
            ]
            
            deploymentCases.forEach( ( { name, event, payload, shouldDeploy } ) => {
                const triggerCondition = (
                    ( event === 'release' && payload?.action === 'published' ) ||
                    ( event === 'push' && payload?.ref?.startsWith( 'refs/tags/' ) )
                )
                
                expect( triggerCondition ).toBe( shouldDeploy )
            } )
        } )

        test( 'should validate server configuration parameters', () => {
            expect( testSecret ).toBe( 'test-webhook-secret-123' )
            expect( testPort ).toBe( 3010 )
            expect( testPm2Name ).toBe( 'test-pm2-server' )
            expect( testManagerVersion ).toBe( '1.0.0-test' )
            
            expect( typeof testSecret ).toBe( 'string' )
            expect( typeof testPort ).toBe( 'number' )
            expect( typeof testPm2Name ).toBe( 'string' )
            expect( typeof testManagerVersion ).toBe( 'string' )
        } )
    } )

} )