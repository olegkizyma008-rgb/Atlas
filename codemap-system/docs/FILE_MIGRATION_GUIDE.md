# File Migration Analyzer - Comprehensive Guide

**Date**: 2025-11-19
**Version**: 1.0.0
**Status**: Production Ready

---

## Overview

The File Migration Analyzer provides detailed analysis of files to determine optimal migration strategies:
- **Delete**: Remove completely
- **Archive**: Move to archive directory
- **Merge**: Consolidate with similar files
- **Refactor**: Improve and keep
- **Keep**: Maintain as-is

---

## Features

### 1. Detailed File Analysis
- Code block extraction (functions, classes)
- Quality scoring
- Maintainability assessment
- Dead code detection
- Reusable code identification

### 2. Code Block Valuation
- **High Value**: Quality ≥ 80%, Complexity ≤ 5, LOC ≤ 50
- **Medium Value**: Quality ≥ 60% OR (Complexity ≤ 10 AND LOC ≤ 100)
- **Low Value**: Everything else

### 3. File Comparison
- Common block detection
- Quality differential analysis
- Merge potential scoring
- Consolidation recommendations

### 4. Migration Planning
- Automated recommendation engine
- Step-by-step migration plans
- Valuable code extraction
- Dependency tracking

---

## Analysis Metrics

### Quality Score (0-100)
**Calculation**:
- Base: 100
- Reduce by complexity × 0.5
- Reduce by long lines × 0.2
- Increase by comments × 0.1

**Interpretation**:
- 80-100: Excellent
- 60-79: Good
- 40-59: Fair
- 0-39: Poor

### Maintainability (0-100)
**Factors**:
- Complexity of code blocks
- Percentage of dead code
- Documentation coverage

### Dead Code Percentage
**Definition**: Unused functions/classes as percentage of total

**Thresholds**:
- 0-20%: Healthy
- 20-50%: Moderate cleanup needed
- 50-80%: Significant cleanup needed
- 80-100%: Candidate for deletion

### Reusable Code Percentage
**Definition**: Functions used multiple times or marked as valuable

**Thresholds**:
- 0-20%: Low reusability
- 20-50%: Moderate reusability
- 50-80%: High reusability
- 80-100%: Excellent reusability

---

## Migration Recommendations

### DELETE
**Conditions**:
- Dead code > 80%
- Quality < 40%
- No valuable blocks

**Steps**:
1. Extract valuable blocks (if any)
2. Check for external dependencies
3. Archive to `/archive/`
4. Remove from project

### ARCHIVE
**Conditions**:
- Quality < 40%
- Dead code > 50%
- Some valuable blocks exist

**Steps**:
1. Extract high-value blocks
2. Document extracted code
3. Move to `/archive/`
4. Update imports

### MERGE
**Conditions**:
- Reusable code > 60%
- Quality > 70%
- Common blocks with other files

**Steps**:
1. Find merge candidates
2. Compare quality metrics
3. Consolidate valuable blocks
4. Update imports
5. Delete original file

### REFACTOR
**Conditions**:
- Quality 40-70%
- Moderate dead code
- Some valuable blocks

**Steps**:
1. Improve code quality
2. Remove dead code
3. Add documentation
4. Add tests
5. Keep in project

### KEEP
**Conditions**:
- Quality > 70%
- Reusable code > 50%
- Low dead code

**Steps**:
1. Keep in project
2. Monitor for improvements
3. Add tests if missing

---

## Usage Examples

### Analyze Single File

```python
from file_migration_analyzer import FileMigrationAnalyzer

analyzer = FileMigrationAnalyzer("./")
analysis = analyzer.analyze_file("orchestrator/workflow/old-module.js")

print(f"Quality: {analysis.quality_score}")
print(f"Recommendation: {analysis.recommendation}")
print(f"Valuable blocks: {len(analysis.valuable_blocks)}")
```

### Compare Two Files

```python
comparison = analyzer.compare_files(
    "orchestrator/workflow/file1.js",
    "orchestrator/workflow/file2.js"
)

print(f"Merge score: {comparison['comparison']['merge_score']}")
print(f"Common blocks: {comparison['comparison']['common_blocks']}")
```

### Extract Valuable Code

```python
valuable = analyzer.extract_valuable_code("orchestrator/workflow/old-module.js")

for block in valuable['valuable_code']:
    print(f"- {block['name']} ({block['type']}): Quality {block['quality']:.1f}%")
```

### Generate Migration Report

