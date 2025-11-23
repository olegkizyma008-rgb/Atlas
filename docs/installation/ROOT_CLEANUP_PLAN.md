# 🧹 План Очистки Кореня та Організації Файлів

**Дата:** 23 листопада 2025, 04:55 UTC+02:00  
**Версія:** 1.0  
**Статус:** ✅ План готовий

---

## 📊 Поточна Ситуація в Корені

### Файли що Потребують Переміщення

#### 1. **TXT Файли (Звіти)** - 9 файлів
```
ANALYSIS_COMPLETE.txt
ANALYSIS_SUMMARY.txt
DEPENDENCY_GRAPH_QUICKSTART.txt
DOCUMENTS_MANIFEST.txt
ENHANCEMENT_COMPLETION.txt
FINAL_SUMMARY.txt
FINAL_SUMMARY_2025-11-20.txt
INTEGRATION_COMPLETE.txt
MCP_SERVER_STATUS.txt
```
**Куди:** `docs/reports/` (новий каталог)

#### 2. **JSON Файли (Статистика)** - 1 файл
```
ARCHITECTURE_STATISTICS.json
```
**Куди:** `codemap-system/reports/` (вже там повинен бути)

#### 3. **Shell Скрипти** - 6 файлів
```
QUICK_CLEANUP_COMMANDS.sh
START_ADVANCED_SYSTEM.sh
restart_system.sh
run.sh
setup-macos.sh
verify-fixes.sh
```
**Куди:** `scripts/` (вже існує)

#### 4. **Конфіг Файли** - 5 файлів
```
jest.config.json
package-lock.json
package.json
pyrightconfig.json
config.yaml
```
**Статус:** Залишити в корені (потрібні для npm/yarn)

#### 5. **Інші Файли** - 3 файлів
```
.DS_Store
feats_stats.npz
model.pth
spk_xvector.ark
```
**Куди:** `.gitignore` або `data/models/`

---

## 🎯 План Організації

### Крок 1: Створити Нові Папки
```bash
mkdir -p docs/reports
mkdir -p scripts/archived
```

### Крок 2: Перемістити TXT Файли
```bash
# Звіти про аналіз
mv ANALYSIS_COMPLETE.txt docs/reports/
mv ANALYSIS_SUMMARY.txt docs/reports/
mv DOCUMENTS_MANIFEST.txt docs/reports/
mv ENHANCEMENT_COMPLETION.txt docs/reports/
mv FINAL_SUMMARY.txt docs/reports/
mv FINAL_SUMMARY_2025-11-20.txt docs/reports/
mv INTEGRATION_COMPLETE.txt docs/reports/
mv MCP_SERVER_STATUS.txt docs/reports/
mv DEPENDENCY_GRAPH_QUICKSTART.txt docs/reports/
```

### Крок 3: Перемістити Shell Скрипти
```bash
# Основні скрипти
mv START_ADVANCED_SYSTEM.sh scripts/
mv QUICK_CLEANUP_COMMANDS.sh scripts/

# Архівні скрипти
mv restart_system.sh scripts/archived/
mv run.sh scripts/archived/
mv setup-macos.sh scripts/archived/
mv verify-fixes.sh scripts/archived/
```

### Крок 4: Перемістити JSON Статистику
```bash
# Якщо не в codemap-system/reports
mv ARCHITECTURE_STATISTICS.json codemap-system/reports/
```

### Крок 5: Очистити Інші Файли
```bash
# Видалити або перемістити
rm .DS_Store 2>/dev/null || true
mv feats_stats.npz data/models/ 2>/dev/null || true
mv model.pth data/models/ 2>/dev/null || true
mv spk_xvector.ark data/models/ 2>/dev/null || true
```

---

## 📁 Нова Структура Кореня

### Після Очистки

```
atlas4/
├── README.md                          # Основний README
├── ARCHITECTURE.md                    # Архітектура
├── GETTING_STARTED.md                 # Швидкий старт
├── START_HERE.md                      # Старт (сумісність)
│
├── .env                               # Конфіг
├── .env.example
├── .gitignore
├── .windsurf/                         # Windsurf конфіг
│
├── config.yaml                        # Конфіг проекту
├── package.json                       # NPM конфіг
├── package-lock.json
├── jest.config.json                   # Jest конфіг
├── pyrightconfig.json                 # Pyright конфіг
├── eslint.config.js                   # ESLint конфіг
├── Makefile                           # Makefile
├── requirements.txt                   # Python залежності
│
├── docs/                              # Документація
│   ├── reports/                       # ✨ НОВИЙ - Звіти
│   ├── analysis/
│   ├── dependency-graph/
│   ├── cleanup/
│   ├── installation/
│   ├── integration/
│   └── refactoring/
│
├── tests/                             # Тести
├── scripts/                           # Скрипти
│   ├── maintenance/
│   └── archived/                      # ✨ НОВИЙ - Архівні
│
├── codemap-system/                    # MCP сервер
├── services/                          # Сервіси
├── web/                               # Web додаток
├── config/                            # Конфіг
├── data/                              # Дані
│   └── models/                        # ML моделі
├── models/                            # ML моделі
├── logs/                              # Логи
├── reports/                           # Звіти
├── archive/                           # Архів
├── backups/                           # Резервні копії
└── venv/                              # Віртуальне середовище
```

---

## 🔄 Де Система Зберігає Результати

### Поточна Структура

