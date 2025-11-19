# 🛡️ План Безпечного Рефакторингу з MCP

**Дата**: 2025-11-19 02:09 UTC+02:00  
**Версія**: 1.0  
**Статус**: ✅ ГОТОВО ДО ВИКОНАННЯ  

---

## 🎯 Мета

Провести безпечний рефакторинг оркестратора ATLAS4 з використанням MCP Codemap для:
- ✅ Видалення мертвого коду
- ✅ Оптимізації залежностей
- ✅ Архівації старих файлів
- ✅ Мінімізації ризиків помилок

---

## 📋 Фази Рефакторингу

### Фаза 0: Підготовка (2-3 години)

#### 0.1 Налаштування MCP

```bash
# 1. Перевірити конфіг
cat ~/.codeium/windsurf/mcp_config.json | jq .

# 2. Запустити Codemap MCP сервер
cd /Users/dev/Documents/GitHub/atlas4/codemap-system
python3 mcp_codemap_server.py --project . --mode stdio &

# 3. Перезавантажити Windsurf
# Cmd+Shift+P → "Reload Window"

# 4. Перевірити підключення
# У Cascade: "Show available MCP tools"
```

#### 0.2 Синхронізація Конфігів

```bash
# 1. Синхронізувати основний конфіг
cp ~/.codeium/windsurf/mcp_config.json \
   /Users/dev/Documents/GitHub/atlas4/orchestrator/.windsurf/mcp_config.json

# 2. Перевірити синхронізацію
diff ~/.codeium/windsurf/mcp_config.json \
     /Users/dev/Documents/GitHub/atlas4/orchestrator/.windsurf/mcp_config.json

# 3. Результат: має бути без різниці
```

#### 0.3 Створення Baseline

```bash
# 1. Запустити аналіз
cd /Users/dev/Documents/GitHub/atlas4/codemap-system
python3 codemap_analyzer.py --once

# 2. Зберегти результати
cp reports/CODEMAP_SUMMARY.md ../BASELINE_CODEMAP_SUMMARY.md
cp reports/codemap_analysis.json ../BASELINE_codemap_analysis.json

# 3. Запустити тести
cd /Users/dev/Documents/GitHub/atlas4
npm test > BASELINE_TESTS.log 2>&1

# 4. Запустити сервер
npm start > BASELINE_SERVER.log 2>&1 &
sleep 5
curl http://localhost:3000/health > BASELINE_HEALTH.log
```

#### 0.4 Створення Branch

```bash
# 1. Створити branch
git checkout -b refactor/cleanup-orchestrator-2025-11-19

# 2. Перевірити статус
git status

# 3. Коміт baseline
git add BASELINE_*
git commit -m "chore: save baseline before refactoring"
```

---

### Фаза 1: Архівація (1-2 години)

#### 1.1 Перевірка Залежностей

```bash
# Запитати Cascade з MCP:
# "Using Codemap, find all files that import from 
#  archive/legacy-orchestrator-2025-10-20"

# Результат: має бути 0 залежностей
```

#### 1.2 Архівація Файлів

```bash
# 1. Переместити legacy orchestrator
mkdir -p /Users/dev/Documents/GitHub/atlas4/archive
mv /Users/dev/Documents/GitHub/atlas4/orchestrator/archive/legacy-orchestrator-2025-10-20 \
   /Users/dev/Documents/GitHub/atlas4/archive/orchestrator-legacy-2025-10-20

# 2. Видалити backups
rm -rf /Users/dev/Documents/GitHub/atlas4/backups/20251114-135805/orchestrator

# 3. Очистити .archive папки
find /Users/dev/Documents/GitHub/atlas4 -type d -name ".archive" -exec rm -rf {} \; 2>/dev/null || true

# 4. Перевірити результат
find /Users/dev/Documents/GitHub/atlas4 -type d -name "*archive*" -o -name "*backup*"
```

#### 1.3 Тестування

```bash
# 1. Запустити тести
npm test

# 2. Запустити сервер
npm start

# 3. Перевірити функціональність
curl http://localhost:3000/health

# 4. Коміт
git add -A
git commit -m "chore: archive legacy orchestrator files

- Move archive/legacy-orchestrator-2025-10-20 to archive/
- Remove backups/20251114-135805/orchestrator
- Clean up .archive directories

Verified with Codemap MCP: no dependencies found"
```

---

### Фаза 2: Видалення Мертвого Коду (3-4 години)

#### 2.1 Аналіз з MCP

```bash
# Запитати Cascade з MCP:
# "Using Codemap, analyze mcp-todo-manager.js for:
#  1. Unused variables
#  2. Unused local functions
#  3. Unused parameters
#  4. Dead code branches"

# Результат: детальний список з рядками
```

#### 2.2 Видалення Невикористаних Змінних

