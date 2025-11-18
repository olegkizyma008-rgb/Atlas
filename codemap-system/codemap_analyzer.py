#!/usr/bin/env python3
"""
Codemap Analyzer - Independent module for continuous code analysis
Analyzes dependencies, dead code, and project structure for Windsurf Cascade
"""

import ast
import json
import os
import sys
import time
import yaml
from pathlib import Path
from typing import Dict, List, Set, Tuple, Any
from collections import defaultdict
import networkx as nx
from datetime import datetime
import hashlib


class CodeAnalyzer:
    """Main analyzer for code dependencies and dead code detection"""
    
    def __init__(self, config_path: str = "config.yaml"):
        self.config = self._load_config(config_path)
        self.project_root = Path(self.config.get("project", {}).get("root", "./"))
        self.reports_dir = Path(self.config.get("output", {}).get("reports_dir", "reports"))
        self.reports_dir.mkdir(exist_ok=True)
        
        # Graphs and data structures
        self.dependency_graph = nx.DiGraph()
        self.file_imports = defaultdict(set)
        self.function_definitions = defaultdict(dict)
        self.function_calls = defaultdict(set)
        self.unused_items = {
            "functions": [],
            "variables": [],
            "imports": [],
            "private_methods": []
        }
        self.file_hashes = {}
        
    def _load_config(self, config_path: str) -> Dict:
        """Load configuration from YAML file"""
        try:
            with open(config_path, 'r') as f:
                return yaml.safe_load(f) or {}
        except FileNotFoundError:
            print(f"⚠️  Config file not found: {config_path}. Using defaults.")
            return self._default_config()
    
    def _default_config(self) -> Dict:
        """Return default configuration"""
        return {
            "project": {"name": "My Project", "root": "./"},
            "analysis": {
                "include_paths": ["src", "lib", "app"],
                "exclude_paths": ["node_modules", "__pycache__", ".git", "dist", "build"],
                "file_extensions": [".py", ".js", ".ts", ".tsx", ".jsx"],
                "min_function_size": 3
            },
            "output": {
                "reports_dir": "reports",
                "formats": ["json", "html", "markdown"],
                "auto_update": True,
                "watch_interval": 5
            },
            "dead_code_rules": {
                "unused_functions": True,
                "unused_variables": True,
                "unused_imports": True,
                "unused_private_methods": True
            },
            "dependency_rules": {
                "detect_cycles": True,
                "max_depth": 5,
                "complexity_threshold": 10
            }
        }
    
    def analyze_project(self) -> Dict[str, Any]:
        """Run full project analysis"""
        print("🔍 Starting project analysis...")
        
        # Collect all Python/JS/TS files
        files = self._collect_files()
        print(f"📁 Found {len(files)} files to analyze")
        
        # Analyze each file
        for file_path in files:
            self._analyze_file(file_path)
        
        # Detect dead code
        self._detect_dead_code()
        
        # Detect cycles in dependencies
        cycles = self._detect_cycles()
        
        # Build summary
        summary = {
            "timestamp": datetime.now().isoformat(),
            "project": self.config.get("project", {}).get("name", "Unknown"),
            "files_analyzed": len(files),
            "total_functions": sum(len(v) for v in self.function_definitions.values()),
            "total_imports": sum(len(v) for v in self.file_imports.values()),
            "dependency_graph": {
                "nodes": len(self.dependency_graph.nodes()),
                "edges": len(self.dependency_graph.edges()),
                "cycles": len(cycles)
            },
            "dead_code": self.unused_items,
            "cycles": cycles,
            "complexity_metrics": self._calculate_complexity()
        }
        
        return summary
    
    def _collect_files(self) -> List[Path]:
        """Collect all files to analyze based on config"""
        files = []
        include_paths = self.config.get("analysis", {}).get("include_paths", [])
        exclude_paths = self.config.get("analysis", {}).get("exclude_paths", [])
        extensions = self.config.get("analysis", {}).get("file_extensions", [])
        
        for include_path in include_paths:
            full_path = self.project_root / include_path
            if not full_path.exists():
                continue
            
            for file_path in full_path.rglob("*"):
                if file_path.is_file() and file_path.suffix in extensions:
                    # Check if file is in excluded paths
                    if not any(exc in str(file_path) for exc in exclude_paths):
                        files.append(file_path)
        
        return files
    
    def _analyze_file(self, file_path: Path):
        """Analyze a single file for imports, functions, and calls"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Store file hash for change detection
            file_hash = hashlib.md5(content.encode()).hexdigest()
            self.file_hashes[str(file_path)] = file_hash
            
            # Parse based on file type
            if file_path.suffix == ".py":
                self._analyze_python_file(file_path, content)
            elif file_path.suffix in [".js", ".ts", ".tsx", ".jsx"]:
                self._analyze_javascript_file(file_path, content)
        
        except Exception as e:
            print(f"⚠️  Error analyzing {file_path}: {e}")
    
    def _analyze_python_file(self, file_path: Path, content: str):
        """Analyze Python file"""
        try:
            tree = ast.parse(content)
            rel_path = str(file_path.relative_to(self.project_root))
            
            for node in ast.walk(tree):
                # Collect imports
                if isinstance(node, (ast.Import, ast.ImportFrom)):
                    for alias in node.names:
                        module = alias.name
                        self.file_imports[rel_path].add(module)
                        self.dependency_graph.add_edge(rel_path, module)
                
                # Collect function definitions
                elif isinstance(node, ast.FunctionDef):
                    func_name = node.name
                    self.function_definitions[rel_path][func_name] = {
                        "lineno": node.lineno,
                        "lines": len(node.body),
                        "is_private": func_name.startswith("_")
                    }
                
                # Collect function calls
                elif isinstance(node, ast.Call):
                    if isinstance(node.func, ast.Name):
                        self.function_calls[rel_path].add(node.func.id)
                    elif isinstance(node.func, ast.Attribute):
                        if isinstance(node.func.value, ast.Name):
                            self.function_calls[rel_path].add(node.func.attr)
        
        except SyntaxError:
            print(f"⚠️  Syntax error in {file_path}")
    
    def _analyze_javascript_file(self, file_path: Path, content: str):
        """Analyze JavaScript/TypeScript file (simplified regex-based)"""
        import re
        
        rel_path = str(file_path.relative_to(self.project_root))
        
        # Find imports
        import_patterns = [
            r"import\s+(?:{[^}]*}|[^;]*)\s+from\s+['\"]([^'\"]+)['\"]",
            r"require\(['\"]([^'\"]+)['\"]\)",
            r"import\s+['\"]([^'\"]+)['\"]"
        ]
        
        for pattern in import_patterns:
            for match in re.finditer(pattern, content):
                module = match.group(1)
                self.file_imports[rel_path].add(module)
                self.dependency_graph.add_edge(rel_path, module)
        
        # Find function definitions
        func_patterns = [
            r"(?:function|const|let|var)\s+(\w+)\s*(?:=\s*)?(?:function|\()",
            r"(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*\("
        ]
        
        for pattern in func_patterns:
            for match in re.finditer(pattern, content):
                func_name = match.group(1)
                self.function_definitions[rel_path][func_name] = {
                    "lineno": content[:match.start()].count('\n') + 1,
                    "is_private": func_name.startswith("_")
                }
        
        # Find function calls
        call_pattern = r"(\w+)\s*\("
        for match in re.finditer(call_pattern, content):
            self.function_calls[rel_path].add(match.group(1))
    
    def _detect_dead_code(self):
        """Detect unused functions, variables, and imports"""
        rules = self.config.get("dead_code_rules", {})
        
        if rules.get("unused_functions"):
            # Find functions that are never called
            for file_path, functions in self.function_definitions.items():
                for func_name, func_info in functions.items():
                    # Check if function is called anywhere
                    is_called = any(
                        func_name in calls
                        for calls in self.function_calls.values()
                    )
                    
                    if not is_called and not func_name.startswith("_"):
                        self.unused_items["functions"].append({
                            "file": file_path,
                            "name": func_name,
                            "line": func_info.get("lineno", 0)
                        })
        
        if rules.get("unused_private_methods"):
            # Find private methods that are never called
            for file_path, functions in self.function_definitions.items():
                for func_name, func_info in functions.items():
                    if func_info.get("is_private"):
                        is_called = any(
                            func_name in calls
                            for calls in self.function_calls.values()
                        )
                        
                        if not is_called:
                            self.unused_items["private_methods"].append({
                                "file": file_path,
                                "name": func_name,
                                "line": func_info.get("lineno", 0)
                            })
    
    def _detect_cycles(self) -> List[List[str]]:
        """Detect circular dependencies"""
        try:
            cycles = list(nx.simple_cycles(self.dependency_graph))
            return cycles[:10]  # Return first 10 cycles
        except:
            return []
    
    def _calculate_complexity(self) -> Dict[str, Any]:
        """Calculate code complexity metrics"""
        max_depth = 0
        try:
            if len(self.dependency_graph) > 0:
                # Try to calculate diameter only if graph is connected
                undirected = self.dependency_graph.to_undirected()
                if nx.is_connected(undirected):
                    max_depth = nx.diameter(undirected)
        except:
            max_depth = 0
        
        return {
            "average_imports_per_file": (
                sum(len(v) for v in self.file_imports.values()) / 
                max(len(self.file_imports), 1)
            ),
            "average_functions_per_file": (
                sum(len(v) for v in self.function_definitions.values()) / 
                max(len(self.function_definitions), 1)
            ),
            "max_dependency_depth": max_depth
        }
    
    def generate_reports(self, summary: Dict[str, Any]):
        """Generate reports in multiple formats"""
        formats = self.config.get("output", {}).get("formats", ["json", "markdown"])
        
        if "json" in formats:
            self._generate_json_report(summary)
        
        if "markdown" in formats:
            self._generate_markdown_report(summary)
        
        if "html" in formats:
            self._generate_html_report(summary)
        
        print(f"✅ Reports generated in {self.reports_dir}/")
    
    def _generate_json_report(self, summary: Dict[str, Any]):
        """Generate JSON report"""
        report_path = self.reports_dir / "codemap_analysis.json"
        
        report_data = {
            **summary,
            "file_imports": {k: list(v) for k, v in self.file_imports.items()},
            "function_definitions": self.function_definitions,
            "dependency_edges": list(self.dependency_graph.edges())
        }
        
        with open(report_path, 'w') as f:
            json.dump(report_data, f, indent=2)
    
    def _generate_markdown_report(self, summary: Dict[str, Any]):
        """Generate Markdown report for Cascade"""
        report_path = self.reports_dir / "CODEMAP_SUMMARY.md"
        
        content = f"""# 📊 Code Analysis Report
