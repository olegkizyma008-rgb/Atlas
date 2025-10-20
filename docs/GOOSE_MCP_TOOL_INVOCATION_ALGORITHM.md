# Алгоритм формування та виклику MCP інструментів у Goose

## Огляд архітектури

Goose використовує багатоетапний алгоритм для формування, підбору та виклику MCP (Model Context Protocol) інструментів через LLM. Система побудована на Rust і використовує асинхронну архітектуру з токенізацією для безпечного виконання.

---

## 1. Ініціалізація та підключення MCP клієнтів

### 1.1 Структура MCP клієнта

**Файл:** `goose/src/agents/mcp_client.rs`

```rust
pub struct McpClient {
    client: Mutex<RunningService<RoleClient, GooseClient>>,
    notification_subscribers: Arc<Mutex<Vec<mpsc::Sender<ServerNotification>>>>,
    server_info: Option<InitializeResult>,
    timeout: std::time::Duration,
}
```

**Ключові методи:**
- `list_tools()` - отримання списку доступних інструментів
- `call_tool()` - виклик конкретного інструменту
- `list_resources()` - отримання ресурсів
- `read_resource()` - читання конкретного ресурсу

### 1.2 ExtensionManager - керування MCP розширеннями

**Файл:** `goose/src/agents/extension_manager.rs`

```rust
pub struct ExtensionManager {
    extensions: Mutex<HashMap<String, Extension>>,
    context: Mutex<PlatformExtensionContext>,
}
```

**Типи підключень:**
1. **Child Process** - запуск локального процесу через stdio
2. **SSE** - підключення через Server-Sent Events
3. **StreamableHttp** - HTTP streaming з OAuth підтримкою

**Алгоритм підключення:**
```
1. Отримати ExtensionConfig (конфігурація розширення)
2. Створити транспорт:
   - TokioChildProcess для локальних процесів
   - SseClientTransport для SSE
   - StreamableHttpClientTransport для HTTP
3. McpClient::connect(transport, timeout)
4. Отримати server_info через initialize handshake
5. Зберегти клієнт у HashMap extensions
```

---

## 2. Формування списку інструментів для LLM

### 2.1 Головний метод: prepare_tools_and_prompt()

**Файл:** `goose/src/agents/reply_parts.rs`

```rust
pub async fn prepare_tools_and_prompt(&self) 
    -> Result<(Vec<Tool>, Vec<Tool>, String)>
```

**Повертає:**
- `tools` - інструменти для передачі LLM
- `toolshim_tools` - інструменти для post-processing
- `system_prompt` - системний промпт

### 2.2 Алгоритм формування інструментів

```
КРОК 1: Перевірка Router Status
├─ router_enabled = tool_route_manager.is_router_enabled()
└─ Визначає чи використовувати LLM-based tool selection

КРОК 2: Отримання базових інструментів
├─ Якщо router_enabled:
│  └─ tools = list_tools_for_router()
└─ Якщо !router_enabled:
   └─ tools = list_tools(None)

КРОК 3: Фільтрація за режимом
├─ is_autonomous = GOOSE_MODE == "auto"
└─ Якщо !is_autonomous:
   └─ Видалити subagent інструменти

КРОК 4: Додавання Frontend інструментів
└─ Додати всі з frontend_tools HashMap

КРОК 5: Формування System Prompt
├─ extensions_info = extension_manager.get_extensions_info()
├─ model_name = provider.get_model_config().model_name
└─ system_prompt = prompt_manager.build_system_prompt(...)

КРОК 6: Обробка Toolshim
├─ Якщо model_config.toolshim:
│  ├─ system_prompt = modify_system_prompt_for_tool_json()
│  ├─ toolshim_tools = tools.clone()
│  └─ tools = vec![]
└─ Інакше: toolshim_tools = vec![]
```

### 2.3 Джерела інструментів (list_tools)

**Файл:** `goose/src/agents/agent.rs`

**1. MCP Extension Tools**
- `extension_manager.get_prefixed_tools()`
- Формат: `{extension_name}__{tool_name}`

