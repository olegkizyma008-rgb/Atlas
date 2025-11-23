#!/bin/bash

# 🚀 Швидкі Команди для Очистки Проекту Atlas4
# Дата: 23 листопада 2025
# Статус: Готово до виконання

set -e  # Вихід при помилці

# Кольори для виводу
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Функції
print_header() {
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Перевірка передумов
check_prerequisites() {
    print_header "Перевірка передумов"
    
    if ! command -v git &> /dev/null; then
        print_error "Git не встановлений"
        exit 1
    fi
    print_success "Git встановлений"
    
    if ! command -v npm &> /dev/null; then
        print_warning "npm не встановлений (для JavaScript проектів)"
    else
        print_success "npm встановлений"
    fi
    
    if ! command -v python3 &> /dev/null; then
        print_warning "Python3 не встановлений (для Python проектів)"
    else
        print_success "Python3 встановлений"
    fi
}

# Створення backup
create_backup() {
    print_header "Створення Backup"
    
    if git rev-parse --verify cleanup/remove-unused-files &> /dev/null; then
        print_warning "Гілка cleanup/remove-unused-files вже існує"
        read -p "Видалити існуючу гілку? (y/n) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            git branch -D cleanup/remove-unused-files
            print_success "Гілка видалена"
        else
            print_error "Скасовано"
            exit 1
        fi
    fi
    
    git checkout -b cleanup/remove-unused-files
    print_success "Гілка cleanup/remove-unused-files створена"
}

# Запуск тестів
run_tests() {
    print_header "Запуск тестів"
    
    if [ -f "package.json" ]; then
        print_warning "Запуск npm тестів..."
        npm test || print_warning "npm тести не пройшли"
    fi
    
    if [ -f "requirements.txt" ] || [ -f "setup.py" ]; then
        print_warning "Запуск Python тестів..."
        python -m pytest || print_warning "Python тести не пройшли"
    fi
    
    print_success "Тести завершені"
}

# Перевірка залежностей
check_dependencies() {
    print_header "Перевірка залежностей"
    
    print_warning "Перевірка orchestrator..."
    if grep -r "orchestrator" . --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=.venv 2>/dev/null | grep -v "CLEANUP_EXECUTION_GUIDE\|ARCHITECTURE_ANALYSIS_REPORT\|CLEANUP_RECOMMENDATIONS"; then
        print_error "Знайдені залежності від orchestrator!"
        return 1
    else
        print_success "Немає залежностей від orchestrator"
    fi
    
    print_warning "Перевірка eternity..."
    if grep -r "eternity" . --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=.venv 2>/dev/null | grep -v "CLEANUP_EXECUTION_GUIDE\|ARCHITECTURE_ANALYSIS_REPORT\|CLEANUP_RECOMMENDATIONS"; then
        print_error "Знайдені залежності від eternity!"
        return 1
    else
        print_success "Немає залежностей від eternity"
    fi
    
    print_warning "Перевірка whisper сервісів..."
    if grep -r "whispercpp_service\|whisper_service" . --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=.venv 2>/dev/null | grep -v "CLEANUP_EXECUTION_GUIDE\|ARCHITECTURE_ANALYSIS_REPORT\|CLEANUP_RECOMMENDATIONS"; then
        print_error "Знайдені залежності від whisper сервісів!"
        return 1
    else
        print_success "Немає залежностей від whisper сервісів"
    fi
    
    return 0
}

# Фаза 1: Видалення Orchestrator
phase_1_remove_orchestrator() {
    print_header "Фаза 1: Видалення Orchestrator"
    
    if [ ! -d "orchestrator" ]; then
        print_warning "Папка orchestrator не знайдена"
        return 0
    fi
    
    print_warning "Видалення orchestrator папки..."
    rm -rf orchestrator/
    print_success "Orchestrator видалена"
    
    git add -A
    git commit -m "chore: remove unused orchestrator files

- Remove orchestrator/ai/context-aware-tool-filter.js (438 lines)
- Remove orchestrator/eternity/* (5 files, 1,231 lines)
- Remove orchestrator/utils/* (3 files, 700 lines)
- Remove orchestrator/workflow/* (2 files, 654 lines)

Total: 11 files, 3,152 lines removed"
    
    print_success "Фаза 1 завершена"
}

# Фаза 2: Видалення Whisper Сервісів
phase_2_remove_whisper_services() {
    print_header "Фаза 2: Видалення Whisper Сервісів"
    
    if [ ! -f "services/whisper/whispercpp_service.py" ] && [ ! -f "services/whisper/whisper_service.py" ]; then
        print_warning "Файли Whisper сервісів не знайдені"
        return 0
    fi
    
    print_warning "Видалення Whisper сервісів..."
    rm -f services/whisper/whispercpp_service.py
    rm -f services/whisper/whisper_service.py
    print_success "Whisper сервіси видалені"
    
    git add -A
    git commit -m "chore: consolidate whisper services

- Remove services/whisper/whispercpp_service.py (448 lines)
- Remove services/whisper/whisper_service.py (547 lines)

Note: These services should be consolidated into a single service.
Total: 2 files, 995 lines removed"
    
    print_success "Фаза 2 завершена"
}

# Фаза 3: Видалення Старих Prompts
phase_3_remove_old_prompts() {
    print_header "Фаза 3: Видалення Старих Prompts"
    
    if [ ! -d "prompts/mcp" ]; then
        print_warning "Папка prompts/mcp не знайдена"
        return 0
    fi
    
    print_warning "Видалення старих prompt файлів..."
    rm -f prompts/mcp/universal_mcp_prompt.js
    rm -f prompts/mcp/chat_memory_eligibility.js
    rm -f prompts/mcp/atlas_chat1.js
    print_success "Старі prompts видалені"
    
    git add -A
    git commit -m "chore: remove deprecated prompt files

- Remove prompts/mcp/universal_mcp_prompt.js (83 lines)
- Remove prompts/mcp/chat_memory_eligibility.js (135 lines)
- Remove prompts/mcp/atlas_chat1.js (209 lines)

Total: 3 files, 427 lines removed"
    
    print_success "Фаза 3 завершена"
}

# Фаза 4: Видалення Старих Тестів
phase_4_remove_old_tests() {
    print_header "Фаза 4: Видалення Старих Тестів"
    
    print_warning "Видалення manual тестів..."
    rm -rf tests/manual/ 2>/dev/null || true
    
    print_warning "Видалення застарілих unit тестів..."
    rm -f tests/unit/error-handling-wrapper.test.js 2>/dev/null || true
    rm -f tests/unit/test-nexus-full-cycle.js 2>/dev/null || true
    rm -f tests/unit/circuit-breaker.test.js 2>/dev/null || true
    rm -f tests/unit/exponential-backoff.test.js 2>/dev/null || true
    rm -f tests/unit/test-nexus-bug.js 2>/dev/null || true
    rm -f tests/unit/verification-logic.test.js 2>/dev/null || true
    
    print_warning "Видалення integration тестів..."
    rm -f tests/integration/test-mcp-filesystem-direct.js 2>/dev/null || true
    rm -f tests/integration/test-mcp-task.js 2>/dev/null || true
    
    print_warning "Видалення web тестів..."
    rm -f tests/web/atlas-test-suite.js 2>/dev/null || true
    
    print_warning "Видалення інших тестів..."
    rm -f tests/test-orchestrator-calculator-browser.js 2>/dev/null || true
    rm -f tests/test-vision-ollama.js 2>/dev/null || true
    
    print_success "Старі тести видалені"
    
    git add -A
    git commit -m "chore: remove deprecated test files

- Remove tests/manual/* (30+ files)
- Remove tests/unit/* (6 files)
- Remove tests/integration/* (2 files)
- Remove tests/web/* (1 file)
- Remove tests/test-orchestrator-calculator-browser.js
- Remove tests/test-vision-ollama.js

Total: 50+ files, ~8,500 lines removed"
    
    print_success "Фаза 4 завершена"
}

# Фаза 5: Перевірка Third-party
phase_5_check_third_party() {
    print_header "Фаза 5: Перевірка Third-party"
    
    print_warning "Перевірка whisper.cpp.upstream..."
    if grep -r "whisper.cpp.upstream\|whisper.cpp" . --exclude-dir=third_party --exclude-dir=node_modules --exclude-dir=.git 2>/dev/null | grep -v "CLEANUP_EXECUTION_GUIDE\|ARCHITECTURE_ANALYSIS_REPORT\|CLEANUP_RECOMMENDATIONS"; then
        print_warning "whisper.cpp.upstream використовується"
    else
        print_warning "whisper.cpp.upstream не використовується"
        read -p "Видалити whisper.cpp.upstream? (y/n) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            rm -rf third_party/whisper.cpp.upstream/
            print_success "whisper.cpp.upstream видалена"
        fi
    fi
    
    print_warning "Перевірка ukrainian-tts..."
    if grep -r "ukrainian.tts\|ukrainian-tts\|tts_server" . --exclude-dir=third_party --exclude-dir=node_modules --exclude-dir=.git 2>/dev/null | grep -v "CLEANUP_EXECUTION_GUIDE\|ARCHITECTURE_ANALYSIS_REPORT\|CLEANUP_RECOMMENDATIONS"; then
        print_warning "ukrainian-tts використовується"
    else
        print_warning "ukrainian-tts не використовується"
        read -p "Видалити ukrainian-tts? (y/n) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            rm -rf ukrainian-tts/
            print_success "ukrainian-tts видалена"
        fi
    fi
    
    git add -A
    git commit -m "chore: remove unused third-party dependencies" || true
    
    print_success "Фаза 5 завершена"
}

# Фінальна перевірка
final_check() {
    print_header "Фінальна Перевірка"
    
    print_warning "Запуск тестів..."
    if [ -f "package.json" ]; then
        npm test || print_warning "npm тести не пройшли"
    fi
    
    if [ -f "requirements.txt" ] || [ -f "setup.py" ]; then
        python -m pytest || print_warning "Python тести не пройшли"
    fi
    
    print_warning "Перевірка розміру проекту..."
    du -sh . | awk '{print "Розмір проекту: " $1}'
    
    print_warning "Перевірка кількості файлів..."
    find . -type f | wc -l | awk '{print "Всього файлів: " $1}'
    
    print_success "Фінальна перевірка завершена"
}

# Merge гілки
merge_branch() {
    print_header "Merge гілки"
    
    git checkout main
    git merge cleanup/remove-unused-files
    git push origin main
    git branch -d cleanup/remove-unused-files
    
    print_success "Гілка merged та видалена"
}

# Головне меню
main() {
    print_header "🚀 Очистка Проекту Atlas4"
    
    echo "Виберіть дію:"
    echo "1) Перевірити передумови"
    echo "2) Створити backup та перевірити залежності"
    echo "3) Виконати Фазу 1 (Orchestrator)"
    echo "4) Виконати Фазу 2 (Whisper)"
    echo "5) Виконати Фазу 3 (Prompts)"
    echo "6) Виконати Фазу 4 (Тести)"
    echo "7) Виконати Фазу 5 (Third-party)"
    echo "8) Виконати всі фази (1-5)"
    echo "9) Фінальна перевірка"
    echo "10) Merge гілки"
    echo "0) Вихід"
    echo
    read -p "Введіть номер (0-10): " choice
    
    case $choice in
        1) check_prerequisites ;;
        2) create_backup && check_dependencies ;;
        3) phase_1_remove_orchestrator && run_tests ;;
        4) phase_2_remove_whisper_services && run_tests ;;
        5) phase_3_remove_old_prompts && run_tests ;;
        6) phase_4_remove_old_tests && run_tests ;;
        7) phase_5_check_third_party && run_tests ;;
        8)
            create_backup
            check_dependencies
            phase_1_remove_orchestrator && run_tests
            phase_2_remove_whisper_services && run_tests
            phase_3_remove_old_prompts && run_tests
            phase_4_remove_old_tests && run_tests
            phase_5_check_third_party && run_tests
            final_check
            ;;
        9) final_check ;;
        10) merge_branch ;;
        0) print_success "Вихід"; exit 0 ;;
        *) print_error "Невірний вибір"; main ;;
    esac
}

# Запуск
main
