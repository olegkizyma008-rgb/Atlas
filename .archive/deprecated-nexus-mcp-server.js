#!/usr/bin/env node
/**
 * NEXUS MCP SERVER - Meta-server для Self-Improvement Engine
 * Об'єднує: Windsurf API + Memory MCP + Java SDK + Python SDK
 * 
 * Створено: 2025-11-03
 * Автор: Oleg Mykolayovych + Cascade AI
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { 
  CallToolRequestSchema,
  ListToolsRequestSchema 
} from '@modelcontextprotocol/sdk/types.js';

/**
 * Nexus MCP Server - агрегатор для self-improvement
 */
class NexusMCPServer {
  constructor() {
    this.server = new Server(
      {
        name: 'nexus-self-improvement',
        version: '1.0.0'
      },
      {
        capabilities: {
          tools: {}
        }
      }
    );

    this.setupToolHandlers();
    this.setupErrorHandling();
  }

  /**
   * Налаштування обробників інструментів
   */
  setupToolHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        // ===== WINDSURF API TOOLS =====
        {
          name: 'nexus__analyze_code',
          description: 'Проаналізувати код на баги через Windsurf Cascade API',
          inputSchema: {
            type: 'object',
            properties: {
              file_path: {
                type: 'string',
                description: 'Шлях до файлу для аналізу'
              },
              analysis_type: {
                type: 'string',
                enum: ['bugs', 'performance', 'security', 'all'],
                description: 'Тип аналізу'
              }
            },
            required: ['file_path']
          }
        },
        {
          name: 'nexus__fix_code',
          description: 'Виправити баги в коді через Windsurf API',
          inputSchema: {
            type: 'object',
            properties: {
              file_path: {
                type: 'string',
                description: 'Шлях до файлу'
              },
              problems: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    line: { type: 'number' },
                    description: { type: 'string' },
                    severity: { type: 'string' }
                  }
                },
                description: 'Список проблем для виправлення'
              }
            },
            required: ['file_path', 'problems']
          }
        },

        // ===== MEMORY MCP TOOLS =====
        {
          name: 'nexus__save_context',
          description: 'Зберегти контекст проблем в Memory MCP для persistence',
          inputSchema: {
            type: 'object',
            properties: {
              context_type: {
                type: 'string',
                enum: ['bug', 'improvement', 'analysis'],
                description: 'Тип контексту'
              },
              data: {
                type: 'object',
                description: 'Дані для збереження'
              }
            },
            required: ['context_type', 'data']
          }
        },
        {
          name: 'nexus__retrieve_context',
          description: 'Отримати збережений контекст з Memory MCP',
          inputSchema: {
            type: 'object',
            properties: {
              context_type: {
                type: 'string',
                description: 'Тип контексту для пошуку'
              },
              limit: {
                type: 'number',
                description: 'Максимальна кількість результатів'
              }
            },
            required: ['context_type']
          }
        },

        // ===== JAVA SDK TOOLS =====
        {
          name: 'nexus__analyze_java',
          description: 'Проаналізувати Java код (Maven, Gradle, JUnit)',
          inputSchema: {
            type: 'object',
            properties: {
              project_path: {
                type: 'string',
                description: 'Шлях до Java проекту'
              },
              analysis_type: {
                type: 'string',
                enum: ['compile', 'test', 'dependencies', 'all'],
                description: 'Тип аналізу'
              }
            },
            required: ['project_path']
          }
        },

        // ===== PYTHON SDK TOOLS =====
        {
          name: 'nexus__analyze_python',
          description: 'Проаналізувати Python код (pip, poetry, pytest)',
          inputSchema: {
            type: 'object',
            properties: {
              project_path: {
                type: 'string',
                description: 'Шлях до Python проекту'
              },
              analysis_type: {
                type: 'string',
                enum: ['syntax', 'imports', 'tests', 'dependencies', 'all'],
                description: 'Тип аналізу'
              }
            },
            required: ['project_path']
          }
        },

        // ===== ORCHESTRATOR TOOL =====
        {
          name: 'nexus__self_improve',
          description: 'Запустити повний цикл self-improvement (аналіз + виправлення + збереження)',
          inputSchema: {
            type: 'object',
            properties: {
              target: {
                type: 'string',
                description: 'Ціль для покращення (file path або project path)'
              },
              scope: {
                type: 'string',
                enum: ['file', 'project', 'system'],
                description: 'Обсяг аналізу'
              },
              auto_fix: {
                type: 'boolean',
                description: 'Автоматично виправити знайдені проблеми'
              }
            },
            required: ['target']
          }
        }
      ]
    }));

    // Call tool handler
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'nexus__analyze_code':
            return await this.analyzeCode(args);
          
          case 'nexus__fix_code':
            return await this.fixCode(args);
          
          case 'nexus__save_context':
            return await this.saveContext(args);
          
          case 'nexus__retrieve_context':
            return await this.retrieveContext(args);
          
          case 'nexus__analyze_java':
            return await this.analyzeJava(args);
          
          case 'nexus__analyze_python':
            return await this.analyzePython(args);
          
          case 'nexus__self_improve':
            return await this.selfImprove(args);
          
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `Error: ${error.message}`
          }],
          isError: true
        };
      }
    });
  }

  /**
   * WINDSURF API: Аналіз коду
   */
  async analyzeCode(args) {
    const { file_path, analysis_type = 'all' } = args;
    
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          action: 'delegate_to_api',
          endpoint: 'http://localhost:5101/api/cascade/self-analysis',
          method: 'POST',
          body: {
            scope: 'file',
            file: file_path,
            analysis_type
          }
        })
      }]
    };
  }

  /**
   * WINDSURF API: Виправлення коду
   */
  async fixCode(args) {
    const { file_path, problems } = args;
    
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          action: 'delegate_to_api',
          endpoint: 'http://localhost:5101/api/eternity',
          method: 'POST',
          body: {
            problems: problems.map(p => ({
              file: file_path,
              line: p.line,
              description: p.description,
              severity: p.severity
            })),
            context: { source: 'nexus_mcp' }
          }
        })
      }]
    };
  }

  /**
   * MEMORY MCP: Збереження контексту
   */
  async saveContext(args) {
    const { context_type, data } = args;
    
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          action: 'delegate_to_mcp',
          server: 'memory',
          tool: 'memory__create_entities',
          arguments: {
            entities: [{
              name: `${context_type}_${Date.now()}`,
              entityType: context_type,
              observations: [JSON.stringify(data)]
            }]
          }
        })
      }]
    };
  }

  /**
   * MEMORY MCP: Отримання контексту
   */
  async retrieveContext(args) {
    const { context_type, limit = 10 } = args;
    
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          action: 'delegate_to_mcp',
          server: 'memory',
          tool: 'memory__search_entities',
          arguments: {
            entityType: context_type,
            limit
          }
        })
      }]
    };
  }

  /**
   * JAVA SDK: Аналіз Java коду
   */
  async analyzeJava(args) {
    const { project_path, analysis_type = 'all' } = args;
    
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          action: 'delegate_to_mcp',
          server: 'java_sdk',
          tool: 'java_sdk__analyze',
          arguments: {
            project_path,
            analysis_type
          }
        })
      }]
    };
  }

  /**
   * PYTHON SDK: Аналіз Python коду
   */
  async analyzePython(args) {
    const { project_path, analysis_type = 'all' } = args;
    
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          action: 'delegate_to_mcp',
          server: 'python_sdk',
          tool: 'python_sdk__analyze',
          arguments: {
            project_path,
            analysis_type
          }
        })
      }]
    };
  }

  /**
   * ORCHESTRATOR: Повний цикл self-improvement
   */
  async selfImprove(args) {
    const { target, scope = 'file', auto_fix = false } = args;
    
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          action: 'orchestrate',
          steps: [
            {
              step: 1,
              action: 'analyze',
              tool: scope === 'file' ? 'nexus__analyze_code' : 'nexus__analyze_project',
              args: { target }
            },
            {
              step: 2,
              action: 'save_context',
              tool: 'nexus__save_context',
              args: { context_type: 'analysis', data: '{{step1_result}}' }
            },
            {
              step: 3,
              action: 'fix',
              tool: 'nexus__fix_code',
              args: { file_path: target, problems: '{{step1_problems}}' },
              condition: auto_fix
            }
          ]
        })
      }]
    };
  }

  /**
   * Налаштування обробки помилок
   */
  setupErrorHandling() {
    this.server.onerror = (error) => {
      console.error('[NEXUS-MCP] Error:', error);
    };

    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  /**
   * Запуск сервера
   */
  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('[NEXUS-MCP] Server running on stdio');
  }
}

// Запуск сервера
const server = new NexusMCPServer();
server.run().catch(console.error);
