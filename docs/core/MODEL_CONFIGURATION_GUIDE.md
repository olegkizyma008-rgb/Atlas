# 🤖 Централізована Конфігурація AI Моделей

**Версія:** 5.1.0  
**Дата оновлення:** 2025-10-20  
**Автор:** ATLAS System

---

## 📋 Огляд

Всі AI моделі в системі ATLAS тепер централізовані в **одному файлі конфігурації**:

```
config/global-config.js → MCP_MODEL_CONFIG
```

Це дозволяє змінювати моделі для всіх стейджів та подій системи в одному місці.

---

## 🎯 Переваги Централізації

✅ **Єдине джерело правди** - всі моделі в одному файлі  
✅ **Легка зміна моделей** - змінити модель для будь-якого стейджу за 1 секунду  
✅ **ENV підтримка** - можна перевизначити через змінні середовища  
✅ **Немає hardcoded fallbacks** - всі fallback моделі видалені з коду  
✅ **Консистентність** - всі стейджі використовують одну конфігурацію  

---

## 📁 Структура Конфігурації

### MCP_MODEL_CONFIG

```javascript
export const MCP_MODEL_CONFIG = {
  // API endpoint з fallback підтримкою
  apiEndpoint: {
    primary: 'http://localhost:4000/v1/chat/completions',
    fallback: null,
    timeout: 60000
  },

  // Моделі для кожного стейджу
  stages: {
    mode_selection: { ... },
    todo_planning: { ... },
    plan_tools: { ... },
    verify_item: { ... },
    adjust_todo: { ... },
    replan_todo: { ... },
    final_summary: { ... },
    vision_analysis: { ... },
    vision_fallback: { ... }
  },

  // Helper функція
  getStageConfig(stageName) { ... }
}
```

---

## 🔧 Як Змінити Модель

### Метод 1: Через ENV змінні (Рекомендовано)

Створіть або відредагуйте `.env` файл:

```bash
# Stage 1: TODO Planning
MCP_MODEL_TODO_PLANNING=copilot-gpt-4o
MCP_TEMP_TODO_PLANNING=0.3

# Stage 2.1: Plan Tools
MCP_MODEL_PLAN_TOOLS=copilot-gpt-4o
MCP_TEMP_PLAN_TOOLS=0.1

# Stage 2.3: Verify Item
MCP_MODEL_VERIFY_ITEM=copilot-gpt-4o-mini
MCP_TEMP_VERIFY_ITEM=0.15

# Stage 3: Adjust TODO
MCP_MODEL_ADJUST_TODO=copilot-gpt-4o-mini
MCP_TEMP_ADJUST_TODO=0.2

# Stage 3.5: Replan TODO
MCP_MODEL_REPLAN_TODO=copilot-gpt-4o
MCP_TEMP_REPLAN_TODO=0.3

# Vision Analysis
MCP_MODEL_VISION=copilot-gpt-4o
MCP_TEMP_VISION=0.2

# Vision Fallback (Ollama)
MCP_MODEL_VISION_FALLBACK=llama3.2-vision
```

### Метод 2: Через global-config.js (Прямо в коді)

Відредагуйте `config/global-config.js`:

```javascript
// Приклад: Змінити модель для TODO Planning
todo_planning: {
  get model() { 
    return process.env.MCP_MODEL_TODO_PLANNING || 'gpt-4o-mini'; // ← Змініть тут
  },
  get temperature() { 
    return parseFloat(process.env.MCP_TEMP_TODO_PLANNING || '0.3'); 
  },
  max_tokens: 4000,
  description: 'Atlas TODO Planning'
}
```

---

## 📊 Всі Доступні Стейджі

