/**
 * @fileoverview Visual Capture Service (macOS)
 * Screenshot capture for visual verification
 * 
 * Provides:
 * - Active window capture (programs)
 * - Desktop-only capture (no windows)
 * - Full screen capture (all displays)
 * - Multi-monitor support
 * - Screenshot queue management
 * 
 * @version 5.1.0
 * @date 2025-10-22
 * @platform macOS only
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

const execAsync = promisify(exec);

/**
 * Visual Capture Service
 * Manages continuous screenshot capture and monitoring
 */
export class VisualCaptureService {
    /**
     * @param {Object} dependencies
     * @param {Object} dependencies.logger - Logger instance
     * @param {Object} dependencies.config - Configuration
     */
    constructor({ logger, config = {} }) {
        this.logger = logger;
        this.config = {
            captureInterval: config.captureInterval || 2000,
            screenshotDir: config.screenshotDir || '/tmp/atlas_visual',
            maxStoredScreenshots: config.maxStoredScreenshots || 10,
            changeDetectionThreshold: config.changeDetectionThreshold || 0.05
        };

        // Platform check
        if (process.platform !== 'darwin') {
            throw new Error('Visual Capture Service currently supports macOS only');
        }

        this.isMonitoring = false;
        this.monitoringInterval = null;
        this.screenshotQueue = [];
        this.lastScreenshotHash = null;
        this.changeDetected = false;
        
        // Display information (populated during initialization)
        this.displayCount = 0;
        this.displayInfo = null;
    }

    /**
     * Initialize visual capture service
     * Detects display configuration
     */
    async initialize() {
        this.logger.system('visual-capture', '[VISUAL] Initializing Visual Capture Service (macOS)...');

        // Create screenshot directory
        try {
            await fs.mkdir(this.config.screenshotDir, { recursive: true });
            this.logger.system('visual-capture', `[VISUAL] Screenshot directory: ${this.config.screenshotDir}`);
        } catch (error) {
            this.logger.error(`[VISUAL] Failed to create screenshot directory: ${error.message}`, {
                category: 'visual-capture',
                component: 'visual-capture'
            });
            throw error;
        }

        // Detect displays
        await this._detectDisplays();

        this.logger.system('visual-capture', `[VISUAL] ✅ Initialized with ${this.displayCount} display(s)`);
    }

    /**
     * Start continuous monitoring
     * Takes screenshots at regular intervals and detects changes
     */
    async startMonitoring() {
        if (this.isMonitoring) {
            this.logger.warn('[VISUAL] Monitoring already active', {
                category: 'visual-capture',
                component: 'visual-capture'
            });
            return;
        }

        this.isMonitoring = true;
        this.logger.system('visual-capture', `[VISUAL] 📹 Starting continuous monitoring (interval: ${this.config.captureInterval}ms)`);

        // Take initial screenshot
        await this.captureScreenshot('monitoring_start');

        // Start monitoring interval
        this.monitoringInterval = setInterval(async () => {
            try {
                await this.captureScreenshot('monitoring');
            } catch (error) {
                this.logger.error(`[VISUAL] Monitoring capture failed: ${error.message}`, {
                    category: 'visual-capture',
                    component: 'visual-capture'
                });
            }
        }, this.config.captureInterval);
    }

    /**
     * Stop continuous monitoring
     */
    async stopMonitoring() {
        if (!this.isMonitoring) {
            return;
        }

        this.isMonitoring = false;
        
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
        }

