/**
 * @fileoverview Grisha Verify Item Processor (Stage 2.3-MCP) - VISUAL VERIFICATION
 * Visual evidence-based verification using screenshots and AI vision
 * 
 * UPDATED 17.10.2025: Added Ollama local vision support
 * - Prioritizes local Ollama llama3.2-vision (FREE!)
 * - Falls back to OpenRouter (paid) if Ollama unavailable
 * - Uses continuous screenshot monitoring
 * - AI vision analysis
 * - Stuck state detection
 * - Dynamic feedback for corrections
 * 
 * @version 5.0.0
 * @date 2025-10-17
 */

import logger from '../../utils/logger.js';
import { MCP_PROMPTS } from '../../../prompts/mcp/index.js';
import { VisualCaptureService } from '../../services/visual-capture-service.js';
import { VisionAnalysisService } from '../../services/vision-analysis-service.js';
import { GrishaVerificationStrategy } from './grisha-verification-strategy.js';
import GlobalConfig from '../../../config/atlas-config.js';

/**
 * Grisha Verify Item Processor
 * 
 * Performs strict visual evidence-based verification:
 * - ALWAYS captures screenshots for verification
 * - Uses AI vision (Ollama locally or OpenRouter cloud) to analyze screenshots
 * - Detects stuck states through visual monitoring
 * - Returns verified=true ONLY if visual evidence confirms success
 * - NO MCP tool selection - pure visual verification
 */
export class GrishaVerifyItemProcessor {
    /**
     * @param {Object} dependencies
     * @param {Object} dependencies.mcpTodoManager - MCPTodoManager instance (for messaging)
     * @param {Object} dependencies.wsManager - WebSocket manager for chat updates
     * @param {Object} dependencies.logger - Logger instance
     * @param {Object} dependencies.config - Visual verification config
     */
    constructor({ mcpTodoManager, wsManager, logger: loggerInstance, config = {}, tetyanaToolSystem }) {
        this.mcpTodoManager = mcpTodoManager;
        this.wsManager = wsManager;
        this.logger = loggerInstance || logger;
        this.tetyanaToolSystem = tetyanaToolSystem; // For MCP verification fallback

        // Initialize verification strategy selector
        this.verificationStrategy = new GrishaVerificationStrategy({
            logger: this.logger
        });

        // Initialize visual services
        this.visualCapture = new VisualCaptureService({
            logger: this.logger,
            config: {
                captureInterval: config.captureInterval || 2000,
                screenshotDir: config.screenshotDir || '/tmp/atlas_visual',
                maxStoredScreenshots: config.maxStoredScreenshots || 10
            }
        });

        this.visionAnalysis = new VisionAnalysisService({
            logger: this.logger,
            config: {
                // NEW 17.10.2025: Auto-detect Ollama, fallback to OpenRouter
                visionProvider: config.visionProvider || 'auto',  // 'ollama', 'openrouter', or 'auto'
                visionModel: config.visionModel || null,  // Auto-selected during init
                apiEndpoint: config.visionApiEndpoint || 'http://localhost:4000/v1/chat/completions',
                temperature: config.visionTemperature || 0.2
            }
        });

        this.initialized = false;
    }

    /**
     * Initialize visual verification services
     */
    async initialize() {
        if (this.initialized) {
            return;
        }

        this.logger.system('grisha-verify-item', '[VISUAL-GRISHA] Initializing visual verification services...');

        await Promise.all([
            this.visualCapture.initialize(),
            this.visionAnalysis.initialize()
        ]);

        this.initialized = true;
        this.logger.system('grisha-verify-item', '[VISUAL-GRISHA] ✅ Visual verification services ready');
    }

