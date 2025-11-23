/**
 * ATLAS ORCHESTRATOR - Application Lifecycle Manager
 * Version: 4.0
 * 
 * Управління життєвим циклом додатку: ініціалізація, запуск, зупинка
 * Використовує DI Container для управління залежностями
 */

// Load environment variables FIRST
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env from project root
dotenv.config({ path: join(__dirname, '../../.env') });

import registerAllServices from './service-registry.js';
import { DIContainer } from './di-container.js';
import atlasConfig from '../../config/atlas-config.js';
import webIntegration from '../api/web-integration.js';
import WebSocketManager from '../api/websocket-manager.js';
import logger from '../utils/logger.js';
import { configureAxios } from '../utils/axios-config.js';
import setupHealthRoutes from '../api/routes/health.routes.js';
import setupChatRoutes from '../api/routes/chat.routes.js';
import setupWebRoutes from '../api/routes/web.routes.js';
import setupEternityRoutes from '../api/routes/eternity.routes.js';
import setupCascadeRoutes from '../api/routes/cascade.routes.js';
import { createApp, setupErrorHandling } from '../app.js';

/**
 * Клас управління життєвим циклом ATLAS Orchestrator
 */
export class Application {
    constructor() {
        this.app = null;
        this.server = null;
        this.container = new DIContainer();
        this.configInitialized = false;

        // Services (будуть резолвлені через DI)
        this.logger = null;
        this.config = null;
        this.wsManager = null;
        this.errorHandler = null;
        this.sessions = null;
        this.networkConfig = null;
    }

    /**
     * Ініціалізація DI Container та сервісів
     */
    async initializeServices() {
        try {
            // Configure Axios з retry logic для 429 помилок
            configureAxios();

            // Реєструємо всі сервіси
            registerAllServices(this.container);

            // Ініціалізуємо сервіси (викликає onInit hooks)
            await this.container.initialize();

            // Резолвимо необхідні сервіси
            this.logger = this.container.resolve('logger');
            this.config = this.container.resolve('config');
            this.wsManager = this.container.resolve('wsManager');
            this.errorHandler = this.container.resolve('errorHandler');
            this.sessions = this.container.resolve('sessions');
            this.networkConfig = this.container.resolve('networkConfig');

            this.logger.system('startup', '[DI] All services resolved successfully');
        } catch (error) {
            // Fallback logging if logger is not available
            const fallbackLogger = console;
            fallbackLogger.error('Failed to initialize services', {
                error: error.message,
                stack: error.stack
            });

            // Try to log through logger if available
            if (this.logger) {
                this.logger.error('Failed to initialize services', {
                    error: error.message,
                    stack: error.stack,
                    severity: 'critical'
                });
            }

            throw error;
        }
    }

    /**
     * Ініціалізація конфігурації
     */
    async initializeConfig() {
        try {
            this.logger.system('startup', 'Validating configuration...');
            this.config.validateConfig();

            this.configInitialized = true;

            this.logger.system('startup', 'Configuration validated successfully', {
                agents: Object.keys(this.config.AGENTS).length,
                stages: this.config.WORKFLOW_STAGES.length,
                services: Object.keys(this.networkConfig.services).length
            });
        } catch (error) {
            this.logger.error('Failed to validate configuration', {
                error: error.message,
                stack: error.stack
            });
            throw error;
        }
    }

    /**
     * Створення та налаштування Express app
     */
    async setupApplication() {
        try {
            // Створюємо Express app
            this.app = createApp();
            this.logger.debug('startup', 'Express app created');

            // Налаштовуємо routes (передаємо DI container для MCP workflow)
            setupHealthRoutes(this.app, { configInitialized: this.configInitialized, networkConfig: this.networkConfig });
            this.logger.debug('startup', 'Health routes configured');

            setupChatRoutes(this.app, {
                sessions: this.sessions,
                networkConfig: this.networkConfig,
                container: this.container  // ✅ NEW: Pass DI container for MCP workflow
            });
            this.logger.debug('startup', 'Chat routes configured');

            setupWebRoutes(this.app);
            this.logger.debug('startup', 'Web routes configured');

            // Nexus Eternity and Cascade API routes
            setupEternityRoutes(this.app, { container: this.container });
            this.logger.debug('startup', 'Eternity routes configured');

            setupCascadeRoutes(this.app, { container: this.container });
            this.logger.debug('startup', 'Cascade routes configured');

            // Налаштовуємо обробку помилок
            setupErrorHandling(this.app, this.errorHandler);
            this.logger.debug('startup', 'Error handling configured');

            this.logger.system('startup', 'Application routes configured');
        } catch (error) {
            this.logger.error('Failed to setup application', {
                error: error.message,
                stack: error.stack,
                severity: 'critical'
            });
            throw error;
        }
    }

