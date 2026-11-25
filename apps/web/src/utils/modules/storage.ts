/**
 * 将应用数据序列化为 JSON 并写入 localStorage。
 * @param key 应用拥有的存储键
 * @param value 可序列化的数据
 * @throws 序列化失败、存储不可用或超出配额时抛出异常
 */
export const setLocalStorage = <T>(key: string, value: T): void => {
  window.localStorage.setItem(key, JSON.stringify(value));
};

/**
 * 读取并解析应用保存的 JSON 数据。
 * @param key 应用拥有的存储键
 * @returns 解析后的数据，未保存、解析失败或无法访问时返回 null
 */
export const getLocalStorage = <T>(key: string): T | null => {
  if (typeof window === 'undefined') return null;
  try {
    const data = window.localStorage.getItem(key);
    return data ? (JSON.parse(data) as T) : null;
  } catch {
    return null;
  }
};

/**
 * 移除一个应用存储项。
 * @param key 应用拥有的存储键
 * @throws 无法访问 localStorage 时抛出异常
 */
export const removeLocalStorage = (key: string): void => {
  window.localStorage.removeItem(key);
};
