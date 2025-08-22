const serverConfig = {
    'landingPage': {
        'name': 'FlowMCP Community Servers',
        'description': 'Community servers for the FlowMCP project, providing access to various networks and functionalities.'
    },
    'config': {},
    'routes': [
        {
            'name': 'avalanche',
            'description': '',
            'bearerIsPublic': true,
            'routePath': '/avalanche',
            'bearerToken': 'hal-finney',
            'protocol': 'sse',
            'includeNamespaces': [],
            'excludeNamespaces': [],
            'activateTags': [
    // Etherscan Routes
    'etherscan.getGasOracle',
    'etherscan.estimateGasCost',
    'etherscan.getAvailableChains',
    'etherscan.getSmartContractAbi',
    'etherscan.getSourceCode',
    
    // OHLCV Routes
    'ohlcv.getRecursiveOhlcvEVM',
    
    // Blocknative Routes
    'blocknative.getGasPrices',
    
    // DexScreener Routes
    'dexscreener.getLatestPairs',
    'dexscreener.getPairsByChain',
    'dexscreener.getSpecificPair',
    
    // TheGraph Routes
    'thegraph.getNewPools',
    
    // Moralis Routes
    'moralis./wallets/:address/defi/:protocol/positions',
    'moralis./wallets/:address/defi/positions',
    'moralis./wallets/:address/defi/summary',
    'moralis./wallets/:address/nfts/trades',
    'moralis./:address/nft/collections',
    'moralis./:address/nft/transfers',
    'moralis./:address/nft',
    'moralis./wallets/:address/swaps',
    'moralis./wallets/:address/approvals',
    'moralis./wallets/:address/tokens',
    'moralis./:address/erc20',
    'moralis./:address/erc20/transfers',
    'moralis./wallets/:address/chains',
    'moralis./:address/balance',
    'moralis./wallets/:address/history',
    'moralis./wallets/:address/net-worth',
    'moralis./wallets/:address/profitability/summary',
    'moralis./wallets/:address/profitability',
    'moralis./wallets/:address/stats'
]
        },
        {
            "name": "AgentPays - MCP with M2M Payment",
            "description": "Experimental server for x402 payments using USDC on Base Sepolia. Offers payment functionality for Model Context Payment (MCP) via 'exact' scheme (EIP-3009). Use with MCP Inspector or Proxy-enabled x402 clients. More info: https://github.com/FlowMCP/x402-experiments",
            'bearerIsPublic': true,
            'routePath': '/x402',
            'bearerToken': 'hal-finney',
            'protocol': 'sse',
            'includeNamespaces': [ 'x402', 'pinata' ],
            'excludeNamespaces': [],
            'activateTags': []
        },
        {
            'name': 'LUKSO Network - Community MCP Server',
            'description': 'Provides access to the LUKSO Network for search and redirect functionality on mainnet and testnet.',
            'bearerIsPublic': true,
            'routePath': '/lukso',
            'bearerToken': '1234',
            'protocol': 'sse',
            'includeNamespaces': [ 'luksoNetwork' ],
            'excludeNamespaces': [],
            'activateTags': [],
        },
        {
            "name": "ChainProbe - Onchain Chainlink Price Feeds for M2M Processing",
            "description": "Serves all onchain Chainlink price feeds from an EVM chain in a single x402-enabled request. Ideal for machine-to-machine (M2M) data retrieval and autonomous agents. Payments enforced via USDC using EIP-3009 (exact scheme) on Base Sepolia.",
            "bearerIsPublic": true,
            "routePath": "/chainlink/prices",
            "bearerToken": "hal-finney",
            "protocol": "sse",
            "includeNamespaces": [ "chainlinkMulticall" ],
            "excludeNamespaces": [],
            "activateTags": []
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