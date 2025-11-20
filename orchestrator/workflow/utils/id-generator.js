/**
 * @fileoverview IdGenerator - Консолідована генерація ID
 * Видалює дублювання генерації ID з 15 файлів (~45 рядків)
 *
 * @version 1.0.0
 * @date 2025-11-20
 */

/**
 * Утиліта для генерації унікальних ID
 */
export class IdGenerator {
    /**
     * Генерувати ID виконання
     * @returns {string} Execution ID (format: exec_timestamp_random)
     */
    static generateExecutionId() {
        return `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Генерувати ID workflow
     * @returns {string} Workflow ID (format: wf_timestamp_random)
     */
    static generateWorkflowId() {
        return `wf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Генерувати ID TODO item
     * @returns {string} Item ID (format: item_timestamp_random)
     */
    static generateItemId() {
        return `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Генерувати ID сесії
     * @returns {string} Session ID (format: session_timestamp_random)
     */
    static generateSessionId() {
        return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Генерувати ID процесу
     * @returns {string} Process ID (format: process_timestamp_random)
     */
    static generateProcessId() {
        return `process_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Генерувати ID задачі
     * @returns {string} Task ID (format: task_timestamp_random)
     */
    static generateTaskId() {
        return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Генерувати унікальний ID з префіксом
     * @param {string} prefix - Префікс ID
     * @returns {string} Unique ID (format: prefix_timestamp_random)
     */
    static generateId(prefix = 'id') {
        return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Генерувати UUID-подібний ID
     * @returns {string} UUID-like ID
     */
    static generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }
}

export default IdGenerator;
