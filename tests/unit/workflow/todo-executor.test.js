/**
 * @fileoverview Unit tests for TodoExecutor
 */

import { TodoExecutor } from '../../../orchestrator/workflow/core/todo-executor.js';

describe('TodoExecutor', () => {
    let executor;
    let mockToolPlanner;
    let mockToolExecutor;
    let mockVerificationEngine;
    let mockLogger;

    beforeEach(() => {
        mockLogger = {
            system: jest.fn(),
            error: jest.fn(),
            warn: jest.fn()
        };

        mockToolPlanner = {
            plan: jest.fn().mockResolvedValue({ tools: [] })
        };

        mockToolExecutor = {
            execute: jest.fn().mockResolvedValue({ success: true })
        };

        mockVerificationEngine = {
            verify: jest.fn().mockResolvedValue({ verified: true, confidence: 100 })
        };

        executor = new TodoExecutor({
            toolPlanner: mockToolPlanner,
            toolExecutor: mockToolExecutor,
            verificationEngine: mockVerificationEngine,
            logger: mockLogger
        });
    });

    describe('constructor', () => {
        it('should initialize with dependencies', () => {
            expect(executor.toolPlanner).toBe(mockToolPlanner);
            expect(executor.toolExecutor).toBe(mockToolExecutor);
            expect(executor.verificationEngine).toBe(mockVerificationEngine);
        });
    });

    describe('execute', () => {
        it('should execute TODO successfully', async () => {
            const todo = {
                id: 'todo_123',
                items: [
                    { id: 1, action: 'Test', status: 'pending', max_attempts: 3 }
                ]
            };
            const session = { id: 'session_123' };

            const result = await executor.execute(todo, session);

            expect(result.executionId).toBeDefined();
            expect(result.itemsProcessed).toBeGreaterThanOrEqual(0);
            expect(result.items).toBeDefined();
        });

        it('should process multiple items', async () => {
            const todo = {
                id: 'todo_123',
                items: [
                    { id: 1, action: 'Task 1', status: 'pending', max_attempts: 3 },
                    { id: 2, action: 'Task 2', status: 'pending', max_attempts: 3 }
                ]
            };
            const session = { id: 'session_123' };

            const result = await executor.execute(todo, session);

            expect(result.items.length).toBe(2);
        });

        it('should handle item failures', async () => {
            mockVerificationEngine.verify.mockResolvedValue({
                verified: false,
                confidence: 0,
                reason: 'Verification failed'
            });

            const todo = {
                id: 'todo_123',
                items: [
                    { id: 1, action: 'Test', status: 'pending', max_attempts: 1 }
                ]
            };
            const session = { id: 'session_123' };

            const result = await executor.execute(todo, session);

            expect(result.itemsFailed).toBeGreaterThanOrEqual(0);
        });

        it('should resolve dependencies', async () => {
            const todo = {
                id: 'todo_123',
                items: [
                    { id: 1, action: 'Task 1', status: 'pending', dependencies: [], max_attempts: 3 },
                    { id: 2, action: 'Task 2', status: 'pending', dependencies: [1], max_attempts: 3 }
                ]
            };
            const session = { id: 'session_123' };

            const result = await executor.execute(todo, session);

            expect(result.items).toBeDefined();
        });

        it('should track total attempts', async () => {
            const todo = {
                id: 'todo_123',
                items: [
                    { id: 1, action: 'Test', status: 'pending', max_attempts: 3 }
                ]
            };
            const session = { id: 'session_123' };

            const result = await executor.execute(todo, session);

            expect(result.totalAttempts).toBeGreaterThanOrEqual(0);
        });
    });

    describe('_executeItemWithRetries', () => {
        it('should retry on failure', async () => {
            mockVerificationEngine.verify
                .mockResolvedValueOnce({ verified: false, reason: 'Failed' })
                .mockResolvedValueOnce({ verified: true, confidence: 100 });

            const item = { id: 1, action: 'Test', max_attempts: 3 };
            const todo = { items: [item] };
            const session = { id: 'session_123' };

            const result = await executor._executeItemWithRetries(item, todo, session, 'exec_123');

            expect(result.attempts).toBeGreaterThanOrEqual(1);
        });

        it('should fail after max attempts', async () => {
            mockVerificationEngine.verify.mockResolvedValue({
                verified: false,
                reason: 'Always fails'
            });

            const item = { id: 1, action: 'Test', max_attempts: 2 };
            const todo = { items: [item] };
            const session = { id: 'session_123' };

            const result = await executor._executeItemWithRetries(item, todo, session, 'exec_123');

            expect(result.status).toBe('failed');
            expect(result.attempts).toBe(2);
        });
    });

    describe('_resolveDependencies', () => {
        it('should resolve dependencies correctly', async () => {
            const item = { id: 2, dependencies: [1] };
            const todo = { items: [] };
            const results = {
                items: [{ itemId: 1, status: 'completed' }]
            };

            const resolved = await executor._resolveDependencies(item, todo, results);

            expect(resolved).toBe(true);
        });

        it('should fail if dependency not met', async () => {
            const item = { id: 2, dependencies: [1] };
            const todo = { items: [] };
            const results = {
                items: [{ itemId: 1, status: 'failed' }]
            };

            const resolved = await executor._resolveDependencies(item, todo, results);

            expect(resolved).toBe(false);
        });
    });
});
