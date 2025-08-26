import { serverConfig } from './serverConfig.mjs'
import { ServerManager } from './src/index.mjs'
import { checkBearerTokens, generateBearerTokenName } from './custom-schemas/helpers/utils.mjs'

const activeRoutes = [ '/eerc20', '/inseight' ]
const { landingPage, routes, x402 } = serverConfig

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

const filteredRoutes = routes.filter( ( { routePath } ) => activeRoutes.includes( routePath ) )
const modifiedRoutes = filteredRoutes
    .map( ( route ) => {
        const { routePath, bearerIsPublic } = route
        const { bearerTokenName } = generateBearerTokenName( { routePath } )
        const bearerToken = bearerIsPublic ? null : envObject[ bearerTokenName ]
        return { ...route, bearerToken }
    } )

const modifiedServerConfig = { landingPage, 'routes': modifiedRoutes, x402 }
const objectOfSchemaArrays = await modifiedServerConfig['routes']
    .reduce( async ( promiseAcc, route ) => {
        const acc = await promiseAcc
        const { routePath, schemas } = route
        const { arrayOfSchemas } = await schemas()
        acc[ routePath ] = arrayOfSchemas
        return acc
    }, Promise.resolve( {} ) )

const { status, messages } = checkBearerTokens( { routes: filteredRoutes, envObject } )
if( !status ) { throw new Error( `Missing bearer tokens:\n${messages.join( '\n' )}` ) }

await ServerManager
    .start( {
        silent: false,
        stageType,
        objectOfSchemaArrays,
        serverConfig: modifiedServerConfig,
        envObject,
        webhookSecret,
        webhookPort,
        pm2Name,
        managerVersion,
        x402Config,
        x402Credentials,
        x402PrivateKey
    } )