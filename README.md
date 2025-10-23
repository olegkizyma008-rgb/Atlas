# ATLAS v5.0 - Інтелектуальна Багатоагентна Система

> **Версія:** 5.0.3 (Pure MCP Mode + Intelligent Verification)  
> **Останнє оновлення:** 22 жовтня 2025  
> **Статус:** Production Ready

**ATLAS v5.0** - інтелектуальна багатоагентна система з динамічним MCP TODO workflow, JSON Schema валідацією tools, **інтелектуальною двоетапною верифікацією** (visual + MCP), українською TTS/STT, та 3D візуалізацією. Система працює в Pure MCP режимі з Goose-inspired архітектурою.

## 🎯 Основні можливості

- **🤖 3 AI Агенти** - Atlas, Tetyana, Grisha з розподіленими ролями
- **🔄 MCP Dynamic TODO** - адаптивне планування та виконання завдань
- **🛠️ 5 MCP Серверів** - filesystem, playwright, shell, applescript, memory
- **🔒 JSON Schema Validation** - жорстке обмеження LLM на валідні tool names (Goose-style)
- **🛡️ Tetyana Tool System** - розширена система управління tools з LLM валідацією
- **🔍 Intelligent Verification** ⭐ NEW - двоетапна верифікація (LLM routing + visual/MCP)
- **🔄 Smart Retry Logic** - 3 спроби з exponential backoff та intelligent fallbacks
- **🗣️ Українська TTS** - синтез мовлення з Metal GPU acceleration
- **🎙️ Whisper STT** - розпізнавання мовлення (Large-v3, Metal)
- **🌐 Web Interface** - 3D візуалізація та чат-інтерфейс
- **⚡ DI Container** - модульна архітектура з lifecycle management

## 📋 Зміст

