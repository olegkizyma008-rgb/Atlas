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

import axios from 'axios';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import CircuitBreaker from '../utils/circuit-breaker.js';
import GlobalConfig from '../../config/atlas-config.js';

/**
 * Vision Analysis Service
 * Uses AI vision models to analyze screenshots
 *
 * PRIORITY (OPTIMIZED 2025-10-17):
 * 1. Port 4000 LLM API - Fast inference (~2-5 sec) ✅ PRIMARY
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

      // Construct vision analysis prompt
      const prompt = this._constructAnalysisPrompt(successCriteria, context);

      // Call vision API with retry logic
      const analysis = await this._callVisionAPIWithRetry(base64Image, prompt);

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
     * @returns {Promise<Object>} Analysis result
     * @private
     */
  async _callVisionAPIWithRetry(base64Image, prompt, retries = 3) {
    let lastError;
    for (let i = 0; i < retries; i++) {
      try {
        return await this._callVisionAPI(base64Image, prompt);
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
    // FIXED 17.10.2025 - Truncate executionResults to prevent context overflow
    // Problem: JSON.stringify(executionResults) can be 200KB+ (screenshots, HTML, etc.)
    // Solution: Only include summary (tool names + success status)
    let executionSummary = '';
    if (context.executionResults && Array.isArray(context.executionResults)) {
      executionSummary = context.executionResults.map(r =>
        `- ${r.tool || 'unknown'}: ${r.success ? '✅ success' : '❌ failed'}${r.error ? ` (${String(r.error).substring(0, 100)})` : ''}`
      ).join('\n');
    }

    return `You are a visual verification expert analyzing a screenshot to verify task completion.

**Success Criteria:** ${successCriteria}

${context.action ? `**Task Action:** ${context.action}` : ''}
${executionSummary ? `**Execution Summary:**\n${executionSummary}` : ''}

🚨 CRITICAL VERIFICATION RULES:
1. READ THE EXACT VALUES from the screenshot - do NOT assume or guess
2. EXTRACT the actual value you see, then COMPARE to what's expected
3. If observed value MATCHES expected → verified: true
4. If observed value DIFFERS from expected → verified: false
5. Do NOT use "shows X, not X" format - that's nonsensical!

**CRITICAL: Return ONLY pure JSON - NO markdown, NO text before/after**

**Instructions:**
1. Carefully examine the screenshot
2. EXTRACT exact values (numbers, text, states) visible on screen
3. COMPARE extracted values with success criteria
4. Verify if criteria is met based on EXACT match (not approximate)
5. Provide specific visual evidence from the screenshot
6. Return ONLY a JSON object - NO code blocks, NO markdown, NO explanatory text

**Example 1 - Success (numbers MATCH):**
- Success Criteria: "Calculator shows result 6"
- Screenshot shows: "6"
- Correct response: {"verified": true, "reason": "Calculator displays 6, which matches the expected result", "visual_evidence": {"observed": "6", "matches_criteria": true}}

**Example 2 - Failure (numbers DIFFER):**
- Success Criteria: "Calculator shows result 666"
- Screenshot shows: "87"
- Correct response: {"verified": false, "reason": "Calculator displays 87, but expected result is 666", "visual_evidence": {"observed": "87", "matches_criteria": false}}

**WRONG Example (DO NOT DO THIS):**
- ❌ {"reason": "Calculator shows 6, not 6"} ← This is NONSENSE! If you see 6 and expect 6, it's verified: true!

**Required JSON format (return EXACTLY this structure, nothing else):**
{
  "verified": boolean,
  "confidence": number (0-100),
  "reason": "string - explanation with EXACT values you see",
  "visual_evidence": {
    "observed": "string - EXACT text/numbers you see in screenshot",
    "matches_criteria": boolean,
    "details": "string - specific visual details with exact values"
  },
  "suggestions": "string - if not verified, what needs to change"
}

⚠️ CRITICAL: Your response must START with { and END with } - nothing before, nothing after!
Do NOT wrap in code blocks or any markdown. Just pure JSON.

Analyze the screenshot and return ONLY the JSON object.`;
  }

  /**
     * Construct comparison prompt for change detection
     *
     * @param {string} expectedChange - What change to look for
     * @returns {string} Prompt
     * @private
     */
  _constructComparisonPrompt(expectedChange) {
    return `You are comparing two screenshots to detect changes.

**Expected Change:** ${expectedChange}

**Instructions:**
1. Examine both screenshots carefully
2. Identify any differences between them
3. Determine if the expected change occurred
4. Provide specific visual evidence

**Required JSON format:**
{
  "changeDetected": boolean,
  "matchesExpectedChange": boolean,
  "confidence": number (0-100),
  "differences": ["array of specific differences observed"],
  "visual_evidence": "string - describe the change visually",
  "explanation": "string - whether this matches the expected change"
}

Return ONLY the JSON object.`;
  }

  /**
     * Construct stuck detection prompt
     *
     * @param {string} expectedActivity - What should be happening
     * @returns {string} Prompt
     * @private
     */
  _constructStuckDetectionPrompt(expectedActivity) {
    return `You are analyzing a series of screenshots to detect if a system is stuck.

**Expected Activity:** ${expectedActivity}

**Instructions:**
1. Compare all screenshots chronologically
2. Look for signs of progress or stuck state
3. Identify if the expected activity is occurring
4. Detect repetitive states, frozen UI, or lack of progress

**Required JSON format:**
{
  "stuck": boolean,
  "confidence": number (0-100),
  "reason": "string - why stuck or progressing",
  "visual_evidence": {
    "progress_indicators": ["array of progress signs if any"],
    "stuck_indicators": ["array of stuck signs if any"],
    "last_change_detected": "string - description of last visual change"
  },
  "recommendation": "string - what action to take if stuck"
}

Return ONLY the JSON object.`;
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
  async _callVisionAPI(base64Image, prompt) {
    try {
      // PRIMARY: Try port 4000 first (FAST ~2-5 sec)
      if (this.port4000Available && this.visionProvider === 'port4000') {
        return await this._callPort4000VisionAPI(base64Image, prompt);
      }

      // FALLBACK: Try Ollama (SLOW ~120+ sec but FREE)
      if (this.visionProvider === 'ollama' && this.ollamaAvailable) {
        return await this._callOllamaVisionAPI(base64Image, prompt);
      }

      // DISABLED 2025-10-22: OpenRouter fallback not working (parsing issues)
      throw new Error('No vision API available. Port 4000 and Ollama unavailable. OpenRouter fallback disabled.');

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
  async _callPort4000VisionAPI(base64Image, prompt) {
    try {
      this.logger.system('vision-analysis', '[PORT-4000] 🚀 Calling Port 4000 LLM API (FAST ~2-5 sec)...');

      // OPTIMIZATION 2025-10-17: Check and optimize image to prevent 413 errors
      const optimizedImage = this._optimizeImageForAPI(base64Image);

      // Use centralized vision model config from global-config.js
      const visionConfig = GlobalConfig.MCP_MODEL_CONFIG.getStageConfig('vision_analysis');
      const endpoint = GlobalConfig.MCP_MODEL_CONFIG.apiEndpoint.primary;
      const apiEndpoint = visionConfig.endpoint || 'http://localhost:4000/v1/chat/completions';

      // Prepare headers - add Copilot-Vision-Request for GitHub Copilot models
      const headers = { 'Content-Type': 'application/json' };
      
      // FIXED 18.10.2025: GitHub Copilot requires special header for vision requests
      if (visionConfig.model && visionConfig.model.includes('copilot')) {
        headers['Copilot-Vision-Request'] = 'true';
        this.logger.system('vision-analysis', '[PORT-4000] Adding Copilot-Vision-Request header for GitHub Copilot model');
      }

      const response = await axios.post(apiEndpoint, {
        model: visionConfig.model,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: prompt
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${optimizedImage}`,
                  detail: 'low'  // Low detail for SPEED and smaller payload
                }
              }
            ]
          }
        ],
        max_tokens: visionConfig.max_tokens || 1000,
        temperature: visionConfig.temperature
      }, {
        timeout: 30000,  // FIXED 2025-10-22: 30s timeout to prevent hanging (was: 0 = infinite)
        headers
      });

      const content = response.data.choices[0]?.message?.content;
      this.logger.system('vision-analysis', '[PORT-4000] ✅ Fast response received');

      return this._parseVisionResponse(content);

    } catch (error) {
      // Handle specific HTTP errors
      if (error.response?.status === 422) {
        this.logger.error('[PORT-4000] ❌ 422 Unprocessable Entity - model may not support vision API', {
          category: 'vision-analysis',
          model: visionConfig.model,
          hint: 'Check if the model supports vision API format (multimodal)'
        });

        // Try Ollama fallback only
        if (this.ollamaAvailable) {
          this.logger.system('vision-analysis', '[FALLBACK] Trying Ollama after 422 error...');
          return await this._callOllamaVisionAPI(base64Image, prompt);
        }
        // DISABLED: OpenRouter fallback
        throw new Error('422 error and Ollama unavailable. OpenRouter fallback disabled.');
      }

      if (error.response?.status === 413) {
        this.logger.error('[PORT-4000] ❌ 413 Payload Too Large - request exceeded size limit', {
          category: 'vision-analysis',
          hint: 'Image/prompt too large, trying fallback'
        });

        // Try Ollama fallback only
        if (this.ollamaAvailable) {
          this.logger.system('vision-analysis', '[FALLBACK] Trying Ollama after 413 error...');
          return await this._callOllamaVisionAPI(base64Image, prompt);
        }
        // DISABLED: OpenRouter fallback
        throw new Error('413 error and Ollama unavailable. OpenRouter fallback disabled.');
      }

      if (error.code === 'ECONNREFUSED') {
        this.logger.warn('[PORT-4000] Connection refused - port 4000 not available', {
          category: 'vision-analysis'
        });
        this.port4000Available = false;

        // Try Ollama fallback only
        if (this.ollamaAvailable) {
          this.logger.system('vision-analysis', '[FALLBACK] Trying Ollama...');
          return await this._callOllamaVisionAPI(base64Image, prompt);
        }

        // DISABLED: OpenRouter fallback
        throw new Error('Port 4000 unavailable and Ollama unavailable. OpenRouter fallback disabled.');
      }

      // Timeout error - DISABLED OpenRouter fallback 2025-10-22
      if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
        this.logger.error('[PORT-4000] Timeout - port 4000 too slow', {
          category: 'vision-analysis',
          note: 'OpenRouter fallback disabled - vision parsing not working'
        });

        if (this.ollamaAvailable) {
          this.logger.system('vision-analysis', '[FALLBACK] Trying Ollama...');
          return await this._callOllamaVisionAPI(base64Image, prompt);
        }

        // DISABLED: OpenRouter fallback not working (parsing issues)
        throw new Error('Port 4000 timeout and Ollama unavailable. OpenRouter fallback disabled.');
      }

      throw error;
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
  async _callOllamaVisionAPI(base64Image, prompt) {
    try {
      this.logger.system('vision-analysis', '[OLLAMA] ⚠️  Calling Ollama (slow 120+ sec, FREE fallback)...');

      const ollamaConfig = GlobalConfig.MCP_MODEL_CONFIG.getStageConfig('vision_fallback');
      const response = await axios.post(ollamaConfig.endpoint, {
        model: ollamaConfig.model,
        prompt: prompt,
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
     * Call OpenRouter vision API (cloud)
     * @param {string} base64Image - Base64 encoded image
     * @param {string} prompt - Analysis prompt
     * @returns {Promise<Object>} Parsed analysis result
     * @private
     */
  async _callOpenRouterVisionAPI(base64Image, prompt) {
    try {
      this.logger.system('vision-analysis', '[OPENROUTER] Calling OpenRouter vision API...');

      const apiEndpoint = 'http://localhost:4000/v1/chat/completions';
      const response = await axios.post(apiEndpoint, {
        model: this.visionModel,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: prompt
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/png;base64,${base64Image}`,
                  detail: 'auto'
                }
              }
            ]
          }
        ],
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
      return JSON.parse(cleaned);
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
          return extracted;
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
            return parsed;
          } catch (jsFixError) {
            // Continue to text parsing fallback
          }
        }
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
        reason: 'Vision model returned unstructured text instead of JSON. Cannot verify without structured evidence. ' + content.substring(0, 400),
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

      return fallbackResponse;
    }
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
