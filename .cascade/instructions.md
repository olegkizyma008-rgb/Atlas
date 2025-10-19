# ATLAS v5.0 - AI Assistant Instructions

> **Оптимізовано для:** GitHub Copilot, Windsurf Cascade  
> **Версія:** 5.0.0  
> **Дата:** 19 жовтня 2025

## 🎯 Про проект

**ATLAS** - інтелектуальна багатоагентна система з динамічним MCP TODO workflow, українською TTS/STT, та 3D візуалізацією.

**Ключові компоненти:**
- 🤖 3 AI Агенти (Atlas, Tetyana, Grisha)
- 🔄 MCP Dynamic TODO Workflow
- 🛠️ 6 MCP Серверів (92+ tools)
- 🗣️ Ukrainian TTS (Metal GPU)
- 🎙️ Whisper STT (Large-v3)
- 🌐 Web Interface (3D GLB)

---

## 📚 Документація

### Обов'язково прочитай:
1. **[README.md](../README.md)** - Повний огляд системи
2. **[ORCHESTRATOR_WORKFLOW.md](../docs/ORCHESTRATOR_WORKFLOW.md)** - Детальний опис workflow
3. **[API_REFERENCE.md](../docs/API_REFERENCE.md)** - API endpoints
4. **[MCP_TOOLS_COMPLETE.md](../docs/MCP_TOOLS_COMPLETE.md)** - 92+ MCP tools

---

## 🏗️ Архітектура

### Основні сервіси:
```
┌─────────────────────────────────────────────┐
│  Frontend :5001 (Flask + 3D GLB)           │
└─────────────┬───────────────────────────────┘
              │ HTTP/WebSocket
              ▼
┌─────────────────────────────────────────────┐
│  Orchestrator :5101 (Node.js + DI)         │
│  ├─ MCPManager (6 servers via stdio)       │
│  ├─ MCPTodoManager (item-by-item)          │
│  ├─ 9 Stage Processors                     │
│  └─ Vision Analysis Service                │
└──┬──────┬──────┬──────────────────────────┘
   │      │      │
   ▼      ▼      ▼
 TTS   Whisper  LLM API
:3001   :3002   :4000
```

### Структура проекту:
```
atlas4/
├── orchestrator/          # Node.js (Express + DI Container)
│   ├── core/             # DI, Service Registry, Application
│   ├── ai/               # MCPManager, LLM Client
│   ├── workflow/         # MCPTodoManager, Processors
│   ├── api/routes/       # Chat, Session, WebSocket
│   └── services/         # Vision, TTS Sync
├── prompts/mcp/          # 17 промптів (Stage 0-8)
├── config/               # Global, Agents, Workflow, API
├── web/                  # Flask Frontend
├── ukrainian-tts/        # TTS Service (Metal GPU)
└── services/whisper/     # Whisper STT (Metal GPU)
```

---

## 🔄 MCP Workflow (9 Stages)

### Stage 0: Mode Selection
**Модель:** atlas-ministral-3b (temp 0.05)  
**Вхід:** User message  
**Вихід:** CHAT або TASK

### Stage 1-MCP: Atlas TODO Planning
**Модель:** copilot-gpt-4o (temp 0.3)  
**Вхід:** User request  
**Вихід:** Dynamic TODO list

**Atlas створює:**
```json
{
  "mode": "standard|extended",
  "complexity": 1-10,
  "items": [
    {
      "id": 1,
      "action": "Дієслово + об'єкт",
      "mcp_servers": ["filesystem", "playwright"],
      "parameters": {...},
      "success_criteria": "Перевірний критерій",
      "dependencies": [...]
    }
  ]
}
```

**Критично:**
- ❌ Atlas НЕ рекомендує конкретні tools
- ✅ Atlas вказує тільки mcp_servers (назви серверів)
- ✅ Немає обмежень на кількість items (Extended: 4-20+)
- ✅ Максимум 2 сервери на один item

### Stage 2.0-MCP: Server Selection
**Хто:** MCPManager (rule-based)  
**Вхід:** TODO item + 6 MCP servers  
**Вихід:** Filtered tools list

Фільтрує tools тільки з серверів, вказаних в `mcp_servers`.

### Stage 2.1-MCP: Tetyana Plan Tools
**Модель:** copilot-gpt-4o (temp 0.1)  
**Вхід:** TODO item + Filtered tools  
**Вихід:** tool_calls array

**Tetyana планує:**
```json
{
  "tool_calls": [
    {
      "server": "filesystem",
      "tool": "write_file",
      "parameters": {
        "path": "~/Desktop/file.txt",
        "content": "..."
      }
    }
  ]
}
```

