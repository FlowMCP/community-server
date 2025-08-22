[![Test](https://img.shields.io/github/actions/workflow/status/flowmcp/flowmcp/test-on-release.yml)]() ![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)

# FlowMCP Community Server - ServerManager Module

A comprehensive multi-service MCP (Model Context Protocol) server management system built on the ServerManager module. Provides centralized configuration, environment management, and orchestration for multiple blockchain and API services with integrated x402 payment capabilities.

The `ServerManager` class in `./src/index.mjs` serves as the core orchestration module, handling everything from command line argument parsing to server startup, while `main.mjs` demonstrates a complete implementation example.

## Features

- **Multi-Service Architecture**: Supports Avalanche, x402 Payment, LUKSO Network, and ChainLink services
- **Environment Management**: Automated loading and validation of environment variables across development, test, and production stages
- **x402 Payment Integration**: Built-in support for USDC payments on Base Sepolia using EIP-3009 (exact scheme)
- **Bearer Token Authentication**: Configurable authentication system with public and private endpoints
- **SSE Protocol Support**: Server-Sent Events for real-time MCP communication
- **Schema Transformation**: Advanced schema processing with namespace merging and format conversion
- **Webhook Integration**: Built-in webhook server with PM2 process management
- **Comprehensive Testing**: 28 test cases covering all ServerManager functionality
- **Command Line Interface**: Full CLI support with stage-based configuration
- **Type-Safe Configuration**: Structured configuration with validation and error handling

## Table of Contents

- [FlowMCP Community Server - ServerManager Module](#flowmcp-community-server---servermanager-module)
  - [Features](#features)
  - [Table of Contents](#table-of-contents)
  - [Quick Start](#quick-start)
  - [ServerManager Methods](#servermanager-methods)
    - [.getStageType()](#getstagetype)
    - [.getEnvObject()](#getenvobject)
    - [.getPackageVersion()](#getpackageversion)
    - [.getWebhookEnv()](#getwebhookenv)
    - [.getX402Credentials()](#getx402credentials)
    - [.getServerConfig()](#getserverconfig)
    - [.start()](#start)
  - [Implementation Example](#implementation-example)
  - [Environment Configuration](#environment-configuration)
  - [Testing Framework](#testing-framework)
  - [Error Handling](#error-handling)
  - [Development & Deployment](#development--deployment)

## Quick Start

```bash
# Clone the repository
git clone <repository-url>
cd 6-community-server

# Install dependencies
npm install

# Set up environment variables
cp .community.env .env  # Copy development config
# Edit .env with your API keys and configuration

# Start development server
npm run start:dev

# Or start production server
npm run start:server

# Run comprehensive test suite
npm test
```

**Basic ServerManager Usage:**

```js
import { ServerManager } from './src/index.mjs'

// Parse command line arguments
const { stageType } = ServerManager.getStageType({ argvs: process.argv })

// Load environment configuration
const { envObject } = ServerManager.getEnvObject({ stageType })

// Get server configuration with bearer tokens
const { serverConfig } = ServerManager.getServerConfig({ envObject })

// Start the complete server stack
await ServerManager.start({
    silent: false,
    stageType,
    arrayOfSchemas: schemas,
    serverConfig,
    envObject,
    // ... additional configuration
})
```

## ServerManager Methods

The ServerManager class provides 7 static methods for complete server lifecycle management.

### .getStageType()

Parses command line arguments to determine the deployment stage (development, test, production).

**Method**

```js
ServerManager.getStageType({ argvs })
```

| Key     | Type  | Description                                    | Required |
|---------|-------|------------------------------------------------|----------|
| `argvs` | array | Process arguments array (typically `process.argv`) | Yes      |

**Example**

```js
// Command line: node main.mjs --stage=production
const { stageType } = ServerManager.getStageType({ argvs: process.argv })
console.log(stageType) // 'production'

// Defaults to 'development' if no stage specified
const { stageType: defaultStage } = ServerManager.getStageType({ argvs: ['node', 'script.js'] })
console.log(defaultStage) // 'development'
```

**Returns**

```js
{
    stageType: 'development' | 'test' | 'production'
}
```

### .getEnvObject()

Loads and parses environment variables from stage-specific configuration files.

**Method**

```js
ServerManager.getEnvObject({ stageType })
```

| Key         | Type   | Description                                        | Required |
|-------------|--------|----------------------------------------------------|----------|
| `stageType` | string | Stage type ('development', 'test', 'production')  | Yes      |

**Example**

```js
const { envObject } = ServerManager.getEnvObject({ stageType: 'development' })

// Access environment variables
console.log(envObject['BEARER_TOKEN__0'])     // 'dev_bearer_token_route_0'
console.log(envObject['WEBHOOK_SECRET'])      // 'dev_webhook_secret_123'
console.log(envObject['BASE_SEPOLIA_ALCHEMY_HTTP']) // Alchemy URL
```

**Returns**

```js
{
    envObject: {
        'BEARER_TOKEN__0': 'dev_bearer_token_route_0',
        'BEARER_TOKEN__1': 'dev_bearer_token_route_1',
        'WEBHOOK_SECRET': 'dev_webhook_secret_123',
        'WEBHOOK_PORT': '3001',
        'ACCOUNT_DEVELOPMENT2_PRIVATE_KEY': '0x1234...',
        // ... all environment variables from .env file
    }
}
```

### .getPackageVersion()

Extracts version information from package.json for server identification and logging.

**Method**

```js
ServerManager.getPackageVersion()
```

**Example**

```js
const { managerVersion } = ServerManager.getPackageVersion()
console.log(`Server version: ${managerVersion}`) // 'Server version: 0.6.2'
```

**Returns**

```js
{
    managerVersion: '0.6.2'
}
```

### .getWebhookEnv()

Extracts webhook-specific configuration from environment variables.

**Method**

```js
ServerManager.getWebhookEnv({ stageType })
```

| Key         | Type   | Description                                       | Required |
|-------------|--------|---------------------------------------------------|----------|
| `stageType` | string | Stage type for environment file selection        | Yes      |

**Example**

```js
const { webhookSecret, webhookPort, pm2Name } = ServerManager.getWebhookEnv({ 
    stageType: 'development' 
})

console.log(webhookSecret) // 'dev_webhook_secret_123'
console.log(webhookPort)   // '3001' 
console.log(pm2Name)       // 'community-server-dev'
```

**Returns**

```js
{
    webhookSecret: 'dev_webhook_secret_123',
    webhookPort: '3001',
    pm2Name: 'community-server-dev'
}
```

### .getX402Credentials()

Processes x402 payment system credentials and configuration for blockchain payments.

**Method**

```js
ServerManager.getX402Credentials({ envObject })
```

| Key         | Type   | Description                                      | Required |
|-------------|--------|--------------------------------------------------|----------|
| `envObject` | object | Environment variables object from getEnvObject  | Yes      |

**Example**

```js
const { x402Config, x402Credentials, x402PrivateKey } = ServerManager.getX402Credentials({ 
    envObject 
})

console.log(x402Config.chainId)           // 84532 (Base Sepolia)
console.log(x402Config.chainName)         // 'base-sepolia'
console.log(x402Credentials.payTo1)       // '0x742d35Cc...'
console.log(x402PrivateKey)               // '0x1234567890abcdef...'
```

**Returns**

```js
{
    x402Config: {
        chainId: 84532,
        chainName: 'base-sepolia',
        restrictedCalls: [
            { method: 'tools/call', name: 'paid_ping_x402', activePaymentOptions: ['usdc-sepolia'] }
        ],
        paymentOptions: {
            'usdc-sepolia': { contractId: 'usdc-sepolia', maxAmountRequired: '0.01' }
        },
        contracts: {
            'usdc-sepolia': { address: '0x036CbD53842c5426634e7929541eC2318f3dCF7e' }
        }
    },
    x402Credentials: {
        payTo1: '0x742d35Cc6634C0532925a3b8D6aC6782d3B5C123',
        serverProviderUrl: 'https://base-sepolia.g.alchemy.com/v2/...'
    },
    x402PrivateKey: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef12'
}
```

### .getServerConfig()

Processes server route configuration and replaces bearer tokens from environment variables.

**Method**

```js
ServerManager.getServerConfig({ envObject })
```

| Key         | Type   | Description                                      | Required |
|-------------|--------|--------------------------------------------------|----------|
| `envObject` | object | Environment variables object from getEnvObject  | Yes      |

**Example**

```js
const { serverConfig } = ServerManager.getServerConfig({ envObject })

console.log(serverConfig.landingPage.name)     // 'FlowMCP Community Servers'
console.log(serverConfig.routes[0].name)       // 'avalanche'
console.log(serverConfig.routes[0].bearerToken) // 'dev_bearer_token_route_0'
console.log(serverConfig.routes[0].routePath)  // '/avalanche'
```

**Returns**

```js
{
    serverConfig: {
        landingPage: {
            name: 'FlowMCP Community Servers',
            description: 'Community servers for the FlowMCP project...'
        },
        routes: [
            {
                name: 'avalanche',
                description: '',
                bearerIsPublic: true,
                routePath: '/avalanche',
                bearerToken: 'dev_bearer_token_route_0', // Replaced from env
                protocol: 'sse',
                includeNamespaces: [],
                excludeNamespaces: [],
                activateTags: ['ohlcv.getRecursiveOhlcvEVM', 'blocknative.getGasPrices']
            }
            // ... additional routes
        ],
        x402: { /* x402 configuration */ }
    }
}
```

### .start()

Orchestrates the complete server startup process including community server and webhook server initialization.

**Method**

```js
await ServerManager.start({ silent, stageType, arrayOfSchemas, serverConfig, envObject, webhookSecret, webhookPort, pm2Name, managerVersion, x402Config, x402Credentials, x402PrivateKey })
```

| Key                | Type    | Description                                         | Required |
|--------------------|---------|-----------------------------------------------------|----------|
| `silent`           | boolean | Suppress console output during startup             | Yes      |
| `stageType`        | string  | Stage type ('development', 'test', 'production')   | Yes      |
| `arrayOfSchemas`   | array   | Array of FlowMCP schemas to activate               | Yes      |
| `serverConfig`     | object  | Server configuration from getServerConfig          | Yes      |
| `envObject`        | object  | Environment variables from getEnvObject            | Yes      |
| `webhookSecret`    | string  | Webhook authentication secret                       | Yes      |
| `webhookPort`      | string  | Port for webhook server                             | Yes      |
| `pm2Name`          | string  | PM2 process name                                   | Yes      |
| `managerVersion`   | string  | Version string from getPackageVersion             | Yes      |
| `x402Config`       | object  | x402 configuration from getX402Credentials        | Yes      |
| `x402Credentials`  | object  | x402 credentials from getX402Credentials          | Yes      |
| `x402PrivateKey`   | string  | x402 private key from getX402Credentials          | Yes      |

**Example**

```js
// Complete server startup - see main.mjs for full implementation
await ServerManager.start({
    silent: false,
    stageType: 'development',
    arrayOfSchemas: [/* FlowMCP schemas */],
    serverConfig,
    envObject,
    webhookSecret: 'dev_webhook_secret_123',
    webhookPort: '3001',
    pm2Name: 'community-server-dev',
    managerVersion: '0.6.2',
    x402Config,
    x402Credentials,
    x402PrivateKey
})

// Server is now running on configured ports with all services active
```

**Returns**

```js
true // Server started successfully
```

## Implementation Example

The `main.mjs` file demonstrates a complete ServerManager implementation:

```js
import { ServerManager } from './src/index.mjs'
import { SchemaImporter } from 'schemaImporter'

// Custom schema imports
import { schema as pinataWrite } from './custom-schemas/pinata/write.mjs'
import { schema as chainlinkPrices } from './custom-schemas/chainlink/getLatestPricesMulticall.mjs'
import { schemas as avalancheSchemas } from './custom-schemas/avalanche/index.mjs'

// 1. Parse command line arguments
const { stageType } = ServerManager.getStageType({ 'argvs': process.argv })

// 2. Load environment configuration
const { envObject } = ServerManager.getEnvObject({ stageType })

// 3. Process server and payment configuration
const { serverConfig } = ServerManager.getServerConfig({ envObject })
const { x402Config, x402Credentials, x402PrivateKey } = ServerManager.getX402Credentials({ envObject })

// 4. Load webhook configuration
const { webhookSecret, webhookPort, pm2Name } = ServerManager.getWebhookEnv({ stageType })
const { managerVersion } = ServerManager.getPackageVersion()

// 5. Load FlowMCP schemas
const arrayOfSchemas = await SchemaImporter.loadFromFolder({
    excludeSchemasWithImports: true,
    excludeSchemasWithRequiredServerParams: true,
    addAdditionalMetaData: true,
    outputType: 'onlySchema'
})

// 6. Add custom schemas
arrayOfSchemas.push(pinataWrite)
arrayOfSchemas.push(chainlinkPrices)
arrayOfSchemas.push(...avalancheSchemas)

// 7. Start complete server stack
await ServerManager.start({
    silent: false,
    stageType,
    arrayOfSchemas,
    serverConfig,
    envObject,
    webhookSecret,
    webhookPort,
    pm2Name,
    managerVersion,
    x402Config,
    x402Credentials,
    x402PrivateKey
})
```

## Environment Configuration

The ServerManager supports three deployment stages with corresponding environment files:

### Development Environment
**File**: `.community.env`  
**Usage**: Local development and testing

```bash
# Server Configuration
SERVER_URL=http://localhost
SERVER_PORT=3000

# Webhook Configuration  
WEBHOOK_SECRET=dev_webhook_secret_123
WEBHOOK_PORT=3001
PM2_NAME=community-server-dev

# Bearer Tokens for Routes
BEARER_TOKEN__0=dev_bearer_token_route_0
BEARER_TOKEN__1=dev_bearer_token_route_1
BEARER_TOKEN__2=dev_bearer_token_route_2
BEARER_TOKEN__3=dev_bearer_token_route_3

# x402 Development Configuration
ACCOUNT_DEVELOPMENT2_PRIVATE_KEY=0x1234567890abcdef...
ACCOUNT_DEVELOPMENT2_PUBLIC_KEY=0x742d35Cc6634C0532925a3b8D6aC6782d3B5C123
BASE_SEPOLIA_ALCHEMY_HTTP=https://base-sepolia.g.alchemy.com/v2/your-key
```

### Test Environment
**File**: `tests/.test.env`  
**Usage**: Automated testing with Jest

```bash
# Test-specific configuration
WEBHOOK_SECRET=test-webhook-secret-123
WEBHOOK_PORT=3007
PM2_NAME=test-community-server

# Test bearer tokens
BEARER_TOKEN__0=test-avalanche-token
BEARER_TOKEN__1=test-agentpays-token
BEARER_TOKEN__2=test-lukso-token
BEARER_TOKEN__3=test-chainlink-token
```

### Production Environment
**File**: `.env`  
**Usage**: Production deployment

```bash
# Production configuration with real API keys
# (Not included in repository for security)
```

## Testing Framework

Comprehensive test suite with 28 tests across 4 test files, ensuring complete ServerManager functionality coverage:

### Test Suites

```bash
# Run all tests
npm test

# Run individual test suites
npx jest tests/ServerManager.simple.test.mjs        # Unit tests
npx jest tests/ServerManager.mcp.test.mjs           # MCP integration
npx jest tests/ServerManager.clean.test.mjs         # Process isolation
npx jest tests/ServerManager.comprehensive.test.mjs # All methods
```

### 1. ServerManager.simple.test.mjs
**5 Unit Tests** - Basic functionality validation
- Class existence and method availability
- Command line argument parsing with various inputs
- Package version extraction from package.json
- Stage type defaults and validation

### 2. ServerManager.mcp.test.mjs  
**6 MCP Integration Tests** - End-to-end MCP protocol testing
- Complete server startup and SSE connection
- `tools/list` functionality verification
- `tools/call` execution for both free and paid tools
- x402 payment integration testing
- Error handling for invalid tool calls
- Bearer token authentication flow

### 3. ServerManager.clean.test.mjs
**2 Process Isolation Tests** - Clean server lifecycle testing  
- Server startup in separate child processes
- HTTP endpoint accessibility and response validation
- Clean shutdown and resource cleanup
- Authentication bypass testing

### 4. ServerManager.comprehensive.test.mjs
**15 Complete Method Tests** - All public methods with edge cases
- `getWebhookEnv()` - Valid/invalid stage types, environment parsing
- `getX402Credentials()` - Credential extraction, missing variable handling
- `getServerConfig()` - Bearer token replacement, configuration warnings  
- `getEnvObject()` - Real file reading, comment filtering, malformed lines
- Error handling and console output capture
- Edge cases and boundary conditions

## Error Handling

The ServerManager provides comprehensive error handling across all operations:

### Environment Loading Errors
```js
// Missing environment file
const result = ServerManager.getWebhookEnv({ stageType: 'nonexistent' })
// Throws: "No environment file found for stage type: nonexistent"

// Missing environment variables
const { x402Credentials } = ServerManager.getX402Credentials({ envObject: {} })  
// Throws: "Environment loading failed: Missing environment variable: ACCOUNT_DEVELOPMENT2_PRIVATE_KEY"
```

### Configuration Validation
```js
// Missing bearer tokens (logs warnings)
const { serverConfig } = ServerManager.getServerConfig({ envObject: {} })
// Console output: "Missing BEARER_TOKEN__0 in .env file"
```

### Server Startup Errors
```js
try {
    await ServerManager.start({ /* incomplete config */ })
} catch (error) {
    console.error('Server startup failed:', error.message)
    // Handles missing parameters, port conflicts, schema validation errors
}
```

### Testing Error Scenarios
All error conditions are tested in the comprehensive test suite:
- Invalid stage types
- Missing environment files  
- Malformed configuration data
- Network connection failures
- Authentication errors

## Development & Deployment

### Development Workflow
```bash
# Start development server with hot reload
npm run start:dev

# Run MCP inspector for debugging
npm run inspector

# Execute comprehensive tests
npm test

# Run tests with summary output
npm run test:summary
```

### Production Deployment
```bash
# Set production environment
export NODE_ENV=production

# Start production server
npm run start:server -- --stage=production

# Monitor with PM2 (configured via PM2_NAME environment variable)
pm2 list
pm2 logs community-server-prod
```

### Schema Development
Custom schemas are located in `custom-schemas/`:
- `pinata/write.mjs` - IPFS file upload functionality
- `chainlink/getLatestPricesMulticall.mjs` - Price feed aggregation
- `avalanche/index.mjs` - Multi-namespace schema collection with transformation

### Webhook Integration
The server includes webhook functionality for GitHub integration and external notifications:
- Webhook server runs on configurable port (default: 3001)
- PM2 process management for production deployment
- Secret-based authentication for webhook endpoints

---

## License

MIT