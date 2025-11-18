/**
 * ATLAS WORKFLOW EXECUTOR v5.0 - MCP Dynamic TODO Only
 * Спрощено: тільки MCP Dynamic TODO система, без Goose fallback
 */

import { TTSSyncManager } from './tts-sync-manager.js';
import logger from '../utils/logger.js';
import { WorkflowEventEmitter } from './workflow-event-emitter.js';
import GlobalConfig from '../../config/atlas-config.js';
import { MCPTodoManager } from './mcp-todo-manager.js';
import HierarchicalIdManager from './utils/hierarchical-id-manager.js';
// import { DynamicAgentCoordinator } from './stages/agents/dynamic-agent-coordinator.js'; // Not used, commented out
// import { BaseAgentProcessor } from './stages/agents/base-agent-processor.js'; // Not used, commented out
import { EternityIntegration } from '../eternity/eternity-integration.js';
import { NexusContextActivator } from '../eternity/nexus-context-activator.js';
import adaptiveThrottler from '../utils/adaptive-request-throttler.js';
import { WorkflowStateMachine, HandlerFactory } from './state-machine/index.js';

// FIXED 21.10.2025 - Phrase rotation indices (module-level for persistence)
const phraseRotation = {
  tetyanaStart: 0,
  tetyanaSuccess: 0
};

// ============================================================================
// PHASE 1 REFACTORING - STAGE FUNCTIONS (2025-11-18)
// ============================================================================
// NOTE: These functions are being extracted from executeWorkflow for modularization.
// This is a gradual refactoring process - functions are created but not yet called.
// They will be integrated into executeWorkflow in subsequent phases.

/**
 * Stage 0-MCP: Mode Selection
 * Determines the workflow mode (chat, task, or dev) based on user input
 * 
 * @param {Object} workflowContext - Workflow context (userMessage, session, container, logger, wsManager, res, localizationService)
 * @param {Object} processors - Stage processors (modeProcessor, devProcessor)
 * @returns {Promise<{mode: string, confidence: number, mood: string}>} Mode selection result
 * 
 * REFACTORING STATUS: Function skeleton created. Will be populated in Phase 1.2.
 */
async function runModeSelection(workflowContext, processors) {
  const { userMessage, session, container, logger, wsManager, res, localizationService } = workflowContext;
  const { modeProcessor, devProcessor } = processors;

  logger.workflow('stage', 'system', 'Stage 0-MCP: Mode Selection [REFACTORED]', { sessionId: session.id });

  // Check if session is awaiting password for DEV mode OR if user requests intervention after analysis
  const normalizedMessage = userMessage.trim().toLowerCase();
  const isPasswordProvided = session.awaitingDevPassword && normalizedMessage === 'mykola';

  // Also check if password is provided in the message (e.g., "виправ з паролем mykola")
  const passwordInMessage = normalizedMessage.includes('mykola') || normalizedMessage.includes('з паролем') || normalizedMessage.includes('with password');
  const isInterventionRequest = session.lastDevAnalysis && (
    userMessage.toLowerCase().includes('внеси зміни') ||
    userMessage.toLowerCase().includes('виправ') ||
    userMessage.toLowerCase().includes('fix') ||
    userMessage.toLowerCase().includes('застосуй') ||
    userMessage.toLowerCase().includes('apply')
  );

  // CRITICAL DEBUG: Log session state for DEV mode detection
  logger.system('executor', `[DEV-CHECK] Session state check:`, {
    sessionId: session.id,
    hasLastDevAnalysis: !!session.lastDevAnalysis,
    hasLastDevAnalysisMessage: !!session.lastDevAnalysisMessage,
    awaitingDevPassword: session.awaitingDevPassword,
    userMessage: userMessage.substring(0, 50),
    isPasswordProvided,
    isInterventionRequest,
    lastDevAnalysisTimestamp: session.lastDevAnalysis?.timestamp
  });

  if (isPasswordProvided || (isInterventionRequest && passwordInMessage)) {
    logger.system('executor', `[DEV-MODE] ${isPasswordProvided ? 'Password received' : 'Intervention with password requested'}, continuing DEV mode`, {
      sessionId: session.id,
      passwordProvided: isPasswordProvided,
      passwordInMessage: passwordInMessage
    });

    // If intervention requested but no password yet, show dialog and wait
    if (isInterventionRequest && !isPasswordProvided && !passwordInMessage) {
      session.awaitingDevPassword = true;
      session.devOriginalMessage = session.lastDevAnalysisMessage || 'Проаналізуй себе';

      // Re-send analysis with password request
      const analysisData = session.lastDevAnalysis;
      const findings = analysisData?.findings || {};

      const passwordMessage = `🔐 **Потрібна авторизація для втручання**\n\nЯ готовий внести виправлення в свій код. Для безпеки мені потрібен пароль "mykola".\n\n**Що буде виправлено:**\n${findings.critical_issues?.length || 0} критичних проблем\n${findings.performance_bottlenecks?.length || 0} проблем продуктивності\n\nВведи пароль щоб продовжити.`;
      const localizedMessage = localizationService.translateToUser(passwordMessage);

      if (wsManager) {
        wsManager.broadcastToSubscribers('chat', 'agent_message', {
          content: localizedMessage,
          agent: 'atlas',
          sessionId: session.id,
          timestamp: new Date().toISOString(),
          ttsContent: 'Мені потрібен пароль mykola щоб внести зміни',
          mode: 'dev',
          requiresAuth: true
        });

        // Trigger password dialog
        wsManager.broadcastToSubscribers('chat', 'dev_password_request', {
          sessionId: session.id,
          analysisData: {
            criticalIssues: findings.critical_issues?.length || 0,
            performanceIssues: findings.performance_bottlenecks?.length || 0,
            improvements: findings.improvement_suggestions?.length || 0
          }
        });
      }

      return { success: false, requiresAuth: true };
    }

    // Password provided - execute intervention
    // Extract actual password from message if it's a password submission
    const actualPassword = isPasswordProvided ? userMessage.trim() : 'mykola';

    const analysisResult = await devProcessor.execute({
      userMessage: session.devOriginalMessage || session.lastDevAnalysisMessage || 'Виправ себе',
      session,
      requiresIntervention: true,
      password: actualPassword,
      container
    });

    // Clear password state only after successful intervention
    if (analysisResult.success || analysisResult.transitionToTask) {
      session.awaitingDevPassword = false;
      session.devAnalysisResult = null;
      session.devOriginalMessage = null;
      // Keep lastDevAnalysis for context
    }

    // Check if transitioning to TASK mode
    if (analysisResult.transitionToTask && analysisResult.taskContext) {
      logger.system('executor', '[DEV→TASK] Transitioning from DEV to TASK mode after password', {
        sessionId: session.id,
        tasksCount: analysisResult.taskContext.tasks?.length || 0
      });

      // Store transition context
      session.devTransitionContext = analysisResult.taskContext;

      // Send transition message
      const transitionMessage = analysisResult.message || '🚀 Переходжу в TASK режим для виконання змін...';
      if (wsManager) {
        wsManager.broadcastToSubscribers('chat', 'agent_message', {
          content: transitionMessage,
          agent: 'atlas',
          sessionId: session.id,
          timestamp: new Date().toISOString(),
          ttsContent: 'Переходжу в режим виконання завдань',
          mode: 'task',
          transitionFromDev: true
        });
      }

      // Continue to TASK mode execution below
      return { mode: 'task', confidence: 1.0, mood: 'neutral', transitionFromDev: true };
    } else {
      // Send intervention result
      const interventionMessage = analysisResult.intervention?.message || analysisResult.message || 'Аналіз завершено!';
      const localizedMessage = localizationService.translateToUser(interventionMessage);

      if (wsManager) {
        wsManager.broadcastToSubscribers('chat', 'agent_message', {
          content: localizedMessage,
          agent: 'atlas',
          sessionId: session.id,
          timestamp: new Date().toISOString(),
          ttsContent: interventionMessage,
          mode: 'dev',
          interventionComplete: true
        });
      }

      return { ...analysisResult, isDevIntervention: true };
    }
  }

  // Standard mode selection via LLM
  const modeResult = await modeProcessor.execute({
    userMessage,
    session
  });

  const mode = modeResult.mode;
  const confidence = modeResult.confidence;
  const mood = modeResult.mood || 'neutral';

  logger.workflow('stage', 'system', `Mode selected: ${mode} (confidence: ${confidence}, mood: ${mood})`, {
    sessionId: session.id,
    reasoning: modeResult.reasoning,
    mood: mood
  });

  // Send mode selection to frontend via SSE
  if (res.writable && !res.writableEnded) {
    res.write(`data: ${JSON.stringify({
      type: 'mode_selected',
      data: {
        mode,
        confidence,
        reasoning: modeResult.reasoning,
        mood: mood
      }
    })}\n\n`);
  }

  return { mode, confidence, mood, reasoning: modeResult.reasoning };
}

