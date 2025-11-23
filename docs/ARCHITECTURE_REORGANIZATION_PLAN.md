# 🏗️ План Реорганізації Архітектури Проекту

**Дата:** 23 листопада 2025, 04:48 UTC+02:00  
**Версія:** 1.0  
**Статус:** ✅ В процесі виконання

---

## 🎯 Цілі Реорганізації

1. **Очистити корінь проекту** - видалити лишні файли
2. **Згрупувати документацію** - організувати MD файли за категоріями
3. **Організувати тести** - розташувати тести за типами
4. **Оновити архітектуру** - глибокий аналіз залежностей
5. **Оптимізувати структуру** - покращити навігацію

---

## 📋 Поточна Ситуація

### MD Файли в Корені (20 файлів)
```
ANALYSIS_COMPARISON_BEFORE_AFTER.md
ANALYSIS_COMPLETION_REPORT.md
ANALYSIS_INDEX.md
ANALYSIS_SUMMARY.md
ARCHITECTURE_ANALYSIS_REPORT.md
CLEANUP_EXECUTION_GUIDE.md
CLEANUP_RECOMMENDATIONS.md
DEPENDENCY_GRAPH_GUIDE.md
DEPENDENCY_GRAPH_SUMMARY.md
INSTALLATION_UPDATE_NOTES.md
INTERACTIVE_CLEANUP_CHECKLIST.md
MCP_TOOLS_REFERENCE.md
README.md
README_ANALYSIS.md
REFACTORING_SUMMARY.md
REFINED_ANALYSIS_2025-11-20.md
SAFE_REFACTORING_PLAN_2025-11-20.md
START_HERE.md
START_REFACTORING_HERE.md
WINDSURF_INTEGRATION_VERIFICATION.md
```

### Папки з Документацією
```
docs/               - Основна документація
codemap-system/     - Система аналізу архітектури
tests/              - Тести
archive/            - Архів старих файлів
```

---

## 🗂️ Нова Структура

### 1. Документація (docs/)

```
docs/
├── README.md                          # Індекс документації
├── ARCHITECTURE.md                    # Архітектура проекту
├── GETTING_STARTED.md                 # Швидкий старт
│
├── analysis/                          # Аналіз архітектури
│   ├── ANALYSIS_SUMMARY.md
│   ├── ANALYSIS_COMPLETION_REPORT.md
│   ├── ARCHITECTURE_ANALYSIS_REPORT.md
│   ├── ANALYSIS_COMPARISON_BEFORE_AFTER.md
│   └── ANALYSIS_INDEX.md
│
├── dependency-graph/                  # Аналіз залежностей
│   ├── DEPENDENCY_GRAPH_GUIDE.md
│   ├── DEPENDENCY_GRAPH_SUMMARY.md
│   └── MCP_TOOLS_REFERENCE.md
│
├── cleanup/                           # Очистка проекту
│   ├── CLEANUP_RECOMMENDATIONS.md
│   ├── CLEANUP_EXECUTION_GUIDE.md
│   ├── INTERACTIVE_CLEANUP_CHECKLIST.md
│   └── REFACTORING_SUMMARY.md
│
├── installation/                      # Установка та запуск
│   ├── INSTALLATION_UPDATE_NOTES.md
│   ├── QUICK_START.md
│   └── DEPLOYMENT_GUIDE.md
│
├── integration/                       # Інтеграція з Windsurf
│   ├── WINDSURF_INTEGRATION_VERIFICATION.md
│   ├── INTEGRATION_GUIDE.md
│   └── ENHANCEMENT_GUIDE.md
│
├── refactoring/                       # Рефакторинг
│   ├── SAFE_REFACTORING_PLAN_2025-11-20.md
│   ├── REFINED_ANALYSIS_2025-11-20.md
│   └── START_REFACTORING_HERE.md
│
└── archive/                           # Архівні документи
    └── (старі документи)
```

### 2. Тести (tests/)

```
tests/
├── README.md                          # Індекс тестів
├── conftest.py                        # Конфіг pytest
│
├── unit/                              # Unit тести
│   ├── test_architecture_mapper.py
│   ├── test_dependency_graph.py
│   └── test_mcp_integration.py
│
├── integration/                       # Інтеграційні тести
│   ├── test_windsurf_integration.py
│   └── test_mcp_protocol.py
│
├── codemap-system/                    # Тести MCP сервера
│   ├── test_mcp_integration.py
│   └── test_mcp_server.py
│
└── fixtures/                          # Тестові дані
    ├── sample_code.py
    └── sample_project/
```

