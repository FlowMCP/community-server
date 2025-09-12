# Bug Report: HTTPS/HTTP Mismatch in OAuth Discovery Endpoints

## Problem Description
When connecting to the community MCP server at `https://community.flowmcp.org/etherscan-ping/sse`, Claude Code fails with the error:
```
Protected resource http://community.flowmcp.org/etherscan-ping/sse does not match expected https://community.flowmcp.org/etherscan-ping/sse (or origin)
```

## Root Cause Analysis

### 1. Configuration Issues Found

#### a) BaseURL Configuration
- **Location**: `/serverConfig.mjs` line 9
- **Issue**: The production baseUrl was set to `http://community.flowmcp.org` instead of `https://community.flowmcp.org`
- **Status**: ✅ Fixed locally (changed to HTTPS)

#### b) ForceHttps Logic
- **Location**: `/src/index.mjs` line 70
- **Original**: `forceHttps: stageType === 'production'`
- **Issue**: Only sets forceHttps=true when stage is exactly 'production'
- **Status**: ✅ Improved locally to also check if baseUrl starts with 'https://'
- **New Logic**: `forceHttps: stageType === 'production' || baseUrls[stageType].startsWith('https://')`

### 2. Critical Bug in mcpAuthMiddleware Module

#### The Main Problem
**Location**: `node_modules/mcpAuthMiddleware/src/task/McpAuthMiddleware.mjs` line 525

```javascript
#handleRouteDiscovery( { req, res, routePath } ) {
    const config = this.#routeConfigs.get( routePath )
    const baseUrl = `${req.protocol}://${req.get( 'host' )}`  // <-- PROBLEM HERE
    
    res.json( {
        route: routePath,
        realm: config.realm,
        authFlow: config.authFlow,
        endpoints: {
            login: `${baseUrl}${routePath}/auth/login`,
            callback: `${baseUrl}${routePath}/auth/callback`,
            protected_resource_metadata: `${baseUrl}/.well-known/oauth-protected-resource${routePath}`
        },
        // ...
    } )
}
```

**The Issue**: 
- The discovery endpoint uses `req.protocol` to determine the URL scheme
- In a reverse proxy setup (nginx/cloudflare → express), `req.protocol` returns 'http' even when the client connects via HTTPS
- This causes all OAuth URLs to be generated with `http://` instead of `https://`

#### Why ForceHttps Doesn't Help
- The `forceHttps` flag IS passed to mcpAuthMiddleware (verified in line 207)
- The `forceHttps` flag IS used for security checks (line 580)
- BUT: The `forceHttps` flag is NOT used in the `#handleRouteDiscovery` method for URL generation

### 3. Server Environment Analysis

#### Current Setup
- Server runs with `npm run start:server` which sets `--stage=production`
- This should set `forceHttps: true` automatically
- Server logs confirm: `Force HTTPS: true`
- BUT: Discovery endpoint still returns HTTP URLs

#### Verification
```bash
curl https://community.flowmcp.org/etherscan-ping/sse/discovery
```
Returns:
```json
{
    "endpoints": {
        "login": "http://community.flowmcp.org/etherscan-ping/sse/auth/login",
        "callback": "http://community.flowmcp.org/etherscan-ping/sse/auth/callback",
        "protected_resource_metadata": "http://community.flowmcp.org/.well-known/oauth-protected-resource/etherscan-ping/sse"
    }
}
```

## Required Fixes

### Fix 1: mcpAuthMiddleware Module (CRITICAL)
The `#handleRouteDiscovery` method needs to respect the `forceHttps` flag:

```javascript
#handleRouteDiscovery( { req, res, routePath } ) {
    const config = this.#routeConfigs.get( routePath )
    
    // FIX: Use forceHttps to determine protocol
    const protocol = config.forceHttps ? 'https' : req.protocol
    const baseUrl = `${protocol}://${req.get( 'host' )}`
    
    // Or alternative: Use the configured baseUrl from constructor
    // const baseUrl = this.#baseUrl
    
    res.json( {
        // ... rest of the response
    } )
}
```

### Fix 2: Express Trust Proxy (Alternative)
If the mcpAuthMiddleware module cannot be modified, configure Express to trust the proxy:

```javascript
app.set('trust proxy', true)
```

This makes `req.protocol` return the correct protocol from `X-Forwarded-Proto` headers.

## Impact
- **Severity**: High
- **Affected Components**: All OAuth-protected routes
- **User Impact**: Cannot authenticate with MCP servers using OAuth flow
- **Security Impact**: Forces insecure HTTP URLs even when HTTPS is required

## Workaround
None available without modifying the mcpAuthMiddleware module or server configuration.

## Recommendations
1. **Immediate**: Fix the mcpAuthMiddleware module to respect forceHttps in discovery endpoints
2. **Alternative**: Add `app.set('trust proxy', true)` to the Express server configuration
3. **Long-term**: The mcpAuthMiddleware should use the configured baseUrl instead of reconstructing URLs from request headers

## Test Case
After fix, this should work:
```bash
# Discovery endpoint should return HTTPS URLs
curl https://community.flowmcp.org/etherscan-ping/sse/discovery | grep https

# Claude Code should connect successfully
claude mcp add community-etherscan https://community.flowmcp.org/etherscan-ping/sse
```

## Related Issues
- GitHub Issue #19: "Change forceHttps dynamically"
- Multiple commits attempting to fix this issue (see git log)

## Files Modified Locally
1. `/serverConfig.mjs` - Changed production baseUrl to HTTPS
2. `/src/index.mjs` - Improved forceHttps logic

## Files That Need External Modification
1. `node_modules/mcpAuthMiddleware/src/task/McpAuthMiddleware.mjs` - Method `#handleRouteDiscovery`