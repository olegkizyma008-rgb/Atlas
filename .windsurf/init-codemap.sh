#!/bin/bash
# Initialize CodeMap on first startup

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
CODEMAP_SYSTEM="$PROJECT_ROOT/codemap-system"

echo "🔄 Initializing CodeMap for Cascade..."

# Check if codemap system exists
if [ ! -d "$CODEMAP_SYSTEM" ]; then
    echo "❌ CodeMap system not found at $CODEMAP_SYSTEM"
    exit 1
fi

# Check if analysis already exists
if [ -f "$CODEMAP_SYSTEM/reports/codemap_analysis.json" ]; then
    echo "✅ CodeMap already initialized"
    exit 0
fi

# Generate initial codemap
echo "📊 Generating initial CodeMap analysis..."
cd "$CODEMAP_SYSTEM"
python3 codemap_analyzer.py

echo "✅ CodeMap initialized successfully!"
echo "📍 Analysis saved to: $CODEMAP_SYSTEM/reports/codemap_analysis.json"
