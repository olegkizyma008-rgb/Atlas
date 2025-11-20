# 🌐 Windsurf MCP Setup – Integration Guide

## ✅ MCP Server запущено!

**Status**: ✅ RUNNING (PID: 66673)  
**Type**: Enhanced Codemap MCP Server  
**Tools**: 16  
**Resources**: 8  

---

## 🔧 Налаштування Windsurf

### Крок 1: Відкрити Windsurf Settings

1. Відкрийте Windsurf
2. Натисніть `Cmd + ,` (на Mac) або `Ctrl + ,` (на Windows/Linux)
3. Шукайте "MCP" або "Model Context Protocol"

### Крок 2: Додати MCP Server

**Опція A: Через UI (Рекомендовано)**

1. Перейдіть до **Settings → Extensions → MCP**
2. Натисніть **"Add MCP Server"**
3. Виберіть **"Custom"**
4. Заповніть:
   - **Name**: `Orchestrator Codemap`
   - **Type**: `stdio`
   - **Command**: `python3`
   - **Arguments**: `/Users/dev/Documents/GitHub/atlas4/codemap-system/mcp_server_daemon.py`

**Опція B: Через JSON (Для продвинутих)**

Знайдіть файл `~/.codeium/windsurf/mcp_config.json` і додайте:

```json
{
  "mcpServers": {
    "orchestrator-codemap": {
      "command": "python3",
      "args": [
        "/Users/dev/Documents/GitHub/atlas4/codemap-system/mcp_server_daemon.py"
      ],
      "env": {
        "PYTHONPATH": "/Users/dev/Documents/GitHub/atlas4/codemap-system"
      }
    }
  }
}
```

### Крок 3: Перезавантажити Windsurf

1. Закрийте Windsurf повністю
2. Відкрийте знову
3. Перевірте, чи MCP з'явився в лівій панелі

---

## 📊 Перевірка Підключення

### У Windsurf

1. Відкрийте **MCP** панель (ліва сторона)
2. Повинні бачити:
   - ✅ Orchestrator Codemap (або ваша назва)
   - 📊 8 Resources
   - 🔧 16 Tools

### У Терміналі

```bash
# Перевірити, чи MCP запущено
ps aux | grep mcp_server_daemon

# Переглянути логи
tail -f /Users/dev/Documents/GitHub/atlas4/codemap-system/logs/mcp_daemon.log
```

---

## 🎯 Використання в Windsurf

### Після підключення MCP

Ви зможете використовувати команди:

```
@cascade get_quick_assessment(directory: "orchestrator")
@cascade get_disqualification_report(directory: "orchestrator")
@cascade get_editor_quick_view(file_path: "orchestrator/app.js")
@cascade analyze_file_deeply(file_path: "orchestrator/app.js")
@cascade generate_refactoring_plan(priority: "high")
```

---

## 🚀 Автоматичний Запуск

### Опція 1: Через Launch Script

```bash
cd /Users/dev/Documents/GitHub/atlas4/codemap-system
bash launch_full_power.sh
```

Це запустить:
- ✅ Enhanced Analyzer
- ✅ MCP Server Daemon
- ✅ Power Tools

### Опція 2: Через Systemd (Linux/Mac)

Створіть файл `~/.config/systemd/user/mcp-orchestrator.service`:

```ini
[Unit]
Description=MCP Orchestrator Codemap Server
After=network.target

[Service]
Type=simple
ExecStart=/usr/bin/python3 /Users/dev/Documents/GitHub/atlas4/codemap-system/mcp_server_daemon.py
Restart=always
RestartSec=10

[Install]
WantedBy=default.target
```

Потім:
```bash
systemctl --user enable mcp-orchestrator
systemctl --user start mcp-orchestrator
```

### Опція 3: Через LaunchAgent (Mac)

Створіть файл `~/Library/LaunchAgents/com.orchestrator.mcp.plist`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.orchestrator.mcp</string>
    <key>ProgramArguments</key>
    <array>
        <string>/usr/bin/python3</string>
        <string>/Users/dev/Documents/GitHub/atlas4/codemap-system/mcp_server_daemon.py</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
</dict>
</plist>
```

Потім:
```bash
launchctl load ~/Library/LaunchAgents/com.orchestrator.mcp.plist
```

---

## 🔍 Troubleshooting

### MCP не з'являється у Windsurf

**Рішення 1**: Перезавантажити Windsurf
```bash
# Закрийте Windsurf і відкрийте знову
```

**Рішення 2**: Перевірити логи
```bash
tail -f /Users/dev/Documents/GitHub/atlas4/codemap-system/logs/mcp_daemon.log
```

**Рішення 3**: Перезапустити MCP Server
```bash
pkill -f mcp_server_daemon
cd /Users/dev/Documents/GitHub/atlas4/codemap-system
python3 mcp_server_daemon.py &
```

### MCP показує помилку

**Перевірити**:
1. Python 3 встановлено: `python3 --version`
2. Залежності встановлені: `pip install -r requirements.txt`
3. Шляхи правильні: `ls -la /Users/dev/Documents/GitHub/atlas4/codemap-system/`

### Інструменти не працюють

**Перевірити**:
1. Звіти генеруються: `ls -lh /Users/dev/Documents/GitHub/atlas4/reports/`
2. Analyzer запущено: `ps aux | grep mcp_enhanced_analyzer`
3. Логи помилок: `tail -f /Users/dev/Documents/GitHub/atlas4/codemap-system/logs/enhanced_mcp_server.log`

---

## 📋 Компоненти

### MCP Server Daemon
- **Файл**: `mcp_server_daemon.py`
- **Функція**: Запускає MCP Server як постійний сервіс
- **Статус**: ✅ RUNNING

### Enhanced MCP Server
- **Файл**: `mcp_enhanced_server.py`
- **Функція**: Надає 16 інструментів та 8 ресурсів
- **Статус**: ✅ READY

### Advanced Tools
- **Файл**: `mcp_advanced_tools.py`
- **Функція**: 7 продвинутих інструментів
- **Статус**: ✅ LOADED

### Power Tools
- **Файл**: `windsurf_power_tools.py`
- **Функція**: 3 гіпер-інструменти
- **Статус**: ✅ LOADED

---

## ✨ Результат

**Після налаштування:**

✅ MCP буде видно у Windsurf  
✅ 16 інструментів будуть доступні  
✅ Можна аналізувати код в реальному часі  
✅ Автоматичні рекомендації  
✅ Дискваліфікація проблем  

---

## 🎯 Наступні кроки

1. **Налаштувати Windsurf** – Додати MCP Server
2. **Перезавантажити** – Windsurf
3. **Перевірити** – MCP з'явився
4. **Використовувати** – Команди @cascade

---

**Status**: ✅ MCP SERVER RUNNING  
**Ready**: ✅ FOR WINDSURF INTEGRATION  
**Tools**: 16  
**Resources**: 8

🌐 **MCP ГОТОВИЙ ДО ВИКОРИСТАННЯ!** 🌐
