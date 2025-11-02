/**
 * DEV Password Handler - Integration with WebSocket and Chat
 * Handles password dialog events and communication with backend
 *
 * @version 1.0.0
 * @date 2025-10-28
 */

import { devPasswordDialog } from '../components/dev-password-dialog.js';
import { logger } from '../core/logger.js';

export class DevPasswordHandler {
  constructor(options = {}) {
    this.logger = options.logger || new logger.constructor('DEV-PASSWORD');
    this.chatManager = options.chatManager;
    this.wsClient = options.wsClient;
    this.currentSessionId = null;
    this.currentAnalysisData = null;
    this.currentAnalysisSummary = null;

    this.setupPasswordDialog();
  }

  setupPasswordDialog() {
    // Handle password submission
    devPasswordDialog.onPasswordSubmit(async (password) => {
      if (!password) {
        // User cancelled
        this.logger.info('DEV password dialog cancelled');
        devPasswordDialog.hide();
        return;
      }

      // Send password to backend
      await this.submitPassword(password);
    });
  }

  async handlePasswordRequest(data) {
    this.logger.info('DEV password request received', data);

    this.currentSessionId = data.sessionId || this.currentSessionId || null;
    this.currentAnalysisData = data.analysisData || this.currentAnalysisData || {};
    this.currentAnalysisSummary = this._buildAnalysisSummary(this.currentAnalysisData);

    this._displayDialog();
  }

  /**
   * Public helper used by chat-manager to display the dialog immediately
   * @param {Object} data
   * @param {string} [data.sessionId]
   * @param {Object} [data.analysisData]
   */
  showPasswordDialog(data = {}) {
    const normalized = {
      sessionId: data.sessionId || this.currentSessionId || null,
      analysisData: data.analysisData || this.currentAnalysisData || {}
    };

    this.currentSessionId = normalized.sessionId;
    this.currentAnalysisData = normalized.analysisData;
    this.currentAnalysisSummary = this._buildAnalysisSummary(this.currentAnalysisData);

    this._displayDialog();
  }

  async submitPassword(password) {
    try {
      const trimmedPassword = (password || '').trim();
      if (!trimmedPassword) {
        this.logger.warn('Empty DEV password submission ignored');
        devPasswordDialog.showError('Пароль не може бути порожнім');
        return;
      }

      this.logger.info('Submitting DEV password through chat manager...');

      if (this.chatManager && typeof this.chatManager.sendMessage === 'function') {
        await this.chatManager.sendMessage(trimmedPassword);
      } else {
        // Fallback: direct HTTP call via orchestrator client
        this.logger.warn('Chat manager unavailable, sending DEV password via orchestrator API');

        const { orchestratorClient } = await import('../core/api-client.js');

        await new Promise((resolve, reject) => {
          orchestratorClient.stream(
            '/chat/stream',
            {
              message: trimmedPassword,
              sessionId: this.currentSessionId || `session_dev_${Date.now()}`,
              enableTTS: false,
              metadata: {
                source: 'dev-password-handler'
              }
            },
            () => {},
            (error) => reject(error),
            () => resolve()
          );
        });
      }

      devPasswordDialog.hide();
      this.logger.info('DEV password submitted successfully');

    } catch (error) {
      this.logger.error('Failed to submit DEV password', error);
      devPasswordDialog.showError('ПОМИЛКА ПЕРЕДАЧІ ПАРОЛЯ');
    }
  }

  setupWebSocketListener() {
    if (!this.wsClient) {
      this.logger.warn('WebSocket client not available');
      return;
    }

    // Listen for DEV password requests
    this.wsClient.on('dev_password_request', (data) => {
      this.handlePasswordRequest(data);
    });

    this.logger.info('DEV password WebSocket listener registered');
  }

  init() {
    this.setupWebSocketListener();
    this.logger.info('DEV Password Handler initialized');
  }

  _displayDialog() {
    devPasswordDialog.show({
      sessionId: this.currentSessionId,
      analysisData: this.currentAnalysisSummary || this._buildAnalysisSummary()
    });
  }

  _buildAnalysisSummary(rawData = {}) {
    const pickCount = (...candidates) => {
      for (const candidate of candidates) {
        if (typeof candidate === 'number' && !Number.isNaN(candidate)) {
          return candidate;
        }
        if (Array.isArray(candidate)) {
          return candidate.length;
        }
      }
      return 0;
    };

    const findings = rawData?.findings || {};

    return {
      criticalIssues: pickCount(
        rawData?.criticalIssues,
        rawData?.critical_issues,
        rawData?.stats?.criticalIssues,
        findings?.critical_issues
      ),
      performanceIssues: pickCount(
        rawData?.performanceIssues,
        rawData?.performance_bottlenecks,
        rawData?.stats?.performanceIssues,
        findings?.performance_bottlenecks
      ),
      improvements: pickCount(
        rawData?.improvements,
        rawData?.improvement_suggestions,
        rawData?.stats?.improvements,
        findings?.improvement_suggestions
      )
    };
  }
}

export default DevPasswordHandler;
