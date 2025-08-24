// Direkte Imports der benötigten Schemas ohne dynamisches Laden
import { schema as ohlcvSchema } from '../../node_modules/schemaImporter/schemas/v1.2.0/ohlcv/olhcv-moralis-evm.mjs'
import { schema as blocknativeSchema } from '../../node_modules/schemaImporter/schemas/v1.2.0/blocknative/gasprice.mjs'
import { schema as thegraphSchema } from '../../node_modules/schemaImporter/schemas/v1.2.0/thegraph/getNewUniswapPools.mjs'


// Direkter Export als Array ohne Transformation
export const schemas = [
    ohlcvSchema,
    blocknativeSchema,
    thegraphSchema
]