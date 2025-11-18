/**
 * @fileoverview Unit tests for WorkflowEngine
 */

import { WorkflowEngine } from '../../../orchestrator/workflow/core/workflow-engine.js';

describe('WorkflowEngine', () => {
    let engine;
    let mockTodoBuilder;
    let mockTodoExecutor;
    let mockLogger;

    beforeEach(() => {
        mockLogger = {
            system: jest.fn(),
            error: jest.fn(),
            warn: jest.fn()
        };

        mockTodoBuilder = {
            build: jest.fn().mockResolvedValue({
                id: 'todo_123',
                items: [
                    { id: 1, action: 'Test action', status: 'pending' }
                ],
                complexity: 5
            })
        };

        mockTodoExecutor = {
            execute: jest.fn().mockResolvedValue({
                itemsProcessed: 1,
                itemsFailed: 0,
                totalAttempts: 1,
                items: []
            })
        };

        engine = new WorkflowEngine({
            todoBuilder: mockTodoBuilder,
            todoExecutor: mockTodoExecutor,
            logger: mockLogger
        });
    });

    describe('constructor', () => {
        it('should initialize with dependencies', () => {
            expect(engine.todoBuilder).toBe(mockTodoBuilder);
            expect(engine.todoExecutor).toBe(mockTodoExecutor);
            expect(engine.logger).toBe(mockLogger);
        });

        it('should throw if todoBuilder is missing', () => {
            expect(() => {
                new WorkflowEngine({
                    todoExecutor: mockTodoExecutor,
                    logger: mockLogger
                });
            }).toThrow('WorkflowEngine requires todoBuilder dependency');
        });

        it('should throw if todoExecutor is missing', () => {
            expect(() => {
                new WorkflowEngine({
                    todoBuilder: mockTodoBuilder,
                    logger: mockLogger
                });
            }).toThrow('WorkflowEngine requires todoExecutor dependency');
        });
    });

    describe('execute', () => {
        it('should execute workflow successfully', async () => {
            const session = { id: 'session_123', container: {} };
            const userMessage = 'Test message';

            const result = await engine.execute(userMessage, session);

            expect(result.success).toBe(true);
            expect(result.workflowId).toBeDefined();
            expect(result.todo).toBeDefined();
            expect(result.results).toBeDefined();
            expect(result.metrics).toBeDefined();
        });

        it('should call todoBuilder with correct parameters', async () => {
            const session = { id: 'session_123', container: {} };
            const userMessage = 'Test message';

            await engine.execute(userMessage, session);

            expect(mockTodoBuilder.build).toHaveBeenCalledWith(
                userMessage,
                expect.objectContaining({
                    sessionId: 'session_123'
                })
            );
        });

        it('should call todoExecutor with built TODO', async () => {
            const session = { id: 'session_123', container: {} };
            const userMessage = 'Test message';

            await engine.execute(userMessage, session);

            expect(mockTodoExecutor.execute).toHaveBeenCalledWith(
                expect.objectContaining({
                    id: 'todo_123',
                    items: expect.any(Array)
                }),
                session,
                expect.any(Object)
            );
        });

        it('should handle errors gracefully', async () => {
            mockTodoBuilder.build.mockRejectedValue(new Error('Build failed'));

            const session = { id: 'session_123', container: {} };
            const result = await engine.execute('Test', session);

            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
        });

        it('should validate session', async () => {
            const result = await engine.execute('Test', null);

            expect(result.success).toBe(false);
            expect(result.error).toContain('Session');
        });
    });

    describe('getStatus', () => {
        it('should return status object', () => {
            const status = engine.getStatus('wf_123');

            expect(status.workflowId).toBe('wf_123');
            expect(status.timestamp).toBeDefined();
        });
    });
});
