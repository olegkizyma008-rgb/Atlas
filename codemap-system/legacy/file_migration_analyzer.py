#!/usr/bin/env python3
"""
File Migration Analyzer
Analyzes files for deletion, replacement, archiving, or modification
Provides detailed quality comparison and code extraction recommendations
"""

import os
import json
import re
import hashlib
from pathlib import Path
from typing import Dict, List, Tuple, Set, Any
from dataclasses import dataclass, asdict
from collections import defaultdict
import ast

@dataclass
class CodeBlock:
    """Represents a code block with metadata"""
    name: str
    type: str  # 'function', 'class', 'constant', 'utility'
    start_line: int
    end_line: int
    lines_of_code: int
    complexity: int
    quality_score: float
    is_used: bool
    usage_count: int
    dependencies: List[str]
    value: str  # 'high', 'medium', 'low'

@dataclass
class FileAnalysis:
    """Complete file analysis"""
    filepath: str
    file_size: int
    lines_of_code: int
    total_functions: int
    total_classes: int
    code_blocks: List[CodeBlock]
    quality_score: float
    maintainability: float
    documentation_score: float
    dead_code_percentage: float
    reusable_code_percentage: float
    recommendation: str  # 'delete', 'archive', 'merge', 'refactor', 'keep'
    valuable_blocks: List[CodeBlock]
    merge_candidates: List[str]

