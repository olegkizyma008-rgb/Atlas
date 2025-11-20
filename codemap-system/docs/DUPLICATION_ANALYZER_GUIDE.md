# Duplication Analyzer - Professional Comparison Tool

**Date**: 2025-11-19
**Version**: 1.0.0
**Status**: Production Ready

---

## Overview

The Duplication Analyzer is a professional tool for detecting functional duplications, comparing code quality, and preventing code duplication during version control. It provides comprehensive metrics and recommendations for code consolidation.

---

## Features

### 1. Duplication Detection
- **Exact Matches**: Identical function implementations (100% similarity)
- **Semantic Matches**: Functionally equivalent code (85-99% similarity)
- **Partial Matches**: Similar implementations (70-84% similarity)

### 2. Quality Metrics
- **Cyclomatic Complexity**: Code decision point analysis
- **Maintainability Index**: Code readability and maintainability score
- **Documentation Score**: Comment and docstring coverage
- **Performance Score**: Efficiency estimation
- **Lines of Code**: Function size analysis

### 3. Comparative Analysis
- Function-to-function comparison
- Quality metric comparison
- Complexity differential analysis
- Maintainability differential analysis

### 4. Recommendations
- Automatic consolidation suggestions
- Priority-based action items
- Refactoring guidance
- Module extraction recommendations

---

## MCP Tools

### 1. analyze_duplications

Analyze entire project or specific path for functional duplications.

**Usage:**
```javascript
// Analyze orchestrator directory
cascade.call_tool('analyze_duplications', {
  target_path: '/path/to/orchestrator'
});

// Analyze entire project (default)
cascade.call_tool('analyze_duplications', {});
```

**Response:**
```json
{
  "status": "success",
  "report_file": "/path/to/duplication_analysis.json",
  "summary": {
    "total_functions": 150,
    "duplicated_functions": 12,
    "duplication_percentage": 8.0,
    "avg_complexity": 5.2,
    "avg_maintainability": 72.5
  },
  "duplications": {
    "exact": 2,
    "semantic": 5,
    "partial": 8,
    "total": 15
  },
  "recommendations": [
    "High duplication detected - consider refactoring strategy",
    "5 functions have high complexity - consider simplification"
  ]
}
```

### 2. compare_functions

Compare two specific functions for similarity and quality.

**Usage:**
```javascript
cascade.call_tool('compare_functions', {
  func1_file: '/path/to/file1.js',
  func1_name: 'processData',
  func2_file: '/path/to/file2.js',
  func2_name: 'handleData'
});
```

**Response:**
```json
{
  "status": "success",
  "func1": {
    "name": "processData",
    "file": "/path/to/file1.js",
    "complexity": 6,
    "maintainability": 75.5,
    "lines": 25
  },
  "func2": {
    "name": "handleData",
    "file": "/path/to/file2.js",
    "complexity": 7,
    "maintainability": 72.0,
    "lines": 28
  },
  "comparison": {
    "similarity": 87.5,
    "match_type": "semantic",
    "complexity_diff": 1,
    "maintainability_diff": 3.5,
    "recommendation": "Extract to shared module"
  }
}
```

### 3. get_duplication_report

Retrieve the latest duplication analysis report.

**Usage:**
```javascript
cascade.call_tool('get_duplication_report', {});
```

**Response:**
```json
{
  "status": "success",
  "report": {
    "timestamp": "2025-11-19T01:30:00",
    "project": "/path/to/project",
    "summary": { ... },
    "duplications": { ... },
    "exact_matches": [ ... ],
    "semantic_matches": [ ... ],
    "partial_matches": [ ... ],
    "quality_metrics": { ... },
    "recommendations": [ ... ]
  }
}
```

---

## Quality Metrics Explained

### Cyclomatic Complexity
- **Range**: 1-50
- **Interpretation**:
  - 1-5: Simple, easy to understand
  - 6-10: Moderate complexity
  - 11-15: Complex, needs refactoring
  - 16+: Very complex, high risk

### Maintainability Index
- **Range**: 0-100
- **Interpretation**:
  - 85-100: Highly maintainable
  - 50-84: Moderately maintainable
  - 25-49: Low maintainability
  - 0-24: Very difficult to maintain

### Documentation Score
- **Range**: 0-100
- **Factors**:
  - JSDoc/docstring presence (50%)
  - Inline comment ratio (50%)

### Performance Score
- **Range**: 0-100
- **Based on**: Complexity reduction (simplified)

---

## Duplication Types

### Exact Matches (100% Similarity)
**Action**: CRITICAL - Extract to shared module
- Identical implementations
- Same logic and structure
- Immediate consolidation recommended

**Example:**
```javascript
// file1.js
function calculateTotal(items) {
  return items.reduce((sum, item) => sum + item.price, 0);
}

// file2.js
function calculateTotal(items) {
  return items.reduce((sum, item) => sum + item.price, 0);
}
```

