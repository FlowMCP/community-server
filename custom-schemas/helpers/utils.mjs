import { SchemaImporter } from 'schemaImporter'


function filterArrayOfSchemas( { arrayOfSchemas, includeNamespaces, excludeNamespaces, activateTags } ) {
    let filteredSchemas = arrayOfSchemas

    // Filter by includeNamespaces
    if( includeNamespaces && includeNamespaces.length > 0 ) {
        filteredSchemas = filteredSchemas
            .filter( ( schema ) => {
                const namespace = schema?.info?.namespace || schema?.namespace
                return includeNamespaces.includes( namespace )
            } )
    }

    // Filter by excludeNamespaces
    if( excludeNamespaces && excludeNamespaces.length > 0 ) {
        filteredSchemas = filteredSchemas
            .filter( ( schema ) => {
                const namespace = schema?.info?.namespace || schema?.namespace
                return !excludeNamespaces.includes( namespace )
            } )
    }

    // Filter by activateTags (tool names)
    if( activateTags && activateTags.length > 0 ) {
        filteredSchemas = filteredSchemas
            .filter( ( schema ) => {
                const toolName = schema?.info?.name || schema?.name
                return activateTags.includes( toolName )
            } )
    }

    return filteredSchemas
}


async function getArrayOfSchemas( { includeNamespaces, excludeNamespaces, activateTags } ) {
    const arrayOfSchemas = await SchemaImporter
        .loadFromFolder( {
            excludeSchemasWithImports: true,
            excludeSchemasWithRequiredServerParams: true,
            addAdditionalMetaData: true,
            outputType: 'onlySchema'
        } )

    const filteredArrayOfSchemas = filterArrayOfSchemas( {
        arrayOfSchemas,
        includeNamespaces,
        excludeNamespaces,
        activateTags
    } )

    return filteredArrayOfSchemas
}


// Helper function to generate bearer token name from route path
function generateBearerTokenName( { routePath } ) {
    // Remove leading/trailing slashes and convert to uppercase
    const tokenName = routePath
        .replace( /^\/+|\/+$/g, '' )  // Remove leading/trailing slashes
        .replace( /\//g, '_' )         // Replace remaining slashes with underscores
        .toUpperCase()                 // Convert to uppercase
    
    const bearerTokenName = `BEARER_TOKEN_${tokenName}`
    
    return { bearerTokenName }
}


// Helper function to validate all bearer tokens are present
function validateAllBearerTokens( { routes, envObject } ) {
    const missingTokens = []
    const tokenMapping = {}
    
    routes
        .forEach( ( route ) => {
            const { routePath, name, bearerIsPublic } = route
            const { bearerTokenName } = generateBearerTokenName( { routePath } )
            
            tokenMapping[ routePath ] = bearerTokenName
            
            // Skip token validation if route is public
            if( bearerIsPublic === true ) {
                return
            }
            
            if( !envObject[ bearerTokenName ] ) {
                missingTokens.push( {
                    routePath,
                    routeName: name,
                    expectedToken: bearerTokenName
                } )
            }
        } )
    
    if( missingTokens.length > 0 ) {
        console.error( '\n❌ Missing Bearer Tokens:' )
        missingTokens
            .forEach( ( { routePath, routeName, expectedToken } ) => {
                console.error( `   - ${expectedToken} for route "${routePath}" (${routeName})` )
            } )
        console.error( '\nPlease add the missing tokens to your .env file\n' )
        
        const allTokensPresent = false
        return { allTokensPresent, missingTokens, tokenMapping }
    }
    
    const allTokensPresent = true
    console.log( '✅ All bearer tokens validated successfully' )
    
    return { allTokensPresent, missingTokens, tokenMapping }
}


// Main function to check and validate bearer tokens - returns status object
function checkBearerTokens( { routes, envObject } ) {
    const { allTokensPresent, missingTokens, tokenMapping } = validateAllBearerTokens( { 
        routes, 
        envObject 
    } )

    const status = allTokensPresent
    const messages = missingTokens
        .map( ( { routePath, routeName, expectedToken } ) => 
            `- ${expectedToken} for route "${routePath}" (${routeName})` 
        )

    return { status, messages, tokenMapping }
}


export { getArrayOfSchemas, generateBearerTokenName, validateAllBearerTokens, checkBearerTokens }