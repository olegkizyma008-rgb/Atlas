/**
 * ATLAS CASCADE (WINDSURF) API Routes
 * Self-Analysis and Code Improvement Endpoints
 */

import express from 'express';
import logger from '../../utils/logger.js';

export default function setupCascadeRoutes(app, dependencies) {
    const router = express.Router();
    const { container } = dependencies;

    /**
     * POST /api/cascade/self-analysis
     * Analyze Atlas's own code for issues
     */
    router.post('/self-analysis', async (req, res) => {
        try {
            const { scope, depth } = req.body;

            logger.info('[CASCADE-API] Self-analysis triggered', {
                scope: scope || 'full',
                depth: depth || 'standard'
            });

            // Get Self-Improvement Engine from DI container
            const selfImprovementEngine = container.resolve('selfImprovementEngine');
            
            if (!selfImprovementEngine) {
                return res.status(503).json({
                    success: false,
                    error: 'Self-Improvement Engine not available'
                });
            }

            // Trigger self-analysis
            const analysis = await selfImprovementEngine.analyzeSelf({
                scope: scope || 'full',
                depth: depth || 'standard',
                includeMetrics: true
            });

            res.json({
                success: true,
                analysis,
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            logger.error('[CASCADE-API] Self-analysis error:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * POST /api/cascade/improve
     * Apply code improvements via Windsurf API
     */
    router.post('/improve', async (req, res) => {
        try {
            const { files, changes } = req.body;

            logger.info('[CASCADE-API] Code improvement triggered', {
                fileCount: files?.length || 0,
                changeCount: changes?.length || 0
            });

            const windsurfCodeEditor = container.resolve('windsurfCodeEditor');
            
            if (!windsurfCodeEditor) {
                return res.status(503).json({
                    success: false,
                    error: 'Windsurf Code Editor not available'
                });
            }

            const results = [];
            
            for (const change of changes || []) {
                const result = await windsurfCodeEditor.replaceFileContent(
                    change.file,
                    change.replacements,
                    change.instruction
                );
                results.push(result);
            }

            res.json({
                success: true,
                results,
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            logger.error('[CASCADE-API] Improve error:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    app.use('/api/cascade', router);
    logger.system('startup', '🌊 CASCADE API routes configured');
}
