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
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
REPORTS_DIR="${PROJECT_ROOT}/reports"
LOGS_DIR="${SCRIPT_DIR}/logs"

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

print_power() {
    echo -e "${CYAN}⚡${NC} $1"
}

# Cleanup function
cleanup() {
    echo ""
    print_info "Завершую роботу..."
    
    # Kill all processes
    pkill -f "mcp_enhanced_analyzer" 2>/dev/null || true
    pkill -f "mcp_server_daemon" 2>/dev/null || true
    pkill -f "mcp_enhanced_server" 2>/dev/null || true
    
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
pkill -f "mcp_enhanced_analyzer" 2>/dev/null || true
pkill -f "mcp_enhanced_server" 2>/dev/null || true
sleep 1
print_success "Очищено"

# ============================================================================
# LAUNCH ENHANCED ANALYZER
# ============================================================================

print_header "🔄 ЗАПУСК ENHANCED ANALYZER (5 ШАРІВ)"

print_power "Шар 1: Виявлення мертвих файлів"
print_power "Шар 2: Виявлення мертвих функцій"
print_power "Шар 3: Побудова графу залежностей"
print_power "Шар 4: Виявлення циклів і ізоляції"
print_power "Шар 5: Аналіз якості і дублікатів"
echo ""

print_step "Запускаю Enhanced Analyzer (безперервний режим)..."
cd "$SCRIPT_DIR"

nohup python3 mcp_enhanced_analyzer.py > "$LOGS_DIR/analyzer.log" 2>&1 &
ANALYZER_PID=$!

# Wait for analyzer to start
sleep 2

if kill -0 "$ANALYZER_PID" 2>/dev/null; then
    print_success "Enhanced Analyzer запущено (PID: $ANALYZER_PID)"
    print_info "Логи: $LOGS_DIR/analyzer.log"
else
    print_error "Помилка при запуску Enhanced Analyzer"
    exit 1
fi

# ============================================================================
# LAUNCH MCP SERVER
# ============================================================================

print_header "🌐 ЗАПУСК MCP СЕРВЕРА (16 ІНСТРУМЕНТІВ)"

print_power "6 базових інструментів"
print_power "7 advanced інструментів"
print_power "3 power tools (гіпер-інструменти)"
echo ""

print_step "Запускаю MCP Server Daemon..."

# MCP Server Daemon запускається як постійний сервіс
nohup python3 mcp_server_daemon.py > "$LOGS_DIR/mcp_daemon.log" 2>&1 &
SERVER_PID=$!

# Wait for daemon to start
sleep 2

# Check if process started
if kill -0 "$SERVER_PID" 2>/dev/null; then
    print_success "MCP Server Daemon запущено (PID: $SERVER_PID)"
    print_info "Логи: $LOGS_DIR/mcp_daemon.log"
    print_info "✅ MCP готовий для Windsurf"
else
    print_error "Помилка при запуску MCP Server Daemon"
    tail -10 "$LOGS_DIR/mcp_daemon.log"
    exit 1
fi

# ============================================================================
# WAIT FOR FIRST CYCLE
# ============================================================================

print_header "⏳ ОЧІКУВАННЯ ПЕРШОГО ЦИКЛУ АНАЛІЗУ"

print_info "Аналізатор виконує перший цикл (30-60 секунд)..."
print_info "Всі 5 шарів проходяться послідовно..."
echo ""

# Wait for first report
max_wait=120
elapsed=0

while [ $elapsed -lt $max_wait ]; do
    if [ -f "$REPORTS_DIR/enhanced_analysis_state.json" ]; then
        print_success "Перший цикл завершено!"
        
        # Show summary
        python3 << 'EOF'
import json
from pathlib import Path

try:
    state_file = Path("$REPORTS_DIR/enhanced_analysis_state.json")
    if state_file.exists():
        with open(state_file, 'r') as f:
            state = json.load(f)
        
        print(f"📊 Цикл: {state.get('cycle', 0)}")
        print(f"📁 Мертвих файлів: {len(state.get('dead_files', []))}")
        print(f"🔴 Мертвих функцій: {sum(len(v) for v in state.get('dead_functions', {}).values())}")
        print(f"🔗 Вузлів графу: {len(state.get('dependency_graph', {}))}")
        print(f"⚠️ Циклів: {len(state.get('cycles', []))}")
except:
    pass
EOF
        
        break
    fi
    
    sleep 5
    elapsed=$((elapsed + 5))
    printf "."
done

echo ""

# ============================================================================
# SHOW WINDSURF INSTRUCTIONS
# ============================================================================

print_header "🎯 ВИКОРИСТАННЯ В WINDSURF CASCADE"

echo "Використовуйте ці команди для аналізу:"
echo ""

echo -e "${CYAN}Миттєва оцінка:${NC}"
echo "  @cascade get_quick_assessment(directory: \"orchestrator\")"
echo ""

echo -e "${CYAN}Дискваліфікація проблем:${NC}"
echo "  @cascade get_disqualification_report(directory: \"orchestrator\")"
echo ""

echo -e "${CYAN}Статус файлу:${NC}"
echo "  @cascade get_editor_quick_view(file_path: \"orchestrator/app.js\")"
echo ""

echo -e "${CYAN}Глибокий аналіз:${NC}"
echo "  @cascade analyze_file_deeply(file_path: \"orchestrator/app.js\")"
echo ""

echo -e "${CYAN}План рефакторингу:${NC}"
echo "  @cascade generate_refactoring_plan(priority: \"high\")"
echo ""

# ============================================================================
# SHOW STATUS
# ============================================================================

print_header "📊 СТАТУС СИСТЕМИ"

echo -e "${GREEN}✅ Hyper-Power System активна${NC}"
echo ""

echo "🔄 Компоненти:"
echo -e "  ${GREEN}✅${NC} Enhanced Analyzer (PID: $ANALYZER_PID)"
echo -e "  ${GREEN}✅${NC} MCP Server (PID: $SERVER_PID)"
echo -e "  ${GREEN}✅${NC} Power Tools (3 гіпер-інструменти)"
echo ""

echo "📂 Звіти: $REPORTS_DIR/"
echo "📝 Логи: $LOGS_DIR/"
echo ""

echo "📊 Останній аналіз:"
if [ -f "$REPORTS_DIR/enhanced_analysis_state.json" ]; then
    python3 << 'EOF'
import json
from pathlib import Path

try:
    state_file = Path("$REPORTS_DIR/enhanced_analysis_state.json")
    if state_file.exists():
        with open(state_file, 'r') as f:
            state = json.load(f)
        
        print(f"  Цикл: {state.get('cycle', 0)}")
        print(f"  Час: {state.get('timestamp', 'N/A')}")
        print(f"  Мертвих файлів: {len(state.get('dead_files', []))}")
except:
    print("  (дані ще обробляються)")
EOF
fi

echo ""

# ============================================================================
# KEEP RUNNING
# ============================================================================

print_header "🎉 СИСТЕМА ГОТОВА!"

echo "Hyper-Power System запущена на ПОВНУ потужність"
echo ""

echo "🔄 Аналізатор працює безперервно (кожну хвилину)"
echo "📊 Всі 5 шарів проходяться послідовно"
echo "🌐 MCP Server доступний для Windsurf Cascade"
echo "⚡ 16 інструментів готові до використання"
echo "📝 Всі звіти оновлюються автоматично"
echo ""

echo "Щоб зупинити: Ctrl+C"
echo ""

# Keep process alive and monitor
while true; do
    sleep 60
    
    # Check if Analyzer is still running
    if ! kill -0 "$ANALYZER_PID" 2>/dev/null; then
        print_error "Enhanced Analyzer зупинився, перезапускаю..."
        nohup python3 mcp_enhanced_analyzer.py > "$LOGS_DIR/analyzer.log" 2>&1 &
        ANALYZER_PID=$!
        print_success "Enhanced Analyzer перезапущено (PID: $ANALYZER_PID)"
    fi
    
    # MCP Server може завершитися після ініціалізації - це нормально
    # Не намагаємося його перезапускати постійно
    # Він буде запущено Windsurf при необхідності
done
