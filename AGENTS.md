# AGENTS.md - Project Overview for AI Assistants

## Purpose

This document provides AI assistants with essential information to understand and work with the FlowMCP Community Server project. It serves as the first reference point when opening this repository.

## Project Structure & Key Files

### Core Configuration
- **[serverConfig.mjs](./serverConfig.mjs)** - Central configuration file defining routes, schemas, and environment paths
- **[main.mjs](./main.mjs)** - Main entry point that orchestrates server startup

### Documentation
- **[README.md](./README.md)** - Complete project documentation with API reference
- **[src/SERVER_MANAGER.md](./src/SERVER_MANAGER.md)** - Technical documentation of data flow and architecture

### Core Components
- **[src/index.mjs](./src/index.mjs)** - ServerManager class with orchestration methods
- **[custom-schemas/helpers/utils.mjs](./custom-schemas/helpers/utils.mjs)** - Utility functions for schema handling and bearer token validation

### Custom Schemas
- **[custom-schemas/](./custom-schemas/)** - Directory containing custom MCP schemas
  - `pinata/write.mjs` - IPFS file upload functionality
  - `chainlink/getLatestPricesMulticall.mjs` - Price feed aggregation
  - `avalanche/index.mjs` - Multi-namespace schema collection

## Environment Configuration (CRITICAL)

### ⚠️ Environment Files Are NOT in Repository

The `.env` files are **NOT included** in this repository for security reasons. They must be created **one folder above** the project directory:

```
parent-folder/
├── .community.env          # Development environment
├── .env                    # Production environment  
└──   community-server/     # This project
    ├── tests/
    │   ├── .community.env  # Development test env
    │   └── .test.env       # Test environment
    └── ...
```

### Environment File Locations
- **Development**: `./../.community.env`
- **Production**: `./../.env`
- **Development-Test**: `./tests/.community.env`
- **Test**: `./tests/.test.env`

### Required Environment Variables
```bash
# Server Configuration
SERVER_URL=http://localhost
SERVER_PORT=8080

# Webhook Configuration
WEBHOOK_SECRET=your-webhook-secret
WEBHOOK_PORT=3001
PM2_NAME=community-server-dev

# Bearer Tokens (Route-based naming)
BEARER_TOKEN_EERC20=your-eerc20-token
BEARER_TOKEN_X402=your-x402-token
BEARER_TOKEN_LUKSO=your-lukso-token
BEARER_TOKEN_CHAINLINK_PRICES=your-chainlink-token
BEARER_TOKEN_INSEIGHT=your-inseight-token

# x402 Payment Configuration
ACCOUNT_DEVELOPMENT2_PRIVATE_KEY=0x...
ACCOUNT_DEVELOPMENT2_PUBLIC_KEY=0x...
BASE_SEPOLIA_ALCHEMY_HTTP=https://base-sepolia.g.alchemy.com/v2/...
```

## Bearer Token System

### New Naming Convention (Route-based)
- Route path `/eerc20` → Token `BEARER_TOKEN_EERC20`
- Route path `/x402` → Token `BEARER_TOKEN_X402`
- Route path `/chainlink/prices` → Token `BEARER_TOKEN_CHAINLINK_PRICES`

### Public Routes
Routes with `bearerIsPublic: true` do not require bearer tokens. The validation system automatically skips token checks for these routes.

## Server Architecture

### Data Flow
1. **Command Line Parsing** → Stage type determination
2. **Environment Loading** → Based on stage type
3. **Route Filtering** → Only active routes are loaded
4. **Schema Generation** → Async loading via `schemas()` functions
5. **Token Validation** → Bearer tokens checked before startup
6. **Server Start** → Community server + webhook server

### Active Routes Configuration
The `activeRoutes` array in `main.mjs` determines which routes are actually loaded:
```javascript
const activeRoutes = [ '/eerc20' ]  // Only these routes will be activated
```

## Development Workflow

### Starting the Server
```bash
# Development
npm run start:dev

# Production  
npm run start:server -- --stage=production

# Test
npm test
```

### Adding New Routes
1. Add route definition to `serverConfig.mjs`
2. Implement `schemas()` function for the route
3. Add route path to `activeRoutes` in `main.mjs`
4. Add corresponding bearer token to environment file

### Schema Development
- Place custom schemas in `custom-schemas/` directory
- Use ES modules with `.mjs` extension
- Follow existing patterns for schema structure

## Important Notes for AI Assistants

### What NOT to Modify
- **Environment files** - AI has no access to parent directory
- **Production secrets** - These are user-managed
- **Hard-coded paths** - Always use `serverConfig.mjs` for configuration

### What TO Modify
- **serverConfig.mjs** - For route and configuration changes
- **Custom schemas** - For new functionality
- **main.mjs** - For startup logic changes
- **Utils functions** - For shared functionality

### Testing
- Test files are in `tests/` directory
- 28 comprehensive tests cover all ServerManager functionality
- Test environment uses separate `.env` files

### Error Handling
- Missing bearer tokens show descriptive error messages
- Environment validation happens before server start
- Schema loading failures are logged with warnings

## File Organization

```
community-server/
├── AGENTS.md                    # This file
├── README.md                    # Main documentation
├── serverConfig.mjs            # Central configuration
├── main.mjs                    # Entry point
├── src/
│   ├── SERVER_MANAGER.md       # Technical docs
│   ├── index.mjs              # ServerManager class
│   ├── task/                  # Server implementations
│   └── public/                # HTML templates
├── custom-schemas/            # Custom MCP schemas
│   └── helpers/utils.mjs     # Utility functions
├── tests/                     # Test suite
└── .trash/                   # Old/unused files
```

## Common Issues & Solutions

### "Missing Bearer Tokens" Error
- Check that all required `BEARER_TOKEN_*` variables are in the environment file
- Verify token names match the route path naming convention
- For public routes, set `bearerIsPublic: true` in route definition

### "No schemas loaded" in HTML
- Verify `schemas()` function in route definition returns `{ arrayOfSchemas }`
- Check that route is included in `activeRoutes` array
- Ensure schema imports are correct and files exist

### Environment File Not Found
- Verify environment files are in the correct parent directory
- Check that stage type matches available environment configurations
- Ensure file names match exactly (case-sensitive)

This document should be the starting point for understanding the project architecture and development workflow.