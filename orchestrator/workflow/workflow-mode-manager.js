/**
 * Workflow Mode Manager
 * Manages runtime workflow engine mode switching and monitoring
 * 
 * @version 1.0.0
 * @date 2025-11-18
 */

import logger from '../utils/logger.js';

/**
 * Valid workflow engine modes
 */
export const WorkflowModes = {
    CLASSIC: 'classic',
    STATE_MACHINE: 'state_machine',
    OPTIMIZED: 'optimized',
    HYBRID: 'hybrid'
};

/**
 * Workflow Mode Manager
 * Handles runtime mode switching and monitoring
 */
export class WorkflowModeManager {
    constructor(container) {
        this.container = container;
        this.logger = logger;
        this.currentMode = this._getInitialMode();
        this.modeHistory = [];
        this.metrics = {
            modeChanges: 0,
            executionsByMode: {},
            performanceByMode: {}
        };

        // Initialize metrics for all modes
        Object.values(WorkflowModes).forEach(mode => {
            this.metrics.executionsByMode[mode] = 0;
            this.metrics.performanceByMode[mode] = { total: 0, count: 0, average: 0 };
        });

        this.logger.system('workflow-mode-manager', '🎛️ Workflow Mode Manager initialized', {
            currentMode: this.currentMode
        });
    }

    /**
     * Get initial mode from environment
     * @private
     */
    _getInitialMode() {
        const config = this.container.resolve('config');
        const workflowConfig = config.ENV_CONFIG?.workflow || {};
        return workflowConfig.engineMode || WorkflowModes.STATE_MACHINE;
    }

    /**
     * Get current workflow mode
     */
    getCurrentMode() {
        return this.currentMode;
    }

    /**
     * Switch workflow mode at runtime
     * @param {string} newMode - New workflow mode
     * @param {Object} options - Switch options
     */
    switchMode(newMode, options = {}) {
        const { reason = 'manual', metadata = {} } = options;

        // Validate mode
        if (!Object.values(WorkflowModes).includes(newMode)) {
            const error = new Error(`Invalid workflow mode: ${newMode}`);
            this.logger.error('[WORKFLOW-MODE] Invalid mode switch attempt', {
                attemptedMode: newMode,
                currentMode: this.currentMode,
                validModes: Object.values(WorkflowModes)
            });
            throw error;
        }

        // Check if mode is actually changing
        if (newMode === this.currentMode) {
            this.logger.info('[WORKFLOW-MODE] Mode already set to', {
                mode: newMode
            });
            return { changed: false, mode: newMode };
        }

        // Record mode change
        const previousMode = this.currentMode;
        this.currentMode = newMode;
        this.modeHistory.push({
            from: previousMode,
            to: newMode,
            timestamp: Date.now(),
            reason,
            metadata
        });
        this.metrics.modeChanges++;

        this.logger.system('workflow-mode-manager', '🔄 Workflow mode switched', {
            from: previousMode,
            to: newMode,
            reason,
            modeChanges: this.metrics.modeChanges
        });

        return { changed: true, from: previousMode, to: newMode };
    }

    /**
     * Get mode configuration
     */
    getModeConfig() {
        const config = this.container.resolve('config');
        const workflowConfig = config.ENV_CONFIG?.workflow || {};

        return {
            engineMode: this.currentMode,
            enableOptimization: workflowConfig.enableOptimization,
            enableHybridExecution: workflowConfig.enableHybridExecution,
            enableTimeoutProtection: workflowConfig.enableTimeoutProtection
        };
    }

    /**
     * Record execution metrics for current mode
     * @param {number} executionTime - Execution time in milliseconds
     */
    recordExecution(executionTime) {
        const mode = this.currentMode;

        // Update execution count
        this.metrics.executionsByMode[mode]++;

        // Update performance metrics
        const modeMetrics = this.metrics.performanceByMode[mode];
        modeMetrics.total += executionTime;
        modeMetrics.count++;
        modeMetrics.average = modeMetrics.total / modeMetrics.count;

        this.logger.debug('[WORKFLOW-MODE] Execution recorded', {
            mode,
            executionTime,
            averageTime: modeMetrics.average
        });
    }

    /**
     * Get performance metrics
     */
    getMetrics() {
        return {
            currentMode: this.currentMode,
            modeChanges: this.metrics.modeChanges,
            executionsByMode: { ...this.metrics.executionsByMode },
            performanceByMode: {
                ...Object.entries(this.metrics.performanceByMode).reduce((acc, [mode, metrics]) => {
                    acc[mode] = {
                        total: metrics.total,
                        count: metrics.count,
                        average: Math.round(metrics.average)
                    };
                    return acc;
                }, {})
            },
            modeHistory: this.modeHistory.slice(-10) // Last 10 mode changes
        };
    }

    /**
     * Get mode description
     */
    getModeDescription(mode = this.currentMode) {
        const descriptions = {
            [WorkflowModes.CLASSIC]: 'Original executor-v3 with minimal changes',
            [WorkflowModes.STATE_MACHINE]: 'Uses WorkflowStateMachine without optimization',
            [WorkflowModes.OPTIMIZED]: 'Adds OptimizedWorkflowManager for batch processing',
            [WorkflowModes.HYBRID]: 'Includes HybridWorkflowExecutor for parallel execution'
        };
        return descriptions[mode] || 'Unknown mode';
    }

    /**
     * Validate mode is available
     */
    isModeAvailable(mode) {
        const config = this.container.resolve('config');
        const workflowConfig = config.ENV_CONFIG?.workflow || {};

        switch (mode) {
            case WorkflowModes.HYBRID:
                return workflowConfig.enableHybridExecution === true;
            case WorkflowModes.OPTIMIZED:
                return workflowConfig.enableOptimization === true;
            case WorkflowModes.STATE_MACHINE:
            case WorkflowModes.CLASSIC:
                return true;
            default:
                return false;
        }
    }

    /**
     * Get available modes
     */
    getAvailableModes() {
        return Object.values(WorkflowModes).filter(mode => this.isModeAvailable(mode));
    }

    /**
     * Get mode history
     */
    getModeHistory(limit = 20) {
        return this.modeHistory.slice(-limit);
    }

    /**
     * Reset metrics
     */
    resetMetrics() {
        Object.values(WorkflowModes).forEach(mode => {
            this.metrics.executionsByMode[mode] = 0;
            this.metrics.performanceByMode[mode] = { total: 0, count: 0, average: 0 };
        });
        this.metrics.modeChanges = 0;
        this.logger.info('[WORKFLOW-MODE] Metrics reset');
    }
}

export default WorkflowModeManager;
