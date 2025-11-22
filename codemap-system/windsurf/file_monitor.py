#!/usr/bin/env python3
"""
File Monitor - Моніторинг змін файлів для real-time оновлень
"""

import sys
from pathlib import Path
from typing import Callable, Optional
import logging
import asyncio

sys.path.insert(0, str(Path(__file__).parent.parent))

logger = logging.getLogger(__name__)


class FileChangeEvent:
    """Подія зміни файлу"""
    
    def __init__(self, file_path: str, event_type: str):
        self.file_path = file_path
        self.event_type = event_type  # created, modified, deleted, moved
        self.timestamp = __import__('datetime').datetime.now().isoformat()
    
    def to_dict(self):
        return {
            "file": self.file_path,
            "type": self.event_type,
            "timestamp": self.timestamp
        }


class FileMonitor:
    """Монітор змін файлів"""
    
    def __init__(self, watch_path: Path, extensions: Optional[list] = None):
        self.watch_path = Path(watch_path)
        self.extensions = extensions or ['.js', '.ts', '.py', '.jsx', '.tsx']
        self.callbacks = []
        self.ignore_patterns = {
            'node_modules', '__pycache__', '.git', '.venv',
            'dist', 'build', '.cache', '.archive', 'logs', 'reports'
        }
        
        logger.info(f"🔍 File Monitor ініціалізований для {self.watch_path}")
    
    def register_callback(self, callback: Callable):
        """Зареєструвати callback для змін файлів"""
        self.callbacks.append(callback)
        logger.info(f"✅ Callback зареєстрований")
    
    def should_monitor_file(self, file_path: Path) -> bool:
        """Перевірити, чи потрібно моніторити файл"""
        # Перевіряємо розширення
        if file_path.suffix not in self.extensions:
            return False
        
        # Перевіряємо ігноровані папки
        for part in file_path.parts:
            if part in self.ignore_patterns:
                return False
        
        return True
    
    async def notify_change(self, event: FileChangeEvent):
        """Повідомити про зміну файлу"""
        logger.info(f"📝 Зміна файлу: {event.file_path} ({event.event_type})")
        
        for callback in self.callbacks:
            try:
                if asyncio.iscoroutinefunction(callback):
                    await callback(event)
                else:
                    callback(event)
            except Exception as e:
                logger.error(f"❌ Помилка в callback: {e}")
    
    async def monitor(self):
        """Запустити моніторинг (заглушка для watchdog)"""
        logger.info("⏳ Моніторинг файлів запущений")
        
        try:
            from watchdog.observers import Observer
            from watchdog.events import FileSystemEventHandler
            
            class ChangeHandler(FileSystemEventHandler):
                def __init__(self, monitor):
                    self.monitor = monitor
                
                def on_modified(self, event):
                    if not event.is_directory:
                        file_path = Path(event.src_path)
                        if self.monitor.should_monitor_file(file_path):
                            change_event = FileChangeEvent(
                                str(file_path.relative_to(self.monitor.watch_path)),
                                "modified"
                            )
                            asyncio.create_task(self.monitor.notify_change(change_event))
                
                def on_created(self, event):
                    if not event.is_directory:
                        file_path = Path(event.src_path)
                        if self.monitor.should_monitor_file(file_path):
                            change_event = FileChangeEvent(
                                str(file_path.relative_to(self.monitor.watch_path)),
                                "created"
                            )
                            asyncio.create_task(self.monitor.notify_change(change_event))
                
                def on_deleted(self, event):
                    if not event.is_directory:
                        file_path = Path(event.src_path)
                        if self.monitor.should_monitor_file(file_path):
                            change_event = FileChangeEvent(
                                str(file_path.relative_to(self.monitor.watch_path)),
                                "deleted"
                            )
                            asyncio.create_task(self.monitor.notify_change(change_event))
            
            observer = Observer()
            observer.schedule(ChangeHandler(self), str(self.watch_path), recursive=True)
            observer.start()
            
            logger.info("✅ Watchdog спостерігач запущений")
            
            # Запускаємо нескінченно
            while True:
                await asyncio.sleep(1)
        
        except ImportError:
            logger.warning("⚠️ watchdog не встановлений. Встановіть: pip install watchdog")
            # Запускаємо polling замість watchdog
            await self._polling_monitor()
    
    async def _polling_monitor(self):
        """Polling-based моніторинг (fallback)"""
        logger.info("⏳ Polling-based моніторинг запущений")
        
        tracked_files = {}
        
        while True:
            try:
                for file_path in self.watch_path.rglob('*'):
                    if not self.should_monitor_file(file_path):
                        continue
                    
                    try:
                        mtime = file_path.stat().st_mtime
                        rel_path = str(file_path.relative_to(self.watch_path))
                        
                        if rel_path not in tracked_files:
                            # Новий файл
                            tracked_files[rel_path] = mtime
                            change_event = FileChangeEvent(rel_path, "created")
                            await self.notify_change(change_event)
                        elif tracked_files[rel_path] != mtime:
                            # Змінений файл
                            tracked_files[rel_path] = mtime
                            change_event = FileChangeEvent(rel_path, "modified")
                            await self.notify_change(change_event)
                    except:
                        pass
                
                # Перевіряємо видалені файли
                deleted = [f for f in tracked_files if not Path(self.watch_path / f).exists()]
                for deleted_file in deleted:
                    del tracked_files[deleted_file]
                    change_event = FileChangeEvent(deleted_file, "deleted")
                    await self.notify_change(change_event)
                
                await asyncio.sleep(5)  # Перевіряємо кожні 5 секунд
            
            except Exception as e:
                logger.error(f"❌ Помилка в polling: {e}")
                await asyncio.sleep(5)


async def main():
    """Тестування"""
    logging.basicConfig(level=logging.INFO)
    
    monitor = FileMonitor(Path('.'))
    
    async def on_change(event: FileChangeEvent):
        print(f"📝 Файл змінився: {event.file_path} ({event.event_type})")
    
    monitor.register_callback(on_change)
    
    try:
        await monitor.monitor()
    except KeyboardInterrupt:
        print("\n⏹️ Моніторинг зупинений")


if __name__ == "__main__":
    asyncio.run(main())