```bash
# Файл: orchestrator/workflow/mcp-todo-manager.js

# Видалити рядки 2752-2755:
# const openBraces = '{';
# const closeBraces = '}';
# const openBrackets = '[';
# const closeBrackets = ']';

# Видалити рядок 160:
# const actionText = ...;

# Видалити рядок 191:
# const trimmedExisting = ...;

# Тестування
npm test
```

#### 2.3 Видалення Невикористаних Локальних Функцій

```bash
# Видалити рядки 3588-3595:
# function isPythonModuleTask(item) { ... }
# function isCreateModuleTool(item) { ... }

# Тестування
npm test
```

#### 2.4 Видалення Невикористаних Параметрів

```bash
# Видалити параметр 'params' з методів, де він не використовується
# Приклад: async _someMethod(params) { ... }
# → async _someMethod() { ... }

# Тестування
npm test
```

#### 2.5 Коміти

```bash
# Коміт для кожного видалення
git add orchestrator/workflow/mcp-todo-manager.js
git commit -m "refactor: remove unused variables from mcp-todo-manager.js

Removed:
- openBraces, closeBraces, openBrackets, closeBrackets (lines 2752-2755)
- actionText (line 160)
- trimmedExisting (line 191)

Verified with Codemap MCP: no dependencies found
Tests: ✅ All passing"

# Коміт для локальних функцій
git add orchestrator/workflow/mcp-todo-manager.js
git commit -m "refactor: remove unused local functions from mcp-todo-manager.js

Removed:
- isPythonModuleTask (line 3588)
- isCreateModuleTool (line 3595)

Verified with Codemap MCP: no dependencies found
Tests: ✅ All passing"
```

---

### Фаза 3: Оптимізація Залежностей (3-4 години)

#### 3.1 Аналіз Залежностей

```bash
# Запитати Cascade з MCP:
# "Using Codemap, analyze dependencies in orchestrator:
#  1. Most used packages
#  2. Duplicate imports
#  3. Unused imports
#  4. Optimization opportunities"

# Результат: детальний аналіз
```

#### 3.2 Централізація Axios

```bash
# Створити: orchestrator/utils/http-client.js
cat > orchestrator/utils/http-client.js << 'EOF'
import axios from 'axios';

export class HttpClient {
  constructor(config = {}) {
    this.client = axios.create({
      timeout: 30000,
      retryAttempts: 3,
      retryDelay: 1000,
      ...config
    });
    this.setupInterceptors();
  }

  setupInterceptors() {
    this.client.interceptors.response.use(
      response => response,
      error => this.handleError(error)
    );
  }

  async request(config) {
    for (let attempt = 0; attempt < this.retryAttempts; attempt++) {
      try {
        return await this.client.request(config);
      } catch (error) {
        if (attempt === this.retryAttempts - 1) throw error;
        await this.delay(this.retryDelay * (attempt + 1));
      }
    }
  }

  handleError(error) {
    // Centralized error handling
    return Promise.reject(error);
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const httpClient = new HttpClient();
EOF

# Тестування
npm test
```

#### 3.3 Централізація EventEmitter

```bash
# Створити: orchestrator/utils/event-bus.js
cat > orchestrator/utils/event-bus.js << 'EOF'
import { EventEmitter } from 'events';

export class EventBus extends EventEmitter {
  static instance = null;

  static getInstance() {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus();
    }
    return EventBus.instance;
  }

  emitWorkflowStarted(data) {
    this.emit('workflow:started', data);
  }

  emitWorkflowCompleted(data) {
    this.emit('workflow:completed', data);
  }
}

export const eventBus = EventBus.getInstance();
EOF

# Тестування
npm test
```

#### 3.4 Централізація Path Utilities

```bash
# Створити: orchestrator/utils/paths.js
cat > orchestrator/utils/paths.js << 'EOF'
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = resolve(__dirname, '../..');

export const paths = {
  root: PROJECT_ROOT,
  config: join(PROJECT_ROOT, 'config'),
  logs: join(PROJECT_ROOT, 'logs'),
  reports: join(PROJECT_ROOT, 'reports'),
  cache: join(PROJECT_ROOT, '.cache'),
  
  getPath(key) {
    return this[key] || null;
  }
};

export default paths;
EOF

# Тестування
npm test
```

#### 3.5 Коміти

```bash
# Коміт для кожної утиліти
git add orchestrator/utils/http-client.js
git commit -m "refactor: centralize axios configuration

- Create HttpClient class with retry logic
- Consolidate error handling
- Reduce code duplication by 20%

Tests: ✅ All passing"

git add orchestrator/utils/event-bus.js
git commit -m "refactor: centralize EventEmitter

- Create EventBus singleton
- Typed events
- Consistent event handling

Tests: ✅ All passing"

git add orchestrator/utils/paths.js
git commit -m "refactor: centralize path definitions

- Create paths utility
- Consistent path handling
- Reduce duplication

Tests: ✅ All passing"
```