    /**
     * Запуск session cleanup таймера
     */
    startSessionCleanup() {
        const maxAge = this.networkConfig.SESSION_TIMEOUT;

        setInterval(() => {
            const now = Date.now();

            for (const [sessionId, session] of this.sessions.entries()) {
                if (now - session.lastInteraction > maxAge) {
                    this.sessions.delete(sessionId);
                    this.logger.session(sessionId, 'cleanup', 'Session expired and removed');
                }
            }
        }, Math.floor(this.networkConfig.SESSION_TIMEOUT / 2));

        this.logger.system('startup', 'Session cleanup timer started');
    }

    /**
     * Запуск WebSocket сервера
     */
    async startWebSocket() {
        try {
            this.logger.system('websocket', 'Starting WebSocket server...');
            const wsPort = this.networkConfig.services.recovery.port;
            this.logger.debug('websocket', `WebSocket port configured: ${wsPort}`);

            // Start the WebSocket server and wait for it to be ready
            const wss = await this.wsManager.start(wsPort);
            this.logger.system('websocket', `✅ WebSocket server running on port ${wsPort}`);
        } catch (error) {
            this.logger.error('Failed to start WebSocket server', {
                error: error.message,
                stack: error.stack,
                port: this.networkConfig.services.recovery.port,
                severity: 'non-critical'
            });
            // Don't crash the entire app if WebSocket fails - it's optional
            this.logger.info('websocket', 'Continuing without WebSocket bridge');
        }
    }

    /**
     * Запуск HTTP сервера
     */
    async startServer() {
        const PORT = this.networkConfig.services.orchestrator.port;
        this.logger.debug('startup', `Starting HTTP server on port ${PORT}`);

        return new Promise((resolve, reject) => {
            try {
                this.server = this.app.listen(PORT, () => {
                    this.logger.system('startup', `🚀 ATLAS Orchestrator v4.0 running on port ${PORT}`);
                    this.logger.system('features', 'DI Container, Unified Configuration, Prompt Registry, Web Integration, Real-time Logging, 3D Model Control, TTS Visualization, Centralized State, Unified Error Handling, Agent Manager, Telemetry & Monitoring');
                    this.logger.system('config', `Configuration loaded: ${Object.keys(this.config.AGENTS).length} agents, ${this.config.WORKFLOW_STAGES.length} stages`);

                    // Start WebSocket server immediately after HTTP server is ready
                    this.startWebSocket().catch(err => {
                        this.logger.error('WebSocket startup error', {
                            error: err.message,
                            stack: err.stack
                        });
                    });

                    resolve();
                });

                this.server.on('error', (error) => {
                    this.logger.error('Server failed to start', {
                        error: error.message,
                        stack: error.stack
                    });
                    reject(error);
                });
            } catch (error) {
                this.logger.error('Server startup error', {
                    error: error.message,
                    stack: error.stack
                });
                reject(error);
            }
        });
    }

