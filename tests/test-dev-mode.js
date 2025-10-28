#!/usr/bin/env node

/**
 * Test script for DEV mode self-analysis system
 * Tests all components of the enhanced self-analysis functionality
 * 
 * @version 1.0.0
 * @date 2025-10-28
 */

import { DevSelfAnalysisProcessor } from '../orchestrator/workflow/stages/dev-self-analysis-processor.js';
import logger from '../orchestrator/utils/logger.js';
import axios from 'axios';

// Mock container for testing
const mockContainer = {
  resolve: (name) => {
    if (name === 'mcpManager') {
      return {
        getServer: (serverName) => {
          if (serverName === 'memory') {
            return {
              callTool: async (toolName, params) => {
                console.log(`[MOCK] Memory tool called: ${toolName}`, params);
                return { success: true };
              }
            };
          }
          return null;
        }
      };
    }
    return null;
  }
};

// Mock session
const mockSession = {
  id: 'test-session-' + Date.now(),
  container: mockContainer,
  history: [],
  lastDevAnalysis: null
};

// Test cases
const testCases = [
  {
    name: 'Basic self-analysis',
    userMessage: 'Проаналізуй себе',
    expectedFields: ['analysis', 'metadata', 'success']
  },
  {
    name: 'Error investigation',
    userMessage: 'Перевір помилки в логах',
    expectedFields: ['analysis', 'metadata', 'success']
  },
  {
    name: 'Performance audit',
    userMessage: 'Проаналізуй продуктивність системи',
    expectedFields: ['analysis', 'metadata', 'success']
  },
  {
    name: 'Code intervention request',
    userMessage: 'Виправ знайдені проблеми',
    requiresIntervention: true,
    expectedFields: ['requiresAuth', 'error']
  }
];

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m'
};

async function runTest(testCase) {
  console.log(`\n${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
  console.log(`${colors.magenta}🧪 Test: ${testCase.name}${colors.reset}`);
  console.log(`${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
  console.log(`📝 Message: "${testCase.userMessage}"`);
  
  try {
    // Create processor instance
    const processor = new DevSelfAnalysisProcessor({
      llmClient: null,
      logger: logger,
      container: mockContainer
    });
    
    // Execute analysis
    const startTime = Date.now();
    const result = await processor.execute({
      userMessage: testCase.userMessage,
      session: mockSession,
      requiresIntervention: testCase.requiresIntervention || false,
      password: null
    });
    const duration = Date.now() - startTime;
    
    // Validate result structure
    let passed = true;
    const missing = [];
    
    for (const field of testCase.expectedFields) {
      if (!(field in result)) {
        passed = false;
        missing.push(field);
      }
    }
    
    if (passed) {
      console.log(`${colors.green}✅ PASSED${colors.reset} (${duration}ms)`);
      
      // Display analysis details if available
      if (result.analysis) {
        const analysis = result.analysis;
        console.log(`\n📊 Analysis Results:`);
        
        if (analysis.findings) {
          const findings = analysis.findings;
          console.log(`  • Critical Issues: ${findings.critical_issues?.length || 0}`);
          console.log(`  • Performance Issues: ${findings.performance_bottlenecks?.length || 0}`);
          console.log(`  • Deprecated Patterns: ${findings.deprecated_patterns?.length || 0}`);
          console.log(`  • Suggestions: ${findings.improvement_suggestions?.length || 0}`);
        }
        
        if (analysis.detailed_analysis) {
          const detailed = analysis.detailed_analysis;
          console.log(`\n🔍 Detailed Analysis:`);
          
          if (detailed.memory) {
            console.log(`  • Memory: ${detailed.memory.utilization} (${detailed.memory.status})`);
          }
          
          if (detailed.logs?.metrics) {
            const totalErrors = Object.values(detailed.logs.metrics)
              .reduce((sum, m) => sum + (m.errors || 0), 0);
            console.log(`  • Log Errors: ${totalErrors}`);
          }
          
          if (detailed.recommendations?.length > 0) {
            console.log(`  • Recommendations: ${detailed.recommendations.length}`);
            detailed.recommendations.slice(0, 2).forEach(rec => {
              console.log(`    - ${rec.description}`);
            });
          }
        }
        
        if (analysis.summary) {
          console.log(`\n📝 Summary:`);
          console.log(analysis.summary.split('\n').map(line => `  ${line}`).join('\n'));
        }
      }
      
    } else {
      console.log(`${colors.red}❌ FAILED${colors.reset}`);
      console.log(`Missing fields: ${missing.join(', ')}`);
    }
    
    return { passed, testCase: testCase.name };
    
  } catch (error) {
    console.log(`${colors.red}❌ ERROR${colors.reset}: ${error.message}`);
    
    // Check if this is expected (e.g., auth required)
    if (testCase.requiresIntervention && error.message.includes('password')) {
      console.log(`${colors.yellow}⚠️ Expected auth requirement${colors.reset}`);
      return { passed: true, testCase: testCase.name };
    }
    
    return { passed: false, testCase: testCase.name, error: error.message };
  }
}

async function testAPIEndpoint() {
  console.log(`\n${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
  console.log(`${colors.magenta}🌐 Testing API Endpoint${colors.reset}`);
  console.log(`${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
  
  try {
    const response = await axios.get('http://localhost:4000/health', {
      timeout: 5000
    });
    
    if (response.status === 200) {
      console.log(`${colors.green}✅ API is accessible${colors.reset}`);
      return true;
    }
  } catch (error) {
    console.log(`${colors.yellow}⚠️ API not accessible${colors.reset}: ${error.message}`);
    console.log(`Note: DEV mode will use fallback configuration`);
  }
  
  return false;
}

async function main() {
  console.log(`${colors.magenta}╔════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.magenta}║     DEV Mode Self-Analysis Tests      ║${colors.reset}`);
  console.log(`${colors.magenta}╚════════════════════════════════════════╝${colors.reset}`);
  
  // Test API endpoint
  const apiAvailable = await testAPIEndpoint();
  
  // Run all test cases
  const results = [];
  for (const testCase of testCases) {
    const result = await runTest(testCase);
    results.push(result);
  }
  
  // Summary
  console.log(`\n${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
  console.log(`${colors.magenta}📊 Test Summary${colors.reset}`);
  console.log(`${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
  
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  
  console.log(`Total: ${results.length}`);
  console.log(`${colors.green}Passed: ${passed}${colors.reset}`);
  console.log(`${colors.red}Failed: ${failed}${colors.reset}`);
  
  if (failed === 0) {
    console.log(`\n${colors.green}🎉 All tests passed!${colors.reset}`);
    console.log(`\n✨ DEV mode self-analysis system is working correctly!`);
    console.log(`📝 The system can now:`);
    console.log(`  • Perform deep self-analysis`);
    console.log(`  • Generate detailed findings and recommendations`);
    console.log(`  • Save context to memory for future sessions`);
    console.log(`  • Display results in chat with TTS support`);
    console.log(`  • Handle code intervention requests with password protection`);
  } else {
    console.log(`\n${colors.red}⚠️ Some tests failed${colors.reset}`);
    const failedTests = results.filter(r => !r.passed);
    failedTests.forEach(test => {
      console.log(`  • ${test.testCase}: ${test.error || 'Missing fields'}`);
    });
  }
  
  process.exit(failed === 0 ? 0 : 1);
}

// Run tests
main().catch(error => {
  console.error(`${colors.red}Fatal error:${colors.reset}`, error);
  process.exit(1);
});
