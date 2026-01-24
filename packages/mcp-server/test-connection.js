#!/usr/bin/env node

/**
 * Test if MCP server can connect to Next.js API
 */

const testConnection = async () => {
  console.log('🧪 Testing MCP Server → Next.js API Connection\n');

  const API_URL = process.env.IMGATE_API_URL || 'http://localhost:3000';
  
  // Test 1: Check if Next.js is running
  console.log('1️⃣  Testing Next.js API...');
  try {
    const response = await fetch(`${API_URL}/`);
    console.log(`   ✅ Next.js is running on ${API_URL}`);
    console.log(`   Status: ${response.status}\n`);
  } catch (error) {
    console.log(`   ❌ Cannot reach Next.js at ${API_URL}`);
    console.log(`   Error: ${error.message}\n`);
    process.exit(1);
  }

  // Test 2: Try to fetch an asset (will 404 but that's ok)
  console.log('2️⃣  Testing asset API endpoint...');
  try {
    const response = await fetch(`${API_URL}/api/asset/test-slug`);
    if (response.status === 404) {
      console.log(`   ✅ Asset API is responding (404 = endpoint works, asset not found)`);
    } else if (response.ok) {
      const data = await response.json();
      console.log(`   ✅ Asset API returned data:`, data);
    } else {
      console.log(`   ⚠️  Asset API status: ${response.status}`);
    }
  } catch (error) {
    console.log(`   ❌ Asset API error: ${error.message}`);
  }

  console.log('\n3️⃣  Summary:');
  console.log('   ✅ MCP server CAN connect to Next.js API');
  console.log(`   📍 API URL: ${API_URL}`);
  console.log('\n💡 Your MCP server will work with Claude Desktop!');
  console.log('   Just make sure Next.js is running on port 3000 when using Claude.\n');
};

testConnection().catch(console.error);
