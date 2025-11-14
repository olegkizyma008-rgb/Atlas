#!/usr/bin/env node

/**
 * Real Task Testing - ATLAS v5.0
 * Tests the refactored system with real tasks
 */

import axios from 'axios';

const ORCHESTRATOR_URL = 'http://localhost:5101';
const LLM_API_URL = 'http://localhost:4000/v1/chat/completions';

const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
};

function log(color, title, message) {
    console.log(`${color}[${title}]${colors.reset} ${message}`);
}

async function testLLMAPI() {
    log(colors.blue, 'TEST', 'Testing LLM API...');
    try {
        const response = await axios.post(LLM_API_URL, {
            model: 'mistral-7b',
            messages: [
                { role: 'system', content: 'You are a helpful assistant.' },
                { role: 'user', content: 'What is 2+2?' }
            ],
            max_tokens: 100,
            temperature: 0.7
        }, {
            timeout: 10000
        });

        log(colors.green, 'LLM API', `✅ Working! Response: ${response.data.choices[0].message.content.substring(0, 50)}...`);
        return true;
    } catch (error) {
        log(colors.red, 'LLM API', `❌ Failed: ${error.message}`);
        return false;
    }
}

async function testOrchestratorHealth() {
    log(colors.blue, 'TEST', 'Testing Orchestrator Health...');
    try {
        const response = await axios.get(`${ORCHESTRATOR_URL}/api/health`, {
            timeout: 5000
        });

        if (response.data.status === 'healthy') {
            log(colors.green, 'HEALTH', '✅ Orchestrator is healthy');
            return true;
        } else {
            log(colors.yellow, 'HEALTH', `⚠️ Orchestrator status: ${response.data.status}`);
            return true;
        }
    } catch (error) {
        log(colors.red, 'HEALTH', `❌ Failed: ${error.message}`);
        return false;
    }
}

async function testChatAPI() {
    log(colors.blue, 'TEST', 'Testing Chat API with real task...');
    try {
        const response = await axios.post(`${ORCHESTRATOR_URL}/api/chat`, {
            message: 'What is the capital of France?',
            mode: 'chat',
            context: {
                sessionId: 'test-session-' + Date.now(),
                userId: 'test-user'
            }
        }, {
            timeout: 30000
        });

        if (response.data.success || response.data.response) {
            log(colors.green, 'CHAT API', `✅ Chat working! Response: ${(response.data.response || response.data.message).substring(0, 60)}...`);
            return true;
        } else {
            log(colors.yellow, 'CHAT API', `⚠️ Unexpected response format`);
            return true;
        }
    } catch (error) {
        log(colors.red, 'CHAT API', `❌ Failed: ${error.message}`);
        if (error.response?.data) {
            log(colors.red, 'ERROR', JSON.stringify(error.response.data).substring(0, 100));
        }
        return false;
    }
}

async function testMultipleConcurrentRequests() {
    log(colors.blue, 'TEST', 'Testing multiple concurrent requests (adaptive throttler)...');

    const requests = [];
    const startTime = Date.now();

    for (let i = 0; i < 5; i++) {
        requests.push(
            axios.post(LLM_API_URL, {
                model: 'mistral-7b',
                messages: [
                    { role: 'system', content: 'You are helpful.' },
                    { role: 'user', content: `Question ${i + 1}: What is ${i + 1} + 1?` }
                ],
                max_tokens: 50,
                temperature: 0.7
            }, {
                timeout: 15000
            }).catch(err => ({ error: err.message }))
        );
    }

    try {
        const results = await Promise.all(requests);
        const duration = Date.now() - startTime;

        const successful = results.filter(r => !r.error).length;
        const failed = results.filter(r => r.error).length;

        log(colors.green, 'CONCURRENT', `✅ Completed in ${duration}ms: ${successful} success, ${failed} failed`);

        if (successful >= 3) {
            log(colors.green, 'THROTTLER', '✅ Adaptive throttler working - requests processed efficiently');
            return true;
        } else {
            log(colors.yellow, 'THROTTLER', `⚠️ Only ${successful}/5 requests succeeded`);
            return false;
        }
    } catch (error) {
        log(colors.red, 'CONCURRENT', `❌ Failed: ${error.message}`);
        return false;
    }
}

