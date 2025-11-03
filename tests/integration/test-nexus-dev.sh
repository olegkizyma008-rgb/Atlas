#!/bin/bash

# Test Nexus DEV mode activation
# Sends a DEV request and monitors logs in real-time

echo "🧪 Testing NEXUS DEV Mode Activation"
echo "======================================"
echo ""

# Start monitoring logs in background
echo "📊 Monitoring logs..."
tail -f logs/orchestrator.log | grep -E "(NEXUS|DEV-ANALYSIS|Multi-Model|selfImprovement|Windsurf)" &
LOG_PID=$!

sleep 2

# Send test request
echo ""
echo "📤 Sending DEV mode test request..."
curl -X POST http://localhost:5101/chat/stream \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Проаналізуй свій код і виправ помилки якщо знайдеш",
    "session_id": "test-nexus-session"
  }' \
  2>/dev/null | while IFS= read -r line; do
    if [[ "$line" == data:* ]]; then
      echo "$line" | sed 's/^data: //'
    fi
  done

echo ""
echo "⏳ Waiting for processing (10 seconds)..."
sleep 10

# Stop log monitoring
kill $LOG_PID 2>/dev/null

echo ""
echo "✅ Test completed. Check logs above for:"
echo "   - [NEXUS] Multi-Model Orchestrator initialized"
echo "   - [DEV-ANALYSIS] Nexus Self-Improvement Engine activating"
echo "   - Windsurf API usage"
echo ""