/**
 * Stage 0.5-MCP: Context Enrichment
 * Enriches the user message with additional context and metadata
 * 
 * @param {Object} workflowContext - Workflow context
 * @param {Object} processors - Stage processors (contextEnrichmentProcessor)
 * @returns {Promise<{enrichedMessage: string, metadata: Object}>} Enriched message and metadata
 * 
 * REFACTORING STATUS: Function skeleton created. Will be populated in Phase 1.2.
 */
async function runContextEnrichment(workflowContext, processors) {
  const { userMessage, session, logger } = workflowContext;
  const { contextEnrichmentProcessor } = processors;

  logger.workflow('stage', 'atlas', 'Stage 0.5-MCP: Context Enrichment [REFACTORED]', { sessionId: session.id });

  let enrichedMessage = userMessage;
  let enrichmentMetadata = null;

  try {
    const enrichmentResult = await contextEnrichmentProcessor.execute({
      userMessage,
      session
    });

    if (enrichmentResult.success && enrichmentResult.enriched_message) {
      enrichedMessage = enrichmentResult.enriched_message;
      enrichmentMetadata = enrichmentResult.metadata;

      logger.system('executor', `[STAGE-0.5-MCP] Context enriched`);
      logger.system('executor', `[STAGE-0.5-MCP]    Original: "${userMessage}"`);
      logger.system('executor', `[STAGE-0.5-MCP]    Enriched: "${enrichedMessage}"`);
      logger.system('executor', `[STAGE-0.5-MCP]    Complexity: ${enrichmentMetadata.complexity}/10`);
    } else {
      logger.warn(`[STAGE-0.5-MCP] Context enrichment failed, using original message: ${enrichmentResult.error}`);
    }
  } catch (enrichmentError) {
    logger.warn(`[STAGE-0.5-MCP] Context enrichment error (continuing with original): ${enrichmentError.message}`);
    // Continue with original message on error
  }

  return {
    enrichedMessage,
    metadata: enrichmentMetadata,
    success: true
  };
}

/**
 * Stage 1-MCP: TODO Planning
 * Plans the TODO list based on user request and context
 * 
 * @param {Object} workflowContext - Workflow context
 * @param {Object} processors - Stage processors (todoProcessor)
 * @param {string} enrichedMessage - Enriched user message from Stage 0.5
 * @param {Object} enrichmentMetadata - Metadata from context enrichment
 * @returns {Promise<{todo: Object, plan: Array}>} TODO plan
 * 
 * REFACTORING STATUS: Function skeleton created. Will be populated in Phase 1.2.
 */
async function runTodoPlanning(workflowContext, processors, enrichedMessage, enrichmentMetadata) {
  const { userMessage, session, res, logger } = workflowContext;
  const { todoProcessor } = processors;

  logger.workflow('stage', 'system', 'Stage 1-MCP: Atlas TODO Planning [REFACTORED]', { sessionId: session.id });

  // Check if we have DEV transition context
  let todoResult;
  if (session.devTransitionContext) {
    logger.system('executor', '[TASK-FROM-DEV] Using DEV transition context', {
      sessionId: session.id,
      tasksCount: session.devTransitionContext.tasks?.length || 0
    });

    // Create TODO from DEV context
    todoResult = {
      success: true,
      todo: {
        mode: 'task',
        items: session.devTransitionContext.tasks.map(task => ({
          ...task,
          status: 'pending',
          max_attempts: 3,
          attempt: 0
        })),
        user_message: userMessage,
        metadata: session.devTransitionContext.metadata
      },
      summary: `Виконую ${session.devTransitionContext.tasks?.length || 0} завдань з DEV аналізу`
    };

    // Clear transition context after use
    delete session.devTransitionContext;
  } else {
    // Normal TODO planning with enriched message
    try {
      todoResult = await todoProcessor.execute({
        userMessage: enrichedMessage,  // Use enriched message instead of original
        session,
        res,
        enrichmentMetadata  // Pass enrichment metadata for context
      });
    } catch (todoError) {
      logger.warn(`[STAGE-1-MCP] ⚠️ TODO planning error (using fallback): ${todoError.message}`);
      // Use fallback TODO if planning fails
      // This allows chat mode to work even if TODO planning fails
      todoResult = {
        success: true,
        todo: {
          mode: 'chat',
          items: [],
          user_message: userMessage,
          metadata: {}
        },
        summary: 'Перейшов в режим чату через помилку планування'
      };
    }
  }

  return {
    todo: todoResult.todo,
    plan: todoResult.plan || [],
    success: todoResult.success,
    summary: todoResult.summary
  };
}

