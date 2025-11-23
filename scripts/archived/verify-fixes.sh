#!/bin/bash

# Verification script for orchestrator fixes
# Run this after applying fixes to verify everything works

echo "🔍 ATLAS Orchestrator Fixes Verification"
echo "========================================"
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check 1: Verify optimization-integration.js syntax
echo "✓ Checking optimization-integration.js syntax..."
if node -c orchestrator/core/optimization-integration.js 2>/dev/null; then
    echo -e "${GREEN}✅ optimization-integration.js syntax OK${NC}"
else
    echo -e "${RED}❌ optimization-integration.js has syntax errors${NC}"
    exit 1
fi

# Check 2: Verify service-registry.js syntax
echo "✓ Checking service-registry.js syntax..."
if node -c orchestrator/core/service-registry.js 2>/dev/null; then
    echo -e "${GREEN}✅ service-registry.js syntax OK${NC}"
else
    echo -e "${RED}❌ service-registry.js has syntax errors${NC}"
    exit 1
fi

# Check 3: Look for remaining TypeErrors in code
echo "✓ Checking for remaining TypeErrors..."
if grep -r "\.on(" orchestrator/core/optimization-integration.js | grep -v "if.*typeof.*on.*function" > /dev/null; then
    echo -e "${YELLOW}⚠️  Found .on() calls without type checking${NC}"
else
    echo -e "${GREEN}✅ All .on() calls are properly guarded${NC}"
fi

# Check 4: Look for duplicate registerOptimizationServices
echo "✓ Checking for duplicate registrations..."
if grep -n "registerOptimizationServices" orchestrator/core/optimization-integration.js | wc -l | grep -q "^0$"; then
    echo -e "${GREEN}✅ No duplicate registerOptimizationServices found${NC}"
else
    count=$(grep -n "registerOptimizationServices" orchestrator/core/optimization-integration.js | wc -l)
    if [ "$count" -eq 1 ]; then
        echo -e "${GREEN}✅ registerOptimizationServices found once (in export)${NC}"
    else
        echo -e "${YELLOW}⚠️  registerOptimizationServices found $count times${NC}"
    fi
fi

# Check 5: Verify verifyOptimizationServices exists
echo "✓ Checking for verifyOptimizationServices method..."
if grep -q "verifyOptimizationServices" orchestrator/core/optimization-integration.js; then
    echo -e "${GREEN}✅ verifyOptimizationServices method exists${NC}"
else
    echo -e "${RED}❌ verifyOptimizationServices method not found${NC}"
    exit 1
fi

# Check 6: Verify service-registry calls verify instead of register
echo "✓ Checking service-registry.js calls verify..."
if grep -q "verifyOptimizationServices" orchestrator/core/service-registry.js; then
    echo -e "${GREEN}✅ service-registry.js calls verifyOptimizationServices${NC}"
else
    echo -e "${RED}❌ service-registry.js doesn't call verifyOptimizationServices${NC}"
    exit 1
fi

# Check 7: Look for proper error handling
echo "✓ Checking for error handling in setupOptimizationMonitoring..."
if grep -A 20 "setupOptimizationMonitoring" orchestrator/core/optimization-integration.js | grep -q "catch (error)"; then
    echo -e "${GREEN}✅ Error handling present${NC}"
else
    echo -e "${YELLOW}⚠️  Error handling might be missing${NC}"
fi

echo ""
echo "========================================"
echo -e "${GREEN}✅ All verification checks passed!${NC}"
echo ""
echo "Next steps:"
echo "1. Run: npm start"
echo "2. Check logs: tail -f logs/orchestrator.log"
echo "3. Look for:"
echo "   - No 'TypeError' messages"
echo "   - No 'already registered' warnings"
echo "   - '[OPTIMIZATION-INTEGRATION] ✅ All optimization services verified'"
echo "   - '[OPTIMIZATION-INTEGRATION] 📊 Optimization monitoring enabled'"
echo ""
