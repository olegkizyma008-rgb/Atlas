/**
 * ATLAS ORCHESTRATOR SERVER v4.0
 * Bootstrap Entry Point - Minimal Server Initialization
 * 
 * Refactored 11.10.2025: Модульна архітектура з чіткою separation of concerns
 */

import Application from './core/application.js';

// Логування для дебагування
console.log('[SERVER] Starting ATLAS Orchestrator...');

// Обробник для логування причини завершення
process.on('exit', (code) => {
  console.log(`[SERVER] Process exiting with code: ${code}`);
});

process.on('SIGINT', () => {
  console.log('[SERVER] Received SIGINT, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('[SERVER] Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

process.on('uncaughtException', (error) => {
  console.error('[SERVER] Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[SERVER] Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Створюємо та запускаємо додаток
const app = new Application();

// Wrap in async IIFE to allow await at top level
(async () => {
  try {
    console.log('[SERVER] Calling app.start()...');
    await app.start();
    console.log('[SERVER] ✅ app.start() completed successfully');
  } catch (error) {
    console.error('❌ Failed to start ATLAS Orchestrator:', error);
    process.exit(1);
  }

  console.log('[SERVER] ✅ ATLAS Orchestrator fully initialized and running');
})();

// Експортуємо для тестування
export default app;
