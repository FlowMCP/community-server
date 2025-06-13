import { CommunityServer } from './src/index.mjs'
import { SchemaImporter } from 'schemaImporter'
import { serverConfig } from './src/data/serverConfig.mjs'


const arrayOfSchemas = await SchemaImporter
    .loadFromFolder( {
        excludeSchemasWithImports: true,
        excludeSchemasWithRequiredServerParams: true,
        addAdditionalMetaData: true,
        outputType: 'onlySchema'
    } )

CommunityServer
    .start( {
        silent: false,
        arrayOfSchemas,
        serverConfig,
        envObject: {},
        webhookSecret: 'test'
    } )