```python
files = [
    "orchestrator/workflow/file1.js",
    "orchestrator/workflow/file2.js",
    "orchestrator/workflow/file3.js"
]

report = analyzer.generate_migration_report(files)

print(f"Delete candidates: {len(report['summary']['delete_candidates'])}")
print(f"Archive candidates: {len(report['summary']['archive_candidates'])}")
print(f"Merge candidates: {len(report['summary']['merge_candidates'])}")
```

---

## Code Block Analysis

### Extraction
- **Python**: AST-based extraction
- **JavaScript**: Regex-based extraction

### Metrics
- **Complexity**: Decision points (if, for, while, etc.)
- **Quality**: Based on complexity, line length, documentation
- **Usage**: Tracked across file
- **Dependencies**: Imports and external references

### Valuation
```
High Value: Quality ≥ 80% AND Complexity ≤ 5 AND LOC ≤ 50
Medium Value: Quality ≥ 60% OR (Complexity ≤ 10 AND LOC ≤ 100)
Low Value: Everything else
```

---

## File Comparison

### Common Blocks
Identifies functions/classes with same name and type in different files

### Merge Score (0-100)
**Calculation**:
- Common blocks: +10 per block
- Quality similarity: +20 (max)
- Size similarity: +20 (max)
- Reusable code: +30 (max)

**Interpretation**:
- 70-100: Good merge candidates
- 40-69: Possible merge candidates
- 0-39: Keep separate

---

## Migration Planning

### Automated Plans
Each file gets a migration plan with:
1. **Action**: Recommended migration strategy
2. **Reason**: Why this action is recommended
3. **Steps**: Detailed migration steps

### Valuable Code Extraction
Before deletion/archiving:
1. Identify valuable blocks
2. Extract with line numbers
3. Document quality metrics
4. Plan consolidation

---

## Best Practices

### Before Deletion
1. Run analysis
2. Extract valuable blocks
3. Check external dependencies
4. Document extracted code
5. Archive original
6. Update imports

### Before Merging
1. Compare quality metrics
2. Identify common blocks
3. Choose better implementation
4. Consolidate code
5. Update all imports
6. Run tests

### Before Archiving
1. Extract high-value blocks
2. Document extraction
3. Create archive directory
4. Move file
5. Update imports
6. Verify no broken references

---

## Report Structure

```json
{
  "timestamp": "ISO 8601",
  "total_files": "number",
  "analyses": {
    "filepath": {
      "quality": "0-100",
      "maintainability": "0-100",
      "dead_code_pct": "0-100",
      "reusable_pct": "0-100",
      "recommendation": "delete|archive|merge|refactor|keep",
      "valuable_blocks": "count"
    }
  },
  "summary": {
    "delete_candidates": ["files"],
    "archive_candidates": ["files"],
    "merge_candidates": ["files"],
    "refactor_candidates": ["files"],
    "keep_files": ["files"]
  }
}
```

---

## Integration with Existing Tools

### With Duplication Analyzer
- Compare similar functions
- Identify consolidation opportunities
- Assess code quality

### With Dependency Graph
- Track external dependencies
- Identify import chains
- Plan safe removal

### With Version Control
- Archive to git
- Track migration history
- Enable rollback

---

## Performance

- **Single file analysis**: ~1-2 seconds
- **File comparison**: ~2-3 seconds
- **Report generation**: ~5-10 seconds for 100 files
- **Memory**: ~50-100MB for large projects

---

## Troubleshooting

### Issue: Analysis seems incomplete
**Solution**:
1. Check file syntax
2. Verify file extensions
3. Check extraction patterns
4. Review error logs

### Issue: Merge score seems low
**Solution**:
1. Check for common blocks
2. Compare quality metrics
3. Review file sizes
4. Check reusable code percentage

### Issue: Recommendation seems wrong
**Solution**:
1. Review quality score
2. Check dead code percentage
3. Verify reusable code percentage
4. Review valuable blocks count

---

## Future Enhancements

- [ ] Machine learning-based quality prediction
- [ ] Automatic code consolidation
- [ ] IDE integration
- [ ] Visual migration planning
- [ ] Rollback automation
- [ ] Team-wide migration dashboard

---

## Version History

| Version | Date       | Changes                                                   |
| ------- | ---------- | --------------------------------------------------------- |
| 1.0.0   | 2025-11-19 | Initial release with file analysis and migration planning |

---

**Status**: ✅ Production Ready
**Last Updated**: 2025-11-19
