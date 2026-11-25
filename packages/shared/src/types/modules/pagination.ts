/**
 * 分页查询基础参数
 */
export interface PaginationParams {
  /**
   * 当前页码，从 1 开始
   */
  page: number;

  /**
   * 每页记录数
   */
  pageSize: number;
}

/**
 * 分页列表统一响应结构
 *
 * @template TItem 单条列表项类型
 */
export interface PaginationResult<TItem> extends PaginationParams {
  /**
   * 当前页数据列表
   */
  items: TItem[];

  /**
   * 符合筛选条件的记录总数
   */
  total: number;
}
