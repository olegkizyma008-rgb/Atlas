/**
 * NEXUS MEMORY MANAGER
 * Зберігає та відновлює пам'ять системи між перезапусками
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEFAULT_MEMORY = {
    version: '1.0.0',
    lastUpdated: null,
    state: {
        evolutionLevel: 1,
        totalImprovements: 0,
        cyclesCompleted: 0,
        testsRun: 0,
        testsPassed: 0,
        errorsFixed: 0
    },
    selfAwareness: {
        lastAnalysis: null,
        improvements: [],
        learnings: [],
        errors: []
    },
    interactions: [],
    improvements: [],
    restarts: []
};

export class NexusMemoryManager {
    constructor(options = {}) {
        this.memoryDir = options.memoryDir || path.resolve(__dirname, '../../logs');
        this.memoryFile = options.memoryFile || path.join(this.memoryDir, 'nexus-memory.json');
        this.memory = { ...DEFAULT_MEMORY };
        this.isLoaded = false;
        this.maxInteractions = options.maxInteractions || 200;
        this.maxImprovements = options.maxImprovements || 200;
        this.maxRestarts = options.maxRestarts || 200;
    }

    async initialize() {
        await this._ensureDirectory();
        await this._loadMemory();
        await this._registerRestart();
    }

    getStateSnapshot() {
        return this.memory.state;
    }

    getSelfAwareness() {
        return this.memory.selfAwareness;
    }

    getInteractions(limit = 20) {
        return this.memory.interactions.slice(-limit);
    }

    async recordInteraction({ role, message, response = null, metadata = {} }) {
        this.memory.interactions.push({
            timestamp: new Date().toISOString(),
            role,
            message,
            response,
            metadata
        });

        if (this.memory.interactions.length > this.maxInteractions) {
            this.memory.interactions.splice(0, this.memory.interactions.length - this.maxInteractions);
        }

        this.memory.lastUpdated = new Date().toISOString();
        await this._persist();
    }

    async recordImprovement({ description, cycle, evolutionLevel, details = {} }) {
        this.memory.improvements.push({
            timestamp: new Date().toISOString(),
            description,
            cycle,
            evolutionLevel,
            details
        });

        if (this.memory.improvements.length > this.maxImprovements) {
            this.memory.improvements.splice(0, this.memory.improvements.length - this.maxImprovements);
        }

        this.memory.state.totalImprovements += 1;
        this.memory.state.evolutionLevel = evolutionLevel ?? this.memory.state.evolutionLevel;
        this.memory.lastUpdated = new Date().toISOString();
        await this._persist();
    }

    async updateState(statePatch = {}) {
        this.memory.state = {
            ...this.memory.state,
            ...statePatch
        };
        this.memory.lastUpdated = new Date().toISOString();
        await this._persist();
    }

    async updateSelfAwareness(patch = {}) {
        this.memory.selfAwareness = {
            ...this.memory.selfAwareness,
            ...patch
        };
        this.memory.lastUpdated = new Date().toISOString();
        await this._persist();
    }

    async _ensureDirectory() {
        try {
            await fs.mkdir(this.memoryDir, { recursive: true });
        } catch (error) {
            logger.error('[NEXUS-MEMORY] Не вдалося створити директорію пам\'яті:', error);
        }
    }

    async _loadMemory() {
        try {
            const raw = await fs.readFile(this.memoryFile, 'utf8');
            this.memory = JSON.parse(raw);
            this.isLoaded = true;
            logger.info('[NEXUS-MEMORY] Пам\'ять успішно завантажено');
        } catch (error) {
            if (error.code === 'ENOENT') {
                logger.warn('[NEXUS-MEMORY] Файл пам\'яті не знайдено, створюю новий');
                await this._persist();
                this.isLoaded = true;
            } else {
                logger.error('[NEXUS-MEMORY] Помилка завантаження пам\'яті:', error);
            }
        }
    }

    async _persist() {
        try {
            await fs.writeFile(this.memoryFile, JSON.stringify(this.memory, null, 2), 'utf8');
        } catch (error) {
            logger.error('[NEXUS-MEMORY] Не вдалося зберегти пам\'ять:', error);
        }
    }

    async _registerRestart() {
        this.memory.restarts.push({
            timestamp: new Date().toISOString()
        });

        if (this.memory.restarts.length > this.maxRestarts) {
            this.memory.restarts.splice(0, this.memory.restarts.length - this.maxRestarts);
        }

        await this._persist();
    }
}

export default NexusMemoryManager;
