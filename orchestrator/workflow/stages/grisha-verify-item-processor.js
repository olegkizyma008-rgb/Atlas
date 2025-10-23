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

            // STEP 1: Determine verification strategy (heuristic-based)
            const strategy = this.verificationStrategy.determineStrategy(currentItem, execution);
            
            this.logger.system('grisha-verify-item', `[GRISHA] 🎯 Heuristic strategy: ${strategy.method.toUpperCase()}`);
            this.logger.system('grisha-verify-item', `[GRISHA] 📊 Heuristic confidence: ${strategy.confidence}%`);
            this.logger.system('grisha-verify-item', `[GRISHA] 💡 Reason: ${strategy.reason}`);

            // STEP 1: LLM-based eligibility decision (PRIMARY)
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

                        // LLM is the authority - use its recommendation
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
                // ARCHITECTURE 2025-10-22: 2-attempt visual verification with model escalation
                // Attempt 1: Fast/cheap model (phi-3.5-vision)
                this.logger.system('grisha-verify-item', '[GRISHA] 🎯 Visual attempt 1/2 (fast model)');
                verification = await this._executeVisualVerification(currentItem, execution, todo, strategy, 1);
                
                // Attempt 2: If first failed, retry with stronger model (llama-3.2-90b-vision)
                if (!verification.verified) {
                    this.logger.system('grisha-verify-item', '[GRISHA] 🔄 Visual attempt 1 failed, trying attempt 2/2 (90b model)');
                    verification = await this._executeVisualVerification(currentItem, execution, todo, strategy, 2);
                }
                
                // If BOTH visual attempts failed → run LLM eligibility for MCP verification
                if (!verification.verified) {
                    this.logger.system('grisha-verify-item', '[GRISHA] ⚠️ Both visual attempts failed, requesting MCP verification via LLM eligibility...');
                    
                    // Re-run eligibility with visual failure context
                    const mcpEligibilityResult = await this.eligibilityProcessor.execute({
                        currentItem,
                        execution,
                        verificationStrategy: strategy,
                        visualFailureContext: {
                            attempts: 2,
                            lastReason: verification.reason,
                            forceDataPath: true  // Force LLM to recommend data/MCP checks
                        }
                    });
                    
                    if (mcpEligibilityResult.success && mcpEligibilityResult.decision.additional_checks?.length > 0) {
                        this.logger.system('grisha-verify-item', `[GRISHA] 🔧 LLM provided ${mcpEligibilityResult.decision.additional_checks.length} MCP checks`);
                        
                        // Execute MCP verification with LLM-provided checks
                        const mcpVerification = await this._executeMcpVerification(
                            currentItem, 
                            execution, 
                            strategy, 
                            mcpEligibilityResult.decision
                        );
                        
                        if (mcpVerification.verified) {
                            this.logger.system('grisha-verify-item', '[GRISHA] ✅ MCP verification succeeded after visual failures');
                            verification = mcpVerification;
                        }
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
        const modelType = attempt === 1 ? 'fast' : 'primary';  // fast = phi-3.5, primary = llama-90b
        this.logger.system('grisha-verify-item', `[VISUAL-GRISHA] 🔍 Starting visual verification (attempt ${attempt}, model: ${modelType})...`);

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

            // Step 2: Select capture mode via MCP prompt
            const captureDecision = await this._selectVisualCaptureDecision('GRISHA', {
                item: currentItem,
                execution,
                targetApp,
                attempt,
                strategy
            });

            const captureContextId = `item_${currentItem.id}_verify_attempt${attempt}`;
            const primaryOptions = {
                mode: captureDecision.mode,
                targetApp: captureDecision.target_app || targetApp,
                displayNumber: captureDecision.display_number
            };

            let screenshot;

            try {
                screenshot = await this.visualCapture.captureScreenshot(
                    captureContextId,
                    {
                        mode: primaryOptions.mode,
                        targetApp: primaryOptions.targetApp,
                        displayNumber: primaryOptions.displayNumber
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
                    screenshot = await this.visualCapture.captureScreenshot(
                        `${captureContextId}_fallback`,
                        {
                            mode: captureDecision.fallback_mode,
                            targetApp: captureDecision.fallback_mode === 'active_window'
                                ? (captureDecision.target_app || targetApp)
                                : null,
                            displayNumber: captureDecision.fallback_mode === 'desktop_only'
                                ? (captureDecision.display_number || null)
                                : null
                        }
                    );
                } else {
                    throw captureError;
                }
            }

            this.logger.system('grisha-verify-item', `[VISUAL-GRISHA] 📸 Screenshot captured: ${screenshot.filename}`);
            this.logger.system('grisha-verify-item', `[VISUAL-GRISHA] 📂 Full path: ${screenshot.filepath}`);
            this.logger.system('grisha-verify-item', `[VISUAL-GRISHA] 📷 Capture mode: ${screenshot.mode}${screenshot.targetApp ? ' (' + screenshot.targetApp + ')' : ''}`);

            // Step 2: Analyze screenshot with AI vision
            // ENHANCED 2025-10-22: Pass modelType for attempt-based model selection
            const analysisContext = {
                action: currentItem.action,
                executionResults: execution.results || [],
                modelType: modelType,  // 'fast' for attempt 1, 'primary' for attempt 2
                captureDecision
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

    async _selectVisualCaptureDecision(agentRole, { item, execution, targetApp, attempt, strategy }) {
        const fallbackDecision = {
            mode: targetApp ? 'active_window' : 'full_screen',
            target_app: targetApp || null,
            display_number: null,
            require_retry: false,
            fallback_mode: targetApp ? 'full_screen' : null,
            reasoning: 'Using heuristic fallback decision',
            confidence: 0.4
        };

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
            // REFACTORED 2025-10-23: Execute through FULL MCP workflow (Stage 2.0→2.1→2.2)
            // This ensures scalability with 10+ MCP servers:
            // - Stage 2.0: Server Selection chooses correct server from many
            // - Stage 2.1: Tetyana Plan Tools uses specialized prompt + JSON Schema
            // - Stage 2.2: Tetyana Execute Tools with full validation pipeline
            
            if (!this.container) {
                throw new Error('DI Container not available for MCP verification');
            }

            // Create verification item from eligibility hints (if available)
            // FIXED 2025-10-23: Use verification_action from eligibilityDecision (LLM transforms action)
            // CRITICAL FIX 2025-10-23: Smart fallback transforms action verbs (create→verify existence)
            const verificationAction = eligibilityDecision?.verification_action || this._transformActionToVerification(currentItem.action);
            
            const verificationItem = {
                id: `verify_${currentItem.id}_${Date.now()}`,
                action: verificationAction,
                success_criteria: currentItem.success_criteria,
                // Hint from eligibility (optional) - Stage 2.0 will validate
                mcp_servers: eligibilityDecision?.additional_checks?.map(c => c.server).filter((v, i, a) => a.indexOf(v) === i) || [],
                parameters: {},
                max_attempts: 1,
                dependencies: []
            };

            this.logger.system('grisha-verify-item', `[MCP-GRISHA] Verification item: ${JSON.stringify(verificationItem, null, 2)}`);

            // STAGE 2.0: Server Selection
            const serverSelectionProcessor = this.container.resolve('serverSelectionProcessor');
            if (!serverSelectionProcessor) {
                throw new Error('ServerSelectionProcessor not found in DI Container');
            }

            this.logger.system('grisha-verify-item', '[MCP-GRISHA] 🎯 Stage 2.0: Server Selection...');
            const selectionResult = await serverSelectionProcessor.execute({
                currentItem: verificationItem,
                todo: { items: [currentItem] },
                session: null
            });

            if (!selectionResult.success || !selectionResult.selected_servers || selectionResult.selected_servers.length === 0) {
                this.logger.warn('[MCP-GRISHA] Server selection failed', {
                    category: 'grisha-verify-item'
                });
                return {
                    verified: false,
                    confidence: 0,
                    reason: 'Не вдалося вибрати MCP сервер для верифікації',
                    method: 'mcp',
                    error: true
                };
            }

            this.logger.system('grisha-verify-item', `[MCP-GRISHA] ✅ Selected servers: ${selectionResult.selected_servers.join(', ')}`);
            this.logger.system('grisha-verify-item', `[MCP-GRISHA] ✅ Selected prompts: ${selectionResult.selected_prompts.join(', ')}`);

            // STAGE 2.1: Tetyana Plan Tools
            const tetyanaPlanProcessor = this.container.resolve('tetyanaPlanToolsProcessor');
            if (!tetyanaPlanProcessor) {
                throw new Error('TetyanaPlanToolsProcessor not found in DI Container');
            }

            this.logger.system('grisha-verify-item', '[MCP-GRISHA] 🛠️ Stage 2.1: Tetyana Plan Tools...');
            const planResult = await tetyanaPlanProcessor.execute({
                currentItem: verificationItem,
                selected_servers: selectionResult.selected_servers,
                selected_prompts: selectionResult.selected_prompts,
                todo: { items: [currentItem] },
                session: null
            });

            if (!planResult.success || !planResult.plan || !planResult.plan.tool_calls || planResult.plan.tool_calls.length === 0) {
                this.logger.warn('[MCP-GRISHA] Tool planning failed', {
                    category: 'grisha-verify-item'
                });
                return {
                    verified: false,
                    confidence: 0,
                    reason: 'Не вдалося спланувати інструменти для верифікації',
                    method: 'mcp',
                    error: true
                };
            }

            this.logger.system('grisha-verify-item', `[MCP-GRISHA] ✅ Planned ${planResult.plan.tool_calls.length} tool call(s)`);

            // STAGE 2.2: Tetyana Execute Tools
            const tetyanaExecuteProcessor = this.container.resolve('tetyanaExecuteToolsProcessor');
            if (!tetyanaExecuteProcessor) {
                throw new Error('TetyanaExecuteToolsProcessor not found in DI Container');
            }

            this.logger.system('grisha-verify-item', '[MCP-GRISHA] ⚙️ Stage 2.2: Tetyana Execute Tools...');
            const execResult = await tetyanaExecuteProcessor.execute({
                currentItem: verificationItem,
                plan: planResult.plan,
                todo: { items: [currentItem] },
                session: null,
                res: null
            });

            this.logger.system('grisha-verify-item', `[MCP-GRISHA] ✅ Executed: ${execResult.metadata?.successfulCalls || 0}/${execResult.metadata?.toolCount || 0} successful`);

            // Extract execution results from Stage 2.2
            const verificationResults = execResult.execution;
            
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
            
            // Calculation operations
            { patterns: ['виконати обчислення', 'порахувати', 'calculate', 'compute'], replacement: 'Перевірити результат обчислення' },
            { patterns: ['помножити', 'multiply'], replacement: 'Перевірити результат множення' },
            { patterns: ['додати', 'add'], replacement: 'Перевірити результат додавання' },
            { patterns: ['відняти', 'subtract'], replacement: 'Перевірити результат віднімання' },
            
            // System operations
            { patterns: ['встановити шпалери', 'set wallpaper', 'change wallpaper'], replacement: 'Перевірити встановлення шпалер' },
            { patterns: ['встановити', 'install'], replacement: 'Перевірити встановлення' },
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

        // No pattern matched - use generic "Перевірити виконання:"
        // This is better than "Перевірити: Створити..." which confuses downstream processors
        return `Перевірити виконання: ${action}`;
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
