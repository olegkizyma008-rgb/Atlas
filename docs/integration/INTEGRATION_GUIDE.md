# 🔗 Посібник з Інтеграції Dependency Graph Analyzer

**Дата:** 23 листопада 2025  
**Версія:** 1.0  
**Статус:** ✅ Готово до інтеграції

---

## 📋 Що було додано

### Нові Файли

1. **`core/dependency_graph_analyzer.py`** (400+ рядків)
   - Основний модуль для аналізу залежностей
   - Підтримує Python та JavaScript/TypeScript
   - Будує граф залежностей на рівні функцій та класів

2. **`windsurf/mcp_dependency_graph_tools.py`** (300+ рядків)
   - MCP інструменти для Windsurf IDE
   - 8 основних методів для аналізу
   - Експорт у JSON та Mermaid форматах

3. **`DEPENDENCY_GRAPH_GUIDE.md`**
   - Повна документація
   - Приклади використання
   - Сценарії для ШІ

---

## 🚀 Кроки Інтеграції

### Крок 1: Оновити MCP Сервер

Відкрийте `windsurf/mcp_architecture_server.py` та додайте:

```python
# На початку файлу
from windsurf.mcp_dependency_graph_tools import DependencyGraphTools

# У класі ArchitectureAnalysisServer.__init__()
self.dep_tools = DependencyGraphTools(self.project_root)
self.dep_tools.initialize()

# У методі _initialize_architecture_tools()
# Додайте нові інструменти:
{
    "name": "get_block_dependencies",
    "description": "Отримати залежності блоку коду (функція, клас, метод)",
    "inputSchema": {
        "type": "object",
        "properties": {
            "block_key": {
                "type": "string",
                "description": "Ключ блоку (file_path:block_name)"
            }
        },
        "required": ["block_key"]
    }
},
{
    "name": "get_function_call_chain",
    "description": "Отримати ланцюг викликів функції",
    "inputSchema": {
        "type": "object",
        "properties": {
            "function_name": {"type": "string"},
            "file_path": {"type": "string"}
        },
        "required": ["function_name"]
    }
},
{
    "name": "analyze_code_impact",
    "description": "Аналізувати вплив змін в блоку коду",
    "inputSchema": {
        "type": "object",
        "properties": {
            "block_key": {"type": "string"}
        },
        "required": ["block_key"]
    }
},
{
    "name": "find_related_blocks",
    "description": "Знайти пов'язані блоки коду",
    "inputSchema": {
        "type": "object",
        "properties": {
            "block_key": {"type": "string"},
            "depth": {"type": "integer", "default": 2}
        },
        "required": ["block_key"]
    }
},
{
    "name": "get_file_structure",
    "description": "Отримати структуру файлу (функції, класи, методи)",
    "inputSchema": {
        "type": "object",
        "properties": {
            "file_path": {"type": "string"}
        },
        "required": ["file_path"]
    }
},
{
    "name": "search_blocks_by_name",
    "description": "Пошук блоків за назвою (підтримує regex)",
    "inputSchema": {
        "type": "object",
        "properties": {
            "pattern": {"type": "string"}
        },
        "required": ["pattern"]
    }
},
{
    "name": "get_complexity_report",
    "description": "Отримати звіт про складність коду",
    "inputSchema": {
        "type": "object",
        "properties": {}
    }
},
{
    "name": "export_dependency_graph",
    "description": "Експортувати граф залежностей",
    "inputSchema": {
        "type": "object",
        "properties": {
            "format": {
                "type": "string",
                "enum": ["json", "mermaid"],
                "default": "json"
            }
        }
    }
}
```

### Крок 2: Додати Обробку Викликів

У методі `handle_tool_call()`:

```python
elif tool_name == "get_block_dependencies":
    block_key = arguments.get("block_key", "")
    result = self.dep_tools.get_block_dependencies(block_key)
    return json.dumps(result, ensure_ascii=False, default=str)

elif tool_name == "get_function_call_chain":
    function_name = arguments.get("function_name", "")
    file_path = arguments.get("file_path")
    result = self.dep_tools.get_function_call_chain(function_name, file_path)
    return json.dumps(result, ensure_ascii=False, default=str)

elif tool_name == "analyze_code_impact":
    block_key = arguments.get("block_key", "")
    result = self.dep_tools.analyze_code_impact(block_key)
    return json.dumps(result, ensure_ascii=False, default=str)

elif tool_name == "find_related_blocks":
    block_key = arguments.get("block_key", "")
    depth = arguments.get("depth", 2)
    result = self.dep_tools.find_related_blocks(block_key, depth)
    return json.dumps(result, ensure_ascii=False, default=str)

elif tool_name == "get_file_structure":
    file_path = arguments.get("file_path", "")
    result = self.dep_tools.get_file_structure(file_path)
    return json.dumps(result, ensure_ascii=False, default=str)

elif tool_name == "search_blocks_by_name":
    pattern = arguments.get("pattern", "")
    result = self.dep_tools.search_blocks_by_name(pattern)
    return json.dumps(result, ensure_ascii=False, default=str)

elif tool_name == "get_complexity_report":
    result = self.dep_tools.get_complexity_report()
    return json.dumps(result, ensure_ascii=False, default=str)

elif tool_name == "export_dependency_graph":
    format_type = arguments.get("format", "json")
    result = self.dep_tools.export_dependency_graph(format_type)
    return json.dumps(result, ensure_ascii=False, default=str)
```

