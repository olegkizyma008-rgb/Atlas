# 🔧 Фаза 1: Реалізація критичних функцій

## 📋 Завдання

Додати 3 критичні функції, які перетворять систему на інтелектуального помічника:

1. **Контекст поточного файлу** - Система знає, який файл ви редагуєте
2. **Контекстна інформація** - Система показує пов'язані файли та вплив змін
3. **Швидкі дії** - Швидкий доступ до частих операцій

---

## 🎯 Функція 1: Контекст поточного файлу

### Нові ресурси MCP:
```python
# Додати до get_resources():
{
    "uri": "codemap://current/file-context",
    "name": "Current File Context",
    "description": "Context for the currently edited file"
},
{
    "uri": "codemap://current/file-issues",
    "name": "Current File Issues",
    "description": "Issues and problems in the currently edited file"
},
{
    "uri": "codemap://current/file-recommendations",
    "name": "Current File Recommendations",
    "description": "Recommendations specific to the currently edited file"
}
```

### Нові інструменти:
```python
# Додати до get_tools():
{
    "name": "get_current_file_context",
    "description": "Get context for the currently edited file",
    "inputSchema": {
        "type": "object",
        "properties": {
            "file_path": {
                "type": "string",
                "description": "Path to the currently edited file"
            }
        },
        "required": ["file_path"]
    }
}
```

### Реалізація:
```python
def _get_current_file_context(self, file_path: str) -> str:
    """Get context for currently edited file"""
    data = self._load_json_report("codemap_analysis.json")
    if not data:
        return json.dumps({"error": "No analysis data available"})
    
    file_imports = data.get("file_imports", {}).get(file_path, [])
    func_defs = data.get("function_definitions", {}).get(file_path, {})
    dead_code = data.get("dead_code", {}).get(file_path, [])
    
    context = {
        "file": file_path,
        "imports_count": len(file_imports),
        "functions_count": len(func_defs),
        "dead_code_count": len(dead_code),
        "imports": file_imports[:5],  # First 5
        "functions": list(func_defs.keys())[:5],  # First 5
        "dead_code": dead_code[:5],  # First 5
        "complexity": self._calculate_file_complexity(file_path, data)
    }
    
    return json.dumps(context, indent=2, default=str)
```

### Приклад використання:
```
Ви: "Яка ситуація з файлом orchestrator/core/main.js?"

Система показує:
{
  "file": "orchestrator/core/main.js",
  "imports_count": 15,
  "functions_count": 8,
  "dead_code_count": 2,
  "complexity": "high",
  "imports": ["./helpers", "./config", ...],
  "functions": ["init", "process", "cleanup", ...],
  "dead_code": ["oldFunction", "deprecatedMethod"]
}
```

---

## 🔗 Функція 2: Контекстна інформація

### Нові інструменти:
```python
{
    "name": "get_related_files",
    "description": "Get files related to a specific file",
    "inputSchema": {
        "type": "object",
        "properties": {
            "file_path": {
                "type": "string",
                "description": "Path to the file"
            }
        },
        "required": ["file_path"]
    }
},
{
    "name": "get_file_impact",
    "description": "Get impact of changes to a file",
    "inputSchema": {
        "type": "object",
        "properties": {
            "file_path": {
                "type": "string",
                "description": "Path to the file"
            }
        },
        "required": ["file_path"]
    }
},
{
    "name": "get_dependency_chain",
    "description": "Get full dependency chain for a file",
    "inputSchema": {
        "type": "object",
        "properties": {
            "file_path": {
                "type": "string",
                "description": "Path to the file"
            }
        },
        "required": ["file_path"]
    }
}
```

