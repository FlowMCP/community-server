import { jest } from '@jest/globals'
import crypto from 'crypto'

// Mock child_process for exec testing
const mockExec = jest.fn()
jest.unstable_mockModule( 'child_process', () => ({
    exec: mockExec
}) )

// Mock console methods to test console.log calls
const consoleSpy = {
    log: jest.spyOn( console, 'log' ).mockImplementation( () => {} ),
    warn: jest.spyOn( console, 'warn' ).mockImplementation( () => {} ),
    error: jest.spyOn( console, 'error' ).mockImplementation( () => {} )
}

// Create mock express app with handlers we can directly invoke
const createMockApp = () => {
    const handlers = {}
    return {
        get: jest.fn( ( path, handler ) => { handlers[`GET:${path}`] = handler } ),
        post: jest.fn( ( path, middleware, handler ) => { handlers[`POST:${path}`] = handler } ),
        listen: jest.fn( ( port, callback ) => {
            if( typeof callback === 'function' ) callback()
            return { close: jest.fn() }
        } ),
        use: jest.fn(),
        handlers // Expose handlers for testing
    }
}

const mockApp = createMockApp()
const mockExpress = jest.fn( () => mockApp )
mockExpress.raw = jest.fn( () => jest.fn() )

jest.unstable_mockModule( 'express', () => ({ default: mockExpress }) )

const { WebhookServer } = await import( '../../../src/task/WebhookServer.mjs' )