    /**
     * Execute visual verification for TODO item
     * 
     * @param {Object} context - Stage context
     * @param {Object} context.currentItem - Current TODO item
     * @param {Object} context.execution - Execution results from Stage 2.2
     * @param {Object} context.todo - Full TODO list
     * @returns {Promise<Object>} Verification result
     */
    async execute(context) {
        // Ensure services are initialized
        await this.initialize();

        const { currentItem, execution, todo } = context;

        // ENHANCED 2025-10-22: Determine verification strategy
        const strategy = this.verificationStrategy.determineStrategy(currentItem, execution);
        
        this.logger.system('grisha-verify-item', `[GRISHA] 🎯 Verification strategy: ${strategy.method.toUpperCase()}`);
        this.logger.system('grisha-verify-item', `[GRISHA] 📊 Confidence: ${strategy.confidence}%`);
        this.logger.system('grisha-verify-item', `[GRISHA] 💡 Reason: ${strategy.reason}`);

        if (!currentItem) {
            throw new Error('currentItem is required for verification');
        }

        if (!execution) {
            throw new Error('execution results are required for verification');
        }

        try {
            this.logger.system('grisha-verify-item', `[GRISHA] Item: ${currentItem.id}. ${currentItem.action}`);
            this.logger.system('grisha-verify-item', `[GRISHA] Success criteria: ${currentItem.success_criteria}`);

            // Execute verification based on strategy
            let verification;
            
            if (strategy.method === 'visual') {
                // Visual verification (primary or fallback)
                verification = await this._executeVisualVerification(currentItem, execution, todo, strategy);
                
                // If visual failed and MCP fallback is available
                if (!verification.verified && strategy.fallbackToMcp && strategy.mcpFallbackTools.length > 0) {
                    this.logger.system('grisha-verify-item', '[GRISHA] 🔄 Visual verification failed, trying MCP fallback...');
                    const mcpVerification = await this._executeMcpVerification(currentItem, execution, strategy);
                    
                    if (mcpVerification.verified) {
                        this.logger.system('grisha-verify-item', '[GRISHA] ✅ MCP fallback verification succeeded');
                        verification = mcpVerification;
                    }
                }
            } else if (strategy.method === 'mcp') {
                // MCP verification (primary)
                verification = await this._executeMcpVerification(currentItem, execution, strategy);
                
                // If MCP failed and visual fallback is available
                if (!verification.verified && strategy.fallbackToVisual) {
                    this.logger.system('grisha-verify-item', '[GRISHA] 🔄 MCP verification failed, trying visual fallback...');
                    const visualVerification = await this._executeVisualVerification(currentItem, execution, todo, strategy);
                    
                    if (visualVerification.verified) {
                        this.logger.system('grisha-verify-item', '[GRISHA] ✅ Visual fallback verification succeeded');
                        verification = visualVerification;
                    }
                }
            } else {
                throw new Error(`Unknown verification strategy: ${strategy.method}`);
            }

            // Generate summary
            const summary = this._generateVerificationSummary(currentItem, verification);

            // Generate TTS phrase for executor
            verification.tts_phrase = this._generateTtsPhrase(verification.verified);
            
            this.logger.system('grisha-verify-item', '[GRISHA] ✅ Verification complete');

            // Determine next action
            const nextAction = this._determineNextAction(verification, currentItem);

            return {
                success: true,
                verified: verification.verified,
                verification,
                summary,
                nextAction,
                metadata: {
                    itemId: currentItem.id,
                    verified: verification.verified,
                    confidence: verification.confidence,
                    verificationMethod: verification.method || strategy.method,
                    strategy: strategy.method
                }
            };

        } catch (error) {
            this.logger.error(`[GRISHA] ❌ Verification failed: ${error.message}`, {
                category: 'grisha-verify-item',
                component: 'grisha-verify-item',
                stack: error.stack
            });

            return {
                success: false,
                verified: false,
                error: error.message,
                verification: {
                    verified: false,
                    reason: `Помилка під час перевірки: ${error.message}`,
                    visual_evidence: null
                },
                summary: `⚠️ Не вдалося перевірити "${currentItem.action}": ${error.message}`,
                nextAction: 'adjust',
                metadata: {
                    itemId: currentItem.id,
                    errorType: error.name,
                    stage: 'verification'
                }
            };
        }
    }