**2. Platform Tools**
- `search_available_extensions_tool()`
- `manage_extensions_tool()`
- `manage_schedule_tool()`
- `read_resource_tool()` / `list_resources_tool()`

**3. Dynamic Task Tools**
- `create_dynamic_task_tool()`

**4. Sub-Recipe Tools**
- `sub_recipe_manager.sub_recipe_tools`

**5. Final Output Tool**
- `final_output_tool.tool()`

**6. Subagent Execution Tool**
- `create_subagent_execute_task_tool()`

---

## 3. Виклик LLM з інструментами

### 3.1 stream_response_from_provider()

**Файл:** `goose/src/agents/reply_parts.rs`

```rust
pub async fn stream_response_from_provider(
    provider: Arc<dyn Provider>,
    system_prompt: &str,
    messages: &[Message],
    tools: &[Tool],
    toolshim_tools: &[Tool],
) -> Result<MessageStream>
```

**Алгоритм:**

```
КРОК 1: Підготовка повідомлень
├─ Якщо toolshim:
│  └─ messages = convert_tool_messages_to_text(messages)
└─ Інакше: messages = messages.to_vec()

КРОК 2: Виклик LLM
├─ Якщо supports_streaming():
│  └─ stream = provider.stream(system_prompt, messages, tools)
└─ Інакше:
   └─ (message, usage) = provider.complete(...)
      └─ stream = stream_from_single_message(message, usage)

КРОК 3: Post-processing
└─ Для кожного message:
   ├─ Зберегти model info
   └─ Якщо toolshim:
      └─ message = toolshim_postprocess(message, toolshim_tools)
```

### 3.2 Формат Tool Definition

```json
{
  "name": "extension_name__tool_name",
  "description": "Опис інструменту",
  "input_schema": {
    "type": "object",
    "properties": {
      "param1": {
        "type": "string",
        "description": "Опис параметра"
      }
    },
    "required": ["param1"]
  }
}
```

---

## 4. Обробка відповіді LLM

### 4.1 Категоризація Tool Requests

**Файл:** `goose/src/agents/reply_parts.rs`

```rust
pub async fn categorize_tool_requests(&self, response: &Message)
    -> (Vec<ToolRequest>, Vec<ToolRequest>, Message)
```

**Повертає:**
- `frontend_requests` - для виконання на frontend
- `other_requests` - для виконання на backend
- `filtered_message` - без frontend requests

### 4.2 Інспекція інструментів

**Файл:** `goose/src/tool_inspection.rs`

```rust
pub struct ToolInspectionManager {
    inspectors: Vec<Box<dyn ToolInspector>>,
}
```

**Типи інспекторів (порядок виконання):**

1. **SecurityInspector** - перевірка на шкідливі команди
2. **PermissionInspector** - перевірка прав доступу
3. **RepetitionInspector** - виявлення повторів

**Результати інспекції:**
```rust
pub enum InspectionAction {
    Allow,                          // Дозволити
    Deny,                           // Заборонити
    RequireApproval(Option<String>), // Потребує підтвердження
}
```

**Алгоритм:**
```
1. inspect_tools(remaining_requests, messages)
   └─ Кожен inspector.inspect()

2. process_inspection_results()
   └─ Розподіл на:
      ├─ approved
      ├─ needs_approval
      └─ denied

3. apply_inspection_results_to_permissions()
   └─ Застосування правил інспекторів
```

---

## 5. Виконання інструментів

### 5.1 dispatch_tool_call() - маршрутизація

**Файл:** `goose/src/agents/agent.rs`

```rust
pub async fn dispatch_tool_call(
    &self,
    tool_call: CallToolRequestParam,
    request_id: String,
    cancellation_token: Option<CancellationToken>,
    session: Option<SessionConfig>,
) -> (String, Result<ToolCallResult, ErrorData>)
```

**Алгоритм маршрутизації:**

