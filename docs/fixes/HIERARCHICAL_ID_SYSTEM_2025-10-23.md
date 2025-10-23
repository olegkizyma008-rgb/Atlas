# Hierarchical ID System for TODO Replanning - 2025-10-23

## 🎯 Концепція

Замість лінійних ID (1, 2, 11, 12, 13), система використовує **ієрархічні ID** для відображення структури replanning:

```
1 → виконано ✅
2 → failed → replan створює 2.1, 2.2, 2.3
  ↳ 2.1 → виконано ✅
  ↳ 2.2 → failed → replan створює 2.2.1, 2.2.2
      ↳ 2.2.1 → виконано ✅
      ↳ 2.2.2 → виконано ✅
  ↳ 2.3 → виконано ✅
3 → виконано ✅ (залежав від 2 → розблокувався після 2.1, 2.2, 2.3)
```

---

## ✅ Переваги

### 1. **Візуальна Структура**
- **Батько-дочірні відношення:** 2.1 - дитина пункту 2
- **Глибина:** Кількість крапок = рівень вкладеності
- **Порядок:** 2.1, 2.2, 2.3 - порядок створення

### 2. **Чіткий Контекст**
```
Item 2.2.1 - відразу зрозуміло:
  - Root task: #2
  - Parent task: #2.2 (другий replan пункту 2)
  - Child task: #2.2.1 (перший replan пункту 2.2)
```

### 3. **Dependency Tracking**
- Item #3 залежить від #2 → автоматично блокується до завершення 2.1, 2.2, 2.3
- Item #4 залежить від #2.2 → автоматично блокується до завершення 2.2.1, 2.2.2

### 4. **Діагностика**
```
[REPLAN] Item 2 failed → creating children:
[REPLAN]   ↳ 2.1 Alternative approach
[REPLAN]   ↳ 2.2 Different tool selection
[REPLAN]   ↳ 2.3 Fallback method

[REPLAN] Item 2.2 failed → creating children:
[REPLAN]     ↳ 2.2.1 Retry with delay
[REPLAN]     ↳ 2.2.2 Use alternative API
```

---

## 🔧 Імплементація

### 1. HierarchicalIdManager Utility
**Файл:** `/orchestrator/workflow/utils/hierarchical-id-manager.js`

**Основні методи:**

```javascript
// Парсинг ID
HierarchicalIdManager.parseId("2.2.1")
// => { full: "2.2.1", parts: [2,2,1], depth: 3, parent: "2.2", root: "2" }

// Генерація дочірнього ID
HierarchicalIdManager.generateChildId("2", existingItems)
// => "2.1" (або "2.2" якщо 2.1 вже існує)

// Пошук дітей
HierarchicalIdManager.getChildren("2", items)
// => [item_2.1, item_2.2, item_2.3] (NOT 2.2.1!)

// Пошук всіх нащадків
HierarchicalIdManager.getDescendants("2", items)
// => [item_2.1, item_2.2, item_2.2.1, item_2.2.2, item_2.3]

// Форматування для display
HierarchicalIdManager.formatForDisplay("2.2.1", true)
// => "    ↳ 2.2.1"
```

### 2. Executor Integration
**Файл:** `/orchestrator/workflow/executor-v3.js`

**Зміни:**

```javascript
// BEFORE (лінійні ID)
let nextId = Math.max(...todo.items.map(it => it.id)) + 1;
replanResult.new_items.forEach(newItem => {
  newItem.id = nextId++; // 11, 12, 13
});

// AFTER (ієрархічні ID)
const parentId = String(item.id); // "2"
replanResult.new_items.forEach((newItem, idx) => {
  const childId = HierarchicalIdManager.generateChildId(
    parentId, 
    todo.items.concat(replanResult.new_items.slice(0, idx))
  );
  newItem.id = childId; // "2.1", "2.2", "2.3"
  newItem.parent_id = parentId; // Track parent
});
```

### 3. Enhanced Dependency Checking
**Файл:** `/orchestrator/workflow/executor-v3.js:404-443`

**Логіка:**

