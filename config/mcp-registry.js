/**
 * MCP Registry - Централізований реєстр MCP серверів
 * Єдина точка доступу до конфігурації всіх MCP серверів
 *
 * @version 1.0.0
 * @date 2025-10-23
 */

/**
 * Browser-safe process.env access
 */
const env = typeof process !== 'undefined' ? process.env : {};

/**
 * Централізований реєстр MCP серверів
 * Всі файли мають імпортувати звідси, а не з models-config.js
 */
export const MCP_REGISTRY = {
  /**
   * Конфігурація всіх MCP серверів
   */
  servers: {
    filesystem: {
      command: 'npx',
      args: [
        '-y',
        '@modelcontextprotocol/server-filesystem',
        '/Users/dev/Desktop',
        '/Users/dev/Documents',
        '/tmp'
      ],
      env: {},
      description: 'File system operations (read, write, create, delete)',
      enabled: true
    },

    playwright: {
      command: 'npx',
      args: ['-y', '@executeautomation/playwright-mcp-server'],
      env: {
        HEADLESS: 'true'
      },
      description: 'Browser automation and web scraping',
      enabled: true
    },

    shell: {
      command: 'npx',
      args: ['-y', 'super-shell-mcp'],
      env: {
        SHELL: env.SHELL || '/bin/zsh'
      },
      description: 'Shell command execution',
      enabled: true
    },

    applescript: {
      command: 'npx',
      args: ['-y', '@peakmojo/applescript-mcp'],
      env: {},
      description: 'macOS automation via AppleScript',
      enabled: true
    },

    memory: {
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-memory'],
      env: {},
      description: 'Persistent memory storage',
      enabled: true
    },

    java_sdk: {
      command: 'npx',
      args: [
        '-y',
        '@modelcontextprotocol/server-java'
      ],
      env: {
        JAVA_HOME: env.JAVA_HOME || '/usr/libexec/java_home'
      },
      description: 'Java development tools and code execution (disabled - package not available)',
      enabled: false
    },

    python_sdk: {
      command: 'npx',
      args: [
        '-y',
        '@modelcontextprotocol/server-python'
      ],
      env: {
        PYTHON_ENV: 'production'
      },
      description: 'Python development tools and code execution (disabled - package not available)',
      enabled: false
    }
  },

  /**
   * Отримати конфігурацію конкретного сервера
   * @param {string} name - Назва сервера
   * @returns {Object|null} Конфігурація сервера або null
   */
  getServer(name) {
    const server = this.servers[name];
    if (!server) {
      return null;
    }
    return { ...server }; // Повернути копію
  },

  /**
   * Отримати всі сервери
   * @returns {Object} Об'єкт з усіма серверами
   */
  getAllServers() {
    return { ...this.servers };
  },

  /**
   * Отримати тільки увімкнені сервери
   * @returns {Object} Об'єкт з увімкненими серверами
   */
  getEnabledServers() {
    const enabled = {};
    for (const [name, config] of Object.entries(this.servers)) {
      if (config.enabled !== false) {
        enabled[name] = { ...config };
      }
    }
    return enabled;
  },

  /**
   * Отримати список назв серверів
   * @param {boolean} onlyEnabled - Тільки увімкнені сервери
   * @returns {Array<string>} Масив назв серверів
   */
  getServerNames(onlyEnabled = false) {
    if (onlyEnabled) {
      return Object.keys(this.servers).filter(
        name => this.servers[name].enabled !== false
      );
    }
    return Object.keys(this.servers);
  },

  /**
   * Перевірити чи сервер існує
   * @param {string} name - Назва сервера
   * @returns {boolean}
   */
  hasServer(name) {
    return name in this.servers;
  },

  /**
   * Перевірити чи сервер увімкнений
   * @param {string} name - Назва сервера
   * @returns {boolean}
   */
  isServerEnabled(name) {
    const server = this.servers[name];
    return server && server.enabled !== false;
  },

  /**
   * Валідувати конфігурацію сервера
   * @param {string} name - Назва сервера
   * @returns {Object} {valid: boolean, errors: Array}
   */
  validateServer(name) {
    const errors = [];
    const server = this.servers[name];

    if (!server) {
      return { valid: false, errors: [`Server '${name}' not found in registry`] };
    }

    // Перевірка обов'язкових полів
    if (!server.command) {
      errors.push(`Server '${name}': missing 'command' field`);
    }

    if (!Array.isArray(server.args)) {
      errors.push(`Server '${name}': 'args' must be an array`);
    }

    if (server.env && typeof server.env !== 'object') {
      errors.push(`Server '${name}': 'env' must be an object`);
    }

    return {
      valid: errors.length === 0,
      errors
    };
  },

  /**
   * Валідувати всі сервери в реєстрі
   * @returns {Object} {valid: boolean, errors: Array}
   */
  validateAll() {
    const allErrors = [];

    for (const name of Object.keys(this.servers)) {
      const validation = this.validateServer(name);
      if (!validation.valid) {
        allErrors.push(...validation.errors);
      }
    }

    return {
      valid: allErrors.length === 0,
      errors: allErrors
    };
  },

  /**
   * Отримати статистику реєстру
   * @returns {Object}
   */
  getStats() {
    const total = Object.keys(this.servers).length;
    const enabled = this.getServerNames(true).length;
    const disabled = total - enabled;

    return {
      total,
      enabled,
      disabled,
      servers: this.getServerNames()
    };
  }
};

/**
 * Валідація реєстру при імпорті
 */
const validation = MCP_REGISTRY.validateAll();
if (!validation.valid) {
  console.error('[MCP Registry] ❌ Configuration errors:');
  validation.errors.forEach(err => console.error(`  - ${err}`));
  throw new Error('MCP Registry validation failed');
}

/**
 * Backward compatibility exports
 */
export const MCP_SERVERS = MCP_REGISTRY.getAllServers();

/**
 * Helper functions для зручності
 */
export function getMCPServer(name) {
  return MCP_REGISTRY.getServer(name);
}

export function getMCPServerNames(onlyEnabled = false) {
  return MCP_REGISTRY.getServerNames(onlyEnabled);
}

export function isMCPServerEnabled(name) {
  return MCP_REGISTRY.isServerEnabled(name);
}

// Log успішної ініціалізації
if (typeof console !== 'undefined') {
  const stats = MCP_REGISTRY.getStats();
  console.log(`[MCP Registry] ✅ Initialized: ${stats.enabled}/${stats.total} servers enabled`);
}
