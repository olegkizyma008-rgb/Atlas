#!/usr/bin/env python3
"""
WINDSURF POWER TOOLS - Hyper-Powerful Code Analysis for Editors
Provides instant code quality assessment, dead code detection, duplicates, and recommendations
"""

import json
import os
from pathlib import Path
from typing import Dict, List, Any, Optional
import logging
from datetime import datetime

# ============================================================================
# LOGGING
# ============================================================================

def setup_logging(log_dir: Path):
    """Setup logging"""
    log_dir.mkdir(parents=True, exist_ok=True)
    log_file = log_dir / "windsurf_power_tools.log"
    
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
# WINDSURF POWER TOOLS
# ============================================================================

class WindsurfPowerTools:
    """Hyper-powerful tools for Windsurf editors"""
    
    def __init__(self, project_root: str, reports_dir: str):
        self.project_root = Path(project_root)
        self.reports_dir = Path(reports_dir)
        self.logger = setup_logging(self.project_root / "codemap-system" / "logs")
        self.logger.info("🚀 Windsurf Power Tools initialized")
    
    # ========================================================================
    # QUICK ASSESSMENT - Instant code situation overview
    # ========================================================================
    
    def get_quick_assessment(self, directory: str = "orchestrator") -> Dict[str, Any]:
        """
        Get instant assessment of code situation
        Perfect for editors to understand what's wrong at a glance
        """
        self.logger.info(f"📊 Quick assessment for {directory}")
        
        try:
            assessment = {
                "timestamp": datetime.now().isoformat(),
                "directory": directory,
                "status": "🔴 NEEDS ATTENTION",
                "critical_issues": [],
                "warnings": [],
                "quick_fixes": [],
                "estimated_cleanup_time": "2-4 hours"
            }
            
            # Load analysis data
            dead_files = self._load_json("layer1_dead_files.json")
            dead_functions = self._load_json("layer2_dead_functions.json")
            cycles = self._load_json("layer4_cycles_isolation.json")
            quality = self._load_json("layer5_quality_duplications.json")
            
            # Count issues
            dead_files_count = len(dead_files.get("dead_files", []))
            dead_functions_count = sum(len(v) for v in dead_functions.get("dead_functions", {}).values())
            cycles_count = len(cycles.get("cycles", []))
            
            # Critical issues
            if dead_files_count > 5:
                assessment["critical_issues"].append({
                    "type": "DEAD_FILES",
                    "count": dead_files_count,
                    "severity": "🔴 HIGH",
                    "description": f"{dead_files_count} unused files can be deleted",
                    "action": "Remove dead files to reduce codebase size"
                })
            
            if dead_functions_count > 20:
                assessment["critical_issues"].append({
                    "type": "DEAD_FUNCTIONS",
                    "count": dead_functions_count,
                    "severity": "🟠 MEDIUM",
                    "description": f"{dead_functions_count} unused functions found",
                    "action": "Clean up dead functions"
                })
            
            if cycles_count > 0:
                assessment["critical_issues"].append({
                    "type": "CIRCULAR_DEPENDENCIES",
                    "count": cycles_count,
                    "severity": "🔴 HIGH",
                    "description": f"{cycles_count} circular dependencies detected",
                    "action": "Break cycles to improve architecture"
                })
            
            # Warnings
            low_quality_files = self._find_low_quality_files(quality)
            if low_quality_files:
                assessment["warnings"].append({
                    "type": "LOW_QUALITY",
                    "count": len(low_quality_files),
                    "severity": "🟡 MEDIUM",
                    "description": f"{len(low_quality_files)} files have low quality scores",
                    "files": low_quality_files[:5]
                })
            
            # Quick fixes
            assessment["quick_fixes"] = [
                {
                    "priority": 1,
                    "action": "Delete dead files",
                    "files": dead_files.get("dead_files", [])[:3],
                    "time": "5 min",
                    "impact": "Reduces codebase by 50+ KB"
                },
                {
                    "priority": 2,
                    "action": "Remove dead functions",
                    "count": dead_functions_count,
                    "time": "30 min",
                    "impact": "Improves code clarity"
                },
                {
                    "priority": 3,
                    "action": "Break circular dependencies",
                    "count": cycles_count,
                    "time": "1-2 hours",
                    "impact": "Improves architecture"
                }
            ]
            
            # Update status
            if len(assessment["critical_issues"]) == 0:
                assessment["status"] = "✅ HEALTHY"
            elif len(assessment["critical_issues"]) <= 2:
                assessment["status"] = "🟡 NEEDS ATTENTION"
            else:
                assessment["status"] = "🔴 CRITICAL"
            
            return assessment
        
        except Exception as e:
            self.logger.error(f"❌ Error in quick assessment: {e}")
            return {"error": str(e)}
    
    # ========================================================================
    # CODE DISQUALIFICATION - What to remove/fix
    # ========================================================================
    
    def get_disqualification_report(self, directory: str = "orchestrator") -> Dict[str, Any]:
        """
        Get comprehensive disqualification report
        Shows exactly what code should be removed or fixed
        """
        self.logger.info(f"🚨 Disqualification report for {directory}")
        
        try:
            report = {
                "timestamp": datetime.now().isoformat(),
                "directory": directory,
                "total_issues": 0,
                "can_be_deleted": [],
                "must_be_fixed": [],
                "should_be_refactored": [],
                "summary": {}
            }
            
            # Load data
            dead_files = self._load_json("layer1_dead_files.json")
            dead_functions = self._load_json("layer2_dead_functions.json")
            cycles = self._load_json("layer4_cycles_isolation.json")
            quality = self._load_json("layer5_quality_duplications.json")
            
            # Can be deleted
            for dead_file in dead_files.get("dead_files", []):
                report["can_be_deleted"].append({
                    "file": dead_file["file"],
                    "reason": "No imports, not imported by anything",
                    "size": f"{dead_file.get('size', 0) / 1024:.1f} KB",
                    "risk": "🟢 LOW",
                    "action": "DELETE"
                })
            
            # Must be fixed
            for cycle in cycles.get("cycles", []):
                report["must_be_fixed"].append({
                    "type": "CIRCULAR_DEPENDENCY",
                    "files": cycle.get("files", []),
                    "reason": "Circular dependencies prevent proper module loading",
                    "risk": "🔴 HIGH",
                    "action": "BREAK CYCLE"
                })
            
            # Should be refactored
            low_quality = self._find_low_quality_files(quality)
            for file_path in low_quality:
                metrics = quality.get("quality_metrics", {}).get(file_path, {})
                report["should_be_refactored"].append({
                    "file": file_path,
                    "loc": metrics.get("loc", 0),
                    "complexity": metrics.get("complexity", 0),
                    "comments": metrics.get("comments", 0),
                    "reason": "Low quality score - needs documentation and simplification",
                    "risk": "🟡 MEDIUM",
                    "action": "REFACTOR"
                })
            
            # Summary
            report["total_issues"] = (
                len(report["can_be_deleted"]) +
                len(report["must_be_fixed"]) +
                len(report["should_be_refactored"])
            )
            
            report["summary"] = {
                "deletable_files": len(report["can_be_deleted"]),
                "critical_fixes": len(report["must_be_fixed"]),
                "refactoring_needed": len(report["should_be_refactored"]),
                "total_size_to_remove": sum(
                    float(f["size"].split()[0]) 
                    for f in report["can_be_deleted"]
                ),
                "estimated_cleanup_time": self._estimate_cleanup_time(report)
            }
            
            return report
        
        except Exception as e:
            self.logger.error(f"❌ Error in disqualification report: {e}")
            return {"error": str(e)}
    
    # ========================================================================
    # EDITOR QUICK VIEW - What editor needs to know NOW
    # ========================================================================
    
    def get_editor_quick_view(self, file_path: str) -> Dict[str, Any]:
        """
        Get quick view for editor about a specific file
        Shows: is it dead? duplicates? quality issues? what to do?
        """
        self.logger.info(f"👁️ Quick view for {file_path}")
        
        try:
            view = {
                "file": file_path,
                "timestamp": datetime.now().isoformat(),
                "status": "✅ OK",
                "issues": [],
                "recommendations": [],
                "action": "KEEP"
            }
            
            # Load data
            dead_files = self._load_json("layer1_dead_files.json")
            quality = self._load_json("layer5_quality_duplications.json")
            
            # Check if dead
            is_dead = any(f["file"] == file_path for f in dead_files.get("dead_files", []))
            if is_dead:
                view["status"] = "🔴 DEAD FILE"
                view["issues"].append("This file is not imported by anything")
                view["recommendations"].append("DELETE this file")
                view["action"] = "DELETE"
                return view
            
            # Check quality
            metrics = quality.get("quality_metrics", {}).get(file_path, {})
            if metrics:
                health_score = self._calculate_health_score(metrics)
                view["health_score"] = health_score
                view["metrics"] = metrics
                
                if health_score < 40:
                    view["status"] = "🔴 POOR QUALITY"
                    view["action"] = "REFACTOR"
                elif health_score < 60:
                    view["status"] = "🟡 NEEDS ATTENTION"
                    view["action"] = "IMPROVE"
                else:
                    view["status"] = "✅ GOOD QUALITY"
                    view["action"] = "KEEP"
                
                # Specific recommendations
                if metrics.get("comments", 0) < 5:
                    view["recommendations"].append("Add documentation/comments")
                
                if metrics.get("loc", 0) > 300:
                    view["recommendations"].append("File is too large - split into modules")
                
                if metrics.get("complexity", 0) > 10:
                    view["recommendations"].append("Reduce complexity")
            
            return view
        
        except Exception as e:
            self.logger.error(f"❌ Error in editor quick view: {e}")
            return {"error": str(e)}
    
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
    
    def _find_low_quality_files(self, quality_data: Dict) -> List[str]:
        """Find files with low quality scores"""
        low_quality = []
        metrics = quality_data.get("quality_metrics", {})
        
        for file_path, file_metrics in metrics.items():
            score = self._calculate_health_score(file_metrics)
            if score < 60:
                low_quality.append(file_path)
        
        return sorted(low_quality)[:10]
    
    def _calculate_health_score(self, metrics: Dict) -> int:
        """Calculate health score (0-100)"""
        score = 100
        
        if metrics.get("comments", 0) < 5:
            score -= 20
        
        if metrics.get("complexity", 0) > 10:
            score -= 30
        
        loc = metrics.get("loc", 0)
        comments = metrics.get("comments", 0)
        if loc > 200 and comments < loc / 20:
            score -= 15
        
        return max(0, min(100, score))
    
    def _estimate_cleanup_time(self, report: Dict) -> str:
        """Estimate cleanup time"""
        total_issues = report["total_issues"]
        
        if total_issues == 0:
            return "0 min (clean)"
        elif total_issues < 5:
            return "15-30 min"
        elif total_issues < 15:
            return "1-2 hours"
        elif total_issues < 30:
            return "2-4 hours"
        else:
            return "4+ hours"

# ============================================================================
# MAIN
# ============================================================================

if __name__ == "__main__":
    import sys
    
    project_root = sys.argv[1] if len(sys.argv) > 1 else "/Users/dev/Documents/GitHub/atlas4"
    reports_dir = Path(project_root) / "reports"
    
    tools = WindsurfPowerTools(project_root, str(reports_dir))
    
    # Test quick assessment
    print("\n" + "="*80)
    print("QUICK ASSESSMENT")
    print("="*80)
    assessment = tools.get_quick_assessment()
    print(json.dumps(assessment, indent=2))
    
    # Test disqualification report
    print("\n" + "="*80)
    print("DISQUALIFICATION REPORT")
    print("="*80)
    disqualification = tools.get_disqualification_report()
    print(json.dumps(disqualification, indent=2))
    
    # Test editor quick view
    print("\n" + "="*80)
    print("EDITOR QUICK VIEW (app.js)")
    print("="*80)
    quick_view = tools.get_editor_quick_view("app.js")
    print(json.dumps(quick_view, indent=2))
