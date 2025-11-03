/**
 * ATLAS ETERNITY (NEXUS) API Routes
 * Self-Improvement Engine Endpoints
 */

import express from 'express';
import logger from '../../utils/logger.js';

export default function setupEternityRoutes(app, dependencies) {
    const router = express.Router();
    const { container } = dependencies;

    /**
     * POST /api/eternity
     * Trigger Nexus Self-Improvement cycle
     */
    router.post('/', async (req, res) => {
        try {
            const { problems, context } = req.body;

            logger.info('[ETERNITY-API] Nexus Self-Improvement triggered', {
                problemCount: problems?.length || 0,
                hasContext: !!context
            });

            // Get Self-Improvement Engine from DI container
            const selfImprovementEngine = container.resolve('selfImprovementEngine');
            
            if (!selfImprovementEngine) {
                return res.status(503).json({
                    success: false,
                    error: 'Self-Improvement Engine not available'
                });
            }

            // Execute improvement cycle
            const result = await selfImprovementEngine.improve({
                problems: problems || [],
                context: context || {},
                source: 'api',
                timestamp: new Date().toISOString()
            });

            res.json({
                success: true,
                result,
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            logger.error('[ETERNITY-API] Error:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * GET /api/eternity/status
     * Get Nexus system status
     */
    router.get('/status', async (req, res) => {
        try {
            const selfImprovementEngine = container.resolve('selfImprovementEngine');
            
            res.json({
                available: !!selfImprovementEngine,
                windsurf_api: process.env.CASCADE_ENABLED === 'true',
                memory_mcp: !!container.resolve('mcpManager'),
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            logger.error('[ETERNITY-API] Status error:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    app.use('/api/eternity', router);
    logger.system('startup', '✨ ETERNITY API routes configured');
}
