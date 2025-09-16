// Central test configuration for getMcpAuthMiddlewareConfig breaking change
// Based on CLAUDE.md standards: centralized constants, no hardcoded values

const testBaseUrl = 'http://localhost:3000'
const testEnvPath = './.community.env.example'

const defaultStageType = 'development'

const testEnvObject = {
    'BEARER_TOKEN_EERC20': 'test-eerc20-token',
    'BEARER_TOKEN_INSEIGHT': 'test-inseight-token',
    'AUTH0_DOMAIN': 'test.auth0.com',
    'AUTH0_CLIENT_ID': 'test-client-id',
    'AUTH0_CLIENT_SECRET': 'test-client-secret'
}

// Helper function to get complete getMcpAuthMiddlewareConfig parameters
const getMcpAuthTestParams = ({
    activeRoutes = [],
    envObject = testEnvObject,
    silent = true,
    stageType = defaultStageType,
    baseUrl = testBaseUrl
} = {}) => {
    return {
        activeRoutes,
        envObject,
        silent,
        stageType,
        baseUrl
    }
}

// Default test routes for consistent testing
const testRoutes = [
    {
        'routePath': '/eerc20',
        'name': 'Test EERC20',
        'description': 'Test route for EERC20',
        'auth': {
            'enabled': true,
            'authType': 'staticBearer',
            'token': 'BEARER_TOKEN_EERC20'
        },
        'protocol': 'sse'
    },
    {
        'routePath': '/inseight', 
        'name': 'Test Inseight',
        'description': 'Test route for Inseight',
        'auth': {
            'enabled': true,
            'authType': 'staticBearer', 
            'token': 'BEARER_TOKEN_INSEIGHT'
        },
        'protocol': 'sse'
    },
    {
        'routePath': '/lukso',
        'name': 'Test LUKSO',
        'description': 'Test route for LUKSO',
        'auth': {
            'enabled': false
        },
        'protocol': 'sse'
    }
]

export {
    testBaseUrl,
    testEnvPath,
    defaultStageType,
    testEnvObject,
    getMcpAuthTestParams,
    testRoutes
}