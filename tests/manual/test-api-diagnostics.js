#!/usr/bin/env node

/**
 * API Diagnostics Test
 * Tests various task types to identify API issues
 *
 * Analyzes:
 * - 500 errors from external API
 * - Request patterns and concurrency
 * - Rate limiting behavior
 * - Model fallback mechanisms
 */

import axios from 'axios';
import { performance } from 'perf_hooks';

const ORCHESTRATOR_URL = 'http://localhost:5101';
const API_TIMEOUT = 60000;

// Test cases for different task types
const TEST_TASKS = [
    {
        name: 'Simple Chat',
        type: 'chat',
        payload: {
            message: 'Привіт, як дела?',
            mode: 'chat'
        }
    },
    {
        name: 'Code Analysis Task',
        type: 'task',
        payload: {
            message: 'Проаналізуй цей код: function test() { return 42; }',
            mode: 'task'
        }
    },
    {
        name: 'Debug Mode',
        type: 'debug',
        payload: {
            message: 'Що робить цей код?',
            mode: 'debug'
        }
    },
    {
        name: 'Vision Analysis',
        type: 'task',
        payload: {
            message: 'Опиши що ти бачиш на екрані',
            mode: 'task'
        }
    }
];

class APIDiagnostics {
    constructor() {
        this.results = [];
        this.errors = [];
        this.startTime = null;
    }

    async runDiagnostics() {
        console.log('\n╔════════════════════════════════════════════════════════════════╗');
        console.log('║           ATLAS API DIAGNOSTICS - Test Suite                   ║');
        console.log('╚════════════════════════════════════════════════════════════════╝\n');

        this.startTime = performance.now();

        // Test 1: Check orchestrator health
        await this.testOrchestratorHealth();

        // Test 2: Run sequential tasks
        await this.testSequentialTasks();

        // Test 3: Run concurrent tasks
        await this.testConcurrentTasks();

        // Test 4: Analyze patterns
        this.analyzePatterns();

        // Print summary
        this.printSummary();
    }

    async testOrchestratorHealth() {
        console.log('📋 Test 1: Orchestrator Health Check');
        console.log('─'.repeat(60));

        try {
            const response = await axios.get(`${ORCHESTRATOR_URL}/health`, {
                timeout: 5000
            });
            console.log('✅ Orchestrator is running');
            console.log(`   Status: ${response.status}`);
            console.log(`   Response time: ${response.headers['x-response-time'] || 'N/A'}\n`);
        } catch (error) {
            console.log('❌ Orchestrator health check failed');
            console.log(`   Error: ${error.message}\n`);
            this.errors.push({
                test: 'Health Check',
                error: error.message
            });
        }
    }

    async testSequentialTasks() {
        console.log('📋 Test 2: Sequential Task Execution');
        console.log('─'.repeat(60));

        for (let i = 0; i < TEST_TASKS.length; i++) {
            const task = TEST_TASKS[i];
            console.log(`\n  [${i + 1}/${TEST_TASKS.length}] ${task.name}`);

            let startTime;
            try {
                startTime = performance.now();
                const response = await axios.post(
                    `${ORCHESTRATOR_URL}/chat/stream`,
                    task.payload,
                    {
                        timeout: API_TIMEOUT,
                        headers: {
                            'Content-Type': 'application/json'
                        }
                    }
                );

                const duration = performance.now() - startTime;
                console.log(`      ✅ Success (${duration.toFixed(0)}ms)`);
                console.log(`      Status: ${response.status}`);

                this.results.push({
                    task: task.name,
                    status: 'success',
                    duration,
                    statusCode: response.status
                });

            } catch (error) {
                const duration = performance.now() - startTime;
                const statusCode = error.response?.status || 'N/A';
                console.log(`      ❌ Failed (${duration.toFixed(0)}ms) - Status: ${statusCode}`);
                console.log(`      Error: ${error.message}`);

                this.results.push({
                    task: task.name,
                    status: 'error',
                    duration,
                    statusCode,
                    error: error.message
                });

                this.errors.push({
                    test: task.name,
                    statusCode,
                    error: error.message
                });
            }

            // Wait between requests
            await this.delay(2000);
        }
    }

    async testConcurrentTasks() {
        console.log('\n📋 Test 3: Concurrent Task Execution');
        console.log('─'.repeat(60));
        console.log('\nSending 3 concurrent requests...\n');

        const concurrentTasks = [
            TEST_TASKS[0],
            TEST_TASKS[1],
            TEST_TASKS[2]
        ];

        const startTime = performance.now();

        try {
            const promises = concurrentTasks.map((task, index) =>
                this.executeTaskWithTracking(task, `Concurrent-${index + 1}`)
            );

            const results = await Promise.allSettled(promises);

            results.forEach((result, index) => {
                if (result.status === 'fulfilled') {
                    console.log(`  ✅ Concurrent task ${index + 1}: ${result.value.duration.toFixed(0)}ms`);
                } else {
                    console.log(`  ❌ Concurrent task ${index + 1}: ${result.reason.message}`);
                }
            });

            const totalDuration = performance.now() - startTime;
            console.log(`\nTotal concurrent time: ${totalDuration.toFixed(0)}ms\n`);

        } catch (error) {
            console.log(`❌ Concurrent test failed: ${error.message}\n`);
            this.errors.push({
                test: 'Concurrent Execution',
                error: error.message
            });
        }
    }

