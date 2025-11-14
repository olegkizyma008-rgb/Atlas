#!/usr/bin/env node

/**
 * Test OpenAI-compatible API request to localhost:4000
 * Usage: node test-api-4000-request.js
 */

import axios from 'axios';

const API_ENDPOINT = 'http://localhost:4000/v1';

async function testAPIRequest() {
  console.log('🔍 Testing OpenAI-compatible API on localhost:4000\n');
  
  try {
    // Step 1: Get available models
    console.log('📋 Step 1: Fetching available models...');
    const modelsResponse = await axios.get(`${API_ENDPOINT}/models`, {
      timeout: 5000
    });
    
    const models = modelsResponse.data?.data || [];
    console.log(`✅ Found ${models.length} models\n`);
    
    if (models.length === 0) {
      console.log('⚠️  No models available');
      return;
    }
    
    // Show first 5 models
    console.log('Available models (first 5):');
    models.slice(0, 5).forEach((model, idx) => {
      console.log(`  ${idx + 1}. ${model.id}`);
    });
    console.log('');
    
    // Step 2: Select a model (prefer gpt-4o-mini or first available)
    let selectedModel = models.find(m => m.id.includes('gpt-4o-mini'))?.id;
    if (!selectedModel) {
      selectedModel = models.find(m => m.id.includes('gpt'))?.id;
    }
    if (!selectedModel) {
      selectedModel = models[0].id;
    }
    
    console.log(`🎯 Selected model: ${selectedModel}\n`);
    
    // Step 3: Make a test chat completion request
    console.log('💬 Step 2: Making chat completion request...');
    const testPrompt = 'Привіт! Скажи коротко хто ти і що вмієш робити.';
    
    const chatResponse = await axios.post(`${API_ENDPOINT}/chat/completions`, {
      model: selectedModel,
      messages: [
        {
          role: 'user',
          content: testPrompt
        }
      ],
      temperature: 0.7,
      max_tokens: 200
    }, {
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    const response = chatResponse.data;
    const message = response.choices?.[0]?.message?.content || 'No response';
    
    console.log('✅ Response received:\n');
    console.log('─────────────────────────────────────────────────────');
    console.log(`Model: ${selectedModel}`);
    console.log(`Prompt: ${testPrompt}`);
    console.log(`Response:\n${message}`);
    console.log('─────────────────────────────────────────────────────');
    console.log('');
    
    // Show usage stats if available
    if (response.usage) {
      console.log('📊 Token usage:');
      console.log(`  Prompt tokens: ${response.usage.prompt_tokens}`);
      console.log(`  Completion tokens: ${response.usage.completion_tokens}`);
      console.log(`  Total tokens: ${response.usage.total_tokens}`);
    }
    
    console.log('\n✅ Test completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Error during API test:\n');
    
    if (error.code === 'ECONNREFUSED') {
      console.error('Connection refused - port 4000 is not running');
      console.error('\nTo start the API server:');
      console.error('  1. Check if you have OpenRouter proxy running');
      console.error('  2. Or start local LLM server on port 4000');
      console.error('  3. Or check restart_system.sh for API startup');
    } else if (error.response) {
      console.error(`HTTP ${error.response.status}: ${error.response.statusText}`);
      console.error('Response:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error(error.message);
    }
    
    process.exit(1);
  }
}

// Run the test
testAPIRequest();
