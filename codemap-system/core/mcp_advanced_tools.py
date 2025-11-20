#!/usr/bin/env python3
"""
ADVANCED MCP TOOLS FOR ENHANCED ANALYSIS
Powerful tools for deep code analysis, comparison, and recommendations
"""

import json
import os
from pathlib import Path
from typing import Dict, List, Any, Tuple
from collections import defaultdict
import logging
from datetime import datetime

# ============================================================================
# LOGGING
# ============================================================================

def setup_logging(log_dir: Path):
    """Setup logging"""
    log_dir.mkdir(parents=True, exist_ok=True)
    log_file = log_dir / "advanced_tools.log"
    
    logger = logging.getLogger(__name__)
    logger.setLevel(logging.DEBUG)
    logger.handlers = []
    
    from logging.handlers import RotatingFileHandler
    file_handler = RotatingFileHandler(
        log_file,
        maxBytes=10 * 1024 * 1024,
        backupCount=5,
        encoding='utf-8'
    )
    file_handler.setLevel(logging.DEBUG)
    
    formatter = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    file_handler.setFormatter(formatter)
    logger.addHandler(file_handler)
    
    return logger

# ============================================================================
# ADVANCED TOOLS
# ============================================================================

class AdvancedMCPTools:
    """Advanced analysis tools for MCP"""
    
    def __init__(self, project_root: str = "./", reports_dir: str = "./reports"):
        self.project_root = Path(project_root)
        self.reports_dir = Path(reports_dir)
        
        log_dir = self.project_root / "codemap-system" / "logs"
        self.logger = setup_logging(log_dir)
        
        self.logger.info("🚀 Advanced MCP Tools initialized")
    
    # ========================================================================
    # TOOL 1: DEEP FILE ANALYSIS
    # ========================================================================
    
    def analyze_file_deeply(self, file_path: str) -> Dict[str, Any]:
        """
        Deep analysis of a single file:
        - Dead functions
        - Imports/exports
        - Complexity
        - Dependencies
        - Quality score
        """
        self.logger.info(f"🔍 Deep analyzing: {file_path}")
        
        try:
            state = self._load_state()
            
            # Get dead functions in this file
            dead_funcs = state.get("dead_functions", {}).get(file_path, [])
            
            # Get dependencies
            relationships = state.get("relationships", {}).get(file_path, {})
            imports = relationships.get("imports", [])
            imported_by = relationships.get("imported_by", [])
            
            # Get quality metrics
            quality = state.get("quality_metrics", {}).get(file_path, {})
            
            # Calculate health score
            health_score = self._calculate_file_health(
                dead_funcs, imports, quality
            )
            
            analysis = {
                "file": file_path,
                "timestamp": datetime.now().isoformat(),
                "dead_functions": dead_funcs,
                "dead_functions_count": len(dead_funcs),
                "imports": imports,
                "imports_count": len(imports),
                "imported_by": imported_by,
                "imported_by_count": len(imported_by),
                "quality_metrics": quality,
                "health_score": health_score,
                "recommendations": self._get_file_recommendations(
                    file_path, dead_funcs, imports, quality, health_score
                )
            }
            
            return analysis
        except Exception as e:
            self.logger.error(f"❌ Error analyzing {file_path}: {e}")
            return {"error": str(e)}
    
    # ========================================================================
    # TOOL 2: COMPARE FUNCTIONS
    # ========================================================================
    
    def compare_functions(self, file1: str | None, func1: str | None, file2: str | None, func2: str | None) -> Dict[str, Any]:
        """
        Compare two functions for:
        - Similarity
        - Complexity difference
        - Quality difference
        - Which one is better
        """
        self.logger.info(f"🔄 Comparing {file1}:{func1} vs {file2}:{func2}")
        
        try:
            state = self._load_state()
            
            # Get function info from dead_functions
            dead_funcs1 = state.get("dead_functions", {}).get(file1, [])
            dead_funcs2 = state.get("dead_functions", {}).get(file2, [])
            
            func1_info = next((f for f in dead_funcs1 if f["name"] == func1), None)
            func2_info = next((f for f in dead_funcs2 if f["name"] == func2), None)
            
            if not func1_info or not func2_info:
                return {"error": "One or both functions not found"}
            
            # Compare metrics
            comparison = {
                "function1": {
                    "file": file1,
                    "name": func1,
                    "complexity": func1_info.get("complexity", 0),
                    "lines": func1_info.get("loc", 0),
                    "is_dead": True
                },
                "function2": {
                    "file": file2,
                    "name": func2,
                    "complexity": func2_info.get("complexity", 0),
                    "lines": func2_info.get("loc", 0),
                    "is_dead": True
                },
                "comparison": {
                    "complexity_diff": func2_info.get("complexity", 0) - func1_info.get("complexity", 0),
                    "lines_diff": func2_info.get("loc", 0) - func1_info.get("loc", 0),
                    "better_candidate": self._determine_better_function(func1_info, func2_info),
                    "reason": self._get_comparison_reason(func1_info, func2_info)
                }
            }
            
            return comparison
        except Exception as e:
            self.logger.error(f"❌ Error comparing functions: {e}")
            return {"error": str(e)}
    
    # ========================================================================
    # TOOL 3: FIND DUPLICATES
    # ========================================================================
    
    def find_duplicates_in_directory(self, directory: str) -> Dict[str, Any]:
        """
        Find duplicate files and functions in a directory
        """
        self.logger.info(f"🔍 Finding duplicates in: {directory}")
        
        try:
            state = self._load_state()
            duplications = state.get("duplications", [])
            
            # Filter by directory
            dir_duplicates = [
                d for d in duplications
                if directory in d.get("file1", "") or directory in d.get("file2", "")
            ]
            
            return {
                "directory": directory,
                "duplicates_found": len(dir_duplicates),
                "duplicates": dir_duplicates[:50],  # First 50
                "summary": {
                    "exact_duplicates": len([d for d in dir_duplicates if d.get("type") == "exact_duplicate"]),
                    "semantic_duplicates": len([d for d in dir_duplicates if d.get("type") == "semantic_duplicate"])
                }
            }
        except Exception as e:
            self.logger.error(f"❌ Error finding duplicates: {e}")
            return {"error": str(e)}
    
    # ========================================================================
    # TOOL 4: IMPACT ANALYSIS
    # ========================================================================
    
    def analyze_impact(self, file_path: str) -> Dict[str, Any]:
        """
        Analyze impact of changes to a file:
        - What depends on it
        - What it depends on
        - Cascade effect
        """
        self.logger.info(f"📊 Analyzing impact of: {file_path}")
        
        try:
            state = self._load_state()
            relationships = state.get("relationships", {})
            
            file_rels = relationships.get(file_path, {})
            imports = file_rels.get("imports", [])
            imported_by = file_rels.get("imported_by", [])
            
            # Calculate cascade depth
            cascade_depth = self._calculate_cascade_depth(
                file_path, relationships, depth=0
            )
            
            impact = {
                "file": file_path,
                "direct_dependencies": len(imports),
                "direct_dependents": len(imported_by),
                "cascade_depth": cascade_depth,
                "total_affected": len(imports) + len(imported_by),
                "imports": imports[:20],
                "imported_by": imported_by[:20],
                "risk_level": self._calculate_risk_level(
                    len(imports), len(imported_by), cascade_depth
                ),
                "recommendation": self._get_impact_recommendation(
                    len(imports), len(imported_by), cascade_depth
                )
            }
            
            return impact
        except Exception as e:
            self.logger.error(f"❌ Error analyzing impact: {e}")
            return {"error": str(e)}
    
    # ========================================================================
    # TOOL 5: CLASSIFY FILES
    # ========================================================================
    
    def classify_files(self, directory: str = "") -> Dict[str, Any]:
        """
        Classify all files in directory:
        - Active (used, no dead code)
        - Candidates for archival (dead, not imported)
        - Needs cleanup (has dead code but used)
        - Critical (many dependents)
        """
        self.logger.info(f"📂 Classifying files in: {directory or 'root'}")
        
        try:
            state = self._load_state()
            dead_files = state.get("dead_files", [])
            dead_functions = state.get("dead_functions", {})
            relationships = state.get("relationships", {})
            
            classification = {
                "directory": directory,
                "timestamp": datetime.now().isoformat(),
                "categories": {
                    "active": [],
                    "candidates_for_archival": [],
                    "needs_cleanup": [],
                    "critical": []
                }
            }
            
            # Classify dead files
            for dead_file in dead_files:
                file_path = dead_file["file"]
                if directory and directory not in file_path:
                    continue
                
                classification["categories"]["candidates_for_archival"].append({
                    "file": file_path,
                    "reason": "No imports, not imported",
                    "size": dead_file.get("size", 0)
                })
            
            # Classify files with dead functions
            for file_path, dead_funcs in dead_functions.items():
                if directory and directory not in file_path:
                    continue
                
                file_rels = relationships.get(file_path, {})
                imported_by_count = len(file_rels.get("imported_by", []))
                
                if imported_by_count > 5:
                    classification["categories"]["critical"].append({
                        "file": file_path,
                        "dead_functions": len(dead_funcs),
                        "dependents": imported_by_count,
                        "reason": "Critical file with many dependents"
                    })
                else:
                    classification["categories"]["needs_cleanup"].append({
                        "file": file_path,
                        "dead_functions": len(dead_funcs),
                        "dependents": imported_by_count
                    })
            
            return classification
        except Exception as e:
            self.logger.error(f"❌ Error classifying files: {e}")
            return {"error": str(e)}
    
    # ========================================================================
    # TOOL 6: GENERATE REFACTORING PLAN
    # ========================================================================
    
    def generate_refactoring_plan(self, priority: str = "high") -> Dict[str, Any]:
        """
        Generate refactoring plan based on analysis:
        - Priority: high, medium, low
        - Phases: 1, 2, 3
        - Actions: remove, consolidate, extract
        """
        self.logger.info(f"📋 Generating refactoring plan (priority: {priority})")
        
        try:
            state = self._load_state()
            dead_files = state.get("dead_files", [])
            dead_functions = state.get("dead_functions", {})
            cycles = state.get("cycles", [])
            
            plan = {
                "priority": priority,
                "timestamp": datetime.now().isoformat(),
                "phases": {
                    "phase_1_quick_wins": [],
                    "phase_2_medium": [],
                    "phase_3_complex": []
                },
                "summary": {
                    "total_dead_files": len(dead_files),
                    "total_dead_functions": sum(len(v) for v in dead_functions.values()),
                    "total_cycles": len(cycles)
                }
            }
            
            # Phase 1: Quick wins (dead files)
            for dead_file in dead_files[:10]:
                plan["phases"]["phase_1_quick_wins"].append({
                    "action": "REMOVE",
                    "file": dead_file["file"],
                    "reason": "Dead file (no imports, not imported)",
                    "effort": "LOW",
                    "risk": "LOW"
                })
            
            # Phase 2: Medium (files with dead functions)
            for file_path, dead_funcs in list(dead_functions.items())[:10]:
                if len(dead_funcs) > 0:
                    plan["phases"]["phase_2_medium"].append({
                        "action": "CLEANUP",
                        "file": file_path,
                        "dead_functions": len(dead_funcs),
                        "effort": "MEDIUM",
                        "risk": "MEDIUM"
                    })
            
            # Phase 3: Complex (cycles, consolidation)
            for cycle in cycles[:5]:
                plan["phases"]["phase_3_complex"].append({
                    "action": "REFACTOR",
                    "type": "BREAK_CYCLE",
                    "cycle": cycle,
                    "effort": "HIGH",
                    "risk": "HIGH"
                })
            
            return plan
        except Exception as e:
            self.logger.error(f"❌ Error generating plan: {e}")
            return {"error": str(e)}
    
    # ========================================================================
    # TOOL 7: DEPENDENCY VISUALIZATION
    # ========================================================================
    
    def visualize_dependencies(self, file_path: str, depth: int = 2) -> Dict[str, Any]:
        """
        Generate dependency visualization data for a file
        """
        self.logger.info(f"🎨 Visualizing dependencies for: {file_path}")
        
        try:
            state = self._load_state()
            graph = state.get("dependency_graph", {})
            relationships = state.get("relationships", {})
            
            # Build visualization tree
            nodes = []
            edges = []
            visited = set()
            
            def build_tree(current_file, current_depth, parent_id=None):
                if current_depth > depth or current_file in visited:
                    return
                
                visited.add(current_file)
                node_id = current_file.replace("/", "_").replace(".", "_")
                
                nodes.append({
                    "id": node_id,
                    "label": Path(current_file).name,
                    "file": current_file,
                    "depth": current_depth
                })
                
                if parent_id:
                    edges.append({
                        "source": parent_id,
                        "target": node_id,
                        "type": "imports"
                    })
                
                # Add dependencies
                for dep in graph.get(current_file, [])[:5]:
                    build_tree(dep, current_depth + 1, node_id)
            
            build_tree(file_path, 0)
            
            return {
                "file": file_path,
                "depth": depth,
                "nodes": nodes,
                "edges": edges,
                "format": "cytoscape",
                "layout": "breadthfirst"
            }
        except Exception as e:
            self.logger.error(f"❌ Error visualizing: {e}")
            return {"error": str(e)}
    
    # ========================================================================
    # HELPER METHODS
    # ========================================================================
    
    def _load_state(self) -> Dict[str, Any]:
        """Load analysis state"""
        state_path = self.reports_dir / "enhanced_analysis_state.json"
        if state_path.exists():
            with open(state_path, 'r') as f:
                return json.load(f)
        return {}
    
    def _calculate_file_health(self, dead_funcs: List, imports: List, quality: Dict) -> float:
        """Calculate file health score (0-100)"""
        score = 100.0
        
        # Deduct for dead functions
        score -= len(dead_funcs) * 5
        
        # Deduct for high complexity
        complexity = quality.get("complexity", 0)
        score -= min(complexity * 0.5, 20)
        
        # Bonus for good documentation
        comments = quality.get("comments", 0)
        score += min(comments * 0.1, 10)
        
        return max(0, min(100, score))
    
    def _get_file_recommendations(self, file_path: str, dead_funcs: List, 
                                  imports: List, quality: Dict, health: float) -> List[str]:
        """Get recommendations for a file"""
        recommendations = []
        
        if health < 30:
            recommendations.append("🔴 CRITICAL: File needs major cleanup")
        elif health < 60:
            recommendations.append("🟡 WARNING: File has significant issues")
        
        if len(dead_funcs) > 5:
            recommendations.append(f"Remove {len(dead_funcs)} dead functions")
        
        if quality.get("complexity", 0) > 20:
            recommendations.append("Reduce cyclomatic complexity")
        
        if len(imports) > 10:
            recommendations.append("Too many dependencies - consider refactoring")
        
        if quality.get("comments", 0) == 0:
            recommendations.append("Add documentation/comments")
        
        return recommendations
    
    def _determine_better_function(self, func1: Dict, func2: Dict) -> str:
        """Determine which function is better"""
        complexity1 = func1.get("complexity", 0)
        complexity2 = func2.get("complexity", 0)
        loc1 = func1.get("loc", 0)
        loc2 = func2.get("loc", 0)
        
        # Lower complexity and LOC is better
        score1 = complexity1 + (loc1 * 0.1)
        score2 = complexity2 + (loc2 * 0.1)
        
        return "function1" if score1 < score2 else "function2"
    
    def _get_comparison_reason(self, func1: Dict, func2: Dict) -> str:
        """Get reason for comparison"""
        better = self._determine_better_function(func1, func2)
        
        if better == "function1":
            return f"Function 1 has lower complexity ({func1.get('complexity', 0)} vs {func2.get('complexity', 0)})"
        else:
            return f"Function 2 has lower complexity ({func2.get('complexity', 0)} vs {func1.get('complexity', 0)})"
    
    def _calculate_cascade_depth(self, file_path: str, relationships: Dict, depth: int = 0) -> int:
        """Calculate cascade depth"""
        if depth > 10:  # Prevent infinite recursion
            return depth
        
        file_rels = relationships.get(file_path, {})
        imports = file_rels.get("imports", [])
        
        if not imports:
            return depth
        
        max_depth = depth
        for imp in imports[:3]:  # Check first 3
            imp_depth = self._calculate_cascade_depth(imp, relationships, depth + 1)
            max_depth = max(max_depth, imp_depth)
        
        return max_depth
    
    def _calculate_risk_level(self, imports: int, imported_by: int, cascade_depth: int) -> str:
        """Calculate risk level"""
        risk_score = (imports * 0.3) + (imported_by * 0.5) + (cascade_depth * 0.2)
        
        if risk_score > 15:
            return "CRITICAL"
        elif risk_score > 10:
            return "HIGH"
        elif risk_score > 5:
            return "MEDIUM"
        else:
            return "LOW"
    
    def _get_impact_recommendation(self, imports: int, imported_by: int, cascade_depth: int) -> str:
        """Get impact recommendation"""
        risk = self._calculate_risk_level(imports, imported_by, cascade_depth)
        
        if risk == "CRITICAL":
            return "⛔ DO NOT MODIFY - Too many dependencies"
        elif risk == "HIGH":
            return "⚠️ MODIFY WITH CAUTION - High impact"
        elif risk == "MEDIUM":
            return "✓ Can modify - Medium impact"
        else:
            return "✓ Safe to modify - Low impact"

# ============================================================================
# MAIN
# ============================================================================

def main():
    """Main entry point"""
    project_root = '/Users/dev/Documents/GitHub/atlas4'
    reports_dir = '/Users/dev/Documents/GitHub/atlas4/reports'
    
    tools = AdvancedMCPTools(project_root, reports_dir)
    
    print("✅ Advanced MCP Tools ready")
    print(f"📊 Tools available:")
    print(f"   - analyze_file_deeply(file_path)")
    print(f"   - compare_functions(file1, func1, file2, func2)")
    print(f"   - find_duplicates_in_directory(directory)")
    print(f"   - analyze_impact(file_path)")
    print(f"   - classify_files(directory)")
    print(f"   - generate_refactoring_plan(priority)")
    print(f"   - visualize_dependencies(file_path, depth)")

if __name__ == '__main__':
    main()