    /**
     * Execute visual verification
     * 
     * @param {Object} currentItem - Current TODO item
     * @param {Object} execution - Execution results
     * @param {Object} todo - Full TODO
     * @param {Object} strategy - Verification strategy
     * @returns {Promise<Object>} Verification result
     * @private
     */
    async _executeVisualVerification(currentItem, execution, todo, strategy) {
        this.logger.system('grisha-verify-item', '[VISUAL-GRISHA] 🔍 Starting visual verification...');

        try {
            // Step 1: Determine target app for window screenshot
            // ENHANCED 2025-10-22: Use context to persist targetApp across items in same session
            let targetApp = this._detectTargetApp(currentItem.action, execution.results);
            
            // If not detected in current item, check if we have it from previous items in this TODO
            if (!targetApp && todo && todo.id) {
                // Check if previous items in same TODO had a target app
                const previousItems = todo.items.filter(item => item.id < currentItem.id && item.status === 'completed');
                for (const prevItem of previousItems.reverse()) {
                    const prevTargetApp = this._detectTargetApp(prevItem.action, prevItem.execution_results || []);
                    if (prevTargetApp) {
                        targetApp = prevTargetApp;
                        this.logger.system('grisha-verify-item', `[VISUAL-GRISHA] 🔄 Using targetApp from previous item ${prevItem.id}: ${targetApp}`);
                        break;
                    }
                }
            }
            
            if (targetApp) {
                this.logger.system('grisha-verify-item', `[VISUAL-GRISHA] 🎯 Target app detected: ${targetApp}`);
            } else {
                this.logger.system('grisha-verify-item', `[VISUAL-GRISHA] ⚠️  No target app detected - using full screen capture`);
            }

            // Step 2: Capture screenshot of current state
            const screenshot = await this.visualCapture.captureScreenshot(
                `item_${currentItem.id}_verify`,
                { targetApp } // Pass targetApp for window screenshot
            );
            this.logger.system('grisha-verify-item', `[VISUAL-GRISHA] 📸 Screenshot captured: ${screenshot.filename}`);
            this.logger.system('grisha-verify-item', `[VISUAL-GRISHA] 📂 Full path: ${screenshot.filepath}`);
            this.logger.system('grisha-verify-item', `[VISUAL-GRISHA] 📷 Capture mode: ${targetApp ? 'window (' + targetApp + ')' : 'full screen'}`);

            // Step 2: Analyze screenshot with AI vision
            const analysisContext = {
                action: currentItem.action,
                executionResults: execution.results || []
            };

            let visionAnalysis = await this.visionAnalysis.analyzeScreenshot(
                screenshot.filepath,
                currentItem.success_criteria,
                analysisContext
            );

            // ENHANCED 2025-10-22: Retry with alternative provider if fallback detected
            if (visionAnalysis._fallback && visionAnalysis._fallback_reason === 'unstructured_response') {
                this.logger.system('grisha-verify-item', '[VISUAL-GRISHA] 🔄 Vision fallback detected, retrying with alternative provider...');

                // Try with Ollama if current provider is OpenRouter, or vice versa
                const currentProvider = this.visionAnalysis.config.visionProvider;
                const alternativeProvider = currentProvider === 'openrouter' ? 'ollama' : 'openrouter';

                // Temporarily switch provider for retry
                const originalProvider = this.visionAnalysis.config.visionProvider;
                this.visionAnalysis.config.visionProvider = alternativeProvider;

                try {
                    visionAnalysis = await this.visionAnalysis.analyzeScreenshot(
                        screenshot.filepath,
                        currentItem.success_criteria,
                        analysisContext
                    );

                    this.logger.system('grisha-verify-item', `[VISUAL-GRISHA] ✅ Retry successful with ${alternativeProvider}`);

                } catch (retryError) {
                    this.logger.warn('grisha-verify-item', `[VISUAL-GRISHA] ⚠️ Retry failed: ${retryError.message}`);
                    // Restore original provider and continue with original result
                    this.visionAnalysis.config.visionProvider = originalProvider;
                }
            }

            // SECURITY CHECK 2025-10-22: Detect and log fallback responses
            if (visionAnalysis._fallback) {
                this.logger.warn(`[VISUAL-GRISHA] ⚠️  SECURITY: Vision model returned fallback response (no structured JSON)`, {
                    category: 'grisha-verify-item',
                    fallback_reason: visionAnalysis._fallback_reason || 'unknown',
                    security_note: 'Fallback responses always fail verification to prevent false positives'
                });
            }
            
            this.logger.system('grisha-verify-item', `[VISUAL-GRISHA] 🤖 Vision analysis complete (confidence: ${visionAnalysis.confidence}%)`);
            this.logger.system('grisha-verify-item', `[VISUAL-GRISHA] 🤖 Model used: ${this.visionAnalysis.config.visionModel || 'unknown'}`);
            this.logger.system('grisha-verify-item', `[VISUAL-GRISHA] 🤖 Verified: ${visionAnalysis.verified}`);
            this.logger.system('grisha-verify-item', `[VISUAL-GRISHA] 🤖 Reason: ${visionAnalysis.reason}`);

            // Step 3: Build verification result with SECURITY CHECKS
            // SECURITY FIX 2025-10-22: Reject fallback responses and require proper evidence
            let verified = visionAnalysis.verified && visionAnalysis.confidence >= 70; // Require 70% confidence
            let rejectionReason = null;
            
            // SECURITY CHECK 1: Reject fallback responses (no structured JSON from vision model)
            if (visionAnalysis._fallback === true) {
                verified = false;
                rejectionReason = 'Vision model returned unstructured response - cannot verify without structured JSON evidence';
                this.logger.warn(`[VISUAL-GRISHA] ❌ SECURITY: Rejecting fallback verification`, {
                    category: 'grisha-verify-item',
                    reason: rejectionReason
                });
            }
            
            // SECURITY CHECK 2: Require matches_criteria to be explicitly true
            if (verified && visionAnalysis.visual_evidence?.matches_criteria !== true) {
                verified = false;
                rejectionReason = 'Visual evidence does not explicitly match success criteria (matches_criteria !== true)';
                this.logger.warn(`[VISUAL-GRISHA] ❌ SECURITY: Visual evidence mismatch`, {
                    category: 'grisha-verify-item',
                    reason: rejectionReason,
                    matches_criteria: visionAnalysis.visual_evidence?.matches_criteria
                });
            }
            
            // SECURITY CHECK 3: Require minimum confidence of 70% (already checked above, but log it)
            if (visionAnalysis.verified && visionAnalysis.confidence < 70) {
                this.logger.warn(`[VISUAL-GRISHA] ⚠️  Low confidence verification rejected (${visionAnalysis.confidence}% < 70%)`, {
                    category: 'grisha-verify-item'
                });
            }
            
            const verification = {
                verified: verified,
                confidence: visionAnalysis.confidence,
                reason: rejectionReason || visionAnalysis.reason,
                visual_evidence: visionAnalysis.visual_evidence,
                screenshot_path: screenshot.filepath,
                screenshot_hash: screenshot.hash,
                vision_model: this.visionAnalysis.config.visionModel,
                from_visual_analysis: true,
                _fallback_detected: visionAnalysis._fallback || false,
                _security_checks_passed: !rejectionReason
            };

            // Log verification result
            const status = verification.verified ? '✅ VERIFIED' : '❌ NOT VERIFIED';
            this.logger.system('grisha-verify-item', `[VISUAL-GRISHA] ${status}`);
            this.logger.system('grisha-verify-item', `[VISUAL-GRISHA]   Reason: ${verification.reason}`);
            this.logger.system('grisha-verify-item', `[VISUAL-GRISHA]   Visual Evidence: ${verification.visual_evidence.observed}`);
            
            // SECURITY CHECK 4: Log evidence validation details
            if (verification.verified) {
                this.logger.system('grisha-verify-item', `[VISUAL-GRISHA]   ✅ Evidence validation passed:`);
                this.logger.system('grisha-verify-item', `[VISUAL-GRISHA]      - Confidence: ${verification.confidence}%`);
                this.logger.system('grisha-verify-item', `[VISUAL-GRISHA]      - Matches criteria: ${verification.visual_evidence?.matches_criteria}`);
                this.logger.system('grisha-verify-item', `[VISUAL-GRISHA]      - Observed value: "${verification.visual_evidence?.observed}"`);
                this.logger.system('grisha-verify-item', `[VISUAL-GRISHA]      - Fallback mode: ${verification._fallback_detected}`);
            } else {
                this.logger.system('grisha-verify-item', `[VISUAL-GRISHA]   ❌ Evidence validation failed`);
                if (verification._fallback_detected) {
                    this.logger.system('grisha-verify-item', `[VISUAL-GRISHA]      - Rejected: Fallback response (no structured JSON)`);
                }
                if (verification.visual_evidence?.matches_criteria !== true) {
                    this.logger.system('grisha-verify-item', `[VISUAL-GRISHA]      - Rejected: Visual evidence mismatch`);
                }
                if (verification.confidence < 70) {
                    this.logger.system('grisha-verify-item', `[VISUAL-GRISHA]      - Rejected: Low confidence (${verification.confidence}%)`);
                }
            }

            return verification;

        } catch (error) {
            this.logger.error(`[VISUAL-GRISHA] ❌ Visual verification failed: ${error.message}`, {
                category: 'grisha-verify-item',
                component: 'grisha-verify-item',
                stack: error.stack
            });

            return {
                verified: false,
                confidence: 0,
                reason: `Помилка візуальної верифікації: ${error.message}`,
                visual_evidence: null,
                method: 'visual',
                error: true
            };
        }
    }

