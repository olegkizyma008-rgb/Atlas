#!/usr/bin/env python3
"""
ENHANCED MCP SERVER FOR CODEMAP
Integrates with mcp_enhanced_analyzer.py for continuous analysis
Provides real-time access to multi-layer analysis results
"""

import json
import os
import sys
from pathlib import Path
from typing import Dict, List, Any
import logging
from logging.handlers import RotatingFileHandler

# Import advanced tools
sys.path.insert(0, str(Path(__file__).parent))
sys.path.insert(0, str(Path(__file__).parent.parent / "tools"))
from mcp_advanced_tools import AdvancedMCPTools
from windsurf_power_tools import WindsurfPowerTools

# ============================================================================
# LOGGING
# ============================================================================

def setup_logging(log_dir: Path):
    """Setup logging"""
    log_dir.mkdir(parents=True, exist_ok=True)
    log_file = log_dir / "enhanced_mcp_server.log"
    
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
    
    formatter = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    file_handler.setFormatter(formatter)
    
    logger.addHandler(file_handler)
    
    return logger

# ============================================================================
# ENHANCED MCP SERVER
# ============================================================================

class EnhancedCodemapMCPServer:
    """Enhanced MCP Server with continuous analysis integration"""
    
    def __init__(self, project_root: str = "./"):
        self.project_root = Path(project_root)
        self.reports_dir = self.project_root / "reports"
        
        log_dir = self.project_root / "codemap-system" / "logs"
        self.logger = setup_logging(log_dir)
        
        # Initialize advanced tools
        self.advanced_tools = AdvancedMCPTools(str(self.project_root), str(self.reports_dir))
        self.power_tools = WindsurfPowerTools(str(self.project_root), str(self.reports_dir))
        
        self.logger.info("🚀 Enhanced MCP Server initialized")
        self.logger.info("⚡ Windsurf Power Tools loaded")
    
    # ========================================================================
    # RESOURCES (Static Data)
    # ========================================================================
    
    def get_resources(self) -> List[Dict[str, str]]:
        """List all available resources"""
        return [
            # Layer 1: Dead Files
            {
                "uri": "codemap://layer1/dead-files",
                "name": "Dead Files Detection",
                "description": "Files with no imports and no dependents"
            },
            # Layer 2: Dead Functions
            {
                "uri": "codemap://layer2/dead-functions",
                "name": "Dead Functions Detection",
                "description": "Unused functions in each file"
            },
            # Layer 3: Dependency Graph
            {
                "uri": "codemap://layer3/dependency-graph",
                "name": "Dependency Graph",
                "description": "Complete file dependency relationships"
            },
            # Layer 4: Cycles & Isolation
            {
                "uri": "codemap://layer4/cycles-isolation",
                "name": "Cycles & Isolation",
                "description": "Circular dependencies and isolated modules"
            },
            # Layer 5: Quality & Duplications
            {
                "uri": "codemap://layer5/quality-duplications",
                "name": "Quality & Duplications",
                "description": "Code quality metrics and duplication analysis"
            },
            # Consolidated State
            {
                "uri": "codemap://analysis/consolidated-state",
                "name": "Consolidated Analysis State",
                "description": "Complete analysis state from all layers"
            },
            # Visualization Graphs
            {
                "uri": "codemap://visualization/dependency-graph-json",
                "name": "Dependency Graph (JSON)",
                "description": "Dependency graph in JSON format for visualization"
            },
            {
                "uri": "codemap://visualization/dead-code-map",
                "name": "Dead Code Map",
                "description": "Map of all dead files and functions"
            },
        ]
    
    def read_resource(self, uri: str) -> str:
        """Read a resource by URI"""
        self.logger.info(f"📖 Reading resource: {uri}")
        
        if uri == "codemap://layer1/dead-files":
            return self._read_layer_report("layer1_dead_files.json")
        elif uri == "codemap://layer2/dead-functions":
            return self._read_layer_report("layer2_dead_functions.json")
        elif uri == "codemap://layer3/dependency-graph":
            return self._read_layer_report("layer3_dependency_graph.json")
        elif uri == "codemap://layer4/cycles-isolation":
            return self._read_layer_report("layer4_cycles_isolation.json")
        elif uri == "codemap://layer5/quality-duplications":
            return self._read_layer_report("layer5_quality_duplications.json")
        elif uri == "codemap://analysis/consolidated-state":
            return self._read_layer_report("enhanced_analysis_state.json")
        elif uri == "codemap://visualization/dependency-graph-json":
            return self._generate_dependency_graph_visualization()
        elif uri == "codemap://visualization/dead-code-map":
            return self._generate_dead_code_map()
        else:
            return json.dumps({"error": f"Unknown resource: {uri}"})
    
    # ========================================================================
    # TOOLS (Callable Functions)
    # ========================================================================
    
    def get_tools(self) -> List[Dict[str, Any]]:
        """List all available tools"""
        return [
            {
                "name": "get_layer_analysis",
                "description": "Get analysis results from a specific layer",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "layer": {
                            "type": "integer",
                            "enum": [1, 2, 3, 4, 5],
                            "description": "Layer number (1-5)"
                        }
                    },
                    "required": ["layer"]
                }
            },
            {
                "name": "get_dead_code_summary",
                "description": "Get summary of all dead code (files + functions)",
                "inputSchema": {
                    "type": "object",
                    "properties": {}
                }
            },
            {
                "name": "get_dependency_relationships",
                "description": "Get dependency relationships for a file",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "file_path": {
                            "type": "string",
                            "description": "File path to analyze"
                        }
                    },
                    "required": ["file_path"]
                }
            },
            {
                "name": "get_circular_dependencies",
                "description": "Get all circular dependencies detected",
                "inputSchema": {
                    "type": "object",
                    "properties": {}
                }
            },
            {
                "name": "get_quality_report",
                "description": "Get code quality metrics",
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
                "description": "Get current analysis status and cycle info",
                "inputSchema": {
                    "type": "object",
                    "properties": {}
                }
            },
            # ===== ADVANCED TOOLS =====
            {
                "name": "analyze_file_deeply",
                "description": "Deep analysis of a single file (dead functions, dependencies, quality)",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "file_path": {
                            "type": "string",
                            "description": "Path to file to analyze"
                        }
                    },
                    "required": ["file_path"]
                }
            },
            {
                "name": "compare_functions",
                "description": "Compare two functions for similarity, complexity, and quality",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "file1": {"type": "string", "description": "First file path"},
                        "func1": {"type": "string", "description": "First function name"},
                        "file2": {"type": "string", "description": "Second file path"},
                        "func2": {"type": "string", "description": "Second function name"}
                    },
                    "required": ["file1", "func1", "file2", "func2"]
                }
            },
            {
                "name": "find_duplicates_in_directory",
                "description": "Find duplicate files and functions in a directory",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "directory": {
                            "type": "string",
                            "description": "Directory path to search"
                        }
                    },
                    "required": ["directory"]
                }
            },
            {
                "name": "analyze_impact",
                "description": "Analyze impact of changes to a file (dependencies, cascade effect)",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "file_path": {
                            "type": "string",
                            "description": "File path to analyze"
                        }
                    },
                    "required": ["file_path"]
                }
            },
            {
                "name": "classify_files",
                "description": "Classify files (active, archival candidates, needs cleanup, critical)",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "directory": {
                            "type": "string",
                            "description": "Optional: directory to classify"
                        }
                    }
                }
            },
            {
                "name": "generate_refactoring_plan",
                "description": "Generate refactoring plan with phases and priorities",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "priority": {
                            "type": "string",
                            "enum": ["high", "medium", "low"],
                            "description": "Priority level"
                        }
                    }
                }
            },
            {
                "name": "visualize_dependencies",
                "description": "Generate dependency visualization data for a file",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "file_path": {
                            "type": "string",
                            "description": "File path to visualize"
                        },
                        "depth": {
                            "type": "integer",
                            "description": "Visualization depth (default: 2)"
                        }
                    },
                    "required": ["file_path"]
                }
            },
            # ===== WINDSURF POWER TOOLS (Hyper-Powerful) =====
            {
                "name": "get_quick_assessment",
                "description": "⚡ INSTANT code situation overview - what's wrong and how to fix it",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "directory": {
                            "type": "string",
                            "description": "Directory to assess (default: orchestrator)"
                        }
                    }
                }
            },
            {
                "name": "get_disqualification_report",
                "description": "🚨 What code should be deleted, fixed, or refactored",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "directory": {
                            "type": "string",
                            "description": "Directory to analyze (default: orchestrator)"
                        }
                    }
                }
            },
            {
                "name": "get_editor_quick_view",
                "description": "👁️ Quick view for a file - is it dead? duplicates? quality issues?",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "file_path": {
                            "type": "string",
                            "description": "File path to view"
                        }
                    },
                    "required": ["file_path"]
                }
            },
        ]
    
    def call_tool(self, name: str, arguments: Dict) -> str:
        """Call a tool"""
        self.logger.info(f"🔧 Calling tool: {name} with args: {arguments}")
        
        if name == "get_layer_analysis":
            layer = arguments.get("layer")
            if isinstance(layer, int):
                return self._get_layer_analysis(layer)
            return json.dumps({"error": "Invalid layer parameter"})
        elif name == "get_dead_code_summary":
            return self._get_dead_code_summary()
        elif name == "get_dependency_relationships":
            file_path = arguments.get("file_path")
            if isinstance(file_path, str):
                return self._get_dependency_relationships(file_path)
            return json.dumps({"error": "Invalid file_path parameter"})
        elif name == "get_circular_dependencies":
            return self._get_circular_dependencies()
        elif name == "get_quality_report":
            file_path = arguments.get("file_path")
            if file_path is None or isinstance(file_path, str):
                return self._get_quality_report(file_path)
            return json.dumps({"error": "Invalid file_path parameter"})
        elif name == "get_analysis_status":
            return self._get_analysis_status()
        # ===== ADVANCED TOOLS =====
        elif name == "analyze_file_deeply":
            file_path = arguments.get("file_path")
            if isinstance(file_path, str):
                result = self.advanced_tools.analyze_file_deeply(file_path)
                return json.dumps(result, indent=2, default=str)
            return json.dumps({"error": "Invalid file_path"})
        elif name == "compare_functions":
            file1 = arguments.get("file1")
            func1 = arguments.get("func1")
            file2 = arguments.get("file2")
            func2 = arguments.get("func2")
            if all(isinstance(x, str) for x in [file1, func1, file2, func2]):
                result = self.advanced_tools.compare_functions(file1, func1, file2, func2)
                return json.dumps(result, indent=2, default=str)
            return json.dumps({"error": "Invalid parameters"})
        elif name == "find_duplicates_in_directory":
            directory = arguments.get("directory", "")
            result = self.advanced_tools.find_duplicates_in_directory(directory)
            return json.dumps(result, indent=2, default=str)
        elif name == "analyze_impact":
            file_path = arguments.get("file_path")
            if isinstance(file_path, str):
                result = self.advanced_tools.analyze_impact(file_path)
                return json.dumps(result, indent=2, default=str)
            return json.dumps({"error": "Invalid file_path"})
        elif name == "classify_files":
            directory = arguments.get("directory", "")
            result = self.advanced_tools.classify_files(directory)
            return json.dumps(result, indent=2, default=str)
        elif name == "generate_refactoring_plan":
            priority = arguments.get("priority", "high")
            result = self.advanced_tools.generate_refactoring_plan(priority)
            return json.dumps(result, indent=2, default=str)
        elif name == "visualize_dependencies":
            file_path = arguments.get("file_path")
            depth = arguments.get("depth", 2)
            if isinstance(file_path, str) and isinstance(depth, int):
                result = self.advanced_tools.visualize_dependencies(file_path, depth)
                return json.dumps(result, indent=2, default=str)
            return json.dumps({"error": "Invalid parameters"})
        # ===== WINDSURF POWER TOOLS =====
        elif name == "get_quick_assessment":
            directory = arguments.get("directory", "orchestrator")
            result = self.power_tools.get_quick_assessment(directory)
            return json.dumps(result, indent=2, default=str)
        elif name == "get_disqualification_report":
            directory = arguments.get("directory", "orchestrator")
            result = self.power_tools.get_disqualification_report(directory)
            return json.dumps(result, indent=2, default=str)
        elif name == "get_editor_quick_view":
            file_path = arguments.get("file_path")
            if isinstance(file_path, str):
                result = self.power_tools.get_editor_quick_view(file_path)
                return json.dumps(result, indent=2, default=str)
            return json.dumps({"error": "Invalid file_path"})
        else:
            return json.dumps({"error": f"Unknown tool: {name}"})
    
    # ========================================================================
    # HELPER METHODS
    # ========================================================================
    
    def _read_layer_report(self, filename: str) -> str:
        """Read layer report file"""
        try:
            report_path = self.reports_dir / filename
            if report_path.exists():
                with open(report_path, 'r') as f:
                    data = json.load(f)
                return json.dumps(data, indent=2, default=str)
            else:
                return json.dumps({"status": f"Report not yet available: {filename}"})
        except Exception as e:
            self.logger.error(f"❌ Error reading {filename}: {e}")
            return json.dumps({"error": str(e)})
    
    def _get_layer_analysis(self, layer: int) -> str:
        """Get analysis from specific layer"""
        layer_files = {
            1: "layer1_dead_files.json",
            2: "layer2_dead_functions.json",
            3: "layer3_dependency_graph.json",
            4: "layer4_cycles_isolation.json",
            5: "layer5_quality_duplications.json"
        }
        
        filename = layer_files.get(layer)
        if not filename:
            return json.dumps({"error": f"Invalid layer: {layer}"})
        
        return self._read_layer_report(filename)
    
    def _get_dead_code_summary(self) -> str:
        """Get summary of dead code"""
        try:
            state_path = self.reports_dir / "enhanced_analysis_state.json"
            if state_path.exists():
                with open(state_path, 'r') as f:
                    state = json.load(f)
                
                summary = {
                    "dead_files": len(state.get("dead_files", [])),
                    "dead_functions_by_file": len(state.get("dead_functions", {})),
                    "total_dead_functions": sum(len(v) for v in state.get("dead_functions", {}).values()),
                    "files_with_dead_code": list(state.get("dead_functions", {}).keys())[:20],
                    "timestamp": state.get("timestamp"),
                    "cycle": state.get("cycle")
                }
                
                return json.dumps(summary, indent=2)
            else:
                return json.dumps({"status": "Analysis not yet available"})
        except Exception as e:
            return json.dumps({"error": str(e)})
    
    def _get_dependency_relationships(self, file_path: str | None) -> str:
        """Get dependency relationships for a file"""
        try:
            state_path = self.reports_dir / "enhanced_analysis_state.json"
            if state_path.exists():
                with open(state_path, 'r') as f:
                    state = json.load(f)
                
                relationships = state.get("relationships", {})
                file_rels = relationships.get(file_path, {})
                
                return json.dumps({
                    "file": file_path,
                    "imports": file_rels.get("imports", []),
                    "imported_by": file_rels.get("imported_by", [])
                }, indent=2)
            else:
                return json.dumps({"status": "Analysis not yet available"})
        except Exception as e:
            return json.dumps({"error": str(e)})
    
    def _get_circular_dependencies(self) -> str:
        """Get circular dependencies"""
        return self._read_layer_report("layer4_cycles_isolation.json")
    
    def _get_quality_report(self, file_path: str | None = None) -> str:
        """Get quality report"""
        return self._read_layer_report("layer5_quality_duplications.json")
    
    def _get_analysis_status(self) -> str:
        """Get analysis status"""
        try:
            state_path = self.reports_dir / "enhanced_analysis_state.json"
            if state_path.exists():
                with open(state_path, 'r') as f:
                    state = json.load(f)
                
                return json.dumps({
                    "status": "running",
                    "cycle": state.get("cycle", 0),
                    "timestamp": state.get("timestamp"),
                    "files_analyzed": state.get("files_analyzed", 0),
                    "functions_analyzed": state.get("functions_analyzed", 0),
                    "dead_files_count": len(state.get("dead_files", [])),
                    "dead_functions_count": sum(len(v) for v in state.get("dead_functions", {}).values()),
                    "cycles_count": len(state.get("cycles", []))
                }, indent=2)
            else:
                return json.dumps({"status": "Analysis not yet started"})
        except Exception as e:
            return json.dumps({"error": str(e)})
    
    def _generate_dependency_graph_visualization(self) -> str:
        """Generate dependency graph for visualization"""
        try:
            state_path = self.reports_dir / "enhanced_analysis_state.json"
            if state_path.exists():
                with open(state_path, 'r') as f:
                    state = json.load(f)
                
                graph = state.get("dependency_graph", {})
                
                # Convert to visualization format
                nodes = []
                edges = []
                
                for file_path in graph.keys():
                    nodes.append({
                        "id": file_path,
                        "label": Path(file_path).name,
                        "type": "file"
                    })
                
                for source, targets in graph.items():
                    for target in targets:
                        edges.append({
                            "source": source,
                            "target": target,
                            "type": "imports"
                        })
                
                return json.dumps({
                    "nodes": nodes,
                    "edges": edges,
                    "format": "cytoscape"
                }, indent=2)
            else:
                return json.dumps({"status": "Analysis not yet available"})
        except Exception as e:
            return json.dumps({"error": str(e)})
    
    def _generate_dead_code_map(self) -> str:
        """Generate dead code map"""
        try:
            state_path = self.reports_dir / "enhanced_analysis_state.json"
            if state_path.exists():
                with open(state_path, 'r') as f:
                    state = json.load(f)
                
                dead_code_map = {
                    "dead_files": state.get("dead_files", []),
                    "dead_functions_by_file": state.get("dead_functions", {}),
                    "summary": {
                        "total_dead_files": len(state.get("dead_files", [])),
                        "total_dead_functions": sum(len(v) for v in state.get("dead_functions", {}).values()),
                        "files_affected": len(state.get("dead_functions", {}))
                    }
                }
                
                return json.dumps(dead_code_map, indent=2)
            else:
                return json.dumps({"status": "Analysis not yet available"})
        except Exception as e:
            return json.dumps({"error": str(e)})

# ============================================================================
# MAIN
# ============================================================================

def main():
    """Main entry point"""
    project_root = '/Users/dev/Documents/GitHub/atlas4'
    
    server = EnhancedCodemapMCPServer(project_root)
    
    print("✅ Enhanced MCP Server ready")
    print(f"📊 Resources: {len(server.get_resources())}")
    print(f"🔧 Tools: {len(server.get_tools())}")

if __name__ == '__main__':
    main()
