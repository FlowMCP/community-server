const serverConfig = {
    'config': {},
    'routes': [
        {
            'routePath': '/luksoNetwork',
            'bearerToken': '1234',
            'transportProtocols': [ 'sse' ],
            'includeNamespaces': [ 'luksoNetwork' ],
            'excludeNamespaces': [],
            'activateTags': [],
        }
    ]
}


export { serverConfig }