# 📚 ATLAS Documentation

Документація для ATLAS v5.0 - інтелектуальної багатоагентної системи з автономним self-healing.

## 🚀 Швидкий старт

- 📖 [Головний README](../README.md) - огляд системи та інсталяція
- 🎨 [Windsurf Integration](archive/2025-11/WINDSURF_INTEGRATION_2025-11-03.md) - **NEW v5.0.5** реальні зміни коду
- 🔧 [Self-Healing Demo](archive/2025-11/NEXUS_SELF_IMPROVEMENT_DEMO.md) - автономне виправлення багів

## 📋 Основна документація

### 🏗️ Архітектура (core/)
- [Orchestrator Structure](core/ORCHESTRATOR_STRUCTURE.md) - архітектура та компоненти
- [Orchestrator Workflow](core/ORCHESTRATOR_WORKFLOW.md) - виконання workflow та stages
- [API Reference](core/API_REFERENCE.md) - REST API та WebSocket endpoints
- [Model Configuration](core/MODEL_CONFIGURATION_GUIDE.md) - налаштування LLM моделей

### 🔌 Інтеграції (integrations/)
- [MCP Dynamic TODO](integrations/MCP_DYNAMIC_TODO_WORKFLOW_SYSTEM.md) - адаптивне планування завдань
- [MCP Servers Reference](integrations/MCP_SERVERS_REFERENCE.md) - доступні MCP сервери
- [MCP Tools Complete](integrations/MCP_TOOLS_COMPLETE.md) - повна документація tools
- [MCP Workflow Analysis](integrations/MCP_WORKFLOW_ANALYSIS.md) - паттерни та best practices

### 👥 Системи агентів (development/)
- [Tetyana Tool System](development/TETYANA_TOOL_SYSTEM_INTEGRATION.md) - управління tools
- [Tetyana Refactoring Plan](development/TETYANA_REFACTORING_PLAN.md) - архітектура системи
- [Tetyana Refactoring Summary](development/TETYANA_REFACTORING_SUMMARY.md) - деталі реалізації
- [Validation System](development/VALIDATION_SYSTEM_USAGE.md) - обробка помилок та валідація

## 🆕 Останні оновлення (archive/2025-11/)

### Листопад 2025 - v5.0.5
- 🎨 [**Windsurf Integration**](archive/2025-11/WINDSURF_INTEGRATION_2025-11-03.md) - глибока інтеграція з Windsurf API
- 🔧 [Self-Healing Fix](archive/2025-11/SELF_HEALING_FIX_2025-11-02.md) - triple-check logic для автономності
- 🎙️ [TTS Optimization](archive/2025-11/TTS_OPTIMIZATION_2025-11-02.md) - природна українська для озвучення
- 🧠 [Nexus Demo](archive/2025-11/NEXUS_SELF_IMPROVEMENT_DEMO.md) - демонстрація можливостей
- ⚠️ [Nexus Fix](archive/2025-11/NEXUS_NOT_ACTIVATED_FIX_2025-11-02.md) - виправлення активації
- 📊 [MCP Analysis](archive/2025-11/MCP_ANALYSIS_2025-11-02.md) - аналіз MCP системи
- ⏱️ [Real-time Analysis](archive/2025-11/REAL_TIME_ANALYSIS_UPDATE_2025-11-02.md) - оновлення аналізу

### Жовтень 2025 - v5.0.4 (archive/2025-10/)
Рефакторинг, інтеграції, валідація, локалізація

## 🔍 Пошук документації

```bash
# Пошук за ключовим словом
grep -r "keyword" docs/

# Список всіх markdown файлів
find docs/ -name "*.md"

# Пошук в конкретній категорії
grep -r "keyword" docs/core/
```

## 📁 Структура
Whisper keyword detection:
- [WHISPER_KEYWORD_DETECTION_2025-10-11.md](WHISPER_KEYWORD_DETECTION_2025-10-11.md)
- [WHISPER_KEYWORD_INTEGRATION_FIX_2025-10-11.md](WHISPER_KEYWORD_INTEGRATION_FIX_2025-10-11.md)

