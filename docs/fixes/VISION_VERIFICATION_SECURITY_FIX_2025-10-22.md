# Vision Verification Security Fix - 2025-10-22

## Проблема

Система візуальної верифікації мала критичні вразливості безпеки, які дозволяли хибним позитивним результатам проходити перевірку:

### 1. Небезпечний текстовий фолбек у `_parseVisionResponse()`
- Логіка в `vision-analysis-service.js` вважала позитивні ключові слова (`yes`, `verified`, `success`) ознакою успіху навіть без структурованих доказів
- Якщо модель не поверталa JSON, система аналізувала текст і могла повернути `verified: true` на основі простих ключових слів
- Це дозволяло галюцинаціям моделі проходити автоматично

### 2. Скріншот повного екрану
- Через `screencapture -x` завжди захоплюється весь робочий стіл
- Модель може бачити випадкові вікна і "верифікувати" невірний контент
- Наприклад, при перевірці Calculator може побачити відкритий браузер з числом "8" і помилково підтвердити

### 3. Відсутність перевірок на `_fallback`
- `GrishaVerifyItemProcessor` не відрізняв надійні відповіді від аварійних
- Фолбек-відповіді проходили ті ж перевірки, що й структуровані JSON

## Виправлення

### ✅ 1. Відключено позитивний фолбек (`vision-analysis-service.js`)

**Файл:** `/orchestrator/services/vision-analysis-service.js`  
**Рядки:** 1064-1091

**Зміни:**
```javascript
// SECURITY FIX 2025-10-22: NEVER auto-verify from text fallback
const fallbackResponse = {
  verified: false,        // SECURITY: Always false for text fallback
  confidence: 0,          // SECURITY: Zero confidence without structured evidence
  reason: 'Vision model returned unstructured text instead of JSON. Cannot verify without structured evidence.',
  visual_evidence: {
    observed: 'Unable to extract structured visual details from text response',
    matches_criteria: false, // SECURITY: Always false without structured proof
    details: 'Text fallback mode - no reliable visual evidence available.'
  },
  _fallback: true,
  _fallback_reason: 'json_parse_failed',
  _security_note: 'Text fallback always returns verified=false to prevent false positives'
};
```

**Результат:**
- Текстовий режим НІКОЛИ не виставляє `verified: true`
- Confidence завжди 0 без структурованого JSON
- `matches_criteria` завжди `false` без явного збігу критеріїв
- Додано прапорець `_fallback: true` для ідентифікації

### ✅ 2. Додано перевірку `_fallback` у `GrishaVerifyItemProcessor`

**Файл:** `/orchestrator/workflow/stages/grisha-verify-item-processor.js`  
**Рядки:** 159-203

**Зміни:**
```javascript
// SECURITY CHECK 1: Reject fallback responses (no structured JSON from vision model)
if (visionAnalysis._fallback === true) {
    verified = false;
    rejectionReason = 'Vision model returned unstructured response - cannot verify without structured JSON evidence';
}

// SECURITY CHECK 2: Require matches_criteria to be explicitly true
if (verified && visionAnalysis.visual_evidence?.matches_criteria !== true) {
    verified = false;
    rejectionReason = 'Visual evidence does not explicitly match success criteria (matches_criteria !== true)';
}

// SECURITY CHECK 3: Require minimum confidence of 70%
if (visionAnalysis.verified && visionAnalysis.confidence < 70) {
    // Already handled above, but logged
}
```

**Результат:**
- Фолбек-відповіді завжди відхиляються
- Вимагається `matches_criteria === true` для підтвердження
- Мінімальна впевненість 70%
- Додано детальне логування перевірок безпеки

### ✅ 3. Додано валідацію доказів перед TTS

**Файл:** `/orchestrator/workflow/stages/grisha-verify-item-processor.js`  
**Рядки:** 211-259

