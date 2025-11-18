#!/bin/bash

################################################################################
#                                                                              #
#                    🚀 CODEMAP ANALYZER - DEPLOY SCRIPT 🚀                  #
#                                                                              #
#  Універсальний скрипт розгортання для Windsurf Cascade                    #
#  - Перевіряє встановлення                                                  #
#  - Встановлює залежності                                                   #
#  - Запускає перший аналіз                                                  #
#  - Налаштовує Windsurf workflows                                           #
#  - Запускає постійне спостереження                                         #
#                                                                              #
################################################################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Configuration
PROJECT_NAME="Codemap Analyzer"
PYTHON_MIN_VERSION="3.8"
VENV_DIR="${SCRIPT_DIR}/.venv"
REPORTS_DIR="${SCRIPT_DIR}/reports"

################################################################################
# Helper Functions
################################################################################

print_header() {
    echo ""
    echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║${NC} $1"
    echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
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
        echo "Встанови Python 3.8+ з https://www.python.org"
        exit 1
    fi
    
    PYTHON_VERSION=$(python3 -c 'import sys; print(".".join(map(str, sys.version_info[:2])))')
    print_success "Python3: $PYTHON_VERSION"
}

check_pip() {
    print_step "Перевіряю pip..."
    
    if ! check_command pip3; then
        print_error "pip3 не встановлено"
        exit 1
    fi
    
    PIP_VERSION=$(pip3 --version | awk '{print $2}')
    print_success "pip3: $PIP_VERSION"
}

check_files() {
    print_step "Перевіряю файли проєкту..."
    
    local required_files=(
        "codemap_analyzer.py"
        "config.yaml"
        "requirements.txt"
    )
    
    for file in "${required_files[@]}"; do
        if [ ! -f "${SCRIPT_DIR}/${file}" ]; then
            print_error "Файл не знайдено: ${file}"
            exit 1
        fi
    done
    
    print_success "Всі необхідні файли присутні"
}

