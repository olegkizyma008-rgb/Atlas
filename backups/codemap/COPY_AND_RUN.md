# 📋 Копіювання та запуск

Як скопіювати Codemap Analyzer в свій проєкт і запустити його.

## 🚀 Найпростіший спосіб (2 хвилини)

### Крок 1: Скопіюй папку

```bash
# Скопіюй всю папку codemap
cp -r /path/to/codemap /path/to/your/project/codemap

# Або якщо це Git репозиторій
git clone https://github.com/yourusername/codemap.git /path/to/your/project/codemap
```

### Крок 2: Перейди в папку

```bash
cd /path/to/your/project/codemap
```

### Крок 3: Запусти розгортання

```bash
./deploy.sh
```

### Готово! ✅

Система розгорнута і працює в режимі постійного спостереження.

## 📊 Що буде після запуску

```
✅ Встановлені залежності
✅ Запущено перший аналіз
✅ Створені звіти в reports/
✅ Налаштовано Windsurf
✅ Запущено постійне спостереження
```

## 🎯 Використання

### Windsurf

```
Ctrl+L → /update-codemap
```

### Зупинення

```
Ctrl+C
```

### Повторне запущення

```bash
./deploy.sh
```

## 📁 Структура після розгортання

```
codemap/
├── deploy.sh                    # Скрипт розгортання ✅
├── codemap_analyzer.py          # Основний модуль
├── config.yaml                  # Конфігурація
├── requirements.txt             # Залежності
├── .windsurf/                   # Windsurf workflows
├── reports/                     # Звіти (створюються)
│   ├── CODEMAP_SUMMARY.md
│   ├── codemap_analysis.json
│   └── codemap_analysis.html
└── ... (інші файли)
```

## 🔧 Налаштування для твого проєкту

Перед запуском `./deploy.sh` (опціонально):

```bash
# Відредагуй config.yaml
vim config.yaml
```

Змінь:

```yaml
project:
  name: "My Project"
  root: "./"

analysis:
  include_paths:
    - "src"      # Твої папки
    - "lib"
  exclude_paths:
    - "node_modules"
    - "__pycache__"
```

Потім запусти:

```bash
./deploy.sh
```

## 📊 Звіти

Після розгортання в папці `reports/`:

```bash
# Переглянь Markdown звіт
cat reports/CODEMAP_SUMMARY.md

# Переглянь JSON дані
cat reports/codemap_analysis.json | jq

# Переглянь HTML звіт
open reports/codemap_analysis.html
```

## 🪟 Windsurf Workflows

Після розгортання можеш використовувати:

```
Ctrl+L → /update-codemap
Ctrl+L → /analyze-dead-code
Ctrl+L → /detect-cycles
Ctrl+L → /refactor-with-context
```

## 🔄 Постійне спостереження

Після розгортання система автоматично:

1. **Спостерігає за змінами** — кожні 5 секунд
2. **Оновлює звіти** — при кожній зміні
3. **Надає Cascade інформацію** — завжди актуальну

```bash
# Логи постійного спостереження
👁️  Watching for changes...
✅ Analysis complete at 20:30:45
✅ Analysis complete at 20:30:50
✅ Analysis complete at 20:30:55
```

## 🛑 Зупинення

```bash
# Натисни Ctrl+C в терміналі
^C

# Або в іншому терміналі
pkill -f "codemap_analyzer.py --watch"
```

## 🔄 Перезапуск

```bash
# Зупини поточний процес
Ctrl+C

# Запусти знову
./deploy.sh
```

## 📝 Логи

Скрипт показує детальний прогрес:

