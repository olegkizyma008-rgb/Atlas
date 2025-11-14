/**
 * Test Model Rotation System
 * Тестує: GET /v1/models → check availability → check rate limit → replace
 */

import axios from 'axios';

const API_ENDPOINT = 'http://localhost:4000';

async function testModelRotation() {
  console.log('\n' + '='.repeat(70));
  console.log('🚀 TESTING MODEL ROTATION SYSTEM');
  console.log('='.repeat(70) + '\n');

  // STEP 1: GET /v1/models
  console.log('📋 STEP 1: Fetching available models from API...');
  
  let models = [];
  try {
    const response = await axios.get(`${API_ENDPOINT}/v1/models`, { timeout: 5000 });
    models = response.data?.data || [];
    console.log(`✅ Received ${models.length} models from API\n`);
    
    // Show rate limit info for first 5 models
    console.log('📊 Rate Limit Info (first 5 models):');
    models.slice(0, 5).forEach(model => {
      const rl = model.rate_limit || {};
      console.log(`  • ${model.id}`);
      console.log(`    - per_minute: ${rl.per_minute || 'N/A'}`);
      console.log(`    - adaptive_hard_cap: ${rl.adaptive_hard_cap || false}`);
      if (rl.adaptive_last429_at) {
        const timeSince = Math.round((Date.now() - rl.adaptive_last429_at) / 1000);
        console.log(`    - last 429: ${timeSince}s ago`);
      }
    });
    
  } catch (error) {
    console.log(`❌ Failed to fetch models: ${error.message}`);
    return;
  }

  // STEP 2: Check rate limits
  console.log('\n⏱️ STEP 2: Checking rate limits...');
  
  const okModels = [];
  const rateLimitedModels = [];
  
  for (const model of models) {
    const rl = model.rate_limit || {};
    
    if (rl.adaptive_hard_cap) {
      rateLimitedModels.push({ id: model.id, reason: 'adaptive_hard_cap' });
      continue;
    }
    
    if (rl.adaptive_last429_at) {
      const timeSince = Date.now() - rl.adaptive_last429_at;
      const windowSeconds = rl.window_seconds || 60;
      
      if (timeSince < (windowSeconds * 1000)) {
        rateLimitedModels.push({ id: model.id, reason: `429 ${Math.round(timeSince/1000)}s ago` });
        continue;
      }
    }
    
    okModels.push(model);
  }
  
  console.log(`✅ ${okModels.length} models OK`);
  console.log(`⚠️  ${rateLimitedModels.length} models rate-limited`);
  
  if (rateLimitedModels.length > 0) {
    console.log('\n  Rate-limited models:');
    rateLimitedModels.slice(0, 3).forEach(m => {
      console.log(`    • ${m.id} (${m.reason})`);
    });
  }

  // STEP 3: Test availability
  console.log('\n🔍 STEP 3: Testing availability (first 3 OK models)...');
  
  for (const model of okModels.slice(0, 3)) {
    try {
      const start = Date.now();
      const response = await axios.post(
        `${API_ENDPOINT}/v1/chat/completions`,
        {
          model: model.id,
          messages: [{ role: 'user', content: 'test' }],
          max_tokens: 5
        },
        { timeout: 5000 }
      );
      
      const duration = Date.now() - start;
      if (response.status === 200) {
        console.log(`✅ ${model.id} - Available (${duration}ms)`);
      }
      
    } catch (error) {
      if (error.response?.status === 429) {
        console.log(`⚠️  ${model.id} - Rate limited (429)`);
      } else {
        console.log(`❌ ${model.id} - ${error.message}`);
      }
    }
  }

  // STEP 4: Model replacement simulation
  console.log('\n🔄 STEP 4: Simulating model replacement...');
  
  const preferredModel = 'atlas-gpt-4o';
  console.log(`🎯 Preferred: ${preferredModel}`);
  
  const preferredOk = okModels.find(m => m.id === preferredModel);
  
  if (preferredOk) {
    console.log('✅ Preferred model is available');
  } else {
    console.log('⚠️  Preferred model rate-limited, finding alternative...');
    
    const alternative = okModels.find(m => 
      m.id.includes('gpt') || m.id.includes('mistral') || m.id.includes('atlas')
    );
    
    if (alternative) {
      console.log(`🔄 Replacement: ${alternative.id}`);
    } else {
      console.log('❌ No alternative found!');
    }
  }

  console.log('\n' + '='.repeat(70));
  console.log('✅ MODEL ROTATION TEST COMPLETED');
  console.log('='.repeat(70) + '\n');
}

testModelRotation()
  .then(() => process.exit(0))
  .catch(error => {
    console.log(`❌ Test failed: ${error.message}`);
    process.exit(1);
  });
