/**
 * Transforms old schema format to new FlowMCP v1 format
 * Handles conversion from 'name' to 'namespace' and normalizes structure
 */
class SchemaTransformer {
    static transform( { schema } ) {
        if( !schema ) {
            return null
        }

        // If schema already has namespace and flowmcp fields, it's already in correct format
        if( schema.namespace && schema.flowmcp ) {
            return schema
        }

        // Extract namespace from name field or use existing namespace
        let namespace = 'unknown'
        
        if( schema.namespace ) {
            // Use existing namespace if available
            namespace = schema.namespace
        } else if( schema.name ) {
            // Extract from name field
            // Handle different patterns:
            // "dexscreener-pairs" -> "dexscreener"
            // "DexScreener Token Pairs API" -> "dexscreener"
            // "Gas Price Estimator" -> "blocknative"
            
            const nameLower = schema.name.toLowerCase()
            
            // Special mappings based on known patterns
            if( nameLower.includes( 'dexscreener' ) ) {
                namespace = 'dexscreener'
            } else if( nameLower.includes( 'etherscan' ) || nameLower.includes( 'smartcontract' ) ) {
                namespace = 'etherscan'
            } else if( nameLower.includes( 'moralis' ) ) {
                namespace = 'moralis'
            } else if( nameLower.includes( 'ohlcv' ) ) {
                namespace = 'ohlcv'
            } else if( nameLower.includes( 'gas price' ) || nameLower.includes( 'blocknative' ) ) {
                namespace = 'blocknative'
            } else if( nameLower.includes( 'thegraph' ) || nameLower.includes( 'the graph' ) ) {
                namespace = 'thegraph'
            } else {
                // Default: use first part before hyphen or the whole name
                namespace = schema.name.split( '-' )[ 0 ].toLowerCase()
            }
        }

        // Transform to new format
        const transformedSchema = {
            'namespace': namespace,
            'name': schema.name || `${namespace} API`,
            'docs': schema.docs || ['Auto-generated schema'],
            'flowMCP': schema.flowMCP || '1.2.0',
            'tags': schema.tags || [],
            'routes': schema.routes || {},
            'headers': schema.headers || {},
            'requiredServerParams': schema.requiredServerParams || []
        }

        // Add additional fields if they exist
        if( schema.description ) {
            transformedSchema['description'] = schema.description
        }

        if( schema.root ) {
            transformedSchema['root'] = schema.root
        }

        if( schema.handlers ) {
            transformedSchema['handlers'] = schema.handlers
        }

        return transformedSchema
    }


    static transformArray( { schemas } ) {
        if( !Array.isArray( schemas ) ) {
            return []
        }

        const transformed = schemas
            .map( schema => SchemaTransformer.transform( { schema } ) )
            .filter( schema => schema !== null )

        return transformed
    }


    static mergeSchemasByNamespace( { schemas } ) {
        const namespaceMap = {}

        schemas
            .forEach( schema => {
                const { namespace } = schema
                
                if( !namespaceMap[ namespace ] ) {
                    namespaceMap[ namespace ] = {
                        ...schema,
                        'routes': {}
                    }
                }

                // Merge routes from multiple schemas with same namespace
                Object
                    .entries( schema.routes )
                    .forEach( ( [ routeName, routeConfig ] ) => {
                        namespaceMap[ namespace ]['routes'][ routeName ] = routeConfig
                    } )

                // Merge tags (unique)
                if( schema.tags && schema.tags.length > 0 ) {
                    const existingTags = namespaceMap[ namespace ]['tags'] || []
                    const newTags = [ ...new Set( [ ...existingTags, ...schema.tags ] ) ]
                    namespaceMap[ namespace ]['tags'] = newTags
                }
            } )

        return Object.values( namespaceMap )
    }
}


export { SchemaTransformer }