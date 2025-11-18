/**
 * @fileoverview Integration tests for Phase 1-5 workflow modules
 * Tests the complete workflow from user message to results
 *
 * @version 1.0.0
 * @date 2025-11-19
 */

describe('Workflow Integration Tests - Phase 1-5', () => {
    let container;
    let workflowEngine;
    let logger;

    beforeAll(() => {
        // Mock logger
        logger = {
            system: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
            info: jest.fn()
        };

        // Mock DI container
        container = {
            resolve: jest.fn((name) => {
                const mocks = {
                    logger,
                    llmClient: {
                        analyze: jest.fn().mockResolvedValue({ complexity: 5 })
                    },
                    mcpManager: {
                        listTools: jest.fn().mockReturnValue([]),
                        getToolsFromServers: jest.fn().mockReturnValue([])
                    },
                    wsManager: {},
                    ttsSyncManager: {},
                    localizationService: {}
                };
                return mocks[name];
            })
        };
    });

    describe('Phase 1: Core Modules', () => {
        describe('TodoBuilder', () => {
            it('should build TODO from user message', async () => {
                const { TodoBuilder } = require('../../orchestrator/workflow/core/todo-builder.js');
                const builder = new TodoBuilder({
                    llmClient: container.resolve('llmClient'),
                    logger
                });

                const todo = await builder.build('Test message');

                expect(todo).toBeDefined();
                expect(todo.id).toBeDefined();
                expect(todo.items).toBeDefined();
                expect(Array.isArray(todo.items)).toBe(true);
                expect(todo.complexity).toBeGreaterThanOrEqual(1);
                expect(todo.complexity).toBeLessThanOrEqual(10);
            });

            it('should enhance success criteria', async () => {
                const { TodoBuilder } = require('../../orchestrator/workflow/core/todo-builder.js');
                const builder = new TodoBuilder({
                    llmClient: container.resolve('llmClient'),
                    logger
                });

                const todo = await builder.build('Watch a video');

                expect(todo.items[0].success_criteria).toBeDefined();
                expect(todo.items[0].success_criteria.length).toBeGreaterThan(0);
            });
        });

        describe('ContextBuilder', () => {
            it('should create workflow context', () => {
                const { ContextBuilder } = require('../../orchestrator/workflow/utils/context-builder.js');
                const builder = new ContextBuilder({ logger });

                const session = { id: 'session_123', container };
                const context = builder.createContext(session);

                expect(context).toBeDefined();
                expect(context.id).toBeDefined();
                expect(context.session).toBe(session);
                expect(context.state).toBe('initialized');
            });

            it('should update context state', () => {
                const { ContextBuilder } = require('../../orchestrator/workflow/utils/context-builder.js');
                const builder = new ContextBuilder({ logger });

                const session = { id: 'session_123', container };
                const context = builder.createContext(session);

                builder.updateContext(context.id, { state: 'processing' });
                const updated = builder.getContext(context.id);

                expect(updated.state).toBe('processing');
            });
        });

        describe('ProcessorRegistry', () => {
            it('should register and resolve processors', () => {
                const { ProcessorRegistry } = require('../../orchestrator/workflow/utils/processor-registry.js');
                const registry = new ProcessorRegistry({ logger });

                const mockProcessor = { execute: jest.fn() };
                registry.register('test-processor', mockProcessor);

                const resolved = registry.resolve('test-processor');
                expect(resolved).toBe(mockProcessor);
            });

            it('should throw error for unregistered processor', () => {
                const { ProcessorRegistry } = require('../../orchestrator/workflow/utils/processor-registry.js');
                const registry = new ProcessorRegistry({ logger });

                expect(() => registry.resolve('non-existent')).toThrow();
            });
        });

        describe('TemplateResolver', () => {
            it('should resolve template strings', () => {
                const { TemplateResolver } = require('../../orchestrator/workflow/utils/template-resolver.js');
                const resolver = new TemplateResolver({ logger });

                const template = 'Hello {{name}}, your ID is {{id}}';
                const context = { name: 'John', id: '123' };

                const result = resolver.resolve(template, context);

                expect(result).toBe('Hello John, your ID is 123');
            });

            it('should validate template syntax', () => {
                const { TemplateResolver } = require('../../orchestrator/workflow/utils/template-resolver.js');
                const resolver = new TemplateResolver({ logger });

                const validTemplate = 'Hello {{name}}';
                const invalidTemplate = 'Hello {{name}';

                expect(resolver.validate(validTemplate).valid).toBe(true);
                expect(resolver.validate(invalidTemplate).valid).toBe(false);
            });
        });
    });

    describe('Phase 3: Planning Modules', () => {
        describe('DependencyResolver', () => {
            it('should build dependency graph', () => {
                const { DependencyResolver } = require('../../orchestrator/workflow/planning/dependency-resolver.js');
                const resolver = new DependencyResolver({ logger });

                const items = [
                    { id: 1, dependencies: [] },
                    { id: 2, dependencies: [1] },
                    { id: 3, dependencies: [1, 2] }
                ];

                const graph = resolver.buildGraph(items);

                expect(graph.nodes).toBe(3);
                expect(graph.edges).toBe(3);
            });

            it('should detect circular dependencies', () => {
                const { DependencyResolver } = require('../../orchestrator/workflow/planning/dependency-resolver.js');
                const resolver = new DependencyResolver({ logger });

                const items = [
                    { id: 1, dependencies: [2] },
                    { id: 2, dependencies: [1] }
                ];

                const result = resolver.resolve(items);

                expect(result.success).toBe(false);
                expect(result.cycles.length).toBeGreaterThan(0);
            });

            it('should resolve dependencies correctly', () => {
                const { DependencyResolver } = require('../../orchestrator/workflow/planning/dependency-resolver.js');
                const resolver = new DependencyResolver({ logger });

                const items = [
                    { id: 1, dependencies: [] },
                    { id: 2, dependencies: [1] },
                    { id: 3, dependencies: [1, 2] }
                ];

                const result = resolver.resolve(items);

                expect(result.success).toBe(true);
                expect(result.order).toBeDefined();
                expect(result.order.length).toBe(3);
            });
        });
    });

    describe('Phase 2: Verification Modules', () => {
        describe('AdaptiveVerifier', () => {
            it('should select verification strategy', () => {
                const { AdaptiveVerifier } = require('../../orchestrator/workflow/verification/adaptive-verifier.js');
                const verifier = new AdaptiveVerifier({
                    mcpVerifier: null,
                    llmVerifier: null,
                    logger
                });

                const result = verifier._checkSuccess({ success: true });
                expect(result).toBe(true);

                const result2 = verifier._checkSuccess({ success: false });
                expect(result2).toBe(false);
            });
        });
    });

    describe('Integration: Complete Workflow', () => {
        it('should execute complete workflow from message to results', async () => {
            const { WorkflowEngine } = require('../../orchestrator/workflow/core/workflow-engine.js');
            const { TodoBuilder } = require('../../orchestrator/workflow/core/todo-builder.js');
            const { TodoExecutor } = require('../../orchestrator/workflow/core/todo-executor.js');

            const todoBuilder = new TodoBuilder({
                llmClient: container.resolve('llmClient'),
                logger
            });

            const todoExecutor = new TodoExecutor({
                toolPlanner: null,
                toolExecutor: null,
                verificationEngine: null,
                logger
            });

            const engine = new WorkflowEngine({
                todoBuilder,
                todoExecutor,
                logger
            });

            const session = { id: 'session_123', container };
            const result = await engine.execute('Test workflow message', session);

            expect(result).toBeDefined();
            expect(result.success).toBeDefined();
            expect(result.workflowId).toBeDefined();
        });
    });

    describe('Error Handling', () => {
        it('should handle missing dependencies gracefully', async () => {
            const { WorkflowEngine } = require('../../orchestrator/workflow/core/workflow-engine.js');

            const engine = new WorkflowEngine({
                todoBuilder: null,
                todoExecutor: null,
                logger
            });

            expect(() => {
                new (require('../../orchestrator/workflow/core/workflow-engine.js').WorkflowEngine)({
                    logger
                });
            }).toThrow();
        });

        it('should handle invalid session', async () => {
            const { WorkflowEngine } = require('../../orchestrator/workflow/core/workflow-engine.js');
            const { TodoBuilder } = require('../../orchestrator/workflow/core/todo-builder.js');
            const { TodoExecutor } = require('../../orchestrator/workflow/core/todo-executor.js');

            const engine = new WorkflowEngine({
                todoBuilder: new TodoBuilder({ llmClient: container.resolve('llmClient'), logger }),
                todoExecutor: new TodoExecutor({ logger }),
                logger
            });

            const result = await engine.execute('Test', null);

            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
        });
    });

    describe('Performance', () => {
        it('should complete workflow within reasonable time', async () => {
            const { WorkflowEngine } = require('../../orchestrator/workflow/core/workflow-engine.js');
            const { TodoBuilder } = require('../../orchestrator/workflow/core/todo-builder.js');
            const { TodoExecutor } = require('../../orchestrator/workflow/core/todo-executor.js');

            const engine = new WorkflowEngine({
                todoBuilder: new TodoBuilder({ llmClient: container.resolve('llmClient'), logger }),
                todoExecutor: new TodoExecutor({ logger }),
                logger
            });

            const session = { id: 'session_123', container };
            const startTime = Date.now();

            await engine.execute('Test message', session);

            const duration = Date.now() - startTime;
            expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
        });
    });
});