**Критично:**
- ✅ ТІЛЬКИ tools з {{AVAILABLE_TOOLS}} (динамічний список)
- ✅ НІКОЛИ не вигадувати tools
- ✅ 2-5 tools оптимально, max 5
- ✅ Якщо >5 tools → `needs_split: true`

### Stage 2.2-MCP: Tetyana Execute Tools
**Хто:** MCPManager + MCP Servers  
**Протокол:** JSON-RPC 2.0 via stdio  
**Вихід:** Execution results

Виконує tool_calls через MCP protocol. Parallel execution до 3 одночасно.

### Stage 2.3-MCP: Grisha Verify Item
**Модель:** copilot-gpt-4o-mini (temp 0.15)  
**Vision:** copilot-gpt-4o (~2s)  
**Вихід:** verified: true/false + evidence

**Grisha перевіряє:**
- Результати tools execution
- Screenshot analysis (якщо UI завдання)
- Success criteria з TODO item

### Stage 3-MCP: Atlas Adjust TODO
**Модель:** copilot-gpt-4o-mini (temp 0.2)  
**Вхід:** Failed item + Verification report  
**Вихід:** Adjustments або skip

Retry до 3 разів з різними стратегіями.

### Stage 3.5-MCP: Atlas Replan TODO
**Модель:** copilot-gpt-4o (temp 0.3)  
**Вхід:** Весь TODO + Failure context  
**Вихід:** New plan, skip, або abort

Глибокий аналіз та переплан після 3 невдалих спроб.

### Stage 8-MCP: Final Summary
**Модель:** atlas-ministral-3b (temp 0.5)  
**Вихід:** User-friendly summary

Створює підсумок для користувача + TTS озвучення.

---

## 🛠️ MCP Tools (6 Servers)

### 1. Filesystem (14 tools)
`read_file`, `write_file`, `create_directory`, `list_directory`, `delete_file`, `move_file`, `search_files`, `get_file_info`, `edit_file`, `copy_file`, `tree_structure`

### 2. Playwright (32 tools)
`playwright_navigate`, `playwright_click`, `playwright_fill`, `playwright_screenshot`, `playwright_get_text`, `playwright_evaluate`, `playwright_wait_for_selector`

**Критично для playwright_fill:**
- ✅ Параметр: `value` (НЕ text, НЕ content)

### 3. Shell (9 tools)
`shell_execute`, `shell_execute_async`, `shell_get_status`, `shell_kill`, `shell_list_processes`

### 4. AppleScript (1 tool)
`applescript_execute` - macOS GUI automation

**Параметри:**
- `code_snippet` (string) - AppleScript код
- `language` (string) - завжди "applescript"

### 5. Memory (9 tools)
`memory_create_entity`, `memory_create_relation`, `memory_add_observation`, `memory_search`

### 6. Git (27 tools) - DISABLED
Нестабільний, не використовувати.

---

## ⚙️ Конфігурація

### Змінні середовища (.env)

**LLM API:**
```bash
LLM_API_ENDPOINT=http://localhost:4000/v1/chat/completions
LLM_API_TIMEOUT=60000
```

**MCP Models (per-stage):**
```bash
MCP_MODEL_MODE_SELECTION=atlas-ministral-3b
MCP_MODEL_TODO_PLANNING=copilot-gpt-4o
MCP_MODEL_PLAN_TOOLS=copilot-gpt-4o
MCP_MODEL_VERIFY_ITEM=copilot-gpt-4o-mini
MCP_MODEL_ADJUST_TODO=copilot-gpt-4o-mini
MCP_MODEL_FINAL_SUMMARY=atlas-ministral-3b
```

**TTS:**
```bash
REAL_TTS_MODE=true
TTS_DEVICE=mps
TTS_PORT=3001
TTS_VOICE_ATLAS=dmytro
TTS_VOICE_TETYANA=tetiana
TTS_VOICE_GRISHA=mykyta
```

**Whisper:**
```bash
WHISPER_BACKEND=cpp
WHISPER_DEVICE=metal
WHISPER_PORT=3002
WHISPER_CPP_THREADS=10
WHISPER_CPP_NGL=20  # GPU layers
```

### Конфігураційні файли:

**`config/global-config.js`** - Single Source of Truth (800+ рядків)
- Агенти, Workflow, AI моделі, Vision models, MCP servers, Retry policies

**`config/agents-config.js`** - 3 агенти з ролями та голосами

**`config/workflow-config.js`** - 9 stages з transitions

**`config/api-config.js`** - Network та service ports

---

## 🌐 API Endpoints

### Orchestrator API (http://localhost:5101)

