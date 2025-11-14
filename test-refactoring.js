#!/usr/bin/env node

/**
 * Refactoring Verification Tests
 * Tests to verify all consolidations work correctly
 * 
 * Run: node test-refactoring.js
 */

import {
    normalizeToolName,
    denormalizeToolName,
    extractServerName,
    extractToolAction,
    validateToolNameFormat
} from './orchestrator/utils/tool-name-normalizer.js';

console.log('🧪 REFACTORING VERIFICATION TESTS\n');

// Test 1: Tool Name Normalization
console.log('📋 Test 1: Tool Name Normalization');
console.log('─'.repeat(50));

const testCases = [
    { input: 'applescript_execute', server: 'applescript', expected: 'applescript__execute' },
    { input: 'applescript__execute', server: 'applescript', expected: 'applescript__execute' },
    { input: 'execute', server: 'applescript', expected: 'applescript__execute' },
    { input: 'filesystem_create_file', server: 'filesystem', expected: 'filesystem__create_file' },
    { input: 'filesystem__create_file', server: 'filesystem', expected: 'filesystem__create_file' },
];

let passed = 0;
let failed = 0;

testCases.forEach(({ input, server, expected }) => {
    const result = normalizeToolName(input, server);
    const status = result === expected ? '✅' : '❌';
    console.log(`${status} normalizeToolName('${input}', '${server}') → '${result}'`);
    if (result === expected) passed++;
    else {
        console.log(`   Expected: '${expected}'`);
        failed++;
    }
});

console.log(`\nResult: ${passed}/${testCases.length} passed\n`);

// Test 2: Tool Name Denormalization
console.log('📋 Test 2: Tool Name Denormalization');
console.log('─'.repeat(50));

const denormTestCases = [
    { input: 'applescript__execute', expected: 'applescript_execute' },
    { input: 'filesystem__create_file', expected: 'filesystem_create_file' },
];

let denormPassed = 0;
let denormFailed = 0;

denormTestCases.forEach(({ input, expected }) => {
    const result = denormalizeToolName(input);
    const status = result === expected ? '✅' : '❌';
    console.log(`${status} denormalizeToolName('${input}') → '${result}'`);
    if (result === expected) denormPassed++;
    else {
        console.log(`   Expected: '${expected}'`);
        denormFailed++;
    }
});

console.log(`\nResult: ${denormPassed}/${denormTestCases.length} passed\n`);

// Test 3: Extract Server Name
console.log('📋 Test 3: Extract Server Name');
console.log('─'.repeat(50));

const serverTestCases = [
    { input: 'applescript__execute', expected: 'applescript' },
    { input: 'applescript_execute', expected: 'applescript' },
    { input: 'filesystem__create_file', expected: 'filesystem' },
];

let serverPassed = 0;
let serverFailed = 0;

serverTestCases.forEach(({ input, expected }) => {
    const result = extractServerName(input);
    const status = result === expected ? '✅' : '❌';
    console.log(`${status} extractServerName('${input}') → '${result}'`);
    if (result === expected) serverPassed++;
    else {
        console.log(`   Expected: '${expected}'`);
        serverFailed++;
    }
});

console.log(`\nResult: ${serverPassed}/${serverTestCases.length} passed\n`);

// Test 4: Extract Tool Action
console.log('📋 Test 4: Extract Tool Action');
console.log('─'.repeat(50));

const actionTestCases = [
    { input: 'applescript__execute', expected: 'execute' },
    { input: 'applescript_execute', expected: 'execute' },
    { input: 'filesystem__create_file', expected: 'create_file' },
];

let actionPassed = 0;
let actionFailed = 0;

actionTestCases.forEach(({ input, expected }) => {
    const result = extractToolAction(input);
    const status = result === expected ? '✅' : '❌';
    console.log(`${status} extractToolAction('${input}') → '${result}'`);
    if (result === expected) actionPassed++;
    else {
        console.log(`   Expected: '${expected}'`);
        actionFailed++;
    }
});

console.log(`\nResult: ${actionPassed}/${actionTestCases.length} passed\n`);

// Test 5: Validate Tool Name Format
console.log('📋 Test 5: Validate Tool Name Format');
console.log('─'.repeat(50));

const validationTestCases = [
    { input: 'applescript__execute', format: 'normalized', shouldBeValid: true },
    { input: 'applescript_execute', format: 'normalized', shouldBeValid: false },
    { input: 'applescript_execute', format: 'denormalized', shouldBeValid: true },
    { input: 'applescript__execute', format: 'denormalized', shouldBeValid: false },
];

let validationPassed = 0;
let validationFailed = 0;

validationTestCases.forEach(({ input, format, shouldBeValid }) => {
    const result = validateToolNameFormat(input, format);
    const isValid = result.valid;
    const status = isValid === shouldBeValid ? '✅' : '❌';
    console.log(`${status} validateToolNameFormat('${input}', '${format}') → ${isValid}`);
    if (isValid === shouldBeValid) validationPassed++;
    else {
        console.log(`   Expected valid: ${shouldBeValid}, got: ${isValid}`);
        if (!isValid) console.log(`   Error: ${result.error}`);
        validationFailed++;
    }
});

console.log(`\nResult: ${validationPassed}/${validationTestCases.length} passed\n`);

// Summary
console.log('═'.repeat(50));
console.log('📊 SUMMARY');
console.log('═'.repeat(50));

const totalTests = testCases.length + denormTestCases.length + serverTestCases.length +
    actionTestCases.length + validationTestCases.length;
const totalPassed = passed + denormPassed + serverPassed + actionPassed + validationPassed;
const totalFailed = failed + denormFailed + serverFailed + actionFailed + validationFailed;

console.log(`Total Tests: ${totalTests}`);
console.log(`Passed: ${totalPassed} ✅`);
console.log(`Failed: ${totalFailed} ❌`);
console.log(`Success Rate: ${((totalPassed / totalTests) * 100).toFixed(1)}%\n`);

if (totalFailed === 0) {
    console.log('🎉 ALL TESTS PASSED! Consolidation successful.\n');
    process.exit(0);
} else {
    console.log(`⚠️  ${totalFailed} tests failed. Review the output above.\n`);
    process.exit(1);
}
