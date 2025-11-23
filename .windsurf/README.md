# 🔌 Windsurf IDE Конфіг та Ресурси

**Дата:** 23 листопада 2025  
**Версія:** 1.0  
**Статус:** ✅ Організовано

---

## 📋 Структура

```
.windsurf/
├── README.md                          # Цей файл
├── mcp_config.json                    # MCP конфіг
├── settings.json                      # Windsurf налаштування
│
├── workflows/                         # Workflows для Windsurf
│   └── full-architecture-analysis.md  # Workflow аналізу архітектури
│
└── resources/                         # ✨ НОВИЙ - Ресурси для Windsurf
    ├── architecture/                  # Архітектура проекту
    │   ├── overview.json              # Огляд архітектури
    │   ├── dependencies.json          # Залежності
    │   └── health.json                # Здоров'я системи
    │
    ├── analysis/                      # Результати аналізу
    │   ├── complexity.json            # Звіт складності
    │   ├── duplicates.json            # Дублікати коду
    │   └── unused_files.json          # Невикористовувані файли
    │
    ├── integration/                   # Інтеграція та тести
    │   ├── mcp_tools.json             # MCP інструменти
    │   ├── test_results.json          # Результати тестів
    │   └── verification.json          # Перевірка інтеграції
    │
    └── cache/                         # Кеш для швидкого доступу
        ├── architecture_cache.json
        └── dependency_cache.json
```

---

## 🔌 MCP Конфіг

### mcp_config.json

Конфіг для MCP серверів, які інтегруються з Windsurf:

```json
{
  "mcpServers": {
    "codemap": {
      "command": "/Users/dev/Documents/GitHub/atlas4/codemap-system/venv/bin/python3",
      "args": ["/Users/dev/Documents/GitHub/atlas4/codemap-system/windsurf/mcp_architecture_server.py"],
      "disabled": false,
      "type": "stdio",
      "env": {
        "PYTHONPATH": "/Users/dev/Documents/GitHub/atlas4/codemap-system",
        "PROJECT_ROOT": "/Users/dev/Documents/GitHub/atlas4",
        "PYTHONUNBUFFERED": "1"
      }
    }
  }
}
```

### Налаштування

- **command** - Шлях до Python інтерпретатора
- **args** - Аргументи для запуску MCP сервера
- **disabled** - Статус активності (false = активний)
- **type** - Тип комунікації (stdio = стандартний вхід/вихід)
- **env** - Змінні середовища

---

## ⚙️ Windsurf Налаштування

### settings.json

Налаштування для Windsurf IDE:

```json
{
  "windsurf.cascade.context.includes": [
    "dependency-graph",
    "dead-code-analysis",
    "project-structure"
  ],
  "windsurf.cascade.maxContextTokens": 128000,
  "windsurf.cascade.autoRefresh": true,
  "windsurf.cascade.refreshInterval": 30000,
  "files.exclude": {
    "**/node_modules": true,
    "**/__pycache__": true,
    "**/.git": true,
    "**/dist": true,
    "**/build": true
  },
  "search.exclude": {
    "**/node_modules": true,
    "**/__pycache__": true,
    "**/dist": true,
    "**/build": true
  }
}
```

### Параметри

- **context.includes** - Що включати в контекст
- **maxContextTokens** - Максимум токенів контексту
- **autoRefresh** - Автоматичне оновлення
- **refreshInterval** - Інтервал оновлення (мс)

---

## 🔄 Workflows

### full-architecture-analysis.md

Workflow для повного аналізу архітектури:

```yaml
description: Повний аналіз архітектури проекту з максимальною глибиною
```

**Кроки:**
1. Аналіз структури файлів
2. Аналіз залежностей
3. Виявлення циклічних залежностей
4. Аналіз дублікатів коду
5. Перевірка якості коду
6. Генерація звітів

---

## 📊 Ресурси для Windsurf

### resources/architecture/

**overview.json** - Огляд архітектури проекту
```json
{
  "total_files": 620,
  "active_files": 300,
  "unused_files": 297,
  "total_lines": 293282,
  "health_score": 100
}
```

**dependencies.json** - Залежності між модулями
```json
{
  "mcp_architecture_server.py": [
    "core/architecture_mapper.py",
    "core/dependency_graph_analyzer.py",
    "core/code_duplication_detector.py"
  ]
}
```

**health.json** - Здоров'я системи
```json
{
  "score": 100,
  "modularity": "excellent",
  "unused_ratio": 0.479,
  "circular_dependencies": 0
}
```

### resources/analysis/

**complexity.json** - Звіт про складність коду
```json
{
  "total_blocks": 1250,
  "average_complexity": 2.3,
  "most_complex": [
    {"name": "process_workflow", "complexity": 15},
    {"name": "handle_request", "complexity": 12}
  ]
}
```

**duplicates.json** - Дублікати коду
```json
{
  "total_duplicates": 13147,
  "duplicate_blocks": [
    {"file1": "...", "file2": "...", "lines": 50}
  ]
}
```

**unused_files.json** - Невикористовувані файли
```json
{
  "total_unused": 297,
  "unused_files": [
    {"path": "...", "size": 1024, "last_modified": "..."}
  ]
}
```

### resources/integration/

**mcp_tools.json** - Доступні MCP інструменти
```json
{
  "tools": [
    {"name": "get_block_dependencies", "description": "..."},
    {"name": "get_function_call_chain", "description": "..."},
    ...
  ]
}
```

**test_results.json** - Результати тестів
```json
{
  "total_tests": 8,
  "passed": 8,
  "failed": 0,
  "status": "success"
}
```

**verification.json** - Перевірка інтеграції
```json
{
  "mcp_server": "✅ OK",
  "json_rpc": "✅ OK",
  "tools_format": "✅ OK",
  "windsurf_compatibility": "✅ OK"
}
```

---

## 🚀 Як Використовувати

### 1. Перезавантажити Windsurf
```
Cmd+Shift+P → Reload Window
```

### 2. Перевірити MCP Сервер
```
Cmd+Shift+P → MCP: List Servers
```

Повинен з'явитися "codemap" сервер.

### 3. Використовувати Workflow
```
Cmd+Shift+P → Cascade: Run Workflow
Вибрати: full-architecture-analysis
```

### 4. Використовувати MCP Інструменти
```
mcp0_get_complexity_report()
mcp0_get_file_structure("services/api.py")
mcp0_get_block_dependencies("services/api.py:handle_request")
```

---

## 📝 Оновлення Ресурсів

Ресурси оновлюються автоматично при запуску аналізу:

```bash
# Запустити аналіз
cd codemap-system
./START_FULL_SYSTEM.sh

# Ресурси будуть оновлені в .windsurf/resources/
```

---

## ✅ Статус

- ✅ MCP конфіг налаштований
- ✅ Windsurf налаштування готові
- ✅ Workflows готові
- ✅ Ресурси організовані
- ✅ Інтеграція успішна

---

Дата: 23 листопада 2025  
Версія: 1.0  
Статус: ✅ Готово
