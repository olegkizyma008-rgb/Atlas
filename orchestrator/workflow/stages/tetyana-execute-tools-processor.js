/**
 * @fileoverview Tetyana Execute Tools Processor (Stage 2.2-MCP)
 * Executes planned MCP tool calls for TODO items
 * 
 * UPDATED 2025-10-20: Integrated Goose-inspired execution system
 * - Uses TetyanaToolSystem for precise tool execution
 * - Automatic security inspection before execution
 * - Better error handling and result formatting
 * - Step-by-step execution mode with validation
 * 
 * @version 5.0.0
 * @date 2025-10-20
 */

import logger from '../../utils/logger.js';

/**
 * Tetyana Execute Tools Processor
 * 
 * Executes MCP tool calls planned in Stage 2.1:
 * - Calls each tool sequentially
 * - Collects results from all calls
 * - Handles errors gracefully
 * - Reports execution success/failure
 */
export class TetyanaExecuteToolsProcessor {
    /**
     * @param {Object} dependencies
     * @param {Object} dependencies.mcpTodoManager - MCPTodoManager instance
     * @param {Object} dependencies.mcpManager - MCPManager instance for tool execution
     * @param {Object} dependencies.tetyanaToolSystem - NEW: TetyanaToolSystem instance
     * @param {Object} dependencies.logger - Logger instance
     */
    constructor({ mcpTodoManager, mcpManager, tetyanaToolSystem, logger: loggerInstance }) {
        this.mcpTodoManager = mcpTodoManager;
        this.mcpManager = mcpManager;
        this.tetyanaToolSystem = tetyanaToolSystem;
        this.logger = loggerInstance || logger;
    }

