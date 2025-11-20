# 🔧 Налаштування для твого проєкту

Інструкція для налаштування Codemap Analyzer для твого реального проєкту.

## 📋 Крок 1: Видалення прикладу

Приклад проєкту більше не потрібен. Видали його:

```bash
rm -rf example_project/
```

## 🎯 Крок 2: Налаштування config.yaml

Відредагуй `config.yaml` для твого проєкту:

### Для Python проєкту

```yaml
project:
  name: "My Python Project"
  root: "./"

analysis:
  include_paths:
    - "src"
    - "app"
    - "lib"
  exclude_paths:
    - "tests"
    - "venv"
    - "__pycache__"
    - ".pytest_cache"
    - "dist"
    - "build"
  file_extensions:
    - ".py"
  min_function_size: 3

output:
  reports_dir: "reports"
  formats:
    - "json"
    - "html"
    - "markdown"
  auto_update: true
  watch_interval: 5

dead_code_rules:
  unused_functions: true
  unused_variables: false
  unused_imports: true
  unused_private_methods: true

dependency_rules:
  detect_cycles: true
  max_depth: 5
  complexity_threshold: 10
```

### Для JavaScript проєкту

```yaml
project:
  name: "My JavaScript Project"
  root: "./"

analysis:
  include_paths:
    - "src"
    - "lib"
    - "components"
  exclude_paths:
    - "node_modules"
    - "dist"
    - "build"
    - "test"
    - ".next"
    - ".nuxt"
  file_extensions:
    - ".js"
    - ".jsx"
    - ".ts"
    - ".tsx"
  min_function_size: 3

output:
  reports_dir: "reports"
  formats:
    - "json"
    - "html"
    - "markdown"
  auto_update: true
  watch_interval: 5

dead_code_rules:
  unused_functions: true
  unused_variables: false
  unused_imports: true
  unused_private_methods: true

dependency_rules:
  detect_cycles: true
  max_depth: 5
  complexity_threshold: 10
```

### Для Go проєкту

```yaml
project:
  name: "My Go Project"
  root: "./"

analysis:
  include_paths:
    - "cmd"
    - "internal"
    - "pkg"
  exclude_paths:
    - "vendor"
    - "test"
    - ".git"
  file_extensions:
    - ".go"
  min_function_size: 3

output:
  reports_dir: "reports"
  formats:
    - "json"
    - "html"
    - "markdown"
  auto_update: true
  watch_interval: 5

dead_code_rules:
  unused_functions: true
  unused_private_methods: true

dependency_rules:
  detect_cycles: true
  max_depth: 5
  complexity_threshold: 10
```

### Для мішаного проєкту (Python + JavaScript)

```yaml
project:
  name: "My Full-Stack Project"
  root: "./"

analysis:
  include_paths:
    - "backend/src"
    - "backend/app"
    - "frontend/src"
    - "frontend/components"
  exclude_paths:
    - "node_modules"
    - "__pycache__"
    - "venv"
    - ".git"
    - "dist"
    - "build"
  file_extensions:
    - ".py"
    - ".js"
    - ".jsx"
    - ".ts"
    - ".tsx"
  min_function_size: 3

output:
  reports_dir: "reports"
  formats:
    - "json"
    - "html"
    - "markdown"
  auto_update: true
  watch_interval: 5

dead_code_rules:
  unused_functions: true
  unused_imports: true
  unused_private_methods: true

dependency_rules:
  detect_cycles: true
  max_depth: 5
  complexity_threshold: 10
```

## ✅ Крок 3: Перевірка налаштування

Запусти аналізатор для перевірки:

```bash
python3 codemap_analyzer.py --once
```

Перевір результати:

```bash
# Перевір, що звіти створені
ls reports/

# Перевір Markdown звіт
cat reports/CODEMAP_SUMMARY.md

# Перевір JSON дані
cat reports/codemap_analysis.json | jq '.files_analyzed'

# Перевір HTML звіт
open reports/codemap_analysis.html
```

## 🪟 Крок 4: Інтеграція з Windsurf

### 4.1 Перевір workflows

Workflows вже готові в `.windsurf/workflows/`:

```bash
ls .windsurf/workflows/
```

### 4.2 Тестування

Відкрий Windsurf і запусти Cascade:

```
Ctrl+L → /update-codemap
```

Cascade повинен запустити аналізатор і отримати інформацію.

## 🔄 Крок 5: Автоматизація

### 5.1 Pre-commit Hook

Встанови pre-commit для автоматичного оновлення при кожному коміті:

```bash
# Встанови pre-commit
pip install pre-commit

# Встанови hook
pre-commit install

# Перевір
pre-commit run --all-files
```

### 5.2 Watch Mode

Запусти аналізатор у режимі спостереження:

```bash
python3 codemap_analyzer.py --watch
```

