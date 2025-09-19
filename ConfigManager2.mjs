import { getArrayOfSchemas } from './custom-schemas/helpers/utils.mjs'
import { FlowMCP } from 'flowmcp'
import { ServerManager } from './src/index.mjs'


const config = {
    'baseUrls': {
        'development': 'http://localhost:3000',
        'production': 'https://community.flowmcp.org',
    },
    'cors': {
        'enabled': true,
        'options': null
    },
    'landingPage': {
        'name': 'FlowMCP Community Servers',
        'description': 'Community servers for the FlowMCP project, providing access to various networks and functionalities.'
    },
    'x402': {
        'chainId': 84532,
        'chainName': 'base-sepolia',
        'restrictedCalls': [
            {
                'method': 'tools/call',
                'name': 'paid_ping_x402',
                'activePaymentOptions': [ 'usdc-sepolia' ],
            },
            {
                'method': 'tools/call',
                'name': 'upload_text_file_pinata',
                'activePaymentOptions': [ 'usdc-sepolia' ],
            },
            {
                'method': 'tools/call',
                'name': 'get_all_latest_prices_ethereum_chainlink_multicall',
                'activePaymentOptions': [ 'usdc-sepolia' ],
            }
        ],
        'paymentOptions': {
            'usdc-sepolia': { 
                'contractId': 'usdc-sepolia',
                'maxAmountRequired': '0.01',
                'payTo': '{{payTo1}}',
            }
        },
        'contracts': {
            'usdc-sepolia': {
                'domainName': 'USDC',
                'address': '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
                'assetType': 'erc20',
                'decimals': 6
            }
        },
        'envSelection': [
            [ 'facilitatorPrivateKey', 'ACCOUNT_DEVELOPMENT2_PRIVATE_KEY' ],
            [ 'payTo1',                'ACCOUNT_DEVELOPMENT2_PUBLIC_KEY'  ],
            [ 'serverProviderUrl',     'BASE_SEPOLIA_ALCHEMY_HTTP'        ]
        ]
    }
}


class ConfigManager2 {
    static async getServerConfig( { silent=false, stageType, envObject, routeNames } ) {
        const {
            BEARER_TOKEN_MASTER,
            SCALEKIT_ENVIRONMENT_URL, SCALEKIT_MCP_ID, SCALEKIT_CLIENT_ID, SCALEKIT_CLIENT_SECRET,
            SERVER_URL, SERVER_PORT
        } = envObject

        let BASE_URL = null
        if( SERVER_URL.includes( 'localhost' ) ) {
            BASE_URL = `${SERVER_URL}:${SERVER_PORT}`
        } else {
            BASE_URL = SERVER_URL
        }

        // Normalize URL based on stageType
        BASE_URL = ServerManager.normalizeUrlForStage( { url: BASE_URL, stageType } )

        const arrayOfRoutes = routeNames
            .map( ( routeName ) => {
                if( routeName === 'getFreeTest' ) { return ConfigManager2.getFreeTest() }
                else if( routeName === 'getBearerTest' ) { return ConfigManager2.getBearerTest( { BEARER_TOKEN_MASTER } ) }
                else if( routeName === 'getScaleKit' ) { return ConfigManager2.getScalekit( { SCALEKIT_ENVIRONMENT_URL, SCALEKIT_MCP_ID, SCALEKIT_CLIENT_ID, SCALEKIT_CLIENT_SECRET, BASE_URL, stageType } ) }
                else if( routeName === 'getErc20' ) { return ConfigManager2.getErc20( { BEARER_TOKEN_MASTER } ) }
                else if( routeName === 'getX402' ) { return ConfigManager2.getX402() }
                else if( routeName === 'getLukso' ) { return ConfigManager2.getLukso() }
                else if( routeName === 'getChainlinkPrices' ) { return ConfigManager2.getChainlinkPrices() }
                else if( routeName === 'getInseight' ) { return ConfigManager2.getInseight( { BEARER_TOKEN_MASTER } ) }
                else { throw new Error( `Unknown route name: ${routeName}` ) }
            } )

        const { cors, landingPage, x402 } = config
        const routes = await Promise.all( arrayOfRoutes )
        const serverConfig = { silent, cors, landingPage, routes, x402 }

        return { serverConfig, baseUrl: BASE_URL }
    }


    static async getFreeTest( {}={} ) {
        return {
            'routePath': '/free',
            'name': 'Free Test Route',
            'description': 'A free test route with no authentication, using the ping schema.',
            'bearerIsPublic': true,
            'protocol': 'streamable',
            'auth': null,
            'schemas': async () => {
                const arrayOfSchemas = []
                const { schema: pingSchema } = await import( 'schemaImporter/schemas/v1.2.0/x402/ping.mjs' )
                arrayOfSchemas.push( pingSchema )

                return { arrayOfSchemas }
            }
        }
    }


