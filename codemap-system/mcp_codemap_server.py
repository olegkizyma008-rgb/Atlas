#!/usr/bin/env python3
"""
MCP Server for Codemap - Real-time integration with Windsurf Cascade
Provides tools and resources for automatic code analysis and context awareness
"""

import json
import os
import sys
import asyncio
from pathlib import Path
from typing import Any, Dict, List, Optional
from datetime import datetime
import logging

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class CodemapMCPServer:
    """MCP Server for Codemap integration with Cascade"""
    
    def __init__(self, project_root: str = "./"):
        self.project_root = Path(project_root)
        self.reports_dir = self.project_root / "reports"
        self.cache = {}
        self.last_update = {}
        logger.info(f"Initialized CodemapMCPServer for {self.project_root}")
    
    # ========== RESOURCES ==========
    # Resources are static data that Cascade can access
    
    def get_resources(self) -> List[Dict[str, str]]:
        """List all available resources"""
        resources = [
            {
                "uri": "codemap://analysis/summary",
                "name": "CodeMap Summary",
                "description": "Latest code analysis summary with metrics and issues"
            },
            {
                "uri": "codemap://analysis/dead-code",
                "name": "Dead Code Report",
                "description": "Detected unused functions, variables, and imports"
            },
            {
                "uri": "codemap://analysis/cycles",
                "name": "Circular Dependencies",
                "description": "Detected circular dependencies in the project"
            },
            {
                "uri": "codemap://analysis/complexity",
                "name": "Complexity Metrics",
                "description": "Code complexity and dependency metrics"
            },
            {
                "uri": "codemap://analysis/full",
                "name": "Full Analysis",
                "description": "Complete analysis data including all metrics and issues"
            },
            {
                "uri": "codemap://project/structure",
                "name": "Project Structure",
                "description": "Project structure and file organization"
            },
            {
                "uri": "codemap://project/dependencies",
                "name": "Dependency Graph",
                "description": "Complete dependency graph of the project"
            },
            {
                "uri": "codemap://recommendations/refactoring",
                "name": "Refactoring Recommendations",
                "description": "Prioritized refactoring suggestions based on analysis"
            },
            {
                "uri": "codemap://recommendations/testing",
                "name": "Testing Recommendations",
                "description": "Recommendations for test coverage and improvements"
            },
            {
                "uri": "codemap://recommendations/security",
                "name": "Security Analysis",
                "description": "Security concerns and recommendations"
            },
            {
                "uri": "codemap://recommendations/performance",
                "name": "Performance Analysis",
                "description": "Performance bottlenecks and optimization opportunities"
            }
        ]
        return resources
    
    def read_resource(self, uri: str) -> str:
        """Read a resource by URI"""
        logger.info(f"Reading resource: {uri}")
        
        if uri == "codemap://analysis/summary":
            return self._get_summary()
        elif uri == "codemap://analysis/dead-code":
            return self._get_dead_code()
        elif uri == "codemap://analysis/cycles":
            return self._get_cycles()
        elif uri == "codemap://analysis/complexity":
            return self._get_complexity()
        elif uri == "codemap://analysis/full":
            return self._get_full_analysis()
        elif uri == "codemap://project/structure":
            return self._get_project_structure()
        elif uri == "codemap://project/dependencies":
            return self._get_dependencies()
        elif uri == "codemap://recommendations/refactoring":
            return self._get_refactoring_recommendations()
        elif uri == "codemap://recommendations/testing":
            return self._get_testing_recommendations()
        elif uri == "codemap://recommendations/security":
            return self._get_security_analysis()
        elif uri == "codemap://recommendations/performance":
            return self._get_performance_analysis()
        else:
            return json.dumps({"error": f"Unknown resource: {uri}"})
    
    def _load_json_report(self, filename: str) -> Dict[str, Any]:
        """Load JSON report from reports directory"""
        report_path = self.reports_dir / filename
        if report_path.exists():
            try:
                with open(report_path, 'r') as f:
                    return json.load(f)
            except Exception as e:
                logger.error(f"Error loading {filename}: {e}")
                return {}
        return {}
    
    def _load_markdown_report(self, filename: str) -> str:
        """Load Markdown report from reports directory"""
        report_path = self.reports_dir / filename
        if report_path.exists():
            try:
                with open(report_path, 'r') as f:
                    return f.read()
            except Exception as e:
                logger.error(f"Error loading {filename}: {e}")
                return f"Error loading report: {e}"
        return f"Report not found: {filename}"
    
    def _get_summary(self) -> str:
        """Get analysis summary"""
        data = self._load_json_report("codemap_analysis.json")
        if not data:
            return json.dumps({"status": "No analysis data available yet"})
        
        summary = {
            "timestamp": data.get("timestamp"),
            "project": data.get("project"),
            "files_analyzed": data.get("files_analyzed"),
            "total_functions": data.get("total_functions"),
            "total_imports": data.get("total_imports"),
            "dependency_graph": data.get("dependency_graph"),
            "dead_code_count": {
                "functions": len(data.get("dead_code", {}).get("functions", [])),
                "private_methods": len(data.get("dead_code", {}).get("private_methods", [])),
                "imports": len(data.get("dead_code", {}).get("imports", []))
            },
            "cycles_count": len(data.get("cycles", [])),
            "complexity_metrics": data.get("complexity_metrics")
        }
        return json.dumps(summary, indent=2, default=str)
    
    def _get_dead_code(self) -> str:
        """Get dead code report"""
        data = self._load_json_report("codemap_analysis.json")
        if not data:
            return json.dumps({"status": "No analysis data available yet"})
        
        dead_code = data.get("dead_code", {})
        return json.dumps({
            "unused_functions": dead_code.get("functions", [])[:50],
            "unused_private_methods": dead_code.get("private_methods", [])[:50],
            "unused_imports": dead_code.get("imports", [])[:50],
            "total_unused_functions": len(dead_code.get("functions", [])),
            "total_unused_private_methods": len(dead_code.get("private_methods", [])),
            "total_unused_imports": len(dead_code.get("imports", []))
        }, indent=2, default=str)
    
    def _get_cycles(self) -> str:
        """Get circular dependencies"""
        data = self._load_json_report("codemap_analysis.json")
        if not data:
            return json.dumps({"status": "No analysis data available yet"})
        
        cycles = data.get("cycles", [])
        return json.dumps({
            "cycles": cycles[:20],
            "total_cycles": len(cycles),
            "note": "Showing first 20 cycles" if len(cycles) > 20 else ""
        }, indent=2, default=str)
    
    def _get_complexity(self) -> str:
        """Get complexity metrics"""
        data = self._load_json_report("codemap_analysis.json")
        if not data:
            return json.dumps({"status": "No analysis data available yet"})
        
        return json.dumps({
            "complexity_metrics": data.get("complexity_metrics", {}),
            "dependency_graph": data.get("dependency_graph", {})
        }, indent=2, default=str)
    
    def _get_full_analysis(self) -> str:
        """Get full analysis data"""
        data = self._load_json_report("codemap_analysis.json")
        if not data:
            return json.dumps({"status": "No analysis data available yet"})
        return json.dumps(data, indent=2, default=str)
    
    def _get_project_structure(self) -> str:
        """Get project structure"""
        structure = {
            "root": str(self.project_root),
            "reports_dir": str(self.reports_dir),
            "exists": self.project_root.exists(),
            "reports_exist": self.reports_dir.exists()
        }
        
        # List main directories
        if self.project_root.exists():
            dirs = []
            for item in self.project_root.iterdir():
                if item.is_dir() and not item.name.startswith('.'):
                    dirs.append(item.name)
            structure["main_directories"] = sorted(dirs)[:20]
        
        return json.dumps(structure, indent=2)
    
    def _get_dependencies(self) -> str:
        """Get dependency graph"""
        data = self._load_json_report("codemap_analysis.json")
        if not data:
            return json.dumps({"status": "No analysis data available yet"})
        
        return json.dumps({
            "file_imports": data.get("file_imports", {}),
            "dependency_edges": data.get("dependency_edges", [])[:100],
            "total_edges": len(data.get("dependency_edges", [])),
            "note": "Showing first 100 edges" if len(data.get("dependency_edges", [])) > 100 else ""
        }, indent=2, default=str)
    
    # ========== TOOLS ==========
    # Tools are functions that Cascade can call
    
    def get_tools(self) -> List[Dict[str, Any]]:
        """List all available tools"""
        return [
            {
                "name": "analyze_file",
                "description": "Analyze a specific file for dependencies and issues",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "file_path": {
                            "type": "string",
                            "description": "Path to the file to analyze (relative to project root)"
                        }
                    },
                    "required": ["file_path"]
                }
            },
            {
                "name": "find_dead_code_in_file",
                "description": "Find dead code in a specific file",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "file_path": {
                            "type": "string",
                            "description": "Path to the file to analyze"
                        }
                    },
                    "required": ["file_path"]
                }
            },
            {
                "name": "get_file_dependencies",
                "description": "Get all dependencies of a specific file",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "file_path": {
                            "type": "string",
                            "description": "Path to the file"
                        }
                    },
                    "required": ["file_path"]
                }
            },
            {
                "name": "find_dependent_files",
                "description": "Find all files that depend on a specific file",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "file_path": {
                            "type": "string",
                            "description": "Path to the file"
                        }
                    },
                    "required": ["file_path"]
                }
            },
            {
                "name": "get_complexity_report",
                "description": "Get complexity report for the project or specific file",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "file_path": {
                            "type": "string",
                            "description": "Optional: specific file path. If empty, returns project-wide metrics"
                        }
                    }
                }
            },
            {
                "name": "find_cycles",
                "description": "Find circular dependencies in the project",
                "inputSchema": {
                    "type": "object",
                    "properties": {}
                }
            },
            {
                "name": "get_refactoring_suggestions",
                "description": "Get refactoring suggestions based on analysis",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "file_path": {
                            "type": "string",
                            "description": "Optional: specific file path"
                        }
                    }
                }
            },
            {
                "name": "get_analysis_status",
                "description": "Get current analysis status and last update time",
                "inputSchema": {
                    "type": "object",
                    "properties": {}
                }
            },
            {
                "name": "get_context_recommendations",
                "description": "Get context-aware recommendations based on current file being edited",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "file_path": {
                            "type": "string",
                            "description": "Path to the file being edited"
                        },
                        "context_type": {
                            "type": "string",
                            "enum": ["refactoring", "testing", "security", "performance"],
                            "description": "Type of recommendations to focus on"
                        }
                    },
                    "required": ["file_path"]
                }
            },
            {
                "name": "analyze_code_quality",
                "description": "Analyze code quality for a specific file or module",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "file_path": {
                            "type": "string",
                            "description": "Path to analyze"
                        }
                    },
                    "required": ["file_path"]
                }
            },
            {
                "name": "get_module_health",
                "description": "Get overall health score and metrics for a module",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "file_path": {
                            "type": "string",
                            "description": "Path to the module"
                        }
                    },
                    "required": ["file_path"]
                }
            }
        ]
    
    def call_tool(self, name: str, arguments: Dict[str, Any]) -> str:
        """Call a tool by name"""
        logger.info(f"Calling tool: {name} with arguments: {arguments}")
        
        if name == "analyze_file":
            return self._analyze_file(arguments.get("file_path", ""))
        elif name == "find_dead_code_in_file":
            return self._find_dead_code_in_file(arguments.get("file_path", ""))
        elif name == "get_file_dependencies":
            return self._get_file_dependencies(arguments.get("file_path", ""))
        elif name == "find_dependent_files":
            return self._find_dependent_files(arguments.get("file_path", ""))
        elif name == "get_complexity_report":
            return self._get_complexity_report(arguments.get("file_path", ""))
        elif name == "find_cycles":
            return self._find_cycles()
        elif name == "get_refactoring_suggestions":
            return self._get_refactoring_suggestions(arguments.get("file_path", ""))
        elif name == "get_analysis_status":
            return self._get_analysis_status()
        elif name == "get_context_recommendations":
            return self._get_context_recommendations(
                arguments.get("file_path", ""),
                arguments.get("context_type", "refactoring")
            )
        elif name == "analyze_code_quality":
            return self._analyze_code_quality(arguments.get("file_path", ""))
        elif name == "get_module_health":
            return self._get_module_health(arguments.get("file_path", ""))
        else:
            return json.dumps({"error": f"Unknown tool: {name}"})
    
    def _analyze_file(self, file_path: str) -> str:
        """Analyze a specific file"""
        data = self._load_json_report("codemap_analysis.json")
        if not data:
            return json.dumps({"error": "No analysis data available"})
        
        file_imports = data.get("file_imports", {})
        func_defs = data.get("function_definitions", {})
        
        result = {
            "file": file_path,
            "imports": file_imports.get(file_path, []),
            "functions": func_defs.get(file_path, {}),
            "found": file_path in file_imports or file_path in func_defs
        }
        return json.dumps(result, indent=2, default=str)
    
    def _find_dead_code_in_file(self, file_path: str) -> str:
        """Find dead code in a specific file"""
        data = self._load_json_report("codemap_analysis.json")
        if not data:
            return json.dumps({"error": "No analysis data available"})
        
        dead_code = data.get("dead_code", {})
        file_dead_code = {
            "unused_functions": [
                item for item in dead_code.get("functions", [])
                if item.get("file") == file_path
            ],
            "unused_private_methods": [
                item for item in dead_code.get("private_methods", [])
                if item.get("file") == file_path
            ]
        }
        return json.dumps(file_dead_code, indent=2, default=str)
    
    def _get_file_dependencies(self, file_path: str) -> str:
        """Get dependencies of a file"""
        data = self._load_json_report("codemap_analysis.json")
        if not data:
            return json.dumps({"error": "No analysis data available"})
        
        file_imports = data.get("file_imports", {})
        return json.dumps({
            "file": file_path,
            "dependencies": file_imports.get(file_path, [])
        }, indent=2, default=str)
    
    def _find_dependent_files(self, file_path: str) -> str:
        """Find files that depend on this file"""
        data = self._load_json_report("codemap_analysis.json")
        if not data:
            return json.dumps({"error": "No analysis data available"})
        
        file_imports = data.get("file_imports", {})
        dependents = []
        
        for file_key, imports in file_imports.items():
            if any(file_path in imp for imp in imports):
                dependents.append(file_key)
        
        return json.dumps({
            "file": file_path,
            "dependent_files": dependents
        }, indent=2, default=str)
    
    def _get_complexity_report(self, file_path: str = "") -> str:
        """Get complexity report"""
        data = self._load_json_report("codemap_analysis.json")
        if not data:
            return json.dumps({"error": "No analysis data available"})
        
        if file_path:
            func_defs = data.get("function_definitions", {})
            functions = func_defs.get(file_path, {})
            return json.dumps({
                "file": file_path,
                "functions": functions,
                "function_count": len(functions)
            }, indent=2, default=str)
        else:
            return json.dumps({
                "project_metrics": data.get("complexity_metrics", {}),
                "dependency_graph": data.get("dependency_graph", {})
            }, indent=2, default=str)
    
    def _find_cycles(self) -> str:
        """Find circular dependencies"""
        data = self._load_json_report("codemap_analysis.json")
        if not data:
            return json.dumps({"error": "No analysis data available"})
        
        cycles = data.get("cycles", [])
        return json.dumps({
            "cycles": cycles,
            "total": len(cycles),
            "severity": "high" if len(cycles) > 5 else "medium" if len(cycles) > 0 else "low"
        }, indent=2, default=str)
    
    def _get_refactoring_suggestions(self, file_path: str = "") -> str:
        """Get refactoring suggestions"""
        data = self._load_json_report("codemap_analysis.json")
        if not data:
            return json.dumps({"error": "No analysis data available"})
        
        suggestions = []
        priority = 1
        
        # Circular dependency suggestions (highest priority)
        cycles = data.get('cycles', [])
        if cycles:
            suggestions.append({
                "priority": priority,
                "type": "circular_dependency",
                "severity": "high",
                "message": f"Found {len(cycles)} circular dependencies",
                "action": "Extract common code to separate module"
            })
            priority += 1
        
        # Dead code suggestions
        dead_code = data.get('dead_code', {})
        if dead_code.get('functions'):
            suggestions.append({
                "priority": priority,
                "type": "dead_code",
                "severity": "medium",
                "message": f"Found {len(dead_code['functions'])} unused functions",
                "action": "Consider removing or refactoring"
            })
            priority += 1
        
        # Complexity suggestions
        metrics = data.get('complexity_metrics', {})
        if metrics.get('average_imports_per_file', 0) > 10:
            suggestions.append({
                "priority": priority,
                "type": "high_coupling",
                "severity": "medium",
                "message": f"High average imports per file: {metrics['average_imports_per_file']:.2f}",
                "action": "Consider breaking down modules"
            })
        
        return json.dumps({
            "suggestions": suggestions,
            "total": len(suggestions)
        }, indent=2, default=str)
    
    def _get_refactoring_recommendations(self) -> str:
        """Get comprehensive refactoring recommendations"""
        data = self._load_json_report("codemap_analysis.json")
        if not data:
            return json.dumps({"error": "No analysis data available"})
        
        recommendations = []
        
        # 1. Circular dependencies (highest priority)
        cycles = data.get('cycles', [])
        if cycles:
            recommendations.append({
                "priority": 1,
                "category": "Architecture",
                "severity": "critical",
                "title": "Circular Dependencies Detected",
                "count": len(cycles),
                "description": f"Found {len(cycles)} circular dependencies in the codebase",
                "impact": "Increases coupling, makes testing harder, complicates refactoring",
                "actions": [
                    "Extract shared code to a new module",
                    "Use dependency injection",
                    "Consider event-driven architecture",
                    "Break circular imports"
                ]
            })
        
        # 2. Dead code
        dead_code = data.get('dead_code', {})
        unused_funcs = len(dead_code.get('functions', []))
        if unused_funcs > 0:
            recommendations.append({
                "priority": 2,
                "category": "Code Quality",
                "severity": "high",
                "title": "Unused Functions",
                "count": unused_funcs,
                "description": f"Found {unused_funcs} unused functions",
                "impact": "Increases maintenance burden, confuses developers",
                "actions": [
                    "Remove unused functions",
                    "Document why functions are kept if needed",
                    "Add deprecation warnings",
                    "Create tests for functions before removal"
                ]
            })
        
        # 3. High coupling
        metrics = data.get('complexity_metrics', {})
        avg_imports = metrics.get('average_imports_per_file', 0)
        if avg_imports > 8:
            recommendations.append({
                "priority": 3,
                "category": "Architecture",
                "severity": "medium",
                "title": "High Module Coupling",
                "metric": f"{avg_imports:.2f} imports per file",
                "description": f"Average {avg_imports:.2f} imports per file (threshold: 8)",
                "impact": "Difficult to test, changes propagate widely",
                "actions": [
                    "Break down large modules",
                    "Extract interfaces/abstractions",
                    "Use facade pattern",
                    "Consider monorepo structure"
                ]
            })
        
        # 4. Large dependency graph
        dep_graph = data.get('dependency_graph', {})
        edges = dep_graph.get('edges', 0)
        if edges > 500:
            recommendations.append({
                "priority": 4,
                "category": "Architecture",
                "severity": "medium",
                "title": "Complex Dependency Graph",
                "metric": f"{edges} dependencies",
                "description": f"Project has {edges} dependencies",
                "impact": "Hard to understand system architecture",
                "actions": [
                    "Document architecture layers",
                    "Create dependency diagrams",
                    "Establish clear module boundaries",
                    "Use layered architecture"
                ]
            })
        
        return json.dumps({
            "recommendations": recommendations,
            "total": len(recommendations),
            "generated_at": datetime.now().isoformat()
        }, indent=2, default=str)
    
    def _get_testing_recommendations(self) -> str:
        """Get testing recommendations"""
        data = self._load_json_report("codemap_analysis.json")
        if not data:
            return json.dumps({"error": "No analysis data available"})
        
        recommendations = []
        
        # 1. Test high-coupling modules
        metrics = data.get('complexity_metrics', {})
        avg_imports = metrics.get('average_imports_per_file', 0)
        if avg_imports > 5:
            recommendations.append({
                "priority": 1,
                "type": "unit_testing",
                "title": "Increase Unit Test Coverage for High-Coupling Modules",
                "reason": f"High coupling ({avg_imports:.2f} avg imports) makes testing critical",
                "suggestions": [
                    "Use dependency injection for testability",
                    "Mock external dependencies",
                    "Test edge cases thoroughly",
                    "Use contract testing for interfaces"
                ]
            })
        
        # 2. Test functions with many dependencies
        dead_code = data.get('dead_code', {})
        total_funcs = data.get('total_functions', 0)
        if total_funcs > 100:
            recommendations.append({
                "priority": 2,
                "type": "integration_testing",
                "title": "Add Integration Tests",
                "reason": f"Large codebase ({total_funcs} functions) needs integration tests",
                "suggestions": [
                    "Test module interactions",
                    "Test data flow between modules",
                    "Test error handling paths",
                    "Use end-to-end tests for critical flows"
                ]
            })
        
        # 3. Test dead code removal
        unused_funcs = len(dead_code.get('functions', []))
        if unused_funcs > 10:
            recommendations.append({
                "priority": 3,
                "type": "regression_testing",
                "title": "Add Tests Before Removing Dead Code",
                "reason": f"Found {unused_funcs} unused functions - ensure safe removal",
                "suggestions": [
                    "Create tests for functions before removal",
                    "Use git history to understand why code exists",
                    "Check for indirect usage patterns",
                    "Run full test suite after removal"
                ]
            })
        
        return json.dumps({
            "recommendations": recommendations,
            "total": len(recommendations),
            "generated_at": datetime.now().isoformat()
        }, indent=2, default=str)
    
    def _get_security_analysis(self) -> str:
        """Get security analysis and recommendations"""
        data = self._load_json_report("codemap_analysis.json")
        if not data:
            return json.dumps({"error": "No analysis data available"})
        
        concerns = []
        
        # 1. Circular dependencies can hide security issues
        cycles = data.get('cycles', [])
        if cycles:
            concerns.append({
                "severity": "high",
                "type": "architecture",
                "title": "Circular Dependencies May Hide Security Issues",
                "description": "Circular dependencies make code harder to audit and test",
                "recommendation": "Resolve circular dependencies to improve auditability"
            })
        
        # 2. Dead code can hide vulnerabilities
        dead_code = data.get('dead_code', {})
        unused_funcs = len(dead_code.get('functions', []))
        if unused_funcs > 20:
            concerns.append({
                "severity": "medium",
                "type": "code_quality",
                "title": "Dead Code May Hide Vulnerabilities",
                "description": f"Found {unused_funcs} unused functions - hard to audit",
                "recommendation": "Remove dead code to reduce attack surface"
            })
        
        # 3. High coupling increases vulnerability propagation
        metrics = data.get('complexity_metrics', {})
        avg_imports = metrics.get('average_imports_per_file', 0)
        if avg_imports > 10:
            concerns.append({
                "severity": "medium",
                "type": "architecture",
                "title": "High Coupling Increases Vulnerability Propagation",
                "description": f"High coupling ({avg_imports:.2f} avg imports) means vulnerabilities spread",
                "recommendation": "Reduce coupling through better architecture"
            })
        
        return json.dumps({
            "concerns": concerns,
            "total": len(concerns),
            "generated_at": datetime.now().isoformat()
        }, indent=2, default=str)
    
    def _get_performance_analysis(self) -> str:
        """Get performance analysis and optimization opportunities"""
        data = self._load_json_report("codemap_analysis.json")
        if not data:
            return json.dumps({"error": "No analysis data available"})
        
        opportunities = []
        
        # 1. Dead code removal improves performance
        dead_code = data.get('dead_code', {})
        unused_funcs = len(dead_code.get('functions', []))
        if unused_funcs > 0:
            opportunities.append({
                "priority": 1,
                "type": "code_cleanup",
                "title": "Remove Dead Code for Faster Builds",
                "description": f"Found {unused_funcs} unused functions",
                "impact": "Reduces build time, improves IDE responsiveness",
                "actions": [
                    "Remove unused functions",
                    "Remove unused imports",
                    "Clean up unused variables"
                ]
            })
        
        # 2. Reduce coupling for better caching
        metrics = data.get('complexity_metrics', {})
        avg_imports = metrics.get('average_imports_per_file', 0)
        if avg_imports > 8:
            opportunities.append({
                "priority": 2,
                "type": "architecture",
                "title": "Reduce Coupling for Better Caching",
                "description": f"High coupling ({avg_imports:.2f} avg imports) prevents caching",
                "impact": "Enables better build caching, faster incremental builds",
                "actions": [
                    "Break down large modules",
                    "Create clear module boundaries",
                    "Use lazy loading where possible"
                ]
            })
        
        # 3. Optimize large dependency graph
        dep_graph = data.get('dependency_graph', {})
        edges = dep_graph.get('edges', 0)
        if edges > 400:
            opportunities.append({
                "priority": 3,
                "type": "architecture",
                "title": "Optimize Dependency Graph",
                "description": f"Complex graph ({edges} edges) impacts load time",
                "impact": "Faster module loading, better tree-shaking",
                "actions": [
                    "Use dynamic imports",
                    "Implement code splitting",
                    "Use lazy loading for non-critical modules"
                ]
            })
        
        return json.dumps({
            "opportunities": opportunities,
            "total": len(opportunities),
            "generated_at": datetime.now().isoformat()
        }, indent=2, default=str)
    
    def _get_context_recommendations(self, file_path: str, context_type: str) -> str:
        """Get context-aware recommendations for a specific file"""
        data = self._load_json_report("codemap_analysis.json")
        if not data:
            return json.dumps({"error": "No analysis data available"})
        
        # Find dead code in this file
        dead_code = data.get('dead_code', {})
        file_dead_code = [
            item for item in dead_code.get('functions', [])
            if item.get('file') == file_path
        ]
        
        # Find dependencies
        file_imports = data.get('file_imports', {})
        dependencies = file_imports.get(file_path, [])
        
        recommendations = []
        
        if context_type == "refactoring" or context_type == "all":
            if file_dead_code:
                recommendations.append({
                    "type": "refactoring",
                    "priority": 1,
                    "title": "Remove Dead Code",
                    "items": file_dead_code,
                    "action": "Consider removing these unused functions"
                })
            
            if len(dependencies) > 10:
                recommendations.append({
                    "type": "refactoring",
                    "priority": 2,
                    "title": "High Coupling",
                    "count": len(dependencies),
                    "action": "This file has many dependencies. Consider breaking it down."
                })
        
        if context_type == "testing" or context_type == "all":
            recommendations.append({
                "type": "testing",
                "priority": 1,
                "title": "Test Coverage",
                "dependencies_count": len(dependencies),
                "suggestions": [
                    "Mock external dependencies",
                    "Test error handling",
                    "Add integration tests"
                ]
            })
        
        if context_type == "security" or context_type == "all":
            if file_dead_code:
                recommendations.append({
                    "type": "security",
                    "priority": 1,
                    "title": "Remove Dead Code",
                    "reason": "Dead code increases attack surface",
                    "action": "Remove unused functions"
                })
        
        if context_type == "performance" or context_type == "all":
            if file_dead_code:
                recommendations.append({
                    "type": "performance",
                    "priority": 1,
                    "title": "Optimize Build",
                    "reason": "Dead code slows down builds",
                    "action": "Remove unused code"
                })
        
        return json.dumps({
            "file": file_path,
            "context_type": context_type,
            "recommendations": recommendations,
            "total": len(recommendations)
        }, indent=2, default=str)
    
    def _analyze_code_quality(self, file_path: str) -> str:
        """Analyze code quality for a specific file"""
        data = self._load_json_report("codemap_analysis.json")
        if not data:
            return json.dumps({"error": "No analysis data available"})
        
        # Get file metrics
        file_imports = data.get('file_imports', {})
        func_defs = data.get('function_definitions', {})
        dead_code = data.get('dead_code', {})
        
        imports = file_imports.get(file_path, [])
        functions = func_defs.get(file_path, {})
        file_dead_code = [
            item for item in dead_code.get('functions', [])
            if item.get('file') == file_path
        ]
        
        # Calculate quality score
        quality_score = 100
        issues = []
        
        # Deduct for dead code
        if file_dead_code:
            quality_score -= len(file_dead_code) * 5
            issues.append({
                "type": "dead_code",
                "severity": "medium",
                "count": len(file_dead_code),
                "impact": -len(file_dead_code) * 5
            })
        
        # Deduct for high coupling
        if len(imports) > 10:
            quality_score -= 20
            issues.append({
                "type": "high_coupling",
                "severity": "medium",
                "count": len(imports),
                "impact": -20
            })
        
        # Deduct for too many functions
        if len(functions) > 20:
            quality_score -= 15
            issues.append({
                "type": "too_many_functions",
                "severity": "low",
                "count": len(functions),
                "impact": -15
            })
        
        quality_score = max(0, min(100, quality_score))
        
        return json.dumps({
            "file": file_path,
            "quality_score": quality_score,
            "metrics": {
                "imports": len(imports),
                "functions": len(functions),
                "dead_code": len(file_dead_code)
            },
            "issues": issues,
            "grade": "A" if quality_score >= 90 else "B" if quality_score >= 80 else "C" if quality_score >= 70 else "D" if quality_score >= 60 else "F"
        }, indent=2, default=str)
    
    def _get_module_health(self, file_path: str) -> str:
        """Get overall health score and metrics for a module"""
        data = self._load_json_report("codemap_analysis.json")
        if not data:
            return json.dumps({"error": "No analysis data available"})
        
        # Get metrics
        file_imports = data.get('file_imports', {})
        func_defs = data.get('function_definitions', {})
        dead_code = data.get('dead_code', {})
        
        imports = file_imports.get(file_path, [])
        functions = func_defs.get(file_path, {})
        file_dead_code = [
            item for item in dead_code.get('functions', [])
            if item.get('file') == file_path
        ]
        
        # Calculate health metrics
        health = {
            "file": file_path,
            "status": "healthy",
            "score": 100,
            "metrics": {
                "imports": len(imports),
                "functions": len(functions),
                "dead_code": len(file_dead_code),
                "coupling": "low" if len(imports) < 5 else "medium" if len(imports) < 10 else "high"
            },
            "warnings": [],
            "recommendations": []
        }
        
        # Check for issues
        if len(file_dead_code) > 0:
            health["score"] -= 20
            health["warnings"].append(f"Found {len(file_dead_code)} dead code items")
            health["recommendations"].append("Remove dead code")
        
        if len(imports) > 10:
            health["score"] -= 15
            health["warnings"].append(f"High coupling: {len(imports)} imports")
            health["recommendations"].append("Reduce dependencies")
        
        if len(functions) > 20:
            health["score"] -= 10
            health["warnings"].append(f"Too many functions: {len(functions)}")
            health["recommendations"].append("Break down into smaller modules")
        
        health["score"] = max(0, min(100, health["score"]))
        
        if health["score"] >= 80:
            health["status"] = "healthy"
        elif health["score"] >= 60:
            health["status"] = "needs_attention"
        else:
            health["status"] = "critical"
        
        return json.dumps(health, indent=2, default=str)
    
    def _get_analysis_status(self) -> str:
        """Get analysis status"""
        report_path = self.reports_dir / "codemap_analysis.json"
        
        status = {
            "analysis_available": report_path.exists(),
            "last_update": None,
            "reports_directory": str(self.reports_dir)
        }
        
        if report_path.exists():
            stat = report_path.stat()
            status["last_update"] = datetime.fromtimestamp(stat.st_mtime).isoformat()
        
        return json.dumps(status, indent=2, default=str)


