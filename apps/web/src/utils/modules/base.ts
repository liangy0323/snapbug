/**
 * 判断文本能否被解析为 JSON。
 * @param content 待解析的文本
 * @returns 文本为有效 JSON 时返回 true
 */
export const isJSONString = (content: string): boolean => {
  try {
    JSON.parse(content);
    return true;
  } catch {
    return false;
  }
};

/**
 * 去除文本首尾的空白字符。
 * @param str 原始文本
 * @returns 去除首尾空白后的文本
 */
export const trimString = (str: string): string => {
  return str.trim();
};

/**
 * 获取 URL 查询参数
 * @param name 参数名
 * @param search 查询字符串，未传时优先读取当前页面 search，并兼容 hash 查询参数
 * @returns 查询值，缺失时返回空字符串
 */
export const getUrlQueryValue = (name: string, search?: string): string => {
  if (search === undefined && typeof window !== 'undefined') {
    const { hash, search: locationSearch } = window.location;
    const queryStart = hash.indexOf('?');
    search = locationSearch || (queryStart === -1 ? '' : hash.slice(queryStart));
  }
  return new URLSearchParams(search).get(name) ?? '';
};
