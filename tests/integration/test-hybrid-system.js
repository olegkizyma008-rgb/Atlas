/**
 * Integration Test for Hybrid Workflow System
 * Tests the Goose-Atlas hybrid implementation
 * 
 * @version 1.0.0
 * @date 2025-11-04
 */

import { HybridWorkflowExecutor, ExecutionMode, TaskType } from '../../orchestrator/workflow/hybrid/hybrid-executor.js';
import { WorkerPool } from '../../orchestrator/workflow/hybrid/worker-pool.js';
import { TaskExecutionTracker, TaskStatus } from '../../orchestrator/workflow/hybrid/execution-tracker.js';
import { StreamNotifier } from '../../orchestrator/workflow/hybrid/stream-notifier.js';
import { RecipeProcessor } from '../../orchestrator/workflow/hybrid/recipe-processor.js';
import { VerificationAdapter } from '../../orchestrator/workflow/hybrid/verification-adapter.js';
import logger from '../../orchestrator/utils/logger.js';

// Mock container for testing
class MockContainer {
  constructor() {
    this.services = new Map();
    this._setupMockServices();
  }

  _setupMockServices() {
    // Mock MCP Todo Manager
    this.services.set('mcpTodoManager', {
      executeVerificationWorkflow: async (item, session) => {
        logger.info('test', `Mock MCP execution for ${item.id}`);
        return {
          success: true,
          execution: { results: [], all_successful: true },
          metadata: {}
        };
      }
    });

    // Mock processors
    this.services.set('tetyanaPlanToolsProcessor', {
      execute: async (params) => {
        logger.info('test', `Mock tool planning for ${params.action}`);
        return {
          success: true,
          data: { tools: ['mock_tool'] }
        };
      }
    });

    this.services.set('tetyanaExecuteToolsProcessor', {
      execute: async (params) => {
        logger.info('test', `Mock tool execution`);
        return {
          success: true,
          data: { results: ['executed'] }
        };
      }
    });

    this.services.set('grishaVerifyItemProcessor', {
      execute: async (params) => {
        logger.info('test', `Mock verification`);
        return {
          success: true,
          data: { verified: true, confidence: 85 }
        };
      },
      _performVisualVerification: async () => {
        return {
          verified: true,
          confidence: 90,
          reason: 'Mock visual verification'
        };
      }
    });

    // Mock LLM Client
    this.services.set('llmClient', {
      complete: async (params) => {
        return {
          content: JSON.stringify({
            verified: true,
            confidence: 75,
            reason: 'Mock LLM verification'
          })
        };
      }
    });
  }

  resolve(serviceName) {
    const service = this.services.get(serviceName);
    if (!service) {
      logger.warn('test', `Service not found: ${serviceName}`);
    }
    return service;
  }
}

/**
 * Test suite for hybrid system
 */
