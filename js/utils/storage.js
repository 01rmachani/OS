/* =========================================================
   BrowserOS — Storage Utilities
   Helper wrappers for localStorage settings persistence
   ========================================================= */

/**
 * Get a value from localStorage with a default fallback.
 */
export function getStorageItem(key, defaultValue = null) {
  try {
    const val = localStorage.getItem('os_' + key);
    return val !== null ? val : defaultValue;
  } catch {
    return defaultValue;
  }
}

/**
 * Set a value in localStorage.
 */
export function setStorageItem(key, value) {
  try {
    localStorage.setItem('os_' + key, String(value));
  } catch (e) {
    console.warn('localStorage write failed:', e);
  }
}

/**
 * Remove a value from localStorage.
 */
export function removeStorageItem(key) {
  try {
    localStorage.removeItem('os_' + key);
  } catch {}
}

/**
 * Get all BrowserOS settings as an object.
 */
export function getAllSettings() {
  const keys = ['theme', 'accent_idx', 'wallpaper', 'font_size', 'taskbar_pos', 'glass', 'animations'];
  const result = {};
  keys.forEach(k => { result[k] = getStorageItem(k); });
  return result;
}

/**
 * Reset all BrowserOS settings.
 */
export function resetAllSettings() {
  const keys = ['theme', 'accent_idx', 'wallpaper', 'font_size', 'taskbar_pos', 'glass', 'animations', 'anthropic_key', 'ai_model'];
  keys.forEach(k => removeStorageItem(k));
}
