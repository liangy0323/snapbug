import type { BarSeriesOption, LineSeriesOption, PieSeriesOption } from 'echarts/charts';
import type {
  GridComponentOption,
  LegendComponentOption,
  MarkLineComponentOption,
  TooltipComponentOption,
} from 'echarts/components';
import type { ComposeOption, EChartsInitOpts, EChartsType } from 'echarts/core';

/**
 * 当前公共模块注册能力对应的图表配置。
 */
export type ChartOption = ComposeOption<
  | BarSeriesOption
  | LineSeriesOption
  | PieSeriesOption
  | GridComponentOption
  | LegendComponentOption
  | MarkLineComponentOption
  | TooltipComponentOption
>;

/**
 * ECharts 图表实例。
 */
export type ChartInstance = EChartsType;

/**
 * ECharts 初始化选项，支持按组件场景选择 Canvas 或 SVG 渲染器。
 */
export type ChartInitOptions = EChartsInitOpts;
