const serverConfig = {
    'landingPage': {
        'name': 'FlowMCP Community Servers',
        'description': 'Community servers for the FlowMCP project, providing access to various networks and functionalities.'
    },
    'config': {},
    'routes': [
        {
            'name': 'LUKSO Network - Community MCP Server',
            'description': 'Provides access to the LUKSO Network for search and redirect functionality on mainnet and testnet.',
            'bearerIsPublic': true,
            'routePath': '/lukso',
            'bearerToken': '1234',
            'transportProtocols': [ 'sse' ],
            'includeNamespaces': [ 'luksoNetwork' ],
            'excludeNamespaces': [],
            'activateTags': [],
        }
    ]
}


export { serverConfig }