/**
 * Test for verification logic fixes
 * FIXED 2025-11-19: Verify that "does not match" is correctly identified as mismatch
 */

// Mock the _detectReasonContradiction method
const _detectReasonContradiction = (reason = '', observed = '') => {
    if (!reason || !observed) return false;

    const reasonLower = reason.toLowerCase();
    const observedLower = observed.toLowerCase();

    // CRITICAL FIX 2025-11-19: Check for EXPLICIT MISMATCH statements
    const hasMismatchStatement = reasonLower.includes('does not match') ||
        reasonLower.includes('does not equal') ||
        reasonLower.includes('не відповід') ||
        reasonLower.includes('не дорівнює') ||
        reasonLower.includes('не збіг') ||
        reasonLower.includes('не совпад') ||
        reasonLower.includes('не совпадает');

    if (hasMismatchStatement) {
        return true;
    }

    return false;
};

// Mock the reasonMentionsMatch logic
const checkReasonMentionsMatch = (reason = '') => {
    const reasonLower = (reason || '').toLowerCase();

    // FIXED 2025-11-19: CRITICAL - Check for EXPLICIT SUCCESS, not just word presence
    // IMPORTANT: Check for negations FIRST before checking for positive keywords
    const hasNegation = reasonLower.includes('does not match') ||
        reasonLower.includes('does not equal') ||
        reasonLower.includes('не відповід') ||
        reasonLower.includes('не дорівнює') ||
        reasonLower.includes('не збіг') ||
        reasonLower.includes('не совпад') ||
        reasonLower.includes('не совпадает') ||
        reasonLower.includes('not correct') ||
        reasonLower.includes('incorrect') ||
        reasonLower.includes('not updated') ||
        reasonLower.includes('не готово') ||
        reasonLower.includes('не виконано') ||
        reasonLower.includes('не зроблено') ||
        reasonLower.includes('не завершено') ||
        reasonLower.includes('not done') ||
        reasonLower.includes('not completed') ||
        reasonLower.includes('not success') ||
        reasonLower.includes('unsuccessful');

    return !hasNegation && (
        reasonLower.includes('match') ||
        reasonLower.includes('відповід') ||
        reasonLower.includes('успішно') ||
        reasonLower.includes('correct') ||
        reasonLower.includes('updated') ||
        reasonLower.includes('готово') ||
        reasonLower.includes('виконано') ||
        reasonLower.includes('зроблено') ||
        reasonLower.includes('завершено') ||
        reasonLower.includes('done') ||
        reasonLower.includes('completed') ||
        reasonLower.includes('success')
    );
};

// Run tests
console.log('\n🧪 Running Verification Logic Tests...\n');
const tests = [
    {
        name: 'Should detect "does not match" as mismatch',
        fn: () => {
            const reason = 'The calculator display shows -58, which does not match the success criteria of 915.';
            const hasContradiction = _detectReasonContradiction(reason, '-58');
            return hasContradiction === true;
        }
    },
    {
        name: 'Should NOT treat "does not match" as success',
        fn: () => {
            const reason = 'The calculator display shows -58, which does not match the success criteria of 915.';
            const reasonMentionsMatch = checkReasonMentionsMatch(reason);
            return reasonMentionsMatch === false;
        }
    },
    {
        name: 'Should detect explicit success statements',
        fn: () => {
            const reason = 'The Calculator application window is clearly visible on the screen, meeting the success criteria.';
            const reasonMentionsMatch = checkReasonMentionsMatch(reason);
            return reasonMentionsMatch === true;
        }
    },
    {
        name: 'Should NOT detect mismatch in success statement',
        fn: () => {
            const reason = 'The Calculator application window is clearly visible on the screen, meeting the success criteria.';
            const hasContradiction = _detectReasonContradiction(reason, 'Calculator window');
            return hasContradiction === false;
        }
    },
    {
        name: 'Should detect Ukrainian "не відповід" as mismatch',
        fn: () => {
            const reason = 'Результат -58 не відповідає критеріям успіху 915.';
            const hasContradiction = _detectReasonContradiction(reason, '-58');
            return hasContradiction === true;
        }
    },
    {
        name: 'Should reject when "does not match" + contradiction',
        fn: () => {
            const reason = 'The calculator display shows -58, which does not match the success criteria of 915.';
            const reasonMentionsMatch = checkReasonMentionsMatch(reason);
            const hasContradiction = _detectReasonContradiction(reason, '-58');
            return reasonMentionsMatch === false && hasContradiction === true;
        }
    },
    {
        name: 'Should accept success with explicit match',
        fn: () => {
            const reason = 'The result matches the expected criteria.';
            const reasonMentionsMatch = checkReasonMentionsMatch(reason);
            const hasContradiction = _detectReasonContradiction(reason, 'result');
            return reasonMentionsMatch === true && hasContradiction === false;
        }
    }
];

let passed = 0;
let failed = 0;

tests.forEach((test, idx) => {
    try {
        const result = test.fn();
        if (result) {
            console.log(`✅ Test ${idx + 1} PASSED: ${test.name}`);
            passed++;
        } else {
            console.log(`❌ Test ${idx + 1} FAILED: ${test.name}`);
            failed++;
        }
    } catch (error) {
        console.log(`❌ Test ${idx + 1} ERROR: ${test.name} - ${error.message}`);
        failed++;
    }
});

console.log(`\n📊 Results: ${passed} passed, ${failed} failed\n`);

if (failed === 0) {
    console.log('🎉 All tests passed! Verification logic is correct.');
    process.exit(0);
} else {
    console.log('⚠️ Some tests failed. Please review the logic.');
    process.exit(1);
}
