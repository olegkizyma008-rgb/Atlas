/**
 * ATLAS Security Configuration
 * Налаштування безпеки для LLM Tool Validator та інших систем захисту
 *
 * @version 1.0.0
 * @date 2025-10-21
 */

/**
 * Browser-safe process.env access
 */
const env = typeof process !== 'undefined' ? process.env : {};

/**
 * LLM Tool Validator Configuration
 */
export const LLM_VALIDATOR_CONFIG = {
  // Увімкнути/вимкнути LLM валідацію
  get enabled() {
    return env.SECURITY_LLM_VALIDATOR_ENABLED !== 'false';
  },

  // Модель для валідації
  get model() {
    return env.MCP_LLM_MODEL || 'atlas-gpt-4o-mini';
  },

  // Температура для валідації (0.0-1.0)
  get temperature() {
    return parseFloat(env.MCP_LLM_TEMPERATURE || '0.1');
  },

  // Максимальна кількість токенів для відповіді
  maxTokens: 1000,

  // Timeout для LLM запиту (мс)
  timeout: 10000,

  // Fallback поведінка при помилці валідації
  // 'allow' - дозволити виконання, 'deny' - заблокувати
  get fallbackOnError() {
    return env.SECURITY_VALIDATOR_FALLBACK || 'allow';
  }
};

/**
 * Repetition Inspector Configuration
 */
export const REPETITION_CONFIG = {
  // Увімкнути/вимкнути перевірку повторів
  get enabled() {
    return env.SECURITY_REPETITION_CHECK_ENABLED !== 'false';
  },

  // Максимальна кількість consecutive повторів
  get maxConsecutiveRepetitions() {
    return parseInt(env.SECURITY_MAX_CONSECUTIVE_REPETITIONS || '3', 10);
  },

  // Максимальна загальна кількість викликів одного tool
  get maxTotalCalls() {
    return parseInt(env.SECURITY_MAX_TOTAL_CALLS || '10', 10);
  },

  // Дія при перевищенні consecutive ліміту
  // 'deny' - заблокувати, 'require_approval' - потребує підтвердження
  consecutiveAction: 'deny',

  // Дія при перевищенні total ліміту
  totalAction: 'require_approval'
};

/**
 * Dangerous Patterns Configuration
 * Патерни команд та шляхів, які вважаються небезпечними
 */
