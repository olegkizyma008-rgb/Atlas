/**
 * ATLAS ORCHESTRATOR - Services Registry Index
 * Version: 4.0
 *
 * Централізований експорт всіх сервісів реєстрів
 */

import registerCoreServices from './core-services.js';
import registerApiServices from './api-services.js';
import registerStateServices from './state-services.js';

/**
 * Реєструє базові сервіси (core, api, state)
 *
 * @param {DIContainer} container - DI контейнер
 * @returns {DIContainer}
 */
export function registerBasicServices(container) {
    registerCoreServices(container);
    registerApiServices(container);
    registerStateServices(container);
    return container;
}

export {
    registerCoreServices,
    registerApiServices,
    registerStateServices
};

export default registerBasicServices;
