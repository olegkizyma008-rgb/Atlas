# CASCADE MODELS INTEGRATION GUIDE

**Дата:** 2025-11-03  
**Версія:** 1.0

## 🎯 Доступні моделі в Nexus

### **1. CASCADE_PRIMARY_MODEL** 
**Модель:** `claude-sonnet-4.5-thinking`  
**Призначення:** Глибокий аналіз, стратегічне мислення  
**Використовується для:**
- `deep-analysis` - глибокий аналіз системи
- `strategy` - створення стратегій виправлення
- `thinking` - складні міркування

**Параметри:**
- Temperature: `0.3-0.4`
- Max tokens: `3000-4000`

---

### **2. CASCADE_CODE_ANALYSIS_MODEL**
**Модель:** `gpt-5-codex`  
**Призначення:** Аналіз коду, розуміння програмного контексту  
**Використовується для:**
- `code-analysis` - аналіз коду та виявлення багів
- `data-collection` - збір інформації з файлів

**Параметри:**
- Temperature: `0.1`
- Max tokens: `2000-2500`

---

### **3. CASCADE_CODESTRAL_MODEL** ✨ NEW
**Модель:** `codestral-latest`  
**Призначення:** Tool planning, file operations, JSON  
**Використовується для:**
- `tool-planning` - планування використання інструментів
- `file-operations` - операції з файлами
- `json-generation` - генерація чистого JSON

**Параметри:**
- Temperature: `0.05-0.15`
- Max tokens: `1500-2000`

**Чому Codestral:**
- Спеціалізація на structured output (JSON)
- Швидкість виконання
- Точність у file operations
- Низька вартість

---

### **4. CASCADE_FALLBACK_MODEL**
**Модель:** `claude-sonnet-4.5`  
**Призначення:** Загальні задачі, чат  
**Використовується для:**
- `general` - загальні запити
- `chat` - природні розмови

**Параметри:**
- Temperature: `0.2`
- Max tokens: `2000`

---

## ⚙️ Конфігурація через .env

### **Базова конфігурація:**

```bash
# === CASCADE MODELS ===
CASCADE_PRIMARY_MODEL=claude-sonnet-4.5-thinking
CASCADE_FALLBACK_MODEL=claude-sonnet-4.5
CASCADE_CODE_ANALYSIS_MODEL=gpt-5-codex
CASCADE_CODESTRAL_MODEL=codestral-latest

# Codestral settings
CASCADE_CODESTRAL_ENABLED=true
CASCADE_CODESTRAL_TEMP=0.2
CASCADE_CODESTRAL_MAX_TOKENS=4000
```

### **Як змінити моделі:**

**Приклад 1: Використати Claude замість GPT-5 Codex для аналізу коду**
```bash
CASCADE_CODE_ANALYSIS_MODEL=claude-sonnet-4.5
```

**Приклад 2: Використати іншу версію Codestral**
```bash
CASCADE_CODESTRAL_MODEL=ext-mistral-codestral-2405
```

**Приклад 3: Змінити primary модель на GPT**
```bash
CASCADE_PRIMARY_MODEL=gpt-4o
```

---

## 🔄 Як це працює в Nexus

### **Workflow виправлення бага:**

```
1. Користувач: "Виправ цей баг"
   ↓
2. MultiModelOrchestrator._selectModelForTask('code-analysis')
   → Вибирає: gpt-5-codex (CASCADE_CODE_ANALYSIS_MODEL)
   ↓
3. GPT-5 Codex аналізує код, знаходить проблему
   ↓
4. MultiModelOrchestrator._selectModelForTask('tool-planning')
   → Вибирає: codestral-latest (CASCADE_CODESTRAL_MODEL)
   ↓
5. Codestral створює план інструментів для виправлення
   ↓
6. MultiModelOrchestrator._selectModelForTask('strategy')
   → Вибирає: claude-sonnet-4.5-thinking (CASCADE_PRIMARY_MODEL)
   ↓
7. Claude Thinking створює стратегію виконання
   ↓
8. WindsurfCodeEditor застосовує зміни
   ↓
9. ✅ Баг виправлено
```

---

## 📊 Маппінг задач → моделі

