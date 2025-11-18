/**
 * @fileoverview Unit tests for TodoBuilder
 */

import { TodoBuilder } from '../../../orchestrator/workflow/core/todo-builder.js';

describe('TodoBuilder', () => {
    let builder;
    let mockLlmClient;
    let mockLogger;

    beforeEach(() => {
        mockLogger = {
            system: jest.fn(),
            error: jest.fn(),
            warn: jest.fn()
        };

        mockLlmClient = {
            analyze: jest.fn().mockResolvedValue({ complexity: 5 })
        };

        builder = new TodoBuilder({
            llmClient: mockLlmClient,
            logger: mockLogger
        });
    });

    describe('constructor', () => {
        it('should initialize with dependencies', () => {
            expect(builder.llmClient).toBe(mockLlmClient);
            expect(builder.logger).toBe(mockLogger);
        });

        it('should throw if llmClient is missing', () => {
            expect(() => {
                new TodoBuilder({ logger: mockLogger });
            }).toThrow('TodoBuilder requires llmClient dependency');
        });
    });

    describe('build', () => {
        it('should build TODO successfully', async () => {
            const userMessage = 'Create a new feature';

            const todo = await builder.build(userMessage);

            expect(todo.id).toBeDefined();
            expect(todo.request).toBe(userMessage);
            expect(todo.items).toBeDefined();
            expect(Array.isArray(todo.items)).toBe(true);
            expect(todo.complexity).toBeDefined();
        });

        it('should analyze complexity', async () => {
            const userMessage = 'Create a new feature. Modify the API. Test everything.';

            const todo = await builder.build(userMessage);

            expect(todo.complexity).toBeGreaterThanOrEqual(1);
            expect(todo.complexity).toBeLessThanOrEqual(10);
        });

        it('should set mode based on complexity', async () => {
            const simpleTodo = await builder.build('Simple task');
            expect(simpleTodo.mode).toBe('standard');

            const complexTodo = await builder.build(
                'Create feature. Modify API. Update tests. Refactor code. Optimize performance. Debug issues. Deploy changes.'
            );
            expect(complexTodo.mode).toMatch(/standard|extended/);
        });

        it('should generate TODO items', async () => {
            const todo = await builder.build('Test message');

            expect(todo.items.length).toBeGreaterThan(0);
            expect(todo.items[0].id).toBeDefined();
            expect(todo.items[0].action).toBeDefined();
            expect(todo.items[0].status).toBe('pending');
        });

        it('should enhance success criteria', async () => {
            const todo = await builder.build('Watch a video');

            expect(todo.items[0].success_criteria).toBeDefined();
            expect(todo.items[0].success_criteria.length).toBeGreaterThan(0);
        });

        it('should handle errors gracefully', async () => {
            mockLlmClient.analyze = jest.fn().mockRejectedValue(new Error('LLM failed'));

            const todo = await builder.build('Test');

            expect(todo.items).toBeDefined();
            expect(todo.complexity).toBe(5); // Default complexity
        });
    });

    describe('_analyzeComplexity', () => {
        it('should return complexity between 1 and 10', async () => {
            const complexity = await builder._analyzeComplexity('Test message');

            expect(complexity).toBeGreaterThanOrEqual(1);
            expect(complexity).toBeLessThanOrEqual(10);
        });

        it('should handle empty message', async () => {
            const complexity = await builder._analyzeComplexity('');

            expect(complexity).toBe(5); // Default
        });
    });

    describe('_enhanceCriteria', () => {
        it('should enhance video-related criteria', () => {
            const items = [{
                action: 'Watch a video',
                success_criteria: 'Video plays'
            }];

            builder._enhanceCriteria(items);

            expect(items[0].success_criteria).toContain('playback');
        });

        it('should enhance fullscreen criteria', () => {
            const items = [{
                action: 'Go fullscreen',
                success_criteria: 'Screen is full'
            }];

            builder._enhanceCriteria(items);

            expect(items[0].success_criteria).toContain('fullscreen');
        });
    });
});