class FileMigrationAnalyzer:
    """Analyzes files for migration decisions"""
    
    def __init__(self, project_root: str, logger=None):
        self.project_root = Path(project_root)
        self.logger = logger or self._default_logger()
        self.file_analyses: Dict[str, FileAnalysis] = {}
        self.code_block_registry: Dict[str, List[CodeBlock]] = defaultdict(list)
        self.usage_tracking: Dict[str, Set[str]] = defaultdict(set)
        
    def _default_logger(self):
        """Default logger"""
        class SimpleLogger:
            def info(self, msg): print(f"ℹ️  {msg}")
            def warn(self, msg): print(f"⚠️  {msg}")
            def error(self, msg): print(f"❌ {msg}")
            def debug(self, msg): print(f"🔍 {msg}")
        return SimpleLogger()
    
    def analyze_file(self, filepath: str):
        """Analyze single file for migration"""
        self.logger.info(f"Analyzing {filepath}...")
        
        try:
            with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()
            
            file_size = len(content)
            lines = content.split('\n')
            loc = len([l for l in lines if l.strip() and not l.strip().startswith('#')])
            
            # Extract code blocks
            code_blocks = self._extract_code_blocks(filepath, content)
            
            # Calculate metrics
            quality_score = self._calculate_quality(code_blocks, content)
            maintainability = self._calculate_maintainability(code_blocks, content)
            documentation = self._calculate_documentation(content)
            dead_code_pct = self._calculate_dead_code_percentage(code_blocks)
            reusable_pct = self._calculate_reusable_percentage(code_blocks)
            
            # Identify valuable blocks
            valuable_blocks = [b for b in code_blocks if b.value in ['high', 'medium']]
            
            # Get recommendation
            recommendation = self._get_recommendation(
                quality_score, dead_code_pct, reusable_pct, len(valuable_blocks)
            )
            
            # Find merge candidates
            merge_candidates = self._find_merge_candidates(filepath, code_blocks)
            
            analysis = FileAnalysis(
                filepath=filepath,
                file_size=file_size,
                lines_of_code=loc,
                total_functions=len([b for b in code_blocks if b.type == 'function']),
                total_classes=len([b for b in code_blocks if b.type == 'class']),
                code_blocks=code_blocks,
                quality_score=quality_score,
                maintainability=maintainability,
                documentation_score=documentation,
                dead_code_percentage=dead_code_pct,
                reusable_code_percentage=reusable_pct,
                recommendation=recommendation,
                valuable_blocks=valuable_blocks,
                merge_candidates=merge_candidates
            )
            
            self.file_analyses[filepath] = analysis
            return analysis
            
        except Exception as e:
            self.logger.error(f"Error analyzing {filepath}: {e}")
            return None
    
    def _extract_code_blocks(self, filepath: str, content: str) -> List[CodeBlock]:
        """Extract code blocks from file"""
        blocks = []
        
        if filepath.endswith('.py'):
            blocks = self._extract_python_blocks(filepath, content)
        elif filepath.endswith('.js'):
            blocks = self._extract_javascript_blocks(filepath, content)
        
        return blocks
    
    def _extract_python_blocks(self, filepath: str, content: str) -> List[CodeBlock]:
        """Extract Python code blocks"""
        blocks = []
        
        try:
            tree = ast.parse(content)
            lines = content.split('\n')
            
            for node in ast.walk(tree):
                if isinstance(node, ast.FunctionDef):
                    block = self._create_block_from_python(
                        node, 'function', lines, content
                    )
                    blocks.append(block)
                elif isinstance(node, ast.ClassDef):
                    block = self._create_block_from_python(
                        node, 'class', lines, content
                    )
                    blocks.append(block)
        except:
            pass
        
        return blocks
    
    def _extract_javascript_blocks(self, filepath: str, content: str) -> List[CodeBlock]:
        """Extract JavaScript code blocks"""
        blocks = []
        lines = content.split('\n')
        
        # Extract functions
        func_pattern = r'(?:async\s+)?(?:function|const|let|var)\s+(\w+)\s*(?:=\s*)?(?:async\s*)?\(([^)]*)\)'
        for match in re.finditer(func_pattern, content):
            start_line = content[:match.start()].count('\n') + 1
            end_line = self._find_block_end(content, match.end())
            
            block_content = '\n'.join(lines[start_line-1:end_line])
            loc = end_line - start_line + 1
            complexity = self._calculate_complexity(block_content)
            quality = self._calculate_block_quality(block_content)
            
            block = CodeBlock(
                name=match.group(1),
                type='function',
                start_line=start_line,
                end_line=end_line,
                lines_of_code=loc,
                complexity=complexity,
                quality_score=quality,
                is_used=self._is_block_used(match.group(1), content),
                usage_count=self._count_usages(match.group(1), content),
                dependencies=self._extract_dependencies(block_content),
                value=self._assess_value(quality, complexity, loc)
            )
            blocks.append(block)
        
        return blocks
    
    def _create_block_from_python(self, node, block_type: str, lines: List[str], content: str) -> CodeBlock:
        """Create CodeBlock from Python AST node"""
        start_line = node.lineno
        end_line = node.end_lineno or start_line
        
        block_content = '\n'.join(lines[start_line-1:end_line])
        loc = end_line - start_line + 1
        complexity = self._calculate_complexity(block_content)
        quality = self._calculate_block_quality(block_content)
        
        return CodeBlock(
            name=node.name,
            type=block_type,
            start_line=start_line,
            end_line=end_line,
            lines_of_code=loc,
            complexity=complexity,
            quality_score=quality,
            is_used=self._is_block_used(node.name, content),
            usage_count=self._count_usages(node.name, content),
            dependencies=self._extract_dependencies(block_content),
            value=self._assess_value(quality, complexity, loc)
        )
    
    def _find_block_end(self, content: str, start_pos: int) -> int:
        """Find end of code block"""
        brace_count = 0
        in_block = False
        
        for i in range(start_pos, len(content)):
            if content[i] == '{':
                brace_count += 1
                in_block = True
            elif content[i] == '}':
                brace_count -= 1
                if in_block and brace_count == 0:
                    return content[:i].count('\n') + 1
        
        return content.count('\n') + 1
    
    def _calculate_complexity(self, code: str) -> int:
        """Calculate code complexity"""
        complexity = 1
        keywords = ['if', 'else', 'for', 'while', 'case', 'catch']
        
        for keyword in keywords:
            complexity += len(re.findall(rf'\b{keyword}\b', code))
        
        complexity += code.count('&&') + code.count('||') + code.count('?')
        return min(complexity, 50)
    
    def _calculate_block_quality(self, code: str) -> float:
        """Calculate quality of code block"""
        score = 100.0
        
        # Reduce for complexity
        complexity = self._calculate_complexity(code)
        score -= complexity * 0.5
        
        # Reduce for long lines
        long_lines = len([l for l in code.split('\n') if len(l) > 100])
        score -= long_lines * 0.2
        
        # Increase for comments
        comments = len(re.findall(r'//|/\*|#', code))
        score += comments * 0.1
        
        return max(0, min(100, score))
    
    def _calculate_quality(self, blocks: List[CodeBlock], content: str) -> float:
        """Calculate overall file quality"""
        if not blocks:
            return 50.0
        
        avg_quality = sum(b.quality_score for b in blocks) / len(blocks)
        return avg_quality
    
    def _calculate_maintainability(self, blocks: List[CodeBlock], content: str) -> float:
        """Calculate maintainability"""
        score = 100.0
        
        # Reduce for high complexity blocks
        high_complexity = len([b for b in blocks if b.complexity > 15])
        score -= high_complexity * 5
        
        # Reduce for dead code
        unused = len([b for b in blocks if not b.is_used])
        score -= unused * 3
        
        return max(0, min(100, score))
    
    def _calculate_documentation(self, content: str) -> float:
        """Calculate documentation score"""
        score = 0.0
        
        if re.search(r'""".*?"""|\'\'\'.*?\'\'\'', content, re.DOTALL):
            score += 50
        
        comment_lines = len([l for l in content.split('\n') if l.strip().startswith('#') or l.strip().startswith('//')])
        total_lines = len(content.split('\n'))
        
        if total_lines > 0:
            score += (comment_lines / total_lines) * 50
        
        return min(100, score)
    
    def _calculate_dead_code_percentage(self, blocks: List[CodeBlock]) -> float:
        """Calculate percentage of dead code"""
        if not blocks:
            return 0.0
        
        unused = len([b for b in blocks if not b.is_used])
        return (unused / len(blocks)) * 100
    
    def _calculate_reusable_percentage(self, blocks: List[CodeBlock]) -> float:
        """Calculate percentage of reusable code"""
        if not blocks:
            return 0.0
        
        reusable = len([b for b in blocks if b.usage_count > 1 or b.value in ['high', 'medium']])
        return (reusable / len(blocks)) * 100
    
    def _is_block_used(self, name: str, content: str) -> bool:
        """Check if block is used"""
        pattern = rf'\b{name}\s*\('
        matches = len(re.findall(pattern, content))
        return matches > 1  # More than just definition
    
    def _count_usages(self, name: str, content: str) -> int:
        """Count usages of block"""
        pattern = rf'\b{name}\s*\('
        return len(re.findall(pattern, content)) - 1  # Exclude definition
    
    def _extract_dependencies(self, code: str) -> List[str]:
        """Extract dependencies from code"""
        deps = []
        
        # Find imports
        import_pattern = r'(?:import|from|require)\s+(?:\{[^}]*\}|[^\s;]+)'
        for match in re.finditer(import_pattern, code):
            deps.append(match.group(0))
        
        return deps
    
    def _assess_value(self, quality: float, complexity: int, loc: int) -> str:
        """Assess value of code block"""
        if quality >= 80 and complexity <= 5 and loc <= 50:
            return 'high'
        elif quality >= 60 or (complexity <= 10 and loc <= 100):
            return 'medium'
        else:
            return 'low'
    
    def _get_recommendation(self, quality: float, dead_code_pct: float, reusable_pct: float, valuable_count: int) -> str:
        """Get migration recommendation"""
        if dead_code_pct > 80:
            return 'delete'
        elif reusable_pct > 60 and quality > 70:
            return 'keep'
        elif valuable_count > 0 and reusable_pct > 30:
            return 'merge'
        elif quality < 40 and dead_code_pct > 50:
            return 'archive'
        else:
            return 'refactor'
    
    def _find_merge_candidates(self, filepath: str, blocks: List[CodeBlock]) -> List[str]:
        """Find files that could be merged with this one"""
        candidates = []
        
        # Look for similar function names in other files
        for other_file, analysis in self.file_analyses.items():
            if other_file == filepath:
                continue
            
            for other_block in analysis.code_blocks:
                for block in blocks:
                    if block.name == other_block.name and block.type == other_block.type:
                        candidates.append(other_file)
        
        return list(set(candidates))
    
    def compare_files(self, file1: str, file2: str) -> Dict[str, Any]:
        """Compare two files for quality and merge potential"""
        self.logger.info(f"Comparing {file1} vs {file2}...")
        
        analysis1 = self.analyze_file(file1)
        analysis2 = self.analyze_file(file2)
        
        if not analysis1 or not analysis2:
            return {"error": "Could not analyze files"}
        
        # Find common blocks
        common_blocks = self._find_common_blocks(analysis1, analysis2)
        
        # Calculate merge score
        merge_score = self._calculate_merge_score(analysis1, analysis2, common_blocks)
        
        return {
            "file1": {
                "path": file1,
                "quality": analysis1.quality_score,
                "loc": analysis1.lines_of_code,
                "functions": analysis1.total_functions,
                "dead_code_pct": analysis1.dead_code_percentage
            },
            "file2": {
                "path": file2,
                "quality": analysis2.quality_score,
                "loc": analysis2.lines_of_code,
                "functions": analysis2.total_functions,
                "dead_code_pct": analysis2.dead_code_percentage
            },
            "comparison": {
                "common_blocks": len(common_blocks),
                "merge_score": merge_score,
                "recommendation": "merge" if merge_score > 70 else "keep_separate",
                "valuable_from_file1": len(analysis1.valuable_blocks),
                "valuable_from_file2": len(analysis2.valuable_blocks)
            },
            "common_blocks_detail": [
                {
                    "name": b1.name,
                    "type": b1.type,
                    "quality_diff": abs(b1.quality_score - b2.quality_score),
                    "better_in": "file1" if b1.quality_score > b2.quality_score else "file2"
                }
                for b1, b2 in common_blocks
            ]
        }
    
    def _find_common_blocks(self, analysis1: FileAnalysis, analysis2: FileAnalysis) -> List[Tuple[CodeBlock, CodeBlock]]:
        """Find common code blocks between files"""
        common = []
        
        for block1 in analysis1.code_blocks:
            for block2 in analysis2.code_blocks:
                if block1.name == block2.name and block1.type == block2.type:
                    common.append((block1, block2))
        
        return common
    
    def _calculate_merge_score(self, analysis1: FileAnalysis, analysis2: FileAnalysis, common_blocks: List) -> float:
        """Calculate score for merging two files"""
        score = 0.0
        
        # Common blocks
        if common_blocks:
            score += len(common_blocks) * 10
        
        # Similar quality
        quality_diff = abs(analysis1.quality_score - analysis2.quality_score)
        score += max(0, 20 - quality_diff)
        
        # Similar size
        loc_ratio = min(analysis1.lines_of_code, analysis2.lines_of_code) / max(analysis1.lines_of_code, analysis2.lines_of_code)
        score += loc_ratio * 20
        
        # Reusable code
        reusable = (analysis1.reusable_code_percentage + analysis2.reusable_code_percentage) / 2
        score += reusable * 0.3
        
        return min(100, score)
    
    def extract_valuable_code(self, filepath: str) -> Dict[str, Any]:
        """Extract valuable code blocks from file"""
        analysis = self.file_analyses.get(filepath)
        
        if not analysis:
            analysis = self.analyze_file(filepath)
        
        if not analysis:
            return {"error": "Could not analyze file"}
        
        return {
            "filepath": filepath,
            "total_blocks": len(analysis.code_blocks),
            "valuable_blocks": len(analysis.valuable_blocks),
            "valuable_code": [
                {
                    "name": block.name,
                    "type": block.type,
                    "lines": f"{block.start_line}-{block.end_line}",
                    "quality": block.quality_score,
                    "complexity": block.complexity,
                    "value": block.value,
                    "usage_count": block.usage_count
                }
                for block in analysis.valuable_blocks
            ],
            "recommendation": analysis.recommendation,
            "migration_plan": self._generate_migration_plan(analysis)
        }
    
    def _generate_migration_plan(self, analysis: FileAnalysis) -> Dict[str, Any]:
        """Generate migration plan for file"""
        plan = {
            "action": analysis.recommendation,
            "reason": "",
            "steps": []
        }
        
        if analysis.recommendation == 'delete':
            plan["reason"] = f"File has {analysis.dead_code_percentage:.1f}% dead code"
            plan["steps"] = [
                "1. Extract valuable blocks (if any)",
                "2. Check for external dependencies",
                "3. Archive to /archive/",
                "4. Remove from project"
            ]
        elif analysis.recommendation == 'archive':
            plan["reason"] = f"Low quality ({analysis.quality_score:.1f}) and high dead code ({analysis.dead_code_percentage:.1f}%)"
            plan["steps"] = [
                "1. Extract high-value blocks",
                "2. Document extracted code",
                "3. Move to /archive/",
                "4. Update imports"
            ]
        elif analysis.recommendation == 'merge':
            plan["reason"] = f"High reusable code ({analysis.reusable_code_percentage:.1f}%)"
            plan["steps"] = [
                "1. Find merge candidates",
                "2. Compare quality metrics",
                "3. Consolidate valuable blocks",
                "4. Update imports",
                "5. Delete original file"
            ]
        elif analysis.recommendation == 'refactor':
            plan["reason"] = f"Moderate quality ({analysis.quality_score:.1f}%)"
            plan["steps"] = [
                "1. Improve code quality",
                "2. Remove dead code",
                "3. Add documentation",
                "4. Add tests",
                "5. Keep in project"
            ]
        else:  # keep
            plan["reason"] = f"High quality ({analysis.quality_score:.1f}%) and reusable ({analysis.reusable_code_percentage:.1f}%)"
            plan["steps"] = [
                "1. Keep in project",
                "2. Monitor for improvements",
                "3. Add tests if missing"
            ]
        
        return plan
    
    def generate_migration_report(self, files: List[str]) -> Dict[str, Any]:
        """Generate comprehensive migration report"""
        report = {
            "timestamp": self._get_timestamp(),
            "total_files": len(files),
            "analyses": {},
            "summary": {
                "delete_candidates": [],
                "archive_candidates": [],
                "merge_candidates": [],
                "refactor_candidates": [],
                "keep_files": []
            }
        }
        
        for filepath in files:
            analysis = self.analyze_file(filepath)
            if analysis:
                report["analyses"][filepath] = {
                    "quality": analysis.quality_score,
                    "maintainability": analysis.maintainability,
                    "dead_code_pct": analysis.dead_code_percentage,
                    "reusable_pct": analysis.reusable_code_percentage,
                    "recommendation": analysis.recommendation,
                    "valuable_blocks": len(analysis.valuable_blocks)
                }
                
                # Categorize
                if analysis.recommendation == 'delete':
                    report["summary"]["delete_candidates"].append(filepath)
                elif analysis.recommendation == 'archive':
                    report["summary"]["archive_candidates"].append(filepath)
                elif analysis.recommendation == 'merge':
                    report["summary"]["merge_candidates"].append(filepath)
                elif analysis.recommendation == 'refactor':
                    report["summary"]["refactor_candidates"].append(filepath)
                else:
                    report["summary"]["keep_files"].append(filepath)
        
        return report
    
    def _get_timestamp(self) -> str:
        """Get current timestamp"""
        from datetime import datetime
        return datetime.now().isoformat()


def main():
    """Main entry point"""
    import sys
    
    if len(sys.argv) < 2:
        print("Usage: python file_migration_analyzer.py <file_path> [compare_file]")
        sys.exit(1)
    
    filepath = sys.argv[1]
    analyzer = FileMigrationAnalyzer("./")
    
    if len(sys.argv) > 2:
        # Compare mode
        compare_file = sys.argv[2]
        result = analyzer.compare_files(filepath, compare_file)
        print(json.dumps(result, indent=2))
    else:
        # Single file analysis
        analysis = analyzer.analyze_file(filepath)
        if analysis:
            print(json.dumps(asdict(analysis), indent=2, default=str))


if __name__ == "__main__":
    main()
