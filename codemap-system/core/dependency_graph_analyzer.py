#!/usr/bin/env python3
"""
Dependency Graph Analyzer v1.0 - Детальний аналіз залежностей функцій та блоків коду
Будує граф залежностей на рівні функцій, класів та блоків коду
Допомагає ШІ розібратися в структурі кода при пошуку, доповненні та виправленні помилок
"""

import ast
import re
from pathlib import Path
from typing import Dict, List, Set, Tuple, Optional, Any
from collections import defaultdict
import json
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class CodeBlock:
    """Представлення блоку коду (функція, клас, метод)"""
    
    def __init__(self, name: str, block_type: str, line_start: int, line_end: int, 
                 file_path: str, parent: Optional[str] = None):
        self.name = name
        self.type = block_type  # 'function', 'class', 'method', 'async_function'
        self.line_start = line_start
        self.line_end = line_end
        self.file_path = file_path
        self.parent = parent  # Для методів - назва класу
        self.dependencies: Set[str] = set()  # Залежності від інших блоків
        self.dependents: Set[str] = set()  # Хто залежить від цього блоку
        self.imports_used: List[str] = []  # Які імпорти використовуються
        self.external_calls: List[str] = []  # Виклики зовнішніх функцій
        self.internal_calls: List[str] = []  # Виклики внутрішніх функцій
        self.complexity: int = 0  # Циклічна складність
        self.parameters: List[str] = []
        self.return_type: Optional[str] = None
        self.docstring: Optional[str] = None
    
    def full_name(self) -> str:
        """Повна назва блоку (для методів: ClassName.method_name)"""
        if self.parent:
            return f"{self.parent}.{self.name}"
        return self.name
    
    def to_dict(self) -> Dict[str, Any]:
        """Конвертувати в словник"""
        return {
            'name': self.name,
            'full_name': self.full_name(),
            'type': self.type,
            'file': self.file_path,
            'lines': f"{self.line_start}-{self.line_end}",
            'parent': self.parent,
            'parameters': self.parameters,
            'return_type': self.return_type,
            'docstring': self.docstring[:100] if self.docstring else None,
            'complexity': self.complexity,
            'dependencies': list(self.dependencies),
            'dependents': list(self.dependents),
            'internal_calls': self.internal_calls[:10],  # Перші 10
            'external_calls': self.external_calls[:10],
        }