        this.logger.system('visual-capture', '[VISUAL] ⏹️  Stopped continuous monitoring');
    }

    /**
     * Capture a single screenshot
     * 
     * SIMPLIFIED 2025-10-22: Three capture modes for visual verification
     * - active_window: Captures active application window (best for program verification)
     * - desktop_only: Captures desktop without windows (for desktop state)
     * - full_screen: Captures entire screen (default, all monitors)
     * 
     * @param {string} context - Context identifier for the screenshot
     * @param {Object} options - Capture options
     * @param {string} [options.mode] - Capture mode: 'active_window', 'desktop_only', 'full_screen' (default)
     * @param {string} [options.targetApp] - Target app name for active_window mode
     * @param {number} [options.displayNumber] - Display number for desktop_only mode (1, 2, 3...)
     * @returns {Promise<Object>} Screenshot info
     */
    async captureScreenshot(context = 'manual', options = {}) {
        const timestamp = Date.now();
        const mode = options.mode || 'full_screen';
        const filename = `screenshot_${context}_${mode}_${timestamp}.png`;
        const filepath = path.join(this.config.screenshotDir, filename);

        try {
            let captureSuccess = false;

            switch (mode) {
                case 'active_window':
                    captureSuccess = await this._captureActiveWindow(filepath, options.targetApp);
                    break;
                    
                case 'desktop_only':
                    captureSuccess = await this._captureDesktopOnly(filepath, options.displayNumber);
                    break;
                    
                case 'full_screen':
                default:
                    captureSuccess = await this._captureFullScreen(filepath);
                    break;
            }

            if (!captureSuccess) {
                throw new Error(`Screenshot capture failed for mode: ${mode}`);
            }

            // Verify screenshot was created
            const stats = await fs.stat(filepath);
            if (stats.size === 0) {
                throw new Error('Screenshot file is empty');
            }

            // Calculate hash for change detection
            const fileBuffer = await fs.readFile(filepath);
            const hash = crypto.createHash('md5').update(fileBuffer).digest('hex');

            // Detect changes
            let changed = false;
            if (this.lastScreenshotHash && this.lastScreenshotHash !== hash) {
                changed = true;
                this.changeDetected = true;
            }
            this.lastScreenshotHash = hash;

            const screenshotInfo = {
                filepath,
                filename,
                timestamp,
                hash,
                changed,
                size: stats.size,
                mode,
                targetApp: options.targetApp || null
            };

            // Add to queue
            this.screenshotQueue.push(screenshotInfo);

            // Cleanup old screenshots
            await this._cleanupOldScreenshots();

            this.logger.system('visual-capture', 
                `[VISUAL] 📸 Screenshot captured [${mode}]: ${(stats.size / 1024).toFixed(1)}KB`);

            return screenshotInfo;

        } catch (error) {
            this.logger.error(`[VISUAL] Screenshot capture failed: ${error.message}`, {
                category: 'visual-capture',
                component: 'visual-capture',
                context,
                mode
            });
            throw error;
        }
    }

    /**
     * Get latest screenshot from queue
     * 
     * @returns {Object|null} Latest screenshot info
     */
    getLatestScreenshot() {
        return this.screenshotQueue.length > 0
            ? this.screenshotQueue[this.screenshotQueue.length - 1]
            : null;
    }

    /**
     * Get all screenshots since a timestamp
     * 
     * @param {number} since - Timestamp
     * @returns {Array<Object>} Screenshots
     */
    getScreenshotsSince(since) {
        return this.screenshotQueue.filter(s => s.timestamp >= since);
    }

    /**
     * Check if visual changes detected since start
     * 
     * @returns {boolean} True if changes detected
     */
    hasChangesDetected() {
        return this.changeDetected;
    }

    /**
     * Reset change detection flag
     */
    resetChangeDetection() {
        this.changeDetected = false;
        this.logger.system('visual-capture', '[VISUAL] Change detection reset');
    }

    /**
     * Get screenshot comparison report
     * 
     * @param {string} screenshot1Path - First screenshot path
     * @param {string} screenshot2Path - Second screenshot path
     * @returns {Promise<Object>} Comparison result
     */
    async compareScreenshots(screenshot1Path, screenshot2Path) {
        try {
            // Read both screenshots
            const [file1, file2] = await Promise.all([
                fs.readFile(screenshot1Path),
                fs.readFile(screenshot2Path)
            ]);

            // Calculate hashes
            const hash1 = crypto.createHash('md5').update(file1).digest('hex');
            const hash2 = crypto.createHash('md5').update(file2).digest('hex');

            const identical = hash1 === hash2;
            
            // Simple byte-level difference calculation
            let diffBytes = 0;
            const minLength = Math.min(file1.length, file2.length);
            for (let i = 0; i < minLength; i++) {
                if (file1[i] !== file2[i]) {
                    diffBytes++;
                }
            }
            diffBytes += Math.abs(file1.length - file2.length);

            const diffPercentage = (diffBytes / Math.max(file1.length, file2.length)) * 100;

            return {
                identical,
                hash1,
                hash2,
                file1Size: file1.length,
                file2Size: file2.length,
                diffBytes,
                diffPercentage: diffPercentage.toFixed(2),
                significantChange: diffPercentage > this.config.changeDetectionThreshold
            };

        } catch (error) {
            this.logger.error(`[VISUAL] Screenshot comparison failed: ${error.message}`, {
                category: 'visual-capture',
                component: 'visual-capture'
            });
            throw error;
        }
    }

    /**
     * Cleanup old screenshots to manage storage
     * 
     * @private
     */
    async _cleanupOldScreenshots() {
        if (this.screenshotQueue.length <= this.config.maxStoredScreenshots) {
            return;
        }

        const toRemove = this.screenshotQueue.length - this.config.maxStoredScreenshots;
        const removed = this.screenshotQueue.splice(0, toRemove);

        // Delete files
        for (const screenshot of removed) {
            try {
                await fs.unlink(screenshot.filepath);
                this.logger.system('visual-capture', `[VISUAL] 🗑️  Cleaned up old screenshot: ${screenshot.filename}`);
            } catch (error) {
                this.logger.warn(`[VISUAL] Failed to delete old screenshot: ${error.message}`, {
                    category: 'visual-capture',
                    component: 'visual-capture'
                });
            }
        }
    }

    /**
     * Get current monitoring status
     * 
     * @returns {Object} Status info
     */
    getStatus() {
        return {
            isMonitoring: this.isMonitoring,
            captureInterval: this.config.captureInterval,
            queueSize: this.screenshotQueue.length,
            maxStoredScreenshots: this.config.maxStoredScreenshots,
            changeDetected: this.changeDetected,
            lastScreenshot: this.getLatestScreenshot()
        };
    }

    /**
     * Detect available displays and their configuration
     * @private
     */
    async _detectDisplays() {
        try {
            const { stdout } = await execAsync('system_profiler SPDisplaysDataType | grep -c "Resolution:"');
            this.displayCount = parseInt(stdout.trim()) || 1;
            
            this.logger.system('visual-capture', `[VISUAL] 🖥️  Detected ${this.displayCount} display(s)`);
            
            return this.displayCount;
        } catch (error) {
            this.logger.warn(`[VISUAL] Display detection failed: ${error.message}`, {
                category: 'visual-capture'
            });
            this.displayCount = 1; // Default to 1 display
            return 1;
        }
    }

    /**
     * Capture active window (frontmost application)
     * OPTIMIZED 2025-10-22: Non-interactive method using window bounds
     * 
     * @param {string} filepath - Output file path
     * @param {string} targetApp - Optional: specific app to activate first
     * @returns {Promise<boolean>} Success status
     * @private
     */
    async _captureActiveWindow(filepath, targetApp = null) {
        try {
            let processName = targetApp;
            
            // INTELLIGENT APP DETECTION: Try multiple approaches
            if (targetApp) {
                // Normalize app name for cross-language compatibility
                const normalizedApp = this._normalizeAppName(targetApp);
                
                // Try to find and activate the app
                const activated = await this._intelligentAppActivation(normalizedApp);
                
                if (activated) {
                    processName = activated;
                    this.logger.system('visual-capture', `[VISUAL] 🎯 Activated: ${processName}`);
                } else {
                    // Fallback to frontmost app
                    const { stdout } = await execAsync(`osascript -e 'tell application "System Events" to get name of first process whose frontmost is true'`);
                    processName = stdout.trim();
                    this.logger.warn(`[VISUAL] Could not activate ${targetApp}, using frontmost: ${processName}`, {
                        category: 'visual-capture'
                    });
                }
            } else {
                // Get frontmost process name
                const { stdout } = await execAsync(`osascript -e 'tell application "System Events" to get name of first process whose frontmost is true'`);
                processName = stdout.trim();
                this.logger.system('visual-capture', `[VISUAL] 🎯 Frontmost app: ${processName}`);
            }
            
            // Get window bounds using AppleScript
            const boundsScript = `
                tell application "System Events"
                    tell process "${processName}"
                        set windowPosition to position of window 1
                        set windowSize to size of window 1
                        return (item 1 of windowPosition) & "," & (item 2 of windowPosition) & "," & (item 1 of windowSize) & "," & (item 2 of windowSize)
                    end tell
                end tell
            `;
            
            const { stdout: boundsOutput } = await execAsync(`osascript -e '${boundsScript}'`);
            // Remove all spaces and fix double commas
            const bounds = boundsOutput.trim().replace(/\s/g, '').replace(/,+/g, ',');
            
            this.logger.system('visual-capture', `[VISUAL] Window bounds: ${bounds}`);
            
            // Capture window region (non-interactive)
            const command = `screencapture -x -R ${bounds} "${filepath}"`;
            await execAsync(command);
            
            this.logger.system('visual-capture', '[VISUAL] ✅ Active window captured');
            return true;
            
        } catch (error) {
            this.logger.error(`[VISUAL] Active window capture failed: ${error.message}`, {
                category: 'visual-capture',
                targetApp
            });
            return false;
        }
    }

    /**
     * Capture desktop only (hide all windows)
     * OPTIMIZED 2025-10-22: Clean desktop screenshot
     * 
     * @param {string} filepath - Output file path
     * @param {number} displayNumber - Optional: specific display number (1, 2, 3...)
     * @returns {Promise<boolean>} Success status
     * @private
     */
    async _captureDesktopOnly(filepath, displayNumber = null) {
        try {
            const displayMsg = displayNumber 
                ? `display ${displayNumber}` 
                : 'all displays';
            
            this.logger.system('visual-capture', `[VISUAL] 🖼️  Hiding windows for desktop capture (${displayMsg})`);
            
            // Hide all application windows (show desktop) - universal approach
            await execAsync('osascript -e \'tell application "System Events" to set visible of every process whose visible is true and background only is false to false\'');
            
            // Wait for windows to hide
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Capture screen (specific display or all)
            const displayFlag = displayNumber ? `-D ${displayNumber}` : '';
            const command = `screencapture -x ${displayFlag} "${filepath}"`;
            await execAsync(command);
            
            this.logger.system('visual-capture', `[VISUAL] ✅ Desktop captured (${displayMsg})`);
            return true;
            
        } catch (error) {
            this.logger.error(`[VISUAL] Desktop capture failed: ${error.message}`, {
                category: 'visual-capture',
                displayNumber
            });
            return false;
        }
    }

    /**
     * Capture full screen (all monitors)
     * OPTIMIZED 2025-10-22: Simple full screen capture
     * 
     * @param {string} filepath - Output file path
     * @returns {Promise<boolean>} Success status
     * @private
     */
    async _captureFullScreen(filepath) {
        try {
            const displayMsg = this.displayCount > 1 
                ? `all ${this.displayCount} displays` 
                : 'display';
            
            this.logger.system('visual-capture', `[VISUAL] 📷 Capturing full screen (${displayMsg})`);
            
            // Capture all screens
            const command = `screencapture -x "${filepath}"`;
            await execAsync(command);
            
            this.logger.system('visual-capture', '[VISUAL] ✅ Full screen captured');
            return true;
            
        } catch (error) {
            this.logger.error(`[VISUAL] Full screen capture failed: ${error.message}`, {
                category: 'visual-capture'
            });
            return false;
        }
    }

    /**
     * Cleanup and shutdown
     */
    async destroy() {
        await this.stopMonitoring();
        
        // Cleanup all screenshots
        for (const screenshot of this.screenshotQueue) {
            try {
                await fs.unlink(screenshot.filepath);
            } catch (error) {
                // Ignore errors during cleanup
            }
        }

        this.screenshotQueue = [];
        this.logger.system('visual-capture', '[VISUAL] Visual Capture Service destroyed');
    }
}

export default VisualCaptureService;
