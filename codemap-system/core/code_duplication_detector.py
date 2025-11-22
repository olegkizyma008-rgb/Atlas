#!/usr/bin/env python3
"""
Code Duplication Detector - Виявляє дублікати коду
"""

import hashlib
from pathlib import Path
from typing import Dict, List, Set, Tuple
import logging

logger = logging.getLogger(__name__)


class CodeDuplicationDetector:
    """Виявляє дублікати коду в проекті"""
    
    def __init__(self, project_root: Path):
        self.project_root = Path(project_root)
        self.code_hashes: Dict[str, List[str]] = {}
        self.file_hashes: Dict[str, List[str]] = {}
    
    def find_duplicates(self, min_lines: int = 5) -> List[Dict]:
        """Знайти дублікати коду"""
        duplicates = []
        
        for file_path in self.project_root.rglob('*'):
            if not self._should_analyze(file_path):
                continue
            
            try:
                file_hash = self._hash_file(file_path)
                if file_hash:
                    if file_hash in self.file_hashes:
                        self.file_hashes[file_hash].append(str(file_path))
                    else:
                        self.file_hashes[file_hash] = [str(file_path)]
                
                blocks = self._extract_code_blocks(file_path, min_lines)
                
                for block_hash, block_content in blocks:
                    if block_hash in self.code_hashes:
                        self.code_hashes[block_hash].append(str(file_path))
                    else:
                        self.code_hashes[block_hash] = [str(file_path)]
            except Exception as e:
                logger.warning(f"Error analyzing {file_path}: {e}")
        
        # Знаходимо дублікати
        for block_hash, files in self.code_hashes.items():
            if len(files) > 1:
                duplicates.append({
                    'files': files,
                    'hash': block_hash,
                    'count': len(files)
                })
        
        # Дублікати цілих файлів
        for file_hash, files in self.file_hashes.items():
            if len(files) > 1:
                duplicates.append({
                    'files': files,
                    'hash': file_hash,
                    'count': len(files),
                    'type': 'file'
                })
        
        return sorted(duplicates, key=lambda x: x['count'], reverse=True)
    
    def _should_analyze(self, file_path: Path) -> bool:
        """Перевірити, чи аналізувати файл"""
        if not file_path.is_file():
            return False
        
        extensions = {'.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.cpp', '.go'}
        if file_path.suffix not in extensions:
            return False
        
        exclude_dirs = {
            'node_modules', '__pycache__', '.git', '.venv', 'dist', 'build',
            'archive', '.archive', 'backups', '.cache', '.idx', '.vscode',
            'docs', 'logs', 'reports', 'codemap-system'
        }
        if any(part in exclude_dirs for part in file_path.parts):
            return False
        
        return True
    
    def _hash_file(self, file_path: Path):
        """Порахувати хеш всього файлу"""
        try:
            with open(file_path, 'rb') as f:
                content = f.read()
        except Exception as e:
            logger.warning(f"Error hashing {file_path}: {e}")
            return None
        
        return hashlib.md5(content).hexdigest()
    
    def _extract_code_blocks(self, file_path: Path, min_lines: int) -> List[Tuple[str, str]]:
        """Витягти блоки коду для порівняння"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                lines = f.readlines()
        except:
            return []
        
        blocks = []
        for i in range(len(lines) - min_lines + 1):
            block = ''.join(lines[i:i+min_lines])
            block_hash = hashlib.md5(block.encode()).hexdigest()
            blocks.append((block_hash, block))
        
        return blocks
