#!/usr/bin/env python3
"""
Code Quality Analyzer - Аналізує якість коду
"""

import re
from pathlib import Path
from typing import Dict, List, Any
import logging

logger = logging.getLogger(__name__)


class CodeQualityAnalyzer:
    """Аналізує якість коду"""
    
    def __init__(self, project_root: Path):
        self.project_root = Path(project_root)
    
    def analyze_file(self, file_path: Path) -> Dict[str, Any]:
        """Аналізувати якість файлу"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
        except:
            return {}
        
        functions = self._extract_functions(content)
        issues = self._identify_issues(content, functions)
        
        return {
            'file': str(file_path),
            'functions': functions,
            'issues': issues,
            'quality_score': max(0, 100 - len(issues) * 10)
        }
    
    def _extract_functions(self, content: str) -> List[Dict[str, Any]]:
        """Витягти функції з файлу"""
        functions = []
        
        func_pattern = r"(?:async\s+)?(?:def|function|const|let)\s+(\w+)\s*(?:\(|=)"
        matches = re.finditer(func_pattern, content)
        
        for match in matches:
            func_name = match.group(1)
            line_num = content[:match.start()].count('\n') + 1
            
            # Знаходимо довжину функції
            func_start = match.start()
            func_end = self._find_function_end(content, func_start)
            func_length = content[func_start:func_end].count('\n')
            
            functions.append({
                'name': func_name,
                'line': line_num,
                'length': func_length,
                'type': 'function'
            })
        
        return functions
    
    def _find_function_end(self, content: str, start: int) -> int:
        """Знайти кінець функції"""
        # Спрощена логіка - знаходимо наступну функцію або кінець файлу
        remaining = content[start:]
        next_func = re.search(r"\n(?:async\s+)?(?:def|function|class|const|let)\s+\w+", remaining)
        
        if next_func:
            return start + next_func.start()
        return len(content)
    
    def _identify_issues(self, content: str, functions: List[Dict]) -> List[str]:
        """Виявити проблеми якості"""
        issues = []
        
        # Перевіряємо довжину функцій
        for func in functions:
            if func['length'] > 50:
                issues.append(f"⚠️ Функція {func['name']} занадто довга ({func['length']} рядків)")
        
        # Перевіряємо на вложені цикли
        if 'for' in content and content.count('for') > 2:
            issues.append("⚠️ Виявлені вложені цикли")
        
        # Перевіряємо на нескінченні цикли
        if 'while True' in content or 'while(true)' in content:
            issues.append("⚠️ Виявлені потенційні нескінченні цикли")
        
        # Перевіряємо на дублювання коду
        lines = content.split('\n')
        if len(lines) > 100:
            issues.append("⚠️ Файл занадто великий (>100 рядків)")
        
        return issues
