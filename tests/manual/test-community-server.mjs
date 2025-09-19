// Test server that runs the community server with test configuration
import { ConfigManager2 } from '../../ConfigManager2.mjs'
import { ServerManager } from '../../src/index.mjs'
import fs from 'fs'
import path from 'path'


// Use consistent test port to avoid ConfigManager/Server mismatch
const testPort = process.env.TEST_PORT || '8090'

// Load test environment
const envPath = path.resolve( './../.community.env' )
const baseEnvObject = fs.existsSync( envPath ) ?
    fs.readFileSync( envPath, 'utf-8' )
        .split( '\n' )
        .filter( line => line && !line.startsWith( '#' ) && line.includes( '=' ) )
        .reduce( ( acc, line ) => {
            const [ key, ...valueParts ] = line.split( '=' )
            acc[ key.trim() ] = valueParts.join( '=' ).trim()
            return acc
        }, {} ) :
    {}

// Override with test-specific values to avoid port conflicts
const envObject = {
    ...baseEnvObject,
    SERVER_URL: 'http://localhost',
    SERVER_PORT: testPort,
    BEARER_TOKEN_MASTER: baseEnvObject.BEARER_TOKEN_MASTER || 'test-bearer-token-123456',
    WEBHOOK_SECRET: 'test-webhook-secret',
    WEBHOOK_PORT: '3001',
    PM2_NAME: 'test-community-server'
}

// Determine which routes to include based on test mode
const testMode = process.argv[ 2 ] || 'all'
let routeNames = []

if( testMode === 'all' || testMode === 'free' ) {
    routeNames.push( 'getFreeTest' )
}
if( testMode === 'all' || testMode === 'bearer' ) {
    routeNames.push( 'getBearerTest' )
}
if( testMode === 'all' || testMode === 'oauth' ) {
    routeNames.push( 'getScaleKit' )
}

// Default to all routes if none specified
if( routeNames.length === 0 ) {
    routeNames = [ 'getFreeTest', 'getBearerTest', 'getScaleKit' ]
}

console.log( '🚀 Starting Community Test Server' )
console.log( `📋 Active routes: ${routeNames.join( ', ' )}` )

const stageType = 'development'
const { serverConfig, baseUrl } = await ConfigManager2
    .getServerConfig( { stageType, envObject, routeNames } )

const { silent, routes, x402 } = serverConfig

const { x402Config, x402Credentials, x402PrivateKey } = ServerManager
    .getX402Credentials( { envObject, x402Config: x402 } )

const { webhookSecret, webhookPort, pm2Name } = {
    webhookSecret: envObject.WEBHOOK_SECRET || 'test-secret',
    webhookPort: envObject.WEBHOOK_PORT || '3001',
    pm2Name: envObject.PM2_NAME || 'test-server'
}

const { managerVersion } = ServerManager.getPackageVersion()

const { mcpAuthMiddlewareConfig } = ServerManager
    .getMcpAuthMiddlewareConfig( {
        activeRoutes: routes,
        envObject,
        silent,
        stageType,
        baseUrl
    } )

const objectOfSchemaArrays = await routes
    .reduce( async ( promiseAcc, route ) => {
        const acc = await promiseAcc
        const { routePath, schemas } = route
        const { arrayOfSchemas } = await schemas()
        acc[ routePath ] = arrayOfSchemas
        return acc
    }, Promise.resolve( {} ) )

console.log( '📊 Configuration summary:' )
console.log( `   Base URL: ${baseUrl}` )
console.log( `   Routes: ${routes.map( r => r.routePath ).join( ', ' )}` )
console.log( `   Auth types: ${routes.map( r => r.auth?.authType || 'none' ).join( ', ' )}` )
console.log( '' )

await ServerManager
    .start( {
        silent: false,
        stageType,
        objectOfSchemaArrays,
        serverConfig,
        mcpAuthMiddlewareConfig,
        envObject,
        webhookSecret,
        webhookPort,
        pm2Name,
        managerVersion,
        x402Config,
        x402Credentials,
        x402PrivateKey
    } )