    /**
     * Execute MCP tool verification
     * 
     * @param {Object} currentItem - Current TODO item
     * @param {Object} execution - Execution results
     * @param {Object} strategy - Verification strategy
     * @returns {Promise<Object>} Verification result
     * @private
     */
    async _executeMcpVerification(currentItem, execution, strategy) {
        this.logger.system('grisha-verify-item', '[MCP-GRISHA] 🔧 Starting MCP tool verification...');

        try {
            if (!this.tetyanaToolSystem) {
                throw new Error('TetyanaToolSystem not available for MCP verification');
            }

            // Build verification tool calls based on strategy
            const verificationCalls = this._buildMcpVerificationCalls(currentItem, strategy);
            
            if (verificationCalls.length === 0) {
                this.logger.warn('[MCP-GRISHA] No verification tools available', {
                    category: 'grisha-verify-item'
                });
                return {
                    verified: false,
                    confidence: 0,
                    reason: 'Немає доступних MCP інструментів для верифікації',
                    method: 'mcp',
                    error: true
                };
            }

            this.logger.system('grisha-verify-item', `[MCP-GRISHA] Executing ${verificationCalls.length} verification tool(s)...`);

            // Execute verification tools using TetyanaToolSystem (same as Tetyana)
            const results = await this.tetyanaToolSystem.executeToolCalls(verificationCalls, {
                mode: 'task',
                userIntent: 'verification',
                itemAction: currentItem.action,
                itemId: currentItem.id
            });

            // Analyze results
            const verified = this._analyzeMcpResults(results, currentItem.success_criteria);

            const verification = {
                verified: verified.success,
                confidence: verified.confidence,
                reason: verified.reason,
                mcp_results: results,
                method: 'mcp',
                mcp_server: strategy.mcpServer,
                from_mcp_verification: true
            };

            const status = verification.verified ? '✅ VERIFIED' : '❌ NOT VERIFIED';
            this.logger.system('grisha-verify-item', `[MCP-GRISHA] ${status}`);
            this.logger.system('grisha-verify-item', `[MCP-GRISHA]   Reason: ${verification.reason}`);

            return verification;

        } catch (error) {
            this.logger.error(`[MCP-GRISHA] ❌ MCP verification failed: ${error.message}`, {
                category: 'grisha-verify-item',
                component: 'grisha-verify-item',
                stack: error.stack
            });

            return {
                verified: false,
                confidence: 0,
                reason: `Помилка MCP верифікації: ${error.message}`,
                method: 'mcp',
                error: true
            };
        }
    }

