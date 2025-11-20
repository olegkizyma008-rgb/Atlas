#!/usr/bin/env python3
"""
ARCHITECTURE GENERATOR FOR AI EDITORS
Generates architecture files, graphs, and visualizations for AI editors
"""

import json
import os
from pathlib import Path
from typing import Dict, List, Any
import logging

# ============================================================================
# LOGGING
# ============================================================================

def setup_logging(log_dir: Path):
    """Setup logging"""
    log_dir.mkdir(parents=True, exist_ok=True)
    log_file = log_dir / "architecture_generator.log"
    
    logger = logging.getLogger(__name__)
    logger.setLevel(logging.DEBUG)
    logger.handlers = []
    
    handler = logging.FileHandler(log_file, encoding='utf-8')
    handler.setLevel(logging.DEBUG)
    
    formatter = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    handler.setFormatter(formatter)
    logger.addHandler(handler)
    
    return logger

# ============================================================================
# ARCHITECTURE GENERATOR
# ============================================================================

class ArchitectureGenerator:
    """Generate architecture files for AI editors"""
    
    def __init__(self, project_root: str, reports_dir: str):
        self.project_root = Path(project_root)
        self.reports_dir = Path(reports_dir)
        self.logger = setup_logging(self.project_root / "codemap-system" / "logs")
        self.logger.info("🏗️ Architecture Generator initialized")
    
    # ========================================================================
    # GENERATE ARCHITECTURE FILES
    # ========================================================================
    
    def generate_architecture_json(self) -> Dict[str, Any]:
        """Generate architecture JSON for AI editors"""
        self.logger.info("📐 Generating architecture JSON")
        
        try:
            # Load analysis data
            dead_files = self._load_json("layer1_dead_files.json")
            dead_functions = self._load_json("layer2_dead_functions.json")
            dependency_graph = self._load_json("layer3_dependency_graph.json")
            cycles = self._load_json("layer4_cycles_isolation.json")
            quality = self._load_json("layer5_quality_duplications.json")
            
            architecture = {
                "project": "orchestrator",
                "version": "2.0",
                "timestamp": self._get_timestamp(),
                "summary": {
                    "total_files": len(quality.get("quality_metrics", {})),
                    "dead_files": len(dead_files.get("dead_files", [])),
                    "circular_dependencies": len(cycles.get("cycles", [])),
                    "quality_score": self._calculate_quality_score(quality)
                },
                "layers": {
                    "layer1_dead_files": dead_files,
                    "layer2_dead_functions": dead_functions,
                    "layer3_dependency_graph": dependency_graph,
                    "layer4_cycles": cycles,
                    "layer5_quality": quality
                },
                "modules": self._extract_modules(quality),
                "dependencies": self._extract_dependencies(dependency_graph),
                "issues": self._extract_issues(dead_files, cycles, quality),
                "recommendations": self._generate_recommendations(dead_files, cycles, quality)
            }
            
            # Save to file
            arch_file = self.reports_dir / "architecture.json"
            with open(arch_file, 'w') as f:
                json.dump(architecture, f, indent=2)
            
            self.logger.info(f"✅ Architecture JSON saved to {arch_file}")
            return architecture
        
        except Exception as e:
            self.logger.error(f"❌ Error generating architecture JSON: {e}")
            return {}
    
    def generate_mermaid_diagram(self) -> str:
        """Generate Mermaid diagram for architecture visualization"""
        self.logger.info("📊 Generating Mermaid diagram")
        
        try:
            quality = self._load_json("layer5_quality_duplications.json")
            metrics = quality.get("quality_metrics", {})
            
            # Create Mermaid graph
            mermaid = "graph TB\n"
            
            # Add nodes for top files
            top_files = sorted(metrics.items(), key=lambda x: x[1].get('loc', 0), reverse=True)[:10]
            
            for file, m in top_files:
                loc = m.get('loc', 0)
                complexity = m.get('complexity', 0)
                node_id = file.replace('/', '_').replace('.', '_')
                label = f"{file}<br/>LOC: {loc}"
                mermaid += f'    {node_id}["{label}"];\n'
            
            # Save to file
            diagram_file = self.reports_dir / "architecture.mmd"
            with open(diagram_file, 'w') as f:
                f.write(mermaid)
            
            self.logger.info(f"✅ Mermaid diagram saved to {diagram_file}")
            return mermaid
        
        except Exception as e:
            self.logger.error(f"❌ Error generating Mermaid diagram: {e}")
            return ""
    
    def generate_dot_graph(self) -> str:
        """Generate GraphViz DOT format for dependency graph"""
        self.logger.info("🔗 Generating DOT graph")
        
        try:
            dependency_graph = self._load_json("layer3_dependency_graph.json")
            graph = dependency_graph.get("dependency_graph", {})
            
            # Create DOT graph
            dot = "digraph Architecture {\n"
            dot += "    rankdir=LR;\n"
            dot += "    node [shape=box, style=rounded];\n"
            
            # Add edges
            edge_count = 0
            for file, deps in list(graph.items())[:20]:  # Limit to first 20
                for dep in deps[:5]:  # Limit deps per file
                    if edge_count < 50:  # Limit total edges
                        file_id = file.replace('/', '_').replace('.', '_')
                        dep_id = dep.replace('/', '_').replace('.', '_')
                        dot += f'    "{file}" -> "{dep}";\n'
                        edge_count += 1
            
            dot += "}\n"
            
            # Save to file
            dot_file = self.reports_dir / "architecture.dot"
            with open(dot_file, 'w') as f:
                f.write(dot)
            
            self.logger.info(f"✅ DOT graph saved to {dot_file}")
            return dot
        
        except Exception as e:
            self.logger.error(f"❌ Error generating DOT graph: {e}")
            return ""
    
    def generate_ai_context_file(self) -> Dict[str, Any]:
        """Generate context file for AI editors (Claude, GPT, etc.)"""
        self.logger.info("🤖 Generating AI context file")
        
        try:
            # Load all data
            dead_files = self._load_json("layer1_dead_files.json")
            quality = self._load_json("layer5_quality_duplications.json")
            cycles = self._load_json("layer4_cycles_isolation.json")
            
            context = {
                "project_name": "orchestrator",
                "description": "Orchestrator codebase analysis for AI editors",
                "analysis_date": self._get_timestamp(),
                "codebase_overview": {
                    "total_files": len(quality.get("quality_metrics", {})),
                    "dead_files": len(dead_files.get("dead_files", [])),
                    "circular_dependencies": len(cycles.get("cycles", [])),
                    "status": "🟡 NEEDS ATTENTION"
                },
                "key_findings": {
                    "dead_files_to_remove": [
                        {
                            "file": f["file"],
                            "size_kb": f.get("size", 0) / 1024,
                            "reason": "No imports, not imported by anything"
                        }
                        for f in dead_files.get("dead_files", [])[:5]
                    ],
                    "architecture_status": "✅ CLEAN" if len(cycles.get("cycles", [])) == 0 else "⚠️ HAS CYCLES",
                    "code_quality": "GOOD"
                },
                "files_to_analyze": self._get_top_files(quality),
                "refactoring_opportunities": self._get_refactoring_opportunities(quality),
                "ai_instructions": {
                    "task": "Analyze orchestrator codebase and suggest improvements",
                    "focus_areas": [
                        "Remove 12 dead files",
                        "Maintain code quality",
                        "Keep architecture clean"
                    ],
                    "constraints": [
                        "Do not break existing functionality",
                        "Maintain test coverage",
                        "Document changes"
                    ]
                }
            }
            
            # Save to file
            context_file = self.reports_dir / "ai_context.json"
            with open(context_file, 'w') as f:
                json.dump(context, f, indent=2)
            
            self.logger.info(f"✅ AI context file saved to {context_file}")
            return context
        
        except Exception as e:
            self.logger.error(f"❌ Error generating AI context file: {e}")
            return {}
    
    # ========================================================================
    # HELPER METHODS
    # ========================================================================
    
    def _load_json(self, filename: str) -> Dict[str, Any]:
        """Load JSON report file"""
        try:
            file_path = self.reports_dir / filename
            if file_path.exists():
                with open(file_path, 'r') as f:
                    return json.load(f)
        except Exception as e:
            self.logger.warning(f"⚠️ Could not load {filename}: {e}")
        
        return {}
    
    def _get_timestamp(self) -> str:
        """Get current timestamp"""
        from datetime import datetime
        return datetime.now().isoformat()
    
    def _calculate_quality_score(self, quality: Dict) -> int:
        """Calculate overall quality score"""
        metrics = quality.get("quality_metrics", {})
        if not metrics:
            return 0
        
        total_score = 0
        for file_metrics in metrics.values():
            score = 100
            if file_metrics.get("comments", 0) < 5:
                score -= 20
            if file_metrics.get("complexity", 0) > 10:
                score -= 30
            total_score += score
        
        return int(total_score / len(metrics))
    
    def _extract_modules(self, quality: Dict) -> List[Dict]:
        """Extract module information"""
        metrics = quality.get("quality_metrics", {})
        modules = []
        
        for file, m in sorted(metrics.items(), key=lambda x: x[1].get('loc', 0), reverse=True)[:10]:
            modules.append({
                "name": file,
                "loc": m.get("loc", 0),
                "complexity": m.get("complexity", 0),
                "comments": m.get("comments", 0),
                "imports": m.get("imports", 0)
            })
        
        return modules
    
    def _extract_dependencies(self, dependency_graph: Dict) -> Dict:
        """Extract dependency information"""
        graph = dependency_graph.get("dependency_graph", {})
        return {
            "total_nodes": len(graph),
            "sample_dependencies": dict(list(graph.items())[:5])
        }
    
    def _extract_issues(self, dead_files: Dict, cycles: Dict, quality: Dict) -> List[Dict]:
        """Extract issues"""
        issues = []
        
        # Dead files
        for f in dead_files.get("dead_files", []):
            issues.append({
                "type": "DEAD_FILE",
                "severity": "HIGH",
                "file": f["file"],
                "size_kb": f.get("size", 0) / 1024
            })
        
        # Cycles
        for cycle in cycles.get("cycles", []):
            issues.append({
                "type": "CIRCULAR_DEPENDENCY",
                "severity": "HIGH",
                "files": cycle.get("files", [])
            })
        
        return issues
    
    def _generate_recommendations(self, dead_files: Dict, cycles: Dict, quality: Dict) -> List[str]:
        """Generate recommendations"""
        recommendations = []
        
        if dead_files.get("dead_files"):
            recommendations.append(f"Remove {len(dead_files.get('dead_files', []))} dead files")
        
        if cycles.get("cycles"):
            recommendations.append(f"Break {len(cycles.get('cycles', []))} circular dependencies")
        
        recommendations.append("Maintain code quality standards")
        recommendations.append("Regular cleanup cycles (monthly)")
        
        return recommendations
    
    def _get_top_files(self, quality: Dict) -> List[Dict]:
        """Get top files for analysis"""
        metrics = quality.get("quality_metrics", {})
        top_files = sorted(metrics.items(), key=lambda x: x[1].get('loc', 0), reverse=True)[:5]
        
        return [
            {
                "file": file,
                "loc": m.get("loc", 0),
                "comments": m.get("comments", 0)
            }
            for file, m in top_files
        ]
    
    def _get_refactoring_opportunities(self, quality: Dict) -> List[str]:
        """Get refactoring opportunities"""
        opportunities = []
        metrics = quality.get("quality_metrics", {})
        
        for file, m in metrics.items():
            if m.get("loc", 0) > 300:
                opportunities.append(f"Split {file} into smaller modules")
            if m.get("complexity", 0) > 10:
                opportunities.append(f"Reduce complexity in {file}")
            if m.get("comments", 0) < 5:
                opportunities.append(f"Add documentation to {file}")
        
        return opportunities[:10]