**Chat:**
- `POST /chat/stream` - Обробка повідомлень (SSE)
- `POST /session/pause` - Призупинити сесію
- `POST /session/resume` - Відновити сесію
- `POST /session/confirm` - Підтвердити дію

**Health:**
- `GET /health` - Health check

**WebSocket:** `ws://localhost:5101`
- Events: `chat_update`, `agent_message`, `tts_start`, `workflow_stage`

### TTS Service (http://localhost:3001)
- `POST /synthesize` - Синтез мовлення
- Голоси: dmytro, tetiana, mykyta, lada

### Whisper Service (http://localhost:3002)
- `POST /transcribe` - Транскрибування аудіо
- `POST /transcribe_blob` - Транскрибування blob

---

## 🧠 Промпти (17 файлів)

### Розташування: `prompts/mcp/`

**Atlas (Coordinator):**
- `atlas_todo_planning_optimized.js` - Stage 1-MCP
- `atlas_adjust_todo.js` - Stage 3-MCP
- `atlas_replan_todo.js` - Stage 3.5-MCP

**Tetyana (Executor):**
- `tetyana_plan_tools_optimized.js` - Stage 2.1-MCP (основний)
- `tetyana_plan_tools_*.js` - 6 варіантів (по серверам)
- `tetyana_screenshot_and_adjust.js` - Screenshots

**Grisha (Verifier):**
- `grisha_verify_item_optimized.js` - Stage 2.3-MCP
- `grisha_visual_verify_item.js` - Vision verification

**System:**
- `stage0_mode_selection.js` - Stage 0
- `mcp_final_summary.js` - Stage 8-MCP

---

## 💻 Команди управління

### Запуск системи:
```bash
./restart_system.sh start     # Запустити всі сервіси
./restart_system.sh stop      # Зупинити
./restart_system.sh restart   # Перезапустити
./restart_system.sh status    # Статус
./restart_system.sh diagnose  # Діагностика
./restart_system.sh logs      # Перегляд логів
```

### npm команди:
```bash
npm run start                 # = ./restart_system.sh start
npm run stop                  # = ./restart_system.sh stop
npm run restart               # = ./restart_system.sh restart
```

---

## 🎯 Принципи роботи з кодом

### 1. Separation of Concerns

**Atlas (Coordinator):**
- ✅ Планує ЩО робити
- ✅ Створює TODO items
- ✅ Вказує mcp_servers
- ❌ НЕ рекомендує конкретні tools

**Tetyana (Executor):**
- ✅ Планує ЯК робити
- ✅ Обирає конкретні tools
- ✅ Використовує ТІЛЬКИ tools з {{AVAILABLE_TOOLS}}
- ❌ НЕ вигадує tools

**Grisha (Verifier):**
- ✅ Перевіряє ЧИ зроблено
- ✅ Evidence-based verification
- ✅ Vision analysis для UI
- ❌ НЕ довіряє на слово

### 2. Item-by-Item Execution

```
FOR EACH item IN todo_list:
  1. Server Selection (filter tools)
  2. Plan Tools (Tetyana)
  3. Execute Tools (MCP protocol)
  4. Verify (Grisha)
  
  IF failed:
    5. Adjust (Atlas) - retry 3x
    6. Replan (Atlas) - deep analysis
```

### 3. Tools як Single Source of Truth

```javascript
// ПРАВИЛЬНО:
const tools = mcpManager.getToolsFromServers(["filesystem"]);
// tools містить ТІЛЬКИ доступні tools з filesystem

// НЕПРАВИЛЬНО:
const tools = ["read_file", "write_file"];  // Hardcoded!
```

### 4. Динамічна підстановка

Промпти використовують placeholder `{{AVAILABLE_TOOLS}}`, який замінюється в runtime:

```javascript
// orchestrator/ai/llm-client.js
prompt = prompt.replace(
  '{{AVAILABLE_TOOLS}}',
  mcpManager.getToolsSummary()
);
```

---

## 🚨 Критичні правила

### Для Atlas:
1. ❌ НІКОЛИ не додавай поле `tools_needed` в TODO item
2. ✅ Вказуй ТІЛЬКИ `mcp_servers` (назви серверів)
3. ✅ Створюй стільки items, скільки потрібно (без лімітів)
4. ✅ Максимум 2 сервери на один item
5. ✅ Один item = одна дія