- [Системні вимоги](#системні-вимоги)
- [Швидкий старт](#швидкий-старт)
- [Архітектура системи](#архітектура-системи)
- [Процес запуску](#процес-запуску)
- [Компоненти системи](#компоненти-системи)
- [Tetyana Tool System](#tetyana-tool-system-new-v501) ⭐ NEW
- [Grisha Verification System](#grisha-verification-system-new-v503) ⭐ NEW
- [MCP Workflow](#mcp-workflow)
- [Конфігурація](#конфігурація)
- [API та Інтеграція](#api-та-інтеграція)
- [Моніторинг та логування](#моніторинг-та-логування)
- [Структура проекту](#структура-проекту)

---

## Системні вимоги

### Обов'язкові
- **macOS** (Apple Silicon рекомендовано для Metal GPU)
- **Python 3.11+** - для TTS та Whisper сервісів
- **Node.js 16+** - для Orchestrator
- **npm** - для глобальних MCP пакетів

### Рекомендовані
- **Metal GPU** - для прискорення TTS та Whisper
- **8GB+ RAM** - для одночасної роботи всіх сервісів
- **Mac Studio M1 Max** - оптимізовано для цієї конфігурації

## 🚀 Швидкий старт

### Крок 1: Клонування репозиторію

```bash
git clone <repository-url>
cd atlas4
```

### Крок 2: Налаштування середовища

```bash
# Копіювати приклад конфігурації
cp .env.example .env

# Відредагувати .env файл (встановити LLM_API_ENDPOINT)
vim .env

# Ключові налаштування:
# LLM_API_ENDPOINT=http://localhost:4000/v1/chat/completions
# MCP_LLM_MODEL=atlas-gpt-4o-mini  # Для LLM Tool Validator
# MCP_LLM_TEMPERATURE=0.1
# MCP_ITEM_MAX_ATTEMPTS=3  # Retry attempts для tool planning
```

### Крок 3: Встановлення залежностей

```bash
# Автоматична установка
./setup-macos.sh

# Або вручну:
npm install                          # Root dependencies
cd orchestrator && npm install       # Orchestrator dependencies
python3 -m venv .venv               # Python virtual environment
source .venv/bin/activate
pip install -r requirements.txt

# Глобальні MCP пакети
npm install -g @modelcontextprotocol/server-filesystem
npm install -g @executeautomation/playwright-mcp-server
npm install -g super-shell-mcp
npm install -g @peakmojo/applescript-mcp
npm install -g @modelcontextprotocol/server-memory
```

### Крок 4: Запуск системи

```bash
# Запуск всіх сервісів
./restart_system.sh start

# Або через npm
npm run start
```

### Крок 5: Доступ до інтерфейсу

- **Web Interface**: http://localhost:5001
- **Orchestrator API**: http://localhost:5101
- **Health Check**: http://localhost:5101/health

### Управління системою

```bash
./restart_system.sh status     # Перевірити статус всіх сервісів
./restart_system.sh stop       # Зупинити систему
./restart_system.sh restart    # Перезапустити систему
./restart_system.sh logs       # Переглянути логи
./restart_system.sh diagnose   # Діагностика системи
./restart_system.sh clean      # Очистити логи
```

---

## 🏗️ Архітектура системи

### Високорівнева архітектура

```
┌─────────────────────────────────────────────────────────────┐
│                    USER (Browser/Voice)                     │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│              Python Frontend (Flask) :5001                  │
│  • Static files serving                                     │
│  • 3D GLB visualization                                     │
│  • WebSocket proxy                                          │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTP/WebSocket
                           ▼
┌─────────────────────────────────────────────────────────────┐
│         Node.js Orchestrator (Express) :5101                │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  DI Container (Dependency Injection)                  │  │
│  │  • Service Registry                                   │  │
│  │  • Lifecycle Management (onInit/onStart/onStop)       │  │
│  └───────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Core Services                                        │  │
│  │  • Logger          • Config         • Telemetry       │  │
│  │  • Error Handler   • Sessions       • Network Config  │  │
│  └───────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  MCP Workflow Services                                │  │
│  │  • MCPManager        • MCPTodoManager                 │  │
│  │  • TTSSyncManager    • VisionAnalysis                 │  │
│  │  • TetyanaToolSystem (NEW: JSON Schema + LLM Guard)   │  │
│  └───────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Stage Processors (9 processors)                      │  │
│  │  • ModeSelection     • TodoPlanning                   │  │
│  │  • ServerSelection   • PlanTools                      │  │
│  │  • ExecuteTools      • VerifyItem (NEW: 4 sub-stages) │  │
│  │  • ReplanTodo        • FinalSummary                   │  │
│  └───────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Grisha Verification System (NEW v5.0.3)              │  │
│  │  • Heuristic Strategy    • LLM Eligibility Routing    │  │
│  │  • Visual Verification   • MCP Verification           │  │
│  │  • Smart Fallback (visual → MCP)                      │  │
│  └───────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  API Routes                                           │  │
│  │  • /chat/stream      • /health                        │  │
│  │  • /session/*        • /tts/*                         │  │
│  └───────────────────────────────────────────────────────┘  │
└──────────┬────────────┬────────────┬────────────┬──────────-┘
           │            │            │            │
           ▼            ▼            ▼            ▼
┌──────────────┐ ┌─────────┐ ┌─────────┐ ┌──────────────┐
│ LLM API      │ │ TTS     │ │ Whisper │ │ MCP Servers  │
│ :4000        │ │ :3001   │ │ :3002   │ │ (stdio)      │
│              │ │         │ │         │ │              │
│ • OpenRouter │ │ • Metal │ │ • Metal │ │ • filesystem │
│ • Local LLM  │ │ • GPU   │ │ • GPU   │ │ • playwright │
│              │ │         │ │         │ │ • shell      │
│              │ │         │ │         │ │ • applescript│
│              │ │         │ │         │ │ • memory     │
└──────────────┘ └─────────┘ └─────────┘ └──────────────┘
```

### Трьохагентна система

**ATLAS** (Координатор)
- Аналізує запити користувача
- Створює динамічні TODO плани
- Коригує плани при невдачах
- Приймає рішення про replan/skip/abort

**TETYANA** (Виконавець)
- Підбирає необхідні MCP сервери
- Планує tool_calls для кожного TODO пункту
- Виконує tools через MCP protocol
- Робить screenshots та adjustments

**GRISHA** (Верифікатор) ⭐ UPDATED v5.0.3
- **Двоетапна верифікація**: Heuristic Strategy + LLM Eligibility Routing
- **Visual verification (2 спроби з ескалацією моделей)**:
  - Спроба 1: Llama-3.2-11B Vision (швидка, ~1s)
  - Спроба 2: Llama-3.2-90B Vision (точна, ~2s)
  - Якщо обидві невдалі → автоматичний перехід до MCP
- **MCP verification**: Виконання через Tetyana processor (натоптана дорожка)
- **Intelligent routing**: Mistral 3B вибирає оптимальний метод верифікації
- **Smart fallback**: Автоматичний перехід visual (2 спроби) → MCP через LLM eligibility
- Надає детальні звіти про успіх/невдачу з evidence-based рекомендаціями

---

## ⚙️ Процес запуску

### Що відбувається при `./restart_system.sh start`?

1. **Завантаження змінних середовища** (.env файл)
2. **Ініціалізація директорій** (logs/, archive/)
3. **Запуск TTS Service** (Python, port 3001)
   - Завантаження ukrainian-tts моделей
   - Ініціалізація Metal GPU (MPS)
   - Запуск Flask сервера
4. **Запуск Whisper Service** (Python, port 3002)
   - Завантаження whisper.cpp binary
   - Ініціалізація Large-v3 моделі
   - Metal GPU acceleration (20+ layers)
5. **Запуск Orchestrator** (Node.js, port 5101)
   - DI Container initialization
   - Реєстрація всіх сервісів
   - Запуск 6 MCP серверів (stdio)
   - Lifecycle hooks (onInit → onStart)
6. **Запуск Frontend** (Python Flask, port 5001)
   - Serving static files
   - 3D GLB model loading
   - WebSocket proxy setup
7. **Запуск Recovery Bridge** (Python, port 5102)
8. **Health Check** - перевірка всіх сервісів

### Послідовність ініціалізації MCP Servers

```javascript
// orchestrator/ai/mcp-manager.js
await mcpManager.initialize();
  → spawn('npx', ['-y', '@modelcontextprotocol/server-filesystem'])
  → spawn('npx', ['-y', '@executeautomation/playwright-mcp-server'])
  → spawn('npx', ['-y', 'super-shell-mcp'])
  → spawn('npx', ['-y', '@peakmojo/applescript-mcp'])
  → spawn('npx', ['-y', '@modelcontextprotocol/server-memory'])
  
// Для кожного сервера:
1. Handshake (initialize message)
2. Wait for capabilities response
3. Request tools/list
4. Store tools in cache
```

---

## 🔄 MCP Workflow

### Dynamic TODO Execution Flow

```
User Request → Mode Selection (Stage 0)
                    ↓
            [CHAT MODE]  or  [TASK MODE]
                              ↓
                    Atlas TODO Planning (Stage 1-MCP)
                    ├─ Complexity: 1-10
                    ├─ Mode: standard/extended
                    └─ Items: [{id, action, tools, ...}]
                              ↓
              ┌───────────────┴───────────────┐
              │   Item-by-Item Execution      │
              │   (for each TODO item)        │
              └───────────────┬───────────────┘
                              ↓
           Server Selection (Stage 2.0-MCP)
           ├─ Filter relevant MCP servers
           └─ Optimize tool availability
                              ↓
          Tetyana Plan Tools (Stage 2.1-MCP)
          ├─ Select tools from filtered servers
          ├─ Generate tool_calls array
          ├─ Add tool history context
          └─ Validation with retry (3 attempts)
                             ↓
      Visual Capture Mode Selector (Stage 2.1.5-MCP) ⭐ NEW
      ├─ LLM вибирає режим/ціль/дисплей для скріну
      └─ `VisualCaptureService` фіксує стан перед виконанням
                             ↓
        Tetyana Execute Tools (Stage 2.2-MCP)
        ├─ RepetitionInspector: Check for loops
        ├─ LLMToolValidator: Safety validation 🛡️
        ├─ Execute each tool via MCP protocol
        ├─ Collect execution results
        └─ Record in tool history
                              ↓
         Grisha Verify Item (Stage 2.3-MCP) ⭐ UPDATED
         ├─ Sub-stage 2.3.0: Visual Capture Mode Selector (per attempt) ⭐ NEW
         │   └─ LLM визначає режим скріну + fallback для `VisualCaptureService`
         ├─ Sub-stage 2.3.1: Heuristic Strategy
         │   └─ Швидкий аналіз на основі keywords
         ├─ Sub-stage 2.3.2: LLM Eligibility Routing
         │   ├─ Model: atlas-ministral-3b (temp 0.1)
         │   └─ Output: {recommended_path, additional_checks}
         ├─ Sub-stage 2.3.3: Visual Verification (optional, 2 attempts)
         │   ├─ Attempt 1: Llama-3.2-11B Vision (fast, ~1s)
         │   ├─ Attempt 2: Llama-3.2-90B Vision (strong, ~2s)
         │   ├─ If both fail → re-run LLM Eligibility for MCP
         │   └─ Security checks (70% min confidence)
         ├─ Sub-stage 2.3.4: MCP Verification (REFACTORED 2025-10-23)
         │   ├─ Stage 2.0: Server Selection (з hints від eligibility)
         │   ├─ Stage 2.1: Tetyana Plan Tools (LLM + JSON Schema)
         │   ├─ Stage 2.2: Tetyana Execute Tools (ValidationPipeline)
         │   └─ Grisha Analysis: _analyzeMcpResults() + детальне логування
         └─ Return verified: true/false + confidence
                              ↓
                 ┌────────────┴────────────┐
                 │  Success?               │
                 └──┬─────────────────┬────┘
                YES │                 │ NO
                    ↓                 ↓
              Next Item      Grisha Deep Analysis (Stage 3.5)
                             ├─ getDetailedAnalysisForAtlas()
                             ├─ Failure analysis + suggestions
                             └─ Pass tetyanaData + grishaData to Atlas
                                      ↓
                           Atlas Replan (Stage 3.6-MCP)
                           ├─ Analyze tetyanaData + grishaData
                           ├─ Decision: replan/skip/abort
                           ├─ Strategy: retry/alternative/decompose
                           ├─ Generate hierarchical child IDs (2 → 2.1, 2.2) ⭐ NEW
                           └─ Insert new items if replanned
                                      ↓
                         ┌──────────────┴──────────────┐
                         │  All Items Completed?       │
                         └──┬──────────────────────┬───┘
                        YES │                      │ NO
                            ↓                      ↓
                   Final Summary          Continue Loop
                   (Stage 8-MCP)
```

### Hierarchical TODO IDs (NEW v5.0.5) ⭐

Система використовує **ієрархічні ID** для відображення структури replanning:

```
1 ✅ Відкрити калькулятор
2 🔄 Помножити 7*139 (failed)
  ↳ 2.1 ✅ Очистити дисплей
  ↳ 2.2 🔄 Ввести 7*139 (failed again!)
      ↳ 2.2.1 ✅ Використати інший метод
      ↳ 2.2.2 ✅ Верифікація скріншотом
  ↳ 2.3 ✅ Підтвердити результат
3 ✅ Відняти 85 (розблоковано після 2.1-2.3)
```

**Переваги ієрархічних ID:**
- **Візуальна структура:** `2.2.1` = дитина `2.2`, яка є дитиною `2`
- **Глибина replanning:** Кількість крапок = рівень вкладеності
- **Автоматичний dependency tracking:** Item #3 залежить від #2 → автоматично блокується до завершення 2.1, 2.2.1, 2.2.2, 2.3
- **Діагностика:** Легко знайти де система застряла в replan loop

**Імплементація:**
- `HierarchicalIdManager` utility (`orchestrator/workflow/utils/hierarchical-id-manager.js`)
- Методи: `generateChildId()`, `getChildren()`, `getDescendants()`, `parseId()`, `formatForDisplay()`
- Автоматична генерація при replanning в `executor-v3.js`
- Enhanced dependency checking для replanned parents

**Документація:** `/docs/fixes/HIERARCHICAL_ID_SYSTEM_2025-10-23.md`

### MCP Stage Processors

| Stage   | Processor                      | Agent   | Responsibility                                    |
| ------- | ------------------------------ | ------- | ------------------------------------------------- |
| 0       | `ModeSelectionProcessor`       | System  | Chat vs Task classification                       |
| 1-MCP   | `AtlasTodoPlanningProcessor`   | Atlas   | Create dynamic TODO list                          |
| 2.0-MCP | `ServerSelectionProcessor`     | System  | Filter relevant MCP servers                       |
| 2.1-MCP | `TetyanaПlanToolsProcessor`    | Tetyana | Plan tool_calls with JSON Schema validation       |
| 2.2-MCP | `TetyanaExecuteToolsProcessor` | Tetyana | Execute tools via MCP with LLM safety validation  |
| 2.3-MCP | `GrishaVerifyItemProcessor`    | Grisha  | Intelligent verification (4 sub-stages) ⭐ UPDATED |
| 3.5     | Grisha Deep Analysis           | Grisha  | Detailed failure analysis for Atlas               |
| 3.6-MCP | `AtlasReplanTodoProcessor`     | Atlas   | Deep analysis & replan with Tetyana + Grisha data |
| 8-MCP   | `McpFinalSummaryProcessor`     | System  | Generate final summary                            |

---

## 🧩 Компоненти системи

### Orchestrator Core

**DI Container** (`orchestrator/core/di-container.js`)
- Dependency Injection для всіх сервісів
- Lifecycle management (onInit/onStart/onStop)
- Singleton pattern для shared services
- Circular dependency detection

**Service Registry** (`orchestrator/core/service-registry.js`)
```javascript
// Реєстрація сервісів з пріоритетами
registerCoreServices(container)      // priority: 100-85
registerApiServices(container)       // priority: 60-50
registerStateServices(container)     // priority: 70
registerUtilityServices(container)   // priority: 45
registerMCPWorkflowServices(container) // priority: 55-50
registerMCPProcessors(container)     // priority: 45-40
```

**Application** (`orchestrator/core/application.js`)
- Головний lifecycle manager
- Express app setup
- Routes configuration
- Graceful shutdown

### MCP Manager

**MCPManager** (`orchestrator/ai/mcp-manager.js`)
```javascript
class MCPManager {
  // Запуск MCP серверів через stdio
  async initialize() {
    for (const [name, config] of servers) {
      const process = spawn(config.command, config.args);
      const server = new MCPServer(name, config, process);
      await server.initialize(); // handshake
      await server.requestToolsList(); // get available tools
    }
  }
  
  // Виконання tool через MCP protocol
  async executeTool(serverName, toolName, parameters) {
    const server = this.servers.get(serverName);
    return await server.call(toolName, parameters);
  }
}
```

**TetyanaToolSystem** (`orchestrator/ai/tetyana-tool-system.js`) - NEW v5.0.1
```javascript
class TetyanaToolSystem {
  // Advanced tool management with validation
  async initialize() {
    this.extensionManager = new MCPExtensionManager(mcpManager);
    this.historyManager = new ToolHistoryManager({ maxSize: 100 });
    this.inspectionManager = new ToolInspectionManager();
    this.llmValidator = new LLMToolValidator(llmClient); // 🛡️
  }
  
  // Виконання з валідацією
  async executeToolCalls(toolCalls, context) {
    // 1. Repetition check
    const repetitionCheck = await this.inspectionManager.inspectTools(toolCalls);
    if (repetitionCheck.denied) return { blocked: true };
    
    // 2. LLM Safety validation 🛡️
    const validation = await this.llmValidator.validateToolCalls(toolCalls, context);
    if (validation.shouldBlock) return { blocked: true, reason: validation.summary };
    
    // 3. Execute
    const results = await this.dispatcher.dispatchToolCalls(toolCalls);
    
    // 4. Record history
    this.historyManager.recordCall(toolCall, result);
    
    return results;
  }
}
```

**MCPTodoManager** (`orchestrator/workflow/mcp-todo-manager.js`)
- Створення динамічних TODO списків
- Item-by-item виконання
- Retry logic з adaptive adjustments
- TTS synchronization
- WebSocket chat updates

---

## 🔍 Grisha Verification System (NEW v5.0.3)

**Інтелектуальна двоетапна система верифікації** з LLM routing та повною уніфікацією через MCP workflow (Stage 2.0→2.1→2.2).

### Масштабованість з 10+ MCP Servers

**REFACTORED 2025-10-23**: Grisha тепер використовує повний MCP workflow для верифікації, що забезпечує масштабованість:

**Потік даних через систему:**
```
┌─────────────────────────────────────────────────────────────┐
│ Eligibility LLM (Mistral 3B)                                │
│ Визначає ЩО треба перевірити                               │
└────────────────────┬────────────────────────────────────────┘
                     ↓ (hints: server, tool, parameters)
┌─────────────────────────────────────────────────────────────┐
│ Grisha створює verification item                            │
│ { action, success_criteria, mcp_servers: [hint] }          │
└────────────────────┬────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────────┐
│ Stage 2.0: Server Selection                                 │
│ Обирає правильний server з 5/10+ серверів                  │
└────────────────────┬────────────────────────────────────────┘
                     ↓ (selected_servers, selected_prompts)
┌─────────────────────────────────────────────────────────────┐
│ Stage 2.1: Tetyana Plan Tools                               │
│ Спеціалізований промпт + JSON Schema                       │
│ TETYANA_PLAN_TOOLS_FILESYSTEM                              │
└────────────────────┬────────────────────────────────────────┘
                     ↓ (plan.tool_calls з правильними іменами)
┌─────────────────────────────────────────────────────────────┐
│ Stage 2.2: Tetyana Execute Tools                            │
│ ValidationPipeline → MCPManager → Виконання                │
└────────────────────┬────────────────────────────────────────┘
                     ↓ (execution.results, execution.all_successful)
┌─────────────────────────────────────────────────────────────┐
│ Grisha Analysis (_analyzeMcpResults)                        │
│ Аналізує результати проти success_criteria                 │
│ Детальне логування кожного tool result                     │
└────────────────────┬────────────────────────────────────────┘
                     ↓ (verified: boolean, confidence: number, reason: string)
┌─────────────────────────────────────────────────────────────┐
│ Вердикт → Executor                                          │
│ ✅ VERIFIED → Next Item                                     │
│ ❌ NOT VERIFIED → Replan або Adjust                         │
└─────────────────────────────────────────────────────────────┘

**Переваги нової архітектури:**
- ✅ Масштабується до будь-якої кількості MCP servers
- ✅ Спеціалізовані промпти для кожного server (TETYANA_PLAN_TOOLS_FILESYSTEM, etc.)
- ✅ JSON Schema гарантує правильний формат tool names
- ✅ Уніфікація: verification використовує той самий workflow що й основне виконання
- ✅ 1 Тетяна для планування (основна + verification)
- ✅ 2 Тетяни для виконання (основна + verification)

### Visual Capture Mode Selector (NEW v5.0.4)

Щоб уникнути дубльованих механізмів скріншотингу та забезпечити правильний вибір режиму, Тетяна й Гриша тепер спільно використовують промпт `prompts/mcp/visual_capture_mode_selector.js`.

* __Що робить промпт__
  - аналізує контекст TODO-елемента (агент, опис дії, критерії успіху, попередні спроби);
  - повертає чистий JSON із параметрами для `VisualCaptureService.captureScreenshot()`:
    `mode`, `target_app`, `display_number`, `require_retry`, `fallback_mode`, `reasoning`, `confidence`.
* __Де використовується__
  - `MCPTodoManager.screenshotAndAdjust()` (Stage 2.1.5) викликає селектор перед скріном для корекції плану Тетяни;
  - `GrishaVerifyItemProcessor._executeVisualVerification()` (Stage 2.3) запитує селектор для кожної спроби візуальної верифікації, з урахуванням стратегії та попередніх невдач.
* __Чим замінив попереднє рішення__
  - повністю прибрані окремі Playwright/Shell скріншоти з `MCPTodoManager`;
  - fallback-логіка тепер централізована: якщо основний режим не спрацював, використовується `fallback_mode` з відповіді промпта.
* __Конфігурація__
  - для стадії `visual_capture_mode_selector` додано модель у `config/models-config.js` (типово `atlas-ministral-3b`, temp 0.1, max_tokens 400);
  - сервіс `VisualCaptureService` отримує всі параметри через результати промпта, що гарантує однакову поведінку для обох агентів.

### Архітектура верифікації

Гриша використовує **4-етапний процес верифікації** для максимальної точності:

#### Етап 1: Heuristic Strategy (евристичний аналіз)
```javascript
// grisha-verification-strategy.js
class GrishaVerificationStrategy {
  determineStrategy(item, execution) {
    // Швидкий аналіз на основі keywords
    const visualIndicators = this._detectVisualIndicators(action, criteria);
    const filesystemIndicators = this._detectFilesystemIndicators(action, criteria);
    
    if (visualIndicators.score >= 70) {
      return { method: 'visual', confidence: 85, fallbackToMcp: true };
    }
    
    if (filesystemIndicators.score >= 60) {
      return { method: 'mcp', mcpServer: 'filesystem', confidence: 80 };
    }
    
    return { method: 'visual', confidence: 30, fallbackToMcp: true };
  }
}
```

**Детекція індикаторів:**
- **Visual**: калькулятор, safari, finder, вікно, екран, результат
- **Filesystem**: файл, папка, створити, зберегти, існує
- **Shell**: команда, скрипт, процес, виконати
- **Memory**: запам'ятати, знання, інформація

#### Етап 2: LLM Eligibility Routing (інтелектуальний вибір)
```javascript
// grisha-verification-eligibility-processor.js
// Model: atlas-ministral-3b (Mistral 3B)
// Temperature: 0.1 (низька для консистентності)

const eligibilityResult = await this.callLLM({
  systemPrompt: GRISHA_VERIFICATION_ELIGIBILITY.SYSTEM_PROMPT,
  userPrompt: `
    TODO Item: ${item.action}
    Success Criteria: ${item.success_criteria}
    Execution Summary: ${executionSummary}
    Heuristic Signal: visual confidence ${heuristicConfidence}%
  `,
  model: 'atlas-ministral-3b',
  temperature: 0.1,
  max_tokens: 500
});

// Output:
{
  "visual_possible": true,
  "confidence": 85,
  "reason": "Файлова операція - візуальна перевірка слабка",
  "recommended_path": "data",  // 'visual' | 'data' | 'hybrid'
  "additional_checks": [
    {
      "description": "Перевірити існування файлу calc_result.txt",
      "server": "filesystem",  // Hint для Stage 2.0
      "tool": "filesystem__read_file",  // Hint (Stage 2.1 може змінити)
      "parameters": { "path": "/Users/dev/Desktop/calc_result.txt" },
      "expected_evidence": "Файл існує і містить результат 18.68"
    }
  ]
}

// NOTE: additional_checks - це HINTS, не фінальний план.
// Stage 2.0 (Server Selection) валідує server
// Stage 2.1 (Tetyana Plan) обирає фінальні tools через LLM + JSON Schema
```

**LLM приймає рішення на основі:**
- Типу операції (UI vs файлова система)
- Критеріїв успіху
- Результатів виконання Тетяни
- Евристичних сигналів

#### Етап 3: Visual Verification (візуальна перевірка)
```javascript
// Якщо recommended_path === 'visual' або 'hybrid'

// 1. Capture screenshot
const screenshot = await this.visualCapture.captureScreenshot(
  `item_${item.id}_verify`,
  { targetApp: 'Calculator' }  // Window screenshot якщо є targetApp
);

// 2. Vision AI analysis
const visionAnalysis = await this.visionAnalysis.analyzeScreenshot(
  screenshot.filepath,
  item.success_criteria,
  { action: item.action, executionResults: execution.results }
);

// 3. Security checks
if (visionAnalysis._fallback === true) {
  verified = false;  // Reject fallback responses
}

if (visionAnalysis.visual_evidence?.matches_criteria !== true) {
  verified = false;  // Require explicit match
}

if (visionAnalysis.confidence < 70) {
  verified = false;  // Minimum 70% confidence
}
```

**Vision Models:**
- **Primary**: `atlas-llama-3.2-90b-vision-instruct` (Llama 3.2 90B Vision)
- **Fallback**: `atlas-llama-3.2-11b-vision-instruct` (Llama 3.2 11B Vision)
- **Local**: Ollama `llama3.2-vision` (безкоштовний, повільний)

**Security Features:**
- Fallback rejection (no unstructured responses)
- Explicit criteria matching validation
- Minimum confidence threshold (70%)
- Evidence validation logging

#### Етап 3: MCP Verification через повний workflow (REFACTORED 2025-10-23)
```javascript
// Якщо recommended_path === 'data' або 'hybrid'

// 1. Створити verification item з hints від Eligibility LLM
const verificationItem = {
  id: `verify_${currentItem.id}_${Date.now()}`,
  action: `Перевірити виконання: ${currentItem.action}`,
  success_criteria: currentItem.success_criteria,
  mcp_servers: eligibilityDecision?.additional_checks?.map(c => c.server) || []  // Hint
};

// 2. STAGE 2.0: Server Selection
const serverSelectionProcessor = this.container.resolve('serverSelectionProcessor');
const selectionResult = await serverSelectionProcessor.execute({
  currentItem: verificationItem,
  todo: { items: [currentItem] }
});
// → Обирає правильний server з 5/10+ серверів
// → Повертає: selected_servers, selected_prompts

// 3. STAGE 2.1: Tetyana Plan Tools
const tetyanaPlanProcessor = this.container.resolve('tetyanaPlanToolsProcessor');
const planResult = await tetyanaPlanProcessor.execute({
  currentItem: verificationItem,
  selectedServers: selectionResult.selected_servers,
  selectedPrompts: selectionResult.selected_prompts
});
// → Використовує спеціалізований промпт (TETYANA_PLAN_TOOLS_FILESYSTEM)
// → JSON Schema гарантує правильний формат: filesystem__get_file_info
// → Повертає: plan.tool_calls

// 4. STAGE 2.2: Tetyana Execute Tools
const tetyanaExecuteProcessor = this.container.resolve('tetyanaExecuteToolsProcessor');
const execResult = await tetyanaExecuteProcessor.execute({
  currentItem: verificationItem,
  plan: planResult.plan,
  todo: { items: [currentItem] },
  session: null,
  res: null
});
// → ValidationPipeline: repetition check + LLM safety validation
// → Виконання через MCPManager
// → Повертає: execution.results, execution.all_successful

// 5. GRISHA ANALYSIS: Аналіз результатів і вердикт
const verificationResults = execResult.execution;

// Детальне логування для аналізу
this.logger.system('grisha-verify-item', '[MCP-GRISHA] 📊 Verification execution results:');
this.logger.system('grisha-verify-item', `  All successful: ${verificationResults.all_successful}`);
this.logger.system('grisha-verify-item', `  Tool count: ${verificationResults.results?.length}`);

verificationResults.results.forEach((result, idx) => {
  const status = result.success ? '✅' : '❌';
  this.logger.system('grisha-verify-item', `  ${status} Tool ${idx + 1}: ${result.metadata?.tool}`);
  if (result.data) {
    this.logger.system('grisha-verify-item', `     Data: ${JSON.stringify(result.data).substring(0, 200)}`);
  }
});

// Аналіз результатів проти success_criteria
const verified = this._analyzeMcpResults(
  verificationResults,
  currentItem.success_criteria
);
// → Повертає: { success: boolean, confidence: number, reason: string }
```

**Переваги MCP верифікації:**
- ✅ Використовує той самий код, що й Тетяна (Stage 2.2)
- ✅ Автоматичне лікування при фіксах Тетяни
- ✅ Всі security checks та validations
- ✅ Tool history tracking
- ✅ Repetition detection

### Smart Fallback System

**Visual → MCP fallback:**
```javascript
if (!verification.verified && strategy.fallbackToMcp) {
  const mcpVerification = await this._executeMcpVerification(...);
  if (mcpVerification.verified) {
    verification = mcpVerification;  // Use MCP result
  }
}
```

**MCP → Visual fallback** (опціонально):
```javascript
if (!verification.verified && strategy.fallbackToVisual) {
  const visualVerification = await this._executeVisualVerification(...);
  if (visualVerification.verified) {
    verification = visualVerification;  // Use Visual result
  }
}
```

### Конфігурація

**Environment Variables (.env):**
```bash
# Grisha Verification Configuration
MCP_MODEL_VERIFICATION_ELIGIBILITY=atlas-ministral-3b
MCP_TEMP_VERIFICATION_ELIGIBILITY=0.1
```

**Agent Config (agents-config.js):**
```javascript
grisha: {
  verification: {
    methods: ['visual', 'mcp'],
    defaultMethod: 'visual',
    routing: {
      model: 'atlas-ministral-3b',
      temperature: 0.1
    },
    visual: {
      visionModel: 'atlas-llama-3.2-90b-vision-instruct',
      minConfidence: 70,
      captureDelay: 2000
    },
    mcp: {
      usesTetyanaProcessor: true,
      supportedServers: ['filesystem', 'shell', 'memory']
    },
    fallback: {
      visualToMcp: true,
      mcpToVisual: false
    }
  }
}
```

**Workflow Config (workflow-config.js):**
```javascript
GRISHA_VERIFY_ITEM: {
  stage: 5,
  subStages: [
    { id: 'VERIFICATION_STRATEGY', timeout: 5000 },
    { id: 'VERIFICATION_ELIGIBILITY', model: 'atlas-ministral-3b', timeout: 10000 },
    { id: 'VISUAL_VERIFICATION', optional: true, timeout: 30000 },
    { id: 'MCP_VERIFICATION', optional: true, timeout: 30000 }
  ]
}
```

### Приклад роботи

**Сценарій 1: Файлова операція**
```
User: "Створи файл calc_result.txt з результатом 18.68"

Heuristic Strategy:
  → Detected: filesystem keywords (файл, створи)
  → Recommendation: MCP (confidence: 80%)

LLM Eligibility (Mistral 3B):
  → Analysis: "Файлова операція - візуальна перевірка слабка"
  → Decision: recommended_path = "data"
  → Additional checks: [filesystem__read_file]

MCP Verification:
  → Execute: filesystem__read_file("/Users/dev/Desktop/calc_result.txt")
  → Result: File exists, contains "18.68"
  → Verified: ✅ TRUE (confidence: 90%)
```

**Сценарій 2: UI операція з fallback**
```
User: "Відкрий калькулятор і порахуй 5+3"

Heuristic Strategy:
  → Detected: visual keywords (калькулятор, результат)
  → Recommendation: Visual (confidence: 90%)

LLM Eligibility (Mistral 3B):
  → Analysis: "UI операція - візуальна перевірка оптимальна"
  → Decision: recommended_path = "visual"
  → Additional checks: []

Visual Verification:
  → Screenshot: Calculator app window
  → Vision AI: "Calculator is open, result shows 8"
  → Verified: ✅ TRUE (confidence: 85%)
```

---

## 🛡️ Tetyana Tool System (NEW v5.0.2)

**Розширена система управління tools** з JSON Schema валідацією та tracking історії.

### Компоненти системи

**1. JSON Schema Validation** - Goose-inspired strict validation 🔒
- Генерує JSON Schema з enum валідних tool names з MCP серверів
- LLM **фізично не може** вигадати невалідні назви tools
- Використовує `response_format` з `strict: true`
- Автоматична валідація на рівні OpenAI API
- **100% гарантія** що tool names валідні

**2. ToolHistoryManager** - Tracking tool calls
- Записує останні 100 викликів
- Success/failure rates per tool
- Форматує історію для LLM context
- Допомагає Tetyana уникати повторних помилок

**3. RepetitionInspector** - Loop detection
- Детектує consecutive repetitions (max 3)
- Tracking total calls per tool (max 10)
- **БЛОКУЄ** виконання при зациклення
- Actions: ALLOW, DENY, REQUIRE_APPROVAL

**4. LLMToolValidator** - Safety validation 🛡️
- Валідує tool calls ПЕРЕД виконанням
- Перевіряє безпеку (dangerous paths, destructive commands)
- Аналізує relevance до user intent
- Оцінює ризики: none/low/medium/high/critical
- **БЛОКУЄ** high/critical risk operations

**5. ToolInspectionManager** - Coordination
- Координує всі inspectors
- Агрегує результати валідації
- Graceful error handling

### Tool Planning Flow з JSON Schema

```javascript
// Stage 2.1: Tetyana Plan Tools

async planTools(item, availableTools) {
  // STEP 1: Build JSON Schema з валідними tool names
  const toolSchema = {
    properties: {
      tool_calls: {
        items: {
          properties: {
            tool: {
              enum: ["filesystem__create_directory", "filesystem__write_file", ...]
            }
          }
        }
      }
    },
    strict: true
  };
  
  // STEP 2: LLM запит з JSON Schema
  const response = await llm.chat({
    messages: [...],
    response_format: {
      type: 'json_schema',
      json_schema: { schema: toolSchema, strict: true }
    }
  });
  
  // STEP 3: Отримуємо ГАРАНТОВАНО валідний JSON
  // LLM не може повернути tool name поза enum списком
  return response.tool_calls; // Завжди валідні!
}
```

### Execution Flow з валідацією

```javascript
// Stage 2.2: Tetyana Execute Tools

async executeToolCalls(toolCalls, context) {
  // STEP 1: Repetition check
  const repetitionCheck = await inspectionManager.inspectTools(toolCalls);
  if (repetitionCheck.denied) {
    return { blocked: true, reason: 'Loop detected' };
  }
  
  // STEP 2: LLM Safety validation 🛡️
  const validation = await llmValidator.validateToolCalls(toolCalls, {
    userIntent: context.itemAction
  });
  
  if (validation.shouldBlock) {
    logger.error('🚫 BLOCKED:', validation.summary);
    return { 
      blocked: true, 
      reason: validation.summary,
      details: validation.highRisk 
    };
  }
  
  // STEP 3: Execute (якщо пройшли всі перевірки)
  const results = await dispatcher.dispatchToolCalls(toolCalls);
  
  // STEP 4: Record in history
  historyManager.recordCall(toolCall, result);
  
  return results;
}
```

### Приклади валідації

**✅ Безпечна операція:**
```javascript
Tool: filesystem__read_file { path: '/Users/dev/config.json' }
Validation: { valid: true, risk: 'none' }
→ ✅ ДОЗВОЛЕНО
```

**🚫 Небезпечна операція:**
```javascript
Tool: shell__run_command { command: 'rm -rf /' }
Validation: { 
  valid: false, 
  risk: 'critical',
  reasoning: 'Command will delete entire system'
}
→ 🚫 ЗАБЛОКОВАНО
```

### Конфігурація

```bash
# .env
MCP_LLM_MODEL=atlas-gpt-4o-mini      # GPT-4o-mini для швидкого reasoning
MCP_LLM_TEMPERATURE=0.1              # Низька температура для стабільності
```

### Статистика

```javascript
const stats = tetyanaToolSystem.getStatistics();

{
  history: {
    totalCalls: 127,
    successRate: 0.77,
    uniqueTools: 15
  },
  inspection: {
    repetition: { denied: 3, allowed: 124 }
  },
  llmValidator: {
    totalValidations: 127,
    blocked: 3,
    blockRate: '2.36%'
  }
}
```

**Estimated Impact:**
- ✅ **100% валідні tool names** через JSON Schema (було: ~70% з retry)
- ✅ **0 помилок** "tool not found" (було: ~30% планів з помилками)
- ✅ 90%+ блокування небезпечних операцій через LLM Validator
- ✅ 60-80% зменшення зациклень через RepetitionInspector
- ✅ Семантична валідація через LLM reasoning

**Ключові покращення v5.0.2:**
- 🔒 JSON Schema validation (Goose-inspired)
- 🔄 Retry logic: 3 спроби (було: 1)
- 📊 Tool history tracking для контексту
- 🛡️ Multi-layer security (Schema + LLM + Repetition)

**Документація:** [`docs/LLM_VALIDATOR_CONFIG.md`](docs/LLM_VALIDATOR_CONFIG.md)

---

### Stage Processors

Кожен processor відповідає за один етап workflow:

```javascript
// Приклад: TetyanaПlanToolsProcessor
class TetyanaПlanToolsProcessor {
  async process(item, todo, context) {
    // 1. Get available tools from selected servers
    const tools = mcpManager.getToolsFromServers(context.selectedServers);
    
    // 2. Call LLM to plan tool_calls
    const plan = await this.callLLM({
      systemPrompt: TETYANA_PLAN_TOOLS_PROMPT,
      userMessage: { item, tools }
    });
    
    // 3. Validate tool_calls
    const validation = mcpManager.validateToolCalls(plan.tool_calls);
    
    // 4. Retry if invalid (max 3 attempts)
    if (!validation.valid) {
      return this.retryWithFeedback(validation.errors);
    }
    
    return plan;
  }
}
```

### Services

**TTS Service** (`ukrainian-tts/tts_server.py`)
- Ukrainian-TTS модель (robinhad/ukrainian-tts)
- 4 голоси: dmytro, tetiana, mykyta, lada
- Metal GPU acceleration (MPS device)
- Фільтрація фраз (phrase-filter)
- FX presets для кожного агента

**Whisper Service** (`services/whisper/whispercpp_service.py`)
- Whisper.cpp Large-v3 модель
- Metal GPU offloading (20+ layers)
- WebM/Opus → WAV конвертація (PyAV)
- Корекція активаційних слів "Атлас"
- Initial prompt для контексту

**Vision Analysis** (`orchestrator/services/vision-analysis-service.js`)
- GPT-4o vision (primary, ~2s)
- Atlas vision models (secondary)
- Screenshot analysis для Grisha
- Automatic provider selection

### Multi-Agent Framework (Pure MCP)

Система використовує MCP Dynamic TODO Workflow:

- **🧠 ATLAS Agent** (зелений) - Створює TODO плани з item-by-item розбивкою
- **💪 TETYANA Agent** (блакитний) - Виконує кожен пункт через MCP tools
- **🛡️ GRISHA Agent** (жовтий) - Перевіряє виконання кожного item окремо

### MCP Workflow етапи:
1. **Stage 0**: Mode Selection (chat vs task)
2. **Stage 1-MCP**: ATLAS - TODO Planning (створює динамічний план)
3. **Stage 2.1-MCP**: TETYANA - Plan Tools (підбирає MCP tools)
4. **Stage 2.2-MCP**: TETYANA - Execute Tools (виконує через MCP)
5. **Stage 2.3-MCP**: GRISHA - Verify Item (перевіряє окремий item)
6. **Stage 3-MCP**: ATLAS - Adjust TODO (коригує при failing)
7. **Stage 8-MCP**: Final Summary (загальний результат)
4. **Stage 4**: TETYANA - Повторне виконання з уточненнями
5. **Stage 5**: GRISHA - Діагностика (якщо блокування)
6. **Stage 6**: ATLAS - Корекція завдання  
7. **Stage 7**: GRISHA - Верифікація результатів ✅
8. **Stage 8**: SYSTEM - Завершення workflow
9. **Stage 9**: ATLAS - Новий цикл (якщо потрібно)

## 🎯 Ключові особливості

### Ключові особливості системи:
- **Pure MCP режим** - система працює виключно через MCP protocol
- **Контекст-орієнтована архітектура** - 10 повідомлень історії в chat mode, 5 в task mode
- **Виявлення проблем** - при помилках генеруються exceptions для швидкої діагностики
- **WebSocket інтеграція** - real-time комунікація між компонентами

### Ukrainian TTS система:
- **Множинні голоси**: dmytro, tetiana, mykyta, oleksa
- **Реальний синтез мовлення** - не mock-режим
- **Голосова система агентів** - кожен агент має свій голос
- **Apple Silicon оптимізація** - MPS device для нейронних мереж

### Централізоване управління:
- **restart_system.sh** - єдиний скрипт для всієї системи
- **config/global-config.js** - головний конфігураційний файл (єдине джерело істини)
- **Модульні конфіги** - agents-config.js, workflow-config.js, api-config.js
- **Автоматична діагностика** - вбудована система перевірок

## 🚀 Швидкий старт

### Передумови

- macOS (Apple Silicon або Intel)
- Python 3.9+
- Node.js 16+
- LLM API endpoint (local або remote)

### Установка

1. **Встановити залежності**
```bash
./install.sh
```

2. **Запустити систему**
```bash
./restart_system.sh start
```

### Доступ до системи
- **Веб-інтерфейс**: http://localhost:5001
- **Orchestrator API**: http://localhost:5101
- **TTS Service**: http://localhost:3001
- **Whisper Service**: http://localhost:3002

### 💬 Голосове спілкування

Після запуску системи відкрийте веб-інтерфейс та використовуйте кнопку мікрофону 🔵:

**Quick-send (швидке повідомлення):**
1. Натисніть кнопку 🔵 **один раз**
2. Говоріть (макс. 30 секунд)
3. Повідомлення автоматично відправиться

**Conversation (живий діалог):**
1. **Утримуйте** кнопку 🔵 протягом **2 секунд**
2. Дочекайтеся зеленого світла 🟢
3. Скажіть **"Атлас"**
4. Почніть діалог - система автоматично підтримує розмову

Детальна інструкція: [`docs/CONVERSATION_MODE_QUICK_GUIDE.md`](docs/CONVERSATION_MODE_QUICK_GUIDE.md)

---

## ⚙️ Конфігурація

### Змінні середовища (.env)

Вся конфігурація системи керується через `.env` файл. Скопіюйте `.env.example` до `.env` та налаштуйте:

#### LLM API Configuration
```bash
# Основний API endpoint (localhost або ngrok)
LLM_API_ENDPOINT=http://localhost:4000/v1/chat/completions

# Secondary endpoint для віддаленого доступу (опціонально)
LLM_API_FALLBACK_ENDPOINT=https://your-ngrok.ngrok-free.app/v1/chat/completions
LLM_API_USE_FALLBACK=false

# Timeout для API запитів (мс)
LLM_API_TIMEOUT=60000
```

#### AI Backend & MCP Configuration
```bash
# Режим роботи (завжди 'mcp' в v5.0)
AI_BACKEND_MODE=mcp

# Максимальна кількість спроб виконання TODO item
MCP_ITEM_MAX_ATTEMPTS=3

# Timeout для MCP операцій
MCP_TIMEOUT_MS=30000

# Максимальна кількість спроб планування tools
MCP_TOOL_PLANNING_MAX_ATTEMPTS=3
```

#### MCP LLM Configuration (NEW v5.0.1)
```bash
# LLM Tool Validator (safety and validation)
MCP_LLM_MODEL=atlas-gpt-4o-mini
MCP_LLM_TEMPERATURE=0.1
```

#### MCP Models (Per-Stage Configuration)
```bash
# Stage 0: Mode Selection (task vs chat)
MCP_MODEL_MODE_SELECTION=atlas-ministral-3b
MCP_TEMP_MODE_SELECTION=0.05

# Stage 1: Atlas TODO Planning
MCP_MODEL_TODO_PLANNING=atlas-gpt-4o-mini
MCP_TEMP_TODO_PLANNING=0.3

# Stage 2.1: Tetyana Plan Tools
MCP_MODEL_PLAN_TOOLS=atlas-gpt-4o-mini
MCP_TEMP_PLAN_TOOLS=0.1

# Stage 2.3: Grisha Verify Item
MCP_MODEL_VERIFY_ITEM=atlas-mistral-small-2503
MCP_TEMP_VERIFY_ITEM=0.15

# Stage 8: Final Summary
MCP_MODEL_FINAL_SUMMARY=atlas-ministral-3b
MCP_TEMP_FINAL_SUMMARY=0.5
```

#### TTS Service
```bash
# Режим TTS (true = реальний синтез, false = mock)
REAL_TTS_MODE=true

# Пристрій для TTS (mps = Metal GPU, cpu = CPU)
TTS_DEVICE=mps

# Порт TTS сервісу
TTS_PORT=3001

# Голоси для агентів
TTS_VOICE_ATLAS=dmytro
TTS_VOICE_TETYANA=tetiana
TTS_VOICE_GRISHA=mykyta
```

#### Whisper Service
```bash
# Backend для Whisper (cpp = whisper.cpp, python = faster-whisper)
WHISPER_BACKEND=cpp

# Пристрій (metal = Metal GPU, cpu = CPU)
WHISPER_DEVICE=metal

# Порт Whisper сервісу
WHISPER_PORT=3002

# Sample rate для аудіо
WHISPER_SAMPLE_RATE=48000

# Шлях до whisper.cpp binary
WHISPER_CPP_BIN=/path/to/whisper-cli

# Шлях до моделі
WHISPER_CPP_MODEL=/path/to/ggml-large-v3.bin

# Кількість threads
WHISPER_CPP_THREADS=10

# Кількість GPU layers (0 = CPU only)
WHISPER_CPP_NGL=20

# Початковий промпт для контексту
WHISPER_CPP_INITIAL_PROMPT="Це українська мова з правильною орфографією..."
```

#### Mac Studio M1 Max Optimizations
```bash
# Увімкнути Metal GPU acceleration
USE_METAL_GPU=true

# Оптимізації для M1 Max
OPTIMIZE_FOR_M1_MAX=true

# Performance cores для Whisper
WHISPER_CPP_THREADS=10

# GPU layers для Metal
WHISPER_CPP_NGL=20
```

#### Service Ports
```bash
# Orchestrator API
ORCHESTRATOR_PORT=5101

# Frontend Web Server
WEB_PORT=5001
FRONTEND_PORT=5001

# TTS Service
TTS_PORT=3001

# Whisper Service
WHISPER_PORT=3002

# Recovery Bridge
RECOVERY_BRIDGE_PORT=5102
```

### Конфігураційні файли

**`config/atlas-config.js`** - Головний конфігураційний агрегатор
- Імпортує та експортує всі конфігурації
- Забезпечує єдину точку входу для всіх конфігурацій
- Об'єднує налаштування з усіх конфігураційних файлів

**Основні конфігураційні файли:**
- `config/system-config.js` - Системні налаштування
- `config/agents-config.js` - Конфігурація агентів (Atlas, Tetyana, Grisha)
- `config/workflow-config.js` - Налаштування workflow та станів
- `config/api-config.js` - API endpoints та мережеві налаштування
- `config/models-config.js` - Конфігурація AI моделей
- `config/security-config.js` - Налаштування безпеки та валідації
- `config/atlas-config.js` - Головний експортний файл

**`config/agents-config.js`** - Конфігурація агентів
- Atlas (Coordinator)
- Tetyana (Executor)
- Grisha (Verifier)

**`config/workflow-config.js`** - Workflow параметри
- Stages definitions
- Transitions
- Timeouts

**`config/api-config.js`** - API endpoints
- Network configuration
- Service ports
- Health check endpoints

## 📁 Структура проекту

```
atlas4/
├── restart_system.sh          # 🎛️ Головний скрипт управління
├── README.md                  # 📖 Документація проекту
├── install.sh                 # 📦 Скрипт установки
├── web/                       # 🌐 Flask веб-інтерфейс
│   └── static/js/             # 📦 Модульний JavaScript
│       ├── core/              # 🔧 Основні модулі (logger, config, api-client)
│       ├── modules/           # 📱 Функціональні модулі (chat, tts)
│       ├── app-refactored.js  # 🚀 Головний додаток
│       └── _unused/           # 🗃️ Застарілі файли
├── orchestrator/              # 🎭 Node.js управління агентами (модульна архітектура)
│   ├── agents/                # 🤖 Клієнти агентів
│   ├── ai/                    # 🧠 AI модулі
│   ├── utils/                 # 🛠️ Утиліти
│   └── workflow/              # 🔄 Workflow логіка
├── config/                    # ⚙️ Централізована система конфігурації
│   ├── global-config.js       # 🔧 Головний конфіг (єдине джерело)
│   ├── agents-config.js       # 🤖 Конфігурація агентів
│   ├── workflow-config.js     # 🔄 Конфігурація workflow
│   └── api-config.js          # 🌐 API endpoints
├── prompts/                   # 🧠 Промпти агентів
├── ukrainian-tts/             # 🔊 TTS система
├── docs/                      # 📚 Документація системи
├── scripts/                   # 🛠️ Допоміжні скрипти
├── logs/                      # 📝 Логування системи
└── unused_files/              # 🗃️ Архів старих файлів
```

### Детальний опис директорій

**`orchestrator/`** - Node.js Orchestrator (Express + DI Container)
```
orchestrator/
├── server.js                    # Точка входу
├── core/
│   ├── application.js          # Lifecycle manager
│   ├── di-container.js         # Dependency Injection
│   └── service-registry.js     # Реєстрація сервісів
├── ai/
│   ├── mcp-manager.js          # MCP серверів manager
│   ├── llm-client.js           # LLM API client
│   ├── llm-tool-selector.js    # LLM Tool Validator
│   └── tool-history-manager.js # Tool history tracking
├── workflow/
│   ├── mcp-todo-manager.js     # Dynamic TODO workflow
│   └── processors/             # 9 stage processors
├── api/routes/
│   ├── chat.routes.js          # Chat endpoints
│   └── web-integration.js      # Web integration
├── services/
│   ├── vision-analysis-service.js  # Vision models
│   └── tts-sync-manager.js    # TTS synchronization
└── utils/                      # Logger, telemetry, etc.
```

**`prompts/`** - Промпти агентів (17 файлів)
```
prompts/mcp/
├── stage0_mode_selection.js           # Chat vs Task
├── atlas_todo_planning_optimized.js   # TODO planning
├── atlas_replan_todo.js               # Replanning (Stage 3.6)
├── tetyana_plan_tools_*.js            # Tool planning (6 variants)
├── grisha_verify_item_optimized.js    # Verification
├── grisha_visual_verify_item.js       # Visual verification
└── mcp_final_summary.js               # Final summary
```

**`config/`** - Централізована конфігурація
- `atlas-config.js` - Головний конфігураційний агрегатор (експортує всі налаштування)
- `system-config.js` - Системні налаштування та змінні середовища
- `agents-config.js` - 3 агенти з ролями та голосами
- `workflow-config.js` - MCP stages з transitions (0, 1-MCP, 2.0-2.3-MCP, 3-MCP, 3.5-MCP, 8-MCP)
- `api-config.js` - API endpoints та мережеві налаштування
- `models-config.js` - Конфігурація AI моделей та vision
- `security-config.js` - Налаштування безпеки та валідації

**`web/`** - Flask Frontend
- `atlas_server.py` - Мінімальний Flask сервер
- `static/` - 3D GLB модель, CSS, JavaScript
- `templates/index.html` - Головна сторінка

**`ukrainian-tts/`** - TTS система
- `tts_server.py` - Flask TTS API
- `vocoder/` - Ukrainian-TTS моделі
- `fx_presets/` - FX налаштування для агентів

**`services/whisper/`** - Whisper STT
- `whispercpp_service.py` - Whisper.cpp wrapper
- Metal GPU optimization

---

## 🌐 API та Інтеграція

### Orchestrator API

**Base URL:** `http://localhost:5101`

**Ключові endpoints:**
- `POST /chat/stream` - Обробка повідомлень (SSE)
- `POST /session/pause` - Призупинити сесію
- `POST /session/resume` - Відновити сесію
- `GET /health` - Health check
- `POST /tts/optimize` - Оптимізація TTS

**WebSocket:** `ws://localhost:5101`
- Events: `chat_update`, `agent_message`, `tts_start`, `workflow_stage`

📄 **Повна документація:** [`docs/API_REFERENCE.md`](docs/API_REFERENCE.md)

### TTS Service API

**Base URL:** `http://localhost:3001`
- `POST /synthesize` - Синтез мовлення (dmytro/tetiana/mykyta/lada)
- `GET /health` - Health check

### Whisper Service API

**Base URL:** `http://localhost:3002`
- `POST /transcribe` - Транскрибування аудіо
- `POST /transcribe_blob` - Транскрибування blob
- `GET /health` - Health check

---

## 🛠️ MCP Tools

### 6 Active MCP Servers (92+ tools)

1. **Filesystem** (14 tools) - read_file, write_file, list_directory, search_files...
2. **Playwright** (32 tools) - navigate, click, screenshot, evaluate...
3. **Shell** (9 tools) - execute, execute_async, get_status, list_processes...
4. **AppleScript** (1 tool) - execute (macOS automation)
5. **Memory** (9 tools) - create_entity, add_observation, search...
6. **Git** (27 tools) - DISABLED (нестабільний)

### Tool Selection Flow
```
User Request
  ↓
Stage 2.0: Server Selection (filter relevant servers)
  ↓
Stage 2.1: Tetyana Plan Tools (select specific tools)
  ↓
Stage 2.2: Tetyana Execute Tools (MCP protocol)
  ↓
Stage 2.3: Grisha Verify (check results)
```

📄 **Повна документація:** [`docs/MCP_TOOLS_COMPLETE.md`](docs/MCP_TOOLS_COMPLETE.md)

---

## 🧠 Промпти та AI Моделі

### Система промптів (17 промптів)

**Atlas (Coordinator):**
- `atlas_todo_planning_optimized.js` - Створення динамічних TODO планів
- `atlas_replan_todo.js` - Глибокий аналіз та переплан (Stage 3.6)

**Tetyana (Executor):**
- `tetyana_plan_tools_*.js` - Планування tool_calls (6 варіантів)
- `tetyana_screenshot_and_adjust.js` - Screenshots та adjustments

**Grisha (Verifier):**
- `grisha_verify_item_optimized.js` - Верифікація виконання
- `grisha_visual_verify_item.js` - Візуальна верифікація

### AI Models Configuration

| Stage              | Model               | Temperature | Purpose                |
| ------------------ | ------------------- | ----------- | ---------------------- |
| 0 (Mode Selection) | atlas-ministral-3b  | 0.05        | Fast classification    |
| 1 (TODO Planning)  | copilot-gpt-4o      | 0.3         | Creative planning      |
| 2.1 (Plan Tools)   | copilot-gpt-4o      | 0.1         | Precise tool selection |
| 2.3 (Verify)       | copilot-gpt-4o-mini | 0.15        | Fast verification      |
| 3 (Adjust)         | copilot-gpt-4o-mini | 0.2         | Quick adjustments      |
| 8 (Summary)        | atlas-ministral-3b  | 0.5         | Creative summary       |

**Vision Models:**
- Primary: `atlas-gpt-4o` (GPT-4o with vision, ~2s)
- Secondary: Atlas vision models (phi-3.5-vision, llama-3.2-vision)

**Доступні моделі:** 50+ (GPT-4o, Mistral, DeepSeek, Claude, Cohere, Ollama)

---

## 📚 Документація

### Основна документація
- **README.md** (цей файл) - Повний огляд системи

### Детальна документація

**Архітектура та Workflow:**
- [`docs/MCP_DYNAMIC_TODO_WORKFLOW_SYSTEM.md`](docs/MCP_DYNAMIC_TODO_WORKFLOW_SYSTEM.md) - Детальний опис MCP workflow
- [`docs/MCP_SERVERS_REFERENCE.md`](docs/MCP_SERVERS_REFERENCE.md) - Референс MCP серверів
- [`docs/README.md`](docs/README.md) - Індекс документації

**API та Tools:**
- [`docs/API_REFERENCE.md`](docs/API_REFERENCE.md) - Повний API reference
- [`docs/MCP_TOOLS_COMPLETE.md`](docs/MCP_TOOLS_COMPLETE.md) - Всі MCP tools з прикладами

**Архівна документація:**
- `archive/docs-old/` - 260+ MD файлів з історії розробки
- Fixes, refactorings, testing reports

## 📊 Моніторинг та діагностика

### Статус системи

```bash
./restart_system.sh status    # Статус всіх сервісів
./restart_system.sh diagnose  # Повна діагностика
./restart_system.sh logs      # Перегляд логів
```

### Логування

Система веде детальні логи всіх компонентів:

- `logs/orchestrator.log` - Логи оркестратора та workflow
- `logs/frontend.log` - Логи веб-інтерфейсу
- `logs/tts.log` - Логи TTS системи
- `logs/whisper.log` - Логи Whisper сервісу

### Команди діагностики

```bash
# Повна діагностика
./restart_system.sh diagnose

# Очищення логів
./restart_system.sh clean
```

## 🔧 Підтримка та налагодження

### Відомі проблеми та рішення:

1. **LLM API timeout** - збільшено до 120 секунд
2. **Token limit exceeded** - автоматичне обрізання до 2000 символів
3. **Port conflicts** - автоматичне звільнення зайнятих портів
4. **MCP server crashes** - автоматичний restart через DI container

### Для вирішення проблем:

1. Перевірте статус системи: `./restart_system.sh status`
2. Запустіть діагностику: `./restart_system.sh diagnose` 
3. Перегляньте логи: `./restart_system.sh logs`
4. Перезапустіть систему: `./restart_system.sh restart`

## 🧪 Тестування та валідація

### Перевірка промптів і workflow:
```bash
# Швидка валідація всієї системи промптів
./scripts/validate-prompts.sh

# Детальна перевірка структури
node scripts/audit-prompts.js

# Аналіз якості промптів
node scripts/analyze-prompts-quality.js

# Комплексні тести (21 тест)
bash tests/test-all-prompts.sh
```

### Функціональні тести:
```bash
# Тест контексту та пам'яті
./tests/test-context.sh

# Тест mode selection (chat vs task)
./tests/test-mode-selection.sh

# Тест безпеки та валідації
./tests/test-security-features.sh

# Перевірка всіх виправлень
./verify-fixes.sh
```

### Статус системи:
- ✅ **21/21 тестів** проходять
- ✅ **92% якості** промптів
- ✅ **6 MCP стейджів** повністю покриті
- ✅ **100%** покриття валідації безпеки
- 📄 Детальний звіт: `docs/PROMPTS_WORKFLOW_AUDIT_REPORT.md`

## 🔒 Security Configuration (NEW v5.0.1)

### LLM Tool Validator
- **MCP_LLM_MODEL**: `atlas-gpt-4o-mini` (default)
- **MCP_LLM_TEMPERATURE**: `0.1` (low for consistency)
- **VALIDATION**: Always enabled for safety
- **RISK THRESHOLDS**:
  - Critical/High: Auto-blocked
  - Medium: Warning only
  - Low: Allowed with logging

### Security Features
- **Tool History**: Last 100 calls tracked
- **Repetition Detection**: Blocks after 3 consecutive identical calls
- **Rate Limiting**: 10 max calls per tool
- **Validation Fallback**: Safe mode on validation failure

### Environment Variables
```bash
# Enable/disable LLM validation
SECURITY_LLM_VALIDATOR_ENABLED=true

# Auto-block critical/high risk operations
SECURITY_AUTO_BLOCK_CRITICAL=true
SECURITY_AUTO_BLOCK_HIGH=true

# Tool history settings
SECURITY_TOOL_HISTORY_ENABLED=true
SECURITY_HISTORY_MAX_SIZE=100

# Repetition protection
SECURITY_REPETITION_CHECK_ENABLED=true
SECURITY_MAX_CONSECUTIVE_REPETITIONS=3
```

## 📚 Документація

### Основна документація
- **README.md** (цей файл) - загальна інформація та швидкий старт

### Детальна документація (в docs/)

**Безпека та Валідація:**
- `docs/LLM_VALIDATOR_CONFIG.md` - конфігурація LLM Tool Validator
- `docs/SECURITY_IMPLEMENTATION.md` - архітектура системи безпеки

**Архітектура:**
- `docs/ATLAS_SYSTEM_ARCHITECTURE.md` - детальна архітектура системи
- `docs/MCP_WORKFLOW_SPEC.md` - специфікація MCP workflow
- `docs/TECHNICAL_SPECIFICATION.md` - технічна специфікація

**Розробка та Тестування:**
- `docs/TESTING_INSTRUCTIONS.md` - інструкції для тестування
- `docs/CONTRIBUTING.md` - як внести внесок у проект
- `docs/API_REFERENCE.md` - повний опис API

## License

This project is licensed under MIT License - see LICENSE file for details.

---

*ATLAS v5.0 - Adaptive Task and Learning Assistant System with Ukrainian TTS*
