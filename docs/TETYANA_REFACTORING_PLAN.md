# TETYANA REFACTORING PLAN - Goose-Inspired Improvements

> **Дата створення:** 21 жовтня 2025  
> **Базується на:** Аналіз Goose (Rust) vs Atlas Tetyana (JavaScript)  
> **Мета:** Вдосконалення системи підбору та виконання інструментів

---

## 📋 Executive Summary

### Ключові відмінності Goose vs Tetyana

| Функціонал | Goose | Tetyana | Пріоритет |
|------------|-------|---------|-----------|
| Tool History Tracking | ✅ VecDeque<100> | ❌ | 🔴 CRITICAL |
| LLM Tool Selection | ✅ RouterToolSelector | ❌ | 🟡 HIGH |
| Inspection System | ✅ Multi-inspector | ⚠️ Базовий | 🟡 HIGH |
| Retry Logic | ✅ RetryManager | ⚠️ Простий | 🟡 MEDIUM |
| Repetition Detection | ✅ RepetitionInspector | ❌ | 🟡 MEDIUM |
| Notification Streams | ✅ MCP streams | ❌ | 🟢 LOW |
| Large Response Handler | ✅ File offload | ❌ | 🟢 LOW |
| Permission System | ✅ Persistent | ⚠️ Auto | 🟡 MEDIUM |

---

## 🔍 Поглиблений аналіз Goose

### 1. Tool History Tracking

**Goose Implementation:**
```rust
pub struct LLMToolSelector {
    recent_tool_calls: Arc<RwLock<VecDeque<String>>>
}

async fn record_tool_call(&self, tool_name: &str) {
    let mut recent_calls = self.recent_tool_calls.write().await;
    if recent_calls.len() >= 100 {
        recent_calls.pop_front();
    }
    recent_calls.push_back(tool_name.to_string());
}
```

**Що дає:**
- LLM бачить останні 100 викликів
- Уникнення повторних викликів
- Контекст для кращого планування

---

### 2. LLM-based Tool Selection

**Goose Implementation:**
```rust
async fn select_tools(&self, params: JsonObject) -> Result<Vec<Content>> {
    let query = params.get("query");
    let tools = self.tool_strings.read().await;
    
    // Use LLM to analyze and select
    let prompt = render_template("router_tool_selector.md", &context);
    let response = self.llm_provider.complete(prompt).await;
    
    // Parse selected tools
    let tool_entries = parse_tool_entries(response);
    Ok(tool_entries)
}
```

**Переваги:**
- Точніший підбір tools
- Reasoning для кожного вибору
- Адаптивність до контексту

---

### 3. Tool Inspection System

**Goose Architecture:**
```rust
pub struct ToolInspectionManager {
    inspectors: Vec<Box<dyn ToolInspector>>
}

pub trait ToolInspector {
    async fn inspect(
        &self,
        tool_requests: &[ToolRequest],
        messages: &[Message]
    ) -> Result<Vec<InspectionResult>>;
}

pub enum InspectionAction {
    Allow,
    Deny,
    RequireApproval(Option<String>)
}
```

**Типи інспекторів:**
1. **RepetitionInspector** - детектує зациклення
2. **PermissionInspector** - перевіряє дозволи
3. **SecurityInspector** - виявляє небезпечні операції

---

### 4. Repetition Inspector

**Goose Implementation:**
```rust
pub struct RepetitionInspector {
    max_repetitions: Option<u32>,
    last_call: Option<InternalToolCall>,
    repeat_count: u32,
    call_counts: HashMap<String, u32>
}

pub fn check_tool_call(&mut self, tool_call: CallToolRequestParam) -> bool {
    // Track consecutive repetitions
    if last_call.matches(&current_call) {
        self.repeat_count += 1;
        if self.repeat_count > self.max_repetitions {
            return false;  // DENY
        }
    }
    true
}
```

**Детекція:**
- Consecutive repetitions (той самий tool + params)
- Total call count per tool
- Configurable limits

---

### 5. Retry Manager

**Goose Implementation:**
```rust
pub struct RetryManager {
    attempts: Arc<Mutex<u32>>,
    repetition_inspector: Option<Arc<Mutex<RepetitionInspector>>>
}

pub struct RetryConfig {
    max_retries: u32,
    checks: Vec<SuccessCheck>,
    on_failure: Option<String>,
    timeout_seconds: Option<u64>
}

pub enum SuccessCheck {
    Shell { command: String }
}
```

