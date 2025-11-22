#!/usr/bin/env python3
"""
Performance Analyzer - Аналіз продуктивності коду
"""

import re
from pathlib import Path
from typing import Dict, List, Any, Optional
import sys

sys.path.insert(0, str(Path(__file__).parent.parent))


class PerformanceIssue:
    """Проблема продуктивності"""
    
    def __init__(self, severity: str, issue_type: str, message: str, line: int = 0):
        self.severity = severity  # critical, high, medium, low
        self.issue_type = issue_type
        self.message = message
        self.line = line
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "severity": self.severity,
            "type": self.issue_type,
            "message": self.message,
            "line": self.line
        }


class PerformanceAnalyzer:
    """Аналізатор продуктивності коду"""
    
    def __init__(self, project_root: Optional[Path] = None):
        self.project_root = project_root or Path('.')
        
        # Паттерни проблем продуктивності
        self.performance_patterns = {
            # N+1 Queries
            r'for\s+\w+\s+in\s+.*:\s*.*query|for\s+\w+\s+in\s+.*:\s*.*select': 
                ('high', 'n_plus_one', 'Можливий N+1 query problem'),
            
            # Inefficient Loops
            r'for\s+\w+\s+in\s+range\(len\(': 
                ('medium', 'inefficient_loop', 'Використання range(len()) замість прямої ітерації'),
            
            # Large Data Structures
            r'\.append\(|\.extend\(.*\)' in 'loop':
                ('medium', 'large_data_structure', 'Можливе створення великої структури даних'),
            
            # Synchronous Operations
            r'requests\.get|requests\.post|urllib\.request': 
                ('high', 'sync_io', 'Синхронні I/O операції блокують потік'),
            
            # Regex Compilation
            r're\.search\(|re\.match\(|re\.findall\(': 
                ('medium', 'regex_compilation', 'Regex компілюється кожного разу'),
            
            # Inefficient String Operations
            r'str\s*\+\s*str|".*"\s*\+\s*".*"': 
                ('medium', 'string_concat', 'Конкатенація строк у циклі'),
            
            # Deep Recursion
            r'def\s+\w+\s*\(.*\):\s*.*\w+\s*\(': 
                ('high', 'deep_recursion', 'Можливо глибока рекурсія'),
            
            # Memory Leaks
            r'__del__|gc\.collect': 
                ('high', 'memory_leak', 'Можливі витоки пам\'яті'),
        }
    
    def analyze_file(self, file_path: Path) -> List[PerformanceIssue]:
        """Аналізувати файл на проблеми продуктивності"""
        issues = []
        
        try:
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()
                lines = content.split('\n')
            
            # Перевіряємо довжину функцій
            for line_num, line in enumerate(lines, 1):
                # Пропускаємо коментарі
                if line.strip().startswith('#') or line.strip().startswith('//'):
                    continue
                
                # Перевіряємо довгі рядки
                if len(line) > 120:
                    issues.append(PerformanceIssue(
                        'low', 'long_line', 
                        f'Довгий рядок ({len(line)} символів)', 
                        line_num
                    ))
                
                # Перевіряємо вкладеність
                indent = len(line) - len(line.lstrip())
                if indent > 32:  # Більше 8 рівнів вкладеності
                    issues.append(PerformanceIssue(
                        'medium', 'deep_nesting',
                        f'Глибока вкладеність ({indent // 4} рівнів)',
                        line_num
                    ))
            
            # Перевіряємо загальні проблеми
            if 'for' in content and 'append' in content:
                for line_num, line in enumerate(lines, 1):
                    if 'for' in line and any(lines[min(i, len(lines)-1)].strip().startswith(('append', 'extend')) 
                                            for i in range(line_num, min(line_num + 5, len(lines)))):
                        issues.append(PerformanceIssue(
                            'medium', 'loop_append',
                            'Append у циклі - розглянути list comprehension',
                            line_num
                        ))
                        break
        
        except Exception as e:
            pass
        
        return issues
    
    def analyze_project(self, extensions: Optional[List[str]] = None) -> Dict[str, Any]:
        """Аналізувати весь проект"""
        if extensions is None:
            extensions = ['.py', '.js', '.ts', '.jsx', '.tsx']
        
        all_issues = []
        files_analyzed = 0
        
        for file_path in self.project_root.rglob('*'):
            if file_path.suffix not in extensions:
                continue
            
            # Пропускаємо node_modules, __pycache__ тощо
            if any(part in file_path.parts for part in ['node_modules', '__pycache__', '.git']):
                continue
            
            files_analyzed += 1
            issues = self.analyze_file(file_path)
            
            for issue in issues:
                all_issues.append({
                    "file": str(file_path.relative_to(self.project_root)),
                    **issue.to_dict()
                })
        
        # Групуємо за типом
        by_type = {}
        for issue in all_issues:
            issue_type = issue['type']
            if issue_type not in by_type:
                by_type[issue_type] = []
            by_type[issue_type].append(issue)
        
        # Групуємо за severity
        by_severity = {}
        for issue in all_issues:
            severity = issue['severity']
            if severity not in by_severity:
                by_severity[severity] = []
            by_severity[severity].append(issue)
        
        return {
            "files_analyzed": files_analyzed,
            "total_issues": len(all_issues),
            "by_severity": {k: len(v) for k, v in by_severity.items()},
            "by_type": {k: len(v) for k, v in by_type.items()},
            "issues": all_issues[:20],
            "critical_count": len(by_severity.get('critical', [])),
            "high_count": len(by_severity.get('high', [])),
        }
    
    def get_recommendations(self) -> List[str]:
        """Отримати рекомендації для оптимізації"""
        return [
            "🔄 Використовуйте list comprehension замість append у циклах",
            "⚡ Кешуйте результати regex компіляції",
            "🔗 Використовуйте асинхронні операції для I/O",
            "🎯 Уникайте глибокої вкладеності (max 4-5 рівнів)",
            "📊 Профілюйте код перед оптимізацією",
            "💾 Звільняйте пам'ять для великих структур даних",
            "🔍 Уникайте N+1 query problems з батч-запитами",
            "⏱️ Встановіть таймаути для зовнішніх запитів",
        ]


if __name__ == "__main__":
    analyzer = PerformanceAnalyzer(Path('.'))
    result = analyzer.analyze_project()
    
    print("⚡ Performance Analysis Results")
    print(f"Files analyzed: {result['files_analyzed']}")
    print(f"Total issues: {result['total_issues']}")
    print(f"Critical: {result['critical_count']}")
    print(f"High: {result['high_count']}")
    print("\n📋 Recommendations:")
    for rec in analyzer.get_recommendations():
        print(f"  {rec}")
