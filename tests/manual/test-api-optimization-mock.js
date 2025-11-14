/**
 * API OPTIMIZATION TEST SUITE - MOCK VERSION
 * Tests the optimization system using mock API server
 */

import { APIRequestOptimizer } from './orchestrator/ai/api-request-optimizer.js';
import adaptiveThrottler from './orchestrator/utils/adaptive-request-throttler.js';
import OptimizedWorkflowManager from './orchestrator/ai/optimized-workflow-manager.js';
import OptimizedExecutor from './orchestrator/ai/optimized-executor.js';
import { DIContainer } from './orchestrator/core/di-container.js';
import logger from './orchestrator/utils/logger.js';

// Mock container for testing
const mockContainer = {
    resolve: (service) => {
        const services = {
            'logger': logger,
            'mcpManager': {
                executeTool: async (server, tool, params) => ({
                    success: true,
                    result: `Mock result for ${tool} on ${server}`
                })
            },
            'executor': {
                processWorkflow: async (message, context) => ({
                    mode: 'chat',
                    response: 'Mock traditional executor response',
                    optimized: false
                })
            },
            'modeSelectionProcessor': {
                process: async (data) => ({
                    mode: 'chat',
                    confidence: 0.8,
                    reasoning: 'Mock mode selection'
                })
            }
        };
        return services[service] || null;
    }
};

