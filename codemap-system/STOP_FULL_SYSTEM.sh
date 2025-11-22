#!/bin/bash

# 🛑 Architecture System v2.0 - Stop Script
# Зупиняє всю систему

# Переходимо в папку скрипту
cd "$(dirname "$0")"

echo "🛑 Architecture System v2.0 - Stopping"
echo "======================================"
echo ""

# Кольори
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_step() {
    echo -e "${BLUE}▶ $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Читаємо PID з файлу
if [ -f ".pids" ]; then
    read MCP_PID WS_PID FM_PID DAEMON_PID < .pids
    
    print_step "Зупинення компонентів"
    echo ""
    
    # Зупиняємо MCP
    if [ ! -z "$MCP_PID" ] && ps -p $MCP_PID > /dev/null 2>&1; then
        kill $MCP_PID 2>/dev/null
        sleep 1
        if ! ps -p $MCP_PID > /dev/null 2>&1; then
            print_success "MCP сервер зупинений (PID: $MCP_PID)"
        else
            kill -9 $MCP_PID 2>/dev/null
            print_success "MCP сервер примусово зупинений (PID: $MCP_PID)"
        fi
    fi
    
    # Зупиняємо WebSocket
    if [ ! -z "$WS_PID" ] && ps -p $WS_PID > /dev/null 2>&1; then
        kill $WS_PID 2>/dev/null
        sleep 1
        if ! ps -p $WS_PID > /dev/null 2>&1; then
            print_success "WebSocket сервер зупинений (PID: $WS_PID)"
        else
            kill -9 $WS_PID 2>/dev/null
            print_success "WebSocket сервер примусово зупинений (PID: $WS_PID)"
        fi
    fi
    
    # Зупиняємо File Monitor
    if [ ! -z "$FM_PID" ] && ps -p $FM_PID > /dev/null 2>&1; then
        kill $FM_PID 2>/dev/null
        sleep 1
        if ! ps -p $FM_PID > /dev/null 2>&1; then
            print_success "File Monitor зупинений (PID: $FM_PID)"
        else
            kill -9 $FM_PID 2>/dev/null
            print_success "File Monitor примусово зупинений (PID: $FM_PID)"
        fi
    fi
    
    # Зупиняємо Daemon
    if [ ! -z "$DAEMON_PID" ] && ps -p $DAEMON_PID > /dev/null 2>&1; then
        kill $DAEMON_PID 2>/dev/null
        sleep 1
        if ! ps -p $DAEMON_PID > /dev/null 2>&1; then
            print_success "Daemon зупинений (PID: $DAEMON_PID)"
        else
            kill -9 $DAEMON_PID 2>/dev/null
            print_success "Daemon примусово зупинений (PID: $DAEMON_PID)"
        fi
    fi
    
    # Видаляємо файл з PID
    rm .pids
    print_success "Файл .pids видалений"
    
else
    print_step "Зупинення всіх процесів Architecture System"
    echo ""
    
    # Зупиняємо всі процеси
    pkill -f 'architecture_daemon' 2>/dev/null && print_success "Architecture Daemon зупинений" || true
    pkill -f 'mcp_architecture_server' 2>/dev/null && print_success "MCP сервер зупинений" || true
    pkill -f 'websocket_server' 2>/dev/null && print_success "WebSocket сервер зупинений" || true
    pkill -f 'file_monitor' 2>/dev/null && print_success "File Monitor зупинений" || true
fi

echo ""

# Перевіряємо, чи всі процеси зупинені
print_step "Перевірка статусу"
echo ""

if pgrep -f 'architecture_daemon' > /dev/null 2>&1; then
    print_error "Architecture Daemon ще запущений"
else
    print_success "Architecture Daemon зупинений"
fi

if pgrep -f 'mcp_architecture_server' > /dev/null 2>&1; then
    print_error "MCP сервер ще запущений"
else
    print_success "MCP сервер зупинений"
fi

if pgrep -f 'websocket_server' > /dev/null 2>&1; then
    print_error "WebSocket сервер ще запущений"
else
    print_success "WebSocket сервер зупинений"
fi

echo ""
print_success "Architecture System v2.0 повністю зупинена!"
echo ""
