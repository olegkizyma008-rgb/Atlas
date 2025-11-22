#!/usr/bin/env python3
"""
Architecture Mapper v2.0 - Глибока архітектурна карта системи
Рекурсивний аналіз файлів, залежностей, статусів та взаємодій
"""

import json
import os
import ast
import re
from pathlib import Path
from typing import Dict, List, Set, Tuple, Optional, Any
from datetime import datetime
from collections import defaultdict
from dotenv import load_dotenv
import logging

# Налаштування логування
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class FileStatus:
    """Статус файлу в системі"""
    ACTIVE = "ACTIVE"
    DEPRECATED = "DEPRECATED"
    UNUSED = "UNUSED"
    IN_DEVELOPMENT = "IN_DEVELOPMENT"
    LEGACY = "LEGACY"
    EXPERIMENTAL = "EXPERIMENTAL"
    BROKEN = "BROKEN"


class ArchitectureMapper:
    """Глибока архітектурна карта системи з рекурсивним аналізом"""
    
    def __init__(self, project_root: Optional[Path] = None):
        if project_root is None:
            env_path = Path(__file__).parent.parent / '.env.architecture'
            if env_path.exists():
                load_dotenv(env_path)
            
            project_root_str = os.environ.get('PROJECT_ROOT', '..')
            if not os.path.isabs(project_root_str):
                project_root = Path(__file__).parent.parent / project_root_str
            else:
                project_root = Path(project_root_str)
        
        self.project_root = Path(project_root).resolve()
        self.analysis_root = self.project_root
        
        # Кеш для файлів
        self.files_cache: Dict[str, Dict[str, Any]] = {}
        self.dependencies: Dict[str, Set[str]] = defaultdict(set)
        self.reverse_dependencies: Dict[str, Set[str]] = defaultdict(set)
        self.file_status: Dict[str, str] = {}
        self.last_modified: Dict[str, datetime] = {}
        self.broken_files: Dict[str, str] = {}
        
        # Конфіг
        self.max_depth = int(os.environ.get('MAX_ANALYSIS_DEPTH', 5))
        self.min_file_size = int(os.environ.get('MIN_FILE_SIZE', 100))
        self.max_file_size = int(os.environ.get('MAX_FILE_SIZE', 1000000))
        self.deprecated_threshold_days = int(os.environ.get('DEPRECATED_THRESHOLD_DAYS', 90))
    
    def analyze_architecture(self, max_depth: Optional[int] = None) -> Dict[str, Any]:
        """Аналізувати архітектуру системи"""
        if max_depth is None:
            max_depth = self.max_depth
        
        logger.info(f"🔍 Аналіз архітектури на глибину {max_depth}...")
        
        # Знаходимо всі файли
        workflow_files = self._find_workflow_files()
        logger.info(f"   📁 Знайдено {len(workflow_files)} файлів")
        
        # Аналізуємо файли
        for file_path in workflow_files:
            self._analyze_file(file_path, depth=0, max_depth=max_depth)
        
        # Визначаємо статуси
        self._determine_file_status()
        
        # Знаходимо циклічні залежності
        cycles = self._detect_circular_dependencies()
        logger.info(f"   🔄 Знайдено {len(cycles)} циклічних залежностей")
        
        # Будуємо архітектурну карту
        architecture = self._build_architecture_map(max_depth, cycles)
        
        logger.info("✅ Аналіз завершено")
        return architecture
    
    def _find_workflow_files(self) -> List[Path]:
        """Знайти всі файли проекту для аналізу"""
        files = []
        extensions = {'.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.cpp', '.go'}
        exclude_dirs = {
            'node_modules', '__pycache__', '.git', '.venv', 'dist', 'build',
            'archive', '.archive', 'backups', '.cache', '.idx', '.vscode',
            '.DS_Store', '.pytest_cache', 'venv', 'env', 'docs', 'logs', 'reports',
            'codemap-system'
        }
        
        for file_path in self.analysis_root.rglob('*'):
            if file_path.is_dir():
                continue
            
            # Пропускаємо приховані файли
            if any(part.startswith('.') for part in file_path.parts):
                continue
            
            # Пропускаємо виключені директорії
            if any(part in exclude_dirs for part in file_path.parts):
                continue
            
            # Перевіряємо розширення
            if file_path.suffix in extensions:
                # Перевіряємо розмір
                try:
                    size = file_path.stat().st_size
                    if self.min_file_size <= size <= self.max_file_size:
                        files.append(file_path)
                except:
                    pass
        
        return sorted(files)
    
    def _analyze_file(self, file_path: Path, depth: int = 0, max_depth: int = 5):
        """Аналізувати файл рекурсивно"""
        if depth > max_depth:
            return
        
        file_key = str(file_path.relative_to(self.project_root))
        
        if file_key in self.files_cache:
            return
        
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
        except Exception as e:
            logger.warning(f"Error reading {file_path}: {e}")
            return
        
        # Витягуємо інформацію про файл
        file_info = {
            'path': file_key,
            'size': len(content),
            'lines': len(content.split('\n')),
            'depth': depth,
            'imports': self._extract_imports(content, file_path),
            'exports': self._extract_exports(content),
            'functions': self._extract_functions(content),
            'classes': self._extract_classes(content),
            'dependencies': set(),
            'dependents': set(),
            'last_modified': datetime.fromtimestamp(file_path.stat().st_mtime).isoformat(),
            'status': FileStatus.ACTIVE,
        }
        
        # Знаходимо залежності
        for import_path in file_info['imports']:
            dep_path = self._resolve_import(file_path, import_path)
            if dep_path:
                try:
                    dep_key = str(dep_path.relative_to(self.project_root))
                    file_info['dependencies'].add(dep_key)
                    self.dependencies[file_key].add(dep_key)
                    self.reverse_dependencies[dep_key].add(file_key)
                except ValueError:
                    pass
        
        self.files_cache[file_key] = file_info
        
        # Рекурсивно аналізуємо залежності
        if depth < max_depth:
            for dep_key in file_info['dependencies']:
                dep_path = self.project_root / dep_key
                if dep_path.exists():
                    self._analyze_file(dep_path, depth + 1, max_depth)
    
    def _extract_imports(self, content: str, file_path: Path) -> List[str]:
        """Витягти імпорти з файлу"""
        imports = []
        
        if file_path.suffix in ['.py']:
            # Python імпорти через AST
            try:
                tree = ast.parse(content)
                for node in ast.walk(tree):
                    if isinstance(node, ast.Import):
                        for alias in node.names:
                            imports.append(alias.name)
                    elif isinstance(node, ast.ImportFrom):
                        if node.module:
                            imports.append(node.module)
            except SyntaxError as e:
                logger.warning(f"Syntax error in {file_path}: {e}")
                try:
                    file_key = str(file_path.relative_to(self.project_root))
                except ValueError:
                    file_key = str(file_path)
                self.broken_files[file_key] = str(e)
                return []
            except Exception:
                pass
        else:
            # JavaScript/TypeScript імпорти
            import_pattern = r"import\s+(?:.*?)\s+from\s+['\"]([^'\"]+)['\"]"
            imports.extend(re.findall(import_pattern, content))
            
            require_pattern = r"require\s*\(\s*['\"]([^'\"]+)['\"]\s*\)"
            imports.extend(re.findall(require_pattern, content))
        
        return list(set(imports))
    
    def _extract_exports(self, content: str) -> List[str]:
        """Витягти експорти з файлу"""
        exports = []
        
        export_pattern = r"export\s+(?:default\s+)?(?:class|function|const|let|var)\s+(\w+)"
        exports.extend(re.findall(export_pattern, content))
        
        named_export_pattern = r"export\s+{\s*([^}]+)\s*}"
        matches = re.findall(named_export_pattern, content)
        for match in matches:
            for e in match.split(','):
                parts = e.strip().split()
                if parts:
                    exports.append(parts[0])
        
        return list(set(exports))
    
    def _extract_functions(self, content: str) -> List[Dict[str, Any]]:
        """Витягти функції з файлу"""
        functions = []
        
        func_pattern = r"(?:async\s+)?(?:def|function|const|let)\s+(\w+)\s*(?:\(|=)"
        matches = re.finditer(func_pattern, content)
        
        for match in matches:
            func_name = match.group(1)
            line_num = content[:match.start()].count('\n') + 1
            functions.append({
                'name': func_name,
                'line': line_num,
                'type': 'function'
            })
        
        return functions
    
    def _extract_classes(self, content: str) -> List[Dict[str, Any]]:
        """Витягти класи з файлу"""
        classes = []
        
        class_pattern = r"class\s+(\w+)(?:\s+extends\s+(\w+))?"
        matches = re.finditer(class_pattern, content)
        
        for match in matches:
            class_name = match.group(1)
            extends = match.group(2)
            line_num = content[:match.start()].count('\n') + 1
            classes.append({
                'name': class_name,
                'extends': extends,
                'line': line_num,
                'type': 'class'
            })
        
        return classes
    
    def _resolve_import(self, from_file: Path, import_path: str) -> Optional[Path]:
        """Розв'язати імпорт до реального файлу"""
        if import_path.startswith('.'):
            resolved = (from_file.parent / import_path).resolve()
            
            for ext in ['.js', '.ts', '.py', '/index.js', '/index.ts']:
                test_path = Path(str(resolved) + ext) if not resolved.suffix else resolved
                if test_path.exists():
                    return test_path
        else:
            for possible_path in self.project_root.rglob(f"{import_path}*"):
                if possible_path.is_file() and possible_path.suffix in ['.js', '.ts', '.py']:
                    return possible_path
        
        return None
    
    def _determine_file_status(self):
        """Точно визначити статус файлу"""
        for file_key, file_info in self.files_cache.items():
            if file_key in self.broken_files:
                self.file_status[file_key] = FileStatus.BROKEN
                continue
            
            dependents = self.reverse_dependencies.get(file_key, set())
            dependencies = file_info['dependencies']
            last_modified = datetime.fromisoformat(file_info['last_modified'])
            
            # Визначаємо статус
            if self._is_entry_point(file_key):
                status = FileStatus.ACTIVE
            elif self._is_config_file(file_key):
                status = FileStatus.ACTIVE
            elif not dependents and not dependencies:
                status = FileStatus.UNUSED
            elif self._is_deprecated(file_key, last_modified):
                status = FileStatus.DEPRECATED
            elif self._is_legacy(file_key):
                status = FileStatus.LEGACY
            elif self._is_in_development(file_key):
                status = FileStatus.IN_DEVELOPMENT
            else:
                status = FileStatus.ACTIVE
            
            self.file_status[file_key] = status
    
    def _is_entry_point(self, file_key: str) -> bool:
        """Перевірити, чи файл є точкою входу"""
        entry_points = ['index.js', 'main.js', 'app.js', '__main__.py', 'main.py']
        return any(file_key.endswith(ep) for ep in entry_points)
    
    def _is_config_file(self, file_key: str) -> bool:
        """Перевірити, чи файл є конфігураційним"""
        config_patterns = ['config', 'settings', 'env', 'package.json', 'tsconfig']
        return any(pattern in file_key.lower() for pattern in config_patterns)
    
    def _is_deprecated(self, file_key: str, last_modified: datetime) -> bool:
        """Перевірити, чи файл застарілий"""
        days_since_modified = (datetime.now() - last_modified).days
        return days_since_modified > self.deprecated_threshold_days
    
    def _is_legacy(self, file_key: str) -> bool:
        """Перевірити, чи файл legacy"""
        legacy_patterns = ['legacy', 'old', 'deprecated', 'archive']
        return any(pattern in file_key.lower() for pattern in legacy_patterns)
    
    def _is_in_development(self, file_key: str) -> bool:
        """Перевірити, чи файл в розробці"""
        dev_patterns = ['dev', 'wip', 'experimental', 'test']
        return any(pattern in file_key.lower() for pattern in dev_patterns)
    
    def _detect_circular_dependencies(self) -> List[List[str]]:
        """Виявити циклічні залежності через DFS"""
        cycles = []
        visited = set()
        rec_stack = set()
        
        def dfs(node, path):
            visited.add(node)
            rec_stack.add(node)
            
            for neighbor in self.dependencies.get(node, []):
                if neighbor not in visited:
                    dfs(neighbor, path + [neighbor])
                elif neighbor in rec_stack:
                    cycle = path + [neighbor]
                    cycles.append(cycle)
            
            rec_stack.remove(node)
        
        for node in self.dependencies:
            if node not in visited:
                dfs(node, [node])
        
        return cycles
    
    def _build_architecture_map(self, max_depth: int, cycles: List) -> Dict[str, Any]:
        """Побудувати архітектурну карту"""
        return {
            'timestamp': datetime.now().isoformat(),
            'project_root': str(self.project_root),
            'analysis_root': str(self.analysis_root),
            'max_depth': max_depth,
            'files': self._serialize_files(),
            'dependencies': self._serialize_dependencies(),
            'circular_dependencies': cycles,
            'statistics': self._calculate_statistics(),
            'health_score': self._calculate_health_score(),
        }
    
    def _serialize_files(self) -> Dict[str, Any]:
        """Серіалізувати файли для JSON"""
        result = {}
        for file_key, file_info in self.files_cache.items():
            result[file_key] = {
                'size': file_info['size'],
                'lines': file_info['lines'],
                'depth': file_info['depth'],
                'status': self.file_status.get(file_key, FileStatus.ACTIVE),
                'imports_count': len(file_info['imports']),
                'exports_count': len(file_info['exports']),
                'functions_count': len(file_info['functions']),
                'classes_count': len(file_info['classes']),
                'dependencies_count': len(file_info['dependencies']),
                'dependents_count': len(self.reverse_dependencies.get(file_key, [])),
                'last_modified': file_info['last_modified'],
                'functions': file_info['functions'],
                'classes': file_info['classes'],
                'broken_reason': self.broken_files.get(file_key),
            }
        return result
    
    def _serialize_dependencies(self) -> Dict[str, List[str]]:
        """Серіалізувати залежності"""
        result = {}
        for file_key, deps in self.dependencies.items():
            result[file_key] = sorted(list(deps))
        return result
    
    def _calculate_statistics(self) -> Dict[str, Any]:
        """Розрахувати статистику"""
        total_files = len(self.files_cache)
        total_lines = sum(f['lines'] for f in self.files_cache.values())
        total_size = sum(f['size'] for f in self.files_cache.values())
        
        status_counts = defaultdict(int)
        for status in self.file_status.values():
            status_counts[status] += 1
        
        return {
            'total_files': total_files,
            'total_lines': total_lines,
            'total_size': total_size,
            'average_lines_per_file': total_lines // total_files if total_files > 0 else 0,
            'status_distribution': dict(status_counts),
            'unused_files': sum(1 for s in self.file_status.values() if s == FileStatus.UNUSED),
            'active_files': sum(1 for s in self.file_status.values() if s == FileStatus.ACTIVE),
            'deprecated_files': sum(1 for s in self.file_status.values() if s == FileStatus.DEPRECATED),
            'broken_files': sum(1 for s in self.file_status.values() if s == FileStatus.BROKEN),
        }
    
    def _calculate_health_score(self) -> Dict[str, Any]:
        """Розрахувати оцінку здоров'я архітектури"""
        stats = self._calculate_statistics()
        
        unused_ratio = stats['unused_files'] / stats['total_files'] if stats['total_files'] > 0 else 0
        avg_deps = sum(len(d) for d in self.dependencies.values()) / len(self.dependencies) if self.dependencies else 0
        
        score = 100
        score -= unused_ratio * 20
        
        if avg_deps > 5:
            score -= (avg_deps - 5) * 2
        
        if stats['total_files'] > 10:
            score += 10
        
        return {
            'score': max(0, min(100, score)),
            'unused_ratio': unused_ratio,
            'average_dependencies': avg_deps,
            'modularity': 'good' if stats['total_files'] > 10 else 'fair',
        }
    
    def export_architecture(self, output_path: Path) -> None:
        """Експортувати архітектуру в JSON"""
        architecture = self.analyze_architecture()
        
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(architecture, f, indent=2, default=str)
        
        logger.info(f"✅ Архітектура експортована в {output_path}")
    
    def generate_architecture_report(self) -> str:
        """Генерувати звіт про архітектуру"""
        architecture = self.analyze_architecture()
        stats = architecture['statistics']
        health = architecture['health_score']
        
        report = f"""
╔════════════════════════════════════════════════════════════════╗
║           АРХІТЕКТУРНА КАРТА СИСТЕМИ                           ║
╚════════════════════════════════════════════════════════════════╝

📊 СТАТИСТИКА:
   • Всього файлів: {stats['total_files']}
   • Активних файлів: {stats['active_files']}
   • Невикористовуваних файлів: {stats['unused_files']}
   • Застарілих файлів: {stats['deprecated_files']}
   • Всього рядків коду: {stats['total_lines']}
   • Середня довжина файлу: {stats['average_lines_per_file']} рядків
   • Загальний розмір: {stats['total_size']} байт

🏥 ЗДОРОВ'Я АРХІТЕКТУРИ:
   • Оцінка: {health['score']:.1f}/100
   • Модульність: {health['modularity']}
   • Коефіцієнт невикористання: {health['unused_ratio']:.1%}
   • Середня залежність: {health['average_dependencies']:.1f}

📁 РОЗПОДІЛ СТАТУСІВ:
"""
        for status, count in stats['status_distribution'].items():
            report += f"   • {status}: {count}\n"
        
        return report


if __name__ == '__main__':
    project_root = Path(__file__).parent.parent.parent
    mapper = ArchitectureMapper(project_root)
    
    print(mapper.generate_architecture_report())
    
    output_path = Path(__file__).parent.parent / 'reports' / 'architecture_map.json'
    output_path.parent.mkdir(parents=True, exist_ok=True)
    mapper.export_architecture(output_path)