    /**
     * Execute planned tools for TODO item
     * 
     * NEW 2025-10-18: Supports step-by-step execution mode
     * 
     * @param {Object} context - Stage context
     * @param {Object} context.currentItem - Current TODO item
     * @param {Object} context.plan - Tool plan from Stage 2.1
     * @param {Object} context.todo - Full TODO list
     * @returns {Promise<Object>} Execution result
     */
    async execute(context) {
        this.logger.system('tetyana-execute-tools', '[STAGE-2.2-MCP] ⚙️ Executing tools...');

        const { currentItem, plan, todo } = context;

        if (!currentItem) {
            throw new Error('currentItem is required for tool execution');
        }

        if (!plan || !plan.tool_calls) {
            throw new Error('plan with tool_calls is required for execution');
        }

        try {
            this.logger.system('tetyana-execute-tools', `[STAGE-2.2-MCP] Item: ${currentItem.id}. ${currentItem.action}`);
            this.logger.system('tetyana-execute-tools', `[STAGE-2.2-MCP] Executing ${plan.tool_calls.length} tool call(s)...`);

            // NEW 2025-10-29: Detect if tools can be executed in parallel
            const canExecuteParallel = this._canExecuteParallel(plan.tool_calls);
            
            // NEW 2025-10-20: Use TetyanaToolSystem for execution with inspection
            let executionResult;
            
            if (this.tetyanaToolSystem) {
                this.logger.system('tetyana-execute-tools', '[STAGE-2.2-MCP] 🎯 Using TetyanaToolSystem for execution');
                
                if (canExecuteParallel) {
                    this.logger.system('tetyana-execute-tools', '[STAGE-2.2-MCP] ⚡ PARALLEL execution mode enabled');
                    executionResult = await this._executeParallel(plan.tool_calls, { currentItem, todo });
                } else {
                    this.logger.system('tetyana-execute-tools', '[STAGE-2.2-MCP] 🔄 SEQUENTIAL execution mode (dependencies detected)');
                    // Execute through new system (includes automatic inspection)
                    executionResult = await this.tetyanaToolSystem.executeToolCalls(
                        plan.tool_calls,
                        {
                            currentItem,
                            todo,
                            autoApprove: true // Auto-approve in task mode
                        }
                    );
                }
                
                this.logger.system('tetyana-execute-tools', 
                    `[STAGE-2.2-MCP] ✅ TetyanaToolSystem execution: ${executionResult.successful_calls}/${plan.tool_calls.length} successful`);
                
            } else {
                // Fallback: Use legacy system
                this.logger.warn('tetyana-execute-tools', '[STAGE-2.2-MCP] ⚠️ TetyanaToolSystem not available, using legacy execution');
                
                const needsStepByStep = this._shouldExecuteStepByStep(plan, currentItem);
                
                if (needsStepByStep) {
                    this.logger.system('tetyana-execute-tools', '[STAGE-2.2-MCP] 🔄 Using STEP-BY-STEP execution mode');
                    executionResult = await this._executeStepByStep(plan, currentItem);
                } else {
                    this.logger.system('tetyana-execute-tools', '[STAGE-2.2-MCP] Using BATCH execution mode');
                    executionResult = await this.mcpTodoManager.executeTools(plan, currentItem);
                }
            }

            if (!executionResult) {
                throw new Error('Tool execution returned null/undefined');
            }

            // Log results
            this.logger.system('tetyana-execute-tools', `[STAGE-2.2-MCP] Execution completed`);
            this.logger.system('tetyana-execute-tools', `[STAGE-2.2-MCP]   Success: ${executionResult.all_successful ? '✅' : '❌'}`);
            this.logger.system('tetyana-execute-tools', `[STAGE-2.2-MCP]   Successful calls: ${executionResult.successful_calls || 0}`);
            this.logger.system('tetyana-execute-tools', `[STAGE-2.2-MCP]   Failed calls: ${executionResult.failed_calls || 0}`);
            
            // Log inspection results if available (from TetyanaToolSystem)
            if (executionResult.inspection) {
                const approved = executionResult.inspection.approved?.length || 0;
                const needsApproval = executionResult.inspection.needsApproval?.length || 0;
                const denied = executionResult.inspection.denied?.length || 0;
                
                this.logger.system('tetyana-execute-tools', 
                    `[STAGE-2.2-MCP]   Inspection: ${approved} approved, ` +
                    `${needsApproval} need approval, ` +
                    `${denied} denied`);
            }

            // Log individual results
            if (executionResult.results && Array.isArray(executionResult.results)) {
                for (let i = 0; i < executionResult.results.length; i++) {
                    const result = executionResult.results[i];
                    const call = plan.tool_calls[i];
                    
                    if (call) {
                        const status = result.success ? '✅' : '❌';
                        // FIXED 2025-11-03: Don't add prefix if tool already has it
                        const toolName = call.tool.includes('__') ? call.tool : `${call.server}__${call.tool}`;
                        this.logger.system('tetyana-execute-tools', `[STAGE-2.2-MCP]   ${status} ${toolName}`);
                        
                        if (!result.success && result.error) {
                            this.logger.system('tetyana-execute-tools', `[STAGE-2.2-MCP]      Error: ${result.error}`);
                        }
                    }
                }
            }

            // Generate summary
            const summary = this._generateExecutionSummary(currentItem, executionResult);

            return {
                success: executionResult.all_successful,
                execution: executionResult,
                summary,
                metadata: {
                    itemId: currentItem.id,
                    toolCount: plan.tool_calls.length,
                    successfulCalls: executionResult.successful_calls || 0,
                    failedCalls: executionResult.failed_calls || 0,
                    allSuccessful: executionResult.all_successful,
                    executionTime: executionResult.execution_time_ms
                }
            };

        } catch (error) {
            this.logger.error(`[STAGE-2.2-MCP] ❌ Execution failed: ${error.message}`, { category: 'tetyana-execute-tools', component: 'tetyana-execute-tools' });
            this.logger.error(`Stack trace: ${error.stack}`, { category: 'tetyana-execute-tools', component: 'tetyana-execute-tools' });

            return {
                success: false,
                error: error.message,
                execution: {
                    all_successful: false,
                    successful_calls: 0,
                    failed_calls: plan.tool_calls?.length || 0,
                    results: [],
                    error: error.message
                },
                summary: `❌ Не вдалося виконати "${currentItem.action}": ${error.message}`,
                metadata: {
                    itemId: currentItem.id,
                    errorType: error.name,
                    stage: 'tool-execution'
                }
            };
        }
    }

