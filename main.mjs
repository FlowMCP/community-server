import { ServerManager } from './src/index.mjs'
import { SchemaImporter } from 'schemaImporter'
import { serverConfig } from './src/data/serverConfig.mjs'

const { stageType } = ServerManager
    .getStageType( { 'argvs': process.argv} )
const { envObject } = ServerManager
    .getEnvObject( { stageType } )
const { webhookSecret, webhookPort, pm2Name } = ServerManager
    .getWebhookEnv( { stageType } )
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