```
1. Platform Tools:
   ├─ PLATFORM_MANAGE_SCHEDULE_TOOL_NAME
   ├─ PLATFORM_MANAGE_EXTENSIONS_TOOL_NAME
   ├─ FINAL_OUTPUT_TOOL_NAME
   ├─ PLATFORM_READ_RESOURCE_TOOL_NAME
   └─ PLATFORM_LIST_RESOURCES_TOOL_NAME

2. Sub-Recipe Tools:
   └─ sub_recipe_manager.dispatch_sub_recipe_tool_call()

3. Subagent Tools:
   └─ subagent_execute_task_tool::run_tasks()

4. Dynamic Task Tools:
   └─ create_dynamic_task()

5. Frontend Tools:
   └─ Повернути ErrorData("Frontend tool execution required")

6. Router Tools:
   └─ tool_route_manager.dispatch_route_search_tool()

7. MCP Extension Tools (default):
   └─ extension_manager.dispatch_tool_call()
```

### 5.2 Виклик MCP інструменту

**Файл:** `goose/src/agents/extension_manager.rs`

```rust
pub async fn dispatch_tool_call(
    &self,
    tool_call: CallToolRequestParam,
    cancellation_token: CancellationToken,
) -> Result<ToolCallResult>
```

**Детальний алгоритм:**

```
КРОК 1: Парсинг імені
├─ tool_name = "extension__tool"
├─ Розділити за "__"
├─ extension_name = "extension"
└─ actual_tool_name = "tool"

КРОК 2: Пошук extension
└─ extension = extensions.get(extension_name)

КРОК 3: Отримання клієнта
└─ client = extension.get_client()

КРОК 4: Підписка на нотифікації
├─ notification_rx = client.subscribe()
└─ notification_stream = ReceiverStream::new(notification_rx)

КРОК 5: Виклик через MCP
└─ result_future = client.call_tool(
      actual_tool_name,
      arguments,
      cancellation_token
   )

КРОК 6: Формування відповіді
└─ ToolCallResult {
      result: Box::new(result_future),
      notification_stream: Some(notification_stream)
   }
```

### 5.3 MCP Protocol: call_tool

**Файл:** `goose/src/agents/mcp_client.rs`

```rust
async fn call_tool(
    &self,
    name: &str,
    arguments: Option<JsonObject>,
    cancel_token: CancellationToken,
) -> Result<CallToolResult, Error>
```

**MCP протокол:**

```
КРОК 1: Формування запиту
└─ ClientRequest::CallToolRequest {
      params: { name, arguments },
      method: "tools/call"
   }

КРОК 2: Відправка через транспорт
└─ handle = client.send_cancellable_request(request)

КРОК 3: Очікування з timeout
└─ tokio::select! {
      result = receiver => return result,
      _ = sleep(timeout) => {
          send_cancel_message()
          Err(Timeout)
      },
      _ = cancel_token.cancelled() => {
          send_cancel_message()
          Err(Cancelled)
      }
   }

КРОК 4: Обробка відповіді
└─ match response {
      ServerResult::CallToolResult(r) => Ok(r),
      _ => Err(UnexpectedResponse)
   }
```

**Формат відповіді:**
```json
{
  "content": [
    {
      "type": "text",
      "text": "Результат виконання"
    }
  ],
  "isError": false
}
```

---

## 6. Обробка результатів

### 6.1 Збір результатів

```
1. Створити combined stream:
   └─ combined = stream::select_all(tool_futures)

2. Для кожного (request_id, item):
   ├─ ToolStreamItem::Result(output):
   │  └─ message_tool_response.with_tool_response(request_id, output)
   └─ ToolStreamItem::Message(notification):
      └─ yield AgentEvent::McpNotification((request_id, notification))

3. Додати до conversation:
   └─ messages_to_add.push(message_tool_response)
```

### 6.2 Формат Tool Response для LLM

```json
{
  "role": "user",
  "content": [
    {
      "type": "tool_result",
      "tool_use_id": "req_123",
      "content": [{"type": "text", "text": "Результат"}],
      "is_error": false
    }
  ]
}
```

### 6.3 Цикл виконання

```
LOOP (до max_turns):
  1. Викликати LLM з tools
  2. Отримати response з tool_calls
  3. Категоризувати requests
  4. Інспектувати requests
  5. Виконати approved tools
  6. Запитати підтвердження для needs_approval
  7. Додати tool_responses до conversation
  8. Якщо є tool_responses → CONTINUE
  9. Якщо немає tool_calls → BREAK
END LOOP
```