### Semantic Matches (85-99% Similarity)
**Action**: HIGH - Refactor to reduce duplication
- Functionally equivalent
- Minor implementation differences
- Consolidation recommended

**Example:**
```javascript
// file1.js
function processData(data) {
  const cleaned = data.trim();
  return cleaned.split(',').map(x => x.trim());
}

// file2.js
function parseData(data) {
  const trimmed = data.trim();
  return trimmed.split(',').map(item => item.trim());
}
```

### Partial Matches (70-84% Similarity)
**Action**: MEDIUM - Review for consolidation
- Similar patterns
- Different implementations
- Consider shared utilities

**Example:**
```javascript
// file1.js
function validate(input) {
  if (!input) return false;
  if (input.length < 3) return false;
  return true;
}

// file2.js
function isValid(value) {
  return value && value.length >= 3;
}
```

---

## Workflow Integration

### Before Committing Code

```bash
# 1. Run duplication analysis
cascade.call_tool('analyze_duplications', {
  target_path: '/path/to/modified/files'
});

# 2. Review report
cascade.call_tool('get_duplication_report', {});

# 3. Compare specific functions if needed
cascade.call_tool('compare_functions', {
  func1_file: '...',
  func1_name: '...',
  func2_file: '...',
  func2_name: '...'
});

# 4. Refactor if needed
# ... make changes ...

# 5. Auto-commit
cascade.call_tool('auto_commit', {
  message: 'Refactor: Consolidated duplicate functions'
});
```

### During Code Review

1. Check duplication report for new duplications
2. Compare functions using compare_functions tool
3. Identify consolidation opportunities
4. Suggest refactoring before merge

### During Refactoring

1. Analyze current duplications
2. Compare functions to understand differences
3. Extract common logic to shared module
4. Update imports and verify tests
5. Commit with duplication reduction message

---

## Best Practices

### 1. Regular Analysis
- Run duplication analysis weekly
- Track duplication trends
- Set duplication reduction goals

### 2. Threshold Management
- Exact matches: 0 tolerance
- Semantic matches: Review before merge
- Partial matches: Monitor and consolidate

### 3. Quality Metrics
- Maintain avg complexity < 10
- Maintain avg maintainability > 70
- Document complex functions
- Add tests for critical functions

### 4. Prevention
- Use shared modules for common logic
- Extract utilities early
- Review duplications in code review
- Refactor before duplication spreads

---

## Report Structure

```json
{
  "timestamp": "ISO 8601 timestamp",
  "project": "Project path",
  "summary": {
    "total_functions": "Number",
    "duplicated_functions": "Number",
    "duplication_percentage": "Percentage",
    "avg_complexity": "Average",
    "avg_maintainability": "Average"
  },
  "duplications": {
    "exact": "Count",
    "semantic": "Count",
    "partial": "Count",
    "total": "Count"
  },
  "exact_matches": [
    {
      "func1": { "name", "file", "line", "complexity", "loc" },
      "func2": { "name", "file", "line", "complexity", "loc" },
      "similarity": "Percentage",
      "match_type": "Type",
      "recommendation": "Action"
    }
  ],
  "semantic_matches": [ ... ],
  "partial_matches": [ ... ],
  "quality_metrics": {
    "file:function": {
      "complexity": "Number",
      "lines_of_code": "Number",
      "maintainability_index": "Score",
      "documentation_score": "Score",
      "test_coverage": "Percentage",
      "performance_score": "Score"
    }
  },
  "recommendations": [ "Recommendation strings" ]
}
```

---

## Integration with Workflow Refactoring

The Duplication Analyzer integrates with the Phase 1-5 workflow refactoring:

1. **Phase 1-5 Modules**: Analyzed for duplication
2. **Quality Metrics**: Compared against existing code
3. **Prevention**: Detects duplicate implementations
4. **Consolidation**: Suggests module extraction
5. **Versioning**: Tracks duplication over time

---

## Performance Considerations

- **Scan Time**: ~5-10 seconds for 100 files
- **Memory**: ~50-100MB for large projects
- **Report Size**: ~1-5MB JSON
- **Cache**: Results cached for 5 minutes

---

## Troubleshooting

### Issue: "duplication_analyzer module not found"
**Solution**: Ensure `duplication_analyzer.py` is in codemap-system directory

### Issue: No functions detected
**Solution**: Check file extensions (.js, .py) and syntax

### Issue: Similarity score seems incorrect
**Solution**: Review function extraction logic, check for comments/whitespace

---

## Version History

| Version | Date       | Changes                                                        |
| ------- | ---------- | -------------------------------------------------------------- |
| 1.0.0   | 2025-11-19 | Initial release with duplication detection and quality metrics |

---

## Future Enhancements

- [ ] Cross-language duplication detection
- [ ] Machine learning-based similarity
- [ ] Automatic refactoring suggestions
- [ ] Integration with IDE refactoring tools
- [ ] Historical trend analysis
- [ ] Team-wide duplication dashboard

---

**Status**: ✅ Production Ready
**Last Updated**: 2025-11-19
