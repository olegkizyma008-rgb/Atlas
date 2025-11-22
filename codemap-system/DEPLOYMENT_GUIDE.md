# 🚀 Гайд розгортання Architecture System v2.0

**Дата**: 22 листопада 2025  
**Версія**: 2.0  
**Статус**: ✅ ГОТОВО ДО РОЗГОРТАННЯ

---

## 📋 Зміст

1. [Передумови](#передумови)
2. [Встановлення](#встановлення)
3. [Конфігурація](#конфігурація)
4. [Запуск компонентів](#запуск-компонентів)
5. [Інтеграція з Windsurf](#інтеграція-з-windsurf)
6. [Моніторинг та логування](#моніторинг-та-логування)
7. [Тестування](#тестування)
8. [Troubleshooting](#troubleshooting)

---

## Передумови

### Системні вимоги

- **Python**: 3.8+
- **OS**: macOS, Linux, Windows
- **Память**: 2GB+ (для аналізу великих проектів)
- **Диск**: 500MB+ (для кешу та логів)

### Встановлені пакети

```bash
# Основні залежності
pip install -r requirements.txt

# Додаткові для WebSocket
pip install websockets==12.0

# Додаткові для MCP
pip install jsonrpc==1.14.1
```

---

## Встановлення

### Крок 1: Клонування/Копіювання

```bash
# Якщо у вас вже є проект
cd /path/to/your/project

# Копіюємо систему
cp -r /path/to/atlas4/codemap-system ./

# Або клонуємо з git
git clone <repo> codemap-system
cd codemap-system
```

### Крок 2: Встановлення залежностей

```bash
# Встановлюємо мінімальні залежності (без конфліктів)
pip install -r requirements-minimal.txt

# Або встановлюємо окремо
pip install radon networkx python-dotenv watchdog websockets pytest

# Для розробки (опціонально)
pip install pytest-cov black flake8 pylint
```

### Крок 3: Конфігурація середовища

```bash
# Копіюємо приклад конфігурації
cp .env.architecture.example .env.architecture

# Редагуємо конфігурацію
nano .env.architecture
```

---

## Конфігурація

### `.env.architecture` - Основні параметри

```bash
# Шлях до проекту (відносний або абсолютний)
PROJECT_ROOT=..

# Глибина аналізу залежностей (1-5)
ANALYSIS_DEPTH=2

# Інтервал періодичного аналізу (секунди)
ANALYSIS_INTERVAL=300

# Розширення файлів для аналізу
FILE_EXTENSIONS=.py,.js,.ts,.jsx,.tsx

# Папки для ігнорування
IGNORE_PATTERNS=node_modules,__pycache__,.git,.venv,dist,build

# Логування
LOG_LEVEL=INFO
LOG_DIR=logs

# Кеш
CACHE_DIR=.cache
CACHE_ENABLED=true

# WebSocket сервер
WEBSOCKET_HOST=localhost
WEBSOCKET_PORT=8765

# MCP сервер
MCP_PORT=8766
```

### Приклад для atlas4

```bash
PROJECT_ROOT=..
ANALYSIS_DEPTH=2
ANALYSIS_INTERVAL=300
FILE_EXTENSIONS=.py,.js,.ts,.jsx,.tsx,.md
IGNORE_PATTERNS=node_modules,__pycache__,.git,.venv,dist,build,.archive,third_party
LOG_LEVEL=INFO
LOG_DIR=logs
CACHE_DIR=.cache
CACHE_ENABLED=true
WEBSOCKET_HOST=localhost
WEBSOCKET_PORT=8765
MCP_PORT=8766
```

---

## Запуск компонентів

### Варіант 1: Запуск всього разом (Daemon)

```bash
# Запускаємо daemon - запускає все автоматично
python3 architecture_daemon.py

# Вивід:
# ✅ Architecture Daemon запущений
# 🔍 Запуск MCP сервера на порту 8766
# 🌐 Запуск WebSocket сервера на ws://localhost:8765
# 📁 Запуск моніторингу файлів
# ⏱️ Запуск періодичного аналізу (кожні 300 сек)
```

### Варіант 2: Запуск окремих компонентів

#### 2.1 MCP Architecture Server

```bash
# Запускаємо MCP сервер (JSON-RPC інтерфейс)
python3 windsurf/mcp_architecture_server.py

# Вивід:
# ✅ MCP Architecture Server запущений на порту 8766
# 📊 9 інструментів доступні
```

#### 2.2 WebSocket Server

```bash
# Запускаємо WebSocket сервер (real-time оновлення)
python3 windsurf/websocket_server.py

# Вивід:
# ✅ WebSocket сервер запущений на ws://localhost:8765
# ⏱️ Періодичний аналіз кожні 300 сек
```

#### 2.3 Cascade Integration

```bash
# Запускаємо Cascade інтеграцію (команди для IDE)
python3 -c "
from windsurf.cascade_integration import CascadeIntegration
from pathlib import Path

integration = CascadeIntegration(Path('.'))
print('Available commands:', len(integration.commands))
print(integration.get_status())
"

# Вивід:
# Available commands: 10
# {'status': 'active', 'project_root': '...', ...}
```

#### 2.4 File Monitor

```bash
# Запускаємо моніторинг файлів
python3 -c "
from windsurf.file_monitor import FileMonitor
from pathlib import Path

monitor = FileMonitor(Path('.'))
monitor.start()
print('File monitor запущений')
"
```

---

## Інтеграція з Windsurf

### Крок 1: Налаштування MCP

Додайте до `.windsurf/mcp_config.json`:

```json
{
  "mcpServers": {
    "architecture": {
      "command": "python3",
      "args": [
        "/path/to/codemap-system/windsurf/mcp_architecture_server.py"
      ],
      "env": {
        "PYTHONPATH": "/path/to/codemap-system"
      }
    }
  }
}
```

### Крок 2: Використання команд в Windsurf

```
# Аналіз архітектури
/architecture analyze

# Залежності файлу
/architecture dependencies src/main.py

# Невикористовувані файли
/architecture unused

# Циклічні залежності
/architecture circular

# Дублікати коду
/architecture duplicates

# Рекомендації рефакторингу
/architecture refactor high

# Здоров'я архітектури
/architecture health

# Експорт звіту
/architecture report json

# Аналіз безпеки
/architecture security

# Аналіз продуктивності
/architecture performance
```

### Крок 3: WebSocket для real-time оновлень

Клієнт може підключитися до WebSocket:

```javascript
// JavaScript приклад
const ws = new WebSocket('ws://localhost:8765');

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Architecture update:', data);
};

ws.send(JSON.stringify({
  action: 'subscribe',
  event_type: 'architecture_changed'
}));
```

---

## Моніторинг та логування

### Логи

Логи зберігаються в `logs/` папці:

```bash
# Переглядаємо логи
tail -f logs/architecture.log

# Або з фільтром
grep "ERROR" logs/architecture.log

# Або з часовою міткою
grep "2025-11-22" logs/architecture.log
```

### Структура логів

```
logs/
├── architecture.log          # Основні логи
├── mcp_server.log           # MCP сервер
├── websocket_server.log     # WebSocket сервер
├── file_monitor.log         # Моніторинг файлів
└── analysis.log             # Аналіз
```

### Налаштування логування

```python
import logging

# Встановлюємо рівень логування
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('logs/architecture.log'),
        logging.StreamHandler()
    ]
)
```

---

## Тестування

### Запуск тестів

```bash
# Тести Фази 1
python3 quick_test.py

# Тести Фази 2
python3 test_phase2.py

# Всі тести з покриттям
pytest --cov=. --cov-report=html

# Конкретний тест
pytest tests/test_architecture_mapper.py -v
```

### Очікувані результати

```
✅ test_architecture_analysis - PASSED
✅ test_circular_dependency_detection - PASSED
✅ test_duplication_detection - PASSED
✅ test_quality_analysis - PASSED
✅ test_security_analysis - PASSED
✅ test_performance_analysis - PASSED

6/6 tests passed ✅
```

---

## Повний цикл розгортання

### Сценарій 1: Локальна розробка

```bash
#!/bin/bash

# 1. Встановлення
pip install -r requirements.txt

# 2. Конфігурація
cp .env.architecture.example .env.architecture

# 3. Тестування
python3 quick_test.py

# 4. Запуск daemon
python3 architecture_daemon.py

# 5. Перевірка логів
tail -f logs/architecture.log
```

### Сценарій 2: Production розгортання

```bash
#!/bin/bash

# 1. Встановлення
pip install -r requirements.txt

# 2. Конфігурація
export PROJECT_ROOT=/path/to/project
export LOG_LEVEL=WARNING
export CACHE_ENABLED=true

# 3. Запуск з systemd
sudo systemctl start architecture-daemon

# 4. Перевірка статусу
sudo systemctl status architecture-daemon

# 5. Логи
journalctl -u architecture-daemon -f
```

### Сценарій 3: Docker розгортання

```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .

ENV PROJECT_ROOT=/project
ENV LOG_LEVEL=INFO

CMD ["python3", "architecture_daemon.py"]
```

```bash
# Збираємо образ
docker build -t architecture-system:2.0 .

# Запускаємо контейнер
docker run -d \
  -v /path/to/project:/project \
  -p 8765:8765 \
  -p 8766:8766 \
  --name architecture-daemon \
  architecture-system:2.0
```

---

## Troubleshooting

### Проблема: Port already in use

```bash
# Знаходимо процес на порту
lsof -i :8765

# Вбиваємо процес
kill -9 <PID>

# Або змінюємо порт в .env.architecture
WEBSOCKET_PORT=8767
```

### Проблема: Module not found

```bash
# Перевіряємо PYTHONPATH
export PYTHONPATH=/path/to/codemap-system:$PYTHONPATH

# Або встановлюємо як пакет
pip install -e .
```

### Проблема: Permission denied

```bash
# Даємо права на виконання
chmod +x architecture_daemon.py

# Або запускаємо з python3
python3 architecture_daemon.py
```

### Проблема: Out of memory

```bash
# Зменшуємо глибину аналізу
ANALYSIS_DEPTH=1

# Або обмежуємо розширення файлів
FILE_EXTENSIONS=.py,.js
```

---

## Моніторинг здоров'я системи

### Health check скрипт

```bash
#!/bin/bash

echo "🔍 Architecture System Health Check"

# 1. Перевіряємо MCP сервер
curl -X POST http://localhost:8766 \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc": "2.0", "method": "ping", "id": 1}'

# 2. Перевіряємо WebSocket
wscat -c ws://localhost:8765

# 3. Перевіряємо логи
tail -n 20 logs/architecture.log

# 4. Перевіряємо кеш
du -sh .cache/

# 5. Перевіряємо процеси
ps aux | grep architecture
```

---

## Наступні кроки

1. ✅ Встановити залежності
2. ✅ Налаштувати `.env.architecture`
3. ✅ Запустити тести
4. ✅ Запустити daemon
5. ✅ Інтегрувати з Windsurf
6. ✅ Моніторити логи
7. ✅ Налаштувати CI/CD

---

**Версія**: 2.0  
**Статус**: ✅ ГОТОВО  
**Дата**: 22 листопада 2025
