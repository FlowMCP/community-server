# ServerManager - Data Flow and Architecture

## Overview

The ServerManager orchestrates the entire flow from startup to running MCP server. This documentation describes the data flow and expected structures.

## Main Flow (main-new.mjs)

### 1. Initialization

```javascript
import { serverConfig } from './serverConfig.mjs'
import { ServerManager } from './src/index.mjs'
import { checkBearerTokens } from './custom-schemas-new/helpers/utils.mjs'
```

### 2. Route Filtering

```javascript
const activeRoutes = [ '/eerc20' ]  // Minimal list of active routes
const modifiedRoutes = routes.filter( ( { routePath } ) => activeRoutes.includes( routePath ) )
```

**Purpose**: Only selected routes are activated (development/testing)

### 3. Data Extraction from ServerManager

#### 3.1 Stage Type
```javascript
const { stageType } = ServerManager.getStageType( { 'argvs': process.argv } )
```
- **Input**: `process.argv` 
- **Output**: `'development'` | `'test'` | `'production'`
- **Default**: `'development'`

#### 3.2 Environment Variables
```javascript
const { envObject } = ServerManager.getEnvObject( { stageType } )
```
- **Input**: Stage type
- **Output**: Object with all environment variables
- **Files**: 
  - `development`: `./../.community.env`
  - `test`: `./tests/.test.env`
  - `production`: `./../.env`

#### 3.3 x402 Credentials
```javascript
const { x402Config, x402Credentials, x402PrivateKey } = ServerManager.getX402Credentials( { envObject, x402Config: x402 } )
```
- **Input**: Environment object + x402 config
- **Output**: Processed x402 configuration

#### 3.4 Webhook Configuration
```javascript
const { webhookSecret, webhookPort, pm2Name } = ServerManager.getWebhookEnv( { stageType } )
```
- **Input**: Stage type
- **Output**: Webhook-specific configuration

#### 3.5 Version
```javascript
const { managerVersion } = ServerManager.getPackageVersion()
```
- **Output**: Version aus package.json

### 4. Schema-Generierung

```javascript
const objectOfSchemaArrays = await modifiedRoutes
    .reduce( async ( promiseAcc, route ) => {
        const acc = await promiseAcc
        const { routePath, schemas } = route
        const { arrayOfSchemas } = await schemas()
        acc[ routePath ] = arrayOfSchemas
        return acc
    }, Promise.resolve( {} ) )
```

**Struktur**:
```javascript
{
    '/eerc20': [ /* Array von Schema-Objekten */ ],
    '/x402': [ /* Array von Schema-Objekten */ ],
    // ...
}
```

### 5. Bearer Token Validierung

```javascript
const { status, messages } = checkBearerTokens( { routes: modifiedRoutes, envObject } )
if( !status ) { throw new Error( `Missing bearer tokens:\n${messages.join( '\n' )}` ) }
```

**Token-Namenskonvention**:
- Route: `/eerc20` → Token: `BEARER_TOKEN_EERC20`
- Route: `/x402` → Token: `BEARER_TOKEN_X402`
- Route: `/chainlink/prices` → Token: `BEARER_TOKEN_CHAINLINK_PRICES`

### 6. Server Start

```javascript
await ServerManager.start( {
    silent: false,
    stageType,
    objectOfSchemaArrays,
    serverConfig: modifiedServerConfig,
    envObject,
    webhookSecret,
    webhookPort,
    pm2Name,
    managerVersion,
    x402Config,
    x402Credentials,
    x402PrivateKey
} )
```

## Datenstrukturen

### serverConfig.mjs

```javascript
{
    landingPage: {
        name: 'FlowMCP Community Servers',
        description: '...'
    },
    routes: [
        {
            routePath: '/eerc20',
            name: 'Encrypted ERC20',
            description: '...',
            bearerIsPublic: true,
            protocol: 'sse',
            schemas: async () => {
                // Lädt und gibt Schemas zurück
                return { arrayOfSchemas: [...] }
            }
        },
        // Weitere Routes...
    ],
    x402: {
        chainId: 84532,
        chainName: 'base-sepolia',
        restrictedCalls: [...],
        paymentOptions: {...},
        contracts: {...},
        envSelection: [...]
    }
}
```

### Environment Variables (.env)

**Neue Namenskonvention (Route-basiert)**:
```bash
# Bearer Tokens
BEARER_TOKEN_EERC20=your-token-here
BEARER_TOKEN_X402=your-token-here
BEARER_TOKEN_LUKSO=your-token-here
BEARER_TOKEN_CHAINLINK_PRICES=your-token-here
BEARER_TOKEN_INSEIGHT=your-token-here

# Webhook
WEBHOOK_SECRET=secret-123
WEBHOOK_PORT=3001
PM2_NAME=community-server-dev

# x402 Payment
ACCOUNT_DEVELOPMENT2_PRIVATE_KEY=0x...
ACCOUNT_DEVELOPMENT2_PUBLIC_KEY=0x...
BASE_SEPOLIA_ALCHEMY_HTTP=https://...
```

### objectOfSchemaArrays Struktur

```javascript
{
    '/route-path': [
        {
            namespace: 'namespace-name',
            name: 'tool-name',
            description: '...',
            inputSchema: {...},
            outputSchema: {...},
            handler: async function() {...}
        },
        // Weitere Schemas...
    ],
    // Weitere Routes...
}
```

## Ablaufdiagramm

```
1. main-new.mjs startet
   ↓
2. Lädt serverConfig.mjs (alle Routes + Konfiguration)
   ↓
3. Filtert Routes nach activeRoutes Array
   ↓
4. Holt Stage Type aus CLI-Argumenten
   ↓
5. Lädt Environment-Variablen basierend auf Stage
   ↓
6. Extrahiert x402, Webhook, Version Konfiguration
   ↓
7. Generiert Schemas für jede aktive Route (async)
   ↓
8. Validiert Bearer Tokens (neue Namenskonvention)
   ↓
9. Startet ServerManager mit allen Parametern
   ↓
10. Server läuft auf konfigurierten Ports
```

## Fehlerbehandlung

### Fehlende Bearer Tokens
```
Error: Missing bearer tokens:
- BEARER_TOKEN_EERC20 for route "/eerc20" (Encrypted ERC20)
- BEARER_TOKEN_X402 for route "/x402" (AgentPays)
```

### Fehlende Environment-Variablen
```
Error: Environment loading failed: Missing environment variable: ACCOUNT_DEVELOPMENT2_PRIVATE_KEY
```

## Wichtige Hinweise

1. **activeRoutes**: Bestimmt welche Routes tatsächlich geladen werden
2. **Bearer Token Naming**: Automatisch aus Route-Pfad generiert
3. **Schema Loading**: Async über `schemas()` Funktion in Route-Definition
4. **Stage-basierte Config**: Unterschiedliche .env Dateien je Stage
5. **Validation**: Tokens werden VOR Server-Start validiert

### Route-based Token Naming

```bash
BEARER_TOKEN_EERC20=token
BEARER_TOKEN_X402=token
```

Advantage: Self-documenting, no index confusion