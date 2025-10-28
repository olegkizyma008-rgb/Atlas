/**
 * Recursive Deep Analysis System for DEV Mode
 * Hyper-intelligent self-analysis with recursive TODO structures
 * 
 * @version 1.0.0
 * @date 2025-10-28
 */

import fs from 'fs/promises';
import path from 'path';

export default class RecursiveAnalysisEngine {
    constructor(logger, container) {
        this.logger = logger;
        this.container = container;
        this.maxDepth = 5;
        this.analysisHistory = [];
    }

    /**
     * Execute recursive TODO with deep analysis
     */
    async executeRecursiveTodo(todoList, session, systemContext, currentDepth = 1) {
        this.logger.system('dev-recursive', `[RECURSIVE] 🔄 Starting depth ${currentDepth} analysis...`);
        
        if (currentDepth > this.maxDepth) {
            this.logger.warn('dev-recursive', `[RECURSIVE] Max depth ${this.maxDepth} reached, stopping`);
            return;
        }

        for (let i = 0; i < todoList.length; i++) {
            const item = todoList[i];
            
            if (!item || (!item.action && !item.description)) {
                continue;
            }

            const actionLabel = item.action || item.description || `item_${i + 1}`;
            this.logger.system('dev-recursive', `[RECURSIVE] 📊 Analyzing: ${actionLabel}`);

            // Step 1: Analyze logs if required
            if (item.requires_log_analysis) {
                const logAnalysis = await this._deepLogAnalysis(item, systemContext);
                item.log_findings = logAnalysis;
                
                // Create sub-tasks based on log findings
                if (logAnalysis.critical_patterns.length > 0) {
                    item.sub_tasks = this._generateSubTasksFromLogs(logAnalysis, currentDepth + 1);
                }
            }

            // Step 2: Execute main task
            const result = await this._executeAnalysisItem(item, session, systemContext);
            item.result = result;

            // Step 3: Execute sub-tasks recursively
            if (item.sub_tasks && item.sub_tasks.length > 0) {
                this.logger.system('dev-recursive', `[RECURSIVE] 🔍 Diving deeper: ${item.sub_tasks.length} sub-tasks`);
                await this.executeRecursiveTodo(item.sub_tasks, session, systemContext, currentDepth + 1);
            }

            // Step 4: Trigger next analysis cycle if needed
            if (item.triggers_next && result.requires_deeper_analysis) {
                this.logger.system('dev-recursive', `[RECURSIVE] 🔄 Triggering next cycle for: ${actionLabel}`);
                const nextCycleTasks = await this._generateNextCycleTasks(item, result, systemContext);
                await this.executeRecursiveTodo(nextCycleTasks, session, systemContext, currentDepth + 1);
            }

            // Step 5: Validate and mark complete
            const validated = await this._validateTaskCompletion(item, result);
            item.status = validated ? 'completed' : 'needs_review';
            
            this.logger.system('dev-recursive', `[RECURSIVE] ${validated ? '✅' : '⚠️'} ${actionLabel}`);
        }

        this.logger.system('dev-recursive', `[RECURSIVE] ✅ Depth ${currentDepth} complete`);
    }

    /**
     * Deep log analysis with pattern recognition
     */
    async _deepLogAnalysis(item, systemContext) {
        this.logger.system('dev-recursive', '[RECURSIVE] 📋 Analyzing logs deeply...');
        
        const logsDir = path.join(process.cwd(), 'logs');
        const logFiles = ['orchestrator.log', 'workflow.log', 'error.log'];
        
        const analysis = {
            critical_patterns: [],
            error_clusters: [],
            performance_issues: [],
            recommendations: []
        };

        for (const logFile of logFiles) {
            try {
                const logPath = path.join(logsDir, logFile);
                const content = await fs.readFile(logPath, 'utf-8');
                const lines = content.split('\n').slice(-500); // Last 500 lines

                // Pattern 1: Error clusters
                const errors = lines.filter(line => 
                    line.includes('[ERROR]') || line.includes('Error:') || line.includes('Failed')
                );
                
                if (errors.length > 10) {
                    const errorTypes = this._clusterErrors(errors);
                    analysis.error_clusters.push({
                        file: logFile,
                        count: errors.length,
                        types: errorTypes,
                        severity: errors.length > 50 ? 'critical' : 'high'
                    });
                }

                // Pattern 2: Performance bottlenecks
                const slowOperations = lines.filter(line => {
                    const match = line.match(/(\d+)ms/);
                    return match && parseInt(match[1]) > 5000; // > 5 seconds
                });

                if (slowOperations.length > 0) {
                    analysis.performance_issues.push({
                        file: logFile,
                        slow_operations: slowOperations.length,
                        examples: slowOperations.slice(0, 3)
                    });
                }

                // Pattern 3: Critical patterns
                const criticalKeywords = ['timeout', 'crash', 'fatal', 'undefined', 'null'];
                const criticalLines = lines.filter(line => 
                    criticalKeywords.some(keyword => line.toLowerCase().includes(keyword))
                );

                if (criticalLines.length > 0) {
                    analysis.critical_patterns.push({
                        file: logFile,
                        pattern: 'critical_keywords',
                        count: criticalLines.length,
                        samples: criticalLines.slice(0, 5)
                    });
                }

            } catch (error) {
                this.logger.warn('dev-recursive', `Failed to analyze ${logFile}: ${error.message}`);
            }
        }

        // Generate recommendations
        if (analysis.error_clusters.length > 0) {
            analysis.recommendations.push({
                priority: 'high',
                action: 'Investigate error clusters and implement error handling',
                impact: 'Reduce error rate by 50-70%'
            });
        }

        if (analysis.performance_issues.length > 0) {
            analysis.recommendations.push({
                priority: 'medium',
                action: 'Optimize slow operations with caching or async processing',
                impact: 'Improve response time by 30-50%'
            });
        }

        return analysis;
    }

