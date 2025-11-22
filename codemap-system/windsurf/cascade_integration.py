#!/usr/bin/env python3
"""
Cascade Integration - Інтеграція з Windsurf Cascade
"""

import json
import logging
from pathlib import Path
from typing import Dict, List, Any, Optional, Callable
import sys

sys.path.insert(0, str(Path(__file__).parent.parent))

from core.architecture_mapper import ArchitectureMapper
from analysis.security_analyzer import SecurityAnalyzer
from analysis.performance_analyzer import PerformanceAnalyzer
from analysis.refactoring_recommender import RefactoringRecommender

logger = logging.getLogger(__name__)


class CascadeIntegration:
    """Інтеграція з Windsurf Cascade"""
    
    def __init__(self, project_root: Optional[Path] = None):
        self.project_root = project_root or Path('.')
        
        # Ініціалізуємо аналізатори
        self.arch_mapper = ArchitectureMapper(project_root=self.project_root)
        self.security_analyzer = SecurityAnalyzer(project_root=self.project_root)
        self.performance_analyzer = PerformanceAnalyzer(project_root=self.project_root)
        self.refactoring_recommender = RefactoringRecommender(project_root=self.project_root)
        
        # Реєстр команд
        self.commands: Dict[str, Callable] = {
            'analyze': self.cmd_analyze,
            'dependencies': self.cmd_dependencies,
            'unused': self.cmd_unused,
            'circular': self.cmd_circular,
            'duplicates': self.cmd_duplicates,
            'refactor': self.cmd_refactor,
            'health': self.cmd_health,
            'report': self.cmd_report,
            'security': self.cmd_security,
            'performance': self.cmd_performance,
        }
        
        logger.info(f"✅ Cascade Integration ініціалізована ({len(self.commands)} команд)")
    
    def execute_command(self, command: str, args: Optional[List[str]] = None) -> Dict[str, Any]:
        """Виконати команду Cascade"""
        logger.info(f"🔧 Виконання команди: {command}")
        
        if command not in self.commands:
            return {
                "status": "error",
                "message": f"Невідома команда: {command}",
                "available_commands": list(self.commands.keys())
            }
        
        try:
            result = self.commands[command](args or [])
            return {
                "status": "success",
                "command": command,
                "result": result
            }
        except Exception as e:
            logger.error(f"❌ Помилка виконання команди {command}: {e}")
            return {
                "status": "error",
                "command": command,
                "error": str(e)
            }
    
    def cmd_analyze(self, args: List[str]) -> Dict[str, Any]:
        """Команда: аналіз архітектури"""
        architecture = self.arch_mapper.analyze_architecture(max_depth=2)
        
        return {
            "type": "architecture_analysis",
            "statistics": architecture.get('statistics', {}),
            "files_count": len(architecture.get('dependencies', {})),
            "circular_dependencies": len(architecture.get('circular_dependencies', [])),
            "unused_files": len([f for f, d in architecture.get('dependencies', {}).items() 
                               if not d and f not in architecture.get('dependencies', {}).values()])
        }
    
    def cmd_dependencies(self, args: List[str]) -> Dict[str, Any]:
        """Команда: залежності файлу"""
        if not args:
            return {"error": "Потрібно вказати файл"}
        
        file_path = args[0]
        architecture = self.arch_mapper.analyze_architecture(max_depth=2)
        
        deps = architecture.get('dependencies', {}).get(file_path, [])
        
        return {
            "file": file_path,
            "dependencies": deps,
            "count": len(deps)
        }
    
    def cmd_unused(self, args: List[str]) -> Dict[str, Any]:
        """Команда: невикористовувані файли"""
        architecture = self.arch_mapper.analyze_architecture(max_depth=2)
        
        unused = []
        for file_path, deps in architecture.get('dependencies', {}).items():
            if not deps:
                unused.append(file_path)
        
        return {
            "unused_files": unused,
            "count": len(unused)
        }
    
    def cmd_circular(self, args: List[str]) -> Dict[str, Any]:
        """Команда: циклічні залежності"""
        architecture = self.arch_mapper.analyze_architecture(max_depth=2)
        
        cycles = architecture.get('circular_dependencies', [])
        
        return {
            "circular_dependencies": cycles,
            "count": len(cycles)
        }
    
    def cmd_duplicates(self, args: List[str]) -> Dict[str, Any]:
        """Команда: дублікати коду"""
        # Це буде реалізовано через duplication_analyzer
        return {
            "duplicates": [],
            "message": "Дублікати будуть виявлені через duplication_analyzer"
        }
    
    def cmd_refactor(self, args: List[str]) -> Dict[str, Any]:
        """Команда: рекомендації рефакторингу"""
        priority = args[0] if args else 'high'
        
        self.refactoring_recommender.analyze_architecture()
        recommendations = self.refactoring_recommender.get_recommendations_by_priority(priority)
        
        return {
            "priority": priority,
            "recommendations": recommendations[:5],
            "count": len(recommendations)
        }
    
    def cmd_health(self, args: List[str]) -> Dict[str, Any]:
        """Команда: здоров'я архітектури"""
        architecture = self.arch_mapper.analyze_architecture(max_depth=2)
        stats = architecture.get('statistics', {})
        
        # Обчислюємо оцінку здоров'я
        health_score = 100
        
        # Циклічні залежності (-20 за кожну)
        cycles = len(architecture.get('circular_dependencies', []))
        health_score -= cycles * 20
        
        # Невикористовувані файли (-5 за кожен)
        unused = stats.get('unused_files', 0)
        health_score -= unused * 5
        
        # Висока зв'язність (-10 за файл)
        high_coupling = len([f for f, d in architecture.get('dependencies', {}).items() if len(d) > 10])
        health_score -= high_coupling * 10
        
        health_score = max(0, min(100, health_score))
        
        return {
            "health_score": health_score,
            "status": "healthy" if health_score >= 70 else "warning" if health_score >= 40 else "critical",
            "issues": {
                "circular_dependencies": cycles,
                "unused_files": unused,
                "high_coupling_files": high_coupling
            }
        }
    
    def cmd_report(self, args: List[str]) -> Dict[str, Any]:
        """Команда: експорт звіту"""
        format_type = args[0] if args else 'json'
        
        architecture = self.arch_mapper.analyze_architecture(max_depth=2)
        security = self.security_analyzer.analyze_project()
        performance = self.performance_analyzer.analyze_project()
        
        report = {
            "timestamp": __import__('datetime').datetime.now().isoformat(),
            "architecture": architecture.get('statistics', {}),
            "security": {
                "total_issues": security.get('total_issues', 0),
                "critical": security.get('critical_count', 0)
            },
            "performance": {
                "total_issues": performance.get('total_issues', 0),
                "critical": performance.get('critical_count', 0)
            }
        }
        
        return {
            "format": format_type,
            "report": report
        }
    
    def cmd_security(self, args: List[str]) -> Dict[str, Any]:
        """Команда: аналіз безпеки"""
        result = self.security_analyzer.analyze_project()
        
        return {
            "total_issues": result.get('total_issues', 0),
            "by_severity": result.get('by_severity', {}),
            "critical_count": result.get('critical_count', 0),
            "high_count": result.get('high_count', 0)
        }
    
    def cmd_performance(self, args: List[str]) -> Dict[str, Any]:
        """Команда: аналіз продуктивності"""
        result = self.performance_analyzer.analyze_project()
        
        return {
            "total_issues": result.get('total_issues', 0),
            "by_severity": result.get('by_severity', {}),
            "critical_count": result.get('critical_count', 0),
            "high_count": result.get('high_count', 0)
        }
    
    def get_available_commands(self) -> List[Dict[str, str]]:
        """Отримати список доступних команд"""
        commands_info = [
            {"name": "analyze", "description": "Аналіз архітектури проекту"},
            {"name": "dependencies", "description": "Показати залежності файлу"},
            {"name": "unused", "description": "Знайти невикористовувані файли"},
            {"name": "circular", "description": "Знайти циклічні залежності"},
            {"name": "duplicates", "description": "Знайти дублікати коду"},
            {"name": "refactor", "description": "Отримати рекомендації рефакторингу"},
            {"name": "health", "description": "Оцінка здоров'я архітектури"},
            {"name": "report", "description": "Експортувати детальний звіт"},
            {"name": "security", "description": "Аналіз безпеки коду"},
            {"name": "performance", "description": "Аналіз продуктивності коду"},
        ]
        
        return commands_info
    
    def get_status(self) -> Dict[str, Any]:
        """Отримати статус інтеграції"""
        return {
            "status": "active",
            "project_root": str(self.project_root),
            "commands_available": len(self.commands),
            "analyzers": {
                "architecture": "ready",
                "security": "ready",
                "performance": "ready",
                "refactoring": "ready"
            }
        }


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    
    integration = CascadeIntegration(Path('.'))
    
    # Тестуємо команди
    print("🔧 Cascade Integration Test")
    print(f"Status: {integration.get_status()}")
    print(f"\nAvailable commands: {len(integration.get_available_commands())}")
    
    # Виконуємо тестову команду
    result = integration.execute_command('health')
    print(f"\nHealth check: {result}")
