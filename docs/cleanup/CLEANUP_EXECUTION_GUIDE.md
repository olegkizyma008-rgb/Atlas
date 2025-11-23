# 🚀 Посібник з Виконання Очистки Проекту

**Дата:** 23 листопада 2025  
**Статус:** Готово до виконання  
**Оцінена тривалість:** 3-5 днів

---

## 📋 Передумови

Перед початком очистки переконайтесь, що:

1. ✅ Ви прочитали `ARCHITECTURE_ANALYSIS_REPORT.md`
2. ✅ Ви прочитали `CLEANUP_RECOMMENDATIONS.md`
3. ✅ Ви створили backup проекту
4. ✅ Ви знаходитесь на чистій гілці git
5. ✅ Всі тести проходять

---

## 🔧 Підготовка

### Крок 1: Створити нову гілку

```bash
git checkout -b cleanup/remove-unused-files
```

### Крок 2: Запустити тести

```bash
# Для JavaScript проекту
npm test

# Для Python проекту
python -m pytest

# Для обох
npm test && python -m pytest
```

### Крок 3: Перевірити залежності

```bash
# Перевірити, чи використовується orchestrator
grep -r "orchestrator" --include="*.js" --include="*.py" . \
  --exclude-dir=node_modules \
  --exclude-dir=.git

# Перевірити, чи використовується eternity
grep -r "eternity" --include="*.js" --include="*.py" . \
  --exclude-dir=node_modules \
  --exclude-dir=.git

# Перевірити, чи використовується whisper сервіси
grep -r "whispercpp_service\|whisper_service" --include="*.js" --include="*.py" . \
  --exclude-dir=node_modules \
  --exclude-dir=.git
```

---

## 🎯 Фаза 1: Видалення Orchestrator (1 година)

### Крок 1: Перевірити файли

```bash
# Переглянути файли перед видаленням
ls -la orchestrator/ai/
ls -la orchestrator/eternity/
ls -la orchestrator/utils/
ls -la orchestrator/workflow/
```

### Крок 2: Видалити файли

```bash
# Видалити orchestrator папку
rm -rf orchestrator/

# Перевірити, що видалено
git status
```

### Крок 3: Запустити тести

```bash
npm test && python -m pytest
```

### Крок 4: Commit змін

```bash
git add -A
git commit -m "chore: remove unused orchestrator files

- Remove orchestrator/ai/context-aware-tool-filter.js (438 lines)
- Remove orchestrator/eternity/* (5 files, 1,231 lines)
- Remove orchestrator/utils/* (3 files, 700 lines)
- Remove orchestrator/workflow/* (2 files, 654 lines)

Total: 11 files, 3,152 lines removed"
```

---

## 🎯 Фаза 2: Видалення Whisper Сервісів (1 година)

### Крок 1: Перевірити залежності

```bash
# Перевірити, чи використовуються сервіси
grep -r "whispercpp_service\|whisper_service" --include="*.js" --include="*.py" .
```

### Крок 2: Видалити файли

```bash
# Видалити Whisper сервіси
rm services/whisper/whispercpp_service.py
rm services/whisper/whisper_service.py

# Перевірити, що видалено
git status
```

### Крок 3: Запустити тести

```bash
npm test && python -m pytest
```

### Крок 4: Commit змін

```bash
git add -A
git commit -m "chore: consolidate whisper services

- Remove services/whisper/whispercpp_service.py (448 lines)
- Remove services/whisper/whisper_service.py (547 lines)

Note: These services should be consolidated into a single service.
Total: 2 files, 995 lines removed"
```

---

## 🎯 Фаза 3: Видалення Старих Prompts (30 хвилин)

### Крок 1: Перевірити залежності

```bash
# Перевірити, чи використовуються prompts
grep -r "universal_mcp_prompt\|chat_memory_eligibility\|atlas_chat1" \
  --include="*.js" --include="*.py" .
```

### Крок 2: Видалити файли

```bash
# Видалити старі prompt файли
rm prompts/mcp/universal_mcp_prompt.js
rm prompts/mcp/chat_memory_eligibility.js
rm prompts/mcp/atlas_chat1.js

# Перевірити, що видалено
git status
```

### Крок 3: Запустити тести

```bash
npm test && python -m pytest
```

### Крок 4: Commit змін

```bash
git add -A
git commit -m "chore: remove deprecated prompt files

- Remove prompts/mcp/universal_mcp_prompt.js (83 lines)
- Remove prompts/mcp/chat_memory_eligibility.js (135 lines)
- Remove prompts/mcp/atlas_chat1.js (209 lines)

Total: 3 files, 427 lines removed"
```

---

## 🎯 Фаза 4: Видалення Старих Тестів (2 години)

### Крок 1: Перевірити тести

```bash
# Переглянути manual тести
ls -la tests/manual/

# Переглянути unit тести
ls -la tests/unit/

# Переглянути integration тести
ls -la tests/integration/
```

### Крок 2: Видалити manual тести

```bash
# Видалити всі manual тести
rm -rf tests/manual/

# Перевірити, що видалено
git status
```

### Крок 3: Видалити unit тести

```bash
# Видалити застарілі unit тести
rm tests/unit/error-handling-wrapper.test.js
rm tests/unit/test-nexus-full-cycle.js
rm tests/unit/circuit-breaker.test.js
rm tests/unit/exponential-backoff.test.js
rm tests/unit/test-nexus-bug.js
rm tests/unit/verification-logic.test.js

# Перевірити, що видалено
git status
```

