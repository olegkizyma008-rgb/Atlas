/**
 * TEST FILE FOR NEXUS SELF-REPAIR
 * Created: 2025-11-03
 * 
 * This file intentionally contains bugs to test Nexus Multi-Model Orchestrator
 * and Windsurf API integration.
 */

// BUG 1: Const reassignment
const MAX_RETRIES = 3;
MAX_RETRIES = 5; // Error: Assignment to constant variable

// BUG 2: Undefined variable
function calculateTotal(items) {
    let total = 0;
    for (let item of items) {
        total += item.price;
    }
    console.log(result); // Error: result is not defined
    return total;
}

// BUG 3: Missing return statement
function getUserName(user) {
    if (user && user.name) {
        user.name;  // Missing return
    }
}

// BUG 4: Incorrect async/await
async function fetchData() {
    const data = fetch('https://api.example.com/data'); // Missing await
    return data.json();
}

module.exports = {
    calculateTotal,
    getUserName,
    fetchData,
    MAX_RETRIES
};