### Крок 3: Оновити Залежності

Додайте до `requirements.txt`:

```
# Вже є в requirements.txt
# Додаткові залежності не потрібні!
```

### Крок 4: Тестування

```bash
# Перезавантажте Windsurf
# Cmd+Shift+P → Reload Window

# Тестуйте нові інструменти
mcp0_get_block_dependencies("services/api.py:get_user")
mcp0_get_function_call_chain("process_data")
mcp0_analyze_code_impact("services/api.py:get_user")
mcp0_find_related_blocks("services/api.py:get_user")
mcp0_get_file_structure("services/api.py")
mcp0_search_blocks_by_name("get_.*")
mcp0_get_complexity_report()
mcp0_export_dependency_graph("json")
```

---

## 📊 Приклади Використання

### Приклад 1: Знайти Залежності Функції

```
Запит: mcp0_get_block_dependencies("services/user.py:get_user")

Результат:
{
  "status": "success",
  "block_info": {
    "block": {
      "name": "get_user",
      "dependencies": [
        "services/database.py:query",
        "services/cache.py:get"
      ]
    },
    "dependencies": [...],
    "call_chain": {...},
    "impact_analysis": {...}
  }
}
```

### Приклад 2: Отримати Структуру Файлу

```
Запит: mcp0_get_file_structure("services/api.py")

Результат:
{
  "status": "success",
  "file": "services/api.py",
  "structure": {
    "classes": [
      {"name": "APIHandler", "type": "class"}
    ],
    "functions": [
      {"name": "handle_request", "type": "function"}
    ],
    "methods": [
      {"name": "process", "type": "method"}
    ]
  }
}
```

### Приклад 3: Аналізувати Вплив Змін

```
Запит: mcp0_analyze_code_impact("services/api.py:get_user")

Результат:
{
  "status": "success",
  "block": {...},
  "impact_analysis": {
    "direct_dependents": 5,
    "total_affected": 12,
    "affected_blocks": [...]
  },
  "recommendation": "⚠️ Обережно - впливає на кілька блоків"
}
```

---

## 🔧 Налаштування

### Налаштування Аналізатора

У `core/dependency_graph_analyzer.py`:

```python
# Максимальна глибина аналізу
max_depth = 3

# Мінімальна довжина блоку для аналізу
min_lines = 1

# Максимальна довжина блоку
max_lines = 10000
```

### Налаштування MCP Інструментів

У `windsurf/mcp_dependency_graph_tools.py`:

```python
# Максимальна кількість результатів
max_results = 50

# Максимальна глибина ланцюга викликів
max_call_chain_depth = 3
```

---

## 📈 Перевірка Інтеграції

### Чек-лист

- [ ] Додано імпорти в `mcp_architecture_server.py`
- [ ] Ініціалізовано `DependencyGraphTools`
- [ ] Додано 8 нових інструментів
- [ ] Додана обробка викликів у `handle_tool_call()`
- [ ] Перезавантажено Windsurf
- [ ] Протестовано всі інструменти
- [ ] Перевірено експорт графів

### Тестові Команди

```bash
# Тест 1: Базова ініціалізація
mcp0_get_complexity_report()

# Тест 2: Пошук блоків
mcp0_search_blocks_by_name(".*")

# Тест 3: Структура файлу
mcp0_get_file_structure("services/api.py")

# Тест 4: Залежності
mcp0_get_block_dependencies("services/api.py:handle_request")

# Тест 5: Експорт
mcp0_export_dependency_graph("json")
```

---

## 🎯 Переваги для ШІ

### Швидше Розуміння Коду
- ШІ бачить структуру файлу за 1 запит
- ШІ розуміє залежності без читання всього коду

### Безпечніші Зміни
- ШІ знає, які блоки впливаються змінами
- ШІ може оцінити ризик рефакторингу

### Кращі Рекомендації
- ШІ пропонує зміни на основі архітектури
- ШІ уникає порушення залежностей

### Швидша Навігація
- ШІ знаходить пов'язані блоки за 1 запит
- ШІ розуміє ланцюги викликів

---

## 📝 Примітки

- Аналіз виконується один раз при ініціалізації
- Результати кешуються для швидкого доступу
- Підтримуються Python та JavaScript/TypeScript файли
- Граф можна експортувати у JSON та Mermaid форматах

---

## 🚀 Наступні Кроки

1. **Інтегрувати** в `mcp_architecture_server.py`
2. **Протестувати** всі інструменти
3. **Документувати** у Windsurf
4. **Оптимізувати** для великих проектів
5. **Розширити** підтримку мов програмування

---

**Посібник готовий до інтеграції!** 🎉

Дата: 23 листопада 2025, 04:26 UTC+02:00
