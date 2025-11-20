#!/bin/bash

################################################################################
#                                                                              #
#           🔥 LAUNCH FULL POWER – HYPER-POWER SYSTEM 🔥                     #
#                                                                              #
#  Запускає систему на ПОВНУ потужність:                                     #
#  - Enhanced Analyzer (5 шарів, безперервна робота)                         #
#  - MCP Server (16 інструментів)                                            #
#  - Power Tools (3 гіпер-інструменти)                                       #
#  - Постійний шаровий аналіз                                                #
#                                                                              #
################################################################################

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Paths
CODEMAP_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )/.." && pwd )"
REPORTS_DIR="${CODEMAP_DIR}/../reports"
LOGS_DIR="${CODEMAP_DIR}/logs"

# Helper functions
print_header() {
    echo ""
    echo -e "${CYAN}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║${NC} $1"
    echo -e "${CYAN}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

print_step() {
    echo -e "${YELLOW}▶${NC} $1"
}

print_success() {
    echo -e "${GREEN}✅${NC} $1"
}

print_error() {
    echo -e "${RED}❌${NC} $1"
}

print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

# Cleanup function
cleanup() {
    echo ""
    print_info "Завершую роботу..."
    pkill -f "mcp_enhanced_analyzer.py" 2>/dev/null || true
    pkill -f "mcp_enhanced_server.py" 2>/dev/null || true
    print_success "Система зупинена"
    exit 0
}

trap cleanup INT TERM

# ============================================================================
# MAIN
# ============================================================================

print_header "🔥 HYPER-POWER SYSTEM – FULL LAUNCH"

# Create directories
print_step "Створюю директорії..."
mkdir -p "$REPORTS_DIR"
mkdir -p "$LOGS_DIR"
print_success "Директорії готові"

# Kill any existing processes
print_step "Очищаю старі процеси..."
pkill -f "mcp_enhanced_analyzer.py" 2>/dev/null || true
pkill -f "mcp_enhanced_server.py" 2>/dev/null || true
sleep 1
print_success "Очищено"

# ============================================================================
# LAUNCH ENHANCED ANALYZER
# ============================================================================

print_header "🔄 ЗАПУСК ENHANCED ANALYZER (5 ШАРІВ)"

print_step "Запускаю Enhanced Analyzer (безперервний режим)..."
cd "$CODEMAP_DIR" # Change to the correct directory

nohup /usr/bin/env python3 mcp_enhanced_analyzer.py > "$LOGS_DIR/analyzer.log" 2>&1 &
ANALYZER_PID=$!

sleep 2

if kill -0 "$ANALYZER_PID" 2>/dev/null; then
    print_success "Enhanced Analyzer запущено (PID: $ANALYZER_PID)"
    print_info "Логи: $LOGS_DIR/analyzer.log"
else
    print_error "Помилка при запуску Enhanced Analyzer"
    echo "Останні 10 рядків логу ($LOGS_DIR/analyzer.log):"
    tail -10 "$LOGS_DIR/analyzer.log"
    exit 1
fi

# ============================================================================
# LAUNCH MCP SERVER
# ============================================================================

print_header "🌐 ЗАПУСК MCP СЕРВЕРА (16 ІНСТРУМЕНТІВ)"

print_step "Запускаю MCP Server Daemon..."
cd "$CODEMAP_DIR" # Ensure correct directory

nohup /usr/bin/env python3 mcp_enhanced_server.py > "$LOGS_DIR/mcp_server.log" 2>&1 &
SERVER_PID=$!

sleep 2

if kill -0 "$SERVER_PID" 2>/dev/null; then
    print_success "MCP Server Daemon запущено (PID: $SERVER_PID)"
    print_info "Логи: $LOGS_DIR/mcp_server.log"
else
    print_error "Помилка при запуску MCP Server Daemon"
    echo "Останні 10 рядків логу ($LOGS_DIR/mcp_server.log):"
    tail -10 "$LOGS_DIR/mcp_server.log"
    exit 1
fi

# ============================================================================
# WAIT FOR FIRST CYCLE
# ============================================================================

print_header "⏳ ОЧІКУВАННЯ ПЕРШОГО ЦИКЛУ АНАЛІЗУ"

print_info "Аналізатор виконує перший цикл (30-60 секунд)..."
print_info "Всі 5 шарів проходяться послідовно..."
echo ""

max_wait=120
elapsed=0
while [ $elapsed -lt $max_wait ]; do
    if [ -f "$REPORTS_DIR/enhanced_analysis_state.json" ]; then
        print_success "Перший цикл завершено!"
        break
    fi
    sleep 5
    elapsed=$((elapsed + 5))
    printf "."
done

echo ""

# ============================================================================
# SHOW STATUS & INSTRUCTIONS
# ============================================================================

print_header "📊 СТАТУС ТА ІНСТРУКЦІЇ"

echo -e "${GREEN}✅ Hyper-Power System активна${NC}"
echo ""
echo "🔄 Компоненти:"
echo -e "  ${GREEN}✅${NC} Enhanced Analyzer (PID: $ANALYZER_PID)"
echo -e "  ${GREEN}✅${NC} MCP Server (PID: $SERVER_PID)"
echo ""
echo "📂 Звіти: $REPORTS_DIR/"
echo "📝 Логи: $LOGS_DIR/"
echo ""
echo "🎯 Тепер ви можете використовувати інструменти @cascade в Windsurf."
echo ""

# ============================================================================
# KEEP RUNNING
# ============================================================================

print_header "🎉 СИСТЕМА ГОТОВА!"
echo "Щоб зупинити: Ctrl+C"
echo ""

# Keep process alive and monitor
while true; do
    if ! kill -0 "$ANALYZER_PID" 2>/dev/null; then
        print_error "Enhanced Analyzer зупинився, перезапускаю..."
        cd "$CODEMAP_DIR"
        nohup /usr/bin/env python3 mcp_enhanced_analyzer.py > "$LOGS_DIR/analyzer.log" 2>&1 &
        ANALYZER_PID=$!
        print_success "Enhanced Analyzer перезапущено (PID: $ANALYZER_PID)"
    fi
    if ! kill -0 "$SERVER_PID" 2>/dev/null; then
        print_error "MCP Server зупинився, перезапускаю..."
        cd "$CODEMAP_DIR"
        nohup /usr/bin/env python3 mcp_enhanced_server.py > "$LOGS_DIR/mcp_server.log" 2>&1 &
        SERVER_PID=$!
        print_success "MCP Server перезапущено (PID: $SERVER_PID)"
    fi
    sleep 60
done
