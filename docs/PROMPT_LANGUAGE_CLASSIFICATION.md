# MCP Prompts Language Classification

**Date:** 2025-10-23  
**Version:** 1.0.0

## Проблема

Раніше всі промпти мали мітку `language: 'english_prompts_ukrainian_responses'`, але це не мало сенсу для **внутрішніх промптів**, які повертають JSON і ніколи не показуються користувачу.

## Класифікація промптів

### ✅ `english_prompts_ukrainian_responses` (User-Facing)

**Призначення:** Промпти, відповіді яких **показуються користувачу** в чаті.

**Файли:**
1. **`atlas_chat.js`** - Пряма відповідь користувачу в chat mode
2. **`atlas_todo_planning_optimized.js`** - План показується користувачу
3. **`atlas_replan_todo.js`** - Оновлений план показується користувачу
4. **`mcp_final_summary.js`** - Фінальне резюме показується користувачу
5. **`grisha_visual_verify_item.js`** - Результат верифікації показується користувачу
6. **`tetyana_screenshot_and_adjust.js`** - Коментарі показуються користувачу (LLM краще розуміє)

**Характеристики:**
- Промпт: англійська (LLM краще розуміє)
- Відповідь: українська (користувач бачить)
- `response_format`: text/structured
- `user_facing`: true

---

### 🔒 `english_only` (Internal JSON)

**Призначення:** Промпти, відповіді яких **парсяться кодом** і ніколи не показуються користувачу.

**Файли:**

#### Validation & Security
1. **`llm_tool_validator.js`** - Внутрішня валідація інструментів
   - Повертає: `{"validations": [...]}`
   - Використовується: `LLMToolValidator.validateToolCalls()`

#### Tool Planning (Tetyana)
2. **`tetyana_plan_tools_filesystem.js`** - Планування filesystem операцій
3. **`tetyana_plan_tools_playwright.js`** - Планування browser операцій
4. **`tetyana_plan_tools_applescript.js`** - Планування GUI операцій
5. **`tetyana_plan_tools_shell.js`** - Планування shell команд
6. **`tetyana_plan_tools_memory.js`** - Планування memory операцій
   - Повертають: `{"tool_calls": [...], "reasoning": "..."}`
   - Використовуються: `TetyanaToolSystem.planToolCalls()`

#### Routing & Selection
7. **`stage2_0_server_selection.js`** - Вибір MCP серверів
   - Повертає: `{"selected_servers": [...], "reasoning": "..."}`
   - Використовується: `ServerSelectionProcessor`

8. **`grisha_verification_eligibility.js`** - Визначення необхідності верифікації
   - Повертає: `{"should_verify": true/false, "hints": {...}}`
   - Використовується: `GrishaVerificationEligibilityProcessor`

9. **`visual_capture_mode_selector.js`** - Вибір режиму screenshot
   - Повертає: `{"mode": "active_window", "target_app": "..."}`
   - Використовується: `VisualCaptureService`

10. **`stage0_mode_selection.js`** - Визначення режиму (chat vs task)
   - Повертає: `{"mode": "chat"/"task", "confidence": 95}`
   - Використовується: `ModeSelectionProcessor`

**Характеристики:**
- Промпт: англійська
- Відповідь: англійська (JSON)
- `response_format`: json
- `internal_use`: true
- `user_facing`: false

---

## Потік даних

### User-Facing Prompts
```
LLM (українська відповідь)
  ↓
Executor/Processor
  ↓
WebSocket → Frontend → Користувач бачить українською
```

### Internal JSON Prompts
```
LLM (JSON англійською)
  ↓
JSON.parse()
  ↓
Код обробляє (валідація, планування, routing)
  ↓
Користувач НІКОЛИ не бачить
```

---

## Виправлення (2025-10-23)

**Проблема:** Mistral API помилка при валідації інструментів:
```
"msg": "Input should be a valid string"
"input": {"LLM_TOOL_VALIDATOR_PROMPT": "...", "version": "2.0.0", "language": "..."}
```

**Корінна причина:**
1. `llm_tool_validator.js` експортував об'єкт замість рядка
2. `llm-tool-selector.js` передавав весь об'єкт як `systemPrompt`
3. Mistral API очікував string, отримував object

**Виправлення:**
1. `llm-tool-selector.js` line 110: `MCP_PROMPTS.LLM_TOOL_VALIDATOR.LLM_TOOL_VALIDATOR_PROMPT`
2. Оновлено метадані всіх internal промптів на `english_only`

---

## Рекомендації

### При створенні нового промпту:

**Питання:** Чи користувач бачить відповідь LLM?

- ✅ **ТАК** → `english_prompts_ukrainian_responses`
  - Відповідь йде в чат
  - Може містити текст, пояснення, резюме
  
- 🔒 **НІ** → `english_only`
  - Відповідь парситься кодом
  - Завжди JSON
  - Додати: `response_format: 'json'`, `internal_use: true`, `user_facing: false`

### Перевірка:

```bash
# Знайти всі промпти з неправильною класифікацією
grep -r "english_prompts_ukrainian_responses" prompts/mcp/*.js | \
  xargs grep -l "response_format.*json"
```

---

## Файли змінені

1. `/prompts/mcp/llm_tool_validator.js`
2. `/prompts/mcp/tetyana_plan_tools_filesystem.js`
3. `/prompts/mcp/tetyana_plan_tools_playwright.js`
4. `/prompts/mcp/tetyana_plan_tools_applescript.js`
5. `/prompts/mcp/tetyana_plan_tools_shell.js`
6. `/prompts/mcp/tetyana_plan_tools_memory.js`
7. `/prompts/mcp/grisha_verification_eligibility.js`
8. `/prompts/mcp/stage2_0_server_selection.js`
9. `/prompts/mcp/visual_capture_mode_selector.js`
10. `/prompts/mcp/stage0_mode_selection.js`
11. `/prompts/mcp/atlas_chat.js` (додано language)
12. `/orchestrator/ai/llm-tool-selector.js` (line 110)
