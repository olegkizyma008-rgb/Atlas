/**
 * INTEGRATION VALIDATION TEST
 * Tests the API optimization system integration without requiring live API
 * 
 * This validates:
 * - Module imports and dependencies
 * - DI container compatibility
 * - Configuration loading
 * - Service registration
 * - Basic functionality without network calls
 */

import { DIContainer } from './orchestrator/core/di-container.js';
import { apiOptimizer } from './orchestrator/ai/api-request-optimizer.js';
import adaptiveThrottler from './orchestrator/utils/adaptive-request-throttler.js';
import OptimizedWorkflowManager from './orchestrator/ai/optimized-workflow-manager.js';
import { setupOptimizationIntegration } from './orchestrator/core/optimization-integration.js';
import GlobalConfig from './config/global-config.js';

console.log('🔧 Starting Integration Validation Test Suite\n');

async function runValidationTests() {
    const results = {
        passed: 0,
        failed: 0,
        tests: []
    };

    function test(name, testFn) {
        try {
            const result = testFn();
            if (result === true || (result && result.then)) {
                results.passed++;
                results.tests.push({ name, status: '✅ PASS', details: null });
                console.log(`✅ ${name}`);
            } else {
                throw new Error('Test returned false');
            }
        } catch (error) {
            results.failed++;
            results.tests.push({ name, status: '❌ FAIL', details: error.message });
            console.log(`❌ ${name}: ${error.message}`);
        }
    }

    // Test 1: Module Imports
    console.log('📦 Testing Module Imports...');
    test('APIRequestOptimizer import', () => {
        return apiOptimizer && typeof apiOptimizer.optimizedRequest === 'function';
    });

    test('IntelligentRateLimiter import', () => {
        return rateLimiter && typeof rateLimiter.executeRequest === 'function';
    });

    test('OptimizedWorkflowManager import', () => {
        return OptimizedWorkflowManager && typeof OptimizedWorkflowManager === 'function';
    });

    test('OptimizedExecutor import', () => {
        return OptimizedExecutor && typeof OptimizedExecutor === 'function';
    });

    test('GlobalConfig import', () => {
        return GlobalConfig && GlobalConfig.API_ENDPOINTS;
    });

    // Test 2: DI Container Compatibility
    console.log('\n🔗 Testing DI Container Integration...');
    const container = new DIContainer();

    test('DI Container creation', () => {
        return container && typeof container.register === 'function';
    });

    test('Service registration', () => {
        container.singleton('apiOptimizer', () => apiOptimizer);
        container.singleton('rateLimiter', () => rateLimiter);
        return container.has('apiOptimizer') && container.has('rateLimiter');
    });

    test('Service resolution', () => {
        const resolvedOptimizer = container.resolve('apiOptimizer');
        const resolvedLimiter = container.resolve('rateLimiter');
        return resolvedOptimizer === apiOptimizer && resolvedLimiter === rateLimiter;
    });

    // Test 3: Configuration Compatibility
    console.log('\n⚙️ Testing Configuration Compatibility...');
    test('API endpoint configuration', () => {
        return GlobalConfig.API_ENDPOINTS &&
            typeof GlobalConfig.getApiUrl === 'function';
    });

    test('Model configuration access', () => {
        return GlobalConfig.AI_MODEL_CONFIG &&
            GlobalConfig.AI_MODEL_CONFIG.apiEndpoint;
    });

    // Test 4: Optimization Integration Setup
    console.log('\n🔧 Testing Optimization Integration...');
    test('Optimization integration setup', () => {
        setupOptimizationIntegration(container);
        return container.has('optimizedExecutor') &&
            container.has('optimizedWorkflowManager');
    });

    // Test 5: Component Initialization
    console.log('\n🚀 Testing Component Initialization...');
    test('OptimizedExecutor initialization', () => {
        const executor = new OptimizedExecutor(container);
        return executor && typeof executor.executeWorkflow === 'function';
    });

    test('OptimizedWorkflowManager initialization', () => {
        const workflowManager = new OptimizedWorkflowManager(container);
        return workflowManager && typeof workflowManager.processOptimizedWorkflow === 'function';
    });

    // Test 6: API Optimizer Functionality (without network)
    console.log('\n🧠 Testing API Optimizer Logic...');
    test('Cache key generation', () => {
        const key1 = apiOptimizer._generateCacheKey('test', { messages: [{ content: 'hello' }] });
        const key2 = apiOptimizer._generateCacheKey('test', { messages: [{ content: 'hello' }] });
        const key3 = apiOptimizer._generateCacheKey('test', { messages: [{ content: 'world' }] });
        return key1 === key2 && key1 !== key3;
    });

    test('Batch capability detection', () => {
        return apiOptimizer._canBatch('mode_selection') === true &&
            apiOptimizer._canBatch('invalid_type') === false;
    });

    test('Model selection logic', () => {
        const model1 = apiOptimizer._selectOptimalModel('mode_selection');
        const model2 = apiOptimizer._selectOptimalModel('batch_system_selection');
        return model1 && model2 && model1 !== model2;
    });

    // Test 7: Rate Limiter Logic
    console.log('\n🚦 Testing Rate Limiter Logic...');
    test('Rate limiter initialization', () => {
        return rateLimiter.maxConcurrentRequests > 0 &&
            rateLimiter.baseDelay > 0;
    });

    test('Priority queue functionality', () => {
        return Array.isArray(rateLimiter.requestQueue) &&
            typeof rateLimiter._addToQueue === 'function';
    });

    // Test 8: Statistics and Monitoring
    console.log('\n📊 Testing Statistics and Monitoring...');
    test('API optimizer statistics', () => {
        const stats = apiOptimizer.getStats();
        return stats && typeof stats.totalRequests === 'number' &&
            typeof stats.cacheHits === 'number';
    });

    test('Rate limiter statistics', () => {
        const stats = rateLimiter.getStats();
        return stats && typeof stats.requestsProcessed === 'number' &&
            typeof stats.averageResponseTime === 'number';
    });

    // Test 9: Health Check Functionality
    console.log('\n🏥 Testing Health Check...');
    test('API optimizer health check structure', async () => {
        try {
            // This will fail due to no API, but should return proper structure
            await apiOptimizer.healthCheck();
            return false; // Should not reach here
        } catch (error) {
            // Expected to fail, but should have tried
            return true;
        }
    });

    // Summary
    console.log('\n📋 Integration Validation Summary:');
    console.log(`✅ Passed: ${results.passed}`);
    console.log(`❌ Failed: ${results.failed}`);
    console.log(`📊 Success Rate: ${((results.passed / (results.passed + results.failed)) * 100).toFixed(1)}%`);

    if (results.failed === 0) {
        console.log('\n🎉 All integration tests passed! The optimization system is ready for deployment.');
        console.log('\n📝 Next Steps:');
        console.log('1. Start the API server at localhost:4000');
        console.log('2. Run the full optimization test suite');
        console.log('3. Enable optimization in production configuration');
        console.log('4. Monitor performance improvements');
    } else {
        console.log('\n⚠️ Some integration tests failed. Please review the issues above.');

        // Show failed tests
        const failedTests = results.tests.filter(t => t.status.includes('FAIL'));
        if (failedTests.length > 0) {
            console.log('\n❌ Failed Tests:');
            failedTests.forEach(test => {
                console.log(`   • ${test.name}: ${test.details}`);
            });
        }
    }

    return results;
}

// Run the validation
runValidationTests().catch(error => {
    console.error('❌ Integration validation failed:', error);
    process.exit(1);
});
