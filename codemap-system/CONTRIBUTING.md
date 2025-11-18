# 🤝 Розробка та розширення

Інструкція для розробників, які хочуть розширити Codemap Analyzer.

## 🏗️ Архітектура

### Основна структура

```python
class CodeAnalyzer:
    def __init__(self, config_path: str)
    def analyze_project(self) -> Dict
    def generate_reports(self, summary: Dict)
    def watch_and_update(self)
```

### Методи аналізу

```python
def _collect_files(self) -> List[Path]
def _analyze_file(self, file_path: Path)
def _analyze_python_file(self, file_path: Path, content: str)
def _analyze_javascript_file(self, file_path: Path, content: str)
def _detect_dead_code(self)
def _detect_cycles(self) -> List[List[str]]
def _calculate_complexity(self) -> Dict
```

### Методи генерації звітів

```python
def _generate_json_report(self, summary: Dict)
def _generate_markdown_report(self, summary: Dict)
def _generate_html_report(self, summary: Dict)
```

## 🔧 Додавання нової мови

### Крок 1: Додай розширення в config.yaml

```yaml
file_extensions:
  - ".py"
  - ".js"
  - ".ts"
  - ".go"  # ← Нова мова
```

### Крок 2: Додай метод аналізу в codemap_analyzer.py

```python
def _analyze_file(self, file_path: Path):
    """Analyze a single file for imports, functions, and calls"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        if file_path.suffix == ".py":
            self._analyze_python_file(file_path, content)
        elif file_path.suffix in [".js", ".ts", ".tsx", ".jsx"]:
            self._analyze_javascript_file(file_path, content)
        elif file_path.suffix == ".go":  # ← Нова мова
            self._analyze_go_file(file_path, content)
    
    except Exception as e:
        print(f"⚠️  Error analyzing {file_path}: {e}")

def _analyze_go_file(self, file_path: Path, content: str):
    """Analyze Go file"""
    import re
    
    rel_path = str(file_path.relative_to(self.project_root))
    
    # Find imports
    import_pattern = r'import\s+(?:\(\s*)?["\']([^"\']+)["\']'
    for match in re.finditer(import_pattern, content):
        module = match.group(1)
        self.file_imports[rel_path].add(module)
        self.dependency_graph.add_edge(rel_path, module)
    
    # Find function definitions
    func_pattern = r'func\s+(?:\([^)]*\)\s+)?(\w+)\s*\('
    for match in re.finditer(func_pattern, content):
        func_name = match.group(1)
        self.function_definitions[rel_path][func_name] = {
            "lineno": content[:match.start()].count('\n') + 1,
            "is_private": func_name[0].islower()
        }
    
    # Find function calls
    call_pattern = r'(\w+)\s*\('
    for match in re.finditer(call_pattern, content):
        self.function_calls[rel_path].add(match.group(1))
```

### Крок 3: Тестування

```bash
# Додай Go файл в приклад
cat > example_project/main.go << 'EOF'
package main

import "fmt"

func main() {
    fmt.Println("Hello")
}

func unused() {
    fmt.Println("Not used")
}
EOF

# Запусти аналізатор
python3 codemap_analyzer.py --once

# Перевір результати
cat reports/CODEMAP_SUMMARY.md
```

## 📊 Додавання нового формату звіту

### Крок 1: Додай формат в config.yaml

```yaml
output:
  formats:
    - "json"
    - "html"
    - "markdown"
    - "csv"  # ← Новий формат
```

### Крок 2: Додай метод генерації

```python
def _generate_csv_report(self, summary: Dict[str, Any]):
    """Generate CSV report"""
    import csv
    
    report_path = self.reports_dir / "codemap_analysis.csv"
    
    with open(report_path, 'w', newline='') as f:
        writer = csv.writer(f)
        
        # Header
        writer.writerow(['Type', 'File', 'Name', 'Line'])
        
        # Dead code
        for item in summary['dead_code']['functions']:
            writer.writerow(['Unused Function', item['file'], item['name'], item['line']])
        
        for item in summary['dead_code']['private_methods']:
            writer.writerow(['Unused Private Method', item['file'], item['name'], item['line']])
```

### Крок 3: Додай в generate_reports()

```python
def generate_reports(self, summary: Dict[str, Any]):
    """Generate reports in multiple formats"""
    formats = self.config.get("output", {}).get("formats", ["json", "markdown"])
    
    if "json" in formats:
        self._generate_json_report(summary)
    
    if "markdown" in formats:
        self._generate_markdown_report(summary)
    
    if "html" in formats:
        self._generate_html_report(summary)
    
    if "csv" in formats:  # ← Новий формат
        self._generate_csv_report(summary)
```

## 🔍 Додавання нового правила для мертвого коду

### Крок 1: Додай правило в config.yaml

```yaml
dead_code_rules:
  unused_functions: true
  unused_variables: true
  unused_imports: true
  unused_private_methods: true
  unused_constants: true  # ← Нове правило
```

### Крок 2: Реалізуй логіку

```python
def _detect_dead_code(self):
    """Detect unused functions, variables, and imports"""
    rules = self.config.get("dead_code_rules", {})
    
    # ... існуючий код ...
    
    if rules.get("unused_constants"):
        # Знайти константи (UPPERCASE_NAME)
        for file_path, functions in self.function_definitions.items():
            # Логіка для констант
            pass
```

