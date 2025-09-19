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


class ConfigManager {
    static async getServerConfig( { silent=false, stageType, envObject } ) {
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

        const { cors, landingPage, x402 } = config
        const routes = await Promise.all( [
            // RouteManager.getErc20( { BEARER_TOKEN_MASTER } ),
            // RouteManager.getX402(),
            // RouteManager.getLukso(),
            // RouteManager.getChainlinkPrices(),
            // RouteManager.getInseight( { BEARER_TOKEN_MASTER } ),
            // RouteManager.getScalekit( { SCALEKIT_ENVIRONMENT_URL, SCALEKIT_MCP_ID, SCALEKIT_CLIENT_ID, SCALEKIT_CLIENT_SECRET, BASE_URL, stageType } )
        ] )
        const serverConfig = { silent, cors, landingPage, routes, x402 }

        return { serverConfig, baseUrl: BASE_URL }
    }
}