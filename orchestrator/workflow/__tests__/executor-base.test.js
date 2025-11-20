/**
 * @fileoverview Tests for ExecutorBase
 * @version 1.0.0
 * @date 2025-11-21
 */

import ExecutorBase from '../core/executor-base.js';

describe('ExecutorBase', () => {
    let executor;
    let mockLogger;

    beforeEach(() => {
        mockLogger = {
            system: jest.fn(),
            error: jest.fn(),
            warn: jest.fn()
        };

        executor = new ExecutorBase({
            logger: mockLogger,
            componentName: 'test-executor'
        });
    });

    describe('executeWithMetrics', () => {
        it('should execute operation and return metrics', async () => {
            const operation = async () => ({ result: 'success' });
            const result = await executor.executeWithMetrics(operation);

            expect(result.success).toBe(true);
            expect(result.result.result).toBe('success');
            expect(result.duration).toBeGreaterThanOrEqual(0);
            expect(result.executionId).toBeDefined();
        });

        it('should log execution start and completion', async () => {
            const operation = async () => ({ result: 'success' });
            await executor.executeWithMetrics(operation, { contextId: 'test-123' });

            expect(mockLogger.system).toHaveBeenCalled();
        });

        it('should handle execution errors', async () => {
            const operation = async () => {
                throw new Error('Test error');
            };

            await expect(executor.executeWithMetrics(operation)).rejects.toThrow('Test error');
            expect(mockLogger.error).toHaveBeenCalled();
        });
    });

    describe('executeWithRetries', () => {
        it('should retry failed operations', async () => {
            let attempts = 0;
            const operation = async () => {
                attempts++;
                if (attempts < 2) throw new Error('Fail');
                return { result: 'success' };
            };

            const result = await executor.executeWithRetries(operation, {
                maxAttempts: 3,
                delayMs: 10
            });

            expect(result.success).toBe(true);
            expect(result.attempt).toBe(2);
        });

        it('should fail after max attempts', async () => {
            const operation = async () => {
                throw new Error('Always fails');
            };

            await expect(executor.executeWithRetries(operation, {
                maxAttempts: 2,
                delayMs: 10
            })).rejects.toThrow('Always fails');
        });
    });

    describe('_validateContext', () => {
        it('should validate valid context', () => {
            const context = { field1: 'value1', field2: 'value2' };
            expect(() => executor._validateContext(context, ['field1'])).not.toThrow();
        });

        it('should throw on invalid context', () => {
            expect(() => executor._validateContext(null, ['field1'])).toThrow();
        });

        it('should throw on missing required field', () => {
            const context = { field1: 'value1' };
            expect(() => executor._validateContext(context, ['field1', 'field2'])).toThrow();
        });
    });
});