**Workflow:**
1. Execute task
2. Run success checks (shell commands)
3. If failed: run on_failure cleanup
4. Reset state
5. Increment attempts
6. Retry

---

### 6. Large Response Handler

**Goose Implementation:**
```rust
const LARGE_TEXT_THRESHOLD: usize = 200_000;

pub fn process_tool_response(response: Result<Vec<Content>>) {
    if text.chars().count() > LARGE_TEXT_THRESHOLD {
        let file_path = write_large_text_to_file(&text)?;
        return Content::text(format!(
            "Response too large ({} chars), stored in: {}",
            text.chars().count(), file_path
        ));
    }
}
```

**Переваги:**
- Запобігає переповненню context
- LLM може читати файл через filesystem tools
- Automatic cleanup

---

## 🎯 План імплементації

### Phase 1: CRITICAL (Тиждень 1-2)

#### 1.1 Tool History Manager
```javascript
// orchestrator/ai/tool-history-manager.js
class ToolHistoryManager {
    constructor() {
        this.history = [];  // Last 100
        this.maxSize = 100;
        this.callCounts = new Map();
    }

    recordToolCall(server, tool, params, success, duration) {
        const entry = {
            tool: `${server}__${tool}`,
            params,
            success,
            duration,
            timestamp: Date.now()
        };
        
        this.history.push(entry);
        if (this.history.length > this.maxSize) {
            this.history.shift();
        }
        
        const count = this.callCounts.get(entry.tool) || 0;
        this.callCounts.set(entry.tool, count + 1);
    }

    getRecentCalls(limit = 10) {
        return this.history.slice(-limit).reverse();
    }

    formatForPrompt(limit = 5) {
        const recent = this.getRecentCalls(limit);
        return recent.map(call => 
            `- ${call.tool} (${call.success ? '✅' : '❌'})`
        ).join('\n');
    }
}
```

**Integration:**
- Add to TetyanaToolSystem constructor
- Call recordToolCall() after each execution
- Include formatForPrompt() in LLM context

---

### Phase 2: HIGH (Тиждень 3-4)

#### 2.1 LLM Tool Selector
```javascript
// orchestrator/ai/llm-tool-selector.js
class LLMToolSelector {
    constructor(llmClient) {
        this.llmClient = llmClient;
        this.toolIndex = new Map();
    }

    async indexTools(tools, serverName) {
        const toolString = tools.map(t => 
            `Tool: ${t.name}\nDescription: ${t.description}\nSchema: ${JSON.stringify(t.inputSchema)}`
        ).join('\n\n');
        
        this.toolIndex.set(serverName, toolString);
    }

    async selectTools(query, availableServers) {
        const toolStrings = availableServers
            .map(server => this.toolIndex.get(server))
            .filter(Boolean)
            .join('\n\n');

        const prompt = `
Available tools:
${toolStrings}

User query: ${query}

Select the most relevant tools. Return JSON array:
[{"server": "...", "tool": "...", "reasoning": "..."}]
`;

        const response = await this.llmClient.complete({
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.1
        });

        return JSON.parse(response.content);
    }
}
```

#### 2.2 Inspection Manager
```javascript
// orchestrator/ai/tool-inspection-manager.js
class ToolInspectionManager {
    constructor() {
        this.inspectors = [];
    }

    addInspector(inspector) {
        this.inspectors.push(inspector);
    }

    async inspectTools(toolCalls, context) {
        const allResults = [];
        
        for (const inspector of this.inspectors) {
            if (!inspector.isEnabled()) continue;
            
            try {
                const results = await inspector.inspect(toolCalls, context);
                allResults.push(...results);
            } catch (error) {
                logger.error(`Inspector ${inspector.name} failed:`, error);
            }
        }
        
        return allResults;
    }
}
```

