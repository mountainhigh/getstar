// 本地存储工具

const STORAGE_PREFIX = 'getstar_';

/**
 * 设置存储
 */
function setStorage(key, value) {
  try {
    wx.setStorageSync(STORAGE_PREFIX + key, value);
    return true;
  } catch (err) {
    console.error('存储失败:', err);
    return false;
  }
}

/**
 * 获取存储
 */
function getStorage(key, defaultValue = null) {
  try {
    const value = wx.getStorageSync(STORAGE_PREFIX + key);
    return value !== '' ? value : defaultValue;
  } catch (err) {
    console.error('获取存储失败:', err);
    return defaultValue;
  }
}

/**
 * 删除存储
 */
function removeStorage(key) {
  try {
    wx.removeStorageSync(STORAGE_PREFIX + key);
    return true;
  } catch (err) {
    console.error('删除存储失败:', err);
    return false;
  }
}

/**
 * 清空所有存储
 */
function clearStorage() {
  try {
    wx.clearStorageSync();
    return true;
  } catch (err) {
    console.error('清空存储失败:', err);
    return false;
  }
}

/**
 * 获取存储信息
 */
function getStorageInfo() {
  try {
    return wx.getStorageInfoSync();
  } catch (err) {
    console.error('获取存储信息失败:', err);
    return null;
  }
}

module.exports = {
  setStorage,
  getStorage,
  removeStorage,
  clearStorage,
  getStorageInfo
};