### Для Tetyana:
1. ✅ Використовуй ТІЛЬКИ tools з {{AVAILABLE_TOOLS}}
2. ❌ НІКОЛИ не вигадуй tools
3. ✅ 2-5 tools оптимально, максимум 5
4. ✅ Якщо >5 tools → поверни `needs_split: true`
5. ✅ Конкретні параметри (не example.com, не #search-input)

### Для Grisha:
1. ✅ Evidence-based verification (реальні перевірки)
2. ✅ Screenshot + vision analysis для UI завдань
3. ✅ Детальні звіти з evidence
4. ❌ Не довіряти на слово виконанню

### JSON Rules:
1. ❌ NO trailing commas (жодних ком після останнього елементу)
2. ❌ NO коментарів у JSON (жодних /* ... */)
3. ❌ NO three dots (...) або [...] для скорочень
4. ✅ Завжди повні значення
5. ✅ Валідний JSON: `{` ... `}`

---

## 🔍 Типові помилки

### 1. Atlas рекомендує tools
```json
// ❌ НЕПРАВИЛЬНО:
{
  "id": 1,
  "action": "Створити файл",
  "tools_needed": ["write_file"],  // НЕ Atlas!
  "mcp_servers": ["filesystem"]
}

// ✅ ПРАВИЛЬНО:
{
  "id": 1,
  "action": "Створити файл",
  "mcp_servers": ["filesystem"],
  "parameters": {"path": "...", "content": "..."}
}
```

### 2. Tetyana вигадує tools
```javascript
// ❌ НЕПРАВИЛЬНО:
{
  "tool_calls": [
    {"server": "filesystem", "tool": "create_file"}  // Не існує!
  ]
}

// ✅ ПРАВИЛЬНО (перевірити в {{AVAILABLE_TOOLS}}):
{
  "tool_calls": [
    {"server": "filesystem", "tool": "write_file"}  // Існує ✓
  ]
}
```

### 3. playwright_fill з неправильним параметром
```javascript
// ❌ НЕПРАВИЛЬНО:
{
  "tool": "playwright_fill",
  "parameters": {
    "selector": "input",
    "text": "Hello"  // Неправильний параметр!
  }
}

// ✅ ПРАВИЛЬНО:
{
  "tool": "playwright_fill",
  "parameters": {
    "selector": "input",
    "value": "Hello"  // Правильний параметр
  }
}
```

### 4. Trailing comma в JSON
```json
// ❌ НЕПРАВИЛЬНО:
{
  "tool_calls": [
    {"server": "filesystem", "tool": "read_file"},  // ← BAD comma!
  ]
}

// ✅ ПРАВИЛЬНО:
{
  "tool_calls": [
    {"server": "filesystem", "tool": "read_file"}  // ← NO comma!
  ]
}
```

---

## 📈 Performance

**Метрики:**
- Середній час на TODO item: 2-5 секунд
- Повний workflow: 10-30 секунд
- Success rate: >85% (з adjustments)

**Tool usage:**
- Filesystem: ~40%
- Playwright: ~30%
- Shell: ~20%
- Інші: ~10%

---

## 🔗 Посилання

**Основна документація:**
- [README.md](../README.md) - Повний огляд
- [ORCHESTRATOR_WORKFLOW.md](../docs/ORCHESTRATOR_WORKFLOW.md) - Детальний workflow
- [API_REFERENCE.md](../docs/API_REFERENCE.md) - API endpoints
- [MCP_TOOLS_COMPLETE.md](../docs/MCP_TOOLS_COMPLETE.md) - Всі tools
- [MCP_DYNAMIC_TODO_WORKFLOW_SYSTEM.md](../docs/MCP_DYNAMIC_TODO_WORKFLOW_SYSTEM.md) - Workflow система
- [MCP_SERVERS_REFERENCE.md](../docs/MCP_SERVERS_REFERENCE.md) - MCP сервери

**Конфігурація:**
- `config/global-config.js` - Головна конфігурація
- `config/agents-config.js` - Агенти
- `config/workflow-config.js` - Workflow
- `.env` - Змінні середовища

**Промпти:**
- `prompts/mcp/` - Всі 17 промптів

---

## ✅ Checklist для розробки

При роботі з системою завжди перевіряй:

- [ ] Промпти НЕ містять hardcoded tool lists
- [ ] Atlas НЕ рекомендує tools (тільки servers)
- [ ] Tetyana використовує ТІЛЬКИ {{AVAILABLE_TOOLS}}
- [ ] JSON валідний (без trailing commas, без коментарів)
- [ ] playwright_fill використовує параметр `value`
- [ ] applescript_execute має `code_snippet` та `language`
- [ ] Parameters конкретні (не example.com, не placeholders)
- [ ] Один item = одна дія (максимум 2 сервери)
- [ ] Success criteria чіткі та перевірні
- [ ] Dependencies тільки backward (item 3 → [1,2], НЕ [4,5])

---

**Версія:** 5.0.0  
**Останнє оновлення:** 19 жовтня 2025  
**Статус:** Production Ready