```
🚀 CODEMAP ANALYZER - РОЗГОРТАННЯ

╔════════════════════════════════════════════════════════════╗
║ 📋 КРОК 1: ПЕРЕВІРКИ
╚════════════════════════════════════════════════════════════╝

▶ Перевіряю Python...
✅ Python3: 3.11

▶ Перевіряю pip...
✅ pip3: 24.0

▶ Перевіряю файли проєкту...
✅ Всі необхідні файли присутні

▶ Перевіряю Windsurf workflows...
✅ Workflows готові (4 файлів)

╔════════════════════════════════════════════════════════════╗
║ 📦 КРОК 2: ВСТАНОВЛЕННЯ
╚════════════════════════════════════════════════════════════╝

▶ Встановлюю залежності Python...
✅ Залежності встановлені

▶ Перевіряю залежності...
✅ Всі залежності доступні

╔════════════════════════════════════════════════════════════╗
║ ⚙️ КРОК 3: НАЛАШТУВАННЯ
╚════════════════════════════════════════════════════════════╝

▶ Створюю папку для звітів...
✅ Папка reports/ готова

▶ Налаштовую Windsurf...
✅ Windsurf налаштування готові

▶ Налаштовую pre-commit hook...
✅ Pre-commit hook встановлено

╔════════════════════════════════════════════════════════════╗
║ 🔍 КРОК 4: ПЕРШИЙ АНАЛІЗ
╚════════════════════════════════════════════════════════════╝

▶ Запускаю перший аналіз проєкту...

🔍 Starting project analysis...
📁 Found 42 files to analyze
✅ Reports generated in reports/

▶ Перевіряю звіти...
✅ Всі звіти створені

╔════════════════════════════════════════════════════════════╗
║ 🎉 РОЗГОРТАННЯ ЗАВЕРШЕНО!
╚════════════════════════════════════════════════════════════╝

Система готова до роботи!

📊 Звіти створені в: reports/
  - CODEMAP_SUMMARY.md (для Cascade)
  - codemap_analysis.json (повні дані)
  - codemap_analysis.html (HTML звіт)

🪟 Windsurf workflows готові:
  - /update-codemap
  - /analyze-dead-code
  - /detect-cycles
  - /refactor-with-context

🔄 Запускаю постійне спостереження...
   (Звіти будуть оновлюватися при кожній зміні коду)

Щоб зупинити: Ctrl+C

👁️  Watching for changes...
✅ Analysis complete at 20:30:45
✅ Analysis complete at 20:30:50
✅ Analysis complete at 20:30:55
```

## ✅ Чек-лист

- [ ] Скопіював папку `codemap`
- [ ] Перейшов в папку `cd codemap`
- [ ] Налаштував `config.yaml` (опціонально)
- [ ] Запустив `./deploy.sh`
- [ ] Чекав завершення розгортання
- [ ] Переглянув звіти в `reports/`
- [ ] Тестував workflows в Windsurf (`Ctrl+L → /update-codemap`)

## 🐛 Розв'язання проблем

### "Permission denied"

```bash
chmod +x deploy.sh
./deploy.sh
```

### "Python3 not found"

```bash
# macOS
brew install python3

# Ubuntu
sudo apt install python3

# Windows
# Завантаж з https://www.python.org
```

### "pip3 not found"

```bash
python3 -m pip install --upgrade pip
```

### "Залежності не встановлені"

```bash
pip3 install -r requirements.txt
./deploy.sh
```

### Система не запускається

```bash
# Перевір логи
python3 codemap_analyzer.py --once

# Перевір конфіг
cat config.yaml

# Перевір папку проєкту
ls -la
```

## 📞 Підтримка

Якщо щось не працює:

1. Перевір логи скрипту
2. Перевір `config.yaml`
3. Запусти вручну: `python3 codemap_analyzer.py --once`
4. Перевір помилки в консолі
5. Див. `FAQ.md` або `INSTALL.md`

## 🎉 Готово!

Твоя система аналізу коду розгорнута! 🚀

```bash
./deploy.sh
```

Cascade матиме 100% контекст твого проєкту! 🎉

---

**Дякуємо за використання Codemap Analyzer!**
