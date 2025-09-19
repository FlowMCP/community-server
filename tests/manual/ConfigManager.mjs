import fs from 'fs'
import path from 'path'


class ConfigManager {
    static async getConfig( { authType } ) {
        // Load environment variables
        const envPath = path.resolve( './../.community.env' )
        const envObject = this.#loadEnv( { envPath } )

        // Use a consistent test port to avoid ConfigManager/Server mismatch
        const testPort = process.env.TEST_PORT || '8090'

        // Base configuration
        const baseConfig = {
            baseUrl: envObject.SERVER_URL || 'http://localhost',
            port: testPort,
            silent: false,
            browserTimeout: 30000
        }

        // Auth-specific configurations
        const authConfigs = {
            'free': {
                ...baseConfig,
                routePath: '/free/streamable',
                authType: 'none',
                description: 'Free route without authentication'
            },
            'staticBearer': {
                ...baseConfig,
                routePath: '/bearer-streamable/streamable',
                authType: 'staticBearer',
                bearerToken: envObject.BEARER_TOKEN_MASTER,
                description: 'Static bearer token authentication'
            },
            'oauth21_scalekit': {
                ...baseConfig,
                routePath: '/scalekit-streamable/streamable',
                authType: 'oauth21_scalekit',
                clientId: envObject.SCALEKIT_CLIENT_ID,
                clientSecret: envObject.SCALEKIT_CLIENT_SECRET,
                providerUrl: envObject.SCALEKIT_ENVIRONMENT_URL,
                mcpId: envObject.SCALEKIT_MCP_ID,
                scope: 'openid profile mcp:tools mcp:resources:read mcp:resources:write',
                description: 'OAuth 2.1 ScaleKit authentication',
                // ScaleKit test credentials (if needed for automated testing)
                testEmail: envObject.SCALEKIT_TEST_EMAIL || 'test@example.com',
                testPassword: envObject.SCALEKIT_TEST_PASSWORD || 'testpassword'
            }
        }

        const config = authConfigs[ authType ]
        if( !config ) {
            throw new Error( `Unknown auth type: ${authType}` )
        }

        return { config }
    }


    static #loadEnv( { envPath } ) {
        try {
            if( !fs.existsSync( envPath ) ) {
                console.warn( `Environment file not found at ${envPath}, using defaults` )
                return {}
            }

            const envContent = fs.readFileSync( envPath, 'utf-8' )
            const envObject = envContent
                .split( '\n' )
                .filter( line => line && !line.startsWith( '#' ) && line.includes( '=' ) )
                .reduce( ( acc, line ) => {
                    const [ key, ...valueParts ] = line.split( '=' )
                    acc[ key.trim() ] = valueParts.join( '=' ).trim()
                    return acc
                }, {} )

            return envObject
        } catch( error ) {
            console.error( `Error loading environment file: ${error.message}` )
            return {}
        }
    }


    static async getAvailableAuthTypes() {
        return [ 'free', 'staticBearer', 'oauth21_scalekit' ]
    }


    static async getServerPaths() {
        return [
            'tests/manual/test-community-server.mjs',
            '../../main.mjs'  // Main server file
        ]
    }
}


export { ConfigManager }