# 📦 Встановлення і налаштування

Повна інструкція для встановлення Codemap Analyzer.

## 🔧 Передумови

- **Python 3.8+** (перевір: `python3 --version`)
- **pip** (перевір: `pip --version`)
- **Windsurf** (опціонально, для інтеграції)

## 📥 Крок 1: Завантаження

### Способ 1: Клонування репозиторію

```bash
git clone https://github.com/yourusername/codemap.git
cd codemap
```

### Способ 2: Копіювання файлів

Скопіюй ці файли в твій проєкт:
- `codemap_analyzer.py`
- `config.yaml`
- `requirements.txt`
- `.windsurf/` (папка)
- `.pre-commit-config.yaml`

## 📚 Крок 2: Встановлення залежностей

```bash
# Встанови залежності Python
pip install -r requirements.txt

# Перевір встановлення
python3 -c "import networkx, yaml; print('✅ OK')"
```

## ⚙️ Крок 3: Налаштування

### 3.1 Налаштуй config.yaml

Відредагуй `config.yaml` для твого проєкту:

```yaml
project:
  name: "My Awesome Project"
  root: "./"  # Коренева папка твого проєкту

analysis:
  include_paths:
    - "src"      # Папки з кодом
    - "lib"
    - "app"
  exclude_paths:
    - "node_modules"
    - "__pycache__"
    - ".git"
    - "dist"
    - "build"
  file_extensions:
    - ".py"      # Мови для аналізу
    - ".js"
    - ".ts"
```

### 3.2 Перевір конфігурацію

```bash
# Запусти аналізатор з прикладом
python3 codemap_analyzer.py --once

# Перевір звіти
ls reports/
cat reports/CODEMAP_SUMMARY.md
```

## 🚀 Крок 4: Перший запуск

### 4.1 Запусти аналіз

```bash
python3 codemap_analyzer.py --once
```

Це створить звіти в папці `reports/`:
- `CODEMAP_SUMMARY.md` — для Cascade
- `codemap_analysis.json` — повні дані
- `codemap_analysis.html` — HTML звіт

### 4.2 Переглянь результати

```bash
# Markdown звіт
cat reports/CODEMAP_SUMMARY.md

# JSON дані
cat reports/codemap_analysis.json | jq

# HTML у браузері
open reports/codemap_analysis.html
```

## 🪟 Крок 5: Інтеграція з Windsurf (опціонально)

### 5.1 Перевір workflows

Workflows вже готові в `.windsurf/workflows/`:

```bash
ls .windsurf/workflows/
```

Ти повинен бачити:
- `update-codemap.md`
- `analyze-dead-code.md`
- `detect-cycles.md`
- `refactor-with-context.md`

### 5.2 Використання

Відкрий Windsurf і запусти Cascade:

```
Ctrl+L → /update-codemap
```

Cascade запустить аналізатор і отримає всю інформацію.

## 🔄 Крок 6: Автоматизація (опціонально)

### 6.1 Pre-commit Hook

Встанови pre-commit для автоматичного оновлення при кожному коміті:

```bash
# Встанови pre-commit
pip install pre-commit

# Встанови hook
pre-commit install

# Перевір
pre-commit run --all-files
```

Тепер при кожному `git commit` звіти автоматично оновляться.

### 6.2 Watch Mode

Запусти аналізатор у режимі спостереження:

```bash
python3 codemap_analyzer.py --watch
```

Аналізатор буде оновлювати звіти кожні 5 секунд.

### 6.3 Cron Job (Linux/Mac)

Додай в crontab:

```bash
crontab -e
```

Додай рядок:

```bash
0 9 * * * cd /path/to/codemap && python3 codemap_analyzer.py --once
```

Аналіз запускатиметься кожного дня о 9:00.

## ✅ Перевірка встановлення

Запусти цей скрипт для перевірки:

```bash
#!/bin/bash

echo "🔍 Перевіряю встановлення Codemap Analyzer..."

# Перевір Python
if ! command -v python3 &> /dev/null; then
    echo "❌ Python3 не встановлено"
    exit 1
fi
echo "✅ Python3: $(python3 --version)"

# Перевір залежності
python3 -c "import networkx, yaml, jinja2, pathspec" 2>/dev/null
if [ $? -ne 0 ]; then
    echo "❌ Залежності не встановлені"
    echo "   Запусти: pip install -r requirements.txt"
    exit 1
fi
echo "✅ Залежності встановлені"

# Перевір файли
for file in codemap_analyzer.py config.yaml requirements.txt; do
    if [ ! -f "$file" ]; then
        echo "❌ Файл не знайдено: $file"
        exit 1
    fi
done
echo "✅ Всі файли присутні"

# Запусти аналізатор
python3 codemap_analyzer.py --once > /dev/null 2>&1
if [ $? -ne 0 ]; then
    echo "❌ Помилка при запуску аналізатора"
    exit 1
fi
echo "✅ Аналізатор працює"

# Перевір звіти
if [ ! -f "reports/CODEMAP_SUMMARY.md" ]; then
    echo "❌ Звіти не створені"
    exit 1
fi
echo "✅ Звіти створені"

echo ""
echo "🎉 Встановлення успішне!"
echo ""
echo "Наступні кроки:"
echo "1. Запусти: python3 codemap_analyzer.py --once"
echo "2. Переглянь: cat reports/CODEMAP_SUMMARY.md"
echo "3. Windsurf: Ctrl+L → /update-codemap"
```

Зберегти як `check_install.sh` і запустити:

```bash
chmod +x check_install.sh
./check_install.sh
```

## 🐛 Розв'язання проблем

### Проблема: "ModuleNotFoundError: No module named 'yaml'"

**Рішення:**
```bash
pip install -r requirements.txt
```

### Проблема: "Permission denied"

**Рішення:**
```bash
chmod +x codemap_analyzer.py
python3 codemap_analyzer.py --once
```

### Проблема: "config.yaml not found"

**Рішення:**
Переконайся, що `config.yaml` в корені проєкту:
```bash
ls config.yaml
```

Або вкажи шлях:
```bash
python3 codemap_analyzer.py --config /path/to/config.yaml
```

### Проблема: Аналізатор повільний

**Рішення:** Виключи папки в `config.yaml`:
```yaml
exclude_paths:
  - "node_modules"
  - "__pycache__"
  - "dist"
  - "build"
  - "venv"
```

### Проблема: Cascade не бачить звіти

**Рішення:**
1. Запусти `/update-codemap` workflow
2. Перевір, що `reports/CODEMAP_SUMMARY.md` існує
3. Перезавантаж Windsurf

## 📋 Чек-лист встановлення

- [ ] Python 3.8+ встановлено
- [ ] Залежності встановлені (`pip install -r requirements.txt`)
- [ ] `config.yaml` налаштований
- [ ] Аналізатор запущений (`python3 codemap_analyzer.py --once`)
- [ ] Звіти створені (`ls reports/`)
- [ ] Windsurf workflows готові (`.windsurf/workflows/`)
- [ ] Pre-commit встановлений (опціонально)
- [ ] Watch mode тестований (опціонально)

## 🎓 Наступні кроки

1. **Запусти аналіз:**
   ```bash
   python3 codemap_analyzer.py --once
   ```

2. **Переглянь звіти:**
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

## 📞 Підтримка

Якщо щось не працює:

1. Перевір `README.md` — основна документація
2. Перевір `QUICKSTART.md` — швидкий старт
3. Перевір `FAQ.md` — часті запитання
4. Запусти `./check_install.sh` — перевірка встановлення

---

**Готово! Твоя система аналізу коду встановлена! 🚀**