Generated: {summary['timestamp']}

## Project Overview
- **Project**: {summary['project']}
- **Files Analyzed**: {summary['files_analyzed']}
- **Total Functions**: {summary['total_functions']}
- **Total Imports**: {summary['total_imports']}

## Dependency Graph
- **Nodes**: {summary['dependency_graph']['nodes']}
- **Edges**: {summary['dependency_graph']['edges']}
- **Circular Dependencies**: {summary['dependency_graph']['cycles']}

## Complexity Metrics
- **Avg Imports/File**: {summary['complexity_metrics']['average_imports_per_file']:.2f}
- **Avg Functions/File**: {summary['complexity_metrics']['average_functions_per_file']:.2f}
- **Max Dependency Depth**: {summary['complexity_metrics']['max_dependency_depth']}

## 🔴 Dead Code Detected

### Unused Functions ({len(summary['dead_code']['functions'])})
"""
        
        for item in summary['dead_code']['functions'][:20]:
            content += f"- `{item['name']}` in `{item['file']}` (line {item['line']})\n"
        
        if len(summary['dead_code']['functions']) > 20:
            content += f"- ... and {len(summary['dead_code']['functions']) - 20} more\n"
        
        content += f"\n### Unused Private Methods ({len(summary['dead_code']['private_methods'])})\n"
        
        for item in summary['dead_code']['private_methods'][:20]:
            content += f"- `{item['name']}` in `{item['file']}` (line {item['line']})\n"
        
        if len(summary['dead_code']['private_methods']) > 20:
            content += f"- ... and {len(summary['dead_code']['private_methods']) - 20} more\n"
        
        content += f"\n## 🔄 Circular Dependencies ({len(summary['cycles'])})\n"
        
        for i, cycle in enumerate(summary['cycles'][:10], 1):
            content += f"{i}. {' → '.join(cycle)} → {cycle[0]}\n"
        
        content += "\n---\n*This report is automatically updated by Codemap Analyzer*\n"
        
        with open(report_path, 'w') as f:
            f.write(content)
    
    def _generate_html_report(self, summary: Dict[str, Any]):
        """Generate HTML report"""
        report_path = self.reports_dir / "codemap_analysis.html"
        
        html_content = f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Code Analysis Report</title>
    <style>
        body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 20px; background: #f5f5f5; }}
        .container {{ max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }}
        h1 {{ color: #333; border-bottom: 3px solid #007bff; padding-bottom: 10px; }}
        h2 {{ color: #555; margin-top: 30px; }}
        .metric {{ display: inline-block; margin: 10px 20px 10px 0; padding: 15px; background: #f8f9fa; border-left: 4px solid #007bff; border-radius: 4px; }}
        .metric-value {{ font-size: 24px; font-weight: bold; color: #007bff; }}
        .metric-label {{ font-size: 12px; color: #666; text-transform: uppercase; }}
        .dead-code {{ background: #fff3cd; padding: 10px; margin: 5px 0; border-left: 4px solid #ff6b6b; border-radius: 4px; }}
        .cycle {{ background: #f8d7da; padding: 10px; margin: 5px 0; border-left: 4px solid #dc3545; border-radius: 4px; }}
        .timestamp {{ color: #999; font-size: 12px; }}
    </style>
</head>
<body>
    <div class="container">
        <h1>📊 Code Analysis Report</h1>
        <p class="timestamp">Generated: {summary['timestamp']}</p>
        
        <h2>Project Overview</h2>
        <div class="metric">
            <div class="metric-value">{summary['files_analyzed']}</div>
            <div class="metric-label">Files Analyzed</div>
        </div>
        <div class="metric">
            <div class="metric-value">{summary['total_functions']}</div>
            <div class="metric-label">Total Functions</div>
        </div>
        <div class="metric">
            <div class="metric-value">{summary['total_imports']}</div>
            <div class="metric-label">Total Imports</div>
        </div>
        
        <h2>Dependency Graph</h2>
        <div class="metric">
            <div class="metric-value">{summary['dependency_graph']['nodes']}</div>
            <div class="metric-label">Nodes</div>
        </div>
        <div class="metric">
            <div class="metric-value">{summary['dependency_graph']['edges']}</div>
            <div class="metric-label">Edges</div>
        </div>
        <div class="metric">
            <div class="metric-value">{summary['dependency_graph']['cycles']}</div>
            <div class="metric-label">Cycles</div>
        </div>
        
        <h2>🔴 Dead Code</h2>
        <p><strong>Unused Functions:</strong> {len(summary['dead_code']['functions'])}</p>
        
        <h2>🔄 Circular Dependencies</h2>
        <p><strong>Found:</strong> {len(summary['cycles'])}</p>
    </div>
</body>
</html>
"""
        
        with open(report_path, 'w') as f:
            f.write(html_content)
    
    def watch_and_update(self):
        """Continuously watch for changes and update reports"""
        print("👁️  Watching for changes...")
        watch_interval = self.config.get("output", {}).get("watch_interval", 5)
        
        while True:
            try:
                summary = self.analyze_project()
                self.generate_reports(summary)
                print(f"✅ Analysis complete at {datetime.now().strftime('%H:%M:%S')}")
                time.sleep(watch_interval)
            except KeyboardInterrupt:
                print("\n👋 Stopping analyzer...")
                break
            except Exception as e:
                print(f"❌ Error during analysis: {e}")
                time.sleep(watch_interval)


def main():
    """Main entry point"""
    import argparse
    
    parser = argparse.ArgumentParser(description="Codemap Analyzer - Code analysis for Windsurf")
    parser.add_argument("--config", default="config.yaml", help="Config file path")
    parser.add_argument("--once", action="store_true", help="Run analysis once and exit")
    parser.add_argument("--watch", action="store_true", help="Watch for changes and update continuously")
    
    args = parser.parse_args()
    
    analyzer = CodeAnalyzer(args.config)
    
    if args.once or (not args.watch):
        # Run once
        summary = analyzer.analyze_project()
        analyzer.generate_reports(summary)
        print("\n📊 Analysis Summary:")
        print(json.dumps(summary, indent=2, default=str))
    elif args.watch:
        # Watch mode
        analyzer.watch_and_update()


if __name__ == "__main__":
    main()
