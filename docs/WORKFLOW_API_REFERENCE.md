# Workflow API Reference

**Date**: 2025-11-19
**Version**: 1.0.0

---

## Table of Contents

1. [Core Modules](#core-modules)
2. [Verification Modules](#verification-modules)
3. [Planning Modules](#planning-modules)
4. [Execution Modules](#execution-modules)
5. [Utilities](#utilities)

---

## Core Modules

### WorkflowEngine

Main orchestrator for workflow execution.

#### Constructor
```javascript
new WorkflowEngine({
  todoBuilder,      // TodoBuilder instance
  todoExecutor,     // TodoExecutor instance
  logger,           // Logger instance
  wsManager,        // WebSocket manager (optional)
  ttsSyncManager    // TTS sync manager (optional)
})
```

#### Methods

##### `execute(userMessage, session, options)`
Execute complete workflow from user message to results.

**Parameters:**
- `userMessage` (string): User's request message
- `session` (object): Session object with id, container, etc.
- `options` (object): Additional execution options

**Returns:** Promise<object>
```javascript
{
  success: boolean,
  workflowId: string,
  todo: object,
  results: object,
  metrics: {
    duration: number,
    itemsProcessed: number,
    itemsFailed: number,
    totalAttempts: number
  }
}
```

**Example:**
```javascript
const result = await workflowEngine.execute(
  'Create a new feature',
  { id: 'session_123', container }
);
```

---

### TodoBuilder

Builds TODO lists from user messages.

#### Constructor
```javascript
new TodoBuilder({
  llmClient,              // LLM client instance
  logger,                 // Logger instance
  localizationService     // Localization service (optional)
})
```

#### Methods

##### `build(userMessage, options)`
Build TODO list from user message.

**Parameters:**
- `userMessage` (string): User's request
- `options` (object): Build options

**Returns:** Promise<object>
```javascript
{
  id: string,
  request: string,
  mode: 'standard' | 'extended',
  complexity: number,  // 1-10
  items: Array<TodoItem>,
  execution: {
    current_item_index: number,
    completed_items: number,
    failed_items: number,
    total_attempts: number
  },
  created_at: string
}
```

**Example:**
```javascript
const todo = await todoBuilder.build('Test message');
```

---

### TodoExecutor

Executes TODO items sequentially.

#### Constructor
```javascript
new TodoExecutor({
  toolPlanner,          // ToolPlanner instance
  toolExecutor,         // ToolExecutor instance
  verificationEngine,   // VerificationEngine instance
  logger,               // Logger instance
  wsManager,            // WebSocket manager (optional)
  ttsSyncManager        // TTS sync manager (optional)
})
```

#### Methods

##### `execute(todo, session, options)`
Execute TODO list.

**Parameters:**
- `todo` (object): TODO object with items
- `session` (object): Session object
- `options` (object): Execution options

**Returns:** Promise<object>
```javascript
{
  executionId: string,
  itemsProcessed: number,
  itemsFailed: number,
  totalAttempts: number,
  items: Array<ExecutionResult>
}
```

**Example:**
```javascript
const results = await todoExecutor.execute(todo, session);
```

---

## Verification Modules

### VerificationEngine

Main verification coordinator.

#### Constructor
```javascript
new VerificationEngine({
  mcpVerifier,       // MCPVerifier instance
  llmVerifier,       // LLMVerifier instance
  adaptiveVerifier,  // AdaptiveVerifier instance
  logger             // Logger instance
})
```

#### Methods

##### `verify(item, execResult, session)`
Verify execution result.

**Parameters:**
- `item` (object): TODO item
- `execResult` (object): Execution result
- `session` (object): Session object

**Returns:** Promise<object>
```javascript
{
  verified: boolean,
  confidence: number,  // 0-100
  reason: string,
  method: string,
  details: object
}
```

**Example:**
```javascript
const verification = await verificationEngine.verify(item, result, session);
```

---

### MCPVerifier

MCP-based verification using MCP tools.

#### Constructor
```javascript
new MCPVerifier({
  mcpManager,              // MCP manager instance
  grishaVerifyProcessor,   // Grisha verify processor (optional)
  logger                   // Logger instance
})
```

#### Methods

##### `verify(item, execResult, session)`
Verify using MCP tools.

**Returns:** Promise<object> with `method: 'mcp'`

---

### LLMVerifier

LLM-based verification using language models.

#### Constructor
```javascript
new LLMVerifier({
  llmClient,  // LLM client instance
  logger      // Logger instance
})
```

#### Methods

##### `verify(item, execResult, session)`
Verify using LLM analysis.

**Returns:** Promise<object> with `method: 'llm'`

---

### AdaptiveVerifier

Adaptive verification strategy selection.

#### Constructor
```javascript
new AdaptiveVerifier({
  mcpVerifier,       // MCPVerifier instance
  llmVerifier,       // LLMVerifier instance
  logger             // Logger instance
})
```

#### Methods

##### `verify(item, execResult, session)`
Verify using adaptive strategy selection.

**Returns:** Promise<object> with `method: 'adaptive_*'`

---

## Planning Modules

### DependencyResolver

Resolves dependencies between TODO items.

#### Constructor
```javascript
new DependencyResolver({
  logger  // Logger instance
})
```

#### Methods

##### `buildGraph(items)`
Build dependency graph from TODO items.

**Parameters:**
- `items` (Array<object>): TODO items

**Returns:** object
```javascript
{
  nodes: number,
  edges: number
}
```

##### `resolve(items)`
Resolve dependencies and return execution order.

**Returns:** object
```javascript
{
  success: boolean,
  order: Array<number>,  // Item IDs in execution order
  graph: object,
  cycles: Array<Array>   // Circular dependencies if any
}
```

##### `canExecute(itemId, completedItems)`
Check if item can be executed.

**Returns:** boolean

---

### AdaptivePlanner

Adaptive planning strategy selection.

#### Constructor
```javascript
new AdaptivePlanner({
  toolPlanner,           // ToolPlanner instance
  dependencyResolver,    // DependencyResolver instance
  logger                 // Logger instance
})
```

#### Methods

##### `plan(todo, session)`
Plan TODO execution adaptively.

**Returns:** Promise<object>
```javascript
{
  success: boolean,
  strategy: 'direct' | 'sequential' | 'parallel' | 'advanced',
  items: Array<object>,
  dependencies: Array<number>,
  optimizations: Array<object>
}
```

---

## Execution Modules

### ToolExecutor

Executes planned tools.

#### Constructor
```javascript
new ToolExecutor({
  mcpManager,      // MCP manager instance
  rateLimiter,     // Rate limiter instance
  logger           // Logger instance
})
```

#### Methods

##### `execute(item, plan, session)`
Execute tools for a TODO item.

**Returns:** Promise<object>
```javascript
{
  success: boolean,
  executionId: string,
  toolCount: number,
  results: Array<object>
}
```

---

### MCPExecutor

MCP-specific tool execution.

#### Constructor
```javascript
new MCPExecutor({
  mcpManager,         // MCP manager instance
  tetyanaProcessor,   // Tetyana execute processor (optional)
  logger              // Logger instance
})
```

#### Methods

##### `execute(item, plan, session)`
Execute tools via MCP.

**Returns:** Promise<object> with `method: 'mcp_*'`

---

### FallbackHandler

Handles execution failures and provides fallback strategies.

#### Constructor
```javascript
new FallbackHandler({
  toolExecutor,  // ToolExecutor instance
  logger         // Logger instance
})
```

#### Methods

##### `handle(item, error, context)`
Handle execution failure.

**Parameters:**
- `item` (object): TODO item
- `error` (Error): Error object
- `context` (object): Execution context

**Returns:** Promise<object>
```javascript
{
  success: boolean,
  strategy: 'retry' | 'alternative' | 'simplify' | 'skip' | 'error',
  result: object,
  error: string
}
```

---

## Utilities

### ProcessorRegistry

Centralized processor management.

#### Constructor
```javascript
new ProcessorRegistry({
  logger  // Logger instance
})
```

#### Methods

##### `register(name, processor, metadata)`
Register a processor.

##### `resolve(name)`
Resolve processor by name.

**Returns:** object (processor instance)

##### `has(name)`
Check if processor exists.

**Returns:** boolean

##### `getAll()`
Get all registered processors.

**Returns:** Array<string>

---

### TemplateResolver

Resolves template strings in workflow context.

#### Constructor
```javascript
new TemplateResolver({
  logger  // Logger instance
})
```

#### Methods

##### `resolve(template, context)`
Resolve template string with context.

**Parameters:**
- `template` (string): Template string with {{variables}}
- `context` (object): Context object

**Returns:** string (resolved template)

**Example:**
```javascript
const result = resolver.resolve('Hello {{name}}', { name: 'John' });
// Result: 'Hello John'
```

##### `validate(template)`
Validate template syntax.

**Returns:** object
```javascript
{
  valid: boolean,
  errors: Array<string>,
  variables: Array<string>
}
```

---

### ContextBuilder

Builds and manages workflow context.

#### Constructor
```javascript
new ContextBuilder({
  logger  // Logger instance
})
```

#### Methods

##### `createContext(session, options)`
Create workflow context.

**Returns:** object
```javascript
{
  id: string,
  session: object,
  todo: object,
  currentItem: object,
  results: Array,
  state: string,
  metadata: object,
  services: object
}
```

##### `updateContext(contextId, updates)`
Update context state.

##### `getContext(contextId)`
Get context by ID.

##### `addResult(contextId, result)`
Add result to context.

##### `setCurrentItem(contextId, item)`
Set current item in context.

##### `getSummary(contextId)`
Get context summary.

---

## Error Handling

All modules throw descriptive errors:

```javascript
try {
  await workflowEngine.execute(message, session);
} catch (error) {
  console.error(error.message);
  // Handle error appropriately
}
```

Common errors:
- `"Session is required"` - Session object missing
- `"MCP Manager not available"` - MCP manager not initialized
- `"Circular dependencies detected"` - Dependency graph has cycles
- `"Tool execution failed"` - Tool execution error

---

## Logging

All modules use consistent logging:

```javascript
logger.system('module-name', 'Message', { context });
logger.error('module-name', 'Error message', { context });
logger.warn('module-name', 'Warning message', { context });
```

---

## Performance Considerations

- **Complexity**: O(n) for most operations where n is number of items
- **Memory**: Minimal overhead with lazy initialization
- **Concurrency**: Supports parallel execution where applicable
- **Rate Limiting**: Adaptive throttling for API calls

---

## Version History

| Version | Date       | Changes                                |
| ------- | ---------- | -------------------------------------- |
| 1.0.0   | 2025-11-19 | Initial release with Phase 1-5 modules |

---

**Last Updated**: 2025-11-19
