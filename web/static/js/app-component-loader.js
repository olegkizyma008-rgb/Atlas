/**
 * @fileoverview App Component Loader
 * Handles loading and initialization of all app components
 * Extracted from app-refactored.js for better modularity
 *
 * @version 1.0.0
 * @date 2025-11-23
 */

import { ChatManager } from './modules/chat-manager.js';
import { initializeAtlasVoice } from './voice-control/atlas-voice-integration.js';
import { ConversationModeManager } from './voice-control/conversation-mode-manager.js';
import { eventManager, Events as VoiceEvents } from './voice-control/events/event-manager.js';
import { AtlasAdvancedUI } from './components/ui/atlas-advanced-ui.js';
import { AnimatedLoggingSystem } from './components/logging/animated-logging.js';
import { AtlasTTSVisualization } from './components/tts/atlas-tts-visualization.js';
import { AtlasGLBLivingSystem } from './components/model3d/atlas-glb-living-system.js';
import { AtlasLivingBehaviorEnhanced } from './components/model3d/atlas-living-behavior-enhanced.js';
import { AtlasInteractivePersonality } from './components/model3d/atlas-interactive-personality.js';
import { logger } from './core/logger.js';

/**
 * App Component Loader - Manages component initialization
 */
export class AppComponentLoader {
    /**
     * @param {Object} options
     * @param {Object} options.logger - Logger instance
     * @param {Object} options.config - App configuration
     */
    constructor(options = {}) {
        this.logger = options.logger || logger;
        this.config = options.config || {};
        this.components = new Map();
        this.initialized = false;
    }

    /**
     * Load all components
     * @returns {Promise<Object>} Loaded components
     */
    async loadAll() {
        try {
            this.logger.info('app-loader', 'Loading all components...');

            const components = {};

            // Load core components
            components.chatManager = await this.loadChatManager();
            components.voiceControl = await this.loadVoiceControl();
            components.conversationMode = await this.loadConversationMode();
            components.ui = await this.loadUIComponents();
            components.ttsVisualization = await this.loadTTSVisualization();
            components.model3d = await this.load3DModel();
            components.logging = await this.loadLoggingSystem();

            // Store components
            for (const [name, component] of Object.entries(components)) {
                this.components.set(name, component);
            }

            this.initialized = true;
            this.logger.info('app-loader', 'All components loaded successfully');

            return components;
        } catch (error) {
            this.logger.error('app-loader', `Component loading failed: ${error.message}`);
            throw error;
        }
    }

    /**
     * Load Chat Manager
     */
    async loadChatManager() {
        try {
            this.logger.info('app-loader', 'Loading Chat Manager...');

            const chatManager = new ChatManager({
                logger: this.logger,
                config: this.config.chat
            });

            await chatManager.initialize();

            this.logger.info('app-loader', 'Chat Manager loaded');
            return chatManager;
        } catch (error) {
            this.logger.error('app-loader', `Chat Manager loading failed: ${error.message}`);
            throw error;
        }
    }

    /**
     * Load Voice Control
     */
    async loadVoiceControl() {
        try {
            this.logger.info('app-loader', 'Loading Voice Control...');

            const voiceControl = await initializeAtlasVoice({
                logger: this.logger,
                config: this.config.voice
            });

            this.logger.info('app-loader', 'Voice Control loaded');
            return voiceControl;
        } catch (error) {
            this.logger.error('app-loader', `Voice Control loading failed: ${error.message}`);
            throw error;
        }
    }

    /**
     * Load Conversation Mode Manager
     */
    async loadConversationMode() {
        try {
            this.logger.info('app-loader', 'Loading Conversation Mode Manager...');

            const conversationMode = new ConversationModeManager({
                logger: this.logger,
                eventManager,
                config: this.config.conversation
            });

            await conversationMode.initialize();

            this.logger.info('app-loader', 'Conversation Mode Manager loaded');
            return conversationMode;
        } catch (error) {
            this.logger.error('app-loader', `Conversation Mode Manager loading failed: ${error.message}`);
            throw error;
        }
    }

    /**
     * Load UI Components
     */
    async loadUIComponents() {
        try {
            this.logger.info('app-loader', 'Loading UI Components...');

            const ui = new AtlasAdvancedUI({
                logger: this.logger,
                config: this.config.ui
            });

            await ui.initialize();

            this.logger.info('app-loader', 'UI Components loaded');
            return ui;
        } catch (error) {
            this.logger.error('app-loader', `UI Components loading failed: ${error.message}`);
            throw error;
        }
    }

    /**
     * Load TTS Visualization
     */
    async loadTTSVisualization() {
        try {
            this.logger.info('app-loader', 'Loading TTS Visualization...');

            const ttsViz = new AtlasTTSVisualization({
                logger: this.logger,
                config: this.config.tts
            });

            await ttsViz.initialize();

            this.logger.info('app-loader', 'TTS Visualization loaded');
            return ttsViz;
        } catch (error) {
            this.logger.error('app-loader', `TTS Visualization loading failed: ${error.message}`);
            throw error;
        }
    }

    /**
     * Load 3D Model
     */
    async load3DModel() {
        try {
            this.logger.info('app-loader', 'Loading 3D Model...');

            const model3d = new AtlasGLBLivingSystem({
                logger: this.logger,
                config: this.config.model3d
            });

            await model3d.initialize();

            // Add behavior and personality
            const behavior = new AtlasLivingBehaviorEnhanced({
                logger: this.logger,
                model: model3d
            });

            const personality = new AtlasInteractivePersonality({
                logger: this.logger,
                model: model3d
            });

            await behavior.initialize();
            await personality.initialize();

            this.logger.info('app-loader', '3D Model loaded');

            return {
                model: model3d,
                behavior,
                personality
            };
        } catch (error) {
            this.logger.error('app-loader', `3D Model loading failed: ${error.message}`);
            throw error;
        }
    }

    /**
     * Load Logging System
     */
    async loadLoggingSystem() {
        try {
            this.logger.info('app-loader', 'Loading Logging System...');

            const logging = new AnimatedLoggingSystem({
                logger: this.logger,
                config: this.config.logging
            });

            await logging.initialize();

            this.logger.info('app-loader', 'Logging System loaded');
            return logging;
        } catch (error) {
            this.logger.error('app-loader', `Logging System loading failed: ${error.message}`);
            throw error;
        }
    }

    /**
     * Get component by name
     */
    getComponent(name) {
        return this.components.get(name);
    }

    /**
     * Get all components
     */
    getAllComponents() {
        return Object.fromEntries(this.components);
    }

    /**
     * Check if all components are loaded
     */
    isInitialized() {
        return this.initialized;
    }
}

export default AppComponentLoader;