    async executeTaskWithTracking(task, label) {
        const startTime = performance.now();

        try {
            const response = await axios.post(
                `${ORCHESTRATOR_URL}/chat/stream`,
                task.payload,
                {
                    timeout: API_TIMEOUT,
                    headers: {
                        'Content-Type': 'application/json'
                    }
                }
            );

            const duration = performance.now() - startTime;

            return {
                label,
                status: 'success',
                duration,
                statusCode: response.status
            };

        } catch (error) {
            const duration = performance.now() - startTime;
            throw {
                label,
                status: 'error',
                duration,
                statusCode: error.response?.status || 'N/A',
                message: error.message
            };
        }
    }

    analyzePatterns() {
        console.log('📋 Test 4: Pattern Analysis');
        console.log('─'.repeat(60));

        // Analyze error patterns
        const errorsByStatus = {};
        this.errors.forEach(err => {
            const status = err.statusCode || 'Unknown';
            errorsByStatus[status] = (errorsByStatus[status] || 0) + 1;
        });

        console.log('\n📊 Error Distribution:');
        Object.entries(errorsByStatus).forEach(([status, count]) => {
            console.log(`   ${status}: ${count} error(s)`);
        });

        // Analyze response times
        const successfulResults = this.results.filter(r => r.status === 'success');
        if (successfulResults.length > 0) {
            const durations = successfulResults.map(r => r.duration);
            const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
            const maxDuration = Math.max(...durations);
            const minDuration = Math.min(...durations);

            console.log('\n⏱️  Response Time Analysis:');
            console.log(`   Average: ${avgDuration.toFixed(0)}ms`);
            console.log(`   Min: ${minDuration.toFixed(0)}ms`);
            console.log(`   Max: ${maxDuration.toFixed(0)}ms`);
        }

        // Check for rate limiting
        const rateLimitErrors = this.errors.filter(e => e.statusCode === 429);
        if (rateLimitErrors.length > 0) {
            console.log(`\n⚠️  Rate Limiting Detected: ${rateLimitErrors.length} 429 errors`);
        }

        // Check for server errors
        const serverErrors = this.errors.filter(e => e.statusCode >= 500);
        if (serverErrors.length > 0) {
            console.log(`\n❌ Server Errors: ${serverErrors.length} 5xx errors`);
            serverErrors.forEach(err => {
                console.log(`   - ${err.test}: ${err.statusCode}`);
            });
        }
    }

    printSummary() {
        console.log('\n╔════════════════════════════════════════════════════════════════╗');
        console.log('║                      DIAGNOSTICS SUMMARY                        ║');
        console.log('╚════════════════════════════════════════════════════════════════╝\n');

        const totalDuration = performance.now() - this.startTime;
        const successCount = this.results.filter(r => r.status === 'success').length;
        const errorCount = this.results.filter(r => r.status === 'error').length;

        console.log(`📊 Results:`);
        console.log(`   Total tests: ${this.results.length}`);
        console.log(`   Successful: ${successCount}`);
        console.log(`   Failed: ${errorCount}`);
        console.log(`   Success rate: ${((successCount / this.results.length) * 100).toFixed(1)}%`);
        console.log(`   Total time: ${totalDuration.toFixed(0)}ms\n`);

        if (this.errors.length > 0) {
            console.log('⚠️  Issues Found:');
            this.errors.forEach((err, index) => {
                console.log(`   ${index + 1}. ${err.test} (${err.statusCode})`);
                console.log(`      ${err.error}`);
            });
        } else {
            console.log('✅ No issues detected!');
        }

        console.log('\n📝 Recommendations:');
        this.printRecommendations();
    }

    printRecommendations() {
        const has500Errors = this.errors.some(e => e.statusCode >= 500);
        const has429Errors = this.errors.some(e => e.statusCode === 429);
        const hasTimeouts = this.errors.some(e => e.error?.includes('timeout'));

        if (has500Errors) {
            console.log('   1. ❌ Server returning 500 errors - Check external API health');
            console.log('      - Verify LLM API is running on port 4000');
            console.log('      - Check if models are properly configured');
            console.log('      - Review API logs for detailed errors');
        }

        if (has429Errors) {
            console.log('   2. ⚠️  Rate limiting detected - Adjust rate limiter settings');
            console.log('      - Check unified-rate-limiter.js configuration');
            console.log('      - Consider increasing rate limits');
        }

        if (hasTimeouts) {
            console.log('   3. ⏱️  Timeouts detected - Check system performance');
            console.log('      - Monitor CPU and memory usage');
            console.log('      - Check network connectivity');
        }

        if (!has500Errors && !has429Errors && !hasTimeouts) {
            console.log('   ✅ System appears to be functioning normally');
        }
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Run diagnostics
const diagnostics = new APIDiagnostics();
await diagnostics.runDiagnostics();
