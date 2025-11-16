#!/usr/bin/env node

import axios from 'axios';

const API_URL = 'http://localhost:5101/chat/stream';

async function test() {
    console.log('🚀 Тестування потоку...\n');

    try {
        const response = await axios.post(
            API_URL,
            {
                message: 'Обчисли: 42 × 17',
                sessionId: `test-${Date.now()}`
            },
            {
                timeout: 30000,
                responseType: 'stream'
            }
        );

        console.log('✅ Статус:', response.status);
        console.log('📊 Headers:', response.headers);
        console.log('\n📨 Потік даних:\n');

        let lineCount = 0;
        let messageCount = 0;

        response.data.on('data', (chunk) => {
            const text = chunk.toString();
            console.log(text);

            // Count lines
            const lines = text.split('\n').filter(l => l.trim());
            lineCount += lines.length;

            // Count messages
            if (text.includes('type: "message"')) {
                messageCount++;
            }
        });

        response.data.on('end', () => {
            console.log('\n✅ Потік завершено!');
            console.log(`📊 Всього рядків: ${lineCount}`);
            console.log(`📊 Повідомлень: ${messageCount}`);
        });

        response.data.on('error', (error) => {
            console.error('❌ Помилка потоку:', error.message);
        });

    } catch (error) {
        console.error('❌ Помилка:', error.message);
        if (error.response) {
            console.error('📊 Статус:', error.response.status);
        }
    }
}

test();