    /**
     * Запуск всього додатку
     */
    async start() {
        try {
            // Initialize logger first
            this.logger = logger;

            this.logger.debug('startup', 'Application.start() called');

            // 1. Initialize services
            this.logger.debug('startup', 'Step 1: Initializing services...');
            await this.initializeServices();
            this.logger.debug('startup', 'Step 1: Services initialized');

            // 2. Initialize configuration
            this.logger.debug('startup', 'Step 2: Initializing configuration...');
            await this.initializeConfig();
            this.logger.debug('startup', 'Step 2: Configuration initialized');

            // 3. Setup Express application
            this.logger.debug('startup', 'Step 3: Setting up Express application...');
            await this.setupApplication();
            this.logger.debug('startup', 'Step 3: Express application set up');

            // 4. Start session cleanup
            this.logger.debug('startup', 'Step 4: Starting session cleanup...');
            this.startSessionCleanup();
            this.logger.debug('startup', 'Step 4: Session cleanup started');

            // 5. Start HTTP server (WebSocket will be started after HTTP server is ready)
            this.logger.debug('startup', 'Step 5: Starting HTTP server...');
            await this.startServer();
            this.logger.debug('startup', 'Step 5: HTTP server started');

            // 6. Configure graceful shutdown hooks
            this.logger.debug('startup', 'Step 6: Setting up shutdown handlers...');
            this.setupShutdownHandlers();
            this.logger.debug('startup', 'Step 6: Shutdown handlers set up');

            // 7. Initialize Cascade Controller (non-blocking)
            this.logger.debug('startup', 'Step 7: Initializing Cascade Controller...');
            setImmediate(async () => {
                try {
                    const cascadeController = this.container.resolve('cascadeController');
                    if (cascadeController) {
                        await cascadeController.initialize();
                        this.logger.info('startup', '🌟 CASCADE CONTROLLER initialized', {
                            capabilities: cascadeController.capabilities
                        });
                    }
                } catch (err) {
                    this.logger.error('Cascade Controller initialization failed', {
                        error: err.message,
                        stack: err.stack
                    });
                }
            });
            this.logger.debug('startup', 'Step 7: Cascade Controller queued');

            // 8. Initialize Eternity self-improvement module (non-blocking)
            this.logger.debug('startup', 'Step 8: Initializing Eternity module...');
            setImmediate(async () => {
                try {
                    const eternityModule = this.container.resolve('eternityModule');
                    if (eternityModule) {
                        await eternityModule.initialize();
                        this.logger.info('startup', '🌟 ETERNITY MODULE activated - self-improvement system online');
                    }
                } catch (eternityError) {
                    this.logger.error('Eternity module initialization failed', {
                        error: eternityError.message,
                        stack: eternityError.stack
                    });
                }
            });
            this.logger.debug('startup', 'Step 8: Eternity module queued');

            this.logger.system('startup', '✅ ATLAS Orchestrator fully initialized with DI Container');
        } catch (error) {
            if (this.logger && this.logger.error) {
                this.logger.error('Application startup failed', {
                    error: error.message,
                    stack: error.stack
                });
            } else {
                console.error('Application startup failed:', error.message);
                console.error('Stack:', error.stack);
            }
            throw error;
        }
    }

    /**
     * Graceful shutdown
     */
    async shutdown() {
        this.logger?.system?.('app', 'Shutting down gracefully...');

        try {
            // Зупиняємо сервіси через DI lifecycle
            try {
                await this.container.stop();
                this.logger?.system?.('shutdown', 'DI Container stopped');
            } catch (containerError) {
                this.logger?.error?.('Failed to stop DI Container', {
                    error: containerError.message,
                    stack: containerError.stack
                });
            }

            // Закриваємо HTTP сервер
            if (this.server) {
                try {
                    await new Promise((resolve, reject) => {
                        const timeout = setTimeout(() => {
                            reject(new Error('Server close timeout'));
                        }, 5000);

                        this.server.close(() => {
                            clearTimeout(timeout);
                            resolve();
                        });
                    });
                    this.logger?.system?.('shutdown', 'HTTP server closed');
                } catch (serverError) {
                    this.logger?.error?.('Failed to close HTTP server', {
                        error: serverError.message,
                        stack: serverError.stack
                    });
                }
            }

            this.logger?.system?.('shutdown', 'Application stopped successfully');
        } catch (error) {
            this.logger?.error?.('Error during shutdown', {
                error: error.message,
                stack: error.stack
            });
            throw error;
        }
    }

    /**
     * Налаштування обробників graceful shutdown
     */
    setupShutdownHandlers() {
        process.on('SIGINT', () => {
            this.shutdown()
                .then(() => process.exit(0))
                .catch(() => process.exit(1));
        });

        process.on('SIGTERM', () => {
            this.shutdown()
                .then(() => process.exit(0))
                .catch(() => process.exit(1));
        });
    }
}

export default Application;