---

## 🧬 3D Living System (v4.0)

- [3D_VISIBILITY_SAFARI_FIX_FINAL.md](3D_VISIBILITY_SAFARI_FIX_FINAL.md)
- [3D_AND_VOICE_REFACTORING_2025-10-11.md](3D_AND_VOICE_REFACTORING_2025-10-11.md)

---

## 🧪 Тестування

- [TESTING_INSTRUCTIONS.md](TESTING_INSTRUCTIONS.md)

---

## ⚙️ AI Config

- [AI_MODEL_CONFIG_2025-10-10.md](AI_MODEL_CONFIG_2025-10-10.md)
- [AI_CONFIG_CENTRALIZATION_REPORT.md](AI_CONFIG_CENTRALIZATION_REPORT.md)

---

## 📋 Аудит промптів

- [PROMPTS_WORKFLOW_AUDIT_REPORT.md](PROMPTS_WORKFLOW_AUDIT_REPORT.md)

---

## ✅ Статус важливих фіксів у коді

- [BASESERVICE_EVENTMANAGER_FIX_2025-10-11.md](BASESERVICE_EVENTMANAGER_FIX_2025-10-11.md)
- [REFACTORING_COMPLETE.md](REFACTORING_COMPLETE.md)
- [PHASE_6_INTEGRATION_COMPLETE_2025-10-11.md](PHASE_6_INTEGRATION_COMPLETE_2025-10-11.md)

---

## 🗄️ Політика архіву документів

- Папка `docs/` містить тільки актуальні документи,
  необхідні для розробки і підтримки v4.0.
- Усі детальні історичні звіти, щоденні логи та проміжні аналізи
	переміщені в `docs/archive/` для збереження історії без перевантаження навігації.
- Якщо ви не знаходите документ у `docs/`, перевірте `docs/archive/`
	або скористайтесь пошуком по репозиторію.

---

## 💡 Для різних ролей

### Новий розробник
1. Почніть з [../README.md](../README.md)
2. Прочитайте [ATLAS_SYSTEM_ARCHITECTURE.md](ATLAS_SYSTEM_ARCHITECTURE.md)
3. Ознайомтесь з [CONVERSATION_MODE_SYSTEM.md](CONVERSATION_MODE_SYSTEM.md)
4. Вивчіть [CONTEXT_FIX_SUMMARY.md](CONTEXT_FIX_SUMMARY.md)

### Тестувальник
1. [TESTING_INSTRUCTIONS.md](TESTING_INSTRUCTIONS.md) — покрокові інструкції

### Tech Lead / Architect
1. [ATLAS_SYSTEM_ARCHITECTURE.md](ATLAS_SYSTEM_ARCHITECTURE.md)
2. [TECHNICAL_SPECIFICATION.md](TECHNICAL_SPECIFICATION.md)
3. [CONTEXT_SYSTEM_FIX_REPORT.md](CONTEXT_SYSTEM_FIX_REPORT.md)

---

Останнє оновлення: 12 жовтня 2025  
Версія: ATLAS v4.0

---

## 📁 Структура директорій

```
docs/
├── README.md (цей файл)
├── fixes/ — виправлення помилок (15+ документів)
│   ├── README.md
│   ├── CONVERSATION_*.md — conversation mode fixes
│   ├── QUICK_SEND_*.md — quick-send fixes
│   └── PENDING_CONTINUOUS_*.md — pending continuous fix
├── pull-requests/ — PR documentation
│   ├── README.md
│   ├── PR_3_SUMMARY.md
│   └── PR_4_PENDING_CONTINUOUS_SUMMARY.md
├── refactoring/ — Phase 2 refactoring docs
└── archive/ — історичні документи
```

Для деталей дивіться README у кожній підпапці.
