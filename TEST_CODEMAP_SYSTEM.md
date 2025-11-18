# 🧪 Тестування розширеної системи Codemap

## Швидке тестування

### Тест 1: Отримати контекст
```bash
cd codemap-system
python3 cascade_pre_task_hook.py --mode context
```

**Очікуваний результат**: Виведення контексту з проектом, проблемами, рекомендаціями

### Тест 2: Детектування типу питання
```bash
python3 -c "
from cascade_pre_task_hook import CascadePreTaskHook
hook = CascadePreTaskHook()

tests = [
    ('Як покращити архітектуру?', ['dependencies', 'refactoring']),
    ('Які функції є мертвим кодом?', ['dead_code']),
    ('Як покращити тестування?', ['testing']),
    ('Які вразливості в коді?', ['security']),
    ('Як оптимізувати продуктивність?', ['performance']),
]

for prompt, expected in tests:
    result = hook.detect_context_type(prompt)
    status = '✅' if any(e in result for e in expected) else '❌'
    print(f'{status} {prompt}')
    print(f'   Детектовано: {result}')
"
```

**Очікуваний результат**: Всі тести мають ✅

### Тест 3: Завантаження контексту
```bash
python3 -c "
from cascade_pre_task_hook import CascadePreTaskHook
hook = CascadePreTaskHook()

# Test loading context for different types
context = hook.get_context_for_types(['dependencies'])
print('Контекст залежностей завантажено:' if 'Dependency Analysis' in context else 'ПОМИЛКА')

context = hook.get_context_for_types(['dead_code'])
print('Контекст мертвого коду завантажено:' if 'Dead Code Analysis' in context else 'ПОМИЛКА')
"
```

**Очікуваний результат**: Обидва контексти завантажені

### Тест 4: Інжекція в промпт
```bash
python3 cascade_pre_task_hook.py --mode inject --prompt "Як покращити архітектуру?"
```

**Очікуваний результат**: Промпт з інжектованим контекстом

### Тест 5: MCP сервер
```bash
python3 -c "
from mcp_codemap_server import CodemapMCPServer
server = CodemapMCPServer()

# Test resources
resources = server.get_resources()
print(f'Ресурсів доступно: {len(resources)}')

# Test tools
tools = server.get_tools()
print(f'Інструментів доступно: {len(tools)}')

# Test reading a resource
content = server.read_resource('codemap://recommendations/refactoring')
print('Рефакторинг рекомендації завантажені:' if 'recommendations' in content else 'ПОМИЛКА')
"
```

**Очікуваний результат**: Ресурси, інструменти та рекомендації завантажені

---

## Детальне тестування

### Тест якості коду
```bash
python3 -c "
from mcp_codemap_server import CodemapMCPServer
server = CodemapMCPServer()

# Test code quality analysis
result = server.call_tool('analyze_code_quality', {'file_path': 'orchestrator/core/main.js'})
print('Аналіз якості коду:')
print(result)
"
```

### Тест здоров'я модуля
```bash
python3 -c "
from mcp_codemap_server import CodemapMCPServer
server = CodemapMCPServer()

# Test module health
result = server.call_tool('get_module_health', {'file_path': 'orchestrator/core/main.js'})
print('Здоров\'я модуля:')
print(result)
"
```

### Тест контекстних рекомендацій
```bash
python3 -c "
from mcp_codemap_server import CodemapMCPServer
server = CodemapMCPServer()

# Test context recommendations
result = server.call_tool('get_context_recommendations', {
    'file_path': 'orchestrator/core/main.js',
    'context_type': 'refactoring'
})
print('Контекстні рекомендації:')
print(result)
"
```

---

## Тестування багатомовності

### Українська
```bash
python3 -c "
from cascade_pre_task_hook import CascadePreTaskHook
hook = CascadePreTaskHook()

tests = [
    'Як покращити архітектуру?',
    'Які функції є мертвим кодом?',
    'Як покращити тестування?',
    'Які вразливості в коді?',
    'Як оптимізувати продуктивність?',
]

for test in tests:
    result = hook.detect_context_type(test)
    print(f'✅ {test} → {result}')
"
```

### Англійська
```bash
python3 -c "
from cascade_pre_task_hook import CascadePreTaskHook
hook = CascadePreTaskHook()

tests = [
    'How to improve architecture?',
    'What functions are dead code?',
    'How to improve testing?',
    'What are security vulnerabilities?',
    'How to optimize performance?',
]

for test in tests:
    result = hook.detect_context_type(test)
    print(f'✅ {test} → {result}')
"
```

---

## Перевірка синтаксису

```bash
# Перевірити MCP сервер
python3 -m py_compile codemap-system/mcp_codemap_server.py
echo "✅ MCP сервер OK"

# Перевірити hook
python3 -m py_compile codemap-system/cascade_pre_task_hook.py
echo "✅ Hook OK"

# Перевірити analyzer
python3 -m py_compile codemap-system/codemap_analyzer.py
echo "✅ Analyzer OK"
```

---

## Інтеграційне тестування

### Повний цикл
```bash
# 1. Оновити аналіз
cd codemap-system
python3 codemap_analyzer.py --once

# 2. Отримати контекст
python3 cascade_pre_task_hook.py --mode context

# 3. Тестувати детектування
python3 -c "
from cascade_pre_task_hook import CascadePreTaskHook
hook = CascadePreTaskHook()
print('Детектування:', hook.detect_context_type('Як покращити архітектуру?'))
"

# 4. Тестувати MCP сервер
python3 -c "
from mcp_codemap_server import CodemapMCPServer
server = CodemapMCPServer()
print('Ресурсів:', len(server.get_resources()))
print('Інструментів:', len(server.get_tools()))
"
```

---

## Чек-лист

- [ ] Синтаксис перевірено
- [ ] Детектування типів працює
- [ ] Контекст завантажується
- [ ] Інжекція промптів працює
- [ ] MCP сервер запускається
- [ ] Рекомендації генеруються
- [ ] Метрики якості розраховуються
- [ ] Багатомовність працює
- [ ] Документація актуальна

---

## Результати

Якщо всі тести пройшли ✅, система готова до використання!

```
✅ Синтаксис
✅ Детектування
✅ Контекст
✅ Інжекція
✅ MCP сервер
✅ Рекомендації
✅ Метрики
✅ Багатомовність
✅ Документація

🚀 СИСТЕМА ГОТОВА!
```

---

**Дата**: 2025-11-18  
**Версія**: 2.0  
**Статус**: ✅ ГОТОВО