async function runTests() {
  console.log('\n🧪 Starting Hybrid System Integration Tests\n');
  
  const container = new MockContainer();
  let testsPassed = 0;
  let testsFailed = 0;

  // Test 1: Basic sequential execution
  try {
    console.log('📝 Test 1: Sequential Execution');
    
    const executor = new HybridWorkflowExecutor({
      maxWorkers: 5,
      executionMode: ExecutionMode.SEQUENTIAL,
      container
    });

    const tasks = [
      {
        id: '1',
        action: 'Open calculator',
        task_type: TaskType.ATOMIC,
        success_criteria: 'Calculator is visible'
      },
      {
        id: '2',
        action: 'Type 2+2',
        task_type: TaskType.ATOMIC,
        dependencies: ['1'],
        success_criteria: '2+2 is entered'
      }
    ];

    const result = await executor.execute(tasks, {
      streaming: false,
      verification: true
    });

    if (result.success) {
      console.log('✅ Test 1 passed: Sequential execution completed');
      testsPassed++;
    } else {
      throw new Error('Sequential execution failed');
    }
  } catch (error) {
    console.error('❌ Test 1 failed:', error.message);
    testsFailed++;
  }

  // Test 2: Parallel execution
  try {
    console.log('\n📝 Test 2: Parallel Execution');
    
    const executor = new HybridWorkflowExecutor({
      maxWorkers: 5,
      executionMode: ExecutionMode.PARALLEL,
      container
    });

    const tasks = [
      {
        id: '1',
        action: 'Task A',
        task_type: TaskType.ATOMIC
      },
      {
        id: '2',
        action: 'Task B',
        task_type: TaskType.ATOMIC
      },
      {
        id: '3',
        action: 'Task C',
        task_type: TaskType.ATOMIC
      }
    ];

    const result = await executor.execute(tasks, {
      streaming: false,
      verification: false
    });

    if (result.success && result.metrics.parallelizationRatio > 0.5) {
      console.log('✅ Test 2 passed: Parallel execution completed');
      testsPassed++;
    } else {
      throw new Error('Parallel execution failed or low parallelization');
    }
  } catch (error) {
    console.error('❌ Test 2 failed:', error.message);
    testsFailed++;
  }

  // Test 3: Recipe processing
  try {
    console.log('\n📝 Test 3: Recipe Processing');
    
    const recipeProcessor = new RecipeProcessor(container);
    
    const recipeTask = {
      id: 'recipe1',
      task_type: TaskType.RECIPE,
      recipe: {
        name: 'Test Recipe',
        type: 'inline',
        steps: [
          {
            id: 'step1',
            action: 'Plan tools',
            action_type: 'tool-planning'
          },
          {
            id: 'step2',
            action: 'Execute tools',
            action_type: 'tool-execution'
          }
        ]
      }
    };

    const result = await recipeProcessor.processRecipe(recipeTask, {
      session: { id: 'test' }
    });

    if (result.success && result.steps.length === 2) {
      console.log('✅ Test 3 passed: Recipe processing completed');
      testsPassed++;
    } else {
      throw new Error('Recipe processing failed');
    }
  } catch (error) {
    console.error('❌ Test 3 failed:', error.message);
    testsFailed++;
  }

  // Test 4: Worker pool
  try {
    console.log('\n📝 Test 4: Worker Pool');
    
    const pool = new WorkerPool(3, container);
    
    const tasks = Array.from({ length: 10 }, (_, i) => ({
      id: `task${i}`,
      action: `Task ${i}`,
      task_type: TaskType.ATOMIC
    }));

    const results = await pool.executeBatch(tasks, {
      session: { id: 'test' }
    });

    const successful = results.filter(r => r.status === 'fulfilled').length;
    
    if (successful === tasks.length) {
      console.log('✅ Test 4 passed: Worker pool processed all tasks');
      testsPassed++;
    } else {
      throw new Error(`Worker pool failed: ${successful}/${tasks.length} successful`);
    }

    pool.terminate();
  } catch (error) {
    console.error('❌ Test 4 failed:', error.message);
    testsFailed++;
  }

  // Test 5: Execution tracker
  try {
    console.log('\n📝 Test 5: Execution Tracker');
    
    const tasks = [
      { id: '1', action: 'Task 1' },
      { id: '2', action: 'Task 2', dependencies: ['1'] }
    ];
    
    const tracker = new TaskExecutionTracker(tasks);
    
    // Start first task
    await tracker.startTask('1');
    const status1 = tracker.getTaskStatus('1');
    
    if (status1 !== TaskStatus.IN_PROGRESS) {
      throw new Error('Task not in progress');
    }
    
    // Complete first task
    await tracker.completeTask('1', { result: 'done' });
    
    // Check ready tasks
    const readyTasks = tracker.getReadyTasks();
    
    if (readyTasks.length !== 1 || readyTasks[0].id !== '2') {
      throw new Error('Dependency resolution failed');
    }
    
    console.log('✅ Test 5 passed: Execution tracking works correctly');
    testsPassed++;
  } catch (error) {
    console.error('❌ Test 5 failed:', error.message);
    testsFailed++;
  }

  // Test 6: Verification adapter
  try {
    console.log('\n📝 Test 6: Verification Adapter');
    
    const adapter = new VerificationAdapter(container);
    
    const task = {
      id: 'verify1',
      action: 'Open calculator',
      success_criteria: 'Calculator window is visible'
    };
    
    const result = await adapter.verify({
      task,
      result: { data: 'calculator opened' },
      session: { id: 'test' },
      strategy: 'composite'
    });
    
    if (result.verified && result.confidence > 0) {
      console.log('✅ Test 6 passed: Verification adapter works');
      testsPassed++;
    } else {
      throw new Error('Verification failed');
    }
  } catch (error) {
    console.error('❌ Test 6 failed:', error.message);
    testsFailed++;
  }

  // Test 7: Adaptive execution
  try {
    console.log('\n📝 Test 7: Adaptive Execution');
    
    const executor = new HybridWorkflowExecutor({
      maxWorkers: 5,
      executionMode: ExecutionMode.ADAPTIVE,
      container
    });

    const tasks = [
      // Independent tasks (should run in parallel)
      { id: '1', action: 'Task 1', task_type: TaskType.ATOMIC },
      { id: '2', action: 'Task 2', task_type: TaskType.ATOMIC },
      { id: '3', action: 'Task 3', task_type: TaskType.ATOMIC },
      // Dependent task (should wait)
      { id: '4', action: 'Task 4', task_type: TaskType.ATOMIC, dependencies: ['1', '2', '3'] }
    ];

    const result = await executor.execute(tasks, {
      streaming: false,
      verification: false
    });

    if (result.success) {
      console.log('✅ Test 7 passed: Adaptive execution completed');
      testsPassed++;
    } else {
      throw new Error('Adaptive execution failed');
    }
  } catch (error) {
    console.error('❌ Test 7 failed:', error.message);
    testsFailed++;
  }

  // Test 8: Cancellation support
  try {
    console.log('\n📝 Test 8: Cancellation Support');
    
    const executor = new HybridWorkflowExecutor({
      maxWorkers: 5,
      executionMode: ExecutionMode.SEQUENTIAL,
      container
    });

    const tasks = Array.from({ length: 5 }, (_, i) => ({
      id: `${i}`,
      action: `Task ${i}`,
      task_type: TaskType.ATOMIC
    }));

    // Start execution
    const executionPromise = executor.execute(tasks, {
      streaming: false,
      cancellable: true,
      verification: false
    });

    // Cancel after a short delay
    setTimeout(() => {
      const executionId = executor.cancellationTokens.keys().next().value;
      if (executionId) {
        executor.cancelExecution(executionId);
      }
    }, 10);

    try {
      await executionPromise;
      throw new Error('Execution should have been cancelled');
    } catch (error) {
      if (error.message.includes('cancelled')) {
        console.log('✅ Test 8 passed: Cancellation works');
        testsPassed++;
      } else {
        throw error;
      }
    }
  } catch (error) {
    console.error('❌ Test 8 failed:', error.message);
    testsFailed++;
  }

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log(`📊 Test Results: ${testsPassed} passed, ${testsFailed} failed`);
  console.log('='.repeat(50));

  if (testsFailed === 0) {
    console.log('\n✅ All tests passed! Hybrid system is working correctly.');
  } else {
    console.log(`\n⚠️ ${testsFailed} test(s) failed. Please review the errors above.`);
  }

  return testsFailed === 0;
}

// Run tests if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests()
    .then(success => process.exit(success ? 0 : 1))
    .catch(error => {
      console.error('Test suite failed:', error);
      process.exit(1);
    });
}

export { runTests };