| Стейдж | ENV Змінна | Модель за замовчуванням | Провайдер | Temp | Призначення |
|--------|-----------|------------------------|-----------|------|-------------|
| **mode_selection** | `MCP_MODEL_MODE_SELECTION` | atlas-phi-4-mini-instruct | 🔷 Microsoft | 0.05 | Класифікація task vs chat |
| **todo_planning** | `MCP_MODEL_TODO_PLANNING` | atlas-deepseek-r1 ⚡ | 🔶 DeepSeek | 0.3 | Atlas планування TODO (reasoning) |
| **plan_tools** | `MCP_MODEL_PLAN_TOOLS` | atlas-cohere-command-r-08-2024 | 🟣 Cohere | 0.1 | Tetyana планування інструментів |
| **verify_item** | `MCP_MODEL_VERIFY_ITEM` | atlas-mistral-small-2503 | 🔴 Mistral | 0.15 | Grisha верифікація |
| **adjust_todo** | `MCP_MODEL_ADJUST_TODO` | atlas-llama-3.3-70b-instruct | 🔵 Meta | 0.2 | Atlas корекція TODO |
| **replan_todo** | `MCP_MODEL_REPLAN_TODO` | atlas-cohere-command-r-plus-08-2024 | 🟣 Cohere | 0.3 | Atlas перепланування |
| **final_summary** | `MCP_MODEL_FINAL_SUMMARY` | atlas-ministral-3b | 🔴 Mistral | 0.5 | Фінальне резюме |
| **vision_analysis** | `MCP_MODEL_VISION` | atlas-llama-3.2-90b-vision-instruct ⚡ | 🔵 Meta | 0.2 | Аналіз скріншотів (vision) |
| **vision_fallback** | `MCP_MODEL_VISION_FALLBACK` | llama3.2-vision | 🔵 Meta | - | Ollama fallback |
| **server_selection** | `MCP_MODEL_SERVER_SELECTION` | atlas-ministral-3b | 🔴 Mistral | 0.05 | MCP server routing |
| **state_analysis** | `MCP_MODEL_STATE_ANALYSIS` | atlas-ministral-3b | 🔴 Mistral | 0.1 | Аналіз станів агентів |
| **screenshot_adjustment** | `MCP_MODEL_SCREENSHOT_ADJ` | atlas-phi-4-multimodal-instruct | 🔷 Microsoft | 0.2 | Аналіз скріншотів для корекції |
| **tts_optimization** | `MCP_MODEL_TTS_OPT` | atlas-ministral-3b | 🔴 Mistral | 0.3 | Оптимізація для TTS |

**⚡ = Важка модель (використовується тільки для критичних завдань)**

### 🎯 Розподіл по провайдерам:
- 🔷 **Microsoft** (Phi-4): 2 стейджі - швидка класифікація та multimodal
- 🔶 **DeepSeek** (R1): 1 стейдж - reasoning для планування
- 🟣 **Cohere** (Command R/R+): 2 стейджі - structured output та перепланування
- 🔴 **Mistral**: 4 стейджі - верифікація, summary, routing, TTS
- 🔵 **Meta** (Llama): 3 стейджі - корекція, vision аналіз

---

## 🌡️ Рекомендації по Температурі

| Температура | Використання | Приклади |
|-------------|--------------|----------|
| **0.05** | Бінарна класифікація | mode_selection |
| **0.1** | JSON output (чистий) | plan_tools |
| **0.15-0.2** | Аналіз та верифікація | verify_item, adjust_todo, vision |
| **0.3** | Планування (креатив + точність) | todo_planning, replan_todo |
| **0.5** | Природне резюме | final_summary |
| **0.7** | Чат (креативність) | chat mode |

---

## 🔍 Як Використовується в Коді

### Приклад 1: TODO Planning

```javascript
// orchestrator/workflow/mcp-todo-manager.js
const modelConfig = GlobalConfig.MCP_MODEL_CONFIG.getStageConfig('todo_planning');

const response = await axios.post(apiUrl, {
  model: modelConfig.model,           // copilot-gpt-4o
  temperature: modelConfig.temperature, // 0.3
  max_tokens: modelConfig.max_tokens   // 4000
});
```

### Приклад 2: Vision Analysis

