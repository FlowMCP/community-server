import { serverConfig } from './serverConfig.mjs'
import { ServerManager } from './src/index.mjs'

const activeRoutesList = [ '/eerc20', '/inseight', '/etherscan-ping' ]
const { landingPage, routes, x402, cors, silent } = serverConfig

const activeRoutes = routes
    .filter( ( { routePath } ) => activeRoutesList.includes( routePath ) )

const { stageType } = ServerManager
    .getStageType( { 'argvs': process.argv } )
const { envObject } = ServerManager
    .getEnvObject( { stageType, serverConfig } )
const { x402Config, x402Credentials, x402PrivateKey } = ServerManager
    .getX402Credentials( { envObject, x402Config: x402 } )
const { webhookSecret, webhookPort, pm2Name } = ServerManager
    .getWebhookEnv( { stageType, serverConfig } )
const { managerVersion } = ServerManager
    .getPackageVersion()
const { mcpAuthMiddlewareConfig } = ServerManager
    .getMcpAuthMiddlewareConfig( { activeRoutes, envObject, silent, stageType } )

const modifiedServerConfig = { landingPage, 'routes': activeRoutes, x402, cors }
const objectOfSchemaArrays = await modifiedServerConfig['routes']
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
        serverConfig: modifiedServerConfig,
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