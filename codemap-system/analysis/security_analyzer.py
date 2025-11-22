#!/usr/bin/env python3
"""
Security Analyzer - Аналіз безпеки коду
"""

import re
from pathlib import Path
from typing import Dict, List, Any, Optional
import sys

sys.path.insert(0, str(Path(__file__).parent.parent))


class SecurityIssue:
    """Проблема безпеки"""
    
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


class SecurityAnalyzer:
    """Аналізатор безпеки коду"""
    
    def __init__(self, project_root: Optional[Path] = None):
        self.project_root = project_root or Path('.')
        
        # Небезпечні паттерни
        self.dangerous_patterns = {
            # SQL Injection
            r'execute\s*\(\s*["\'].*\$|%s': ('critical', 'sql_injection', 'Можливий SQL injection'),
            r'query\s*\(\s*f["\']': ('high', 'sql_injection', 'Використання f-string у SQL запитах'),
            
            # Command Injection
            r'os\.system\s*\(|subprocess\.call\s*\(': ('critical', 'command_injection', 'Небезпечне виконання команд'),
            r'shell\s*=\s*True': ('high', 'command_injection', 'shell=True у subprocess'),
            
            # Hardcoded Secrets
            r'password\s*=\s*["\']': ('critical', 'hardcoded_secret', 'Hardcoded пароль'),
            r'api_key\s*=\s*["\']': ('critical', 'hardcoded_secret', 'Hardcoded API ключ'),
            r'secret\s*=\s*["\']': ('critical', 'hardcoded_secret', 'Hardcoded секрет'),
            
            # Insecure Deserialization
            r'pickle\.loads|yaml\.load\s*\(': ('critical', 'insecure_deserialization', 'Небезпечна десеріалізація'),
            
            # Weak Cryptography
            r'MD5|SHA1|DES': ('high', 'weak_crypto', 'Слабка криптографія'),
            
            # Eval Usage
            r'eval\s*\(|exec\s*\(': ('critical', 'eval_usage', 'Використання eval/exec'),
            
            # XXE Vulnerability
            r'ElementTree\.parse|lxml\.etree': ('high', 'xxe_vulnerability', 'Можливість XXE атаки'),
        }
    
    def analyze_file(self, file_path: Path) -> List[SecurityIssue]:
        """Аналізувати файл на проблеми безпеки"""
        issues = []
        
        try:
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()
                lines = content.split('\n')
            
            # Перевіряємо кожен рядок
            for line_num, line in enumerate(lines, 1):
                # Пропускаємо коментарі
                if line.strip().startswith('#') or line.strip().startswith('//'):
                    continue
                
                # Перевіряємо небезпечні паттерни
                for pattern, (severity, issue_type, message) in self.dangerous_patterns.items():
                    if re.search(pattern, line, re.IGNORECASE):
                        issues.append(SecurityIssue(severity, issue_type, message, line_num))
        
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
            "issues": all_issues[:20],  # Показуємо перші 20
            "critical_count": len(by_severity.get('critical', [])),
            "high_count": len(by_severity.get('high', [])),
        }


if __name__ == "__main__":
    analyzer = SecurityAnalyzer(Path('.'))
    result = analyzer.analyze_project()
    
    print("🔒 Security Analysis Results")
    print(f"Files analyzed: {result['files_analyzed']}")
    print(f"Total issues: {result['total_issues']}")
    print(f"Critical: {result['critical_count']}")
    print(f"High: {result['high_count']}")
