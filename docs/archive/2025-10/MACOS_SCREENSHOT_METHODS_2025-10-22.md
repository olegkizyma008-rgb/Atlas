# macOS Screenshot Methods - Non-Interactive Guide

**Дата:** 2025-10-22  
**Проблема:** `screencapture -w` показує інтерактивний курсор (фотоапарат)  
**Рішення:** Використання non-interactive методів

---

## ❌ Проблемний метод (НЕ ВИКОРИСТОВУВАТИ)

```bash
screencapture -w /path/to/file.png
```
- Показує інтерактивний курсор-фотоапарат
- Потребує ручного вибору вікна
- Блокує автоматизацію

---

## ✅ Робочі методи (БЕЗ інтерактивного курсору)

### 1. **Window Bounds Method** (НАЙКРАЩИЙ для конкретного вікна)

```bash
osascript << 'EOF'
tell application "Calculator"
    if (count of windows) > 0 then
        activate
        delay 0.3
        set windowID to id of window 1
        do shell script "screencapture -x -l " & windowID & " /tmp/screenshot.png"
    end if
end tell
EOF
```

**Переваги:**
- ✅ Захоплює ТІЛЬКИ конкретне вікно (найменший розмір ~249KB)
- ✅ Без інтерактивного курсору
- ✅ Працює навіть якщо вікно частково закрите
- ✅ Найточніший метод

**Використання в коді:**
```javascript
const windowBoundsScript = `
    tell application "${appName}"
        if (count of windows) > 0 then
            activate
            delay 0.3
            set windowID to id of window 1
            do shell script "screencapture -x -l " & windowID & " \\"${filepath}\\""
            return "success"
        else
            return "no_windows"
        end if
    end tell
`;
await execAsync(`osascript -e '${windowBoundsScript}'`);
```

---

### 2. **Full Screen** (найшвидший fallback)

```bash
screencapture -x /path/to/file.png
```

**Переваги:**
- ✅ Найшвидший метод
- ✅ Завжди працює
- ✅ Захоплює весь екран (~576KB)

**Опції:**
- `-x` - без звуку
- `-o` - без тіні вікон
- `-m` - тільки головний монітор
- `-D1` - конкретний дисплей (1, 2, 3...)

---

### 3. **Frontmost App** (активне вікно)

```bash
osascript -e 'tell application "System Events" to set frontApp to name of first application process whose frontmost is true'
osascript -e 'tell application frontApp to activate'
sleep 0.5
screencapture -x -o /path/to/file.png
```

**Переваги:**
- ✅ Захоплює екран з активним додатком
- ✅ Без інтерактивного курсору
- ✅ Розмір ~912KB

---

### 4. **Specific Display**

```bash
screencapture -xD1 /path/to/file.png  # Display 1
screencapture -xD2 /path/to/file.png  # Display 2
```

**Переваги:**
- ✅ Вибір конкретного монітора
- ✅ Корисно для multi-monitor setup

---

## 📊 Порівняння методів

| Метод | Розмір | Швидкість | Точність | Інтерактивний? |
|-------|--------|-----------|----------|----------------|
| Window Bounds | 249KB | Середня | ⭐⭐⭐⭐⭐ | ❌ Ні |
| Full Screen | 576KB | Найшвидша | ⭐⭐⭐ | ❌ Ні |
| Frontmost App | 912KB | Швидка | ⭐⭐⭐⭐ | ❌ Ні |
| `-w` flag | Varies | Повільна | ⭐⭐⭐⭐⭐ | ✅ **ТАК** |

---

## 🔧 Виправлення в Atlas4

### До (проблемний код):
```javascript
// ❌ Показує інтерактивний курсор
const captureCmd = `screencapture -o -w -x "${filepath}"`;
await execAsync(captureCmd);
```

### Після (виправлено):
```javascript
// ✅ Strategy 1: Window bounds (найкращий)
const windowBoundsScript = `
    tell application "${appName}"
        if (count of windows) > 0 then
            activate
            delay 0.3
            set windowID to id of window 1
            do shell script "screencapture -x -l " & windowID & " \\"${filepath}\\""
            return "success"
        end if
    end tell
`;
await execAsync(`osascript -e '${windowBoundsScript}'`);

// ✅ Strategy 2: Full screen fallback (якщо Strategy 1 не спрацює)
const captureCmd = `screencapture -x -o "${filepath}"`;
await execAsync(captureCmd);
```

---

## 🧪 Тестування

Створено тестовий скрипт: `/tmp/test_all_screenshot_methods.sh`

**Результати тестів:**
```
1. Full screen (-x)                    ✓ 576KB
2. Main display (-xm)                  ✓ 575KB
3. No shadow (-xo)                     ✓ 569KB
4. Delayed (-T2)                       ✓ 569KB
5. Frontmost app                       ✓ 912KB
6. Window ID (Calculator)              ⚠ Needs window
7. Finder activation                   ✓ 1.1MB
8. Display 1 (-xD1)                    ✓ 1.1MB
9. Silent (-x)                         ✓ 1.1MB
10. Window bounds (BEST)               ✓ 249KB ⭐
```

---

## 📝 Приклади використання

### Захоплення Calculator:
```bash
osascript << 'EOF'
tell application "Calculator"
    activate
    delay 0.3
    if (count of windows) > 0 then
        set windowID to id of window 1
        do shell script "screencapture -x -l " & windowID & " /tmp/calc.png"
    end if
end tell
EOF
```

### Захоплення Safari:
```bash
osascript << 'EOF'
tell application "Safari"
    activate
    delay 0.3
    if (count of windows) > 0 then
        set windowID to id of window 1
        do shell script "screencapture -x -l " & windowID & " /tmp/safari.png"
    end if
end tell
EOF
```

### Захоплення Finder:
```bash
osascript << 'EOF'
tell application "Finder"
    activate
    delay 0.3
    if (count of windows) > 0 then
        set windowID to id of window 1
        do shell script "screencapture -x -l " & windowID & " /tmp/finder.png"
    end if
end tell
EOF
```

---

## 🎯 Рекомендації

### Для Atlas4 Grisha Verification:

1. **Primary:** Window Bounds Method
   - Найточніший
   - Найменший розмір
   - Захоплює тільки потрібне вікно

2. **Fallback:** Full Screen
   - Якщо Window Bounds не спрацює
   - Завжди працює
   - Швидкий

3. **Avoid:** `-w` flag
   - Інтерактивний курсор
   - Блокує автоматизацію
   - Не підходить для AI verification

---

## 🔗 Корисні посилання

**screencapture опції:**
```
-x    No sound
-o    No window shadow
-l    Window ID
-w    Interactive window selection (AVOID!)
-m    Main display only
-D    Specific display number
-T    Delay in seconds
```

**AppleScript window commands:**
```applescript
tell application "AppName"
    get id of window 1          -- Get window ID
    get name of window 1        -- Get window name
    count of windows            -- Number of windows
    activate                    -- Bring to front
end tell
```

---

**Статус:** ✅ Виправлено в visual-capture-service.js  
**Версія:** 1.0.0  
**Автор:** Cascade AI
