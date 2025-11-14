/**
 * MOCK API SERVER FOR TESTING
 * Simulates the API on port 4000 for optimization testing
 */

import express from 'express';
import cors from 'cors';

const app = express();
const PORT = 4001; // Use different port to avoid conflicts

app.use(cors());
app.use(express.json());

// Mock models endpoint
app.get('/v1/models', (req, res) => {
    res.json({
        data: [
            { id: 'atlas-gpt-4o-mini', object: 'model' },
            { id: 'atlas-mistral-small-2503', object: 'model' },
            { id: 'atlas-ministral-3b', object: 'model' },
            { id: 'atlas-gpt-3.5-turbo', object: 'model' }
        ]
    });
});

// Mock chat completions endpoint
app.post('/v1/chat/completions', (req, res) => {
    const { messages, model } = req.body;
    
    // Simulate processing delay
    setTimeout(() => {
        // Mock response based on message content
        let content = 'Mock response from API optimizer test';
        
        if (messages && messages.length > 0) {
            const lastMessage = messages[messages.length - 1].content;
            
            if (lastMessage.includes('batch_system_selection')) {
                content = JSON.stringify({
                    mode: 'task',
                    modeConfidence: 0.85,
                    modeReasoning: 'User request appears to be task-oriented',
                    selectedServers: ['filesystem', 'web_search'],
                    toolPlanning: {
                        tool_calls: [
                            {
                                server: 'filesystem',
                                tool: 'read_file',
                                parameters: { path: '/test/file.txt' }
                            }
                        ]
                    },
                    optimization: {
                        requests_saved: 2,
                        batch_efficiency: 0.75
                    }
                });
            } else if (lastMessage.includes('mode_selection')) {
                content = JSON.stringify({
                    mode: 'chat',
                    confidence: 0.9,
                    reasoning: 'Simple chat interaction'
                });
            }
        }
        
        res.json({
            choices: [
                {
                    message: {
                        role: 'assistant',
                        content: content
                    }
                }
            ],
            usage: {
                prompt_tokens: 100,
                completion_tokens: 50,
                total_tokens: 150
            },
            model: model || 'atlas-gpt-4o-mini'
        });
    }, Math.random() * 200 + 100); // 100-300ms delay
});

app.listen(PORT, () => {
    console.log(`🧪 Mock API Server running on port ${PORT}`);
    console.log(`📡 Endpoints:`);
    console.log(`   GET  http://localhost:${PORT}/v1/models`);
    console.log(`   POST http://localhost:${PORT}/v1/chat/completions`);
});
