/**
 * ATLAS ORCHESTRATOR - Dependency Injection Container
 * Version: 4.0
 *
 * Централізоване управління залежностями для orchestrator
 * Забезпечує loose coupling, легке тестування та чітке управління lifecycle
 *
 * @example
 * const container = new DIContainer();
 *
 * // Register services
 * container.singleton('logger', () => new Logger());
 * container.register('chatManager', (c) => new ChatManager(c.resolve('logger')));
 *
 * // Resolve
 * const chatManager = container.resolve('chatManager');
 */

export class DIContainer {
    constructor() {
        this.services = new Map();
        this.singletons = new Map();
        this.resolving = new Set();
        this.lifecycleHooks = new Map();
        this.started = false;
    }

    /**
     * Реєструє сервіс в контейнері
     *
     * @param {string} name - Унікальне ім'я сервісу
     * @param {Function} factory - Фабрична функція для створення сервісу
     * @param {Object} options - Опції реєстрації
     * @param {boolean} options.singleton - Чи створювати singleton
     * @param {Array<string>} options.dependencies - Явні залежності
     * @param {Object} options.lifecycle - Lifecycle hooks (onInit, onStart, onStop)
     * @returns {DIContainer} - Для chaining
     */
    register(name, factory, options = {}) {
        if (!name || typeof name !== 'string') {
            throw new Error('Service name must be a non-empty string');
        }

        if (typeof factory !== 'function') {
            throw new Error('Factory must be a function');
        }

        if (this.services.has(name)) {
            // Якщо це singleton, який вже був створений, не перереєструємо
            const existing = this.services.get(name);
            if (existing.singleton && this.singletons.has(name)) {
                // Singleton вже існує, не перереєструємо
                return this;
            }
            // Інакше виводимо попередження тільки для debug
            if (process.env.DEBUG_DI === 'true') {
                console.warn(`[DI] Service "${name}" is already registered. Overwriting.`);
            }
        }

        this.services.set(name, {
            factory,
            singleton: options.singleton || false,
            dependencies: options.dependencies || [],
            metadata: options.metadata || {},
            lifecycle: options.lifecycle || {}
        });

        // Зберігаємо lifecycle hooks окремо для швидкого доступу
        if (options.lifecycle) {
            this.lifecycleHooks.set(name, options.lifecycle);
        }

        return this;
    }

    /**
     * Реєструє сервіс як singleton
     *
     * @param {string} name - Унікальне ім'я сервісу
     * @param {Function} factory - Фабрична функція
     * @param {Object} options - Додаткові опції
     * @returns {DIContainer}
     */
    singleton(name, factory, options = {}) {
        return this.register(name, factory, { ...options, singleton: true });
    }

    /**
     * Реєструє константне значення
     *
     * @param {string} name - Ім'я константи
     * @param {*} value - Значення
     * @returns {DIContainer}
     */
    value(name, value) {
        return this.singleton(name, () => value);
    }

    /**
     * Резолвить сервіс з контейнера
     *
     * @param {string} name - Ім'я сервісу
     * @returns {*} - Інстанс сервісу
     * @throws {Error} - Якщо сервіс не зареєстрований або circular dependency
     */
    resolve(name) {
        // Перевірка circular dependencies
        if (this.resolving.has(name)) {
            const chain = Array.from(this.resolving).join(' -> ');
            throw new Error(
                `[DI] Circular dependency detected: ${chain} -> ${name}`
            );
        }

        // Повертаємо singleton якщо існує
        if (this.singletons.has(name)) {
            return this.singletons.get(name);
        }

        // Отримуємо опис сервісу
        const service = this.services.get(name);
        if (!service) {
            throw new Error(
                `[DI] Service "${name}" is not registered. ` +
                `Available: ${Array.from(this.services.keys()).join(', ')}`
            );
        }

        // Резолвимо сервіс
        this.resolving.add(name);

        try {
            const instance = service.factory(this);

            // Зберігаємо singleton
            if (service.singleton) {
                this.singletons.set(name, instance);
            }

            this.resolving.delete(name);
            return instance;

        } catch (error) {
            this.resolving.delete(name);
            throw new Error(
                `[DI] Failed to resolve service "${name}": ${error.message}`
            );
        }
    }

