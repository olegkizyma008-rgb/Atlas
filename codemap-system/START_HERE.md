# 🚀 START HERE – Запуск системи

## 🎯 Два файли для запуску

### 1️⃣ **DEPLOY_FINAL.sh** – Деплой (запустити ПЕРШИМ)

```bash
bash DEPLOY_FINAL.sh
```

**Що робить:**
- ✅ Перевіряє Python 3
- ✅ Перевіряє структуру
- ✅ Встановлює залежності
- ✅ Налаштовує Windsurf конфіг
- ✅ Тестує MCP Server

**Час:** ~30 секунд

---

### 2️⃣ **RUN_FULL.sh** – Запуск (запустити ДРУГИМ)

```bash
bash RUN_FULL.sh
```

**Що запускає:**
- ✅ Enhanced Analyzer (5 шарів)
- ✅ MCP Windsurf Server (16 інструментів)
- ✅ Синхронізація з Windsurf
- ✅ Постійний аналіз

**Час:** Безперервна робота

---

## 🚀 Швидкий старт (3 кроки)

### Крок 1: Деплой
```bash
cd /Users/dev/Documents/GitHub/atlas4/codemap-system
bash DEPLOY_FINAL.sh
```

### Крок 2: Перезавантажити Windsurf
```bash
# Cmd+Q на Mac (закрити)
# Потім відкрити Windsurf знову
```

### Крок 3: Запустити
```bash
bash RUN_FULL.sh
```

---

## 📊 Повні можливості

### 🔍 Аналіз (5 шарів)
- ✅ Виявлення мертвих файлів
- ✅ Виявлення мертвих функцій
- ✅ Граф залежностей
- ✅ Виявлення циклів
- ✅ Аналіз якості

### 🛠️ Інструменти (16 всього)
- ✅ 3 Power Tools (гіпер-інструменти)
- ✅ 7 Advanced Tools
- ✅ 6 Basic Tools

### 🌐 Windsurf Синхронізація
- ✅ Реальний час комунікація
- ✅ Автоматичне оновлення
- ✅ Постійна синхронізація

### 🔄 Автономна робота
- ✅ Безперервний цикл аналізу
- ✅ Автоматичне перезапускання
- ✅ Самовідновлення

---

## 💡 Використання в Windsurf

Після запуску RUN_FULL.sh, використовуйте команди:

```
@cascade get_quick_assessment(directory: "orchestrator")
@cascade get_disqualification_report(directory: "orchestrator")
@cascade get_editor_quick_view(file_path: "orchestrator/app.js")
@cascade analyze_file_deeply(file_path: "orchestrator/app.js")
@cascade generate_refactoring_plan(priority: "high")
```

---

## 📁 Структура

```
codemap-system/
├── 🚀 DEPLOY_FINAL.sh          ← ДЕПЛОЙ
├── 🚀 RUN_FULL.sh              ← ЗАПУСК
├── 📖 README.md                ← ДОКУМЕНТАЦІЯ
├── 📁 core/                    ← ОСНОВНІ КОМПОНЕНТИ
├── 📁 tools/                   ← ДОПОМІЖНІ ІНСТРУМЕНТИ
├── 📁 docs/                    ← ДОКУМЕНТАЦІЯ
├── 📁 legacy/                  ← АРХІВОВАНІ ФАЙЛИ
├── 📁 logs/                    ← ЛОГИ
├── 📁 reports/                 ← ЗВІТИ
└── 📁 scripts/                 ← СТАРІ СКРИПТИ
```

---

## ✅ Перевірка

### Чи Analyzer запущено?
```bash
ps aux | grep mcp_enhanced_analyzer | grep -v grep
```

### Чи логи генеруються?
```bash
tail -f logs/analyzer.log
```

### Чи звіти оновлюються?
```bash
ls -lh reports/
```

---

## 🛑 Зупинення

```bash
Ctrl+C (якщо запущено в терміналі)
```

Або вручну:
```bash
pkill -f mcp_enhanced_analyzer
```

---

## 📚 Документація

Вся документація в папці `docs/`:
- `README.md` – Основна документація
- `STRUCTURE.md` – Структура системи
- `ADVANCED_TOOLS_GUIDE.md` – Гайд по інструментам
- ... та 30+ інших файлів

---

**🔥 ГОТОВО ДО ЗАПУСКУ!** 🔥
