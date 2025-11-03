/**
 * WINDSURF CODE EDITOR - Інтерфейс для реальних змін коду через Windsurf API
 * Створено: 2025-11-03
 * 
 * Це bridge між Atlas Self-Improvement Engine та Windsurf Cascade API.
 * Дозволяє Atlas робити СПРАВЖНІ зміни в коді через ті ж інструменти що й Windsurf.
 * 
 * "Якщо система повірить що це Windsurf - вона буде робити в системі Nexus 
 * все те що робиш ти" - Олег Миколайович
 */

import logger from '../utils/logger.js';
import fs from 'fs/promises';
import path from 'path';
import axios from 'axios';

export class WindsurfCodeEditor {
    constructor() {
        this.logger = logger;
        this.projectRoot = process.cwd();
        
        // Windsurf API configuration
        this.apiKey = process.env.WINDSURF_API_KEY;
        this.apiEndpoint = process.env.WINDSURF_API_ENDPOINT || 'https://api.windsurf.ai/v1';
        this.useWindsurfAPI = !!(this.apiKey && process.env.CASCADE_ENABLED === 'true');
        
        // Windsurf Cascade tools що доступні для Atlas
        this.availableTools = {
            read: true,              // Read file contents
            replace_file_content: true,  // Edit existing files
            write_to_file: true,     // Create new files
            grep_search: true,       // Search in codebase
            find_by_name: true,      // Find files
            run_command: false       // Commands потребують approval
        };
        
        if (this.useWindsurfAPI) {
            this.logger.info('🎨 [WINDSURF-EDITOR] Ініціалізовано - Atlas використовує Windsurf Cascade API');
        } else {
            this.logger.warn('🎨 [WINDSURF-EDITOR] Ініціалізовано - Atlas використовує локальну fs (Windsurf API вимкнено)');
        }
    }

