#!/usr/bin/env node
/**
 * Test script for PPIC Advanced Filter
 * Tests both array and object filter formats
 */

const BASE_URL = 'http://localhost:5000/api/ppic';

// Mock token (replace with actual token from your auth)
const TOKEN = 'your-jwt-token-here';

async function testArrayFormat() {
  console.log('\n🧪 Testing ARRAY Filter Format...\n');
  
  const payload = {
    filters: [
      { field: 'poNo', operator: 'startsWith', value: 'sad' }
    ],
    page: 1,
    limit: 50
  };

  try {
    const response = await fetch(`${BASE_URL}/filter/advanced`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TOKEN}`
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Array Format Test PASSED');
      console.log(`   Found ${data.data?.totalCount || 0} records`);
      console.log(`   Sample record:`, data.data?.data?.[0] ? JSON.stringify(data.data.data[0], null, 2).substring(0, 200) : 'No records');
    } else {
      console.log('❌ Array Format Test FAILED');
      console.log('   Error:', data.message || data.error);
    }
  } catch (error) {
    console.log('❌ Array Format Test ERROR:', error.message);
  }
}

async function testObjectFormat() {
  console.log('\n🧪 Testing OBJECT Filter Format...\n');
  
  const payload = {
    filters: {
      poNo: { operator: 'startsWith', value: 'sad' }
    },
    page: 1,
    limit: 50
  };

  try {
    const response = await fetch(`${BASE_URL}/filter/advanced`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TOKEN}`
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Object Format Test PASSED');
      console.log(`   Found ${data.data?.totalCount || 0} records`);
    } else {
      console.log('❌ Object Format Test FAILED');
      console.log('   Error:', data.message || data.error);
    }
  } catch (error) {
    console.log('❌ Object Format Test ERROR:', error.message);
  }
}

async function testBrandNameFilter() {
  console.log('\n🧪 Testing brandName Filter (camelCase fix)...\n');
  
  const payload = {
    filters: [
      { field: 'brandName', operator: 'contains', value: 'Paracetamol' }
    ],
    page: 1,
    limit: 50
  };

  try {
    const response = await fetch(`${BASE_URL}/filter/advanced`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TOKEN}`
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ brandName Filter Test PASSED');
      console.log(`   Found ${data.data?.totalCount || 0} records`);
    } else {
      console.log('❌ brandName Filter Test FAILED');
      console.log('   Error:', data.message || data.error);
    }
  } catch (error) {
    console.log('❌ brandName Filter Test ERROR:', error.message);
  }
}

async function testValidationEndpoint() {
  console.log('\n🧪 Testing Validation Endpoint...\n');
  
  const payload = {
    filters: [
      { field: 'brandName', operator: 'contains', value: 'test' }
    ]
  };

  try {
    const response = await fetch(`${BASE_URL}/filter/validate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TOKEN}`
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Validation Endpoint Test PASSED');
      console.log(`   Is Valid: ${data.data?.isValid}`);
      console.log(`   Errors: ${data.data?.errors?.length || 0}`);
    } else {
      console.log('❌ Validation Endpoint Test FAILED');
      console.log('   Error:', data.message || data.error);
    }
  } catch (error) {
    console.log('❌ Validation Endpoint Test ERROR:', error.message);
  }
}

async function runAllTests() {
  console.log('\n====================================');
  console.log('   PPIC Filter Testing Suite');
  console.log('====================================');
  
  await testArrayFormat();
  await testObjectFormat();
  await testBrandNameFilter();
  await testValidationEndpoint();
  
  console.log('\n====================================');
  console.log('   Testing Complete');
  console.log('====================================\n');
}

runAllTests().catch(console.error);