describe( 'WebhookServer Complete Coverage Tests', () => {

    const testConfig = {
        webhookSecret: 'test-secret-123',
        webhookPort: 3020,
        pm2Name: 'test-pm2-app',
        managerVersion: '2.0.0-test'
    }

    beforeEach( () => {
        jest.clearAllMocks()
        Object.values( consoleSpy ).forEach( spy => spy.mockClear() )
    } )


    describe( 'GET /webhook endpoint handlers', () => {
        test( 'should execute GET handler and log endpoint access', () => {
            WebhookServer.start( testConfig )
            
            const mockReq = {}
            const mockRes = {
                status: jest.fn().mockReturnThis(),
                send: jest.fn()
            }
            
            // Get the handler and execute it
            const getHandler = mockApp.handlers['GET:/webhook']
            getHandler( mockReq, mockRes )
            
            expect( consoleSpy.log ).toHaveBeenCalledWith( '🔒 Endpoint accessed' )
            expect( mockRes.status ).toHaveBeenCalledWith( 200 )
            expect( mockRes.send ).toHaveBeenCalledWith( `Webhook endpoint is active: ${testConfig.managerVersion}` )
        } )
    } )


    describe( 'POST /webhook request validation', () => {
        let postHandler
        
        beforeEach( () => {
            WebhookServer.start( testConfig )
            postHandler = mockApp.handlers['POST:/webhook']
        } )

        test( 'should handle missing signature', () => {
            const mockReq = {
                headers: {}, // No signature header
                body: Buffer.from( '{}' )
            }
            const mockRes = {
                status: jest.fn().mockReturnThis(),
                send: jest.fn()
            }
            
            postHandler( mockReq, mockRes )
            
            expect( consoleSpy.log ).toHaveBeenCalledWith( '✅ Webhook received' )
            expect( consoleSpy.warn ).toHaveBeenCalledWith( '❌ Signature missing or body is not a Buffer' )
            expect( mockRes.status ).toHaveBeenCalledWith( 400 )
            expect( mockRes.send ).toHaveBeenCalledWith( 'Invalid request' )
        } )

        test( 'should handle non-Buffer body', () => {
            const mockReq = {
                headers: { 'x-hub-signature-256': 'sha256=test' },
                body: 'string body' // Not a Buffer
            }
            const mockRes = {
                status: jest.fn().mockReturnThis(),
                send: jest.fn()
            }
            
            postHandler( mockReq, mockRes )
            
            expect( consoleSpy.warn ).toHaveBeenCalledWith( '❌ Signature missing or body is not a Buffer' )
            expect( mockRes.status ).toHaveBeenCalledWith( 400 )
        } )

        test( 'should handle HMAC creation errors', () => {
            // Mock crypto to throw error
            const originalCreateHmac = crypto.createHmac
            crypto.createHmac = jest.fn( () => {
                throw new Error( 'HMAC creation failed' )
            } )
            
            const mockReq = {
                headers: { 'x-hub-signature-256': 'sha256=test' },
                body: Buffer.from( '{}' )
            }
            const mockRes = {
                status: jest.fn().mockReturnThis(),
                send: jest.fn()
            }
            
            postHandler( mockReq, mockRes )
            
            expect( consoleSpy.error ).toHaveBeenCalledWith( '❌ HMAC error:', expect.any( Error ) )
            expect( mockRes.status ).toHaveBeenCalledWith( 500 )
            expect( mockRes.send ).toHaveBeenCalledWith( 'HMAC failed' )
            
            // Restore original crypto
            crypto.createHmac = originalCreateHmac
        } )

        test( 'should handle signature mismatch', () => {
            const mockReq = {
                headers: { 'x-hub-signature-256': 'sha256=wrong-signature' },
                body: Buffer.from( '{}' )
            }
            const mockRes = {
                status: jest.fn().mockReturnThis(),
                send: jest.fn()
            }
            
            postHandler( mockReq, mockRes )
            
            expect( consoleSpy.warn ).toHaveBeenCalledWith( '❌ Signature mismatch' )
            expect( mockRes.status ).toHaveBeenCalledWith( 403 )
            expect( mockRes.send ).toHaveBeenCalledWith( 'Invalid signature' )
        } )

        test( 'should handle JSON parse errors', () => {
            const invalidJson = 'invalid json content'
            const validSignature = 'sha256=' + crypto
                .createHmac( 'sha256', testConfig.webhookSecret )
                .update( invalidJson )
                .digest( 'hex' )
            
            const mockReq = {
                headers: { 'x-hub-signature-256': validSignature },
                body: Buffer.from( invalidJson )
            }
            const mockRes = {
                status: jest.fn().mockReturnThis(),
                send: jest.fn()
            }
            
            postHandler( mockReq, mockRes )
            
            expect( consoleSpy.error ).toHaveBeenCalledWith( '❌ JSON parse error:', expect.any( Error ) )
            expect( mockRes.status ).toHaveBeenCalledWith( 400 )
            expect( mockRes.send ).toHaveBeenCalledWith( 'Invalid JSON' )
        } )
    } )


    describe( 'GitHub event processing and deployment logic', () => {
        let postHandler
        
        beforeEach( () => {
            WebhookServer.start( testConfig )
            postHandler = mockApp.handlers['POST:/webhook']
        } )

        const createValidRequest = ( payload, event = 'push' ) => {
            const payloadString = JSON.stringify( payload )
            const validSignature = 'sha256=' + crypto
                .createHmac( 'sha256', testConfig.webhookSecret )
                .update( payloadString )
                .digest( 'hex' )
            
            return {
                headers: { 
                    'x-hub-signature-256': validSignature,
                    'x-github-event': event
                },
                body: Buffer.from( payloadString )
            }
        }

        test( 'should log GitHub event details', () => {
            const payload = { ref: 'refs/heads/main', repository: { name: 'test' } }
            const mockReq = createValidRequest( payload, 'push' )
            const mockRes = {
                status: jest.fn().mockReturnThis(),
                send: jest.fn()
            }
            
            postHandler( mockReq, mockRes )
            
            expect( consoleSpy.log ).toHaveBeenCalledWith( '📩 GitHub event: push' )
            expect( consoleSpy.log ).toHaveBeenCalledWith( '🎯 Ref: refs/heads/main' )
        } )

        test( 'should handle push to tag events and trigger deployment', () => {
            const payload = { ref: 'refs/tags/v1.0.0' }
            const mockReq = createValidRequest( payload, 'push' )
            const mockRes = {
                status: jest.fn().mockReturnThis(),
                send: jest.fn()
            }
            
            mockExec.mockImplementation( ( cmd, callback ) => {
                callback( null, 'deployment success', '' )
            } )
            
            postHandler( mockReq, mockRes )
            
            expect( consoleSpy.log ).toHaveBeenCalledWith( '🚀 Detected release or tag push — triggering deployment...' )
            expect( mockExec ).toHaveBeenCalledWith(
                `cd ~/community-server &&rm -rf package-lock.json && git pull origin main && npm install && pm2 restart ${testConfig.pm2Name}`,
                expect.any( Function )
            )
        } )

        test( 'should handle successful deployment', () => {
            const payload = { ref: 'refs/tags/v2.0.0' }
            const mockReq = createValidRequest( payload, 'push' )
            const mockRes = {
                status: jest.fn().mockReturnThis(),
                send: jest.fn()
            }
            
            mockExec.mockImplementation( ( cmd, callback ) => {
                callback( null, 'successful deployment output', '' )
            } )
            
            postHandler( mockReq, mockRes )
            
            expect( consoleSpy.log ).toHaveBeenCalledWith( '✅ Deploy successful:\n', 'successful deployment output' )
            expect( mockRes.status ).toHaveBeenCalledWith( 200 )
            expect( mockRes.send ).toHaveBeenCalledWith( 'Deployment triggered' )
        } )

        test( 'should handle deployment failures', () => {
            const payload = { ref: 'refs/tags/v3.0.0' }
            const mockReq = createValidRequest( payload, 'push' )
            const mockRes = {
                status: jest.fn().mockReturnThis(),
                send: jest.fn()
            }
            
            mockExec.mockImplementation( ( cmd, callback ) => {
                callback( new Error( 'Deployment failed' ), '', 'deployment error' )
            } )
            
            postHandler( mockReq, mockRes )
            
            expect( consoleSpy.error ).toHaveBeenCalledWith( '❌ Deploy failed:', 'deployment error' )
            expect( mockRes.status ).toHaveBeenCalledWith( 500 )
            expect( mockRes.send ).toHaveBeenCalledWith( 'Deployment failed' )
        } )

        test( 'should handle release published events and trigger deployment', () => {
            const payload = { 
                action: 'published',
                release: { tag_name: 'v4.0.0' }
            }
            const mockReq = createValidRequest( payload, 'release' )
            const mockRes = {
                status: jest.fn().mockReturnThis(),
                send: jest.fn()
            }
            
            mockExec.mockImplementation( ( cmd, callback ) => {
                callback( null, 'release deployment success', '' )
            } )
            
            postHandler( mockReq, mockRes )
            
            expect( consoleSpy.log ).toHaveBeenCalledWith( '🚀 Detected release or tag push — triggering deployment...' )
            expect( mockExec ).toHaveBeenCalled()
        } )

        test( 'should ignore non-deployment events', () => {
            const payload = { 
                ref: 'refs/heads/feature-branch',
                action: 'opened'
            }
            const mockReq = createValidRequest( payload, 'pull_request' )
            const mockRes = {
                status: jest.fn().mockReturnThis(),
                send: jest.fn()
            }
            
            postHandler( mockReq, mockRes )
            
            expect( consoleSpy.log ).toHaveBeenCalledWith( 'ℹ️ No action for this event/ref.' )
            expect( mockRes.status ).toHaveBeenCalledWith( 200 )
            expect( mockRes.send ).toHaveBeenCalledWith( 'No action needed' )
            expect( mockExec ).not.toHaveBeenCalled()
        } )

        test( 'should handle releases with empty tag_name and trigger deployment', () => {
            const payload = { 
                action: 'published',
                release: { tag_name: '' } // Empty tag name but still published
            }
            const mockReq = createValidRequest( payload, 'release' )
            const mockRes = {
                status: jest.fn().mockReturnThis(),
                send: jest.fn()
            }
            
            mockExec.mockImplementation( ( cmd, callback ) => {
                callback( null, 'deployment with empty tag', '' )
            } )
            
            postHandler( mockReq, mockRes )
            
            expect( consoleSpy.log ).toHaveBeenCalledWith( '🚀 Detected release or tag push — triggering deployment...' )
            expect( mockExec ).toHaveBeenCalled()
        } )

        test( 'should handle non-published release actions', () => {
            const payload = { 
                action: 'created', // Not published
                release: { tag_name: 'v1.0.0' }
            }
            const mockReq = createValidRequest( payload, 'release' )
            const mockRes = {
                status: jest.fn().mockReturnThis(),
                send: jest.fn()
            }
            
            postHandler( mockReq, mockRes )
            
            expect( consoleSpy.log ).toHaveBeenCalledWith( 'ℹ️ No action for this event/ref.' )
            expect( mockRes.send ).toHaveBeenCalledWith( 'No action needed' )
        } )
    } )

} )