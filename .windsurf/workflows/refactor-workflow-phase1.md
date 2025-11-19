---
description: Refactor workflow Phase 1 - Create core workflow modules
auto_execution_mode: 3
---

# Workflow Refactoring - Phase 1: Core Modules

This workflow implements Phase 1 of the workflow refactoring plan based on MCP codemap analysis.

## Overview

Create the core workflow modules that will replace the monolithic MCPTodoManager:
- WorkflowEngine (main orchestrator)
- TodoBuilder (builds TODO from user input)
- TodoExecutor (executes TODO items)

## Prerequisites

- Read `/WORKFLOW_REFACTORING_PLAN.md` for full context
- Understand current MCPTodoManager architecture
- Review codemap analysis results

## Phase 1 Steps

### 1. Create Directory Structure
```bash
mkdir -p orchestrator/workflow/core
mkdir -p orchestrator/workflow/planning
mkdir -p orchestrator/workflow/execution
mkdir -p orchestrator/workflow/verification
mkdir -p orchestrator/workflow/utils
```

### 2. Create WorkflowEngine
```bash
# File: orchestrator/workflow/core/workflow-engine.js
# Responsibilities:
# - Main orchestrator for workflow execution
# - Coordinates TodoBuilder and TodoExecutor
# - Handles session and context management
# - Provides logging and error handling
```

**Key Methods:**
- `execute(userMessage, session)` - Main entry point
- `_validateSession(session)` - Validate session
- `_handleError(error, context)` - Error handling

### 3. Create TodoBuilder
```bash
# File: orchestrator/workflow/core/todo-builder.js
# Responsibilities:
# - Build TODO list from user message
# - Analyze complexity
# - Generate TODO items with dependencies
# - Enhance success criteria
```

**Key Methods:**
- `build(userMessage, options)` - Build TODO
- `_analyzComplexity(message)` - Analyze complexity
- `_generateItems(message, complexity)` - Generate items
- `_enhanceCriteria(items)` - Enhance criteria

### 4. Create TodoExecutor
```bash
# File: orchestrator/workflow/core/todo-executor.js
# Responsibilities:
# - Execute TODO items sequentially
# - Handle dependencies
# - Coordinate planning, execution, verification
# - Manage retries and adjustments
```

**Key Methods:**
- `execute(todo, session)` - Execute TODO
- `_executeItem(item, todo, session)` - Execute single item
- `_resolveDependencies(item, todo)` - Resolve dependencies
- `_handleItemFailure(item, todo, error)` - Handle failure

### 5. Create Unit Tests
```bash
# File: tests/unit/workflow/workflow-engine.test.js
# File: tests/unit/workflow/todo-builder.test.js
# File: tests/unit/workflow/todo-executor.test.js
```

## Implementation Guidelines

### Code Style
- Use ES6 classes and async/await
- Add JSDoc comments for all public methods
- Follow existing project conventions
- Use dependency injection

### Error Handling
- Wrap async operations in try-catch
- Log all errors with context
- Provide meaningful error messages
- Support graceful degradation

### Logging
- Use logger.system() for workflow events
- Use logger.error() for errors
- Use logger.warn() for warnings
- Include context in all logs

### Testing
- Write unit tests for each class
- Mock dependencies (mcpManager, llmClient, etc.)
- Test error cases
- Test edge cases

## Validation Checklist

- [ ] All files created in correct locations
- [ ] JSDoc comments added to all public methods
- [ ] Unit tests written and passing
- [ ] Error handling implemented
- [ ] Logging integrated
- [ ] No circular dependencies
- [ ] DI Container compatible
- [ ] Backward compatible with MCPTodoManager

## Next Steps

After Phase 1 completion:
1. Review code quality with codemap
2. Run all tests
3. Create Phase 2 (Planning modules)
4. Update documentation

## Time Estimate

- Setup: 30 minutes
- Implementation: 3 hours
- Testing: 1 hour
- Documentation: 30 minutes
- **Total: 5 hours**

## References

- Main plan: `/WORKFLOW_REFACTORING_PLAN.md`
- Current implementation: `orchestrator/workflow/mcp-todo-manager.js`
- Codemap analysis: `/docs/codemap/CODEMAP_SUMMARY.md`
- Service registry: `orchestrator/core/service-registry.js`