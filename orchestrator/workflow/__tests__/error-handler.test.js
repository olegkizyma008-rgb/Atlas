/**
 * @fileoverview Tests for ErrorHandler
 * @version 1.0.0
 * @date 2025-11-21
 */

import ErrorHandler from '../utils/error-handler.js';

describe('ErrorHandler', () => {
    let mockLogger;

    beforeEach(() => {
        mockLogger = {
            system: jest.fn(),
            error: jest.fn(),
            warn: jest.fn()
        };
    });

    describe('handle', () => {
        it('should execute successful operation', async () => {
            const operation = async () => ({ result: 'success' });
            const result = await ErrorHandler.handle(operation, {
                logger: mockLogger,
                componentName: 'test',
                operationName: 'testOp'
            });

            expect(result.result).toBe('success');
        });

        it('should throw error by default', async () => {
            const operation = async () => {
                throw new Error('Test error');
            };

            await expect(ErrorHandler.handle(operation, {
                logger: mockLogger,
                componentName: 'test',
                operationName: 'testOp'
            })).rejects.toThrow('Test error');
        });

        it('should return error object when throwError is false', async () => {
            const operation = async () => {
                throw new Error('Test error');
            };

            const result = await ErrorHandler.handle(operation, {
                logger: mockLogger,
                componentName: 'test',
                operationName: 'testOp',
                throwError: false
            });

            expect(result.success).toBe(false);
            expect(result.error).toBe('Test error');
        });
    });

    describe('handleWithRetry', () => {
        it('should retry failed operations', async () => {
            let attempts = 0;
            const operation = async () => {
                attempts++;
                if (attempts < 2) throw new Error('Fail');
                return { result: 'success' };
            };

            const result = await ErrorHandler.handleWithRetry(operation, {
                maxAttempts: 3,
                delayMs: 10,
                logger: mockLogger,
                componentName: 'test',
                operationName: 'testOp'
            });

            expect(result).toEqual({ result: 'success' });
        });

        it('should fail after max attempts', async () => {
            const operation = async () => {
                throw new Error('Always fails');
            };

            await expect(ErrorHandler.handleWithRetry(operation, {
                maxAttempts: 2,
                delayMs: 10,
                logger: mockLogger,
                componentName: 'test',
                operationName: 'testOp'
            })).rejects.toThrow('Always fails');
        });
    });

    describe('handleWithTimeout', () => {
        it('should complete operation within timeout', async () => {
            const operation = async () => ({ result: 'success' });
            const result = await ErrorHandler.handleWithTimeout(operation, {
                timeoutMs: 1000,
                logger: mockLogger,
                componentName: 'test',
                operationName: 'testOp'
            });

            expect(result.result).toBe('success');
        });

        it('should timeout long-running operation', async () => {
            const operation = async () => {
                await new Promise(resolve => setTimeout(resolve, 2000));
                return { result: 'success' };
            };

            await expect(ErrorHandler.handleWithTimeout(operation, {
                timeoutMs: 100,
                logger: mockLogger,
                componentName: 'test',
                operationName: 'testOp'
            })).rejects.toThrow('timeout');
        });
    });
});
