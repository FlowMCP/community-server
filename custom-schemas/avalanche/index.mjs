import fs from 'fs'

import { serverConfig } from '../../src/data/serverConfig.mjs'
import { SchemaTransformer } from '../../src/utils/schemaTransformer.mjs'

const schemasPath = './node_modules/schemaImporter/schemas/v1.2.0/'

const avalancheRoute = serverConfig.routes
    .find( ( route ) => route.name === 'avalanche' )

const namespacesFromTags = [ ...new Set( 
    avalancheRoute.activateTags
        .map( ( tag ) => tag.split( '.' )[ 0 ] )
) ]

const namespaceMapping = {
    'dexscreener': 'dexscreener-com',
    'moralis': 'moralis-com'
}

const activateTagsNamespaces = namespacesFromTags
    .map( ( namespace ) => namespaceMapping[ namespace ] || namespace )

const availableNamespaces = fs
    .readdirSync( schemasPath )
    .filter( ( item ) => {
        const stat = fs.statSync( schemasPath + item )
        const isDirectory = stat.isDirectory()
        const isInActiveTags = activateTagsNamespaces.includes( item )
        
        return isDirectory && isInActiveTags
    } )

const allImportPromises = availableNamespaces
    .map( async ( namespace ) => {
        const namespacePath = schemasPath + namespace
        const fileNames = fs
            .readdirSync( namespacePath )
            .filter( ( file ) => file.endsWith( '.mjs' ) )
        
        const importPromises = fileNames
            .map( async ( file ) => {
                try {
                    const importedModule = await import( '../../' + namespacePath + '/' + file )
                    
                    return importedModule.schema
                } catch( error ) {
                    console.log( `Failed to import ${namespace}/${file}: ${error.message}` )
                    
                    return null
                }
            } )
        
        const results = await Promise.all( importPromises )
        
        return results.filter( ( result ) => result !== null )
    } )

const allSchemas = await Promise.all( allImportPromises )
const rawSchemas = allSchemas.flat()

// Transform old schema format to new format
const transformedSchemas = SchemaTransformer
    .transformArray( { schemas: rawSchemas } )

// Merge schemas with same namespace
const schemas = SchemaTransformer
    .mergeSchemasByNamespace( { schemas: transformedSchemas } )

export { schemas }
