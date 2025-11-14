#!/usr/bin/env node

/**
 * Script to clean duplicate version blocks from atlas_chat.js
 * Keeps only one {{VERSION_BLOCK}} placeholder
 */

import fs from 'fs/promises';
import path from 'path';

const PROMPT_FILE = '/Users/dev/Documents/GitHub/atlas4/prompts/mcp/atlas_chat.js';

async function cleanVersionBlocks() {
    try {
        console.log('📝 Reading prompt file...');
        let content = await fs.readFile(PROMPT_FILE, 'utf8');
        
        // Pattern to match version blocks - stop at ENVIRONMENT section
        const versionBlockPattern = /🌟 СИСТЕМА ВЕРСІОНУВАННЯ \(NEXUS\):[\s\S]*?(?=\n\n🌐 ENVIRONMENT:)/g;
        
        // Count how many version blocks exist
        const matches = content.match(versionBlockPattern);
        const count = matches ? matches.length : 0;
        console.log(`Found ${count} version blocks`);
        
        if (count > 1) {
            // Replace all version blocks with single placeholder
            content = content.replace(versionBlockPattern, '{{VERSION_BLOCK}}\n\n');
            
            // Clean up multiple empty lines
            content = content.replace(/\n{4,}/g, '\n\n\n');
            
            console.log('✅ Removed duplicate version blocks');
            
            // Save cleaned file
            await fs.writeFile(PROMPT_FILE, content, 'utf8');
            console.log('💾 Saved cleaned prompt file');
        } else if (count === 1) {
            // Replace single version block with placeholder
            content = content.replace(versionBlockPattern, '{{VERSION_BLOCK}}\n\n');
            
            console.log('✅ Replaced version block with placeholder');
            await fs.writeFile(PROMPT_FILE, content, 'utf8');
            console.log('💾 Saved cleaned prompt file');
        } else {
            console.log('✅ No version blocks found');
        }
        
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

cleanVersionBlocks();
