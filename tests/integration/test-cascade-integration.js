/**
 * TEST: Cascade Controller Integration
 * Перевірка інтеграції Nexus з Cascade Controller
 */

import { MultiModelOrchestrator } from '../../orchestrator/eternity/multi-model-orchestrator.js';
import { CascadeController } from '../../orchestrator/eternity/cascade-controller.js';
import logger from '../../orchestrator/utils/logger.js';

// Mock DI Container
class MockContainer {
    constructor() {
        this.services = new Map();
    }
    
    singleton(name, factory) {
        this.services.set(name, factory);
    }
    
    resolve(name) {
        const factory = this.services.get(name);
        if (!factory) throw new Error(`Service ${name} not found`);
        return typeof factory === 'function' ? factory() : factory;
    }
    
    get(name) {
        return this.resolve(name);
    }
}

async function testCascadeIntegration() {
    console.log('🧪 Testing Cascade Controller Integration...\n');
    
    try {
        // 1. Створюємо mock container
        const container = new MockContainer();
        
        // 2. Ініціалізуємо Cascade Controller
        console.log('📦 Initializing Cascade Controller...');
        const cascadeController = new CascadeController(container);
        await cascadeController.initialize();
        
        // 3. Реєструємо в DI
        container.singleton('cascadeController', () => cascadeController);
        
        // 4. Ініціалізуємо Multi-Model Orchestrator
        console.log('📦 Initializing Multi-Model Orchestrator...');
        const orchestrator = new MultiModelOrchestrator(container);
        await orchestrator.initialize();
        
        // 5. Перевіряємо підключення
        console.log('\n✅ Integration Status:');
        console.log(`   Cascade Controller: ${orchestrator.cascadeController ? '✅ Connected' : '❌ Not connected'}`);
        console.log(`   Codestral API: ${cascadeController.codestralAPI ? '✅ Available' : '⚠️ Not available'}`);
        
        // 6. Тестуємо виклик через Cascade
        console.log('\n🧪 Testing code analysis through Cascade...');
        
        const testCode = `
function calculateSum(a, b) {
    return a + b;
}
`;
        
        const result = await orchestrator.executeTask(
            'code-analysis',
            `Analyze this code:\n${testCode}`,
            {
                systemPrompt: 'You are a code analysis assistant.'
            }
        );
        
        console.log('\n📊 Analysis Result:');
        console.log(`   Success: ${result.success ? '✅' : '❌'}`);
        console.log(`   Model: ${result.model}`);
        console.log(`   Via: ${result.content?.via || 'unknown'}`);
        console.log(`   Content length: ${result.content?.content?.length || 0} chars`);
        
        if (result.success) {
            console.log('\n✅ TEST PASSED: Cascade integration working correctly');
        } else {
            console.log('\n❌ TEST FAILED:', result.error);
        }
        
        // 7. Статистика
        const stats = orchestrator.getStats();
        console.log('\n📈 Orchestrator Stats:');
        console.log(`   Total requests: ${stats.totalRequests}`);
        console.log(`   Successful: ${stats.successfulRequests}`);
        console.log(`   Failed: ${stats.failedRequests}`);
        console.log(`   Success rate: ${stats.successRate}`);
        
    } catch (error) {
        console.error('\n❌ TEST ERROR:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

// Запускаємо тест
testCascadeIntegration().then(() => {
    console.log('\n🎉 Test completed');
    process.exit(0);
}).catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});
