#!/usr/bin/env python3
"""
MCP Tools для Dependency Graph Analysis
Надає детальний аналіз залежностей функцій та блоків коду для Windsurf IDE
"""

import json
import sys
from pathlib import Path
from typing import Any, Dict

# Додаємо codemap-system до PYTHONPATH
sys.path.insert(0, str(Path(__file__).parent.parent))

from core.dependency_graph_analyzer import DependencyGraphAnalyzer, analyze_project_dependencies


class DependencyGraphTools:
    """MCP інструменти для аналізу графу залежностей"""
    
    def __init__(self, project_root: Path):
        self.project_root = Path(project_root)
        self.analyzer: Any = None
        self.graph_data: Any = None
    
    def initialize(self) -> Dict[str, Any]:
        """Ініціалізувати аналізатор"""
        try:
            result = analyze_project_dependencies(self.project_root)
            self.analyzer = result['analyzer']
            self.graph_data = result['graph']
            
            return {
                'status': 'success',
                'message': 'Аналізатор ініціалізований',
                'files_analyzed': result['files_analyzed'],
                'statistics': self.graph_data['statistics'],
            }
        except Exception as e:
            return {
                'status': 'error',
                'message': str(e),
            }
    
    def get_block_dependencies(self, block_key: str) -> Dict[str, Any]:
        """Отримати залежності блоку коду"""
        if not self.analyzer:
            return {'error': 'Аналізатор не ініціалізований'}
        
        block_info = self.analyzer.get_block_info(block_key)
        
        if not block_info:
            return {'error': f'Блок не знайдений: {block_key}'}
        
        return {
            'status': 'success',
            'block_info': block_info,
        }
    
    def get_function_call_chain(self, function_name: str, file_path: Any = None) -> Dict[str, Any]:
        """Отримати ланцюг викликів функції"""
        if not self.analyzer:
            return {'error': 'Аналізатор не ініціалізований'}
        
        # Знаходимо блок
        matching_blocks = []
        for block_key, block in self.analyzer.code_blocks.items():
            if block.name == function_name:
                if file_path is None or file_path in block.file_path:
                    matching_blocks.append(block_key)
        
        if not matching_blocks:
            return {'error': f'Функція не знайдена: {function_name}'}
        
        results = []
        for block_key in matching_blocks:
            block = self.analyzer.code_blocks[block_key]
            call_chain = self.analyzer._get_call_chain(block_key)
            
            results.append({
                'block': block.to_dict(),
                'call_chain': call_chain,
                'impact': self.analyzer._analyze_impact(block_key),
            })
        
        return {
            'status': 'success',
            'function': function_name,
            'matches': len(matching_blocks),
            'results': results,
        }
    
    def analyze_code_impact(self, block_key: str) -> Dict[str, Any]:
        """Аналізувати вплив змін в блоку коду"""
        if not self.analyzer:
            return {'error': 'Аналізатор не ініціалізований'}
        
        if block_key not in self.analyzer.code_blocks:
            return {'error': f'Блок не знайдений: {block_key}'}
        
        block = self.analyzer.code_blocks[block_key]
        impact = self.analyzer._analyze_impact(block_key)
        
        return {
            'status': 'success',
            'block': block.to_dict(),
            'impact_analysis': impact,
            'recommendation': self._generate_impact_recommendation(impact),
        }
    
    def find_related_blocks(self, block_key: str, depth: int = 2) -> Dict[str, Any]:
        """Знайти пов'язані блоки коду"""
        if not self.analyzer:
            return {'error': 'Аналізатор не ініціалізований'}
        
        if block_key not in self.analyzer.code_blocks:
            return {'error': f'Блок не знайдений: {block_key}'}
        
        block = self.analyzer.code_blocks[block_key]
        
        # Знаходимо залежності та залежні блоки
        related = {
            'dependencies': [],
            'dependents': [],
            'related_in_file': [],
        }
        
        # Залежності
        for dep_key in block.dependencies:
            if dep_key in self.analyzer.code_blocks:
                related['dependencies'].append(
                    self.analyzer.code_blocks[dep_key].to_dict()
                )
        
        # Залежні блоки
        for other_key, other_block in self.analyzer.code_blocks.items():
            if block_key in other_block.dependencies:
                related['dependents'].append(other_block.to_dict())
        
        # Блоки в тому ж файлі
        for other_block in self.analyzer.file_blocks.get(block.file_path, []):
            if other_block.name != block.name:
                related['related_in_file'].append(other_block.to_dict())
        
        return {
            'status': 'success',
            'block': block.to_dict(),
            'related_blocks': related,
        }
    
    def get_file_structure(self, file_path: str) -> Dict[str, Any]:
        """Отримати структуру файлу (всі функції, класи, методи)"""
        if not self.analyzer:
            return {'error': 'Аналізатор не ініціалізований'}
        
        blocks = self.analyzer.file_blocks.get(file_path, [])
        
        if not blocks:
            return {'error': f'Файл не знайдений або не містить блоків: {file_path}'}
        
        # Групуємо за типами
        structure = {
            'classes': [],
            'functions': [],
            'methods': [],
            'async_functions': [],
        }
        
        for block in blocks:
            block_dict = block.to_dict()
            
            if block.type == 'class':
                structure['classes'].append(block_dict)
            elif block.type == 'method':
                structure['methods'].append(block_dict)
            elif block.type == 'async_function':
                structure['async_functions'].append(block_dict)
            else:
                structure['functions'].append(block_dict)
        
        return {
            'status': 'success',
            'file': file_path,
            'structure': structure,
            'total_blocks': len(blocks),
        }
    
    def search_blocks_by_name(self, pattern: str) -> Dict[str, Any]:
        """Пошук блоків за назвою (підтримує регулярні вирази)"""
        if not self.analyzer:
            return {'error': 'Аналізатор не ініціалізований'}
        
        import re
        try:
            regex = re.compile(pattern, re.IGNORECASE)
        except re.error as e:
            return {'error': f'Невірна регулярна вираз: {e}'}
        
        matches = []
        for block_key, block in self.analyzer.code_blocks.items():
            if regex.search(block.name):
                matches.append({
                    'key': block_key,
                    'block': block.to_dict(),
                })
        
        return {
            'status': 'success',
            'pattern': pattern,
            'matches': len(matches),
            'results': matches[:50],  # Перші 50
        }
    
    def get_complexity_report(self) -> Dict[str, Any]:
        """Отримати звіт про складність коду"""
        if not self.analyzer:
            return {'error': 'Аналізатор не ініціалізований'}
        
        # Сортуємо за складністю
        blocks_by_complexity = sorted(
            self.analyzer.code_blocks.items(),
            key=lambda x: x[1].complexity,
            reverse=True
        )
        
        report = {
            'status': 'success',
            'total_blocks': len(self.analyzer.code_blocks),
            'average_complexity': sum(b.complexity for _, b in self.analyzer.code_blocks.items()) / max(1, len(self.analyzer.code_blocks)),
            'most_complex': [
                {
                    'key': key,
                    'block': block.to_dict(),
                    'complexity': block.complexity,
                }
                for key, block in blocks_by_complexity[:20]
            ],
        }
        
        return report
    
    def export_dependency_graph(self, format: str = 'json') -> Dict[str, Any]:
        """Експортувати граф залежностей"""
        if not self.analyzer:
            return {'error': 'Аналізатор не ініціалізований'}
        
        output_dir = self.project_root / 'codemap-system' / 'reports'
        output_dir.mkdir(parents=True, exist_ok=True)
        
        try:
            if format == 'json':
                output_path = output_dir / 'dependency_graph.json'
                self.analyzer.export_graph_json(output_path)
            elif format == 'mermaid':
                output_path = output_dir / 'dependency_graph.mmd'
                self.analyzer.export_graph_mermaid(output_path)
            else:
                return {'error': f'Невідомий формат: {format}'}
            
            return {
                'status': 'success',
                'format': format,
                'output_path': str(output_path),
                'message': f'Граф експортований в {output_path}',
            }
        except Exception as e:
            return {'error': str(e)}
    
    @staticmethod
    def _generate_impact_recommendation(impact: Dict[str, Any]) -> str:
        """Генерувати рекомендацію на основі аналізу впливу"""
        affected = impact.get('total_affected', 0)
        
        if affected == 0:
            return "✅ Безпечно змінити - не впливає на інші блоки"
        elif affected <= 5:
            return "⚠️  Обережно - впливає на кілька блоків"
        elif affected <= 20:
            return "🔴 Критично - впливає на багато блоків, потрібне ретельне тестування"
        else:
            return "🔴 КРИТИЧНО - впливає на дуже багато блоків, потрібна повна перевірка"


def create_mcp_tools(project_root: Path) -> Dict[str, Any]:
    """Створити MCP інструменти для аналізу залежностей"""
    tools = DependencyGraphTools(project_root)
    
    # Ініціалізуємо
    init_result = tools.initialize()
    
    if init_result['status'] != 'success':
        return {'error': init_result['message']}
    
    return {
        'tools': tools,
        'initialization': init_result,
    }


if __name__ == '__main__':
    # Тест
    project_root = Path('/Users/dev/Documents/GitHub/atlas4')
    tools = DependencyGraphTools(project_root)
    
    print("🔍 Ініціалізація аналізатора...")
    result = tools.initialize()
    print(f"✅ {result['message']}")
    print(f"📊 Статистика: {result['statistics']}")
