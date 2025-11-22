# ⚡ Архітектурна Система — Швидкий Старт

**Час**: 5 хвилин  
**Складність**: Легко  
**Статус**: ✅ ГОТОВО

---

## 🎯 Мета

Запустити архітектурну систему Windsurf та почати використовувати команди в Cascade.

---

## 📋 Передумови

- ✅ Python 3.8+
- ✅ Windsurf IDE
- ✅ Доступ до терміналу

---

## 🚀 4 кроки до успіху

### 1️⃣ Встановити залежності (2 хв)

```bash
cd /Users/dev/Documents/GitHub/atlas4/codemap-system
pip install -r requirements.txt
```

**Що робиться**: Встановлюються 20+ залежностей для аналізу архітектури.

### 2️⃣ Запустити синхронізацію (1 хв)

```bash
bash /Users/dev/Documents/GitHub/atlas4/.windsurf/workflows/sync-architecture-on-startup.md
```

**Що робиться**:
- Завантажується конфігурація
- Аналізується архітектура проекту
- Запускається MCP сервер
- Генеруються звіти

### 3️⃣ Перезавантажити Windsurf (1 хв)

**Mac**:
- Натисніть `Cmd+Q` (закрити Windsurf)
- Відкрийте Windsurf знову

**Linux/Windows**:
- Закрийте Windsurf
- Відкрийте знову

### 4️⃣ Протестувати в Cascade (1 хв)

Відкрийте Cascade в Windsurf та напишіть:

```
@cascade get_architecture_overview()
```

**Результат**: Ви отримаєте огляд архітектури проекту.

---

## ✅ Готово!

Якщо все працює, ви побачите щось на кшталт:

```json
{
  "timestamp": "2025-11-22T18:30:00",
  "statistics": {
    "total_files": 245,
    "active_files": 210,
    "deprecated_files": 15,
    "unused_files": 20
  },
  "health_score": {
    "score": 72,
    "status": "good"
  }
}
```

---

## 🛠️ Основні команди

### Огляд архітектури
```
@cascade get_architecture_overview()
```

### Здоров'я архітектури
```
@cascade get_architecture_health()
```

### Невикористовувані файли
```
@cascade detect_unused_files()
```

### Застарілі файли
```
@cascade detect_deprecated_files()
```

### Рекомендації рефакторингу
```
@cascade get_refactoring_recommendations(priority: "high")
```

### Вплив змін файлу
```
@cascade get_file_impact(file_path: "orchestrator/app.js")
```

---

## 🐛 Якщо щось не працює

### Проблема: "Команда не знайдена"

**Рішення**:
```bash
# Перевірте, чи встановлені залежності
pip list | grep radon

# Якщо ні, встановіть їх
pip install -r /Users/dev/Documents/GitHub/atlas4/codemap-system/requirements.txt

# Перезавантажте Windsurf
```

### Проблема: "Architecture not analyzed yet"

**Рішення**:
```bash
# Запустіть синхронізацію вручну
bash /Users/dev/Documents/GitHub/atlas4/.windsurf/workflows/sync-architecture-on-startup.md

# Перезавантажте Windsurf
```

### Проблема: Повільна робота

**Рішення**:
```bash
# Відредагуйте конфігурацію
nano /Users/dev/Documents/GitHub/atlas4/codemap-system/.env.architecture

# Зменшіть глибину аналізу
MAX_ANALYSIS_DEPTH=3

# Збільшіть інтервал
AUTO_ANALYSIS_INTERVAL=600
```

---

## 📚 Більше інформації

- **[ARCHITECTURE_SYSTEM_README.md](ARCHITECTURE_SYSTEM_README.md)** — Повний гайд
- **[ARCHITECTURE_INTEGRATION_GUIDE.md](ARCHITECTURE_INTEGRATION_GUIDE.md)** — Детальна документація
- **[codemap-system/.env.architecture](codemap-system/.env.architecture)** — Конфігурація

---

## 💡 Поради

### 1. Налаштуйте за своїм проектом
```bash
nano /Users/dev/Documents/GitHub/atlas4/codemap-system/.env.architecture
```

### 2. Перевіряйте логи
```bash
tail -f /Users/dev/Documents/GitHub/atlas4/codemap-system/logs/architecture_server.log
```

### 3. Експортуйте звіти
```
@cascade export_architecture_report(format: "html")
```

### 4. Використовуйте в CI/CD
```bash
# Перевірка перед комітом
python3 << 'PYTHON'
import sys
sys.path.insert(0, 'codemap-system')
from mcp_architecture_server import ArchitectureAnalysisServer

server = ArchitectureAnalysisServer()
health = server._get_architecture_health()

if health['score'] < 60:
    print("❌ Архітектура потребує покращення")
    sys.exit(1)
PYTHON
```

---

## 🎉 Готово!

Тепер ви можете використовувати архітектурну систему Windsurf.

**Успіхів! 🚀**

---

**Час**: 5 хвилин  
**Складність**: Легко  
**Статус**: ✅ ГОТОВО
