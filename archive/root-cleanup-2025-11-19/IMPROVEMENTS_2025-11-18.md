# Покращення верифікації Гріші (2025-11-18)

## Проблеми, які були виявлені

1. **Залежність від локального LLM-сервера (порт 4000) з помилками 500**
   - Запити робили 3 ретраї з експоненціальним backoff (1s, 2s, 4s) = ~7 секунд затримки
   - Потім ще 3 спроби різних моделей
   - Всього: до 9 спроб перед fallback

2. **Верифікація має сайд-ефекти (зміна активного вікна)**
   - Під час перевірки Grisha активував Calculator (повторно)
   - Це міняло стан системи, який мав би бути "об'єктом спостереження"
   - Додатковий шум/миготіння вікон

3. **Складна багатошарова логіка рішень**
   - 3 спроби моделей у `_callVisionAPI`
   - 3 ретраї у `_callVisionAPIWithRetry`
   - Складно відтрейсити, чому саме певний кейс прийнятий/відхилений

## Реалізовані покращення

### 1. Оптимізація фолбеку при помилках 500 (vision-analysis-service.js)

**Файл:** `/Users/dev/Documents/GitHub/atlas4/orchestrator/services/vision-analysis-service.js`

**Зміни:**
- Додано детектування помилок 500/503 у `_callVisionAPIWithRetry`
- При помилці 500/503 одразу переходимо на emergency fallback (без ретраїв)
- Зменшено затримку backoff з 1000ms до 500ms
- Спрощено `_callVisionAPI`: замість 3 спроб моделей, тепер 1 спроба + fallback

**Результат:**
- Вже при першій помилці 500 → одразу fallback (економія ~7 секунд)
- Менше логіки, легше дебажити

### 2. Відокремити активацію вікна від верифікації (visual-capture-service.js)

**Файл:** `/Users/dev/Documents/GitHub/atlas4/orchestrator/services/visual-capture-service.js`

**Зміни:**
- Додано параметр `shouldActivate` (default: `true` для backward compatibility)
- Метод `_captureActiveWindow` тепер приймає `shouldActivate`
- Якщо `shouldActivate: false`, вікно **не активується**, лише спостерігається

**Результат:**
- Верифікація Гріші більше не змінює стан системи
- Чистіша верифікація, без сайд-ефектів

### 3. Передавання `shouldActivate: false` під час верифікації (grisha-verify-item-processor.js)

**Файл:** `/Users/dev/Documents/GitHub/atlas4/orchestrator/workflow/stages/grisha-verify-item-processor.js`

**Зміни:**
- Додано `shouldActivate: false` у обох місцях капчеру (primary + fallback)
- Коментарі: "VERIFICATION: Don't activate app, just observe"

**Результат:**
- Верифікація Гріші тепер чисто спостерігає, не модифікує

## Очікувані поліпшення

| Метрика                  | До                | Після                 | Економія                |
| ------------------------ | ----------------- | --------------------- | ----------------------- |
| Затримка при помилці 500 | ~7 сек (3 ретраї) | ~0.5 сек (1 fallback) | **6.5 сек**             |
| Кількість спроб моделей  | 3 + fallback      | 1 + fallback          | **-2 спроби**           |
| Сайд-ефекти верифікації  | Активація вікна   | Без активації         | **Чистіша верифікація** |
| Складність логіки        | 3 шари рішень     | 1 шар + fallback      | **Простіше**            |

## Тестування

Всі файли пройшли синтаксичну перевірку:
- ✅ `vision-analysis-service.js`
- ✅ `visual-capture-service.js`
- ✅ `grisha-verify-item-processor.js`

## Backward Compatibility

- Параметр `shouldActivate` має default значення `true`, тому старий код продовжить працювати
- Нові виклики можуть передавати `shouldActivate: false` для верифікації

### 4. **Додана Mistral 3B як налаштовувана модель + оновлено fallback** (ADDED 2025-11-18)

**Файли:** `.env`, `config/models-config.js`, `orchestrator/services/vision-analysis-service.js`

**Зміни:**
- Додано `MCP_MODEL_MISTRAL_3B=atlas-ministral-3b` в `.env` — **налаштовувана модель**
- Додано конфіг `mistral_3b` в `models-config.js` — для легкого доступу
- Змінено `vision_fallback_2` з `atlas-ministral-3b` на `atlas-gpt-4o`
- Оновлено emergency fallback логіку у `vision-analysis-service.js`:
  - Спробує спочатку `copilot-gpt-4o` (потужна)
  - Потім `atlas-gpt-4o` (потужний резерв)
  - Потім інші доступні моделі

**Результат:**
- ✅ Mistral 3B тепер налаштовується через `.env` (можна змінювати)
- ✅ Fallback ланцюг використовує потужні моделі для надійності
- ✅ Легко знайти і використовувати Mistral 3B через `getStageConfig('mistral_3b')`

## Подальші покращення (опціонально)

1. Додати health-check для порту 4000 перед першою спробою
2. Кешувати результати верифікації для однакових айтемів
3. Додати circuit-breaker для порту 4000 (вже є, але можна оптимізувати)
4. Розглянути, чи потрібна затримка 1.5s для "rendering" під час верифікації