    /**
     * Generate summary of execution results
     * 
     * @param {Object} item - TODO item
     * @param {Object} execution - Execution results
     * @returns {string} Summary text
     * @private
     */
    _generateExecutionSummary(item, execution) {
        const lines = [];

        if (execution.all_successful) {
            lines.push(`✅ Виконано: "${item.action}"`);
        } else {
            lines.push(`⚠️ Часткове виконання: "${item.action}"`);
            lines.push(`   Успішно: ${execution.successful_calls || 0}`);
            lines.push(`   Помилки: ${execution.failed_calls || 0}`);
        }

        // Add key results if available
        const keyResults = this._extractKeyResults(execution.results);
        if (keyResults.length > 0) {
            lines.push('');
            lines.push('📋 Результати:');
            
            for (const result of keyResults) {
                lines.push(`   ${result}`);
            }
        }

        return lines.join('\n');
    }

    /**
     * Extract key results from execution
     * 
     * @param {Array} results - Tool execution results
     * @returns {Array<string>} Key result strings
     * @private
     */
    _extractKeyResults(results) {
        const keyResults = [];

        if (!Array.isArray(results)) {
            return keyResults;
        }

        for (const result of results) {
            if (!result.success) {
                continue;
            }

            // Extract meaningful information based on result type
            if (result.data) {
                // File written
                if (result.data.path && result.data.bytes_written) {
                    keyResults.push(`Файл збережено: ${result.data.path} (${result.data.bytes_written} байт)`);
                }
                
                // Directory created
                else if (result.data.path && result.data.created) {
                    keyResults.push(`Теку створено: ${result.data.path}`);
                }
                
                // File read
                else if (result.data.content && result.data.size) {
                    keyResults.push(`Файл прочитано: ${result.data.size} байт`);
                }
                
                // Browser opened
                else if (result.data.url && result.data.page_title) {
                    keyResults.push(`Браузер: ${result.data.page_title}`);
                }
                
                // Data scraped
                else if (result.data.items_count !== undefined) {
                    keyResults.push(`Зібрано даних: ${result.data.items_count} елементів`);
                }
                
                // Screenshot taken
                else if (result.data.screenshot_path) {
                    keyResults.push(`Скріншот: ${result.data.screenshot_path}`);
                }
                
                // Generic success message
                else if (result.data.message) {
                    keyResults.push(result.data.message);
                }
            }
        }

        return keyResults;
    }

    /**
     * Check if tool calls can be executed in parallel
     * NEW 2025-10-29: Intelligent parallelization detection
     * 
     * @param {Array} toolCalls - Array of tool calls
     * @returns {boolean} True if can execute in parallel
     * @private
     */
    _canExecuteParallel(toolCalls) {
        if (!Array.isArray(toolCalls) || toolCalls.length <= 1) {
            return false; // Need at least 2 calls for parallelization
        }

        // Check for dependencies between tool calls
        const hasFileDependencies = this._hasFileDependencies(toolCalls);
        const hasStateDependencies = this._hasStateDependencies(toolCalls);
        
        // Can parallelize if no dependencies detected
        return !hasFileDependencies && !hasStateDependencies;
    }

    /**
     * Detect file dependencies between tool calls
     * 
     * @param {Array} toolCalls - Array of tool calls
     * @returns {boolean} True if dependencies exist
     * @private
     */
    _hasFileDependencies(toolCalls) {
        const writtenPaths = new Set();
        
        for (const call of toolCalls) {
            const tool = call.tool || '';
            const params = call.parameters || {};
            
            // Check if this call reads a file that was written earlier
            if (tool.includes('read') || tool.includes('list')) {
                const readPath = params.path || params.directory;
                if (readPath && writtenPaths.has(readPath)) {
                    return true; // Dependency detected
                }
            }
            
            // Track written paths
            if (tool.includes('create') || tool.includes('write') || tool.includes('update')) {
                const writePath = params.path || params.directory;
                if (writePath) {
                    writtenPaths.add(writePath);
                }
            }
        }
        
        return false;
    }

