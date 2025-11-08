/**
 * @fileoverview Vision Analysis Service
 * AI-powered visual analysis for screenshot verification
 *
 * Provides:
 * - GPT-4 Vision API integration for screenshot analysis
 * - Visual evidence extraction
 * - Success criteria matching through vision
 * - Fallback to CLIP/YOLO for specific object detection (future)
 *
 * OPTIMIZED 2025-10-17:
 * - Added result caching (LRU cache with 100 entries)
 * - Image size optimization (max 1024px)
 * - Better error handling with exponential backoff
 * - Automatic quality adjustment based on task complexity
 *
 * @version 5.0.1
 * @date 2025-10-17
 */

import logger from '../utils/logger.js';
import axios from 'axios';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import LocalizationService from './localization-service.js';
import GlobalConfig from '../../config/atlas-config.js';
import { globalRateLimiter } from '../utils/rate-limiter.js';
import visionAnalysisPrompts from '../../prompts/mcp/vision_analysis.js';
import CircuitBreaker from '../utils/circuit-breaker.js';
import modelChecker from '../ai/model-availability-checker.js';

/**
 * Vision Analysis Service
 * Uses AI vision models to analyze screenshots
 *
 * PRIORITY (OPTIMIZED 2025-10-17):
 * 1. Port 4000 LLM API - Fast inference (~2-5 sec) 
 * 2. Ollama local llama3.2-vision (FREE but slow 120+ sec) - FALLBACK ONLY
 * 3. OpenRouter Llama-11b ($0.0002/img) - Emergency fallback
 *
 * Decision: Use port 4000 as primary for SPEED (2s target), Ollama only if port 4000 unavailable
 */
export class VisionAnalysisService {
  /**
     * @param {Object} dependencies
     * @param {Object} dependencies.logger - Logger instance
     * @param {Object} dependencies.config - Configuration
     */
  constructor({ logger, config = {} }) {
    this.logger = logger;
    this.config = config || {};

    // Determine vision model (priority: Port 4000 → Ollama → OpenRouter)
    this.visionProvider = config.visionProvider || 'auto'; // 'port4000', 'ollama', 'openrouter', or 'auto'
    this.visionModel = config.visionModel || null;

    this.initialized = false;
    this.port4000Available = false;
    this.ollamaAvailable = false;
    
    // ADDED 2025-11-08: Model availability checker for intelligent fallback
    this.modelChecker = modelChecker;

    // OPTIMIZED: Add caching for repeated analyses
    this.cache = new Map();
    this.maxCacheSize = 100;

    // OPTIMIZED: Track API performance
    this.stats = {
      totalCalls: 0,
      cacheHits: 0,
      port4000Calls: 0,
      ollamaCalls: 0,
      openrouterCalls: 0,
      avgResponseTime: 0
    };

    // OPTIMIZED: Add circuit breakers for each API endpoint
    this.circuitBreakers = {
      port4000: new CircuitBreaker({
        name: 'Port4000-Vision',
        failureThreshold: 3,
        recoveryTimeout: 30000,
        timeout: 0  // No timeout - vision models can be slow
      }),
      ollama: new CircuitBreaker({
        name: 'Ollama-Vision',
        failureThreshold: 2,
        recoveryTimeout: 30000,
        timeout: 300000
      }),
      openrouter: new CircuitBreaker({
        name: 'OpenRouter-Vision',
        failureThreshold: 5,
        recoveryTimeout: 30000,
        timeout: 120000
      })
    };
  }