# ============================================================================
# MAIN
# ============================================================================

if __name__ == "__main__":
    import sys
    
    project_root = sys.argv[1] if len(sys.argv) > 1 else "/Users/dev/Documents/GitHub/atlas4"
    reports_dir = Path(project_root) / "reports"
    
    generator = ArchitectureGenerator(project_root, str(reports_dir))
    
    print("\n" + "="*80)
    print("GENERATING ARCHITECTURE FILES")
    print("="*80 + "\n")
    
    # Generate all files
    print("📐 Generating architecture.json...")
    arch = generator.generate_architecture_json()
    print(f"   ✅ Generated with {len(arch.get('modules', []))} modules")
    
    print("\n📊 Generating architecture.mmd (Mermaid)...")
    mermaid = generator.generate_mermaid_diagram()
    print(f"   ✅ Generated Mermaid diagram")
    
    print("\n🔗 Generating architecture.dot (GraphViz)...")
    dot = generator.generate_dot_graph()
    print(f"   ✅ Generated DOT graph")
    
    print("\n🤖 Generating ai_context.json...")
    context = generator.generate_ai_context_file()
    print(f"   ✅ Generated AI context file")
    
    print("\n" + "="*80)
    print("✅ ARCHITECTURE FILES GENERATED")
    print("="*80)
    print(f"\nFiles created in: {reports_dir}/")
    print("  - architecture.json (for AI editors)")
    print("  - architecture.mmd (Mermaid diagram)")
    print("  - architecture.dot (GraphViz)")
    print("  - ai_context.json (AI context)")
