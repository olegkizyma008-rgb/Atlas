/**
 * Test script for ValidationPipeline
 * Tests all 4 validators with various scenarios
 * 
 * @date 2025-10-23
 */

import { ValidationPipeline } from '../../orchestrator/ai/validation/validation-pipeline.js';
import { FormatValidator } from '../../orchestrator/ai/validation/format-validator.js';
import { HistoryValidator } from '../../orchestrator/ai/validation/history-validator.js';
import { SchemaValidator } from '../../orchestrator/ai/validation/schema-validator.js';
import { MCPSyncValidator } from '../../orchestrator/ai/validation/mcp-sync-validator.js';
import { ToolHistoryManager } from '../../orchestrator/ai/tool-history-manager.js';
import { MCPManager } from '../../orchestrator/ai/mcp-manager.js';
import { MCP_REGISTRY } from '../../config/mcp-registry.js';

console.log('🧪 Starting ValidationPipeline Tests\n');

// Mock MCP Manager for testing
class MockMCPManager {
  constructor() {
    this.servers = new Map();
    
    // Mock Playwright server
    this.servers.set('playwright', {
      tools: [
        {
          name: 'browser_navigate',
          description: 'Navigate to URL',
          inputSchema: {
            type: 'object',
            properties: {
              url: { type: 'string' }
            },
            required: ['url']
          }
        },
        {
          name: 'browser_click',
          description: 'Click element',
          inputSchema: {
            type: 'object',
            properties: {
              selector: { type: 'string' }
            },
            required: ['selector']
          }
        }
      ],
      getTools() {
        return this.tools;
      }
    });
    
    // Mock Filesystem server
    this.servers.set('filesystem', {
      tools: [
        {
          name: 'write_file',
          description: 'Write file',
          inputSchema: {
            type: 'object',
            properties: {
              path: { type: 'string' },
              content: { type: 'string' }
            },
            required: ['path', 'content']
          }
        }
      ],
      getTools() {
        return this.tools;
      }
    });
  }
}

// Test scenarios
const testScenarios = [
  {
    name: 'Valid tool call',
    toolCalls: [
      {
        server: 'playwright',
        tool: 'playwright__browser_navigate',
        parameters: { url: 'https://example.com' }
      }
    ],
    expectedValid: true,
    expectedCorrections: 0
  },
  
  {
    name: 'Invalid format - missing server prefix',
    toolCalls: [
      {
        server: 'playwright',
        tool: 'browser_navigate',  // ❌ Missing prefix
        parameters: { url: 'https://example.com' }
      }
    ],
    expectedValid: false,
    expectedRejectedAt: 'format'
  },
  
  {
    name: 'Invalid format - wrong prefix',
    toolCalls: [
      {
        server: 'playwright',
        tool: 'filesystem__browser_navigate',  // ❌ Wrong prefix
        parameters: { url: 'https://example.com' }
      }
    ],
    expectedValid: false,
    expectedRejectedAt: 'format'
  },
  
  {
    name: 'Schema validation - similar parameter name (auto-correct)',
    toolCalls: [
      {
        server: 'filesystem',
        tool: 'filesystem__write_file',
        parameters: { 
          filepath: '/tmp/test.txt',  // ❌ Should be 'path' (but similar enough)
          content: 'Hello'
        }
      }
    ],
    expectedValid: true,  // Should auto-correct
    expectedCorrections: 1
  },
  
  {
    name: 'MCP Sync - tool not in list',
    toolCalls: [
      {
        server: 'playwright',
        tool: 'playwright__browser_scroll',  // ❌ Not in mock tools list
        parameters: {}
      }
    ],
    expectedValid: false,
    expectedRejectedAt: 'mcpSync'
  },
  
  {
    name: 'MCP Sync - auto-correction',
    toolCalls: [
      {
        server: 'playwright',
        tool: 'playwright__navigate',  // ❌ Should be browser_navigate
        parameters: { url: 'https://example.com' }
      }
    ],
    expectedValid: true,  // Should auto-correct
    expectedCorrections: 1
  },
  
  {
    name: 'Missing required parameter',
    toolCalls: [
      {
        server: 'playwright',
        tool: 'playwright__browser_navigate',
        parameters: {}  // ❌ Missing 'url'
      }
    ],
    expectedValid: false,
    expectedRejectedAt: 'schema'
  },
  
  {
    name: 'Multiple tool calls - mixed valid/invalid',
    toolCalls: [
      {
        server: 'playwright',
        tool: 'playwright__browser_navigate',
        parameters: { url: 'https://example.com' }
      },
      {
        server: 'playwright',
        tool: 'browser_click',  // ❌ Missing prefix
        parameters: { selector: '#button' }
      }
    ],
    expectedValid: false,
    expectedRejectedAt: 'format'
  }
];