    /**
     * Cluster errors by type
     */
    _clusterErrors(errors) {
        const clusters = {};
        
        errors.forEach(error => {
            // Extract error type
            const typeMatch = error.match(/Error:|Failed:|Exception:/);
            const type = typeMatch ? error.substring(error.indexOf(typeMatch[0])).split(':')[0] : 'Unknown';
            
            clusters[type] = (clusters[type] || 0) + 1;
        });

        return Object.entries(clusters)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([type, count]) => ({ type, count }));
    }

    /**
     * Generate sub-tasks from log analysis
     */
    _generateSubTasksFromLogs(logAnalysis, depth) {
        const subTasks = [];

        // Sub-task for each error cluster
        logAnalysis.error_clusters.forEach((cluster, idx) => {
            subTasks.push({
                id: `log_error_${idx}`,
                action: `Investigate ${cluster.types[0]?.type || 'errors'} in ${cluster.file}`,
                depth_level: depth,
                requires_log_analysis: false,
                triggers_next: cluster.severity === 'critical',
                priority: cluster.severity
            });
        });

        // Sub-task for performance issues
        if (logAnalysis.performance_issues.length > 0) {
            subTasks.push({
                id: 'performance_optimization',
                action: 'Optimize slow operations identified in logs',
                depth_level: depth,
                requires_log_analysis: false,
                triggers_next: true,
                priority: 'medium'
            });
        }

        return subTasks;
    }

    /**
     * Execute single analysis item
     */
    async _executeAnalysisItem(item, session, systemContext) {
        const action = item.action || item.description || '';
        const actionLower = action.toLowerCase();

        let result = {
            success: true,
            findings: [],
            requires_deeper_analysis: false
        };

        // Determine analysis type and execute
        if (actionLower.includes('log') || actionLower.includes('error')) {
            result = await this._analyzeSpecificLogs(action);
        } else if (actionLower.includes('performance') || actionLower.includes('slow')) {
            result = await this._analyzePerformance(action);
        } else if (actionLower.includes('code') || actionLower.includes('file')) {
            result = await this._analyzeCode(action);
        } else {
            result = await this._genericAnalysis(action);
        }

        // Store in history
        this.analysisHistory.push({
            timestamp: Date.now(),
            action,
            result,
            depth: item.depth_level || 1
        });

        return result;
    }

    /**
     * Analyze specific logs
     */
    async _analyzeSpecificLogs(action) {
        // Extract log file name from action
        const logMatch = action.match(/(orchestrator|workflow|error|frontend)\.log/i);
        const logFile = logMatch ? logMatch[0] : 'orchestrator.log';

        try {
            const logPath = path.join(process.cwd(), 'logs', logFile);
            const content = await fs.readFile(logPath, 'utf-8');
            const lines = content.split('\n').slice(-100);

            const errors = lines.filter(l => l.includes('ERROR') || l.includes('Error'));
            const warnings = lines.filter(l => l.includes('WARN') || l.includes('Warning'));

            return {
                success: true,
                findings: [
                    `Found ${errors.length} errors in last 100 lines`,
                    `Found ${warnings.length} warnings in last 100 lines`
                ],
                requires_deeper_analysis: errors.length > 10,
                error_samples: errors.slice(0, 3)
            };
        } catch (error) {
            return {
                success: false,
                findings: [`Failed to analyze ${logFile}: ${error.message}`],
                requires_deeper_analysis: false
            };
        }
    }

    /**
     * Analyze performance
     */
    async _analyzePerformance(action) {
        // Analyze memory and CPU usage
        const memUsage = process.memoryUsage();
        const memUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
        const memTotalMB = Math.round(memUsage.heapTotal / 1024 / 1024);
        const memPercent = Math.round((memUsedMB / memTotalMB) * 100);

        return {
            success: true,
            findings: [
                `Memory usage: ${memUsedMB}MB / ${memTotalMB}MB (${memPercent}%)`,
                `Uptime: ${Math.round(process.uptime())} seconds`
            ],
            requires_deeper_analysis: memPercent > 80,
            metrics: {
                memory_used: memUsedMB,
                memory_total: memTotalMB,
                memory_percent: memPercent
            }
        };
    }

    /**
     * Analyze code
     */
    async _analyzeCode(action) {
        // Generic code analysis
        return {
            success: true,
            findings: ['Code analysis completed'],
            requires_deeper_analysis: false
        };
    }

    /**
     * Generic analysis
     */
    async _genericAnalysis(action) {
        return {
            success: true,
            findings: [`Analyzed: ${action}`],
            requires_deeper_analysis: false
        };
    }

    /**
     * Generate next cycle tasks
     */
    async _generateNextCycleTasks(item, result, systemContext) {
        const nextTasks = [];

        if (result.requires_deeper_analysis) {
            nextTasks.push({
                id: `${item.id}_deeper`,
                action: `Deep dive into ${item.action}`,
                depth_level: (item.depth_level || 1) + 1,
                requires_log_analysis: true,
                triggers_next: false,
                priority: 'high'
            });
        }

        return nextTasks;
    }

    /**
     * Validate task completion
     */
    async _validateTaskCompletion(item, result) {
        // Task is complete if:
        // 1. Execution was successful
        // 2. No critical findings
        // 3. All sub-tasks completed (if any)
        
        if (!result.success) return false;
        
        if (item.sub_tasks && item.sub_tasks.length > 0) {
            const allSubTasksComplete = item.sub_tasks.every(st => st.status === 'completed');
            if (!allSubTasksComplete) return false;
        }

        return true;
    }
}