    static async getBearerTest( { BEARER_TOKEN_MASTER } ) {
        return {
            'routePath': '/bearer-streamable',
            'name': 'Bearer Token Test Route',
            'description': 'A test route protected by a static bearer token, using the ping schema.',
            'bearerIsPublic': false,
            'protocol': 'streamable',
            'auth': {
                'enabled': true,
                'authType': 'staticBearer',
                'token': BEARER_TOKEN_MASTER
            },
            'schemas': async () => {
                const arrayOfSchemas = []
                const { schema: pingSchema } = await import( 'schemaImporter/schemas/v1.2.0/x402/ping.mjs' )
                arrayOfSchemas.push( pingSchema )
                return { arrayOfSchemas }
            }
        }
    }


    static async getErc20( { BEARER_TOKEN_MASTER } ) {
        return {
            'routePath': '/eerc20',
            'name': 'Encrypted ERC20',
            'description': 'This is an experimental server for an encrypted ERC20 schema for the x402 protocol. Further information at: https://github.com/a6b8/backendshield',
            'auth': {
                'enabled': true,
                'authType': 'staticBearer',
                'token': BEARER_TOKEN_MASTER
            },
            'protocol': 'streamable',
            'schemas': async () => {
                const { schema: ohlcvSchema } = await import( 'schemaImporter/schemas/v1.2.0/ohlcv/olhcv-moralis-evm.mjs' )
                const { schema: blocknativeSchema } = await import( 'schemaImporter/schemas/v1.2.0/blocknative/gasprice.mjs' )
                const { schema: thegraphSchema } = await import( 'schemaImporter/schemas/v1.2.0/thegraph/getNewUniswapPools.mjs' )
                const { schema: etherscan } = await import( 'schemaImporter/schemas/v1.2.0/etherscan/getContractMultichain.mjs' )
                const arrayOfSchemas = [ ohlcvSchema, blocknativeSchema, thegraphSchema, etherscan ]
                return { arrayOfSchemas }
            }
        }
    }


    static async getX402( {}={} ) {
        return {
            'routePath': '/x402',
            'name': 'AgentPays - MCP with M2M Payment',
            'description': "Experimental server for x402 payments using USDC on Base Sepolia. Offers payment functionality for Model Context Payment (MCP) via 'exact' scheme (EIP-3009). Use with MCP Inspector or Proxy-enabled x402 clients. More info: https://github.com/FlowMCP/x402-experiments",
            'auth': null,
            'protocol': 'streamable',
            'schemas': async () => {
                const arrayOfSchemas = await getArrayOfSchemas( {
                    includeNamespaces: [ 'x402', 'pinata' ],
                    excludeNamespaces: [],
                    activateTags: []
                } )
                const { schema: pinata }= await import( './custom-schemas/pinata/write.mjs' )
                arrayOfSchemas.push( pinata )
                return { arrayOfSchemas }
            }
        }
    }


    static async getLukso( {}={} ) {
        return {
            'routePath': '/lukso',
            'name': 'LUKSO Network - Community MCP Server',
            'description': 'Provides access to the LUKSO Network for search and redirect functionality on mainnet and testnet.',
            'auth': null,
            'protocol': 'streamable',
            'schemas':  async () => {
                const arrayOfSchemas = await getArrayOfSchemas( {
                    includeNamespaces: [ 'luksoNetwork' ],
                    excludeNamespaces: [],
                    activateTags: []
                } )
                return { arrayOfSchemas }
            }
        }
    }


    static async getChainlinkPrices() {
        return {
            'routePath': '/chainlink/prices',
            'name': 'ChainProbe - Onchain Chainlink Price Feeds for M2M Processing',
            'description': 'Serves all onchain Chainlink price feeds from an EVM chain in a single x402-enabled request. Ideal for machine-to-machine (M2M) data retrieval and autonomous agents. Payments enforced via USDC using EIP-3009 (exact scheme) on Base Sepolia.',
            'auth': null,
            'protocol': 'streamable',
            'schemas': async () => {
                const arrayOfSchemas = await getArrayOfSchemas( {
                    includeNamespaces: [ 'chainlinkMulticall' ],
                    excludeNamespaces: [],
                    activateTags: []
                } )
                const { schema: chainlinkPrices } = await import( './custom-schemas/chainlink/getLatestPricesMulticall.mjs' )
                arrayOfSchemas.push( chainlinkPrices )
                return { arrayOfSchemas }
            }
        }
    }


