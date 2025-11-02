# ATLAS v5.0 - MCP Tools Complete Reference

## 6 MCP Servers

### 1. Filesystem Server (14 tools)
**Package:** `@modelcontextprotocol/server-filesystem`
**Purpose:** Робота з файловою системою

#### Tools:
- `read_file` - Читання файлу
- `read_multiple_files` - Читання декількох файлів
- `write_file` - Запис у файл
- `create_directory` - Створення директорії
- `list_directory` - Список файлів у директорії
- `move_file` - Переміщення файлу
- `search_files` - Пошук файлів
- `get_file_info` - Інформація про файл
- `list_allowed_directories` - Дозволені директорії
- `edit_file` - Редагування файлу (patch)
- `delete_file` - Видалення файлу
- `delete_directory` - Видалення директорії
- `copy_file` - Копіювання файлу
- `tree_structure` - Структура дерева директорій

### 2. Playwright Server (32 tools)
**Package:** `@executeautomation/playwright-mcp-server`
**Purpose:** Браузерна автоматизація

#### Navigation & Pages:
- `playwright_navigate` - Перехід на URL
- `playwright_screenshot` - Скріншот сторінки
- `playwright_click` - Клік по елементу
- `playwright_fill` - Заповнення поля
- `playwright_select` - Вибір з select
- `playwright_hover` - Наведення на елемент
- `playwright_evaluate` - Виконання JavaScript

#### Browser Management:
- `playwright_launch_browser` - Запуск браузера
- `playwright_close_browser` - Закриття браузера
- `playwright_new_page` - Нова вкладка
- `playwright_close_page` - Закриття вкладки
- `playwright_list_pages` - Список вкладок

#### Content & State:
- `playwright_get_content` - HTML контент
- `playwright_get_text` - Текст елемента
- `playwright_get_attribute` - Атрибут елемента
- `playwright_wait_for_selector` - Очікування селектора
- `playwright_wait_for_navigation` - Очікування навігації

### 3. Shell Server (9 tools)
**Package:** `super-shell-mcp`
**Purpose:** Виконання команд shell

#### Tools:
- `shell_execute` - Виконання команди
- `shell_execute_async` - Асинхронне виконання
- `shell_get_status` - Статус команди
- `shell_kill` - Зупинка процесу
- `shell_list_processes` - Список процесів
- `shell_get_env` - Змінні середовища
- `shell_set_env` - Встановлення змінної
- `shell_cd` - Зміна директорії
- `shell_pwd` - Поточна директорія

### 4. AppleScript Server (1 tool)
**Package:** `@peakmojo/applescript-mcp`
**Purpose:** Виконання AppleScript на macOS

#### Tools:
- `applescript_execute` - Виконання AppleScript коду

### 5. Git Server (27 tools) - DISABLED
**Package:** `@modelcontextprotocol/server-git`
**Status:** Вимкнено через нестабільність

### 6. Memory Server (9 tools)
**Package:** `@modelcontextprotocol/server-memory`
**Purpose:** Управління пам'яттю та контекстом

#### Tools:
- `memory_create_entity` - Створення сутності
- `memory_create_relation` - Створення зв'язку
- `memory_add_observation` - Додавання спостереження
- `memory_delete_entity` - Видалення сутності
- `memory_delete_relation` - Видалення зв'язку
- `memory_search` - Пошук у пам'яті
- `memory_get_entity` - Отримання сутності
- `memory_list_entities` - Список сутностей
- `memory_clear` - Очищення пам'яті

## Tool Selection Strategy

### Stage 2.0: Server Selection
MCPManager фільтрує релевантні сервери на основі:
- Ключових слів у TODO item
- Типу завдання (файли, браузер, команди)
- Попереднього досвіду

### Stage 2.1: Tool Planning
Tetyana підбирає конкретні tools:
1. Аналізує action та expected_outcome
2. Перевіряє доступність tools
3. Створює tool_calls масив
4. Валідує параметри

### Stage 2.2: Tool Execution
- Виконання через MCP protocol (JSON-RPC 2.0)
- Retry logic при помилках
- Auto-correction параметрів
- Збір результатів

## Common Tool Patterns

### File Operations
```javascript
// Read → Modify → Write
[
  { "server": "filesystem", "tool": "read_file", "args": {"path": "..."} },
  { "server": "filesystem", "tool": "write_file", "args": {"path": "...", "content": "..."} }
]
```

### Browser Automation
```javascript
// Navigate → Wait → Screenshot
[
  { "server": "playwright", "tool": "playwright_navigate", "args": {"url": "..."} },
  { "server": "playwright", "tool": "playwright_wait_for_selector", "args": {"selector": "..."} },
  { "server": "playwright", "tool": "playwright_screenshot", "args": {"path": "..."} }
]
```

### Shell Commands
```javascript
// Execute → Get Status → Get Output
[
  { "server": "shell", "tool": "shell_execute_async", "args": {"command": "..."} },
  { "server": "shell", "tool": "shell_get_status", "args": {"pid": "..."} }
]
```

## Error Handling

### Tool Call Errors:
- Invalid parameters → Auto-correction
- Tool not found → Replan with different tool
- Timeout → Retry with increased timeout
- Permission denied → Skip or request confirmation

### MCP Server Errors:
- Server crash → Restart server
- Initialization timeout → Fallback to alternative
- Communication error → Retry with exponential backoff

## Performance Optimization

### Tool Caching:
- Tools list cached per server
- Schemas cached for validation
- Results cached for duplicate calls

### Parallel Execution:
- Independent tools executed in parallel
- Dependencies respected
- Max 3 concurrent tool calls

### Rate Limiting:
- 100 calls/minute per server
- Exponential backoff on 429
- Queue management for burst traffic
