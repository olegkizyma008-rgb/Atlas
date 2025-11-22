---
description: Синхронізація архітектури при запуску Windsurf
---

# 🏗️ Синхронізація архітектури при запуску Windsurf

Цей workflow автоматично синхронізує архітектурну систему при кожному запуску Windsurf, забезпечуючи актуальну інформацію про стан кодової бази.

## Що робить

- ✅ Завантажує конфігурацію архітектури
- ✅ Аналізує поточну архітектуру проекту
- ✅ Виявляє застарілі, невикористовувані та дублюючі файли
- ✅ Генерує звіти про здоров'я архітектури
- ✅ Інтегрується з MCP сервером для Cascade

## Кроки

### 1. Завантажити конфігурацію
```bash
cd /Users/dev/Documents/GitHub/atlas4/codemap-system
source .env.architecture
```

### 2. Встановити залежності (якщо потрібно)
```bash
pip install -r requirements.txt --quiet
```

### 3. Запустити аналіз архітектури
```bash
python3 << 'PYTHON'
import sys
from pathlib import Path
sys.path.insert(0, '/Users/dev/Documents/GitHub/atlas4/codemap-system')

from architecture_mapper import ArchitectureMapper

mapper = ArchitectureMapper(Path('/Users/dev/Documents/GitHub/atlas4'))
print("🔍 Аналіз архітектури...")
architecture = mapper.analyze_architecture(max_depth=5)
print("✅ Архітектура проаналізована")
print(f"📊 Статистика: {architecture.get('statistics', {})}")
PYTHON
```

### 4. Запустити MCP архітектурний сервер
// turbo
```bash
cd /Users/dev/Documents/GitHub/atlas4/codemap-system
python3 mcp_architecture_server.py &
echo $! > .architecture_server.pid
```

### 5. Оновити конфігурацію Windsurf
```bash
mkdir -p ~/.codeium/windsurf
cat > ~/.codeium/windsurf/mcp_config.json << 'JSON'
{
  "mcpServers": {
    "architecture-analysis": {
      "command": "python3",
      "args": ["/Users/dev/Documents/GitHub/atlas4/codemap-system/mcp_architecture_server.py"],
      "env": {
        "PYTHONPATH": "/Users/dev/Documents/GitHub/atlas4/codemap-system",
        "PROJECT_ROOT": "/Users/dev/Documents/GitHub/atlas4",
        "PYTHONUNBUFFERED": "1"
      }
    }
  }
}
JSON
```

### 6. Генерувати звіти
```bash
python3 << 'PYTHON'
import sys
from pathlib import Path
sys.path.insert(0, '/Users/dev/Documents/GitHub/atlas4/codemap-system')

from mcp_architecture_server import ArchitectureAnalysisServer

server = ArchitectureAnalysisServer()
print("📋 Генерування звітів...")

# Огляд архітектури
overview = server._get_architecture_overview()
print(f"📊 Огляд: {overview[:100]}...")

# Здоров'я архітектури
health = server._get_architecture_health()
print(f"💚 Здоров'я: {health[:100]}...")

# Експортування звітів
server._export_architecture_report("json")
server._export_architecture_report("html")
server._export_architecture_report("markdown")

print("✅ Звіти згенеровані")
PYTHON
```

## Результат

Після виконання цього workflow:

- ✅ Архітектура проаналізована
- ✅ MCP сервер запущено
- ✅ Windsurf конфіг оновлено
- ✅ Звіти згенеровані
- ✅ Cascade готовий до роботи з архітектурою

## Як використовувати в Cascade

Після синхронізації можна використовувати команди:

```
@cascade get_architecture_overview()
@cascade analyze_file_status(file_path: "orchestrator/app.js")
@cascade detect_deprecated_files()
@cascade detect_unused_files()
@cascade get_architecture_health()
@cascade get_refactoring_recommendations(priority: "high")
```

## Автоматизація

Щоб цей workflow запускався автоматично при запуску Windsurf, додайте до `.windsurf/startup.sh`:

```bash
#!/bin/bash
cd /Users/dev/Documents/GitHub/atlas4
bash .windsurf/workflows/sync-architecture-on-startup.md
```

## Налаштування

Конфігурація знаходиться в `/Users/dev/Documents/GitHub/atlas4/codemap-system/.env.architecture`

Основні параметри:
- `MAX_ANALYSIS_DEPTH=5` - глибина аналізу залежностей
- `AUTO_ANALYSIS_INTERVAL=300` - інтервал автоаналізу (сек)
- `DEPRECATED_THRESHOLD_DAYS=90` - поріг для застарілих файлів
- `MIN_HEALTH_SCORE=60` - мінімальна оцінка здоров'я

## Логування

Логи знаходяться в:
- `/Users/dev/Documents/GitHub/atlas4/codemap-system/logs/architecture_server.log`

Для моніторингу:
```bash
tail -f /Users/dev/Documents/GitHub/atlas4/codemap-system/logs/architecture_server.log
```

## Проблеми

Якщо щось не працює:

1. Перевірте конфігурацію:
```bash
cat /Users/dev/Documents/GitHub/atlas4/codemap-system/.env.architecture
```

2. Перевірте залежності:
```bash
cd /Users/dev/Documents/GitHub/atlas4/codemap-system
pip install -r requirements.txt
```

3. Перевірте логи:
```bash
tail -100 logs/architecture_server.log
```

4. Перезапустіть Windsurf та спробуйте знову
