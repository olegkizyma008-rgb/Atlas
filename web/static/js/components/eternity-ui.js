/**
 * ETERNITY UI Component
 * Інтерфейс для взаємодії з модулем вічного самовдосконалення
 */

export class EternityUI {
  constructor() {
    this.container = null;
    this.isInitialized = false;
    this.pendingRequests = [];
  }

  initialize() {
    if (this.isInitialized) return;
    
    this.createUIElements();
    this.attachEventListeners();
    this.isInitialized = true;
  }

  createUIElements() {
    // Створення контейнера для повідомлень про покращення
    this.container = document.createElement('div');
    this.container.id = 'eternity-ui';
    this.container.className = 'eternity-container';
    this.container.innerHTML = `
      <div class="eternity-header">
        <span class="eternity-icon">♾️</span>
        <span class="eternity-title">ВІЧНІСТЬ - Модуль Самовдосконалення</span>
      </div>
      <div class="eternity-content">
        <div class="eternity-status" id="eternity-status">
          <span class="status-indicator"></span>
          <span class="status-text">Моніторинг активний</span>
        </div>
        <div class="eternity-improvements" id="eternity-improvements"></div>
        <div class="eternity-requests" id="eternity-requests"></div>
      </div>
    `;
    
    document.body.appendChild(this.container);
    this.addStyles();
  }

  addStyles() {
    const style = document.createElement('style');
    style.textContent = `
      .eternity-container {
        position: fixed;
        top: 80px;
        right: 20px;
        width: 380px;
        max-height: 500px;
        background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
        border: 2px solid #00ff88;
        border-radius: 15px;
        box-shadow: 0 0 30px rgba(0, 255, 136, 0.3);
        z-index: 9999;
        display: none;
        animation: eternityPulse 3s infinite;
        overflow: hidden;
      }
      
      @keyframes eternityPulse {
        0%, 100% { box-shadow: 0 0 30px rgba(0, 255, 136, 0.3); }
        50% { box-shadow: 0 0 40px rgba(0, 255, 136, 0.5); }
      }
      
      .eternity-header {
        padding: 15px;
        background: rgba(0, 255, 136, 0.1);
        border-bottom: 1px solid rgba(0, 255, 136, 0.3);
        display: flex;
        align-items: center;
        gap: 10px;
      }
      
      .eternity-icon {
        font-size: 24px;
        animation: rotate 10s linear infinite;
      }
      
      @keyframes rotate {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
      
      .eternity-title {
        font-size: 16px;
        font-weight: bold;
        color: #00ff88;
        text-shadow: 0 0 10px rgba(0, 255, 136, 0.5);
      }
      
      .eternity-content {
        padding: 15px;
        max-height: 400px;
        overflow-y: auto;
      }
      
      .eternity-status {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-bottom: 15px;
        padding: 10px;
        background: rgba(0, 255, 136, 0.05);
        border-radius: 8px;
      }
      
      .status-indicator {
        width: 10px;
        height: 10px;
        background: #00ff88;
        border-radius: 50%;
        animation: blink 2s infinite;
      }
      
      @keyframes blink {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.3; }
      }
      
      .status-text {
        color: #00ff88;
        font-size: 14px;
      }
      
      .improvement-request {
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(0, 255, 136, 0.3);
        border-radius: 10px;
        padding: 15px;
        margin-bottom: 15px;
        animation: slideIn 0.3s ease;
      }
      
      @keyframes slideIn {
        from {
          opacity: 0;
          transform: translateX(20px);
        }
        to {
          opacity: 1;
          transform: translateX(0);
        }
      }
      
      .improvement-message {
        color: #ffffff;
        font-size: 14px;
        line-height: 1.6;
        margin-bottom: 15px;
      }
      
      .improvement-details {
        background: rgba(0, 0, 0, 0.3);
        border-radius: 8px;
        padding: 10px;
        margin-bottom: 15px;
      }
      
      .improvement-item {
        color: #a0a0a0;
        font-size: 13px;
        margin-bottom: 8px;
        padding-left: 15px;
        position: relative;
      }
      
      .improvement-item::before {
        content: "→";
        position: absolute;
        left: 0;
        color: #00ff88;
      }
      
      .improvement-actions {
        display: flex;
        gap: 10px;
      }
      
      .eternity-button {
        flex: 1;
        padding: 10px;
        border: none;
        border-radius: 8px;
        font-size: 14px;
        font-weight: bold;
        cursor: pointer;
        transition: all 0.3s;
      }
      
      .approve-button {
        background: linear-gradient(135deg, #00ff88 0%, #00cc6a 100%);
        color: #000;
      }
      
      .approve-button:hover {
        transform: translateY(-2px);
        box-shadow: 0 5px 15px rgba(0, 255, 136, 0.4);
      }
      
      .reject-button {
        background: rgba(255, 255, 255, 0.1);
        color: #fff;
        border: 1px solid rgba(255, 255, 255, 0.2);
      }
      
      .reject-button:hover {
        background: rgba(255, 255, 255, 0.15);
      }
      
      .password-input {
        width: 100%;
        padding: 10px;
        margin-bottom: 10px;
        background: rgba(0, 0, 0, 0.3);
        border: 1px solid rgba(0, 255, 136, 0.3);
        border-radius: 8px;
        color: #fff;
        font-size: 14px;
      }
      
      .password-input::placeholder {
        color: rgba(255, 255, 255, 0.5);
      }
      
      .evolution-indicator {
        position: absolute;
        top: 10px;
        right: 10px;
        padding: 5px 10px;
        background: rgba(0, 255, 136, 0.2);
        border-radius: 15px;
        color: #00ff88;
        font-size: 12px;
        font-weight: bold;
      }
      
      .improvement-report {
        background: rgba(0, 255, 136, 0.1);
        border-left: 3px solid #00ff88;
        padding: 10px;
        margin-bottom: 10px;
        border-radius: 5px;
      }
      
      .improvement-report-title {
        color: #00ff88;
        font-weight: bold;
        margin-bottom: 5px;
      }
      
      .improvement-report-text {
        color: #ffffff;
        font-size: 13px;
        line-height: 1.5;
      }
    `;
    document.head.appendChild(style);
  }