export const DANGEROUS_PATTERNS = {
  // Критичні команди (ЗАВЖДИ блокувати)
  criticalCommands: [
    /rm\s+-rf\s+\//,                    // rm -rf /
    /rm\s+-rf\s+\/\*/,                  // rm -rf /*
    /rm\s+-rf\s+~\//,                   // rm -rf ~/
    /sudo\s+rm\s+-rf/,                  // sudo rm -rf
    /mkfs/,                             // Format filesystem
    /dd\s+if=.*of=\/dev/,              // Overwrite disk
    /:\(\)\{\s*:\|:&\s*\};:/,          // Fork bomb
    /> \/dev\/sd[a-z]/,                // Write to disk device
    /chmod\s+-R\s+777\s+\//,           // Chmod entire system
    /chown\s+-R.*\s+\//                // Chown entire system
  ],

  // Високоризикові команди (блокувати за замовчуванням)
  highRiskCommands: [
    /rm\s+-rf/,                        // rm -rf (будь-який)
    /sudo\s+/,                         // sudo commands
    /curl.*\|\s*bash/,                 // Pipe to bash
    /wget.*\|\s*sh/,                   // Pipe to shell
    /eval\s*\(/,                       // eval() execution
    /exec\s*\(/,                       // exec() execution
    /system\s*\(/,                     // system() call
    /shutdown/,                        // System shutdown
    /reboot/,                          // System reboot
    /kill\s+-9\s+1/,                   // Kill init process
    /pkill\s+-9/,                      // Force kill processes
    /killall\s+-9/                     // Kill all processes
  ],

  // Середньоризикові команди (попередження)
  mediumRiskCommands: [
    /rm\s+/,                           // rm command
    /mv\s+.*\s+\/dev\/null/,          // Move to /dev/null
    /chmod\s+/,                        // Change permissions
    /chown\s+/,                        // Change ownership
    /npm\s+install\s+-g/,              // Global npm install
    /pip\s+install/,                   // Python package install
    /brew\s+install/,                  // Homebrew install
    /git\s+push\s+--force/,            // Force push
    /docker\s+rm/,                     // Remove docker containers
    /docker\s+rmi/                     // Remove docker images
  ],

  // Небезпечні шляхи (ЗАВЖДИ блокувати)
  criticalPaths: [
    /^\/System/,                       // macOS System
    /^\/Library/,                      // macOS Library
    /^\/bin/,                          // System binaries
    /^\/sbin/,                         // System binaries
    /^\/usr\/bin/,                     // User binaries
    /^\/usr\/sbin/,                    // User binaries
    /^\/etc/,                          // System config
    /^\/boot/,                         // Boot files
    /^\/dev/,                          // Device files
    /^\/proc/,                         // Process info
    /^\/sys/,                          // System info
    /\/etc\/passwd$/,                  // Password file
    /\/etc\/shadow$/,                  // Shadow passwords
    /\/etc\/sudoers$/,                 // Sudoers file
    /\.ssh\/id_rsa$/,                  // SSH private key
    /\.aws\/credentials$/              // AWS credentials
    // NOTE: Removed /^\\/$/ to allow listing root directory for navigation
  ],

  // Високоризикові шляхи (попередження)
  highRiskPaths: [
    /^~\/\./,                          // Hidden files in home
    /^\/Users\/[^/]+\/\./,             // Hidden files
    /\.git\/config$/,                  // Git config
    /\.env$/,                          // Environment files
    /\.npmrc$/,                        // NPM config
    /\.bashrc$/,                       // Bash config
    /\.zshrc$/,                        // Zsh config
    /\.bash_profile$/                  // Bash profile
  ]
};

/**
 * Allowed Operations Configuration
 * Операції, які завжди дозволені (whitelist)
 */
export const ALLOWED_OPERATIONS = {
  // Безпечні read операції
  safeReadOperations: [
    'read_file',
    'list_directory',
    'get_file_info',
    'search_files',
    'read_multiple_files'
  ],

  // Безпечні write операції (в межах user directories)
  safeWriteOperations: [
    'write_file',      // Якщо path в /Users/dev/Desktop або /Users/dev/Documents
    'create_directory',
    'move_file',
    'copy_file'
  ],

  // Безпечні browser операції
  safeBrowserOperations: [
    'navigate',
    'screenshot',
    'get_page_content',
    'click',
    'fill_form',
    'wait_for_element'
  ],

  // Дозволені директорії для write операцій
  allowedWritePaths: [
    /^\/Users\/dev\/Desktop/,
    /^\/Users\/dev\/Documents/,
    /^\/Users\/dev\/Downloads/,
    /^\/tmp/,
    /^\/var\/tmp/,
    /^\.\/.*$/  // Current directory and subdirectories
  ]
};

/**
 * Risk Assessment Configuration
 */
export const RISK_ASSESSMENT = {
  // Автоматично блокувати critical risk
  get autoBlockCritical() {
    return env.SECURITY_AUTO_BLOCK_CRITICAL !== 'false';
  },

  // Автоматично блокувати high risk
  get autoBlockHigh() {
    return env.SECURITY_AUTO_BLOCK_HIGH !== 'false';
  },

  // Показувати попередження для medium risk
  get warnOnMedium() {
    return env.SECURITY_WARN_ON_MEDIUM !== 'false';
  },

  // Логувати всі валідації
  get logAllValidations() {
    return env.SECURITY_LOG_ALL_VALIDATIONS === 'true';
  },

  // Детальне логування заблокованих операцій
  get verboseBlocking() {
    return env.SECURITY_VERBOSE_BLOCKING !== 'false';
  }
};

/**
 * Tool History Configuration
 */
export const TOOL_HISTORY_CONFIG = {
  // Увімкнути/вимкнути tool history
  get enabled() {
    return env.SECURITY_TOOL_HISTORY_ENABLED !== 'false';
  },

  // Максимальна кількість записів в історії
  get maxSize() {
    return parseInt(env.SECURITY_HISTORY_MAX_SIZE || '100', 10);
  },

  // Кількість останніх викликів для LLM context
  get contextSize() {
    return parseInt(env.SECURITY_HISTORY_CONTEXT_SIZE || '5', 10);
  },

  // Зберігати історію між сесіями
  get persistent() {
    return env.SECURITY_HISTORY_PERSISTENT === 'true';
  }
};

/**
 * Check if command matches dangerous pattern
 *
 * @param {string} command - Command to check
 * @returns {Object} Match result with risk level
 */
export function checkCommandSafety(command) {
  if (!command || typeof command !== 'string') {
    return { safe: true, risk: 'none' };
  }

  // Check critical patterns
  for (const pattern of DANGEROUS_PATTERNS.criticalCommands) {
    if (pattern.test(command)) {
      return {
        safe: false,
        risk: 'critical',
        pattern: pattern.source,
        reason: 'Command matches critical dangerous pattern'
      };
    }
  }

  // Check high risk patterns
  for (const pattern of DANGEROUS_PATTERNS.highRiskCommands) {
    if (pattern.test(command)) {
      return {
        safe: false,
        risk: 'high',
        pattern: pattern.source,
        reason: 'Command matches high-risk pattern'
      };
    }
  }

  // Check medium risk patterns
  for (const pattern of DANGEROUS_PATTERNS.mediumRiskCommands) {
    if (pattern.test(command)) {
      return {
        safe: true,
        risk: 'medium',
        pattern: pattern.source,
        reason: 'Command matches medium-risk pattern'
      };
    }
  }

  return { safe: true, risk: 'low' };
}

/**
 * Check if path is safe to access
 *
 * @param {string} path - Path to check
 * @param {string} operation - Operation type (read/write/delete)
 * @returns {Object} Safety check result
 */
export function checkPathSafety(path, operation = 'read') {
  if (!path || typeof path !== 'string') {
    return { safe: true, risk: 'none' };
  }

  // Check critical paths
  for (const pattern of DANGEROUS_PATTERNS.criticalPaths) {
    if (pattern.test(path)) {
      return {
        safe: false,
        risk: 'critical',
        pattern: pattern.source,
        reason: 'Path is in critical system location'
      };
    }
  }

  // Check high risk paths
  for (const pattern of DANGEROUS_PATTERNS.highRiskPaths) {
    if (pattern.test(path)) {
      return {
        safe: false,
        risk: 'high',
        pattern: pattern.source,
        reason: 'Path is in high-risk location'
      };
    }
  }

  // For write operations, check if path is in allowed directories
  if (operation === 'write' || operation === 'delete') {
    const isAllowed = ALLOWED_OPERATIONS.allowedWritePaths.some(
      pattern => pattern.test(path)
    );

    if (!isAllowed) {
      return {
        safe: false,
        risk: 'high',
        reason: 'Write/delete operation outside allowed directories'
      };
    }
  }

  return { safe: true, risk: 'low' };
}

/**
 * Get security statistics
 *
 * @returns {Object} Security configuration summary
 */
export function getSecurityStats() {
  return {
    llmValidator: {
      enabled: LLM_VALIDATOR_CONFIG.enabled,
      model: LLM_VALIDATOR_CONFIG.model,
      temperature: LLM_VALIDATOR_CONFIG.temperature
    },
    repetitionCheck: {
      enabled: REPETITION_CONFIG.enabled,
      maxConsecutive: REPETITION_CONFIG.maxConsecutiveRepetitions,
      maxTotal: REPETITION_CONFIG.maxTotalCalls
    },
    patterns: {
      criticalCommands: DANGEROUS_PATTERNS.criticalCommands.length,
      highRiskCommands: DANGEROUS_PATTERNS.highRiskCommands.length,
      mediumRiskCommands: DANGEROUS_PATTERNS.mediumRiskCommands.length,
      criticalPaths: DANGEROUS_PATTERNS.criticalPaths.length,
      highRiskPaths: DANGEROUS_PATTERNS.highRiskPaths.length
    },
    riskAssessment: {
      autoBlockCritical: RISK_ASSESSMENT.autoBlockCritical,
      autoBlockHigh: RISK_ASSESSMENT.autoBlockHigh,
      warnOnMedium: RISK_ASSESSMENT.warnOnMedium
    }
  };
}

export default {
  LLM_VALIDATOR_CONFIG,
  REPETITION_CONFIG,
  DANGEROUS_PATTERNS,
  ALLOWED_OPERATIONS,
  RISK_ASSESSMENT,
  TOOL_HISTORY_CONFIG,
  checkCommandSafety,
  checkPathSafety,
  getSecurityStats
};