```javascript
// Перевірка явних dependencies
const unresolvedDependencies = dependencies
  .filter(depItem => depItem.status !== 'completed');

// НОВИНКА: Перевірка replanned parents
const parentBlocked = dependencies.some(depId => {
  const depItem = todo.items.find(item => item.id === depId);
  
  // Якщо dependency replanned, перевірити чи всі його діти завершені
  if (depItem.status === 'replanned') {
    const children = HierarchicalIdManager.getChildren(depId, todo.items);
    const incompleteChildren = children.filter(c => c.status !== 'completed');
    return incompleteChildren.length > 0; // Блокувати якщо діти incomplete
  }
});

// Блокувати якщо є unresolved dependencies АБО parent blocked
if (unresolvedDependencies.length > 0 || parentBlocked) {
  item.status = 'blocked';
  item.block_reason = parentBlocked 
    ? 'Parent replanned - waiting for replacement items'
    : 'Dependencies not completed';
}
```

---

## 📊 Приклад Виконання

### Початковий TODO
```
1. Відкрити калькулятор
2. Помножити 7 на 139 (залежить від: 1)
3. Відняти 85 (залежить від: 2)
4. Додати 27 (залежить від: 3)
5. Зберегти результат (залежить від: 4)
```

### Сценарій: Item #2 fails

**1. Item #2 виконується → fails verification**
```
[EXEC] Item 2 attempt 1/3: "Помножити 7 на 139"
[GRISHA] ❌ NOT VERIFIED: Calculator shows wrong result
```

**2. Atlas replan створює дочірні items**
```
[REPLAN] Generating child IDs for parent 2
[REPLAN]   Generated child ID: 2.1
[REPLAN]   Generated child ID: 2.2
[REPLAN]   Generated child ID: 2.3

[REPLAN] Inserted 3 new items after position 1:
[REPLAN]   ↳ 2.1 Clear calculator display
[REPLAN]   ↳ 2.2 Enter 7 * 139 with verification
[REPLAN]   ↳ 2.3 Confirm result is 973
```

**3. Item #2 позначається як 'replanned'**
```
[SKIP] Item 2 was replanned, new items will be processed
```

**4. Items #3, #4, #5 блокуються**
```
[EXEC] Item 3 blocked: Parent replanned - waiting for replacement items
  Dependencies: #2 (replanned)
  Children: 2.1 (pending), 2.2 (pending), 2.3 (pending)
```

**5. Виконуються діти пункту #2**
```
[EXEC] Item 2.1: "Clear calculator display"
  ✅ Completed

[EXEC] Item 2.2: "Enter 7 * 139 with verification"
  ❌ Failed verification again!
  
[REPLAN] Item 2.2 failed → creating children:
[REPLAN]   Generated child ID: 2.2.1
[REPLAN]   Generated child ID: 2.2.2
[REPLAN]     ↳ 2.2.1 Use different input method
[REPLAN]     ↳ 2.2.2 Verify with screenshot

[SKIP] Item 2.2 was replanned

[EXEC] Item 2.2.1: "Use different input method"
  ✅ Completed

[EXEC] Item 2.2.2: "Verify with screenshot"
  ✅ Completed

[EXEC] Item 2.3: "Confirm result is 973"
  ✅ Completed
```

**6. Після завершення всіх дітей #2, item #3 розблокується**
```
[EXEC] Item 3: "Відняти 85"
  Dependencies: #2 (replanned)
  Children status: 2.1 (completed), 2.2 (replanned), 2.2.1 (completed), 2.2.2 (completed), 2.3 (completed)
  ✅ All children complete → UNBLOCKED
```

---

## 🎯 Фінальна Структура

```
TODO List after replanning:
1. Відкрити калькулятор ✅
2. Помножити 7 на 139 (replanned)
  ↳ 2.1. Clear calculator display ✅
  ↳ 2.2. Enter 7 * 139 with verification (replanned)
      ↳ 2.2.1. Use different input method ✅
      ↳ 2.2.2. Verify with screenshot ✅
  ↳ 2.3. Confirm result is 973 ✅
3. Відняти 85 ✅ (розблоковано після 2.1, 2.2, 2.3)
4. Додати 27 ✅
5. Зберегти результат ✅
```

**Візуальна глибина = кількість крапок:**
- `1` - root level (оригінальний TODO)
- `2.1` - 1 рівень replanning
- `2.2.1` - 2 рівні replanning

---

## 📝 Переваги vs Старої Системи

