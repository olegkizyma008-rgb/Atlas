#!/usr/bin/env node

/**
 * Test Windsurf API (OpenAI-compatible) request
 * Usage: node test-windsurf-api.js
 */

import axios from 'axios';
import { readFileSync } from 'fs';

// Load environment variables manually
const envContent = readFileSync('.env', 'utf-8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) {
    envVars[match[1].trim()] = match[2].trim();
  }
});

const WINDSURF_API_KEY = envVars.WINDSURF_API_KEY;
const WINDSURF_API_ENDPOINT = envVars.WINDSURF_API_ENDPOINT || 'https://api.windsurf.ai/v1';

async function testWindsurfAPI() {
  console.log('🔍 Testing Windsurf API (OpenAI-compatible)\n');
  
  if (!WINDSURF_API_KEY) {
    console.error('❌ WINDSURF_API_KEY not found in .env');
    process.exit(1);
  }
  
  try {
    // Step 1: Get available models
    console.log('📋 Step 1: Fetching available models...');
    const modelsResponse = await axios.get(`${WINDSURF_API_ENDPOINT}/models`, {
      headers: {
        'Authorization': `Bearer ${WINDSURF_API_KEY}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });
    
    const models = modelsResponse.data?.data || [];
    console.log(`✅ Found ${models.length} models\n`);
    
    if (models.length === 0) {
      console.log('⚠️  No models available');
      return;
    }
    
    // Show first 10 models
    console.log('Available models (first 10):');
    models.slice(0, 10).forEach((model, idx) => {
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
    const testPrompt = 'Привіт! Скажи коротко хто ти і що вмієш робити. Відповідай українською.';
    
    const startTime = Date.now();
    const chatResponse = await axios.post(`${WINDSURF_API_ENDPOINT}/chat/completions`, {
      model: selectedModel,
      messages: [
        {
          role: 'user',
          content: testPrompt
        }
      ],
      temperature: 0.7,
      max_tokens: 300
    }, {
      headers: {
        'Authorization': `Bearer ${WINDSURF_API_KEY}`,
        'Content-Type': 'application/json'
      },
      timeout: 60000
    });
    
    const responseTime = Date.now() - startTime;
    const response = chatResponse.data;
    const message = response.choices?.[0]?.message?.content || 'No response';
    
    console.log('✅ Response received:\n');
    console.log('─────────────────────────────────────────────────────');
    console.log(`Model: ${selectedModel}`);
    console.log(`Response time: ${responseTime}ms`);
    console.log(`Prompt: ${testPrompt}`);
    console.log(`\nResponse:\n${message}`);
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
    
    // Step 4: Show how to use this in Atlas
    console.log('\n📝 To use Windsurf API in Atlas:');
    console.log('1. Update .env:');
    console.log(`   LLM_API_ENDPOINT=${WINDSURF_API_ENDPOINT}/chat/completions`);
    console.log('2. Add API key to requests:');
    console.log('   headers: { "Authorization": "Bearer ${WINDSURF_API_KEY}" }');
    
  } catch (error) {
    console.error('\n❌ Error during API test:\n');
    
    if (error.code === 'ECONNREFUSED') {
      console.error('Connection refused - cannot reach Windsurf API');
    } else if (error.response) {
      console.error(`HTTP ${error.response.status}: ${error.response.statusText}`);
      if (error.response.data) {
        console.error('Response:', JSON.stringify(error.response.data, null, 2));
      }
    } else if (error.code === 'ETIMEDOUT' || error.message.includes('timeout')) {
      console.error('Request timeout - API took too long to respond');
    } else {
      console.error(error.message);
    }
    
    process.exit(1);
  }
}

// Run the test
testWindsurfAPI();
