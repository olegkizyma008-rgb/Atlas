# ATLAS Prompts System v5.0

**Дата оновлення:** 2025-10-20  
**Архітектура:** Pure MCP Workflow  
**Статус:** Production Ready

---

## 🎯 Нова структура (після рефакторингу)

```
prompts/
├── mcp/           ✅ Єдина активна система промптів (17 файлів)
│   ├── index.js   ✅ MCP prompts export
│   └── README.md  ✅ Детальна документація
├── README.md      ✅ Цей файл
└── package.json   ✅ ESM package config

archive/
├── legacy-prompts-2025-10-20/      📦 Legacy система (архів)
│   ├── prompt-registry.js          ❌ Не використовується (438 LOC)
│   ├── index.js                    ❌ CommonJS legacy (61 LOC)
│   └── prompt-loader.js            ❌ Legacy завантажувач (274 LOC)
└── mcp-prompts-backup-2025-10-20/  📦 Старі версії MCP промптів
    └── backup/
```

---

## 📋 MCP Workflow Промпти

### Активні промпти (`prompts/mcp/`)

#### Stage 0-MCP: Mode Selection & Chat
- `stage0_mode_selection.js` - Визначення режиму (chat vs task)
- `atlas_chat.js` - Режим розмови Atlas

#### Stage 1-MCP: TODO Planning
- `atlas_todo_planning_optimized.js` - Планування TODO списку

#### Stage 2.0-MCP: Server Selection
- `stage2_0_server_selection.js` - Вибір MCP серверів (playwright, filesystem, shell, applescript, memory)

#### Stage 2.1-MCP: Tool Planning (Specialized)
- `tetyana_plan_tools_playwright.js` - Playwright tools
- `tetyana_plan_tools_filesystem.js` - Filesystem tools  
- `tetyana_plan_tools_shell.js` - Shell tools
- `tetyana_plan_tools_applescript.js` - AppleScript tools
- `tetyana_plan_tools_memory.js` - Memory tools

#### Stage 2.1.5-MCP: Screenshot & Adjust
- `tetyana_screenshot_and_adjust.js` - Скріншот та корегування

#### Stage 2.3-MCP: Verification
- `grisha_verify_item_optimized.js` - Legacy MCP tools verification
- `grisha_visual_verify_item.js` - **ACTIVE** Visual AI verification

#### Stage 3-MCP: TODO Adjustment
- `atlas_adjust_todo.js` - Корегування TODO при помилках

#### Stage 3.5-MCP: Deep Replan
- `atlas_replan_todo.js` - Глибокий аналіз та перепланування

#### Stage 8-MCP: Final Summary
- `mcp_final_summary.js` - Фінальне підведення підсумків

---

## 🔧 Використання

### Імпорт промптів (ESM)

```javascript
import { MCP_PROMPTS } from '../prompts/mcp/index.js';

// Доступ до промптів
const modePrompt = MCP_PROMPTS.MODE_SELECTION;
const todoPrompt = MCP_PROMPTS.ATLAS_TODO_PLANNING;
const playwrightPrompt = MCP_PROMPTS.TETYANA_PLAN_TOOLS_PLAYWRIGHT;
```

### Структура промпту

Кожен промпт експортує:
```javascript
export default {
    systemPrompt: `...`,           // Системний промпт
    userPrompt: (data) => `...`,   // Функція генерації user prompt
    metadata: { ... }               // Метадані
};
```

---

## 🚨 Що було видалено

### Legacy система (архівовано 2025-10-20)

**Видалено з активного коду:**
- ❌ `prompts/prompt-registry.js` (438 LOC) - Складна система завантаження legacy промптів
- ❌ `prompts/index.js` (61 LOC) - CommonJS wrapper
- ❌ `orchestrator/workflow/modules/prompt-loader.js` (274 LOC) - Legacy завантажувач
- ❌ `prompts/mcp/backup/` - Старі версії MCP промптів

**Переміщено в:**
- `archive/legacy-prompts-2025-10-20/` - Legacy модулі
- `archive/mcp-prompts-backup-2025-10-20/` - Backup промптів

**Причини видалення:**
- Дублювання функціональності
- Не використовувалися в новій MCP системі
- Ускладнювали підтримку та розуміння коду
- Збільшували complexity без надання цінності

---

## ✅ Переваги нової структури

### До рефакторингу
- ❌ 2 системи промптів (legacy + MCP)
- ❌ 712 рядків складної логіки завантаження
- ❌ Невикористовувані файли
- ❌ Плутанина з джерелом правди

### Після рефакторингу
- ✅ 1 система промптів (тільки MCP)
- ✅ Прямі ESM імпорти
- ✅ Чіста структура
- ✅ Єдине джерело правди

### Метрики
| Метрика | До | Після | Покращення |
|---------|-----|-------|------------|
| Рядків legacy коду | ~1400 | 0 | -100% |
| Систем промптів | 2 | 1 | -50% |
| Complexity | Висока | Низька | ↓ |
| Maintainability | Важка | Легка | ↑ |

---

## 📚 Додаткова документація

- [`docs/REFACTORING_PLAN_2025-10-20.md`](../docs/REFACTORING_PLAN_2025-10-20.md) - Детальний план рефакторингу
- [`docs/INTEGRATION_SUMMARY.md`](../docs/INTEGRATION_SUMMARY.md) - Інтеграція Goose-алгоритму
- [`docs/TETYANA_TOOL_SYSTEM_INTEGRATION.md`](../docs/TETYANA_TOOL_SYSTEM_INTEGRATION.md) - TetyanaToolSystem
- [`prompts/mcp/README.md`](mcp/README.md) - Детальна документація MCP промптів

---

**Автор рефакторингу:** Cascade AI  
**Дата:** 2025-10-20  
**Версія:** 5.0.0
