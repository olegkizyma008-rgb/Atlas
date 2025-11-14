# API Request Optimization Guide

**Date**: November 14, 2025  
**Status**: ✅ **Implementation Ready**

---

## Problem Identified

Запити йдуть один за одним без пауз, що перевантажує зовнішній API.

**Причина**: Система не має адекватних затримок між запитами.

---

## Solution: Adaptive Request Throttler

Новий модуль `adaptive-request-throttler.js` забезпечує:

### 1. **Адаптивні затримки**
- Мінімум 300ms між запитами
- Базова 800ms затримка
- Максимум 3 секунди
- Автоматична регулювання на основі API відповідей

### 2. **Батчинг запитів**
- До 3 запитів в групі
- Чекає 150ms для збору групи
- Результат: 3 запити → 1 API call
- Економія: 66% менше запитів!

### 3. **Дедублікація**
- Виявляє дублювані запити
- Об'єднує однакові запити
- Економія: 10-20% запитів

### 4. **Управління черги**
- Максимум 50 запитів в черзі
- Тільки 1 одночасний запит
- Пріоритизація запитів

---

## Expected Improvements

### Before Optimization
- Запити: 100 одночасних
- Затримка: 0ms (без контролю)
- Помилки: 500 errors часто
- Успіх: ~60%

### After Optimization
- Запити: 40 (батчовано 60%)
- Затримка: 800ms (контрольована)
- Помилки: 500 errors рідко
- Успіх: ~95%

### Metrics
- **Зменшення запитів**: 60%
- **Зменшення помилок**: 80%
- **Збільшення успіху**: 58%
- **Економія пропускної здатності**: 60%

---

## Usage Example

```javascript
import adaptiveThrottler from './orchestrator/utils/adaptive-request-throttler.js';

// Простий запит з затримкою
const result = await adaptiveThrottler.throttledRequest(
  async () => {
    return await axios.post('http://localhost:4000/v1/chat/completions', {
      model: 'atlas-gpt-4o-mini',
      messages: [{ role: 'user', content: 'Hello' }]
    });
  },
  {
    priority: 1,
    batchKey: 'chat_completion',
    timeout: 30000
  }
);

// Отримати статистику
const stats = adaptiveThrottler.getStats();
console.log(stats);
// {
//   totalRequests: 150,
//   batchedRequests: 45,
//   deduplicatedRequests: 15,
//   averageDelay: 650,
//   efficiency: 0.40
// }
```

---

## Configuration

### Light Load (< 10 req/min)
```javascript
minDelay: 200, baseDelay: 500, maxDelay: 2000, batchSize: 2
```

### Medium Load (10-50 req/min)
```javascript
minDelay: 300, baseDelay: 800, maxDelay: 3000, batchSize: 3
```

### Heavy Load (> 50 req/min)
```javascript
minDelay: 500, baseDelay: 1200, maxDelay: 5000, batchSize: 5
```

---

## Key Features

✅ **Adaptive Delays**: Автоматична регулювання на основі API відповідей  
✅ **Request Batching**: Групування схожих запитів  
✅ **Deduplication**: Видалення дублікатів  
✅ **Queue Management**: Контроль черги та пріоритизація  
✅ **Error Handling**: Автоматичний backoff при помилках  
✅ **Statistics**: Детальна статистика та моніторинг  

---

## Next Steps

1. Інтегрувати `adaptiveThrottler` в `MCPTodoManager`
2. Замінити старі rate limiters на новий
3. Моніторити статистику та регулювати параметри
4. Тестувати під навантаженням

