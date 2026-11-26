import { initChart } from '@repo/charts';

import { useTheme } from '@/composables/use-theme';

import type { ChartInstance, ChartOption } from '@repo/charts';
import type { MaybeRefOrGetter } from 'vue';

/**
 * 工作台双图表（状态分布环形图 + 近 7 日趋势双曲线图）生命周期与亮/暗主题同步管理
 */
export const useDashboardCharts = (options: {
  donutEl: Ref<HTMLDivElement | null>;
  trendEl: Ref<HTMLDivElement | null>;
  statusSeries: MaybeRefOrGetter<Array<{ name: string; value: number; color: string }>>;
  trendDates: MaybeRefOrGetter<string[]>;
  createdSeries: MaybeRefOrGetter<number[]>;
  closedSeries: MaybeRefOrGetter<number[]>;
}) => {
  const { isDark } = useTheme();
  let donutChart: ChartInstance | null = null;
  let trendChart: ChartInstance | null = null;
  let resizeObserver: ResizeObserver | null = null;

  const getChartPalette = () => {
    return isDark.value
      ? {
          text: '#a8a8b0',
          splitLine: 'rgba(255, 255, 255, 0.08)',
          tooltipBg: '#242427',
          tooltipBorder: 'rgba(255, 255, 255, 0.14)',
          tooltipText: '#f0f0f2',
          ringBorder: '#1b1b1d',
          primary: '#3b82f6',
          mint: '#2dd4bf',
        }
      : {
          text: '#86909c',
          splitLine: '#eff1f5',
          tooltipBg: '#ffffff',
          tooltipBorder: '#e6e9ef',
          tooltipText: '#14181f',
          ringBorder: '#ffffff',
          primary: '#1b74ff',
          mint: '#2dd4bf',
        };
  };

  const renderDonut = (): void => {
    if (!donutChart) {
      return;
    }
    const palette = getChartPalette();
    const data = toValue(options.statusSeries);

    const chartOption: ChartOption = {
      tooltip: {
        trigger: 'item',
        backgroundColor: palette.tooltipBg,
        borderColor: palette.tooltipBorder,
        textStyle: { color: palette.tooltipText, fontSize: 12 },
        formatter: '{b}：{c}（{d}%）',
      },
      series: [
        {
          type: 'pie',
          radius: ['62%', '86%'],
          center: ['50%', '50%'],
          avoidLabelOverlap: false,
          label: { show: false },
          itemStyle: {
            borderColor: palette.ringBorder,
            borderWidth: 2,
            borderRadius: 4,
          },
          data: data.map((item) => ({
            name: item.name,
            value: item.value,
            itemStyle: { color: item.color },
          })),
        },
      ],
    };

    donutChart.setOption(chartOption, true);
  };

  const renderTrend = (): void => {
    if (!trendChart) {
      return;
    }
    const palette = getChartPalette();
    const dates = toValue(options.trendDates);
    const created = toValue(options.createdSeries);
    const closed = toValue(options.closedSeries);

    const chartOption: ChartOption = {
      tooltip: {
        trigger: 'axis',
        backgroundColor: palette.tooltipBg,
        borderColor: palette.tooltipBorder,
        textStyle: { color: palette.tooltipText, fontSize: 12 },
      },
      grid: { left: 28, right: 16, top: 14, bottom: 26 },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: dates,
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { color: palette.text, fontSize: 11 },
      },
      yAxis: {
        type: 'value',
        minInterval: 1,
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { color: palette.text, fontSize: 11 },
        splitLine: { lineStyle: { color: palette.splitLine, type: 'dashed' } },
      },
      series: [
        {
          name: '新增 Bug',
          type: 'line',
          smooth: true,
          symbolSize: 6,
          data: created,
          itemStyle: { color: palette.primary },
          lineStyle: { width: 2.5, color: palette.primary },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(27, 116, 255, 0.22)' },
                { offset: 1, color: 'rgba(27, 116, 255, 0.01)' },
              ],
            },
          },
        },
        {
          name: '已关闭 Bug',
          type: 'line',
          smooth: true,
          symbolSize: 6,
          data: closed,
          itemStyle: { color: palette.mint },
          lineStyle: { width: 2.5, color: palette.mint },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(45, 212, 191, 0.2)' },
                { offset: 1, color: 'rgba(45, 212, 191, 0.01)' },
              ],
            },
          },
        },
      ],
    };

    trendChart.setOption(chartOption, true);
  };

  const handleResize = (): void => {
    donutChart?.resize();
    trendChart?.resize();
  };

  onMounted(() => {
    if (options.donutEl.value) {
      donutChart = initChart(options.donutEl.value);
      renderDonut();
    }
    if (options.trendEl.value) {
      trendChart = initChart(options.trendEl.value);
      renderTrend();
    }

    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(handleResize);
      if (options.donutEl.value) resizeObserver.observe(options.donutEl.value);
      if (options.trendEl.value) resizeObserver.observe(options.trendEl.value);
    } else if (typeof window !== 'undefined') {
      window.addEventListener('resize', handleResize);
    }
  });

  watch(
    [
      isDark,
      () => toValue(options.statusSeries),
      () => toValue(options.createdSeries),
      () => toValue(options.closedSeries),
    ],
    () => {
      renderDonut();
      renderTrend();
    },
    { deep: true },
  );

  onBeforeUnmount(() => {
    resizeObserver?.disconnect();
    resizeObserver = null;
    if (typeof window !== 'undefined') {
      window.removeEventListener('resize', handleResize);
    }
    donutChart?.dispose();
    trendChart?.dispose();
    donutChart = null;
    trendChart = null;
  });
};
