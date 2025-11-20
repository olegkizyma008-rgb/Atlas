#!/bin/bash

# Handle interruption gracefully
trap 'echo ""; print_info "Отримано сигнал завершення..."; cleanup; exit 0' INT TERM

set -euo pipefail

################################################################################
#                                                                              #
#              🚀 ADVANCED CODEMAP SYSTEM - DEPLOY SCRIPT 🚀                 #
#                                                                              #
#  Розширена система з:                                                       #
#  - 5-шаровим безперервним аналізатором                                     #
#  - 13 потужними MCP інструментами (6 базових + 7 advanced)                #
#  - Автоматичним режимом роботи                                            #
#  - Пошаровим проходженням коду                                            #
#  - Реальним часом доступом для Windsurf Cascade                           #
#                                                                              #
################################################################################

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Configuration
PROJECT_NAME="Advanced Codemap System v2.0"
REPORTS_DIR="${PROJECT_ROOT}/reports"
LOGS_DIR="${SCRIPT_DIR}/logs"

################################################################################
# Helper Functions
################################################################################

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

print_layer() {
    echo -e "${CYAN}📊${NC} $1"
}

check_command() {
    if ! command -v "$1" &> /dev/null; then
        return 1
    fi
    return 0
}

################################################################################
# Checks
################################################################################

check_python() {
    print_step "Перевіряю Python..."
    
    if ! check_command python3; then
        print_error "Python3 не встановлено"
        exit 1
    fi
    
    PYTHON_VERSION=$(python3 -c 'import sys; print(".".join(map(str, sys.version_info[:2])))')
    print_success "Python3: $PYTHON_VERSION"
}

check_files() {
    print_step "Перевіряю файли Advanced системи..."
    
    local required_files=(
        "mcp_enhanced_analyzer.py"
        "mcp_enhanced_server.py"
        "mcp_advanced_tools.py"
    )
    
    for file in "${required_files[@]}"; do
        if [ ! -f "${SCRIPT_DIR}/$file" ]; then
            print_error "Відсутній файл: $file"
            exit 1
        fi
    done
    
    print_success "Всі файли Advanced системи присутні"
}

################################################################################
# Installation
################################################################################

install_dependencies() {
    print_step "Встановлюю залежності Python..."
    
    pip3 install -q networkx pyyaml 2>/dev/null || true
    
    print_success "Залежності готові"
}

################################################################################
# Setup
################################################################################

create_directories() {
    print_step "Створюю необхідні директорії..."
    
    mkdir -p "$REPORTS_DIR"
    mkdir -p "$LOGS_DIR"
    
    print_success "Директорії готові"
}

################################################################################
# Advanced System
################################################################################

start_enhanced_analyzer() {
    print_header "🔄 ЗАПУСК ENHANCED ANALYZER (5 ШАРІВ)"
    
    print_layer "Шар 1: Виявлення мертвих файлів"
    print_layer "Шар 2: Виявлення мертвих функцій"
    print_layer "Шар 3: Побудова графу залежностей"
    print_layer "Шар 4: Виявлення циклів і ізоляції"
    print_layer "Шар 5: Аналіз якості і дублікатів"
    echo ""
    
    print_step "Запускаю аналізатор (безперервний режим, кожні 2 хвилини)..."
    
    cd "$SCRIPT_DIR"
    
    # Start analyzer in background
    python3 mcp_enhanced_analyzer.py > "$LOGS_DIR/analyzer.log" 2>&1 &
    ANALYZER_PID=$!
    
    # Save PID
    echo "$ANALYZER_PID" > "${SCRIPT_DIR}/.analyzer.pid"
    
    print_success "Enhanced Analyzer запущено (PID: $ANALYZER_PID)"
    print_info "Логи: $LOGS_DIR/analyzer.log"
}

