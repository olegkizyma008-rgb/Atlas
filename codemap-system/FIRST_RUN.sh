#!/bin/bash

echo "🚀 Codemap Analyzer - First Run Setup"
echo "======================================"
echo ""

# Check Python
echo "1️⃣  Checking Python..."
if ! command -v python3 &> /dev/null; then
    echo "❌ Python3 not found. Please install Python 3.8+"
    exit 1
fi
echo "✅ Python3: $(python3 --version)"
echo ""

# Install dependencies
echo "2️⃣  Installing dependencies..."
pip install -r requirements.txt > /dev/null 2>&1
if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies"
    exit 1
fi
echo "✅ Dependencies installed"
echo ""

# Run analysis
echo "3️⃣  Running analysis..."
python3 codemap_analyzer.py --once
if [ $? -ne 0 ]; then
    echo "❌ Analysis failed"
    exit 1
fi
echo ""

# Check reports
echo "4️⃣  Checking reports..."
if [ ! -f "reports/CODEMAP_SUMMARY.md" ]; then
    echo "❌ Reports not generated"
    exit 1
fi
echo "✅ Reports generated"
echo ""

# Show summary
echo "5️⃣  Summary:"
echo "---"
cat reports/CODEMAP_SUMMARY.md | head -20
echo "..."
echo "---"
echo ""

echo "🎉 Setup complete!"
echo ""
echo "Next steps:"
echo "1. Review: cat reports/CODEMAP_SUMMARY.md"
echo "2. Windsurf: Ctrl+L → /update-codemap"
echo "3. Configure: vim config.yaml"
echo "4. Watch: python3 codemap_analyzer.py --watch"
echo ""
echo "📚 Documentation: START_HERE.md"
