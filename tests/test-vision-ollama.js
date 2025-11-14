/**
 * Test Vision with Ollama through Port 4000
 * Verifies that image_url format works with Ollama vision models
 */

import axios from 'axios';

async function testVisionWithOllama() {
  console.log('🧪 Testing Vision with Ollama through Port 4000...\n');

  try {
    // Create a simple test image (1x1 red pixel)
    const redPixelBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==';

    console.log('📤 Sending request with OpenAI image_url format...');

    const response = await axios.post('http://localhost:4000/v1/chat/completions', {
      model: 'ext-ollama-llama3.2-vision:latest',  // Ollama vision model через Port 4000
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'What color is this image? Respond with just the color name.'
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:image/png;base64,${redPixelBase64}`
              }
            }
          ]
        }
      ],
      max_tokens: 50,
      temperature: 0.1
    }, {
      timeout: 30000,
      headers: { 'Content-Type': 'application/json' }
    });

    const content = response.data.choices[0]?.message?.content;

    console.log('✅ Response received!');
    console.log('📊 Model:', response.data.model);
    console.log('💬 Response:', content);
    console.log('\n🎉 SUCCESS! Ollama vision works with OpenAI image_url format through Port 4000!');

    return true;

  } catch (error) {
    console.error('❌ Test failed:', error.message);

    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
    }

    if (error.code === 'ECONNREFUSED') {
      console.error('\n⚠️  Port 4000 is not running. Start it first:');
      console.error('   cd <api-4000-directory> && npm start');
    }

    return false;
  }
}

// Run test
testVisionWithOllama()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });
