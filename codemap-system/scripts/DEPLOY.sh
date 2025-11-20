#!/bin/bash

# Handle interruption gracefully
trap 'echo ""; print_info "Отримано сигнал завершення..."; exit 0' INT TERM

set -euo pipefail

################################################################################
#                                                                              #
#              🚀 ADVANCED CODEMAP SYSTEM - DEPLOY SCRIPT 🚀                 #
#                                                                              #
#  Розширена система з 5-шаровим аналізатором і 13 MCP інструментами        #
#  - Запускає Enhanced Analyzer (безперервний, 5 шарів)                      #
#  - Запускає MCP Сервер (6 базових + 7 advanced інструментів)              #
#  - Автоматичний режим роботи                                              #
#  - Пошаровий аналіз без поспіху                                           #
#  - Реальний час доступ для Windsurf Cascade                               #
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
CONFIG_FILE="${SCRIPT_DIR}/config.yaml"

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
    
    # Check config file
    if [ ! -f "$CONFIG_FILE" ]; then
        print_error "Файл конфігурації не знайдено: $CONFIG_FILE"
        exit 1
    fi
    
    # Validate YAML syntax
    if command -v python3 &> /dev/null; then
        python3 << EOF
import yaml
import sys
try:
    with open("$CONFIG_FILE", 'r') as f:
        config = yaml.safe_load(f)
    print("✅ Конфігурація валідна")
    
    # Check key sections
    required_sections = ['project', 'analysis', 'output', 'dead_code_rules', 'dependency_rules']
    for section in required_sections:
        if section not in config:
            print(f"⚠️ Відсутня секція: {section}")
        else:
            print(f"✅ Секція {section}: знайдено")
    
    # Extract key settings
    analysis = config.get('analysis', {})
    output = config.get('output', {})
    
    print(f"📊 Шлях до звітів: {output.get('reports_dir', 'reports')}")
    print(f"🔄 Auto-update: {output.get('auto_update', false)}")
    print(f"⏱️ Watch interval: {output.get('watch_interval', 5)} сек")
    
    print(f"📁 Include paths: {len(analysis.get('include_paths', []))}")
    print(f"📁 Exclude paths: {len(analysis.get('exclude_paths', []))}")
    print(f"📄 File extensions: {len(analysis.get('file_extensions', []))}")
    
except Exception as e:
    print(f"❌ Помилка конфігурації: {e}")
    sys.exit(1)
EOF
    fi
    
    # Check required Python files
    local required_files=("codemap_analyzer.py" "mcp_codemap_server.py")
    for file in "${required_files[@]}"; do
        if [ ! -f "${SCRIPT_DIR}/$file" ]; then
            print_error "Відсутній файл: $file"
            exit 1
        fi
    done
    
    print_success "Файли проєкту перевірено"
}

load_config() {
    print_step "Завантажую конфігурацію..."
    
    # Extract key values from config for use in script
    if command -v python3 &> /dev/null; then
        # Create temp file for variables
        local temp_file=$(mktemp)
        
        python3 << EOF > "$temp_file"
import yaml
import json

try:
    with open("$CONFIG_FILE", 'r') as f:
        config = yaml.safe_load(f)

    analysis = config.get('analysis', {})
    output = config.get('output', {})

    # Extract values with defaults
    watch_interval = output.get('watch_interval', 5)
    auto_update = output.get('auto_update', True)
    reports_dir_config = output.get('reports_dir', 'reports')
    min_function_size = analysis.get('min_function_size', 3)
    
    include_paths = analysis.get('include_paths', [])
    exclude_paths = analysis.get('exclude_paths', [])
    file_extensions = analysis.get('file_extensions', [])

    # Output bash export commands
    print(f"export WATCH_INTERVAL={watch_interval}")
    print(f"export AUTO_UPDATE={'true' if auto_update else 'false'}")
    print(f"export REPORTS_DIR_CONFIG={reports_dir_config}")
    print(f"export MIN_FUNCTION_SIZE={min_function_size}")
    print(f"export INCLUDE_PATHS_COUNT={len(include_paths)}")
    print(f"export EXCLUDE_PATHS_COUNT={len(exclude_paths)}")
    print(f"export FILE_EXTENSIONS_COUNT={len(file_extensions)}")
except Exception as e:
    print(f"Error loading config: {e}")
    exit(1)
EOF
        
        if [ $? -eq 0 ]; then
            source "$temp_file"
            rm "$temp_file"
            
            print_success "Конфігурація завантажена"
            print_info "Watch interval: ${WATCH_INTERVAL} сек"
            print_info "Auto-update: ${AUTO_UPDATE}"
            print_info "Reports dir: ${REPORTS_DIR_CONFIG}"
        else
            print_error "Помилка завантаження конфігурації"
            rm -f "$temp_file"
            exit 1
        fi
    else
        print_error "Python3 не доступний для завантаження конфігурації"
        exit 1
    fi
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
    
    # Use configuration from config.yaml
    if [ -f "$CONFIG_FILE" ]; then
        python3 codemap_analyzer.py --config "$CONFIG_FILE" --once
    else
        python3 codemap_analyzer.py --once
    fi
    
    if [ $? -eq 0 ]; then
        echo ""
        print_success "Перший аналіз завершено"
        print_info "Проаналізовано файлів: ${INCLUDE_PATHS_COUNT} шляхів"
        print_info "Виключено: ${EXCLUDE_PATHS_COUNT} шляхів"
        print_info "Розширення: ${FILE_EXTENSIONS_COUNT} типів"
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
    
    # Create mcp_config.json for Windsurf
    create_mcp_config
}

create_mcp_config() {
    print_step "Створюю MCP конфігурацію для Windsurf..."
    
    local mcp_config_dir="${HOME}/.codeium/windsurf"
    local mcp_config_file="${mcp_config_dir}/mcp_config.json"
    local local_mcp_config="${SCRIPT_DIR}/.windsurf/mcp_config.json"
    
    # Create directory if it doesn't exist
    mkdir -p "$mcp_config_dir"
    
    # Get paths
    local codemap_path=$(cd "$SCRIPT_DIR" && pwd)
    local project_root=$(cd "$SCRIPT_DIR/.." && pwd)
    
    # Create mcp_config.json with proper paths using Python for reliable JSON generation
    CODEMAP_PATH="$codemap_path" PROJECT_ROOT="$project_root" MCP_CONFIG_FILE="$mcp_config_file" LOCAL_MCP_CONFIG="$local_mcp_config" CONFIG_FILE="$CONFIG_FILE" python3 << 'PYTHON_EOF'
import json
import os
from pathlib import Path

codemap_path = os.environ.get('CODEMAP_PATH')
project_root = os.environ.get('PROJECT_ROOT')
mcp_config_file = os.environ.get('MCP_CONFIG_FILE')
local_mcp_config = os.environ.get('LOCAL_MCP_CONFIG')
config_file = os.environ.get('CONFIG_FILE')

# Build MCP server arguments
mcp_args = [
    f"{codemap_path}/mcp_codemap_server.py",
    "--project",
    project_root,
    "--mode",
    "stdio"
]

# Note: MCP server doesn't support --config parameter yet
# The config is loaded by the server automatically from config.yaml

mcp_config = {
    "mcpServers": {
        "codemap": {
            "command": "python3",
            "args": mcp_args,
            "env": {
                "PYTHONPATH": codemap_path,
                "PYTHONUNBUFFERED": "1"
            }
        }
    }
}

# Write to global Windsurf config
with open(mcp_config_file, 'w') as f:
    json.dump(mcp_config, f, indent=2)

# Also copy to local project .windsurf folder for version control
with open(local_mcp_config, 'w') as f:
    json.dump(mcp_config, f, indent=2)

print("✅ MCP конфігурація створена:")
print(f"   - Глобально: {mcp_config_file}")
print(f"   - Локально: {local_mcp_config}")
PYTHON_EOF
    
    if [ $? -eq 0 ]; then
        print_success "MCP конфігурація готова"
    else
        print_error "Помилка при створенні MCP конфігурації"
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
    
    # Sync analysis to memory first
    sync_analysis_to_memory
    
    cd "$SCRIPT_DIR"
    
    # Start MCP server with config if available
    # Note: MCP server loads config automatically from config.yaml
    python3 mcp_codemap_server.py --project "$SCRIPT_DIR" --mode stdio > /dev/null 2>&1 &
    MCP_PID=$!
    
    # Save PID for later
    echo "$MCP_PID" > "${SCRIPT_DIR}/.mcp_server.pid"
    
    print_success "MCP сервер запущено (PID: $MCP_PID)"
}