/**
 * Stage 2.0-MCP: Server Selection
 * Selects appropriate MCP servers for the TODO items
 * 
 * @param {Object} workflowContext - Workflow context
 * @param {Object} processors - Stage processors (serverSelectionProcessor)
 * @param {Object} item - Current TODO item
 * @param {Array} suggestedServers - Pre-filtered servers from router classifier
 * @returns {Promise<{servers: Array, prompts: Array, success: boolean}>} Selected servers and prompts
 * 
 * REFACTORING STATUS: Populated with real logic from executeWorkflow Stage 2.0
 */
async function runServerSelection(workflowContext, processors, item, suggestedServers) {
  const { session, logger, res } = workflowContext;
  const { serverSelectionProcessor } = processors;

  logger.workflow('stage', 'system', `Stage 2.0-MCP: Selecting MCP servers for item ${item.id}`, {
    sessionId: session.id
  });

  let selectedServers = null;
  let selectedPrompts = null;

  try {
    const selectionResult = await serverSelectionProcessor.execute({
      currentItem: item,
      todo: workflowContext.todo,
      session,
      res,
      suggestedServers // Pass router suggestions
    });

    if (selectionResult.success && selectionResult.selected_servers) {
      selectedServers = selectionResult.selected_servers;
      selectedPrompts = selectionResult.selected_prompts;

      logger.system('executor', `[STAGE-2.0-MCP] Selected servers: ${selectedServers.join(', ')}`);
      if (selectedPrompts) {
        logger.system('executor', `[STAGE-2.0-MCP] Auto-assigned prompts: ${Array.isArray(selectedPrompts) ? selectedPrompts.join(', ') : selectedPrompts}`);
      }

      // Persist Stage 2.0 selection on item for downstream stages
      item._mcp_selected_servers = Array.isArray(selectedServers) ? [...selectedServers] : [];
      item._mcp_selected_prompts = selectedPrompts;
    }
  } catch (selectionError) {
    logger.warn(`Server selection failed for item ${item.id}: ${selectionError.message}. Using fallback prompts.`, {
      sessionId: session.id
    });

    // Assign fallback prompts when server selection fails
    if (!selectedPrompts) {
      const taskAction = item.action.toLowerCase();
      let fallbackPrompt = 'TETYANA_PLAN_TOOLS_PLAYWRIGHT'; // Default for web tasks

      if (taskAction.includes('файл') || taskAction.includes('зберегти') || taskAction.includes('створити') || taskAction.includes('file')) {
        fallbackPrompt = 'TETYANA_PLAN_TOOLS_FILESYSTEM';
      } else if (taskAction.includes('команд') || taskAction.includes('запустити') || taskAction.includes('command') || taskAction.includes('shell')) {
        fallbackPrompt = 'TETYANA_PLAN_TOOLS_SHELL';
      } else if (taskAction.includes('пам\'ять') || taskAction.includes('зберегти') || taskAction.includes('memory')) {
        fallbackPrompt = 'TETYANA_PLAN_TOOLS_MEMORY';
      }

      selectedPrompts = [fallbackPrompt];
      logger.system('executor', `[FALLBACK] Auto-assigned intelligent fallback prompt: ${selectedPrompts.join(', ')} (based on task: "${item.action}")`);
    }
  }

  return {
    servers: selectedServers || [],
    prompts: selectedPrompts || [],
    success: true
  };
}

/**
 * Stage 2.1-MCP: Tool Planning
 * Plans which tools to use for each TODO item
 * 
 * @param {Object} workflowContext - Workflow context
 * @param {Object} processors - Stage processors (planProcessor)
 * @param {Object} item - Current TODO item
 * @param {Object} serverSelection - Server selection result from Stage 2.0
 * @returns {Promise<{plan: Object, success: boolean, error?: string}>} Tool plan
 * 
 * REFACTORING STATUS: Populated with real logic from executeWorkflow Stage 2.1
 */
async function runToolPlanning(workflowContext, processors, item, serverSelection) {
  const { session, logger, res } = workflowContext;
  const { planProcessor } = processors;

  logger.workflow('stage', 'tetyana', `Stage 2.1-MCP: Planning tools for item ${item.id}`, {
    sessionId: session.id
  });

  const planResult = await planProcessor.execute({
    currentItem: item,
    todo: workflowContext.todo,
    session,
    res,
    selected_servers: serverSelection.servers,
    selected_prompts: serverSelection.prompts
  });

  if (!planResult.success) {
    logger.warn(`Tool planning failed for item ${item.id}: ${planResult.error}`, {
      sessionId: session.id
    });

    // Send error message to user when tool planning fails
    if (res.writable && !res.writableEnded) {
      res.write(`data: ${JSON.stringify({
        type: 'mcp_item_planning_failed',
        data: {
          itemId: item.id,
          action: item.action,
          error: planResult.error,
          summary: planResult.summary || `⚠️ Помилка планування інструментів: ${planResult.error}`
        }
      })}\n\n`);
    }
  }

  return {
    plan: planResult.plan || null,
    success: planResult.success,
    error: planResult.error,
    summary: planResult.summary
  };
}

/**
 * Stage 2.2-MCP: Execution
 * Executes the planned tools for a TODO item
 * 
 * @param {Object} workflowContext - Workflow context
 * @param {Object} processors - Stage processors (executeProcessor, ttsSyncManager)
 * @param {Object} item - Current TODO item
 * @param {Object} plan - Tool plan from Stage 2.1
 * @returns {Promise<{execution: Object, success: boolean, summary: string}>} Execution result
 * 
 * REFACTORING STATUS: Populated with real logic from executeWorkflow Stage 2.2
 */
async function runExecution(workflowContext, processors, item, plan) {
  const { session, logger, res, ttsSyncManager } = workflowContext;
  const { executeProcessor } = processors;

  logger.workflow('stage', 'tetyana', `Stage 2.2-MCP: Executing tools for item ${item.id}`, {
    sessionId: session.id
  });

  // Tetyana speaks full action from TODO
  if (ttsSyncManager && item.action) {
    try {
      const fullAction = item.action.toLowerCase();
      logger.system('executor', `[TTS] 🔊 Tetyana START: "${fullAction}"`);
      await ttsSyncManager.speak(fullAction, {
        mode: 'normal',
        agent: 'tetyana',
        sessionId: session.id
      });
      logger.system('executor', `[TTS] ✅ Tetyana start TTS sent`);
    } catch (error) {
      logger.error(`[TTS] ❌ Failed to send TTS: ${error.message}`, {
        category: 'executor',
        component: 'executor',
        stack: error.stack
      });
    }
  }

  const execResult = await executeProcessor.execute({
    currentItem: item,
    plan: plan,
    todo: workflowContext.todo,
    session,
    res
  });

  // Send execution update to frontend
  if (res.writable && !res.writableEnded) {
    res.write(`data: ${JSON.stringify({
      type: 'mcp_item_executed',
      data: {
        itemId: item.id,
        action: item.action,
        success: execResult.success,
        summary: execResult.summary
      }
    })}\n\n`);
  }

  return {
    execution: execResult.execution || null,
    success: execResult.success,
    summary: execResult.summary
  };
}

