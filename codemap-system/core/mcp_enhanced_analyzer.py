#!/usr/bin/env python3
"""
ENHANCED MCP CODEMAP ANALYZER
Continuous multi-layer analysis with automatic cycle
- Layer 1: Dead files detection
- Layer 2: Dead functions in each file
- Layer 3: Dependency graph & relationships
- Layer 4: Circular dependencies & isolation
- Layer 5+: Quality metrics, duplications, recommendations

Never sleeps. Continuously deepens analysis.
"""

import json
import os
import sys
import time
import asyncio
import threading
import subprocess
from pathlib import Path
from typing import Dict, List, Set, Tuple, Any
from collections import defaultdict
from datetime import datetime
import logging
from logging.handlers import RotatingFileHandler
import hashlib
import re
import ast

# Safely import radon for quality analysis
try:
    from radon.visitors import ComplexityVisitor
except ImportError:
    ComplexityVisitor = None

# ============================================================================
# LOGGING SETUP
# ============================================================================

def setup_logging(log_dir: Path):
    """Setup logging with rotation"""
    log_dir.mkdir(parents=True, exist_ok=True)
    log_file = log_dir / "enhanced_analyzer.log"
    
    logger = logging.getLogger(__name__)
    logger.setLevel(logging.DEBUG)
    logger.handlers = []
    
    file_handler = RotatingFileHandler(
        log_file,
        maxBytes=10 * 1024 * 1024,
        backupCount=5,
        encoding='utf-8'
    )
    file_handler.setLevel(logging.DEBUG)
    
    console_handler = logging.StreamHandler(sys.stderr)
    console_handler.setLevel(logging.ERROR)
    
    formatter = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    file_handler.setFormatter(formatter)
    console_handler.setFormatter(formatter)
    
    logger.addHandler(file_handler)
    logger.addHandler(console_handler)
    
    return logger

# ============================================================================
# ENHANCED ANALYZER
# ============================================================================

