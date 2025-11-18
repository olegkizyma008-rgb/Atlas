#!/usr/bin/env python3
"""
Duplication & Functionality Comparison Analyzer
Analyzes code for functional duplication, quality metrics, and provides comparative analysis
"""

import os
import json
import re
import hashlib
from pathlib import Path
from typing import Dict, List, Tuple, Set
from dataclasses import dataclass, asdict
from collections import defaultdict
import ast
import difflib

@dataclass
class FunctionSignature:
    """Function signature and metadata"""
    name: str
    file: str
    line: int
    params: List[str]
    return_type: str
    body_hash: str
    complexity: int
    lines_of_code: int
    
@dataclass
class DuplicationMatch:
    """Duplication match between two functions"""
    func1: FunctionSignature
    func2: FunctionSignature
    similarity: float  # 0-100
    match_type: str  # 'exact', 'semantic', 'partial'
    quality_score: float  # 0-100
    metrics: Dict

@dataclass
class QualityMetrics:
    """Code quality metrics"""
    complexity: int
    lines_of_code: int
    maintainability_index: float
    documentation_score: float
    test_coverage: float
    performance_score: float
    
class DuplicationAnalyzer:
    """Analyzes code duplication and functionality comparison"""
    
    def __init__(self, project_root: str, logger=None):
        self.project_root = project_root
        self.logger = logger or self._default_logger()
        self.functions: Dict[str, FunctionSignature] = {}
        self.duplications: List[DuplicationMatch] = []
        self.quality_metrics: Dict[str, QualityMetrics] = {}
        
    def _default_logger(self):
        """Default logger implementation"""
        class SimpleLogger:
            def info(self, msg): print(f"ℹ️  {msg}")
            def warn(self, msg): print(f"⚠️  {msg}")
            def error(self, msg): print(f"❌ {msg}")
            def debug(self, msg): print(f"🔍 {msg}")
        return SimpleLogger()
    
    def analyze_project(self) -> Dict:
        """Analyze entire project for duplications"""
        self.logger.info("Starting duplication analysis...")
        
        # Scan all files
        self._scan_files()
        
        # Detect duplications
        self._detect_duplications()
        
        # Calculate quality metrics
        self._calculate_metrics()
        
        # Generate report
        report = self._generate_report()
        
        return report
    
    def _scan_files(self):
        """Scan project files for functions"""
        self.logger.info("Scanning project files...")
        
        for root, dirs, files in os.walk(self.project_root):
            # Skip common directories
            dirs[:] = [d for d in dirs if d not in ['.git', 'node_modules', '__pycache__', '.archive']]
            
            for file in files:
                if file.endswith('.js'):
                    filepath = os.path.join(root, file)
                    self._extract_functions(filepath)
                elif file.endswith('.py'):
                    filepath = os.path.join(root, file)
                    self._extract_python_functions(filepath)
    
    def _extract_functions(self, filepath: str):
        """Extract functions from JavaScript file"""
        try:
            with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()
            
            # Extract function declarations
            pattern = r'(?:async\s+)?(?:function|const|let|var)\s+(\w+)\s*(?:=\s*)?(?:async\s*)?\(([^)]*)\)(?:\s*:\s*(\w+))?\s*(?:=>)?\s*\{'
            
            for match in re.finditer(pattern, content):
                func_name = match.group(1)
                params = [p.strip() for p in match.group(2).split(',') if p.strip()]
                return_type = match.group(3) or 'any'
                
                # Find line number
                line_num = content[:match.start()].count('\n') + 1
                
                # Extract function body
                start = match.end() - 1
                brace_count = 1
                end = start + 1
                
                while end < len(content) and brace_count > 0:
                    if content[end] == '{':
                        brace_count += 1
                    elif content[end] == '}':
                        brace_count -= 1
                    end += 1
                
                body = content[start:end]
                body_hash = self._hash_code(body)
                
                # Calculate metrics
                complexity = self._calculate_complexity(body)
                loc = body.count('\n')
                
                sig = FunctionSignature(
                    name=func_name,
                    file=filepath,
                    line=line_num,
                    params=params,
                    return_type=return_type,
                    body_hash=body_hash,
                    complexity=complexity,
                    lines_of_code=loc
                )
                
                key = f"{filepath}:{func_name}"
                self.functions[key] = sig
                
        except Exception as e:
            self.logger.warn(f"Error scanning {filepath}: {e}")
    
    def _extract_python_functions(self, filepath: str):
        """Extract functions from Python file"""
        try:
            with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()
            
            tree = ast.parse(content)
            
            for node in ast.walk(tree):
                if isinstance(node, ast.FunctionDef):
                    func_name = node.name
                    params = [arg.arg for arg in node.args.args]
                    return_type = 'any'
                    
                    # Get source code
                    start_line = node.lineno
                    end_line = node.end_lineno or start_line
                    
                    lines = content.split('\n')
                    body = '\n'.join(lines[start_line-1:end_line])
                    body_hash = self._hash_code(body)
                    
                    complexity = self._calculate_complexity(body)
                    loc = end_line - start_line
                    
                    sig = FunctionSignature(
                        name=func_name,
                        file=filepath,
                        line=start_line,
                        params=params,
                        return_type=return_type,
                        body_hash=body_hash,
                        complexity=complexity,
                        lines_of_code=loc
                    )
                    
                    key = f"{filepath}:{func_name}"
                    self.functions[key] = sig
                    
        except Exception as e:
            self.logger.warn(f"Error scanning Python {filepath}: {e}")
    
    def _hash_code(self, code: str) -> str:
        """Generate hash of code"""
        normalized = re.sub(r'\s+', ' ', code).strip()
        return hashlib.md5(normalized.encode()).hexdigest()
    
    def _calculate_complexity(self, code: str) -> int:
        """Calculate cyclomatic complexity"""
        complexity = 1
        
        # Count decision points
        keywords = ['if', 'else', 'case', 'catch', 'for', 'while', 'do', '&&', '||', '?']
        for keyword in keywords:
            complexity += len(re.findall(rf'\b{keyword}\b', code))
        
        return min(complexity, 50)  # Cap at 50
    
    def _detect_duplications(self):
        """Detect functional duplications"""
        self.logger.info("Detecting duplications...")
        
        functions_list = list(self.functions.values())
        
        for i, func1 in enumerate(functions_list):
            for func2 in functions_list[i+1:]:
                # Skip same file
                if func1.file == func2.file:
                    continue
                
                # Check for exact match
                if func1.body_hash == func2.body_hash:
                    match = DuplicationMatch(
                        func1=func1,
                        func2=func2,
                        similarity=100.0,
                        match_type='exact',
                        quality_score=0.0,
                        metrics={}
                    )
                    self.duplications.append(match)
                    continue
                
                # Check for semantic similarity
                similarity = self._calculate_similarity(func1, func2)
                
                if similarity >= 70:  # 70% threshold
                    match = DuplicationMatch(
                        func1=func1,
                        func2=func2,
                        similarity=similarity,
                        match_type='semantic' if similarity >= 85 else 'partial',
                        quality_score=0.0,
                        metrics={}
                    )
                    self.duplications.append(match)
        
        # Sort by similarity
        self.duplications.sort(key=lambda x: x.similarity, reverse=True)
    
    def _calculate_similarity(self, func1: FunctionSignature, func2: FunctionSignature) -> float:
        """Calculate semantic similarity between functions"""
        
        # Read function bodies
        try:
            with open(func1.file, 'r', encoding='utf-8', errors='ignore') as f:
                content1 = f.read()
            with open(func2.file, 'r', encoding='utf-8', errors='ignore') as f:
                content2 = f.read()
            
            # Extract function bodies (simplified)
            body1 = self._extract_body(content1, func1.line)
            body2 = self._extract_body(content2, func2.line)
            
            # Use difflib for similarity
            matcher = difflib.SequenceMatcher(None, body1, body2)
            similarity = matcher.ratio() * 100
            
            return similarity
            
        except:
            return 0.0
    
    def _extract_body(self, content: str, line_num: int) -> str:
        """Extract function body from content"""
        lines = content.split('\n')
        
        # Find function start
        start_idx = max(0, line_num - 1)
        
        # Find function end (simplified)
        brace_count = 0
        end_idx = start_idx
        
        for i in range(start_idx, len(lines)):
            brace_count += lines[i].count('{') - lines[i].count('}')
            end_idx = i
            if brace_count == 0 and i > start_idx:
                break
        
        return '\n'.join(lines[start_idx:end_idx+1])
    
    def _calculate_metrics(self):
        """Calculate quality metrics for each function"""
        self.logger.info("Calculating quality metrics...")
        
        for key, func in self.functions.items():
            # Read file for analysis
            try:
                with open(func.file, 'r', encoding='utf-8', errors='ignore') as f:
                    content = f.read()
                
                # Extract function section
                lines = content.split('\n')
                start = max(0, func.line - 1)
                end = min(len(lines), start + func.lines_of_code + 10)
                func_section = '\n'.join(lines[start:end])
                
                # Calculate metrics
                maintainability = self._calculate_maintainability(func_section)
                documentation = self._calculate_documentation(func_section)
                
                metrics = QualityMetrics(
                    complexity=func.complexity,
                    lines_of_code=func.lines_of_code,
                    maintainability_index=maintainability,
                    documentation_score=documentation,
                    test_coverage=0.0,  # Would need test data
                    performance_score=100 - (func.complexity * 2)  # Simplified
                )
                
                self.quality_metrics[key] = metrics
                
            except Exception as e:
                self.logger.warn(f"Error calculating metrics for {key}: {e}")
    
    def _calculate_maintainability(self, code: str) -> float:
        """Calculate maintainability index (0-100)"""
        score = 100.0
        
        # Reduce for complexity
        complexity = self._calculate_complexity(code)
        score -= complexity * 0.5
        
        # Reduce for long lines
        long_lines = len([l for l in code.split('\n') if len(l) > 100])
        score -= long_lines * 0.2
        
        # Increase for comments
        comments = len(re.findall(r'//|/\*|\*/', code))
        score += comments * 0.1
        
        return max(0, min(100, score))
    
    def _calculate_documentation(self, code: str) -> float:
        """Calculate documentation score (0-100)"""
        score = 0.0
        
        # Check for JSDoc/docstring
        if re.search(r'/\*\*|"""', code):
            score += 50
        
        # Check for inline comments
        comment_lines = len([l for l in code.split('\n') if '//' in l or '#' in l])
        total_lines = len(code.split('\n'))
        
        if total_lines > 0:
            score += (comment_lines / total_lines) * 50
        
        return min(100, score)
    
    def _generate_report(self) -> Dict:
        """Generate comprehensive analysis report"""
        
        # Group duplications by type
        exact_dups = [d for d in self.duplications if d.match_type == 'exact']
        semantic_dups = [d for d in self.duplications if d.match_type == 'semantic']
        partial_dups = [d for d in self.duplications if d.match_type == 'partial']
        
        # Calculate statistics
        total_functions = len(self.functions)
        duplicated_functions = len(set(
            d.func1.name for d in self.duplications
        ) | set(
            d.func2.name for d in self.duplications
        ))
        
        # Quality analysis
        avg_complexity = sum(m.complexity for m in self.quality_metrics.values()) / len(self.quality_metrics) if self.quality_metrics else 0
        avg_maintainability = sum(m.maintainability_index for m in self.quality_metrics.values()) / len(self.quality_metrics) if self.quality_metrics else 0
        
        report = {
            'timestamp': self._get_timestamp(),
            'project': self.project_root,
            'summary': {
                'total_functions': total_functions,
                'duplicated_functions': duplicated_functions,
                'duplication_percentage': (duplicated_functions / total_functions * 100) if total_functions > 0 else 0,
                'avg_complexity': round(avg_complexity, 2),
                'avg_maintainability': round(avg_maintainability, 2)
            },
            'duplications': {
                'exact': len(exact_dups),
                'semantic': len(semantic_dups),
                'partial': len(partial_dups),
                'total': len(self.duplications)
            },
            'exact_matches': [self._format_duplication(d) for d in exact_dups[:10]],
            'semantic_matches': [self._format_duplication(d) for d in semantic_dups[:10]],
            'partial_matches': [self._format_duplication(d) for d in partial_dups[:10]],
            'quality_metrics': {
                k: asdict(v) for k, v in list(self.quality_metrics.items())[:20]
            },
            'recommendations': self._generate_recommendations()
        }
        
        return report
    
    def _format_duplication(self, dup: DuplicationMatch) -> Dict:
        """Format duplication for report"""
        return {
            'func1': {
                'name': dup.func1.name,
                'file': dup.func1.file,
                'line': dup.func1.line,
                'complexity': dup.func1.complexity,
                'loc': dup.func1.lines_of_code
            },
            'func2': {
                'name': dup.func2.name,
                'file': dup.func2.file,
                'line': dup.func2.line,
                'complexity': dup.func2.complexity,
                'loc': dup.func2.lines_of_code
            },
            'similarity': round(dup.similarity, 2),
            'match_type': dup.match_type,
            'recommendation': self._get_recommendation(dup)
        }
    
    def _get_recommendation(self, dup: DuplicationMatch) -> str:
        """Get recommendation for duplication"""
        if dup.match_type == 'exact':
            return 'CRITICAL: Extract to shared module'
        elif dup.match_type == 'semantic':
            return 'HIGH: Refactor to reduce duplication'
        else:
            return 'MEDIUM: Review and consider consolidation'
    
    def _generate_recommendations(self) -> List[str]:
        """Generate recommendations based on analysis"""
        recommendations = []
        
        if len(self.duplications) > 10:
            recommendations.append('High duplication detected - consider refactoring strategy')
        
        high_complexity = sum(1 for m in self.quality_metrics.values() if m.complexity > 15)
        if high_complexity > 5:
            recommendations.append(f'{high_complexity} functions have high complexity - consider simplification')
        
        low_maintainability = sum(1 for m in self.quality_metrics.values() if m.maintainability_index < 50)
        if low_maintainability > 5:
            recommendations.append(f'{low_maintainability} functions have low maintainability - add documentation and tests')
        
        return recommendations
    
    def _get_timestamp(self) -> str:
        """Get current timestamp"""
        from datetime import datetime
        return datetime.now().isoformat()
    
    def save_report(self, report: Dict, output_file: str):
        """Save report to file"""
        with open(output_file, 'w') as f:
            json.dump(report, f, indent=2)
        self.logger.info(f"Report saved to {output_file}")


