# Models Configuration Report - 2025-11-18

## Overview

Complete mapping of AI/Vision models used in ATLAS system, their configuration sources, and fallback chains.

---

## 1. Vision Models Configuration

### Primary Vision Models (for Grisha Verification)

**Source:** `/config/models-config.js` → `VISION_CONFIG`

| Model                 | Type          | Speed | Quality   | Max Tokens | Provider | Cost   |
| --------------------- | ------------- | ----- | --------- | ---------- | -------- | ------ |
| `copilot-gpt-4o`      | Primary       | 1-2s  | Excellent | 4096       | Copilot  | $0.005 |
| `copilot-gpt-4o-mini` | Fast/Standard | 1-2s  | Good      | 2048       | Copilot  | $0.001 |

### Vision Verification Stages

**Source:** `/config/models-config.js` → `MCP_MODEL_CONFIG.stages`

```javascript
vision_verification_fast: {
  model: 'atlas-gpt-4o-mini'  // Attempt 1 (fast model)
  temperature: 0.2
  max_tokens: 800
}

vision_verification_strong: {
  model: 'atlas-gpt-4o'        // Attempt 2 (strong model)
  temperature: 0.2
  max_tokens: 1000
}

vision_fallback: {
  model: 'llama3.2-vision'      // Ollama local (FREE, slow 120+ sec)
  endpoint: 'http://localhost:11434/api/generate'
}

vision_emergency: {
  model: 'copilot-gpt-4o'       // Emergency fallback (fast & reliable)
  temperature: 0.2
  max_tokens: 800
  endpoint: 'http://localhost:4000/v1/chat/completions'
}
```

### Vision Model Fallback Chain (UPDATED 2025-11-18)

```
1. Port 4000 API (copilot-gpt-4o) ~2-5 sec
   ↓ (if fails)
2. Fallback 1: atlas-llama-3.2-11b-vision-instruct ~5-10 sec
   ↓ (if fails)
3. Fallback 2: atlas-llama-3.2-90b-vision-instruct ~10-15 sec (потужніший)
   ↓ (if fails)
4. Fallback 3: atlas-gpt-4o-mini ~2-5 sec (швидкий, економний)
   ↓ (if fails)
5. Emergency Fallback (ModelAvailabilityChecker)
   - Tries up to 3 alternative vision models
   - Timeout: 60s per model
   ↓ (if all fail)
6. Text Parsing Fallback (SAFE: verified=false)

NOTE: Ollama (llama3.2-vision) disabled 2025-11-18 - using Port 4000 models instead
```

### Environment Variables for Vision

**File:** `.env` (UPDATED 2025-11-18)

```bash
# Vision models (UPDATED 2025-11-18)
MCP_MODEL_VISION=copilot-gpt-4o
MCP_MODEL_VISION_FALLBACK=copilot-gpt-4o
MCP_TEMP_VISION=0.2

# Vision Verification Stages (UPDATED 2025-11-18)
MCP_MODEL_VISION_FAST=atlas-gpt-4o-mini
MCP_TEMP_VISION_FAST=0.2

MCP_MODEL_VISION_STRONG=atlas-gpt-4o
MCP_TEMP_VISION_STRONG=0.2

# Vision Fallback Chain (UPDATED 2025-11-18)
MCP_MODEL_VISION_FALLBACK_1=atlas-llama-3.2-11b-vision-instruct
MCP_TEMP_VISION_FALLBACK_1=0.2

MCP_MODEL_VISION_FALLBACK_2=atlas-llama-3.2-90b-vision-instruct
MCP_TEMP_VISION_FALLBACK_2=0.2

MCP_MODEL_VISION_FALLBACK_3=atlas-gpt-4o-mini
MCP_TEMP_VISION_FALLBACK_3=0.2

# Vision Emergency Fallback (UPDATED 2025-11-18)
MCP_MODEL_VISION_EMERGENCY=copilot-gpt-4o
MCP_TEMP_VISION_EMERGENCY=0.2

# COMMENTED 2025-11-18: Ollama local vision disabled
# MCP_MODEL_VISION_FALLBACK_OLLAMA=llama3.2-vision
```