class DependencyGraphAnalyzer:
    """Аналізатор графу залежностей на рівні функцій та класів"""
    
    def __init__(self, project_root: Path):
        self.project_root = Path(project_root)
        self.code_blocks: Dict[str, CodeBlock] = {}  # Ключ: file_path:block_name
        self.file_blocks: Dict[str, List[CodeBlock]] = defaultdict(list)  # Файл -> блоки
        self.call_graph: Dict[str, Set[str]] = defaultdict(set)  # Граф викликів
    
    def analyze_file(self, file_path: Path) -> List[CodeBlock]:
        """Аналізувати файл та витягти всі блоки коду"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
        except Exception as e:
            logger.error(f"❌ Помилка читання {file_path}: {e}")
            return []
        
        file_key = str(file_path.relative_to(self.project_root))
        blocks = []
        
        if file_path.suffix == '.py':
            blocks = self._analyze_python_file(content, file_key)
        elif file_path.suffix in ['.js', '.ts', '.jsx', '.tsx']:
            blocks = self._analyze_javascript_file(content, file_key)
        
        # Зберігаємо блоки
        for block in blocks:
            block_key = f"{file_key}:{block.full_name()}"
            self.code_blocks[block_key] = block
            self.file_blocks[file_key].append(block)
        
        return blocks
    
    def _analyze_python_file(self, content: str, file_path: str) -> List[CodeBlock]:
        """Аналізувати Python файл"""
        blocks = []
        
        try:
            tree = ast.parse(content)
        except SyntaxError as e:
            logger.warning(f"❌ Синтаксична помилка в {file_path}: {e}")
            return blocks
        
        # Витягуємо класи та функції
        for node in ast.walk(tree):
            if isinstance(node, ast.FunctionDef):
                block = self._create_python_function_block(node, file_path, None)
                blocks.append(block)
            
            elif isinstance(node, ast.AsyncFunctionDef):
                block = self._create_python_function_block(node, file_path, None, is_async=True)
                blocks.append(block)
            
            elif isinstance(node, ast.ClassDef):
                class_block = CodeBlock(
                    name=node.name,
                    block_type='class',
                    line_start=node.lineno,
                    line_end=node.end_lineno or node.lineno,
                    file_path=file_path
                )
                class_block.docstring = ast.get_docstring(node)
                blocks.append(class_block)
                
                # Витягуємо методи класу
                for item in node.body:
                    if isinstance(item, (ast.FunctionDef, ast.AsyncFunctionDef)):
                        method_block = self._create_python_function_block(
                            item, file_path, node.name,
                            is_async=isinstance(item, ast.AsyncFunctionDef)
                        )
                        blocks.append(method_block)
        
        return blocks
    
    def _create_python_function_block(self, node: Any, file_path: str, 
                                     parent: Optional[str], is_async: bool = False) -> CodeBlock:
        """Створити блок для Python функції"""
        block_type = 'async_function' if is_async else 'function'
        if parent:
            block_type = 'async_method' if is_async else 'method'
        
        block = CodeBlock(
            name=node.name,
            block_type=block_type,
            line_start=node.lineno,
            line_end=node.end_lineno or node.lineno,
            file_path=file_path,
            parent=parent
        )
        
        # Витягуємо параметри
        block.parameters = [arg.arg for arg in node.args.args]
        
        # Витягуємо docstring
        block.docstring = ast.get_docstring(node)
        
        # Витягуємо return type annotation
        if node.returns:
            block.return_type = ast.unparse(node.returns)
        
        # Аналізуємо тіло функції
        self._analyze_function_body(node, block)
        
        return block
    
    def _analyze_function_body(self, node: ast.FunctionDef, block: CodeBlock):
        """Аналізувати тіло функції для витягування викликів та залежностей"""
        for child in ast.walk(node):
            # Виклики функцій
            if isinstance(child, ast.Call):
                if isinstance(child.func, ast.Name):
                    block.internal_calls.append(child.func.id)
                elif isinstance(child.func, ast.Attribute):
                    if isinstance(child.func.value, ast.Name):
                        block.external_calls.append(f"{child.func.value.id}.{child.func.attr}")
            
            # Циклічна складність (базовий підрахунок)
            if isinstance(child, (ast.If, ast.For, ast.While, ast.ExceptHandler)):
                block.complexity += 1
    
    def _analyze_javascript_file(self, content: str, file_path: str) -> List[CodeBlock]:
        """Аналізувати JavaScript/TypeScript файл (базовий парсинг)"""
        blocks = []
        
        # Регулярні вирази для пошуку функцій та класів
        # Функції
        func_pattern = r'(?:async\s+)?function\s+(\w+)\s*\([^)]*\)|(?:async\s+)?(\w+)\s*=\s*(?:async\s*)?\([^)]*\)\s*=>'
        class_pattern = r'class\s+(\w+)(?:\s+extends\s+\w+)?'
        method_pattern = r'(?:async\s+)?(\w+)\s*\([^)]*\)\s*\{|(?:async\s+)?(\w+)\s*:\s*(?:async\s*)?\([^)]*\)\s*=>'
        
        lines = content.split('\n')
        
        # Простий парсинг функцій
        for i, line in enumerate(lines, 1):
            # Функції
            func_match = re.search(func_pattern, line)
            if func_match:
                func_name = func_match.group(1) or func_match.group(2)
                block = CodeBlock(
                    name=func_name,
                    block_type='async_function' if 'async' in line else 'function',
                    line_start=i,
                    line_end=i,
                    file_path=file_path
                )
                blocks.append(block)
            
            # Класи
            class_match = re.search(class_pattern, line)
            if class_match:
                class_name = class_match.group(1)
                block = CodeBlock(
                    name=class_name,
                    block_type='class',
                    line_start=i,
                    line_end=i,
                    file_path=file_path
                )
                blocks.append(block)
        
        return blocks
    
    def build_dependency_graph(self) -> Dict[str, Any]:
        """Побудувати граф залежностей для всіх блоків"""
        graph = {
            'blocks': {},
            'dependencies': {},
            'call_graph': {},
            'statistics': {
                'total_blocks': len(self.code_blocks),
                'total_files': len(self.file_blocks),
                'total_functions': 0,
                'total_classes': 0,
                'total_methods': 0,
            }
        }
        
        # Додаємо блоки
        for block_key, block in self.code_blocks.items():
            graph['blocks'][block_key] = block.to_dict()
            
            # Статистика
            if block.type == 'class':
                graph['statistics']['total_classes'] += 1
            elif block.type in ['method', 'async_method']:
                graph['statistics']['total_methods'] += 1
            else:
                graph['statistics']['total_functions'] += 1
        
        # Будуємо граф залежностей
        for block_key, block in self.code_blocks.items():
            deps = []
            
            # Залежності від внутрішніх викликів
            for call in block.internal_calls:
                for other_key, other_block in self.code_blocks.items():
                    if other_block.name == call and other_key != block_key:
                        deps.append(other_key)
                        block.dependencies.add(other_key)
            
            graph['dependencies'][block_key] = deps
        
        return graph
    
    def get_block_info(self, block_key: str) -> Optional[Dict[str, Any]]:
        """Отримати детальну інформацію про блок"""
        if block_key not in self.code_blocks:
            return None
        
        block = self.code_blocks[block_key]
        return {
            'block': block.to_dict(),
            'dependencies': list(block.dependencies),
            'dependents': list(block.dependents),
            'call_chain': self._get_call_chain(block_key),
            'impact_analysis': self._analyze_impact(block_key),
        }
    
    def _get_call_chain(self, block_key: str, visited: Optional[Set[str]] = None, 
                       depth: int = 0, max_depth: int = 3) -> Dict[str, Any]:
        """Отримати ланцюг викликів для блоку"""
        if visited is None:
            visited = set()
        
        if depth > max_depth or block_key in visited:
            return {}
        
        visited.add(block_key)
        block = self.code_blocks.get(block_key)
        
        if not block:
            return {}
        
        chain = {
            'block': block.full_name(),
            'file': block.file_path,
            'calls': [],
            'depth': depth,
        }
        
        # Витягуємо залежності
        for dep_key in block.dependencies:
            if dep_key not in visited:
                chain['calls'].append(self._get_call_chain(dep_key, visited, depth + 1, max_depth))
        
        return chain
    
    def _analyze_impact(self, block_key: str) -> Dict[str, Any]:
        """Аналізувати вплив змін в блоку на інші блоки"""
        if block_key not in self.code_blocks:
            return {}
        
        block = self.code_blocks[block_key]
        
        # Знаходимо всі блоки, які залежать від цього
        affected_blocks = set()
        to_process = {block_key}
        
        while to_process:
            current = to_process.pop()
            for other_key, other_block in self.code_blocks.items():
                if current in other_block.dependencies:
                    affected_blocks.add(other_key)
                    to_process.add(other_key)
        
        return {
            'direct_dependents': len([k for k in self.code_blocks 
                                     if block_key in self.code_blocks[k].dependencies]),
            'total_affected': len(affected_blocks),
            'affected_blocks': list(affected_blocks)[:20],  # Перші 20
            'affected_files': list(set(self.code_blocks[k].file_path 
                                      for k in affected_blocks)),
        }
    
    def export_graph_json(self, output_path: Path) -> None:
        """Експортувати граф у JSON"""
        graph = self.build_dependency_graph()
        
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(graph, f, indent=2, ensure_ascii=False, default=str)
        
        logger.info(f"✅ Граф експортований в {output_path}")
    
    def export_graph_mermaid(self, output_path: Path, max_nodes: int = 50) -> None:
        """Експортувати граф у Mermaid формат для візуалізації"""
        graph_data = self.build_dependency_graph()
        
        mermaid_lines = ["graph TD"]
        
        # Додаємо вузли та ребра
        node_count = 0
        for block_key, block_info in list(graph_data['blocks'].items())[:max_nodes]:
            # Скорочуємо назву
            short_name = f"{block_info['name']}({block_info['type'][0]})"
            node_id = f"node_{node_count}"
            
            mermaid_lines.append(f"    {node_id}[\"{short_name}\"]")
            
            # Додаємо залежності
            for dep_key in graph_data['dependencies'].get(block_key, [])[:5]:
                if dep_key in graph_data['blocks']:
                    dep_name = graph_data['blocks'][dep_key]['name']
                    mermaid_lines.append(f"    {node_id} --> {dep_key}")
            
            node_count += 1
        
        mermaid_content = "\n".join(mermaid_lines)
        
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(mermaid_content)
        
        logger.info(f"✅ Mermaid граф експортований в {output_path}")


def analyze_project_dependencies(project_root: Path) -> Dict[str, Any]:
    """Аналізувати залежності всього проекту"""
    analyzer = DependencyGraphAnalyzer(project_root)
    
    # Знаходимо всі Python та JavaScript файли
    extensions = {'.py', '.js', '.ts', '.jsx', '.tsx'}
    exclude_dirs = {'node_modules', '__pycache__', '.git', 'venv', '.venv', 'codemap-system', 'dist', 'build'}
    
    files_to_analyze = []
    for file_path in project_root.rglob('*'):
        if file_path.is_file() and file_path.suffix in extensions:
            if not any(part in exclude_dirs for part in file_path.parts):
                files_to_analyze.append(file_path)
    
    logger.info(f"📊 Аналізуємо {len(files_to_analyze)} файлів...")
    
    # Аналізуємо файли
    for file_path in files_to_analyze:
        analyzer.analyze_file(file_path)
    
    # Будуємо граф
    graph = analyzer.build_dependency_graph()
    
    return {
        'analyzer': analyzer,
        'graph': graph,
        'files_analyzed': len(files_to_analyze),
    }


if __name__ == '__main__':
    # Тест
    project_root = Path('/Users/dev/Documents/GitHub/atlas4')
    result = analyze_project_dependencies(project_root)
    
    print(f"\n✅ Аналіз завершено!")
    print(f"📊 Статистика: {result['graph']['statistics']}")
    
    # Експортуємо
    output_dir = project_root / 'codemap-system' / 'reports'
    output_dir.mkdir(parents=True, exist_ok=True)
    
    analyzer = result['analyzer']
    analyzer.export_graph_json(output_dir / 'dependency_graph.json')
    analyzer.export_graph_mermaid(output_dir / 'dependency_graph.mmd', max_nodes=50)
