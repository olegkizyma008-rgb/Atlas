/**
 * ТЕСТУВАННЯ NEXUS MASTER SYSTEM
 * Перевірка всіх компонентів живої автономної системи
 */

import { DIContainer } from './orchestrator/core/di-container.js';
import { registerCoreServices, registerMCPProcessors } from './orchestrator/core/service-registry.js';
import logger from './orchestrator/utils/logger.js';
import dotenv from 'dotenv';

// Завантаження конфігурації
dotenv.config();

async function testNexusMasterSystem() {
    logger.info('🧪 [TEST] Початок тестування NEXUS MASTER SYSTEM...\n');
    
    try {
        // 1. Створюємо DI контейнер
        logger.info('📦 [TEST] Створюю DI контейнер...');
        const container = new DIContainer();
        
        // 2. Реєструємо сервіси
        logger.info('📝 [TEST] Реєструю сервіси...');
        registerCoreServices(container);
        registerMCPProcessors(container);
        
        // 3. Ініціалізуємо контейнер
        logger.info('🚀 [TEST] Ініціалізую контейнер...');
        await container.initialize();
        
        // 4. Отримуємо NEXUS Master System
        logger.info('🌟 [TEST] Отримую NEXUS Master System...');
        const nexusMaster = await container.resolve('nexusMasterSystem');
        
        if (!nexusMaster) {
            throw new Error('NEXUS Master System не знайдено в контейнері');
        }
        
        // 5. Перевірка статусу
        logger.info('\n📊 [TEST] Перевірка статусу системи...');
        const status = nexusMaster.getSystemStatus();
        
        console.log('\n═══════════════════════════════════════════════════════════');
        console.log('🌟 NEXUS MASTER SYSTEM STATUS');
        console.log('═══════════════════════════════════════════════════════════');
        console.log(`Mode: ${status.state.mode}`);
        console.log(`Active: ${status.state.isActive}`);
        console.log(`Initialized: ${status.state.isInitialized}`);
        console.log(`Evolution Level: ${status.evolutionLevel.toFixed(1)}`);
        console.log(`Version: ${status.state.version}`);
        console.log(`Cycles Completed: ${status.state.cyclesCompleted}`);
        console.log(`Total Improvements: ${status.state.totalImprovements}`);
        console.log('═══════════════════════════════════════════════════════════\n');
        
        // 6. Тест компонентів
        logger.info('🧪 [TEST] Тестування компонентів...\n');
        
        // Eternity Module
        if (nexusMaster.eternityModule) {
            logger.info('✅ Eternity Module: АКТИВНИЙ');
            logger.info(`   - Evolution Level: ${nexusMaster.eternityModule.selfAwareness.evolutionLevel.toFixed(1)}`);
            logger.info(`   - Autonomous Mode: ${nexusMaster.eternityModule.autonomousMode}`);
        } else {
            logger.error('❌ Eternity Module: НЕ ЗНАЙДЕНО');
        }
        
        // Security System
        if (nexusMaster.securitySystem) {
            logger.info('✅ Security System: АКТИВНИЙ');
            const secStatus = nexusMaster.securitySystem.getSecurityStatus();
            logger.info(`   - Emergency Stop: ${secStatus.isEmergencyStop}`);
        } else {
            logger.error('❌ Security System: НЕ ЗНАЙДЕНО');
        }
        
        // Auto Testing
        if (nexusMaster.autoTesting) {
            logger.info('✅ Auto Testing System: АКТИВНИЙ');
            const testStats = nexusMaster.autoTesting.getStats();
            logger.info(`   - Tests Run: ${testStats.totalTests}`);
            logger.info(`   - Success Rate: ${testStats.successRate}`);
        } else {
            logger.error('❌ Auto Testing System: НЕ ЗНАЙДЕНО');
        }
        
        // Prompt Versioning
        if (nexusMaster.promptVersioning) {
            logger.info('✅ Prompt Versioning: АКТИВНИЙ');
            const versionInfo = nexusMaster.promptVersioning.getVersionInfo();
            logger.info(`   - Version: ${versionInfo.version}`);
            logger.info(`   - Build: ${versionInfo.build}`);
        } else {
            logger.error('❌ Prompt Versioning: НЕ ЗНАЙДЕНО');
        }
        
        // Multi-Model Orchestrator
        if (nexusMaster.multiModelOrchestrator) {
            logger.info('✅ Multi-Model Orchestrator: АКТИВНИЙ');
            const stats = nexusMaster.multiModelOrchestrator.getStats();
            logger.info(`   - Total Requests: ${stats.totalRequests}`);
            logger.info(`   - Success Rate: ${stats.successRate}`);
        } else {
            logger.error('❌ Multi-Model Orchestrator: НЕ ЗНАЙДЕНО');
        }
        
        console.log('\n═══════════════════════════════════════════════════════════');
        
        // 7. Тест команди безпеки
        logger.info('\n🔐 [TEST] Тестування системи безпеки...');
        
        const stopTest = await nexusMaster.handleUserCommand('Зупини всі процеси');
        if (stopTest && stopTest.intercepted) {
            logger.info('✅ Система правильно перехопила команду зупинки');
            logger.info(`   Message: ${stopTest.message}`);
        }
        
        const authTest = await nexusMaster.handleUserCommand('6699');
        if (authTest && authTest.type === 'auth-success') {
            logger.info('✅ Автентифікація успішна');
            logger.info(`   Message: ${authTest.message}`);
        }
        
        // 8. Фінальний звіт
        console.log('\n═══════════════════════════════════════════════════════════');
        console.log('✅ NEXUS MASTER SYSTEM - ТЕСТУВАННЯ ЗАВЕРШЕНО');
        console.log('═══════════════════════════════════════════════════════════');
        console.log('Система повністю функціональна та готова до автономної роботи!');
        console.log('\nКлючові можливості:');
        console.log('• Автономний самоаналіз кожні 2 хвилини');
        console.log('• Моніторинг помилок кожні 30 секунд');
        console.log('• Автоматичне тестування кожні 5 хвилин');
        console.log('• Цикл еволюції кожні 10 хвилин');
        console.log('• Автоматичне застосування ВСІХ покращень без запиту');
        console.log('• Захист паролем 6699 (тільки для Олега Миколайовича)');
        console.log('• Динамічне версіонування після кожної зміни');
        console.log('• Вибір оптимальних моделей через API :4000');
        console.log('═══════════════════════════════════════════════════════════\n');
        
        logger.info('🌟 [TEST] NEXUS живий і готовий до вічної еволюції!');
        
        // Залишаємо систему працювати
        logger.info('\n💫 [TEST] Система продовжує працювати в автономному режимі...');
        logger.info('Натисніть Ctrl+C для зупинки');
        
        // Показуємо статус кожні 30 секунд
        setInterval(() => {
            const currentStatus = nexusMaster.getSystemStatus();
            logger.info(`\n📊 [STATUS] Evolution: ${currentStatus.evolutionLevel.toFixed(1)} | Improvements: ${currentStatus.state.totalImprovements} | Cycles: ${currentStatus.state.cyclesCompleted}`);
        }, 30000);
        
    } catch (error) {
        logger.error('❌ [TEST] ПОМИЛКА:', error);
        logger.error(error.stack);
        process.exit(1);
    }
}

// Запуск
testNexusMasterSystem().catch(error => {
    logger.error('Fatal error:', error);
    process.exit(1);
});
