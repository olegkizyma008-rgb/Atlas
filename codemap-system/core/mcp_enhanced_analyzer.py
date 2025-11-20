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
from pathlib import Path
from typing import Dict, List, Set, Tuple, Any
from collections import defaultdict
from datetime import datetime
import logging
from logging.handlers import RotatingFileHandler
import hashlib
import re

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
        self.project_root = Path(project_root)
        self.reports_dir = Path(reports_dir)
        self.reports_dir.mkdir(parents=True, exist_ok=True)
        
        log_dir = self.project_root / "codemap-system" / "logs"
        self.logger = setup_logging(log_dir)
        
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
    
    # ========================================================================
    # LAYER 1: DEAD FILES DETECTION
    # ========================================================================
    
    def layer1_detect_dead_files(self) -> Dict[str, Any]:
        """Detect files with no imports and no dependents"""
        self.logger.info("📊 LAYER 1: Detecting dead files...")
        
        dead_files = []
        all_files = self._collect_all_files()
        
        for file_path in all_files:
            rel_path = str(file_path.relative_to(self.project_root))
            
            # Check if file has any imports
            imports = self._extract_imports(file_path)
            
            # Check if file is imported by others
            is_imported = self._is_file_imported(rel_path, all_files)
            
            # Check if file is entry point
            is_entry = rel_path in ['app.js', 'server.js', 'index.js', 'main.js']
            
            if not imports and not is_imported and not is_entry:
                dead_files.append({
                    "file": rel_path,
                    "imports": len(imports),
                    "imported_by": 0,
                    "is_entry": False,
                    "size": file_path.stat().st_size
                })
        
        self.analysis_state["dead_files"] = dead_files
        self.logger.info(f"✅ Found {len(dead_files)} potentially dead files")
        
        return {"layer": 1, "dead_files": dead_files}
    
    # ========================================================================
    # LAYER 2: DEAD FUNCTIONS DETECTION
    # ========================================================================
    
    def layer2_detect_dead_functions(self) -> Dict[str, Any]:
        """Detect unused functions in each file"""
        self.logger.info("📊 LAYER 2: Detecting dead functions...")
        
        dead_functions = {}
        all_files = self._collect_all_files()
        
        # Build call graph
        call_graph = self._build_call_graph(all_files)
        
        for file_path in all_files:
            rel_path = str(file_path.relative_to(self.project_root))
            functions = self._extract_functions(file_path)
            
            file_dead_functions = []
            for func_name, func_info in functions.items():
                # Check if function is called anywhere
                is_called = self._is_function_called(rel_path, func_name, call_graph)
                
                # Check if it's exported
                is_exported = self._is_function_exported(file_path, func_name)
                
                if not is_called and not is_exported:
                    file_dead_functions.append({
                        "name": func_name,
                        "line": func_info.get("line"),
                        "complexity": func_info.get("complexity", 0),
                        "loc": func_info.get("loc", 0)
                    })
            
            if file_dead_functions:
                dead_functions[rel_path] = file_dead_functions
        
        self.analysis_state["dead_functions"] = dead_functions
        self.logger.info(f"✅ Found dead functions in {len(dead_functions)} files")
        
        return {"layer": 2, "dead_functions": dead_functions}
    
    # ========================================================================
    # LAYER 3: DEPENDENCY GRAPH & RELATIONSHIPS
    # ========================================================================
    
    def layer3_build_dependency_graph(self) -> Dict[str, Any]:
        """Build complete dependency graph with relationships"""
        self.logger.info("📊 LAYER 3: Building dependency graph...")
        
        all_files = self._collect_all_files()
        graph = defaultdict(list)
        relationships = defaultdict(lambda: {"imports": [], "imported_by": []})
        
        for file_path in all_files:
            rel_path = str(file_path.relative_to(self.project_root))
            imports = self._extract_imports(file_path)
            
            for imp in imports:
                # Resolve import to actual file
                resolved = self._resolve_import(imp, file_path)
                if resolved:
                    resolved_rel = str(resolved.relative_to(self.project_root))
                    graph[rel_path].append(resolved_rel)
                    relationships[rel_path]["imports"].append(resolved_rel)
                    relationships[resolved_rel]["imported_by"].append(rel_path)
        
        self.analysis_state["dependency_graph"] = dict(graph)
        self.analysis_state["relationships"] = dict(relationships)
        
        self.logger.info(f"✅ Built graph with {len(graph)} nodes")
        
        return {
            "layer": 3,
            "nodes": len(graph),
            "edges": sum(len(v) for v in graph.values()),
            "relationships": dict(relationships)
        }
    
    # ========================================================================
    # LAYER 4: CIRCULAR DEPENDENCIES & ISOLATION
    # ========================================================================
    
    def layer4_detect_cycles_and_isolation(self) -> Dict[str, Any]:
        """Detect circular dependencies and isolated modules"""
        self.logger.info("📊 LAYER 4: Detecting cycles and isolation...")
        
        graph = self.analysis_state.get("dependency_graph", {})
        cycles = []
        isolated = []
        
        # Detect cycles using DFS
        visited = set()
        rec_stack = set()
        
        def dfs_cycle(node, path):
            visited.add(node)
            rec_stack.add(node)
            
            for neighbor in graph.get(node, []):
                if neighbor not in visited:
                    if dfs_cycle(neighbor, path + [neighbor]):
                        return True
                elif neighbor in rec_stack:
                    cycle = path[path.index(neighbor):] + [neighbor]
                    cycles.append(cycle)
                    return True
            
            rec_stack.remove(node)
            return False
        
        for node in graph:
            if node not in visited:
                dfs_cycle(node, [node])
        
        # Detect isolated modules
        all_nodes = set(graph.keys())
        for node in all_nodes:
            if not graph.get(node) and node not in [v for vals in graph.values() for v in vals]:
                isolated.append(node)
        
        self.analysis_state["cycles"] = cycles
        
        self.logger.info(f"✅ Found {len(cycles)} cycles, {len(isolated)} isolated modules")
        
        return {
            "layer": 4,
            "cycles": cycles,
            "isolated_modules": isolated,
            "cycles_count": len(cycles),
            "isolated_count": len(isolated)
        }
    
    # ========================================================================
    # LAYER 5: QUALITY METRICS & DUPLICATIONS
    # ========================================================================
    
    def layer5_quality_and_duplications(self) -> Dict[str, Any]:
        """Analyze code quality and detect duplications"""
        self.logger.info("📊 LAYER 5: Analyzing quality and duplications...")
        
        all_files = self._collect_all_files()
        quality_metrics = {}
        duplications = []
        
        for file_path in all_files:
            rel_path = str(file_path.relative_to(self.project_root))
            
            # Calculate quality metrics
            metrics = self._calculate_quality_metrics(file_path)
            quality_metrics[rel_path] = metrics
        
        # Detect duplications (simplified)
        duplications = self._detect_duplications(all_files)
        
        self.analysis_state["quality_metrics"] = quality_metrics
        self.analysis_state["duplications"] = duplications
        
        self.logger.info(f"✅ Analyzed quality for {len(quality_metrics)} files, found {len(duplications)} duplications")
        
        return {
            "layer": 5,
            "quality_metrics": quality_metrics,
            "duplications": duplications,
            "avg_complexity": sum(m.get("complexity", 0) for m in quality_metrics.values()) / len(quality_metrics) if quality_metrics else 0
        }
    
    # ========================================================================
    # HELPER METHODS
    # ========================================================================
    
    def _collect_all_files(self) -> List[Path]:
        """Collect all source files"""
        files = []
        extensions = ['.js', '.ts', '.tsx', '.jsx', '.py']
        
        for root, dirs, filenames in os.walk(self.project_root):
            dirs[:] = [d for d in dirs if d not in ['.git', 'node_modules', '__pycache__', '.archive', 'dist', 'build']]
            
            for filename in filenames:
                if any(filename.endswith(ext) for ext in extensions):
                    files.append(Path(root) / filename)
        
        return files
    
    def _extract_imports(self, file_path: Path) -> Set[str]:
        """Extract imports from file"""
        imports = set()
        try:
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()
            
            # JavaScript/TypeScript imports
            js_imports = re.findall(r"(?:import|require)\s+(?:.*?from\s+)?['\"]([^'\"]+)['\"]", content)
            imports.update(js_imports)
            
            # Python imports
            py_imports = re.findall(r"(?:from|import)\s+([a-zA-Z0-9_.]+)", content)
            imports.update(py_imports)
        except:
            pass
        
        return imports
    
    def _extract_functions(self, file_path: Path) -> Dict[str, Dict]:
        """Extract functions from file"""
        functions = {}
        try:
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                lines = f.readlines()
            
            # Simple regex-based extraction
            for i, line in enumerate(lines):
                # JavaScript/TypeScript functions
                if re.search(r'(?:async\s+)?(?:function|const|let)\s+(\w+)\s*(?:=|:|\()', line):
                    match = re.search(r'(?:async\s+)?(?:function|const|let)\s+(\w+)', line)
                    if match:
                        func_name = match.group(1)
                        functions[func_name] = {
                            "line": i + 1,
                            "complexity": self._calculate_complexity(line),
                            "loc": 1
                        }
                
                # Python functions
                elif re.search(r'def\s+(\w+)\s*\(', line):
                    match = re.search(r'def\s+(\w+)', line)
                    if match:
                        func_name = match.group(1)
                        functions[func_name] = {
                            "line": i + 1,
                            "complexity": self._calculate_complexity(line),
                            "loc": 1
                        }
        except:
            pass
        
        return functions
    
    def _build_call_graph(self, files: List[Path]) -> Dict[str, Set[str]]:
        """Build function call graph"""
        call_graph = defaultdict(set)
        
        for file_path in files:
            try:
                with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                    content = f.read()
                
                # Extract function calls (simplified)
                calls = re.findall(r'(\w+)\s*\(', content)
                for call in calls:
                    call_graph[call].add(str(file_path))
            except:
                pass
        
        return dict(call_graph)
    
    def _is_function_called(self, file_path: str, func_name: str, call_graph: Dict) -> bool:
        """Check if function is called"""
        return func_name in call_graph
    
    def _is_function_exported(self, file_path: Path, func_name: str) -> bool:
        """Check if function is exported"""
        try:
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()
            
            return f"export.*{func_name}" in content or f"module.exports.*{func_name}" in content
        except:
            return False
    
    def _is_file_imported(self, file_path: str, all_files: List[Path]) -> bool:
        """Check if file is imported by others"""
        for other_file in all_files:
            if str(other_file.relative_to(self.project_root)) == file_path:
                continue
            
            try:
                with open(other_file, 'r', encoding='utf-8', errors='ignore') as f:
                    content = f.read()
                
                if file_path in content or file_path.replace('.js', '') in content:
                    return True
            except:
                pass
        
        return False
    
    def _resolve_import(self, imp: str, from_file: Path) -> Path | None:
        """Resolve import path to actual file"""
        # Simplified resolution
        base_dir = from_file.parent
        
        candidates = [
            base_dir / f"{imp}.js",
            base_dir / f"{imp}.ts",
            base_dir / f"{imp}/index.js",
            base_dir / f"{imp}/index.ts",
        ]
        
        for candidate in candidates:
            if candidate.exists():
                return candidate
        
        return None
    
    def _calculate_complexity(self, code: str) -> int:
        """Calculate cyclomatic complexity"""
        complexity = 1
        keywords = ['if', 'else', 'case', 'catch', 'for', 'while', 'do', '&&', '||', '?']
        
        for keyword in keywords:
            complexity += len(re.findall(rf'\b{keyword}\b', code))
        
        return min(complexity, 50)
    
    def _calculate_quality_metrics(self, file_path: Path) -> Dict:
        """Calculate quality metrics for file"""
        try:
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()
            
            lines = content.split('\n')
            functions = self._extract_functions(file_path)
            
            return {
                "loc": len(lines),
                "functions": len(functions),
                "complexity": sum(f.get("complexity", 0) for f in functions.values()),
                "comments": len([l for l in lines if '//' in l or '#' in l]),
                "imports": len(self._extract_imports(file_path))
            }
        except:
            return {}
    
    def _detect_duplications(self, files: List[Path]) -> List[Dict]:
        """Detect code duplications"""
        duplications = []
        
        # Simplified duplication detection
        hashes = {}
        
        for file_path in files:
            try:
                with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                    content = f.read()
                
                file_hash = hashlib.md5(content.encode()).hexdigest()
                rel_path = str(file_path.relative_to(self.project_root))
                
                if file_hash in hashes:
                    duplications.append({
                        "file1": hashes[file_hash],
                        "file2": rel_path,
                        "type": "exact_duplicate"
                    })
                else:
                    hashes[file_hash] = rel_path
            except:
                pass
        
        return duplications
    
    # ========================================================================
    # CONTINUOUS ANALYSIS CYCLE
    # ========================================================================
    
    def run_continuous_analysis(self, interval: int = 60):
        """Run continuous multi-layer analysis"""
        self.logger.info(f"🔄 Starting continuous analysis cycle (interval: {interval}s)")
        
        layer_num = 0
        while True:
            try:
                layer_num += 1
                self.logger.info(f"\n{'='*80}")
                self.logger.info(f"🌀 ANALYSIS CYCLE #{layer_num} - {datetime.now().isoformat()}")
                self.logger.info(f"{'='*80}\n")
                
                # Run all layers
                layer1 = self.layer1_detect_dead_files()
                self._save_report("layer1_dead_files.json", layer1)
                
                layer2 = self.layer2_detect_dead_functions()
                self._save_report("layer2_dead_functions.json", layer2)
                
                layer3 = self.layer3_build_dependency_graph()
                self._save_report("layer3_dependency_graph.json", layer3)
                
                layer4 = self.layer4_detect_cycles_and_isolation()
                self._save_report("layer4_cycles_isolation.json", layer4)
                
                layer5 = self.layer5_quality_and_duplications()
                self._save_report("layer5_quality_duplications.json", layer5)
                
                # Save consolidated state
                self.analysis_state["timestamp"] = datetime.now().isoformat()
                self.analysis_state["cycle"] = layer_num
                self._save_report("enhanced_analysis_state.json", self.analysis_state)
                
                self.logger.info(f"\n✅ Cycle #{layer_num} completed successfully")
                self.logger.info(f"⏳ Next cycle in {interval}s...\n")
                
                time.sleep(interval)
                
            except Exception as e:
                self.logger.error(f"❌ Error in analysis cycle: {e}", exc_info=True)
                time.sleep(interval)
    
    def _save_report(self, filename: str, data: Dict):
        """Save report to file"""
        try:
            report_path = self.reports_dir / filename
            with open(report_path, 'w') as f:
                json.dump(data, f, indent=2, default=str)
            
            self.logger.debug(f"💾 Saved: {filename}")
        except Exception as e:
            self.logger.error(f"❌ Failed to save {filename}: {e}")

# ============================================================================
# MAIN ENTRY POINT
# ============================================================================

def main():
    """Main entry point"""
    project_root = '/Users/dev/Documents/GitHub/atlas4/orchestrator'
    reports_dir = '/Users/dev/Documents/GitHub/atlas4/reports'
    
    analyzer = EnhancedCodemapAnalyzer(project_root, reports_dir)
    
    # Run continuous analysis in background thread
    analysis_thread = threading.Thread(
        target=analyzer.run_continuous_analysis,
        kwargs={"interval": 120},  # 2 minutes between cycles
        daemon=False
    )
    analysis_thread.start()
    
    # Keep main thread alive
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\n🛑 Stopping analyzer...")

if __name__ == '__main__':
    main()
