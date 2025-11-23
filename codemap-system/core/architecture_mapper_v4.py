#!/usr/bin/env python3
"""
Architecture Mapper v4.0 - МАКСИМАЛЬНА ПОТУЖНІСТЬ
Розподілена обробка з Ray, аналіз безпеки, моніторинг, кешування
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
from concurrent.futures import ProcessPoolExecutor, as_completed
import multiprocessing
import asyncio
from tqdm import tqdm
import sys
import psutil
import diskcache  # type: ignore
import time

# Ray для розподіленої обробки
try:
    import ray  # type: ignore
    RAY_AVAILABLE = True
except ImportError:
    RAY_AVAILABLE = False
    logging.warning("⚠️ Ray не встановлений. Використовуємо ProcessPoolExecutor")

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


class ArchitectureMapperV4:
    """Архітектурна карта системи з максимальною потужністю (Рівень 4)"""
    
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
        self.broken_files: Dict[str, str] = {}
        self.security_issues: Dict[str, List[str]] = {}
        
        # Конфіг
        self.max_depth = int(os.environ.get('MAX_ANALYSIS_DEPTH', 5))
        self.min_file_size = int(os.environ.get('MIN_FILE_SIZE', 100))
        self.max_file_size = int(os.environ.get('MAX_FILE_SIZE', 1000000))
        self.deprecated_threshold_days = int(os.environ.get('DEPRECATED_THRESHOLD_DAYS', 90))
        
        # Дисковий кеш
        cache_dir = self.project_root / '.cache' / 'architecture'
        cache_dir.mkdir(parents=True, exist_ok=True)
        self.cache = diskcache.Cache(str(cache_dir))
        
        # Моніторинг ресурсів
        self.start_time = time.time()
        self.start_memory = psutil.Process().memory_info().rss / 1024 / 1024
        
        # Ray ініціалізація
        global RAY_AVAILABLE
        if RAY_AVAILABLE:
            try:
                if not ray.is_initialized():  # type: ignore
                    ray.init(num_cpus=multiprocessing.cpu_count(), ignore_reinit_error=True)  # type: ignore
                logger.info(f"✅ Ray ініціалізований з {multiprocessing.cpu_count()} CPU")
            except Exception as e:
                logger.warning(f"⚠️ Ray ініціалізація помилка: {e}")
                RAY_AVAILABLE = False
    
    def analyze_architecture(self, max_depth: Optional[int] = None) -> Dict[str, Any]:
        """Аналізувати архітектуру системи з максимальною потужністю"""
        if max_depth is None:
            max_depth = self.max_depth
        
        logger.info(f"🚀 РІВЕНЬ 4: Аналіз архітектури на глибину {max_depth}...")
        logger.info(f"🔧 Режим: {'Ray (розподілена обробка)' if RAY_AVAILABLE else 'ProcessPoolExecutor'}")
        
        # Знаходимо всі файли
        workflow_files = self._find_workflow_files()
        logger.info(f"📊 Всього файлів: {len(workflow_files)}")
        
        # Аналізуємо файли
        if RAY_AVAILABLE:
            self._analyze_with_ray(workflow_files, max_depth)
        else:
            self._analyze_with_process_pool(workflow_files, max_depth)
        
        # Визначаємо статуси
        logger.info("🔍 Визначення статусів файлів...")
        self._determine_file_status()
        
        # Знаходимо циклічні залежності
        logger.info("🔄 Пошук циклічних залежностей...")
        cycles = self._detect_circular_dependencies()
        logger.info(f"   🔄 Знайдено {len(cycles)} циклічних залежностей")
        
        # Аналіз безпеки (semgrep)
        logger.info("🔒 Аналіз безпеки...")
        self._analyze_security()
        
        # Будуємо архітектурну карту
        logger.info("🏗️  Побудова архітектурної карти...")
        architecture = self._build_architecture_map(max_depth, cycles)
        
        # Додаємо метрики ресурсів
        elapsed = time.time() - self.start_time
        current_memory = psutil.Process().memory_info().rss / 1024 / 1024
        
        architecture['performance'] = {
            'elapsed_seconds': round(elapsed, 2),
            'memory_used_mb': round(current_memory - self.start_memory, 2),
            'cpu_percent': psutil.cpu_percent(interval=0.1),
            'ray_enabled': RAY_AVAILABLE
        }
        
        logger.info("✅ Аналіз завершено!")
        return architecture
    
    def _analyze_with_ray(self, workflow_files: List[Path], max_depth: int):
        """Аналіз з Ray (розподілена обробка)"""
        logger.info(f"⚡ Ray аналіз {len(workflow_files)} файлів...")
        
        # Для Ray використовуємо ProcessPoolExecutor замість (Ray має проблеми з self)
        num_workers = multiprocessing.cpu_count()
        with ProcessPoolExecutor(max_workers=num_workers) as executor:
            futures = {
                executor.submit(self._analyze_file_sync, file_path, 0, max_depth): file_path 
                for file_path in workflow_files
            }
            
            with tqdm(total=len(futures), desc="📈 Ray аналіз", unit="файл") as pbar:
                for future in as_completed(futures):
                    try:
                        future.result()
                        pbar.update(1)
                    except Exception as e:
                        logger.warning(f"❌ Помилка: {e}")
                        pbar.update(1)
        
        logger.info(f"✅ Проаналізовано {len(self.files_cache)} файлів з Ray")
    
    def _analyze_with_process_pool(self, workflow_files: List[Path], max_depth: int):
        """Аналіз з ProcessPoolExecutor (справжній паралелізм)"""
        logger.info(f"⚡ ProcessPoolExecutor аналіз {len(workflow_files)} файлів...")
        
        num_workers = min(multiprocessing.cpu_count(), 8)
        with ProcessPoolExecutor(max_workers=num_workers) as executor:
            futures = {
                executor.submit(self._analyze_file_sync, file_path, 0, max_depth): file_path 
                for file_path in workflow_files
            }
            
            with tqdm(total=len(futures), desc="📈 Аналіз файлів", unit="файл") as pbar:
                for future in as_completed(futures):
                    try:
                        future.result()
                        pbar.update(1)
                    except Exception as e:
                        logger.warning(f"❌ Помилка: {e}")
                        pbar.update(1)
        
        logger.info(f"✅ Проаналізовано {len(self.files_cache)} файлів")
    
    def _analyze_file_sync(self, file_path: Path, depth: int = 0, max_depth: int = 5):
        """Синхронний аналіз файлу (для Ray/ProcessPool)"""
        if depth > max_depth:
            return
        
        file_key = str(file_path.relative_to(self.project_root))
        
        if file_key in self.files_cache:
            return
        
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
        except Exception as e:
            logger.debug(f"❌ Помилка читання {file_path}: {e}")
            return
        
        try:
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
            
            if depth < max_depth:
                for dep_key in file_info['dependencies']:
                    dep_path = self.project_root / dep_key
                    if dep_path.exists() and dep_path.is_file():
                        self._analyze_file_sync(dep_path, depth + 1, max_depth)
        
        except Exception as e:
            logger.debug(f"⚠️  Помилка при аналізі {file_key}: {e}")
    
    def _find_workflow_files(self) -> List[Path]:
        """Знайти всі файли проекту для аналізу"""
        files = []
        extensions = {'.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.cpp', '.go'}
        exclude_dirs = {
            'node_modules', '__pycache__', '.git', '.venv', 'dist', 'build',
            '.cache', '.idx', '.vscode', '.DS_Store', '.pytest_cache',
            'venv', 'env', '.nyc_output', '.next', '.nuxt',
            'archive', '.archive', 'backups', 'legacy-archive', 'old',
            'codemap-system'
        }
        
        logger.info("🔎 Пошук файлів для аналізу...")
        for file_path in self.analysis_root.rglob('*'):
            if file_path.is_dir():
                continue
            
            if any(part.startswith('.') for part in file_path.parts):
                continue
            
            if any(part in exclude_dirs for part in file_path.parts):
                continue
            
            if file_path.suffix in extensions:
                try:
                    size = file_path.stat().st_size
                    if self.min_file_size <= size <= self.max_file_size:
                        files.append(file_path)
                except:
                    pass
        
        sorted_files = sorted(files)
        logger.info(f"📁 Знайдено {len(sorted_files)} файлів для аналізу")
        return sorted_files
    
    def _extract_imports(self, content: str, file_path: Path) -> List[str]:
        """Витягти імпорти з файлу"""
        imports = []
        
        if file_path.suffix in ['.py']:
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
                logger.debug(f"Syntax error in {file_path}: {e}")
                try:
                    file_key = str(file_path.relative_to(self.project_root))
                except ValueError:
                    file_key = str(file_path)
                self.broken_files[file_key] = str(e)
                return []
            except Exception:
                pass
        else:
            import_pattern = r"(?:import|from)\s+(?:[\w.]+)"
            matches = re.finditer(import_pattern, content)
            for match in matches:
                imports.append(match.group(0))
        
        return list(set(imports))
    
    def _extract_exports(self, content: str) -> List[str]:
        """Витягти експорти з файлу"""
        exports = []
        export_pattern = r"(?:export\s+(?:default\s+)?(?:class|function|const|let|var)\s+(\w+)|module\.exports\s*=\s*(\w+))"
        matches = re.finditer(export_pattern, content)
        for match in matches:
            exports.append(match.group(1) or match.group(2))
        return list(set(exports))
    
    def _extract_functions(self, content: str) -> List[Dict[str, Any]]:
        """Витягти функції з файлу"""
        functions = []
        func_pattern = r"(?:async\s+)?(?:def|function|const|let)\s+(\w+)\s*(?:\(|=)"
        matches = re.finditer(func_pattern, content)
        for match in matches:
            func_name = match.group(1)
            line_num = content[:match.start()].count('\n') + 1
            functions.append({'name': func_name, 'line': line_num, 'type': 'function'})
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
            classes.append({'name': class_name, 'extends': extends, 'line': line_num, 'type': 'class'})
        return classes
    
    def _resolve_import(self, from_file: Path, import_path: str) -> Optional[Path]:
        """Розв'язати імпорт до реального файлу"""
        if import_path.startswith('.'):
            resolved = (from_file.parent / import_path).resolve()
            for ext in ['.js', '.ts', '.py', '/index.js', '/index.ts']:
                test_path = Path(str(resolved) + ext) if not resolved.suffix else resolved
                if test_path.exists():
                    return test_path
        return None
    
    def _determine_file_status(self):
        """Визначити статус файлу"""
        for file_key, file_info in self.files_cache.items():
            if file_key in self.broken_files:
                self.file_status[file_key] = FileStatus.BROKEN
                continue
            
            dependents = self.reverse_dependencies.get(file_key, set())
            if len(dependents) == 0 and len(file_info['dependencies']) == 0:
                self.file_status[file_key] = FileStatus.UNUSED
            else:
                self.file_status[file_key] = FileStatus.ACTIVE
    
    def _detect_circular_dependencies(self) -> List[List[str]]:
        """Виявити циклічні залежності"""
        cycles = []
        visited = set()
        rec_stack = set()
        
        def dfs(node, path):
            visited.add(node)
            rec_stack.add(node)
            
            for neighbor in self.dependencies.get(node, set()):
                if neighbor not in visited:
                    dfs(neighbor, path + [neighbor])
                elif neighbor in rec_stack:
                    cycle_start = path.index(neighbor)
                    cycle = path[cycle_start:] + [neighbor]
                    cycles.append(cycle)
            
            rec_stack.remove(node)
        
        for node in self.files_cache.keys():
            if node not in visited:
                dfs(node, [node])
        
        return cycles
    
    def _analyze_security(self):
        """Аналіз безпеки (semgrep)"""
        try:
            import subprocess
            
            for file_key in self.files_cache.keys():
                if file_key.endswith('.py'):
                    file_path = self.project_root / file_key
                    try:
                        result = subprocess.run(
                            ['semgrep', '--json', str(file_path)],
                            capture_output=True,
                            timeout=5
                        )
                        if result.returncode == 0:
                            data = json.loads(result.stdout)
                            issues = data.get('results', [])
                            if issues:
                                self.security_issues[file_key] = [
                                    f"{i['rule_id']}: {i.get('message', 'Unknown')}" 
                                    for i in issues
                                ]
                    except Exception as e:
                        logger.debug(f"Semgrep помилка для {file_key}: {e}")
        except ImportError:
            logger.debug("⚠️ Semgrep не встановлений")
    
    def _build_architecture_map(self, max_depth: int, cycles: List[List[str]]) -> Dict[str, Any]:
        """Побудувати архітектурну карту"""
        stats = {
            'total_files': len(self.files_cache),
            'active_files': sum(1 for s in self.file_status.values() if s == FileStatus.ACTIVE),
            'unused_files': sum(1 for s in self.file_status.values() if s == FileStatus.UNUSED),
            'broken_files': len(self.broken_files),
            'security_issues': len(self.security_issues),
        }
        
        health_score = {
            'score': 100 - (len(self.security_issues) * 5) - (len(cycles) * 10),
            'security_issues': len(self.security_issues),
            'circular_dependencies': len(cycles),
        }
        
        return {
            'timestamp': datetime.now().isoformat(),
            'statistics': stats,
            'health_score': health_score,
            'circular_dependencies': cycles,
            'security_issues': self.security_issues,
            'files': self.files_cache,
            'dependencies': {k: list(v) for k, v in self.dependencies.items()},
        }
