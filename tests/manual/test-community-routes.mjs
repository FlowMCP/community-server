import { LocalTesting } from './LocalTesting.mjs'


const config = {
    'authTypes': [
        'free',
        'staticBearer',
        'oauth21_scalekit'
    ],
    'serverPaths': [
        'tests/manual/test-community-server.mjs',
        '../../main.mjs'
    ]
}

const { authTypes, serverPaths } = config
const { authType, serverPath } = LocalTesting.parseArgv( { argv: process.argv } )
const { status, messages } = LocalTesting.validationArgv( { authType, serverPath, authTypes, serverPaths } )

if( !status ) {
    console.error( '❌ Input validation failed:' )
    messages.forEach( msg => console.error( `   - ${msg}` ) )
    console.log( '' )
    console.log( 'Usage:' )
    console.log( `  node ${process.argv[ 1 ]} authType=<type> serverPath=<path>` )
    console.log( '' )
    console.log( 'Available authTypes:' )
    authTypes.forEach( type => console.log( `  - ${type}` ) )
    console.log( '' )
    console.log( 'Available serverPaths:' )
    serverPaths.forEach( path => console.log( `  - ${path}` ) )
    console.log( '' )
    console.log( 'Examples:' )
    console.log( `  node ${process.argv[ 1 ]} authType=free serverPath=../../main.mjs` )
    console.log( `  node ${process.argv[ 1 ]} authType=staticBearer serverPath=../../main.mjs` )
    console.log( `  node ${process.argv[ 1 ]} authType=oauth21_scalekit serverPath=../../main.mjs` )
    process.exit( 1 )
}

console.log( '🔧 Configuration:' )
console.log( `   Auth Type: ${authType}` )
console.log( `   Server Path: ${serverPath}` )
console.log( '' )

await LocalTesting.start( { authType, serverPath } )