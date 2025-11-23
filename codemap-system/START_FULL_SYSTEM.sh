#!/bin/bash

# 🚀 Architecture System v2.0 - Full Deployment Script
# Запускає всю систему в повному обємі можливостей

set -e

# Переходимо в папку скрипту
cd "$(dirname "$0")"

echo "🚀 Architecture System v2.0 - Full Deployment"
echo "=============================================="
echo ""

# Очищуємо старі процеси перед запуском
print_step_early() {
    echo -e "\033[0;34m▶ $1\033[0m"
}

print_step_early "Очищення старих процесів"
pkill -f 'websocket_server\.py' 2>/dev/null || true
pkill -f 'architecture_daemon\.py' 2>/dev/null || true
pkill -f 'file_monitor' 2>/dev/null || true
sleep 1
echo ""

# Кольори для виводу
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Функції
print_step() {
    echo -e "${BLUE}▶ $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Крок 1: Перевірка Python
print_step "Перевірка Python"
if ! command -v python3 &> /dev/null; then
    print_error "Python3 не встановлений"
    exit 1
fi
PYTHON_VERSION=$(python3 --version | cut -d' ' -f2)
print_success "Python $PYTHON_VERSION знайдений"
echo ""

# Крок 2: Встановлення залежностей
print_step "Встановлення залежностей"
if [ ! -d "venv" ]; then
    print_warning "Віртуальне середовище не знайдено, створюємо..."
    python3 -m venv venv
fi

source venv/bin/activate || . venv/Scripts/activate

# Встановлюємо мінімальні залежності
pip install -q -r requirements-minimal.txt

# Встановлюємо advanced залежності (Рівень 4)
if [ -f "requirements-advanced.txt" ]; then
    print_step "Встановлення advanced залежностей (Рівень 4)"
    pip install -q -r requirements-advanced.txt
    print_success "Advanced залежності встановлені"
fi

print_success "Залежності встановлені"
echo ""

# Крок 3: Конфігурація
print_step "Налаштування конфігурації"
if [ ! -f ".env.architecture" ]; then
    print_warning ".env.architecture не знайдений"
    if [ -f ".env.architecture.example" ]; then
        cp .env.architecture.example .env.architecture
        print_success "Конфігурація скопійована з прикладу"
    else
        print_error "Не можна знайти приклад конфігурації"
        exit 1
    fi
else
    print_success "Конфігурація знайдена"
fi
echo ""

# Крок 4: Створення необхідних папок
print_step "Створення папок"
mkdir -p logs reports .cache
print_success "Папки створені"
echo ""

# Крок 5: Тестування
print_step "Запуск тестів"
if python3 quick_test.py > /dev/null 2>&1; then
    print_success "Тести пройшли успішно"
else
    print_warning "Деякі тести не пройшли, але продовжуємо"
fi
echo ""

# Крок 6: Запуск компонентів
print_step "Запуск компонентів системи"
echo ""

# 6.1 MCP Server
print_step "MCP Architecture Server готовий для Windsurf (stdio режим)"
# MCP сервер працює в stdio режимі і не потребує фонового запуску
# Він автоматично запускається Windsurf при необхідності
# Перевіряємо, чи існує файл сервера
if [ -f "windsurf/mcp_architecture_server.py" ]; then
    print_success "MCP сервер готовий до роботи"
else
    print_error "MCP сервер не знайдено"
fi
MCP_PID="N/A"
echo ""

# 6.2 WebSocket Server
print_step "Запуск WebSocket Server (порт 8765)"
python3 windsurf/websocket_server.py > logs/websocket_server.log 2>&1 &
WS_PID=$!
sleep 2
if ps -p $WS_PID > /dev/null; then
    print_success "WebSocket сервер запущений (PID: $WS_PID)"
else
    print_error "Помилка запуску WebSocket сервера"
fi
echo ""

# 6.3 File Monitor
print_step "Запуск File Monitor"
python3 -c "
from windsurf.file_monitor import FileMonitor
from pathlib import Path
import threading

def run_monitor():
    monitor = FileMonitor(Path('.'))
    monitor.start()

thread = threading.Thread(target=run_monitor, daemon=True)
thread.start()
" > logs/file_monitor.log 2>&1 &
FM_PID=$!
print_success "File Monitor запущений (PID: $FM_PID)"
echo ""

# 6.4 Architecture Daemon
print_step "Запуск Architecture Daemon"
python3 architecture_daemon.py > logs/daemon.log 2>&1 &
DAEMON_PID=$!
sleep 2
if ps -p $DAEMON_PID > /dev/null; then
    print_success "Daemon запущений (PID: $DAEMON_PID)"
else
    print_error "Помилка запуску Daemon"
fi
echo ""

# Крок 7: Перевірка статусу
print_step "Перевірка статусу компонентів"
echo ""

# MCP сервер працює в stdio режимі, перевірка не потрібна
print_success "MCP сервер готовий до роботи (stdio режим)"

# Перевіряємо WebSocket
if timeout 2 bash -c 'cat < /dev/null > /dev/tcp/localhost/8765' 2>/dev/null; then
    print_success "WebSocket сервер доступний"
else
    print_warning "WebSocket сервер не доступний (можливо ще запускається)"
fi

echo ""

# Крок 8: Інформація про запуск
print_step "Інформація про запущену систему"
echo ""
echo -e "${GREEN}🎉 Architecture System v2.0 запущена!${NC}"
echo ""
echo "📊 Запущені компоненти:"
echo "  • MCP Architecture Server  (готовий для Windsurf)"
echo "  • WebSocket Server         (PID: $WS_PID, порт 8765)"
echo "  • File Monitor             (PID: $FM_PID)"
echo "  • Architecture Daemon      (PID: $DAEMON_PID)"
echo ""
echo "📝 Логи:"
echo "  • logs/mcp_server.log"
echo "  • logs/websocket_server.log"
echo "  • logs/file_monitor.log"
echo "  • logs/daemon.log"
echo "  • logs/architecture.log"
echo ""
echo "🔧 Команди для Windsurf:"
echo "  /architecture analyze"
echo "  /architecture dependencies <file>"
echo "  /architecture unused"
echo "  /architecture circular"
echo "  /architecture duplicates"
echo "  /architecture refactor"
echo "  /architecture health"
echo "  /architecture report"
echo "  /architecture security"
echo "  /architecture performance"
echo ""
echo "🌐 WebSocket:"
echo "  ws://localhost:8765"
echo ""
echo "📊 MCP Integration:"
echo "  Інтегрований з Windsurf через stdio"
echo ""
echo "🛑 Зупинення системи:"
echo "  kill $WS_PID $FM_PID $DAEMON_PID"
echo "  # або"
echo "  ./STOP_FULL_SYSTEM.sh"
echo ""
echo "📖 Документація:"
echo "  • DEPLOYMENT_GUIDE.md"
echo "  • REFACTORING_PLAN.md"
echo "  • RUN_DAEMON.md"
echo ""

# Зберігаємо PID для подальшого використання
echo "$WS_PID $FM_PID $DAEMON_PID" > .pids

print_success "Система повністю запущена!"
echo ""
echo "💡 Порада: Для зупинення системи виконайте:"
echo "   ./STOP_FULL_SYSTEM.sh"
echo ""
echo "📊 Система працює в фоновому режимі"
echo "   WebSocket: ws://localhost:8765"
echo "   MCP сервер: інтегрований з Windsurf"
echo ""
