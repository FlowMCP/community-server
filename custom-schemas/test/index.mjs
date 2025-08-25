import { SchemaImporter } from 'schemaImporter'
import { FlowMCP } from 'flowmcp'


function  toTagRoutes( { arrayOfSchemas } ) {
    const result = filteredArrayOfSchemas
        .flatMap( ( { namespace,routes } ) => {
            const result = Object
                .keys( routes )
                .map( k => `${namespace}.${k}`)
            return result
        } )

    return result
}



const arrayOfSchemas = await SchemaImporter
    .loadFromFolder( {
        excludeSchemasWithImports: true,
        excludeSchemasWithRequiredServerParams: true,
        addAdditionalMetaData: true,
        outputType: 'onlySchema'
    } ) 
console.log( 'totalSchemaLength', arrayOfSchemas.length )

const { filteredArrayOfSchemas } = FlowMCP.filterArrayOfSchemas( {
    arrayOfSchemas,
    includeNamespaces: [ 'coingecko'],
    excludeNamespaces: [],
    activateTags: []
} )

console.log( 'BEFORE >>>', toTagRoutes( { arrayOfSchemas: filteredArrayOfSchemas } ).length )

const { filteredArrayOfSchemas: test } = FlowMCP.filterArrayOfSchemas( {
    arrayOfSchemas,
    includeNamespaces: [],
    excludeNamespaces: [],
    activateTags: [ 'coingecko.getCurrentPrice' ]
} )

const r = toTagRoutes( { arrayOfSchemas: test } )
console.log( 'AFTER >>>', r.length )
console.log( 'IS CORRECT', r === 1 )
