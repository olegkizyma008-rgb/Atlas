# 🔧 Відсутні Моделі в .env

**Дата:** 2025-11-03 14:40  
**Проблема:** Система використовує `atlas-mistral-small-2503` без можливості заміни через `.env`

---

## 🚨 Помилки в Логах

```
14:39:14 📤 POST /v1/chat/completions ❌ 🤖 atlas-mistral-small-2503
14:39:14 📤 POST /v1/chat/completions ❌ 🤖 atlas-mistral-small-2503
```

---

## 🔍 Де Використовується

### **1. Intent Detection** ✅ (є в .env)
**Файл:** `orchestrator/workflow/stages/intent-detector.js:43`
```javascript
this.modelConfig = {
    model: 'atlas-mistral-small-2503',  // hardcoded fallback
    temperature: 0.1,
    max_tokens: 150
};
```

**Конфіг:** `config/models-config.js:367`
```javascript
intent_detection: {
  model: env.INTENT_DETECTION_MODEL || 'atlas-mistral-small-2503',  // ✅ є fallback
  ...
}
```

**В .env:**
```bash
INTENT_DETECTION_MODEL=atlas-ministral-3b  # ✅ ВИЗНАЧЕНО
```

---

### **2. Verify Item** ❌ (НЕМАЄ в .env)
**Конфіг:** `config/models-config.js:221`
```javascript
verify_item: {
  get model() {
    return env.MCP_MODEL_VERIFY_ITEM || 'atlas-mistral-small-2503';  // ❌ НЕ ВИЗНАЧЕНО
  },
  ...
}
```

**В .env:**
```bash
MCP_MODEL_VERIFY_ITEM=???  # ❌ ВІДСУТНЯ ЗМІННА
```

---

## ✅ РІШЕННЯ

Додай в свій `.env` файл (після рядка 52):

```bash
# === MCP MODEL CONFIGURATION ===
MCP_MODEL_MODE_SELECTION=atlas-ministral-3b
MCP_TEMP_MODE_SELECTION=0.05
MCP_MODEL_BACKEND_SELECTION=atlas-ministral-3b
MCP_TEMP_BACKEND_SELECTION=0.05
MCP_MODEL_CONTEXT_ENRICHMENT=ext-mistral-codestral-latest
MCP_TEMP_CONTEXT_ENRICHMENT=0.3
MCP_MODEL_TODO_PLANNING=ext-mistral-codestral-latest
MCP_TEMP_TODO_PLANNING=0.3
MCP_MODEL_PLAN_TOOLS=atlas-gpt-4o-mini
MCP_TEMP_PLAN_TOOLS=0.1
MCP_MODEL_VERIFICATION_ELIGIBILITY=atlas-ministral-3b
MCP_TEMP_VERIFICATION_ELIGIBILITY=0.1
MCP_MODEL_VERIFY_ITEM=atlas-mistral-small-2503  # ← ДОДАЙ ЦЮ ЗМІННУ
MCP_TEMP_VERIFY_ITEM=0.15
MCP_MODEL_ADJUST_TODO=ext-mistral-codestral-latest
MCP_TEMP_ADJUST_TODO=0.2
MCP_MODEL_REPLAN_TODO=ext-mistral-codestral-latest
MCP_TEMP_REPLAN_TODO=0.3
MCP_MODEL_FINAL_SUMMARY=atlas-ministral-3b
MCP_TEMP_FINAL_SUMMARY=0.5
MCP_MODEL_VISION=atlas-llama-3.2-11b-vision-instruct
MCP_TEMP_VISION=0.2
MCP_MODEL_DEV_ANALYSIS=ext-mistral-codestral-latest
MCP_TEMP_DEV_ANALYSIS=0.2
MCP_MODEL_TTS_OPT=atlas-ministral-3b
MCP_TEMP_TTS_OPT=0.3
```

---

## 🔄 Альтернативні Моделі

Якщо `atlas-mistral-small-2503` недоступна на localhost:4000, заміни на:

```bash
# Швидка альтернатива (3B параметрів)
MCP_MODEL_VERIFY_ITEM=atlas-ministral-3b

# Або більш потужна (якщо є)
MCP_MODEL_VERIFY_ITEM=atlas-mistral-medium-2505

# Або Codestral для точності
MCP_MODEL_VERIFY_ITEM=ext-mistral-codestral-2405
```

---

## 📋 Повний Список Моделей Atlas

**Доступні на localhost:4000:**

### **Швидкі (для класифікації):**
- `atlas-ministral-3b` - 3B параметрів, дуже швидка
- `atlas-mistral-small-2503` - Small, швидка та точна
- `atlas-ai21-jamba-1.5-mini` - ultra fast

### **Середні (для чату та аналізу):**
- `atlas-mistral-medium-2505` - Medium, баланс швидкості/якості
- `ext-mistral-codestral-2405` - Codestral, для коду

### **Великі (для складних задач):**
- `atlas-gpt-4o-mini` - GPT-4o mini
- `atlas-llama-3.2-11b-vision-instruct` - Vision AI
- `atlas-llama-3.2-90b-vision-instruct` - Vision AI (strong)

### **Спеціалізовані:**
- `atlas-phi-4-mini-instruct` - TTS оптимізація

---

## 🎯 Швидке Виправлення

**Команда для додавання в .env:**
```bash
# Додай після рядка MCP_TEMP_VERIFICATION_ELIGIBILITY=0.1
echo "MCP_MODEL_VERIFY_ITEM=atlas-mistral-small-2503" >> .env
echo "MCP_TEMP_VERIFY_ITEM=0.15" >> .env
```

**Або заміни на доступну модель:**
```bash
echo "MCP_MODEL_VERIFY_ITEM=atlas-ministral-3b" >> .env
echo "MCP_TEMP_VERIFY_ITEM=0.15" >> .env
```

**Потім перезапусти:**
```bash
./restart_system.sh restart
```

---

## ✅ Результат

Після додавання змінної:
- ✅ Модель можна змінити через `.env`
- ✅ Немає hardcoded значень
- ✅ Система використовує правильну модель
- ✅ Логи не показують помилок

**Оновлено `.env.example` з правильною змінною!** 🚀
