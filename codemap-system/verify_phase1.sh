#!/bin/bash

################################################################################
#                                                                              #
#                    🔍 PHASE 1 VERIFICATION SCRIPT 🔍                        #
#                                                                              #
#  Перевіряє, що всі компоненти Фази 1 правильно встановлені                #
#                                                                              #
################################################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PASSED=0
FAILED=0

print_header() {
    echo ""
    echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║${NC} $1"
    echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

check_pass() {
    echo -e "${GREEN}✅${NC} $1"
    ((PASSED++))
}

check_fail() {
    echo -e "${RED}❌${NC} $1"
    ((FAILED++))
}

check_info() {
    echo -e "${YELLOW}ℹ${NC} $1"
}

################################################################################
# Checks
################################################################################

print_header "🔍 PHASE 1 VERIFICATION"

echo "Перевіряю компоненти Фази 1..."
echo ""

# Check 1: MCP Config Template
echo -e "${YELLOW}▶${NC} Перевіряю mcp_config.json.template..."
if [ -f "${SCRIPT_DIR}/mcp_config.json.template" ]; then
    check_pass "mcp_config.json.template знайдено"
    
    # Check content
    if grep -q "codemap" "${SCRIPT_DIR}/mcp_config.json.template"; then
        check_pass "mcp_config.json.template містить конфігурацію codemap"
    else
        check_fail "mcp_config.json.template не містить конфігурацію codemap"
    fi
else
    check_fail "mcp_config.json.template не знайдено"
fi
echo ""

# Check 2: Deploy Script
echo -e "${YELLOW}▶${NC} Перевіряю deploy.sh..."
if [ -f "${SCRIPT_DIR}/deploy.sh" ]; then
    check_pass "deploy.sh знайдено"
    
    # Check for create_mcp_config function
    if grep -q "create_mcp_config" "${SCRIPT_DIR}/deploy.sh"; then
        check_pass "deploy.sh містить функцію create_mcp_config"
    else
        check_fail "deploy.sh не містить функцію create_mcp_config"
    fi
else
    check_fail "deploy.sh не знайдено"
fi
echo ""

# Check 3: MCP Server
echo -e "${YELLOW}▶${NC} Перевіряю mcp_codemap_server.py..."
if [ -f "${SCRIPT_DIR}/mcp_codemap_server.py" ]; then
    check_pass "mcp_codemap_server.py знайдено"
    
    # Check for Phase 1 resources
    if grep -q "codemap://current/file-context" "${SCRIPT_DIR}/mcp_codemap_server.py"; then
        check_pass "Додано ресурс codemap://current/file-context"
    else
        check_fail "Ресурс codemap://current/file-context не знайдено"
    fi
    
    if grep -q "codemap://current/file-issues" "${SCRIPT_DIR}/mcp_codemap_server.py"; then
        check_pass "Додано ресурс codemap://current/file-issues"
    else
        check_fail "Ресурс codemap://current/file-issues не знайдено"
    fi
    
    if grep -q "codemap://current/file-recommendations" "${SCRIPT_DIR}/mcp_codemap_server.py"; then
        check_pass "Додано ресурс codemap://current/file-recommendations"
    else
        check_fail "Ресурс codemap://current/file-recommendations не знайдено"
    fi
    
    # Check for Phase 1 tools
    if grep -q "get_current_file_context" "${SCRIPT_DIR}/mcp_codemap_server.py"; then
        check_pass "Додано інструмент get_current_file_context"
    else
        check_fail "Інструмент get_current_file_context не знайдено"
    fi
    
    if grep -q "get_related_files" "${SCRIPT_DIR}/mcp_codemap_server.py"; then
        check_pass "Додано інструмент get_related_files"
    else
        check_fail "Інструмент get_related_files не знайдено"
    fi
    
    if grep -q "get_file_impact" "${SCRIPT_DIR}/mcp_codemap_server.py"; then
        check_pass "Додано інструмент get_file_impact"
    else
        check_fail "Інструмент get_file_impact не знайдено"
    fi
    
    if grep -q "get_dependency_chain" "${SCRIPT_DIR}/mcp_codemap_server.py"; then
        check_pass "Додано інструмент get_dependency_chain"
    else
        check_fail "Інструмент get_dependency_chain не знайдено"
    fi
    
    if grep -q "quick_show_dead_code" "${SCRIPT_DIR}/mcp_codemap_server.py"; then
        check_pass "Додано інструмент quick_show_dead_code"
    else
        check_fail "Інструмент quick_show_dead_code не знайдено"
    fi
    
    if grep -q "quick_show_dependencies" "${SCRIPT_DIR}/mcp_codemap_server.py"; then
        check_pass "Додано інструмент quick_show_dependencies"
    else
        check_fail "Інструмент quick_show_dependencies не знайдено"
    fi
    
    if grep -q "quick_show_issues" "${SCRIPT_DIR}/mcp_codemap_server.py"; then
        check_pass "Додано інструмент quick_show_issues"
    else
        check_fail "Інструмент quick_show_issues не знайдено"
    fi
    
    # Check for Phase 1 methods
    if grep -q "_get_current_file_context" "${SCRIPT_DIR}/mcp_codemap_server.py"; then
        check_pass "Реалізовано метод _get_current_file_context"
    else
        check_fail "Метод _get_current_file_context не реалізовано"
    fi
    
    if grep -q "_get_related_files" "${SCRIPT_DIR}/mcp_codemap_server.py"; then
        check_pass "Реалізовано метод _get_related_files"
    else
        check_fail "Метод _get_related_files не реалізовано"
    fi
    
    if grep -q "_get_file_impact" "${SCRIPT_DIR}/mcp_codemap_server.py"; then
        check_pass "Реалізовано метод _get_file_impact"
    else
        check_fail "Метод _get_file_impact не реалізовано"
    fi
    
    if grep -q "_get_dependency_chain" "${SCRIPT_DIR}/mcp_codemap_server.py"; then
        check_pass "Реалізовано метод _get_dependency_chain"
    else
        check_fail "Метод _get_dependency_chain не реалізовано"
    fi
    
    if grep -q "_quick_show_dead_code" "${SCRIPT_DIR}/mcp_codemap_server.py"; then
        check_pass "Реалізовано метод _quick_show_dead_code"
    else
        check_fail "Метод _quick_show_dead_code не реалізовано"
    fi
    
    if grep -q "_quick_show_dependencies" "${SCRIPT_DIR}/mcp_codemap_server.py"; then
        check_pass "Реалізовано метод _quick_show_dependencies"
    else
        check_fail "Метод _quick_show_dependencies не реалізовано"
    fi
    
    if grep -q "_quick_show_issues" "${SCRIPT_DIR}/mcp_codemap_server.py"; then
        check_pass "Реалізовано метод _quick_show_issues"
    else
        check_fail "Метод _quick_show_issues не реалізовано"
    fi
else
    check_fail "mcp_codemap_server.py не знайдено"
fi
echo ""

# Check 4: Documentation
echo -e "${YELLOW}▶${NC} Перевіряю документацію..."
if [ -f "${SCRIPT_DIR}/../PHASE1_IMPLEMENTATION_COMPLETE.md" ]; then
    check_pass "PHASE1_IMPLEMENTATION_COMPLETE.md знайдено"
else
    check_fail "PHASE1_IMPLEMENTATION_COMPLETE.md не знайдено"
fi

if [ -f "${SCRIPT_DIR}/../PHASE1_QUICK_REFERENCE.md" ]; then
    check_pass "PHASE1_QUICK_REFERENCE.md знайдено"
else
    check_fail "PHASE1_QUICK_REFERENCE.md не знайдено"
fi
echo ""

# Check 5: Python Syntax
echo -e "${YELLOW}▶${NC} Перевіряю синтаксис Python..."
if python3 -m py_compile "${SCRIPT_DIR}/mcp_codemap_server.py" 2>/dev/null; then
    check_pass "mcp_codemap_server.py має правильний синтаксис"
else
    check_fail "mcp_codemap_server.py має помилки синтаксису"
fi
echo ""

# Check 6: MCP Config Creation
echo -e "${YELLOW}▶${NC} Перевіряю створення MCP конфігурації..."
if [ -f "${HOME}/.codeium/windsurf/mcp_config.json" ]; then
    check_pass "MCP конфігурація вже створена"
    
    if grep -q "codemap" "${HOME}/.codeium/windsurf/mcp_config.json"; then
        check_pass "MCP конфігурація містить codemap сервер"
    else
        check_fail "MCP конфігурація не містить codemap сервер"
    fi
else
    check_info "MCP конфігурація ще не створена (буде створена при розгортанні)"
fi
echo ""

################################################################################
# Summary
################################################################################

print_header "📊 РЕЗУЛЬТАТИ ПЕРЕВІРКИ"

echo -e "${GREEN}✅ Пройдено: $PASSED${NC}"
echo -e "${RED}❌ Помилок: $FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}🎉 ВСІ ПЕРЕВІРКИ ПРОЙДЕНІ!${NC}"
    echo ""
    echo "Фаза 1 готова до розгортання."
    echo ""
    echo "Наступні кроки:"
    echo "1. Запустіть: bash deploy.sh"
    echo "2. Перезавантажте Windsurf"
    echo "3. Тестуйте нові інструменти"
    echo ""
    exit 0
else
    echo -e "${RED}⚠️ ЗНАЙДЕНО ПОМИЛКИ!${NC}"
    echo ""
    echo "Будь ласка, виправте помилки перед розгортанням."
    echo ""
    exit 1
fi
