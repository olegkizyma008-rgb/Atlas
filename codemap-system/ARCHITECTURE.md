# 🏗️ Архітектура Codemap Analyzer

## 📐 Загальна структура

```
codemap/
├── codemap_analyzer.py          # Основний модуль аналізу
├── config.yaml                  # Конфігурація
├── requirements.txt             # Залежності Python
├── .windsurf/
│   ├── workflows/               # Windsurf workflows
│   │   ├── update-codemap.md
│   │   ├── analyze-dead-code.md
│   │   ├── detect-cycles.md
│   │   └── refactor-with-context.md
│   └── settings.json            # Налаштування Windsurf
├── .pre-commit-config.yaml      # Pre-commit hook
├── reports/                     # Генеровані звіти
│   ├── CODEMAP_SUMMARY.md       # Для Cascade
│   ├── codemap_analysis.json    # Повні дані
│   └── codemap_analysis.html    # HTML звіт
└── example_project/             # Приклад проєкту
    └── src/
        ├── main.py
        ├── utils.py
        ├── services.py
        └── models.py
```

## 🔄 Потік роботи

```
┌─────────────────────────────────────────────────────────────┐
│                   User запускає аналіз                      │
│              python3 codemap_analyzer.py --once             │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              CodeAnalyzer.__init__()                        │
│  - Завантажує config.yaml                                  │
│  - Ініціалізує структури даних                             │
│  - Створює папку reports/                                  │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              analyze_project()                              │
│                                                             │
│  1. _collect_files()                                       │
│     - Знаходить всі файли за розширеннями                 │
│     - Фільтрує за include_paths/exclude_paths             │
│                                                             │
│  2. _analyze_file() для кожного файлу                     │
│     ├─ _analyze_python_file()                             │
│     ├─ _analyze_javascript_file()                         │
│     └─ (інші мови)                                        │
│                                                             │
│  3. _detect_dead_code()                                    │
│     - Знаходить невикористовувані функції                │
│     - Знаходить невикористовувані приватні методи        │
│                                                             │
│  4. _detect_cycles()                                       │
│     - Знаходить циклічні залежності                       │
│                                                             │
│  5. _calculate_complexity()                                │
│     - Розраховує метрики складності                       │
│                                                             │
│  6. Повертає summary                                       │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              generate_reports()                             │
│                                                             │
│  1. _generate_json_report()                                │
│     → reports/codemap_analysis.json                        │
│                                                             │
│  2. _generate_markdown_report()                            │
│     → reports/CODEMAP_SUMMARY.md (для Cascade)            │
│                                                             │
│  3. _generate_html_report()                                │
│     → reports/codemap_analysis.html                        │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              Cascade читає звіти                            │
│  @reports/CODEMAP_SUMMARY.md                               │
│  @reports/codemap_analysis.json                            │
│  @reports/codemap_analysis.html                            │
│                                                             │
│  Cascade матиме 100% контекст для аналізу/рефакторингу    │
└─────────────────────────────────────────────────────────────┘
```

## 🧩 Компоненти

### 1. CodeAnalyzer

Основний клас для аналізу:

```python
class CodeAnalyzer:
    def __init__(self, config_path: str)
    def analyze_project(self) -> Dict
    def generate_reports(self, summary: Dict)
    def watch_and_update(self)
```

**Методи аналізу:**
- `_collect_files()` — збір файлів
- `_analyze_file()` — аналіз одного файлу
- `_analyze_python_file()` — парсинг Python (AST)
- `_analyze_javascript_file()` — парсинг JS/TS (regex)
- `_detect_dead_code()` — виявлення мертвого коду
- `_detect_cycles()` — виявлення циклів (NetworkX)
- `_calculate_complexity()` — метрики

**Методи генерації звітів:**
- `_generate_json_report()` — JSON
- `_generate_markdown_report()` — Markdown для Cascade
- `_generate_html_report()` — HTML для браузера

### 2. Структури даних

```python
# Граф залежностей (NetworkX DiGraph)
self.dependency_graph = nx.DiGraph()

# Імпорти по файлам
self.file_imports: Dict[str, Set[str]]

# Визначення функцій
self.function_definitions: Dict[str, Dict[str, Dict]]

# Виклики функцій
self.function_calls: Dict[str, Set[str]]

# Мертвий код
self.unused_items: Dict[str, List[Dict]]

# Хеші файлів для виявлення змін
self.file_hashes: Dict[str, str]
```

### 3. Конфігурація (config.yaml)

```yaml
project:
  name: string
  root: string

analysis:
  include_paths: List[str]
  exclude_paths: List[str]
  file_extensions: List[str]
  min_function_size: int

output:
  reports_dir: string
  formats: List[str]
  auto_update: bool
  watch_interval: int

dead_code_rules:
  unused_functions: bool
  unused_variables: bool
  unused_imports: bool
  unused_private_methods: bool

dependency_rules:
  detect_cycles: bool
  max_depth: int
  complexity_threshold: int
```

### 4. Windsurf Workflows

Кожен workflow — це Markdown файл в `.windsurf/workflows/`:

