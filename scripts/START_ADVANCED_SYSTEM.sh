#!/bin/bash
# START ADVANCED CODEMAP SYSTEM
# Runs: Enhanced Analyzer + MCP Server + Advanced Tools

set -e

PROJECT_ROOT="/Users/dev/Documents/GitHub/atlas4"
CODEMAP_DIR="$PROJECT_ROOT/codemap-system"
REPORTS_DIR="$PROJECT_ROOT/reports"

echo "🚀 Starting Advanced Codemap System v2.0..."
echo "📁 Project: $PROJECT_ROOT"
echo "📊 Reports: $REPORTS_DIR"
echo ""

# Create directories
mkdir -p "$REPORTS_DIR"
mkdir -p "$CODEMAP_DIR/logs"

echo "✅ Directories ready"
echo ""

# Start Enhanced Analyzer
echo "🔄 Starting Enhanced Analyzer (5-layer continuous analysis)..."
cd "$CODEMAP_DIR"
python3 mcp_enhanced_analyzer.py > "$CODEMAP_DIR/logs/analyzer_startup.log" 2>&1 &
ANALYZER_PID=$!
echo "   ✓ Analyzer PID: $ANALYZER_PID"

# Wait for analyzer to start
sleep 2

# Start Enhanced MCP Server (with Advanced Tools)
echo "🌐 Starting Enhanced MCP Server (with 13 tools)..."
python3 mcp_enhanced_server.py > "$CODEMAP_DIR/logs/server_startup.log" 2>&1 &
SERVER_PID=$!
echo "   ✓ Server PID: $SERVER_PID"

echo ""
echo "✅ Advanced Codemap System Started!"
echo ""
echo "📊 System Components:"
echo "   ✓ Enhanced Analyzer (5 layers)"
echo "   ✓ MCP Server (6 basic tools)"
echo "   ✓ Advanced Tools (7 advanced tools)"
echo ""
echo "🔧 Available Tools:"
echo "   Basic:"
echo "     - get_layer_analysis(layer: 1-5)"
echo "     - get_dead_code_summary()"
echo "     - get_dependency_relationships(file_path)"
echo "     - get_circular_dependencies()"
echo "     - get_quality_report(file_path?)"
echo "     - get_analysis_status()"
echo ""
echo "   Advanced:"
echo "     - analyze_file_deeply(file_path)"
echo "     - compare_functions(file1, func1, file2, func2)"
echo "     - find_duplicates_in_directory(directory)"
echo "     - analyze_impact(file_path)"
echo "     - classify_files(directory?)"
echo "     - generate_refactoring_plan(priority)"
echo "     - visualize_dependencies(file_path, depth)"
echo ""
echo "📝 Logs:"
echo "   Analyzer: $CODEMAP_DIR/logs/enhanced_analyzer.log"
echo "   Server: $CODEMAP_DIR/logs/enhanced_mcp_server.log"
echo "   Advanced Tools: $CODEMAP_DIR/logs/advanced_tools.log"
echo ""
echo "📂 Reports:"
echo "   $REPORTS_DIR/"
echo ""
echo "🎯 Quick Start:"
echo "   1. Wait ~30-60 seconds for first analysis cycle"
echo "   2. In Cascade, use: @cascade classify_files(directory: \"orchestrator\")"
echo "   3. Then: @cascade analyze_file_deeply(file_path: \"orchestrator/app.js\")"
echo "   4. Finally: @cascade generate_refactoring_plan(priority: \"high\")"
echo ""
echo "📖 Documentation:"
echo "   - README_ADVANCED.md (overview)"
echo "   - ADVANCED_TOOLS_GUIDE.md (detailed guide)"
echo "   - TOOLS_SUMMARY.md (quick reference)"
echo ""
echo "🛑 To Stop:"
echo "   kill $ANALYZER_PID $SERVER_PID"
echo ""

# Keep script running
wait