    static async getInseight( { BEARER_TOKEN_MASTER } ) {
        return {
            'routePath': '/inseight',
            'name': 'Inseight - A SEI Blockchain MCP Server',
            'description': 'Provides access to the SEI Blockchain for search and redirect functionality.',
            'auth': {
                'enabled': true,
                'authType': 'staticBearer',
                'token': BEARER_TOKEN_MASTER
            },
            'protocol': 'streamable',
            'schemas': async () => {
                const { schema: spaceid } = await import( 'schemaImporter/schemas/v1.2.0/spaceid/spaceid.mjs' )
                const { schema: ensResolution } = await import( 'schemaImporter/schemas/v1.2.0/ens/ens-resolution.mjs' )
                const { schema: seiTokenInfo } = await import( 'schemaImporter/schemas/v1.2.0/simdune/sei-token-info.mjs' )
                const arrayOfSchemas = [ spaceid, ensResolution, seiTokenInfo ]
                const { filteredArrayOfSchemas } = FlowMCP
                    .filterArrayOfSchemas( { 
                        arrayOfSchemas, 
                        includeNamespaces: [],
                        excludeNamespaces: [],
                        activateTags: [ 'ens.resolveName', 'ens.lookupAddress', 'simdune.getTokenInfo' ] 
                    } )
                return { arrayOfSchemas: filteredArrayOfSchemas }
            }
        }
    }

/*
    static async getAuth0( { AUTH0_DOMAIN, AUTH0_CLIENT_ID, AUTH0_CLIENT_SECRET, BASE_URL, stageType } ) {
        return {
            'routePath': '/auth0-route',
            'name': 'Auth0',
            'description': 'Testing ScaleKit OAuth 2.1 configuration with MCP schemas',
            'protocol': 'streamable',
            'auth': {
                'enabled': true,
                'authType': 'oauth21_auth0',
                'providerUrl': `https://${AUTH0_DOMAIN}`,
                'realm': 'auth0-route-sse-realm',
                'clientId': `${AUTH0_CLIENT_ID}`,
                'clientSecret': `${AUTH0_CLIENT_SECRET}`,
                'scope': 'openid profile email',
                'audience': ServerManager.normalizeUrlForStage( { url: `${BASE_URL}/auth0-route/sse`, stageType } ),
                'authFlow': 'authorization_code',
                'requiredScopes': ['openid', 'profile', 'email'],
                'requiredRoles': [],
                'resourceUri': ServerManager.normalizeUrlForStage( { url: `${BASE_URL}/auth0-route/sse`, stageType } ),
                // 'forceHttps': false <--- uses stageType to set this
            },
            'schemas': async () => {
                const arrayOfSchemas = await getArrayOfSchemas( {
                    includeNamespaces: [ 'etherscan' ],
                    excludeNamespaces: [],
                    activateTags: []
                } )

                // Add ping schema
                const { schema: pingSchema } = await import( 'schemaImporter/schemas/v1.2.0/x402/ping.mjs' )
                arrayOfSchemas.push( pingSchema )

                return { arrayOfSchemas }
            }
        }
    }
*/

    static async getScalekit( { SCALEKIT_ENVIRONMENT_URL, SCALEKIT_MCP_ID, SCALEKIT_CLIENT_ID, SCALEKIT_CLIENT_SECRET, BASE_URL, stageType } ) {
        return {
            'routePath': '/scalekit-streamable',
            'name': 'ScaleKit Route',
            'description': 'Testing ScaleKit OAuth 2.1 configuration with MCP schemas',
            'bearerIsPublic': false,
            'protocol': 'streamable',
            'auth': {
                'enabled': true,
                'authType': 'oauth21_scalekit',
                'providerUrl': `${SCALEKIT_ENVIRONMENT_URL}`,
                'mcpId': `${SCALEKIT_MCP_ID}`,
                'clientId': `${SCALEKIT_CLIENT_ID}`,
                'clientSecret': `${SCALEKIT_CLIENT_SECRET}`,
                'resource': ServerManager.normalizeUrlForStage( { url: `${BASE_URL}/scalekit-route`, stageType } ),
                'resourceDocumentation': ServerManager.normalizeUrlForStage( { url: `${BASE_URL}/scalekit-route/docs`, stageType } ),
                'scope': 'openid profile mcp:tools mcp:resources:read mcp:resources:write',
                'authFlow': 'authorization_code'
            },
            'schemas': async () => {
                const arrayOfSchemas = await getArrayOfSchemas( {
                    includeNamespaces: [ 'etherscan' ],
                    excludeNamespaces: [],
                    activateTags: []
                } )

                // Add ping schema
                const { schema: pingSchema } = await import( 'schemaImporter/schemas/v1.2.0/x402/ping.mjs' )
                arrayOfSchemas.push( pingSchema )

                return { arrayOfSchemas }
            }
        }
    }
}


export { ConfigManager2 }