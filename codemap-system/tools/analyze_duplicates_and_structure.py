#!/usr/bin/env python3
"""
АНАЛІЗ ДУБЛІВ ТА СТРУКТУРИ ПРОЕКТУ
Використовує MCP сервер для глибокого аналізу
"""

import sys
import json
import os
from pathlib import Path
from collections import defaultdict
import hashlib
from typing import Dict, List, Set, Tuple, Any, Optional
import logging

# ============================================================================
# LOGGING
# ============================================================================

def setup_logging():
    """Setup logging"""
    log_dir = Path(__file__).parent.parent / "logs"
    log_dir.mkdir(parents=True, exist_ok=True)
    log_file = log_dir / "duplicates_analysis.log"
    
    logger = logging.getLogger(__name__)
    logger.setLevel(logging.DEBUG)
    logger.handlers = []
    
    handler = logging.FileHandler(log_file, encoding='utf-8')
    handler.setLevel(logging.DEBUG)
    
    formatter = logging.Formatter(
        '%(asctime)s - %(levelname)s - %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    handler.setFormatter(formatter)
    logger.addHandler(handler)
    
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(logging.INFO)
    console_handler.setFormatter(formatter)
    logger.addHandler(console_handler)
    
    return logger

logger = setup_logging()

# ============================================================================
# АНАЛІЗ ДУБЛІВ
# ============================================================================

class DuplicateAnalyzer:
    """Аналізатор дублів у проекті"""
    
    def __init__(self, project_root: str):
        self.project_root = Path(project_root)
        self.file_hashes: Dict[str, List[str]] = defaultdict(list)
        self.code_blocks: Dict[str, List[str]] = defaultdict(list)
        
        logger.info(f"🔍 Ініціалізація аналізатора дублів для: {self.project_root}")
    
    def get_file_hash(self, file_path: Path) -> Optional[str]:
        """Отримати хеш файлу"""
        try:
            with open(file_path, 'rb') as f:
                return hashlib.md5(f.read()).hexdigest()
        except Exception as e:
            logger.warning(f"⚠️  Не можу прочитати {file_path}: {e}")
            return None
    
    def normalize_code(self, code: str) -> str:
        """Нормалізувати код для порівняння"""
        lines = []
        for line in code.split('\n'):
            if '#' in line:
                line = line[:line.index('#')]
            line = line.strip()
            if line:
                lines.append(line)
        return '\n'.join(lines)
    
    def analyze_duplicates(self) -> Dict[str, Any]:
        """Аналізувати дублі у проекті"""
        logger.info("📊 Початок аналізу дублів...")
        
        file_extensions = {'.py', '.js', '.ts', '.jsx', '.tsx', '.json', '.yaml', '.yml'}
        
        for file_path in self.project_root.rglob('*'):
            if file_path.is_file() and file_path.suffix in file_extensions:
                if any(part in file_path.parts for part in ['node_modules', '.git', '__pycache__', '.venv', 'venv']):
                    continue
                
                file_hash = self.get_file_hash(file_path)
                if file_hash:
                    rel_path = file_path.relative_to(self.project_root)
                    self.file_hashes[file_hash].append(str(rel_path))
        
        duplicates = {}
        for file_hash, files in self.file_hashes.items():
            if len(files) > 1:
                duplicates[file_hash] = files
        
        logger.info(f"✅ Знайдено {len(duplicates)} групп дублів")
        
        return {
            "total_files_analyzed": sum(len(files) for files in self.file_hashes.values()),
            "duplicate_groups": len(duplicates),
            "duplicates": duplicates,
            "duplicate_files": sum(len(files) - 1 for files in duplicates.values())
        }
    
    def find_similar_functions(self) -> Dict[str, Any]:
        """Знайти подібні функції"""
        logger.info("🔎 Пошук подібних функцій...")
        
        similar_functions: Dict[str, List[Dict[str, Any]]] = defaultdict(list)
        
        for file_path in self.project_root.rglob('*.py'):
            if any(part in file_path.parts for part in ['node_modules', '.git', '__pycache__', '.venv', 'venv']):
                continue
            
            try:
                with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                    content = f.read()
                    
                    lines = content.split('\n')
                    current_func = None
                    func_lines = []
                    
                    for i, line in enumerate(lines):
                        if line.strip().startswith('def '):
                            if current_func:
                                func_code = '\n'.join(func_lines)
                                normalized = self.normalize_code(func_code)
                                code_hash = hashlib.md5(normalized.encode()).hexdigest()
                                similar_functions[code_hash].append({
                                    'file': str(file_path.relative_to(self.project_root)),
                                    'function': current_func,
                                    'line': i - len(func_lines) + 1
                                })
                            
                            current_func = line.split('def ')[1].split('(')[0]
                            func_lines = [line]
                        elif current_func:
                            if line and not line[0].isspace() and not line.strip().startswith('#'):
                                current_func = None
                                func_lines = []
                            else:
                                func_lines.append(line)
                    
                    if current_func:
                        func_code = '\n'.join(func_lines)
                        normalized = self.normalize_code(func_code)
                        code_hash = hashlib.md5(normalized.encode()).hexdigest()
                        similar_functions[code_hash].append({
                            'file': str(file_path.relative_to(self.project_root)),
                            'function': current_func,
                            'line': len(lines) - len(func_lines) + 1
                        })
            except Exception as e:
                logger.warning(f"⚠️  Помилка при аналізі {file_path}: {e}")
        
        duplicate_functions = {}
        for code_hash, functions in similar_functions.items():
            if len(functions) > 1:
                duplicate_functions[code_hash] = functions
        
        logger.info(f"✅ Знайдено {len(duplicate_functions)} груп подібних функцій")
        
        return {
            "duplicate_function_groups": len(duplicate_functions),
            "duplicate_functions": duplicate_functions,
            "total_similar_functions": sum(len(funcs) for funcs in duplicate_functions.values())
        }

# ============================================================================
# АНАЛІЗ СТРУКТУРИ
# ============================================================================

class StructureAnalyzer:
    """Аналізатор структури проекту"""
    
    def __init__(self, project_root: str):
        self.project_root = Path(project_root)
        self.stats = {
            'total_files': 0,
            'total_dirs': 0,
            'by_extension': defaultdict(int),
            'by_directory': defaultdict(int)
        }
        
        logger.info(f"📁 Ініціалізація аналізатора структури для: {self.project_root}")
    
    def analyze_structure(self) -> Dict[str, Any]:
        """Аналізувати структуру проекту"""
        logger.info("📊 Початок аналізу структури...")
        
        ignore_patterns = {'.git', 'node_modules', '__pycache__', '.venv', 'venv', '.env', '.DS_Store'}
        
        def build_tree(path: Path, depth: int = 0) -> Optional[List]:
            if depth > 10:
                return None
            
            items: List = []
            try:
                for item in sorted(path.iterdir()):
                    if item.is_symlink():
                        logger.warning(f"⚠️  Символічний посилання: {item}")
                        continue
                    
                    if item.name.startswith('.') and item.name not in {'.windsurf', '.github', '.cascade', '.config'}:
                        continue
                    if item.name in ignore_patterns:
                        continue
                    
                    if item.is_dir():
                        self.stats['total_dirs'] += 1
                        self.stats['by_directory'][str(item.relative_to(self.project_root))] += 1
                        
                        subtree = build_tree(item, depth + 1)
                        if subtree is not None:
                            items.append({
                                'name': item.name,
                                'type': 'directory',
                                'path': str(item.relative_to(self.project_root)),
                                'items': subtree
                            })
                    elif item.is_file():
                        self.stats['total_files'] += 1
                        ext = item.suffix or 'no_extension'
                        self.stats['by_extension'][ext] += 1
                        
                        try:
                            size = item.stat().st_size
                        except (OSError, FileNotFoundError):
                            size = 0
                        
                        items.append({
                            'name': item.name,
                            'type': 'file',
                            'path': str(item.relative_to(self.project_root)),
                            'size': size
                        })
            except PermissionError:
                logger.warning(f"⚠️  Немає доступу до: {path}")
            
            return items
        
        tree = build_tree(self.project_root)
        
        logger.info(f"✅ Аналіз структури завершено")
        
        return {
            'total_files': self.stats['total_files'],
            'total_directories': self.stats['total_dirs'],
            'files_by_extension': dict(self.stats['by_extension']),
            'structure_tree': tree if tree else []
        }
    
    def get_directory_sizes(self) -> Dict[str, int]:
        """Отримати розміри директорій"""
        logger.info("📏 Розрахунок розмірів директорій...")
        
        dir_sizes: Dict[str, int] = {}
        
        def get_size(path: Path) -> int:
            total = 0
            try:
                for item in path.rglob('*'):
                    if item.is_file() and not item.is_symlink():
                        try:
                            total += item.stat().st_size
                        except OSError as e:
                            logger.warning(f"⚠️  Помилка при отриманні розміру файлу {item}: {e}")
            except PermissionError:
                pass
            return total
        
        for item in self.project_root.iterdir():
            if item.is_dir() and not item.name.startswith('.') and not item.is_symlink():
                try:
                    size = get_size(item)
                    dir_sizes[item.name] = size
                except Exception as e:
                    logger.warning(f"⚠️  Помилка при розрахунку розміру директорії {item}: {e}")
        
        return dict(sorted(dir_sizes.items(), key=lambda x: x[1], reverse=True))

# ============================================================================
# ОСНОВНА ФУНКЦІЯ
# ============================================================================

def main():
    """Основна функція"""
    project_root = os.environ.get('PROJECT_ROOT', '/Users/dev/Documents/GitHub/atlas4')
    
    logger.info("=" * 80)
    logger.info("🚀 АНАЛІЗ ДУБЛІВ ТА СТРУКТУРИ ПРОЕКТУ")
    logger.info("=" * 80)
    
    # Аналіз дублів
    logger.info("\n📊 ФАЗА 1: АНАЛІЗ ДУБЛІВ")
    logger.info("-" * 80)
    
    dup_analyzer = DuplicateAnalyzer(project_root)
    duplicates_result = dup_analyzer.analyze_duplicates()
    similar_funcs_result = dup_analyzer.find_similar_functions()
    
    # Аналіз структури
    logger.info("\n📁 ФАЗА 2: АНАЛІЗ СТРУКТУРИ")
    logger.info("-" * 80)
    
    struct_analyzer = StructureAnalyzer(project_root)
    structure_result = struct_analyzer.analyze_structure()
    dir_sizes = struct_analyzer.get_directory_sizes()
    
    # Збірка результатів
    results = {
        'timestamp': str(Path(__file__).stat().st_mtime),
        'project_root': project_root,
        'duplicates': duplicates_result,
        'similar_functions': similar_funcs_result,
        'structure': structure_result,
        'directory_sizes': dir_sizes
    }
    
    # Збереження результатів
    reports_dir = Path(project_root) / 'reports'
    reports_dir.mkdir(parents=True, exist_ok=True)
    
    report_file = reports_dir / 'duplicates_and_structure_analysis.json'
    with open(report_file, 'w', encoding='utf-8') as f:
        json.dump(results, f, indent=2, ensure_ascii=False)
    
    logger.info(f"\n✅ Звіт збережено: {report_file}")
    
    # Вивід резюме
    logger.info("\n" + "=" * 80)
    logger.info("📋 РЕЗЮМЕ АНАЛІЗУ")
    logger.info("=" * 80)
    
    logger.info(f"\n📊 ДУБЛІ:")
    logger.info(f"  • Всього файлів проаналізовано: {duplicates_result['total_files_analyzed']}")
    logger.info(f"  • Груп дублів: {duplicates_result['duplicate_groups']}")
    logger.info(f"  • Дублів файлів: {duplicates_result['duplicate_files']}")
    
    logger.info(f"\n🔎 ПОДІБНІ ФУНКЦІЇ:")
    logger.info(f"  • Груп подібних функцій: {similar_funcs_result['duplicate_function_groups']}")
    logger.info(f"  • Всього подібних функцій: {similar_funcs_result['total_similar_functions']}")
    
    logger.info(f"\n📁 СТРУКТУРА:")
    logger.info(f"  • Всього файлів: {structure_result['total_files']}")
    logger.info(f"  • Всього директорій: {structure_result['total_directories']}")
    logger.info(f"  • Типи файлів: {len(structure_result['files_by_extension'])}")
    
    logger.info(f"\n📏 ТОП 10 НАЙБІЛЬШИХ ДИРЕКТОРІЙ:")
    for i, (dir_name, size) in enumerate(list(dir_sizes.items())[:10], 1):
        size_mb = size / (1024 * 1024)
        logger.info(f"  {i}. {dir_name}: {size_mb:.2f} MB")
    
    logger.info("\n" + "=" * 80)
    logger.info("✅ АНАЛІЗ ЗАВЕРШЕНО")
    logger.info("=" * 80)
    
    return results

if __name__ == '__main__':
    main()