    /**
     * Detect state dependencies between tool calls
     * 
     * @param {Array} toolCalls - Array of tool calls
     * @returns {boolean} True if dependencies exist
     * @private
     */
    _hasStateDependencies(toolCalls) {
        // Browser navigation must be sequential
        const hasBrowserNavigation = toolCalls.some(call => 
            call.tool?.includes('navigate') || call.tool?.includes('goto')
        );
        
        if (hasBrowserNavigation) {
            return true; // Browser actions must be sequential
        }
        
        // Shell commands that change directory must be sequential
        const hasDirectoryChange = toolCalls.some(call => 
            call.parameters?.command?.includes('cd ') ||
            call.parameters?.workdir
        );
        
        if (hasDirectoryChange) {
            return true; // Directory-dependent commands must be sequential
        }
        
        return false;
    }

    /**
     * Execute tool calls in parallel
     * NEW 2025-10-29: Parallel execution for independent tools
     * 
     * @param {Array} toolCalls - Array of tool calls
     * @param {Object} context - Execution context
     * @returns {Promise<Object>} Execution result
     * @private
     */
    async _executeParallel(toolCalls, context) {
        const startTime = Date.now();
        
        this.logger.system('tetyana-execute-tools', 
            `[PARALLEL] Executing ${toolCalls.length} tools in parallel...`);
        
        // Execute all tools in parallel
        const promises = toolCalls.map((call, index) => 
            this._executeSingleTool(call, index, context)
        );
        
        const results = await Promise.allSettled(promises);
        
        // Process results
        const processedResults = results.map((result, index) => {
            if (result.status === 'fulfilled') {
                return result.value;
            } else {
                return {
                    success: false,
                    error: result.reason?.message || 'Unknown error',
                    tool: toolCalls[index]?.tool,
                    index
                };
            }
        });
        
        const successfulCalls = processedResults.filter(r => r.success).length;
        const failedCalls = processedResults.filter(r => !r.success).length;
        const executionTime = Date.now() - startTime;
        
        this.logger.system('tetyana-execute-tools', 
            `[PARALLEL] Completed in ${executionTime}ms: ${successfulCalls} success, ${failedCalls} failed`);
        
        return {
            all_successful: failedCalls === 0,
            successful_calls: successfulCalls,
            failed_calls: failedCalls,
            results: processedResults,
            execution_time_ms: executionTime,
            execution_mode: 'parallel'
        };
    }

    /**
     * Execute a single tool call
     * 
     * @param {Object} call - Tool call
     * @param {number} index - Call index
     * @param {Object} context - Execution context
     * @returns {Promise<Object>} Execution result
     * @private
     */
    async _executeSingleTool(call, index, context) {
        try {
            const result = await this.tetyanaToolSystem.executeToolCalls(
                [call],
                {
                    ...context,
                    autoApprove: true
                }
            );
            
            return result.results?.[0] || {
                success: false,
                error: 'No result returned',
                tool: call.tool,
                index
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
                tool: call.tool,
                index
            };
        }
    }

    /**
     * Format execution time for display
     * 
     * @param {number} ms - Milliseconds
     * @returns {string} Formatted time
     * @private
     */
    _formatExecutionTime(ms) {
        if (ms < 1000) {
            return `${ms}мс`;
        } else if (ms < 60000) {
            const seconds = (ms / 1000).toFixed(1);
            return `${seconds}с`;
        } else {
            const minutes = Math.floor(ms / 60000);
            const seconds = Math.floor((ms % 60000) / 1000);
            return `${minutes}хв ${seconds}с`;
        }
    }

    /**
     * Get error category for failed execution
     * 
     * @param {string} errorMessage - Error message
     * @returns {string} Error category
     * @private
     */
    _getErrorCategory(errorMessage) {
        const msgLower = errorMessage.toLowerCase();

        if (msgLower.includes('timeout')) {
            return 'timeout';
        } else if (msgLower.includes('not found') || msgLower.includes('404')) {
            return 'not_found';
        } else if (msgLower.includes('permission') || msgLower.includes('denied')) {
            return 'permission';
        } else if (msgLower.includes('network') || msgLower.includes('connection')) {
            return 'network';
        } else if (msgLower.includes('invalid') || msgLower.includes('parameter')) {
            return 'invalid_params';
        } else {
            return 'unknown';
        }
    }

