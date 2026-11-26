<template>
  <section class="page-dashboard">
    <div class="page-dashboard__bento">
      <!-- 左侧主区 -->
      <div class="page-dashboard__left">
        <!-- 上排双卡：状态统计环形图 + 周日历计划时间轴 -->
        <div class="page-dashboard__top-row">
          <article class="page-dashboard__card">
            <div class="page-dashboard__card-head">
              <h2 class="page-dashboard__card-title">缺陷状态分布</h2>
              <div class="page-dashboard__project-select">
                <base-select
                  v-model="selectedProjectId"
                  :options="projectFilterOptions"
                  size="sm"
                  clearable
                  placeholder="全部项目"
                />
              </div>
            </div>

            <div class="page-dashboard__big-row">
              <span class="page-dashboard__big-num">{{ activeBugTotal }}</span>
              <span class="page-dashboard__big-meta">
                活跃缺陷 · 共 <b>{{ scopedBugs.length }}</b> 条
              </span>
            </div>

            <div class="page-dashboard__donut-wrap">
              <div ref="donutChartRef" class="page-dashboard__donut-canvas" />
              <div class="page-dashboard__legend-grid">
                <div v-for="item in statusSeries" :key="item.name" class="page-dashboard__legend-item">
                  <div class="page-dashboard__legend-label">
                    <span class="page-dashboard__dot" :style="{ backgroundColor: item.color }" />
                    <span>{{ item.name }}</span>
                  </div>
                  <div class="page-dashboard__legend-val">{{ item.value }}</div>
                </div>
              </div>
            </div>

            <div class="page-dashboard__sub-kpi">
              <div>
                <div class="page-dashboard__kpi-title">指派待处理</div>
                <div class="page-dashboard__kpi-num">{{ myAssignedCount }}</div>
                <div class="page-dashboard__kpi-meta">需优先关注</div>
              </div>
              <div>
                <div class="page-dashboard__kpi-title">待测试验收</div>
                <div class="page-dashboard__kpi-num">{{ verifyCount }}</div>
                <div class="page-dashboard__kpi-meta">已自动回指</div>
              </div>
              <div>
                <div class="page-dashboard__kpi-title">累计已闭环</div>
                <div class="page-dashboard__kpi-num">{{ closedCount }}</div>
                <div class="page-dashboard__kpi-meta">验收通过</div>
              </div>
            </div>
          </article>

          <article class="page-dashboard__card">
            <div class="page-dashboard__card-head">
              <h2 class="page-dashboard__card-title">工作计划日程</h2>
              <router-link to="/plans" class="page-dashboard__more">
                <span>全部计划</span>
                <base-icon icon="ArrowRight" :size="13" />
              </router-link>
            </div>

            <div class="page-dashboard__week">
              <button
                v-for="day in weekDays"
                :key="day.iso"
                type="button"
                class="page-dashboard__day"
                :class="{ 'page-dashboard__day--active': selectedDate === day.iso }"
                @click="selectedDate = day.iso"
              >
                <span class="page-dashboard__day-wk">{{ day.weekday }}</span>
                <span class="page-dashboard__day-num">{{ day.dayNum }}</span>
                <span class="page-dashboard__day-dot" :class="{ 'page-dashboard__day-dot--empty': !day.hasPlan }" />
              </button>
            </div>

            <div v-if="selectedDayPlans.length > 0" class="page-dashboard__timeline">
              <div
                v-for="item in selectedDayPlans"
                :key="item.id"
                class="page-dashboard__tl-item"
                :class="{ 'page-dashboard__tl-item--done': item.completed }"
                @click="togglePlanCompleted(item.id)"
              >
                <div class="page-dashboard__tl-rail">
                  <span class="page-dashboard__tl-dot" />
                  <span class="page-dashboard__tl-line" />
                </div>
                <div class="page-dashboard__tl-main">
                  <div class="page-dashboard__tl-head">
                    <span class="page-dashboard__tl-time">{{ item.timeSlot }}</span>
                    <button
                      v-if="item.bugId && item.bugCode"
                      type="button"
                      class="page-dashboard__bug-chip"
                      @click.stop="openBugDetail(item.bugId)"
                    >
                      {{ item.bugCode }}
                    </button>
                  </div>
                  <div class="page-dashboard__tl-title">{{ item.title }}</div>
                </div>
              </div>
            </div>
            <base-empty v-else title="当日暂无工作计划" description="点击右上角前往计划页快速添加" compact />
          </article>
        </div>

        <!-- 中排：6 列浅蓝快捷磁贴 -->
        <article class="page-dashboard__card">
          <div class="page-dashboard__card-head">
            <h2 class="page-dashboard__card-title">快捷操作</h2>
          </div>
          <div class="page-dashboard__quick-grid">
            <button
              v-for="tile in quickTiles"
              :key="tile.label"
              type="button"
              class="page-dashboard__tile"
              @click="tile.action"
            >
              <span class="page-dashboard__tile-icon">
                <base-icon :icon="tile.icon" :size="20" />
              </span>
              <span class="page-dashboard__tile-label">{{ tile.label }}</span>
            </button>
          </div>
        </article>

        <!-- 下排：近 7 日双曲线趋势图 -->
        <article class="page-dashboard__card">
          <div class="page-dashboard__card-head">
            <h2 class="page-dashboard__card-title">近 7 日缺陷闭环趋势</h2>
            <div class="page-dashboard__trend-legend">
              <span class="page-dashboard__trend-tag">
                <i class="page-dashboard__dot" style="background-color: var(--color-primary)" />
                新增 Bug
              </span>
              <span class="page-dashboard__trend-tag">
                <i class="page-dashboard__dot" style="background-color: var(--color-mint)" />
                已关闭 Bug
              </span>
            </div>
          </div>

          <div ref="trendChartRef" class="page-dashboard__trend-canvas" />
        </article>
      </div>

      <!-- 右侧副栏 -->
      <div class="page-dashboard__right">
        <!-- 问候与团队成员卡 -->
        <article class="page-dashboard__card">
          <div class="page-dashboard__greet-top">
            <span
              class="page-dashboard__greet-avatar"
              :style="{ backgroundColor: currentUser?.avatarColor || '#1b74ff' }"
            >
              {{ currentUser?.name?.[0] || 'U' }}
            </span>
            <div>
              <div class="page-dashboard__greet-title">{{ greetingText }}，{{ currentUser?.name }}</div>
              <div class="page-dashboard__greet-sub">
                <span>{{ currentUser?.title }}</span>
                当前 {{ myAssignedCount }} 条待处理
              </div>
            </div>
          </div>

          <div class="page-dashboard__team-row">
            <span class="page-dashboard__kpi-meta">团队协作成员（{{ activeMembers.length }}）</span>
            <div class="page-dashboard__avatar-stack">
              <span
                v-for="member in activeMembers.slice(0, 5)"
                :key="member.id"
                class="page-dashboard__stack-item"
                :style="{ backgroundColor: member.avatarColor }"
                :title="`${member.name} · ${member.title}`"
              >
                {{ member.name[0] }}
              </span>
            </div>
          </div>
        </article>

        <!-- 近期个人笔记（冰蓝左竖条） -->
        <article class="page-dashboard__card">
          <div class="page-dashboard__card-head">
            <h2 class="page-dashboard__card-title">近期技术笔记</h2>
            <router-link to="/notes" class="page-dashboard__more">
              <span>进入笔记</span>
              <base-icon icon="ArrowRight" :size="13" />
            </router-link>
          </div>

          <div v-if="recentNotes.length > 0" class="page-dashboard__ice-list">
            <router-link v-for="note in recentNotes" :key="note.id" to="/notes" class="page-dashboard__ice-strip">
              {{ note.title }}
            </router-link>
          </div>
          <base-empty v-else title="暂无笔记" compact />
        </article>

        <!-- 待处理 Bug 快捷列表 -->
        <article class="page-dashboard__card">
          <div class="page-dashboard__card-head">
            <h2 class="page-dashboard__card-title">活跃缺陷速览</h2>
            <router-link to="/bugs" class="page-dashboard__more">
              <span>全部</span>
              <base-icon icon="ArrowRight" :size="13" />
            </router-link>
          </div>

          <div v-if="recentPendingBugs.length > 0" class="page-dashboard__bug-list">
            <button
              v-for="bug in recentPendingBugs"
              :key="bug.id"
              type="button"
              class="page-dashboard__bug-row"
              @click="openBugDetail(bug.id)"
            >
              <span class="page-dashboard__bug-main">
                <span class="page-dashboard__bug-title">{{ bug.title }}</span>
                <span class="page-dashboard__bug-sub">
                  {{ bug.code }} · {{ getProjectName(bug.projectId) }} · {{ bug.updatedAt }}
                </span>
              </span>
              <span class="page-dashboard__prio" :class="`page-dashboard__prio--${bug.priority.toLowerCase()}`">
                {{ bug.priority }}
              </span>
            </button>
          </div>
          <base-empty v-else title="暂无活跃缺陷" compact />
        </article>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { useDashboardCharts } from './composables/use-dashboard-charts';
import { useDashboardOverview } from './composables/use-dashboard-overview';

const donutChartRef = useTemplateRef<HTMLDivElement>('donutChartRef');
const trendChartRef = useTemplateRef<HTMLDivElement>('trendChartRef');

const {
  currentUser,
  activeMembers,
  selectedProjectId,
  selectedDate,
  projectFilterOptions,
  scopedBugs,
  statusSeries,
  activeBugTotal,
  myAssignedCount,
  closedCount,
  verifyCount,
  trendDates,
  createdSeries,
  closedSeries,
  weekDays,
  selectedDayPlans,
  recentNotes,
  recentPendingBugs,
  greetingText,
  quickTiles,
  openBugDetail,
  togglePlanCompleted,
  getProjectName,
} = useDashboardOverview();

useDashboardCharts({
  donutEl: donutChartRef,
  trendEl: trendChartRef,
  statusSeries: () => statusSeries.value,
  trendDates: () => trendDates.value,
  createdSeries: () => createdSeries.value,
  closedSeries: () => closedSeries.value,
});
</script>

<style lang="scss" src="./index.scss" scoped></style>