async function runOptimizationTests() {
    console.log('🧪 Starting API Optimization Test Suite (Mock Version)\n');

    // Initialize components with mock API endpoint
    const apiOptimizer = new APIRequestOptimizer('http://localhost:4001/v1');
    const rateLimiter = new IntelligentRateLimiter();
    const workflowManager = new OptimizedWorkflowManager(mockContainer);
    const optimizedExecutor = new OptimizedExecutor(mockContainer);

    let testsPassed = 0;
    let totalTests = 4;

    try {
        // Test 1: Batch vs Sequential System Selection
        console.log('📋 Test 1: Batch vs Sequential System Selection');

        const testMessage = "Analyze the current system performance and suggest optimizations";

        // Sequential approach (simulated)
        const sequentialStart = Date.now();
        const modeResult = await apiOptimizer.optimizedRequest('mode_selection', {
            messages: [{ role: 'user', content: testMessage }],
            model: 'atlas-gpt-4o-mini'
        });
        const serverResult = await apiOptimizer.optimizedRequest('server_selection', {
            messages: [{ role: 'user', content: testMessage }],
            model: 'atlas-gpt-4o-mini'
        });
        const sequentialTime = Date.now() - sequentialStart;

        // Batch approach
        const batchStart = Date.now();
        const batchResults = [];
        for (let i = 0; i < 5; i++) {
            const result = await apiOptimizer.batchSystemSelection(testMessage);
            batchResults.push(result);
        }
        const batchTime = Date.now() - batchStart;

        const improvement = Math.round((1 - batchTime / (sequentialTime * 5)) * 100);

        if (improvement > 0) {
            console.log('   ✅ PASSED - Batch Processing');
            console.log(`   Details: Sequential: ${sequentialTime * 5}ms, Batch: ${batchTime}ms, Improvement: ${improvement}%\n`);
            testsPassed++;
        } else {
            console.log('   ❌ FAILED - Batch Processing');
            console.log(`   Details: No performance improvement detected\n`);
        }

        // Test 2: Cache Effectiveness
        console.log('💾 Test 2: Cache Effectiveness');

        apiOptimizer.clearCache();

        const cacheTestMessage = "What is the weather today?";

        // First request (cache miss)
        const firstStart = Date.now();
        await apiOptimizer.optimizedRequest('chat_completion', {
            messages: [{ role: 'user', content: cacheTestMessage }],
            model: 'atlas-gpt-4o-mini'
        });
        const firstTime = Date.now() - firstStart;

        // Second request (should be cached)
        const secondStart = Date.now();
        await apiOptimizer.optimizedRequest('chat_completion', {
            messages: [{ role: 'user', content: cacheTestMessage }],
            model: 'atlas-gpt-4o-mini'
        });
        const secondTime = Date.now() - secondStart;

        const stats = apiOptimizer.getStats();
        const cacheHitRatio = Math.round((stats.cacheHits / stats.totalRequests) * 100);
        const speedImprovement = Math.round((1 - secondTime / firstTime) * 100);

        if (cacheHitRatio > 0 && speedImprovement > 50) {
            console.log('   ✅ PASSED - Caching System');
            console.log(`   Details: Cache hit ratio: ${cacheHitRatio}%, Speed improvement: ${speedImprovement}%\n`);
            testsPassed++;
        } else {
            console.log('   ❌ FAILED - Caching System');
            console.log(`   Details: Cache hit ratio: ${cacheHitRatio}%, Speed improvement: ${speedImprovement}%\n`);
        }

        // Test 3: Rate Limiting Performance
        console.log('🚦 Test 3: Rate Limiting Performance');

        rateLimiter.reset();

        const rateLimitPromises = [];
        for (let i = 0; i < 10; i++) {
            rateLimitPromises.push(
                rateLimiter.executeRequest(
                    async () => {
                        await new Promise(resolve => setTimeout(resolve, 50));
                        return { success: true, id: i };
                    },
                    { priority: rateLimiter.priorityLevels.MEDIUM }
                )
            );
        }

        const rateLimitResults = await Promise.allSettled(rateLimitPromises);
        const successCount = rateLimitResults.filter(r => r.status === 'fulfilled').length;
        const successRate = Math.round((successCount / rateLimitResults.length) * 100);

        const metrics = rateLimiter.getMetrics();

        if (successRate >= 90) {
            console.log('   ✅ PASSED - Rate Limiting');
            console.log(`   Details: Success rate: ${successRate}%, Peak concurrency: ${metrics.peakConcurrency}/${metrics.maxConcurrency}\n`);
            testsPassed++;
        } else {
            console.log('   ❌ FAILED - Rate Limiting');
            console.log(`   Details: Success rate: ${successRate}%, Peak concurrency: ${metrics.peakConcurrency}/${metrics.maxConcurrency}\n`);
        }

        // Test 4: Overall Performance Improvement
        console.log('⚡ Test 4: Overall Performance Improvement');

        const performanceTestMessage = "Create a comprehensive analysis of system optimization opportunities";

        // Traditional workflow (simulated)
        const traditionalStart = Date.now();
        const traditionalResult = await mockContainer.resolve('executor').processWorkflow(
            performanceTestMessage,
            { sessionId: 'test-session' }
        );
        const traditionalTime = Date.now() - traditionalStart;

        // Optimized workflow
        const optimizedStart = Date.now();
        const optimizedResult = await optimizedExecutor.executeWorkflow(
            performanceTestMessage,
            { sessionId: 'test-session-optimized' }
        );
        const optimizedTime = Date.now() - optimizedStart;

        const overallImprovement = Math.round((1 - optimizedTime / traditionalTime) * 100);
        const executorStats = optimizedExecutor.getExecutorStats();

        if (overallImprovement > 0 || executorStats.apiCallsSaved > 0) {
            console.log('   ✅ PASSED - Overall Performance');
            console.log(`   Details: Traditional: ${traditionalTime}ms, Optimized: ${optimizedTime}ms, Improvement: ${overallImprovement}%`);
            console.log(`   API calls saved: ${executorStats.apiCallsSaved}, Optimization ratio: ${Math.round(executorStats.optimizationRatio * 100)}%\n`);
            testsPassed++;
        } else {
            console.log('   ❌ FAILED - Overall Performance');
            console.log(`   Details: No significant improvement detected\n`);
        }

    } catch (error) {
        console.error(`❌ Test suite failed: ${error.message}`);
        return;
    }

    // Final Results
    console.log('📊 Test Results Summary');
    console.log(`   Tests Passed: ${testsPassed}/${totalTests}`);
    console.log(`   Success Rate: ${Math.round((testsPassed / totalTests) * 100)}%`);

    if (testsPassed === totalTests) {
        console.log('   🎉 ALL TESTS PASSED - API Optimization System is working correctly!');
    } else if (testsPassed >= totalTests * 0.75) {
        console.log('   ⚠️  MOSTLY WORKING - Some optimizations may need fine-tuning');
    } else {
        console.log('   ❌ SYSTEM NEEDS ATTENTION - Multiple optimization failures detected');
    }

    // Display final statistics
    console.log('\n📈 Final Statistics:');
    console.log('API Optimizer:', JSON.stringify(apiOptimizer.getStats(), null, 2));
    console.log('Rate Limiter:', JSON.stringify(rateLimiter.getMetrics(), null, 2));
    console.log('Executor Stats:', JSON.stringify(optimizedExecutor.getExecutorStats(), null, 2));
}

// Run tests
runOptimizationTests().catch(console.error);
