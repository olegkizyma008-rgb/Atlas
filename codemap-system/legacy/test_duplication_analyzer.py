#!/usr/bin/env python3
"""
Test script for Duplication Analyzer
Demonstrates the duplication detection and comparison capabilities
"""

import sys
import json
from pathlib import Path
from duplication_analyzer import DuplicationAnalyzer

def print_section(title):
    """Print a formatted section header"""
    print(f"\n{'='*80}")
    print(f"  {title}")
    print(f"{'='*80}\n")

def test_orchestrator_analysis():
    """Test analysis of orchestrator directory"""
    print_section("TEST 1: Orchestrator Directory Analysis")
    
    project_root = Path(__file__).parent.parent / "orchestrator"
    
    if not project_root.exists():
        print(f"❌ Orchestrator directory not found: {project_root}")
        return
    
    print(f"📁 Analyzing: {project_root}")
    print(f"📊 Scanning for duplications...\n")
    
    analyzer = DuplicationAnalyzer(str(project_root))
    report = analyzer.analyze_project()
    
    # Print summary
    summary = report.get("summary", {})
    print(f"✅ Analysis Complete!")
    print(f"\n📊 SUMMARY:")
    print(f"   Total Functions: {summary.get('total_functions', 0)}")
    print(f"   Duplicated Functions: {summary.get('duplicated_functions', 0)}")
    print(f"   Duplication Rate: {summary.get('duplication_percentage', 0):.1f}%")
    print(f"   Avg Complexity: {summary.get('avg_complexity', 0):.2f}")
    print(f"   Avg Maintainability: {summary.get('avg_maintainability', 0):.1f}")
    
    # Print duplications
    dups = report.get("duplications", {})
    print(f"\n🔍 DUPLICATIONS FOUND:")
    print(f"   Exact Matches: {dups.get('exact', 0)}")
    print(f"   Semantic Matches: {dups.get('semantic', 0)}")
    print(f"   Partial Matches: {dups.get('partial', 0)}")
    print(f"   Total: {dups.get('total', 0)}")
    
    # Print exact matches
    exact_matches = report.get("exact_matches", [])
    if exact_matches:
        print(f"\n🚨 EXACT MATCHES (Critical - Extract to shared module):")
        for i, match in enumerate(exact_matches[:3], 1):
            func1 = match.get("func1", {})
            func2 = match.get("func2", {})
            print(f"\n   {i}. {func1.get('name')} vs {func2.get('name')}")
            print(f"      File 1: {func1.get('file')} (line {func1.get('line')})")
            print(f"      File 2: {func2.get('file')} (line {func2.get('line')})")
            print(f"      Similarity: {match.get('similarity', 0):.1f}%")
            print(f"      Recommendation: {match.get('recommendation', 'N/A')}")
    
    # Print semantic matches
    semantic_matches = report.get("semantic_matches", [])
    if semantic_matches:
        print(f"\n⚠️  SEMANTIC MATCHES (High - Refactor to reduce duplication):")
        for i, match in enumerate(semantic_matches[:3], 1):
            func1 = match.get("func1", {})
            func2 = match.get("func2", {})
            print(f"\n   {i}. {func1.get('name')} vs {func2.get('name')}")
            print(f"      Similarity: {match.get('similarity', 0):.1f}%")
            print(f"      Complexity Diff: {match.get('complexity_diff', 0)}")
            print(f"      Maintainability Diff: {match.get('maintainability_diff', 0):.1f}")
    
    # Print recommendations
    recommendations = report.get("recommendations", [])
    if recommendations:
        print(f"\n💡 RECOMMENDATIONS:")
        for rec in recommendations:
            print(f"   • {rec}")
    
    # Save report
    report_file = Path(__file__).parent / "test_duplication_report.json"
    with open(report_file, 'w') as f:
        json.dump(report, f, indent=2)
    print(f"\n📄 Report saved to: {report_file}")

