/**
 * NEXUS FULL CYCLE TEST
 * Тестовий файл з багами для демонстрації повного циклу самовдосконалення
 * Created: 2025-11-03
 */

// ==================== БАГИ ДЛЯ ВИПРАВЛЕННЯ ====================

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

// BUG 5: Memory leak - event listener not removed
class EventManager {
    constructor() {
        this.listeners = [];
    }
    
    addListener(event, callback) {
        this.listeners.push({ event, callback });
        document.addEventListener(event, callback);
        // Missing: removeEventListener in cleanup
    }
}

// ==================== ЗАСТАРІЛИЙ КОД ДЛЯ МОДЕРНІЗАЦІЇ ====================

// OLD 1: var замість const/let
var oldVariable = 'should be const';
var counter = 0; // should be let

// OLD 2: Callbacks замість async/await
function loadDataCallback(url, callback) {
    fetch(url).then(response => {
        response.json().then(data => {
            callback(null, data);
        }).catch(err => {
            callback(err);
        });
    });
}

// OLD 3: Відсутні JSDoc типи
function processUser(user) {
    return {
        id: user.id,
        name: user.name.toUpperCase()
    };
}

// ==================== КОД ДЛЯ ОПТИМІЗАЦІЇ ====================

// OPTIMIZATION 1: Неефективний цикл
function findDuplicates(array) {
    const duplicates = [];
    for (let i = 0; i < array.length; i++) {
        for (let j = i + 1; j < array.length; j++) {
            if (array[i] === array[j]) {
                duplicates.push(array[i]);
            }
        }
    }
    return duplicates;
}

// OPTIMIZATION 2: Відсутнє кешування
function expensiveCalculation(n) {
    // Обчислення повторюється кожного разу
    let result = 0;
    for (let i = 0; i < n; i++) {
        result += Math.sqrt(i) * Math.sin(i);
    }
    return result;
}

// OPTIMIZATION 3: Неефективна робота з масивами
function filterAndMap(data) {
    const filtered = data.filter(item => item.active);
    const mapped = filtered.map(item => item.value);
    const sorted = mapped.sort((a, b) => a - b);
    return sorted;
}

module.exports = {
    calculateTotal,
    getUserName,
    fetchData,
    EventManager,
    loadDataCallback,
    processUser,
    findDuplicates,
    expensiveCalculation,
    filterAndMap,
    MAX_RETRIES
};
