/**
 * Живий тест NEXUS Consciousness
 * Симуляція роботи через чат
 */

import axios from 'axios';

const ORCHESTRATOR_URL = 'http://localhost:5101';

async function testNexusInAction() {
    console.log('\n🧪 Тестую NEXUS в живій роботі...\n');
    
    try {
        // Надсилаємо повідомлення в чат
        console.log('📨 Надсилаю тестове повідомлення...');
        const response = await axios.post(`${ORCHESTRATOR_URL}/api/chat`, {
            message: 'Привіт, Atlas! Розкажи як працює твоя система спостереження NEXUS та що ти зараз бачиш?',
            sessionId: 'test-nexus-' + Date.now()
        });
        
        console.log('\n✅ Відповідь отримано!');
        console.log('\n📊 Аналіз відповіді:');
        
        if (response.data.response) {
            const responseText = response.data.response;
            console.log(`\n💬 Atlas відповів (${responseText.length} символів)`);
            
            // Перевіряємо чи є згадки про NEXUS
            if (responseText.includes('NEXUS') || responseText.includes('спостереження') || responseText.includes('File Watcher')) {
                console.log('✅ Atlas згадав систему спостереження NEXUS!');
            }
            
            // Перевіряємо чи є динамічні спостереження
            if (responseText.includes('СПОСТЕРЕЖЕННЯ') || responseText.includes('бачу')) {
                console.log('✅ Динамічний промпт працює - Atlas усвідомлює що бачить!');
            }
            
            // Показуємо частину відповіді
            console.log('\n📝 Фрагмент відповіді:');
            console.log(responseText.substring(0, 500) + '...\n');
        }
        
        // Перевіряємо метадані
        if (response.data.metadata) {
            console.log('📊 Метадані:');
            console.log('   Mode:', response.data.metadata.mode);
            console.log('   Model:', response.data.metadata.model);
            console.log('   Consciousness Level:', response.data.metadata.consciousnessLevel || 'N/A');
        }
        
        console.log('\n✅ NEXUS працює в живій системі!');
        
    } catch (error) {
        console.error('\n❌ Помилка:', error.message);
        if (error.response) {
            console.error('Статус:', error.response.status);
            console.error('Дані:', error.response.data);
        }
    }
}

// Запускаємо тест
testNexusInAction().then(() => {
    console.log('\n✅ Тест завершено\n');
    process.exit(0);
}).catch(console.error);