Аналізатор буде оновлювати звіти кожні 5 секунд.

### 5.3 GitHub Actions (опціонально)

Створи файл `.github/workflows/codemap.yml`:

```yaml
name: Update Codemap

on:
  push:
    branches: [main, develop]

jobs:
  analyze:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      - run: pip install -r requirements.txt
      - run: python3 codemap_analyzer.py --once
      - uses: actions/upload-artifact@v3
        with:
          name: codemap-reports
          path: reports/
```

## 📊 Крок 6: Перевірка результатів

### 6.1 Граф залежностей

```bash
cat reports/codemap_analysis.json | jq '.dependency_graph'
```

Результат:
```json
{
  "nodes": 42,
  "edges": 128,
  "cycles": 3
}
```

### 6.2 Мертвий код

```bash
cat reports/codemap_analysis.json | jq '.dead_code.functions'
```

Результат:
```json
[
  {
    "file": "src/utils.py",
    "name": "old_helper",
    "line": 45
  },
  ...
]
```

### 6.3 Циклічні залежності

```bash
cat reports/codemap_analysis.json | jq '.cycles'
```

Результат:
```json
[
  ["module_a", "module_b", "module_a"],
  ["service_x", "service_y", "service_z", "service_x"]
]
```

### 6.4 Метрики

```bash
cat reports/codemap_analysis.json | jq '.complexity_metrics'
```

Результат:
```json
{
  "average_imports_per_file": 3.5,
  "average_functions_per_file": 4.2,
  "max_dependency_depth": 5
}
```

## 🎯 Крок 7: Використання з Windsurf

### Способ 1: Workflows

```
Ctrl+L → /update-codemap
Ctrl+L → /analyze-dead-code
Ctrl+L → /detect-cycles
Ctrl+L → /refactor-with-context
```

### Способ 2: Ручне запитання

```
Ctrl+L
Покажи граф залежностей для цього файлу
@reports/CODEMAP_SUMMARY.md
```

### Способ 3: Запитання про архітектуру

```
Ctrl+L
Поясни архітектуру проєкту за 5 речень
@reports/CODEMAP_SUMMARY.md
```

## 🚀 Крок 8: Налаштування IDE (опціонально)

### VS Code

Створи `.vscode/tasks.json`:

```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Update Codemap",
      "type": "shell",
      "command": "python3 codemap_analyzer.py --once",
      "group": {
        "kind": "build",
        "isDefault": true
      }
    },
    {
      "label": "Watch Codemap",
      "type": "shell",
      "command": "python3 codemap_analyzer.py --watch",
      "isBackground": true
    }
  ]
}
```

Запусти з VS Code:
- Ctrl+Shift+B → "Update Codemap"
- Ctrl+Shift+B → "Watch Codemap"

### PyCharm

1. Run → Edit Configurations
2. Add new Python configuration
3. Script: `codemap_analyzer.py`
4. Parameters: `--once`
5. Run: Ctrl+Shift+F10

## 📝 Крок 9: Документація

Додай до твого `README.md`:

```markdown
## Code Analysis

This project uses Codemap Analyzer for continuous code analysis.

### Running Analysis

```bash
# One-time analysis
python3 codemap_analyzer.py --once

# Continuous watching
python3 codemap_analyzer.py --watch
```

### Reports

- `reports/CODEMAP_SUMMARY.md` — Summary for Cascade
- `reports/codemap_analysis.json` — Full data
- `reports/codemap_analysis.html` — HTML report

### Windsurf Integration

```
Ctrl+L → /update-codemap
```

See [Codemap Analyzer](codemap_analyzer.py) for details.
```

## ✅ Чек-лист налаштування

- [ ] Видалено приклад проєкту (`rm -rf example_project/`)
- [ ] Налаштовано `config.yaml` для твого проєкту
- [ ] Запущено аналізатор (`python3 codemap_analyzer.py --once`)
- [ ] Перевірено звіти (`ls reports/`)
- [ ] Тестовано з Windsurf (`Ctrl+L → /update-codemap`)
- [ ] Встановлено pre-commit (`pre-commit install`)
- [ ] Налаштовано IDE (опціонально)
- [ ] Додано до документації

## 🎉 Готово!

Твоя система аналізу коду налаштована для твого проєкту!

### Наступні кроки:

1. **Запусти аналіз:**
   ```bash
   python3 codemap_analyzer.py --once
   ```

2. **Переглянь результати:**
   ```bash
   cat reports/CODEMAP_SUMMARY.md
   ```

3. **Використовуй з Windsurf:**
   ```
   Ctrl+L → /update-codemap
   ```

4. **Налаштуй автоматизацію:**
   ```bash
   pre-commit install
   ```

---

**Готово! Твоя система аналізу коду для Windsurf Cascade працює! 🚀**