### Крок 4: Видалити integration тести

```bash
# Видалити застарілі integration тести
rm tests/integration/test-mcp-filesystem-direct.js
rm tests/integration/test-mcp-task.js

# Перевірити, що видалено
git status
```

### Крок 5: Видалити інші тести

```bash
# Видалити web тест
rm tests/web/atlas-test-suite.js

# Видалити інші тести
rm tests/test-orchestrator-calculator-browser.js
rm tests/test-vision-ollama.js

# Перевірити, що видалено
git status
```

### Крок 6: Запустити тести

```bash
npm test && python -m pytest
```

### Крок 7: Commit змін

```bash
git add -A
git commit -m "chore: remove deprecated test files

- Remove tests/manual/* (30+ files)
- Remove tests/unit/* (6 files)
- Remove tests/integration/* (2 files)
- Remove tests/web/* (1 file)
- Remove tests/test-orchestrator-calculator-browser.js
- Remove tests/test-vision-ollama.js

Total: 50+ files, ~8,500 lines removed"
```

---

## 🎯 Фаза 5: Перевірка Third-party (1-2 дні)

### Крок 1: Перевірити whisper.cpp.upstream

```bash
# Перевірити, чи використовується
grep -r "whisper.cpp.upstream\|whisper.cpp" --include="*.js" --include="*.py" . \
  --exclude-dir=third_party

# Якщо не використовується, видалити
rm -rf third_party/whisper.cpp.upstream/
```

### Крок 2: Перевірити ukrainian-tts

```bash
# Перевірити, чи використовується
grep -r "ukrainian.tts\|ukrainian-tts\|tts_server" --include="*.js" --include="*.py" . \
  --exclude-dir=third_party

# Якщо не використовується, видалити
rm -rf ukrainian-tts/
```

### Крок 3: Перевірити ukrainian_accentor

```bash
# Перевірити, чи використовується
grep -r "ukrainian_accentor\|accentor" --include="*.js" --include="*.py" . \
  --exclude-dir=third_party

# Якщо не використовується, видалити
rm -rf ukrainian_accentor/
```

### Крок 4: Commit змін

```bash
git add -A
git commit -m "chore: remove unused third-party dependencies

- Remove third_party/whisper.cpp.upstream/ (200+ files)
- Remove ukrainian-tts/ (20+ files)
- Remove ukrainian_accentor/ (1 file)

Total: 220+ files, ~280,000 lines removed"
```

---

## ✅ Фінальна Перевірка

### Крок 1: Запустити всі тести

```bash
npm test && python -m pytest
```

### Крок 2: Перевірити функціональність

```bash
# Запустити основні функції
npm start

# Або для Python
python main.py
```

### Крок 3: Перевірити розмір проекту

```bash
# Перевірити розмір папки
du -sh .

# Перевірити кількість файлів
find . -type f | wc -l

# Перевірити кількість рядків коду
find . -name "*.js" -o -name "*.py" | xargs wc -l | tail -1
```

### Крок 4: Оновити документацію

```bash
# Оновити README.md
# Оновити ARCHITECTURE.md
# Оновити CONTRIBUTING.md
```

### Крок 5: Merge гілки

```bash
# Перейти на main гілку
git checkout main

# Merge змін
git merge cleanup/remove-unused-files

# Push на сервер
git push origin main

# Видалити гілку
git branch -d cleanup/remove-unused-files
```

---

## 📊 Очікувані Результати

### Перед очисткою
- **Файлів:** 620
- **Розмір:** 12.3 МБ
- **Рядків:** 293,282

### Після Фази 1-2
- **Файлів:** 597 (-23)
- **Розмір:** 12.0 МБ (-0.3 МБ)
- **Рядків:** 289,708 (-3,574)

### Після Фази 1-4
- **Файлів:** 554 (-66)
- **Розмір:** 11.3 МБ (-1 МБ)
- **Рядків:** 279,282 (-13,000)

### Після Фази 1-5
- **Файлів:** 323 (-297)
- **Розмір:** 8.5 МБ (-3.8 МБ)
- **Рядків:** 193,282 (-100,000)

---

## 🚨 Важливі Примітки

### Якщо щось пішло не так

```bash
# Скасувати останній commit
git reset --soft HEAD~1

# Скасувати всі зміни
git reset --hard HEAD

# Повернутися на попередню версію
git checkout main
```

### Якщо тести не проходять

1. Перевірте, що всі залежності встановлені
2. Перевірте, що не видалили критичні файли
3. Перевірте, що не видалили файли з залежностями

### Якщо функціональність порушена

1. Перевірте git log для останніх змін
2. Перевірте, які файли були видалені
3. Відновіть видалені файли, якщо потрібно

---

## 📞 Контакт для Допомоги

Якщо у вас виникли питання:

1. Перевірте `ARCHITECTURE_ANALYSIS_REPORT.md`
2. Перевірте `CLEANUP_RECOMMENDATIONS.md`
3. Запустіть MCP аналіз для конкретного файлу
4. Перевірте git log для історії змін

---

**Посібник готовий до виконання!** ✅

Успіхів з очисткою проекту! 🚀
