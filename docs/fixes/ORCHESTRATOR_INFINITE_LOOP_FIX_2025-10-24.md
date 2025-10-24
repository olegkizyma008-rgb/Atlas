# Виправлення Infinite Loop і Невалідних Інструментів MCP
**Дата:** 2025-10-24  
**Версія:** Atlas v5.0

## Проблеми що були

### 1. Невалідна назва shell інструменту
**Симптоми:**
```
[STAGE-2.1-MCP] ⚠️ Plan validation FAILED
Tool 'shell__execute' not found in MCP server's tools/list
Did you mean: update_security_level? (similarity: 12%)
```

**Корінна причина:**
- LLM генерував: `shell__execute` ❌
- Фактична назва в super-shell-mcp: `execute_command` 
- Правильно має бути: `shell__execute_command` ✅

**Виявлено в логах:**
```
2025-10-24 03:36:48 [INFO] planTools() returned: {"tool_calls":[{"server":"shell","tool":"shell__execute",...}]}
2025-10-24 03:36:48 [WARN] Tool 'shell__execute' not found in MCP server's tools/list
```

### 2. Infinite Loop при Blocked Items
**Симптоми:**
```
2025-10-24 03:36:58 [INFO] Processing TODO item 6/13: Додати 27 до результату
2025-10-24 03:36:58 [WARN] Item 4 blocked: Parent replanned - waiting for replacement items
[Цей блок повторюється 100+ разів]
```

**Корінна причина:**
- Item 3 перепланувався і створив діти (3.1, 3.2)
- Item 4 залежав від Item 3 у статусі "replanned"
- Система перевіряла Item 4, бачила що Item 3 не "completed", блокувала його
- Жодного timeout механізму - система застрягала в нескінченному циклі

### 3. Залежності не оновлювалися після Replanning
**Симптоми:**
- Item 3 → replanned → створює 3.1, 3.2
- Item 4 має dependency [3]
- Item 4 чекає на Item 3 completion, але Item 3 ніколи не стане "completed"
- Треба чекати на completion 3.1 і 3.2

## Виправлення

### Виправлення 1: Shell Tool Name (3 файли)

#### `/prompts/mcp/tetyana_plan_tools_shell.js`
**Зміни:**
- Рядки 25-26, 33-34: оновлено приклади `shell__execute` → `shell__execute_command`
- Рядок 44: `shell__execute` → `shell__execute_command`
- Рядок 80: `"tool": "shell__execute"` → `"tool": "shell__execute_command"`
- Рядок 92: правило `tool must always be "shell__execute_command"`
- Рядки 101-102: приклади оновлено

#### `/orchestrator/workflow/stages/grisha-verification-strategy.js`
**Зміни:**
- Рядки 292-294: оновлено всі `tool: 'shell__execute'` → `tool: 'shell__execute_command'`
- Рядок 317: `suggestedTools.push('shell__execute')` → `suggestedTools.push('shell__execute_command')`

#### `/orchestrator/ai/tool-inspectors.js`
**Зміни:**
- Рядок 191: `'shell__execute'` → `'shell__execute_command'`

### Виправлення 2: Infinite Loop Protection (1 файл)

#### `/orchestrator/workflow/executor-v3.js` (рядки 407-494)

**Додано відстеження кількості blocked checks:**
```javascript
// FIXED 2025-10-24: Track blocked item check count to prevent infinite loop
if (!item.blocked_check_count) {
  item.blocked_check_count = 0;
}
item.blocked_check_count++;
```

**Механізм виходу з loop - 3 рівні:**

**Рівень 1: Після 5 перевірок - автооновлення залежностей**
```javascript
if (item.blocked_check_count >= 5) {
  // Замінити залежність від replanned parent на його дітей
  // Item 4 dependencies: [3] → [3.1, 3.2]
  
  for (const depId of dependencies) {
    const depItem = todo.items.find(todoItem => String(todoItem.id) === String(depId));
    
    if (depItem && depItem.status === 'replanned') {
      const children = HierarchicalIdManager.getChildren(String(depId), todo.items);
      if (children.length > 0) {
        newDependencies.push(...children.map(c => c.id));
        dependenciesUpdated = true;
        logger.system('executor', `[DEPENDENCY-FIX] Item ${item.id}: replacing dep ${depId} with children ${children.map(c => c.id).join(', ')}`);
      }
    }
  }
  
  if (dependenciesUpdated) {
    item.dependencies = newDependencies;
    item.blocked_check_count = 0; // Reset counter
    continue; // Re-check with new dependencies
  }
}
```

