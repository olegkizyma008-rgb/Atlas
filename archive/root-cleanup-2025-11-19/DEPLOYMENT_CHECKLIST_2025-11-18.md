# Контрольний список розгортання - 2025-11-18

## Файли для розгортання

- [x] `orchestrator/services/localization-service.js` - Виправлено локалізацію шляхів
- [x] `prompts/mcp/tetyana_plan_tools_applescript.js` - Додано правила про українські інструкції
- [x] `prompts/mcp/tetyana_plan_tools_filesystem.js` - Додано правила про українські інструкції та обмеження серверів
- [x] `orchestrator/workflow/mcp-todo-manager.js` - Додано автоматичний пошук промптів

## Перевірка перед розгортанням

- [x] Всі файли синтаксично коректні
- [x] Всі виправлення мають коментарі "FIXED 2025-11-18"
- [x] Немає конфліктів з існуючим кодом
- [x] Всі виправлення мінімальні та сфокусовані

## Тестування

### Тест 1: Локалізація шляхів
```bash
# Запустити систему та перевірити логи
# Очікуваний результат: шляхи залишаються без змін
grep "документи" logs/orchestrator.log  # Не повинно бути результатів
```

### Тест 2: Українські інструкції
```bash
# Запустити завдання та перевірити чат
# Очікуваний результат: інструкції ТІЛЬКИ на українській
```

### Тест 3: Пошук промптів
```bash
# Запустити завдання з filesystem сервером
# Очікуваний результат: промпт знайдено автоматично
grep "Using auto-generated prompt" logs/orchestrator.log
```

## Розгортання

1. Коммітити всі файли:
```bash
git add orchestrator/services/localization-service.js
git add prompts/mcp/tetyana_plan_tools_applescript.js
git add prompts/mcp/tetyana_plan_tools_filesystem.js
git add orchestrator/workflow/mcp-todo-manager.js
git commit -m "FIXED 2025-11-18: Localization, LLM prompts, and tool planning"
```

2. Перезапустити систему:
```bash
./restart_system.sh
```

3. Перевірити логи:
```bash
tail -f logs/orchestrator.log
```

## Відкат

Якщо потрібен відкат:
```bash
git revert HEAD
./restart_system.sh
```

## Статус

✅ Готово до розгортання