def test_function_comparison():
    """Test function comparison"""
    print_section("TEST 2: Function Comparison")
    
    # Example: Compare two similar functions
    print("📊 Comparing two functions for similarity...\n")
    
    # Create test functions
    func1_code = """function processData(items) {
    const cleaned = items.map(item => item.trim());
    const filtered = cleaned.filter(item => item.length > 0);
    return filtered.sort();
}"""
    
    func2_code = """function handleData(data) {
    const trimmed = data.map(x => x.trim());
    const valid = trimmed.filter(x => x.length > 0);
    return valid.sort();
}"""
    
    analyzer = DuplicationAnalyzer("./")
    
    # Calculate similarity
    import difflib
    matcher = difflib.SequenceMatcher(None, func1_code, func2_code)
    similarity = matcher.ratio() * 100
    
    complexity1 = analyzer._calculate_complexity(func1_code)
    complexity2 = analyzer._calculate_complexity(func2_code)
    
    maintainability1 = analyzer._calculate_maintainability(func1_code)
    maintainability2 = analyzer._calculate_maintainability(func2_code)
    
    print(f"Function 1: processData")
    print(f"  Complexity: {complexity1}")
    print(f"  Maintainability: {maintainability1:.1f}")
    print(f"  Lines: {len(func1_code.split(chr(10)))}")
    
    print(f"\nFunction 2: handleData")
    print(f"  Complexity: {complexity2}")
    print(f"  Maintainability: {maintainability2:.1f}")
    print(f"  Lines: {len(func2_code.split(chr(10)))}")
    
    print(f"\n📊 COMPARISON RESULTS:")
    print(f"  Similarity: {similarity:.1f}%")
    print(f"  Match Type: {'Exact' if similarity == 100 else ('Semantic' if similarity >= 85 else 'Partial')}")
    print(f"  Complexity Diff: {abs(complexity1 - complexity2)}")
    print(f"  Maintainability Diff: {abs(maintainability1 - maintainability2):.1f}")
    
    if similarity >= 85:
        print(f"\n✅ Recommendation: Extract to shared module")
    else:
        print(f"\n⚠️  Recommendation: Review for consolidation")

def test_quality_metrics():
    """Test quality metrics calculation"""
    print_section("TEST 3: Quality Metrics Calculation")
    
    analyzer = DuplicationAnalyzer("./")
    
    # Test code samples
    samples = {
        "Simple": """function add(a, b) {
    return a + b;
}""",
        
        "Moderate": """function processArray(arr) {
    if (!arr) return [];
    const result = [];
    for (let i = 0; i < arr.length; i++) {
        if (arr[i] > 0) {
            result.push(arr[i] * 2);
        }
    }
    return result;
}""",
        
        "Complex": """function complexLogic(data) {
    if (!data) return null;
    const processed = [];
    for (let i = 0; i < data.length; i++) {
        if (data[i].type === 'A') {
            if (data[i].value > 100) {
                processed.push({...data[i], processed: true});
            } else if (data[i].value > 50) {
                processed.push({...data[i], processed: false});
            }
        } else if (data[i].type === 'B') {
            processed.push({...data[i], processed: true});
        }
    }
    return processed.sort((a, b) => b.value - a.value);
}"""
    }
    
    print("📊 QUALITY METRICS FOR DIFFERENT CODE SAMPLES:\n")
    
    for name, code in samples.items():
        complexity = analyzer._calculate_complexity(code)
        maintainability = analyzer._calculate_maintainability(code)
        documentation = analyzer._calculate_documentation(code)
        
        print(f"{name} Code:")
        print(f"  Complexity: {complexity} (1-50 scale)")
        print(f"  Maintainability: {maintainability:.1f} (0-100 scale)")
        print(f"  Documentation: {documentation:.1f} (0-100 scale)")
        
        # Interpretation
        if complexity <= 5:
            complexity_desc = "Simple, easy to understand"
        elif complexity <= 10:
            complexity_desc = "Moderate complexity"
        elif complexity <= 15:
            complexity_desc = "Complex, needs refactoring"
        else:
            complexity_desc = "Very complex, high risk"
        
        if maintainability >= 85:
            maintainability_desc = "Highly maintainable"
        elif maintainability >= 50:
            maintainability_desc = "Moderately maintainable"
        elif maintainability >= 25:
            maintainability_desc = "Low maintainability"
        else:
            maintainability_desc = "Very difficult to maintain"
        
        print(f"  → {complexity_desc}")
        print(f"  → {maintainability_desc}")
        print()

def main():
    """Run all tests"""
    print("\n" + "="*80)
    print("  DUPLICATION ANALYZER - TEST SUITE")
    print("="*80)
    
    try:
        test_orchestrator_analysis()
        test_function_comparison()
        test_quality_metrics()
        
        print_section("TEST SUITE COMPLETE")
        print("✅ All tests completed successfully!")
        print("\n📚 For more information, see: DUPLICATION_ANALYZER_GUIDE.md\n")
        
    except Exception as e:
        print(f"\n❌ Error during testing: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    main()