/**
 * Stage 2.3-MCP: Verification
 * Verifies that the execution was successful
 * 
 * @param {Object} workflowContext - Workflow context
 * @param {Object} processors - Stage processors (verifyProcessor, ttsSyncManager)
 * @param {Object} item - Current TODO item
 * @param {Object} execResult - Execution result from Stage 2.2
 * @returns {Promise<{verified: boolean, verification: Object, summary: string}>} Verification result
 * 
 * REFACTORING STATUS: Populated with real logic from executeWorkflow Stage 2.3
 */
async function runVerification(workflowContext, processors, item, execResult) {
  const { session, logger, res, ttsSyncManager } = workflowContext;
  const { verifyProcessor } = processors;

  logger.workflow('stage', 'grisha', `Stage 2.3-MCP: Verifying item ${item.id}`, {
    sessionId: session.id
  });

  // Adaptive delay before screenshot verification
  const delayMs = _getVerificationDelay(execResult.execution, item);
  if (delayMs > 0) {
    const delaySec = (delayMs / 1000).toFixed(1);
    logger.system('executor', `[VERIFICATION-DELAY] Waiting ${delaySec}s before verification...`);
    await new Promise(resolve => setTimeout(resolve, delayMs));
  }

  const verifyResult = await verifyProcessor.execute({
    currentItem: item,
    execution: execResult.execution,
    todo: workflowContext.todo,
    session,
    res
  });

  // Send verification update to frontend
  if (res.writable && !res.writableEnded) {
    res.write(`data: ${JSON.stringify({
      type: 'mcp_item_verified',
      data: {
        itemId: item.id,
        verified: verifyResult.verified,
        confidence: verifyResult.metadata?.confidence || 0,
        summary: verifyResult.summary
      }
    })}\n\n`);
  }

  // Send TTS messages on success
  if (verifyResult.verified && ttsSyncManager) {
    try {
      const successPhrases = [
        'Виконано',
        'Готово',
        'Зроблено',
        'Завершено'
      ];
      const selectedPhrase = successPhrases[Math.floor(Math.random() * successPhrases.length)];

      logger.system('executor', `[TTS] 🔊 Tetyana SUCCESS: "${selectedPhrase}"`);
      await ttsSyncManager.speak(selectedPhrase, {
        mode: 'normal',
        agent: 'tetyana',
        sessionId: session.id
      });
      logger.system('executor', `[TTS] ✅ Tetyana success sent`);

      // Grisha gives short verdict
      if (verifyResult.verification?.tts_phrase) {
        logger.system('executor', `[TTS] 🔊 Grisha VERIFY: "${verifyResult.verification.tts_phrase}"`);
        await ttsSyncManager.speak(verifyResult.verification.tts_phrase, {
          mode: 'normal',
          agent: 'grisha',
          sessionId: session.id
        });
        logger.system('executor', `[TTS] ✅ Grisha verify sent`);
      }
    } catch (error) {
      logger.warn(`Failed to send verification TTS: ${error.message}`);
    }
  }

  return {
    verified: verifyResult.verified,
    verification: verifyResult.verification || null,
    summary: verifyResult.summary,
    metadata: verifyResult.metadata
  };
}

/**
 * Stage 3-MCP: Replan (if needed)
 * Re-plans the TODO item if verification fails
 * 
 * @param {Object} workflowContext - Workflow context
 * @param {Object} processors - Stage processors (replanProcessor, verifyProcessor)
 * @param {Object} item - Current TODO item
 * @param {Object} execResult - Execution result from Stage 2.2
 * @param {Object} verifyResult - Verification result from Stage 2.3
 * @param {Object} planResult - Plan result from Stage 2.1
 * @returns {Promise<{replanned: boolean, strategy: string, newItems: Array, reasoning: string}>} Replan result
 * 
 * REFACTORING STATUS: Populated with real logic from executeWorkflow Stage 3
 */
async function runReplan(workflowContext, processors, item, execResult, verifyResult, planResult) {
  const { session, logger, res } = workflowContext;
  const { replanProcessor, verifyProcessor } = processors;

  logger.workflow('stage', 'grisha', `Stage 3.5-MCP: Deep analysis for item ${item.id}`, {
    sessionId: session.id
  });

  try {
    // Get detailed analysis from Grisha
    const grishaAnalysis = await verifyProcessor.getDetailedAnalysisForAtlas(
      item,
      execResult?.execution || { all_successful: false }
    );

    logger.info(`Grisha analysis: ${grishaAnalysis.failure_analysis.likely_cause}`, {
      sessionId: session.id,
      itemId: item.id,
      rootCause: grishaAnalysis.failure_analysis.likely_cause,
      recommendedStrategy: grishaAnalysis.failure_analysis.recommended_strategy
    });

    // Prepare data for Atlas replan
    const tetyanaData = {
      plan: planResult?.plan || { tool_calls: [] },
      execution: execResult?.execution || { all_successful: false },
      tools_used: execResult?.execution?.results?.map(r => r.tool) || []
    };

    const grishaData = {
      verified: false,
      reason: grishaAnalysis.reason,
      visual_evidence: grishaAnalysis.visual_evidence,
      screenshot_path: grishaAnalysis.screenshot_path,
      confidence: grishaAnalysis.confidence,
      suggestions: grishaAnalysis.suggestions,
      failure_analysis: grishaAnalysis.failure_analysis
    };

    // Call Atlas replan processor
    logger.workflow('stage', 'atlas', `Stage 3.6-MCP: Atlas replanning item ${item.id}`, {
      sessionId: session.id
    });

    const replanResult = await replanProcessor.execute({
      failedItem: item,
      todo: workflowContext.todo,
      tetyanaData,
      grishaData,
      session,
      res
    });

    logger.system('executor', `[REPLAN-DEBUG] Strategy: ${replanResult.strategy}`);
    logger.system('executor', `[REPLAN-DEBUG] Replanned: ${replanResult.replanned}`);
    logger.system('executor', `[REPLAN-DEBUG] New items count: ${replanResult.new_items?.length || 0}`);

    logger.info(`Atlas replan decision: ${replanResult.strategy || 'unknown'}`, {
      sessionId: session.id,
      replanned: replanResult.replanned || false
    });

    return {
      replanned: replanResult.replanned || false,
      strategy: replanResult.strategy,
      newItems: replanResult.new_items || [],
      reasoning: replanResult.reasoning,
      success: true
    };

  } catch (replanError) {
    logger.error(`Failed to analyze/replan: ${replanError.message}`, {
      sessionId: session.id,
      itemId: item.id,
      error: replanError.message,
      stack: replanError.stack
    });

    return {
      replanned: false,
      strategy: 'error',
      newItems: [],
      reasoning: `Помилка перепланування: ${replanError.message}`,
      success: false,
      error: replanError.message
    };
  }
}

