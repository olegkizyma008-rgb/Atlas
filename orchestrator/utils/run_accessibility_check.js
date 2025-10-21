#!/usr/bin/env node
/**
 * Run AccessibilityChecker standalone (used by restart_system.sh pre-start)
 */
import AccessibilityChecker from './accessibility-checker.js';
import logger from './logger.js';
import Config from '../../config/atlas-config.js';

async function main() {
    try {
        const checker = new AccessibilityChecker({ logger, config: Config });

        const args = process.argv.slice(2 || 0);
        const checkOnly = args.includes('--check-only') || args.includes('--status');

        if (checkOnly) {
            // Non-interactive check for status commands
            const enabled = await checker.isAccessibilityEnabled();
            if (enabled) {
                console.log('Accessibility: GRANTED');
                process.exit(0);
            } else {
                console.log('Accessibility: NOT GRANTED');
                process.exit(3);
            }
        }

        logger.system('startup', '[ACCESS-CHECK] Running pre-start accessibility check...');
        const result = await checker.checkAndPrompt();
        if (result && result.ok) {
            logger.system('startup', '[ACCESS-CHECK] Accessibility check OK');
            process.exit(0);
        } else {
            logger.warn('[ACCESS-CHECK] Accessibility check returned not-ok', result || {});
            // Exit with code 3 when permissions are not granted (fail-fast condition)
            process.exit(3);
        }
    } catch (err) {
        logger.error('[ACCESS-CHECK] Unexpected error while checking accessibility', { error: err });
        // Exit code 2 signifies an internal error; caller may treat as hard-fail
        process.exit(2);
    }
}

main();
