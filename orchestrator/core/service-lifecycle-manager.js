/**
 * @fileoverview Service Lifecycle Manager
 * Manages initialization and shutdown of services
 * Extracted from service-registry.js for better modularity
 *
 * @version 1.0.0
 * @date 2025-11-23
 */

import { MCPManager } from '../ai/mcp-manager.js';
import { MCPTodoManager } from '../workflow/mcp-todo-manager.js';
import { TTSSyncManager } from '../workflow/tts-sync-manager.js';
import { VisionAnalysisService } from '../services/vision-analysis-service.js';
import { TetyanaToolSystem } from '../ai/tetyana-tool-system.js';
import AccessibilityChecker from '../utils/accessibility-checker.js';
import { DevSelfAnalysisProcessor } from '../workflow/stages/dev-self-analysis-processor/index.js';
import { SelfImprovementEngine } from '../eternity/self-improvement-engine.js';
import WindsurfCodeEditor from '../eternity/windsurf-code-editor.js';
import { NexusMemoryManager } from '../eternity/nexus-memory-manager.js';
import { ChatMemoryEligibilityProcessor } from '../workflow/stages/chat-memory-eligibility-processor.js';
import { ChatMemoryCoordinator } from '../workflow/chat-memory-coordinator.js';

/**
 * Service Lifecycle Manager - Manages service initialization and shutdown
 */
export class ServiceLifecycleManager {
    /**
     * @param {Object} options
     * @param {Object} options.logger - Logger instance
     * @param {Object} options.config - Configuration
     */
    constructor(options = {}) {
        this.logger = options.logger || console;
        this.config = options.config || {};
        this.services = new Map();
        this.initializationOrder = [
            'mcpManager',
            'tetyanaToolSystem',
            'ttsSyncManager',
            'visionAnalysisService',
            'mcpTodoManager',
            'accessibilityChecker',
            'devSelfAnalysisProcessor',
            'selfImprovementEngine',
            'windsurfCodeEditor',
            'nexusMemoryManager',
            'chatMemoryEligibilityProcessor',
            'chatMemoryCoordinator'
        ];
    }

    /**
     * Initialize all services
     * @returns {Promise<Object>} Initialized services
     */
    async initializeAll() {
        try {
            this.logger.info('lifecycle', 'Initializing all services...');

            for (const serviceName of this.initializationOrder) {
                await this._initializeService(serviceName);
            }

            this.logger.info('lifecycle', 'All services initialized successfully');
            return Object.fromEntries(this.services);
        } catch (error) {
            this.logger.error('lifecycle', `Service initialization failed: ${error.message}`);
            throw error;
        }
    }

    /**
     * Initialize a specific service
     * @private
     */
    async _initializeService(serviceName) {
        try {
            this.logger.info('lifecycle', `Initializing ${serviceName}...`);

            let service;

            switch (serviceName) {
                case 'mcpManager':
                    service = new MCPManager({ logger: this.logger });
                    break;

                case 'tetyanaToolSystem':
                    service = new TetyanaToolSystem({
                        logger: this.logger,
                        mcpManager: this.services.get('mcpManager')
                    });
                    break;

                case 'ttsSyncManager':
                    service = new TTSSyncManager({ logger: this.logger });
                    break;

                case 'visionAnalysisService':
                    service = new VisionAnalysisService({
                        logger: this.logger,
                        mcpManager: this.services.get('mcpManager')
                    });
                    break;

                case 'mcpTodoManager':
                    service = new MCPTodoManager({
                        logger: this.logger,
                        mcpManager: this.services.get('mcpManager'),
                        ttsSyncManager: this.services.get('ttsSyncManager')
                    });
                    break;

                case 'accessibilityChecker':
                    service = new AccessibilityChecker({ logger: this.logger });
                    break;

                case 'devSelfAnalysisProcessor':
                    service = new DevSelfAnalysisProcessor({
                        logger: this.logger,
                        mcpManager: this.services.get('mcpManager')
                    });
                    break;

                case 'selfImprovementEngine':
                    service = new SelfImprovementEngine({
                        logger: this.logger,
                        mcpManager: this.services.get('mcpManager')
                    });
                    break;

                case 'windsurfCodeEditor':
                    service = new WindsurfCodeEditor({ logger: this.logger });
                    break;

                case 'nexusMemoryManager':
                    service = new NexusMemoryManager({ logger: this.logger });
                    break;

                case 'chatMemoryEligibilityProcessor':
                    service = new ChatMemoryEligibilityProcessor({
                        logger: this.logger,
                        memoryManager: this.services.get('nexusMemoryManager')
                    });
                    break;

                case 'chatMemoryCoordinator':
                    service = new ChatMemoryCoordinator({
                        logger: this.logger,
                        memoryManager: this.services.get('nexusMemoryManager')
                    });
                    break;

                default:
                    this.logger.warn('lifecycle', `Unknown service: ${serviceName}`);
                    return;
            }

            // Initialize service if it has initialize method
            if (service && typeof service.initialize === 'function') {
                await service.initialize();
            }

            this.services.set(serviceName, service);
            this.logger.info('lifecycle', `${serviceName} initialized`);
        } catch (error) {
            this.logger.error('lifecycle', `Failed to initialize ${serviceName}: ${error.message}`);
            throw error;
        }
    }

    /**
     * Shutdown a specific service
     */
    async shutdownService(serviceName) {
        try {
            const service = this.services.get(serviceName);

            if (!service) {
                this.logger.warn('lifecycle', `Service not found: ${serviceName}`);
                return;
            }

            if (typeof service.shutdown === 'function') {
                await service.shutdown();
            }

            this.services.delete(serviceName);
            this.logger.info('lifecycle', `${serviceName} shutdown`);
        } catch (error) {
            this.logger.error('lifecycle', `Failed to shutdown ${serviceName}: ${error.message}`);
            throw error;
        }
    }

    /**
     * Shutdown all services in reverse order
     */
    async shutdownAll() {
        try {
            this.logger.info('lifecycle', 'Shutting down all services...');

            // Shutdown in reverse order
            for (let i = this.initializationOrder.length - 1; i >= 0; i--) {
                const serviceName = this.initializationOrder[i];
                await this.shutdownService(serviceName);
            }

            this.logger.info('lifecycle', 'All services shutdown');
        } catch (error) {
            this.logger.error('lifecycle', `Shutdown failed: ${error.message}`);
            throw error;
        }
    }

    /**
     * Restart a service
     */
    async restartService(serviceName) {
        try {
            this.logger.info('lifecycle', `Restarting ${serviceName}...`);

            await this.shutdownService(serviceName);
            await this._initializeService(serviceName);

            this.logger.info('lifecycle', `${serviceName} restarted`);
        } catch (error) {
            this.logger.error('lifecycle', `Failed to restart ${serviceName}: ${error.message}`);
            throw error;
        }
    }

    /**
     * Get service by name
     */
    getService(serviceName) {
        return this.services.get(serviceName);
    }

    /**
     * Get all services
     */
    getAllServices() {
        return Object.fromEntries(this.services);
    }

    /**
     * Check if service is initialized
     */
    isServiceInitialized(serviceName) {
        return this.services.has(serviceName);
    }

    /**
     * Get initialization status
     */
    getStatus() {
        const status = {};

        for (const serviceName of this.initializationOrder) {
            status[serviceName] = this.services.has(serviceName) ? 'initialized' : 'not_initialized';
        }

        return status;
    }
}

export default ServiceLifecycleManager;
