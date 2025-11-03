#!/bin/bash
# Test script for Nexus Internal API (Eternity & Cascade endpoints)
# Created: 2025-11-03

echo "🧪 Testing Nexus Internal API..."
echo "================================"

BASE_URL="http://localhost:5101"

# Test 1: Eternity Status
echo ""
echo "1️⃣ Testing /api/eternity/status..."
curl -s -X GET "$BASE_URL/api/eternity/status" | jq '.'

# Test 2: Eternity Self-Improvement (with sample data)
echo ""
echo "2️⃣ Testing /api/eternity (self-improvement)..."
curl -s -X POST "$BASE_URL/api/eternity" \
  -H "Content-Type: application/json" \
  -d '{
    "problems": [
      {
        "file": "/tests/unit/test-nexus-bug.js",
        "line": 11,
        "issue": "Assignment to constant variable",
        "severity": "error"
      }
    ],
    "context": {
      "source": "test",
      "timestamp": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"
    }
  }' | jq '.'

# Test 3: Cascade Self-Analysis
echo ""
echo "3️⃣ Testing /api/cascade/self-analysis..."
curl -s -X POST "$BASE_URL/api/cascade/self-analysis" \
  -H "Content-Type: application/json" \
  -d '{
    "scope": "test",
    "depth": "standard"
  }' | jq '.'

echo ""
echo "================================"
echo "✅ Tests completed!"