---

## 2. LLM Strategy Models Configuration

### Verification Eligibility (Grisha Strategy Decision)

**Source:** `/config/models-config.js` → `MCP_MODEL_CONFIG.stages.verification_eligibility`

```javascript
verification_eligibility: {
  model: 'atlas-ministral-3b',           // Primary (fast classification)
  fallback: 'atlas-jamba-1.5-mini',      // Fallback
  temperature: 0.1,
  max_tokens: 500,
  description: 'Grisha Verification Eligibility - routing decision'
}
```

**Environment Variables:**
```bash
MCP_MODEL_VERIFICATION_ELIGIBILITY=copilot-gpt-4o
MCP_MODEL_VERIFICATION_ELIGIBILITY_FALLBACK=copilot-gpt-4.1
MCP_TEMP_VERIFICATION_ELIGIBILITY=0.1
```

**Note:** `.env` overrides the hardcoded `atlas-ministral-3b` with `copilot-gpt-4o` (UPDATED 2025-11-14)

### Verify Item (Grisha Verification Execution)

**Source:** `/config/models-config.js` → `MCP_MODEL_CONFIG.stages.verify_item`

```javascript
verify_item: {
  model: 'atlas-mistral-small-2503',     // Primary (fast verification)
  temperature: 0.15,
  max_tokens: 800,
  description: 'Grisha Verify Item - швидка верифікація'
}
```

**Environment Variables:**
```bash
MCP_MODEL_VERIFY_ITEM=copilot-gpt-4o
MCP_MODEL_VERIFY_ITEM_FALLBACK=copilot-gpt-4.1
MCP_TEMP_VERIFY_ITEM=0.15
```

**Note:** `.env` overrides with `copilot-gpt-4o` (UPDATED 2025-11-14)

---

## 3. Complete LLM Models List

### All MCP Models (from `.env` - UPDATED 2025-11-14)

| Stage                        | Primary Model        | Fallback Model        | Temperature |
| ---------------------------- | -------------------- | --------------------- | ----------- |
| Mode Selection               | `copilot-gpt-4o`     | `copilot-gpt-4.1`     | 0.05        |
| Backend Selection            | `copilot-gpt-4o`     | `copilot-gpt-4o`      | 0.05        |
| Context Enrichment           | `copilot-gpt-4.1`    | `copilot-gpt-4o`      | 0.3         |
| TODO Planning                | `copilot-gpt-4.1`    | `copilot-gpt-4o`      | 0.3         |
| Reasoning                    | `copilot-gpt-4o`     | `copilot-gpt-4o`      | 0.2         |
| Plan Tools                   | `copilot-gpt-4o`     | `copilot-gpt-4o`      | 0.1         |
| **Verification Eligibility** | **`copilot-gpt-4o`** | **`copilot-gpt-4.1`** | **0.1**     |
| **Verify Item**              | **`copilot-gpt-4o`** | **`copilot-gpt-4.1`** | **0.15**    |
| Adjust TODO                  | `copilot-gpt-4.1`    | `copilot-gpt-4o`      | 0.2         |
| Replan TODO                  | `copilot-gpt-4.1`    | `copilot-gpt-4o`      | 0.3         |
| Final Summary                | `copilot-gpt-4o`     | `copilot-gpt-4.1`     | 0.5         |
| Dev Analysis                 | `copilot-gpt-4.1`    | `copilot-gpt-4o`      | 0.2         |
| **Vision Analysis**          | **`copilot-gpt-4o`** | **`copilot-gpt-4o`**  | **0.2**     |
| TTS Optimization             | `copilot-gpt-4o`     | `copilot-gpt-4.1`     | 0.3         |
| Server Selection             | `copilot-gpt-4o`     | -                     | 0.05        |
| Chat Memory Eligibility      | `copilot-gpt-4o`     | `copilot-gpt-4.1`     | 0.1         |
| Intent Detection             | `copilot-gpt-4o`     | `copilot-gpt-4o`      | 0.1         |

