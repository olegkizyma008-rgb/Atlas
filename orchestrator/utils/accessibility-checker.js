import { exec } from 'child_process';
import util from 'util';

const execAsync = util.promisify(exec);

class AccessibilityChecker {
    constructor({ logger, config }) {
        this.logger = logger;
        this.config = config;
    }

    isMac() {
        return process.platform === 'darwin';
    }

    async isAccessibilityEnabled() {
        if (!this.isMac()) return true; // non-mac: treat as enabled
        try {
            const { stdout } = await execAsync(`osascript -e 'tell application "System Events" to return UI elements enabled'`);
            const out = stdout.trim().toLowerCase();
            return out === 'true' || out.includes('true');
        } catch (err) {
            this.logger?.warn?.('startup', `Accessibility check failed: ${err?.message || err}`);
            return false;
        }
    }

    async displayDialog(message, buttons = ['Open Settings', 'Skip']) {
        try {
            const buttonsApple = `{${buttons.map(b => `"${b.replace(/"/g, '\\"')}"`).join(', ')}}`;
            const defaultButton = buttons[0].replace(/"/g, '\\"');
            const safeMessage = message.replace(/"/g, '\\"');
            const as = `display dialog "${safeMessage}" buttons ${buttonsApple} default button "${defaultButton}"`;
            const { stdout } = await execAsync(`osascript -e '${as}'`);
            const match = stdout.trim().match(/button returned:(.*)/i);
            if (match) return match[1].trim();
            return null;
        } catch (err) {
            this.logger?.warn?.('startup', `Dialog failed: ${err?.message || err}`);
            return null;
        }
    }

    async openSettings(section = 'accessibility') {
        const urls = {
            accessibility: 'x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility',
            screenrecording: 'x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenRecording'
        };
        const url = urls[section] || urls.accessibility;
        try {
            await execAsync(`open "${url}"`);
            this.logger?.system?.('startup', `[DI] Opened System Settings: ${url}`);
        } catch (err) {
            this.logger?.warn?.('startup', `Failed to open System Settings (${url}): ${err?.message || err}`);
        }
    }

    async checkAndPrompt() {
        const servers = Object.keys(this.config?.AI_BACKEND_CONFIG?.providers?.mcp?.servers || {});
        const need = servers.filter(s => ['applescript', 'playwright'].includes(s));

        if (!this.isMac()) {
            this.logger?.system?.('startup', '[DI] AccessibilityChecker: non-macOS — skipping accessibility checks');
            return { ok: true, reason: 'not-mac' };
        }

        if (need.length === 0) {
            this.logger?.system?.('startup', '[DI] AccessibilityChecker: no accessibility-required MCP servers configured');
            return { ok: true, reason: 'no-servers' };
        }

        this.logger?.system?.('startup', `[DI] AccessibilityChecker: MCP servers requiring accessibility: ${need.join(', ')}`);

        if (await this.isAccessibilityEnabled()) {
            this.logger?.system?.('startup', '[DI] AccessibilityChecker: Accessibility appears enabled');
            return { ok: true };
        }

        this.logger?.warn?.('startup', '[DI] AccessibilityChecker: Accessibility permissions not granted — prompting user');

        const message = `ATLAS needs Accessibility (and Screen Recording) permissions to run MCP servers: ${need.join(', ')}.\n\nOpen System Settings to grant permissions now?`;
        const choice = await this.displayDialog(message, ['Open Settings', 'Skip']);

        if (choice === 'Open Settings') {
            await this.openSettings('accessibility');
            await this.openSettings('screenrecording');

            const cont = await this.displayDialog('After granting permissions, click Continue. If you did not grant them, choose Skip.', ['Continue', 'Skip']);
            if (cont === 'Continue') {
                const maxAttempts = 15;
                for (let i = 0; i < maxAttempts; i++) {
                    await new Promise(r => setTimeout(r, 2000));
                    if (await this.isAccessibilityEnabled()) {
                        this.logger?.system?.('startup', '[DI] AccessibilityChecker: Permissions detected as granted');
                        return { ok: true };
                    }
                    this.logger?.system?.('startup', `[DI] AccessibilityChecker: Waiting for permission... (${i + 1}/${maxAttempts})`);
                }
                this.logger?.warn?.('startup', '[DI] AccessibilityChecker: Permissions still not granted after waiting');
                return { ok: false, reason: 'not-granted' };
            }
            this.logger?.warn?.('startup', '[DI] AccessibilityChecker: User skipped after opening settings');
            return { ok: false, reason: 'user-skip' };
        }

        this.logger?.warn?.('startup', '[DI] AccessibilityChecker: User chose Skip — continuing without accessibility');
        return { ok: false, reason: 'user-skip' };
    }
}

export default AccessibilityChecker;