    /**
     * Build MCP verification tool calls based on strategy
     * 
     * @param {Object} item - TODO item
     * @param {Object} strategy - Verification strategy
     * @returns {Array} Tool calls
     * @private
     */
    _buildMcpVerificationCalls(item, strategy) {
        const calls = [];
        const successCriteria = (item.success_criteria || '').toLowerCase();

        // Filesystem verification
        if (strategy.mcpServer === 'filesystem' || strategy.mcpFallbackTools?.some(t => t.includes('filesystem'))) {
            // Extract file/directory path from success criteria or action
            const pathMatch = item.action.match(/["']([^"']+)["']/) || successCriteria.match(/["']([^"']+)["']/);
            
            if (pathMatch) {
                const targetPath = pathMatch[1];
                
                // Check if file/directory exists
                calls.push({
                    tool: 'filesystem__read_file',
                    arguments: {
                        path: targetPath
                    }
                });
            }
        }

        // Shell verification
        if (strategy.mcpServer === 'shell' || strategy.mcpFallbackTools?.some(t => t.includes('shell'))) {
            // Execute verification command
            // This is a placeholder - actual implementation would need specific verification commands
            this.logger.system('grisha-verify-item', '[MCP-GRISHA] Shell verification not yet implemented');
        }

        // Memory verification
        if (strategy.mcpServer === 'memory' || strategy.mcpFallbackTools?.some(t => t.includes('memory'))) {
            // Search memory for verification
            this.logger.system('grisha-verify-item', '[MCP-GRISHA] Memory verification not yet implemented');
        }

        return calls;
    }

    /**
     * Analyze MCP tool results for verification
     * 
     * @param {Object} results - Tool execution results from TetyanaToolSystem
     * @param {string} successCriteria - Success criteria
     * @returns {Object} Analysis result
     * @private
     */
    _analyzeMcpResults(results, successCriteria) {
        // Check if all tools succeeded (TetyanaToolSystem structure)
        const allSuccessful = results.all_successful;

        if (!allSuccessful) {
            const failedTools = results.results.filter(r => !r.success).map(r => r.tool);
            return {
                success: false,
                confidence: 0,
                reason: `MCP інструменти не виконались: ${failedTools.join(', ')}`
            };
        }

        // Extract file/directory path from success criteria
        const criteriaLower = successCriteria.toLowerCase();

        // Check for file/directory existence verification
        if (criteriaLower.includes('існує') || criteriaLower.includes('знайдено') || criteriaLower.includes('наявний')) {
            // Look for filesystem operations in results
            const filesystemResults = results.results.filter(r =>
                r.tool && r.tool.includes('filesystem') && r.success && r.data
            );

            if (filesystemResults.length > 0) {
                return {
                    success: true,
                    confidence: 90,
                    reason: 'MCP підтвердив: файл/директорія існує'
                };
            } else {
                return {
                    success: false,
                    confidence: 90,
                    reason: 'MCP підтвердив: файл/директорія не існує'
                };
            }
        }

        // Default: success if tools executed
        return {
            success: true,
            confidence: 70,
            reason: 'MCP інструменти виконані успішно'
        };
    }

    /**
     * Generate TTS phrase based on verification result
     * 
     * @param {boolean} verified - Verification result
     * @returns {string} TTS phrase
     * @private
     */
    _generateTtsPhrase(verified) {
        if (!this._verifyPhraseIndex) {
            this._verifyPhraseIndex = 0;
        }
        
        const verifySuccessPhrases = [
            'Підтверджено',
            'Все правильно',
            'Виконано коректно',
            'Перевірено, все гаразд',
            'Результат вірний',
            'Все на місці'
        ];
        
        const verifyFailurePhrases = [
            'Не підтверджено',
            'Є проблема',
            'Щось не так',
            'Потрібна корекція',
            'Виявлено помилку',
            'Не відповідає очікуванням'
        ];
        
        let shortTTS;
        if (verified) {
            shortTTS = verifySuccessPhrases[this._verifyPhraseIndex % verifySuccessPhrases.length];
        } else {
            shortTTS = verifyFailurePhrases[this._verifyPhraseIndex % verifyFailurePhrases.length];
        }
        this._verifyPhraseIndex++;
        
        return shortTTS;
    }