---

## 4. Configuration Sources Hierarchy

### Priority Order

1. **Environment Variables (`.env`)** - HIGHEST PRIORITY
   - Overrides all hardcoded values
   - Used at runtime via `process.env`

2. **Hardcoded Defaults (`models-config.js`)** - FALLBACK
   - Used if `.env` variable not set
   - Provides sensible defaults

3. **Fallback Models** - EMERGENCY
   - Used if primary model fails
   - Specified in `fallback` field

### Example: Verification Eligibility

```javascript
// In models-config.js (hardcoded default)
verification_eligibility: {
  get model() {
    return env.MCP_MODEL_VERIFICATION_ELIGIBILITY || 'atlas-ministral-3b';
  },
  get fallback() {
    return env.MCP_MODEL_VERIFICATION_ELIGIBILITY_FALLBACK || 'atlas-jamba-1.5-mini';
  }
}

// In .env (OVERRIDES hardcoded)
MCP_MODEL_VERIFICATION_ELIGIBILITY=copilot-gpt-4o
MCP_MODEL_VERIFICATION_ELIGIBILITY_FALLBACK=copilot-gpt-4.1

// Result at runtime
model = 'copilot-gpt-4o'        // From .env
fallback = 'copilot-gpt-4.1'    // From .env
```

---

## 5. Vision Strategy Models

### Current Strategy (After 2025-11-18 Changes)

**File:** `/orchestrator/workflow/stages/grisha-verification-strategy.js`

```javascript
// Default strategy (no heuristics)
determineStrategy(item, execution) {
  return {
    method: 'visual',           // Always start with visual
    confidence: 70,             // Default confidence
    fallbackToMcp: true,        // Can fallback to MCP if visual fails
    mcpFallbackTools: []        // Empty - LLM eligibility will decide
  };
}
```

### LLM Eligibility Decision

**File:** `/orchestrator/workflow/stages/grisha-verification-eligibility-processor.js`

- Calls LLM (verification_eligibility model) to analyze:
  - Action text
  - Success criteria
  - Execution results
- Recommends: `visual` / `mcp` / `hybrid`
- Confidence: 0-100%

### Final Decision Logic

```
IF heuristic_confidence >= 80% AND NOT (llm_confidence > heuristic + 20%)
  → Keep heuristic decision (visual-first)
ELSE
  → Use LLM decision (may override to mcp)
```

---

## 6. Model Availability & Fallback Chain

### Port 4000 API (Primary)

**Endpoint:** `http://localhost:4000/v1/chat/completions`

**Available Models:**
- `copilot-gpt-4o` ✅ (Copilot GPT-4o)
- `copilot-gpt-4.1` ✅ (Copilot GPT-4.1)
- `copilot-gpt-4o-mini` ✅ (Copilot GPT-4o-mini)
- Other atlas-* models (via ModelAvailabilityChecker)

**Timeout:** 60s (vision), 30s (text)

### Ollama (Fallback 1)

**Endpoint:** `http://localhost:11434/api/generate`

**Available Models:**
- `llama3.2-vision` ✅ (for vision verification)

**Timeout:** 600s (10 min)

**Cost:** FREE

### Emergency Fallback (Fallback 2)

**Uses:** ModelAvailabilityChecker

**Tries:** Up to 3 alternative vision models

**Models:** 
- `atlas-gpt-4o-mini`
- `atlas-llama-3.2-11b-vision-instruct`
- `atlas-phi-4-multimodal-instruct`

---

## 7. Configuration Files & Locations

### Main Configuration Files