// Run tests
async function runTests() {
  const mcpManager = new MockMCPManager();
  const historyManager = new ToolHistoryManager({
    maxSize: 1000,
    antiRepetitionWindow: 100,
    maxFailuresBeforeBlock: 3
  });
  
  // Create pipeline
  const pipeline = new ValidationPipeline({
    mcpManager,
    historyManager,
    llmValidator: null
  });
  
  // Register validators
  pipeline.registerValidator('format', new FormatValidator());
  pipeline.registerValidator('history', new HistoryValidator(historyManager));
  pipeline.registerValidator('schema', new SchemaValidator(mcpManager));
  pipeline.registerValidator('mcpSync', new MCPSyncValidator(mcpManager));
  
  console.log('✅ Pipeline initialized with 4 validators\n');
  console.log('=' .repeat(80));
  
  let passedTests = 0;
  let failedTests = 0;
  
  for (const scenario of testScenarios) {
    console.log(`\n📋 Test: ${scenario.name}`);
    console.log('-'.repeat(80));
    
    try {
      const result = await pipeline.validate(scenario.toolCalls, {
        itemAction: 'Test action'
      });
      
      // Check expectations
      let testPassed = true;
      const issues = [];
      
      if (result.valid !== scenario.expectedValid) {
        testPassed = false;
        issues.push(`Expected valid=${scenario.expectedValid}, got ${result.valid}`);
      }
      
      if (scenario.expectedRejectedAt && result.rejectedAt !== scenario.expectedRejectedAt) {
        testPassed = false;
        issues.push(`Expected rejectedAt='${scenario.expectedRejectedAt}', got '${result.rejectedAt}'`);
      }
      
      if (scenario.expectedCorrections !== undefined) {
        const actualCorrections = result.corrections ? result.corrections.length : 0;
        if (actualCorrections !== scenario.expectedCorrections) {
          testPassed = false;
          issues.push(`Expected ${scenario.expectedCorrections} corrections, got ${actualCorrections}`);
        }
      }
      
      // Display result
      if (testPassed) {
        console.log('✅ PASSED');
        passedTests++;
      } else {
        console.log('❌ FAILED');
        issues.forEach(issue => console.log(`   - ${issue}`));
        failedTests++;
      }
      
      // Display details
      console.log(`\nResult:`);
      console.log(`  Valid: ${result.valid}`);
      console.log(`  Rejected at: ${result.rejectedAt || 'N/A'}`);
      console.log(`  Errors: ${result.errors.length}`);
      console.log(`  Warnings: ${result.warnings.length}`);
      console.log(`  Corrections: ${result.corrections.length}`);
      console.log(`  Duration: ${result.metadata.totalDuration}ms`);
      console.log(`  Stages executed: ${result.metadata.stagesExecuted}`);
      
      if (result.errors.length > 0) {
        console.log(`\nErrors:`);
        result.errors.slice(0, 3).forEach(err => {
          console.log(`  - [${err.stage}] ${err.message || err.type}`);
          if (err.suggestion) {
            console.log(`    Suggestion: ${err.suggestion}`);
          }
        });
      }
      
      if (result.corrections.length > 0) {
        console.log(`\nCorrections:`);
        result.corrections.forEach(corr => {
          console.log(`  - [${corr.stage}] ${corr.type}`);
          if (corr.original && corr.corrected) {
            console.log(`    ${corr.original} → ${corr.corrected}`);
          }
        });
      }
      
    } catch (error) {
      console.log('❌ FAILED - Exception thrown');
      console.log(`   Error: ${error.message}`);
      failedTests++;
    }
  }
  
  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('\n📊 Test Summary:');
  console.log(`   Total tests: ${testScenarios.length}`);
  console.log(`   ✅ Passed: ${passedTests}`);
  console.log(`   ❌ Failed: ${failedTests}`);
  console.log(`   Success rate: ${((passedTests / testScenarios.length) * 100).toFixed(1)}%`);
  
  // Pipeline metrics
  console.log('\n📈 Pipeline Metrics:');
  const metrics = pipeline.getMetrics();
  console.log(`   Total validations: ${metrics.totalValidations}`);
  console.log(`   Successful: ${metrics.successfulValidations}`);
  console.log(`   Failed: ${metrics.failedValidations}`);
  console.log(`   Success rate: ${(metrics.successRate * 100).toFixed(1)}%`);
  console.log(`   Avg duration: ${metrics.avgDuration}ms`);
  
  console.log('\n📋 Stage Metrics:');
  for (const [stage, stats] of Object.entries(metrics.stageMetrics)) {
    const successRate = stats.calls > 0 ? (stats.successes / stats.calls * 100).toFixed(1) : 0;
    console.log(`   ${stage}:`);
    console.log(`     Calls: ${stats.calls}`);
    console.log(`     Success rate: ${successRate}%`);
    console.log(`     Avg duration: ${stats.avgDuration}ms`);
  }
  
  // Pipeline status
  console.log('\n⚙️  Pipeline Status:');
  const status = pipeline.getStatus();
  console.log(`   Enabled: ${status.enabled}`);
  console.log(`   Early rejection: ${status.earlyRejection}`);
  console.log(`   Total stages: ${status.totalStages}`);
  console.log(`   Registered validators: ${status.registeredValidators}`);
  
  console.log('\n🎯 Conclusion:');
  if (failedTests === 0) {
    console.log('   ✅ All tests passed! ValidationPipeline is working correctly.');
  } else {
    console.log(`   ⚠️  ${failedTests} test(s) failed. Review the results above.`);
  }
  
  console.log('\n' + '='.repeat(80));
}

// Run tests
runTests().catch(error => {
  console.error('❌ Test execution failed:', error);
  console.error(error.stack);
  process.exit(1);
});
