/**
 * Application name mappings for different languages and variations
 * Used for intelligent app name normalization without hardcoding
 * 
 * @module app-mappings
 * @description Maps various app name variations to their official macOS names
 * @version 1.0.0
 * @date 2025-10-29
 */

export const APP_MAPPINGS = {
  calculator: {
    patterns: /калькулятор|calc|вычислитель|kalkulator|calculator/i,
    macosName: 'Calculator'
  },
  browser: {
    patterns: /браузер|browser|safari|chrome|firefox/i,
    macosName: 'Safari' // Default browser
  },
  textEditor: {
    patterns: /текст|text|notes|заметк|нотатк|textedit/i,
    macosName: 'TextEdit'
  },
  terminal: {
    patterns: /термінал|terminal|console|консоль/i,
    macosName: 'Terminal'
  },
  finder: {
    patterns: /файл|files|finder|папк|folder/i,
    macosName: 'Finder'
  },
  music: {
    patterns: /музик|music|itunes|apple music/i,
    macosName: 'Music'
  },
  mail: {
    patterns: /почт|пошт|mail|email/i,
    macosName: 'Mail'
  },
  photos: {
    patterns: /фото|photo|pictures|зображен/i,
    macosName: 'Photos'
  },
  preview: {
    patterns: /preview|перегляд|просмотр/i,
    macosName: 'Preview'
  },
  systemPreferences: {
    patterns: /налаштуван|настройк|settings|preferences|system/i,
    macosName: 'System Preferences'
  }
};

/**
 * Get macOS app name from various input formats
 * @param {string} appName - Input app name in any language/format
 * @returns {string} Official macOS app name or properly capitalized input
 */
export function getMacOSAppName(appName) {
  if (!appName) return appName;
  
  const normalized = appName.toLowerCase().trim();
  
  // Check against known patterns
  for (const mapping of Object.values(APP_MAPPINGS)) {
    if (normalized.match(mapping.patterns)) {
      return mapping.macosName;
    }
  }
  
  // Default: capitalize properly
  return appName.split(/\s+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * File system paths configuration
 */
export const FILE_PATHS = {
  desktop: '/Users/dev/Desktop',
  documents: '/Users/dev/Documents',
  downloads: '/Users/dev/Downloads',
  home: '/Users/dev',
  temp: '/tmp'
};

/**
 * Get full path for a location
 * @param {string} location - Location identifier (desktop, documents, etc.)
 * @param {string} filename - Optional filename to append
 * @returns {string} Full file path
 */
export function getFilePath(location = 'desktop', filename = '') {
  const basePath = FILE_PATHS[location] || FILE_PATHS.desktop;
  return filename ? `${basePath}/${filename}` : basePath;
}

export default {
  APP_MAPPINGS,
  FILE_PATHS,
  getMacOSAppName,
  getFilePath
};
