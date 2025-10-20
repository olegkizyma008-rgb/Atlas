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
* __`agents-config.js`__ — `AGENTS`, `getAgentConfig()`, `getAgentsByRole()`, `validateAgentConfig()`.
* __`workflow-config.js`__ — MCP-only етапи (`WORKFLOW_STAGES`), `getWorkflowStage()`, `getStageById()`, `getNextStage()`, `getStagesForAgent()`.
* __`api-config.js`__ — `NETWORK_CONFIG`, `API_ENDPOINTS`, `TTS_CONFIG`, `VOICE_CONFIG`, `getApiUrl()`, `getServiceConfig()`, `checkServiceHealth()`, `generateClientConfig()`.
* __`models-config.js`__ — `VISION_CONFIG`, `AI_MODEL_CONFIG`, `MCP_MODEL_CONFIG`, `AI_BACKEND_CONFIG`, `MCP_SERVERS`, `getModelForStage()`, `getModelByType()`.
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

**Останнє оновлення:** 2025-10-20  
**Мова:** Українська