#### 2.3 Repetition Inspector
```javascript
// orchestrator/ai/inspectors/repetition-inspector.js
class RepetitionInspector {
    constructor(maxRepetitions = 3) {
        this.maxRepetitions = maxRepetitions;
        this.lastCall = null;
        this.repeatCount = 0;
        this.callCounts = new Map();
    }

    async inspect(toolCalls, context) {
        const results = [];

        for (const call of toolCalls) {
            const toolKey = `${call.server}__${call.tool}`;
            const paramsKey = JSON.stringify(call.parameters);
            const fullKey = `${toolKey}:${paramsKey}`;

            // Check consecutive repetitions
            if (this.lastCall === fullKey) {
                this.repeatCount++;
                
                if (this.repeatCount > this.maxRepetitions) {
                    results.push({
                        toolCall: call,
                        action: 'DENY',
                        reason: `Tool repeated ${this.repeatCount} times`,
                        confidence: 1.0,
                        inspector: 'repetition'
                    });
                }
            } else {
                this.repeatCount = 1;
                this.lastCall = fullKey;
            }

            // Check total calls
            const totalCalls = this.callCounts.get(toolKey) || 0;
            this.callCounts.set(toolKey, totalCalls + 1);

            if (totalCalls > 10) {
                results.push({
                    toolCall: call,
                    action: 'REQUIRE_APPROVAL',
                    reason: `Tool called ${totalCalls} times total`,
                    confidence: 0.8,
                    inspector: 'repetition'
                });
            }
        }

        return results;
    }

    reset() {
        this.lastCall = null;
        this.repeatCount = 0;
        this.callCounts.clear();
    }
}
```

---

### Phase 3: MEDIUM (Тиждень 5-6)

#### 3.1 Advanced Retry Manager
```javascript
// orchestrator/ai/retry-manager.js
class RetryManager {
    constructor(config) {
        this.attempts = 0;
        this.config = config || {
            maxRetries: 3,
            successChecks: [],
            onFailure: null,
            timeoutSeconds: 60
        };
    }

    async handleRetry(item, executionResult, context) {
        // 1. Run success checks
        const success = await this.executeSuccessChecks(this.config.successChecks);
        if (success) {
            return { result: 'SUCCESS_CHECKS_PASSED' };
        }

        // 2. Check max attempts
        if (this.attempts >= this.config.maxRetries) {
            return { result: 'MAX_ATTEMPTS_REACHED' };
        }

        // 3. Run on_failure command
        if (this.config.onFailure) {
            await this.executeOnFailureCommand(this.config.onFailure);
        }

        // 4. Reset state
        await this.resetStateForRetry(context);

        // 5. Increment and retry
        this.attempts++;
        return { result: 'RETRIED', attempt: this.attempts };
    }

    async executeSuccessChecks(checks) {
        for (const check of checks) {
            if (check.type === 'shell') {
                const result = await this.executeShellCommand(check.command);
                if (result.exitCode !== 0) {
                    return false;
                }
            }
        }
        return true;
    }
}
```

#### 3.2 Permission Inspector
```javascript
// orchestrator/ai/inspectors/permission-inspector.js
class PermissionInspector {
    constructor() {
        this.rules = new Map();
        this.highRiskTools = [
            'shell__run_command',
            'filesystem__delete_file',
            'filesystem__write_file'
        ];
    }

    async inspect(toolCalls, context) {
        const results = [];

        for (const call of toolCalls) {
            const toolKey = `${call.server}__${call.tool}`;
            const rule = this.rules.get(toolKey);

            if (rule === 'always_allow') continue;
            if (rule === 'always_deny') {
                results.push({
                    toolCall: call,
                    action: 'DENY',
                    reason: 'User has blocked this tool',
                    confidence: 1.0,
                    inspector: 'permission'
                });
                continue;
            }

            if (this.highRiskTools.includes(toolKey)) {
                results.push({
                    toolCall: call,
                    action: 'REQUIRE_APPROVAL',
                    reason: 'High-risk operation detected',
                    confidence: 0.9,
                    inspector: 'permission'
                });
            }
        }

        return results;
    }

    setPermission(tool, level) {
        this.rules.set(tool, level);
    }
}
```

---

### Phase 4: LOW (Тиждень 7-8)

#### 4.1 Notification Streams
```javascript
// orchestrator/ai/notification-stream-handler.js
class NotificationStreamHandler {
    async executeToolWithNotifications(toolCall, mcpManager, wsManager) {
        const { result, notifications } = await mcpManager.executeTool(
            toolCall.server,
            toolCall.tool,
            toolCall.parameters
        );

        notifications.on('notification', (notification) => {
            if (notification.method === 'notifications/progress') {
                wsManager.broadcast('tool_progress', {
                    tool: `${toolCall.server}__${toolCall.tool}`,
                    progress: notification.params.progress,
                    message: notification.params.message
                });
            }
        });

        return await result;
    }
}
```

