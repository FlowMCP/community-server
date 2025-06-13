import { DeployAdvanced } from 'flowmcpServers'


class CommunityServer {
    static start( { silent, arrayOfSchemas, serverConfig, envObject, managerVersion } ) {
        const { serverType, app, mcps, events, argv } = DeployAdvanced
            .init( { silent, arrayOfSchemas, serverConfig, envObject } )
        this.#addLandingPage( { app, managerVersion } )

        DeployAdvanced.start()
        return true
    }

    static #addLandingPage( { app, managerVersion } ) {
        app.get( '/', ( req, res ) => {
            res.send( `Community Server v.${managerVersion}` )
        } )
        return true
    }
}


export { CommunityServer}