// import { ConfigManager } from './serverConfig.mjs'
import { ConfigManager2 } from './ConfigManager2.mjs'

// import { serverConfig } from './serverConfig.mjs'
import { ServerManager } from './src/index.mjs'


const cfg = {
    'envPath': './../.community.env',
    'routeNames': [
        'getFreeTest',
        'getBearerTest',
        'getScaleKit',
    ]
}

const { envPath, routeNames } = cfg
const { stageType } = ServerManager
    .getStageType( { 'argvs': process.argv } )
const { envObject } = ServerManager
    .getEnvObject( { stageType, envPath } )
const { serverConfig, baseUrl } = await ConfigManager2
    .getServerConfig( { stageType, envObject, routeNames } )
const { silent, routes, x402 } = serverConfig

const { x402Config, x402Credentials, x402PrivateKey } = ServerManager
    .getX402Credentials( { envObject, x402Config: x402 } )
const { webhookSecret, webhookPort, pm2Name } = ServerManager
    .getWebhookEnv( { stageType, envPath } )
const { managerVersion } = ServerManager
    .getPackageVersion()
const { mcpAuthMiddlewareConfig } = ServerManager
    .getMcpAuthMiddlewareConfig( { 'activeRoutes': routes, envObject, silent, stageType, baseUrl } )

const objectOfSchemaArrays = await routes
    .reduce( async ( promiseAcc, route ) => {
        const acc = await promiseAcc
        const { routePath, schemas } = route
        const { arrayOfSchemas } = await schemas()
        acc[ routePath ] = arrayOfSchemas
        return acc
    }, Promise.resolve( {} ) )

await ServerManager
    .start( {
        silent,
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