```
codemap-system/
├── reports/                           # Основна папка звітів
│   ├── architecture_data.json         # Дані архітектури
│   ├── architecture_report.markdown   # Звіт архітектури
│   ├── dependency_graph.json          # Граф залежностей (JSON)
│   ├── dependency_graph.mmd           # Граф залежностей (Mermaid)
│   ├── dependency_graph.html          # Граф залежностей (HTML)
│   ├── graph_simple.html              # Простий граф (HTML)
│   ├── index.html                     # Індекс звітів
│   └── optimization_report.json       # Звіт оптимізації
│
└── logs/                              # Логи
    └── (логи MCP сервера)
```

### Рекомендована Структура для Windsurf

```
.windsurf/
├── mcp_config.json                    # MCP конфіг
├── settings.json                      # Windsurf налаштування
├── workflows/                         # Workflows
│   └── full-architecture-analysis.md
│
└── reports/                           # ✨ НОВИЙ - Звіти для Windsurf
    ├── architecture/
    │   ├── overview.json              # Огляд архітектури
    │   ├── dependencies.json          # Залежності
    │   └── health.json                # Здоров'я системи
    │
    ├── analysis/
    │   ├── complexity.json            # Звіт складності
    │   ├── duplicates.json            # Дублікати коду
    │   └── unused_files.json          # Невикористовувані файли
    │
    ├── integration/
    │   ├── mcp_tools.json             # MCP інструменти
    │   ├── test_results.json          # Результати тестів
    │   └── verification.json          # Перевірка інтеграції
    │
    └── cache/                         # Кеш для швидкого доступу
        ├── architecture_cache.json
        └── dependency_cache.json
```

---

## 🔌 Як Система Працює

### 1. MCP Сервер Запускається
```
Windsurf IDE
    ↓
.windsurf/mcp_config.json (читає конфіг)
    ↓
codemap-system/windsurf/mcp_architecture_server.py (запускається)
    ↓
Ініціалізує аналізатори
```

### 2. Аналіз Виконується
```
MCP Сервер
    ↓
ArchitectureMapper (аналізує файли)
    ↓
DependencyGraphAnalyzer (аналізує залежності)
    ↓
CodeDuplicationDetector (знаходить дублікати)
    ↓
CodeQualityAnalyzer (аналізує якість)
```

### 3. Результати Зберігаються
```
codemap-system/reports/
    ├── architecture_data.json
    ├── dependency_graph.json
    ├── dependency_graph.html
    └── index.html
```

### 4. Windsurf Отримує Результати
```
MCP Інструменти повертають результати
    ↓
Windsurf IDE обробляє результати
    ↓
Показує користувачу
```

---

## 📊 Пріоритети Файлів

### 🔴 Критичні (Залишити в Корені)
- `README.md` - Основна документація
- `ARCHITECTURE.md` - Архітектура
- `GETTING_STARTED.md` - Швидкий старт
- `package.json` - NPM конфіг
- `requirements.txt` - Python залежності
- `.gitignore` - Git конфіг
- `.env.example` - Приклад конфіг

### 🟡 Важливі (Залишити в Корені)
- `jest.config.json` - Jest конфіг
- `pyrightconfig.json` - Pyright конфіг
- `eslint.config.js` - ESLint конфіг
- `config.yaml` - Конфіг проекту
- `Makefile` - Makefile

### 🟢 Звіти (Перемістити)
- TXT файли → `docs/reports/`
- JSON статистика → `codemap-system/reports/`
- Shell скрипти → `scripts/`

### ⚪ Архівні (Перемістити)
- Старі скрипти → `scripts/archived/`
- Старі файли → `archive/`

---

## ✅ Чек-лист Очистки

- [ ] Створити `docs/reports/`
- [ ] Створити `scripts/archived/`
- [ ] Перемістити TXT файли в `docs/reports/`
- [ ] Перемістити shell скрипти в `scripts/`
- [ ] Перемістити архівні скрипти в `scripts/archived/`
- [ ] Перемістити JSON статистику в `codemap-system/reports/`
- [ ] Видалити `.DS_Store`
- [ ] Перемістити ML файли в `data/models/`
- [ ] Оновити `.gitignore`
- [ ] Перевірити що все ще працює

---

## 🚀 Команда для Виконання

```bash
#!/bin/bash

# Створити папки
mkdir -p docs/reports
mkdir -p scripts/archived

# Перемістити TXT файли
mv ANALYSIS_COMPLETE.txt docs/reports/ 2>/dev/null || true
mv ANALYSIS_SUMMARY.txt docs/reports/ 2>/dev/null || true
mv DOCUMENTS_MANIFEST.txt docs/reports/ 2>/dev/null || true
mv ENHANCEMENT_COMPLETION.txt docs/reports/ 2>/dev/null || true
mv FINAL_SUMMARY.txt docs/reports/ 2>/dev/null || true
mv FINAL_SUMMARY_2025-11-20.txt docs/reports/ 2>/dev/null || true
mv INTEGRATION_COMPLETE.txt docs/reports/ 2>/dev/null || true
mv MCP_SERVER_STATUS.txt docs/reports/ 2>/dev/null || true
mv DEPENDENCY_GRAPH_QUICKSTART.txt docs/reports/ 2>/dev/null || true

# Перемістити shell скрипти
mv START_ADVANCED_SYSTEM.sh scripts/ 2>/dev/null || true
mv QUICK_CLEANUP_COMMANDS.sh scripts/ 2>/dev/null || true
mv restart_system.sh scripts/archived/ 2>/dev/null || true
mv run.sh scripts/archived/ 2>/dev/null || true
mv setup-macos.sh scripts/archived/ 2>/dev/null || true
mv verify-fixes.sh scripts/archived/ 2>/dev/null || true

# Видалити системні файли
rm .DS_Store 2>/dev/null || true

echo "✅ Очистка завершена!"
```

---

Дата: 23 листопада 2025, 04:55 UTC+02:00  
Версія: 1.0  
Статус: ✅ План готовий