| File                                                           | Purpose                | Models Defined                                   |
| -------------------------------------------------------------- | ---------------------- | ------------------------------------------------ |
| `.env`                                                         | Environment variables  | All MCP models, vision models                    |
| `config/models-config.js`                                      | Model definitions      | VISION_CONFIG, AI_MODEL_CONFIG, MCP_MODEL_CONFIG |
| `config/atlas-config.js`                                       | Config aggregator      | Imports from models-config.js                    |
| `orchestrator/services/vision-analysis-service.js`             | Vision service         | Uses VISION_CONFIG, MCP_MODEL_CONFIG             |
| `orchestrator/workflow/stages/grisha-verify-item-processor.js` | Verification processor | Uses MCP_MODEL_CONFIG                            |

### How to Update Models

**Option 1: Update `.env` (Recommended)**
```bash
# Change verification model
MCP_MODEL_VERIFICATION_ELIGIBILITY=your-new-model
MCP_MODEL_VERIFICATION_ELIGIBILITY_FALLBACK=your-fallback-model
```

**Option 2: Update `models-config.js` (Hardcoded Defaults)**
```javascript
verification_eligibility: {
  get model() {
    return env.MCP_MODEL_VERIFICATION_ELIGIBILITY || 'your-new-default';
  }
}
```

**Option 3: Update VISION_CONFIG (Vision Models)**
```javascript
export const VISION_CONFIG = {
  primary: {
    model: 'your-vision-model',
    // ...
  }
}
```

---

## 8. Current Status (2025-11-18 - UPDATED)

### Vision Models ✅
- **Primary:** `copilot-gpt-4o` (Port 4000, ~2-5 sec)
- **Fallback 1:** `atlas-llama-3.2-11b-vision-instruct` (Port 4000, ~5-10 sec)
- **Fallback 2:** `atlas-llama-3.2-90b-vision-instruct` (Port 4000, ~10-15 sec, потужніший)
- **Fallback 3:** `atlas-gpt-4o-mini` (Port 4000, ~2-5 sec, економний)
- **Emergency:** `copilot-gpt-4o` (ModelAvailabilityChecker)
- **Ollama:** ~~`llama3.2-vision`~~ **DISABLED** (2025-11-18)

### LLM Strategy Models ✅
- **Verification Eligibility:** `copilot-gpt-4o` (with `copilot-gpt-4.1` fallback)
- **Verify Item:** `copilot-gpt-4o` (with `copilot-gpt-4.1` fallback)
- **All configured in `.env`** (UPDATED 2025-11-14)

### Configuration ✅
- All models in `.env` ✅
- All models in `config/models-config.js` ✅
- Fallback chains defined ✅
- Environment variables override hardcoded defaults ✅

---

## 9. Quick Reference

### To Check Current Vision Model
```javascript
import GlobalConfig from './config/atlas-config.js';

const visionModel = GlobalConfig.VISION_CONFIG.primary.model;
console.log(visionModel); // 'copilot-gpt-4o'
```

### To Check Current Verification Strategy Model
```javascript
const verifyModel = GlobalConfig.MCP_MODEL_CONFIG.getStageConfig('verification_eligibility').model;
console.log(verifyModel); // 'copilot-gpt-4o'
```

### To Check Current Verify Item Model
```javascript
const verifyItemModel = GlobalConfig.MCP_MODEL_CONFIG.getStageConfig('verify_item').model;
console.log(verifyItemModel); // 'copilot-gpt-4o'
```

---

## Summary

✅ **Vision Models:** Fully configured with fallback chain (Port 4000 → Ollama → Emergency)  
✅ **LLM Strategy Models:** Fully configured in `.env` (copilot-gpt-4o primary, copilot-gpt-4.1 fallback)  
✅ **Configuration:** All in `.env` and `models-config.js` with proper hierarchy  
✅ **Fallbacks:** Complete fallback chains for all critical stages  

**All models are properly defined and configured for production use.**
