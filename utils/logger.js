// 日志工具
const DEBUG = true; // 生产环境设置为 false

/**
 * 调试日志 - 仅开发环境输出
 */
function debugLog(...args) {
  if (DEBUG) {
    console.log('[DEBUG]', ...args);
  }
}

/**
 * 信息日志 - 仅开发环境输出
 */
function infoLog(...args) {
  if (DEBUG) {
    console.info('[INFO]', ...args);
  }
}

/**
 * 警告日志 - 始终输出
 */
function warnLog(...args) {
  console.warn('[WARN]', ...args);
}

/**
 * 错误日志 - 始终输出
 */
function errorLog(...args) {
  console.error('[ERROR]', ...args);
}

/**
 * 云函数日志 - 仅开发环境输出
 */
function cloudLog(...args) {
  if (DEBUG) {
    console.log('[CLOUD]', ...args);
  }
}

module.exports = {
  debug: debugLog,
  info: infoLog,
  warn: warnLog,
  error: errorLog,
  cloud: cloudLog
};
