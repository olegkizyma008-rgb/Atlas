/**
 * Прямий тест MCP filesystem
 * Використовує MCPExtensionManager напряму
 */

import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import MCPExtensionManager from '../../orchestrator/ai/mcp-extension-manager.js';
import logger from '../../orchestrator/utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DESKTOP_PATH = path.join(os.homedir(), 'Desktop');
const TEST_FILE = path.join(DESKTOP_PATH, 'test_atlas_mcp.txt');
const TEST_CONTENT = 'Atlas4 MCP тест - файл створено успішно!';

async function testMCPDirect() {
    console.log('🧪 Прямий тест MCP Filesystem');
    console.log('=' .repeat(70));
    
    const mcpManager = new MCPExtensionManager();
    
    try {
        // Ініціалізація MCP
        console.log('\n⚙️  Ініціалізація MCP Extension Manager...');
        await mcpManager.initialize();
        console.log('✅ MCP ініціалізовано\n');
        
        // Список доступних серверів
        const servers = mcpManager.listExtensions();
        console.log('📋 Доступні MCP сервери:', servers.map(s => s.name).join(', '));
        
        const filesystemTools = mcpManager.listTools('filesystem');
        console.log(`📋 Filesystem інструменти (${filesystemTools.length}):`, 
                    filesystemTools.slice(0, 5).map(t => t.name).join(', ') + '...\n');
        
        // Крок 1: Створення файлу
        console.log('📝 Крок 1: Створення файлу через filesystem__write_file');
        console.log(`   Файл: ${TEST_FILE}`);
        console.log(`   Вміст: "${TEST_CONTENT}"`);
        
        const writeResult = await mcpManager.executeTool('filesystem', 'write_file', {
            path: TEST_FILE,
            content: TEST_CONTENT
        });
        
        console.log('\n   Результат:', JSON.stringify(writeResult, null, 2));
        
        // Крок 2: Перевірка файлу
        console.log('\n🔍 Крок 2: Перевірка через filesystem__get_file_info');
        
        const infoResult = await mcpManager.executeTool('filesystem', 'get_file_info', {
            path: TEST_FILE
        });
        
        console.log('\n   Результат:', JSON.stringify(infoResult, null, 2));
        
        // Крок 3: Читання вмісту
        console.log('\n📖 Крок 3: Читання через filesystem__read_file');
        
        const readResult = await mcpManager.executeTool('filesystem', 'read_file', {
            path: TEST_FILE
        });
        
        console.log('\n   Результат:', JSON.stringify(readResult, null, 2));
        
        // Аналіз
        console.log('\n' + '='.repeat(70));
        console.log('📊 АНАЛІЗ РЕЗУЛЬТАТІВ:');
        console.log('='.repeat(70));
        
        const writeOk = writeResult?.isContent || writeResult?.content;
        const infoOk = infoResult?.isContent && infoResult?.content?.exists;
        const readOk = readResult?.isContent || readResult?.content;
        const contentMatches = readResult?.content?.content?.includes(TEST_CONTENT) || 
                              readResult?.content?.includes(TEST_CONTENT);
        
        console.log(`\n1. Запис файлу:      ${writeOk ? '✅ УСПІШНО' : '❌ ПОМИЛКА'}`);
        console.log(`2. Файл існує:       ${infoOk ? '✅ ТАК' : '❌ НІ'}`);
        if (infoResult?.content) {
            console.log(`   - Тип: ${infoResult.content.type || 'file'}`);
            console.log(`   - Розмір: ${infoResult.content.size || 0} байт`);
        }
        console.log(`3. Читання файлу:    ${readOk ? '✅ УСПІШНО' : '❌ ПОМИЛКА'}`);
        console.log(`4. Вміст відповідає: ${contentMatches ? '✅ ТАК' : '❌ НІ'}`);
        
        const allOk = writeOk && infoOk && readOk && contentMatches;
        
        console.log('\n' + '='.repeat(70));
        if (allOk) {
            console.log('🎉 ТЕСТ ПРОЙДЕНО УСПІШНО!');
            console.log(`✅ Файл створено: ${TEST_FILE}`);
            console.log('✅ MCP filesystem працює коректно');
        } else {
            console.log('❌ ТЕСТ НЕ ПРОЙДЕНО');
            console.log('Проблеми:');
            if (!writeOk) console.log('  - Не вдалось записати файл');
            if (!infoOk) console.log('  - Файл не знайдено');
            if (!readOk) console.log('  - Не вдалось прочитати');
            if (!contentMatches) console.log('  - Вміст не відповідає');
        }
        console.log('='.repeat(70));
        
        return allOk;
        
    } catch (error) {
        console.error('\n❌ ПОМИЛКА:', error.message);
        console.error(error.stack);
        return false;
    } finally {
        // Очистка
        if (mcpManager) {
            await mcpManager.cleanup();
        }
    }
}

// Запуск
testMCPDirect().then(ok => {
    process.exit(ok ? 0 : 1);
}).catch(err => {
    console.error('Критична помилка:', err);
    process.exit(1);
});
