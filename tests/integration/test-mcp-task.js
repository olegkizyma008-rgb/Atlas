/**
 * Тест виконання завдання через Atlas4 Chat API
 * Перевіряє чи MCP filesystem може виконати просте завдання
 */

import axios from 'axios';
import path from 'path';
import os from 'os';

const ORCHESTRATOR_URL = 'http://localhost:5101';
const DESKTOP_PATH = path.join(os.homedir(), 'Desktop');
const TEST_FILE = path.join(DESKTOP_PATH, 'test_atlas_mcp.txt');

async function testMCPTask() {
    console.log('🧪 Тест виконання MCP завдання через Atlas4');
    console.log('=' .repeat(70));
    console.log(`Файл: ${TEST_FILE}\n`);
    
    try {
        // Відправка завдання через chat API
        console.log('📤 Відправка завдання на виконання...\n');
        
        const response = await axios.post(
            `${ORCHESTRATOR_URL}/chat/stream`,
            {
                message: `Створи файл test_atlas_mcp.txt на робочому столі з текстом "Atlas4 MCP працює!"`,
                sessionId: `test-mcp-${Date.now()}`
            },
            {
                responseType: 'stream',
                timeout: 120000 // 2 хвилини
            }
        );
        
        console.log('📡 Отримання відповіді від Atlas4...\n');
        
        let fullResponse = '';
        let lastEvent = null;
        
        // Обробка SSE потоку
        for await (const chunk of response.data) {
            const lines = chunk.toString().split('\n');
            
            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    try {
                        const data = JSON.parse(line.substring(6));
                        lastEvent = data;
                        
                        // Логування важливих подій
                        if (data.type === 'stage') {
                            console.log(`   🔄 Етап: ${data.agent} - ${data.stage}`);
                        } else if (data.type === 'tool_execution') {
                            console.log(`   🛠️  Інструмент: ${data.server}__${data.tool}`);
                        } else if (data.type === 'verification') {
                            console.log(`   ✓ Верифікація: ${data.verified ? 'УСПІШНО' : 'ПОМИЛКА'}`);
                            if (data.reason) {
                                console.log(`      Причина: ${data.reason}`);
                            }
                        } else if (data.type === 'complete') {
                            console.log(`   ✅ Завершено: ${data.message || 'OK'}`);
                        } else if (data.type === 'error') {
                            console.log(`   ❌ Помилка: ${data.message}`);
                        }
                        
                        fullResponse += JSON.stringify(data) + '\n';
                    } catch (e) {
                        // Ігноруємо помилки парсингу
                    }
                }
            }
        }
        
        console.log('\n' + '='.repeat(70));
        console.log('📊 РЕЗУЛЬТАТ:');
        console.log('='.repeat(70));
        
        // Перевірка чи файл створено через Node.js fs
        const fs = await import('fs');
        const fileExists = fs.existsSync(TEST_FILE);
        
        console.log(`\nФайл створено: ${fileExists ? '✅ ТАК' : '❌ НІ'}`);
        
        if (fileExists) {
            const content = fs.readFileSync(TEST_FILE, 'utf-8');
            console.log(`Вміст файлу: "${content}"`);
            
            const contentOk = content.includes('Atlas4') || content.includes('MCP');
            console.log(`Вміст правильний: ${contentOk ? '✅ ТАК' : '❌ НІ'}`);
            
            if (lastEvent?.type === 'complete') {
                console.log('\n🎉 ТЕСТ ПРОЙДЕНО!');
                console.log('✅ Atlas4 успішно виконав завдання через MCP');
                return true;
            }
        }
        
        console.log('\n⚠️  Файл не створено або завдання не виконано');
        console.log('Останя подія:', lastEvent);
        return false;
        
    } catch (error) {
        console.error('\n❌ ПОМИЛКА:', error.message);
        if (error.response) {
            console.error('Статус:', error.response.status);
            console.error('Дані:', error.response.data);
        }
        return false;
    }
}

// Запуск
console.log('🚀 Запуск тесту...\n');

testMCPTask()
    .then(success => {
        console.log('\n' + '='.repeat(70));
        console.log(success ? '✅ УСПІХ' : '❌ НЕВДАЧА');
        console.log('='.repeat(70));
        process.exit(success ? 0 : 1);
    })
    .catch(error => {
        console.error('Критична помилка:', error);
        process.exit(1);
    });