### 3. Корінь Проекту (очищений)

```
atlas4/
├── README.md                          # Основний README
├── ARCHITECTURE.md                    # Архітектура проекту
├── GETTING_STARTED.md                 # Швидкий старт
├── .gitignore
├── .env.example
│
├── docs/                              # Документація
├── tests/                             # Тести
├── codemap-system/                    # MCP сервер
├── services/                          # Сервіси
├── web/                               # Web додаток
├── config/                            # Конфіг
├── data/                              # Дані
├── models/                            # Моделі
├── scripts/                           # Скрипти
├── logs/                              # Логи
├── reports/                           # Звіти
│
├── archive/                           # Архів старих файлів
├── backups/                           # Резервні копії
└── venv/                              # Віртуальне середовище
```

---

## 🔄 Процес Реорганізації

### Крок 1: Створення Нової Структури Папок
```bash
mkdir -p docs/{analysis,dependency-graph,cleanup,installation,integration,refactoring,archive}
mkdir -p tests/{unit,integration,codemap-system,fixtures}
```

### Крок 2: Переміщення MD Файлів

**docs/analysis/**
- ANALYSIS_SUMMARY.md
- ANALYSIS_COMPLETION_REPORT.md
- ARCHITECTURE_ANALYSIS_REPORT.md
- ANALYSIS_COMPARISON_BEFORE_AFTER.md
- ANALYSIS_INDEX.md

**docs/dependency-graph/**
- DEPENDENCY_GRAPH_GUIDE.md
- DEPENDENCY_GRAPH_SUMMARY.md
- MCP_TOOLS_REFERENCE.md

**docs/cleanup/**
- CLEANUP_RECOMMENDATIONS.md
- CLEANUP_EXECUTION_GUIDE.md
- INTERACTIVE_CLEANUP_CHECKLIST.md
- REFACTORING_SUMMARY.md

**docs/installation/**
- INSTALLATION_UPDATE_NOTES.md
- QUICK_START.md (з codemap-system)
- DEPLOYMENT_GUIDE.md (з codemap-system)

**docs/integration/**
- WINDSURF_INTEGRATION_VERIFICATION.md
- INTEGRATION_GUIDE.md (з codemap-system)
- ENHANCEMENT_GUIDE.md (з codemap-system)

**docs/refactoring/**
- SAFE_REFACTORING_PLAN_2025-11-20.md
- REFINED_ANALYSIS_2025-11-20.md
- START_REFACTORING_HERE.md

### Крок 3: Переміщення Тестів

**tests/unit/**
- test_architecture_mapper.py
- test_dependency_graph.py
- test_mcp_integration.py

**tests/integration/**
- test_windsurf_integration.py
- test_mcp_protocol.py

**tests/codemap-system/**
- test_mcp_integration.py (з codemap-system)

### Крок 4: Оновлення README Файлів

**docs/README.md** - Індекс всієї документації
**tests/README.md** - Індекс тестів

### Крок 5: Очистка Кореня

Видалити з кореня:
- ANALYSIS_*.md
- CLEANUP_*.md
- DEPENDENCY_GRAPH_*.md
- INSTALLATION_*.md
- WINDSURF_*.md
- REFACTORING_*.md
- REFINED_*.md
- SAFE_*.md
- START_*.md
- MCP_TOOLS_*.md

Залишити в корені:
- README.md
- ARCHITECTURE.md
- GETTING_STARTED.md

---

## 🔗 Залежності та Взаємозв'язки

### Документація
```
README.md (основний)
├── GETTING_STARTED.md
├── ARCHITECTURE.md
└── docs/README.md
    ├── docs/analysis/
    ├── docs/dependency-graph/
    ├── docs/cleanup/
    ├── docs/installation/
    ├── docs/integration/
    └── docs/refactoring/
```

### Тести
```
tests/README.md
├── tests/unit/
│   ├── test_architecture_mapper.py
│   ├── test_dependency_graph.py
│   └── test_mcp_integration.py
├── tests/integration/
│   ├── test_windsurf_integration.py
│   └── test_mcp_protocol.py
└── tests/codemap-system/
    └── test_mcp_integration.py
```

### Система
```
codemap-system/
├── core/
│   ├── architecture_mapper.py
│   ├── dependency_graph_analyzer.py
│   └── code_quality_analyzer.py
├── windsurf/
│   ├── mcp_architecture_server.py
│   └── mcp_dependency_graph_tools.py
└── tests/
    └── test_mcp_integration.py
```

---

## 📊 Глибокий Аналіз Залежностей

### Рівень 1: Основні Модулі
```
mcp_architecture_server.py
├── core/architecture_mapper.py
├── core/dependency_graph_analyzer.py
├── core/code_duplication_detector.py
└── core/code_quality_analyzer.py
```

### Рівень 2: Аналізатори
```
architecture_mapper.py
├── FileStatus (enum)
├── ArchitectureMapper (class)
│   ├── analyze_architecture()
│   ├── _find_workflow_files()
│   ├── _analyze_file()
│   ├── _extract_imports()
│   ├── _extract_exports()
│   ├── _extract_functions()
│   ├── _extract_classes()
│   ├── _determine_file_status()
│   ├── _detect_circular_dependencies()
│   └── _build_architecture_map()
└── Dependencies:
    ├── pathlib.Path
    ├── ast (Python AST)
    ├── re (regex)
    └── concurrent.futures
```

### Рівень 3: Аналіз Залежностей
```
dependency_graph_analyzer.py
├── CodeBlock (class)
│   ├── name, type, file_path
│   ├── dependencies, dependents
│   ├── internal_calls, external_calls
│   └── complexity, parameters
├── DependencyGraphAnalyzer (class)
│   ├── analyze_file()
│   ├── build_dependency_graph()
│   ├── get_block_info()
│   ├── _get_call_chain()
│   └── _analyze_impact()
└── Dependencies:
    ├── ast (Python AST)
    ├── re (regex)
    └── json
```

### Рівень 4: MCP Інструменти
```
mcp_dependency_graph_tools.py
├── DependencyGraphTools (class)
│   ├── initialize()
│   ├── get_block_dependencies()
│   ├── get_function_call_chain()
│   ├── analyze_code_impact()
│   ├── find_related_blocks()
│   ├── get_file_structure()
│   ├── search_blocks_by_name()
│   ├── get_complexity_report()
│   └── export_dependency_graph()
└── Dependencies:
    ├── DependencyGraphAnalyzer
    ├── json
    └── re
```

### Рівень 5: MCP Сервер
```
mcp_architecture_server.py
├── ArchitectureAnalysisServer (class)
│   ├── __init__()
│   ├── _initialize_architecture_tools()
│   ├── handle_tool_call()
│   └── JSON-RPC методи
└── Dependencies:
    ├── ArchitectureMapper
    ├── CodeDuplicationDetector
    ├── CodeQualityAnalyzer
    ├── DependencyGraphTools
    ├── json
    └── sys
```

---

## ✅ Чек-лист Реорганізації

- [ ] Створити нові папки в docs/
- [ ] Створити нові папки в tests/
- [ ] Перемістити MD файли в docs/
- [ ] Перемістити тести в tests/
- [ ] Оновити README файли
- [ ] Оновити посилання в документації
- [ ] Видалити лишні файли з кореня
- [ ] Перевірити всі посилання
- [ ] Оновити .gitignore
- [ ] Запустити тести
- [ ] Оновити документацію

---

## 🎯 Очікувані Результати

### Корінь Проекту (очищений)
```
atlas4/
├── README.md
├── ARCHITECTURE.md
├── GETTING_STARTED.md
├── docs/
├── tests/
├── codemap-system/
├── services/
├── web/
├── config/
├── data/
├── models/
├── scripts/
├── logs/
├── reports/
├── archive/
├── backups/
└── venv/
```

### Документація (організована)
```
docs/
├── README.md
├── analysis/
├── dependency-graph/
├── cleanup/
├── installation/
├── integration/
├── refactoring/
└── archive/
```

### Тести (організовані)
```
tests/
├── README.md
├── unit/
├── integration/
├── codemap-system/
└── fixtures/
```

---

## 📈 Переваги Реорганізації

1. **Чистіший корінь** - легше навігувати
2. **Організована документація** - легше знайти потрібне
3. **Структуровані тести** - легше розуміти тестову базу
4. **Ясні залежності** - легше розуміти архітектуру
5. **Краща масштабованість** - легше додавати нові компоненти

---

Дата: 23 листопада 2025, 04:48 UTC+02:00  
Версія: 1.0  
Статус: ✅ План готовий до виконання
