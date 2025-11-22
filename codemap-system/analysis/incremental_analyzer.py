#!/usr/bin/env python3
"""
Incremental Analyzer - Інкрементальний аналіз архітектури
"""

import sys
from pathlib import Path
from typing import Dict, List, Any, Optional, Set
import json
import hashlib
import logging
from datetime import datetime

sys.path.insert(0, str(Path(__file__).parent.parent))

from core.architecture_mapper import ArchitectureMapper

logger = logging.getLogger(__name__)


class IncrementalAnalyzer:
    """Інкрементальний аналізатор архітектури"""
    
    def __init__(self, project_root: Optional[Path] = None, cache_dir: Optional[Path] = None):
        self.project_root = project_root or Path('.')
        self.cache_dir = cache_dir or (self.project_root / '.cache' / 'incremental')
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        
        self.mapper = ArchitectureMapper(project_root=self.project_root)
        self.file_hashes: Dict[str, str] = {}
        self.last_analysis: Optional[Dict[str, Any]] = None
        
        self._load_cache()
        logger.info(f"🔄 Incremental Analyzer ініціалізований")
    
    def _load_cache(self):
        """Завантажити кеш з диску"""
        cache_file = self.cache_dir / 'file_hashes.json'
        
        try:
            if cache_file.exists():
                with open(cache_file, 'r') as f:
                    self.file_hashes = json.load(f)
                logger.info(f"✅ Кеш завантажений ({len(self.file_hashes)} файлів)")
        except Exception as e:
            logger.warning(f"⚠️ Помилка завантаження кешу: {e}")
    
    def _save_cache(self):
        """Зберегти кеш на диск"""
        cache_file = self.cache_dir / 'file_hashes.json'
        
        try:
            with open(cache_file, 'w') as f:
                json.dump(self.file_hashes, f, indent=2)
            logger.info(f"✅ Кеш збережений")
        except Exception as e:
            logger.error(f"❌ Помилка збереження кешу: {e}")
    
    def _get_file_hash(self, file_path: Path) -> str:
        """Отримати хеш файлу"""
        try:
            with open(file_path, 'rb') as f:
                return hashlib.md5(f.read()).hexdigest()
        except:
            return ""
    
    def _get_changed_files(self) -> Set[str]:
        """Отримати змінені файли"""
        changed = set()
        
        for file_path in self.project_root.rglob('*'):
            if not file_path.is_file():
                continue
            
            # Пропускаємо ігноровані папки
            if any(part in file_path.parts for part in ['node_modules', '__pycache__', '.git', '.cache']):
                continue
            
            rel_path = str(file_path.relative_to(self.project_root))
            current_hash = self._get_file_hash(file_path)
            
            if rel_path not in self.file_hashes or self.file_hashes[rel_path] != current_hash:
                changed.add(rel_path)
                self.file_hashes[rel_path] = current_hash
        
        # Перевіряємо видалені файли
        deleted = set(self.file_hashes.keys()) - {str(f.relative_to(self.project_root)) 
                                                    for f in self.project_root.rglob('*') if f.is_file()}
        for deleted_file in deleted:
            del self.file_hashes[deleted_file]
            changed.add(deleted_file)
        
        return changed
    
    def analyze_incremental(self) -> Dict[str, Any]:
        """Виконати інкрементальний аналіз"""
        logger.info("🔄 Запуск інкрементального аналізу")
        
        # Отримуємо змінені файли
        changed_files = self._get_changed_files()
        logger.info(f"📝 Змінено {len(changed_files)} файлів")
        
        if not changed_files:
            logger.info("✅ Немає змін")
            return {
                "status": "no_changes",
                "changed_files": 0,
                "timestamp": datetime.now().isoformat()
            }
        
        # Виконуємо аналіз
        try:
            architecture = self.mapper.analyze_architecture(max_depth=2)
            self.last_analysis = architecture
            
            # Зберігаємо кеш
            self._save_cache()
            
            logger.info("✅ Інкрементальний аналіз завершений")
            
            return {
                "status": "analyzed",
                "changed_files": len(changed_files),
                "files": list(changed_files)[:10],  # Показуємо перші 10
                "architecture": architecture,
                "timestamp": datetime.now().isoformat()
            }
        
        except Exception as e:
            logger.error(f"❌ Помилка аналізу: {e}")
            return {
                "status": "error",
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            }
    
    def get_delta(self, previous_analysis: Dict[str, Any]) -> Dict[str, Any]:
        """Отримати різницю між аналізами"""
        if not self.last_analysis or not previous_analysis:
            return {"status": "no_previous_analysis"}
        
        current_stats = self.last_analysis.get('statistics', {})
        previous_stats = previous_analysis.get('statistics', {})
        
        delta = {
            "files_added": current_stats.get('total_files', 0) - previous_stats.get('total_files', 0),
            "unused_files_changed": current_stats.get('unused_files', 0) - previous_stats.get('unused_files', 0),
            "cycles_changed": len(self.last_analysis.get('circular_dependencies', [])) - 
                            len(previous_analysis.get('circular_dependencies', [])),
        }
        
        return delta
    
    def get_cache_stats(self) -> Dict[str, Any]:
        """Отримати статистику кешу"""
        return {
            "cached_files": len(self.file_hashes),
            "cache_dir": str(self.cache_dir),
            "cache_size_mb": sum(f.stat().st_size for f in self.cache_dir.glob('*')) / (1024 * 1024)
        }


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    
    analyzer = IncrementalAnalyzer(Path('.'))
    result = analyzer.analyze_incremental()
    
    print("🔄 Incremental Analysis Results")
    print(f"Status: {result['status']}")
    print(f"Changed files: {result.get('changed_files', 0)}")
    print(f"Cache stats: {analyzer.get_cache_stats()}")