    /**
     * Generate summary of verification
     * 
     * @param {Object} item - TODO item
     * @param {Object} verification - Verification result
     * @returns {string} Summary text
     * @private
     */
    _generateVerificationSummary(item, verification) {
        const lines = [];

        if (verification.verified) {
            lines.push(`✅ Візуально підтверджено: "${item.action}"`);

            if (verification.visual_evidence && verification.visual_evidence.observed) {
                lines.push(`   Візуальні докази: ${verification.visual_evidence.observed}`);
            }

            if (verification.confidence) {
                lines.push(`   Впевненість: ${verification.confidence}%`);
            }
        } else {
            lines.push(`❌ Візуально не підтверджено: "${item.action}"`);
            lines.push(`   Причина: ${verification.reason}`);

            if (verification.visual_evidence && verification.visual_evidence.details) {
                lines.push(`   Деталі: ${verification.visual_evidence.details}`);
            }
        }

        return lines.join('\n');
    }

    /**
     * Determine next action based on verification
     * 
     * @param {Object} verification - Verification result
     * @param {Object} item - TODO item
     * @returns {string} Next action ('continue', 'adjust', 'retry')
     * @private
     */
    _determineNextAction(verification, item) {
        if (verification.verified) {
            // Success - continue to next item
            return 'continue';
        }

        // Check if we've reached max attempts
        const currentAttempt = item.attempt || 1;
        // UPDATED 18.10.2025: Use config for default max attempts
        const maxAttempts = item.max_attempts || GlobalConfig.AI_BACKEND_CONFIG.retry.itemExecution.maxAttempts;

        if (currentAttempt >= maxAttempts) {
            // Max attempts reached - need adjustment
            this.logger.system('grisha-verify-item', `[VISUAL-GRISHA] Max attempts (${maxAttempts}) reached, adjustment needed`);
            return 'adjust';
        }

        // Check verification reason for hints
        const reasonLower = (verification.reason || '').toLowerCase();

        // Temporary failures - retry without adjustment
        const temporaryFailureKeywords = [
            'timeout',
            'тимчасов',
            'мережа',
            'network',
            'connection',
            'loading'
        ];

        for (const keyword of temporaryFailureKeywords) {
            if (reasonLower.includes(keyword)) {
                this.logger.system('grisha-verify-item', '[VISUAL-GRISHA] Temporary failure detected, retry recommended');
                return 'retry';
            }
        }

        // Structural failures - need adjustment
        const structuralFailureKeywords = [
            'не існує',
            'not found',
            'невірний',
            'invalid',
            'неправильн',
            'wrong',
            'відсутній',
            'missing'
        ];

        for (const keyword of structuralFailureKeywords) {
            if (reasonLower.includes(keyword)) {
                this.logger.system('grisha-verify-item', '[VISUAL-GRISHA] Structural failure detected, adjustment needed');
                return 'adjust';
            }
        }

        // Check confidence level - low confidence suggests uncertainty, try adjustment
        if (verification.confidence && verification.confidence < 50) {
            this.logger.system('grisha-verify-item', `[VISUAL-GRISHA] Low confidence (${verification.confidence}%), adjustment needed`);
            return 'adjust';
        }

        // Default - adjust for safety
        return 'adjust';
    }

    /**
     * Detect if execution is stuck by analyzing multiple screenshots
     * 
     * @param {Object} item - TODO item being executed
     * @param {number} durationMs - How long execution has been running
     * @returns {Promise<Object>} Stuck detection result
     */
    async detectStuckState(item, durationMs = 10000) {
        try {
            // Start monitoring if not already
            if (!this.visualCapture.isMonitoring) {
                await this.visualCapture.startMonitoring();

                // Wait for a few screenshots to accumulate
                await new Promise(resolve => setTimeout(resolve, this.visualCapture.config.captureInterval * 3));
            }

            // Get recent screenshots
            const since = Date.now() - durationMs;
            const recentScreenshots = this.visualCapture.getScreenshotsSince(since);

            if (recentScreenshots.length < 2) {
                // Not enough screenshots to determine stuck state
                return {
                    stuck: false,
                    reason: 'Insufficient screenshots for stuck detection',
                    confidence: 0
                };
            }

            // Use vision analysis to detect stuck state
            const screenshotPaths = recentScreenshots.map(s => s.filepath);
            const stuckAnalysis = await this.visionAnalysis.detectStuckState(
                screenshotPaths,
                item.action
            );

            this.logger.system('grisha-verify-item', `[VISUAL-GRISHA] Stuck detection: ${stuckAnalysis.stuck ? 'STUCK' : 'PROGRESSING'} (confidence: ${stuckAnalysis.confidence}%)`);

            return stuckAnalysis;

        } catch (error) {
            this.logger.error(`[VISUAL-GRISHA] Stuck detection failed: ${error.message}`, {
                category: 'grisha-verify-item',
                component: 'grisha-verify-item'
            });

            // Return not stuck on error (fail-safe)
            return {
                stuck: false,
                reason: `Stuck detection error: ${error.message}`,
                confidence: 0,
                error: true
            };
        }
    }

