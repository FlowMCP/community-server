# OAuth 2.1 Auth0 Configuration Error Analysis

## **Error Summary**

**Issue**: MCP Server connection fails with HTTP/HTTPS mismatch error in Claude Code  
**Root Cause**: mcpAuthMiddleware uses Keycloak URL structure instead of Auth0 URL structure  
**Impact**: Complete OAuth 2.1 flow failure preventing MCP server authentication  

## **Error Manifestation**

### Claude Code Error Message:
```
Protected resource http://community.flowmcp.org/etherscan-ping/sse does not match expected https://community.flowmcp.org/etherscan-ping/sse (or origin)
```

### Actual Network Trace Issue:
```bash
# OAuth Login Redirect (INCORRECT):
Location: https://auth.flowmcp.org/realms/etherscan-ping-sse-realm/protocol/openid-connect/auth?...
# Result: HTTP/2 404 Not Found

# Correct Auth0 URL should be:
Location: https://auth.flowmcp.org/authorize?...
```

## **Detailed Network Analysis**

### ✅ Working Endpoints (HTTPS):
1. **Main SSE Endpoint**: `https://community.flowmcp.org/etherscan-ping/sse`
   - Returns: 401 Unauthorized (expected)
   - All returned URLs are HTTPS ✅

2. **Discovery Endpoint**: `https://community.flowmcp.org/etherscan-ping/sse/discovery`
   - Returns: 200 OK
   - All endpoint URLs are HTTPS ✅

3. **Protected Resource Metadata**: `https://community.flowmcp.org/.well-known/oauth-protected-resource/etherscan-ping/sse`
   - Returns: 200 OK
   - Resource URL is HTTPS ✅

### ❌ Failing Endpoint (Auth0 Integration):
4. **OAuth Login Endpoint**: `https://community.flowmcp.org/etherscan-ping/sse/auth/login`
   - Returns: 302 Found
   - **PROBLEM**: Redirects to Keycloak-style URL instead of Auth0-style URL
   - Redirect Target: `https://auth.flowmcp.org/realms/etherscan-ping-sse-realm/protocol/openid-connect/auth?...`
   - Result: **404 Not Found**

## **URL Structure Comparison**

### Current (Incorrect - Keycloak Format):
```
https://auth.flowmcp.org/realms/etherscan-ping-sse-realm/protocol/openid-connect/auth
```

### Required (Correct - Auth0 Format):
```
https://auth.flowmcp.org/authorize
```

### Verification:
```bash
# Keycloak-style URL fails:
curl https://auth.flowmcp.org/realms/etherscan-ping-sse-realm/protocol/openid-connect/auth
# → HTTP/2 404

# Auth0-style URL exists (requires parameters):
curl https://auth.flowmcp.org/authorize
# → HTTP/1.1 400 Bad Request (missing required parameter: response_type)
```

## **Configuration Analysis**

### Server Configuration (Appears Correct):
```javascript
// From server logs:
📍 Route 3: /etherscan-ping/sse
   ├─ Auth Type:    oauth21_auth0  ✅
   ├─ Provider:     https://auth.flowmcp.org  ✅
   ├─ Client ID:    Uc7Hz7kWlJJkZjHQYweMMsY2OtVi0tR7  ✅
   ├─ Auth Flow:    authorization-code  ✅
   ├─ Security:     🟢 PKCE required  ✅
```

### Problem Location:
The `mcpAuthMiddleware` package's Auth0 integration module incorrectly generates Keycloak-style URLs instead of Auth0-style URLs.

## **Impact Chain**

1. **OAuth Login Request** → Keycloak-style redirect URL generated
2. **Auth0 Server** → Returns 404 for Keycloak-style path
3. **OAuth Flow** → Fails due to 404 redirect target
4. **Claude Code** → Shows confusing HTTP/HTTPS mismatch error
5. **MCP Connection** → Completely fails

## **Required Fix**

### Location:
`node_modules/mcpAuthMiddleware/src/task/McpAuthMiddleware.mjs`

### Issue:
The Auth0 OAuth flow handler generates URLs using Keycloak patterns:
```javascript
// Current (incorrect):
`${providerUrl}/realms/${realm}/protocol/openid-connect/auth`

// Should be (correct):
`${providerUrl}/authorize`
```

### Parameters Affected:
- `authorization_endpoint`
- `token_endpoint` 
- `userinfo_endpoint`
- All OAuth 2.1 discovery URLs

## **Testing Verification**

### Before Fix:
```bash
curl -v https://community.flowmcp.org/etherscan-ping/sse/auth/login
# → 302 to https://auth.flowmcp.org/realms/.../auth (404)
```

### After Fix (Expected):
```bash
curl -v https://community.flowmcp.org/etherscan-ping/sse/auth/login  
# → 302 to https://auth.flowmcp.org/authorize?... (200/valid auth page)
```

## **Auth0 Configuration Validation**

### Domain: `https://auth.flowmcp.org`
- ✅ SSL Certificate valid
- ✅ Auth0 service responding
- ✅ OpenID configuration available (though not found at standard path)

### Required Auth0 Application Settings:
```
Application Type: Single Page Application / Machine to Machine
Client ID: Uc7Hz7kWlJJkZjHQYweMMsY2OtVi0tR7
Allowed Callback URLs: https://community.flowmcp.org/etherscan-ping/sse/auth/callback
Allowed Web Origins: https://community.flowmcp.org/etherscan-ping/sse
Grant Types: Authorization Code, Refresh Token
```

## **Resolution Priority**

1. **CRITICAL**: Fix Auth0 URL generation in mcpAuthMiddleware
2. **HIGH**: Verify Auth0 application configuration
3. **MEDIUM**: Update error handling for clearer error messages
4. **LOW**: Add integration tests for Auth0 vs Keycloak detection

## **Files Involved**

- `node_modules/mcpAuthMiddleware/src/task/McpAuthMiddleware.mjs` (URL generation)
- Server configuration (appears correct)
- Auth0 application settings (requires verification)

## **Test Commands**

```bash
# Test discovery endpoints:
curl -s https://community.flowmcp.org/etherscan-ping/sse/discovery | jq '.endpoints'

# Test protected resource metadata:
curl -s https://community.flowmcp.org/.well-known/oauth-protected-resource/etherscan-ping/sse | jq '.resource'

# Test OAuth login (will show incorrect redirect):
curl -v https://community.flowmcp.org/etherscan-ping/sse/auth/login 2>&1 | grep Location

# Verify Auth0 authorize endpoint:
curl -I https://auth.flowmcp.org/authorize
```

---

**Date**: 2025-09-13  
**Status**: Root cause identified, fix required in mcpAuthMiddleware Auth0 integration  
**Severity**: Critical - Complete OAuth flow failure