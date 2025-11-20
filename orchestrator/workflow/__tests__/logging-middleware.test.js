/**
 * @fileoverview Tests for logging-middleware.js
 * @version 1.0.0
 * @date 2025-11-21
 */

import { logExecution, logStep, logWithContext, logErrorWithContext } from '../utils/logging-middleware.js';

describe('Logging Middleware', () => {
    let mockLogger;

    beforeEach(() => {
        mockLogger = {
            system: jest.fn(),
            error: jest.fn(),
            warn: jest.fn()
        };
    });

    describe('logExecution decorator', () => {
        it('should log execution start and completion', async () => {
            const decorator = logExecution('test-component');

            const target = {
                logger: mockLogger,
                _generateExecutionId: () => 'exec_123'
            };

            const descriptor = {
                value: async function () {
                    return { success: true };
                }
            };

            const decorated = decorator(target, 'testMethod', descriptor);
            const result = await decorated.value.call(target);

            expect(mockLogger.system).toHaveBeenCalled();
            expect(result.success).toBe(true);
        });

        it('should log errors during execution', async () => {
            const decorator = logExecution('test-component');

            const target = {
                logger: mockLogger,
                _generateExecutionId: () => 'exec_123'
            };

            const descriptor = {
                value: async function () {
                    throw new Error('Test error');
                }
            };

            const decorated = decorator(target, 'testMethod', descriptor);

            await expect(decorated.value.call(target)).rejects.toThrow('Test error');
            expect(mockLogger.error).toHaveBeenCalled();
        });
    });

    describe('logWithContext', () => {
        it('should log with context', () => {
            logWithContext(mockLogger, 'test-component', 'Test message', { key: 'value' });

            expect(mockLogger.system).toHaveBeenCalledWith(
                'test-component',
                expect.stringContaining('Test message'),
                { key: 'value' }
            );
        });
    });

    describe('logErrorWithContext', () => {
        it('should log error with context', () => {
            const error = new Error('Test error');
            logErrorWithContext(mockLogger, 'test-component', 'Error occurred', error, { key: 'value' });

            expect(mockLogger.error).toHaveBeenCalledWith(
                'test-component',
                expect.stringContaining('Error occurred'),
                expect.objectContaining({
                    error: 'Test error',
                    key: 'value'
                })
            );
        });
    });
});
