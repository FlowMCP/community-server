import { ServerManager } from './src/index.mjs'
import { SchemaImporter } from 'schemaImporter'

import { schema as pinataWrite } from './custom-schemas/pinata/write.mjs'


const { stageType } = ServerManager
    .getStageType( { 'argvs': process.argv} )
const { envObject } = ServerManager
    .getEnvObject( { stageType } )
const { serverConfig } = ServerManager
    .getServerConfig( { envObject } )
const { x402Config, x402Credentials, x402PrivateKey } = ServerManager
    .getX402Credentials( { envObject } )
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
arrayOfSchemas.push( pinataWrite )
await ServerManager
    .start( {
        silent: false,
        stageType,
        arrayOfSchemas,
        serverConfig,
        envObject,
        webhookSecret,
        webhookPort,
        pm2Name,
        managerVersion,
        x402Config,
        x402Credentials,
        x402PrivateKey
    } )