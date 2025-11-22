#!/usr/bin/env python3
"""
Parallel Analyzer - Паралельний аналіз архітектури
"""

import asyncio
from pathlib import Path
from typing import Dict, List, Any, Optional
import sys
from concurrent.futures import ThreadPoolExecutor, ProcessPoolExecutor, as_completed
import logging

sys.path.insert(0, str(Path(__file__).parent.parent))

from core.architecture_mapper import ArchitectureMapper
from analysis.security_analyzer import SecurityAnalyzer
from analysis.performance_analyzer import PerformanceAnalyzer

logger = logging.getLogger(__name__)


class ParallelAnalyzer:
    """Паралельний аналізатор архітектури"""
    
    def __init__(self, project_root: Optional[Path] = None, max_workers: int = 4):
        self.project_root = project_root or Path('.')
        self.max_workers = max_workers
        
        logger.info(f"🚀 Parallel Analyzer ініціалізований ({max_workers} workers)")
    
    async def analyze_architecture_async(self) -> Dict[str, Any]:
        """Асинхронний аналіз архітектури"""
        logger.info("🔍 Запуск асинхронного аналізу архітектури")
        
        loop = asyncio.get_event_loop()
        
        with ThreadPoolExecutor(max_workers=self.max_workers) as executor:
            # Запускаємо аналізатори паралельно
            arch_task = loop.run_in_executor(
                executor,
                lambda: ArchitectureMapper(self.project_root).analyze_architecture(max_depth=2)
            )
            
            security_task = loop.run_in_executor(
                executor,
                lambda: SecurityAnalyzer(self.project_root).analyze_project()
            )
            
            performance_task = loop.run_in_executor(
                executor,
                lambda: PerformanceAnalyzer(self.project_root).analyze_project()
            )
            
            # Чекаємо всіх
            arch_result, security_result, performance_result = await asyncio.gather(
                arch_task, security_task, performance_task
            )
        
        logger.info("✅ Асинхронний аналіз завершений")
        
        return {
            "architecture": arch_result,
            "security": security_result,
            "performance": performance_result,
            "timestamp": __import__('datetime').datetime.now().isoformat()
        }
    
    def analyze_files_parallel(self, extensions: Optional[List[str]] = None) -> Dict[str, Any]:
        """Паралельний аналіз файлів"""
        if extensions is None:
            extensions = ['.py', '.js', '.ts', '.jsx', '.tsx']
        
        logger.info(f"📁 Паралельний аналіз файлів ({self.max_workers} workers)")
        
        files = []
        for file_path in self.project_root.rglob('*'):
            if file_path.suffix not in extensions:
                continue
            if any(part in file_path.parts for part in ['node_modules', '__pycache__', '.git']):
                continue
            files.append(file_path)
        
        logger.info(f"📊 Знайдено {len(files)} файлів для аналізу")
        
        results = {
            "total_files": len(files),
            "files_analyzed": 0,
            "errors": 0
        }
        
        with ProcessPoolExecutor(max_workers=self.max_workers) as executor:
            futures = [executor.submit(self._analyze_single_file, f) for f in files]
            
            for future in as_completed(futures):
                try:
                    result = future.result()
                    results["files_analyzed"] += 1
                except Exception as e:
                    logger.error(f"❌ Помилка: {e}")
                    results["errors"] += 1
        
        logger.info(f"✅ Аналіз завершений: {results['files_analyzed']} файлів")
        
        return results
    
    @staticmethod
    def _analyze_single_file(file_path: Path) -> Dict[str, Any]:
        """Аналізувати один файл"""
        try:
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()
            
            return {
                "file": str(file_path),
                "size": len(content),
                "lines": len(content.split('\n')),
                "status": "analyzed"
            }
        except Exception as e:
            return {
                "file": str(file_path),
                "status": "error",
                "error": str(e)
            }
    
    async def run_full_analysis(self) -> Dict[str, Any]:
        """Запустити повний паралельний аналіз"""
        logger.info("🚀 Запуск повного паралельного аналізу")
        
        # Запускаємо асинхронний аналіз
        async_results = await self.analyze_architecture_async()
        
        # Запускаємо паралельний аналіз файлів
        file_results = self.analyze_files_parallel()
        
        return {
            "analysis": async_results,
            "files": file_results,
            "total_time": "calculated"
        }


async def main():
    """Тестування"""
    logging.basicConfig(level=logging.INFO)
    
    analyzer = ParallelAnalyzer(Path('.'), max_workers=4)
    
    # Запускаємо асинхронний аналіз
    result = await analyzer.analyze_architecture_async()
    
    print("✅ Аналіз завершений")
    print(f"Architecture: {result['architecture'].get('statistics', {})}")
    print(f"Security issues: {result['security'].get('total_issues', 0)}")
    print(f"Performance issues: {result['performance'].get('total_issues', 0)}")


if __name__ == "__main__":
    asyncio.run(main())