def main():
    """Main entry point for MCP server"""
    import argparse
    
    parser = argparse.ArgumentParser(description="Codemap MCP Server")
    parser.add_argument("--project", default="./", help="Project root directory")
    parser.add_argument("--port", type=int, default=8000, help="Server port")
    parser.add_argument("--mode", choices=["stdio", "http"], default="stdio", 
                       help="Server mode (stdio for Windsurf, http for testing)")
    
    args = parser.parse_args()
    
    server = CodemapMCPServer(args.project)
    
    if args.mode == "stdio":
        # Windsurf uses stdio mode
        run_stdio_server(server)
    else:
        # HTTP mode for testing
        run_http_server(server, args.port)


def run_stdio_server(server: CodemapMCPServer):
    """Run MCP server in stdio mode for Windsurf"""
    import json
    
    logger.info("Starting MCP server in stdio mode")
    
    while True:
        try:
            line = sys.stdin.readline()
            if not line:
                break
            
            request = json.loads(line)
            response = handle_request(server, request)
            print(json.dumps(response))
            sys.stdout.flush()
        except json.JSONDecodeError:
            logger.error("Invalid JSON received")
        except Exception as e:
            logger.error(f"Error: {e}")


def run_http_server(server: CodemapMCPServer, port: int):
    """Run MCP server in HTTP mode for testing"""
    try:
        from flask import Flask, request, jsonify
    except ImportError:
        print("Flask not installed. Install with: pip install flask")
        sys.exit(1)
    
    app = Flask(__name__)
    
    @app.route("/resources", methods=["GET"])
    def list_resources():
        return jsonify({"resources": server.get_resources()})
    
    @app.route("/resources/<path:uri>", methods=["GET"])
    def read_resource(uri):
        content = server.read_resource(f"codemap://{uri}")
        return jsonify({"content": content})
    
    @app.route("/tools", methods=["GET"])
    def list_tools():
        return jsonify({"tools": server.get_tools()})
    
    @app.route("/tools/<tool_name>", methods=["POST"])
    def call_tool(tool_name):
        arguments = request.json or {}
        result = server.call_tool(tool_name, arguments)
        return jsonify({"result": result})
    
    logger.info(f"Starting HTTP server on port {port}")
    app.run(host="0.0.0.0", port=port, debug=False)


def handle_request(server: CodemapMCPServer, request: Dict[str, Any]) -> Dict[str, Any]:
    """Handle MCP request"""
    method = request.get("method")
    params = request.get("params", {})
    
    if method == "resources/list":
        return {"resources": server.get_resources()}
    elif method == "resources/read":
        uri = params.get("uri", "")
        content = server.read_resource(uri)
        return {"content": content}
    elif method == "tools/list":
        return {"tools": server.get_tools()}
    elif method == "tools/call":
        name = params.get("name", "")
        arguments = params.get("arguments", {})
        result = server.call_tool(name, arguments)
        return {"result": result}
    else:
        return {"error": f"Unknown method: {method}"}


if __name__ == "__main__":
    main()