start_mcp_server() {
    print_header "🌐 ЗАПУСК MCP СЕРВЕРА (13 ІНСТРУМЕНТІВ)"
    
    print_info "6 базових інструментів:"
    echo "  - get_layer_analysis(layer: 1-5)"
    echo "  - get_dead_code_summary()"
    echo "  - get_dependency_relationships(file_path)"
    echo "  - get_circular_dependencies()"
    echo "  - get_quality_report(file_path?)"
    echo "  - get_analysis_status()"
    echo ""
    
    print_info "7 advanced інструментів:"
    echo "  - analyze_file_deeply(file_path)"
    echo "  - compare_functions(file1, func1, file2, func2)"
    echo "  - find_duplicates_in_directory(directory)"
    echo "  - analyze_impact(file_path)"
    echo "  - classify_files(directory?)"
    echo "  - generate_refactoring_plan(priority)"
    echo "  - visualize_dependencies(file_path, depth)"
    echo ""
    
    print_step "Запускаю MCP сервер..."
    
    cd "$SCRIPT_DIR"
    
    # Start MCP server in background
    python3 mcp_enhanced_server.py > "$LOGS_DIR/server.log" 2>&1 &
    SERVER_PID=$!
    
    # Save PID
    echo "$SERVER_PID" > "${SCRIPT_DIR}/.server.pid"
    
    print_success "MCP Сервер запущено (PID: $SERVER_PID)"
    print_info "Логи: $LOGS_DIR/server.log"
}

wait_for_first_cycle() {
    print_header "⏳ ОЧІКУВАННЯ ПЕРШОГО ЦИКЛУ АНАЛІЗУ"
    
    print_info "Аналізатор виконує перший цикл (30-60 секунд)..."
    print_info "Шари проходяться послідовно, без поспіху..."
    echo ""
    
    # Wait for first report
    local max_wait=120
    local elapsed=0
    
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
            
            return 0
        fi
        
        sleep 5
        elapsed=$((elapsed + 5))
        printf "."
    done
    
    echo ""
    print_info "Перший цикл ще обробляється, але система вже готова до запитів..."
}

show_windsurf_instructions() {
    print_header "🎯 ВИКОРИСТАННЯ В WINDSURF CASCADE"
    
    echo "Використовуйте ці команди в Cascade для аналізу:"
    echo ""
    
    echo -e "${CYAN}Класифікація всіх файлів:${NC}"
    echo "  @cascade classify_files(directory: \"orchestrator\")"
    echo ""
    
    echo -e "${CYAN}Глибокий аналіз файлу:${NC}"
    echo "  @cascade analyze_file_deeply(file_path: \"orchestrator/app.js\")"
    echo ""
    
    echo -e "${CYAN}Аналіз впливу змін:${NC}"
    echo "  @cascade analyze_impact(file_path: \"orchestrator/core/di-container.js\")"
    echo ""
    
    echo -e "${CYAN}План рефакторингу:${NC}"
    echo "  @cascade generate_refactoring_plan(priority: \"high\")"
    echo ""
    
    echo -e "${CYAN}Знайти дублікати:${NC}"
    echo "  @cascade find_duplicates_in_directory(directory: \"orchestrator/workflow\")"
    echo ""
    
    echo -e "${CYAN}Порівняти функції:${NC}"
    echo "  @cascade compare_functions(file1: \"...\", func1: \"...\", file2: \"...\", func2: \"...\")"
    echo ""
    
    echo -e "${CYAN}Візуалізація залежностей:${NC}"
    echo "  @cascade visualize_dependencies(file_path: \"orchestrator/app.js\", depth: 2)"
    echo ""
}

show_status() {
    print_header "📊 СТАТУС СИСТЕМИ"
    
    echo -e "${GREEN}✅ Advanced Codemap System v2.0 активна${NC}"
    echo ""
    
    echo "🔄 Компоненти:"
    if [ -f "${SCRIPT_DIR}/.analyzer.pid" ]; then
        local analyzer_pid=$(cat "${SCRIPT_DIR}/.analyzer.pid")
        if kill -0 "$analyzer_pid" 2>/dev/null; then
            echo -e "  ${GREEN}✅${NC} Enhanced Analyzer (PID: $analyzer_pid)"
        else
            echo -e "  ${RED}❌${NC} Enhanced Analyzer (не запущено)"
        fi
    fi
    
    if [ -f "${SCRIPT_DIR}/.server.pid" ]; then
        local server_pid=$(cat "${SCRIPT_DIR}/.server.pid")
        if kill -0 "$server_pid" 2>/dev/null; then
            echo -e "  ${GREEN}✅${NC} MCP Сервер (PID: $server_pid)"
        else
            echo -e "  ${RED}❌${NC} MCP Сервер (не запущено)"
        fi
    fi
    
    echo ""
    echo "📂 Звіти: $REPORTS_DIR/"
    echo "📝 Логи: $LOGS_DIR/"
    echo ""
    
    if [ -f "$REPORTS_DIR/enhanced_analysis_state.json" ]; then
        echo "📊 Останній аналіз:"
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
        print(f"  Мертвих функцій: {sum(len(v) for v in state.get('dead_functions', {}).values())}")
except:
    print("  (дані ще обробляються)")
EOF
    fi
    
    echo ""
}

