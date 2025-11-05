/**
 * Test Mode Selection after Stage 0 changes
 * Verifies that DEV mode is only for NEXUS internal operations
 */

import { ModeSelectionProcessor } from './orchestrator/workflow/stages/mode-selection-processor.js';
import logger from './orchestrator/utils/logger.js';

const processor = new ModeSelectionProcessor(logger);

const testCases = [
  {
    name: "Self-analysis request (should be CHAT)",
    message: "Проаналізуй себе і скажи як твоє здоров'я"
  },
  {
    name: "Fix yourself request (should be CHAT)",
    message: "Виправ себе, якщо є проблеми"
  },
  {
    name: "Your code request (should be CHAT)",
    message: "Розкажи про твій код"
  },
  {
    name: "Calculator task (should be TASK)",
    message: "Відкрий калькулятор і помнож 5 на 3"
  },
  {
    name: "General chat (should be CHAT)",
    message: "Привіт, як справи?"
  },
  {
    name: "System health question (should be CHAT)",
    message: "Я хочу, щоб ти частіше себе аналізував і давав мені адекватну відповідь про свій стан"
  }
];

async function runTests() {
  console.log('\n🧪 Testing Stage 0 Mode Selection\n');
  console.log('=' .repeat(80));
  
  for (const testCase of testCases) {
    try {
      const result = await processor.execute({
        userMessage: testCase.message,
        session: { id: 'test-session', chatThread: { messages: [] } }
      });
      
      const emoji = result.mode === 'chat' ? '💬' : result.mode === 'dev' ? '🔬' : '🔧';
      const status = 
        (testCase.name.includes('should be CHAT') && result.mode === 'chat') ||
        (testCase.name.includes('should be TASK') && result.mode === 'task') ||
        (testCase.name.includes('should be DEV') && result.mode === 'dev')
          ? '✅' : '❌';
      
      console.log(`\n${status} Test: ${testCase.name}`);
      console.log(`   Message: "${testCase.message}"`);
      console.log(`   Result: ${emoji} ${result.mode.toUpperCase()} (confidence: ${(result.confidence * 100).toFixed(0)}%)`);
      console.log(`   Reasoning: ${result.reasoning}`);
      
    } catch (error) {
      console.log(`\n❌ Test: ${testCase.name}`);
      console.log(`   ERROR: ${error.message}`);
    }
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('\n✅ Testing complete!\n');
}

runTests().catch(console.error);
