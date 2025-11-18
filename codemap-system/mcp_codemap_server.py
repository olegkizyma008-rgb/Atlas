#!/usr/bin/env python3
"""
MCP Server for Codemap - Real-time integration with Windsurf Cascade
Provides tools and resources for automatic code analysis and context awareness
"""

import json
import os
import sys
import asyncio
import time
import subprocess
from pathlib import Path
from typing import Any, Dict, List, Optional
from datetime import datetime
import logging

# Setup logging with detailed format
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class CodemapMCPServer:
    """MCP Server for Codemap integration with Cascade"""
    
    def __init__(self, project_root: str = "./"):
        self.project_root = Path(project_root)
        self.reports_dir = self.project_root / "reports"
        
        # Cache configuration (Recommendation #3)
        self.cache = {}
        self.cache_time = {}
        self.cache_ttl = 300  # 5 minutes
        
        self.last_update = {}
        self.memory_dir = Path.home() / ".codeium" / "windsurf" / "memories"
        self._ensure_memory_dir()
        
        # Auto-commit configuration (NEW)
        self.last_commit_hash = None
        self.last_commit_time = 0
        self.commit_threshold = 300  # 5 minutes between commits
        self.min_changes_for_commit = 5  # Minimum changes to trigger commit
        self.version_file = self.project_root / ".codemap_version"
        self._load_version_info()
        
        logger.info(f"Initialized CodemapMCPServer for {self.project_root}")
        logger.info(f"Cache TTL: {self.cache_ttl}s, Memory dir: {self.memory_dir}")
        logger.info(f"Auto-commit: threshold={self.commit_threshold}s, min_changes={self.min_changes_for_commit}")
    
    def _ensure_memory_dir(self):
        """Ensure memory directory exists"""
        try:
            self.memory_dir.mkdir(parents=True, exist_ok=True)
            logger.info(f"Memory directory ready: {self.memory_dir}")
        except Exception as e:
            logger.error(f"Error creating memory directory: {e}")
    
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
            },
            {
                "uri": "codemap://current/file-context",
                "name": "Current File Context",
                "description": "Context for the currently edited file"
            },
            {
                "uri": "codemap://current/file-issues",
                "name": "Current File Issues",
                "description": "Issues and problems in the currently edited file"
            },
            {
                "uri": "codemap://current/file-recommendations",
                "name": "Current File Recommendations",
                "description": "Recommendations specific to the currently edited file"
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
        elif uri == "codemap://current/file-context":
            return json.dumps({"error": "file_path parameter required. Use get_current_file_context tool instead."})
        elif uri == "codemap://current/file-issues":
            return json.dumps({"error": "file_path parameter required. Use quick_show_issues tool instead."})
        elif uri == "codemap://current/file-recommendations":
            return json.dumps({"error": "file_path parameter required. Use get_current_file_context tool instead."})
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
            },
            {
                "name": "get_current_file_context",
                "description": "Get context for the currently edited file",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "file_path": {
                            "type": "string",
                            "description": "Path to the currently edited file"
                        }
                    },
                    "required": ["file_path"]
                }
            },
            {
                "name": "get_related_files",
                "description": "Get files related to a specific file",
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
                "name": "get_file_impact",
                "description": "Get impact of changes to a file",
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
                "name": "get_dependency_chain",
                "description": "Get full dependency chain for a file",
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
                "name": "quick_show_dead_code",
                "description": "Quickly show dead code in a file",
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
                "name": "quick_show_dependencies",
                "description": "Quickly show dependencies of a file",
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
                "name": "quick_show_issues",
                "description": "Quickly show all issues in a file",
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
                "name": "health_check",
                "description": "Check system health status (Recommendation #4)",
                "inputSchema": {
                    "type": "object",
                    "properties": {}
                }
            },
            {
                "name": "verify_memory_sync",
                "description": "Verify memory integrity (Recommendation #2)",
                "inputSchema": {
                    "type": "object",
                    "properties": {}
                }
            },
            {
                "name": "get_git_history",
                "description": "Get git history for a file (Recommendation #5)",
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
                "name": "clear_cache",
                "description": "Clear all cache (Recommendation #3)",
                "inputSchema": {
                    "type": "object",
                    "properties": {}
                }
            },
            {
                "name": "auto_commit",
                "description": "Automatically commit changes with intelligent detection",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "message": {
                            "type": "string",
                            "description": "Optional custom commit message"
                        }
                    }
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
        elif name == "get_current_file_context":
            return self._get_current_file_context(arguments.get("file_path", ""))
        elif name == "get_related_files":
            return self._get_related_files(arguments.get("file_path", ""))
        elif name == "get_file_impact":
            return self._get_file_impact(arguments.get("file_path", ""))
        elif name == "get_dependency_chain":
            return self._get_dependency_chain(arguments.get("file_path", ""))
        elif name == "quick_show_dead_code":
            return self._quick_show_dead_code(arguments.get("file_path", ""))
        elif name == "quick_show_dependencies":
            return self._quick_show_dependencies(arguments.get("file_path", ""))
        elif name == "quick_show_issues":
            return self._quick_show_issues(arguments.get("file_path", ""))
        elif name == "health_check":
            return json.dumps(self.health_check(), indent=2, default=str)
        elif name == "verify_memory_sync":
            return json.dumps(self.verify_memory_sync(), indent=2, default=str)
        elif name == "get_git_history":
            return json.dumps(self.get_git_history(arguments.get("file_path", "")), indent=2, default=str)
        elif name == "clear_cache":
            self.clear_cache()
            return json.dumps({"status": "success", "message": "Cache cleared"})
        elif name == "auto_commit":
            return json.dumps(self.auto_commit(arguments.get("message")), indent=2, default=str)
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
    
    # ========== MEMORY SYNCHRONIZATION ==========
    
    def sync_to_memory(self, memory_key: str, data: Dict[str, Any]) -> bool:
        """Sync analysis data to Windsurf memory"""
        try:
            memory_file = self.memory_dir / f"{memory_key}.json"
            
            memory_data = {
                "timestamp": datetime.now().isoformat(),
                "key": memory_key,
                "data": data
            }
            
            with open(memory_file, 'w') as f:
                json.dump(memory_data, f, indent=2, default=str)
            
            file_size = memory_file.stat().st_size
            self._log_sync_details(memory_key, data, file_size)
            logger.info(f"✅ Synced to memory: {memory_key} ({file_size} bytes)")
            return True
        except Exception as e:
            logger.error(f"❌ Error syncing to memory: {e}")
            return False
    
    def load_from_memory(self, memory_key: str) -> Optional[Dict[str, Any]]:
        """Load data from Windsurf memory"""
        try:
            memory_file = self.memory_dir / f"{memory_key}.json"
            if memory_file.exists():
                with open(memory_file, 'r') as f:
                    content = json.load(f)
                    logger.info(f"Loaded from memory: {memory_key}")
                    return content.get("data")
            return None
        except Exception as e:
            logger.error(f"Error loading from memory: {e}")
            return None
    
    def sync_current_analysis(self) -> bool:
        """Sync current analysis to memory for Cascade"""
        data = self._load_json_report("codemap_analysis.json")
        if not data:
            return False
        
        # Sync key metrics to memory
        memory_data = {
            "project": data.get("project"),
            "timestamp": data.get("timestamp"),
            "files_analyzed": data.get("files_analyzed"),
            "total_functions": data.get("total_functions"),
            "dead_code_count": len(data.get("dead_code", {}).get("functions", [])),
            "cycles_count": len(data.get("cycles", [])),
            "complexity_metrics": data.get("complexity_metrics"),
            "file_imports": data.get("file_imports", {}),
            "function_definitions": data.get("function_definitions", {})
        }
        
        return self.sync_to_memory("codemap_analysis", memory_data)
    
    # ========== PHASE 1: CRITICAL FUNCTIONS ==========
    
    def _get_current_file_context(self, file_path: str) -> str:
        """Get context for currently edited file"""
        data = self._load_json_report("codemap_analysis.json")
        if not data:
            return json.dumps({"error": "No analysis data available"})
        
        file_imports = data.get("file_imports", {}).get(file_path, [])
        func_defs = data.get("function_definitions", {}).get(file_path, {})
        dead_code_list = data.get("dead_code", {})
        
        # Get dead code for this file
        file_dead_code = []
        for item in dead_code_list.get("functions", []):
            if isinstance(item, dict) and item.get("file") == file_path:
                file_dead_code.append(item.get("name", str(item)))
            elif isinstance(item, str) and file_path in item:
                file_dead_code.append(item)
        
        # Calculate complexity
        complexity = "low" if len(file_imports) < 5 else "medium" if len(file_imports) < 10 else "high"
        
        context = {
            "file": file_path,
            "imports_count": len(file_imports),
            "functions_count": len(func_defs),
            "dead_code_count": len(file_dead_code),
            "imports": file_imports[:5],
            "functions": list(func_defs.keys())[:5] if isinstance(func_defs, dict) else [],
            "dead_code": file_dead_code[:5],
            "complexity": complexity
        }
        
        return json.dumps(context, indent=2, default=str)
    
    def _get_related_files(self, file_path: str) -> str:
        """Get files related to a specific file"""
        data = self._load_json_report("codemap_analysis.json")
        if not data:
            return json.dumps({"error": "No analysis data available"})
        
        file_imports = data.get("file_imports", {})
        
        # Files this file imports from
        imports_from = file_imports.get(file_path, [])
        
        # Files that import this file
        imports_to = [f for f, imports in file_imports.items() if file_path in imports]
        
        result = {
            "file": file_path,
            "imports_from": imports_from,
            "imported_by": imports_to,
            "total_related": len(imports_from) + len(imports_to)
        }
        
        return json.dumps(result, indent=2, default=str)
    
    def _get_file_impact(self, file_path: str) -> str:
        """Get impact of changes to a file"""
        data = self._load_json_report("codemap_analysis.json")
        if not data:
            return json.dumps({"error": "No analysis data available"})
        
        file_imports = data.get("file_imports", {})
        
        # How many files depend on this file
        dependent_files = [f for f, imports in file_imports.items() if file_path in imports]
        
        impact_level = "high" if len(dependent_files) > 10 else "medium" if len(dependent_files) > 3 else "low"
        
        recommendations = {
            "low": "This file has low impact. Safe to modify.",
            "medium": "This file has medium impact. Test dependent files after changes.",
            "high": "This file is critical. Many files depend on it. Refactor carefully."
        }
        
        impact = {
            "file": file_path,
            "dependent_files_count": len(dependent_files),
            "dependent_files": dependent_files,
            "impact_level": impact_level,
            "recommendation": recommendations.get(impact_level, "")
        }
        
        return json.dumps(impact, indent=2, default=str)
    
    def _get_dependency_chain(self, file_path: str) -> str:
        """Get full dependency chain for a file"""
        data = self._load_json_report("codemap_analysis.json")
        if not data:
            return json.dumps({"error": "No analysis data available"})
        
        file_imports = data.get("file_imports", {})
        
        def build_chain(f, depth=0, visited=None):
            if visited is None:
                visited = set()
            if f in visited or depth > 5:
                return None
            visited.add(f)
            
            imports = file_imports.get(f, [])
            return {
                "file": f,
                "depth": depth,
                "imports": [build_chain(imp, depth + 1, visited) for imp in imports[:3] if build_chain(imp, depth + 1, visited) is not None]
            }
        
        chain = build_chain(file_path)
        
        return json.dumps(chain, indent=2, default=str)
    
    def _quick_show_dead_code(self, file_path: str) -> str:
        """Quickly show dead code in a file"""
        data = self._load_json_report("codemap_analysis.json")
        if not data:
            return json.dumps({"error": "No analysis data available"})
        
        dead_code_list = data.get("dead_code", {})
        
        # Get dead code for this file
        file_dead_code = []
        for item in dead_code_list.get("functions", []):
            if isinstance(item, dict) and item.get("file") == file_path:
                file_dead_code.append(item.get("name", str(item)))
            elif isinstance(item, str) and file_path in item:
                file_dead_code.append(item)
        
        result = {
            "file": file_path,
            "dead_code_count": len(file_dead_code),
            "dead_code": file_dead_code,
            "action": "Remove these unused functions/variables"
        }
        
        return json.dumps(result, indent=2, default=str)
    
    def _quick_show_dependencies(self, file_path: str) -> str:
        """Quickly show dependencies of a file"""
        data = self._load_json_report("codemap_analysis.json")
        if not data:
            return json.dumps({"error": "No analysis data available"})
        
        file_imports = data.get("file_imports", {}).get(file_path, [])
        
        result = {
            "file": file_path,
            "dependencies_count": len(file_imports),
            "dependencies": file_imports,
            "action": "Review these dependencies"
        }
        
        return json.dumps(result, indent=2, default=str)
    
    def _quick_show_issues(self, file_path: str) -> str:
        """Quickly show all issues in a file"""
        data = self._load_json_report("codemap_analysis.json")
        if not data:
            return json.dumps({"error": "No analysis data available"})
        
        dead_code_list = data.get("dead_code", {})
        file_imports = data.get("file_imports", {}).get(file_path, [])
        
        # Get dead code for this file
        file_dead_code = []
        for item in dead_code_list.get("functions", []):
            if isinstance(item, dict) and item.get("file") == file_path:
                file_dead_code.append(item.get("name", str(item)))
            elif isinstance(item, str) and file_path in item:
                file_dead_code.append(item)
        
        issues = []
        if len(file_dead_code) > 0:
            issues.append(f"Dead code: {len(file_dead_code)} items")
        if len(file_imports) > 10:
            issues.append(f"High coupling: {len(file_imports)} dependencies")
        if len(file_imports) > 5 and len(file_dead_code) > 0:
            issues.append("Complex file with dead code - consider refactoring")
        
        result = {
            "file": file_path,
            "issues_count": len(issues),
            "issues": issues,
            "action": "Address these issues"
        }
        
        return json.dumps(result, indent=2, default=str)
    
    # ========== RECOMMENDATION #1: DETAILED LOGGING ==========
    
    def _log_sync_details(self, memory_key: str, data: Dict[str, Any], file_size: int = 0):
        """Log detailed sync information (Recommendation #1)"""
        data_size = len(json.dumps(data))
        logger.info(f"📊 SYNC DETAILS: key={memory_key}")
        logger.info(f"   Data size: {data_size} bytes")
        logger.info(f"   File size: {file_size} bytes")
        logger.info(f"   Timestamp: {datetime.now().isoformat()}")
        if isinstance(data, dict):
            logger.info(f"   Keys: {', '.join(data.keys())}")
    
    # ========== RECOMMENDATION #2: MEMORY INTEGRITY CHECK ==========
    
    def verify_memory_sync(self) -> Dict[str, Any]:
        """Verify that memory is in sync with analysis (Recommendation #2)"""
        logger.info("🔍 Verifying memory sync integrity...")
        try:
            memory_data = self.load_from_memory("codemap_analysis")
            analysis_data = self._load_json_report("codemap_analysis.json")
            
            if not memory_data or not analysis_data:
                logger.warning("⚠️ Memory or analysis data not available")
                return {"status": "unavailable", "verified": False}
            
            # Check key metrics
            checks = {
                "files_analyzed": memory_data.get("files_analyzed") == analysis_data.get("files_analyzed"),
                "total_functions": memory_data.get("total_functions") == analysis_data.get("total_functions"),
                "dead_code_count": memory_data.get("dead_code_count") == len(analysis_data.get("dead_code", {}).get("functions", [])),
                "timestamp_exists": "timestamp" in memory_data
            }
            
            all_ok = all(checks.values())
            
            if all_ok:
                logger.info("✅ Memory sync verified - all checks passed")
            else:
                logger.warning(f"⚠️ Memory sync issues detected: {checks}")
            
            return {
                "status": "verified" if all_ok else "degraded",
                "verified": all_ok,
                "checks": checks
            }
        except Exception as e:
            logger.error(f"❌ Error verifying memory: {e}")
            return {"status": "error", "verified": False, "error": str(e)}
    
    # ========== RECOMMENDATION #3: CACHING WITH TTL ==========
    
    def _get_cached(self, cache_key: str, fetch_func, *args, **kwargs) -> Any:
        """Get data from cache or fetch if expired (Recommendation #3)"""
        current_time = time.time()
        
        # Check cache
        if cache_key in self.cache:
            if current_time - self.cache_time[cache_key] < self.cache_ttl:
                logger.debug(f"💾 Cache HIT: {cache_key} (age: {current_time - self.cache_time[cache_key]:.1f}s)")
                return self.cache[cache_key]
            else:
                logger.debug(f"💾 Cache EXPIRED: {cache_key}")
                del self.cache[cache_key]
                del self.cache_time[cache_key]
        
        # Fetch data
        logger.debug(f"💾 Cache MISS: {cache_key} - fetching...")
        result = fetch_func(*args, **kwargs)
        
        # Store in cache
        self.cache[cache_key] = result
        self.cache_time[cache_key] = current_time
        logger.debug(f"💾 Cached: {cache_key}")
        
        return result
    
    def clear_cache(self):
        """Clear all cache (Recommendation #3)"""
        cache_size = len(self.cache)
        self.cache.clear()
        self.cache_time.clear()
        logger.info(f"🗑️ Cache cleared ({cache_size} items removed)")
    
    # ========== RECOMMENDATION #4: HEALTH CHECK ==========
    
    def health_check(self) -> Dict[str, Any]:
        """Check system health status (Recommendation #4)"""
        logger.info("🏥 Performing health check...")
        try:
            # Check files
            analysis_file = self.reports_dir / "codemap_analysis.json"
            memory_file = self.memory_dir / "codemap_analysis.json"
            
            # Check freshness
            analysis_age = time.time() - analysis_file.stat().st_mtime if analysis_file.exists() else None
            memory_age = time.time() - memory_file.stat().st_mtime if memory_file.exists() else None
            
            health = {
                "status": "healthy",
                "timestamp": datetime.now().isoformat(),
                "components": {
                    "analysis_available": analysis_file.exists(),
                    "memory_available": memory_file.exists(),
                    "memory_synced": self.verify_memory_sync()["verified"],
                    "analysis_fresh": analysis_age is not None and analysis_age < 300,
                    "memory_fresh": memory_age is not None and memory_age < 300
                },
                "metrics": {
                    "analysis_age_seconds": round(analysis_age, 2) if analysis_age else None,
                    "memory_age_seconds": round(memory_age, 2) if memory_age else None,
                    "cache_size": len(self.cache),
                    "cache_ttl": self.cache_ttl
                }
            }
            
            # Determine status
            if not all(health["components"].values()):
                health["status"] = "degraded"
                logger.warning(f"⚠️ Health check degraded: {health['components']}")
            else:
                logger.info("✅ Health check passed - all systems operational")
            
            return health
        except Exception as e:
            logger.error(f"❌ Health check error: {e}")
            return {
                "status": "unhealthy",
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            }
    
    # ========== AUTO-COMMIT: INTELLIGENT VERSION CONTROL ==========
    
    def _load_version_info(self):
        """Load version info from .codemap_version file"""
        try:
            if self.version_file.exists():
                with open(self.version_file, 'r') as f:
                    data = json.load(f)
                    self.last_commit_hash = data.get("last_commit_hash")
                    self.last_commit_time = data.get("last_commit_time", 0)
                    logger.info(f"📋 Loaded version info: hash={self.last_commit_hash}")
        except Exception as e:
            logger.warning(f"⚠️ Could not load version info: {e}")
    
    def _save_version_info(self, commit_hash: str):
        """Save version info to .codemap_version file"""
        try:
            version_data = {
                "last_commit_hash": commit_hash,
                "last_commit_time": time.time(),
                "timestamp": datetime.now().isoformat(),
                "system": "codemap-mcp"
            }
            with open(self.version_file, 'w') as f:
                json.dump(version_data, f, indent=2)
            self.last_commit_hash = commit_hash
            self.last_commit_time = time.time()
            logger.info(f"💾 Saved version info: hash={commit_hash}")
        except Exception as e:
            logger.error(f"❌ Error saving version info: {e}")
    
    def _get_changes_count(self) -> int:
        """Get number of uncommitted changes"""
        try:
            cmd = "git status --porcelain | wc -l"
            result = subprocess.run(cmd, shell=True, capture_output=True, text=True, cwd=str(self.project_root))
            count = int(result.stdout.strip())
            logger.debug(f"📊 Uncommitted changes: {count}")
            return count
        except Exception as e:
            logger.error(f"❌ Error getting changes count: {e}")
            return 0
    
    def _should_commit(self) -> bool:
        """Intelligently determine if commit should be made"""
        current_time = time.time()
        time_since_last = current_time - self.last_commit_time
        changes_count = self._get_changes_count()
        
        # Check if enough time has passed
        if time_since_last < self.commit_threshold:
            logger.debug(f"⏱️ Not enough time since last commit: {time_since_last:.0f}s < {self.commit_threshold}s")
            return False
        
        # Check if enough changes
        if changes_count < self.min_changes_for_commit:
            logger.debug(f"📝 Not enough changes: {changes_count} < {self.min_changes_for_commit}")
            return False
        
        logger.info(f"✅ Should commit: {changes_count} changes, {time_since_last:.0f}s since last")
        return True
    
    def auto_commit(self, message: Optional[str] = None) -> Dict[str, Any]:
        """Automatically commit changes with intelligent detection"""
        logger.info("🔄 Checking for auto-commit...")
        
        try:
            if not self._should_commit():
                return {
                    "status": "skipped",
                    "reason": "Not enough changes or time since last commit",
                    "changes_count": self._get_changes_count(),
                    "time_since_last": time.time() - self.last_commit_time
                }
            
            # Generate commit message if not provided
            if not message:
                changes_count = self._get_changes_count()
                analysis_data = self._load_json_report("codemap_analysis.json")
                
                if analysis_data:
                    dead_code = len(analysis_data.get("dead_code", {}).get("functions", []))
                    cycles = len(analysis_data.get("cycles", []))
                    message = f"🔍 Codemap analysis: {changes_count} changes, {dead_code} dead code items, {cycles} cycles"
                else:
                    message = f"🔍 Codemap analysis update: {changes_count} changes"
            
            # Stage all changes
            cmd = "git add -A"
            subprocess.run(cmd, shell=True, cwd=str(self.project_root))
            logger.info(f"📦 Staged all changes")
            
            # Create commit
            cmd = f'git commit -m "{message}"'
            result = subprocess.run(cmd, shell=True, capture_output=True, text=True, cwd=str(self.project_root))
            
            if result.returncode == 0:
                # Get commit hash
                cmd = "git rev-parse HEAD"
                hash_result = subprocess.run(cmd, shell=True, capture_output=True, text=True, cwd=str(self.project_root))
                commit_hash = hash_result.stdout.strip()[:7]
                
                # Save version info
                self._save_version_info(commit_hash)
                
                logger.info(f"✅ Auto-commit successful: {commit_hash}")
                return {
                    "status": "committed",
                    "hash": commit_hash,
                    "message": message,
                    "timestamp": datetime.now().isoformat()
                }
            else:
                logger.warning(f"⚠️ Nothing to commit: {result.stderr}")
                return {
                    "status": "nothing_to_commit",
                    "message": result.stderr
                }
        except Exception as e:
            logger.error(f"❌ Auto-commit error: {e}")
            return {
                "status": "error",
                "error": str(e)
            }
    
    # ========== RECOMMENDATION #5: GIT INTEGRATION ==========
    
    def get_git_history(self, file_path: str, limit: int = 10) -> Dict[str, Any]:
        """Get git history for a file (Recommendation #5)"""
        logger.info(f"📜 Getting git history for {file_path}...")
        try:
            # Get recent commits
            cmd = f"git log --oneline -n {limit} -- {file_path}"
            result = subprocess.run(cmd, shell=True, capture_output=True, text=True, cwd=str(self.project_root))
            
            commits = []
            for line in result.stdout.strip().split('\n'):
                if line:
                    parts = line.split(' ', 1)
                    if len(parts) == 2:
                        commits.append({
                            "hash": parts[0],
                            "message": parts[1]
                        })
            
            # Get last modified date
            cmd = f"git log -1 --format=%ai -- {file_path}"
            result = subprocess.run(cmd, shell=True, capture_output=True, text=True, cwd=str(self.project_root))
            last_modified = result.stdout.strip()
            
            logger.info(f"✅ Git history retrieved: {len(commits)} commits")
            
            return {
                "file": file_path,
                "commits": commits,
                "last_modified": last_modified,
                "total_commits": len(commits)
            }
        except Exception as e:
            logger.error(f"❌ Error getting git history: {e}")
            return {"error": str(e), "file": file_path}
    
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
