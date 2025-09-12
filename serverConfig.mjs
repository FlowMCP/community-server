import { getArrayOfSchemas } from './custom-schemas/helpers/utils.mjs'
import { FlowMCP } from 'flowmcp'


const serverConfig = {
    'silent': false,
    'baseUrls': {
        'development': 'http://localhost:3000',
        'production': 'https://community.flowmcp.org',
    },
    'cors': {
        'enabled': true,
        'options': null
    },
    'env': {
        'development': '../.community.env',
        'production': '../.community.env', 
        'test': './.community.env.example'
    },
    'landingPage': {
        'name': 'FlowMCP Community Servers',
        'description': 'Community servers for the FlowMCP project, providing access to various networks and functionalities.'
    },
    'routes': [
        {
            'routePath': '/eerc20',
            'name': 'Encrypted ERC20',
            'description': 'This is an experimental server for an encrypted ERC20 schema for the x402 protocol. Further information at: https://github.com/a6b8/backendshield',
            'auth': {
                'enabled': true,
                'authType': 'staticBearer',
                'token': 'BEARER_TOKEN_EERC20'
            },
            'protocol': 'sse',
            'schemas': async () => {
                const { schema: ohlcvSchema } = await import( 'schemaImporter/schemas/v1.2.0/ohlcv/olhcv-moralis-evm.mjs' )
                const { schema: blocknativeSchema } = await import( 'schemaImporter/schemas/v1.2.0/blocknative/gasprice.mjs' )
                const { schema: thegraphSchema } = await import( 'schemaImporter/schemas/v1.2.0/thegraph/getNewUniswapPools.mjs' )
                const { schema: etherscan } = await import( 'schemaImporter/schemas/v1.2.0/etherscan/getContractMultichain.mjs' )
                const arrayOfSchemas = [ ohlcvSchema, blocknativeSchema, thegraphSchema, etherscan ]
                return { arrayOfSchemas }
            }
        },
        {
            'routePath': '/x402',
            'name': 'AgentPays - MCP with M2M Payment',
            'description': "Experimental server for x402 payments using USDC on Base Sepolia. Offers payment functionality for Model Context Payment (MCP) via 'exact' scheme (EIP-3009). Use with MCP Inspector or Proxy-enabled x402 clients. More info: https://github.com/FlowMCP/x402-experiments",
            'auth': {
                'enabled': false
            },
            'protocol': 'sse',
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
        },
        {
            'routePath': '/lukso',
            'name': 'LUKSO Network - Community MCP Server',
            'description': 'Provides access to the LUKSO Network for search and redirect functionality on mainnet and testnet.',
            'auth': {
                'enabled': false
            },
            'protocol': 'sse',
            'schemas':  async () => {
                const arrayOfSchemas = await getArrayOfSchemas( {
                    includeNamespaces: [ 'luksoNetwork' ],
                    excludeNamespaces: [],
                    activateTags: []
                } )
                return { arrayOfSchemas }
            }
        },
        {
            'routePath': '/chainlink/prices',
            'name': 'ChainProbe - Onchain Chainlink Price Feeds for M2M Processing',
            'description': 'Serves all onchain Chainlink price feeds from an EVM chain in a single x402-enabled request. Ideal for machine-to-machine (M2M) data retrieval and autonomous agents. Payments enforced via USDC using EIP-3009 (exact scheme) on Base Sepolia.',
            'auth': {
                'enabled': false
            },
            'protocol': 'sse',
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
        },
        {
            'routePath': '/inseight',
            'name': 'Inseight - A SEI Blockchain MCP Server',
            'description': 'Provides access to the SEI Blockchain for search and redirect functionality.',
            'auth': {
                'enabled': true,
                'authType': 'staticBearer',
                'token': 'BEARER_TOKEN_INSEIGHT'
            },
            'protocol': 'sse',
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
        },
        {
            'routePath': '/etherscan-ping',
            'name': 'Etherscan with Ping - Smart Contract Explorer with Ping',
            'description': 'Provides access to Etherscan smart contract explorer with Bearer token authentication and ping functionality.',
            'auth': {
                'enabled': true,
                'authType': 'oauth21_auth0',
                'providerUrl': `https://{{AUTH0_DOMAIN}}`,
                'realm': 'first-route-realm',
                'clientId': '{{AUTH0_CLIENT_ID}}',
                'clientSecret': '{{AUTH0_CLIENT_SECRET}}',
                'scope': 'openid profile email',
                'audience': 'http://localhost:3000/first-route',
                'resourceUri': null,
                // 'forceHttps': false <--- uses stageType to set this
            },
            'protocol': 'sse',
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
    ],
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


export { serverConfig }