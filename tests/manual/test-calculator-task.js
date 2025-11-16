#!/usr/bin/env node

/**
 * Test Calculator Task
 * Тестування системи на обробку завдань калькулятора
 */

import axios from 'axios';

const API_URL = 'http://localhost:5101/chat/stream';

const testTasks = [
    {
        name: 'Простое множение',
        message: 'Обчисли: 42 × 17'
    },
    {
        name: 'Складное выражение',
        message: 'Скільки буде (100 + 50) * 2 - 30?'
    },
    {
        name: 'Дробовое число',
        message: 'Поділи 100 на 3 і округли до 2 знаків'
    },
    {
        name: 'Процент',
        message: 'Скільки це 25% від 800?'
    }
];

async function runTest(task) {
    console.log(`\n📝 Тест: ${task.name}`);
    console.log(`📨 Запит: "${task.message}"`);
    console.log('⏳ Обробка...');

    try {
        const response = await axios.post(
            API_URL,
            {
                message: task.message,
                sessionId: `test-${Date.now()}`
            },
            {
                timeout: 30000,
                headers: {
                    'Content-Type': 'application/json'
                },
                responseType: 'stream'
            }
        );

        console.log('✅ Статус:', response.status);

        let fullResponse = '';
        let messageCount = 0;

        response.data.on('data', (chunk) => {
            const lines = chunk.toString().split('\n');

            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    try {
                        const jsonStr = line.substring(6);
                        const data = JSON.parse(jsonStr);

                        if (data.type === 'message') {
                            fullResponse += data.content;
                            messageCount++;
                        } else if (data.type === 'error') {
                            console.error('❌ Помилка від сервера:', data.error);
                        }
                    } catch (e) {
                        // Ігноруємо keepalive та інші non-JSON дані
                    }
                }
            }
        });

        return new Promise((resolve, reject) => {
            response.data.on('end', () => {
                console.log('📤 Відповідь:', fullResponse || '(порожня)');
                console.log('📊 Повідомлень отримано:', messageCount);
                resolve();
            });

            response.data.on('error', (error) => {
                console.error('❌ Помилка потоку:', error.message);
                reject(error);
            });
        });
    } catch (error) {
        console.error('❌ Помилка:', error.message);
        if (error.response) {
            console.error('📊 Статус:', error.response.status);
        }
    }
}

async function main() {
    console.log('🚀 Запуск тестів калькулятора...\n');

    for (const task of testTasks) {
        await runTest(task);
        await new Promise(resolve => setTimeout(resolve, 2000)); // Затримка між тестами
    }

    console.log('\n✅ Всі тести завершені!');
}

main().catch(console.error);