### Реалізація:
```python
def _get_related_files(self, file_path: str) -> str:
    """Get files related to a specific file"""
    data = self._load_json_report("codemap_analysis.json")
    if not data:
        return json.dumps({"error": "No analysis data available"})
    
    file_imports = data.get("file_imports", {})
    
    # Files this file imports from
    imports_from = file_imports.get(file_path, [])
    
    # Files that import this file
    imports_to = [f for f, imports in file_imports.items() if file_path in imports]
    
    result = {
        "file": file_path,
        "imports_from": imports_from,
        "imported_by": imports_to,
        "total_related": len(imports_from) + len(imports_to)
    }
    
    return json.dumps(result, indent=2, default=str)

def _get_file_impact(self, file_path: str) -> str:
    """Get impact of changes to a file"""
    data = self._load_json_report("codemap_analysis.json")
    if not data:
        return json.dumps({"error": "No analysis data available"})
    
    file_imports = data.get("file_imports", {})
    
    # How many files depend on this file
    dependent_files = [f for f, imports in file_imports.items() if file_path in imports]
    
    impact = {
        "file": file_path,
        "dependent_files_count": len(dependent_files),
        "dependent_files": dependent_files,
        "impact_level": "high" if len(dependent_files) > 10 else "medium" if len(dependent_files) > 3 else "low",
        "recommendation": self._get_impact_recommendation(len(dependent_files))
    }
    
    return json.dumps(impact, indent=2, default=str)

def _get_dependency_chain(self, file_path: str) -> str:
    """Get full dependency chain for a file"""
    data = self._load_json_report("codemap_analysis.json")
    if not data:
        return json.dumps({"error": "No analysis data available"})
    
    file_imports = data.get("file_imports", {})
    
    def build_chain(f, depth=0, visited=None):
        if visited is None:
            visited = set()
        if f in visited or depth > 5:
            return None
        visited.add(f)
        
        imports = file_imports.get(f, [])
        return {
            "file": f,
            "depth": depth,
            "imports": [build_chain(imp, depth + 1, visited) for imp in imports[:3]]
        }
    
    chain = build_chain(file_path)
    
    return json.dumps(chain, indent=2, default=str)
```

### Приклад використання:
```
Ви: "Що станеться, якщо я видалю orchestrator/core/main.js?"

Система показує:
{
  "file": "orchestrator/core/main.js",
  "dependent_files_count": 5,
  "dependent_files": [
    "orchestrator/workflow/executor.js",
    "orchestrator/workflow/scheduler.js",
    ...
  ],
  "impact_level": "high",
  "recommendation": "This file is critical. 5 files depend on it. Refactor before deletion."
}
```

---

## ⚡ Функція 3: Швидкі дії

### Нові інструменти:
```python
{
    "name": "quick_show_dead_code",
    "description": "Quickly show dead code in a file",
    "inputSchema": {
        "type": "object",
        "properties": {
            "file_path": {
                "type": "string",
                "description": "Path to the file"
            }
        },
        "required": ["file_path"]
    }
},
{
    "name": "quick_show_dependencies",
    "description": "Quickly show dependencies of a file",
    "inputSchema": {
        "type": "object",
        "properties": {
            "file_path": {
                "type": "string",
                "description": "Path to the file"
            }
        },
        "required": ["file_path"]
    }
},
{
    "name": "quick_show_issues",
    "description": "Quickly show all issues in a file",
    "inputSchema": {
        "type": "object",
        "properties": {
            "file_path": {
                "type": "string",
                "description": "Path to the file"
            }
        },
        "required": ["file_path"]
    }
}
```