def main():
    """Main entry point"""
    import sys
    
    project_root = sys.argv[1] if len(sys.argv) > 1 else '/Users/dev/Documents/GitHub/atlas4/orchestrator'
    output_file = sys.argv[2] if len(sys.argv) > 2 else 'duplication_report.json'
    
    analyzer = DuplicationAnalyzer(project_root)
    report = analyzer.analyze_project()
    
    analyzer.save_report(report, output_file)
    
    # Print summary
    print("\n" + "="*80)
    print("DUPLICATION ANALYSIS REPORT")
    print("="*80)
    print(f"Project: {report['project']}")
    print(f"Total Functions: {report['summary']['total_functions']}")
    print(f"Duplicated Functions: {report['summary']['duplicated_functions']}")
    print(f"Duplication Rate: {report['summary']['duplication_percentage']:.1f}%")
    print(f"Avg Complexity: {report['summary']['avg_complexity']}")
    print(f"Avg Maintainability: {report['summary']['avg_maintainability']:.1f}")
    print("\nDuplications Found:")
    print(f"  Exact Matches: {report['duplications']['exact']}")
    print(f"  Semantic Matches: {report['duplications']['semantic']}")
    print(f"  Partial Matches: {report['duplications']['partial']}")
    print("\nRecommendations:")
    for rec in report['recommendations']:
        print(f"  • {rec}")
    print("="*80 + "\n")


if __name__ == '__main__':
    main()
