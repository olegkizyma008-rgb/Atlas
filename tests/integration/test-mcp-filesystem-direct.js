/**
 * Тест прямого виклику MCP filesystem
 * Виконує завдання створення файлу test_atlas.txt через MCP без LLM
 */

import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DESKTOP_PATH = path.join(os.homedir(), 'Desktop');
const TEST_FILE = path.join(DESKTOP_PATH, 'test_atlas.txt');
const TEST_CONTENT = 'Atlas4 працює!';

async function testMCP() {
    console.log('🧪 Тест MCP Filesystem - Пряме виконання');
    console.log('=' .repeat(70));
    
    try {
        // Імпорт DI контейнера
        const diPath = path.resolve(__dirname, '../../orchestrator/core/di-container.js');
        const { container } = await import(diPath);
        
        const tetyanaToolSystem = container.resolve('tetyanaToolSystem');
        if (!tetyanaToolSystem) {
            throw new Error('TetyanaToolSystem не доступний');
        }
        
        console.log('✅ TetyanaToolSystem підключено\n');
        
        // Крок 1: Запис файлу
        console.log('📝 Крок 1: Створення файлу...');
        console.log(`   Файл: ${TEST_FILE}`);
        console.log(`   Вміст: "${TEST_CONTENT}"\n`);
        
        const writeResult = await tetyanaToolSystem.executeToolCalls([{
            server: 'filesystem',
            tool: 'write_file',
            parameters: { path: TEST_FILE, content: TEST_CONTENT }
        }]);
        
        console.log('Результат запису:', JSON.stringify(writeResult, null, 2));
        
        // Крок 2: Перевірка існування
        console.log('\n🔍 Крок 2: Перевірка існування...\n');
        
        const infoResult = await tetyanaToolSystem.executeToolCalls([{
            server: 'filesystem',
            tool: 'get_file_info',
            parameters: { path: TEST_FILE }
        }]);
        
        console.log('Результат перевірки:', JSON.stringify(infoResult, null, 2));
        
        // Крок 3: Читання вмісту
        console.log('\n📖 Крок 3: Читання вмісту...\n');
        
        const readResult = await tetyanaToolSystem.executeToolCalls([{
            server: 'filesystem',
            tool: 'read_file',
            parameters: { path: TEST_FILE }
        }]);
        
        console.log('Результат читання:', JSON.stringify(readResult, null, 2));
        
        // Аналіз
        console.log('\n' + '='.repeat(70));
        console.log('📊 ПІДСУМОК:');
        console.log('='.repeat(70));
        
        const writeOk = writeResult.all_successful && writeResult.results?.[0]?.success;
        const fileExists = infoResult.all_successful && infoResult.results?.[0]?.success;
        const readOk = readResult.all_successful && readResult.results?.[0]?.success;
        const contentOk = readResult.results?.[0]?.data?.content?.includes(TEST_CONTENT);
        
        console.log(`Запис:    ${writeOk ? '✅' : '❌'}`);
        console.log(`Існує:    ${fileExists ? '✅' : '❌'}`);
        console.log(`Читання:  ${readOk ? '✅' : '❌'}`);
        console.log(`Вміст:    ${contentOk ? '✅' : '❌'}`);
        
        const success = writeOk && fileExists && readOk && contentOk;
        console.log('\n' + (success ? '🎉 УСПІХ - MCP працює!' : '❌ ПОМИЛКА - MCP не працює'));
        
        return success;
        
    } catch (error) {
        console.error('\n❌ ПОМИЛКА:', error.message);
        console.error(error.stack);
        return false;
    }
}

testMCP().then(ok => process.exit(ok ? 0 : 1));
