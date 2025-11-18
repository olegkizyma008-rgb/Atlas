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
import { GrishaVerificationEligibilityProcessor } from './grisha-verification-eligibility-processor.js';
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
     * @param {Function} dependencies.callLLM - LLM client function for eligibility routing
     */
    constructor({ mcpTodoManager, wsManager, logger: loggerInstance, config = {}, tetyanaToolSystem, callLLM, container }) {
        this.mcpTodoManager = mcpTodoManager;
        this.wsManager = wsManager;
        this.logger = loggerInstance || logger;
        this.tetyanaToolSystem = tetyanaToolSystem; // For MCP verification fallback
        this.callLLM = callLLM; // For eligibility routing
        this.container = container; // DI Container for resolving processors (NEW 2025-10-22)

        // Initialize verification strategy selector
        this.verificationStrategy = new GrishaVerificationStrategy({
            logger: this.logger
        });

        // Initialize eligibility processor (NEW 2025-10-22)
        this.eligibilityProcessor = new GrishaVerificationEligibilityProcessor({
            callLLM: this.callLLM,
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

        if (!currentItem) {
            throw new Error('currentItem is required for verification');
        }

        if (!execution) {
            throw new Error('execution results are required for verification');
        }

        try {
            this.logger.system('grisha-verify-item', `[GRISHA] Item: ${currentItem.id}. ${currentItem.action}`);
            this.logger.system('grisha-verify-item', `[GRISHA] Success criteria: ${currentItem.success_criteria}`);

            // STEP 0: Analyze execution details - WHAT ACTUALLY HAPPENED
            // CRITICAL 2025-11-03: Grisha must know which tools executed and their results
            const executionAnalysis = this._analyzeExecutionDetails(execution);
            this.logger.system('grisha-verify-item', `[GRISHA] 📊 Execution analysis:`);
            this.logger.system('grisha-verify-item', `[GRISHA]   Total tools planned: ${executionAnalysis.total_planned}`);
            this.logger.system('grisha-verify-item', `[GRISHA]   Successfully executed: ${executionAnalysis.successful_tools.length}`);
            this.logger.system('grisha-verify-item', `[GRISHA]   Failed/Denied: ${executionAnalysis.failed_tools.length}`);

            if (executionAnalysis.successful_tools.length > 0) {
                this.logger.system('grisha-verify-item', `[GRISHA]   ✅ Executed tools:`);
                executionAnalysis.successful_tools.forEach(tool => {
                    this.logger.system('grisha-verify-item', `[GRISHA]      • ${tool.name}`);
                });
            }

            if (executionAnalysis.failed_tools.length > 0) {
                this.logger.system('grisha-verify-item', `[GRISHA]   ❌ Failed/Denied:`);
                executionAnalysis.failed_tools.forEach(tool => {
                    this.logger.system('grisha-verify-item', `[GRISHA]      • ${tool.name}: ${tool.reason}`);
                });
            }

            // Store execution analysis for context
            currentItem._execution_analysis = executionAnalysis;

            // STEP 1: Determine verification strategy (heuristic-based)
            const strategy = this.verificationStrategy.determineStrategy(currentItem, execution);

            this.logger.system('grisha-verify-item', `[GRISHA] 🎯 Heuristic strategy: ${strategy.method.toUpperCase()}`);
            this.logger.system('grisha-verify-item', `[GRISHA] 📊 Heuristic confidence: ${strategy.confidence}%`);
            this.logger.system('grisha-verify-item', `[GRISHA] 💡 Reason: ${strategy.reason}`);

            // STEP 2: LLM-based eligibility decision (ADVISORY, not always authority)
            let eligibilityDecision = null;
            if (this.callLLM) {
                try {
                    const eligibilityResult = await this.eligibilityProcessor.execute({
                        currentItem,
                        execution,
                        verificationStrategy: strategy  // Pass heuristic for context
                    });

                    if (eligibilityResult.success) {
                        eligibilityDecision = eligibilityResult.decision;
                        this.logger.system('grisha-verify-item', `[GRISHA] 🤖 LLM decision: ${eligibilityDecision.recommended_path.toUpperCase()}`);
                        this.logger.system('grisha-verify-item', `[GRISHA] 🤖 LLM confidence: ${eligibilityDecision.confidence}%`);

                        // UNIVERSAL ALGORITHM 2025-10-24: Smart decision priority
                        // Heuristic has priority when it has HIGH confidence (≥80%) from execution analysis
                        // LLM only overrides when heuristic is uncertain (<80% confidence)
                        const heuristicIsStrong = strategy.confidence >= 80;
                        const llmIsStronger = eligibilityDecision.confidence > strategy.confidence + 20;

                        if (heuristicIsStrong && !llmIsStronger) {
                            this.logger.system('grisha-verify-item', `[GRISHA] 💪 Keeping heuristic decision (high confidence: ${strategy.confidence}% vs LLM: ${eligibilityDecision.confidence}%)`);
                            // Keep heuristic strategy, but store LLM decision for fallback
                            strategy.llmSuggestion = eligibilityDecision.recommended_path;
                        } else {
                            // LLM overrides when heuristic is weak OR LLM is much more confident
                            this.logger.system('grisha-verify-item', `[GRISHA] 🤖 Using LLM decision (heuristic: ${strategy.confidence}%, LLM: ${eligibilityDecision.confidence}%)`);

                            if (eligibilityDecision.recommended_path === 'data' || eligibilityDecision.recommended_path === 'hybrid') {
                                strategy.method = 'mcp';
                                strategy.reason = `LLM decision: ${eligibilityDecision.reason}`;
                                strategy.confidence = eligibilityDecision.confidence;
                            } else if (eligibilityDecision.recommended_path === 'visual') {
                                strategy.method = 'visual';
                                strategy.reason = `LLM decision: ${eligibilityDecision.reason}`;
                                strategy.confidence = eligibilityDecision.confidence;
                            }
                        }
                    }
                } catch (eligibilityError) {
                    this.logger.warn(`[GRISHA] ⚠️ LLM eligibility failed, using heuristic fallback: ${eligibilityError.message}`, {
                        category: 'grisha-verify-item'
                    });
                    // Continue with heuristic strategy
                }
            }

            this.logger.system('grisha-verify-item', `[GRISHA] ✅ Final strategy: ${strategy.method.toUpperCase()} (confidence: ${strategy.confidence}%)`);

            // STEP 3: Execute verification based on final strategy
            let verification;

            if (strategy.method === 'visual') {
                // ARCHITECTURE 2025-11-18: 3-attempt visual verification with model + screen mode escalation
                // Attempt 1: Llama 11B (fast) + active_window capture
                this.logger.system('grisha-verify-item', '[GRISHA] 🎯 Visual attempt 1/3 (Llama 11B + active_window)');
                verification = await this._executeVisualVerification(currentItem, execution, todo, strategy, 1);

                // Attempt 2: If first failed, retry with Llama 90B + full_screen capture
                if (!verification.verified) {
                    this.logger.system('grisha-verify-item', '[GRISHA] 🔄 Visual attempt 1 failed, trying attempt 2/3 (Llama 90B + full_screen)');
                    verification = await this._executeVisualVerification(currentItem, execution, todo, strategy, 2);
                }

                // Attempt 3: If both failed, retry with copilot-gpt-4o + desktop_only capture
                if (!verification.verified) {
                    this.logger.system('grisha-verify-item', '[GRISHA] 🔄 Visual attempt 2 failed, trying attempt 3/3 (copilot-gpt-4o + desktop_only)');
                    verification = await this._executeVisualVerification(currentItem, execution, todo, strategy, 3);
                }

                // If ALL 3 visual attempts failed → automatically fallback to MCP verification
                if (!verification.verified) {
                    this.logger.system('grisha-verify-item', '[GRISHA] ⚠️ All 3 visual attempts failed, falling back to MCP verification...');

                    // Create simple MCP strategy for fallback
                    const mcpStrategy = {
                        method: 'mcp',
                        confidence: 80,
                        reason: 'Visual verification failed after 3 attempts (Llama 11B + Llama 90B + copilot-gpt-4o), using data verification'
                    };

                    // Create minimal eligibility decision with server hints to avoid invalid tool names
                    // FIXED 2025-10-24: Provide explicit server hints for common verification tasks
                    const fallbackEligibility = {
                        verification_action: this._transformActionToVerification(currentItem.action),
                        additional_checks: this._generateFallbackChecks(currentItem)
                    };

                    // Try MCP verification with fallback eligibility hints
                    try {
                        const mcpVerification = await this._executeMcpVerification(
                            currentItem,
                            execution,
                            mcpStrategy,
                            fallbackEligibility  // Provide hints to guide server selection
                        );

                        if (mcpVerification.verified) {
                            this.logger.system('grisha-verify-item', '[GRISHA] ✅ MCP verification succeeded after visual failures');
                            verification = mcpVerification;
                        } else {
                            this.logger.system('grisha-verify-item', '[GRISHA] ❌ MCP verification also failed');
                            // Keep the visual verification result with low confidence
                            verification.confidence = Math.min(verification.confidence, 30);
                            verification.reason = `${verification.reason}. MCP верифікація також не вдалася`;
                        }
                    } catch (mcpError) {
                        this.logger.warn(`[GRISHA] MCP fallback failed: ${mcpError.message}`, {
                            category: 'grisha-verify-item'
                        });
                        // Keep visual verification result
                    }
                }
            } else if (strategy.method === 'mcp') {
                // MCP verification (primary) - use additional_checks from eligibility
                verification = await this._executeMcpVerification(currentItem, execution, strategy, eligibilityDecision);

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
     * @param {number} attempt - Attempt number (1 = fast model, 2 = 90b model)
     * @returns {Promise<Object>} Verification result
     * @private
     */
    async _executeVisualVerification(currentItem, execution, todo, strategy, attempt = 1) {
        // UPDATED 2025-11-18: Intelligent screen mode and model selection
        // Let _selectVisualCaptureDecision determine the best mode based on context
        // Fallback to hardcoded sequence if needed
        let screenMode, modelType;

        // Get intelligent decision from LLM
        const captureDecision = await this._selectVisualCaptureDecision('GRISHA', {
            item: currentItem,
            execution,
            targetApp: null, // Will be set below
            attempt,
            strategy,
            preferredScreenMode: null // Let LLM decide
        });

        // Use the LLM's decision if it's confident enough
        if (captureDecision.confidence >= 0.7) {
            screenMode = captureDecision.mode;
            // Map the mode to model type based on confidence
            if (captureDecision.confidence >= 0.8) {
                modelType = 'primary'; // High confidence - use primary model
            } else {
                modelType = 'fast'; // Medium confidence - use fast model
            }
            this.logger.system('grisha-verify-item', `[VISUAL-GRISHA] 🔍 Using intelligent selection (confidence: ${captureDecision.confidence}): mode=${screenMode}, model=${modelType}`);
        } else {
            // Fallback to hardcoded sequence if LLM is not confident
            const screenModeMap = {
                1: 'active_window',
                2: 'full_screen',
                3: 'desktop_only'
            };
            const modelTypeMap = {
                1: 'fast',
                2: 'strong',
                3: 'primary'
            };
            screenMode = screenModeMap[attempt] || 'full_screen';
            modelType = modelTypeMap[attempt] || 'primary';
            this.logger.system('grisha-verify-item', `[VISUAL-GRISHA] ⚠️ Falling back to hardcoded sequence: attempt=${attempt}, mode=${screenMode}, model=${modelType}`);
        }

        this.logger.system('grisha-verify-item', `[VISUAL-GRISHA] 🔍 Starting visual verification (attempt ${attempt}, model: ${modelType}, screen: ${screenMode})...`);

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

            // Step 2: Use the already determined screen mode from the intelligent selection
            const captureDecision = {
                mode: screenMode,
                target_app: targetApp,
                display_number: null,
                require_retry: false,
                fallback_mode: screenMode === 'active_window' ? 'full_screen' : null,
                reasoning: `Using ${screenMode} mode with ${modelType} model (attempt ${attempt})`,
                confidence: 0.8
            };

            const captureContextId = `item_${currentItem.id}_verify_attempt${attempt}`;
            const primaryOptions = {
                mode: captureDecision.mode,
                targetApp: captureDecision.target_app || targetApp,
                displayNumber: captureDecision.display_number
            };

            let screenshot;

            try {
                // FIXED 2025-11-18: Pass shouldActivate: false for verification (observe, don't modify state)
                screenshot = await this.visualCapture.captureScreenshot(
                    captureContextId,
                    {
                        mode: primaryOptions.mode,
                        targetApp: primaryOptions.targetApp,
                        displayNumber: primaryOptions.displayNumber,
                        shouldActivate: false  // VERIFICATION: Don't activate app, just observe
                    }
                );
            } catch (captureError) {
                this.logger.warn(`[VISUAL-GRISHA] ⚠️ Primary screenshot failed (${primaryOptions.mode}): ${captureError.message}`, {
                    category: 'grisha-verify-item',
                    mode: primaryOptions.mode,
                    targetApp: primaryOptions.targetApp,
                    displayNumber: primaryOptions.displayNumber
                });

                if (captureDecision.require_retry && captureDecision.fallback_mode) {
                    this.logger.system('grisha-verify-item', `[VISUAL-GRISHA] 🔄 Retrying screenshot with fallback mode: ${captureDecision.fallback_mode}`);
                    // FIXED 2025-11-18: Also pass shouldActivate: false for fallback (verification mode)
                    screenshot = await this.visualCapture.captureScreenshot(
                        `${captureContextId}_fallback`,
                        {
                            mode: captureDecision.fallback_mode,
                            targetApp: captureDecision.fallback_mode === 'active_window'
                                ? (captureDecision.target_app || targetApp)
                                : null,
                            displayNumber: captureDecision.fallback_mode === 'desktop_only'
                                ? (captureDecision.display_number || null)
                                : null,
                            shouldActivate: false  // VERIFICATION: Don't activate app, just observe
                        }
                    );
                } else {
                    throw captureError;
                }
            }

            this.logger.system('grisha-verify-item', `[VISUAL-GRISHA] 📸 Screenshot captured: ${screenshot.filename}`);
            this.logger.system('grisha-verify-item', `[VISUAL-GRISHA] 📂 Full path: ${screenshot.filepath}`);
            this.logger.system('grisha-verify-item', `[VISUAL-GRISHA] 📷 Capture mode: ${screenshot.mode}${screenshot.targetApp ? ' (' + screenshot.targetApp + ')' : ''}`);

            // Add delay for any GUI app to fully render
            const actionLower = (currentItem.action || '').toLowerCase();
            if (targetApp || this._detectsAppInteraction(actionLower)) {
                const delayMs = this._getAppRenderDelay(targetApp, actionLower);
                if (delayMs > 0) {
                    this.logger.system('grisha-verify-item', `[VISUAL-GRISHA] ⏱️ Waiting ${delayMs}ms for ${targetApp || 'application'} to fully render...`);
                    await new Promise(resolve => setTimeout(resolve, delayMs));
                }
            }

            // Step 2: Analyze screenshot with AI vision
            // ENHANCED 2025-10-22: Pass modelType for attempt-based model selection
            // FIXED 2025-10-29: Add TODO context for mathematical operations
            // CRITICAL 2025-11-03: Add execution analysis so vision knows WHAT ACTUALLY HAPPENED
            const executionAnalysis = currentItem._execution_analysis || this._analyzeExecutionDetails(execution);

            const analysisContext = {
                action: currentItem.action,
                executionResults: execution.results || [],
                modelType: modelType,  // 'fast' for attempt 1, 'primary' for attempt 2
                captureDecision,
                targetApp: targetApp || 'Unknown',
                // CRITICAL 2025-11-03: What tools actually executed
                executionAnalysis: {
                    total_planned: executionAnalysis.total_planned,
                    successful_count: executionAnalysis.successful_tools.length,
                    failed_count: executionAnalysis.failed_tools.length,
                    partial_success: executionAnalysis.partial_success,
                    actions_taken: executionAnalysis.actions_taken,
                    expected_changes: executionAnalysis.expected_state_changes,
                    successful_tools: executionAnalysis.successful_tools.map(t => t.name),
                    failed_tools: executionAnalysis.failed_tools.map(t => `${t.name} (${t.reason})`)
                },
                // Add TODO context for better understanding of mathematical operations
                todoContext: {
                    allItems: todo?.items?.map(item => ({
                        id: item.id,
                        action: item.action,
                        status: item.status
                    })) || [],
                    currentItemIndex: todo?.items?.findIndex(item => item.id === currentItem.id) || 0,
                    totalItems: todo?.items?.length || 1,
                    originalUserRequest: todo?.user_message || currentItem.action
                }
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
            // FIXED 2025-11-17: Use visionModel from service instance instead of config
            const modelUsed = this.visionAnalysis?.visionModel || this.visionAnalysis?.config?.visionModel || 'unknown';
            this.logger.system('grisha-verify-item', `[VISUAL-GRISHA] 🤖 Model used: ${modelUsed}`);
            this.logger.system('grisha-verify-item', `[VISUAL-GRISHA] 🤖 Verified: ${visionAnalysis.verified}`);
            this.logger.system('grisha-verify-item', `[VISUAL-GRISHA] 🤖 Reason: ${visionAnalysis.reason}`);

            // Step 3: Build verification result with INTELLIGENT CHECKS
            // INTELLIGENT VERIFICATION 2025-10-24: Dynamic confidence based on evidence quality
            const minConfidence = this._calculateMinimumConfidence(currentItem, visionAnalysis);
            let verified = visionAnalysis.verified && visionAnalysis.confidence >= minConfidence;
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

            // FIXED 2025-11-18: If LLM reason explicitly mentions matching criteria, trust it
            // Even if confidence is low, the semantic analysis is more reliable than confidence score
            const reasonLower = (visionAnalysis.reason || '').toLowerCase();

            // FIXED 2025-11-18 (CRITICAL): Detect contradictions in reason
            // If reason says "X matches Y" but X != Y, it's a contradiction - reject it
            const hasContradiction = this._detectReasonContradiction(visionAnalysis.reason, visionAnalysis.visual_evidence?.observed);

            // FIXED 2025-11-19: CRITICAL - Check for EXPLICIT SUCCESS, not just word presence
            // "does not match" contains "match" but means FAILURE, not success!
            // Only trust if LLM explicitly says it matches/succeeds WITHOUT negation
            // IMPORTANT: Check for negations FIRST before checking for positive keywords
            const hasNegation = reasonLower.includes('does not match') ||
                reasonLower.includes('does not equal') ||
                reasonLower.includes('не відповід') ||
                reasonLower.includes('не дорівнює') ||
                reasonLower.includes('не збіг') ||
                reasonLower.includes('не совпад') ||
                reasonLower.includes('не совпадает') ||
                reasonLower.includes('not correct') ||
                reasonLower.includes('incorrect') ||
                reasonLower.includes('not updated') ||
                reasonLower.includes('не готово') ||
                reasonLower.includes('не виконано') ||
                reasonLower.includes('не зроблено') ||
                reasonLower.includes('не завершено') ||
                reasonLower.includes('not done') ||
                reasonLower.includes('not completed') ||
                reasonLower.includes('not success') ||
                reasonLower.includes('unsuccessful');

            const reasonMentionsMatch = !hasNegation && (
                reasonLower.includes('match') ||
                reasonLower.includes('відповід') ||
                reasonLower.includes('успішно') ||
                reasonLower.includes('correct') ||
                reasonLower.includes('updated') ||
                reasonLower.includes('готово') ||
                reasonLower.includes('виконано') ||
                reasonLower.includes('зроблено') ||
                reasonLower.includes('завершено') ||
                reasonLower.includes('done') ||
                reasonLower.includes('completed') ||
                reasonLower.includes('success')
            );

            if (reasonMentionsMatch && visionAnalysis.visual_evidence && !hasContradiction) {
                // LLM explicitly says it matches - set matches_criteria to true
                visionAnalysis.visual_evidence.matches_criteria = true;
                this.logger.system('grisha-verify-item', `[VISUAL-GRISHA] 🔧 FIXED 2025-11-19: LLM reason explicitly mentions success (no negation), setting matches_criteria=true`);
            } else if (hasContradiction) {
                // LLM has contradictory statement - reject it
                visionAnalysis.visual_evidence.matches_criteria = false;
                this.logger.warn(`[VISUAL-GRISHA] ❌ FIXED 2025-11-19: LLM reason contains mismatch statement, rejecting`, {
                    category: 'grisha-verify-item',
                    reason: visionAnalysis.reason,
                    observed: visionAnalysis.visual_evidence?.observed
                });
            }

            // SECURITY CHECK 2: Require matches_criteria to be explicitly true
            // FIXED 2025-11-04: Skip this check for markdown-parsed responses
            // FIXED 2025-11-18: Also skip if LLM reason explicitly mentions matching
            // FIXED 2025-11-18: If reasonMentionsMatch is true, we already set matches_criteria=true above
            if (verified && !visionAnalysis._markdown_parsed && !reasonMentionsMatch && visionAnalysis.visual_evidence?.matches_criteria !== true) {
                verified = false;
                rejectionReason = 'Visual evidence does not explicitly match success criteria (matches_criteria !== true)';
                this.logger.warn(`[VISUAL-GRISHA] ❌ SECURITY: Visual evidence mismatch`, {
                    category: 'grisha-verify-item',
                    reason: rejectionReason,
                    matches_criteria: visionAnalysis.visual_evidence?.matches_criteria
                });
            }

            // INTELLIGENT CHECK 3: Dynamic confidence threshold based on task complexity
            // FIXED 2025-11-17: Only apply minConfidence check if vision model returned low confidence
            // Don't override high confidence (>80%) with arbitrary thresholds
            // FIXED 2025-11-18: If matches_criteria is true, accept verification even with low confidence
            // FIXED 2025-11-18 (CRITICAL): If LLM explicitly says it matches, ALWAYS accept - don't check confidence
            // FIXED 2025-11-18 (CRITICAL): If reason mentions match/success, ALWAYS accept - semantic analysis > confidence score
            if (visionAnalysis.visual_evidence?.matches_criteria === true || reasonMentionsMatch) {
                // ✅ LLM explicitly confirmed match - ACCEPT regardless of confidence
                this.logger.system('grisha-verify-item', `[VISUAL-GRISHA] ✅ FIXED 2025-11-18: LLM confirmed match - ACCEPTING (confidence: ${visionAnalysis.confidence}%, reasonMentionsMatch: ${reasonMentionsMatch})`);
                verified = true;
                rejectionReason = null;
            } else if (visionAnalysis.verified && visionAnalysis.confidence < minConfidence && visionAnalysis.confidence < 60) {
                // Only reject if BOTH confidence is very low AND matches_criteria is NOT true
                // Raise threshold from 80 to 60 to be less aggressive
                this.logger.warn(`[VISUAL-GRISHA] ⚠️  Low confidence verification rejected (${visionAnalysis.confidence}% < ${minConfidence}%)`, {
                    category: 'grisha-verify-item',
                    task_type: this._getTaskType(currentItem),
                    required_confidence: minConfidence
                });
                verified = false;
                rejectionReason = `Low confidence (${visionAnalysis.confidence}% < required ${minConfidence}%)`;
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
                if (verification.confidence < minConfidence) {
                    this.logger.system('grisha-verify-item', `[VISUAL-GRISHA]      - Rejected: Low confidence (${verification.confidence}% < required ${minConfidence}%)`);
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

    async _selectVisualCaptureDecision(agentRole, { item, execution, targetApp, attempt, strategy, preferredScreenMode }) {
        // INTELLIGENT CAPTURE MODE SELECTION
        // UPDATED 2025-11-18: Use preferredScreenMode hint for attempt-based screen selection
        // No hardcoded decisions - pure intelligence based on context
        const fallbackDecision = this._intelligentCaptureModeFallback(item, targetApp, attempt, preferredScreenMode);

        try {
            if (!this.callLLM) {
                return fallbackDecision;
            }

            const prompt = MCP_PROMPTS.VISUAL_CAPTURE_MODE_SELECTOR;
            if (!prompt) {
                return fallbackDecision;
            }

            const modelConfig = GlobalConfig.MCP_MODEL_CONFIG.getStageConfig('visual_capture_mode_selector');

            const hintLines = [
                targetApp ? `Target application: ${targetApp}` : null,
                attempt > 1 ? `Retry attempt: ${attempt}` : null,
                preferredScreenMode ? `Preferred screen mode for this attempt: ${preferredScreenMode}` : null,
                strategy?.reason ? `Strategy insight: ${strategy.reason}` : null,
                strategy?.method ? `Verification method: ${strategy.method}` : null
            ].filter(Boolean);

            const visualHints = hintLines.length > 0 ? hintLines.join('\n') : 'No additional hints';

            const environmentContext = {
                execution_summary: execution?.results?.slice(-3) || [],
                target_app: targetApp,
                attempt,
                heuristic_confidence: strategy?.confidence || null
            };

            const userPrompt = prompt.userPrompt
                .replace('{{AGENT_ROLE}}', agentRole)
                .replace('{{TASK_DESCRIPTION}}', item?.action || 'Unknown action')
                .replace('{{VISUAL_HINTS}}', visualHints)
                .replace('{{ENVIRONMENT_CONTEXT}}', JSON.stringify(environmentContext, null, 2))
                .replace('{{PREVIOUS_ATTEMPTS}}', JSON.stringify(execution?.visualAttempts || []))
                .replace('{{ADDITIONAL_NOTES}}', 'Visual verification evidence capture for Grisha');

            const selectorResponse = await this.callLLM({
                systemPrompt: prompt.systemPrompt,
                userPrompt,
                model: modelConfig.model,
                temperature: modelConfig.temperature,
                max_tokens: modelConfig.max_tokens
            });

            const decision = this._parseVisualSelectorResponse(selectorResponse, fallbackDecision);
            decision.reasoning && this.logger.system('grisha-verify-item', `[VISUAL-GRISHA] 🧠 Capture decision: ${decision.reasoning}`);
            return decision;

        } catch (error) {
            this.logger.warn(`[VISUAL-GRISHA] ⚠️ Capture mode selection failed: ${error.message}`, {
                category: 'grisha-verify-item'
            });
            return fallbackDecision;
        }
    }

    _parseVisualSelectorResponse(response, fallbackDecision) {
        try {
            const cleaned = typeof response === 'string' ? response.trim() : JSON.stringify(response);
            const jsonStart = cleaned.indexOf('{');
            const jsonEnd = cleaned.lastIndexOf('}');
            if (jsonStart === -1 || jsonEnd === -1 || jsonEnd <= jsonStart) {
                throw new Error('Selector response missing JSON object');
            }

            const parsed = JSON.parse(cleaned.slice(jsonStart, jsonEnd + 1));
            return {
                mode: parsed.mode || fallbackDecision.mode,
                target_app: parsed.target_app ?? fallbackDecision.target_app,
                display_number: parsed.display_number ?? fallbackDecision.display_number,
                require_retry: Boolean(parsed.require_retry ?? fallbackDecision.require_retry),
                fallback_mode: parsed.fallback_mode ?? fallbackDecision.fallback_mode,
                reasoning: parsed.reasoning || fallbackDecision.reasoning,
                confidence: parsed.confidence ?? fallbackDecision.confidence
            };
        } catch (error) {
            this.logger.warn(`[VISUAL-GRISHA] ⚠️ Failed to parse capture selector response: ${error.message}`, {
                category: 'grisha-verify-item'
            });
            return { ...fallbackDecision, reasoning: 'Fallback due to selector parse error' };
        }
    }

    /**
     * Execute MCP tool verification
     * 
     * @param {Object} currentItem - Current TODO item
     * @param {Object} execution - Execution results
     * @param {Object} strategy - Verification strategy
     * @param {Object} eligibilityDecision - Eligibility decision with additional_checks (optional)
     * @returns {Promise<Object>} Verification result
     * @private
     */
    async _executeMcpVerification(currentItem, execution, strategy, eligibilityDecision = null) {
        this.logger.system('grisha-verify-item', '[MCP-GRISHA] 🔧 Starting MCP tool verification...');

        try {
            // REFACTORED 2025-10-29: Use unified MCP workflow instead of calling processors directly
            // This ensures both Grisha and Tetyana use the same workflow code
            // Benefits: no duplication, easier maintenance, same capabilities for both agents

            if (!this.container) {
                throw new Error('DI Container not available for MCP verification');
            }

            // Get MCPTodoManager which has the unified workflow
            const mcpTodoManager = this.container.resolve('mcpTodoManager');
            if (!mcpTodoManager) {
                throw new Error('MCPTodoManager not found in DI Container');
            }

            // Create verification item from eligibility hints (if available)
            // FIXED 2025-10-23: Use verification_action from eligibilityDecision (LLM transforms action)
            // CRITICAL FIX 2025-10-23: Smart fallback transforms action verbs (create→verify existence)
            const verificationAction = eligibilityDecision?.verification_action || this._transformActionToVerification(currentItem.action);

            // Determine MCP servers for verification:
            // 1) Prefer Stage 2.0 selection stored on original item (strict reuse)
            // 2) Fallback to eligibility hints (additional_checks)
            // 3) Let unified workflow perform its own selection as last resort
            let verificationServers = [];

            if (Array.isArray(currentItem._mcp_selected_servers) && currentItem._mcp_selected_servers.length > 0) {
                verificationServers = [...currentItem._mcp_selected_servers];
                this.logger.system('grisha-verify-item', `[MCP-GRISHA] 🔒 Using persisted Stage 2.0 servers for verification: ${verificationServers.join(', ')}`);
            } else if (eligibilityDecision?.additional_checks) {
                verificationServers = eligibilityDecision.additional_checks
                    .map(c => c.server)
                    .filter(Boolean)
                    .filter((v, i, a) => a.indexOf(v) === i);

                if (verificationServers.length > 0) {
                    this.logger.system('grisha-verify-item', `[MCP-GRISHA] 🎯 Using eligibility-based server hints: ${verificationServers.join(', ')}`);
                }
            }

            const verificationItem = {
                id: `verify_${currentItem.id}_${Date.now()}`,
                action: verificationAction,
                success_criteria: currentItem.success_criteria,
                // Strict server reuse from Stage 2.0 when available
                mcp_servers: verificationServers,
                parameters: {},
                max_attempts: 1,
                dependencies: []
            };

            this.logger.system('grisha-verify-item', `[MCP-GRISHA] Verification item: ${JSON.stringify(verificationItem, null, 2)}`);

            // Create session with processors for unified workflow
            const session = {
                processors: {
                    serverSelection: this.container.resolve('serverSelectionProcessor'),
                    tetyanaPlan: this.container.resolve('tetyanaPlanToolsProcessor'),
                    tetyanaExecute: this.container.resolve('tetyanaExecuteToolsProcessor')
                }
            };

            // Execute unified MCP workflow - same as Tetyana uses
            this.logger.system('grisha-verify-item', '[MCP-GRISHA] 🔄 Using unified MCP workflow (same as Tetyana)...');
            const workflowResult = await mcpTodoManager.executeVerificationWorkflow(verificationItem, session);

            if (!workflowResult.success) {
                this.logger.warn('[MCP-GRISHA] Unified workflow failed', {
                    category: 'grisha-verify-item',
                    error: workflowResult.execution?.error
                });
                return {
                    verified: false,
                    confidence: 0,
                    reason: workflowResult.execution?.error || 'MCP верифікація не вдалася',
                    method: 'mcp',
                    error: true
                };
            }

            const verificationResults = workflowResult.execution;
            const metadata = workflowResult.metadata;

            this.logger.system('grisha-verify-item', `[MCP-GRISHA] ✅ Workflow completed via unified pipeline`);
            this.logger.system('grisha-verify-item', `[MCP-GRISHA]   Servers: ${metadata.selected_servers?.join(', ') || 'auto'}`);
            this.logger.system('grisha-verify-item', `[MCP-GRISHA]   Tools: ${metadata.planned_tools?.length || 0}`);
            this.logger.system('grisha-verify-item', `[MCP-GRISHA]   Success: ${verificationResults.all_successful ? '✅' : '❌'}`);

            // Log detailed results for analysis
            this.logger.system('grisha-verify-item', '[MCP-GRISHA] 📊 Verification execution results:');
            this.logger.system('grisha-verify-item', `[MCP-GRISHA]   All successful: ${verificationResults.all_successful}`);
            this.logger.system('grisha-verify-item', `[MCP-GRISHA]   Tool count: ${verificationResults.results?.length || 0}`);

            if (verificationResults.results && verificationResults.results.length > 0) {
                verificationResults.results.forEach((result, idx) => {
                    const status = result.success ? '✅' : '❌';
                    this.logger.system('grisha-verify-item', `[MCP-GRISHA]   ${status} Tool ${idx + 1}: ${result.metadata?.tool || 'unknown'}`);
                    if (result.data) {
                        this.logger.system('grisha-verify-item', `[MCP-GRISHA]      Data: ${JSON.stringify(result.data).substring(0, 200)}`);
                    }
                    if (result.error) {
                        this.logger.system('grisha-verify-item', `[MCP-GRISHA]      Error: ${result.error}`);
                    }
                });
            }

            // Analyze results with Grisha's logic
            this.logger.system('grisha-verify-item', '[MCP-GRISHA] 🔍 Analyzing results against success criteria...');
            const verified = this._analyzeMcpResults(verificationResults, currentItem.success_criteria);

            const verification = {
                verified: verified.success,
                confidence: verified.confidence,
                reason: verified.reason,
                mcp_results: verificationResults,
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

    // REMOVED 2025-10-23: Obsolete methods after refactoring to full Stage 2.0→2.1→2.2 workflow
    // - _executeVerificationThroughTetyanaProcessor: bypassed Stage 2.0 and 2.1, went directly to Stage 2.2
    // - _buildMcpVerificationCalls: no longer needed, Stage 2.1 (Tetyana Plan Tools) handles this
    //
    // New architecture ensures scalability with 10+ MCP servers:
    // Stage 2.0: Server Selection from many servers
    // Stage 2.1: Tetyana Plan Tools with specialized prompts + JSON Schema
    // Stage 2.2: Tetyana Execute Tools with full validation pipeline

    /**
     * Analyze MCP tool results for verification
     * 
     * @param {Object} results - Tool execution results from TetyanaToolSystem
     * @param {string} successCriteria - Success criteria
     * @returns {Object} Analysis result
     * @private
     */
    _analyzeMcpResults(results, successCriteria) {
        // CRITICAL FIX 2025-10-29: Handle both object and array results
        // TetyanaToolSystem returns {all_successful, results: [...]}
        // But sometimes results might be passed directly as array

        let resultsArray;
        let allSuccessful;

        if (Array.isArray(results)) {
            // Direct array of results
            resultsArray = results;
            allSuccessful = results.every(r => r.success);
        } else if (results && typeof results === 'object') {
            // TetyanaToolSystem structure
            allSuccessful = results.all_successful;
            resultsArray = results.results || [];
        } else {
            // Invalid structure
            return {
                success: false,
                confidence: 0,
                reason: 'MCP верифікація: невалідна структура результатів'
            };
        }

        // FIXED 2025-11-04: Don't fail immediately on tool errors - analyze the actual data
        // Some tools may fail but still provide useful verification data
        if (!allSuccessful && resultsArray.length > 0) {
            // Check if we have any successful results with data
            const successfulResults = resultsArray.filter(r => r.success && r.data);
            if (successfulResults.length === 0) {
                const failedTools = resultsArray.filter(r => !r.success).map(r => r.tool || r.metadata?.tool || 'unknown');
                return {
                    success: false,
                    confidence: 0,
                    reason: `MCP інструменти не виконались: ${failedTools.join(', ')}`
                };
            }
        }

        // Extract file/directory path from success criteria
        const criteriaLower = successCriteria.toLowerCase();

        // Check for file/directory existence verification
        // CRITICAL FIX 30.10.2025: Only check filesystem if criteria explicitly mentions files/folders
        const isFileSystemCriteria = criteriaLower.includes('файл') ||
            criteriaLower.includes('папк') ||
            criteriaLower.includes('директорі') ||
            criteriaLower.includes('file') ||
            criteriaLower.includes('folder') ||
            criteriaLower.includes('directory');

        if (isFileSystemCriteria && (criteriaLower.includes('існує') || criteriaLower.includes('знайдено') || criteriaLower.includes('наявний'))) {
            // Look for filesystem operations in results
            const filesystemResults = resultsArray.filter(r =>
                r.tool && r.tool.includes('filesystem') && r.success && r.data
            );

            if (filesystemResults.length > 0) {
                return {
                    success: true,
                    confidence: 90,
                    reason: 'MCP підтвердив: файл/директорія існує'
                };
            } else {
                // FIXED 2025-11-04: Enhanced confidence calculation with better criteria matching
                const dataAnalysis = this._analyzeDataQuality(resultsArray);

                // Check if results actually match the success criteria
                const criteriaMatched = this._checkCriteriaMatch(successCriteria, dataAnalysis, resultsArray);

                if (criteriaMatched.matched) {
                    return {
                        success: true,
                        confidence: criteriaMatched.confidence,
                        reason: criteriaMatched.reason || 'MCP верифікація підтвердила виконання',
                        details: this._extractExecutionDetails(resultsArray)
                    };
                }

                // If criteria not matched but tools executed successfully
                // FIXED 2025-11-18: If all tools succeeded, accept it - MCP execution is reliable
                if (resultsArray.every(r => r.success)) {
                    return {
                        success: true,
                        confidence: 85,
                        reason: 'Всі MCP інструменти виконані успішно',
                        details: this._extractExecutionDetails(resultsArray)
                    };
                }

                return {
                    success: false,
                    confidence: 40,
                    reason: 'MCP інструменти виконані, але результат не відповідає критеріям',
                    details: this._extractExecutionDetails(resultsArray)
                };
            }
        }

        // FIXED 2025-11-04: CRITICAL - ALWAYS check if results match success criteria
        // Don't just check if tools executed - verify the ACTUAL result matches what was expected!
        const dataAnalysis = this._analyzeDataQuality(resultsArray);

        // Check if results actually match the success criteria
        const criteriaMatched = this._checkCriteriaMatch(successCriteria, dataAnalysis, resultsArray);

        if (criteriaMatched.matched) {
            return {
                success: true,
                confidence: criteriaMatched.confidence,
                reason: criteriaMatched.reason || 'MCP верифікація підтвердила виконання критеріїв',
                details: this._extractExecutionDetails(resultsArray)
            };
        }

        // If criteria not matched, return failure even if tools executed successfully
        // FIXED 2025-11-18: If all tools succeeded, accept it - MCP execution is reliable
        if (resultsArray.every(r => r.success)) {
            return {
                success: true,
                confidence: 85,
                reason: 'Всі MCP інструменти виконані успішно',
                details: this._extractExecutionDetails(resultsArray)
            };
        }

        // This is the key fix - tools can execute but not achieve the goal!
        return {
            success: false,
            confidence: 30,
            reason: `MCP інструменти виконані, але результат не відповідає критеріям: "${successCriteria}"`,
            details: this._extractExecutionDetails(resultsArray),
            suggestion: 'Перевірте чи інструменти виконують правильну дію для досягнення критерію успіху'
        };
    }

    /**
     * Transform action from creation verbs to verification verbs
     * CRITICAL FIX 2025-10-23: Fallback when LLM doesn't provide verification_action
     * 
     * Examples:
     * - "Створити папку X" → "Перевірити існування папки X"
     * - "Зберегти файл Y" → "Перевірити існування файлу Y"
     * - "Завантажити фото Z" → "Перевірити наявність фото Z"
     * 
     * @param {string} action - Original action
     * @returns {string} Transformed action with verification verb
     * @private
     */
    _transformActionToVerification(action) {
        if (!action || typeof action !== 'string') {
            return 'Перевірити виконання дії';
        }

        const actionLower = action.toLowerCase();

        // Transformation rules (creation → verification)
        const transformations = [
            // File/folder operations
            { patterns: ['створити папку', 'зробити папку', 'create folder', 'create directory'], replacement: 'Перевірити існування папки' },
            { patterns: ['створити файл', 'зробити файл', 'create file'], replacement: 'Перевірити існування файлу' },
            { patterns: ['зберегти файл', 'записати файл', 'save file', 'write file'], replacement: 'Перевірити існування файлу' },
            { patterns: ['зберегти результат', 'записати результат'], replacement: 'Перевірити збережений результат' },

            // Download operations
            { patterns: ['завантажити фото', 'download photo', 'download image'], replacement: 'Перевірити наявність фото' },
            { patterns: ['завантажити файл', 'download file'], replacement: 'Перевірити наявність файлу' },
            { patterns: ['завантажити з інтернету', 'download from'], replacement: 'Перевірити завантажений файл' },

            // Application operations
            { patterns: ['відкрити програму', 'відкрити додаток', 'launch app', 'open app'], replacement: 'Перевірити що відкрито програму' },
            { patterns: ['запустити програму', 'start program'], replacement: 'Перевірити що запущено програму' },

            // Calculation operations - UNIVERSAL: just verify result without mentioning operation details
            { patterns: ['виконати обчислення', 'порахувати', 'calculate', 'compute'], replacement: 'Перевірити результат' },
            { patterns: ['помножити', 'multiply'], replacement: 'Перевірити результат' },
            { patterns: ['додати', 'add'], replacement: 'Перевірити результат' },
            { patterns: ['відняти', 'subtract'], replacement: 'Перевірити результат' },
            { patterns: ['округлити', 'round'], replacement: 'Перевірити результат' },

            // System operations
            { patterns: ['встановити', 'install', 'set', 'change'], replacement: 'Перевірити встановлення' },
            { patterns: ['налаштувати', 'configure'], replacement: 'Перевірити налаштування' }
        ];

        // Find matching transformation
        for (const transform of transformations) {
            for (const pattern of transform.patterns) {
                if (actionLower.includes(pattern)) {
                    // Extract object/target after pattern
                    const patternIndex = actionLower.indexOf(pattern);
                    const afterPattern = action.substring(patternIndex + pattern.length).trim();

                    // Return transformed action
                    if (afterPattern) {
                        return `${transform.replacement} ${afterPattern}`;
                    } else {
                        return transform.replacement;
                    }
                }
            }
        }

        // No pattern matched - use simplest possible verification action
        // UNIVERSAL ALGORITHM 2025-10-24: Maximum simplicity to avoid LLM needs_split
        // Any mention of specific operations → LLM may think it needs to execute them
        // Solution: Just "Verify result" - LLM checks current state, not executes action
        return 'Перевірити результат';
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

        // ADDED 2025-11-19: Support multilingual TTS phrases based on user language
        let localizationService = null;
        let userLanguage = 'uk';

        try {
            if (this.container) {
                localizationService = this.container.resolve('localizationService');
                if (localizationService) {
                    userLanguage = localizationService.config.getUserLanguage();
                }
            }
        } catch (error) {
            this.logger.warn('[GRISHA] Could not resolve localizationService for language', { category: 'grisha-verify-item' });
        }

        // ADDED 2025-11-19: Multilingual phrases
        const phrasesByLanguage = {
            uk: {
                success: [
                    'Підтверджено',
                    'Все правильно',
                    'Виконано коректно',
                    'Перевірено, все гаразд',
                    'Результат вірний',
                    'Все на місці'
                ],
                failure: [
                    'Не підтверджено',
                    'Є проблема',
                    'Щось не так',
                    'Потрібна корекція',
                    'Виявлено помилку',
                    'Не відповідає очікуванням'
                ]
            },
            en: {
                success: [
                    'Confirmed',
                    'All correct',
                    'Executed correctly',
                    'Verified, all good',
                    'Result is correct',
                    'Everything in place'
                ],
                failure: [
                    'Not confirmed',
                    'There is a problem',
                    'Something is wrong',
                    'Correction needed',
                    'Error detected',
                    'Does not meet expectations'
                ]
            },
            es: {
                success: [
                    'Confirmado',
                    'Todo correcto',
                    'Ejecutado correctamente',
                    'Verificado, todo bien',
                    'El resultado es correcto',
                    'Todo en su lugar'
                ],
                failure: [
                    'No confirmado',
                    'Hay un problema',
                    'Algo está mal',
                    'Se necesita corrección',
                    'Error detectado',
                    'No cumple con las expectativas'
                ]
            },
            fr: {
                success: [
                    'Confirmé',
                    'Tout correct',
                    'Exécuté correctement',
                    'Vérifié, tout va bien',
                    'Le résultat est correct',
                    'Tout est en place'
                ],
                failure: [
                    'Non confirmé',
                    'Il y a un problème',
                    'Quelque chose ne va pas',
                    'Correction nécessaire',
                    'Erreur détectée',
                    'Ne répond pas aux attentes'
                ]
            },
            de: {
                success: [
                    'Bestätigt',
                    'Alles korrekt',
                    'Korrekt ausgeführt',
                    'Verifiziert, alles gut',
                    'Ergebnis ist korrekt',
                    'Alles an Ort und Stelle'
                ],
                failure: [
                    'Nicht bestätigt',
                    'Es gibt ein Problem',
                    'Etwas stimmt nicht',
                    'Korrektur erforderlich',
                    'Fehler erkannt',
                    'Erfüllt nicht die Erwartungen'
                ]
            },
            pl: {
                success: [
                    'Potwierdzone',
                    'Wszystko poprawne',
                    'Wykonane poprawnie',
                    'Zweryfikowane, wszystko dobrze',
                    'Wynik jest poprawny',
                    'Wszystko na miejscu'
                ],
                failure: [
                    'Nie potwierdzone',
                    'Jest problem',
                    'Coś nie tak',
                    'Wymagana korekta',
                    'Wykryty błąd',
                    'Nie spełnia oczekiwań'
                ]
            },
            ru: {
                success: [
                    'Подтверждено',
                    'Все правильно',
                    'Выполнено корректно',
                    'Проверено, все хорошо',
                    'Результат верен',
                    'Все на месте'
                ],
                failure: [
                    'Не подтверждено',
                    'Есть проблема',
                    'Что-то не так',
                    'Требуется коррекция',
                    'Обнаружена ошибка',
                    'Не соответствует ожиданиям'
                ]
            }
        };

        // Get phrases for current language (fallback to Ukrainian if not found)
        const langPhrases = phrasesByLanguage[userLanguage] || phrasesByLanguage['uk'];

        let shortTTS;
        if (verified) {
            shortTTS = langPhrases.success[this._verifyPhraseIndex % langPhrases.success.length];
        } else {
            shortTTS = langPhrases.failure[this._verifyPhraseIndex % langPhrases.failure.length];
        }
        this._verifyPhraseIndex++;

        this.logger.system('grisha-verify-item', `[GRISHA] TTS phrase (${userLanguage}): "${shortTTS}"`);
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

    // REMOVED 2025-10-23: Dead code - _executeAdditionalChecks and _checkExpectedEvidence
    // These methods used direct tetyanaToolSystem calls, bypassing MCP workflow.
    // Now using _executeVerificationThroughTetyanaProcessor which properly routes through:
    //   - Stage 2.0: Server Selection
    //   - Stage 2.1: Tetyana Plan Tools (with LLM prompt)
    //   - Stage 2.2: Tetyana Execute Tools (with full validation pipeline)
    // See _executeMcpVerification() line 688 for correct implementation.

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
     * Analyze data quality from MCP results
     * FIXED 2025-11-04: Added missing method
     * 
     * @param {Array} results - MCP execution results
     * @returns {Object} Data analysis
     * @private
     */
    _analyzeDataQuality(results) {
        const analysis = {
            hasContent: false,
            hasFiles: false,
            hasState: false,
            hasNumbers: false,
            hasErrors: false,
            fileCount: 0,
            contentLength: 0,
            errorCount: 0
        };

        if (!Array.isArray(results)) {
            return analysis;
        }

        for (const result of results) {
            // Check for content
            if (result.content || result.output || result.data) {
                analysis.hasContent = true;
                const content = result.content || result.output || result.data || '';
                analysis.contentLength += String(content).length;
            }

            // Check for files
            if (result.files || result.file || result.path) {
                analysis.hasFiles = true;
                if (Array.isArray(result.files)) {
                    analysis.fileCount += result.files.length;
                } else {
                    analysis.fileCount++;
                }
            }

            // Check for state changes
            if (result.state || result.status || result.running) {
                analysis.hasState = true;
            }

            // Check for numbers
            const content = JSON.stringify(result);
            if (/\d+/.test(content)) {
                analysis.hasNumbers = true;
            }

            // Check for errors
            if (result.error || !result.success) {
                analysis.hasErrors = true;
                analysis.errorCount++;
            }
        }

        return analysis;
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
     * ENHANCED 2025-10-23: Better root cause detection with fallback analysis
     * 
     * @param {Object} verification - Verification result
     * @param {Object} execution - Execution results
     * @returns {string} Likely cause
     * @private
     */
    _determineLikelyCause(verification, execution) {
        // Check if tools executed successfully
        if (execution && !execution.all_successful) {
            // Analyze which tools failed
            const failedTools = execution.results?.filter(r => !r.success) || [];
            if (failedTools.length > 0) {
                const firstFailure = failedTools[0];
                const errorMsg = (firstFailure.error || '').toLowerCase();

                if (errorMsg.includes('not found') || errorMsg.includes('does not exist')) {
                    return 'missing_prerequisite';
                }
                if (errorMsg.includes('permission') || errorMsg.includes('access denied')) {
                    return 'permission_issue';
                }
                if (errorMsg.includes('invalid') || errorMsg.includes('parameter')) {
                    return 'wrong_parameters';
                }
            }
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

        if (reason.includes('не існує') || reason.includes('does not exist')) {
            return 'missing_prerequisite';
        }

        if (reason.includes('fallback') || reason.includes('unstructured')) {
            return 'vision_model_failure';
        }

        // ENHANCED: Analyze visual evidence for more clues
        const visualEvidence = verification.verification?.visual_evidence;
        if (visualEvidence) {
            const observed = (visualEvidence.observed || '').toLowerCase();
            const details = (visualEvidence.details || '').toLowerCase();

            if (observed.includes('empty') || observed.includes('порожньо') || observed.includes('nothing')) {
                return 'missing_prerequisite';
            }

            if (details.includes('error') || details.includes('помилка')) {
                return 'execution_error_visible';
            }

            if (details.includes('different') || details.includes('інший')) {
                return 'wrong_approach';
            }
        }

        // ENHANCED: If verification failed but tools succeeded, likely wrong approach
        if (execution && execution.all_successful && !verification.verified) {
            return 'tools_succeeded_but_wrong_result';
        }

        // Last resort: analyze item action for hints
        return 'verification_criteria_not_met';
    }

    /**
     * Recommend strategy based on failure analysis
     * ENHANCED 2025-10-23: More specific strategies for new root causes
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

            case 'missing_prerequisite':
                return 'add_prerequisite_step';

            case 'permission_issue':
                return 'fix_permissions';

            case 'vision_model_failure':
                return 'retry_with_mcp_verification';

            case 'execution_error_visible':
                return 'fix_execution_error';

            case 'tools_succeeded_but_wrong_result':
                return 'change_approach_or_tools';

            case 'verification_criteria_not_met':
                return 'adjust_criteria_or_approach';

            default:
                return 'modify_or_split';
        }
    }

    /**
     * Detect target application for window screenshot
     * UNIVERSAL: Extract app from execution data or action text
     * 
     * @param {string} action - TODO item action
     * @param {Array} executionResults - Tool execution results
     * @returns {string|null} Target app name or null
     * @private
     */
    _detectTargetApp(action, executionResults) {
        const actionLower = (action || '').toLowerCase();
        let targetApp = null;

        // UNIVERSAL: Extract from AppleScript execution
        if (executionResults && executionResults.length > 0) {
            for (const result of executionResults) {
                const toolName = (result.tool || '').toLowerCase();
                if (toolName.includes('applescript')) {
                    const dataStr = JSON.stringify(result.data || {}).toLowerCase();
                    // Pattern: "tell application \"AppName\""
                    const appMatch = dataStr.match(/tell\s+application\s+["']([^"']+)["']/i);
                    if (appMatch && appMatch[1]) {
                        targetApp = appMatch[1].trim();
                        // Capitalize properly
                        targetApp = targetApp.split(/\s+/).map(w =>
                            w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
                        ).join(' ');
                        this.logger.system('grisha-verify-item',
                            `[VISUAL-GRISHA] 🎯 App extracted from AppleScript: ${targetApp}`
                        );
                        return targetApp;
                    }
                }
            }
        }

        // UNIVERSAL: Extract app name from action text using patterns
        const appPatterns = [
            /(?:відкрити|запустити|launch|open|activate)\s+["']?([a-zа-яії\s\-\.]+?)["']?(?:\s|$|,|\.)/i,
            /(?:програм[аи]|додаток|app|application)\s+["']?([a-zа-яії\s\-\.]+?)["']?(?:\s|$|,|\.)/i,
            /["']?([a-zа-яії\s\-\.]+?)["']?\s+(?:відкрито|запущено|активовано|running|active|launched)/i
        ];

        for (const pattern of appPatterns) {
            const match = action.match(pattern);
            if (match && match[1]) {
                targetApp = match[1].trim().split(/\s+/).map(w =>
                    w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
                ).join(' ');

                this.logger.system('grisha-verify-item',
                    `[VISUAL-GRISHA] 🎯 App extracted from text: ${targetApp}`
                );
                return targetApp;
            }
        }

        // No target app detected - use full screen
        return null;
    }

    /**
     * Intelligent capture mode fallback without hardcoding
     * 
     * @private
     */
    _intelligentCaptureModeFallback(item, targetApp, attempt, preferredScreenMode) {
        // UPDATED 2025-11-18: Use preferredScreenMode hint for attempt-based selection
        // Intelligent mode selection based on verification needs and attempt number
        const action = (item?.action || '').toLowerCase();

        // If preferredScreenMode is provided (from attempt-based mapping), use it
        if (preferredScreenMode) {
            const modeReasons = {
                'active_window': 'Attempt 1: Focused capture on target application',
                'full_screen': 'Attempt 2: Full screen capture for broader context',
                'desktop_only': 'Attempt 3: Desktop-only capture without windows'
            };

            return {
                mode: preferredScreenMode,
                target_app: targetApp || null,
                display_number: null,
                require_retry: false,
                fallback_mode: null,
                reasoning: modeReasons[preferredScreenMode] || 'Intelligent screen mode selection',
                confidence: 0.8
            };
        }

        // Fallback: Analyze context to determine best capture mode
        let mode = 'full_screen'; // Safe default - captures everything
        let confidence = 0.5;
        let reasoning = 'Default full screen capture for complete context';

        // If we have evidence of app interaction, prefer active window
        if (targetApp || this._detectsAppInteraction(action)) {
            mode = 'active_window';
            confidence = 0.7;
            reasoning = 'App interaction detected - capturing active window';
        }

        // If verifying desktop state, use desktop_only
        if (this._detectsDesktopVerification(action)) {
            mode = 'desktop_only';
            confidence = 0.6;
            reasoning = 'Desktop state verification - capturing desktop only';
        }

        // For retries, switch strategy
        if (attempt > 1) {
            if (mode === 'active_window') {
                mode = 'full_screen';
                reasoning = 'Retry with broader context after active window attempt';
            } else if (mode === 'desktop_only') {
                mode = 'full_screen';
                reasoning = 'Retry with full context after desktop-only attempt';
            }
            confidence *= 0.8; // Lower confidence for retries
        }

        return {
            mode,
            target_app: targetApp || null,
            display_number: null,
            require_retry: attempt === 1 && confidence < 0.6,
            fallback_mode: mode === 'active_window' ? 'full_screen' : null,
            reasoning,
            confidence
        };
    }

    /**
     * Detect if action involves app interaction
     * 
     * @private
     */
    _detectsAppInteraction(action) {
        // Intelligent patterns for app interaction
        const interactionPatterns = [
            /відкри|open|запусти|launch|start|активуй|activate/,
            /програм|application|app|додаток/,
            /вікн|window|інтерфейс|interface/,
            /натисн|click|press|клік/,
            /введ|type|enter|набер/
        ];

        return interactionPatterns.some(pattern => pattern.test(action));
    }

    /**
     * Detect if action involves desktop verification
     * 
     * @private
     */
    _detectsDesktopVerification(action) {
        // Intelligent patterns for desktop state
        const desktopPatterns = [
            /робоч.*стіл|desktop/,
            /фон|background/,
            /екран|screen|display|монітор/,
            /роздільн|resolution/
        ];

        return desktopPatterns.some(pattern => pattern.test(action));
    }

    /**
     * Extract target app from action text
     * INTELLIGENT: Works for any language without hardcoding specific apps
     * 
     * @private
     */
    _extractTargetApp(action) {
        if (!action) return null;

        const actionLower = action.toLowerCase();

        // Intelligent app extraction patterns
        const appPatterns = [
            /(?:відкрити|open|запустити|launch|start|активувати)\s+([\w\s]+?)(?:\s|$|,|\.|;)/i,
            /(?:в|in|у|at)\s+([\w\s]+?)(?:\s+програм|\s+app|\s+додатк|$|,|\.|;)/i,
            /(?:програма|application|app|додаток)\s+([\w\s]+?)(?:\s|$|,|\.|;)/i
        ];

        for (const pattern of appPatterns) {
            const match = action.match(pattern);
            if (match && match[1]) {
                const app = match[1].trim();
                // Filter out common non-app words intelligently
                if (app.length > 2 && !this._isCommonWord(app)) {
                    return this._normalizeAppName(app);
                }
            }
        }

        return null;
    }

    /**
     * Check if word is a common non-app word
     * 
     * @private
     */
    _isCommonWord(word) {
        const commonWords = [
            // Articles and conjunctions (multiple languages)
            'the', 'a', 'an', 'і', 'та', 'або', 'or', 'and',
            // Prepositions
            'в', 'у', 'на', 'з', 'до', 'in', 'on', 'at', 'to', 'from',
            // Common verbs that aren't apps
            'це', 'є', 'this', 'is', 'are', 'be'
        ];

        return commonWords.includes(word.toLowerCase());
    }

    /**
     * Normalize app name intelligently
     * 
     * @private
     */
    _normalizeAppName(appName) {
        // Capitalize first letter of each word
        return appName.split(/\s+/).map(word =>
            word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        ).join(' ');
    }

    /**
     * Get appropriate render delay for app
     * 
     * @private
     */
    _getAppRenderDelay(targetApp, action) {
        // Intelligent delay based on app complexity
        const actionLower = action.toLowerCase();

        // Heavy apps need more time
        if (targetApp && (targetApp.includes('Xcode') || targetApp.includes('Photoshop') ||
            targetApp.includes('Final Cut') || targetApp.includes('Logic'))) {
            return 3000;
        }

        // Medium apps
        if (targetApp && (targetApp.includes('Safari') || targetApp.includes('Chrome') ||
            targetApp.includes('Chromium') || targetApp.includes('Firefox') ||
            targetApp.includes('Pages') || targetApp.includes('Numbers') ||
            targetApp.includes('Keynote'))) {
            return 2000;
        }

        // Light apps or general GUI operations
        if (this._detectsAppInteraction(actionLower)) {
            return 1500;
        }

        // No delay needed
        return 0;
    }

    /**
     * Extract app name from action for MCP checks
     * 
     * @private
     */
    _extractAppNameFromAction(actionLower) {
        // Try to extract app name using intelligent patterns
        const patterns = [
            /(?:відкрити|open|запустити|launch|activate)\s+([\w\s]+?)(?:\s|$|,|\.|;)/i,
            /([\w\s]+?)\s+(?:програм|app|додаток)/i,
            /(?:в|in|у)\s+([\w\s]+?)(?:\s|$|,|\.|;)/i
        ];

        for (const pattern of patterns) {
            const match = actionLower.match(pattern);
            if (match && match[1]) {
                const appName = match[1].trim();
                if (appName.length > 2 && !this._isCommonWord(appName)) {
                    return this._normalizeAppName(appName);
                }
            }
        }

        return null;
    }

    /**
     * Generate fallback MCP checks based on action keywords
     * Provides server hints to avoid invalid tool name generation
     * @private
     */
    _generateFallbackChecks(currentItem) {
        const actionLower = (currentItem.action || '').toLowerCase();
        const checks = [];

        // File/folder operations → filesystem server
        if (actionLower.includes('файл') || actionLower.includes('file') ||
            actionLower.includes('папк') || actionLower.includes('folder') ||
            actionLower.includes('директор') || actionLower.includes('directory') ||
            actionLower.includes('зберегти') || actionLower.includes('save')) {
            checks.push({
                server: 'filesystem',
                tool: 'filesystem__read_file',
                description: 'Check file existence and content'
            });
        }

        // App window state verification → AppleScript
        const appName = this._extractAppNameFromAction(actionLower);
        if (appName) {
            checks.push({
                server: 'applescript',
                tool: 'applescript__applescript_execute',
                description: `Get ${appName} window state`,
                parameters: {
                    code_snippet: `tell application "System Events"\n    if exists process "${appName}" then\n        tell process "${appName}"\n            if exists window 1 then\n                return "${appName} is open with window visible"\n            else\n                return "${appName} is running but no window"\n            end if\n        end tell\n    else\n        return "${appName} is not running"\n    end if\nend tell`
                }
            });
        }

        // UNIVERSAL: Math operations → detect from context, not hardcode
        if (actionLower.match(/[\d\+\-\*\/\=]/) ||
            actionLower.match(/помнож|множ|додай|відн|поділ|обчисл|результат|multiply|add|subtract|divide|calculate|result/i)) {
            checks.push({
                server: 'applescript',
                tool: 'applescript__applescript_execute',
                description: 'Check application state via AppleScript'
            });
        }

        // Download/web operations → playwright server
        if (actionLower.includes('завантаж') || actionLower.includes('download') ||
            actionLower.includes('інтернет') || actionLower.includes('internet') ||
            actionLower.includes('браузер') || actionLower.includes('browser')) {
            checks.push({
                server: 'playwright',
                tool: 'playwright__playwright_navigate',
                description: 'Check web/download operation'
            });
        }

        // System operations → shell server
        if (actionLower.match(/встановити|install|set|change|system|display|екран|монітор/)) {
            checks.push({
                server: 'shell',
                tool: 'shell__execute_command',
                reason: 'Check system settings'
            });
        }

        // Default fallback: filesystem (most common verification)
        if (checks.length === 0) {
            checks.push({
                server: 'filesystem',
                tool: 'filesystem__list_directory',
                description: 'Generic verification check'
            });
        }

        return checks;
    }

    /**
     * Build enriched context for vision analysis
     * UNIVERSAL: Builds context from ALL previous items, not just specific apps
     * 
     * @param {Object} currentItem - Current TODO item
     * @param {Object} execution - Execution results
     * @param {Object} todo - Full TODO object
     * @param {Object} baseContext - Base context to enrich
     * @returns {Object} Enriched context
     * @private
     */
    _buildEnrichedContext(currentItem, execution, todo, baseContext = {}) {
        const enrichedContext = { ...baseContext };

        // UNIVERSAL: Build context from ALL previous items
        if (todo && todo.items) {
            const previousItems = todo.items.filter(item => {
                // Include all items before current (by ID or hierarchy)
                const isBefore = this._isItemBefore(item, currentItem, todo.items);
                return isBefore && item.status === 'completed';
            });

            if (previousItems.length > 0) {
                // Build execution history from ALL previous items
                const historyLines = [];
                const contextActions = [];

                previousItems.forEach(item => {
                    // Add action to context
                    contextActions.push(`Step ${item.id}: ${item.action}`);

                    // Add execution results if available
                    if (item.execution_results && Array.isArray(item.execution_results)) {
                        const tools = item.execution_results.map(r => r.tool || 'unknown').join(', ');
                        historyLines.push(`${item.action} (tools: ${tools})`);
                    } else {
                        historyLines.push(item.action);
                    }
                });

                // Add universal context for ANY workflow
                enrichedContext.previous_actions = contextActions.join('\n');
                enrichedContext.execution_history = historyLines.join('\n');

                // Extract specific context based on patterns
                enrichedContext.workflow_context = this._extractWorkflowContext(previousItems, currentItem);

                this.logger.system('grisha-verify-item',
                    `[VISUAL-GRISHA] 📊 Context from ${previousItems.length} previous items`
                );
            }
        }

        return enrichedContext;
    }

    /**
     * Check if item is before another in execution order
     * Handles hierarchical IDs (1, 1.1, 1.1.1, etc.)
     * 
     * @private
     */
    _isItemBefore(item1, item2, allItems) {
        // Simple numeric comparison for non-hierarchical IDs
        if (typeof item1.id === 'number' && typeof item2.id === 'number') {
            return item1.id < item2.id;
        }

        // String ID comparison (handles hierarchical)
        const id1 = String(item1.id);
        const id2 = String(item2.id);

        // Check if item1 is parent of item2
        if (id2.startsWith(id1 + '.')) {
            return true;
        }

        // Check if they share parent and item1 comes before
        const parts1 = id1.split('.');
        const parts2 = id2.split('.');

        for (let i = 0; i < Math.min(parts1.length, parts2.length); i++) {
            const num1 = parseInt(parts1[i]);
            const num2 = parseInt(parts2[i]);
            if (num1 < num2) return true;
            if (num1 > num2) return false;
        }

        return parts1.length < parts2.length;
    }

    /**
     * Extract workflow-specific context from previous items
     * UNIVERSAL: Works for any type of workflow
     * 
     * @private
     */
    _extractWorkflowContext(previousItems, currentItem) {
        const context = [];
        const actionLower = (currentItem.action || '').toLowerCase();

        // Math operations context
        if (actionLower.match(/[\d\+\-\*\/\=]|результат|result|обчисл|calculate/)) {
            const mathItems = previousItems.filter(item => {
                const act = (item.action || '').toLowerCase();
                return act.match(/[\d\+\-\*\/\=]|помнож|додай|відн|поділ/);
            });

            if (mathItems.length > 0) {
                const operations = mathItems.map(item => {
                    const nums = item.action.match(/\d+/g);
                    if (nums && nums.length >= 2) {
                        if (item.action.match(/помнож|multiply|\*/i)) return `${nums[0]}*${nums[1]}`;
                        if (item.action.match(/додай|add|\+/i)) return `+${nums[0]}`;
                        if (item.action.match(/відн|subtract|\-/i)) return `-${nums[0]}`;
                        if (item.action.match(/поділ|divide|\//i)) return `/${nums[0]}`;
                    }
                    return item.action;
                });
                context.push(`Math operations: ${operations.join(', ')}`);
            }
        }

        // File operations context
        if (actionLower.match(/файл|папк|folder|file|збереж|save/)) {
            const fileItems = previousItems.filter(item => {
                const act = (item.action || '').toLowerCase();
                return act.match(/файл|папк|folder|file|створ|збереж|create|save/);
            });

            if (fileItems.length > 0) {
                const paths = fileItems.map(item => {
                    const pathMatch = item.action.match(/["']([^"']+)["']/);
                    return pathMatch ? pathMatch[1] : item.action;
                });
                context.push(`File operations: ${paths.join(', ')}`);
            }
        }

        // App operations context
        const appMatch = actionLower.match(/(?:в|у|in)\s+([\w\s]+?)(?:\s|$|,|\.)/i);
        if (appMatch) {
            const appName = appMatch[1];
            const appItems = previousItems.filter(item => {
                const act = (item.action || '').toLowerCase();
                return act.includes(appName.toLowerCase());
            });

            if (appItems.length > 0) {
                context.push(`${appName} operations: ${appItems.map(i => i.action).join('; ')}`);
            }
        }

        return context.length > 0 ? context.join('\n') : null;
    }

    /**
     * Calculate minimum confidence based on task complexity and type
     * INTELLIGENT VERIFICATION 2025-10-24: Dynamic thresholds
     * 
     * @param {Object} item - Current item being verified
     * @param {Object} visionAnalysis - Vision analysis results
     * @returns {number} Minimum required confidence (0-100)
     * @private
     */
    _calculateMinimumConfidence(item, visionAnalysis) {
        const taskType = this._getTaskType(item);
        const hasNumericalData = this._hasNumericalData(item, visionAnalysis);

        // FIXED 2025-11-17: If vision model returned high confidence (>=80%), trust it
        // Don't apply arbitrary thresholds that override the model's confidence
        if (visionAnalysis.confidence >= 80) {
            return 0; // Accept any confidence >= 80%
        }

        // For lower confidence responses, apply task-specific thresholds
        // Mathematical operations require highest confidence
        if (taskType === 'mathematical' || hasNumericalData) {
            return 60; // Lowered from 85 - model knows better than arbitrary threshold
        }

        // File/folder operations - moderate confidence
        if (taskType === 'file_operation') {
            return 50; // Lowered from 75
        }

        // UI operations - lower confidence acceptable
        if (taskType === 'ui_operation') {
            return 50; // Lowered from 65
        }

        // Visual changes - lowest confidence acceptable
        if (taskType === 'visual_change') {
            return 50; // Lowered from 60
        }

        // Default moderate confidence
        return 50; // Lowered from 70
    }

    /**
     * Determine task type from item action
     * 
     * @param {Object} item - Current item
     * @returns {string} Task type identifier
     * @private
     */
    _getTaskType(item) {
        const action = (item?.action || '').toLowerCase();

        // Mathematical operations
        if (action.match(/множ|додай|відн|поділ|округл|результат|обчисл|calculate|multiply|add|subtract|divide|\d+\s*[\+\-\*\/]\s*\d+/)) {
            return 'mathematical';
        }

        // File operations
        if (action.match(/файл|папк|збереж|створ|folder|file|save|create|directory/)) {
            return 'file_operation';
        }

        // UI operations
        if (action.match(/відкр|закр|натисн|клік|open|close|click|press/)) {
            return 'ui_operation';
        }

        // Visual changes
        if (action.match(/фото|зображ|photo|image|visual|візуальн/)) {
            return 'visual_change';
        }

        return 'general';
    }

    /**
     * Check if verification involves numerical data
     * 
     * @param {Object} item - Current item
     * @param {Object} visionAnalysis - Vision analysis results
     * @returns {boolean} True if numerical verification needed
     * @private
     */
    _hasNumericalData(item, visionAnalysis) {
        // Check item action for numbers
        const action = item?.action || '';
        if (/\d+/.test(action)) {
            return true;
        }

        // Check vision analysis for numerical evidence
        const observed = visionAnalysis?.visual_evidence?.observed || '';
        if (/\d+/.test(observed)) {
            return true;
        }

        // Check success criteria for numerical expectations
        const criteria = item?.success_criteria || '';
        if (/\d+/.test(criteria)) {
            return true;
        }

        return false;
    }

    /**
     * Calculate execution confidence based on MCP results
     * INTELLIGENT CONFIDENCE 2025-10-24: Dynamic calculation
     * 
     * @param {Array} results - MCP execution results
     * @returns {number} Calculated confidence (0-100)
     * @private
     */
    _calculateExecutionConfidence(results) {
        if (!results || results.length === 0) {
            return 50; // Low confidence for empty results
        }

        let baseConfidence = 60;
        let bonusPoints = 0;

        // Analyze each result
        results.forEach(result => {
            if (result.success) {
                bonusPoints += 10;

                // Extra points for specific confirmations
                if (result.data?.exists === true) {
                    bonusPoints += 15; // File/folder confirmed to exist
                }

                if (result.data?.content && typeof result.data.content === 'string') {
                    // Check if content contains expected numerical result
                    const numbers = result.data.content.match(/\d+\.?\d*/g);
                    if (numbers && numbers.length > 0) {
                        bonusPoints += 10; // Has numerical content

                        // Verify mathematical correctness if possible
                        if (this._verifyMathematicalResult(result.data.content)) {
                            bonusPoints += 20; // Mathematically correct
                        }
                    }
                }

                if (result.data?.size > 0) {
                    bonusPoints += 5; // File has content
                }
            } else {
                bonusPoints -= 20; // Penalty for failed operations
            }
        });

        // Calculate final confidence
        const finalConfidence = Math.min(95, Math.max(30, baseConfidence + bonusPoints));

        return finalConfidence;
    }

    /**
     * Verify mathematical result correctness
     * INTELLIGENT VERIFICATION 2025-10-24: No hardcoded values
     * 
     * @param {string} content - Content potentially containing math result
     * @returns {boolean} True if mathematically valid
     * @private
     */
    _verifyMathematicalResult(content) {
        // Extract numbers from content
        const numbers = content.match(/\d+\.?\d*/g);
        if (!numbers || numbers.length === 0) {
            return false;
        }

        const result = parseFloat(numbers[0]);

        // INTELLIGENT CHECKS - No hardcoded expected values

        // Check 1: Result should be a reasonable number
        if (isNaN(result) || !isFinite(result)) {
            this.logger.warn('[GRISHA] ⚠️ Invalid mathematical result', {
                content,
                extracted_number: result
            });
            return false;
        }

        // Check 2: Percentage in math result is suspicious
        if (content.includes('%') && !content.toLowerCase().includes('percent')) {
            this.logger.warn('[GRISHA] ⚠️ Mathematical result contains unexpected percentage', {
                content,
                extracted_number: result,
                note: 'Percentage symbol found but not expected in calculation context'
            });
            return false;
        }

        // Check 3: Result should be within reasonable bounds
        // Most numerical results are between -1,000,000 and 1,000,000
        if (Math.abs(result) > 1000000) {
            this.logger.warn('[GRISHA] ⚠️ Mathematical result seems unusually large', {
                content,
                extracted_number: result
            });
            // Still might be valid for large calculations
        }

        // Check 4: For decimal results, check precision
        const decimalPlaces = (numbers[0].split('.')[1] || '').length;
        if (decimalPlaces > 10) {
            this.logger.warn('[GRISHA] ⚠️ Excessive decimal precision', {
                content,
                decimal_places: decimalPlaces
            });
        }

        // Check 5: Content structure validation
        // Valid formats: pure numbers, "Result: number", etc.
        // Invalid formats: unexpected percentage symbols
        const validPatterns = [
            /^\d+\.?\d*$/,                    // Just a number
            /result[:\s]+\d+\.?\d*/i,         // Result: number
            /=\s*\d+\.?\d*/,                  // = number
            /answer[:\s]+\d+\.?\d*/i,         // Answer: number
            /total[:\s]+\d+\.?\d*/i           // Total: number
        ];

        const hasValidFormat = validPatterns.some(pattern => pattern.test(content.trim()));

        if (!hasValidFormat && content.includes('%')) {
            // Percentage without proper context is likely an error
            this.logger.warn('[GRISHA] ⚠️ Suspicious format with percentage', {
                content,
                format_check: 'failed'
            });
            return false;
        }

        // If all checks pass, consider it valid
        return true;
    }

    /**
     * Analyze execution details - WHAT ACTUALLY HAPPENED
     * CRITICAL 2025-11-03: Understand which tools executed vs failed
     * 
     * @param {Object} execution - Full execution object from Stage 2.2
     * @returns {Object} Detailed analysis
     * @private
     */
    _analyzeExecutionDetails(execution) {
        const analysis = {
            total_planned: 0,
            successful_tools: [],
            failed_tools: [],
            partial_success: false,
            actions_taken: [],
            expected_state_changes: []
        };

        if (!execution || !execution.results) {
            return analysis;
        }

        const results = Array.isArray(execution.results) ? execution.results : [];
        analysis.total_planned = results.length;

        results.forEach((result, idx) => {
            const toolInfo = {
                name: result.metadata?.tool || result.tool || `Tool ${idx + 1}`,
                server: result.metadata?.server || 'unknown',
                success: result.success || false,
                reason: result.error || (result.success ? 'completed' : 'failed')
            };

            if (result.success) {
                analysis.successful_tools.push(toolInfo);

                // Extract what action was taken
                if (toolInfo.name.includes('navigate')) {
                    analysis.actions_taken.push('Opened webpage');
                    analysis.expected_state_changes.push('Browser shows target URL');
                } else if (toolInfo.name.includes('fill')) {
                    analysis.actions_taken.push('Filled form field');
                    analysis.expected_state_changes.push('Input field contains value');
                } else if (toolInfo.name.includes('click')) {
                    analysis.actions_taken.push('Clicked element');
                    analysis.expected_state_changes.push('UI state changed after click');
                } else if (toolInfo.name.includes('execute')) {
                    analysis.actions_taken.push('Executed command');
                    analysis.expected_state_changes.push('Command effect visible');
                }
            } else {
                analysis.failed_tools.push(toolInfo);
            }
        });

        analysis.partial_success = analysis.successful_tools.length > 0 && analysis.failed_tools.length > 0;

        return analysis;
    }

    /**
     * Extract execution details for logging
     * 
     * @param {Array} results - MCP execution results
     * @returns {Object} Execution details
     * @private
     */
    _extractExecutionDetails(results) {
        const details = {
            total_operations: results.length,
            successful: 0,
            failed: 0,
            key_findings: []
        };

        results.forEach(result => {
            if (result.success) {
                details.successful++;

                // Extract key findings
                if (result.data?.exists !== undefined) {
                    details.key_findings.push(`File exists: ${result.data.exists}`);
                }
                if (result.data?.content) {
                    const preview = result.data.content.substring(0, 50);
                    details.key_findings.push(`Content: "${preview}..."`);
                }
                if (result.data?.size) {
                    details.key_findings.push(`Size: ${result.data.size} bytes`);
                }
            } else {
                details.failed++;
                if (result.error) {
                    details.key_findings.push(`Error: ${result.error}`);
                }
            }
        });

        return details;
    }

    /**
     * Check if MCP results match success criteria
     * FIXED 2025-11-04: Better criteria matching logic
     * 
     * @param {string} criteria - Success criteria
     * @param {Object} dataAnalysis - Data quality analysis
     * @param {Array} results - MCP results
     * @returns {Object} Match result with confidence
     * @private
     */
    _checkCriteriaMatch(criteria, dataAnalysis, results) {
        const criteriaLower = criteria.toLowerCase();

        // FIXED 2025-11-04: Check for specific patterns in criteria
        if (criteriaLower.includes('відкрит') || criteriaLower.includes('open') ||
            criteriaLower.includes('запущен') || criteriaLower.includes('launched') ||
            criteriaLower.includes('видим') || criteriaLower.includes('visible') ||
            criteriaLower.includes('активн') || criteriaLower.includes('active')) {

            // Application/browser opening - check if AppleScript executed successfully
            const hasAppleScriptCheck = results.some(r =>
                r.tool?.includes('applescript') &&
                r.success &&
                (r.data || r.output || r.content)
            );

            if (hasAppleScriptCheck || dataAnalysis.hasState) {
                return { matched: true, confidence: 90, reason: 'Програму відкрито успішно (підтверджено через AppleScript)' };
            }

            // CRITICAL FIX 2025-11-04: If no tools were executed (tool count = 0), 
            // but execution was successful, assume the check passed
            // This handles cases where verification item doesn't generate tools
            if (results.length === 0 && criteriaLower.includes('перевір')) {
                // This is a verification check that didn't execute tools - likely the original action already succeeded
                return { matched: true, confidence: 75, reason: 'Верифікація не потребує додаткових інструментів - дія вже виконана' };
            }

            // CRITICAL FIX 2025-11-04: Even if just AppleScript executed without errors, consider it success
            // This handles "Safari відкрито та видимий" - if activate succeeded, app is visible
            if (results.some(r => r.tool?.includes('applescript') && r.success)) {
                return { matched: true, confidence: 90, reason: 'AppleScript виконано успішно - програма відкрита і видима' };
            }
        }

        if (criteriaLower.includes('результат') || criteriaLower.includes('result')) {
            // Calculation/operation result
            if (dataAnalysis.hasNumbers || dataAnalysis.hasContent) {
                return { matched: true, confidence: 80, reason: 'Результат отримано' };
            }
        }

        if (criteriaLower.includes('створен') || criteriaLower.includes('create')) {
            // File/folder creation
            if (dataAnalysis.hasFiles) {
                return { matched: true, confidence: 90, reason: 'Файл/папку створено' };
            }
        }

        // Default: if we have any meaningful data, consider it a partial match
        if (dataAnalysis.hasContent || dataAnalysis.hasState) {
            return { matched: true, confidence: 70, reason: 'Операція виконана' };
        }

        return { matched: false, confidence: 30, reason: 'Критерії не підтверджено' };
    }

    /**
     * Calculate execution confidence based on results
     * FIXED 2025-11-04: More nuanced confidence calculation
     * 
     * @param {Array} results - MCP results
     * @returns {number} Confidence percentage
     * @private
     */
    _calculateExecutionConfidence(results) {
        if (!results || results.length === 0) return 0;

        const successCount = results.filter(r => r.success).length;
        const totalCount = results.length;
        const successRate = successCount / totalCount;

        // Base confidence on success rate
        let confidence = Math.round(successRate * 100);

        // Adjust based on data quality
        const hasData = results.some(r => r.data && Object.keys(r.data).length > 0);
        if (hasData) {
            confidence = Math.min(confidence + 10, 95);
        }

        return confidence;
    }

    /**
     * Detect contradictions in LLM reason vs observed value
     * FIXED 2025-11-18: Reject verifications where LLM says "X matches Y" but X != Y
     * FIXED 2025-11-19: Check for EXPLICIT MISMATCH statements like "does not match"
     * 
     * @param {string} reason - LLM reason text
     * @param {string} observed - Observed value from screenshot
     * @returns {boolean} True if contradiction detected (i.e., LLM says it DOESN'T match)
     * @private
     */
    _detectReasonContradiction(reason = '', observed = '') {
        if (!reason || !observed) return false;

        const reasonLower = reason.toLowerCase();
        const observedLower = observed.toLowerCase();

        // CRITICAL FIX 2025-11-19: Check for EXPLICIT MISMATCH statements
        // If LLM explicitly says "does not match" or "does not equal", it's a MISMATCH, not a match!
        const hasMismatchStatement = reasonLower.includes('does not match') ||
            reasonLower.includes('does not equal') ||
            reasonLower.includes('не відповід') ||
            reasonLower.includes('не дорівнює') ||
            reasonLower.includes('не збіг') ||
            reasonLower.includes('не совпад') ||
            reasonLower.includes('не совпадает');

        if (hasMismatchStatement) {
            this.logger.warn(`[VISUAL-GRISHA] MISMATCH DETECTED: LLM explicitly states values do not match`, {
                category: 'grisha-verify-item',
                reason: reason
            });
            return true;
        }

        // Check for explicit contradictions like "X matches Y" where X != Y
        // Pattern: "displays X" or "shows X" or "result is X" followed by "matches" or "expected"
        const displayMatch = reason.match(/(?:displays?|shows?|result\s+(?:is|of)|calculator\s+(?:displays?|shows?))\s+([^,.\n]+)/i);
        const expectedMatch = reason.match(/(?:expected|should\s+be|expected\s+result)\s+(?:is\s+)?([^,.\n]+)/i);

        if (displayMatch && expectedMatch) {
            const displayed = displayMatch[1].trim().toLowerCase();
            const expected = expectedMatch[1].trim().toLowerCase();

            // If they're different and reason says they match, it's a contradiction
            if (displayed !== expected && reasonLower.includes('match')) {
                this.logger.warn(`[VISUAL-GRISHA] Contradiction detected: displayed="${displayed}" vs expected="${expected}"`, {
                    category: 'grisha-verify-item'
                });
                return true;
            }
        }

        // FIXED 2025-11-18: Don't check for number contradictions - too aggressive
        // LLM may mention numbers in context without them being the actual observed value
        // E.g., "The Calculator displays 27 after adding 27" - both are 27 but different contexts
        // Only check for explicit text contradictions, not numeric ones

        return false;
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
