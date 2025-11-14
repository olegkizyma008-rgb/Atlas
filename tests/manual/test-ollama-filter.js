/**
 * Тест фільтрації Ollama моделей в Nexus Registry
 */

import { NexusModelRegistry } from './orchestrator/eternity/nexus-model-registry.js';
import fs from 'fs';
import path from 'path';

// Читаємо .env вручну
const envPath = path.join(process.cwd(), '.env');
const envContent = fs.readFileSync(envPath, 'utf-8');
envContent.split('\n').forEach(line => {
    const match = line.match(/^([A-Z_]+)=(.*)$/);
    if (match) {
        process.env[match[1]] = match[2];
    }
});

async function testOllamaFilter() {
    console.log('\n🧪 ТЕСТУВАННЯ ФІЛЬТРАЦІЇ OLLAMA МОДЕЛЕЙ\n');
    console.log('═'.repeat(60));
    
    // Перевірка ENV параметру
    console.log('\n1️⃣ Перевірка ENV параметру:');
    console.log(`   NEXUS_EXCLUDE_OLLAMA = "${process.env.NEXUS_EXCLUDE_OLLAMA}"`);
    console.log(`   Тип: ${typeof process.env.NEXUS_EXCLUDE_OLLAMA}`);
    console.log(`   Буле значення: ${process.env.NEXUS_EXCLUDE_OLLAMA === 'true'}`);
    
    // Ініціалізація registry
    console.log('\n2️⃣ Ініціалізація Nexus Model Registry:');
    const registry = new NexusModelRegistry();
    await registry.initialize();
    
    // Отримання списку моделей
    console.log('\n3️⃣ Список доступних моделей:');
    const models = registry.availableModels;
    console.log(`   Всього моделей: ${models.length}`);
    
    // Фільтрація Ollama моделей
    const ollamaModels = models.filter(m => m.id.toLowerCase().includes('ollama'));
    const nonOllamaModels = models.filter(m => !m.id.toLowerCase().includes('ollama'));
    
    console.log(`   Ollama моделей: ${ollamaModels.length}`);
    console.log(`   Не-Ollama моделей: ${nonOllamaModels.length}`);
    
    if (ollamaModels.length > 0) {
        console.log('\n   Ollama моделі в списку:');
        ollamaModels.slice(0, 5).forEach(m => {
            console.log(`   - ${m.id}`);
        });
    }
    
    // Тест вибору моделі для різних завдань
    console.log('\n4️⃣ Тест вибору моделей для різних завдань:');
    
    const taskTypes = [
        'code-analysis',
        'bug-fixing',
        'data-collection',
        'strategic-planning'
    ];
    
    for (const taskType of taskTypes) {
        const selectedModel = registry.selectModelForTask(taskType);
        const isOllama = selectedModel.id.toLowerCase().includes('ollama');
        const status = isOllama ? '❌ OLLAMA ВИБРАНО (помилка!)' : '✅ Не-Ollama';
        
        console.log(`\n   ${taskType}:`);
        console.log(`   Модель: ${selectedModel.id}`);
        console.log(`   Статус: ${status}`);
    }
    
    // Результат
    console.log('\n═'.repeat(60));
    console.log('\n📊 РЕЗУЛЬТАТ:');
    
    if (process.env.NEXUS_EXCLUDE_OLLAMA === 'true') {
        const selectedOllama = taskTypes.some(t => {
            const m = registry.selectModelForTask(t);
            return m.id.toLowerCase().includes('ollama');
        });
        
        if (selectedOllama) {
            console.log('   ❌ ТЕСТ НЕ ПРОЙШОВ: Ollama моделі використовуються для самовдосконалення');
        } else {
            console.log('   ✅ ТЕСТ ПРОЙШОВ: Ollama моделі виключені з самовдосконалення');
        }
    } else {
        console.log('   ℹ️  NEXUS_EXCLUDE_OLLAMA=false - Ollama моделі дозволені');
    }
    
    console.log('\n');
    registry.shutdown();
}

testOllamaFilter().catch(console.error);