| **TaskType** | **Модель** | **ENV Variable** | **Use Case** |
|-------------|-----------|------------------|--------------|
| `code-analysis` | `gpt-5-codex` | `CASCADE_CODE_ANALYSIS_MODEL` | Аналіз коду |
| `data-collection` | `gpt-5-codex` | `CASCADE_CODE_ANALYSIS_MODEL` | Збір даних |
| `tool-planning` | `codestral-latest` | `CASCADE_CODESTRAL_MODEL` | Планування tools |
| `file-operations` | `codestral-latest` | `CASCADE_CODESTRAL_MODEL` | Операції з файлами |
| `json-generation` | `codestral-latest` | `CASCADE_CODESTRAL_MODEL` | JSON output |
| `deep-analysis` | `claude-sonnet-4.5-thinking` | `CASCADE_PRIMARY_MODEL` | Глибокий аналіз |
| `strategy` | `claude-sonnet-4.5-thinking` | `CASCADE_PRIMARY_MODEL` | Стратегія |
| `thinking` | `claude-sonnet-4.5-thinking` | `CASCADE_PRIMARY_MODEL` | Складні міркування |
| `general` | `claude-sonnet-4.5` | `CASCADE_FALLBACK_MODEL` | Загальні задачі |
| `chat` | `claude-sonnet-4.5` | `CASCADE_FALLBACK_MODEL` | Чат |

---

## 🎨 Приклади використання

### **Приклад 1: Виправлення бага з логуванням**

```javascript
// Nexus вибере моделі:
await multiModelOrchestrator.executeTask('code-analysis', 'Analyze bug in logger.js');
// → gpt-5-codex (CASCADE_CODE_ANALYSIS_MODEL)

await multiModelOrchestrator.executeTask('tool-planning', 'Plan fix steps');
// → codestral-latest (CASCADE_CODESTRAL_MODEL)

await multiModelOrchestrator.executeTask('strategy', 'Create repair strategy');
// → claude-sonnet-4.5-thinking (CASCADE_PRIMARY_MODEL)
```

### **Приклад 2: Збір даних про систему**

```javascript
await multiModelOrchestrator.autonomousDataCollection({
    logsPath: '/logs',
    configPath: '/config'
});
// Використовує: codestral-latest для file operations
// Потім: gpt-5-codex для аналізу даних
```

---

## 🔧 Налаштування для різних сценаріїв

### **Сценарій 1: Максимальна швидкість (low cost)**
```bash
CASCADE_PRIMARY_MODEL=claude-sonnet-4.5
CASCADE_CODE_ANALYSIS_MODEL=codestral-latest
CASCADE_CODESTRAL_MODEL=codestral-latest
CASCADE_FALLBACK_MODEL=claude-sonnet-4.5
```

### **Сценарій 2: Максимальна якість (high accuracy)**
```bash
CASCADE_PRIMARY_MODEL=claude-sonnet-4.5-thinking
CASCADE_CODE_ANALYSIS_MODEL=gpt-5-codex
CASCADE_CODESTRAL_MODEL=ext-mistral-codestral-latest
CASCADE_FALLBACK_MODEL=claude-sonnet-4.5-thinking
```

### **Сценарій 3: Збалансований (recommended)**
```bash
CASCADE_PRIMARY_MODEL=claude-sonnet-4.5-thinking
CASCADE_CODE_ANALYSIS_MODEL=gpt-5-codex
CASCADE_CODESTRAL_MODEL=codestral-latest
CASCADE_FALLBACK_MODEL=claude-sonnet-4.5
```

---

## ✅ Переваги CASCADE моделей

1. **Гнучкість** - можна змінювати через .env без зміни коду
2. **Спеціалізація** - кожна модель для свого типу задач
3. **Оптимізація** - правильна температура та max_tokens для кожної задачі
4. **Економія** - Codestral для JSON, GPT-5 Codex для коду, Claude для мислення
5. **Логування** - кожен вибір моделі логується в `[NEXUS] Selected model`

---

## 🧪 Тестування

### **Перевірка що моделі підтягуються:**

```bash
# 1. Запустити систему
./restart_system.sh restart

# 2. Відправити DEV запит
curl -X POST http://localhost:5101/chat/stream \
  -H "Content-Type: application/json" \
  -d '{"message": "Проаналізуй себе", "session_id": "test"}'

# 3. Перевірити логи
grep "NEXUS.*Selected model" logs/orchestrator.log

# Очікуваний результат:
# [NEXUS] Selected model for code-analysis: gpt-5-codex
# [NEXUS] Selected model for tool-planning: codestral-latest
# [NEXUS] Selected model for deep-analysis: claude-sonnet-4.5-thinking
```

---

## 📝 Висновок

**✅ ВСІ моделі підтягуються з .env:**
- `CASCADE_PRIMARY_MODEL` ✅
- `CASCADE_CODE_ANALYSIS_MODEL` ✅
- `CASCADE_CODESTRAL_MODEL` ✅ (НОВИЙ!)
- `CASCADE_FALLBACK_MODEL` ✅

**✅ Можна змінювати через .env файл**

**✅ Codestral має виділену роль:**
- Tool planning
- File operations
- JSON generation

**Nexus готовий до автономної роботи!** 🎨✨
