/**
 * @fileoverview Tests for IdGenerator
 * @version 1.0.0
 * @date 2025-11-21
 */

import IdGenerator from '../utils/id-generator.js';

describe('IdGenerator', () => {
    describe('generateExecutionId', () => {
        it('should generate unique execution IDs', () => {
            const id1 = IdGenerator.generateExecutionId();
            const id2 = IdGenerator.generateExecutionId();

            expect(id1).toMatch(/^exec_\d+_[a-z0-9]+$/);
            expect(id2).toMatch(/^exec_\d+_[a-z0-9]+$/);
            expect(id1).not.toBe(id2);
        });
    });

    describe('generateWorkflowId', () => {
        it('should generate unique workflow IDs', () => {
            const id1 = IdGenerator.generateWorkflowId();
            const id2 = IdGenerator.generateWorkflowId();

            expect(id1).toMatch(/^wf_\d+_[a-z0-9]+$/);
            expect(id2).toMatch(/^wf_\d+_[a-z0-9]+$/);
            expect(id1).not.toBe(id2);
        });
    });

    describe('generateItemId', () => {
        it('should generate unique item IDs', () => {
            const id1 = IdGenerator.generateItemId();
            const id2 = IdGenerator.generateItemId();

            expect(id1).toMatch(/^item_\d+_[a-z0-9]+$/);
            expect(id2).toMatch(/^item_\d+_[a-z0-9]+$/);
            expect(id1).not.toBe(id2);
        });
    });

    describe('generateSessionId', () => {
        it('should generate unique session IDs', () => {
            const id1 = IdGenerator.generateSessionId();
            const id2 = IdGenerator.generateSessionId();

            expect(id1).toMatch(/^session_\d+_[a-z0-9]+$/);
            expect(id2).toMatch(/^session_\d+_[a-z0-9]+$/);
            expect(id1).not.toBe(id2);
        });
    });

    describe('generateProcessId', () => {
        it('should generate unique process IDs', () => {
            const id1 = IdGenerator.generateProcessId();
            const id2 = IdGenerator.generateProcessId();

            expect(id1).toMatch(/^process_\d+_[a-z0-9]+$/);
            expect(id2).toMatch(/^process_\d+_[a-z0-9]+$/);
            expect(id1).not.toBe(id2);
        });
    });

    describe('generateTaskId', () => {
        it('should generate unique task IDs', () => {
            const id1 = IdGenerator.generateTaskId();
            const id2 = IdGenerator.generateTaskId();

            expect(id1).toMatch(/^task_\d+_[a-z0-9]+$/);
            expect(id2).toMatch(/^task_\d+_[a-z0-9]+$/);
            expect(id1).not.toBe(id2);
        });
    });

    describe('generateId', () => {
        it('should generate ID with custom prefix', () => {
            const id = IdGenerator.generateId('custom');

            expect(id).toMatch(/^custom_\d+_[a-z0-9]+$/);
        });

        it('should use default prefix', () => {
            const id = IdGenerator.generateId();

            expect(id).toMatch(/^id_\d+_[a-z0-9]+$/);
        });
    });

    describe('generateUUID', () => {
        it('should generate UUID-like ID', () => {
            const uuid = IdGenerator.generateUUID();

            expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
        });

        it('should generate unique UUIDs', () => {
            const uuid1 = IdGenerator.generateUUID();
            const uuid2 = IdGenerator.generateUUID();

            expect(uuid1).not.toBe(uuid2);
        });
    });
});