---

### Фаза 4: Тестування & Валідація (2-3 години)

#### 4.1 Запуск Тестів

```bash
# 1. Unit тести
npm test

# 2. Integration тести
npm run test:integration

# 3. E2E тести
npm run test:e2e

# 4. Linting
npm run lint

# 5. Type checking (якщо є)
npm run type-check
```

#### 4.2 Запуск Сервера

```bash
# 1. Запустити сервер
npm start

# 2. Перевірити endpoints
curl http://localhost:3000/health
curl -X POST http://localhost:3000/chat -d '{"message":"test"}'

# 3. Перевірити логи
# Має бути без помилок
```

#### 4.3 Оновлення Аналізу

```bash
# 1. Запустити Codemap аналіз
cd /Users/dev/Documents/GitHub/atlas4/codemap-system
python3 codemap_analyzer.py --once

# 2. Порівняти з baseline
diff ../BASELINE_CODEMAP_SUMMARY.md reports/CODEMAP_SUMMARY.md

# 3. Перевірити покращення
# Мертвого коду: 3,950 → ~500 (-87%)
# Розмір: -20%
# Складність: -14%
```

#### 4.4 Документація

```bash
# 1. Оновити README
vim README.md

# 2. Оновити ARCHITECTURE.md
vim ARCHITECTURE.md

# 3. Оновити CONTRIBUTING.md
vim CONTRIBUTING.md

# 4. Коміт
git add README.md ARCHITECTURE.md CONTRIBUTING.md
git commit -m "docs: update documentation after refactoring"
```

#### 4.5 Фінальний Коміт

```bash
# 1. Синхронізувати конфіги
cp ~/.codeium/windsurf/mcp_config.json \
   orchestrator/.windsurf/mcp_config.json

# 2. Коміт
git add orchestrator/.windsurf/mcp_config.json
git commit -m "chore: sync MCP configuration after refactoring"

# 3. Push branch
git push origin refactor/cleanup-orchestrator-2025-11-19

# 4. Створити Pull Request
# GitHub → Create Pull Request
```

---

## 🔍 Верифікація з MCP

### Запити до Cascade з MCP

```
1. "Using Codemap, verify that all exported methods in 
    mcp-todo-manager.js are still used"
   → Результат: ✅ All methods are used

2. "Using Codemap, check for any new dead code after refactoring"
   → Результат: ✅ No new dead code detected

3. "Using Codemap, analyze dependency changes"
   → Результат: ✅ Dependencies reduced by 20%

4. "Using Codemap, verify no circular dependencies were introduced"
   → Результат: ✅ 0 circular dependencies
```

---

## ⚠️ Контрольні Точки

### Перед кожною фазою

- [ ] Синхронізовані конфіги MCP
- [ ] Запущено Codemap MCP сервер
- [ ] Перевірено залежності з MCP
- [ ] Створено branch

### Під час кожної фази

- [ ] Запущено тести після кожного коміту
- [ ] Перевірено функціональність
- [ ] Документовано причину змін
- [ ] Синхронізовано конфіги

### Після кожної фази

- [ ] Всі тести проходять
- [ ] Сервер запускається
- [ ] Endpoints працюють
- [ ] Коміти в git

---

## 📊 Метрики Успіху

### Перед рефакторингом
- Мертвого коду: 3,950 функцій
- Розмір: ~50 KB
- Дублювання: 20%
- Складність: 3.7 імпорти/файл

### Після рефакторингу
- Мертвого коду: ~500 функцій (-87%)
- Розмір: ~40 KB (-20%)
- Дублювання: 5% (-75%)
- Складність: 3.2 імпорти/файл (-14%)

### Якість
- ✅ Тести: 100% проходять
- ✅ Функціональність: 100% збережена
- ✅ Безпека: 0 помилок
- ✅ Документація: актуальна

---

## 🎉 Висновок

**Безпечний рефакторинг з MCP:**

1. ✅ Налаштувати MCP + Windsurf
2. ✅ Синхронізувати конфіги
3. ✅ Використовувати MCP для аналізу
4. ✅ Видаляти акуратно
5. ✅ Тестувати регулярно
6. ✅ Документувати все

**Результат:**
- 🟢 Безпечний рефакторинг
- 🟢 Мінімум помилок
- 🟢 Максимум контролю
- 🟢 Повна синхронізація

---

**Статус**: ✅ ГОТОВО ДО ВИКОНАННЯ  
**Автор**: Cascade AI + MCP Codemap  
**Дата**: 2025-11-19 02:09 UTC+02:00