    /**
     * Determine if step-by-step execution is needed
     * NEW 2025-10-18
     * 
     * @param {Object} plan - Tool execution plan
     * @param {Object} item - TODO item
     * @returns {boolean} True if step-by-step execution recommended
     * @private
     */
    _shouldExecuteStepByStep(plan, item) {
        // RULE 1: More than 3 playwright tools → step-by-step
        const playwrightTools = plan.tool_calls.filter(t => t.server === 'playwright').length;
        if (playwrightTools > 3) {
            this.logger.system('tetyana-execute-tools', `[STEP-BY-STEP] Triggered: ${playwrightTools} playwright tools > 3`);
            return true;
        }

        // RULE 2: Item involves search/scraping → step-by-step
        const actionLower = item.action.toLowerCase();
        const searchKeywords = ['знайди', 'знайти', 'search', 'пошук', 'зібрати', 'collect', 'scrape'];
        for (const keyword of searchKeywords) {
            if (actionLower.includes(keyword)) {
                this.logger.system('tetyana-execute-tools', `[STEP-BY-STEP] Triggered: action contains "${keyword}"`);
                return true;
            }
        }

        // RULE 3: Retry attempt → step-by-step (previous batch failed)
        if (item.attempt && item.attempt > 1) {
            this.logger.system('tetyana-execute-tools', `[STEP-BY-STEP] Triggered: retry attempt ${item.attempt}`);
            return true;
        }

        // RULE 4: Mix of different servers → step-by-step
        const uniqueServers = new Set(plan.tool_calls.map(t => t.server));
        if (uniqueServers.size > 2) {
            this.logger.system('tetyana-execute-tools', `[STEP-BY-STEP] Triggered: ${uniqueServers.size} different servers`);
            return true;
        }

        // Default: use batch execution
        return false;
    }