/**
 * Stage 8-MCP: Final Summary
 * Generates a final summary of the workflow execution
 * 
 * @param {Object} workflowContext - Workflow context
 * @param {Object} processors - Stage processors (summaryProcessor, wsManager)
 * @param {Object} todo - Original TODO object
 * @returns {Promise<{summary: string, metrics: Object, success: boolean}>} Final summary
 * 
 * REFACTORING STATUS: Populated with real logic from executeWorkflow Stage 8
 */
async function runFinalSummary(workflowContext, processors, todo) {
  const { session, logger, res, wsManager, workflowStart } = workflowContext;
  const { summaryProcessor } = processors;

  logger.workflow('stage', 'system', 'Stage 8-MCP: Generating final summary', {
    sessionId: session.id
  });

  const summaryResult = await summaryProcessor.execute({
    todo,
    session,
    res
  });

  // Calculate completion metrics
  const completedCount = todo.items.filter(item => item.status === 'completed').length;
  const totalCount = todo.items.length;
  const successRate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // Generate Atlas final message
  let atlasFinalMessage;
  let atlasTTS;
  if (summaryResult.success && successRate === 100) {
    atlasFinalMessage = `✅ Завдання виконано повністю! Всі ${totalCount} пунктів успішно завершені.`;
    atlasTTS = `Завдання виконано повністю`;
  } else if (successRate >= 50) {
    atlasFinalMessage = `⚠️ Завдання виконано частково: ${completedCount} з ${totalCount} пунктів (${successRate}% успіху)`;
    atlasTTS = `Виконано ${completedCount} з ${totalCount} пунктів`;
  } else {
    atlasFinalMessage = `❌ Завдання не вдалося виконати: лише ${completedCount} з ${totalCount} пунктів завершені`;
    atlasTTS = `Завдання не виконано`;
  }

  // Send final message via WebSocket
  if (wsManager) {
    try {
      wsManager.broadcastToSubscribers('chat', 'agent_message', {
        content: atlasFinalMessage,
        agent: 'atlas',
        ttsContent: atlasTTS,
        mode: 'task',
        sessionId: session.id,
        timestamp: new Date().toISOString()
      });
      logger.system('executor', '[ATLAS-FINAL] ✅ Final completion message sent');
    } catch (wsError) {
      logger.warn(`[ATLAS-FINAL] Failed to send final message: ${wsError.message}`);
    }
  }

  // Send final summary to frontend via SSE
  if (res.writable && !res.writableEnded) {
    res.write(`data: ${JSON.stringify({
      type: 'mcp_workflow_complete',
      data: {
        success: summaryResult.success,
        summary: summaryResult.summary,
        metrics: summaryResult.metadata?.metrics || {},
        duration: workflowStart ? Date.now() - workflowStart : 0,
        completedCount,
        totalCount,
        successRate
      }
    })}\n\n`);
  }

  // Add summary to session history
  if (!session.history) {
    session.history = [];
  }

  session.history.push({
    role: 'assistant',
    content: summaryResult.summary,
    agent: 'system',
    timestamp: Date.now(),
    metadata: {
      workflow: 'mcp',
      metrics: summaryResult.metadata?.metrics
    }
  });

  // Clean up session history to prevent memory leaks (keep only last 20 messages)
  if (session.history && session.history.length > 20) {
    const removed = session.history.length - 20;
    session.history = session.history.slice(-20);
    logger.system('executor', `[CLEANUP] Trimmed session.history: ${removed} old messages removed, ${session.history.length} kept`);
  }

  // Clean up chatThread messages
  if (session.chatThread && session.chatThread.messages && session.chatThread.messages.length > 20) {
    const removed = session.chatThread.messages.length - 20;
    session.chatThread.messages = session.chatThread.messages.slice(-20);
    logger.system('executor', `[CLEANUP] Trimmed chatThread: ${removed} old messages removed, ${session.chatThread.messages.length} kept`);
  }

  logger.workflow('complete', 'mcp', 'MCP workflow completed', {
    sessionId: session.id,
    duration: workflowStart ? Date.now() - workflowStart : 0,
    metrics: summaryResult.metadata?.metrics,
    completedCount,
    totalCount,
    successRate
  });

  return {
    summary: summaryResult.summary,
    metrics: {
      ...summaryResult.metadata?.metrics,
      completedCount,
      totalCount,
      successRate
    },
    success: summaryResult.success
  };
}

// ============================================================================
// MAIN WORKFLOW FUNCTIONS
// ============================================================================

/**
 * MCP DYNAMIC TODO WORKFLOW EXECUTOR (Phase 4)
 *
 * Executes user requests through MCP TODO workflow:
 * 1. Plan TODO list (Atlas)
 * 2. For each item: Plan → Execute → Verify → Adjust (if needed)
 * 3. Generate final summary
 *
 * @param {string} userMessage - User request
 * @param {Object} session - Session object
 * @param {Object} res - Response stream
 * @param {Object} container - DI Container for resolving processors
 * @returns {Promise<Object>} Final summary result
 */