cleanup() {
    print_info "Завершую роботу Advanced системи..."
    
    # Stop analyzer
    if [ -f "${SCRIPT_DIR}/.analyzer.pid" ]; then
        local analyzer_pid=$(cat "${SCRIPT_DIR}/.analyzer.pid")
        if kill -0 "$analyzer_pid" 2>/dev/null; then
            kill "$analyzer_pid" 2>/dev/null || true
            print_info "Enhanced Analyzer зупинено"
        fi
        rm -f "${SCRIPT_DIR}/.analyzer.pid"
    fi
    
    # Stop MCP server
    if [ -f "${SCRIPT_DIR}/.server.pid" ]; then
        local server_pid=$(cat "${SCRIPT_DIR}/.server.pid")
        if kill -0 "$server_pid" 2>/dev/null; then
            kill "$server_pid" 2>/dev/null || true
            print_info "MCP Сервер зупинено"
        fi
        rm -f "${SCRIPT_DIR}/.server.pid"
    fi
    
    print_success "Система завершила роботу"
}

################################################################################
# Main
################################################################################

main() {
    print_header "$PROJECT_NAME - РОЗГОРТАННЯ"
    
    # Checks
    print_header "📋 КРОК 1: ПЕРЕВІРКИ"
    check_python
    check_files
    
    # Installation
    print_header "📦 КРОК 2: ВСТАНОВЛЕННЯ"
    install_dependencies
    
    # Setup
    print_header "⚙️ КРОК 3: НАЛАШТУВАННЯ"
    create_directories
    
    # Start Advanced System
    print_header "🚀 КРОК 4: ЗАПУСК ADVANCED СИСТЕМИ"
    start_enhanced_analyzer
    sleep 2
    start_mcp_server
    
    # Wait for first cycle
    print_header "⏳ КРОК 5: ПЕРШИЙ ЦИКЛ АНАЛІЗУ"
    wait_for_first_cycle
    
    # Show instructions
    show_windsurf_instructions
    
    # Show status
    show_status
    
    # Keep running
    print_header "🎉 СИСТЕМА ГОТОВА!"
    echo "Advanced Codemap System v2.0 запущена в автоматичному режимі"
    echo ""
    echo "🔄 Аналізатор працює безперервно (кожні 2 хвилини)"
    echo "📊 Всі 5 шарів проходяться послідовно, без поспіху"
    echo "🌐 MCP Сервер доступний для Windsurf Cascade"
    echo "📝 Всі звіти оновлюються автоматично"
    echo ""
    echo "Щоб зупинити: Ctrl+C"
    echo ""
    
    # Keep process alive
    while true; do
        sleep 60
        
        # Check if processes are still running
        if [ -f "${SCRIPT_DIR}/.analyzer.pid" ]; then
            local analyzer_pid=$(cat "${SCRIPT_DIR}/.analyzer.pid")
            if ! kill -0 "$analyzer_pid" 2>/dev/null; then
                print_error "Enhanced Analyzer зупинився, перезапускаю..."
                start_enhanced_analyzer
            fi
        fi
        
        if [ -f "${SCRIPT_DIR}/.server.pid" ]; then
            local server_pid=$(cat "${SCRIPT_DIR}/.server.pid")
            if ! kill -0 "$server_pid" 2>/dev/null; then
                print_error "MCP Сервер зупинився, перезапускаю..."
                start_mcp_server
            fi
        fi
    done
}

trap cleanup INT TERM

# Run main
main "$@"
