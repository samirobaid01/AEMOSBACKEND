const axios = require('axios');

async function testRuleChainTrigger() {
  try {
    console.log('🧪 Testing rule chain trigger to check if continuous logging is resolved...');
    
    // Create a data stream that should trigger the rule chain
    const response = await axios.post('http://localhost:3000/api/datastreams/token', {
      value: 25.5,
      telemetryDataId: 1
    }, {
      headers: {
        'Authorization': 'Bearer 9d2a4801289d4d532fce4282478f018f1e9a91ab4a8c20027f3405e80651e959'
      }
    });
    
    console.log('✅ Data stream created successfully:', response.data);
    console.log('⏳ Waiting 10 seconds to observe logs...');
    
    // Wait 10 seconds to see if continuous logging occurs
    setTimeout(() => {
      console.log('✅ Test completed. Check the server logs for continuous logging.');
      process.exit(0);
    }, 10000);
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    process.exit(1);
  }
}

testRuleChainTrigger(); 