#### 4.2 Large Response Handler
```javascript
// orchestrator/ai/large-response-handler.js
class LargeResponseHandler {
    constructor() {
        this.threshold = 200000;  // 200K chars
        this.tempDir = path.join(os.tmpdir(), 'atlas_mcp_responses');
        fs.mkdirSync(this.tempDir, { recursive: true });
    }

    async processToolResponse(response) {
        if (!response.success || !response.data) return response;

        const content = typeof response.data === 'string' 
            ? response.data 
            : JSON.stringify(response.data);

        if (content.length > this.threshold) {
            const filePath = await this.writeToFile(content);
            
            return {
                ...response,
                data: {
                    type: 'large_response',
                    size: content.length,
                    file: filePath,
                    message: `Response too large (${content.length} chars), stored in: ${filePath}`
                }
            };
        }

        return response;
    }

    async writeToFile(content) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `mcp_response_${timestamp}.txt`;
        const filePath = path.join(this.tempDir, filename);
        await fs.promises.writeFile(filePath, content, 'utf8');
        return filePath;
    }
}
```

---

## 🏗️ Архітектурні зміни

### Нова структура

```
orchestrator/ai/
├── tetyana-tool-system.js          (EXISTING - enhance)
├── tool-history-manager.js         (NEW)
├── llm-tool-selector.js            (NEW)
├── tool-inspection-manager.js      (NEW)
├── retry-manager.js                (NEW)
├── large-response-handler.js       (NEW)
├── notification-stream-handler.js  (NEW)
└── inspectors/
    ├── repetition-inspector.js     (NEW)
    ├── permission-inspector.js     (NEW)
    └── security-inspector.js       (ENHANCE)
```

### Integration в TetyanaToolSystem

```javascript
class TetyanaToolSystem {
    constructor(dependencies) {
        // EXISTING
        this.mcpManager = dependencies.mcpManager;
        this.llmClient = dependencies.llmClient;
        
        // NEW
        this.historyManager = new ToolHistoryManager();
        this.toolSelector = new LLMToolSelector(this.llmClient);
        this.inspectionManager = new ToolInspectionManager();
        this.retryManager = new RetryManager();
        this.responseHandler = new LargeResponseHandler();
        
        // Register inspectors
        this.inspectionManager.addInspector(new RepetitionInspector(3));
        this.inspectionManager.addInspector(new PermissionInspector());
        this.inspectionManager.addInspector(new SecurityInspector());
    }

    async executeToolCalls(toolCalls, context) {
        const results = [];
        
        for (const toolCall of toolCalls) {
            // 1. Inspect
            const inspectionResults = await this.inspectionManager.inspectTools(
                [toolCall], context
            );
            
            // 2. Handle inspection
            const blocked = inspectionResults.find(r => r.action === 'DENY');
            if (blocked) {
                results.push({ success: false, error: blocked.reason });
                continue;
            }
            
            // 3. Execute
            const result = await this.mcpManager.executeTool(
                toolCall.server, toolCall.tool, toolCall.parameters
            );
            
            // 4. Process large responses
            const processed = await this.responseHandler.processToolResponse(result);
            
            // 5. Record history
            this.historyManager.recordToolCall(
                toolCall.server, toolCall.tool, toolCall.parameters,
                result.success, result.duration
            );
            
            results.push(processed);
        }
        
        return { results, all_successful: results.every(r => r.success) };
    }
}
```

---

## 📊 Міграційна стратегія

### Backward Compatibility

1. **Поступове впровадження** - нові модулі як optional
2. **Feature flags** - можливість вимкнути нові функції
3. **Fallback до legacy** - якщо нові модулі не працюють

### Testing Strategy

1. **Unit tests** для кожного нового модуля
2. **Integration tests** з існуючою системою
3. **A/B testing** - порівняння з legacy

---

## ✅ Success Metrics

| Метрика | Поточне | Ціль |
|---------|---------|------|
| Invalid tool plans | ~15% | <5% |
| Tool repetitions | ~10% | <2% |
| Retry success rate | ~60% | >80% |
| Context overflow | ~5% | <1% |
| User approvals needed | 0% | 5-10% |

---

## 📝 Висновок

Рефакторинг Тетяни на основі Goose дасть:

✅ **Точніший підбір tools** через LLM selection  
✅ **Детекцію зациклень** через RepetitionInspector  
✅ **Кращий контекст** через Tool History  
✅ **Розумні retries** через RetryManager  
✅ **User control** через Permission System  

**Estimated effort:** 8 тижнів (2 місяці)  
**Priority:** HIGH - критичні покращення для production
