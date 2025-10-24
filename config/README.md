# ⚙️ ATLAS Configuration System

This directory contains all configuration files for the ATLAS v5.0 system.

## 📁 Structure

### Core Configurations
- `atlas-config.js` - Main ATLAS configuration aggregator
- `global-config.js` - Legacy re-export for backward compatibility
- `system-config.js` - System-level settings and environment

### 🧠 Dynamic Configuration (NEW 2025-10-24)
- `dynamic-config.js` - Intelligent adaptive configuration system
  - Dynamic timeouts based on system load
  - Adaptive model selection based on context
  - Context-aware defaults
  - Learning from error patterns
  - Feature flags management

### Component Configurations
- `agents-config.js` - Agent configurations (Atlas, Tetyana, Grisha)
- `api-config.js` - API endpoints and network settings
- `models-config.js` - AI model configurations and providers
- `web-config.js` - Web interface settings
- `workflow-config.js` - MCP workflow stages and pipeline

### Security & Validation
- `security-config.js` - Security policies and path restrictions
- `validation-config.js` - Validation rules and JSON schemas

### MCP Integration
- `mcp-registry.js` - MCP server registry and management

## 🚀 Usage Examples

### Import Dynamic Configuration
```javascript
import configManager from '../config/dynamic-config.js';

// Get dynamic timeout based on system load
const timeout = configManager.get('timeout');

// Get adaptive model for specific purpose
const model = configManager.dynamicDefaults.getModel('planning');

// Update system metrics for adaptation
configManager.updateMetrics({
  systemLoad: 0.7,
  errorRate: 0.1,
  avgResponseTime: 2500
});

// Check feature flags
if (configManager.isFeatureEnabled('intelligent_error_handling')) {
  // Use intelligent error handling
}

// Override specific values
configManager.set('retry_attempts', 5);
```

### Import Static Configurations
```javascript
// Import main configuration
import AtlasConfig from '../config/atlas-config.js';

// Import specific utilities
import {
  AGENTS,
  getAgentConfig,
  WORKFLOW_STAGES,
  getModelForStage,
  NETWORK_CONFIG,
  getApiUrl
} from '../config/atlas-config.js';

// Use configurations
const orchestratorUrl = getApiUrl('orchestrator', '/api/chat');
const atlasVoice = getAgentConfig('atlas').voice;
const model = getModelForStage('planning');
```

## 🔧 Environment Variables

Key environment variables:
- `NODE_ENV` - Environment mode (development/production)
- `LLM_API_ENDPOINT` - Primary LLM endpoint
- `LLM_API_FALLBACK_ENDPOINT` - Fallback LLM endpoint
- `ENABLE_TTS` - Enable text-to-speech
- `ENABLE_VOICE` - Enable voice recognition
- `MCP_MODEL_VERIFICATION_ELIGIBILITY` - Model for Grisha verification

## 📊 Dynamic Configuration Features

### Adaptive Timeouts
```javascript
// Automatically adjusts based on:
// - System load (CPU/Memory)
// - Error rate
// - Average response time
const timeout = configManager.dynamicDefaults.getTimeout('llm');
```

### Intelligent Model Selection
```javascript
// Selects optimal model based on:
// - Task complexity
// - Error history
// - System resources
const model = configManager.dynamicDefaults.getModel('verification');
```

### Learning System
The configuration system learns from:
- Error patterns and resolutions
- Successful configurations
- System performance metrics

## 🔍 Validation

Run validation on startup:
```javascript
import { validateConfig } from '../config/atlas-config.js';

const validation = validateConfig();
if (!validation.valid) {
  console.error('Configuration errors:', validation.errors);
}
```

## 🆕 Recent Updates (2025-10-24)

### Intelligent Systems Added
1. **Dynamic Configuration Manager** - Adaptive system configuration
2. **Intelligent Error Handler** - Pattern recognition and auto-resolution
3. **Smart Dependency Resolver** - Graph-based dependency management
4. **Intelligent Vision Parser** - NLP-based text extraction from vision models

### Removed
- Hardcoded timeouts and values
- Static error handling
- Manual configuration syncing
- CLI configuration tools (moved to archive)

## 📝 Migration Guide

For existing code:
1. Replace `../config/global-config.js` with `../config/atlas-config.js`
2. Use `dynamic-config.js` for adaptive configurations
3. Remove references to deprecated sync scripts
4. Update imports to use new intelligent systems

---

**Last Updated:** 2025-10-24  
**Version:** 5.0