---

## 7. Оптимізації

### 7.1 Tool Router (LLM-based selection)

```
ЕТАП 1: Tool Selection
├─ Router LLM отримує task + tool descriptions
├─ Вибирає 5-10 релевантних інструментів
└─ Повертає selected_tool_names

ЕТАП 2: Main LLM
├─ Отримує тільки selected_tools
└─ Викликає потрібні інструменти
```

**Переваги:**
- Менший контекст
- Швидша обробка
- Краща точність

### 7.2 Toolshim (для моделей без tool support)

```
1. Модифікувати system_prompt:
   └─ Додати JSON schema інструментів

2. Очистити tools:
   └─ tools = vec![]

3. Post-processing:
   └─ Парсити JSON з відповіді
   └─ Конвертувати у ToolRequest
```

### 7.3 Notification Streaming

```rust
pub enum ServerNotification {
    ProgressNotification,
    LoggingMessageNotification,
}
```

Використання:
- Real-time прогрес виконання
- Логування під час роботи інструменту

### 7.4 Cancellation Support

```
1. Передати CancellationToken
2. При cancelled():
   ├─ Відправити CancelledNotification
   └─ Перервати очікування
3. MCP сервер зупиняє виконання
```

---

## 8. Обробка помилок

### 8.1 Типи помилок

```rust
pub enum ExtensionError {
    SetupError(String),      // Помилка підключення
    ConfigError(String),     // Помилка конфігурації
    ExecutionError(String),  // Помилка виконання
    TransportClosed,         // З'єднання закрите
    Timeout,                 // Timeout
    Cancelled,               // Скасовано
}
```

### 8.2 Стратегії обробки

```
SetupError:
  └─ Не додавати extension до HashMap

ExecutionError:
  └─ Повернути ErrorData до LLM
  └─ LLM спробує інший підхід

Timeout:
  └─ Відправити cancel message
  └─ Повернути timeout error

TransportClosed:
  └─ Спробувати переподключення
  └─ Якщо не вдалося → видалити extension
```

---

## 9. Приклад повного циклу

```
USER: "Знайди всі Python файли"

1. PREPARE TOOLS:
   └─ tools = ["filesystem__list_files", ...]

2. CALL LLM:
   └─ Response: tool_use("filesystem__list_files", {"pattern": "*.py"})

3. INSPECT:
   └─ SecurityInspector: Allow
   └─ PermissionInspector: Allow (readonly)

4. DISPATCH:
   └─ extension_manager.dispatch_tool_call()
   └─ client.call_tool("list_files", args)

5. RESULT:
   └─ "file1.py\nfile2.py\nfile3.py"

6. ADD TO CONVERSATION:
   └─ tool_response(result)

7. CALL LLM AGAIN:
   └─ "I found 3 Python files: file1.py, file2.py, file3.py"
```

---

## 10. Ключові принципи точності

### 10.1 Точність підбору

1. **Детальні описи** - description + input_schema
2. **Префікси** - `extension__tool` запобігає конфліктам
3. **Router LLM** - інтелектуальний відбір
4. **System Prompt** - чіткі інструкції

### 10.2 Безпека

1. **Інспектори** - багаторівнева перевірка
2. **Підтвердження** - контроль небезпечних операцій
3. **Cancellation** - зупинка в будь-який момент
4. **Timeout** - захист від зависання

### 10.3 Надійність

1. **Error Handling** - всі помилки обробляються
2. **Retry Logic** - автоматичні повтори
3. **Notification Streaming** - real-time feedback
4. **Session Management** - збереження стану

---

## Висновок

Goose використовує складну але надійну систему для роботи з MCP інструментами:

- **Асинхронна архітектура** - ефективна обробка
- **Багаторівнева інспекція** - безпека виконання
- **Гнучка маршрутизація** - підтримка різних типів інструментів
- **MCP Protocol** - стандартизована комунікація
- **Error Recovery** - обробка всіх помилок

Ця система забезпечує точний та безпечний виклик інструментів через LLM.