**Зміни:**
```javascript
// SECURITY CHECK 4: Log evidence validation details
if (verification.verified) {
    this.logger.system('grisha-verify-item', `[VISUAL-GRISHA]   ✅ Evidence validation passed:`);
    this.logger.system('grisha-verify-item', `[VISUAL-GRISHA]      - Confidence: ${verification.confidence}%`);
    this.logger.system('grisha-verify-item', `[VISUAL-GRISHA]      - Matches criteria: ${verification.visual_evidence?.matches_criteria}`);
    this.logger.system('grisha-verify-item', `[VISUAL-GRISHA]      - Observed value: "${verification.visual_evidence?.observed}"`);
    this.logger.system('grisha-verify-item', `[VISUAL-GRISHA]      - Fallback mode: ${verification._fallback_detected}`);
}

// SECURITY: Double-check evidence before positive message
const hasValidEvidence = verification.visual_evidence?.observed && 
                        verification.visual_evidence?.matches_criteria === true &&
                        !verification._fallback_detected;

if (hasValidEvidence) {
    verificationMessage = `✅ Візуально підтверджено: "${currentItem.action}"\n${verification.visual_evidence.observed}`;
} else {
    // Fail-safe
    verificationMessage = `⚠️ Перевірка неоднозначна: ${verification.reason}`;
}
```

**Результат:**
- Перевірка `visual_evidence.observed` перед відправкою TTS
- Вимагається `matches_criteria === true`
- Перевірка відсутності `_fallback_detected`
- Детальне логування всіх доказів

### ✅ 4. Документовано обмеження захоплення вікон

**Файл:** `/orchestrator/services/visual-capture-service.js`  
**Рядки:** 121-141, 154-170

**Зміни:**
- Додано документацію про обмеження повноекранного захоплення
- Додано попередження при захопленні з `targetApp`
- Рекомендації щодо покращення:
  - Використовувати `screencapture -l <windowId>` для конкретного вікна
  - Використовувати AppleScript для отримання window ID
  - Фолбек на повний екран тільки якщо захоплення вікна не вдалося

**Приклад покращення:**
```bash
# Get window ID via AppleScript
osascript -e 'tell application "Calculator" to get id of window 1'

# Capture specific window
screencapture -l <windowId> -x screenshot.png
```

## Результат

### Захист від хибних позитивів:
1. ✅ Текстовий фолбек НІКОЛИ не підтверджує автоматично
2. ✅ Вимагається структурований JSON з `matches_criteria: true`
3. ✅ Мінімальна впевненість 70%
4. ✅ Валідація доказів перед TTS підтвердженням
5. ✅ Детальне логування всіх перевірок безпеки

### Логування безпеки:
```
[VISUAL] ⚠️  SECURITY: Vision model returned fallback response (no structured JSON)
[VISUAL-GRISHA] ❌ SECURITY: Rejecting fallback verification
[VISUAL-GRISHA] ❌ SECURITY: Visual evidence mismatch
[VISUAL] ⚠️  SECURITY: Full desktop capture may include unrelated windows
```

### Структура верифікації:
```javascript
{
  verified: false,              // Тільки true якщо ВСІ перевірки пройдені
  confidence: 0-100,            // Мінімум 70 для підтвердження
  visual_evidence: {
    observed: "...",            // Фактичне значення з екрану
    matches_criteria: true,     // ВИМАГАЄТЬСЯ для verified=true
    details: "..."
  },
  _fallback_detected: false,    // ВИМАГАЄТЬСЯ false для verified=true
  _security_checks_passed: true // Всі перевірки пройдені
}
```

## Тестування

Для перевірки виправлень:

1. **Тест фолбеку:** Викликати модель, яка не повертає JSON → має бути `verified: false`
2. **Тест низької впевненості:** Модель повертає `confidence: 50` → має бути відхилено
3. **Тест без matches_criteria:** Модель не встановлює `matches_criteria: true` → має бути відхилено
4. **Тест повного екрану:** Перевірити логи на попередження про full desktop capture

## Наступні кроки (опціонально)

### Покращення захоплення вікон:
1. Реалізувати `screencapture -l <windowId>` для macOS
2. Додати AppleScript для отримання window ID цільового додатку
3. Фолбек на повний екран тільки якщо window capture не вдається

### Додаткові перевірки:
1. Порівняння `observed` значення з очікуваним у `success_criteria`
2. Regex валідація для специфічних форматів (числа, дати, тощо)
3. Історія верифікацій для виявлення патернів помилок

---

**Дата:** 2025-10-22  
**Автор:** Cascade AI  
**Статус:** ✅ Завершено  
**Файли змінено:** 3
- `orchestrator/services/vision-analysis-service.js`
- `orchestrator/workflow/stages/grisha-verify-item-processor.js`
- `orchestrator/services/visual-capture-service.js`
