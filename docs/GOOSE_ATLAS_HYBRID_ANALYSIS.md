# Goose-Atlas Hybrid System Analysis & Design
## Date: 2025-11-04

## 1. System Analysis

### 1.1 Goose System (Rust-based)

**Architecture:**
- **Agent-based**: Core `Agent` struct manages execution
- **Task Execution**: Parallel task processing with workers
- **Tool Management**: Extension-based tool system with MCP support
- **Prompt Management**: Dynamic prompt building based on model and context
- **Workflow**: Stream-based async execution with cancellation tokens

**Key Strengths:**
1. **Parallel Execution**: `execute_tasks_in_parallel()` with worker pools
2. **Type Safety**: Rust's strong typing for task states and results
3. **Cancellation Support**: Built-in cancellation tokens throughout
4. **Stream Processing**: Async streams for real-time notifications
5. **Recipe System**: Hierarchical task recipes (inline & sub-recipes)

**Core Components:**
```rust
// Task execution flow
Task → TaskExecutionTracker → process_task() → TaskResult
                ↓
        Worker Pool (parallel)
                ↓
        Stream notifications
```

### 1.2 Atlas4 System (JavaScript-based)

**Architecture:**
- **Processor-based**: Stage processors with DI container
- **Sequential Workflow**: Stage-by-stage execution (0→1→2→3)
- **Agent Roles**: Tetyana (planning), Grisha (verification), Atlas (coordination)
- **MCP Integration**: Dynamic TODO with tool planning/execution
- **TTS Integration**: Voice feedback at each stage

**Key Strengths:**
1. **Stage Isolation**: Clear separation of concerns per stage
2. **Verification Loop**: Built-in verification with retry logic
3. **Dynamic Replanning**: Adaptive TODO adjustment on failures
4. **Localization**: Multi-language support
5. **Context Enrichment**: Pre-processing user requests

**Core Components:**
```javascript
// Workflow execution flow
Mode Selection → Context Enrichment → TODO Planning
                        ↓
            For each TODO item:
    Server Selection → Tool Planning → Execution → Verification
                        ↓ (on failure)
                    Replan/Retry
```

## 2. Hybrid System Design

### 2.1 Core Architecture

Combine Goose's parallel execution with Atlas's stage-based workflow:

```
┌─────────────────────────────────────────┐
│         Hybrid Workflow Executor         │
├─────────────────────────────────────────┤
│  Stage 0: Mode & Context Analysis        │
│  (Atlas's mode selection + enrichment)   │
├─────────────────────────────────────────┤
│  Stage 1: Task Planning                  │
│  (Atlas TODO + Goose Recipe System)      │
├─────────────────────────────────────────┤
│  Stage 2: Parallel Execution Engine      │
│  (Goose's worker pool + streaming)       │
├─────────────────────────────────────────┤
│  Stage 3: Verification & Adaptation      │
│  (Atlas's Grisha + dynamic replanning)   │
└─────────────────────────────────────────┘
```

### 2.2 Key Components

#### 2.2.1 Task Definition (Hybrid)
```javascript
class HybridTask {
  // From Atlas
  id: string;
  action: string;
  success_criteria: string;
  dependencies: string[];
  
  // From Goose
  task_type: 'atomic' | 'recipe' | 'parallel_group';
  cancellation_token: CancellationToken;
  stream_notifications: boolean;
  
  // New hybrid features
  execution_mode: 'sequential' | 'parallel' | 'adaptive';
  verification_strategy: 'visual' | 'mcp' | 'llm' | 'composite';
}
```

#### 2.2.2 Execution Engine
```javascript
class HybridExecutionEngine {
  // Goose-inspired parallel execution
  async executeParallel(tasks, maxWorkers = 10) {
    const workerPool = new WorkerPool(maxWorkers);
    const tracker = new TaskExecutionTracker(tasks);
    
    // Stream notifications like Goose
    const notificationStream = new Stream();
    
    // Execute with Atlas's verification
    for (const batch of this.getBatches(tasks)) {
      const results = await workerPool.execute(batch);
      await this.verifyBatch(results);
    }
  }
  
  // Atlas-inspired stage processing
  async executeStaged(task, session) {
    const stages = [
      'server-selection',
      'tool-planning', 
      'tool-execution',
      'verification'
    ];
    
    for (const stage of stages) {
      const result = await this.executeStage(stage, task, session);
      if (!result.success && stage === 'verification') {
        return this.replan(task, result);
      }
    }
  }
}
```

### 2.3 Implementation Strategy

#### Phase 1: Core Infrastructure
1. Create `HybridWorkflowExecutor` class
2. Implement `TaskExecutionTracker` (from Goose)
3. Add `WorkerPool` for parallel execution
4. Integrate cancellation tokens

#### Phase 2: Task System
1. Define `HybridTask` interface
2. Create task dependency resolver
3. Implement batch processing logic
4. Add streaming notifications

#### Phase 3: Integration
1. Connect to existing Atlas processors
2. Add Goose-style recipe support
3. Implement adaptive execution mode
4. Create unified verification system

## 3. Benefits of Hybrid Approach

### 3.1 Performance
- **Parallel execution** for independent tasks (from Goose)
- **Smart batching** based on dependencies
- **Stream processing** for real-time feedback
- **Cancellation support** for long-running tasks

### 3.2 Reliability
- **Type safety** inspiration from Rust patterns
- **Verification loops** from Atlas
- **Automatic retry** with exponential backoff
- **Dynamic replanning** on failures

### 3.3 Flexibility
- **Multiple execution modes** (sequential/parallel/adaptive)
- **Recipe system** for complex workflows
- **Plugin architecture** for extensions
- **Model-agnostic** prompt management

## 4. Migration Path

### Step 1: Create Parallel Execution Module
- Port Goose's worker pool concept to JavaScript
- Add async/await patterns similar to Rust's futures
- Implement cancellation tokens

### Step 2: Enhance Task System
- Extend current TodoItem with Goose features
- Add task_type and execution_mode
- Implement dependency resolver

### Step 3: Integrate Verification
- Keep Atlas's Grisha verification
- Add streaming updates during verification
- Implement composite verification strategies

### Step 4: Testing & Optimization
- Create test suite for parallel execution
- Benchmark performance improvements
- Fine-tune worker pool size

## 5. Code Structure

```
/orchestrator/workflow/hybrid/
├── hybrid-executor.js           # Main executor
├── task-manager.js              # Task definition & management
├── worker-pool.js               # Parallel execution engine
├── execution-tracker.js         # Progress tracking
├── stream-notifier.js          # Real-time notifications
├── recipe-processor.js         # Recipe system
└── verification-adapter.js     # Unified verification
```

## 6. Example Usage

```javascript
const executor = new HybridWorkflowExecutor({
  maxWorkers: 10,
  executionMode: 'adaptive',
  verificationStrategy: 'composite'
});

const tasks = [
  {
    id: '1',
    action: 'Open browser',
    task_type: 'atomic',
    execution_mode: 'sequential'
  },
  {
    id: '2',
    action: 'Search for videos',
    task_type: 'recipe',
    execution_mode: 'parallel',
    dependencies: ['1']
  }
];

const result = await executor.execute(tasks, {
  streaming: true,
  cancellable: true,
  verification: true
});
```

## 7. Next Steps

1. Review and approve design
2. Create implementation plan with milestones
3. Start with Phase 1 (Core Infrastructure)
4. Iteratively add features
5. Test with real workflows
6. Optimize based on performance metrics
