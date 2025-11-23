#!/bin/bash

################################################################################
# ATLAS4 Cleanup Phase 1 - Critical Deletions
# Видалення архівів, резервних копій та venv директорій
# Час виконання: ~10 хвилин
# Результат: -75% розміру проекту
################################################################################

set -e  # Вихід при помилці

# Кольори для виводу
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Проект директорія
PROJECT_DIR="/Users/dev/Documents/GitHub/atlas4"

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     ATLAS4 Cleanup Phase 1 - Critical Deletions           ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Перевірка, чи ми в правильній директорії
if [ ! -d "$PROJECT_DIR" ]; then
    echo -e "${RED}❌ Помилка: Директорія $PROJECT_DIR не знайдена${NC}"
    exit 1
fi

cd "$PROJECT_DIR"

echo -e "${YELLOW}📋 Перевірка поточного стану...${NC}"
echo ""

# Отримати поточний розмір
INITIAL_SIZE=$(du -sh . | cut -f1)
echo -e "Поточний розмір проекту: ${YELLOW}$INITIAL_SIZE${NC}"
echo ""

# Перевірити git статус
echo -e "${YELLOW}🔍 Перевірка git статусу...${NC}"
if git status > /dev/null 2>&1; then
    UNCOMMITTED=$(git status --porcelain | wc -l)
    if [ $UNCOMMITTED -gt 0 ]; then
        echo -e "${RED}⚠️  Увага: У вас є незакомічені файли ($UNCOMMITTED)${NC}"
        echo -e "${YELLOW}Рекомендуємо закомітити їх перед видаленням${NC}"
        echo ""
        read -p "Продовжити? (y/n) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            echo -e "${RED}❌ Скасовано${NC}"
            exit 1
        fi
    fi
else
    echo -e "${YELLOW}⚠️  Git не ініціалізований${NC}"
fi

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}Фаза 1.1: Видалення архівних директорій${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""

# Видалити archive/
if [ -d "archive" ]; then
    echo -e "${YELLOW}🗑️  Видалення archive/ директорії...${NC}"
    ARCHIVE_SIZE=$(du -sh archive | cut -f1)
    echo -e "   Розмір: ${YELLOW}$ARCHIVE_SIZE${NC}"
    rm -rf archive/
    echo -e "${GREEN}✅ archive/ видалена${NC}"
else
    echo -e "${GREEN}✅ archive/ вже видалена${NC}"
fi

echo ""

# Видалити backups/
if [ -d "backups" ]; then
    echo -e "${YELLOW}🗑️  Видалення backups/ директорії...${NC}"
    BACKUPS_SIZE=$(du -sh backups | cut -f1)
    echo -e "   Розмір: ${YELLOW}$BACKUPS_SIZE${NC}"
    rm -rf backups/
    echo -e "${GREEN}✅ backups/ видалена${NC}"
else
    echo -e "${GREEN}✅ backups/ вже видалена${NC}"
fi

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}Фаза 1.2: Видалення venv директорій${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""

# Видалити web/venv/
if [ -d "web/venv" ]; then
    echo -e "${YELLOW}🗑️  Видалення web/venv/ директорії...${NC}"
    VENV_WEB_SIZE=$(du -sh web/venv | cut -f1)
    echo -e "   Розмір: ${YELLOW}$VENV_WEB_SIZE${NC}"
    rm -rf web/venv/
    echo -e "${GREEN}✅ web/venv/ видалена${NC}"
else
    echo -e "${GREEN}✅ web/venv/ вже видалена${NC}"
fi

echo ""

# Видалити codemap-system/venv/
if [ -d "codemap-system/venv" ]; then
    echo -e "${YELLOW}🗑️  Видалення codemap-system/venv/ директорії...${NC}"
    VENV_CODEMAP_SIZE=$(du -sh codemap-system/venv | cut -f1)
    echo -e "   Розмір: ${YELLOW}$VENV_CODEMAP_SIZE${NC}"
    rm -rf codemap-system/venv/
    echo -e "${GREEN}✅ codemap-system/venv/ видалена${NC}"
else
    echo -e "${GREEN}✅ codemap-system/venv/ вже видалена${NC}"
fi

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}Фаза 1.3: Оновлення .gitignore${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""

# Перевірити, чи вже в .gitignore
if ! grep -q "^venv/$" .gitignore 2>/dev/null; then
    echo -e "${YELLOW}📝 Додавання записів до .gitignore...${NC}"
    
    cat >> .gitignore << 'EOF'

# Python virtual environments
venv/
.venv/
env/
.env
__pycache__/
*.pyc
*.pyo
*.pyd
.Python
*.egg-info/
dist/
build/

# Node modules
node_modules/
npm-debug.log
yarn-error.log

# IDE
.vscode/
.idea/
*.swp
*.swo
*~

# OS
.DS_Store
Thumbs.db

# Backup files
*.bak
*.backup
*~

# Temporary files
.tmp/
temp/
tmp/
EOF
    
    echo -e "${GREEN}✅ .gitignore оновлений${NC}"
else
    echo -e "${GREEN}✅ .gitignore вже містить необхідні записи${NC}"
fi

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}Перевірка результатів${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""

# Отримати новий розмір
FINAL_SIZE=$(du -sh . | cut -f1)
echo -e "Новий розмір проекту: ${GREEN}$FINAL_SIZE${NC}"
echo ""

# Перевірити, чи видалені директорії
echo -e "${YELLOW}🔍 Перевірка видалених директорій...${NC}"
echo ""

if [ ! -d "archive" ]; then
    echo -e "${GREEN}✅ archive/ видалена${NC}"
else
    echo -e "${RED}❌ archive/ все ще існує${NC}"
fi

if [ ! -d "backups" ]; then
    echo -e "${GREEN}✅ backups/ видалена${NC}"
else
    echo -e "${RED}❌ backups/ все ще існує${NC}"
fi

if [ ! -d "web/venv" ]; then
    echo -e "${GREEN}✅ web/venv/ видалена${NC}"
else
    echo -e "${RED}❌ web/venv/ все ще існує${NC}"
fi

if [ ! -d "codemap-system/venv" ]; then
    echo -e "${GREEN}✅ codemap-system/venv/ видалена${NC}"
else
    echo -e "${RED}❌ codemap-system/venv/ все ще існує${NC}"
fi

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ ФАЗА 1 ЗАВЕРШЕНА!${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""

echo -e "${YELLOW}📊 Результати:${NC}"
echo -e "   Поточний розмір: ${YELLOW}$INITIAL_SIZE${NC}"
echo -e "   Новий розмір:    ${GREEN}$FINAL_SIZE${NC}"
echo ""

echo -e "${YELLOW}📋 Наступні кроки:${NC}"
echo -e "   1. Закомітити видалення: ${BLUE}git add -A && git commit -m 'Phase 1: Remove archives and venv'${NC}"
echo -e "   2. Переустановити залежності: ${BLUE}pip install -r requirements.txt${NC}"
echo -e "   3. Запустити тести: ${BLUE}npm run test:all${NC}"
echo -e "   4. Запустити аналіз архітектури: ${BLUE}python3 codemap-system/architecture_mapper.py${NC}"
echo ""

echo -e "${GREEN}🎉 Фаза 1 успішно завершена!${NC}"
echo ""
