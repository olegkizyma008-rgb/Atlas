#!/usr/bin/env python3
"""
Architecture Mapper - Глибока архітектурна карта системи
Рекурсивний аналіз файлів, залежностей, статусів та взаємодій
"""

import json
import os
from pathlib import Path
from typing import Dict, List, Set, Tuple, Optional, Any
from datetime import datetime
from collections import defaultdict
import ast
import re
from dotenv import load_dotenv


class FileStatus:
    """Статус файлу в системі"""
    ACTIVE = "ACTIVE"  # Активно використовується
    DEPRECATED = "DEPRECATED"  # Застаріло
    UNUSED = "UNUSED"  # Не використовується
    IN_DEVELOPMENT = "IN_DEVELOPMENT"  # В розробці
    LEGACY = "LEGACY"  # Спадщина
    EXPERIMENTAL = "EXPERIMENTAL"  # Експериментальне


class ArchitectureMapper:
    """Глибока архітектурна карта системи з рекурсивним аналізом"""
    
    def __init__(self, project_root: Optional[Path] = None):
        # Якщо project_root не передано, читаємо з .env.architecture
        if project_root is None:
            env_path = Path(__file__).parent / '.env.architecture'
            if env_path.exists():
                load_dotenv(env_path)
            
            project_root_str = os.environ.get('PROJECT_ROOT', '..')
            if not os.path.isabs(project_root_str):
                project_root = Path(__file__).parent / project_root_str
            else:
                project_root = Path(project_root_str)
        
        self.project_root = Path(project_root).resolve()
        
        # Аналізуємо весь проект, а не тільки workflow
        self.analysis_root = self.project_root
        
        # Кеш для файлів та їх властивостей
        self.files_cache: Dict[str, Dict[str, Any]] = {}
        self.dependencies: Dict[str, Set[str]] = defaultdict(set)
        self.reverse_dependencies: Dict[str, Set[str]] = defaultdict(set)
        self.file_interactions: Dict[str, List[Dict[str, Any]]] = defaultdict(list)
        self.file_status: Dict[str, str] = {}
        self.last_modified: Dict[str, datetime] = {}
        
    def analyze_architecture(self, max_depth: int = 5) -> Dict[str, Any]:
        """Аналізувати архітектуру системи рекурсивно"""
        print(f"🔍 Аналіз архітектури на глибину {max_depth}...")
        
        # Знаходимо всі файли workflow
        workflow_files = self._find_workflow_files()
        print(f"   📁 Знайдено {len(workflow_files)} файлів")
        
        # Аналізуємо кожен файл
        for file_path in workflow_files:
            self._analyze_file(file_path, depth=0, max_depth=max_depth)
        
        # Визначаємо статуси файлів
        self._determine_file_status()
        
        # Будуємо архітектурну карту
        architecture = self._build_architecture_map(max_depth)
        
        return architecture
    
    def _find_workflow_files(self) -> List[Path]:
        """Знайти всі файли проекту для аналізу"""
        files = []
        
        # Розширення для аналізу
        extensions = {'.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.cpp', '.go'}
        
        # Папки для виключення
        exclude_dirs = {'node_modules', '__pycache__', '.git', '.venv', 'dist', 'build', 
                       'archive', '.archive', 'backups', '.cache', '.idx', '.vscode', '.DS_Store'}
        
        # Рекурсивно проходимо по всім файлам
        for file_path in self.analysis_root.rglob('*'):
            # Пропускаємо директорії
            if file_path.is_dir():
                continue
            
            # Пропускаємо приховані файли/папки
            if any(part.startswith('.') for part in file_path.parts):
                continue
            
            # Пропускаємо виключені директорії
            if any(part in exclude_dirs for part in file_path.parts):
                continue
            
            # Перевіряємо розширення
            if file_path.suffix in extensions:
                files.append(file_path)
        
        return sorted(files)
    
    def _analyze_file(self, file_path: Path, depth: int = 0, max_depth: int = 5) -> Dict[str, Any]:
        """Аналізувати файл рекурсивно"""
        if depth > max_depth:
            return {}
        
        file_key = str(file_path.relative_to(self.project_root))
        
        # Якщо вже аналізували, повертаємо кеш
        if file_key in self.files_cache:
            return self.files_cache[file_key]
        
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
        except Exception as e:
            print(f"   ⚠️ Помилка читання {file_path}: {e}")
            return {}
        
        # Аналізуємо вміст файлу
        file_info = {
            'path': file_key,
            'size': len(content),
            'lines': len(content.split('\n')),
            'depth': depth,
            'imports': self._extract_imports(content),
            'exports': self._extract_exports(content),
            'functions': self._extract_functions(content),
            'classes': self._extract_classes(content),
            'dependencies': set(),
            'dependents': set(),
            'last_modified': datetime.fromtimestamp(os.path.getmtime(file_path)).isoformat(),
            'status': FileStatus.ACTIVE,  # Буде оновлено пізніше
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
                    # Залежність поза проектом, ігноруємо
                    pass
        
        # Кешуємо результат
        self.files_cache[file_key] = file_info
        
        # Рекурсивно аналізуємо залежності
        if depth < max_depth:
            for dep_key in file_info['dependencies']:
                dep_path = self.project_root / dep_key
                if dep_path.exists():
                    self._analyze_file(dep_path, depth + 1, max_depth)
        
        return file_info
    
    def _extract_imports(self, content: str) -> List[str]:
        """Витягти імпорти з файлу"""
        imports = []
        
        # ES6 imports
        import_pattern = r"import\s+(?:.*?)\s+from\s+['\"]([^'\"]+)['\"]"
        imports.extend(re.findall(import_pattern, content))
        
        # CommonJS requires
        require_pattern = r"require\s*\(\s*['\"]([^'\"]+)['\"]\s*\)"
        imports.extend(re.findall(require_pattern, content))
        
        return imports
    
    def _extract_exports(self, content: str) -> List[str]:
        """Витягти експорти з файлу"""
        exports = []
        
        # ES6 exports
        export_pattern = r"export\s+(?:default\s+)?(?:class|function|const|let|var)\s+(\w+)"
        exports.extend(re.findall(export_pattern, content))
        
        # Named exports
        named_export_pattern = r"export\s+{\s*([^}]+)\s*}"
        matches = re.findall(named_export_pattern, content)
        for match in matches:
            exports.extend([e.strip().split()[0] for e in match.split(',')])
        
        return exports
    
    def _extract_functions(self, content: str) -> List[Dict[str, Any]]:
        """Витягти функції з файлу"""
        functions = []
        
        # Знаходимо функції
        func_pattern = r"(?:async\s+)?(?:function|const|let)\s+(\w+)\s*(?:\(|=)"
        matches = re.finditer(func_pattern, content)
        
        for match in matches:
            func_name = match.group(1)
            # Знаходимо рядок функції
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
        
        # Знаходимо класи
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
        # Видаляємо розширення якщо є
        if import_path.startswith('.'):
            # Відносний імпорт
            resolved = (from_file.parent / import_path).resolve()
            
            # Перевіряємо різні розширення
            for ext in ['.js', '.ts', '/index.js', '/index.ts']:
                test_path = Path(str(resolved) + ext) if not resolved.suffix else resolved
                if test_path.exists():
                    return test_path
        else:
            # Абсолютний імпорт або node_modules
            # Шукаємо в проекті
            for possible_path in self.project_root.rglob(f"{import_path}*"):
                if possible_path.is_file() and possible_path.suffix in ['.js', '.ts']:
                    return possible_path
        
        return None
    
    def _determine_file_status(self):
        """Визначити статус кожного файлу"""
        for file_key, file_info in self.files_cache.items():
            # Якщо файл не має залежних, можливо він не використовується
            if not self.reverse_dependencies.get(file_key):
                self.file_status[file_key] = FileStatus.UNUSED
            # Якщо файл має багато залежних, він активний
            elif len(self.reverse_dependencies.get(file_key, [])) > 2:
                self.file_status[file_key] = FileStatus.ACTIVE
            # Якщо файл має залежності, він активний
            elif file_info['dependencies']:
                self.file_status[file_key] = FileStatus.ACTIVE
            else:
                self.file_status[file_key] = FileStatus.ACTIVE
    
    def _build_architecture_map(self, max_depth: int) -> Dict[str, Any]:
        """Побудувати архітектурну карту"""
        return {
            'timestamp': datetime.now().isoformat(),
            'project_root': str(self.project_root),
            'analysis_root': str(self.analysis_root),
            'max_depth': max_depth,
            'files': self._serialize_files(),
            'dependencies': self._serialize_dependencies(),
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
        }
    
    def _calculate_health_score(self) -> Dict[str, Any]:
        """Розрахувати оцінку здоров'я архітектури"""
        stats = self._calculate_statistics()
        
        # Оцінка на основі різних факторів
        unused_ratio = stats['unused_files'] / stats['total_files'] if stats['total_files'] > 0 else 0
        avg_deps = sum(len(d) for d in self.dependencies.values()) / len(self.dependencies) if self.dependencies else 0
        
        # Базова оцінка 100
        score = 100
        
        # Штраф за невикористовувані файли
        score -= unused_ratio * 20
        
        # Штраф за високу залежність
        if avg_deps > 5:
            score -= (avg_deps - 5) * 2
        
        # Бонус за добру модульність
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
        
        print(f"✅ Архітектура експортована в {output_path}")
    
    def generate_architecture_report(self) -> str:
        """Генерувати звіт про архітектуру"""
        architecture = self.analyze_architecture()
        stats = architecture['statistics']
        health = architecture['health_score']
        
        report = f"""
╔════════════════════════════════════════════════════════════════╗
║           АРХІТЕКТУРНА КАРТА СИСТЕМИ WORKFLOW                  ║
╚════════════════════════════════════════════════════════════════╝

📊 СТАТИСТИКА:
   • Всього файлів: {stats['total_files']}
   • Активних файлів: {stats['active_files']}
   • Невикористовуваних файлів: {stats['unused_files']}
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
    project_root = Path(__file__).parent.parent
    mapper = ArchitectureMapper(project_root)
    
    # Генеруємо звіт
    print(mapper.generate_architecture_report())
    
    # Експортуємо архітектуру
    output_path = Path(__file__).parent / 'reports' / 'architecture_map.json'
    output_path.parent.mkdir(parents=True, exist_ok=True)
    mapper.export_architecture(output_path)
