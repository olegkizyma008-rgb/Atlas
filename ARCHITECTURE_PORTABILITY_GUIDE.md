# 📁 Гайд портативності архітектурної системи

**Дата**: 22 листопада 2025  
**Статус**: ✅ ГОТОВО  
**Версія**: 1.0.0

---

## 🎯 Що це?

Архітектурна система тепер **повністю портативна** — можна копіювати `codemap-system/` на інші проекти без змін коду.

---

## 🚀 Як використовувати на іншому проекті

### Крок 1: Скопіювати папку

```bash
# Скопіюємо codemap-system з atlas4
cp -r /Users/dev/Documents/GitHub/atlas4/codemap-system /path/to/other_project/

# Або скопіюємо з архіву
cp -r codemap-system /path/to/other_project/
```

### Крок 2: Налаштувати конфігурацію

```bash
cd /path/to/other_project/codemap-system

# Редагуємо .env.architecture
nano .env.architecture
```

**Змінюємо PROJECT_ROOT**:

```bash
# Якщо інший проект в батьківській папці
PROJECT_ROOT=..

# Або абсолютний шлях
PROJECT_ROOT=/path/to/other_project
```

### Крок 3: Встановити залежності

```bash
pip install -r requirements.txt
```

### Крок 4: Запустити

```bash
# Запустити MCP сервер
python3 mcp_architecture_server.py

# Або запустити аналіз
python3 << 'PYTHON'
from architecture_mapper import ArchitectureMapper
mapper = ArchitectureMapper()
result = mapper.analyze_architecture()
print(result)
PYTHON
```

---

## 📋 Структура конфігурації

### Відносні шляхи

```bash
# Батьківська папка (найчастіше)
PROJECT_ROOT=..

# Поточна папка
PROJECT_ROOT=.

# Вложена папка
PROJECT_ROOT=../my_project

# Кілька рівнів вище
PROJECT_ROOT=../../my_project
```

### Абсолютні шляхи

```bash
# Linux/Mac
PROJECT_ROOT=/home/user/projects/my_project

# Windows
PROJECT_ROOT=C:\Users\user\projects\my_project
```

---

## 🔧 Налаштування для різних проектів

### Проект 1: atlas4

```bash
# .env.architecture
PROJECT_ROOT=..
MAX_ANALYSIS_DEPTH=5
EXCLUDE_PATTERNS=node_modules,__pycache__,.git,.venv,dist,build,archive
```

### Проект 2: my_web_app

```bash
# .env.architecture
PROJECT_ROOT=..
MAX_ANALYSIS_DEPTH=3
EXCLUDE_PATTERNS=node_modules,.git,.venv,dist,build
```

### Проект 3: my_python_project

```bash
# .env.architecture
PROJECT_ROOT=..
MAX_ANALYSIS_DEPTH=4
EXCLUDE_PATTERNS=__pycache__,.git,.venv,dist,build,.egg-info
```

---

## 📁 Структура папок

### Для atlas4

```
atlas4/
├── codemap-system/
│   ├── .env.architecture          (PROJECT_ROOT=..)
│   ├── mcp_architecture_server.py
│   ├── requirements.txt
│   ├── logs/
│   ├── reports/
│   └── .cache/
├── orchestrator/
├── web/
└── ... (весь проект)
```

### Для іншого проекту

```
my_project/
├── codemap-system/
│   ├── .env.architecture          (PROJECT_ROOT=..)
│   ├── mcp_architecture_server.py
│   ├── requirements.txt
│   ├── logs/
│   ├── reports/
│   └── .cache/
├── src/
├── tests/
└── ... (весь проект)
```

---

## 🔄 Як копіювати

### Спосіб 1: Через Git

```bash
# Клонуємо atlas4
git clone https://github.com/user/atlas4.git

# Копіюємо codemap-system
cp -r atlas4/codemap-system /path/to/my_project/

# Налаштовуємо для my_project
cd /path/to/my_project/codemap-system
nano .env.architecture
# Змінюємо PROJECT_ROOT=..
```

### Спосіб 2: Через архів

```bash
# Архівуємо codemap-system
tar -czf codemap-system.tar.gz atlas4/codemap-system/

# Розпаковуємо в інший проект
cd /path/to/my_project
tar -xzf codemap-system.tar.gz

# Налаштовуємо
cd codemap-system
nano .env.architecture
```

### Спосіб 3: Через Docker

```bash
# Dockerfile
FROM python:3.9

WORKDIR /app

# Копіюємо codemap-system
COPY codemap-system /app/codemap-system
COPY . /app/project

# Встановлюємо залежності
RUN cd /app/codemap-system && pip install -r requirements.txt

# Запускаємо
CMD ["python3", "codemap-system/mcp_architecture_server.py"]
```

---

## ⚙️ Налаштування для CI/CD

### GitHub Actions

