#!/bin/bash
# Start Enhanced Codemap System
# Runs continuous analyzer + MCP server

set -e

PROJECT_ROOT="/Users/dev/Documents/GitHub/atlas4"
CODEMAP_DIR="$PROJECT_ROOT/codemap-system"
REPORTS_DIR="$PROJECT_ROOT/reports"

echo "🚀 Starting Enhanced Codemap System..."
echo "📁 Project: $PROJECT_ROOT"
echo "📊 Reports: $REPORTS_DIR"

# Create reports directory
mkdir -p "$REPORTS_DIR"

# Create logs directory
mkdir -p "$CODEMAP_DIR/logs"

echo ""
echo "✅ Directories ready"
echo ""

# Start Enhanced Analyzer in background
echo "🔄 Starting Enhanced Analyzer (continuous multi-layer analysis)..."
cd "$CODEMAP_DIR"
python3 mcp_enhanced_analyzer.py > "$CODEMAP_DIR/logs/analyzer_startup.log" 2>&1 &
ANALYZER_PID=$!
echo "   PID: $ANALYZER_PID"

# Wait a moment for analyzer to start
sleep 2

# Start Enhanced MCP Server in background
echo "🌐 Starting Enhanced MCP Server..."
python3 mcp_enhanced_server.py > "$CODEMAP_DIR/logs/server_startup.log" 2>&1 &
SERVER_PID=$!
echo "   PID: $SERVER_PID"

echo ""
echo "✅ System started successfully!"
echo ""
echo "📊 Analyzer PID: $ANALYZER_PID"
echo "🌐 Server PID: $SERVER_PID"
echo ""
echo "📝 Logs:"
echo "   Analyzer: $CODEMAP_DIR/logs/enhanced_analyzer.log"
echo "   Server: $CODEMAP_DIR/logs/enhanced_mcp_server.log"
echo ""
echo "📂 Reports:"
echo "   $REPORTS_DIR/"
echo ""
echo "🛑 To stop: kill $ANALYZER_PID $SERVER_PID"
echo ""

# Keep script running
wait
