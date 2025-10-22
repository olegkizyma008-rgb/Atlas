# ⚙️ ATLAS Configuration Overview

Конфігурації Atlas4 тепер організовані за модульним принципом. Замість великого моноліту та системи синхронізації, код напряму імпортує потрібні частини з `config/atlas-config.js`.

`config/global-config.js` залишено тільки як легасі-шар (реекспорт) для існуючих імпортів. Новий код повинен використовувати `atlas-config.js`.

---

## 📁 Структура каталогу `config/`

```
config/
├── atlas-config.js      # Головний агрегатор (default + named exports)
├── system-config.js     # System info, user preferences, env flags, helpers
├── agents-config.js     # Конфігурація агентів та утиліти
├── workflow-config.js   # MCP етапи та сумісні хелпери
├── api-config.js        # Network/API/TTS/Voice конфіги
├── models-config.js     # AI/MCP/vision/backends налаштування
├── global-config.js     # Легасі-реекспорт atlas-config.js
└── README.md            # Цей документ
```

Усі CLI/backup/sync-скрипти переміщені до архіву (`archive/legacy-config-2025-10-20/`).

---

## 🚀 Використання в коді

> **Рекомендація:** імпортуйте напряму з `atlas-config.js`.

```javascript
// Default об'єкт (повний набір конфігурацій)
import AtlasConfig from '../config/atlas-config.js';

// Або окремі частини та утиліти
import {
  AGENTS,
  getAgentConfig,
  WORKFLOW_STAGES,
  getModelForStage,
  NETWORK_CONFIG,
  getApiUrl,
  generateShortStatus,
  ENV_CONFIG
} from '../config/atlas-config.js';

const orchestratorUrl = getApiUrl('orchestrator', '/api/chat');
const atlasVoice = getAgentConfig('atlas').voice;
```

Якщо потрібно зберегти сумісність зі старими імпортами:

```javascript
import GlobalConfig from '../config/global-config.js';

// global-config.js просто реекспортує AtlasConfig
```

---

## 📦 Модулі та вміст

* __`system-config.js`__ — `SYSTEM_INFO`, `USER_CONFIG`, `CHAT_CONFIG`, `SECURITY_CONFIG`, `ENV_CONFIG`, `buildEnvConfig()`, `generateShortStatus()`.
* __`agents-config.js`__ — `AGENTS`, `getAgentConfig()`, `getAgentsByRole()`, `validateAgentConfig()`. **NEW 22.10.2025:** Додано `verification` конфігурацію для Гріші (visual/mcp методи, routing, fallback).
* __`workflow-config.js`__ — MCP-only етапи (`WORKFLOW_STAGES`), `getWorkflowStage()`, `getStageById()`, `getNextStage()`, `getStagesForAgent()`. **NEW 22.10.2025:** Додано `subStages` для `GRISHA_VERIFY_ITEM` (strategy, eligibility, visual, mcp).
* __`api-config.js`__ — `NETWORK_CONFIG`, `API_ENDPOINTS`, `TTS_CONFIG`, `VOICE_CONFIG`, `getApiUrl()`, `getServiceConfig()`, `checkServiceHealth()`, `generateClientConfig()`.
* __`models-config.js`__ — `VISION_CONFIG`, `AI_MODEL_CONFIG`, `MCP_MODEL_CONFIG`, `AI_BACKEND_CONFIG`, `MCP_SERVERS`, `getModelForStage()`, `getModelByType()`. **NEW 22.10.2025:** Додано `verification_eligibility` stage для LLM-based routing (Mistral 3B).
* __`atlas-config.js`__ — агрегує все вище, додає `isServiceEnabled()`, `getWebSocketUrl()`, `validateConfig()`.

---

## 🔍 Валідація та середовище

`atlas-config.js` містить `validateConfig()`. У продакшн-середовищі (за `ENV_CONFIG.isProduction`) можна викликати її на старті, щоб перевірити:

* наявність ключових сервісів (`orchestrator`, `frontend`, `tts`)
* агенти `atlas`, `tetyana`, `grisha`
* принаймні один MCP етап

Основні змінні оточення:

* __`NODE_ENV`__ — визначає `ENV_CONFIG`
* __`LLM_API_ENDPOINT`__, `LLM_API_FALLBACK_ENDPOINT`__ — модельні ендпоїнти
* __`ENABLE_TTS`__, `ENABLE_VOICE`__, `ENABLE_LOGGING`__ — feature flags
* __`MCP_MODEL_VERIFICATION_ELIGIBILITY`__, `MCP_TEMP_VERIFICATION_ELIGIBILITY`__ — **NEW 22.10.2025:** Модель та температура для Grisha verification routing (default: atlas-ministral-3b, 0.1)

---

## 🧭 Міграція старого коду

1. Замість `../config/global-config.js` імпортуйте з `../config/atlas-config.js`.
2. Переконайтеся, що з коду вилучені згадки про `config-manager`, `atlas-config sync`, `shared-config.js` тощо.
3. Якщо фронтенд чи інші сервіси потребують «заморожених» JSON-конфігів, зберіть їх напряму, імпортуючи модулі, а не за допомогою генераторів.

---

## 🤝 Внесок

* Усі конфігурації оновлюються у відповідних модулях (`system-config.js`, `agents-config.js`, ...).
* Жодних CLI команд / автогенерації більше немає.
* Після змін перевірте запуск orchestrator (`restart_system.sh`) та релевантні тести.

---

## 🆕 Нова система верифікації (22.10.2025)

### Архітектура Grisha Verification

Гриша тепер використовує **двоетапну систему верифікації** з інтелектуальним вибором методу:

#### 1. **Heuristic Strategy (евристичний аналіз)**
- Швидкий аналіз на основі ключових слів та типу операції
- Визначає базову стратегію: `visual` або `mcp`
- Файл: `grisha-verification-strategy.js`

#### 2. **LLM Eligibility Routing (LLM-based вибір)**
- **Модель:** `atlas-ministral-3b` (Mistral 3B - швидка класифікація)
- **Temperature:** `0.1` (низька для консистентності)
- **Промпт:** `grisha_verification_eligibility.js`
- **Результат:** `{ recommended_path: 'visual'|'data'|'hybrid', additional_checks: [...] }`
- Файл: `grisha-verification-eligibility-processor.js`

#### 3. **Методи верифікації**

**Visual Verification:**
- Скріншоти через `VisualCaptureService`
- Vision AI аналіз (Llama 3.2 90B Vision або Phi 3.5 Vision)
- Мінімальна впевненість: 70%
- Security checks: fallback rejection, matches_criteria validation

**MCP Verification:**
- **ВАЖЛИВО:** Використовує `TetyanaExecuteToolsProcessor` (натоптана дорожка)
- Виконує `additional_checks` з eligibility decision
- Результати аналізуються через `_analyzeMcpResults()`
- Автоматичне лікування при фіксах Тетяни

#### 4. **Fallback система**
- Visual → MCP (якщо візуальна верифікація провалилась)
- MCP → Visual (опціонально, за потреби)

### Конфігурація

**agents-config.js:**
```javascript
grisha: {
  verification: {
    methods: ['visual', 'mcp'],
    routing: { model: 'atlas-ministral-3b', temperature: 0.1 },
    visual: { visionModel: 'atlas-llama-3.2-90b-vision-instruct' },
    mcp: { usesTetyanaProcessor: true },
    fallback: { visualToMcp: true }
  }
}
```

**workflow-config.js:**
```javascript
GRISHA_VERIFY_ITEM: {
  subStages: [
    'VERIFICATION_STRATEGY',      // Евристичний вибір
    'VERIFICATION_ELIGIBILITY',   // LLM routing (Mistral 3B)
    'VISUAL_VERIFICATION',        // Vision AI
    'MCP_VERIFICATION'            // Через Tetyana processor
  ]
}
```

**models-config.js:**
```javascript
verification_eligibility: {
  model: 'atlas-ministral-3b',
  temperature: 0.1,
  max_tokens: 500
}
```

### Змінні .env

```bash
# Grisha Verification Configuration
MCP_MODEL_VERIFICATION_ELIGIBILITY=atlas-ministral-3b
MCP_TEMP_VERIFICATION_ELIGIBILITY=0.1
```

---

**Останнє оновлення:** 2025-10-22  
**Мова:** Українська