```markdown
# Workflow Name
Description

## Кроки
1. Крок 1
   ```bash
   command
   ```
2. Крок 2
   @reports/file.md
```

Workflows:
- `update-codemap.md` — запускає аналізатор
- `analyze-dead-code.md` — фокус на мертвий код
- `detect-cycles.md` — фокус на цикли
- `refactor-with-context.md` — комбінує все

## 📊 Формати звітів

### JSON (codemap_analysis.json)

```json
{
  "timestamp": "ISO 8601",
  "project": "string",
  "files_analyzed": number,
  "total_functions": number,
  "total_imports": number,
  "dependency_graph": {
    "nodes": number,
    "edges": number,
    "cycles": number
  },
  "dead_code": {
    "functions": [{file, name, line}],
    "private_methods": [{file, name, line}],
    "imports": [],
    "variables": []
  },
  "cycles": [["module_a", "module_b", "module_a"]],
  "complexity_metrics": {
    "average_imports_per_file": number,
    "average_functions_per_file": number,
    "max_dependency_depth": number
  },
  "file_imports": {file: [imports]},
  "function_definitions": {file: {func: {lineno, lines, is_private}}},
  "dependency_edges": [[from, to]]
}
```

### Markdown (CODEMAP_SUMMARY.md)

```markdown
# 📊 Code Analysis Report
Generated: timestamp

## Project Overview
- Project: name
- Files Analyzed: number
- Total Functions: number
- Total Imports: number

## Dependency Graph
- Nodes: number
- Edges: number
- Circular Dependencies: number

## Complexity Metrics
- Avg Imports/File: number
- Avg Functions/File: number
- Max Dependency Depth: number

## 🔴 Dead Code Detected
### Unused Functions (count)
- `name` in `file` (line number)

### Unused Private Methods (count)
- `name` in `file` (line number)

## 🔄 Circular Dependencies (count)
1. module_a → module_b → module_a
```

### HTML (codemap_analysis.html)

Красивий HTML звіт з метриками та таблицями.

## 🔍 Алгоритми

### Виявлення мертвого коду

```
Для кожної функції:
  1. Знайти визначення функції (AST або regex)
  2. Перевірити, чи функція викликається де-небудь
  3. Якщо не викликається → додати до unused_functions
  
Для приватних методів:
  1. Знайти приватні методи (починаються з _)
  2. Перевірити, чи викликаються в межах файлу
  3. Якщо не викликаються → додати до unused_private_methods
```

### Виявлення циклічних залежностей

```
1. Побудувати граф залежностей (NetworkX DiGraph)
2. Використати nx.simple_cycles() для пошуку циклів
3. Повернути перші 10 циклів
```

### Розрахунок метрик

```
average_imports_per_file = sum(imports) / count(files)
average_functions_per_file = sum(functions) / count(files)
max_dependency_depth = diameter(undirected_graph)
```

## 🔌 Інтеграція з Windsurf

### Способ 1: Workflows

Workflows викликають `codemap_analyzer.py --once` і повертають результати.

```
User → Ctrl+L → /update-codemap
       ↓
Windsurf запускає workflow
       ↓
Workflow запускає python3 codemap_analyzer.py --once
       ↓
Аналізатор генерує reports/
       ↓
Workflow повертає @reports/CODEMAP_SUMMARY.md
       ↓
Cascade читає звіт
       ↓
Cascade матиме 100% контекст
```

### Способ 2: Pre-commit Hook

При кожному `git commit`:
1. Pre-commit запускає `codemap_analyzer.py --once`
2. Звіти оновлюються
3. Коміт проходить

### Способ 3: Watch Mode

```bash
python3 codemap_analyzer.py --watch
```

Аналізатор постійно спостерігає за змінами і оновлює звіти.

## 🚀 Розширюваність

### Додати нову мову

1. Додати розширення в `config.yaml`
2. Реалізувати `_analyze_<language>_file()`
3. Парсити код (AST або regex)
4. Додавати дані в структури

### Додати новий формат звіту

1. Реалізувати `_generate_<format>_report()`
2. Додати формат в `config.yaml`
3. Генерувати звіт

### Додати нове правило

1. Реалізувати логіку в `_detect_dead_code()` або новому методі
2. Додати результати в `self.unused_items`
3. Включити в звіти

## 📈 Масштабованість

### Для великих проєктів

1. **Виключи папки** в `config.yaml`:
   ```yaml
   exclude_paths:
     - "node_modules"
     - "__pycache__"
     - "dist"
   ```

2. **Паралелізація** (майбутня версія):
   ```python
   from concurrent.futures import ThreadPoolExecutor
   with ThreadPoolExecutor(max_workers=4) as executor:
       executor.map(self._analyze_file, files)
   ```

3. **Кешування** (майбутня версія):
   ```python
   if file_hash == cached_hash:
       skip_analysis()
   ```

## 🔐 Безпека

- Не виконує код — тільки парсить
- Не передає дані на сервер
- Локальна обробка
- Звіти зберігаються локально

## 📝 Ліцензія

MIT
