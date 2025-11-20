/**
 * ATLAS ORCHESTRATOR - State Services Registry
 * Version: 4.0
 *
 * Реєстрація state management сервісів: Session Store
 */

import logger from '../../utils/logger.js';

/**
 * Реєструє state management сервіси
 *
 * @param {DIContainer} container - DI контейнер
 * @returns {DIContainer}
 */
export function registerStateServices(container) {
    // Session Store - буде створений динамічно в Application
    container.singleton('sessions', () => new Map(), {
        metadata: { category: 'state', priority: 70 },
        lifecycle: {
            onInit: async function () {
                logger.system('startup', '[DI] Session store initialized');
            },
            onStop: async function () {
                this.clear();
                logger.system('shutdown', '[DI] Session store cleared');
            }
        }
    });

    return container;
}

export default registerStateServices;