    /**
     * Перевіряє чи зареєстрований сервіс
     *
     * @param {string} name - Ім'я сервісу
     * @returns {boolean}
     */
    has(name) {
        return this.services.has(name);
    }

    /**
     * Видаляє сервіс з контейнера
     *
     * @param {string} name - Ім'я сервісу
     * @returns {boolean} - true якщо сервіс був видалений
     */
    remove(name) {
        this.singletons.delete(name);
        this.lifecycleHooks.delete(name);
        return this.services.delete(name);
    }

    /**
     * Очищає всі сервіси
     */
    clear() {
        this.services.clear();
        this.singletons.clear();
        this.resolving.clear();
        this.lifecycleHooks.clear();
        this.started = false;
    }

    /**
     * Повертає список всіх зареєстрованих сервісів
     *
     * @returns {Array<string>}
     */
    getServices() {
        return Array.from(this.services.keys());
    }

    /**
     * Повертає метадані сервісу
     *
     * @param {string} name - Ім'я сервісу
     * @returns {Object|null}
     */
    getMetadata(name) {
        const service = this.services.get(name);
        return service ? service.metadata : null;
    }

    /**
     * Batch resolution - резолвить кілька сервісів одночасно
     *
     * @param {Array<string>} names - Масив імен сервісів
     * @returns {Object} - Об'єкт з резолвленими сервісами
     */
    resolveMany(names) {
        return names.reduce((acc, name) => {
            acc[name] = this.resolve(name);
            return acc;
        }, {});
    }

    /**
     * Ініціалізує всі сервіси (викликає onInit hooks)
     * 
     * @returns {Promise<void>}
     */
    async initialize() {
        const logger = this.has('logger') ? this.resolve('logger') : console;

        logger.info?.('[DI] Initializing services...');
        console.log('[DI] Initializing services...');

        // Резолвимо всі singletons для ініціалізації
        console.log('[DI] Resolving singleton services...');
        for (const [name, service] of this.services.entries()) {
            if (service.singleton && !this.singletons.has(name)) {
                console.log(`[DI] Resolving singleton: ${name}`);
                try {
                    this.resolve(name);
                    console.log(`[DI] ✓ Resolved singleton: ${name}`);
                } catch (err) {
                    console.error(`[DI] ✗ Error resolving singleton ${name}:`, err.message);
                }
            }
        }
        console.log('[DI] All singletons resolved');

        // Викликаємо onInit hooks
        console.log('[DI] Calling onInit hooks...');
        for (const [name, hooks] of this.lifecycleHooks.entries()) {
            if (hooks.onInit) {
                console.log(`[DI] Calling onInit for: ${name}`);
                let instance = this.singletons.get(name);
                if (instance) {
                    // Якщо singleton — це Promise (async factory), дочекатися резолва
                    if (typeof instance.then === 'function') {
                        try {
                            const resolved = await instance;
                            this.singletons.set(name, resolved);
                            instance = resolved;
                        } catch (err) {
                            logger.error?.(`[DI] Error initializing async singleton ${name}: ${err?.message || err}`) ||
                                console.error(`[DI] Error initializing async singleton ${name}:`, err);
                            // Пропускаємо onInit для цього сервісу
                            continue;
                        }
                    }

                    await hooks.onInit.call(instance);
                    logger.debug?.(`[DI] Initialized: ${name}`);
                    console.log(`[DI] ✓ onInit completed for: ${name}`);
                }
            }
        }

        logger.info?.('[DI] All services initialized');
        console.log('[DI] All services initialized');
    }