```javascript
// orchestrator/services/vision-analysis-service.js
const visionConfig = GlobalConfig.MCP_MODEL_CONFIG.getStageConfig('vision_analysis');
const endpoint = GlobalConfig.MCP_MODEL_CONFIG.apiEndpoint.primary;

const response = await axios.post(endpoint, {
  model: visionConfig.model,           // copilot-gpt-4o
  temperature: visionConfig.temperature // 0.2
});
```

### Приклад 3: Replan TODO

```javascript
// orchestrator/workflow/stages/atlas-replan-todo-processor.js
const modelConfig = GlobalConfig.MCP_MODEL_CONFIG.getStageConfig('replan_todo');

const response = await axios.post(apiUrl, {
  model: modelConfig.model,           // copilot-gpt-4o
  temperature: modelConfig.temperature, // 0.3
  max_tokens: modelConfig.max_tokens   // 3000
});
```

---

## ⚙️ Застосування Змін

Після зміни конфігурації, перезапустіть систему:

```bash
./restart_system.sh restart
```

Або тільки orchestrator:

```bash
./restart_system.sh restart-orchestrator
```

---

## 🚀 Приклади Використання

### Приклад 1: Перейти на більш швидку модель для всіх стейджів

```bash
# .env
MCP_MODEL_TODO_PLANNING=atlas-gpt-4o-mini
MCP_MODEL_PLAN_TOOLS=atlas-gpt-4o-mini
MCP_MODEL_REPLAN_TODO=atlas-gpt-4o-mini
MCP_MODEL_VISION=atlas-gpt-4o-mini
```

### Приклад 2: Використати локальну модель через Ollama

```bash
# .env
MCP_MODEL_TODO_PLANNING=llama3.1:70b
MCP_MODEL_PLAN_TOOLS=llama3.1:70b
```

### Приклад 3: Підвищити креативність для планування

```bash
# .env
MCP_TEMP_TODO_PLANNING=0.5  # Було 0.3
MCP_TEMP_REPLAN_TODO=0.5    # Було 0.3
```

---

## 📝 Важливі Зміни (2025-10-20)

### ✅ Що Змінилося

1. **Додано новий стейдж**: `replan_todo` для Atlas перепланування
2. **Додано vision стейджі**: `vision_analysis` та `vision_fallback`
3. **Видалено всі hardcoded fallbacks** з коду
4. **Централізовано всі моделі** в `MCP_MODEL_CONFIG`

### ❌ Що Видалено

- Hardcoded fallback моделі в `mcp-todo-manager.js`
- Hardcoded fallback моделі в `atlas-replan-todo-processor.js`
- Hardcoded fallback моделі в `vision-analysis-service.js`
- Дублікати конфігурацій по всьому коду

### 🔄 Міграція

Якщо ви раніше змінювали моделі напряму в коді, тепер потрібно:

1. Видалити ваші зміни з файлів коду
2. Додати відповідні ENV змінні в `.env`
3. Або змінити дефолтні значення в `config/global-config.js`

---

## 🐛 Troubleshooting

### Проблема: Модель не змінюється після зміни .env

**Рішення:** Перезапустіть систему:
```bash
./restart_system.sh restart
```

### Проблема: Помилка "model not found"

**Рішення:** Перевірте що модель доступна в LLM API (port 4000):
```bash
curl http://localhost:4000/v1/models
```

### Проблема: Занадто повільна відповідь

**Рішення:** Використайте швидшу модель (copilot-gpt-4o-mini замість copilot-gpt-4o)

---

## 📚 Додаткові Ресурси

- [VISION_CONFIG](../config/global-config.js#L51-L132) - Конфігурація vision моделей
- [AI_MODEL_CONFIG](../config/global-config.js#L134-L206) - Конфігурація legacy моделей
- [MCP_MODEL_CONFIG](../config/global-config.js#L208-L329) - Головна конфігурація MCP моделей

---

**Створено:** 2025-10-20  
**Версія:** 5.1.0  
**Статус:** ✅ Активна конфігурація
