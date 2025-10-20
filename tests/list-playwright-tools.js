#!/usr/bin/env node

/**
 * Скрипт для отримання списку інструментів Playwright MCP сервера
 * 
 * Запуск: node tests/list-playwright-tools.js
 */

import { MCPManager } from '../orchestrator/ai/mcp-manager.js';
import GlobalConfig from '../config/global-config.js';
import fs from 'fs';

async function listPlaywrightTools() {
  console.log('🔍 Отримання списку Playwright інструментів...\n');

  try {
    // Отримати конфігурацію MCP серверів
    const serversConfig = GlobalConfig.AI_BACKEND_CONFIG?.providers?.mcp?.servers || {};
    
    console.log('📋 Конфігурація Playwright:');
    console.log(`   Пакет: ${serversConfig.playwright.args[1]}`);
    console.log(`   Headless: ${serversConfig.playwright.env.HEADLESS}\n`);

    // Створити MCPManager
    const mcpManager = new MCPManager(serversConfig);
    
    // Ініціалізувати (запустити сервери)
    console.log('🚀 Запуск Playwright MCP сервера...');
    await mcpManager.initialize();
    
    // Почекати на готовність
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Отримати статус
    const status = mcpManager.getStatus();
    console.log(`✅ Playwright: ${status.playwright.ready ? 'Ready' : 'Not Ready'}`);
    console.log(`   Інструментів: ${status.playwright.tools}\n`);

    if (!status.playwright.ready || status.playwright.tools === 0) {
      throw new Error('Playwright сервер не готовий або не має інструментів');
    }

    // Отримати детальний список інструментів
    const toolsSummary = mcpManager.getDetailedToolsSummary(['playwright']);
    
    console.log('=' .repeat(80));
    console.log('📚 СПИСОК PLAYWRIGHT ІНСТРУМЕНТІВ');
    console.log('='.repeat(80));
    console.log(toolsSummary);
    console.log('='.repeat(80));

    // Отримати список інструментів для збереження
    const tools = mcpManager.getToolsFromServers(['playwright']);
    
    // Зберегти у JSON
    const outputPath = 'tests/playwright-tools-list.json';
    fs.writeFileSync(outputPath, JSON.stringify({
      server: 'playwright',
      package: '@executeautomation/playwright-mcp-server',
      total_tools: tools.length,
      tools: tools.map(t => ({
        name: t.name,
        description: t.description,
        inputSchema: t.inputSchema
      }))
    }, null, 2));

    console.log(`\n💾 Список збережено: ${outputPath}`);
    console.log(`\n📊 Статистика:`);
    console.log(`   Всього інструментів: ${tools.length}`);
    
    // Групування за типами
    const types = {};
    tools.forEach(t => {
      const prefix = t.name.split('_')[0];
      types[prefix] = (types[prefix] || 0) + 1;
    });
    
    console.log(`   Групи:`);
    Object.entries(types).forEach(([type, count]) => {
      console.log(`     - ${type}: ${count} tools`);
    });

    // Зупинити сервери
    console.log('\n🛑 Зупинка серверів...');
    await mcpManager.stopAllServers();
    
    console.log('✅ Готово!\n');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Помилка:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

listPlaywrightTools();
