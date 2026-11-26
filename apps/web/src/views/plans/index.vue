<template>
  <div class="plans-page">
    <section class="plans-header">
      <div class="plans-header__top">
        <div class="plans-header__heading">
          <div class="plans-header__title-row">
            <h1 class="plans-header__title">{{ displayDateLabel }}</h1>
            <span v-if="isToday" class="plans-header__today-tag">今日</span>
          </div>
          <p class="plans-header__subtitle">按日聚焦研发安排，支持直接从 Bug 详情抽屉「加入今日计划」并一键回溯。</p>
        </div>

        <div class="plans-header__controls">
          <base-button size="sm" icon="ChevronLeft" aria-label="前一天" @click="shiftDate(-1)" />
          <input v-model="selectedDate" type="date" class="plans-header__date-input" aria-label="选择计划日期" />
          <base-button size="sm" icon="ChevronRight" aria-label="后一天" @click="shiftDate(1)" />
          <base-button v-if="!isToday" size="sm" variant="soft" @click="resetToday">回到今天</base-button>
        </div>
      </div>

      <div class="plans-progress">
        <div class="plans-progress__meta">
          <span class="plans-progress__label">
            {{ isToday ? '今日完成进度' : '当日完成进度' }}
          </span>
          <span class="plans-progress__stats">
            已完成 <strong>{{ completedCount }}</strong> / {{ totalCount }} 项 · 待办 {{ pendingCount }} 项（{{
              progressPercent
            }}%）
          </span>
        </div>
        <div class="plans-progress__track">
          <div
            class="plans-progress__fill"
            :class="{ 'plans-progress__fill--done': totalCount > 0 && progressPercent === 100 }"
            :style="{ width: `${progressPercent}%` }"
          />
        </div>
      </div>
    </section>

    <section class="plans-composer">
      <div class="plans-composer__time">
        <base-input v-model="newTimeSlot" prefix-icon="Clock" placeholder="10:00" :maxlength="10" />
      </div>
      <div class="plans-composer__title">
        <base-input
          v-model="newTitle"
          clearable
          placeholder="输入当日工作计划，按 Enter 快速录入..."
          :maxlength="120"
          @keydown.enter="handleAddPlan"
        />
      </div>
      <base-button variant="primary" icon="Plus" @click="handleAddPlan">添加计划</base-button>
    </section>

    <section class="plans-list-card">
      <div v-if="dayPlans.length > 0" class="plans-list">
        <div v-for="item in dayPlans" :key="item.id" class="plan-item" :class="{ 'plan-item--done': item.completed }">
          <button
            type="button"
            class="plan-item__check"
            :class="{ 'plan-item__check--checked': item.completed }"
            :aria-label="item.completed ? '标记为未完成' : '标记为已完成'"
            @click="handleTogglePlan(item.id)"
          >
            <base-icon v-if="item.completed" icon="Check" :size="13" />
          </button>

          <span class="plan-item__time">{{ item.timeSlot }}</span>

          <div class="plan-item__content">
            <span class="plan-item__title">{{ item.title }}</span>
            <button
              v-if="item.bugId && item.bugCode"
              type="button"
              class="plan-item__bug-chip"
              @click="handleOpenBug(item.bugId)"
            >
              <base-icon icon="Bug" :size="12" />
              {{ item.bugCode }}
            </button>
          </div>

          <button type="button" class="plan-item__delete" aria-label="删除该计划" @click="handleDeletePlan(item.id)">
            <base-icon icon="Trash2" :size="14" />
          </button>
        </div>
      </div>

      <base-empty
        v-else
        title="当日暂无工作计划"
        description="在上方输入框快速录入待办，或前往 Bug 看板将重点缺陷一键加入今日计划"
      />
    </section>
  </div>
</template>

<script setup lang="ts">
import { usePlansPage } from './composables/use-plans-page';

const {
  selectedDate,
  newTimeSlot,
  newTitle,
  isToday,
  displayDateLabel,
  dayPlans,
  totalCount,
  completedCount,
  pendingCount,
  progressPercent,
  shiftDate,
  resetToday,
  handleAddPlan,
  handleTogglePlan,
  handleDeletePlan,
  handleOpenBug,
} = usePlansPage();
</script>

<style scoped lang="scss" src="./index.scss"></style>