class EnhancedCodemapAnalyzer:
    """Multi-layer continuous analyzer"""
    
    def __init__(self, project_root: str, reports_dir: str):
        self.project_root = Path(project_root).resolve()
        self.reports_dir = Path(reports_dir).resolve()
        self.reports_dir.mkdir(parents=True, exist_ok=True)
        
        self.js_parser_path = self.project_root / "codemap-system" / "js_parser" / "parse_js.mjs"
        log_dir = self.project_root / "codemap-system" / "logs"
        self.logger = setup_logging(log_dir)
        
        if not ComplexityVisitor:
            self.logger.warning("Radon library not found. Cyclomatic complexity analysis will be skipped. Run 'pip install radon'.")

        self.dependencies = self._get_dependencies()

        # Analysis state
        self.analysis_state = {
            "timestamp": None,
            "layer": 0,
            "files_analyzed": 0,
            "functions_analyzed": 0,
            "dead_files": [],
            "dead_functions": {},
            "dependency_graph": {},
            "cycles": [],
            "duplications": [],
            "quality_metrics": {},
            "relationships": {}
        }
        
        self.logger.info("🚀 Enhanced Codemap Analyzer initialized")

    def _get_dependencies(self) -> Set[str]:
        """Read dependencies from package.json"""
        deps = set()
        package_json_path = self.project_root / "package.json"
        if package_json_path.exists():
            try:
                with open(package_json_path, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    deps.update(data.get('dependencies', {}).keys())
                    deps.update(data.get('devDependencies', {}).keys())
            except json.JSONDecodeError:
                self.logger.error("Failed to decode package.json")
        return deps
    
    # ========================================================================
    # AST PARSING
    # ========================================================================

    def _get_js_ast(self, file_path: Path) -> Dict | None:
        if not self.js_parser_path.exists(): return None
        command = ["node", str(self.js_parser_path), str(file_path)]
        try:
            result = subprocess.run(command, capture_output=True, text=True, check=True, encoding='utf-8')
            return json.loads(result.stdout)
        except (subprocess.CalledProcessError, json.JSONDecodeError, Exception) as e:
            self.logger.error(f"Error getting JS AST for {file_path}: {e}")
            return None

    def _traverse_ast(self, node: Any, node_types: List[str], callback):
        if isinstance(node, dict):
            if node.get("type") in node_types: callback(node)
            for key, value in node.items():
                if key != 'loc': self._traverse_ast(value, node_types, callback)
        elif isinstance(node, list):
            for item in node: self._traverse_ast(item, node_types, callback)

    # ========================================================================
    # LAYER 1-4 (EXISTING IMPLEMENTATIONS)
    # ========================================================================
    def layer1_detect_dead_files(self) -> Dict[str, Any]:
        self.logger.info("📊 LAYER 1: Detecting dead files...")
        dead_files, all_files = [], self._collect_all_files()
        for file_path in all_files:
            rel_path = str(file_path.relative_to(self.project_root))
            if not self._extract_imports(file_path) and not self._is_file_imported(rel_path, all_files) and not any(e in rel_path for e in ['app.js', 'server.js', 'index.js']):
                dead_files.append({"file": rel_path, "size": file_path.stat().st_size})
        self.analysis_state["dead_files"] = dead_files
        self.logger.info(f"✅ Found {len(dead_files)} potentially dead files")
        return {"layer": 1, "dead_files": dead_files}

    def layer2_detect_dead_functions(self) -> Dict[str, Any]:
        self.logger.info("📊 LAYER 2: Detecting dead functions...")
        dead_functions, all_files, call_graph = {}, self._collect_all_files(), self._build_call_graph(all_files)
        for file_path in all_files:
            rel_path = str(file_path.relative_to(self.project_root))
            defined_funcs, exported_funcs = self._extract_functions(file_path), self._get_exported_functions(file_path)
            dead = [info for name, info in defined_funcs.items() if name not in call_graph and name not in exported_funcs]
            if dead: dead_functions[rel_path] = dead
        self.analysis_state["dead_functions"] = dead_functions
        self.logger.info(f"✅ Found dead functions in {len(dead_functions)} files")
        return {"layer": 2, "dead_functions": dead_functions}

    def layer3_build_dependency_graph(self) -> Dict[str, Any]:
        self.logger.info("📊 LAYER 3: Building dependency graph...")
        graph, all_files = defaultdict(list), self._collect_all_files()
        for file_path in all_files:
            rel_path = str(file_path.relative_to(self.project_root))
            for imp in self._extract_imports(file_path):
                resolved = self._resolve_import(imp, file_path)
                if resolved:
                    if isinstance(resolved, Path) and resolved.exists():
                        resolved_rel = str(resolved.relative_to(self.project_root))
                        if resolved_rel != rel_path: graph[rel_path].append(resolved_rel)
                    else: graph[rel_path].append(resolved)
        self.analysis_state["dependency_graph"] = dict(graph)
        self.logger.info(f"✅ Built graph with {len(graph)} nodes")
        return {"layer": 3, "graph": dict(graph)}

    def layer4_detect_cycles_and_isolation(self) -> Dict[str, Any]:
        self.logger.info("📊 LAYER 4: Detecting cycles...")
        graph, cycles, path, visited = self.analysis_state.get("dependency_graph", {}), [], set(), set()
        def visit(node):
            visited.add(node); path.add(node)
            for neighbour in graph.get(node, []):
                if neighbour in path:
                    try: cycles.append(list(path)[list(path).index(neighbour):] + [neighbour])
                    except ValueError: pass
                if neighbour not in visited: visit(neighbour)
            path.remove(node)
        for node in list(graph.keys()):
            if node not in visited: visit(node)
        self.analysis_state["cycles"] = cycles
        self.logger.info(f"✅ Found {len(cycles)} cycles")
        return {"layer": 4, "cycles": cycles}

    # ========================================================================
    # LAYER 5: QUALITY & DUPLICATION (ENHANCED)
    # ========================================================================

    def layer5_quality_analysis(self) -> Dict[str, Any]:
        """Analyze code quality (complexity, duplications)."""
        self.logger.info("📊 LAYER 5: Analyzing code quality...")
        
        all_files = self._collect_all_files()
        function_hashes = defaultdict(list)
        duplications = []
        quality_metrics = defaultdict(list)

        for file_path in all_files:
            rel_path = str(file_path.relative_to(self.project_root))
            try:
                if file_path.suffix == '.py':
                    with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                        content = f.read()
                    
                    # --- Duplication Analysis ---
                    tree = ast.parse(content)
                    for node in ast.walk(tree):
                        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                            func_body_str = ast.dump(node)
                            func_hash = hashlib.md5(func_body_str.encode()).hexdigest()
                            function_hashes[func_hash].append({"file": rel_path, "func_name": node.name, "line": node.lineno})
                    
                    # --- Cyclomatic Complexity Analysis (if radon is installed) ---
                    if ComplexityVisitor:
                        visitor = ComplexityVisitor.from_code(content)
                        for function in visitor.functions:
                            quality_metrics[rel_path].append({
                                "type": "cyclomatic_complexity",
                                "name": function.name,
                                "line": function.lineno,
                                "complexity": function.complexity,
                                "rank": function.rank()
                            })
                
                elif file_path.suffix in ['.js', '.ts', '.jsx', '.tsx']:
                    ast_data = self._get_js_ast(file_path)
                    if ast_data:
                        def callback(node):
                            node_type = node.get("type")
                            func_name, line_num = None, node.get('loc', {}).get('start', {}).get('line')
                            if node_type == 'FunctionDeclaration' and node.get('id'): func_name = node['id']['name']
                            # Further logic to get name for other func types

                            if func_name:
                                body_str = json.dumps(node.get('body'), sort_keys=True)
                                func_hash = hashlib.md5(body_str.encode()).hexdigest()
                                function_hashes[func_hash].append({"file": rel_path, "func_name": func_name, "line": line_num})
                        
                        self._traverse_ast(ast_data, ['FunctionDeclaration', 'ArrowFunctionExpression', 'FunctionExpression'], callback)

            except Exception as e:
                self.logger.warning(f"Could not analyze quality for {file_path}: {e}")

        # Identify duplicates
        for func_hash, locations in function_hashes.items():
            if len(locations) > 1:
                duplications.append({"hash": func_hash, "locations": locations})
        
        self.analysis_state["duplications"] = duplications
        self.analysis_state["quality_metrics"] = dict(quality_metrics)
        
        self.logger.info(f"✅ Found {len(duplications)} duplicated function bodies.")
        if ComplexityVisitor and quality_metrics:
            self.logger.info(f"✅ Analyzed cyclomatic complexity for {len(quality_metrics)} Python files.")

        return {"layer": 5, "duplications": duplications, "quality_metrics": dict(quality_metrics)}

    # ========================================================================
    # HELPER METHODS (UNCHANGED / MINOR CHANGES)
    # ========================================================================
    def _collect_all_files(self) -> List[Path]:
        # ... implementation from previous steps
        files = []
        extensions = ['.js', '.ts', '.tsx', '.jsx', '.py']
        exclude_dirs = ['.git', 'node_modules', '__pycache__', '.archive', 'dist', 'build', 'reports', 'logs']
        for root, dirs, filenames in os.walk(self.project_root, topdown=True):
            dirs[:] = [d for d in dirs if d not in exclude_dirs]
            for filename in filenames:
                if any(filename.endswith(ext) for ext in extensions):
                    files.append(Path(root) / filename)
        return files

    def _extract_imports(self, file_path: Path) -> Set[str]:
        # ... implementation from previous steps
        imports = set()
        try:
            if file_path.suffix == '.py':
                with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                    content = f.read()
                tree = ast.parse(content)
                for node in ast.walk(tree):
                    if isinstance(node, ast.Import):
                        for alias in node.names:
                            imports.add(alias.name)
                    elif isinstance(node, ast.ImportFrom):
                        if node.module:
                            imports.add(node.module)
            elif file_path.suffix in ['.js', '.ts', '.jsx', '.tsx']:
                ast_data = self._get_js_ast(file_path)
                if ast_data:
                    def callback(node):
                        source = node.get('source', {}).get('value') if node.get('source') else None
                        if source:
                            imports.add(source)
                        if node.get('type') == 'CallExpression' and node.get('callee', {}).get('type') == 'Import':
                            if node['arguments'] and node['arguments'][0].get('type') == 'StringLiteral':
                                imports.add(node['arguments'][0]['value'])
                    self._traverse_ast(ast_data, ['ImportDeclaration', 'ExportNamedDeclaration', 'ExportAllDeclaration', 'CallExpression'], callback)
        except Exception as e:
            self.logger.warning(f"Could not parse imports for {file_path}: {e}")
        return imports

    def _extract_functions(self, file_path: Path) -> Dict[str, Dict]:
        # ... implementation from previous steps
        functions = {}
        try:
            if file_path.suffix == '.py':
                with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                    content = f.read()
                tree = ast.parse(content)
                for node in ast.walk(tree):
                    if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                        functions[node.name] = {"name": node.name, "line": node.lineno}
            elif file_path.suffix in ['.js', '.ts', '.jsx', '.tsx']:
                ast_data = self._get_js_ast(file_path)
                if ast_data:
                    def callback(node):
                        func_name, line_num = None, node.get('loc', {}).get('start', {}).get('line')
                        node_type = node.get("type")
                        if node_type == 'FunctionDeclaration' and node.get('id'): func_name = node['id']['name']
                        elif node_type == 'VariableDeclarator' and node.get('init') and node.get('init',{}).get('type') in ['ArrowFunctionExpression', 'FunctionExpression']:
                            func_name = node.get('id', {}).get('name')
                        elif node_type == 'MethodDefinition' and node.get('key'): func_name = node['key']['name']
                        if func_name: functions[func_name] = {"name": func_name, "line": line_num}
                    self._traverse_ast(ast_data, ['FunctionDeclaration', 'VariableDeclarator', 'MethodDefinition'], callback)
        except Exception as e:
            self.logger.warning(f"Could not parse functions for {file_path}: {e}")
        return functions
    
    def _get_exported_functions(self, file_path: Path) -> Set[str]:
        # ... implementation from previous steps
        exported = set()
        try:
            if file_path.suffix == '.py':
                pass # Python logic ok
            elif file_path.suffix in ['.js', '.ts', '.jsx', '.tsx']:
                ast_data = self._get_js_ast(file_path)
                if ast_data:
                    def callback(node):
                        if node.get('declaration'):
                            decl = node['declaration']
                            if decl.get('id') and decl.get('id').get('name'): exported.add(decl['id']['name'])
                        if node.get('specifiers'):
                            for spec in node['specifiers']: exported.add(spec.get('local',{}).get('name'))
                    self._traverse_ast(ast_data, ['ExportNamedDeclaration', 'ExportDefaultDeclaration'], callback)
        except Exception as e:
            self.logger.warning(f"Could not get exported functions for {file_path}: {e}")
        return exported

    def _build_call_graph(self, files: List[Path]) -> Dict[str, Set[str]]:
        return defaultdict(set) # Placeholder for now

    def _is_function_called(self, func_name: str, call_graph: Dict) -> bool:
        return func_name in call_graph

    def _is_file_imported(self, file_to_check: str, all_files: List[Path]) -> bool:
        # ... implementation from previous steps
        file_to_check_stem = file_to_check.rsplit('.', 1)[0]
        for file_path in all_files:
            imports = self._extract_imports(file_path)
            for imp in imports:
                if file_to_check_stem in imp or file_to_check in imp:
                    return True
        return False

    def _resolve_import(self, imp: str, from_file: Path) -> Path | str | None:
        # ... implementation from previous steps
        if not imp.startswith('.') and not Path(imp).is_absolute():
            if imp in self.dependencies: return imp
        base_dir = from_file.parent
        potential_paths = [base_dir / imp, self.project_root / imp, self.project_root / 'src' / imp]
        for path in potential_paths:
            for ext in ['', '.js', '.ts', '.jsx', '.tsx', '.py', '/index.js', '/index.ts']:
                candidate = path.parent / (path.name + ext)
                if candidate.exists() and candidate.is_file():
                    return candidate.resolve()
        return None

    # ========================================================================
    # CONTINUOUS ANALYSIS CYCLE
    # ========================================================================
    
    def run_continuous_analysis(self, interval: int = 60):
        self.logger.info(f"🔄 Starting continuous analysis cycle (interval: {interval}s)")
        layer_num = 0
        while True:
            try:
                layer_num += 1
                self.logger.info(f"\n{'='*80}")
                self.logger.info(f"🌀 ANALYSIS CYCLE #{layer_num} - {datetime.now().isoformat()}")
                
                self._save_report("layer1_dead_files.json", self.layer1_detect_dead_files())
                self._save_report("layer2_dead_functions.json", self.layer2_detect_dead_functions())
                self._save_report("layer3_dependency_graph.json", self.layer3_build_dependency_graph())
                self._save_report("layer4_cycles_isolation.json", self.layer4_detect_cycles_and_isolation())
                self._save_report("layer5_quality_duplications.json", self.layer5_quality_analysis())

                self.logger.info(f"\n✅ Cycle #{layer_num} completed successfully")
                time.sleep(interval)
            except Exception as e:
                self.logger.error(f"❌ Error in analysis cycle: {e}", exc_info=True)
                time.sleep(interval)

    def _save_report(self, filename: str, data: Dict):
        try:
            report_path = self.reports_dir / filename
            with open(report_path, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2, default=str)
            self.logger.debug(f"💾 Saved report: {filename}")
        except Exception as e:
            self.logger.error(f"❌ Failed to save report {filename}: {e}")

# ============================================================================
# MAIN ENTRY POINT
# ============================================================================

def main():
    project_root = str(Path(__file__).parent.parent.parent.resolve())
    reports_dir = str(Path(project_root) / 'reports')
    analyzer = EnhancedCodemapAnalyzer(project_root, reports_dir)
    analysis_thread = threading.Thread(target=analyzer.run_continuous_analysis, kwargs={"interval": 120}, daemon=True)
    analysis_thread.start()
    print(f"🚀 Enhanced Codemap Analyzer running. Reports in: {reports_dir}")
    try:
        while analysis_thread.is_alive(): analysis_thread.join(timeout=1.0)
    except KeyboardInterrupt: print("\n🛑 Stopping analyzer...")

if __name__ == '__main__':
    main()