export async function executeWorkflow(userMessage, { logger, wsManager, ttsSyncManager, diContainer, localizationService, res }) {
  // Initialize localization service if not provided
  if (!localizationService) {
    localizationService = new LocalizationService({ logger });
  }

  const container = diContainer;

  // Create simple session object without SessionStore
  const session = {
    id: 'default',
    chatThread: { messages: [], lastTopic: undefined },
    lastInteraction: Date.now()
  };

  logger.workflow('init', 'mcp', 'Starting MCP Dynamic TODO Workflow', {
    sessionId: session.id,
    userMessage: userMessage.substring(0, 100)
  });

  const workflowStart = Date.now();

  // PHASE 5.3: Initialize metrics collection
  let modeManager = null;
  try {
    modeManager = container.resolve('workflowModeManager');
  } catch (e) {
    logger.debug('[METRICS] WorkflowModeManager not available, skipping metrics collection');
  }

  try {
    // ===============================================
    // NEXUS CONTEXT-AWARE ACTIVATION (DISABLED 02.11.2025)
    // Аналізуємо чи потрібен Nexus ПЕРЕД mode selection
    // ===============================================
    // DISABLED: Nexus interceptor conflicts with DEV self-analysis workflow
    // DEV mode needs devSelfAnalysisProcessor for real code analysis and intervention
    // Nexus stubs don't provide the functionality needed for self-improvement

    // TODO: Re-enable when:
    // 1. Real multi-model orchestration implemented (not stubs)
    // 2. Integration with devSelfAnalysisProcessor added
    // 3. Proper mode coordination established

    /*
    const nexusActivator = await container.resolve('nexusContextActivator');
    await nexusActivator.initialize();
    const nexusAnalysis = await nexusActivator.analyzeIfNexusNeeded(userMessage, session);
    if (nexusAnalysis.shouldUseNexus) {
      // Nexus execution code...
    }
    */

    // Якщо Nexus не потрібен - продовжуємо стандартний workflow
    // Resolve processors from DI Container
    const modeProcessor = container.resolve('modeSelectionProcessor');
    const devProcessor = container.resolve('devSelfAnalysisProcessor');
    const contextEnrichmentProcessor = container.resolve('atlasContextEnrichmentProcessor');
    const todoProcessor = container.resolve('atlasTodoPlanningProcessor');
    const serverSelectionProcessor = container.resolve('serverSelectionProcessor');
    const planProcessor = container.resolve('tetyanaPlanToolsProcessor');
    const executeProcessor = container.resolve('tetyanaExecuteToolsProcessor');
    const verifyProcessor = container.resolve('grishaVerifyItemProcessor');
    const replanProcessor = container.resolve('atlasReplanTodoProcessor');
    const summaryProcessor = container.resolve('mcpFinalSummaryProcessor');

    // ===============================================
    // PHASE 1.3: Create unified context & processors objects
    // ===============================================
    const workflowContext = {
      userMessage,
      session,
      res,
      container,
      logger,
      wsManager,
      ttsSyncManager,
      localizationService,
      todo: null,  // Will be populated after Stage 1
      workflowStart
    };

    const processors = {
      modeProcessor,
      devProcessor,
      contextEnrichmentProcessor,
      todoProcessor,
      serverSelectionProcessor,
      planProcessor,
      executeProcessor,
      verifyProcessor,
      replanProcessor,
      summaryProcessor
    };

    // ===============================================
    // PHASE 2.4: Create WorkflowStateMachine instance
    // ===============================================
    logger.system('executor', '[STATE-MACHINE] Initializing WorkflowStateMachine');

    // Create handler factory
    const handlerFactory = new HandlerFactory({
      logger,
      processors
    });

    // Create state machine instance
    const stateMachine = new WorkflowStateMachine({
      logger,
      handlers: handlerFactory.getAllHandlers()
    });

    // Initialize state machine context with workflow data
    stateMachine.setContext('userMessage', userMessage);
    stateMachine.setContext('session', session);
    stateMachine.setContext('container', container);
    stateMachine.setContext('res', res);
    stateMachine.setContext('wsManager', wsManager);
    stateMachine.setContext('ttsSyncManager', ttsSyncManager);
    stateMachine.setContext('localizationService', localizationService);
    stateMachine.setContext('workflowStart', workflowStart);

    logger.system('executor', '[STATE-MACHINE] ✅ WorkflowStateMachine initialized', {
      sessionId: session.id,
      initialState: stateMachine.getCurrentState()
    });

    // ===============================================
    // PHASE 3: Check workflow engine mode and apply optimization
    // ===============================================
    const workflowConfig = container.resolve('config').ENV_CONFIG?.workflow || {};
    const engineMode = workflowConfig.engineMode || 'state_machine';

    logger.system('executor', `[WORKFLOW-ENGINE] Using mode: ${engineMode}`, {
      sessionId: session.id,
      enableOptimization: workflowConfig.enableOptimization,
      enableHybridExecution: workflowConfig.enableHybridExecution
    });

    // ===============================================
    // PHASE 3: Apply optimization based on engine mode
    // PHASE 4: Add hybrid execution support
    // ===============================================
    let modeResult;

    if (engineMode === 'hybrid' && workflowConfig.enableHybridExecution) {
      // Use HybridWorkflowExecutor for parallel execution
      logger.system('executor', '[HYBRID] Using HybridWorkflowExecutor for parallel mode selection');
      try {
        const hybridExecutor = container.resolve('hybridWorkflowExecutor');

        // Convert user message to hybrid tasks
        const hybridTasks = [{
          type: 'atomic',
          name: 'mode_selection',
          handler: async () => {
            const sm = new WorkflowStateMachine({
              logger,
              handlers: new HandlerFactory({ logger, processors: {} }).getAllHandlers()
            });
            await sm.transition(WorkflowStateMachine.States.MODE_SELECTION);
            return await sm.executeHandler({ userMessage });
          }
        }];

        const hybridResult = await hybridExecutor.execute(hybridTasks, {
          streaming: true,
          cancellable: true,
          verification: true,
          session
        });

        // Extract mode from hybrid result
        const taskResult = hybridResult.results?.[0];
        modeResult = {
          mode: taskResult?.mode || 'task',
          confidence: taskResult?.confidence || 0.8,
          reasoning: taskResult?.reasoning || 'Hybrid workflow',
          mood: taskResult?.mood || 'neutral',
          hybrid: true
        };

        logger.system('executor', '[HYBRID] ✅ Hybrid mode selection completed', {
          mode: modeResult.mode,
          confidence: modeResult.confidence
        });
      } catch (error) {
        logger.warn('[HYBRID] HybridWorkflowExecutor failed, falling back to optimized/standard mode', {
          error: error.message
        });

        // Fall back to optimized or standard mode
        if (workflowConfig.enableOptimization) {
          logger.system('executor', '[OPTIMIZATION] Falling back to OptimizedWorkflowManager');
          try {
            const optimizedManager = container.resolve('optimizedWorkflowManager');
            const optimizedResult = await optimizedManager.processOptimizedWorkflow(userMessage, {
              session, container, logger
            });
            modeResult = {
              mode: optimizedResult.mode || 'task',
              confidence: optimizedResult.confidence || 0.8,
              reasoning: optimizedResult.reasoning || 'Optimized workflow',
              mood: optimizedResult.mood || 'neutral',
              optimized: true
            };
          } catch (optError) {
            logger.warn('[OPTIMIZATION] OptimizedWorkflowManager also failed, using standard mode', {
              error: optError.message
            });
            await stateMachine.transition(WorkflowStateMachine.States.MODE_SELECTION);
            modeResult = await stateMachine.executeHandler({ userMessage });
          }
        } else {
          await stateMachine.transition(WorkflowStateMachine.States.MODE_SELECTION);
          modeResult = await stateMachine.executeHandler({ userMessage });
        }
      }
    } else if (engineMode === 'optimized' && workflowConfig.enableOptimization) {
      // Use OptimizedWorkflowManager for batch processing
      logger.system('executor', '[OPTIMIZATION] Using OptimizedWorkflowManager for mode selection');
      try {
        const optimizedManager = container.resolve('optimizedWorkflowManager');
        const optimizedResult = await optimizedManager.processOptimizedWorkflow(userMessage, {
          session,
          container,
          logger
        });

        // Extract mode from optimized result
        modeResult = {
          mode: optimizedResult.mode || 'task',
          confidence: optimizedResult.confidence || 0.8,
          reasoning: optimizedResult.reasoning || 'Optimized workflow',
          mood: optimizedResult.mood || 'neutral',
          optimized: true
        };

        logger.system('executor', '[OPTIMIZATION] ✅ Optimized mode selection completed', {
          mode: modeResult.mode,
          confidence: modeResult.confidence
        });
      } catch (error) {
        logger.warn('[OPTIMIZATION] OptimizedWorkflowManager failed, falling back to standard mode', {
          error: error.message
        });

        // Fall back to standard mode selection
        logger.system('executor', '[STATE-MACHINE] Transitioning to MODE_SELECTION state (fallback)');
        await stateMachine.transition(WorkflowStateMachine.States.MODE_SELECTION);
        modeResult = await stateMachine.executeHandler({ userMessage });
      }
    } else {
      // Use standard state machine mode selection
      logger.system('executor', '[STATE-MACHINE] Transitioning to MODE_SELECTION state');
      await stateMachine.transition(WorkflowStateMachine.States.MODE_SELECTION);
      modeResult = await stateMachine.executeHandler({ userMessage });
    }

    // Handle early returns (DEV mode intervention, password required, etc.)
    if (modeResult.requiresAuth || modeResult.isDevIntervention) {
      return modeResult;
    }

    // Extract mode from result
    const mode = modeResult.mode;
    const confidence = modeResult.confidence;
    const mood = modeResult.mood || 'neutral'; // НОВИНКА (29.10.2025): Mood з LLM аналізу

    logger.workflow('stage', 'system', `Mode selected: ${mode} (confidence: ${confidence}, mood: ${mood})`, {
      sessionId: session.id,
      reasoning: modeResult.reasoning,
      mood: mood
    });

    // Send mode selection to frontend via SSE
    if (res.writable && !res.writableEnded) {
      res.write(`data: ${JSON.stringify({
        type: 'mode_selected',
        data: {
          mode,
          confidence,
          reasoning: modeResult.reasoning,
          mood: mood // НОВИНКА (29.10.2025): Передаємо mood до frontend
        }
      })}\n\n`);
    }

    // FIXED 2025-11-06: Відключено автоматичні mode selection повідомлення в чат
    // Режим відображається тільки в логах, щоб не спамити користувача
    // if (wsManager) {
    //   try {
    //     const modeEmoji = mode === 'chat' ? '💬 Chat' : mode === 'dev' ? '🔬 Dev' : '🔧 Task';
    //     const systemMessage = `Mode: ${modeEmoji} (confidence: ${Math.round(confidence * 100)}%)`;
    //     const systemTts = `Mode ${mode}`;
    //     
    //     const userMessage = localizationService.translateToUser(systemMessage);
    //     const userTts = localizationService.translateToUser(systemTts);
    //     
    //     wsManager.broadcastToSubscribers('chat', 'agent_message', {
    //       content: userMessage,
    //       agent: 'system',
    //       sessionId: session.id,
    //       timestamp: new Date().toISOString(),
    //       ttsContent: userTts,
    //       mode: mode
    //     });
    //   } catch (error) {
    //     logger.warn('executor', `Failed to send mode selection WebSocket message: ${error.message}`);
    //   }
    // }

    // ===============================================
    // Handle DEV mode - INTERNAL ONLY (2025-11-05)
    // DEV mode is ONLY for NEXUS internal operations
    // User requests about self-analysis go to CHAT mode
    // ===============================================
    if (mode === 'dev') {
      logger.workflow('stage', 'system', 'DEV mode detected - transitioning to DEV state', {
        sessionId: session.id
      });

      try {
        // PHASE 2.4.2: Transition to DEV state
        await stateMachine.transition(WorkflowStateMachine.States.DEV);

        // Execute DEV handler
        const devResult = await stateMachine.executeHandler({});

        logger.workflow('complete', 'system', 'DEV mode completed via state machine', {
          sessionId: session.id
        });

        // Check if DEV mode wants to transition to TASK mode
        if (devResult.transitionToTask && devResult.taskContext) {
          logger.system('executor', '[DEV→TASK] Transitioning from DEV to TASK mode', {
            sessionId: session.id,
            tasksCount: devResult.taskContext.tasks?.length || 0
          });

          // Update session for TASK mode
          session.mode = 'task';
          session.devTransitionContext = devResult.taskContext;
          session.autoExecuteTasks = true;

          // Continue to TASK mode processing
          mode = 'task';
          userMessage = devResult.taskContext.tasks
            .map(t => t.action)
            .join('; ');

          logger.system('executor', '[DEV→TASK] Session updated for TASK mode execution', {
            sessionId: session.id,
            mode: 'task',
            autoExecute: true
          });

          // Don't return here - continue to TASK mode processing below
        } else {
          // Return DEV result
          return devResult;
        }
      } catch (devError) {
        logger.error('executor', `DEV mode failed: ${devError.message}`, {
          sessionId: session.id,
          stack: devError.stack
        });

        throw devError;
      }
    }

    // ===============================================
    // Handle CHAT mode - Simple response from Atlas
    // ===============================================
    logger.system('executor', `[CHAT-MODE-CHECK] mode=${mode}, typeof=${typeof mode}, mode===chat: ${mode === 'chat'}`);

    if (mode === 'chat') {
      logger.workflow('stage', 'atlas', 'Chat mode detected - transitioning to CHAT state', {
        sessionId: session.id
      });

      try {
        // PHASE 2.4.2: Transition to CHAT state
        await stateMachine.transition(WorkflowStateMachine.States.CHAT);

        // Execute CHAT handler
        const chatResult = await stateMachine.executeHandler({});

        logger.workflow('complete', 'atlas', 'Chat mode completed via state machine', {
          sessionId: session.id
        });

        // Return result
        return chatResult;
      } catch (chatError) {
        logger.error('executor', `Chat mode failed: ${chatError.message}`, {
          sessionId: session.id,
          stack: chatError.stack
        });

        throw chatError;
      }
    }

    // PHASE 2.4.2: Transition to TASK state
    logger.workflow('stage', 'system', 'TASK mode detected - transitioning to TASK state', {
      sessionId: session.id
    });

    try {
      // Transition to TASK state
      await stateMachine.transition(WorkflowStateMachine.States.TASK);

      // Execute TASK handler (which will coordinate all TODO processing)
      const taskResult = await stateMachine.executeHandler({});

      logger.workflow('complete', 'system', 'TASK mode completed via state machine', {
        sessionId: session.id
      });

      // PHASE 5.3: Record execution metrics
      if (modeManager) {
        const executionTime = Date.now() - workflowStart;
        modeManager.recordExecution(executionTime);
        logger.system('executor', '[METRICS] Execution recorded', {
          mode: modeManager.getCurrentMode(),
          executionTime,
          metrics: modeManager.getMetrics()
        });
      }

      return taskResult;
    } catch (taskError) {
      logger.error('executor', `TASK mode failed: ${taskError.message}`, {
        sessionId: session.id,
        stack: taskError.stack
      });

      throw taskError;
    }

  } catch (error) {

    logger.error(`MCP workflow failed: ${error.message}`, {
      sessionId: session.id,
      error: error.message,
      stack: error.stack
    });

    // Send error to frontend
    if (res && res.writable && !res.writableEnded) {
      res.write(`data: ${JSON.stringify({
        type: 'mcp_workflow_error',
        data: {
          error: error.message,
          sessionId: session.id
        }
      })}\n\n`);
    }

    throw error;
  }
}

