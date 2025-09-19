// Manual Remote Test for Community Server
// This test validates remote connectivity and authentication for MCP routes
// Run with: node tests/manual/B-remote-test.mjs

import { testBaseUrl, testEnvObject } from '../helpers/config.mjs'


console.log( '🧪 Manual Remote Test - Community Server' )
console.log( '========================================' )
console.log()

console.log( '📋 Test Configuration:' )
console.log( `   Base URL: ${testBaseUrl}` )
console.log( `   Master Token: ${testEnvObject.BEARER_TOKEN_MASTER}` )
console.log()

console.log( '🔍 Available Test Routes:' )
console.log( '   1. GET / - Landing page (no auth required)' )
console.log( '   2. GET /eerc20 - EERC20 route landing page (no auth required)' )
console.log( '   3. GET /eerc20/sse - SSE endpoint (auth required)' )
console.log( '   4. GET /inseight - Inseight route landing page (no auth required)' )
console.log( '   5. GET /inseight/sse - SSE endpoint (auth required)' )
console.log( '   6. GET /lukso - LUKSO route landing page (no auth required)' )
console.log( '   7. GET /lukso/sse - SSE endpoint (no auth required)' )
console.log()

console.log( '🛠️  Manual Testing Instructions:' )
console.log()

console.log( '1. Start the Community Server:' )
console.log( '   npm start' )
console.log()

console.log( '2. Test Landing Pages (Browser):' )
console.log( `   • Open: ${testBaseUrl}` )
console.log( `   • Open: ${testBaseUrl}/eerc20` )
console.log( `   • Open: ${testBaseUrl}/inseight` )
console.log( `   • Open: ${testBaseUrl}/lukso` )
console.log()

console.log( '3. Test SSE Endpoints with curl:' )
console.log()

console.log( '   ✅ Public Route (no auth):' )
console.log( `   curl -H "Accept: text/event-stream" "${testBaseUrl}/lukso/sse"` )
console.log()

console.log( '   🔐 Protected Routes (with auth):' )
console.log( `   curl -H "Accept: text/event-stream" -H "Authorization: Bearer ${testEnvObject.BEARER_TOKEN_MASTER}" "${testBaseUrl}/eerc20/sse"` )
console.log( `   curl -H "Accept: text/event-stream" -H "Authorization: Bearer ${testEnvObject.BEARER_TOKEN_MASTER}" "${testBaseUrl}/inseight/sse"` )
console.log()

console.log( '   ❌ Protected Routes (without auth - should fail):' )
console.log( `   curl -H "Accept: text/event-stream" "${testBaseUrl}/eerc20/sse"` )
console.log( `   curl -H "Accept: text/event-stream" "${testBaseUrl}/inseight/sse"` )
console.log()

console.log( '4. Expected Results:' )
console.log( '   • Landing pages: HTML content with route information' )
console.log( '   • Public SSE: Connection established, MCP protocol messages' )
console.log( '   • Protected SSE (with token): Connection established, MCP protocol messages' )
console.log( '   • Protected SSE (without token): 401 Unauthorized or connection refused' )
console.log()

console.log( '5. Verify Authentication Middleware:' )
console.log( '   • Check server logs for authentication events' )
console.log( '   • Verify token validation is working' )
console.log( '   • Confirm route-specific authentication is applied correctly' )
console.log()

console.log( '💡 Tips:' )
console.log( '   • Use browser developer tools to inspect network requests' )
console.log( '   • Check server console for authentication logs' )
console.log( '   • Verify that protected routes reject invalid tokens' )
console.log( '   • Test with different user agents if needed' )
console.log()

console.log( '✅ Manual test guide completed. Follow the instructions above to verify remote connectivity.' )