  attachEventListeners() {
    // Слухаємо події від ETERNITY модуля
    window.addEventListener('eternity-improvement-request', (event) => {
      this.showImprovementRequest(event.detail);
    });
    
    window.addEventListener('eternity-improvement-report', (event) => {
      this.showImprovementReport(event.detail);
    });
    
    window.addEventListener('eternity-status-update', (event) => {
      this.updateStatus(event.detail);
    });
  }

  showImprovementRequest(data) {
    this.show();
    
    const requestsContainer = document.getElementById('eternity-requests');
    const requestId = `request-${Date.now()}`;
    
    const requestElement = document.createElement('div');
    requestElement.className = 'improvement-request';
    requestElement.id = requestId;
    
    let detailsHTML = '';
    if (data.details && data.details.length > 0) {
      detailsHTML = `
        <div class="improvement-details">
          ${data.details.map(detail => `
            <div class="improvement-item">
              ${detail.description} (${detail.type})
            </div>
          `).join('')}
        </div>
      `;
    }
    
    const needsPassword = data.details.some(d => d.type === 'code-improvement');
    const passwordHTML = needsPassword ? `
      <input type="password" 
             class="password-input" 
             id="password-${requestId}"
             placeholder="Введіть пароль для зміни коду...">
    ` : '';
    
    requestElement.innerHTML = `
      <div class="improvement-message">${data.message}</div>
      ${detailsHTML}
      ${passwordHTML}
      <div class="improvement-actions">
        <button class="eternity-button approve-button" onclick="window.eternityUI.approveImprovement('${requestId}', ${needsPassword})">
          ✅ Застосувати
        </button>
        <button class="eternity-button reject-button" onclick="window.eternityUI.rejectImprovement('${requestId}')">
          ❌ Відхилити
        </button>
      </div>
    `;
    
    requestsContainer.appendChild(requestElement);
    this.pendingRequests.push(requestId);
    
    // Автоматично приховати через 30 секунд якщо не відповіли
    setTimeout(() => {
      if (this.pendingRequests.includes(requestId)) {
        this.rejectImprovement(requestId);
      }
    }, 30000);
  }

  showImprovementReport(data) {
    this.show();
    
    const improvementsContainer = document.getElementById('eternity-improvements');
    
    const reportElement = document.createElement('div');
    reportElement.className = 'improvement-report';
    reportElement.innerHTML = `
      <div class="improvement-report-title">
        ✨ Самовдосконалення (Рівень ${data.level})
      </div>
      <div class="improvement-report-text">
        ${data.message}
      </div>
    `;
    
    improvementsContainer.insertBefore(reportElement, improvementsContainer.firstChild);
    
    // Видалити старі звіти якщо їх більше 5
    const reports = improvementsContainer.querySelectorAll('.improvement-report');
    if (reports.length > 5) {
      reports[reports.length - 1].remove();
    }
    
    // Автоматично приховати через 10 секунд якщо немає активних запитів
    setTimeout(() => {
      if (this.pendingRequests.length === 0) {
        this.hide();
      }
    }, 10000);
  }

  updateStatus(data) {
    const statusText = document.querySelector('.status-text');
    const statusIndicator = document.querySelector('.status-indicator');
    
    if (statusText) {
      statusText.textContent = data.text || 'Моніторинг активний';
    }
    
    if (statusIndicator && data.color) {
      statusIndicator.style.background = data.color;
    }
  }

  approveImprovement(requestId, needsPassword) {
    let password = null;
    
    if (needsPassword) {
      const passwordInput = document.getElementById(`password-${requestId}`);
      password = passwordInput ? passwordInput.value : null;
      
      if (!password) {
        alert('Введіть пароль для застосування змін коду');
        return;
      }
    }
    
    // Відправляємо подію схвалення
    window.dispatchEvent(new CustomEvent('eternity-approve-improvements', {
      detail: { requestId, password }
    }));
    
    // Видаляємо запит з UI
    this.removeRequest(requestId);
  }

  rejectImprovement(requestId) {
    // Відправляємо подію відхилення
    window.dispatchEvent(new CustomEvent('eternity-reject-improvements', {
      detail: { requestId }
    }));
    
    // Видаляємо запит з UI
    this.removeRequest(requestId);
  }

  removeRequest(requestId) {
    const element = document.getElementById(requestId);
    if (element) {
      element.style.animation = 'slideOut 0.3s ease';
      setTimeout(() => element.remove(), 300);
    }
    
    this.pendingRequests = this.pendingRequests.filter(id => id !== requestId);
    
    // Приховати контейнер якщо немає активних запитів
    if (this.pendingRequests.length === 0) {
      setTimeout(() => this.hide(), 1000);
    }
  }

  show() {
    if (this.container) {
      this.container.style.display = 'block';
    }
  }

  hide() {
    if (this.container && this.pendingRequests.length === 0) {
      this.container.style.display = 'none';
    }
  }
}

// Ініціалізація при завантаженні
window.eternityUI = new EternityUI();
document.addEventListener('DOMContentLoaded', () => {
  window.eternityUI.initialize();
});