### Реалізація:
```python
def _quick_show_dead_code(self, file_path: str) -> str:
    """Quickly show dead code in a file"""
    data = self._load_json_report("codemap_analysis.json")
    if not data:
        return json.dumps({"error": "No analysis data available"})
    
    dead_code = data.get("dead_code", {}).get(file_path, [])
    
    result = {
        "file": file_path,
        "dead_code_count": len(dead_code),
        "dead_code": dead_code,
        "action": "Remove these unused functions/variables"
    }
    
    return json.dumps(result, indent=2, default=str)

def _quick_show_dependencies(self, file_path: str) -> str:
    """Quickly show dependencies of a file"""
    data = self._load_json_report("codemap_analysis.json")
    if not data:
        return json.dumps({"error": "No analysis data available"})
    
    file_imports = data.get("file_imports", {}).get(file_path, [])
    
    result = {
        "file": file_path,
        "dependencies_count": len(file_imports),
        "dependencies": file_imports,
        "action": "Review these dependencies"
    }
    
    return json.dumps(result, indent=2, default=str)

def _quick_show_issues(self, file_path: str) -> str:
    """Quickly show all issues in a file"""
    data = self._load_json_report("codemap_analysis.json")
    if not data:
        return json.dumps({"error": "No analysis data available"})
    
    dead_code = data.get("dead_code", {}).get(file_path, [])
    file_imports = data.get("file_imports", {}).get(file_path, [])
    
    issues = []
    if len(dead_code) > 0:
        issues.append(f"Dead code: {len(dead_code)} items")
    if len(file_imports) > 10:
        issues.append(f"High coupling: {len(file_imports)} dependencies")
    
    result = {
        "file": file_path,
        "issues_count": len(issues),
        "issues": issues,
        "action": "Address these issues"
    }
    
    return json.dumps(result, indent=2, default=str)
```

### Приклад використання:
```
Ви: "Покажи мертвий код у orchestrator/core/main.js"

Система показує:
{
  "file": "orchestrator/core/main.js",
  "dead_code_count": 2,
  "dead_code": ["oldFunction", "deprecatedMethod"],
  "action": "Remove these unused functions/variables"
}
```

---

## 📝 Чек-лист реалізації

### Крок 1: Додати нові ресурси
- [ ] Додати 3 нові ресурси до `get_resources()`
- [ ] Додати обробку в `read_resource()`

### Крок 2: Додати нові інструменти
- [ ] Додати 6 нових інструментів до `get_tools()`
- [ ] Додати обробку в `call_tool()`

### Крок 3: Реалізувати методи
- [ ] `_get_current_file_context()`
- [ ] `_get_related_files()`
- [ ] `_get_file_impact()`
- [ ] `_get_dependency_chain()`
- [ ] `_quick_show_dead_code()`
- [ ] `_quick_show_dependencies()`
- [ ] `_quick_show_issues()`

### Крок 4: Тестування
- [ ] Протестувати кожний інструмент
- [ ] Перевірити синтаксис
- [ ] Перевірити на реальних файлах

### Крок 5: Документація
- [ ] Оновити MCP_INTEGRATION_GUIDE.md
- [ ] Додати приклади використання
- [ ] Оновити ENHANCED_SYSTEM.md

---

## 🚀 Як це буде виглядати після реалізації?

### Сценарій 1: Контекст файлу
```
Ви: "Яка ситуація з файлом orchestrator/core/main.js?"

Система показує:
📊 Контекст:
   - 15 залежностей
   - 8 функцій
   - 2 проблеми
   - Висока складність

💡 Рекомендація: Розбити на менші модулі
```

### Сценарій 2: Вплив змін
```
Ви: "Можна видалити orchestrator/old-module.js?"

Система показує:
⚠️ Вплив:
   - 5 файлів залежать від цього
   - Вплив: ВИСОКИЙ
   - Рекомендація: Спочатку рефакторити
```

### Сценарій 3: Швидкі дії
```
Ви: "Покажи мертвий код у цьому файлі"

Система показує:
🗑️ Мертвий код:
   - oldFunction
   - deprecatedMethod
   - Дія: Видалити
```

---

## 💡 Переваги після реалізації

✅ Система знає контекст вашої роботи  
✅ Рекомендації точніші  
✅ Швидкий доступ до інформації  
✅ Розуміння впливу змін  
✅ Менше помилок  

---

## ⏱️ Орієнтовний час реалізації

- Додання ресурсів: 30 хвилин
- Додання інструментів: 1 година
- Реалізація методів: 2 години
- Тестування: 1 година
- Документація: 30 хвилин

**Всього: ~5 годин**

---

**Готові почати?** 🚀
