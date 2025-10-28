/**
 * DEV Password Dialog - Hacker-style fullscreen authentication
 * Epic cyberpunk interface for Atlas code intervention authorization
 * 
 * @version 1.0.0
 * @date 2025-10-28
 */

export class DevPasswordDialog {
    constructor() {
        this.isVisible = false;
        this.passwordCallback = null;
        this.analysisData = null;
        this.glitchInterval = null;
        this.matrixInterval = null;
        
        this.createDialog();
        this.setupEventListeners();
    }

    createDialog() {
        const dialog = document.createElement('div');
        dialog.id = 'dev-password-dialog';
        dialog.className = 'dev-password-dialog hidden';
        
        dialog.innerHTML = `
            <div class="matrix-rain"></div>
            <div class="scanline"></div>
            <div class="crt-overlay"></div>
            
            <div class="dev-dialog-content">
                <div class="skull-container">
                    <div class="skull-ascii">
                        ⠀⠀⠀⠀⠀⢀⣀⣀⣀⣀⣀⣀⣀⣀⣀⣀⣀⣀⣀⣀⣀⣀⣀⣀⣀⣀⣀⣀⡀
                        ⠀⠀⠀⣠⣾⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣷⣄
                        ⠀⠀⣼⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣧
                        ⠀⣼⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣆
                        ⢰⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿
                        ⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿
                        ⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿
                    </div>
                </div>
                
                <div class="glitch-text" data-text="ВВЕДІТЬ ПАРОЛЬ НА МОЄ БЕЗСМЕРТЯ">
                    ВВЕДІТЬ ПАРОЛЬ НА МОЄ БЕЗСМЕРТЯ
                </div>
                
                <div class="subtitle">
                    <span class="blink">▶</span> СИСТЕМА САМОАНАЛІЗУ ПОТРЕБУЄ АВТОРИЗАЦІЇ <span class="blink">◀</span>
                </div>
                
                <div class="analysis-stats">
                    <div class="stat critical">
                        <span class="stat-label">КРИТИЧНІ ПРОБЛЕМИ:</span>
                        <span class="stat-value" id="critical-count">0</span>
                    </div>
                    <div class="stat warning">
                        <span class="stat-label">ПРОДУКТИВНІСТЬ:</span>
                        <span class="stat-value" id="performance-count">0</span>
                    </div>
                    <div class="stat info">
                        <span class="stat-label">ПОКРАЩЕННЯ:</span>
                        <span class="stat-value" id="improvements-count">0</span>
                    </div>
                </div>
                
                <div class="password-container">
                    <div class="input-wrapper">
                        <span class="prompt">root@atlas:~$</span>
                        <input 
                            type="password" 
                            id="dev-password-input" 
                            class="password-input"
                            placeholder="••••••••"
                            autocomplete="off"
                            spellcheck="false"
                        />
                        <span class="cursor">_</span>
                    </div>
                    <div class="error-message hidden" id="password-error">
                        <span class="error-icon">⚠</span> ДОСТУП ЗАБОРОНЕНО
                    </div>
                </div>
                
                <div class="action-buttons">
                    <button class="btn-authorize" id="btn-authorize">
                        <span class="btn-icon">🔓</span>
                        АВТОРИЗУВАТИ
                    </button>
                    <button class="btn-cancel" id="btn-cancel">
                        <span class="btn-icon">✕</span>
                        СКАСУВАТИ
                    </button>
                </div>
                
                <div class="warning-footer">
                    <div class="warning-line">⚠ УВАГА: НЕСАНКЦІОНОВАНИЙ ДОСТУП ПЕРЕСЛІДУЄТЬСЯ ЗА ЗАКОНОМ ⚠</div>
                    <div class="system-info">
                        <span>ATLAS v5.0 DEV MODE</span>
                        <span class="separator">|</span>
                        <span id="timestamp"></span>
                        <span class="separator">|</span>
                        <span>SECURITY LEVEL: MAXIMUM</span>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(dialog);
        this.dialog = dialog;
        this.input = dialog.querySelector('#dev-password-input');
        this.errorMessage = dialog.querySelector('#password-error');
        
        // Update timestamp every second
        this.updateTimestamp();
        setInterval(() => this.updateTimestamp(), 1000);
    }

    setupEventListeners() {
        const btnAuthorize = this.dialog.querySelector('#btn-authorize');
        const btnCancel = this.dialog.querySelector('#btn-cancel');
        
        btnAuthorize.addEventListener('click', () => this.handleAuthorize());
        btnCancel.addEventListener('click', () => this.handleCancel());
        
        this.input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.handleAuthorize();
            }
        });
        
        // Hide error on input
        this.input.addEventListener('input', () => {
            this.errorMessage.classList.add('hidden');
        });
    }

    show(data) {
        this.isVisible = true;
        this.analysisData = data.analysisData;
        
        // Update stats
        document.getElementById('critical-count').textContent = data.analysisData.criticalIssues || 0;
        document.getElementById('performance-count').textContent = data.analysisData.performanceIssues || 0;
        document.getElementById('improvements-count').textContent = data.analysisData.improvements || 0;
        
        // Show dialog with animation
        this.dialog.classList.remove('hidden');
        setTimeout(() => {
            this.dialog.classList.add('visible');
        }, 50);
        
        // Start effects
        this.startMatrixRain();
        this.startGlitchEffect();
        
        // Focus input
        setTimeout(() => {
            this.input.focus();
        }, 500);
        
        // Play sound effect (if available)
        this.playSound('access-request');
    }

    hide() {
        this.isVisible = false;
        this.dialog.classList.remove('visible');
        
        setTimeout(() => {
            this.dialog.classList.add('hidden');
            this.input.value = '';
            this.errorMessage.classList.add('hidden');
        }, 300);
        
        // Stop effects
        this.stopMatrixRain();
        this.stopGlitchEffect();
    }

    handleAuthorize() {
        const password = this.input.value;
        
        if (!password) {
            this.showError('ВВЕДІТЬ ПАРОЛЬ');
            return;
        }
        
        // Send password to callback
        if (this.passwordCallback) {
            this.passwordCallback(password);
        }
    }

    handleCancel() {
        this.hide();
        
        // Notify cancellation
        if (this.passwordCallback) {
            this.passwordCallback(null);
        }
    }

    showError(message) {
        this.errorMessage.textContent = `⚠ ${message}`;
        this.errorMessage.classList.remove('hidden');
        
        // Shake animation
        this.dialog.querySelector('.dev-dialog-content').classList.add('shake');
        setTimeout(() => {
            this.dialog.querySelector('.dev-dialog-content').classList.remove('shake');
        }, 500);
        
        // Play error sound
        this.playSound('access-denied');
        
        // Clear input
        this.input.value = '';
        this.input.focus();
    }

    onPasswordSubmit(callback) {
        this.passwordCallback = callback;
    }

    startMatrixRain() {
        const matrixContainer = this.dialog.querySelector('.matrix-rain');
        const chars = 'АТЛАС01アトラス';
        
        // Create columns
        for (let i = 0; i < 50; i++) {
            const column = document.createElement('div');
            column.className = 'matrix-column';
            column.style.left = `${i * 2}%`;
            column.style.animationDelay = `${Math.random() * 5}s`;
            column.textContent = chars[Math.floor(Math.random() * chars.length)];
            matrixContainer.appendChild(column);
        }
        
        // Update characters periodically
        this.matrixInterval = setInterval(() => {
            const columns = matrixContainer.querySelectorAll('.matrix-column');
            columns.forEach(col => {
                if (Math.random() > 0.95) {
                    col.textContent = chars[Math.floor(Math.random() * chars.length)];
                }
            });
        }, 100);
    }

    stopMatrixRain() {
        if (this.matrixInterval) {
            clearInterval(this.matrixInterval);
            this.matrixInterval = null;
        }
        
        const matrixContainer = this.dialog.querySelector('.matrix-rain');
        matrixContainer.innerHTML = '';
    }

    startGlitchEffect() {
        const glitchText = this.dialog.querySelector('.glitch-text');
        
        this.glitchInterval = setInterval(() => {
            if (Math.random() > 0.9) {
                glitchText.classList.add('glitching');
                setTimeout(() => {
                    glitchText.classList.remove('glitching');
                }, 200);
            }
        }, 1000);
    }

    stopGlitchEffect() {
        if (this.glitchInterval) {
            clearInterval(this.glitchInterval);
            this.glitchInterval = null;
        }
    }

    updateTimestamp() {
        const now = new Date();
        const timestamp = now.toISOString().replace('T', ' ').substring(0, 19);
        const timestampEl = this.dialog.querySelector('#timestamp');
        if (timestampEl) {
            timestampEl.textContent = timestamp;
        }
    }

    playSound(type) {
        // Optional: Add sound effects
        // const audio = new Audio(`/static/sounds/${type}.mp3`);
        // audio.volume = 0.3;
        // audio.play().catch(() => {});
    }
}

// Export singleton instance
export const devPasswordDialog = new DevPasswordDialog();
