#!/usr/bin/env python3
"""
WebSocket Server - Real-time архітектурні оновлення
"""

import asyncio
import json
import logging
from pathlib import Path
from typing import Set, Dict, Any
from datetime import datetime
import sys

# Додаємо codemap-system до PYTHONPATH
sys.path.insert(0, str(Path(__file__).parent.parent))

from core.architecture_mapper import ArchitectureMapper

logger = logging.getLogger(__name__)


class ArchitectureWebSocketServer:
    """WebSocket сервер для real-time оновлень архітектури"""
    
    def __init__(self, host: str = "localhost", port: int = 8765):
        self.host = host
        self.port = port
        self.clients: Set[Any] = set()
        self.mapper = ArchitectureMapper()
        self.last_architecture = None
        self.last_analysis_time = None
        
        logger.info(f"🚀 WebSocket сервер ініціалізований ({host}:{port})")
    
    async def register_client(self, websocket):
        """Зареєструвати клієнта"""
        self.clients.add(websocket)
        logger.info(f"📱 Клієнт підключений. Всього: {len(self.clients)}")
        
        # Відправляємо поточну архітектуру
        if self.last_architecture:
            await self.send_to_client(websocket, {
                "type": "architecture_update",
                "data": self.last_architecture
            })
    
    async def unregister_client(self, websocket):
        """Видалити клієнта"""
        self.clients.discard(websocket)
        logger.info(f"📱 Клієнт відключений. Всього: {len(self.clients)}")
    
    async def send_to_client(self, websocket, message: Dict[str, Any]):
        """Відправити повідомлення клієнту"""
        try:
            await websocket.send(json.dumps(message, ensure_ascii=False, default=str))
        except Exception as e:
            logger.error(f"❌ Помилка при відправці: {e}")
    
    async def broadcast(self, message: Dict[str, Any]):
        """Розіслати повідомлення всім клієнтам"""
        if not self.clients:
            return
        
        logger.info(f"📢 Розсилання повідомлення {len(self.clients)} клієнтам")
        
        for client in self.clients.copy():
            try:
                await self.send_to_client(client, message)
            except Exception as e:
                logger.error(f"❌ Помилка при розсиланні: {e}")
                self.clients.discard(client)
    
    async def analyze_and_broadcast(self):
        """Аналізувати архітектуру та розіслати оновлення"""
        logger.info("🔍 Аналіз архітектури...")
        
        try:
            architecture = self.mapper.analyze_architecture(max_depth=2)
            
            # Порівнюємо зі старою архітектурою
            if self.last_architecture is None:
                # Перший аналіз
                await self.broadcast({
                    "type": "initial_analysis",
                    "timestamp": datetime.now().isoformat(),
                    "data": architecture
                })
            else:
                # Порівнюємо зміни
                changes = self._detect_changes(self.last_architecture, architecture)
                
                if changes:
                    await self.broadcast({
                        "type": "architecture_changes",
                        "timestamp": datetime.now().isoformat(),
                        "changes": changes
                    })
            
            self.last_architecture = architecture
            self.last_analysis_time = datetime.now()
            
            logger.info("✅ Аналіз завершено")
        
        except Exception as e:
            logger.error(f"❌ Помилка аналізу: {e}", exc_info=True)
            await self.broadcast({
                "type": "error",
                "message": str(e)
            })
    
    def _detect_changes(self, old_arch: Dict, new_arch: Dict) -> Dict[str, Any]:
        """Виявити зміни в архітектурі"""
        changes = {}
        
        old_stats = old_arch.get("statistics", {})
        new_stats = new_arch.get("statistics", {})
        
        # Перевіряємо зміни в статистиці
        if new_stats.get("total_files") != old_stats.get("total_files"):
            changes["files_changed"] = {
                "old": old_stats.get("total_files"),
                "new": new_stats.get("total_files")
            }
        
        if new_stats.get("unused_files") != old_stats.get("unused_files"):
            changes["unused_files_changed"] = {
                "old": old_stats.get("unused_files"),
                "new": new_stats.get("unused_files")
            }
        
        # Перевіряємо циклічні залежності
        old_cycles = len(old_arch.get("circular_dependencies", []))
        new_cycles = len(new_arch.get("circular_dependencies", []))
        
        if new_cycles != old_cycles:
            changes["cycles_changed"] = {
                "old": old_cycles,
                "new": new_cycles
            }
        
        return changes
    
    async def periodic_analysis(self, interval: int = 300):
        """Періодичний аналіз архітектури"""
        logger.info(f"⏰ Періодичний аналіз кожні {interval} секунд")
        
        while True:
            try:
                await asyncio.sleep(interval)
                await self.analyze_and_broadcast()
            except Exception as e:
                logger.error(f"❌ Помилка в періодичному аналізі: {e}")
    
    async def handle_client(self, websocket, path):
        """Обробити клієнта"""
        await self.register_client(websocket)
        
        try:
            async for message in websocket:
                try:
                    data = json.loads(message)
                    await self.handle_message(websocket, data)
                except json.JSONDecodeError:
                    await self.send_to_client(websocket, {
                        "type": "error",
                        "message": "Invalid JSON"
                    })
        
        except Exception as e:
            logger.error(f"❌ Помилка обробки клієнта: {e}")
        
        finally:
            await self.unregister_client(websocket)
    
    async def handle_message(self, websocket, data: Dict[str, Any]):
        """Обробити повідомлення від клієнта"""
        message_type = data.get("type")
        
        if message_type == "analyze":
            # Негайний аналіз
            await self.analyze_and_broadcast()
        
        elif message_type == "get_status":
            # Отримати статус
            await self.send_to_client(websocket, {
                "type": "status",
                "clients": len(self.clients),
                "last_analysis": self.last_analysis_time.isoformat() if self.last_analysis_time else None,
                "architecture_available": self.last_architecture is not None
            })
        
        elif message_type == "ping":
            # Ping/Pong
            await self.send_to_client(websocket, {
                "type": "pong",
                "timestamp": datetime.now().isoformat()
            })
        
        else:
            await self.send_to_client(websocket, {
                "type": "error",
                "message": f"Unknown message type: {message_type}"
            })
    
    async def start(self):
        """Запустити WebSocket сервер"""
        logger.info(f"🚀 Запуск WebSocket сервера на {self.host}:{self.port}")
        
        try:
            import websockets
            from websockets.server import serve
            
            # Запускаємо періодичний аналіз
            analysis_task = asyncio.create_task(self.periodic_analysis(interval=300))
            
            # Запускаємо WebSocket сервер
            async with serve(self.handle_client, self.host, self.port):
                logger.info(f"✅ WebSocket сервер запущений на ws://{self.host}:{self.port}")
                await asyncio.Future()  # Запускаємо нескінченно
        
        except ImportError:
            logger.error("❌ websockets не встановлений. Встановіть: pip install websockets")
        except OSError as e:
            if "address already in use" in str(e):
                logger.error(f"❌ Помилка: порт {self.port} вже використовується. Виконайте: pkill -f websocket_server.py")
            else:
                logger.error(f"❌ Помилка запуску сервера: {e}", exc_info=True)
        except Exception as e:
            logger.error(f"❌ Помилка запуску сервера: {e}", exc_info=True)


async def main():
    """Основна функція"""
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    
    server = ArchitectureWebSocketServer(host="0.0.0.0", port=8765)
    await server.start()


if __name__ == "__main__":
    asyncio.run(main())