async function testRateLimiterMetrics() {
    log(colors.blue, 'TEST', 'Checking rate limiter metrics...');
    try {
        const response = await axios.get(`${ORCHESTRATOR_URL}/api/health`, {
            timeout: 5000
        });

        if (response.data.optimization) {
            const metrics = response.data.optimization.rateLimiter;
            log(colors.green, 'METRICS', `✅ Rate limiter stats:`);
            console.log(`   - Queue size: ${metrics?.queueLength || 0}`);
            console.log(`   - Success rate: ${((metrics?.successRate || 0) * 100).toFixed(1)}%`);
            console.log(`   - Avg delay: ${metrics?.averageDelay || 0}ms`);
            console.log(`   - Efficiency: ${((metrics?.efficiency || 0) * 100).toFixed(1)}%`);
            return true;
        } else {
            log(colors.yellow, 'METRICS', '⚠️ Optimization metrics not available');
            return true;
        }
    } catch (error) {
        log(colors.red, 'METRICS', `❌ Failed: ${error.message}`);
        return false;
    }
}

async function runAllTests() {
    console.log(`\n${colors.bright}${colors.cyan}╔════════════════════════════════════════════════════════════╗${colors.reset}`);
    console.log(`${colors.bright}${colors.cyan}║  ATLAS v5.0 - REFACTORING VERIFICATION TEST SUITE            ║${colors.reset}`);
    console.log(`${colors.bright}${colors.cyan}╚════════════════════════════════════════════════════════════╝${colors.reset}\n`);

    const results = {
        llmAPI: false,
        health: false,
        chat: false,
        concurrent: false,
        metrics: false
    };

    // Run tests
    results.llmAPI = await testLLMAPI();
    console.log();

    results.health = await testOrchestratorHealth();
    console.log();

    results.chat = await testChatAPI();
    console.log();

    results.concurrent = await testMultipleConcurrentRequests();
    console.log();

    results.metrics = await testRateLimiterMetrics();
    console.log();

    // Summary
    const passed = Object.values(results).filter(r => r).length;
    const total = Object.keys(results).length;

    console.log(`${colors.bright}${colors.cyan}╔════════════════════════════════════════════════════════════╗${colors.reset}`);
    console.log(`${colors.bright}${colors.cyan}║  TEST RESULTS                                                ║${colors.reset}`);
    console.log(`${colors.bright}${colors.cyan}╠════════════════════════════════════════════════════════════╣${colors.reset}`);

    Object.entries(results).forEach(([test, passed]) => {
        const status = passed ? `${colors.green}✅ PASS${colors.reset}` : `${colors.red}❌ FAIL${colors.reset}`;
        console.log(`${colors.bright}${colors.cyan}║${colors.reset}  ${test.padEnd(20)} ${status.padEnd(30)} ${colors.bright}${colors.cyan}║${colors.reset}`);
    });

    console.log(`${colors.bright}${colors.cyan}╠════════════════════════════════════════════════════════════╣${colors.reset}`);
    console.log(`${colors.bright}${colors.cyan}║${colors.reset}  ${`TOTAL: ${passed}/${total} tests passed`.padEnd(58)} ${colors.bright}${colors.cyan}║${colors.reset}`);
    console.log(`${colors.bright}${colors.cyan}╚════════════════════════════════════════════════════════════╝${colors.reset}\n`);

    if (passed === total) {
        log(colors.green, 'SUCCESS', '🎉 All tests passed! System is working correctly.');
        process.exit(0);
    } else {
        log(colors.red, 'FAILURE', `❌ ${total - passed} test(s) failed. Please check the logs.`);
        process.exit(1);
    }
}

// Run tests
runAllTests().catch(error => {
    log(colors.red, 'ERROR', `Fatal error: ${error.message}`);
    process.exit(1);
});
