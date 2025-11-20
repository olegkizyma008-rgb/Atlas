#!/bin/bash

# Test MCP Server
# Тестування MCP сервера для перевірки його роботи

set -e

CODEMAP_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
SERVER="$CODEMAP_DIR/mcp_server.py"

echo "🧪 Тестування MCP Server"
echo ""

# Test 1: Initialize
echo "📝 Тест 1: Ініціалізація сервера..."
RESPONSE=$(echo '{"jsonrpc": "2.0", "id": 1, "method": "initialize", "params": {}}' | python3 "$SERVER")
if echo "$RESPONSE" | grep -q "protocolVersion"; then
    echo "✅ Ініціалізація успішна"
else
    echo "❌ Ініціалізація не вдалась"
    exit 1
fi
echo ""

# Test 2: List tools
echo "📝 Тест 2: Список інструментів..."
RESPONSE=$(echo '{"jsonrpc": "2.0", "id": 2, "method": "tools/list", "params": {}}' | python3 "$SERVER")
TOOL_COUNT=$(echo "$RESPONSE" | grep -o '"name"' | wc -l)
echo "✅ Знайдено $TOOL_COUNT інструментів"
echo ""

# Test 3: Call tool
echo "📝 Тест 3: Виклик інструменту (project_health_report)..."
RESPONSE=$(echo '{"jsonrpc": "2.0", "id": 3, "method": "tools/call", "params": {"name": "project_health_report", "arguments": {}}}' | python3 "$SERVER")
if echo "$RESPONSE" | grep -q "project"; then
    echo "✅ Інструмент успішно виконаний"
else
    echo "❌ Інструмент не виконаний"
    exit 1
fi
echo ""

echo "🎉 Всі тести пройдені успішно!"
echo ""
echo "Конфігурація MCP:"
echo "  - Сервер: $SERVER"
echo "  - Конфіг: ~/.codeium/windsurf/mcp_config.json"
echo ""
echo "Тепер ви можете використовувати інструменти в Windsurf Cascade!"