| Аспект | Стара Система | Нова Система |
|--------|---------------|--------------|
| **ID після replan** | 1, 2, 11, 12, 13 | 1, 2, 2.1, 2.2, 2.3 |
| **Зв'язок з parent** | ❌ Не видно | ✅ Очевидний (2.1 → дитина 2) |
| **Глибина replanning** | ❌ Не відстежується | ✅ По кількості крапок |
| **Dependency tracking** | ⚠️ Складний | ✅ Автоматичний |
| **Логи** | ❌ Заплутані | ✅ Структуровані |
| **Debugging** | ❌ Важко знайти проблему | ✅ Видно де застряг replan |

---

## 🔍 Майбутні Покращення

### 1. UI Visualization
```javascript
// В frontend можна відобразити дерево:
TODO Tree View:
├── 1 ✅ Відкрити калькулятор
├── 2 🔄 Помножити 7 на 139
│   ├── 2.1 ✅ Clear calculator
│   ├── 2.2 🔄 Enter 7 * 139
│   │   ├── 2.2.1 ✅ Different input
│   │   └── 2.2.2 ✅ Screenshot verify
│   └── 2.3 ✅ Confirm result
├── 3 ✅ Відняти 85
└── 4 ✅ Додати 27
```

### 2. Smart Dependency Resolution
```javascript
// Автоматично додавати dependencies на дочірні items:
item_3.dependencies = ["2"] 
// → автоматично розширюється до ["2.1", "2.2", "2.3"]
```

### 3. Replan Analytics
```javascript
// Статистика по глибині replanning:
{
  "total_replans": 2,
  "max_depth": 2,  // 2.2.1 = 2 рівні
  "most_problematic": "2.2",  // найбільше replan attempts
  "success_rate_by_depth": {
    "1": "80%",  // root items
    "2": "60%",  // first replan
    "3": "90%"   // second replan (більш специфічні)
  }
}
```

---

## 🚀 Використання

### Приклад 1: Простий Replan
```javascript
// Item 2 fails
const parentId = "2";
const newItems = [
  { action: "Alternative approach" },
  { action: "Different method" }
];

// Generate IDs
newItems.forEach((item, idx) => {
  item.id = HierarchicalIdManager.generateChildId(parentId, todo.items);
  // Результат: "2.1", "2.2"
});
```

### Приклад 2: Nested Replan
```javascript
// Item 2.2 fails (вже дочірній)
const parentId = "2.2";
const newItems = [
  { action: "Retry with timeout" },
  { action: "Use fallback API" }
];

// Generate IDs
newItems.forEach((item, idx) => {
  item.id = HierarchicalIdManager.generateChildId(parentId, todo.items);
  // Результат: "2.2.1", "2.2.2"
});
```

### Приклад 3: Dependency Check
```javascript
// Item 3 залежить від item 2
const item3 = { id: "3", dependencies: ["2"] };
const item2 = { id: "2", status: "replanned" };

// Check if blocked
const children = HierarchicalIdManager.getChildren("2", items);
const allComplete = children.every(c => c.status === "completed");

if (!allComplete) {
  item3.status = "blocked";
  item3.block_reason = "Parent replanned - waiting for 2.1, 2.2, 2.3";
}
```

---

## 📋 Checklist для Testing

- [ ] Simple replan (2 → 2.1, 2.2, 2.3)
- [ ] Nested replan (2.2 → 2.2.1, 2.2.2)
- [ ] Triple nested (2.2.1 → 2.2.1.1) - edge case
- [ ] Dependency blocking when parent replanned
- [ ] Dependency unblocking after children complete
- [ ] ID uniqueness across multiple replans
- [ ] Logging shows hierarchical structure
- [ ] Frontend displays IDs correctly

---

## ⚠️ Known Limitations

1. **String vs Number ID:**
   - Всі ID тепер strings ("2.1" замість 2)
   - Потрібна конвертація в порівняннях: `String(item.id) === String(depId)`

2. **Backward Compatibility:**
   - Старі TODO з числовими ID все ще працюють
   - Але після першого replan переходять на ієрархічні

3. **Max Depth:**
   - Технічно необмежена глибина (2.2.2.2.2...)
   - Але >3 рівнів свідчить про системні проблеми

---

## 🎓 Summary

Ієрархічна система ID вирішує ключові проблеми:
- ✅ **Прозорість:** Видно структуру replanning з першого погляду
- ✅ **Автоматика:** Dependency tracking працює без ручної конфігурації
- ✅ **Діагностика:** Легко знайти де система застряла
- ✅ **Масштабованість:** Підтримує необмежену кількість вкладених replan

**Результат:** Step-by-step виконання з чіткою візуалізацією структури виправлень! 🚀