    /**
     * Запускає всі сервіси (викликає onStart hooks)
     * 
     * @returns {Promise<void>}
     */
    async start() {
        if (this.started) {
            console.warn('[DI] Container already started');
            return;
        }

        const logger = this.has('logger') ? this.resolve('logger') : console;

        logger.info?.('[DI] Starting services...');

        // Викликаємо onStart hooks
        for (const [name, hooks] of this.lifecycleHooks.entries()) {
            if (hooks.onStart) {
                let instance = this.singletons.get(name);
                if (instance) {
                    if (typeof instance.then === 'function') {
                        try {
                            const resolved = await instance;
                            this.singletons.set(name, resolved);
                            instance = resolved;
                        } catch (err) {
                            logger.error?.(`[DI] Error starting async singleton ${name}: ${err?.message || err}`) ||
                                console.error(`[DI] Error starting async singleton ${name}:`, err);
                            continue;
                        }
                    }

                    await hooks.onStart.call(instance);
                    logger.debug?.(`[DI] Started: ${name}`);
                }
            }
        }

        this.started = true;

        logger.info?.('[DI] All services started');
    }

    /**
     * Зупиняє всі сервіси (викликає onStop hooks)
     * 
     * @returns {Promise<void>}
     */
    async stop() {
        if (!this.started) {
            console.warn('[DI] Container not started');
            return;
        }

        const logger = this.has('logger') ? this.resolve('logger') : console;

        logger.info?.('[DI] Stopping services...');

        // Викликаємо onStop hooks у зворотному порядку
        const hooks = Array.from(this.lifecycleHooks.entries()).reverse();

        for (const [name, lifecycle] of hooks) {
            if (lifecycle.onStop) {
                let instance = this.singletons.get(name);
                if (instance) {
                    if (typeof instance.then === 'function') {
                        try {
                            const resolved = await instance;
                            this.singletons.set(name, resolved);
                            instance = resolved;
                        } catch (err) {
                            logger.error?.(`[DI] Error resolving async singleton ${name} during stop: ${err?.message || err}`) ||
                                console.error(`[DI] Error resolving async singleton ${name} during stop:`, err);
                            // Якщо не вдалось отримати інстанс — пропускаємо
                            continue;
                        }
                    }

                    try {
                        await lifecycle.onStop.call(instance);
                        logger.debug?.(`[DI] Stopped: ${name}`);
                    } catch (error) {
                        logger.error?.(`[DI] Error stopping ${name}: ${error?.message || error}`) ||
                            console.error(`[DI] Error stopping ${name}:`, error);
                    }
                }
            }
        }

        this.started = false;

        logger.info?.('[DI] All services stopped');
    }

    /**
     * Отримує граф залежностей сервісу
     *
     * @param {string} name - Ім'я сервісу
     * @param {Set} visited - Відвідані сервіси (для уникнення циклів)
     * @returns {Object} - Граф залежностей
     */
    getDependencyGraph(name, visited = new Set()) {
        if (visited.has(name)) {
            return { name, circular: true };
        }

        visited.add(name);

        const service = this.services.get(name);
        if (!service) {
            return { name, error: 'Not registered' };
        }

        const dependencies = service.dependencies.map(depName =>
            this.getDependencyGraph(depName, new Set(visited))
        );

        return {
            name,
            singleton: service.singleton,
            dependencies
        };
    }

    /**
     * Debug - виводить інформацію про контейнер
     */
    debug() {
        const logger = this.has('logger') ? this.resolve('logger') : console;
        logger.debug?.('🔧 DI Container Debug', {
            services: this.getServices(),
            singletons: Array.from(this.singletons.keys()),
            resolving: Array.from(this.resolving),
            started: this.started,
            lifecycleHooks: Array.from(this.lifecycleHooks.keys())
        });
    }
}

/**
 * Глобальний контейнер для ATLAS Orchestrator
 */
export const container = new DIContainer();

export default container;
