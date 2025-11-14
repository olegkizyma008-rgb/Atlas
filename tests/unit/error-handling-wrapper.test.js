/**
 * @fileoverview Tests for Error Handling Wrapper
 * Phase 7: Error Handling Enhancement
 */

import {
    withErrorHandling,
    withErrorHandlingSync,
    createErrorHandledFunction,
    createErrorHandledFunctionSync
} from '../../orchestrator/utils/error-handling-wrapper.js';

describe('Error Handling Wrapper', () => {
    describe('withErrorHandling', () => {
        test('should execute successful async function', async () => {
            const fn = async () => 'success';
            const result = await withErrorHandling(fn, { operation: 'test' });
            expect(result).toBe('success');
        });

        test('should throw error when no recovery strategy', async () => {
            const fn = async () => {
                throw new Error('Test error');
            };
            await expect(withErrorHandling(fn, { operation: 'test' }))
                .rejects
                .toThrow('Test error');
        });

        test('should retry on failure', async () => {
            let attempts = 0;
            const fn = async () => {
                attempts++;
                if (attempts < 3) throw new Error('Retry me');
                return 'success';
            };

            const result = await withErrorHandling(fn, { operation: 'test' }, {
                retryCount: 3,
                retryDelay: 10
            });

            expect(result).toBe('success');
            expect(attempts).toBe(3);
        });

        test('should use fallback on error', async () => {
            const fn = async () => {
                throw new Error('Primary failed');
            };
            const fallback = async () => 'fallback result';

            const result = await withErrorHandling(fn, { operation: 'test' }, {
                fallback
            });

            expect(result).toBe('fallback result');
        });

        test('should handle timeout', async () => {
            const fn = async () => {
                await new Promise(resolve => setTimeout(resolve, 100));
                return 'success';
            };

            await expect(withErrorHandling(fn, { operation: 'test' }, {
                timeout: 50
            })).rejects.toThrow('timeout');
        });
    });

    describe('withErrorHandlingSync', () => {
        test('should execute successful sync function', () => {
            const fn = () => 'success';
            const result = withErrorHandlingSync(fn, { operation: 'test' });
            expect(result).toBe('success');
        });

        test('should throw error when no recovery strategy', () => {
            const fn = () => {
                throw new Error('Test error');
            };
            expect(() => withErrorHandlingSync(fn, { operation: 'test' }))
                .toThrow('Test error');
        });

        test('should use fallback on error', () => {
            const fn = () => {
                throw new Error('Primary failed');
            };
            const fallback = () => 'fallback result';

            const result = withErrorHandlingSync(fn, { operation: 'test' }, {
                fallback
            });

            expect(result).toBe('fallback result');
        });
    });

    describe('createErrorHandledFunction', () => {
        test('should create wrapped async function', async () => {
            const fn = async (x) => x * 2;
            const wrapped = createErrorHandledFunction(fn, { operation: 'multiply' });

            const result = await wrapped(5);
            expect(result).toBe(10);
        });

        test('should handle errors in wrapped function', async () => {
            const fn = async () => {
                throw new Error('Test error');
            };
            const wrapped = createErrorHandledFunction(fn, { operation: 'test' }, {
                fallback: async () => 'fallback'
            });

            const result = await wrapped();
            expect(result).toBe('fallback');
        });
    });

    describe('createErrorHandledFunctionSync', () => {
        test('should create wrapped sync function', () => {
            const fn = (x) => x * 2;
            const wrapped = createErrorHandledFunctionSync(fn, { operation: 'multiply' });

            const result = wrapped(5);
            expect(result).toBe(10);
        });

        test('should handle errors in wrapped function', () => {
            const fn = () => {
                throw new Error('Test error');
            };
            const wrapped = createErrorHandledFunctionSync(fn, { operation: 'test' }, {
                fallback: () => 'fallback'
            });

            const result = wrapped();
            expect(result).toBe('fallback');
        });
    });

    describe('Context and Logging', () => {
        test('should pass context through error handling', async () => {
            const context = {
                component: 'test-component',
                operation: 'test-operation',
                userId: 'user123'
            };

            const fn = async () => 'success';
            const result = await withErrorHandling(fn, context);

            expect(result).toBe('success');
        });

        test('should support custom logger', async () => {
            const mockLogger = {
                error: jest.fn(),
                warn: jest.fn(),
                info: jest.fn()
            };

            const fn = async () => {
                throw new Error('Test error');
            };
            const fallback = async () => 'fallback';

            await withErrorHandling(fn, { operation: 'test' }, {
                fallback,
                logger: mockLogger,
                logLevel: 'error'
            });

            expect(mockLogger.error).toHaveBeenCalled();
        });
    });

    describe('Retry Behavior', () => {
        test('should respect retry count', async () => {
            let attempts = 0;
            const fn = async () => {
                attempts++;
                throw new Error('Always fails');
            };

            await expect(withErrorHandling(fn, { operation: 'test' }, {
                retryCount: 2,
                retryDelay: 10
            })).rejects.toThrow();

            expect(attempts).toBe(3); // Initial + 2 retries
        });

        test('should use exponential backoff', async () => {
            const delays = [];
            let lastTime = Date.now();

            const fn = async () => {
                const now = Date.now();
                delays.push(now - lastTime);
                lastTime = now;
                throw new Error('Retry me');
            };

            await expect(withErrorHandling(fn, { operation: 'test' }, {
                retryCount: 3,
                retryDelay: 10
            })).rejects.toThrow();

            // Check that delays increase (exponential backoff)
            expect(delays.length).toBe(4); // Initial + 3 retries
            expect(delays[1]).toBeGreaterThan(delays[0]);
            expect(delays[2]).toBeGreaterThan(delays[1]);
        });
    });

    describe('Fallback Behavior', () => {
        test('should not use fallback on success', async () => {
            const fn = async () => 'success';
            const fallback = async () => 'fallback';

            const result = await withErrorHandling(fn, { operation: 'test' }, {
                fallback
            });

            expect(result).toBe('success');
        });

        test('should pass error to fallback', async () => {
            const testError = new Error('Test error');
            const fn = async () => {
                throw testError;
            };
            const fallback = async (error) => {
                expect(error).toBe(testError);
                return 'fallback';
            };

            const result = await withErrorHandling(fn, { operation: 'test' }, {
                fallback
            });

            expect(result).toBe('fallback');
        });
    });
});
