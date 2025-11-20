# 🚀 Launch Instructions – Full Power System

## ✅ Система готова до запуску

Є **3 способи** запустити систему на повну потужність.

---

## 1️⃣ Простий запуск (Рекомендовано)

```bash
cd /Users/dev/Documents/GitHub/atlas4/codemap-system
bash deploy.sh
```

**Що робить:**
- ✅ Запускає Enhanced Analyzer (5 шарів, безперервна робота)
- ✅ Запускає MCP Server (16 інструментів)
- ✅ Починає постійний аналіз
- ✅ Надає доступ для Windsurf Cascade

---

## 2️⃣ Full Power Launch

```bash
cd /Users/dev/Documents/GitHub/atlas4/codemap-system
bash launch_full_power.sh
```

**Що робить:**
- ✅ Запускає систему на ПОВНУ потужність
- ✅ Показує статус обох компонентів
- ✅ Чекає на перший цикл аналізу
- ✅ Показує інструкції для Windsurf
- ✅ Автоматично перезапускає при збої

---

## 3️⃣ Ручний запуск (Для налагодження)

### Запустити Analyzer
```bash
cd /Users/dev/Documents/GitHub/atlas4/codemap-system
python3 mcp_enhanced_analyzer.py
```

### Запустити MCP Server (в іншому терміналі)
```bash
cd /Users/dev/Documents/GitHub/atlas4/codemap-system
python3 mcp_enhanced_server.py
```

---

## 📊 Перевірка статусу

### Перевірити, чи запущені процеси
```bash
ps aux | grep -E "mcp_enhanced|python3" | grep -v grep
```

### Переглянути логи Analyzer
```bash
tail -f /Users/dev/Documents/GitHub/atlas4/codemap-system/logs/analyzer.log
```

### Переглянути логи Server
```bash
tail -f /Users/dev/Documents/GitHub/atlas4/codemap-system/logs/server.log
```

### Переглянути звіти
```bash
ls -lh /Users/dev/Documents/GitHub/atlas4/reports/
```

---

## 🎯 Використання в Windsurf

### Миттєва оцінка
```
@cascade get_quick_assessment(directory: "orchestrator")
```

### Дискваліфікація проблем
```
@cascade get_disqualification_report(directory: "orchestrator")
```

### Статус файлу
```
@cascade get_editor_quick_view(file_path: "orchestrator/app.js")
```

---

## 🛑 Зупинення системи

### Ctrl+C (якщо запущено в терміналі)
```
Ctrl+C
```

### Або вручну
```bash
pkill -f "mcp_enhanced_analyzer"
pkill -f "mcp_enhanced_server"
```

---

## 📈 Система компонентів

```
┌─────────────────────────────────────────────────────────┐
│  Enhanced Analyzer                                      │
│  - 5 шарів аналізу                                      │
│  - Безперервна робота (кожну хвилину)                  │
│  - Генерує звіти в /reports/                            │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
         /reports/*.json
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│  MCP Server                                             │
│  - 16 інструментів                                      │
│  - Доступні в Windsurf Cascade                          │
│  - Реальний час доступ                                  │
└─────────────────────────────────────────────────────────┘
```

---

## ✨ Режим роботи

### Постійний шаровий аналіз
- ✅ Analyzer запускає цикли кожну хвилину
- ✅ Кожен цикл проходить всі 5 шарів послідовно
- ✅ Звіти оновлюються автоматично
- ✅ MCP Server надає доступ до всіх даних

### Автоматичне перезапускання
- ✅ Якщо Analyzer зупинився, перезапускається
- ✅ Якщо Server зупинився, перезапускається
- ✅ Система працює 24/7 без втручання

---

## 📊 Результати

**Система запущена на ПОВНУ потужність:**

- ✅ 5-шаровий безперервний аналіз
- ✅ 16 потужних інструментів
- ✅ 3 гіпер-інструменти для дискваліфікації
- ✅ Постійне оновлення звітів
- ✅ Реальний час доступ для Windsurf

---

## 🔥 Почніть з

```bash
bash deploy.sh
```

Або

```bash
bash launch_full_power.sh
```

---

**Status**: ✅ READY TO LAUNCH  
**Mode**: Full Power + Continuous Layered Analysis  
**Tools**: 16  
**Version**: 2.0 (Hyper-Power Edition)
