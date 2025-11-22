# 🚀 Запуск Architecture Daemon

**Система постійного моніторингу архітектури**

---

## ⚡ Швидкий старт

### 1. Запустити daemon

```bash
cd /Users/dev/Documents/GitHub/atlas4/codemap-system
python3 architecture_daemon.py
```

### 2. Переглянути логи (в іншому терміналі)

```bash
tail -f logs/architecture_daemon.log
```

### 3. Зупинити daemon

```bash
# Натисніть Ctrl+C в терміналі де запущений daemon
```

---

## 📊 Що робить daemon

### Кожні 5 хвилин:

1. **Аналізує архітектуру** проекту
2. **Виявляє циклічні залежності**
3. **Знаходить невикористовувані файли**
4. **Оцінює здоров'я архітектури**
5. **Звітує про зміни**
6. **Логує все в файл**

### Приклад виводу:

```
2025-11-22 19:15:30,123 - root - INFO - 🚀 Architecture Daemon запущений (інтервал: 300с)
2025-11-22 19:15:30,124 - root - INFO - 📊 Daemon почав роботу
2025-11-22 19:15:30,125 - root - INFO - 🔍 Аналіз архітектури...
2025-11-22 19:15:35,456 - core.architecture_mapper - INFO - 🔍 Аналіз архітектури на глибину 2...
2025-11-22 19:15:37,789 - core.architecture_mapper - INFO -    📁 Знайдено 629 файлів
2025-11-22 19:15:45,012 - core.architecture_mapper - INFO -    🔄 Знайдено 3 циклічних залежностей
2025-11-22 19:15:45,013 - core.architecture_mapper - INFO - ✅ Аналіз завершено
2025-11-22 19:15:45,014 - root - INFO - ✅ Аналіз завершено

╔════════════════════════════════════════════════════════════════╗
║           ПЕРШИЙ АНАЛІЗ АРХІТЕКТУРИ                           ║
╚════════════════════════════════════════════════════════════════╝

📊 СТАТИСТИКА:
   • Всього файлів: 629
   • Активних файлів: 615
   • Невикористовуваних файлів: 12
   • Застарілих файлів: 2
   • Всього рядків: 523456

🏥 ЗДОРОВ'Я: 78.5/100
   • Модульність: good
   • Невикористання: 1.9%

🔄 ЦИКЛІЧНІ ЗАЛЕЖНОСТІ: 3
   ⚠️  Цикл 1: orchestrator/ai/api-request-optimizer.js → orchestrator/ai/validation/request-validator.js → orchestrator/ai/api-request-optimizer.js
   ⚠️  Цикл 2: web/core/auth.py → web/routes/api.py → web/core/auth.py
   ⚠️  Цикл 3: config/agents-config.js → config/api-config.js → config/agents-config.js
```

---

## 🔧 Конфігурація

### Змінити інтервал аналізу

Відредагуйте `architecture_daemon.py`:

```python
# Змініть це значення (в секундах)
daemon = ArchitectureDaemon(check_interval=300)  # 5 хвилин
daemon = ArchitectureDaemon(check_interval=60)   # 1 хвилина
daemon = ArchitectureDaemon(check_interval=1800) # 30 хвилин
```

### Змінити глибину аналізу

Відредагуйте `architecture_daemon.py`:

```python
# У методі _check_architecture()
architecture = self.mapper.analyze_architecture(max_depth=2)  # Поточно
architecture = self.mapper.analyze_architecture(max_depth=1)  # Швидше
architecture = self.mapper.analyze_architecture(max_depth=3)  # Глибше
```

---

## 📋 Логи

### Розташування

```
codemap-system/logs/architecture_daemon.log
```

### Переглянути логи

```bash
# Останні 50 рядків
tail -50 logs/architecture_daemon.log

# Слідкувати за логами в реальному часі
tail -f logs/architecture_daemon.log

# Пошук циклічних залежностей в логах
grep "Цикл" logs/architecture_daemon.log

# Пошук помилок
grep "❌" logs/architecture_daemon.log
```

---

## 🎯 Використання з Windsurf

### Запустити daemon у фоні

```bash
# На macOS/Linux
nohup python3 architecture_daemon.py > logs/daemon.out 2>&1 &

# Або використовувати screen
screen -S architecture
python3 architecture_daemon.py
# Натисніть Ctrl+A потім D для вихода
```

### Перевірити статус

```bash
# Переглянути процеси Python
ps aux | grep architecture_daemon

# Переглянути останні логи
tail -20 logs/architecture_daemon.log
```

### Зупинити daemon

```bash
# Знайти PID
ps aux | grep architecture_daemon

# Зупинити процес
kill <PID>
```

---

## 🚨 Вирішення проблем

### Daemon не запускається

```bash
# Перевірити Python версію
python3 --version  # Потрібна 3.7+

# Перевірити залежності
pip install -r requirements.txt

# Перевірити дозволи
chmod +x architecture_daemon.py
```

### Daemon повільно працює

```bash
# Зменшити глибину аналізу
max_depth=1  # замість 2

# Збільшити інтервал
check_interval=600  # замість 300 (10 хвилин)
```

### Помилки в логах

```bash
# Переглянути помилки
grep "ERROR" logs/architecture_daemon.log

# Переглянути попередження
grep "WARNING" logs/architecture_daemon.log
```

---

## 📊 Моніторинг

### Перевірити, чи daemon працює

```bash
# Переглянути останні логи
tail -5 logs/architecture_daemon.log

# Якщо бачите "🔍 Аналіз архітектури..." - daemon працює!
```

### Отримати статистику

```bash
# Кількість аналізів
grep "✅ Аналіз завершено" logs/architecture_daemon.log | wc -l

# Кількість циклічних залежностей
grep "🔄 ЦИКЛІЧНІ ЗАЛЕЖНОСТІ:" logs/architecture_daemon.log
```

---

## 🔄 Автоматичний запуск при старті

### На macOS (LaunchAgent)

Створіть файл `~/Library/LaunchAgents/com.atlas.architecture.plist`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.atlas.architecture</string>
    <key>ProgramArguments</key>
    <array>
        <string>/usr/local/bin/python3</string>
        <string>/Users/dev/Documents/GitHub/atlas4/codemap-system/architecture_daemon.py</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>/Users/dev/Documents/GitHub/atlas4/codemap-system/logs/daemon.out</string>
    <key>StandardErrorPath</key>
    <string>/Users/dev/Documents/GitHub/atlas4/codemap-system/logs/daemon.err</string>
</dict>
</plist>
```

Потім запустіть:

```bash
launchctl load ~/Library/LaunchAgents/com.atlas.architecture.plist
```

---

## 📝 Примітки

- Daemon працює постійно у фоні
- Не впливає на розробку
- Можна запустити декілька копій (кожна з різними інтервалами)
- Логи зберігаються в `logs/architecture_daemon.log`
- Можна переглядати логи в реальному часі

---

## 🎯 Наступні кроки

1. ✅ Запустити daemon
2. ⏳ Переглянути логи
3. ⏳ Перейти до Фази 2 (Windsurf інтеграція)

---

**Версія**: 1.0  
**Статус**: Готово  
**Дата**: 22 листопада 2025
