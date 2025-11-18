# 🧹 Очищення та підготовка до розповсюдження

Інструкція для очищення проєкту перед розповсюдженням.

## 📋 Що видалити (опціонально)

### 1. Приклад проєкту

Якщо ти розповсюджуєш для реальних проєктів, видали приклад:

```bash
rm -rf example_project/
```

### 2. Генеровані звіти

Видали звіти, які були створені під час розробки:

```bash
rm -rf reports/
```

### 3. Оригінальний файл з набросками

Видали оригінальний файл з набросками:

```bash
rm codemep.md
```

### 4. Цей файл (опціонально)

Якщо ти не хочеш розповсюджувати інструкції для очищення:

```bash
rm CLEANUP.md
```

## ✅ Що залишити

### Обов'язкові файли

```
✅ codemap_analyzer.py          # Основний модуль
✅ config.yaml                  # Конфігурація
✅ requirements.txt             # Залежності
✅ .windsurf/                   # Windsurf workflows
✅ .pre-commit-config.yaml      # Pre-commit hook
```

### Документація

```
✅ START_HERE.md                # Точка входу
✅ README.md                    # Основна документація
✅ QUICKSTART.md                # Швидкий старт
✅ INSTALL.md                   # Встановлення
✅ INTEGRATION_GUIDE.md         # Інтеграція з Windsurf
✅ ARCHITECTURE.md              # Архітектура
✅ FAQ.md                       # Часті запитання
✅ EXAMPLES.md                  # Приклади
✅ PROJECT_SUMMARY.md           # Резюме
✅ SETUP_FOR_YOUR_PROJECT.md    # Налаштування
✅ CONTRIBUTING.md              # Розробка
✅ DISTRIBUTION.md              # Розповсюдження
✅ FINAL_SUMMARY.md             # Фінальне резюме
```

## 🧹 Скрипт для очищення

```bash
#!/bin/bash

echo "🧹 Cleaning up Codemap Analyzer..."

# Remove example project
if [ -d "example_project" ]; then
    rm -rf example_project/
    echo "✅ Removed example_project/"
fi

# Remove generated reports
if [ -d "reports" ]; then
    rm -rf reports/
    echo "✅ Removed reports/"
fi

# Remove original sketches
if [ -f "codemep.md" ]; then
    rm codemep.md
    echo "✅ Removed codemep.md"
fi

# Remove __pycache__
if [ -d "__pycache__" ]; then
    rm -rf __pycache__/
    echo "✅ Removed __pycache__/"
fi

# Remove .pyc files
find . -name "*.pyc" -delete
echo "✅ Removed .pyc files"

echo ""
echo "🎉 Cleanup complete!"
echo ""
echo "Files remaining:"
ls -la | grep -v "^d" | grep -v "^total"
```

Зберегти як `cleanup.sh`:

```bash
chmod +x cleanup.sh
./cleanup.sh
```

## 📦 Підготовка до розповсюдження

### Крок 1: Очищення

```bash
./cleanup.sh
```

### Крок 2: Перевірка файлів

```bash
# Перевір, що залишилися правильні файли
ls -la

# Перевір, що документація повна
ls *.md | wc -l  # Повинно бути 13 файлів
```

### Крок 3: Тестування на чистій системі

```bash
# Створи тимчасову папку
mkdir /tmp/test_codemap
cd /tmp/test_codemap

# Скопіюй файли
cp -r /path/to/codemap/* .

# Встанови залежності
pip install -r requirements.txt

# Запусти аналізатор
python3 codemap_analyzer.py --once

# Перевір результати
cat reports/CODEMAP_SUMMARY.md
```

### Крок 4: Упакування

```bash
# ZIP архів
zip -r codemap.zip \
  codemap_analyzer.py \
  config.yaml \
  requirements.txt \
  .windsurf/ \
  .pre-commit-config.yaml \
  *.md \
  FIRST_RUN.sh

# Або Git
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/yourusername/codemap.git
git push -u origin main
```

## ✅ Чек-лист перед розповсюдженням

- [ ] Приклад проєкту видалено (опціонально)
- [ ] Генеровані звіти видалено (опціонально)
- [ ] Оригінальні наброски видалено (опціонально)
- [ ] `__pycache__` видалено
- [ ] `.pyc` файли видалено
- [ ] Всі документація файли присутні
- [ ] `codemap_analyzer.py` присутній
- [ ] `config.yaml` присутній
- [ ] `requirements.txt` присутній
- [ ] `.windsurf/` папка присутня
- [ ] `.pre-commit-config.yaml` присутній
- [ ] `FIRST_RUN.sh` присутній
- [ ] Тестовано на чистій системі
- [ ] Упаковано (ZIP або Git)

## 📊 Фінальна структура

```
codemap/
├── codemap_analyzer.py              # Основний модуль
├── config.yaml                      # Конфігурація
├── requirements.txt                 # Залежності
├── FIRST_RUN.sh                     # Скрипт першого запуску
├── .windsurf/
│   ├── workflows/
│   │   ├── update-codemap.md
│   │   ├── analyze-dead-code.md
│   │   ├── detect-cycles.md
│   │   └── refactor-with-context.md
│   └── settings.json
├── .pre-commit-config.yaml
├── START_HERE.md
├── README.md
├── QUICKSTART.md
├── INSTALL.md
├── INTEGRATION_GUIDE.md
├── ARCHITECTURE.md
├── FAQ.md
├── EXAMPLES.md
├── PROJECT_SUMMARY.md
├── SETUP_FOR_YOUR_PROJECT.md
├── CONTRIBUTING.md
├── DISTRIBUTION.md
└── FINAL_SUMMARY.md
```

## 🎉 Готово!

Твоя система аналізу коду готова до розповсюдження! 🚀

---

**Дякуємо за використання Codemap Analyzer!**
