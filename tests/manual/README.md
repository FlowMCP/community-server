# Manual Tests for Community Server

This directory contains manual test scripts to validate the different authentication methods supported by the Community Server.

## Test Structure

- **LocalTesting.mjs** - Main test orchestrator class
- **ConfigManager.mjs** - Configuration management for different auth types
- **OAuth21ScalekitPuppeteerTester.mjs** - OAuth 2.1 ScaleKit flow testing with Puppeteer
- **StaticBearerTester.mjs** - Static bearer token authentication testing
- **test-community-routes.mjs** - Main test runner script
- **test-community-server.mjs** - Test server with configured routes

## Available Authentication Types

1. **free** - No authentication required
2. **staticBearer** - Bearer token authentication
3. **oauth21_scalekit** - OAuth 2.1 with ScaleKit provider

## Usage

### Running Tests

```bash
# Test free route (no authentication)
node tests/manual/test-community-routes.mjs authType=free serverPath=../../main.mjs

# Test bearer token authentication
node tests/manual/test-community-routes.mjs authType=staticBearer serverPath=../../main.mjs

# Test OAuth 2.1 ScaleKit authentication (requires Puppeteer)
node tests/manual/test-community-routes.mjs authType=oauth21_scalekit serverPath=../../main.mjs
```

### Using Test Server

```bash
# Start test server with all routes
node tests/manual/test-community-server.mjs

# Start test server with specific route type
node tests/manual/test-community-server.mjs free
node tests/manual/test-community-server.mjs bearer
node tests/manual/test-community-server.mjs oauth
```

## Environment Configuration

The tests use the `.community.env` file from the parent directory. Required variables:

```env
SERVER_URL=http://localhost
SERVER_PORT=3000
BEARER_TOKEN_MASTER=your-bearer-token
SCALEKIT_ENVIRONMENT_URL=https://auth.scalekit.com
SCALEKIT_MCP_ID=res_your_mcp_id
SCALEKIT_CLIENT_ID=your-client-id
SCALEKIT_CLIENT_SECRET=your-client-secret
```

## Test Flow

### Free Route Test
1. Direct access without authentication
2. Send MCP list_tools request
3. Call available tools

### Static Bearer Test
1. Test unauthorized access (expect 401/403)
2. Fetch bearer token
3. Test authorized access with token
4. Send MCP list_tools request
5. Call first available tool

### OAuth 2.1 ScaleKit Test
1. Test unauthorized access (expect 401/403)
2. Perform OAuth discovery
3. Register OAuth client
4. Prepare authorization
5. Open browser for authorization (Puppeteer)
6. Exchange authorization code for tokens
7. Validate tokens
8. Send MCP list_tools request
9. Call first available tool

## Prerequisites

### For OAuth 2.1 Testing
```bash
npm install puppeteer
```

### ScaleKit Account
- Create an account at https://app.scalekit.com
- Configure OAuth application
- Add redirect URI: `http://localhost:3000/oauth/callback`

## Test Results

Each test provides detailed results including:
- Success/failure status for each step
- Request/response details
- Bearer token information (for bearer auth)
- OAuth flow details (for OAuth auth)
- Available MCP tools
- Tool call results

## Troubleshooting

### Server Not Starting
- Check if port 3000 is already in use
- Verify environment variables are set correctly
- Check server logs for error messages

### OAuth Flow Failing
- Ensure Puppeteer is installed
- Verify ScaleKit credentials
- Check redirect URI configuration
- Browser may need manual interaction for login

### Bearer Token Issues
- Verify BEARER_TOKEN_MASTER is set in .env
- Check token format (no "Bearer " prefix needed)
- Ensure route configuration includes bearer auth

## Example Output

```
🚀 Starting Community Server Test
📋 Testing auth type: staticBearer

1️⃣  Testing unauthorized access...
2️⃣  Fetching bearer token from discovery...
3️⃣  Testing authorized access with bearer token...
4️⃣  Fetching MCP tools list...
5️⃣  Calling first available tool...

✅ Bearer Token Test completed successfully!

📊 Result Summary:
   Base URL: http://localhost:3000
   Route: /bearer-streamable/streamable
   Auth Type: staticBearer

🔑 Bearer Token Details:
   Status: ready
   Token Type: Bearer
   Token Length: 20 characters
   Token Preview: test-bea...3456

📋 Flow Results:
   ✅ Unauthorized Access: SUCCESS
   ✅ Token Discovery: SUCCESS
   ✅ Authorized Access: SUCCESS
   ✅ MCP Tools List: SUCCESS
   ✅ Tool Call: SUCCESS

🎯 Ready to use in API calls!
```