    /**
     * Get current verification status
     * 
     * @returns {Object} Status info
     */
    getStatus() {
        return {
            initialized: this.initialized,
            visualCapture: this.visualCapture?.getStatus(),
            visionAnalysis: this.visionAnalysis?.getStatus()
        };
    }

    /**
     * Get detailed analysis for Atlas replanning
     * NEW 2025-10-18
     * 
     * Provides comprehensive failure analysis including:
     * - Visual evidence from screenshot
     * - Specific suggestions for Atlas
     * - Root cause determination
     * - Recommended strategy
     * 
     * @param {Object} item - TODO item
     * @param {Object} execution - Execution results
     * @returns {Promise<Object>} Detailed analysis for Atlas
     */
    async getDetailedAnalysisForAtlas(item, execution) {
        this.logger.system('grisha-verify-item', '[VISUAL-GRISHA] 🔍 Generating detailed analysis for Atlas...');

        // Perform verification first
        const verification = await this.execute({ currentItem: item, execution });

        // Build detailed analysis
        const analysis = {
            verified: verification.verified,
            confidence: verification.confidence,
            reason: verification.verification.reason,

            // Visual evidence
            visual_evidence: {
                observed: verification.verification.visual_evidence?.observed || 'No visual data',
                matches_criteria: verification.verification.visual_evidence?.matches_criteria || false,
                details: verification.verification.visual_evidence?.details || 'No details'
            },

            // Screenshot info
            screenshot_path: verification.verification.screenshot_path,
            screenshot_hash: verification.verification.screenshot_hash,

            // Suggestions for Atlas
            suggestions: this._generateAtlasSuggestions(verification, item, execution),

            // What went wrong
            failure_analysis: this._analyzeFailure(verification, execution, item),

            // Metadata
            vision_model: verification.verification.vision_model,
            timestamp: new Date().toISOString()
        };

        this.logger.system('grisha-verify-item', `[VISUAL-GRISHA] Analysis complete. Root cause: ${analysis.failure_analysis.likely_cause}`);
        this.logger.system('grisha-verify-item', `[VISUAL-GRISHA] Recommended strategy: ${analysis.failure_analysis.recommended_strategy}`);

        return analysis;
    }

    /**
     * Generate suggestions for Atlas based on verification failure
     * NEW 2025-10-18
     * 
     * @param {Object} verification - Verification result
     * @param {Object} item - TODO item
     * @param {Object} execution - Execution results
     * @returns {Array<string>} Suggestions
     * @private
     */
    _generateAtlasSuggestions(verification, item, execution) {
        const suggestions = [];
        const reason = (verification.verification?.reason || '').toLowerCase();

        // Analyze based on verification reason
        if (reason.includes('не завантажилось') || reason.includes('loading') || reason.includes('завантаження')) {
            suggestions.push('Add explicit wait_for_load_state after navigation');
            suggestions.push('Increase timeout for page operations');
            suggestions.push('Split navigate and scrape into separate TODO items');
        }

        if (reason.includes('не знайдено') || reason.includes('not found') || reason.includes('відсутній')) {
            suggestions.push('Verify search query correctness');
            suggestions.push('Use alternative search strategy');
            suggestions.push('Try different CSS selectors or XPath');
            suggestions.push('Check if website structure changed');
        }

        if (reason.includes('невірний') || reason.includes('invalid') || reason.includes('wrong')) {
            suggestions.push('Fix tool parameters (path/URL/selector)');
            suggestions.push('Validate input data before execution');
            suggestions.push('Use correct parameter names');
        }

        if (reason.includes('результат') && reason.includes('не відповідає')) {
            suggestions.push('Adjust success criteria to be more realistic');
            suggestions.push('Split complex criteria into smaller checks');
            suggestions.push('Add intermediate verification steps');
        }

        // Analyze based on execution results
        if (execution && !execution.all_successful) {
            suggestions.push('Some tools failed - review tool parameters');
            suggestions.push('Check if required data/files exist before using them');
        }

        // Default suggestions if none matched
        if (suggestions.length === 0) {
            suggestions.push('Review visual evidence and adjust approach');
            suggestions.push('Consider splitting into smaller TODO items');
            suggestions.push('Verify all prerequisites are met');
        }

        return suggestions;
    }

