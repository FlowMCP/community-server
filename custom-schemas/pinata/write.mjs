import { PinataSDK } from "pinata"


const schema = {
    namespace: "pinata",
    name: "Pinata SDK Upload",
    description: "Uploads a text file to IPFS using the new Pinata SDK and File object",
    docs: ["https://docs.pinata.cloud/sdk-pinning/pinata-upload"],
    tags: [],
    flowMCP: "1.2.0",
    root: "https:...",
    requiredServerParams: ["PINATA_JWT", "PINATA_GATEWAY"],
    headers: {},
    routes: {
        upload_text_file: {
            requestMethod: "POST",
            description: "Uploads a plain text file to IPFS using the new Pinata SDK",
            route: "/sdk/upload",
            parameters: [
                { position: { key: "pinata_jwt_token", value: "{{PINATA_JWT}}", location: "insert" } },
                { position: { key: "pinata_gateway", value: "{{PINATA_GATEWAY}}", location: "insert" } },
                { position: { key: "filename", value: "{{USER_PARAM}}", location: "insert" }, z: { primitive: "string()", options: ["min(1)"] } },
                { position: { key: "content", value: "{{USER_PARAM}}", location: "insert" }, z: { primitive: "string()", options: ["min(1)"] } }
            ],
            tests: [
                { _description: "Upload hello.txt with text content", filename: "hello.txt", content: "hello world!" }
            ],
            modifiers: [
                { phase: "execute", handlerName: "uploadViaSDK" }
            ]
        }
    },
    handlers: {
        uploadViaSDK: async ({ struct, payload, userParams }) => {
            const { pinata_jwt_token, pinata_gateway } = userParams['_allParams']

            const pinata = new PinataSDK( {
                pinataJwt: pinata_jwt_token,
                pinataGateway: pinata_gateway
            } )

            try {
                const file = new File( [ userParams.content ], userParams.filename, { type: "text/plain" } )
                const upload = await pinata.upload.public.file( file )
                struct['status'] = true
                struct['data'] = upload
            } catch( error ) {
                struct.status = false;
                struct.messages.push(error?.message || "Upload failed")
            }

            return { struct, payload }
        }
    }
}


export { schema }