## 🧪 Тестування

### Запуск тестів

```bash
# Тестування на прикладі
python3 codemap_analyzer.py --once

# Перевірка звітів
ls reports/
cat reports/CODEMAP_SUMMARY.md
cat reports/codemap_analysis.json | jq
```

### Написання тестів

```python
# test_codemap.py
import unittest
from codemap_analyzer import CodeAnalyzer

class TestCodeAnalyzer(unittest.TestCase):
    def setUp(self):
        self.analyzer = CodeAnalyzer("config.yaml")
    
    def test_collect_files(self):
        files = self.analyzer._collect_files()
        self.assertGreater(len(files), 0)
    
    def test_analyze_project(self):
        summary = self.analyzer.analyze_project()
        self.assertIn("files_analyzed", summary)
        self.assertIn("total_functions", summary)
    
    def test_detect_cycles(self):
        self.analyzer.analyze_project()
        cycles = self.analyzer._detect_cycles()
        self.assertIsInstance(cycles, list)

if __name__ == '__main__':
    unittest.main()
```

Запуск тестів:

```bash
python3 -m unittest test_codemap.py
```

## 📝 Додавання нового workflow

### Крок 1: Створи файл

```bash
cat > .windsurf/workflows/my-custom-workflow.md << 'EOF'
# My Custom Workflow

Description

## Кроки

1. Запусти аналіз
   ```bash
   python3 codemap_analyzer.py --once
   ```

2. Прочитай звіт
   @reports/CODEMAP_SUMMARY.md

3. Твоя логіка
   ...
EOF
```

### Крок 2: Тестування

```
Ctrl+L → /my-custom-workflow
```

## 🚀 Оптимізація

### Паралелізація аналізу

```python
from concurrent.futures import ThreadPoolExecutor

def analyze_project(self) -> Dict[str, Any]:
    """Run full project analysis with parallelization"""
    files = self._collect_files()
    
    # Паралельний аналіз
    with ThreadPoolExecutor(max_workers=4) as executor:
        executor.map(self._analyze_file, files)
    
    # ... решта коду ...
```

### Кешування результатів

```python
def _analyze_file(self, file_path: Path):
    """Analyze a single file with caching"""
    file_hash = self._get_file_hash(file_path)
    
    # Перевір кеш
    if file_path in self.file_hashes and self.file_hashes[file_path] == file_hash:
        return  # Файл не змінився
    
    # Аналіз
    # ... код ...
    
    # Збережи хеш
    self.file_hashes[str(file_path)] = file_hash

def _get_file_hash(self, file_path: Path) -> str:
    """Get file hash for change detection"""
    import hashlib
    with open(file_path, 'rb') as f:
        return hashlib.md5(f.read()).hexdigest()
```

## 📚 Документація коду

### Docstrings

```python
def analyze_project(self) -> Dict[str, Any]:
    """
    Run full project analysis.
    
    Analyzes all files in the project, detects dependencies,
    dead code, and circular dependencies.
    
    Returns:
        Dict with analysis results including:
        - files_analyzed: number of files
        - total_functions: total functions found
        - dependency_graph: graph statistics
        - dead_code: unused code
        - cycles: circular dependencies
    """
    pass
```

### Type hints

```python
def _collect_files(self) -> List[Path]:
    """Collect all files to analyze based on config"""
    pass

def _analyze_file(self, file_path: Path) -> None:
    """Analyze a single file for imports, functions, and calls"""
    pass

def _detect_cycles(self) -> List[List[str]]:
    """Detect circular dependencies"""
    pass
```

## 🔄 Git Workflow

### Гілки

```bash
# Основна гілка
git checkout main

# Створи гілку для нової функції
git checkout -b feature/add-go-support

# Розробка
# ...

# Коміт
git add .
git commit -m "Add Go language support"

# Push
git push origin feature/add-go-support

# Pull Request на GitHub
```

### Коміти

```bash
# Хороший коміт
git commit -m "Add Go language support

- Implement _analyze_go_file() method
- Add .go extension to config
- Update documentation"

# Поганий коміт
git commit -m "fix"
```

## 📋 Чек-лист для нової функції

- [ ] Код написаний
- [ ] Тести написані
- [ ] Документація оновлена
- [ ] Приклади додані
- [ ] Коміти чисті
- [ ] Pull Request створений
- [ ] Code review пройдений
- [ ] Merged в main

## 🎯 Напрямки розвитку

### Короткострокові

- [ ] Додати Go, Java, C#
- [ ] Паралелізація аналізу
- [ ] Кешування результатів
- [ ] Більше форматів звітів (CSV, XML)

### Середньострокові

- [ ] Web UI для звітів
- [ ] REST API
- [ ] MCP Tool для Windsurf
- [ ] Інтеграція з SonarQube

### Довгострокові

- [ ] Machine Learning для виявлення паттернів
- [ ] Порівняння звітів (diff)
- [ ] Тренди (графіки змін)
- [ ] Хмарна синхронізація

## 📞 Контакти

Якщо у тебе є питання:

1. Перевір [ARCHITECTURE.md](ARCHITECTURE.md)
2. Перевір [FAQ.md](FAQ.md)
3. Запусти приклад
4. Відкрий issue на GitHub

---

**Дякуємо за розробку! 🚀**
