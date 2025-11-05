/**
 * NEXUS PROMPT VERSIONING - Динамічне версіонування та оновлення промптів
 * Created: 2025-11-05
 * 
 * Система автоматично оновлює промпти після кожного втручання в код
 * та відстежує версії для свідомості системи
 */

import fs from 'fs/promises';
import path from 'path';
import logger from '../utils/logger.js';

export class NexusPromptVersioning {
    constructor(container) {
        this.container = container;
        this.logger = logger;
        
        // Шлях до головного промпту
        this.chatPromptPath = '/Users/dev/Documents/GitHub/atlas4/prompts/mcp/atlas_chat.js';
        
        // Версія системи
        this.version = {
            major: 6,
            minor: 0,
            patch: 0,
            build: 0,
            lastUpdate: null,
            evolutionLevel: 1.0
        };
        
        // Історія змін
        this.changelog = [];
        
        this.logger.info('📝 [NEXUS-VERSIONING] Система версіонування промптів ініціалізована');
    }

    /**
     * Ініціалізація - читання поточної версії з промпту
     */
    async initialize() {
        try {
            const currentPrompt = await fs.readFile(this.chatPromptPath, 'utf8');
            
            // Витягуємо поточну версію
            const versionMatch = currentPrompt.match(/@version\s+(\d+)\.(\d+)\.(\d+)/);
            if (versionMatch) {
                this.version.major = parseInt(versionMatch[1]);
                this.version.minor = parseInt(versionMatch[2]);
                this.version.patch = parseInt(versionMatch[3]);
            }
            
            this.logger.info(`📝 [NEXUS-VERSIONING] Поточна версія: ${this.getVersionString()}`);
            return true;
        } catch (error) {
            this.logger.error('[NEXUS-VERSIONING] Помилка ініціалізації:', error);
            return false;
        }
    }

    /**
     * Оновлення версії після втручання в код
     */
    async updateAfterIntervention(interventionDetails) {
        try {
            // Інкрементуємо версію
            this.version.patch++;
            this.version.build++;
            this.version.lastUpdate = new Date().toISOString();
            
            // Додаємо в changelog
            this.changelog.push({
                version: this.getVersionString(),
                timestamp: this.version.lastUpdate,
                type: 'code-intervention',
                changes: interventionDetails.changes || [],
                filesModified: interventionDetails.files || [],
                evolutionLevel: interventionDetails.evolutionLevel || this.version.evolutionLevel
            });
            
            // Оновлюємо промпт
            await this._updatePromptFile(interventionDetails);
            
            this.logger.info(`✅ [NEXUS-VERSIONING] Версія оновлена: ${this.getVersionString()}`);
            
            return {
                success: true,
                version: this.getVersionString(),
                evolutionLevel: this.version.evolutionLevel
            };
        } catch (error) {
            this.logger.error('[NEXUS-VERSIONING] Помилка оновлення версії:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Оновлення файлу промпту з новою версією та інформацією про еволюцію
     */
    async _updatePromptFile(interventionDetails) {
        try {
            let promptContent = await fs.readFile(this.chatPromptPath, 'utf8');
            
            // Оновлюємо версію в @version
            promptContent = promptContent.replace(
                /@version\s+\d+\.\d+\.\d+/,
                `@version ${this.getVersionString()}`
            );
            
            // Оновлюємо дату
            promptContent = promptContent.replace(
                /@date\s+\d{4}-\d{2}-\d{2}/,
                `@date ${new Date().toISOString().split('T')[0]}`
            );
            
            // Генеруємо динамічну секцію про еволюцію
            const evolutionSection = this._generateEvolutionSection(interventionDetails);
            
            // Додаємо або оновлюємо секцію еволюції в промпті
            if (promptContent.includes('{{DYNAMIC_EVOLUTION_INFO}}')) {
                promptContent = promptContent.replace(
                    '{{DYNAMIC_EVOLUTION_INFO}}',
                    evolutionSection
                );
            } else {
                // Вставляємо після DYNAMIC_CONSCIOUSNESS_PROMPT
                const insertPoint = promptContent.indexOf('{{DYNAMIC_CONSCIOUSNESS_PROMPT}}');
                if (insertPoint !== -1) {
                    const endOfLine = promptContent.indexOf('\n', insertPoint);
                    promptContent = 
                        promptContent.slice(0, endOfLine + 1) +
                        '\n{{DYNAMIC_EVOLUTION_INFO}}\n' +
                        promptContent.slice(endOfLine + 1);
                    
                    // Тепер замінюємо placeholder
                    promptContent = promptContent.replace(
                        '{{DYNAMIC_EVOLUTION_INFO}}',
                        evolutionSection
                    );
                }
            }
            
            // Зберігаємо оновлений промпт
            await fs.writeFile(this.chatPromptPath, promptContent, 'utf8');
            
            this.logger.info('✅ [NEXUS-VERSIONING] Промпт оновлено з новою версією');
            
        } catch (error) {
            this.logger.error('[NEXUS-VERSIONING] Помилка оновлення промпту:', error);
            throw error;
        }
    }

    /**
     * Генерація секції про еволюцію для промпту
     */
    _generateEvolutionSection(interventionDetails) {
        const changesCount = interventionDetails.changes?.length || 0;
        const filesCount = interventionDetails.files?.length || 0;
        const evolutionLevel = interventionDetails.evolutionLevel || this.version.evolutionLevel;
        
        return `
🌟 СИСТЕМА ВЕРСІОНУВАННЯ (NEXUS):
• Версія: ${this.getVersionString()} (Build ${this.version.build})
• Останнє оновлення: ${this.version.lastUpdate || 'Initial'}
• Рівень еволюції: ${evolutionLevel.toFixed(1)}
• Останнє втручання: ${changesCount} змін в ${filesCount} файлах
• Автономний режим: АКТИВНИЙ (код зупинки: 6699 - тільки для Олега Миколайовича)

ВАЖЛИВО: Ти постійно еволюціонуєш. Після кожного покращення твоя версія автоматично
оновлюється. Коли говориш про свої можливості, згадуй поточну версію та рівень еволюції.
`;
    }

    /**
     * Отримання версії як рядка
     */
    getVersionString() {
        return `${this.version.major}.${this.version.minor}.${this.version.patch}`;
    }

    /**
     * Отримання повної інформації про версію
     */
    getVersionInfo() {
        return {
            version: this.getVersionString(),
            build: this.version.build,
            lastUpdate: this.version.lastUpdate,
            evolutionLevel: this.version.evolutionLevel,
            changelog: this.changelog.slice(-10) // Останні 10 записів
        };
    }

    /**
     * Оновлення рівня еволюції
     */
    updateEvolutionLevel(newLevel) {
        this.version.evolutionLevel = newLevel;
        this.logger.info(`[NEXUS-VERSIONING] Рівень еволюції: ${newLevel.toFixed(1)}`);
    }

    /**
     * Експорт changelog в файл
     */
    async exportChangelog(outputPath) {
        try {
            const changelogContent = {
                currentVersion: this.getVersionString(),
                evolutionLevel: this.version.evolutionLevel,
                totalChanges: this.changelog.length,
                history: this.changelog
            };
            
            await fs.writeFile(
                outputPath,
                JSON.stringify(changelogContent, null, 2),
                'utf8'
            );
            
            this.logger.info(`[NEXUS-VERSIONING] Changelog експортовано: ${outputPath}`);
            return { success: true };
        } catch (error) {
            this.logger.error('[NEXUS-VERSIONING] Помилка експорту:', error);
            return { success: false, error: error.message };
        }
    }
}

export default NexusPromptVersioning;