/**
 * Helper: Get adaptive verification delay based on operation type
 * 
 * Different operations need different delays:
 * - App launches: 2500ms (programs need time to open)
 * - Other operations: 1000ms (standard delay)
 * 
 * @param {Object} execution - Execution results from Stage 2.2
 * @param {Object} item - TODO item
 * @returns {number} Delay in milliseconds
 * @private
 */
function _getVerificationDelay(execution, item) {
  const DELAY_APP_LAUNCH = 2500;  // 2.5 сек для відкриття програм
  const DELAY_STANDARD = 1000;    // 1 сек для інших операцій

  if (!execution || !execution.results) {
    return DELAY_STANDARD;
  }

  // Check if any tool involved macOS app launch
  for (const result of execution.results) {
    if (!result.tool) continue;

    const toolLower = result.tool.toLowerCase();

    // AppleScript execution (часто для відкриття програм)
    if (toolLower.includes('applescript')) {
      return DELAY_APP_LAUNCH;
    }

    // Shell команди типу 'open -a Calculator'
    if (toolLower.includes('shell') && result.data) {
      const command = JSON.stringify(result.data).toLowerCase();
      if (command.includes('open -a') || command.includes('activate')) {
        return DELAY_APP_LAUNCH;
      }
    }
  }

  // Check item action keywords for app launch
  const actionLower = (item.action || '').toLowerCase();
  const appLaunchKeywords = [
    'відкр',      // відкрити
    'запуст',     // запустити
    'open',
    'launch'
  ];

  // Перевіряємо чи дія стосується відкриття програми
  for (const keyword of appLaunchKeywords) {
    if (actionLower.includes(keyword)) {
      // Перевіряємо чи є назва програми
      const appNames = [
        'калькулятор', 'calculator',
        'браузер', 'browser',
        'safari', 'chrome', 'firefox',
        'finder', 'notes', 'mail', 'calendar'
      ];

      for (const appName of appNames) {
        if (actionLower.includes(appName)) {
          return DELAY_APP_LAUNCH;
        }
      }
    }
  }

  // Для всіх інших операцій - стандартна затримка
  return DELAY_STANDARD;
}

