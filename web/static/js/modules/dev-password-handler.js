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

    this.currentSessionId = data.sessionId;
    this.currentAnalysisData = data.analysisData;

    // Show fullscreen hacker dialog
    devPasswordDialog.show(data);
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
        const { orchestratorClient } = await import('../core/api-client.js');
        await orchestratorClient.sendMessage(trimmedPassword, {
          sessionId: this.currentSessionId
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
}

export default DevPasswordHandler;
