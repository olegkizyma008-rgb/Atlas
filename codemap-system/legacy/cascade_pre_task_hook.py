#!/usr/bin/env python3
"""
Cascade Pre-Task Hook - Automatic context loading before each task
Integrates with Windsurf Cascade to provide code analysis context
"""

import json
import os
import sys
from pathlib import Path
from typing import Dict, List, Any, Optional
from datetime import datetime
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class CascadePreTaskHook:
    """
    Automatically loads CodeMap context before each Cascade task.
    
    This hook:
    1. Detects when a new task is starting in Cascade
    2. Loads latest analysis data
    3. Prepares context about code quality
    4. Injects context into Cascade's prompt
    """
    
    def __init__(self, project_root: str = "./"):
        self.project_root = Path(project_root)
        self.reports_dir = self.project_root / "reports"
        self.context_cache = {}
        self.last_load = None
        logger.info(f"Initialized CascadePreTaskHook for {self.project_root}")
    
    def get_pre_task_context(self) -> str:
        """
        Generate context string to inject before each task.
        
        Returns a formatted string with:
        - Code quality summary
        - Dead code warnings
        - Circular dependencies
        - Refactoring suggestions
        - Complexity metrics
        """
        context_parts = []
        
        # Load latest analysis
        analysis = self._load_analysis()
        if not analysis:
            return "# CodeMap Context\n\nNo analysis data available yet. Run /update-codemap first."
        
        # Build context
        context_parts.append("# 📊 CodeMap Context - Automatic Pre-Task Analysis\n")
        context_parts.append(f"*Last updated: {analysis.get('timestamp', 'Unknown')}*\n")
        
        # Project overview
        context_parts.append(self._format_project_overview(analysis))
        
        # Quality issues
        context_parts.append(self._format_quality_issues(analysis))
        
        # Refactoring opportunities
        context_parts.append(self._format_refactoring_opportunities(analysis))
        
        # Complexity metrics
        context_parts.append(self._format_complexity_metrics(analysis))
        
        # Recommendations
        context_parts.append(self._format_recommendations(analysis))
        
        return "\n".join(context_parts)
    
    def _load_analysis(self) -> Optional[Dict[str, Any]]:
        """Load latest analysis from reports"""
        report_path = self.reports_dir / "codemap_analysis.json"
        
        if not report_path.exists():
            logger.warning("Analysis report not found")
            return None
        
        try:
            with open(report_path, 'r') as f:
                return json.load(f)
        except Exception as e:
            logger.error(f"Error loading analysis: {e}")
            return None
    
    def _format_project_overview(self, analysis: Dict[str, Any]) -> str:
        """Format project overview section"""
        return f"""
## 📈 Project Overview
- **Files Analyzed**: {analysis.get('files_analyzed', 0)}
- **Total Functions**: {analysis.get('total_functions', 0)}
- **Total Imports**: {analysis.get('total_imports', 0)}
- **Dependency Nodes**: {analysis.get('dependency_graph', {}).get('nodes', 0)}
- **Dependency Edges**: {analysis.get('dependency_graph', {}).get('edges', 0)}
"""
    
    def _format_quality_issues(self, analysis: Dict[str, Any]) -> str:
        """Format quality issues section"""
        dead_code = analysis.get('dead_code', {})
        cycles = analysis.get('cycles', [])
        
        issues = []
        
        # Dead code
        unused_funcs = len(dead_code.get('functions', []))
        if unused_funcs > 0:
            issues.append(f"🔴 **{unused_funcs} unused functions** - Consider removing or refactoring")
        
        unused_private = len(dead_code.get('private_methods', []))
        if unused_private > 0:
            issues.append(f"🟡 **{unused_private} unused private methods** - May indicate incomplete refactoring")
        
        # Circular dependencies
        if cycles:
            issues.append(f"🔴 **{len(cycles)} circular dependencies** - High priority to fix")
        
        if not issues:
            return "\n## ✅ Quality Status\nNo major issues detected!"
        
        return f"""
## ⚠️ Quality Issues
{chr(10).join(f"- {issue}" for issue in issues)}
"""
    
    def _format_refactoring_opportunities(self, analysis: Dict[str, Any]) -> str:
        """Format refactoring opportunities"""
        opportunities = []
        
        dead_code = analysis.get('dead_code', {})
        
        if dead_code.get('functions'):
            opportunities.append({
                "title": "Remove Dead Code",
                "count": len(dead_code['functions']),
                "impact": "High",
                "effort": "Low"
            })
        
        if analysis.get('cycles'):
            opportunities.append({
                "title": "Break Circular Dependencies",
                "count": len(analysis['cycles']),
                "impact": "High",
                "effort": "Medium"
            })
        
        metrics = analysis.get('complexity_metrics', {})
        if metrics.get('average_imports_per_file', 0) > 10:
            opportunities.append({
                "title": "Reduce Module Coupling",
                "count": 1,
                "impact": "Medium",
                "effort": "Medium"
            })
        
        if not opportunities:
            return "\n## 🎯 Refactoring Opportunities\nNone at this time!"
        
        opp_text = "\n## 🎯 Refactoring Opportunities\n"
        for opp in opportunities:
            opp_text += f"- **{opp['title']}** ({opp['count']} items) - Impact: {opp['impact']}, Effort: {opp['effort']}\n"
        
        return opp_text
    
    def _format_complexity_metrics(self, analysis: Dict[str, Any]) -> str:
        """Format complexity metrics"""
        metrics = analysis.get('complexity_metrics', {})
        
        avg_imports = metrics.get('average_imports_per_file', 0)
        avg_functions = metrics.get('average_functions_per_file', 0)
        max_depth = metrics.get('max_dependency_depth', 0)
        
        return f"""
## 📊 Complexity Metrics
- **Avg Imports/File**: {avg_imports:.2f}
- **Avg Functions/File**: {avg_functions:.2f}
- **Max Dependency Depth**: {max_depth}

**Interpretation**:
- Avg Imports > 10: High coupling (consider modularization)
- Avg Functions > 20: Large files (consider splitting)
- Max Depth > 5: Deep dependency chains (consider refactoring)
"""
    
    def _format_recommendations(self, analysis: Dict[str, Any]) -> str:
        """Format recommendations for this task"""
        recommendations = []
        
        dead_code = analysis.get('dead_code', {})
        cycles = analysis.get('cycles', [])
        metrics = analysis.get('complexity_metrics', {})
        
        # Priority 1: Fix cycles
        if cycles:
            recommendations.append({
                "priority": 1,
                "action": "Fix circular dependencies first",
                "reason": "Blocks other improvements",
                "effort": "Medium"
            })
        
        # Priority 2: Remove dead code
        if dead_code.get('functions'):
            recommendations.append({
                "priority": 2,
                "action": "Remove unused functions",
                "reason": f"{len(dead_code['functions'])} functions not used",
                "effort": "Low"
            })
        
        # Priority 3: Reduce coupling
        if metrics.get('average_imports_per_file', 0) > 10:
            recommendations.append({
                "priority": 3,
                "action": "Reduce module coupling",
                "reason": f"High average imports: {metrics['average_imports_per_file']:.2f}",
                "effort": "Medium"
            })
        
        if not recommendations:
            return "\n## 💡 Recommendations\nCode quality is good! Focus on new features."
        
        rec_text = "\n## 💡 Recommendations for This Task\n"
        for rec in sorted(recommendations, key=lambda x: x['priority']):
            rec_text += f"**P{rec['priority']}**: {rec['action']}\n"
            rec_text += f"  - Reason: {rec['reason']}\n"
            rec_text += f"  - Effort: {rec['effort']}\n"
        
        return rec_text
    
    def get_file_context(self, file_path: str) -> str:
        """
        Get context for a specific file.
        
        Useful when working on a specific file.
        """
        analysis = self._load_analysis()
        if not analysis:
            return f"No analysis data for {file_path}"
        
        file_imports = analysis.get('file_imports', {})
        func_defs = analysis.get('function_definitions', {})
        dead_code = analysis.get('dead_code', {})
        
        context = f"# 📄 Context for {file_path}\n"
        
        # Dependencies
        if file_path in file_imports:
            context += f"\n## Dependencies\n"
            for dep in file_imports[file_path]:
                context += f"- {dep}\n"
        
        # Functions
        if file_path in func_defs:
            context += f"\n## Functions ({len(func_defs[file_path])})\n"
            for func_name, func_info in func_defs[file_path].items():
                context += f"- `{func_name}` (line {func_info.get('lineno', '?')})\n"
        
        # Dead code in this file
        file_dead_code = [
            item for item in dead_code.get('functions', [])
            if item.get('file') == file_path
        ]
        if file_dead_code:
            context += f"\n## ⚠️ Dead Code in This File\n"
            for item in file_dead_code:
                context += f"- `{item['name']}` (line {item['line']})\n"
        
        return context
    
    def detect_context_type(self, user_prompt: str) -> List[str]:
        """
        Detect what type of analysis is needed based on user prompt.
        
        Returns list of context types to load.
        """
        prompt_lower = user_prompt.lower()
        context_types = []
        
        # Architecture/dependencies
        if any(word in prompt_lower for word in ['архітектур', 'залежност', 'граф', 'модуль', 'структур', 'architecture', 'dependency', 'graph', 'module', 'structure']):
            context_types.append('dependencies')
        
        # Dead code
        if any(word in prompt_lower for word in ['мертв', 'невикористан', 'unused', 'dead', 'remove', 'видалити']):
            context_types.append('dead_code')
        
        # Refactoring
        if any(word in prompt_lower for word in ['рефактор', 'покращ', 'refactor', 'improve', 'clean']):
            context_types.append('refactoring')
        
        # Testing
        if any(word in prompt_lower for word in ['тест', 'покриття', 'test', 'coverage', 'mock']):
            context_types.append('testing')
        
        # Security
        if any(word in prompt_lower for word in ['безпек', 'вразлив', 'security', 'vulnerability', 'attack']):
            context_types.append('security')
        
        # Performance
        if any(word in prompt_lower for word in ['продуктив', 'швидк', 'оптимізац', 'performance', 'speed', 'optimize']):
            context_types.append('performance')
        
        # Complexity
        if any(word in prompt_lower for word in ['складност', 'зв', 'язок', 'complexity', 'coupling']):
            context_types.append('complexity')
        
        # If no specific context detected, return general
        if not context_types:
            context_types.append('general')
        
        return context_types
    
    def get_context_for_types(self, context_types: List[str]) -> str:
        """Get context for specific types"""
        analysis = self._load_analysis()
        if not analysis:
            return "No analysis data available"
        
        context_parts = []
        
        for ctx_type in context_types:
            if ctx_type == 'dependencies':
                context_parts.append(self._format_dependencies_context(analysis))
            elif ctx_type == 'dead_code':
                context_parts.append(self._format_dead_code_context(analysis))
            elif ctx_type == 'refactoring':
                context_parts.append(self._format_refactoring_context(analysis))
            elif ctx_type == 'testing':
                context_parts.append(self._format_testing_context(analysis))
            elif ctx_type == 'security':
                context_parts.append(self._format_security_context(analysis))
            elif ctx_type == 'performance':
                context_parts.append(self._format_performance_context(analysis))
            elif ctx_type == 'complexity':
                context_parts.append(self._format_complexity_context(analysis))
        
        return "\n".join(context_parts)
    
    def _format_dependencies_context(self, analysis: Dict[str, Any]) -> str:
        """Format dependencies context"""
        dep_graph = analysis.get('dependency_graph', {})
        return f"""
## 🔗 Dependency Analysis
- **Nodes**: {dep_graph.get('nodes', 0)}
- **Edges**: {dep_graph.get('edges', 0)}
- **Cycles**: {len(analysis.get('cycles', []))}

**Recommendation**: {
    'Fix circular dependencies first!' if analysis.get('cycles') 
    else 'Dependency graph is clean.'
}
"""
    
    def _format_dead_code_context(self, analysis: Dict[str, Any]) -> str:
        """Format dead code context"""
        dead_code = analysis.get('dead_code', {})
        unused_funcs = len(dead_code.get('functions', []))
        unused_imports = len(dead_code.get('imports', []))
        
        return f"""
## 💀 Dead Code Analysis
- **Unused Functions**: {unused_funcs}
- **Unused Imports**: {unused_imports}
- **Unused Private Methods**: {len(dead_code.get('private_methods', []))}

**Top Unused Functions**:
{chr(10).join(f"- `{item['name']}` in {item['file']} (line {item['line']})" 
              for item in dead_code.get('functions', [])[:5])}
"""
    
    def _format_refactoring_context(self, analysis: Dict[str, Any]) -> str:
        """Format refactoring context"""
        return f"""
## 🔨 Refactoring Opportunities
- **Dead Code Items**: {len(analysis.get('dead_code', {}).get('functions', []))}
- **Circular Dependencies**: {len(analysis.get('cycles', []))}
- **High Coupling Files**: {sum(1 for imports in analysis.get('file_imports', {}).values() if len(imports) > 10)}

**Priority Actions**:
1. Remove dead code
2. Break circular dependencies
3. Reduce module coupling
"""
    
    def _format_testing_context(self, analysis: Dict[str, Any]) -> str:
        """Format testing context"""
        metrics = analysis.get('complexity_metrics', {})
        return f"""
## 🧪 Testing Recommendations
- **Total Functions**: {analysis.get('total_functions', 0)}
- **Avg Imports/File**: {metrics.get('average_imports_per_file', 0):.2f}
- **High Coupling Modules**: {sum(1 for imports in analysis.get('file_imports', {}).values() if len(imports) > 10)}

**Test Strategy**:
- Focus on high-coupling modules
- Mock external dependencies
- Add integration tests for complex flows
"""
    
    def _format_security_context(self, analysis: Dict[str, Any]) -> str:
        """Format security context"""
        dead_code = analysis.get('dead_code', {})
        cycles = analysis.get('cycles', [])
        
        return f"""
## 🔒 Security Analysis
- **Dead Code Items**: {len(dead_code.get('functions', []))} (increases attack surface)
- **Circular Dependencies**: {len(cycles)} (complicates auditing)
- **Total Functions**: {analysis.get('total_functions', 0)}

**Security Actions**:
- Remove dead code to reduce attack surface
- Resolve circular dependencies for better auditability
- Review high-complexity modules
"""
    
    def _format_performance_context(self, analysis: Dict[str, Any]) -> str:
        """Format performance context"""
        dead_code = analysis.get('dead_code', {})
        metrics = analysis.get('complexity_metrics', {})
        
        return f"""
## ⚡ Performance Analysis
- **Dead Code**: {len(dead_code.get('functions', []))} functions (slows builds)
- **Avg Imports/File**: {metrics.get('average_imports_per_file', 0):.2f} (impacts caching)
- **Dependency Edges**: {analysis.get('dependency_graph', {}).get('edges', 0)}

**Optimization Actions**:
- Remove dead code for faster builds
- Reduce coupling for better caching
- Use dynamic imports for large graphs
"""
    
    def _format_complexity_context(self, analysis: Dict[str, Any]) -> str:
        """Format complexity context"""
        metrics = analysis.get('complexity_metrics', {})
        
        return f"""
## 📊 Complexity Metrics
- **Avg Imports/File**: {metrics.get('average_imports_per_file', 0):.2f}
- **Avg Functions/File**: {metrics.get('average_functions_per_file', 0):.2f}
- **Max Dependency Depth**: {metrics.get('max_dependency_depth', 0)}

**Complexity Assessment**:
- Imports: {'High' if metrics.get('average_imports_per_file', 0) > 10 else 'Normal'}
- Functions: {'Large' if metrics.get('average_functions_per_file', 0) > 20 else 'Normal'}
"""
    
    def inject_into_cascade_prompt(self, user_prompt: str) -> str:
        """
        Inject CodeMap context into user's prompt.
        
        This is called before sending to Cascade.
        Automatically detects needed context types.
        """
        # Detect what context is needed
        context_types = self.detect_context_type(user_prompt)
        
        # Get relevant context
        relevant_context = self.get_context_for_types(context_types)
        
        # Also get general overview
        general_context = self.get_pre_task_context()
        
        # Prepend context to prompt
        enhanced_prompt = f"""{general_context}

{relevant_context}

---

## User Task

{user_prompt}

---

**Note**: The above CodeMap context is automatically generated based on your task. Use it to make better decisions about code quality and architecture.
"""
        
        return enhanced_prompt
    
    def should_update_context(self) -> bool:
        """Check if context should be reloaded"""
        report_path = self.reports_dir / "codemap_analysis.json"
        
        if not report_path.exists():
            return True
        
        if self.last_load is None:
            return True
        
        # Reload if file is newer than last load
        file_mtime = report_path.stat().st_mtime
        return file_mtime > self.last_load


def main():
    """Main entry point"""
    import argparse
    
    parser = argparse.ArgumentParser(description="Cascade Pre-Task Hook")
    parser.add_argument("--project", default="./", help="Project root")
    parser.add_argument("--mode", choices=["context", "file-context", "inject"],
                       default="context", help="Operation mode")
    parser.add_argument("--file", help="File path for file-context mode")
    parser.add_argument("--prompt", help="User prompt for inject mode")
    
    args = parser.parse_args()
    
    hook = CascadePreTaskHook(args.project)
    
    if args.mode == "context":
        print(hook.get_pre_task_context())
    elif args.mode == "file-context":
        if args.file:
            print(hook.get_file_context(args.file))
        else:
            print("Error: --file required for file-context mode")
    elif args.mode == "inject":
        if args.prompt:
            print(hook.inject_into_cascade_prompt(args.prompt))
        else:
            print("Error: --prompt required for inject mode")


if __name__ == "__main__":
    main()