  /**
     * Optimize image for vision API to reduce payload size
     * - Limit base64 string length
     * - Use JPEG format in data URL for better compression
     *
     * OPTIMIZATION 2025-10-17: Prevent 413 Payload Too Large errors
     * NOTE: This is a secondary check. Primary optimization happens in _optimizeImage()
     *
     * @param {string} base64Image - Original base64 image (may include data URL prefix)
     * @returns {string} Optimized base64 image (without data URL prefix)
     * @private
     */
  _optimizeImageForAPI(base64Image) {
    try {
      // Remove data URL prefix if present
      const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, '');

      // Calculate actual payload size
      const sizeKB = Math.round(base64Data.length / 1024);
      const sizeMB = (base64Data.length / 1024 / 1024).toFixed(2);

      // Check size thresholds
      const maxBase64Size = 1024 * 1024; // 1MB base64 limit
      const warningSize = 750 * 1024;    // 750KB warning threshold

      if (base64Data.length > maxBase64Size) {
        this.logger.error(`[IMAGE-OPT] ❌ Base64 too large (${sizeMB}MB) - WILL cause 413 errors!`, {
          category: 'vision-analysis',
          base64Size: sizeKB,
          maxSize: Math.round(maxBase64Size / 1024),
          recommendation: 'Image compression failed - check _optimizeImage() implementation'
        });
      } else if (base64Data.length > warningSize) {
        this.logger.warn(`[IMAGE-OPT] ⚠️  Base64 approaching limit (${sizeKB}KB) - may cause 413 errors`, {
          category: 'vision-analysis',
          base64Size: sizeKB,
          threshold: Math.round(warningSize / 1024)
        });
      } else {
        this.logger.system('vision-analysis', `[IMAGE-OPT] ✅ Base64 size OK: ${sizeKB}KB`);
      }

      return base64Data;

    } catch (error) {
      // If optimization fails, return original without prefix
      this.logger.warn(`[IMAGE-OPT] Failed to check base64: ${error.message}, using original`, {
        category: 'vision-analysis'
      });
      return base64Image.replace(/^data:image\/\w+;base64,/, '');
    }
  }

  /**
     * Initialize vision analysis service
     * Checks port 4000 availability first, then Ollama as fallback
     */
  async initialize() {
    this.logger.system('vision-analysis', '[VISION] Initializing Vision Analysis Service...');

    // Check port 4000 FIRST (PRIORITY for SPEED)
    this.port4000Available = await this._checkPort4000Availability();

    if (this.port4000Available) {
      this.logger.system('vision-analysis', '[VISION] 🚀 ⚡ PORT 4000 detected - using FAST LLM API (~2-5 sec)');
      this.visionProvider = 'port4000';
      // Use actual vision model from config instead of placeholder
      const visionConfig = GlobalConfig.MCP_MODEL_CONFIG.getStageConfig('vision_analysis');
      this.visionModel = visionConfig.model;
    } else {
      // Check Ollama as fallback (slow but free)
      this.ollamaAvailable = await this._checkOllamaAvailability();

      if (this.ollamaAvailable) {
        this.logger.system('vision-analysis', '[VISION] ⚠️  Port 4000 unavailable - falling back to Ollama (slow 120+ sec)');
        this.visionProvider = 'ollama';
        this.visionModel = 'llama3.2-vision';
      } else {
        this.logger.system('vision-analysis', '[VISION] ℹ️ No local services - using Atlas API as emergency fallback');
        this.visionProvider = 'atlas';
        // Use fast vision model from config as fallback
        const fallbackConfig = GlobalConfig.VISION_CONFIG.fast;
        this.visionModel = fallbackConfig.model;
      }
    }

    this.initialized = true;
    this.logger.system('vision-analysis', `[VISION] ✅ Vision Analysis initialized: ${this.visionProvider} (${this.visionModel})`);
  }

  /**
     * Check if port 4000 API is available
     * @returns {Promise<boolean>}
     * @private
     */
  async _checkPort4000Availability() {
    try {
      const response = await axios.get('http://localhost:4000/v1/models', {
        timeout: 2000
      });
      return response.status === 200;
    } catch {
      return false;
    }
  }

  /**
     * Check if Ollama is available
     * @returns {Promise<boolean>}
     * @private
     */
  async _checkOllamaAvailability() {
    try {
      const response = await axios.get('http://localhost:11434/api/tags', {
        timeout: 3000
      });
      return response.status === 200;
    } catch {
      return false;
    }
  }

  /**
     * Analyze screenshot against success criteria
     * OPTIMIZED: Added caching and image optimization
     *
     * @param {string} screenshotPath - Path to screenshot file
     * @param {string} successCriteria - What to verify in the screenshot
     * @param {Object} context - Additional context
     * @returns {Promise<Object>} Analysis result
     */
  async analyzeScreenshot(screenshotPath, successCriteria, context = {}) {
    const startTime = Date.now();
    this.logger.system('vision-analysis', `[VISION] 🔍 Analyzing screenshot: ${path.basename(screenshotPath)}`);
    this.logger.system('vision-analysis', `[VISION] Success criteria: ${successCriteria}`);

    try {
      // OPTIMIZED: Check cache first
      const cacheKey = this._generateCacheKey(screenshotPath, successCriteria, context);
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < 300000) { // 5 min cache
        this.stats.cacheHits++;
        this.logger.system('vision-analysis', '[VISION] ✅ Cache hit - returning cached result');
        return cached.result;
      }

      // Read screenshot file
      const imageBuffer = await fs.readFile(screenshotPath);

      // OPTIMIZED: Reduce image size if too large (saves bandwidth and time)
      const optimizedImage = await this._optimizeImage(imageBuffer);
      const base64Image = optimizedImage.toString('base64');

      // ENHANCED 2025-10-24: Add execution history to context
      // This is critical for multi-step operations and sequential workflows
      const enrichedContext = {
        ...context,
        executionResults: context.executionResults || [],
        action: context.action || '',
        execution_history: context.execution_history || '',
        previous_actions: context.previous_actions || ''
      };

      // Construct vision analysis prompt with enriched context
      const prompt = this._constructAnalysisPrompt(successCriteria, enrichedContext);

      // Call vision API with retry logic
      // ENHANCED 2025-10-22: Pass context for model selection
      let analysis = await this._callVisionAPIWithRetry(base64Image, prompt, 3, context);

      analysis = this._applyVerificationGuards(analysis, successCriteria, enrichedContext);

      // OPTIMIZED: Cache successful results
      this._cacheResult(cacheKey, analysis);

      // Track performance
      const responseTime = Date.now() - startTime;
      this._updateStats(responseTime);

      this.logger.system('vision-analysis', `[VISION] ✅ Analysis complete in ${responseTime}ms: ${analysis.verified ? 'VERIFIED' : 'NOT VERIFIED'}`);

      return analysis;

    } catch (error) {
      this.logger.error(`[VISION] Analysis failed: ${error.message}`, {
        category: 'vision-analysis',
        component: 'vision-analysis',
        screenshotPath,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
     * Generate cache key for analysis result
     * @param {string} screenshotPath - Path to screenshot
     * @param {string} successCriteria - Criteria to verify
     * @param {Object} context - Additional context
     * @returns {string} Cache key
     * @private
     */
  _generateCacheKey(screenshotPath, successCriteria, context) {
    const data = `${screenshotPath}:${successCriteria}:${JSON.stringify(context)}`;
    return crypto.createHash('md5').update(data).digest('hex');
  }

  /**
     * Optimize image size for faster processing
     * FIXED 2025-10-17: Actually resize/compress images to prevent 413 errors
     *
     * Strategy:
     * 1. Try sharp library (best quality/performance) if available
     * 2. Fall back to manual resize via system tools (ImageMagick/sips)
     * 3. Worst case: return original with warning
     *
     * @param {Buffer} imageBuffer - Original image buffer
     * @returns {Promise<Buffer>} Optimized image buffer
     * @private
     */
  async _optimizeImage(imageBuffer) {
    const originalSize = imageBuffer.length;
    const originalSizeMB = (originalSize / 1024 / 1024).toFixed(2);

    // If image is already small, no need to optimize
    if (originalSize < 512 * 1024) { // < 512KB
      this.logger.system('vision-analysis', `[IMAGE-OPT] Image already small: ${Math.round(originalSize / 1024)}KB - no optimization needed`);
      return imageBuffer;
    }

    this.logger.system('vision-analysis', `[IMAGE-OPT] Optimizing large image: ${originalSizeMB}MB`);

    try {
      // Try using sharp library (best option)
      try {
        const sharp = (await import('sharp')).default;

        // Resize to max 1024x1024 and compress
        const optimized = await sharp(imageBuffer)
          .resize(1024, 1024, {
            fit: 'inside',
            withoutEnlargement: true
          })
          .jpeg({
            quality: 80,
            progressive: true,
            mozjpeg: true
          })
          .toBuffer();

        const newSize = optimized.length;
        const reduction = Math.round((1 - newSize / originalSize) * 100);

        this.logger.system('vision-analysis',
          `[IMAGE-OPT] ✅ Sharp optimization: ${originalSizeMB}MB → ${(newSize / 1024 / 1024).toFixed(2)}MB (-${reduction}%)`
        );

        return optimized;

      } catch {
        // Sharp not available, try system tools
        this.logger.system('vision-analysis', `[IMAGE-OPT] Sharp not available, trying system tools...`);

        // Save temp file for system tool processing
        const { exec } = await import('child_process');
        const { promisify } = await import('util');
        const execAsync = promisify(exec);
        const fs = await import('fs/promises');
        const path = await import('path');
        const os = await import('os');

        const tempDir = os.tmpdir();
        const tempInput = path.join(tempDir, `atlas_img_${Date.now()}_input.png`);
        const tempOutput = path.join(tempDir, `atlas_img_${Date.now()}_output.jpg`);

        try {
          // Write input file
          await fs.writeFile(tempInput, imageBuffer);

          // Try ImageMagick (convert) or sips (macOS)
          let command;
          if (process.platform === 'darwin') {
            // macOS - use sips
            command = `sips -s format jpeg -s formatOptions 80 --resampleWidth 1024 "${tempInput}" --out "${tempOutput}"`;
          } else {
            // Linux - try ImageMagick
            command = `convert "${tempInput}" -resize 1024x1024> -quality 80 "${tempOutput}"`;
          }

          await execAsync(command);

          // Read optimized file
          const optimized = await fs.readFile(tempOutput);

          // Cleanup
          await fs.unlink(tempInput).catch(() => {});
          await fs.unlink(tempOutput).catch(() => {});

          const newSize = optimized.length;
          const reduction = Math.round((1 - newSize / originalSize) * 100);

          this.logger.system('vision-analysis',
            `[IMAGE-OPT] ✅ System tool optimization: ${originalSizeMB}MB → ${(newSize / 1024 / 1024).toFixed(2)}MB (-${reduction}%)`
          );

          return optimized;

        } catch (sysError) {
          // Cleanup on error
          await fs.unlink(tempInput).catch(() => {});
          await fs.unlink(tempOutput).catch(() => {});
          throw sysError;
        }
      }

    } catch (error) {
      // All optimization methods failed
      this.logger.warn(`[IMAGE-OPT] ⚠️  Optimization failed: ${error.message}`, {
        category: 'vision-analysis',
        hint: 'Install sharp library: npm install sharp'
      });

      // Return original with strong warning if it's too large
      if (originalSize > 1024 * 1024) {
        this.logger.error(`[IMAGE-OPT] ❌ WARNING: Sending large unoptimized image (${originalSizeMB}MB) - may cause 413 errors!`, {
          category: 'vision-analysis',
          originalSize,
          recommendation: 'Install sharp: npm install sharp --save'
        });
      }

      return imageBuffer;
    }
  }

  /**
     * Cache analysis result
     * @param {string} key - Cache key
     * @param {Object} result - Analysis result
     * @private
     */
  _cacheResult(key, result) {
    // Implement LRU cache by removing oldest entry if cache is full
    if (this.cache.size >= this.maxCacheSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    this.cache.set(key, {
      result,
      timestamp: Date.now()
    });
  }

  /**
     * Update performance statistics
     * @param {number} responseTime - Response time in ms
     * @private
     */
  _updateStats(responseTime) {
    this.stats.totalCalls++;
    const totalTime = this.stats.avgResponseTime * (this.stats.totalCalls - 1) + responseTime;
    this.stats.avgResponseTime = Math.round(totalTime / this.stats.totalCalls);
  }

  /**
     * Call vision API with retry logic
     * @param {string} base64Image - Base64 encoded image
     * @param {string} prompt - Analysis prompt
     * @param {number} retries - Number of retries
     * @param {Object} context - Additional context
     * @returns {Promise<Object>} Analysis result
     * @private
     */
  async _callVisionAPIWithRetry(base64Image, prompt, retries = 3, context = {}) {
    let lastError;
    for (let i = 0; i < retries; i++) {
      try {
        // ENHANCED 2025-10-22: Pass context for model selection
        const result = await this._callVisionAPI(base64Image, prompt, context);
        return result;
      } catch (error) {
        lastError = error;
        if (i < retries - 1) {
          const delay = Math.pow(2, i) * 1000; // Exponential backoff
          this.logger.warn(`[VISION] Retry ${i + 1}/${retries} after ${delay}ms`, {
            category: 'vision-analysis',
            error: error.message
          });
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    throw lastError;
  }

  /**
     * Compare two screenshots and detect changes
     *
     * @param {string} screenshot1Path - Path to first screenshot
     * @param {string} screenshot2Path - Path to second screenshot
     * @param {string} expectedChange - What change to look for
     * @returns {Promise<Object>} Comparison result
     */
  async compareScreenshots(screenshot1Path, screenshot2Path, expectedChange) {
    this.logger.system('vision-analysis', `[VISION] 🔄 Comparing screenshots for change: ${expectedChange}`);

    try {
      // Read both screenshots
      const [image1Buffer, image2Buffer] = await Promise.all([
        fs.readFile(screenshot1Path),
        fs.readFile(screenshot2Path)
      ]);

      const base64Image1 = image1Buffer.toString('base64');
      const base64Image2 = image2Buffer.toString('base64');

      // Construct comparison prompt
      const prompt = this._constructComparisonPrompt(expectedChange);

      // Call vision API with both images
      const comparison = await this._callVisionAPIMultiImage([base64Image1, base64Image2], prompt);

      this.logger.system('vision-analysis', `[VISION] ✅ Comparison complete: ${comparison.changeDetected ? 'CHANGE DETECTED' : 'NO CHANGE'}`);

      return comparison;

    } catch (error) {
      this.logger.error(`[VISION] Comparison failed: ${error.message}`, {
        category: 'vision-analysis',
        component: 'vision-analysis',
        stack: error.stack
      });
      throw error;
    }
  }

  /**
     * Detect if system is stuck (no visual changes)
     *
     * @param {Array<string>} screenshotPaths - Array of screenshot paths (chronological)
     * @param {string} expectedActivity - What should be happening
     * @returns {Promise<Object>} Stuck detection result
     */
  async detectStuckState(screenshotPaths, expectedActivity) {
    this.logger.system('vision-analysis', `[VISION] 🔍 Detecting stuck state across ${screenshotPaths.length} screenshots`);

    try {
      // Read all screenshots
      const imageBuffers = await Promise.all(
        screenshotPaths.map(path => fs.readFile(path))
      );
      const base64Images = imageBuffers.map(buf => buf.toString('base64'));

      // Construct stuck detection prompt
      const prompt = this._constructStuckDetectionPrompt(expectedActivity);

      // Call vision API with multiple images
      const detection = await this._callVisionAPIMultiImage(base64Images, prompt);

      this.logger.system('vision-analysis', `[VISION] ✅ Stuck detection complete: ${detection.stuck ? 'STUCK' : 'PROGRESSING'}`);

      return detection;

    } catch (error) {
      this.logger.error(`[VISION] Stuck detection failed: ${error.message}`, {
        category: 'vision-analysis',
        component: 'vision-analysis',
        stack: error.stack
      });
      throw error;
    }
  }

  /**
     * Construct analysis prompt for success criteria verification
     *
     * @param {string} successCriteria - What to verify
     * @param {Object} context - Additional context
     * @returns {string} Prompt
     * @private
     */
  _constructAnalysisPrompt(successCriteria, context) {
    // Truncate executionResults to prevent context overflow
    let executionSummary = '';
    if (context.executionResults && Array.isArray(context.executionResults)) {
      executionSummary = context.executionResults.map(r =>
        `- ${r.tool || 'unknown'}: ${r.success ? '✅ success' : '❌ failed'}${r.error ? ` (${String(r.error).substring(0, 100)})` : ''}`
      ).join('\n');
    }

    // Use external prompt template
    let userPrompt = visionAnalysisPrompts.analysisPrompt
      .replace('{{SUCCESS_CRITERIA}}', successCriteria)
      .replace('{{TASK_ACTION}}', context.action || '')
      .replace('{{EXECUTION_SUMMARY}}', executionSummary || '');
      
    // ENHANCED 2025-10-24: Add execution history for multi-step operations
    if (context.execution_history) {
      userPrompt += `\n\n**Execution History (Previous Steps):**\n${context.execution_history}`;
    }
    
    // ENHANCED 2025-10-24: Add previous actions context for sequential workflows
    if (context.previous_actions) {
      userPrompt += `\n\n**Previous Actions Context:**\n${context.previous_actions}\n\nIMPORTANT: Verify the result of the CURRENT operation in the context of these previous steps. Consider how previous actions affect what you should see now.`;
    }
      
    // Clean up empty template sections
    if (!context.action) {
      userPrompt = userPrompt.replace(/{{#if TASK_ACTION}}[\s\S]*?{{\/if}}/g, '');
    } else {
      userPrompt = userPrompt.replace('{{#if TASK_ACTION}}', '').replace('{{/if}}', '');
    }
    
    if (!executionSummary) {
      userPrompt = userPrompt.replace(/{{#if EXECUTION_SUMMARY}}[\s\S]*?{{\/if}}/g, '');
    } else {
      userPrompt = userPrompt.replace('{{#if EXECUTION_SUMMARY}}', '').replace('{{/if}}', '');
    }

    return userPrompt;
  }

  /**
     * Construct comparison prompt for change detection
     *
     * @param {string} expectedChange - What change to look for
     * @param {Object} context - Additional context
     * @returns {string} Prompt
     * @private
     */
  _constructComparisonPrompt(expectedChange, context = {}) {
    let userPrompt = visionAnalysisPrompts.comparisonPrompt
      .replace('{{EXPECTED_CHANGE}}', expectedChange)
      .replace('{{CONTEXT}}', context.description || '');
      
    // Clean up empty template sections
    if (!context.description) {
      userPrompt = userPrompt.replace(/{{#if CONTEXT}}[\s\S]*?{{\/if}}/g, '');
    } else {
      userPrompt = userPrompt.replace('{{#if CONTEXT}}', '').replace('{{/if}}', '');
    }

    return userPrompt;
  }

  /**
     * Construct stuck detection prompt
     *
     * @param {string} expectedActivity - What should be happening
     * @param {Object} context - Additional context
     * @returns {string} Prompt
     * @private
     */
  _constructStuckDetectionPrompt(expectedActivity, context = {}) {
    let userPrompt = visionAnalysisPrompts.stuckDetectionPrompt
      .replace('{{EXPECTED_ACTIVITY}}', expectedActivity)
      .replace('{{TASK_CONTEXT}}', context.taskContext || '')
      .replace('{{TIME_ELAPSED}}', context.timeElapsed || '');
      
    // Clean up empty template sections
    if (!context.taskContext) {
      userPrompt = userPrompt.replace(/{{#if TASK_CONTEXT}}[\s\S]*?{{\/if}}/g, '');
    } else {
      userPrompt = userPrompt.replace('{{#if TASK_CONTEXT}}', '').replace('{{/if}}', '');
    }
    
    if (!context.timeElapsed) {
      userPrompt = userPrompt.replace(/{{#if TIME_ELAPSED}}[\s\S]*?{{\/if}}/g, '');
    } else {
      userPrompt = userPrompt.replace('{{#if TIME_ELAPSED}}', '').replace('{{/if}}', '');
    }
    
    // UNIVERSAL: Add context from previous items
    if (context.previous_actions) {
      userPrompt += `\n\n**Previous Actions:**\n${context.previous_actions}`;
      userPrompt += `\n\nIMPORTANT: Verify the CURRENT operation considering these previous steps.`;
    }
    
    if (context.execution_history) {
      userPrompt += `\n\n**Execution History:**\n${context.execution_history}`;
    }
    
    if (context.workflow_context) {
      userPrompt += `\n\n**Workflow Context:**\n${context.workflow_context}`;
    }

    return userPrompt;
  }

  /**
     * Call vision API with single image
     * Automatically routes to fastest available: Port 4000 → Ollama → OpenRouter
     *
     * @param {string} base64Image - Base64 encoded image
     * @param {string} prompt - Analysis prompt
     * @returns {Promise<Object>} Parsed analysis result
     * @private
     */
  async _callVisionAPI(base64Image, prompt, context = {}) {
    try {
      // Get system prompt from external prompts
      const systemPrompt = visionAnalysisPrompts.SYSTEM_PROMPT;
      
      // PRIMARY: Try port 4000 first (FAST ~2-5 sec)
      if (this.port4000Available && this.visionProvider === 'port4000') {
        // ENHANCED 2025-10-22: Pass context for model selection
        return await this._callPort4000VisionAPI(base64Image, prompt, context, systemPrompt);
      }

      // FALLBACK: Try Ollama (SLOW ~120+ sec but FREE)
      if (this.visionProvider === 'ollama' && this.ollamaAvailable) {
        return await this._callOllamaVisionAPI(base64Image, prompt, systemPrompt);
      }

      // EMERGENCY FALLBACK: Try alternative vision models via ModelAvailabilityChecker
      return await this._callEmergencyVisionFallback(base64Image, prompt, systemPrompt);

    } catch (error) {
      this.logger.error(`[VISION] API call failed: ${error.message}`, {
        category: 'vision-analysis',
        component: 'vision-analysis',
        stack: error.stack
      });
      throw error;
    }
  }

  /**
     * Call Port 4000 LLM API (FAST inference)
     * @param {string} base64Image - Base64 encoded image
     * @param {string} prompt - Analysis prompt
     * @returns {Promise<Object>} Parsed analysis result
     * @private
     */
  async _callPort4000VisionAPI(base64Image, prompt, context = {}, systemPrompt = null) {
    try {
      // ENHANCED 2025-10-22: Select model based on modelType from context
      const modelType = context.modelType || 'fast';  // 'fast' or 'primary'
      const stageName = modelType === 'fast' ? 'vision_verification_fast' : 'vision_verification_strong';
      
      this.logger.system('vision-analysis', `[PORT-4000] 🚀 Calling Port 4000 LLM API (model: ${modelType})...`);

      // OPTIMIZATION 2025-10-17: Check and optimize image to prevent 413 errors
      const optimizedImage = this._optimizeImageForAPI(base64Image);

      // Use model based on attempt: fast (phi-3.5) or strong (llama-90b)
      const visionConfig = GlobalConfig.MCP_MODEL_CONFIG.getStageConfig(stageName);
      const endpoint = GlobalConfig.MCP_MODEL_CONFIG.apiEndpoint.primary;
      const apiEndpoint = visionConfig.endpoint || 'http://localhost:4000/v1/chat/completions';
      
      this.logger.system('vision-analysis', `[PORT-4000] 🎯 Model: ${visionConfig.model}`);
      this.logger.system('vision-analysis', `[PORT-4000] 🌡️ Temperature: ${visionConfig.temperature}`);
      this.logger.system('vision-analysis', `[PORT-4000] 📊 Max tokens: ${visionConfig.max_tokens}`);

      // Prepare headers - add Copilot-Vision-Request for GitHub Copilot models
      const headers = { 'Content-Type': 'application/json' };
      
      // FIXED 18.10.2025: GitHub Copilot requires special header for vision requests
      if (visionConfig.model && visionConfig.model.includes('copilot')) {
        headers['Copilot-Vision-Request'] = 'true';
        this.logger.system('vision-analysis', '[PORT-4000] Adding Copilot-Vision-Request header for GitHub Copilot model');
      }

      // Use rate limiter for vision API calls
      return globalRateLimiter.executeWithRetry(async () => {
        // FIXED 2025-11-07: Get captureMode from context
        const captureMode = context.captureMode || 'screen';
        // Check model availability (timeout 5s)
        this.logger.system('vision-analysis', `[PORT-4000] 🚀 Fast vision API for ${captureMode} (${visionConfig.model})...`);

        // Build request with multimodal format
        // FIXED 2025-11-07: Use apiEndpoint variable, not visionConfig.apiEndpoint
        const response = await axios.post(apiEndpoint, {
          model: visionConfig.model,
          messages: [
            ...(systemPrompt ? [{
              role: 'system',
              content: systemPrompt
            }] : []),
            {
              role: 'user',
              content: [
                { type: 'text', text: prompt },
                { type: 'image_url', image_url: {
                  url: `data:image/jpeg;base64,${optimizedImage}`
                }}
              ]
            }
          ],
          temperature: 0.2,
          max_tokens: visionConfig.max_tokens || 500
        }, {
          timeout: 60000,  // FIXED 2025-10-29: 60s timeout for vision models (llama-90b needs more time)
          headers
        });

        const content = response.data.choices[0]?.message?.content;
        this.logger.system('vision-analysis', '[PORT-4000] ✅ Fast response received');

        return this._parseVisionResponse(content);
      }, {
        endpoint: visionConfig.apiEndpoint,
        priority: 2 // Lower priority than text LLM calls
      });

    } catch (error) {
      // UPDATED 2025-11-08: Unified error handling - ALL errors trigger emergency fallback with model selection
      const errorType = error.response?.status || error.code || 'unknown';
      const errorDetails = {
        category: 'vision-analysis',
        errorType,
        model: visionConfig.model,
        message: error.message
      };

      // Log specific error type
      if (error.response?.status === 429) {
        this.logger.error('[PORT-4000] ❌ Rate limit (429) - switching to alternative models', errorDetails);
      } else if (error.response?.status === 500 || error.response?.status === 503) {
        this.logger.error('[PORT-4000] ❌ Server error - model overloaded or unavailable', errorDetails);
      } else if (error.response?.status === 422) {
        this.logger.error('[PORT-4000] ❌ Unprocessable Entity - model may not support vision', errorDetails);
      } else if (error.response?.status === 413) {
        this.logger.error('[PORT-4000] ❌ Payload Too Large - request size exceeded', errorDetails);
      } else if (error.code === 'ECONNREFUSED') {
        this.logger.warn('[PORT-4000] Connection refused - port 4000 not available', errorDetails);
        this.port4000Available = false;
      } else if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
        this.logger.error('[PORT-4000] Timeout - request took too long', errorDetails);
      } else {
        this.logger.error('[PORT-4000] Unexpected error', errorDetails);
      }

      // For ALL errors - try emergency fallback with intelligent model selection
      this.logger.warn(`[PORT-4000] 🔄 Activating emergency fallback for error: ${errorType}`);
      return await this._callEmergencyVisionFallback(base64Image, prompt, systemPrompt);
    }
  }

  /**
     * Call Ollama vision API (local, SLOW, FREE)
     * Only used as FALLBACK if port 4000 unavailable
     *
     * @param {string} base64Image - Base64 encoded image
     * @param {string} prompt - Analysis prompt
     * @returns {Promise<Object>} Parsed analysis result
     * @private
     */
  async _callOllamaVisionAPI(base64Image, prompt, systemPrompt = null) {
    try {
      this.logger.system('vision-analysis', '[OLLAMA] ⚠️  Calling Ollama (slow 120+ sec, FREE fallback)...');

      const ollamaConfig = GlobalConfig.MCP_MODEL_CONFIG.getStageConfig('vision_fallback');
      // Combine system prompt with user prompt for Ollama
      const fullPrompt = systemPrompt ? `${systemPrompt}\n\n${prompt}` : prompt;
      
      const response = await axios.post('http://localhost:11434/api/generate', {
        model: 'llama3.2-vision',
        prompt: fullPrompt,
        images: [base64Image],
        stream: false
      }, {
        timeout: 300000,  // 5min timeout - Ollama is VERY slow
        headers: { 'Content-Type': 'application/json' }
      });

      const content = response.data.response;
      this.logger.system('vision-analysis', '[OLLAMA] ✅ Slow response received');

      return this._parseVisionResponse(content);

    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        this.logger.error('[OLLAMA] Ollama not available', {
          category: 'vision-analysis',
          note: 'OpenRouter fallback disabled'
        });
        this.ollamaAvailable = false;
        throw new Error('Ollama unavailable. OpenRouter fallback disabled.');
      }

      if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
        this.logger.error('[OLLAMA] Ollama timeout 300s', {
          category: 'vision-analysis',
          note: 'OpenRouter fallback disabled'
        });
        this.ollamaAvailable = false;
        throw new Error('Ollama timeout. OpenRouter fallback disabled.');
      }

      throw error;
    }
  }

  /**
     * ADDED 2025-11-08: Emergency fallback using ModelAvailabilityChecker
     * Finds and uses alternative vision models when primary sources fail
     * @param {string} base64Image - Base64 encoded image
     * @param {string} prompt - Analysis prompt
     * @param {string} systemPrompt - System prompt
     * @returns {Promise<Object>} Parsed analysis result
     * @private
     */
  async _callEmergencyVisionFallback(base64Image, prompt, systemPrompt = null) {
    try {
      this.logger.warn('[VISION] 🆘 Emergency fallback activated - searching for available vision models');
      
      // STEP 1: Get available models from API (OpenAI standard)
      let availableVisionModels = [];
      try {
        const modelsResponse = await axios.get('http://localhost:4000/v1/models', {
          timeout: 5000
        });
        
        if (modelsResponse.data && modelsResponse.data.data) {
          // Filter vision models (contain 'vision' in name or known vision models)
          availableVisionModels = modelsResponse.data.data
            .map(m => m.id)
            .filter(modelId => 
              modelId.includes('vision') || 
              modelId.includes('gpt-4o') ||
              modelId.includes('llama-3.2') ||
              modelId.includes('phi-4-multimodal')
            );
          
          this.logger.info(`[VISION-EMERGENCY] 📋 Found ${availableVisionModels.length} vision models: ${availableVisionModels.join(', ')}`);
        }
      } catch (error) {
        this.logger.warn('[VISION-EMERGENCY] Failed to fetch models list, using fallback list');
        // Fallback to known vision models with atlas prefix
        availableVisionModels = [
          'atlas-gpt-4o-mini',
          'atlas-gpt-4o',
          'atlas-llama-3.2-11b-vision-instruct',
          'atlas-llama-3.2-90b-vision-instruct',
          'atlas-phi-4-multimodal-instruct'
        ];
      }
      
      if (availableVisionModels.length === 0) {
        throw new Error('No vision models available in API');
      }
      
      // STEP 2: Try each model with availability check
      const emergencyConfig = GlobalConfig.MCP_MODEL_CONFIG.getStageConfig('vision_emergency');
      const preferredModel = emergencyConfig.model; // atlas-gpt-4o-mini
      
      // Prioritize preferred model if it's in the list
      const modelsToTry = availableVisionModels.includes(preferredModel)
        ? [preferredModel, ...availableVisionModels.filter(m => m !== preferredModel)]
        : availableVisionModels;
      
      let selectedModel = null;
      let modelSource = 'unknown';
      
      // Try each model until one works
      for (const model of modelsToTry) {
        const modelResult = await this.modelChecker.getAvailableModel(model, null, 'vision');
        if (modelResult.available) {
          selectedModel = modelResult.model;
          modelSource = modelResult.source;
          break;
        }
      }
      
      if (!selectedModel) {
        throw new Error('All vision models unavailable - failed availability checks');
      }
      
      this.logger.info(`[VISION-EMERGENCY] 🎯 Using ${selectedModel} (source: ${modelSource})`);
      
      // Optimize image for API
      const optimizedImage = this._optimizeImageForAPI(base64Image);
      
      // Build messages with vision format
      const messages = [
        ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            {
              type: 'image_url',
              image_url: { url: `data:image/jpeg;base64,${optimizedImage}` }
            }
          ]
        }
      ];
      
      // Call API with selected model
      const response = await axios.post(
        'http://localhost:4000/v1/chat/completions',
        {
          model: selectedModel,
          messages,
          max_tokens: emergencyConfig.max_tokens || 800,
          temperature: emergencyConfig.temperature || 0.2
        },
        {
          timeout: 60000,
          headers: { 'Content-Type': 'application/json' }
        }
      );
      
      const content = response.data.choices[0]?.message?.content;
      this.logger.system('vision-analysis', `[VISION-EMERGENCY] ✅ Response received from ${selectedModel}`);
      
      return this._parseVisionResponse(content);
      
    } catch (error) {
      this.logger.error('[VISION-EMERGENCY] ❌ All vision fallbacks failed', {
        category: 'vision-analysis',
        error: error.message
      });
      
      // Return safe fallback response
      return {
        verified: false,
        confidence: 0,
        reason: 'All vision models unavailable',
        visual_evidence: {},
        _emergency_fallback: true
      };
    }
  }

  /**
     * Call OpenRouter vision API (PAID, RELIABLE)
     * @param {string} base64Image - Base64 encoded image
     * @param {string} prompt - Analysis prompt
     * @returns {Promise<Object>} Parsed analysis result
     * @private
     */
  async _callOpenRouterVisionAPI(base64Image, prompt, systemPrompt = null) {
    try {
      this.logger.system('vision-analysis', '[OPENROUTER] Calling OpenRouter vision API...');

      const apiEndpoint = 'http://localhost:4000/v1/chat/completions';
      const messages = [];
      
      // Add system prompt if provided
      if (systemPrompt) {
        messages.push({
          role: 'system',
          content: systemPrompt
        });
      }
      
      // Add user message with image
      messages.push({
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          {
            type: 'image_url',
            image_url: {
              url: `data:image/jpeg;base64,${base64Image}`
            }
          }
        ]
      });
      
      const response = await axios.post(apiEndpoint, {
        model: 'openai/gpt-4-vision-preview',
        messages,  
        max_tokens: 1000,
        temperature: 0.2  // OpenRouter fallback - hardcoded for now
      }, {
        timeout: 120000,  // 2min timeout for OpenRouter cloud API
        headers: { 'Content-Type': 'application/json' }
      });

      const content = response.data.choices[0].message.content;
      this.logger.system('vision-analysis', '[OPENROUTER] ✅ Response received');

      return this._parseVisionResponse(content);

    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        throw new Error('Vision API endpoint not available. Ensure OpenRouter API is running on localhost:4000.');
      }

      // Handle timeout error
      if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
        this.logger.error('[OPENROUTER] Timeout - both vision APIs failed', {
          category: 'vision-analysis',
          error: error.message
        });
      }
      throw error;
    }
  }

  /**
     * Call vision API with multiple images
     *
     * @param {Array<string>} base64Images - Array of base64 encoded images
     * @param {string} prompt - Analysis prompt
     * @returns {Promise<Object>} Parsed analysis result
     * @private
     */
  async _callVisionAPIMultiImage(base64Images, prompt) {
    try {
      const content = [
        { type: 'text', text: prompt }
      ];

      // Add all images
      for (let i = 0; i < base64Images.length; i++) {
        content.push({
          type: 'image_url',
          image_url: {
            url: `data:image/png;base64,${base64Images[i]}`,
            detail: this.config.imageDetailLevel
          }
        });
      }

      const response = await axios.post(this.config.apiEndpoint, {
        model: this.config.visionModel,
        messages: [
          {
            role: 'user',
            content
          }
        ],
        max_tokens: this.config.maxTokens,
        temperature: this.config.temperature
      }, {
        timeout: this.config.timeout,
        headers: { 'Content-Type': 'application/json' }
      });

      const responseContent = response.data.choices[0].message.content;

      // Parse JSON response
      return this._parseVisionResponse(responseContent);

    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        throw new Error('Vision API endpoint not available. Ensure API server is running.');
      }
      throw error;
    }
  }

  /**
     * Parse vision API response
     * Handles markdown-wrapped JSON and text responses
     *
     * @param {string} content - Raw API response
     * @returns {Object} Parsed JSON
     * @private
     */
  _parseVisionResponse(content) {
    let cleaned = content.trim();

    // Remove markdown code block wrappers
    cleaned = cleaned
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    try {
      const parsed = JSON.parse(cleaned);
      return this._normalizeVisionPayload(parsed);
    } catch (error) {
      // FALLBACK: Try to extract JSON from text response
      this.logger.warn(`[VISION] Initial JSON parse failed, trying to extract JSON from text...`, {
        category: 'vision-analysis',
        rawContent: content.substring(0, 200)
      });

      // Try to find JSON object in the text
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const extracted = JSON.parse(jsonMatch[0]);
          this.logger.system('vision-analysis', '[VISION] ✅ Successfully extracted JSON from text response');
          return this._normalizeVisionPayload(extracted);
        } catch (extractError) {
          // Try to fix JavaScript object notation (unquoted keys)
          try {
            const jsObjectText = jsonMatch[0];
            // Convert JavaScript object notation to valid JSON
            const fixedJson = jsObjectText
              .replace(/([{,]\s*)([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:/g, '$1"$2":') // Quote unquoted keys
              .replace(/:\s*([a-zA-Z_$][a-zA-Z0-9_$]*)\s*([,}])/g, ': "$1"$2') // Quote unquoted string values
              .replace(/:\s*true\s*([,}])/g, ': true$1') // Keep boolean true
              .replace(/:\s*false\s*([,}])/g, ': false$1') // Keep boolean false
              .replace(/:\s*null\s*([,}])/g, ': null$1') // Keep null
              .replace(/:\s*(\d+(?:\.\d+)?)\s*([,}])/g, ': $1$2'); // Keep numbers
            
            const parsed = JSON.parse(fixedJson);
            this.logger.system('vision-analysis', '[VISION] ✅ Successfully converted JavaScript object notation to JSON');
            return this._normalizeVisionPayload(parsed);
          } catch (jsFixError) {
            // Continue to text parsing fallback
          }
        }
      }
      
      // FIXED 2025-10-30: Improved markdown parsing with detailed logging
      this.logger.system('vision-analysis', '[VISION] 🔍 Attempting markdown parsing...');
      const markdownParsed = this._parseMarkdownResponse(content);
      
      if (markdownParsed) {
        this.logger.system('vision-analysis', `[VISION] ✅ Markdown parser returned: verified=${markdownParsed.verified}, confidence=${markdownParsed.confidence}%`);
        
        if (markdownParsed.verified !== undefined) {
          return this._normalizeVisionPayload(markdownParsed);
        } else {
          this.logger.warn('[VISION] ⚠️ Markdown parser returned object but verified field is undefined', {
            category: 'vision-analysis',
            parsed: JSON.stringify(markdownParsed).substring(0, 200)
          });
        }
      } else {
        this.logger.warn('[VISION] ⚠️ Markdown parser returned null - no patterns matched', {
          category: 'vision-analysis',
          contentPreview: content.substring(0, 300)
        });
      }

      // FALLBACK: Parse text response and create JSON structure
      // SECURITY FIX 2025-10-22: NEVER auto-verify from text fallback to prevent hallucinations
      this.logger.warn(`[VISION] Could not extract JSON, creating SAFE fallback response (verified=false)`, {
        category: 'vision-analysis',
        textPreview: content.substring(0, 300),
        security_note: 'Text fallback always returns verified=false to prevent false positives'
      });

      // CRITICAL SECURITY: Text fallback ALWAYS returns verified=false
      // Positive keywords are NOT reliable evidence without structured JSON proof
      // This prevents hallucinations from passing verification automatically
      
      // Create fallback JSON structure with SECURE defaults
      const fallbackResponse = {
        verified: false, // SECURITY: Always false for text fallback
        confidence: 0,   // SECURITY: Zero confidence without structured evidence
        reason: 'Vision model returned unstructured text instead of JSON. Cannot verify without structured evidence.',
        visual_evidence: {
          observed: 'Unable to extract structured visual details from text response',
          matches_criteria: false, // SECURITY: Always false without structured proof
          details: 'Text fallback mode - no reliable visual evidence available. Model response: ' + content.substring(0, 200)
        },
        suggestions: 'Vision model failed to return structured JSON. Consider: 1) Using different vision model, 2) Simplifying success criteria, 3) Retrying verification',
        _fallback: true,
        _fallback_reason: 'json_parse_failed',
        _original_response: content.substring(0, 500) || '',
        _security_note: 'Text fallback always returns verified=false to prevent false positives'
      };

      // CRITICAL: Ensure all required fields exist to prevent undefined errors
      if (!fallbackResponse.visual_evidence) {
        fallbackResponse.visual_evidence = {};
      }
      if (!fallbackResponse.visual_evidence.observed) {
        fallbackResponse.visual_evidence.observed = 'No visual details available';
      }
      if (!fallbackResponse.visual_evidence.details) {
        fallbackResponse.visual_evidence.details = 'No details available';
      }

      return this._normalizeVisionPayload(fallbackResponse);
    }
  }

  /**
   * Parse markdown-formatted vision response
   * @param {string} content - Raw markdown content
   * @returns {Object|null} Parsed object or null if parsing failed
   * @private
   */
  _parseMarkdownResponse(content) {
    try {
      // FIXED 2025-10-30: More aggressive pattern matching for various text formats
      // Try multiple verification patterns
      let verifiedMatch = content.match(/\*\*\s*Verified\s*[:\*]*\s*(true|false|Yes|No)/i);
      
      // Try alternative markdown patterns
      if (!verifiedMatch) {
        verifiedMatch = content.match(/\*\s*Answer\s*\*\s*:\s*(verified|not verified|true|false|yes|no)/i);
      }
      if (!verifiedMatch) {
        verifiedMatch = content.match(/Answer\s*:\s*(verified|not verified|true|false|yes|no)/i);
      }
      if (!verifiedMatch) {
        verifiedMatch = content.match(/Result\s*:\s*(verified|not verified|true|false|yes|no)/i);
      }
      
      // Try plain text patterns (no markdown)
      if (!verifiedMatch) {
        verifiedMatch = content.match(/(?:is\s+|are\s+)?(verified|not verified|true|false|yes|no)(?:[\s.,;]|$)/i);
      }
      
      // Try detecting verification in natural language
      if (!verifiedMatch) {
        if (/calculator\s+is\s+open|application\s+is\s+(?:open|visible|running)/i.test(content)) {
          verifiedMatch = ['', 'Yes'];
        } else if (/not\s+(?:open|visible|found)|cannot\s+verify/i.test(content)) {
          verifiedMatch = ['', 'No'];
        }
      }
      
      if (!verifiedMatch) return null;
      
      const verifiedValue = verifiedMatch[1].toLowerCase();
      const verified = verifiedValue === 'true' || verifiedValue === 'yes' || verifiedValue === 'verified';
      
      // Extract confidence
      const confidenceMatch = content.match(/\*\*\s*Confidence\s*[:\*]*\s*(\d+)%?/i);
      // UPDATED 2025-11-08: Lower optimistic default for markdown responses to avoid false positives
      const confidence = confidenceMatch ? parseInt(confidenceMatch[1], 10) : (verified ? 55 : 25);
      
      // Extract reason
      const reasonMatch = content.match(/\*\*\s*Reason\s*[:\*]*\s*([^\n*]+)/i);
      const reason = reasonMatch ? reasonMatch[1].trim() : 'No reason provided';
      
      // Extract observed value
      const observedMatch = content.match(/\*\*\s*(?:Observed|Visual Evidence)\s*[:\*]*\s*([^\n*]+)/i);
      const observed = observedMatch ? observedMatch[1].trim() : 'No visual details provided';
      
      // Extract details
      const detailsMatch = content.match(/\*\*\s*Details\s*[:\*]*\s*([^\n*]+)/i);
      const details = detailsMatch ? detailsMatch[1].trim() : 'No additional details';
      
      return {
        verified,
        confidence,
        reason,
        visual_evidence: {
          observed,
          matches_criteria: verified,
          details
        },
        _markdown_parsed: true
      };
    } catch (error) {
      this.logger.warn(`[VISION] Markdown parsing failed: ${error.message}`, {
        category: 'vision-analysis'
      });
      return null;
    }
  }

  /**
     * Normalize parsed vision payload to guarantee required fields
     * @param {Object} payload - Parsed payload from vision model
     * @returns {Object} Normalized payload
     * @private
     */
  _normalizeVisionPayload(payload = {}) {
    const normalized = { ...payload };

    normalized.verified = typeof normalized.verified === 'boolean'
      ? normalized.verified
      : Boolean(normalized.result === 'verified');

    // INTELLIGENT CONFIDENCE 2025-10-24: Dynamic confidence calculation
    let confidence = Number(normalized.confidence);
    if (!Number.isFinite(confidence)) {
      // Calculate confidence based on evidence quality
      if (normalized._fallback) {
        confidence = 0; // No confidence for fallback responses
      } else if (normalized.visual_evidence?.matches_criteria) {
        confidence = 85; // High confidence with matching evidence
      } else if (normalized.verified) {
        confidence = 70; // Medium confidence if verified but no explicit match
      } else {
        confidence = 30; // Low confidence for unverified
      }
    }
    confidence = Math.max(0, Math.min(100, confidence));
    normalized.confidence = confidence;

    normalized.reason = typeof normalized.reason === 'string'
      ? normalized.reason
      : (normalized.message || 'Vision model did not provide a reason');

    const evidence = normalized.visual_evidence ?? {};
    normalized.visual_evidence = {
      observed: typeof evidence.observed === 'string' && evidence.observed.trim().length > 0
        ? evidence.observed
        : (evidence.text || 'No visual details provided'),
      matches_criteria: Boolean(evidence.matches_criteria),
      details: typeof evidence.details === 'string' && evidence.details.trim().length > 0
        ? evidence.details
        : 'No additional details provided'
    };

    if (normalized.verified && !normalized.visual_evidence.matches_criteria) {
      normalized.visual_evidence.matches_criteria = true;
    }

    normalized._fallback = Boolean(normalized._fallback);

    return normalized;
  }

  _applyVerificationGuards(result, successCriteria = '', context = {}) {
    if (!result) {
      return result;
    }

    const guardNotes = [];
    const normalizedCriteria = (successCriteria || '').toLowerCase();

    if (this._requiresVideoGuard(normalizedCriteria, context)) {
      const evidenceText = this._collectEvidenceText(result, context);
      const playbackIndicators = [
        'playing',
        'playback',
        'pause button',
        'video controls',
        'timeline',
        'progress bar',
        'youtube player',
        'play icon',
        'time bar',
        'buffering',
        'video player',
        'контрол',
        'прогрес',
        'вiдтвор',
        'пауза'
      ];

      if (!this._textContainsAny(evidenceText, playbackIndicators)) {
        guardNotes.push('video-playback-indicator-missing');
        result.verified = false;
        if (result.visual_evidence) {
          result.visual_evidence.matches_criteria = false;
        }
        result.confidence = Number.isFinite(result.confidence) ? Math.min(result.confidence, 35) : 35;
        if (!result.reason || result.reason === 'No reason provided') {
          result.reason = 'Відсутні ознаки відтворення відео або програвача на скріншоті.';
        }
      }

      if (this._requiresFullscreenGuard(normalizedCriteria, context)) {
        const fullscreenIndicators = [
          'full screen',
          'fullscreen',
          'повноекран',
          'maximize',
          'full-screen icon',
          'full screen button'
        ];

        if (!this._textContainsAny(evidenceText, fullscreenIndicators)) {
          guardNotes.push('fullscreen-indicator-missing');
          result.verified = false;
          if (result.visual_evidence) {
            result.visual_evidence.matches_criteria = false;
          }
          result.confidence = Number.isFinite(result.confidence) ? Math.min(result.confidence, 30) : 30;
          if (!result.reason || result.reason === 'No reason provided') {
            result.reason = 'Не бачу підтвердження повноекранного режиму на скріншоті.';
          }
        }
      }
    }

    if (guardNotes.length > 0) {
      result._guard_notes = Array.isArray(result._guard_notes)
        ? [...result._guard_notes, ...guardNotes]
        : guardNotes;
    }

    return result;
  }

  _requiresVideoGuard(normalizedCriteria, context = {}) {
    if (!normalizedCriteria) {
      return false;
    }

    const videoKeywords = ['відео', 'video', 'play', 'youtube', 'відтвор'];
    const previousActions = (context.previous_actions || '').toLowerCase();
    const action = (context.action || '').toLowerCase();

    return this._textContainsAny(normalizedCriteria, videoKeywords)
      || this._textContainsAny(previousActions, videoKeywords)
      || this._textContainsAny(action, videoKeywords);
  }

  _requiresFullscreenGuard(normalizedCriteria, context = {}) {
    const fullscreenKeywords = ['full screen', 'fullscreen', 'повноекран'];
    const previousActions = (context.previous_actions || '').toLowerCase();
    const action = (context.action || '').toLowerCase();

    return this._textContainsAny(normalizedCriteria, fullscreenKeywords)
      || this._textContainsAny(previousActions, fullscreenKeywords)
      || this._textContainsAny(action, fullscreenKeywords);
  }

  _collectEvidenceText(result, context = {}) {
    const parts = [];

    if (result.reason) parts.push(String(result.reason));
    if (result.message) parts.push(String(result.message));

    if (result.visual_evidence) {
      const { observed, details, text } = result.visual_evidence;
      if (observed) parts.push(String(observed));
      if (details) parts.push(String(details));
      if (text) parts.push(String(text));
    }

    if (Array.isArray(result.notes)) {
      parts.push(result.notes.join(' '));
    }

    if (context.execution_history) parts.push(String(context.execution_history));

    return parts.join(' ').toLowerCase();
  }

  _textContainsAny(text, keywords) {
    if (!text || !keywords || keywords.length === 0) {
      return false;
    }

    return keywords.some(keyword => text.includes(keyword.toLowerCase()));
  }

  /**
     * Get service status
     *
     * @returns {Object} Status info
     */
  getStatus() {
    return {
      initialized: this.initialized,
      visionModel: this.config.visionModel,
      apiEndpoint: this.config.apiEndpoint,
      imageDetailLevel: this.config.imageDetailLevel
    };
  }

  /**
     * Cleanup and shutdown
     */
  async destroy() {
    this.initialized = false;
    this.logger.system('vision-analysis', '[VISION] Vision Analysis Service destroyed');
  }
}

export default VisionAnalysisService;