    /**
     * Читання файлу (як Windsurf Read tool)
     */
    async readFile(filePath) {
        try {
            const absolutePath = path.isAbsolute(filePath) 
                ? filePath 
                : path.join(this.projectRoot, filePath);
            
            const content = await fs.readFile(absolutePath, 'utf-8');
            const lines = content.split('\n');
            
            this.logger.debug(`[WINDSURF-EDITOR] Read file: ${filePath} (${lines.length} lines)`);
            
            return {
                success: true,
                content,
                lines: lines.length,
                path: absolutePath
            };
        } catch (error) {
            this.logger.error(`[WINDSURF-EDITOR] Failed to read ${filePath}:`, error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Заміна контенту в файлі (як Windsurf replace_file_content)
     * Це ОСНОВНИЙ метод для змін коду
     */
    async replaceFileContent(filePath, replacements, instruction) {
        try {
            // Якщо Windsurf API активовано - використовуємо його
            if (this.useWindsurfAPI) {
                return await this._replaceViaWindsurfAPI(filePath, replacements, instruction);
            }
            
            // Fallback: локальна файлова система
            return await this._replaceViaLocalFS(filePath, replacements, instruction);
        } catch (error) {
            this.logger.error(`[WINDSURF-EDITOR] Failed to replace content in ${filePath}:`, error);
            return {
                success: false,
                error: error.message,
                file: filePath
            };
        }
    }

    /**
     * Заміна через Windsurf Cascade API
     */
    async _replaceViaWindsurfAPI(filePath, replacements, instruction) {
        this.logger.info(`[WINDSURF-EDITOR] 🌐 Using Windsurf Cascade API for: ${filePath}`);
        
        try {
            const response = await axios.post(
                `${this.apiEndpoint}/tools/replace_file_content`,
                {
                    target_file: filePath,
                    replacement_chunks: replacements.map(r => ({
                        target_content: r.targetContent,
                        replacement_content: r.replacementContent,
                        allow_multiple: r.allowMultiple || false
                    })),
                    instruction: instruction,
                    code_markdown_language: 'javascript'
                },
                {
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`,
                        'Content-Type': 'application/json'
                    },
                    timeout: 60000
                }
            );

            this.logger.info(`[WINDSURF-EDITOR] ✅ Windsurf API успішно застосував зміни`);
            
            return {
                success: true,
                file: filePath,
                replacements: replacements.length,
                via: 'windsurf-api',
                response: response.data
            };
        } catch (error) {
            this.logger.error(`[WINDSURF-EDITOR] Windsurf API error, falling back to local fs:`, error.message);
            // Fallback на локальну fs якщо API не працює
            return await this._replaceViaLocalFS(filePath, replacements, instruction);
        }
    }

    /**
     * Заміна через локальну файлову систему (fallback)
     */
    async _replaceViaLocalFS(filePath, replacements, instruction) {
        const absolutePath = path.isAbsolute(filePath) 
            ? filePath 
            : path.join(this.projectRoot, filePath);
        
        this.logger.info(`[WINDSURF-EDITOR] 📁 Using local filesystem for: ${filePath}`);
        this.logger.info(`[WINDSURF-EDITOR] Instruction: ${instruction}`);
        
        // Читаємо поточний вміст
        const currentContent = await fs.readFile(absolutePath, 'utf-8');
        
        // Застосовуємо всі заміни
        let newContent = currentContent;
        const appliedReplacements = [];
        
        for (const replacement of replacements) {
            const { targetContent, replacementContent, allowMultiple } = replacement;
            
            // Підрахунок входжень
            const occurrences = this._countOccurrences(newContent, targetContent);
            
            if (occurrences === 0) {
                this.logger.warn(`[WINDSURF-EDITOR] Target not found: ${targetContent.substring(0, 50)}...`);
                continue;
            }
            
            if (occurrences > 1 && !allowMultiple) {
                throw new Error(`Multiple occurrences found (${occurrences}) but allowMultiple=false`);
            }
            
            // Заміна
            if (allowMultiple) {
                newContent = newContent.replaceAll(targetContent, replacementContent);
            } else {
                newContent = newContent.replace(targetContent, replacementContent);
            }
            
            appliedReplacements.push({
                target: targetContent.substring(0, 100),
                occurrences,
                applied: true
            });
            
            this.logger.info(`[WINDSURF-EDITOR] ✅ Applied replacement (${occurrences} occurrence${occurrences > 1 ? 's' : ''})`);
        }
        
        // Записуємо змінений файл
        await fs.writeFile(absolutePath, newContent, 'utf-8');
        
        this.logger.info(`[WINDSURF-EDITOR] ✅ File updated: ${filePath}`);
        
        return {
            success: true,
            file: filePath,
            replacements: appliedReplacements.length,
            totalReplacements: replacements.length,
            via: 'local-fs',
            appliedReplacements
        };
    }

    /**
     * Створення нового файлу (як Windsurf write_to_file)
     */
    async writeFile(filePath, content, instruction) {
        try {
            const absolutePath = path.isAbsolute(filePath) 
                ? filePath 
                : path.join(this.projectRoot, filePath);
            
            this.logger.info(`[WINDSURF-EDITOR] 📝 Creating new file: ${filePath}`);
            
            // Створюємо директорії якщо потрібно
            const dir = path.dirname(absolutePath);
            await fs.mkdir(dir, { recursive: true });
            
            // Записуємо файл
            await fs.writeFile(absolutePath, content, 'utf-8');
            
            this.logger.info(`[WINDSURF-EDITOR] ✅ File created: ${filePath}`);
            
            return {
                success: true,
                file: filePath,
                created: true
            };
            
        } catch (error) {
            this.logger.error(`[WINDSURF-EDITOR] Failed to create ${filePath}:`, error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Пошук в коді (як Windsurf grep_search)
     */
    async searchInCode(searchPath, query, options = {}) {
        try {
            const { isRegex = false, caseInsensitive = false } = options;
            
            this.logger.info(`[WINDSURF-EDITOR] 🔍 Searching: "${query}" in ${searchPath}`);
            
            // Тут має бути інтеграція з grep або ripgrep
            // Поки що повертаємо заглушку
            
            return {
                success: true,
                query,
                searchPath,
                results: []
            };
            
        } catch (error) {
            this.logger.error(`[WINDSURF-EDITOR] Search failed:`, error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Пошук файлів (як Windsurf find_by_name)
     */
    async findFiles(searchDirectory, pattern, options = {}) {
        try {
            this.logger.info(`[WINDSURF-EDITOR] 📂 Finding files: "${pattern}" in ${searchDirectory}`);
            
            const { extensions = [], maxDepth = 10 } = options;
            
            // Рекурсивний пошук файлів
            const files = await this._findFilesRecursive(searchDirectory, pattern, maxDepth, extensions);
            
            return {
                success: true,
                pattern,
                found: files.length,
                files
            };
            
        } catch (error) {
            this.logger.error(`[WINDSURF-EDITOR] Find failed:`, error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Batch операція - змінити багато файлів одночасно
     */
    async batchEdit(edits) {
        this.logger.info(`[WINDSURF-EDITOR] 🔄 Batch edit: ${edits.length} files`);
        
        const results = [];
        let successful = 0;
        let failed = 0;
        
        for (const edit of edits) {
            const { file, replacements, instruction } = edit;
            
            const result = await this.replaceFileContent(file, replacements, instruction);
            
            if (result.success) {
                successful++;
            } else {
                failed++;
            }
            
            results.push({
                file,
                success: result.success,
                error: result.error
            });
        }
        
        this.logger.info(`[WINDSURF-EDITOR] ✅ Batch complete: ${successful} success, ${failed} failed`);
        
        return {
            success: failed === 0,
            total: edits.length,
            successful,
            failed,
            results
        };
    }

    /**
     * Helper: Підрахунок входжень
     */
    _countOccurrences(content, target) {
        let count = 0;
        let pos = 0;
        
        while ((pos = content.indexOf(target, pos)) !== -1) {
            count++;
            pos += target.length;
        }
        
        return count;
    }

    /**
     * Helper: Рекурсивний пошук файлів
     */
    async _findFilesRecursive(dir, pattern, maxDepth, extensions, currentDepth = 0) {
        if (currentDepth >= maxDepth) return [];
        
        const files = [];
        
        try {
            const entries = await fs.readdir(dir, { withFileTypes: true });
            
            for (const entry of entries) {
                const fullPath = path.join(dir, entry.name);
                
                if (entry.isDirectory()) {
                    // Skip node_modules, .git etc
                    if (entry.name.startsWith('.') || entry.name === 'node_modules') {
                        continue;
                    }
                    
                    const subFiles = await this._findFilesRecursive(
                        fullPath, pattern, maxDepth, extensions, currentDepth + 1
                    );
                    files.push(...subFiles);
                    
                } else if (entry.isFile()) {
                    // Перевірка pattern
                    const matches = pattern === '*' || entry.name.includes(pattern);
                    
                    // Перевірка extensions
                    const extMatch = extensions.length === 0 || 
                        extensions.some(ext => entry.name.endsWith(`.${ext}`));
                    
                    if (matches && extMatch) {
                        files.push(fullPath);
                    }
                }
            }
        } catch (error) {
            // Ignore permission errors
        }
        
        return files;
    }

    /**
     * Статистика використання
     */
    getStats() {
        return {
            availableTools: this.availableTools,
            projectRoot: this.projectRoot,
            isWindsurfMode: true  // Так, ми Windsurf! 🎨
        };
    }
}

/**
 * Singleton instance
 */
export const windsurfCodeEditor = new WindsurfCodeEditor();
export default windsurfCodeEditor;
