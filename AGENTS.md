# AGENTS.md - Project Overview for AI Assistants

## Purpose

This document provides AI assistants with essential information to understand and work with the modern FlowMCP Community Server. This is a production-ready MCP server with multi-authentication support.

## Project Structure & Key Files

### Core Configuration
- **[serverConfig.mjs](./serverConfig.mjs)** - Central configuration defining active routes and authentication
- **[main.mjs](./main.mjs)** - Entry point orchestrating server startup

### Documentation
- **[README.md](./README.md)** - Concise project overview and quick start guide

### Core Components  
- **[src/index.mjs](./src/index.mjs)** - ServerManager class with modern authentication APIs
- **[src/task/CommunityServer.mjs](./src/task/CommunityServer.mjs)** - MCP server implementation
- **[src/task/WebhookServer.mjs](./src/task/WebhookServer.mjs)** - GitHub webhook handler

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

# Bearer Tokens (Active Routes)
BEARER_TOKEN_EERC20=your-eerc20-token
BEARER_TOKEN_INSEIGHT=your-inseight-token

# OAuth2 Configuration (Auth0)
AUTH0_DOMAIN=your-domain.auth0.com
AUTH0_CLIENT_ID=your-client-id

# x402 Payment Configuration (Optional)
ACCOUNT_DEVELOPMENT2_PRIVATE_KEY=0x...
ACCOUNT_DEVELOPMENT2_PUBLIC_KEY=0x...
BASE_SEPOLIA_ALCHEMY_HTTP=https://base-sepolia.g.alchemy.com/v2/...
```

## Authentication System

### Modern Authentication Types
- **Static Bearer**: `authType: 'staticBearer'` - Token-based authentication
- **OAuth2 Auth0**: `authType: 'oauth21_auth0'` - OAuth2 with Auth0 provider

### Active Routes & Authentication
- `/eerc20` → Bearer token (`BEARER_TOKEN_EERC20`)
- `/inseight` → Bearer token (`BEARER_TOKEN_INSEIGHT`)  
- `/etherscan-ping` → OAuth2 Auth0

### Authentication Configuration
Routes use the modern `auth` structure:
```javascript
auth: {
    enabled: true,
    authType: 'staticBearer',
    token: 'BEARER_TOKEN_EERC20'
}
```

## Server Architecture

### Data Flow
1. **Command Line Parsing** → Stage type determination
2. **Environment Loading** → Based on stage type
3. **Route Filtering** → Only active routes are loaded
4. **Schema Generation** → Async loading via `schemas()` functions
5. **Token Validation** → Bearer tokens checked before startup
6. **Server Start** → Community server + webhook server

### Active Routes Configuration
The `activeRoutes` array in `main.mjs` determines which routes are loaded:
```javascript
const activeRoutes = [ '/eerc20', '/inseight', '/etherscan-ping' ]
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
1. Add route definition to `serverConfig.mjs` with `auth` configuration
2. Implement `schemas()` function returning `{ arrayOfSchemas }`
3. Add route path to `activeRoutes` in `main.mjs`
4. Add authentication tokens to environment file

### Modern API Usage
- Use `getMcpAuthMiddlewareConfig()` for authentication setup
- Routes configured with `objectOfSchemaArrays` parameter
- Modern `auth.enabled` structure replaces legacy bearer token patterns

## Important Notes for AI Assistants

### What NOT to Modify
- **Environment files** - AI has no access to parent directory
- **Production secrets** - These are user-managed
- **Hard-coded paths** - Always use `serverConfig.mjs` for configuration

### What TO Modify
- **serverConfig.mjs** - For route and authentication configuration
- **main.mjs** - For startup logic and activeRoutes changes
- **src/** components - For core functionality updates

### Testing
- Test files are in `tests/` directory 
- 179 comprehensive tests across 14 test suites
- Test environment uses separate `.env` files
- 100% success rate maintained

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
│   ├── index.mjs              # ServerManager class
│   └── task/                  # Server implementations
│       ├── CommunityServer.mjs  # MCP server
│       └── WebhookServer.mjs    # GitHub webhooks
├── tests/                     # Test suite (14 suites, 179 tests)
└── .github/workflows/         # CI/CD automation
```

## Common Issues & Solutions

### "Missing Bearer Tokens" Error
- Check that required `BEARER_TOKEN_*` variables are in environment file
- Verify token names match route naming (e.g., `/eerc20` → `BEARER_TOKEN_EERC20`)
- For disabled auth routes, set `auth.enabled: false`

### "No schemas loaded" in HTML
- Verify `schemas()` function returns `{ arrayOfSchemas }`
- Check route is in `activeRoutes` array in `main.mjs`
- Ensure schema imports are correct and files exist

### Authentication Errors
- Bearer token routes require exact token match
- OAuth2 routes require proper Auth0 configuration
- Check server logs for detailed authentication error messages

This document provides the foundation for understanding the modern MCP server architecture.