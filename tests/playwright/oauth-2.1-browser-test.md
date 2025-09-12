# OAuth 2.1 Browser Test with MCP Inspector

This manual test validates the complete OAuth 2.1 Authorization Code Flow with PKCE using the MCP Inspector in a real browser environment.

## Purpose

This test verifies the OAuth 2.1 implementation including:
- RFC 8414 OAuth Authorization Server Metadata discovery
- RFC 9728 OAuth Protected Resource Metadata discovery  
- RFC 7636 PKCE (Proof Key for Code Exchange)
- RFC 8707 Resource Indicators
- Auth0 custom domain support
- MCP Inspector OAuth integration

## Prerequisites

### Required Services
1. **Auth0 Configuration** - Valid Auth0 application with proper callback URLs
2. **Environment Variables** - `.auth.env` file with correct credentials
3. **MCP Inspector** - Available as MCP server (check with AI agent first)
4. **FlowMCP Server** - OAuth middleware configured

### Environment Setup
Ensure `.auth.env` contains:
```
FIRST_ROUTE_AUTH0_DOMAIN=auth.flowmcp.org
FIRST_ROUTE_AUTH0_CLIENT_ID=Uc7Hz7kWlJJkZjHQYweMMsY2OtVi0tR7
FIRST_ROUTE_AUTH0_CLIENT_SECRET=<secret>
```

## Pre-Test Setup Checklist

### 1. Stop Running Processes
Check for conflicting processes:
```bash
# Check for running Node.js processes
ps aux | grep -E "(node|npm)" | grep -v grep

# Kill any conflicting processes if needed
kill <PID>
```

### 2. Start Required Services
Start services in this order:
```bash
# Start MCP Inspector (runs on port 6274)
npm run inspector

# Start FlowMCP Server with OAuth middleware (runs on port 3000) 
npm run start:flowmcp
```

### 3. Verify Auth0 Configuration
Ensure these callback URLs are configured in Auth0:
- `http://localhost:3000/first-route/auth/callback`
- `http://localhost:6274/oauth/callback/debug` ⚠️ **Critical for Inspector**

## Manual Browser Test Steps

### Step 1: Open Inspector Interface
1. Navigate to `http://localhost:6274` in your browser
2. Verify URL field shows: `http://localhost:3000/first-route`
3. Confirm Transport Type is: `SSE`

### Step 2: Initiate OAuth Flow
1. Click **"Open Auth Settings"** button
2. Click **"Continue"** to begin OAuth discovery process

### Step 3: Monitor OAuth Discovery Steps
Watch for these sequential steps with green checkmarks ✅:

#### 3.1 Metadata Discovery
- ✅ Should succeed (requires CORS headers)
- Tests endpoint: `http://localhost:3000/.well-known/oauth-protected-resource/first-route`
- Validates Client ID: `Uc7Hz7kWlJJkZjHQYweMMsY2OtVi0tR7`

#### 3.2 Client Registration
- ✅ Should succeed automatically 
- Uses discovered metadata for OAuth configuration

#### 3.3 Preparing Authorization
- ✅ Should generate authorization URL with correct parameters
- Verify Client ID in URL matches server configuration
- Click **"Open authorization URL in new tab"**

### Step 4: Auth0 Authentication Process
1. **New tab opens** with Auth0 authorization URL
2. **Success case**: Auth0 login page appears correctly
3. **Error case**: Check error details by clicking "See details for this error"
   - Common error: `Unknown client: <CLIENT_ID>` (indicates client ID mismatch)
   - Solution: Verify client ID matches in both Auth0 and server config

4. **Complete authentication** at Auth0 (enter credentials)
5. **Automatic redirect** back to Inspector with authorization code

### Step 5: Complete Token Exchange
1. Inspector automatically extracts the authorization code
2. **Token Request** step should complete ✅
3. **Authentication Complete** step should show ✅
4. Access token becomes available for MCP connection

## Expected Success Flow Validation

Verify all steps show green checkmarks in sequence:
- [ ] ✅ Metadata Discovery
- [ ] ✅ Client Registration  
- [ ] ✅ Preparing Authorization
- [ ] ✅ Request Authorization (Auth0 redirect)
- [ ] ✅ Token Request (code exchange)
- [ ] ✅ Authentication Complete

## Common Issues & Browser Troubleshooting

### Issue 1: CORS Errors
**Browser Error**: `Access to fetch blocked by CORS policy`
**Root Cause**: Missing CORS configuration in FlowMCP server
**Solution**: Ensure CORS middleware is properly configured:
```javascript
app.use( cors( {
    origin: '*',
    methods: [ 'GET', 'POST', 'PUT', 'DELETE', 'OPTIONS' ],
    allowedHeaders: [ 'Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization', 'mcp-protocol-version' ]
} ) )
```

### Issue 2: Client ID Mismatch  
**Auth0 Error**: `Unknown client: <CLIENT_ID>`
**Root Cause**: Client ID inconsistency between server and Auth0
**Verification Steps**:
- Server config: `Uc7Hz7kWlJJkZjHQYweMMsY2OtVi0tR7`
- Auth0 application: Must match exactly
- Inspector discovery: Should auto-detect from server

### Issue 3: Callback URL Configuration
**Auth0 Error**: Redirect fails after authentication
**Root Cause**: Missing callback URL in Auth0 configuration
**Solution**: Add Inspector callback URL to Auth0:
- `http://localhost:6274/oauth/callback/debug`

### Issue 4: Metadata Discovery Fails
**Inspector Error**: `Failed to discover OAuth metadata`
**Root Cause**: Server not running or endpoints inaccessible
**Verification**: Test endpoint manually:
```bash
curl http://localhost:3000/.well-known/oauth-protected-resource/first-route
```

### Issue 5: Browser Console Errors
**Debugging**: Open browser Developer Tools (F12) to check:
- Network tab for HTTP request failures
- Console tab for JavaScript errors
- Application tab for storage issues

## Success Criteria

The test is considered successful when:
- [ ] All 6 OAuth steps show green checkmarks
- [ ] Authorization URL contains correct client ID
- [ ] Auth0 login page loads without errors
- [ ] Successful redirect back to Inspector occurs
- [ ] Access token is successfully obtained
- [ ] MCP server connection works with OAuth

## Browser Compatibility Notes

This test should work in:
- Chrome/Chromium (recommended)
- Firefox
- Safari
- Edge

Note: Some older browsers may have issues with modern OAuth/PKCE implementations.

## Post-Test Cleanup

After completing the test:
1. Close browser tabs
2. Stop running services:
   ```bash
   # Stop MCP Inspector and FlowMCP server
   Ctrl+C
   ```
3. Clean up any temporary files if needed

## Test Documentation

This test validates critical OAuth 2.1 functionality and should be run:
- Before releases
- After OAuth-related code changes
- When Auth0 configuration changes
- During integration testing cycles

Record test results and any issues encountered for future reference.