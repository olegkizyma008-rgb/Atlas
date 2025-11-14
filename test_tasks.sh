#!/bin/bash

echo "🧪 Testing ATLAS Orchestrator - Different Task Types"
echo "=================================================="

# Test 1: Simple AppleScript task
echo ""
echo "📝 Test 1: Open Calculator (AppleScript + Vision verification)"
curl -X POST http://localhost:5101/chat/stream \
  -H "Content-Type: application/json" \
  -d '{"message":"Відкрий калькулятор","mode":"task"}' \
  2>&1 | grep -E "data.*\"content\"" | head -5

sleep 3

# Test 2: Chat mode
echo ""
echo "💬 Test 2: Chat mode (conversational)"
curl -X POST http://localhost:5101/chat/stream \
  -H "Content-Type: application/json" \
  -d '{"message":"Привіт, як справи?","mode":"chat"}' \
  2>&1 | grep -E "data.*\"content\"" | head -5

sleep 3

# Test 3: Calculation task
echo ""
echo "🔢 Test 3: Calculator task with verification"
curl -X POST http://localhost:5101/chat/stream \
  -H "Content-Type": "application/json" \
  -d '{"message":"Відкрий калькулятор і обчисли 15 * 8","mode":"task"}' \
  2>&1 | grep -E "data.*\"content\"" | head -10

echo ""
echo "✅ Tests completed! Check orchestrator logs for details."
