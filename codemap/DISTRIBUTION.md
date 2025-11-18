# 📦 Розповсюдження

Як розповсюджувати Codemap Analyzer іншим розробникам.

## 📋 Що включити

### Обов'язкові файли

```
codemap/
├── codemap_analyzer.py          # Основний модуль
├── config.yaml                  # Конфігурація
├── requirements.txt             # Залежності
├── .windsurf/                   # Windsurf workflows
│   ├── workflows/
│   │   ├── update-codemap.md
│   │   ├── analyze-dead-code.md
│   │   ├── detect-cycles.md
│   │   └── refactor-with-context.md
│   └── settings.json
├── .pre-commit-config.yaml      # Pre-commit hook
├── README.md                    # Основна документація
├── QUICKSTART.md                # Швидкий старт
└── START_HERE.md                # Точка входу
```

### Документація

```
├── INSTALL.md                   # Встановлення
├── INTEGRATION_GUIDE.md         # Інтеграція з Windsurf
├── ARCHITECTURE.md              # Архітектура
├── FAQ.md                       # Часті запитання
├── EXAMPLES.md                  # Приклади
├── PROJECT_SUMMARY.md           # Резюме
└── SETUP_FOR_YOUR_PROJECT.md    # Налаштування
```

### Опціональні файли

```
├── example_project/             # Приклад (можна видалити)
├── reports/                     # Звіти (генеруються)
└── DISTRIBUTION.md              # Цей файл
```

## 🚀 Способи розповсюдження

### Способ 1: Git Repository

```bash
# Клонування
git clone https://github.com/yourusername/codemap.git
cd codemap

# Встановлення
pip install -r requirements.txt

# Запуск
python3 codemap_analyzer.py --once
```

### Способ 2: ZIP Archive

```bash
# Створення архіву
zip -r codemap.zip \
  codemap_analyzer.py \
  config.yaml \
  requirements.txt \
  .windsurf/ \
  .pre-commit-config.yaml \
  *.md

# Розповсюдження
# Відправ codemap.zip розробникам

# Розпакування
unzip codemap.zip
pip install -r requirements.txt
python3 codemap_analyzer.py --once
```

### Способ 3: Python Package

```bash
# Створення setup.py
cat > setup.py << 'EOF'
from setuptools import setup

setup(
    name='codemap-analyzer',
    version='1.0.0',
    description='Code analysis for Windsurf Cascade',
    py_modules=['codemap_analyzer'],
    install_requires=[
        'networkx==3.2',
        'pyyaml==6.0',
        'jinja2==3.1.2',
        'pathspec==0.11.2',
    ],
    entry_points={
        'console_scripts': [
            'codemap=codemap_analyzer:main',
        ],
    },
)
EOF

# Встановлення
pip install .

# Запуск
codemap --once
```

### Способ 4: Docker

```bash
# Створення Dockerfile
cat > Dockerfile << 'EOF'
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install -r requirements.txt

COPY codemap_analyzer.py .
COPY config.yaml .

CMD ["python3", "codemap_analyzer.py", "--once"]
EOF

# Побудова
docker build -t codemap-analyzer .

# Запуск
docker run -v $(pwd):/app codemap-analyzer
```

## 📋 Інструкції для розробників

### Для новачка

1. Прочитай [`START_HERE.md`](START_HERE.md)
2. Запусти [`QUICKSTART.md`](QUICKSTART.md)
3. Налаштуй [`SETUP_FOR_YOUR_PROJECT.md`](SETUP_FOR_YOUR_PROJECT.md)

### Для досвідченого розробника

1. Встанови залежності: `pip install -r requirements.txt`
2. Налаштуй `config.yaml`
3. Запусти: `python3 codemap_analyzer.py --once`
4. Інтегруй з Windsurf: `Ctrl+L → /update-codemap`

## 🔗 Посилання в документації

Переконайся, що всі посилання працюють:

```markdown
- [START_HERE.md](START_HERE.md) — точка входу
- [QUICKSTART.md](QUICKSTART.md) — швидкий старт
- [README.md](README.md) — основна документація
- [INSTALL.md](INSTALL.md) — встановлення
- [INTEGRATION_GUIDE.md](INTEGRATION_GUIDE.md) — інтеграція
- [ARCHITECTURE.md](ARCHITECTURE.md) — архітектура
- [FAQ.md](FAQ.md) — часті запитання
- [EXAMPLES.md](EXAMPLES.md) — приклади
- [PROJECT_SUMMARY.md](PROJECT_SUMMARY.md) — резюме
- [SETUP_FOR_YOUR_PROJECT.md](SETUP_FOR_YOUR_PROJECT.md) — налаштування
```

## 📝 Шаблон README для розповсюдження

```markdown
# Codemap Analyzer

Система для постійного аналізу кодових графів та інтеграції з Windsurf Cascade.

## 🚀 Швидкий старт

```bash
# Встановлення
pip install -r requirements.txt

# Запуск
python3 codemap_analyzer.py --once

# Результати
cat reports/CODEMAP_SUMMARY.md
```

## 📚 Документація

- [START_HERE.md](START_HERE.md) — почни звідси
- [QUICKSTART.md](QUICKSTART.md) — за 5 хвилин
- [README.md](README.md) — повна документація
- [FAQ.md](FAQ.md) — часті запитання

## 🪟 Windsurf

```
Ctrl+L → /update-codemap
```

## 📊 Можливості

- ✅ Граф залежностей
- ✅ Виявлення мертвого коду
- ✅ Циклічні залежності
- ✅ Метрики складності
- ✅ Інтеграція з Windsurf

## 📞 Підтримка

Див. [FAQ.md](FAQ.md) або [INSTALL.md](INSTALL.md)
```

## 🎯 Чек-лист розповсюдження

- [ ] Всі файли включені
- [ ] Всі посилання в документації працюють
- [ ] Приклад проєкту видалено (опціонально)
- [ ] Звіти очищені (опціонально)
- [ ] `requirements.txt` актуальний
- [ ] `config.yaml` налаштований для прикладу
- [ ] Workflows готові
- [ ] Документація повна
- [ ] README актуальний
- [ ] Тестовано на чистій системі

## 📦 Версіонування

### Версія 1.0.0

**Функції:**
- Парсинг Python (AST)
- Парсинг JavaScript/TypeScript (regex)
- Граф залежностей (NetworkX)
- Виявлення мертвого коду
- Виявлення циклічних залежностей
- Генерація звітів (JSON, Markdown, HTML)
- Windsurf workflows
- Pre-commit hook

**Файли:**
- `codemap_analyzer.py`
- `config.yaml`
- `requirements.txt`
- `.windsurf/`
- `.pre-commit-config.yaml`
- Документація (8 файлів)

## 🔄 Оновлення

### Для користувачів

```bash
# Оновлення з Git
git pull origin main

# Оновлення залежностей
pip install -r requirements.txt --upgrade
```

### Для розробників

1. Оновлюй `codemap_analyzer.py`
2. Оновлюй `requirements.txt` (якщо нові залежності)
3. Оновлюй документацію
4. Тегуй версію: `git tag v1.0.1`
5. Push: `git push origin main --tags`

## 📞 Контакти

Якщо розробники мають питання:

1. Перевір [FAQ.md](FAQ.md)
2. Перевір [EXAMPLES.md](EXAMPLES.md)
3. Запусти `python3 codemap_analyzer.py --once` і перевір помилки
4. Відкрий issue на GitHub

## 🎉 Готово!

Твоя система аналізу коду готова до розповсюдження! 🚀

---

**Розповсюджуй з гордістю! 🎉**