sync_analysis_to_memory() {
    print_step "Синхронізую аналіз з Windsurf memory та docs..."
    
    local memory_dir="${HOME}/.codeium/windsurf/memories"
    local reports_dir="${REPORTS_DIR}"
    local docs_codemap_dir="${SCRIPT_DIR}/../docs/codemap"
    mkdir -p "$memory_dir"
    mkdir -p "$docs_codemap_dir"
    
    if [ -f "${reports_dir}/codemap_analysis.json" ]; then
        # Copy analysis to memory with metadata
        python3 << PYTHON_SYNC
import json
from pathlib import Path
from datetime import datetime
import shutil

reports_dir = Path("$reports_dir")
memory_dir = Path("$memory_dir")
docs_codemap_dir = Path("$docs_codemap_dir")
memory_dir.mkdir(parents=True, exist_ok=True)
docs_codemap_dir.mkdir(parents=True, exist_ok=True)

try:
    with open(reports_dir / "codemap_analysis.json", 'r') as f:
        data = json.load(f)
    
    memory_data = {
        "timestamp": datetime.now().isoformat(),
        "key": "codemap_analysis",
        "data": {
            "project": data.get("project"),
            "files_analyzed": data.get("files_analyzed"),
            "total_functions": data.get("total_functions"),
            "dead_code_count": len(data.get("dead_code", {}).get("functions", [])),
            "cycles_count": len(data.get("cycles", [])),
            "complexity_metrics": data.get("complexity_metrics"),
            "file_imports": data.get("file_imports", {}),
            "function_definitions": data.get("function_definitions", {})
        }
    }
    
    # Sync to Windsurf memory
    with open(memory_dir / "codemap_analysis.json", 'w') as f:
        json.dump(memory_data, f, indent=2, default=str)
    
    # Sync to docs/codemap
    shutil.copy(reports_dir / "CODEMAP_SUMMARY.md", docs_codemap_dir / "CODEMAP_SUMMARY.md")
    shutil.copy(reports_dir / "codemap_analysis.json", docs_codemap_dir / "codemap_analysis.json")
    shutil.copy(reports_dir / "codemap_analysis.html", docs_codemap_dir / "codemap_analysis.html")
    
    print("✅ Аналіз синхронізовано з memory та docs/codemap")
except Exception as e:
    print(f"⚠️ Помилка синхронізації: {e}")
PYTHON_SYNC
    else
        print_info "Аналіз ще не готовий для синхронізації"
    fi
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
    echo "⚙️ Конфігурація:"
    echo "  - Auto-update: ${AUTO_UPDATE}"
    echo "  - Watch interval: ${WATCH_INTERVAL} сек"
    echo "  - Min function size: ${MIN_FUNCTION_SIZE} рядків"
    echo "  - Include paths: ${INCLUDE_PATHS_COUNT}"
    echo "  - File extensions: ${FILE_EXTENSIONS_COUNT}"
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
    echo "   Інтервал: ${WATCH_INTERVAL} секунд"
    echo ""
    echo "Щоб зупинити: Ctrl+C"
    echo ""
    
    # Start watch mode with configuration
    cd "$SCRIPT_DIR"
    if [ -f "$CONFIG_FILE" ]; then
        python3 codemap_analyzer.py --config "$CONFIG_FILE" --watch
    else
        python3 codemap_analyzer.py --watch
    fi
}

################################################################################
# Status Check
################################################################################

check_status() {
    print_header "📊 ПЕРЕВІРКА СТАТУСУ"
    
    # Load configuration first
    load_config
    
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
        
        # Ensure MCP config is up to date
        create_mcp_config
        
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
    print_header "🚀 ADVANCED CODEMAP SYSTEM v2.0 - РОЗГОРТАННЯ"
    
    # Check if Advanced system files exist
    if [ -f "${SCRIPT_DIR}/mcp_enhanced_analyzer.py" ] && \
       [ -f "${SCRIPT_DIR}/mcp_enhanced_server.py" ] && \
       [ -f "${SCRIPT_DIR}/mcp_advanced_tools.py" ]; then
        
        print_info "Виявлено Advanced Codemap System v2.0"
        print_info "Запускаю розширену систему з 5-шаровим аналізатором..."
        echo ""
        
        # Run advanced deploy script
        bash "${SCRIPT_DIR}/deploy_advanced.sh"
        return 0
    fi
    
    # Fallback to original system
    print_header "📋 КРОК 1: ПЕРЕВІРКИ"
    check_python
    check_pip
    check_files
    check_workflows
    load_config
    
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

# Handle interruption
cleanup() {
    echo ""
    print_info "Завершую роботу..."
    
    # Stop MCP server if running
    if [ -f "${SCRIPT_DIR}/.mcp_server.pid" ]; then
        local mcp_pid=$(cat "${SCRIPT_DIR}/.mcp_server.pid")
        if kill -0 "$mcp_pid" 2>/dev/null; then
            kill "$mcp_pid" 2>/dev/null || true
            print_info "MCP сервер зупинено"
        fi
        rm -f "${SCRIPT_DIR}/.mcp_server.pid"
    fi
    
    print_info "Роботу завершено"
    exit 0
}

trap cleanup INT TERM

# Run main
main "$@"