    /**
     * Analyze failure to determine root cause
     * NEW 2025-10-18
     * 
     * @param {Object} verification - Verification result
     * @param {Object} execution - Execution results
     * @param {Object} item - TODO item
     * @returns {Object} Failure analysis
     * @private
     */
    _analyzeFailure(verification, execution, item) {
        const analysis = {
            stage: 'verification',
            what_failed: null,
            execution_succeeded: execution?.all_successful || false,
            visual_mismatch: false,
            likely_cause: 'unknown',
            recommended_strategy: 'modify'
        };

        // Determine what failed
        if (!verification.verified) {
            analysis.what_failed = 'Visual verification did not match success criteria';
            analysis.visual_mismatch = !verification.verification?.visual_evidence?.matches_criteria;
        }

        // Determine likely cause
        analysis.likely_cause = this._determineLikelyCause(verification, execution);

        // Recommend strategy based on cause
        analysis.recommended_strategy = this._recommendStrategy(verification, execution, item);

        return analysis;
    }

    /**
     * Determine likely cause of failure
     * NEW 2025-10-18
     * 
     * @param {Object} verification - Verification result
     * @param {Object} execution - Execution results
     * @returns {string} Likely cause
     * @private
     */
    _determineLikelyCause(verification, execution) {
        // Check if tools executed successfully
        if (execution && !execution.all_successful) {
            return 'tool_execution_failed';
        }

        // Check confidence level
        if (verification.confidence < 50) {
            return 'unclear_state';
        }

        // Analyze verification reason
        const reason = (verification.verification?.reason || '').toLowerCase();

        if (reason.includes('timeout') || reason.includes('loading') || reason.includes('завантаження')) {
            return 'timing_issue';
        }

        if (reason.includes('не знайдено') || reason.includes('відсутній') || reason.includes('not found')) {
            return 'wrong_approach';
        }

        if (reason.includes('невірний') || reason.includes('invalid') || reason.includes('wrong')) {
            return 'wrong_parameters';
        }

        if (reason.includes('не відповідає') || reason.includes('mismatch')) {
            return 'unrealistic_criteria';
        }

        return 'unknown';
    }

    /**
     * Recommend strategy based on failure analysis
     * NEW 2025-10-18
     * 
     * @param {Object} verification - Verification result
     * @param {Object} execution - Execution results
     * @param {Object} item - TODO item
     * @returns {string} Recommended strategy
     * @private
     */
    _recommendStrategy(verification, execution, item) {
        const cause = this._determineLikelyCause(verification, execution);

        switch (cause) {
            case 'timing_issue':
                return 'retry_with_delays';

            case 'wrong_approach':
                return 'replan_with_different_tools';

            case 'tool_execution_failed':
                return 'fix_tool_parameters';

            case 'wrong_parameters':
                return 'modify_parameters';

            case 'unrealistic_criteria':
                return 'adjust_success_criteria';

            case 'unclear_state':
                return 'split_into_smaller_items';

            default:
                return 'modify_or_split';
        }
    }

    /**
     * Detect target application for window screenshot
     * 
     * @param {string} action - TODO item action
     * @param {Array} executionResults - Tool execution results
     * @returns {string|null} Target app name or null
     * @private
     */
    _detectTargetApp(action, executionResults = []) {
        const actionLower = (action || '').toLowerCase();

        // Check action text for app keywords
        // FIXED 20.10.2025: More specific keywords to avoid false positives
        const appMappings = [
            { keywords: ['калькулятор', 'calculator'], app: 'Calculator' },
            { keywords: ['safari відкр', 'safari browser'], app: 'Safari' },
            { keywords: ['chrome відкр', 'chrome browser'], app: 'Google Chrome' },
            { keywords: ['firefox відкр', 'firefox browser'], app: 'Firefox' },
            { keywords: ['finder відкр', 'finder window'], app: 'Finder' },
            { keywords: ['notes відкр', 'нотатки відкр'], app: 'Notes' },
            { keywords: ['calendar відкр', 'календар відкр'], app: 'Calendar' },
            { keywords: ['messages відкр', 'повідомлення відкр'], app: 'Messages' }
            // REMOVED: mail/пошта - too generic (conflicts with "оголошень", "пошук")
        ];

        for (const mapping of appMappings) {
            for (const keyword of mapping.keywords) {
                if (actionLower.includes(keyword)) {
                    return mapping.app;
                }
            }
        }

        // Check execution results for AppleScript with app name
        if (Array.isArray(executionResults)) {
            for (const result of executionResults) {
                if (!result.success || !result.data) continue;

                const dataStr = JSON.stringify(result.data).toLowerCase();
                
                for (const mapping of appMappings) {
                    for (const keyword of mapping.keywords) {
                        if (dataStr.includes(keyword)) {
                            return mapping.app;
                        }
                    }
                }
            }
        }

        // No target app detected - use full screen
        return null;
    }

    /**
     * Cleanup and shutdown
     */
    async destroy() {
        if (this.visualCapture) {
            await this.visualCapture.destroy();
        }

        if (this.visionAnalysis) {
            await this.visionAnalysis.destroy();
        }

        this.initialized = false;
        this.logger.system('grisha-verify-item', '[VISUAL-GRISHA] Processor destroyed');
    }
}

export default GrishaVerifyItemProcessor;