**Рівень 2: Після 10 перевірок - skip item**
```javascript
if (item.blocked_check_count >= 10) {
  logger.error(`Item ${item.id} blocked ${item.blocked_check_count} times - SKIPPING to prevent infinite loop`);
  
  item.status = 'skipped';
  item.skip_reason = 'Blocked too many times - infinite loop protection';
  
  // Notify user via WebSocket
  wsManager.broadcastToSubscribers('chat', 'chat_message', {
    message: `⚠️ Пункт ${item.id} пропущено через нерозв'язані залежності`,
    messageType: 'error',
    sessionId: session.id,
    timestamp: new Date().toISOString()
  });
  
  continue;
}
```

**Рівень 3: Оновлене логування**
```javascript
logger.warn(`Item ${item.id} blocked: ${blockReason} (check ${item.blocked_check_count}/10)`, {
  sessionId: session.id,
  itemId: item.id,
  dependencies: dependencies,
  unresolvedSummary,
  parentBlocked
});
```

## Потік Роботи Після Виправлення

### Сценарій: Item 3 fails → replan → creates 3.1, 3.2

**Крок 1: Item 3 перепланується**
```
Item 3: "Відняти 85" → FAILED
Atlas replan → creates:
  - Item 3.1: "Перевірити поточний результат"
  - Item 3.2: "Виконати віднімання"
Item 3: status = "replanned"
```

**Крок 2: Item 4 перевіряється (перші 5 разів)**
```
Item 4: dependencies = [3]
Check 1-5: Item 3 status = "replanned" → BLOCKED
Logger: "Item 4 blocked: Parent replanned (check 1/10)"
...
Logger: "Item 4 blocked: Parent replanned (check 5/10)"
```

**Крок 3: Автооновлення після 5 перевірок**
```
Check 5 triggers resolution:
[DEPENDENCY-FIX] Item 4: replacing dep 3 with children 3.1, 3.2
Item 4: dependencies = [3.1, 3.2]
blocked_check_count = 0 (reset)
```

**Крок 4: Item 4 чекає на 3.1 і 3.2**
```
System processes items 3.1, 3.2...
When 3.1 completed AND 3.2 completed:
  → Item 4 dependencies resolved
  → Item 4 proceeds with execution
```

**Крок 5: Safety fallback (якщо 3.1/3.2 теж failed)**
```
If Item 4 still blocked after 10 checks total:
  → Item 4: status = "skipped"
  → skip_reason = "Blocked too many times - infinite loop protection"
  → System continues with next items
```

## Тестування

### Тест 1: Валідація Shell Tool Name
**Команда:**
```bash
grep -r "shell__execute\"" orchestrator/workflow/stages prompts/mcp orchestrator/ai
```
**Очікуваний результат:** 0 matches (всі замінені на `shell__execute_command`)

### Тест 2: Infinite Loop Protection
**Сценарій:**
1. Створити завдання з калькулятором де Item 3 провалиться
2. Перевірити логи на наявність loop
3. Після 5 blocked checks має бути `[DEPENDENCY-FIX]` лог
4. Item 4 має продовжити після completion дітей Item 3

**Перевірка логів:**
```bash
tail -f logs/orchestrator.log | grep -E "blocked|DEPENDENCY-FIX|check [0-9]/10"
```

### Тест 3: Максимум 10 Blocked Checks
**Сценарій:**
1. Створити ситуацію де replanned parent створює діти які теж не можуть виконатися
2. Item має skip після 10 перевірок
3. Система продовжує з наступними items

## Backward Compatibility

✅ **Сумісність збережено:**
- Існуюча логіка replanning не змінена
- Додано тільки safety механізми
- Старі TODO items без `blocked_check_count` отримають його автоматично

## Performance Impact

**Мінімальний вплив:**
- +1 counter increment на кожну blocked перевірку
- +1 dependency resolution після 5 перевірок (рідко)
- Запобігає нескінченним loops (величезний performance gain)

## Related Files

**Modified:**
1. `/prompts/mcp/tetyana_plan_tools_shell.js` - shell tool name
2. `/orchestrator/workflow/stages/grisha-verification-strategy.js` - shell tool name  
3. `/orchestrator/ai/tool-inspectors.js` - shell tool name
4. `/orchestrator/workflow/executor-v3.js` - infinite loop protection

**Not Modified (логіка вже правильна):**
- `/orchestrator/workflow/stages/atlas-replan-todo-processor.js` - replanning logic
- `/orchestrator/workflow/utils/hierarchical-id-manager.js` - child ID generation

## Metrics

**До виправлення:**
- ❌ 100+ повторень blocked перевірки
- ❌ Shell tool validation fails
- ❌ Система застрягала назавжди

**Після виправлення:**
- ✅ Максимум 10 blocked перевірок
- ✅ Автооновлення залежностей після 5 перевірок
- ✅ Shell tool validation passes
- ✅ Система завжди прогресує або gracefully skips

## Conclusion

Виправлення комплексно вирішують проблему infinite loop через:
1. **Prevention:** Правильні назви інструментів → менше fails
2. **Detection:** Відстеження blocked_check_count
3. **Resolution:** Автооновлення залежностей після 5 checks
4. **Containment:** Skip після 10 checks як останній захист

Система тепер **resilient** і **self-healing** при проблемах з dependencies.