check_workflows() {
    print_step "Перевіряю Windsurf workflows..."
    
    local workflows_dir="${SCRIPT_DIR}/.windsurf/workflows"
    
    if [ ! -d "$workflows_dir" ]; then
        print_error "Папка workflows не знайдена"
        exit 1
    fi
    
    local workflow_count=$(ls -1 "$workflows_dir"/*.md 2>/dev/null | wc -l)
    
    if [ "$workflow_count" -lt 4 ]; then
        print_error "Workflows не знайдені (знайдено: $workflow_count, потрібно: 4)"
        exit 1
    fi
    
    print_success "Workflows готові ($workflow_count файлів)"
}

################################################################################
# Installation
################################################################################

install_dependencies() {
    print_step "Встановлюю залежності Python..."
    
    pip3 install -q -r "${SCRIPT_DIR}/requirements.txt"
    
    if [ $? -eq 0 ]; then
        print_success "Залежності встановлені"
    else
        print_error "Помилка при встановленні залежностей"
        exit 1
    fi
}

verify_dependencies() {
    print_step "Перевіряю залежності..."
    
    python3 -c "import networkx, yaml, jinja2, pathspec" 2>/dev/null
    
    if [ $? -eq 0 ]; then
        print_success "Всі залежності доступні"
    else
        print_error "Деякі залежності не встановлені"
        exit 1
    fi
}

################################################################################
# Analysis
################################################################################

create_reports_dir() {
    print_step "Створюю папку для звітів..."
    
    mkdir -p "$REPORTS_DIR"
    print_success "Папка $REPORTS_DIR готова"
}

run_first_analysis() {
    print_step "Запускаю перший аналіз проєкту..."
    echo ""
    
    cd "$SCRIPT_DIR"
    python3 codemap_analyzer.py --once
    
    if [ $? -eq 0 ]; then
        echo ""
        print_success "Перший аналіз завершено"
    else
        print_error "Помилка при аналізі"
        exit 1
    fi
}

verify_reports() {
    print_step "Перевіряю звіти..."
    
    local required_reports=(
        "CODEMAP_SUMMARY.md"
        "codemap_analysis.json"
        "codemap_analysis.html"
    )
    
    for report in "${required_reports[@]}"; do
        if [ ! -f "${REPORTS_DIR}/${report}" ]; then
            print_error "Звіт не створено: ${report}"
            exit 1
        fi
    done
    
    print_success "Всі звіти створені"
}

################################################################################
# Configuration
################################################################################

setup_windsurf() {
    print_step "Налаштовую Windsurf..."
    
    local settings_file="${SCRIPT_DIR}/.windsurf/settings.json"
    
    if [ -f "$settings_file" ]; then
        print_success "Windsurf налаштування готові"
    else
        print_error "Windsurf налаштування не знайдені"
        exit 1
    fi
}

update_workflows() {
    print_step "Перевіряю версію workflows..."
    
    local workflows_dir="${SCRIPT_DIR}/.windsurf/workflows"
    local version_file="${workflows_dir}/VERSION"
    local current_version="1.0.0"
    
    if [ ! -f "$version_file" ]; then
        print_info "Версія workflows не знайдена, встановлюю..."
        echo "$current_version" > "$version_file"
        print_success "Версія встановлена: $current_version"
        return 0
    fi
    
    local stored_version=$(cat "$version_file")
    
    if [ "$stored_version" != "$current_version" ]; then
        print_info "Знайдена стара версія workflows: $stored_version"
        print_info "Оновлюю до: $current_version"
        
        # Backup old workflows
        local backup_dir="${workflows_dir}/.backup_v${stored_version}_$(date +%Y%m%d_%H%M%S)"
        mkdir -p "$backup_dir"
        
        cp "${workflows_dir}"/*.md "$backup_dir/" 2>/dev/null || true
        
        print_success "Старі workflows збережені в: $backup_dir"
        
        # Update version
        echo "$current_version" > "$version_file"
        print_success "Workflows оновлені до версії: $current_version"
    else
        print_success "Workflows актуальні (версія $current_version)"
    fi
}

setup_precommit() {
    print_step "Налаштовую pre-commit hook..."
    
    if check_command pre-commit; then
        cd "$SCRIPT_DIR"
        pre-commit install 2>/dev/null || true
        print_success "Pre-commit hook встановлено"
    else
        print_info "pre-commit не встановлено (опціонально)"
    fi
}

################################################################################
# Watch Mode
################################################################################

backup_reports() {
    print_step "Резервне копіювання попередніх звітів..."
    
    if [ -d "$REPORTS_DIR" ] && [ -f "${REPORTS_DIR}/CODEMAP_SUMMARY.md" ]; then
        local backup_dir="${REPORTS_DIR}/.backup/$(date +%Y%m%d_%H%M%S)"
        mkdir -p "$backup_dir"
        
        cp "${REPORTS_DIR}"/*.md "$backup_dir/" 2>/dev/null || true
        cp "${REPORTS_DIR}"/*.json "$backup_dir/" 2>/dev/null || true
        cp "${REPORTS_DIR}"/*.html "$backup_dir/" 2>/dev/null || true
        
        print_success "Резервна копія збережена в: $backup_dir"
    fi
}

start_mcp_server() {
    print_step "Запускаю MCP сервер для Cascade..."
    
    cd "$SCRIPT_DIR"
    python3 mcp_codemap_server.py --project "$SCRIPT_DIR" --mode stdio > /dev/null 2>&1 &
    MCP_PID=$!
    
    # Save PID for later
    echo "$MCP_PID" > "${SCRIPT_DIR}/.mcp_server.pid"
    
    print_success "MCP сервер запущено (PID: $MCP_PID)"
}

start_watch_mode() {
    print_header "🎉 РОЗГОРТАННЯ ЗАВЕРШЕНО!"
    
    echo -e "${GREEN}Система готова до роботи!${NC}"
    echo ""
    echo "📊 Звіти створені в: ${REPORTS_DIR}/"
    echo "  - CODEMAP_SUMMARY.md (для Cascade)"
    echo "  - codemap_analysis.json (повні дані)"
    echo "  - codemap_analysis.html (HTML звіт)"
    echo ""
    echo "🪟 Windsurf workflows готові:"
    echo "  - /update-codemap (оновити карту)"
    echo "  - /analyze-dead-code (мертвий код)"
    echo "  - /detect-cycles (циклічні залежності)"
    echo "  - /refactor-with-context (рефакторинг)"
    echo ""
    echo "🤖 MCP Сервер активний:"
    echo "  - Автоматична синхронізація з Cascade"
    echo "  - Реальний час доступ до аналізу"
    echo "  - Pre-task контекст перед кожним завданням"
    echo ""
    echo "💡 Порада: Використовуй в Windsurf:"
    echo "   Ctrl+L → /update-codemap"
    echo ""
    echo "🔄 Запускаю постійне спостереження..."
    echo "   (Звіти будуть оновлюватися при кожній зміні коду)"
    echo ""
    echo "Щоб зупинити: Ctrl+C"
    echo ""
    
    # Start watch mode
    cd "$SCRIPT_DIR"
    python3 codemap_analyzer.py --watch
}

################################################################################
# Status Check
################################################################################

check_status() {
    print_header "📊 ПЕРЕВІРКА СТАТУСУ"
    
    # Check if already deployed
    if [ -f "${REPORTS_DIR}/CODEMAP_SUMMARY.md" ] && \
       [ -f "${REPORTS_DIR}/codemap_analysis.json" ] && \
       [ -f "${REPORTS_DIR}/codemap_analysis.html" ]; then
        print_success "Система вже розгорнута"
        
        # Show summary
        echo ""
        print_info "Останній аналіз:"
        head -5 "${REPORTS_DIR}/CODEMAP_SUMMARY.md" | tail -1
        
        echo ""
        print_info "Запускаю MCP сервер та постійне спостереження..."
        echo ""
        
        # Start MCP server
        start_mcp_server
        
        return 0
    fi
    
    return 1
}

################################################################################
# Main
################################################################################

main() {
    print_header "🚀 $PROJECT_NAME - РОЗГОРТАННЯ"
    
    # Check status
    if check_status; then
        start_watch_mode
        return 0
    fi
    
    # Full deployment
    print_header "📋 КРОК 1: ПЕРЕВІРКИ"
    check_python
    check_pip
    check_files
    check_workflows
    
    print_header "📦 КРОК 2: ВСТАНОВЛЕННЯ"
    install_dependencies
    verify_dependencies
    
    print_header "⚙️ КРОК 3: НАЛАШТУВАННЯ"
    create_reports_dir
    update_workflows
    setup_windsurf
    setup_precommit
    
    print_header "🔍 КРОК 4: ПЕРШИЙ АНАЛІЗ"
    run_first_analysis
    verify_reports
    
    # Backup reports before watch mode
    backup_reports
    
    print_header "🤖 КРОК 5: MCP СЕРВЕР"
    start_mcp_server
    
    # Start watch mode
    start_watch_mode
}

# Run main
main "$@"