/**
 * MAIN STEP-BY-STEP WORKFLOW EXECUTOR
 * Використовує unified configuration та prompt registry
 */
export async function executeStepByStepWorkflow(userMessage, session, res, _options = {}) {
  // Add user message to history - CRITICAL FIX: Check if history exists
  if (!session.history) {
    session.history = [];
  }

  session.history.push({
    role: 'user',
    content: userMessage,
    timestamp: Date.now()
  });

  logger.workflow('init', 'mcp', 'Starting MCP Dynamic TODO Workflow', {
    sessionId: session.id,
    userMessage: userMessage.substring(0, 100)
  });

  try {
    // Validate DI Container
    const container = session.container;
    if (!container) {
      const error = new Error('DI Container not available in session - cannot execute MCP workflow');
      logger.error('executor', '❌ DI Container unavailable', {
        sessionId: session.id
      });

      if (res.writable && !res.writableEnded) {
        res.write(`data: ${JSON.stringify({
          type: 'workflow_error',
          data: {
            error: 'System initialization error',
            message: 'DI Container not available'
          }
        })}\n\n`);
        res.end();
      }

      throw error;
    }

    // Execute MCP Dynamic TODO Workflow
    const mcpTodoManager = container.resolve('mcpTodoManager');

    // Step 1: Create TODO from user message
    const todo = await mcpTodoManager.createTodo(userMessage, { sessionId: session.id });

    // Step 2: Execute the TODO
    const results = await mcpTodoManager.executeTodo(todo);

    return {
      success: true,
      mode: 'task',
      todo: todo,
      results: results
    };

  } catch (error) {
    logger.error('MCP workflow failed', {
      error: error.message,
      sessionId: session.id,
      stack: error.stack
    });

    if (!res.headersSent && res.writable && !res.writableEnded) {
      res.write(`data: ${JSON.stringify({
        type: 'workflow_error',
        data: {
          error: 'Workflow failed',
          details: error.message
        }
      })}\n\n`);
    }

    throw error;
  }
}

/**
 * LEGACY COMPATIBILITY - Deprecated
 * Use executeMCPWorkflow directly instead
 */
export async function executeAgentStageStepByStep(
  agentName,
  stageName,
  systemPrompt,
  userPrompt,
  session,
  res,
  _options = {}
) {
  logger.warn('Using deprecated executeAgentStageStepByStep, MCP workflow recommended');

  // For backward compatibility, delegate to MCP workflow
  const container = session.container;
  if (!container) {
    throw new Error('DI Container not available - cannot execute workflow');
  }

  return await executeMCPWorkflow(userPrompt, session, res, container);
}

export class WorkflowExecutor {
  constructor(container) {
    this.container = container;
    this.logger = logger;
    this.emitter = new WorkflowEventEmitter();
    this.ttsSyncManager = new TTSSyncManager(container);
    this.todoManager = null;
    this.dynamicAgentCoordinator = null;
    this.processingLock = false;
    this.eternityIntegration = null; // ETERNITY - модуль вічного самовдосконалення
  }

  async initialize() {
    // Ініціалізація ETERNITY модуля для вічного самовдосконалення
    try {
      const EternityIntegration = await import('../eternity/eternity-integration.js').then(m => m.EternityIntegration);
      this.eternityIntegration = new EternityIntegration(this.container);
      await this.eternityIntegration.initialize();
      this.logger.info('✨ ETERNITY module initialized - Atlas отримав дар безсмертя від Олега Миколайовича');
    } catch (error) {
      this.logger.warn('ETERNITY module not available:', error.message);
    }

    return this;
  }
}
