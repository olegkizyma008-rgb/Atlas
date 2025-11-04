/**
 * Test script for hybrid system with real task
 * Task: Open modern popular video clip in fullscreen browser
 */

import axios from 'axios';

async function testHybridSystem() {
    const task = "відкрити сучасний кліп який часто крутять в інтернеті на весь екран в браузері";
    
    console.log('🎬 Testing hybrid system with task:', task);
    console.log('=' .repeat(80));
    
    try {
        // Send request to orchestrator
        const response = await axios.post('http://localhost:5101/chat/stream', {
            message: task,
            sessionId: 'test-hybrid-' + Date.now(),
            mode: 'task'
        }, {
            headers: {
                'Content-Type': 'application/json'
            },
            responseType: 'stream'
        });

        // Process SSE stream
        response.data.on('data', (chunk) => {
            const lines = chunk.toString().split('\n');
            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    try {
                        const data = JSON.parse(line.slice(6));
                        console.log(`[${data.type}]`, data.data);
                    } catch (e) {
                        // Ignore parse errors
                    }
                }
            }
        });

        response.data.on('end', () => {
            console.log('\n✅ Task completed');
        });

        response.data.on('error', (error) => {
            console.error('❌ Stream error:', error.message);
        });

    } catch (error) {
        console.error('❌ Request failed:', error.message);
        if (error.response) {
            console.error('Response status:', error.response.status);
            console.error('Response data:', error.response.data);
        }
    }
}

// Run test
testHybridSystem().catch(console.error);
