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

// FIXED 21.10.2025 - Phrase rotation indices (module-level for persistence)
const phraseRotation = {
  tetyanaStart: 0,
  tetyanaSuccess: 0
};

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

  try {
    // Resolve processors from DI Container
    const modeProcessor = container.resolve('modeSelectionProcessor');
    const contextEnrichmentProcessor = container.resolve('atlasContextEnrichmentProcessor');
    const todoProcessor = container.resolve('atlasTodoPlanningProcessor');
    const planProcessor = container.resolve('tetyanaPlanToolsProcessor');
    const executeProcessor = container.resolve('tetyanaExecuteToolsProcessor');
    const verifyProcessor = container.resolve('grishaVerifyItemProcessor');
    const replanProcessor = container.resolve('atlasReplanTodoProcessor');
    const summaryProcessor = container.resolve('mcpFinalSummaryProcessor');

    // ===============================================
    // Stage 0-MCP: Mode Selection (NEW 16.10.2025)
    // ===============================================
    logger.workflow('stage', 'system', 'Stage 0-MCP: Mode Selection', { sessionId: session.id });

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
      const devProcessor = container.resolve('devSelfAnalysisProcessor');
      
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
        mode = 'task';
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
        
        return analysisResult;
      }
    }

    const modeResult = await modeProcessor.execute({
      userMessage,
      session
    });

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

    // Send mode selection message to chat via WebSocket
    if (wsManager) {
      try {
        // System message in English
        const modeEmoji = mode === 'chat' ? '💬 Chat' : mode === 'dev' ? '🔬 Dev' : '🔧 Task';
        const systemMessage = `Mode: ${modeEmoji} (confidence: ${Math.round(confidence * 100)}%)`;
        const systemTts = `Mode ${mode}`;
        
        // Translate for user display
        const userMessage = localizationService.translateToUser(systemMessage);
        const userTts = localizationService.translateToUser(systemTts);
        
        wsManager.broadcastToSubscribers('chat', 'agent_message', {
          content: userMessage,
          agent: 'system',
          sessionId: session.id,
          timestamp: new Date().toISOString(),
          ttsContent: userTts,
          mode: mode
        });
      } catch (error) {
        logger.warn('executor', `Failed to send mode selection WebSocket message: ${error.message}`);
      }
    }

    // ===============================================
    // Handle DEV mode - Self-analysis and code intervention
    // ===============================================
    if (mode === 'dev') {
      logger.workflow('stage', 'atlas', 'DEV mode detected - Starting self-analysis', {
        sessionId: session.id
      });

      try {
        // Resolve DEV self-analysis processor
        const devProcessor = container.resolve('devSelfAnalysisProcessor');
        
        // Check if user is providing password for pending DEV intervention
        const isPasswordProvided = session.awaitingDevPassword && 
                                  (userMessage.toLowerCase() === 'mykola' || 
                                   userMessage.toLowerCase() === 'микола' ||
                                   userMessage.toLowerCase().trim() === 'mykola' ||
                                   userMessage.toLowerCase().trim() === 'микола');
        
        // Check if user is requesting intervention after analysis
        const isInterventionRequest = session.lastDevAnalysis && 
                                      (userMessage.toLowerCase().includes('виправ') ||
                                       userMessage.toLowerCase().includes('внеси зміни') ||
                                       userMessage.toLowerCase().includes('fix') ||
                                       userMessage.toLowerCase().includes('make changes'));
        
        // Check if password is included in intervention request
        const passwordInMessage = userMessage.toLowerCase().includes('mykola') || 
                                 userMessage.toLowerCase().includes('микола');
        
        // Execute self-analysis with container for MCP access
        const analysisResult = await devProcessor.execute({
          userMessage,
          session,
          requiresIntervention: isInterventionRequest,
          password: isPasswordProvided ? userMessage.trim() : null, // Will prompt for password if needed
          container // Pass container for MCP filesystem access
        });
        
        logger.system('executor', `[DEV-MODE] Analysis complete, requiresAuth: ${analysisResult.requiresAuth}`, {
          sessionId: session.id
        });

        // Build comprehensive message from analysis results (available for all branches)
        const findings = analysisResult.analysis?.findings || {};
        const detailedAnalysis = analysisResult.analysis?.detailed_analysis || {};
        const deepTargetedAnalysis = analysisResult.analysis?.deep_targeted_analysis || null;
        const summary = analysisResult.analysis?.summary || '';
        const { ttsSettings = {}, interactiveMode = false } = analysisResult;

        // Build detailed message with metrics table
        const metrics = analysisResult.analysis?.metrics || {};
        
        let message = '🔬 **Аналіз системи Atlas**\n\n';
        
        // Add metrics table
        if (metrics.error_count !== undefined || metrics.warning_count !== undefined) {
          message += '**📊 Метрики системи:**\n';
          message += '```\n';
          message += `Помилки:      ${metrics.error_count || 0}\n`;
          message += `Попередження:  ${metrics.warning_count || 0}\n`;
          message += `Здоров'я:     ${metrics.system_health || 'N/A'}%\n`;
          message += `Uptime:       ${Math.floor((metrics.uptime || 0) / 60)} хв\n`;
          message += '```\n\n';
        }
        
        // Add summary
        if (summary) {
          message += summary + '\n\n';
        }
        
        // Add critical issues with evidence
        if (findings.critical_issues?.length > 0) {
          message += `🔴 **Критичні проблеми (${findings.critical_issues.length}):**\n`;
          findings.critical_issues.forEach((issue, idx) => {
            if (idx < 5) { // Show top 5
              message += `\n${idx + 1}. **${issue.type || 'Проблема'}**\n`;
              message += `   • ${issue.description}\n`;
              if (issue.location) message += `   • Місце: ${issue.location}\n`;
              if (issue.frequency) message += `   • Частота: ${issue.frequency}\n`;
              if (issue.evidence) message += `   • Доказ: ${issue.evidence.substring(0, 100)}...\n`;
            }
          });
          message += '\n';
        }
        
        // Add performance bottlenecks
        if (findings.performance_bottlenecks?.length > 0) {
          message += `\n⚡ **Проблеми продуктивності (${findings.performance_bottlenecks.length}):**\n`;
          findings.performance_bottlenecks.forEach((issue, idx) => {
            if (idx < 3) {
              message += `  ${idx + 1}. ${issue.description || issue.area}`;
              if (issue.metrics) message += ` (${issue.metrics})`;
              message += '\n';
            }
          });
        }
        
        // Add improvement suggestions
        if (findings.improvement_suggestions?.length > 0) {
          message += `\n💡 **Рекомендації (${findings.improvement_suggestions.length}):**\n`;
          findings.improvement_suggestions.forEach((suggestion, idx) => {
            if (idx < 3) {
              const priority = suggestion.priority === 'high' ? '🔴' : suggestion.priority === 'medium' ? '🟡' : '🟢';
              message += `  ${priority} ${suggestion.suggestion || suggestion.area}\n`;
              if (suggestion.implementation) message += `     → ${suggestion.implementation}\n`;
            }
          });
        }
        
        // Add TODO list if available
        const todoList = analysisResult.analysis?.todo_list || [];
        if (todoList.length > 0) {
          message += `\n\n📋 **TODO список:**\n`;
          todoList.forEach((item, idx) => {
            const priority = item.priority === 'critical' ? '🔴' : 
                           item.priority === 'high' ? '🟠' : 
                           item.priority === 'medium' ? '🟡' : '🟢';
            message += `${idx + 1}. ${priority} ${item.action}\n`;
            if (item.details) message += `   → ${item.details}\n`;
          });
        }
        
        if (analysisResult.intervention) {
          message += `\n✅ **Втручання виконано:**\n`;
          message += `  • Файлів змінено: ${analysisResult.intervention.files_modified.length}\n`;
          message += `  • Зміни будуть застосовані при наступному перезапуску системи\n`;
        }
        
        // Add deep targeted analysis if available
        if (deepTargetedAnalysis) {
          message += `\n🎯 **Глибокий цільовий аналіз:**\n`;
          
          if (deepTargetedAnalysis.rootCauses?.length > 0) {
            message += `\n**Корінні причини:**\n`;
            deepTargetedAnalysis.rootCauses.forEach(rc => {
              const cause = rc.cause?.primaryCause || rc.cause || 'Невідома причина';
              const confidence = rc.confidence || 0.85;
              message += `  • ${rc.issue}: ${cause} (впевненість: ${(confidence * 100).toFixed(0)}%)\n`;
            });
          }
          
          if (deepTargetedAnalysis.impactAnalysis?.length > 0) {
            message += `\n**Аналіз впливу:**\n`;
            deepTargetedAnalysis.impactAnalysis.forEach(impact => {
              message += `  • ${impact.issue}: впливає на ${impact.affectedComponents.join(', ')}\n`;
            });
          }
          
          if (deepTargetedAnalysis.recommendations?.length > 0) {
            message += `\n**Цільові рекомендації:**\n`;
            deepTargetedAnalysis.recommendations.forEach(rec => {
              message += `  • ${rec.action} (пріоритет: ${rec.priority})\n`;
            });
          }
        }
        
        // Add focused area analysis if available
        if (detailedAnalysis.focusAreaAnalysis) {
          const focus = detailedAnalysis.focusAreaAnalysis;
          message += `\n🔍 **Фокусний аналіз (${focus.area}):**\n`;
          if (focus.findings?.length > 0) {
            focus.findings.forEach(f => {
              message += `  • ${f.description}\n`;
            });
          }
          if (focus.metrics && Object.keys(focus.metrics).length > 0) {
            message += `\n**Метрики:**\n`;
            Object.entries(focus.metrics).forEach(([key, value]) => {
              message += `  • ${key}: ${value}\n`;
            });
          }
        }
        
        // Add deep understanding context
        message += `\n🧠 **Розуміння контексту:**\n`;
        message += `Я проаналізував свої внутрішні системи та виявив області для покращення. `;
        message += `Кожна знахідка базується на глибокому розумінні архітектури та взаємозв'язків між компонентами. `;
        
        if (findings.critical_issues?.length === 0 && findings.performance_bottlenecks?.length === 0) {
          message += `Система працює стабільно, але завжди є простір для вдосконалення.`;
        } else {
          message += `Виявлені проблеми потребують уваги для оптимальної роботи системи.`;
        }
        
        // Add interactive mode prompt if enabled
        if (interactiveMode) {
          message += `\n\n💬 **Інтерактивний режим активний**\n`;
          message += `Ви можете задавати уточнюючі питання або просити глибший аналіз конкретних областей.\n`;
          message += `Доступні напрямки: Тетяна, Гріша, MCP, продуктивність, помилки, пам'ять, архітектура.`;
        }

        // ALWAYS prepare FULL TTS message - Atlas speaks everything with emotion
        let cleanedForTts = message
          .replace(/[*_#]/g, '')
          .replace(/\n+/g, '. ')
          .replace(/🔬/g, '')
          .replace(/🔴/g, '')
          .replace(/⚡/g, '')
          .replace(/💡/g, '')
          .replace(/📊/g, '')
          .replace(/🧠/g, '')
          .replace(/🎯/g, '')
          .replace(/🔍/g, '')
          .replace(/💬/g, '')
          .replace(/✅/g, 'успішно')
          .replace(/⚠️/g, 'увага')
          .replace(/•/g, ',');
        
        // Add emotional context to TTS
        const baseTtsMessage = findings.critical_issues?.length > 0
          ? `Слухай, я знайшов дещо важливе... ${cleanedForTts} Я вже працюю над вирішенням цих проблем.`
          : `Привіт! Я щойно завершив глибокий самоаналіз. ${cleanedForTts} Все працює добре, але я завжди шукаю шляхи стати кращим для тебе.`;

        if (!analysisResult.success && analysisResult.requiresAuth) {
          const passwordAppendix = `\n\n🔐 **Потрібна авторізація для втручання**\nМені потрібен пароль "mykola", щоб завершити лікування своїх систем. Як тільки ти його підтвердиш, я одразу застосую виправлення.`;
          const authMessage = message + passwordAppendix;
          const localizedAuthMessage = localizationService.translateToUser(authMessage);
          const authTtsMessage = `${baseTtsMessage} Мені потрібен пароль "mykola", щоб завершити втручання.`;

          if (wsManager) {
            // Send agent message
            wsManager.broadcastToSubscribers('chat', 'agent_message', {
              content: localizedAuthMessage,
              agent: 'atlas',
              sessionId: session.id,
              timestamp: new Date().toISOString(),
              ttsContent: authTtsMessage,
              mode: 'dev',
              analysisData: {
                findings,
                detailedAnalysis,
                deepTargetedAnalysis,
                summary
              },
              ttsSettings,
              interactiveMode,
              requiresAuth: true
            });
            
            // Trigger password dialog with analysis data
            wsManager.broadcastToSubscribers('chat', 'dev_password_request', {
              sessionId: session.id,
              analysisData: {
                criticalIssues: findings.critical_issues?.length || 0,
                performanceIssues: findings.performance_bottlenecks?.length || 0,
                improvements: findings.improvement_suggestions?.length || 0
              }
            });
          }

          if (res?.writable && !res.writableEnded) {
            res.write(`data: ${JSON.stringify({
              type: 'agent_message',
              data: {
                content: localizedAuthMessage,
                agent: 'atlas',
                ttsContent: authTtsMessage,
                mode: 'dev',
                findings,
                detailedAnalysis,
                deepTargetedAnalysis,
                intervention: analysisResult.intervention || null,
                ttsSettings,
                interactiveMode,
                requiresAuth: true
              }
            })}\n\n`);
          }

          // Видалено дублюючу відправку - вже відправлено вище на рядку 297

          session.awaitingDevPassword = true;
          session.devAnalysisResult = analysisResult;
          session.devOriginalMessage = userMessage; // Зберігаємо оригінальне повідомлення
          session.lastDevAnalysis = {
            findings,
            detailedAnalysis,
            deepTargetedAnalysis,
            summary
          };
          session.lastDevAnalysisMessage = userMessage;
          
          logger.system('executor', `[DEV-MODE] ✅ Password state set: awaitingDevPassword=true, sessionId=${session.id}`);

          return {
            success: false,
            requiresAuth: true,
            message: 'Password required for code intervention',
            analysis: analysisResult.analysis,
            metadata: analysisResult.metadata,
            ttsSettings: {
              ...ttsSettings,
              fullNarration: true
            },
            interactiveMode
          };
        }

        const localizedMessage = localizationService.translateToUser(message);

        const ttsMessage = baseTtsMessage;

        // Remove TTS control info - Atlas always speaks fully

        // Send ONLY to WebSocket OR SSE, not both
        if (wsManager) {
          wsManager.broadcastToSubscribers('chat', 'agent_message', {
            content: localizedMessage,
            agent: 'atlas',
            sessionId: session.id,
            timestamp: new Date().toISOString(),
            ttsContent: ttsMessage, // Include TTS content for frontend to handle
            mode: 'dev',
            analysisData: {
              findings,
              detailedAnalysis,
              deepTargetedAnalysis,
              summary
            },
            ttsSettings,
            interactiveMode
          });
        }
        // Only send via SSE if WebSocket not available
        else if (res?.writable && !res.writableEnded) {
          res.write(`data: ${JSON.stringify({
            type: 'agent_message',
            data: {
              content: localizedMessage,
              agent: 'atlas',
              ttsContent: ttsMessage,
              mode: 'dev',
              findings,
              detailedAnalysis,
              deepTargetedAnalysis,
              intervention: analysisResult.intervention || null,
              ttsSettings,
              interactiveMode
            }
          })}\n\n`);
        }
        
        // Store analysis in session for context
        session.lastDevAnalysis = {
          timestamp: new Date().toISOString(),
          findings,
          detailedAnalysis,
          deepTargetedAnalysis,
          summary: analysisResult.analysis?.summary || message,
          interactiveMode,
          focusArea: analysisResult.metadata?.focusArea,
          analysisDepth: analysisResult.metadata?.analysisDepth
        };
        session.lastDevAnalysisMessage = userMessage; // CRITICAL: Save original message for intervention context
        
        logger.system('executor', `[DEV-MODE] ✅ Analysis context saved: lastDevAnalysis + lastDevAnalysisMessage`, {
          sessionId: session.id,
          hasFindings: !!findings,
          criticalIssues: findings?.critical_issues?.length || 0
        });
        
        // Check if DEV mode wants to transition to TASK mode
        if (analysisResult.transitionToTask && analysisResult.taskContext) {
          logger.system('executor', '[DEV→TASK] Transitioning from DEV to TASK mode', {
            sessionId: session.id,
            tasksCount: analysisResult.taskContext.tasks?.length || 0
          });
          
          // Send transition message
          if (wsManager) {
            wsManager.broadcastToSubscribers('chat', 'agent_message', {
              content: analysisResult.message || '🚀 Переходжу в TASK режим для виконання змін...',
              agent: 'atlas',
              sessionId: session.id,
              timestamp: new Date().toISOString(),
              ttsContent: 'Переходжу в режим виконання завдань',
              mode: 'task_transition'
            });
          }
          
          // Update session for TASK mode
          session.mode = 'task';
          session.devTransitionContext = analysisResult.taskContext;
          session.autoExecuteTasks = true;
          
          // Continue to TASK mode processing
          mode = 'task';
          userMessage = analysisResult.taskContext.tasks
            .map(t => t.action)
            .join('; ');
          
          logger.system('executor', '[DEV→TASK] Session updated for TASK mode execution', {
            sessionId: session.id,
            mode: 'task',
            autoExecute: true
          });
          
          // Don't return here - continue to TASK mode processing below
        } else {
          return analysisResult;
        }
        
      } catch (error) {
        logger.error(`[DEV-MODE] Self-analysis failed: ${error.message}`);
        
        if (wsManager) {
          wsManager.broadcastToSubscribers('chat', 'agent_message', {
            content: `❌ Помилка самоаналізу: ${error.message}`,
            agent: 'atlas',
            sessionId: session.id,
            timestamp: new Date().toISOString()
          });
        }
        
        return {
          success: false,
          error: error.message
        };
      }
    }

    // ===============================================
    // Handle CHAT mode - Simple response from Atlas
    // ===============================================
    logger.system('executor', `[CHAT-MODE-CHECK] mode=${mode}, typeof=${typeof mode}, mode===chat: ${mode === 'chat'}`);

    if (mode === 'chat') {
      logger.workflow('stage', 'atlas', 'Chat mode detected - Atlas will respond directly', {
        sessionId: session.id
      });

      // DIAGNOSTIC - Add detailed logging to find where code execution stops
      logger.system('executor', '[CHAT-DEBUG] About to enter chat try block');

      // FIXED 16.10.2025 - Load chat prompt from prompts directory (not hardcoded)
      try {
        logger.system('executor', '[CHAT-DEBUG] Step 1: Loading chat prompt from prompts/mcp/atlas_chat.js');
        const { MCP_PROMPTS } = await import('../../prompts/mcp/index.js');
        const chatPrompt = MCP_PROMPTS.ATLAS_CHAT;

        if (!chatPrompt || !chatPrompt.SYSTEM_PROMPT) {
          throw new Error('Chat prompt not loaded correctly from prompts directory');
        }

        logger.system('executor', `[CHAT-DEBUG] Step 2: Chat prompt loaded successfully`);

        logger.system('executor', `[CHAT-DEBUG] Step 3: Importing axios`);
        const axios = (await import('axios')).default;
        logger.system('executor', `[CHAT-DEBUG] Step 4: Getting model config`);
        const modelConfig = GlobalConfig.AI_MODEL_CONFIG.models.chat;
        logger.system('executor', `[CHAT-DEBUG] Step 5: Model config retrieved: ${JSON.stringify(modelConfig)}`);

        // FIXED 16.10.2025 - Initialize chatThread if not exists
        if (!session.chatThread) {
          logger.system('executor', `[CHAT-DEBUG] Step 6: Initializing new chatThread`);
          session.chatThread = { messages: [], lastTopic: undefined };
        } else {
          logger.system('executor', `[CHAT-DEBUG] Step 6: ChatThread exists with ${session.chatThread.messages.length} messages`);
        }

        // FIXED 16.10.2025 - Add current user message to session history BEFORE building context
        logger.system('executor', `[CHAT-DEBUG] Step 7: Adding user message to history`);
        
        // CRITICAL FIX: Check if chatThread.messages exists
        if (!session.chatThread.messages) {
          session.chatThread.messages = [];
        }
        
        session.chatThread.messages.push({
          role: 'user',
          content: userMessage,
          timestamp: new Date().toISOString()
        });
        logger.system('executor', `[CHAT-DEBUG] Step 8: User message added, total messages: ${session.chatThread.messages.length}`);

        // DIAGNOSTIC 16.10.2025 - Log session state
        logger.system('executor', `[CHAT-CONTEXT] SessionId: ${session.id}`);
        logger.system('executor', `[CHAT-CONTEXT] Total messages in history: ${session.chatThread.messages.length}`);
        logger.system('executor', `[CHAT-CONTEXT] History: ${JSON.stringify(session.chatThread.messages.map(m => ({ role: m.role, content: m.content.substring(0, 50) })), null, 2)}`);

        // Build chat context from recent messages (last 5 exchanges = 10 messages)
        // CRITICAL: Filter out system messages and prompts from context
        const recentMessages = session.chatThread.messages
          .filter(msg => {
            // Skip system messages
            if (msg.role === 'system') return false;
            // Skip messages that look like prompts
            if (msg.content && (
              msg.content.includes('You are Atlas') ||
              msg.content.includes('SYSTEM PROMPT') ||
              msg.content.includes('INSTRUCTIONS:') ||
              msg.content.includes('CRITICAL RULES')
            )) return false;
            return true;
          })
          .slice(-10)
          .map(msg => ({
            role: msg.role === 'user' ? 'user' : 'assistant',
            content: msg.content
          }));

        logger.system('executor', `[CHAT-CONTEXT] Sending ${recentMessages.length} messages to LLM`);
        logger.system('executor', `[CHAT-CONTEXT] Context for LLM: ${JSON.stringify(recentMessages.map(m => ({ role: m.role, preview: m.content.substring(0, 40) })), null, 2)}`);

        // NEW 26.10.2025: INTELLIGENT MEMORY INTEGRATION
        logger.system('executor', '[CHAT-MEMORY] 🧠 Checking if long-term memory is needed...');
        
        let memoryContext = null;
        try {
          // Resolve Chat Memory Coordinator from DI Container
          const chatMemoryCoordinator = container.resolve('chatMemoryCoordinator');
          
          // Process message with memory integration
          const memoryResult = await chatMemoryCoordinator.processMessage({
            userMessage,
            session,
            recentMessages
          });
          
          if (memoryResult.memoryUsed && memoryResult.memoryContext) {
            memoryContext = memoryResult.memoryContext;
            logger.system('executor', `[CHAT-MEMORY] ✅ Memory retrieved: ${memoryContext.count} entities (${memoryResult.processingTime}ms)`);
          } else {
            logger.system('executor', `[CHAT-MEMORY] ⏭️ Memory skipped: ${memoryResult.reasoning}`);
          }
        } catch (memoryError) {
          logger.warn('executor', `[CHAT-MEMORY] ⚠️ Memory integration failed: ${memoryError.message}`);
          // Continue without memory
        }

        // DIAGNOSTIC: Check GlobalConfig structure
        logger.system('executor', `[DIAGNOSTIC] GlobalConfig exists: ${!!GlobalConfig}`);
        logger.system('executor', `[DIAGNOSTIC] AI_MODEL_CONFIG exists: ${!!GlobalConfig.AI_MODEL_CONFIG}`);
        logger.system('executor', `[DIAGNOSTIC] AI_MODEL_CONFIG type: ${typeof GlobalConfig.AI_MODEL_CONFIG}`);

        // Get API endpoint (with safe access and comprehensive fallback)
        const apiEndpointConfig = GlobalConfig.AI_MODEL_CONFIG?.apiEndpoint;
        logger.system('executor', `[DIAGNOSTIC] apiEndpointConfig: ${JSON.stringify(apiEndpointConfig)}`);

        let apiUrl;
        if (!apiEndpointConfig) {
          logger.warn('executor', '[CHAT] apiEndpoint config is undefined, using fallback URL');
          apiUrl = 'http://localhost:4000/v1/chat/completions';
        } else if (typeof apiEndpointConfig === 'string') {
          apiUrl = apiEndpointConfig;
        } else if (typeof apiEndpointConfig === 'object') {
          apiUrl = apiEndpointConfig.primary || 'http://localhost:4000/v1/chat/completions';
        } else {
          logger.warn('executor', `[CHAT] Unexpected apiEndpointConfig type: ${typeof apiEndpointConfig}`);
          apiUrl = 'http://localhost:4000/v1/chat/completions';
        }

        logger.system('executor', `Calling chat API at ${apiUrl} with model ${modelConfig.model}`);

        // FIXED 16.10.2025 - Use system prompt from prompts directory (not hardcoded)
        let systemPrompt = chatPrompt.SYSTEM_PROMPT;
        
        // NEW 26.10.2025: Inject memory context if available
        if (memoryContext && memoryContext.hasMemory) {
          systemPrompt = systemPrompt + '\n\n' + memoryContext.contextText;
          logger.system('executor', '[CHAT-MEMORY] 📝 Memory context injected into system prompt');
        }

        logger.system('executor', `[SYSTEM-PROMPT] Using prompt from prompts/mcp/atlas_chat.js`);

        // Call LLM for chat response with fallback support
        let chatResponse;
        let usedFallback = false;

        try {
          // Prepare messages array
          const messagesArray = [
            {
              role: 'system',
              content: systemPrompt
            },
            ...recentMessages
          ];

          // Log what we're sending to LLM
          logger.system('executor', `[API-REQUEST] Messages to send: ${JSON.stringify(messagesArray, null, 2)}`);
          logger.system('executor', `[API-REQUEST] Model: ${modelConfig.model}, Temp: ${modelConfig.temperature}, Tokens: ${modelConfig.max_tokens}`);

          const response = await axios.post(apiUrl, {
            model: modelConfig.model,
            messages: messagesArray,
            temperature: modelConfig.temperature,
            max_tokens: modelConfig.max_tokens
          }, {
            headers: { 'Content-Type': 'application/json' },
            timeout: 60000
          });
          chatResponse = response;

          // Log API response
          const llmAnswer = response.data?.choices?.[0]?.message?.content;
          logger.system('executor', `[API-RESPONSE] LLM returned: ${llmAnswer ? llmAnswer.substring(0, 100) : 'EMPTY'}`);

        } catch (primaryError) {
          // Try fallback if primary fails
          if (apiEndpointConfig?.fallback && !usedFallback) {
            logger.warn('executor', `Chat API failed: ${primaryError.message}, attempting fallback...`);
            apiUrl = apiEndpointConfig.fallback;
            usedFallback = true;

            try {
              chatResponse = await axios.post(apiUrl, {
                model: modelConfig.model,
                messages: [
                  {
                    role: 'system',
                    content: systemPrompt
                  },
                  ...recentMessages
                ],
                temperature: modelConfig.temperature,
                max_tokens: modelConfig.max_tokens
              }, {
                headers: { 'Content-Type': 'application/json' },
                timeout: 60000
              });
              logger.system('executor', `✅ Chat API fallback succeeded`);

            } catch (fallbackError) {
              logger.error('executor', `Chat API fallback also failed: ${fallbackError.message}`);
              throw fallbackError;
            }
          } else {
            throw primaryError;
          }
        }

        // Handle both OpenAI format (message.content) and Ollama format (text)
        const atlasResponse = chatResponse.data?.choices?.[0]?.message?.content
          || chatResponse.data?.choices?.[0]?.text;

        if (!atlasResponse) {
          throw new Error('Empty response from chat API');
        }

        logger.system('executor', `Atlas chat response: ${atlasResponse.substring(0, 100)}...`);

        // Send response via WebSocket (primary channel)
        if (wsManager) {
          wsManager.broadcastToSubscribers('chat', 'agent_message', {
            content: atlasResponse,
            ttsContent: atlasResponse, // CRITICAL: Add ttsContent for TTS playback
            agent: 'atlas',
            sessionId: session.id,
            timestamp: new Date().toISOString()
          });
        }

        // NOTE: SSE response removed to prevent duplicate messages
        // Frontend receives via WebSocket only

        // Add to session history
        if (session.chatThread) {
          // CRITICAL FIX: Check if messages array exists
          if (!session.chatThread.messages) {
            session.chatThread.messages = [];
          }
          
          session.chatThread.messages.push({
            role: 'assistant',
            content: atlasResponse,
            agent: 'atlas',
            timestamp: new Date().toISOString()
          });

          // DIAGNOSTIC 16.10.2025
          logger.system('executor', `[CHAT-CONTEXT] Assistant response added. Total messages now: ${session.chatThread.messages.length}`);
        }
        
        // NEW 26.10.2025: Store important information to memory
        try {
          const chatMemoryCoordinator = container.resolve('chatMemoryCoordinator');
          await chatMemoryCoordinator.storeMemory({
            userMessage,
            assistantResponse: atlasResponse,
            session
          });
        } catch (storageError) {
          logger.warn('executor', `[CHAT-MEMORY] ⚠️ Memory storage failed: ${storageError.message}`);
        }

        logger.workflow('complete', 'atlas', 'Chat response completed', { sessionId: session.id });

        // CRITICAL: Return here to prevent falling through to TODO mode
        return {
          success: true,
          mode: 'chat',
          response: atlasResponse
        };

      } catch (chatError) {
        logger.error('executor', `Chat mode failed: ${chatError.message}`, {
          sessionId: session.id,
          stack: chatError.stack
        });

        // Send error message
        if (wsManager) {
          wsManager.broadcastToSubscribers('chat', 'agent_message', {
            content: 'Вибачте, виникла помилка при обробці вашого повідомлення.',
            agent: 'atlas',
            sessionId: session.id,
            timestamp: new Date().toISOString()
          });
        }

        throw chatError;
      }
    }

    // ===============================================
    // Stage 0.5-MCP: Context Enrichment (NEW 30.10.2025)
    // ===============================================
    logger.workflow('stage', 'atlas', 'Stage 0.5-MCP: Context Enrichment', { sessionId: session.id });

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
        
        logger.system('executor', `[STAGE-0.5-MCP] ✅ Context enriched`);
        logger.system('executor', `[STAGE-0.5-MCP]    Original: "${userMessage}"`);
        logger.system('executor', `[STAGE-0.5-MCP]    Enriched: "${enrichedMessage}"`);
        logger.system('executor', `[STAGE-0.5-MCP]    Complexity: ${enrichmentMetadata.complexity}/10`);
      } else {
        logger.warn(`[STAGE-0.5-MCP] Context enrichment failed, using original message: ${enrichmentResult.error}`);
      }
    } catch (enrichmentError) {
      logger.error(`[STAGE-0.5-MCP] Context enrichment error: ${enrichmentError.message}`);
      logger.error(`[STAGE-0.5-MCP] Stack: ${enrichmentError.stack}`);
      // Continue with original message on error
    }

    // ===============================================
    // Stage 1-MCP: Atlas TODO Planning
    // ===============================================
    logger.workflow('stage', 'system', 'Stage 1-MCP: Atlas TODO Planning', { sessionId: session.id });

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
      todoResult = await todoProcessor.execute({
        userMessage: enrichedMessage,  // Use enriched message instead of original
        session,
        res,
        enrichmentMetadata  // Pass enrichment metadata for context
      });
    }

    // ✅ PHASE 4 TASK 3: Validate TODO result structure
    if (!todoResult.success) {
      throw new Error(`TODO planning failed: ${todoResult.error || 'Unknown error'}`);
    }

    if (!todoResult.todo || !todoResult.todo.items || !Array.isArray(todoResult.todo.items)) {
      throw new Error('Invalid TODO structure: missing items array');
    }

    if (todoResult.todo.items.length === 0) {
      throw new Error('TODO planning produced empty items list');
    }

    const todo = todoResult.todo;
    logger.info(`TODO created with ${todo.items.length} items`, {
      sessionId: session.id,
      mode: todo.mode,
      items: todo.items.map(item => ({
        id: item.id,
        action: item.action,
        max_attempts: item.max_attempts
      }))
    });

    // Send TODO plan to frontend via SSE
    if (res.writable && !res.writableEnded) {
      res.write(`data: ${JSON.stringify({
        type: 'mcp_todo_created',
        data: {
          summary: todoResult.summary,
          itemCount: todo.items.length,
          mode: todo.mode
        }
      })}\n\n`);
    }

    // REMOVED 16.10.2025 - Duplicate message (mcp-todo-manager already sends via agent_message)
    // TODO plan is now sent correctly via agent_message with agent='atlas' in mcp-todo-manager.js line ~243

    // Execute TODO items one by one
    // FIXED 2025-10-23: Changed to while loop to support restart after replanning
    let i = 0;
    while (i < todo.items.length) {
      const item = todo.items[i];
      
      // Skip items that were already processed (completed, failed, replanned, skipped)
      if (item.status === 'completed' || item.status === 'failed' || item.status === 'skipped') {
        logger.system('executor', `[SKIP] Item ${item.id} already processed (status: ${item.status})`);
        i++;
        continue;
      }
      
      // FIXED 2025-10-23: Skip items marked as 'replanned' - new items will replace them
      if (item.status === 'replanned') {
        logger.system('executor', `[SKIP] Item ${item.id} was replanned, new items will be processed`);
        i++;
        continue;
      }
      
      logger.info(`Processing TODO item ${i + 1}/${todo.items.length}: ${item.action}`, {
        sessionId: session.id,
        itemId: item.id
      });

      // REMOVED 21.10.2025: Duplicate message - Tetyana already announces via TTS
      // System progress messages removed to avoid duplication with agent messages

      // FIXED 2025-10-23: Enhanced dependency check for hierarchical IDs
      const dependencies = Array.isArray(item.dependencies) ? item.dependencies : [];
      if (dependencies.length > 0) {
        // FIXED 2025-10-24: Track blocked item check count to prevent infinite loop
        if (!item.blocked_check_count) {
          item.blocked_check_count = 0;
        }
        item.blocked_check_count++;
        
        // Check explicit dependencies
        const unresolvedDependencies = dependencies
          .map(depId => todo.items.find(todoItem => String(todoItem.id) === String(depId)))
          .filter(depItem => depItem && depItem.status !== 'completed');
        
        // ENHANCED 2025-10-23: Also check if any parent is replanned or blocked
        // If parent is replanned, children must complete first
        const parentBlocked = dependencies.some(depId => {
          const depItem = todo.items.find(todoItem => String(todoItem.id) === String(depId));
          if (!depItem) return false;
          
          // If dependency is replanned, check if its children are complete
          if (depItem.status === 'replanned') {
            const children = HierarchicalIdManager.getChildren(String(depId), todo.items);
            const incompleteChildren = children.filter(child => child.status !== 'completed');
            return incompleteChildren.length > 0; // Block if children incomplete
          }
          
          return false;
        });

        if (unresolvedDependencies.length > 0 || parentBlocked) {
          // FIXED 2025-10-24: After 5 blocked checks, try to resolve dependency issue
          if (item.blocked_check_count >= 5) {
            logger.warn(`Item ${item.id} blocked ${item.blocked_check_count} times - attempting resolution`, {
              sessionId: session.id,
              itemId: item.id
            });
            
            // Try to update dependencies to children of replanned parents
            let dependenciesUpdated = false;
            const newDependencies = [];
            
            for (const depId of dependencies) {
              const depItem = todo.items.find(todoItem => String(todoItem.id) === String(depId));
              
              if (depItem && depItem.status === 'replanned') {
                // Replace dependency with children
                const children = HierarchicalIdManager.getChildren(String(depId), todo.items);
                if (children.length > 0) {
                  newDependencies.push(...children.map(c => c.id));
                  dependenciesUpdated = true;
                  logger.system('executor', `[DEPENDENCY-FIX] Item ${item.id}: replacing dep ${depId} with children ${children.map(c => c.id).join(', ')}`);
                }
              } else {
                newDependencies.push(depId);
              }
            }
            
            if (dependenciesUpdated) {
              item.dependencies = newDependencies;
              item.blocked_check_count = 0; // Reset counter
              logger.system('executor', `[DEPENDENCY-FIX] Item ${item.id}: updated dependencies to ${newDependencies.join(', ')}`);
              // Continue to re-check with new dependencies
              continue;
            }
            
            // If can't resolve after 10 checks, skip item
            if (item.blocked_check_count >= 10) {
              logger.error(`Item ${item.id} blocked ${item.blocked_check_count} times - SKIPPING to prevent infinite loop`, {
                sessionId: session.id,
                itemId: item.id
              });
              
              item.status = 'skipped';
              item.skip_reason = 'Blocked too many times - infinite loop protection';
              
              if (wsManager) {
                try {
                  wsManager.broadcastToSubscribers('chat', 'chat_message', {
                    message: `⚠️ Пункт ${item.id} пропущено через нерозв'язані залежності`,
                    messageType: 'error',
                    sessionId: session.id,
                    timestamp: new Date().toISOString()
                  });
                } catch (error) {
                  logger.warn(`Failed to send skip WebSocket message: ${error.message}`);
                }
              }
              
              continue;
            }
          }
          
          const unresolvedSummary = unresolvedDependencies
            .map(depItem => `#${depItem.id} (${depItem.status || 'unknown'})`)
            .join(', ');
          
          const blockReason = parentBlocked 
            ? 'Parent replanned - waiting for replacement items'
            : `Dependencies not completed: ${unresolvedSummary}`;

          logger.warn(`Item ${item.id} blocked: ${blockReason} (check ${item.blocked_check_count}/10)`, {
            sessionId: session.id,
            itemId: item.id,
            dependencies: dependencies,
            unresolvedSummary,
            parentBlocked
          });

          item.status = 'blocked';
          item.block_reason = `Очікування завершення залежностей: ${unresolvedSummary}`;

          if (wsManager) {
            try {
              wsManager.broadcastToSubscribers('chat', 'chat_message', {
                message: `⏸️ Пункт ${item.id} заблокований. Очікує завершення: ${unresolvedSummary}`,
                messageType: 'warning',
                sessionId: session.id,
                timestamp: new Date().toISOString()
              });
            } catch (error) {
              logger.warn(`Failed to send dependency block WebSocket message: ${error.message}`);
            }
          }

          if (res.writable && !res.writableEnded) {
            res.write(`data: ${JSON.stringify({
              type: 'mcp_item_blocked',
              data: {
                itemId: item.id,
                action: item.action,
                dependencies: dependencies,
                unresolvedDependencies: unresolvedDependencies.map(dep => ({
                  id: dep.id,
                  status: dep.status || 'unknown'
                })),
                reason: item.block_reason
              }
            })}\n\n`);
          }

          continue;
        }
      }

      let attempt = 1;
      // UPDATED 19.10.2025: 1 спроба виконання, 3 спроби перепланування
      const maxAttempts = item.max_attempts || GlobalConfig.AI_BACKEND_CONFIG.retry.itemExecution.maxAttempts;
      const maxReplanningAttempts = GlobalConfig.AI_BACKEND_CONFIG.retry.replanning.maxAttempts;
      
      let replanningAttempts = 0;
      let lastPlanResult = null;
      let lastExecResult = null;

      while (attempt <= maxAttempts) {
        logger.info(`Item ${item.id}: Attempt ${attempt}/${maxAttempts}`, {
          sessionId: session.id
        });

        // ✅ PHASE 4 TASK 3: Exponential backoff between retries
        if (attempt > 1) {
          const backoffDelay = Math.min(1000 * Math.pow(2, attempt - 2), 8000); // Max 8s
          logger.info(`Retry backoff: waiting ${backoffDelay}ms before attempt ${attempt}`, {
            sessionId: session.id,
            itemId: item.id
          });
          await new Promise(resolve => setTimeout(resolve, backoffDelay));
        }
        
        // FIXED 2025-10-23: Log attempt details for debugging sequential execution
        logger.system('executor', `[EXEC] Item ${item.id} attempt ${attempt}/${maxAttempts}: "${item.action}"`);
        if (dependencies.length > 0) {
          logger.system('executor', `[EXEC]   Dependencies: ${dependencies.join(', ')}`);
        }

        try {
          // NEW: Router Classifier (Optional fast pre-filter)
          let suggestedServers = null;
          try {
            if (container.has('routerClassifier')) {
              const routerClassifier = container.resolve('routerClassifier');
              const mcpManager = container.resolve('mcpManager');
              
              logger.workflow('stage', 'system', `Router Classifier: Fast filtering for item ${item.id}`, {
                sessionId: session.id
              });
              
              const routerResult = await routerClassifier.execute({
                action: item.action,
                context: todo,
                availableServers: Array.from(mcpManager.servers.keys())
              });
              
              if (routerResult.success && routerResult.selectedServers) {
                suggestedServers = routerResult.selectedServers;
                logger.system('executor', `[ROUTER] Pre-filtered to: ${suggestedServers.join(', ')}`);
              }
            }
          } catch (routerError) {
            logger.warn('Router classifier failed, continuing without pre-filter', { error: routerError.message });
          }

          // Stage 2.0-MCP: Server Selection (NEW 20.10.2025)
          logger.workflow('stage', 'system', `Stage 2.0-MCP: Selecting MCP servers for item ${item.id}`, {
            sessionId: session.id
          });

          let selectedServers = null;
          let selectedPrompts = null;
          try {
            const serverSelectionProcessor = container.resolve('serverSelectionProcessor');
            const selectionResult = await serverSelectionProcessor.execute({
              currentItem: item,
              todo,
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
            }
          } catch (selectionError) {
            logger.warn(`Server selection failed for item ${item.id}: ${selectionError.message}. Using all servers with fallback prompts.`, {
              sessionId: session.id
            });
            
            // Assign fallback prompts when server selection fails
            if (!selectedPrompts) {
              // Intelligently select fallback prompt based on task content
              const taskAction = item.action.toLowerCase();
              let fallbackPrompt = 'TETYANA_PLAN_TOOLS_PLAYWRIGHT'; // Default for web tasks
              
              if (taskAction.includes('файл') || taskAction.includes('зберегти') || taskAction.includes('створити') || taskAction.includes('file')) {
                fallbackPrompt = 'TETYANA_PLAN_TOOLS_FILESYSTEM';
              } else if (taskAction.includes('команд') || taskAction.includes('запустити') || taskAction.includes('command') || taskAction.includes('shell')) {
                fallbackPrompt = 'TETYANA_PLAN_TOOLS_SHELL';
              } else if (taskAction.includes('пам\'ять') || taskAction.includes('зберегти') || taskAction.includes('memory')) {
                fallbackPrompt = 'TETYANA_PLAN_TOOLS_MEMORY';
              }
              // Default remains playwright for web scraping, price collection, etc.
              
              selectedPrompts = [fallbackPrompt];
              logger.system('executor', `[FALLBACK] Auto-assigned intelligent fallback prompt: ${selectedPrompts.join(', ')} (based on task: "${item.action}")`);
            }
          }

          // Stage 2.1-MCP: Tetyana Plan Tools
          logger.workflow('stage', 'tetyana', `Stage 2.1-MCP: Planning tools for item ${item.id}`, {
            sessionId: session.id
          });

          const planResult = await planProcessor.execute({
            currentItem: item,
            todo,
            session,
            res,
            selected_servers: selectedServers,
            selected_prompts: selectedPrompts
          });

          lastPlanResult = planResult;

          if (!planResult.success) {
            logger.warn(`Tool planning failed for item ${item.id}: ${planResult.error}`, {
              sessionId: session.id
            });

            // FIXED 14.10.2025 - Send error message to user when tool planning fails
            if (res.writable && !res.writableEnded) {
              res.write(`data: ${JSON.stringify({
                type: 'mcp_item_planning_failed',
                data: {
                  itemId: item.id,
                  action: item.action,
                  attempt: attempt,
                  maxAttempts: maxAttempts,
                  error: planResult.error,
                  summary: planResult.summary || `⚠️ Помилка планування інструментів (спроба ${attempt}/${maxAttempts}): ${planResult.error}`
                }
              })}\n\n`);
            }

            attempt++;
            continue;
          }

          // Stage 2.2-MCP: Tetyana Execute Tools
          logger.workflow('stage', 'tetyana', `Stage 2.2-MCP: Executing tools for item ${item.id}`, {
            sessionId: session.id
          });

          // REFACTORED 2025-10-22 - Tetyana speaks FULL action from TODO
          const ttsSyncManager = container.resolve('ttsSyncManager');
          if (ttsSyncManager && item.action) {
            try {
              // Speak full action as-is from TODO
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
            plan: planResult.plan,
            todo,
            session,
            res
          });

          lastExecResult = execResult;

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

          // Stage 2.3-MCP: Grisha Verify Item
          logger.workflow('stage', 'grisha', `Stage 2.3-MCP: Verifying item ${item.id}`, {
            sessionId: session.id
          });

          // FIXED 2025-10-21: Removed duplicate TTS message from executor
          // Grisha now sends detailed verification result with TTS directly from verify processor

          // ✅ FIX: Adaptive delay before screenshot verification
          // App launches need more time, other operations need less
          const delayMs = _getVerificationDelay(execResult.execution, item);
          if (delayMs > 0) {
            const delaySec = (delayMs / 1000).toFixed(1);
            logger.system('executor', `[VERIFICATION-DELAY] Waiting ${delaySec}s before verification...`);
            await new Promise(resolve => setTimeout(resolve, delayMs));
          }

          const verifyResult = await verifyProcessor.execute({
            currentItem: item,
            execution: execResult.execution,
            todo,
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

          if (verifyResult.verified) {
            // Success! Mark as completed
            item.status = 'completed';
            item.verification = verifyResult.verification;
            item.attempt = attempt;

            logger.info(`Item ${item.id} completed successfully`, {
              sessionId: session.id,
              attempts: attempt
            });

            // REFACTORED 2025-10-22 - Tetyana says short "done" phrase
            // 1. Tetyana announces completion FIRST
            if (ttsSyncManager) {
              try {
                const successPhrases = [
                  'Виконано',
                  'Готово',
                  'Зроблено',
                  'Завершено'
                ];
                
                const selectedPhrase = successPhrases[phraseRotation.tetyanaSuccess % successPhrases.length];
                phraseRotation.tetyanaSuccess++;
                
                logger.system('executor', `[TTS] 🔊 Tetyana SUCCESS: "${selectedPhrase}"`);
                await ttsSyncManager.speak(selectedPhrase, {
                  mode: 'normal',
                  agent: 'tetyana',
                  sessionId: session.id
                });
                logger.system('executor', `[TTS] ✅ Tetyana success sent`);
              } catch (error) {
                logger.warn(`Failed to send Tetyana success: ${error.message}`);
              }
            }

            // 2. THEN Grisha gives short verdict
            if (ttsSyncManager && verifyResult.verification?.tts_phrase) {
              try {
                logger.system('executor', `[TTS] 🔊 Grisha VERIFY: "${verifyResult.verification.tts_phrase}"`);
                await ttsSyncManager.speak(verifyResult.verification.tts_phrase, {
                  mode: 'normal',
                  agent: 'grisha',
                  sessionId: session.id
                });
                logger.system('executor', `[TTS] ✅ Grisha verify sent`);
              } catch (error) {
                logger.warn(`Failed to send Grisha verify: ${error.message}`);
              }
            }

            break; // Exit retry loop
          }

          // Verification failed - analyze with Grisha and replan immediately
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
              todo,
              tetyanaData,
              grishaData,
              session,
              res
            });

            // ADDED 20.10.2025: Детальне логування replan результату для діагностики
            logger.system('executor', `[REPLAN-DEBUG] Full result: ${JSON.stringify(replanResult, null, 2)}`);
            logger.system('executor', `[REPLAN-DEBUG] Strategy: ${replanResult.strategy}`);
            logger.system('executor', `[REPLAN-DEBUG] Replanned: ${replanResult.replanned}`);
            logger.system('executor', `[REPLAN-DEBUG] New items count: ${replanResult.new_items?.length || 0}`);
            if (replanResult.new_items?.length > 0) {
              logger.system('executor', `[REPLAN-DEBUG] New items: ${JSON.stringify(replanResult.new_items.map(i => ({ id: i.id, action: i.action })))}`);
            }

            logger.info(`Atlas replan decision: ${replanResult.strategy || 'unknown'}`, {
              sessionId: session.id,
              replanned: replanResult.replanned || false
            });

            // Apply replan if Atlas created new items
            if (replanResult.replanned && replanResult.new_items?.length > 0) {
              logger.info(`Atlas replanned: inserting ${replanResult.new_items.length} new items`, {
                sessionId: session.id
              });

              // FIXED 2025-10-23: Generate hierarchical IDs (2 → 2.1, 2.2, 2.3)
              const parentId = String(item.id);
              logger.system('executor', `[REPLAN] Generating child IDs for parent ${parentId}`);
              
              replanResult.new_items.forEach((newItem, idx) => {
                // Generate next child ID (2.1, 2.2, etc. or 2.2.1, 2.2.2 for nested)
                const childId = HierarchicalIdManager.generateChildId(parentId, todo.items.concat(replanResult.new_items.slice(0, idx)));
                newItem.id = childId;
                newItem.status = 'pending';
                newItem.attempt = 0;
                newItem.max_attempts = newItem.max_attempts || item.max_attempts || 2;
                newItem.parent_id = parentId; // Track parent for debugging
                
                logger.system('executor', `[REPLAN]   Generated child ID: ${childId}`);
              });

              // Insert new items into TODO list after current item
              const currentIndex = todo.items.indexOf(item);
              if (currentIndex !== -1) {
                todo.items.splice(currentIndex + 1, 0, ...replanResult.new_items);

                logger.info(`TODO list updated: ${todo.items.length} total items`, {
                  sessionId: session.id
                });
                
                // FIXED 2025-10-23: Log new items with hierarchical structure
                logger.system('executor', `[REPLAN] Inserted ${replanResult.new_items.length} new items after position ${currentIndex}:`);
                replanResult.new_items.forEach((newItem, idx) => {
                  const formatted = HierarchicalIdManager.formatForDisplay(newItem.id, true);
                  logger.system('executor', `[REPLAN] ${formatted} ${newItem.action}`);
                });
              }

              // Mark current item as replanned
              item.status = 'replanned';
              item.replan_reason = replanResult.reasoning;

              // Send replan update to frontend
              if (res.writable && !res.writableEnded) {
                res.write(`data: ${JSON.stringify({
                  type: 'mcp_item_replanned',
                  data: {
                    itemId: item.id,
                    newItemsCount: replanResult.new_items.length,
                    reasoning: replanResult.reasoning
                  }
                })}\n\n`);
              }

              // FIXED 2025-10-23: Exit retry loop and CONTINUE with next item in main loop
              // The new items were inserted after current item, so i++ will process them
              break;
            } else if (replanResult.strategy === 'skip_and_continue') {
              // Atlas decided to skip this item
              item.status = 'skipped';
              item.skip_reason = replanResult.reasoning;

              logger.warn(`Item ${item.id} skipped by Atlas: ${item.skip_reason}`, {
                sessionId: session.id
              });

              // Send TTS for failure/skip
              if (wsManager && item.tts?.failure) {
                try {
                  wsManager.broadcastToSubscribers('chat', 'agent_message', {
                    content: item.tts.failure,
                    agent: 'atlas',
                    ttsContent: item.tts.failure,
                    mode: 'normal',
                    sessionId: session.id,
                    timestamp: new Date().toISOString()
                  });
                } catch (error) {
                  logger.warn(`Failed to send TTS failure message: ${error.message}`);
                }
              }

              // Send skip update to frontend
              if (res.writable && !res.writableEnded) {
                res.write(`data: ${JSON.stringify({
                  type: 'mcp_item_skipped',
                  data: {
                    itemId: item.id,
                    reason: item.skip_reason
                  }
                })}\n\n`);
              }

              // FIXED 2025-10-23: Move to next item in main loop
              break; // Exit retry loop
            } else {
              // No replan - retry with simple adjustment
              replanningAttempts++;
              
              // FIXED 2025-10-23: Log replanning attempt
              logger.system('executor', `[REPLAN-RETRY] Item ${item.id} replanning attempt ${replanningAttempts}/${maxReplanningAttempts}`);
              
              
              logger.workflow('stage', 'atlas', `Stage 3-MCP: Simple adjustment for item ${item.id} (attempt ${replanningAttempts}/${maxReplanningAttempts})`, {
                sessionId: session.id
              });

              // Check if max replanning attempts reached
              if (replanningAttempts > maxReplanningAttempts) {
                logger.warn(`Item ${item.id}: Max replanning attempts (${maxReplanningAttempts}) reached, skipping`, {
                  sessionId: session.id
                });
                
                item.status = 'skipped';
                item.skip_reason = `Не вдалося виконати після ${maxReplanningAttempts} спроб перепланування`;
                
                // Send TTS for failure/skip
                if (wsManager && item.tts?.failure) {
                  try {
                    wsManager.broadcastToSubscribers('chat', 'agent_message', {
                      content: item.tts.failure,
                      agent: 'atlas',
                      ttsContent: item.tts.failure,
                      mode: 'normal',
                      sessionId: session.id,
                      timestamp: new Date().toISOString()
                    });
                  } catch (error) {
                    logger.warn(`Failed to send TTS failure message: ${error.message}`);
                  }
                }
                
                // Send skip update to frontend
                if (res.writable && !res.writableEnded) {
                  res.write(`data: ${JSON.stringify({
                    type: 'mcp_item_skipped',
                    data: {
                      itemId: item.id,
                      reason: item.skip_reason
                    }
                  })}\n\n`);
                }
                
                break; // Exit retry loop
              }
            }

          } catch (replanError) {
            logger.error(`Failed to analyze/replan: ${replanError.message}`, {
              sessionId: session.id,
              itemId: item.id,
              error: replanError.message,
              stack: replanError.stack
            });

            // Fallback to simple retry
            attempt++;
          }

        } catch (itemError) {
          // ✅ PHASE 4 TASK 3: Enhanced error logging with context
          logger.error(`Item ${item.id} execution error: ${itemError.message}`, {
            sessionId: session.id,
            itemId: item.id,
            action: item.action,
            attempt,
            maxAttempts,
            error: itemError.message,
            stack: itemError.stack,
            tools_needed: item.tools_needed,
            mcp_servers: item.mcp_servers
          });

          telemetry.emit('workflow.mcp.item_error', {
            sessionId: session.id,
            itemId: item.id,
            attempt,
            error: itemError.message
          });

          attempt++;

          if (attempt > maxAttempts) {
            item.status = 'failed';
            item.error = itemError.message;

            // ✅ PHASE 4 TASK 3: Log final failure with full context
            logger.error(`Item ${item.id} PERMANENTLY FAILED after ${maxAttempts} attempts`, {
              sessionId: session.id,
              itemId: item.id,
              action: item.action,
              totalAttempts: maxAttempts,
              finalError: itemError.message,
              context: {
                tools: item.tools_needed,
                servers: item.mcp_servers,
                dependencies: item.dependencies
              }
            });
          }
        }
      }

      // Max attempts reached without success - item should already be marked as skipped/replanned/completed
      if (item.status !== 'completed' && item.status !== 'skipped' && item.status !== 'replanned') {
        logger.warn(`Item ${item.id} failed after ${maxAttempts} attempts`, {
          sessionId: session.id
        });

        item.status = 'failed';
        item.error = item.error || 'Max attempts reached';

        // Send failure update to frontend
        if (res.writable && !res.writableEnded) {
          res.write(`data: ${JSON.stringify({
            type: 'mcp_item_failed',
            data: {
              itemId: item.id,
              attempts: maxAttempts,
              error: item.error
            }
          })}\n\n`);
        }
      }
      
      // FIXED 2025-10-23: Move to next item in main loop
      i++;
    }

    // Stage 8-MCP: Final Summary
    logger.workflow('stage', 'system', 'Stage 8-MCP: Generating final summary', {
      sessionId: session.id
    });

    const summaryResult = await summaryProcessor.execute({
      todo,
      session,
      res
    });

    // ВИПРАВЛЕНО 21.10.2025: Додаємо фінальне повідомлення від Atlas
    const completedCount = todo.items.filter(item => item.status === 'completed').length;
    const totalCount = todo.items.length;
    const successRate = Math.round((completedCount / totalCount) * 100);
    
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

    // Відправляємо фінальне повідомлення від Atlas через WebSocket
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

    // Send final summary to frontend
    if (res.writable && !res.writableEnded) {
      res.write(`data: ${JSON.stringify({
        type: 'mcp_workflow_complete',
        data: {
          success: summaryResult.success,
          summary: summaryResult.summary,
          metrics: summaryResult.metadata?.metrics || {},
          duration: Date.now() - workflowStart,
          completedCount,
          totalCount,
          successRate
        }
      })}\n\n`);
    }

    // Add summary to session history - CRITICAL FIX: Check if history exists
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

    // OPTIMIZED 2025-10-17: Clean up session history to prevent memory leaks
    // Keep only last 20 messages for context
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
      duration: Date.now() - workflowStart,
      metrics: summaryResult.metadata?.metrics
    });

    return summaryResult;

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
