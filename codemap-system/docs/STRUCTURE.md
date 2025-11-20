# 📁 Codemap System Structure

## 🎯 Організована структура папки

```
codemap-system/
├── 🚀 RUN_FULL.sh              ← ЗАПУСК ПОВНОГО ФУЛУ (основний файл)
├── 🚀 DEPLOY_FINAL.sh          ← ДЕПЛОЙ СИСТЕМИ (основний файл)
│
├── 📁 core/                    ← ОСНОВНІ КОМПОНЕНТИ
│   ├── mcp_enhanced_analyzer.py    (5-шаровий аналізатор)
│   ├── mcp_enhanced_server.py      (MCP Server - 16 інструментів)
│   ├── mcp_windsurf_server.py      (Windsurf integration)
│   └── mcp_advanced_tools.py       (Advanced tools)
│
├── 📁 tools/                   ← ДОПОМІЖНІ ІНСТРУМЕНТИ
│   ├── windsurf_power_tools.py     (3 гіпер-інструменти)
│   ├── architecture_generator.py   (Генерація архітектури)
│   └── duplication_analyzer.py     (Аналіз дублікатів)
│
├── 📁 scripts/                 ← СКРИПТИ (старі, для довідки)
│   ├── DEPLOY.sh
│   ├── deploy_advanced.sh
│   ├── verify_phase1.sh
│   └── RUN_FULL.sh (старий)
│
├── 📁 legacy/                  ← СТАРІ ФАЙЛИ (не використовуються)
│   ├── mcp_codemap_server.py
│   ├── codemap_analyzer.py
│   ├── file_migration_analyzer.py
│   ├── test_duplication_analyzer.py
│   ├── FIRST_RUN.sh
│   ├── start_enhanced_system.sh
│   ├── cascade_pre_task_hook.py
│   └── mcp_server_daemon.py
│
├── 📁 logs/                    ← ЛОГИ
│   ├── analyzer.log
│   ├── mcp_windsurf_server.log
│   └── ...
│
├── 📁 reports/                 ← ЗВІТИ
│   ├── CODEMAP_SUMMARY.md
│   ├── codemap_analysis.json
│   └── ...
│
├── 📁 example_project/         ← ПРИКЛАД ПРОЕКТУ
│   └── src/
│
├── requirements.txt            ← ЗАЛЕЖНОСТІ
├── config.yaml                 ← КОНФІГ
└── mcp_config.json.template    ← WINDSURF КОНФІГ ШАБЛОН
```

---

## 🚀 Два основних файли для запуску

### 1. **DEPLOY_FINAL.sh** – Деплой системи

**Що робить:**
- ✅ Перевіряє Python
- ✅ Перевіряє структуру
- ✅ Встановлює залежності
- ✅ Налаштовує Windsurf конфіг
- ✅ Тестує MCP Server

**Запуск:**
```bash
bash DEPLOY_FINAL.sh
```

**Результат:**
```
✅ Система розгорнута
✅ Windsurf конфіг налаштовано
✅ MCP Server протестовано
```

---

### 2. **RUN_FULL.sh** – Запуск повного фулу

**Що робить:**
- ✅ Запускає Enhanced Analyzer (5 шарів)
- ✅ Запускає MCP Windsurf Server (16 інструментів)
- ✅ Синхронізує з Windsurf
- ✅ Генерує звіти
- ✅ Показує інструкції

**Запуск:**
```bash
bash RUN_FULL.sh
```

**Результат:**
```
✅ Analyzer запущено (PID: XXXX)
✅ MCP Server запущено (PID: XXXX)
✅ Синхронізовано з Windsurf
✅ 16 інструментів готові
```

---

## 📊 Компоненти системи

### Core (основні)
| Файл                       | Функція                      | Статус   |
| -------------------------- | ---------------------------- | -------- |
| `mcp_enhanced_analyzer.py` | 5-шаровий аналізатор         | ✅ ACTIVE |
| `mcp_enhanced_server.py`   | MCP Server (16 інструментів) | ✅ ACTIVE |
| `mcp_windsurf_server.py`   | Windsurf integration         | ✅ ACTIVE |
| `mcp_advanced_tools.py`    | Advanced tools               | ✅ ACTIVE |

### Tools (допоміжні)
| Файл                        | Функція               | Статус   |
| --------------------------- | --------------------- | -------- |
| `windsurf_power_tools.py`   | 3 гіпер-інструменти   | ✅ ACTIVE |
| `architecture_generator.py` | Генерація архітектури | ✅ ACTIVE |
| `duplication_analyzer.py`   | Аналіз дублікатів     | ✅ ACTIVE |

### Legacy (старі - не використовуються)
| Файл                       | Причина                                |
| -------------------------- | -------------------------------------- |
| `mcp_codemap_server.py`    | Замінено на `mcp_windsurf_server.py`   |
| `codemap_analyzer.py`      | Замінено на `mcp_enhanced_analyzer.py` |
| `mcp_server_daemon.py`     | Замінено на `mcp_windsurf_server.py`   |
| `start_enhanced_system.sh` | Замінено на `RUN_FULL.sh`              |
| `launch_full_power.sh`     | Замінено на `RUN_FULL.sh`              |

---

## 🎯 Як використовувати

### Крок 1: Деплой
```bash
cd /Users/dev/Documents/GitHub/atlas4/codemap-system
bash DEPLOY_FINAL.sh
```

### Крок 2: Перезавантажити Windsurf
```bash
# Cmd+Q на Mac
# Потім відкрити Windsurf знову
```

### Крок 3: Запустити повний фул
```bash
bash RUN_FULL.sh
```

### Крок 4: Використовувати в Windsurf
```
@cascade get_quick_assessment(directory: "orchestrator")
@cascade get_disqualification_report(directory: "orchestrator")
@cascade get_editor_quick_view(file_path: "orchestrator/app.js")
```

---

## 📈 Архітектура

```
┌─────────────────────────────────────────────────────────┐
│  DEPLOY_FINAL.sh (Деплой)                               │
│  - Перевіряє залежності                                 │
│  - Налаштовує Windsurf                                  │
│  - Тестує систему                                       │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│  RUN_FULL.sh (Запуск)                                   │
│  - Запускає Analyzer                                    │
│  - Запускає MCP Server                                  │
│  - Синхронізує з Windsurf                               │
└────────────────┬────────────────────────────────────────┘
                 │
    ┌────────────┼────────────┐
    │            │            │
    ▼            ▼            ▼
┌────────┐  ┌────────┐  ┌────────────┐
│Analyzer│  │MCP     │  │Power Tools │
│(5 шарів)  │Server  │  │(3 tools)   │
│RUNNING │  │RUNNING │  │LOADED      │
└────────┘  └────────┘  └────────────┘
    │            │            │
    └────────────┼────────────┘
                 │
                 ▼
         /reports/*.json
                 │
                 ▼
         Windsurf Cascade
         (16 інструментів)
```

---

## ✨ Результат

✅ **Організована структура** – Легко знайти файли  
✅ **Два основних скрипти** – Деплой + Запуск  
✅ **Синхронізація з Windsurf** – Реальний час  
✅ **16 інструментів** – Готові до використання  
✅ **Чистий код** – Без дублікатів  

---

**Status**: ✅ STRUCTURE ORGANIZED  
**Main Files**: 2 (DEPLOY_FINAL.sh + RUN_FULL.sh)  
**Components**: 7 active  
**Legacy**: 8 files (archived)

🎉 **СИСТЕМА ОРГАНІЗОВАНА!** 🎉
