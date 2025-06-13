import { ServerManager } from './src/index.mjs'
import { SchemaImporter } from 'schemaImporter'
import { serverConfig } from './src/data/serverConfig.mjs'


const { envObject } = ServerManager
    .getEnvObject()
const { webhookSecret, webhookPort, pm2Name } = ServerManager
    .getWebhookEnv()
const { managerVersion } = ServerManager
    .getPackageVersion()

const arrayOfSchemas = await SchemaImporter
    .loadFromFolder( {
        excludeSchemasWithImports: true,
        excludeSchemasWithRequiredServerParams: true,
        addAdditionalMetaData: true,
        outputType: 'onlySchema'
    } )

ServerManager
    .start( {
        silent: false,
        arrayOfSchemas,
        serverConfig,
        envObject,
        webhookSecret,
        webhookPort,
        pm2Name,
        managerVersion
    } )