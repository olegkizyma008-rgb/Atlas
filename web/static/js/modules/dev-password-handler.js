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
      this.logger.info('Processing DEV password locally...');

      // Instead of making HTTP call, send password through WebSocket
      // The server will handle it when awaitingDevPassword is true
      if (this.wsClient && this.wsClient.sendMessage) {
        // Send as regular message - server will detect awaitingDevPassword state
        this.wsClient.sendMessage(password, {
          sessionId: this.currentSessionId
        });
      } else {
        this.logger.error('WebSocket client not available for password submission');
        devPasswordDialog.showError('ПОМИЛКА ПЕРЕДАЧІ ПАРОЛЯ');
        return;
      }

      // Hide dialog immediately - server will handle the response
      devPasswordDialog.hide();

      this.logger.info('DEV password sent through WebSocket');

    } catch (error) {
      this.logger.error('Failed to send DEV password through WebSocket', error);
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
