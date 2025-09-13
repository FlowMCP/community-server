# OAuth 2.1 Browser Test - Community Server Endpoint

This manual test validates the complete OAuth 2.1 Authorization Code Flow with PKCE for the production community server endpoint `https://community.flowmcp.org/etherscan-ping/sse`.

## Purpose

This test verifies the Version 2.0.4 HTTPS fix implementation including:
- HTTPS URL generation in discovery endpoints
- OAuth 2.1 PKCE compliance on production server
- Auth0 integration with community.flowmcp.org domain
- MCP Inspector OAuth integration with HTTPS endpoints

## Prerequisites

### Required Services
1. **Community Server** - Running Version 2.0.4 with HTTPS fixes
2. **Auth0 Configuration** - Production Auth0 application configured
3. **MCP Inspector** - Available locally or as MCP server

### Production Server Configuration
The community server at `https://community.flowmcp.org` should be running with:
- **Client ID**: `Uc7Hz7kWlJJkZjHQYweMMsY2OtVi0tR7`
- **Auth0 Domain**: `https://auth.flowmcp.org`
- **Force HTTPS**: `true` (production stage)

## Pre-Test Verification

### 1. Verify Server Version
Check that the server is running Version 2.0.4:
```bash
# Check server logs for version
# Should show: community-server@2.0.4
```

### 2. Test Discovery Endpoints
Verify HTTPS URLs are returned:
```bash
# Test discovery endpoint
curl -s https://community.flowmcp.org/etherscan-ping/sse/discovery | jq '.endpoints'

# Expected HTTPS URLs:
# {
#   "login": "https://community.flowmcp.org/etherscan-ping/sse/auth/login",
#   "callback": "https://community.flowmcp.org/etherscan-ping/sse/auth/callback",
#   "protected_resource_metadata": "https://community.flowmcp.org/.well-known/oauth-protected-resource/etherscan-ping/sse"
# }
```

### 3. Test Protected Resource Metadata
```bash
# Test protected resource metadata
curl -s https://community.flowmcp.org/.well-known/oauth-protected-resource/etherscan-ping/sse | jq '.resource'

# Expected HTTPS URL:
# "resource": "https://community.flowmcp.org/etherscan-ping/sse"
```

## Manual Browser Test with MCP Inspector

### Step 1: Start MCP Inspector
```bash
# If available as MCP server, add it:
claude mcp add inspector npm:@modelcontextprotocol/inspector

# Or start locally:
npm run inspector
```

### Step 2: Configure Inspector
1. Navigate to Inspector interface (usually `http://localhost:6274`)
2. Set Server URL to: `https://community.flowmcp.org/etherscan-ping/sse`
3. Set Transport Type to: `SSE`

### Step 3: Test OAuth Discovery
1. Click **"Open Auth Settings"** button
2. Click **"Continue"** to begin OAuth discovery
3. Monitor OAuth discovery steps:

#### Expected Discovery Process:
- ✅ **Metadata Discovery** 
  - Tests: `https://community.flowmcp.org/.well-known/oauth-protected-resource/etherscan-ping/sse`
  - Should find Client ID: `Uc7Hz7kWlJJkZjHQYweMMsY2OtVi0tR7`
  - **Critical**: URLs must be HTTPS (this validates our fix)

- ✅ **Client Registration**
  - Auto-registers with discovered metadata
  - Should use HTTPS callback URLs

- ✅ **Preparing Authorization**
  - Generates authorization URL with PKCE
  - Should redirect to: `https://auth.flowmcp.org/authorize?...`

### Step 4: Complete Auth0 Flow
1. **Authorization redirect** opens new tab to Auth0
2. **Login at Auth0** with valid credentials
3. **Automatic redirect** back to Inspector
4. **Token exchange** completes automatically
5. **Connection established** to community server

## Version 2.0.4 Fix Validation

### Critical Test Points:
1. **Discovery Endpoint URLs**: Must return HTTPS URLs (not HTTP)
2. **Protected Resource Metadata**: Must contain HTTPS resource URL
3. **OAuth Flow Completion**: Must work end-to-end with HTTPS

### Before Fix (Versions 2.0.1-2.0.3):
```json
{
  "endpoints": {
    "login": "http://community.flowmcp.org/etherscan-ping/sse/auth/login",
    "callback": "http://community.flowmcp.org/etherscan-ping/sse/auth/callback"
  }
}
```

### After Fix (Version 2.0.4):
```json
{
  "endpoints": {
    "login": "https://community.flowmcp.org/etherscan-ping/sse/auth/login",
    "callback": "https://community.flowmcp.org/etherscan-ping/sse/auth/callback"
  }
}
```

## Auth0 Configuration Requirements

For the community server, Auth0 must be configured with:

### Allowed Callback URLs:
```
https://community.flowmcp.org/etherscan-ping/sse/auth/callback
http://localhost:6274/oauth/callback/debug
```

### Allowed Web Origins:
```
https://community.flowmcp.org/etherscan-ping/sse
http://localhost:6274
```

## Troubleshooting

### Issue 1: Still Getting HTTP URLs
**Symptoms**: Discovery endpoints return `http://` URLs
**Cause**: Server not running Version 2.0.4 or not using production stage
**Solution**: 
- Verify server logs show Version 2.0.4
- Ensure server started with `npm run start:server` (production stage)
- Check `Force HTTPS: true` in server logs

### Issue 2: CORS Errors
**Symptoms**: Browser console shows CORS policy blocks
**Cause**: CORS not configured for cross-origin requests
**Solution**: Verify CORS middleware allows Inspector origin

### Issue 3: OAuth Client ID Mismatch
**Symptoms**: Auth0 shows "Unknown client" error
**Cause**: Client ID mismatch between server and Auth0
**Solution**: Verify Client ID `Uc7Hz7kWlJJkZjHQYweMMsY2OtVi0tR7` in both

### Issue 4: SSL/TLS Errors
**Symptoms**: Browser shows security warnings for HTTPS
**Cause**: SSL certificate issues
**Solution**: Check if certificate is valid for `community.flowmcp.org`

## Success Criteria

The test passes when:
- [ ] ✅ Discovery endpoint returns HTTPS URLs
- [ ] ✅ Protected resource metadata contains HTTPS resource URL
- [ ] ✅ OAuth flow completes successfully end-to-end
- [ ] ✅ MCP Inspector connects to community server via OAuth
- [ ] ✅ No HTTP/HTTPS mixed content warnings
- [ ] ✅ Auth0 authentication works with HTTPS callbacks

## Test Results Documentation

Record the following for each test run:
- Server version tested
- Discovery endpoint response (URLs should be HTTPS)
- OAuth flow completion status
- Any errors encountered
- Browser compatibility notes

## Related Issues

This test validates the fix for:
- **GitHub Issue #19**: "Change forceHttps dynamically"
- **Bug Report**: HTTPS/HTTP mismatch in OAuth discovery endpoints
- **Claude Code Error**: "Protected resource http://... does not match expected https://..."

The fix ensures all OAuth URLs respect the `forceHttps` setting for production deployments.