    /**
     * Execute tools step-by-step with intermediate checks
     * NEW 2025-10-18
     * 
     * @param {Object} plan - Tool execution plan
     * @param {Object} item - TODO item
     * @returns {Promise<Object>} Execution result
     * @private
     */
    async _executeStepByStep(plan, item) {
        const results = [];
        let successfulCalls = 0;
        let failedCalls = 0;
        const startTime = Date.now();

        for (let i = 0; i < plan.tool_calls.length; i++) {
            const toolCall = plan.tool_calls[i];
            
            this.logger.system('tetyana-execute-tools', `[STEP-BY-STEP] [${i + 1}/${plan.tool_calls.length}] ${toolCall.server}__${toolCall.tool}`);

            try {
                // Execute ONE tool
                const result = await this._executeOneTool(toolCall);
                results.push(result);

                if (result.success) {
                    successfulCalls++;
                    this.logger.system('tetyana-execute-tools', `[STEP-BY-STEP] ✅ Success`);
                } else {
                    failedCalls++;
                    this.logger.system('tetyana-execute-tools', `[STEP-BY-STEP] ❌ Failed: ${result.error}`);
                    
                    // CRITICAL: Stop on first failure
                    this.logger.warn(`[STEP-BY-STEP] Stopping execution at tool ${i + 1} due to failure`, {
                        category: 'tetyana-execute-tools',
                        component: 'tetyana-execute-tools'
                    });
                    
                    return {
                        all_successful: false,
                        successful_calls: successfulCalls,
                        failed_calls: failedCalls,
                        results,
                        stopped_at_index: i,
                        stopped_reason: result.error,
                        execution_time_ms: Date.now() - startTime
                    };
                }

                // Wait between tools (especially for web operations)
                const delay = this._getDelayBetweenTools(toolCall);
                if (delay > 0 && i < plan.tool_calls.length - 1) {
                    this.logger.system('tetyana-execute-tools', `[STEP-BY-STEP] Waiting ${delay}ms before next tool...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                }

            } catch (error) {
                failedCalls++;
                this.logger.error(`[STEP-BY-STEP] Tool execution error: ${error.message}`, {
                    category: 'tetyana-execute-tools',
                    component: 'tetyana-execute-tools'
                });
                
                results.push({
                    success: false,
                    error: error.message,
                    tool: `${toolCall.server}__${toolCall.tool}`
                });

                // Stop on error
                return {
                    all_successful: false,
                    successful_calls: successfulCalls,
                    failed_calls: failedCalls,
                    results,
                    stopped_at_index: i,
                    stopped_reason: error.message,
                    execution_time_ms: Date.now() - startTime
                };
            }
        }

        // All tools executed successfully
        return {
            all_successful: true,
            successful_calls: successfulCalls,
            failed_calls: failedCalls,
            results,
            execution_time_ms: Date.now() - startTime
        };
    }

    /**
     * Execute a single tool call
     * NEW 2025-10-18
     * 
     * @param {Object} toolCall - Tool call specification
     * @returns {Promise<Object>} Tool execution result
     * @private
     */
    async _executeOneTool(toolCall) {
        try {
            // Use MCPManager to execute the tool
            const result = await this.mcpManager.executeTool(
                toolCall.server,
                toolCall.tool,
                toolCall.parameters
            );

            return {
                success: true,
                tool: `${toolCall.server}__${toolCall.tool}`,
                data: result,
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            return {
                success: false,
                tool: `${toolCall.server}__${toolCall.tool}`,
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }

    /**
     * Get delay duration between tools
     * NEW 2025-10-18, OPTIMIZED 2025-10-19
     * 
     * Затримки всередині одного ітема (між tools):
     * - Довгі операції (компіляція, обробка файлів): 3000-5000ms
     * - AppleScript (відкриття програм): 2000ms
     * - Playwright navigate: 1500ms
     * - Інші playwright: 800ms
     * - Filesystem/shell: 200ms
     * - Default: 500ms
     * 
     * @param {Object} toolCall - Just executed tool call
     * @returns {number} Delay in milliseconds
     * @private
     */
    _getDelayBetweenTools(toolCall) {
        // Перевірка на довгі операції (компіляція, обробка коду)
        if (this._isLongRunningOperation(toolCall)) {
            return 5000; // 5 seconds - для візуальних змін UI
        }

        // AppleScript - часто для відкриття програм, потрібно більше часу
        if (toolCall.server === 'applescript') {
            return 2000; // 2 seconds - програми відкриваються
        }

        // Playwright tools - веб-операції
        if (toolCall.server === 'playwright') {
            // navigate потребує часу на завантаження сторінки
            if (toolCall.tool === 'playwright_navigate') {
                return 1500; // 1.5 seconds
            }
            // fill, click та інші - менше
            return 800; // 800ms
        }

        // Filesystem, shell - швидкі операції, мінімальна затримка
        if (toolCall.server === 'filesystem' || toolCall.server === 'shell') {
            return 200; // 200ms
        }

        // Default для інших серверів
        return 500; // 500ms
    }

    /**
     * Check if operation is long-running (compilation, code processing, etc.)
     * 
     * @param {Object} toolCall - Tool call to check
     * @returns {boolean} True if long-running operation
     * @private
     */
    _isLongRunningOperation(toolCall) {
        const toolLower = (toolCall.tool || '').toLowerCase();
        const paramsStr = JSON.stringify(toolCall.parameters || {}).toLowerCase();

        // Shell команди - перевіряємо команду
        if (toolCall.server === 'shell') {
            const longRunningCommands = [
                'compile', 'build', 'make', 'cmake', 'gcc', 'g++', 'clang',
                'npm install', 'npm run', 'yarn', 'pip install',
                'cargo build', 'go build', 'mvn', 'gradle',
                'webpack', 'vite build', 'tsc',
                'ffmpeg', 'convert', 'magick'  // медіа обробка
            ];

            for (const cmd of longRunningCommands) {
                if (paramsStr.includes(cmd)) {
                    return true;
                }
            }
        }

        // Filesystem - великі файли або кодогенерація
        if (toolCall.server === 'filesystem') {
            // Перевіряємо розмір файлу або keywords
            if (paramsStr.includes('generate') || paramsStr.includes('process')) {
                return true;
            }
        }

        // Playwright - важкі сторінки або скрапінг
        if (toolCall.server === 'playwright') {
            if (toolLower.includes('scrape') || toolLower.includes('extract')) {
                return true;
            }
        }

        return false;
    }
}

export default TetyanaExecuteToolsProcessor;
