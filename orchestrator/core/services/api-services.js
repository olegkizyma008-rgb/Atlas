/**
 * ATLAS ORCHESTRATOR - API Services Registry
 * Version: 4.0
 *
 * Реєстрація API сервісів: WebSocket, Web Integration
 */

import logger from '../../utils/logger.js';
import wsManager from '../../api/websocket-manager.js';
import webIntegration from '../../api/web-integration.js';

/**
 * Реєструє API сервіси
 *
 * @param {DIContainer} container - DI контейнер
 * @returns {DIContainer}
 */
export function registerApiServices(container) {
    // WebSocket Manager
    container.singleton('wsManager', () => {
        return wsManager;  // Return the singleton instance
    }, {
        dependencies: ['logger', 'config'],
        metadata: { category: 'api', priority: 60 },
        lifecycle: {
            onInit: async function () {
                logger.system('startup', '[DI] WebSocket manager initialized');
            },
            onStart: async function () {
                // WebSocket запускається окремо в Application.startWebSocket()
                logger.system('startup', '[DI] WebSocket manager ready');
            },
            onStop: async function () {
                // Закриття WebSocket connections
                logger.system('shutdown', '[DI] WebSocket manager stopped');
            }
        }
    });

    // Web Integration
    container.singleton('webIntegration', () => webIntegration, {
        dependencies: ['logger'],
        metadata: { category: 'api', priority: 50 },
        lifecycle: {
            onInit: async function () {
                logger.system('startup', '[DI] Web integration initialized');
            }
        }
    });

    return container;
}

export default registerApiServices;