```yaml
name: Architecture Analysis

on: [push, pull_request]

jobs:
  analyze:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Set up Python
        uses: actions/setup-python@v2
        with:
          python-version: 3.9
      
      - name: Install dependencies
        run: |
          cd codemap-system
          pip install -r requirements.txt
      
      - name: Run analysis
        run: |
          cd codemap-system
          python3 << 'PYTHON'
          from mcp_architecture_server import ArchitectureAnalysisServer
          server = ArchitectureAnalysisServer()
          health = server._get_architecture_health()
          if health['score'] < 60:
              print("❌ Architecture health is below 60")
              exit(1)
          PYTHON
```

### GitLab CI

```yaml
architecture_analysis:
  stage: test
  image: python:3.9
  script:
    - cd codemap-system
    - pip install -r requirements.txt
    - python3 << 'PYTHON'
      from mcp_architecture_server import ArchitectureAnalysisServer
      server = ArchitectureAnalysisServer()
      health = server._get_architecture_health()
      if health['score'] < 60:
          print("❌ Architecture health is below 60")
          exit(1)
      PYTHON
```

---

## 🔍 Перевірка після копіювання

### Крок 1: Перевірити конфігурацію

```bash
cd codemap-system
cat .env.architecture | grep PROJECT_ROOT
```

**Результат**:
```
PROJECT_ROOT=..
```

### Крок 2: Перевірити залежності

```bash
pip list | grep -E "radon|networkx|pydantic"
```

**Результат**:
```
networkx                  3.5
pydantic                  2.12.0
radon                     6.1.1
```

### Крок 3: Запустити тест

```bash
python3 << 'PYTHON'
from architecture_mapper import ArchitectureMapper
mapper = ArchitectureMapper()
print(f"Project root: {mapper.project_root}")
print(f"Analysis root: {mapper.analysis_root}")
PYTHON
```

**Результат**:
```
Project root: /path/to/my_project
Analysis root: /path/to/my_project
```

### Крок 4: Запустити аналіз

```bash
python3 << 'PYTHON'
from mcp_architecture_server import ArchitectureAnalysisServer
server = ArchitectureAnalysisServer()
overview = server._get_architecture_overview()
print(overview)
PYTHON
```

---

## 🐛 Налагодження

### Проблема: "Project root not found"

```bash
# Перевірте .env.architecture
cat .env.architecture | grep PROJECT_ROOT

# Перевірте, чи існує папка
ls -la ..

# Спробуйте абсолютний шлях
nano .env.architecture
# PROJECT_ROOT=/абсолютний/шлях
```

### Проблема: "Files not found"

```bash
# Перевірте, чи аналізуються файли
python3 << 'PYTHON'
from architecture_mapper import ArchitectureMapper
mapper = ArchitectureMapper()
files = mapper._find_workflow_files()
print(f"Found {len(files)} files")
for f in files[:5]:
    print(f"  - {f}")
PYTHON
```

### Проблема: "Permission denied"

```bash
# Дайте права на виконання
chmod +x codemap-system/mcp_architecture_server.py

# Дайте права на читання
chmod -R 755 codemap-system/
```

---

## 📚 Файли для копіювання

### Обов'язкові

- ✅ `mcp_architecture_server.py`
- ✅ `architecture_mapper.py`
- ✅ `mcp_architecture_tools.py`
- ✅ `requirements.txt`
- ✅ `.env.architecture` або `.env.architecture.example`

### Опціональні

- 📁 `logs/` (буде створена автоматично)
- 📁 `reports/` (буде створена автоматично)
- 📁 `.cache/` (буде створена автоматично)

### НЕ копіювати

- ❌ `logs/*` (старі логи)
- ❌ `reports/*` (старі звіти)
- ❌ `.cache/*` (старий кеш)
- ❌ `__pycache__/` (скомпільовані файли)

---

## ✅ Чек-лист портативності

- [ ] Скопіював `codemap-system/` на новий проект
- [ ] Редагував `PROJECT_ROOT` в `.env.architecture`
- [ ] Встановив залежності (`pip install -r requirements.txt`)
- [ ] Перевірив конфігурацію (`cat .env.architecture`)
- [ ] Запустив тест (`python3 architecture_mapper.py`)
- [ ] Запустив аналіз (`python3 mcp_architecture_server.py`)
- [ ] Перевірив звіти (`ls -la reports/`)
- [ ] Перевірив логи (`tail -f logs/architecture_server.log`)

---

## 🎯 Наступні кроки

1. **Скопіюйте** `codemap-system/` на новий проект
2. **Налаштуйте** `PROJECT_ROOT` в `.env.architecture`
3. **Встановіть** залежності
4. **Запустіть** аналіз
5. **Перевірте** звіти

---

**Версія**: 1.0.0  
**Статус**: ✅ ГОТОВО  
**Дата**: 22 листопада 2025
