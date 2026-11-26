<template>
  <main class="login-page">
    <grain-gradient :colors="gradientColors" :opacity="isDark ? 0.48 : 0.42" />

    <div class="login-page__toolbar">
      <base-button variant="ghost" size="sm" :icon="isDark ? 'Sun' : 'Moon'" @click="toggleTheme">
        {{ isDark ? '亮色' : '暗黑' }}
      </base-button>
    </div>

    <div class="login-page__stage">
      <header class="login-page__brand">
        <div class="login-page__logo-row">
          <span class="login-page__logo-mark">
            <base-icon icon="Bug" :size="18" />
          </span>
          <span class="login-page__brand-name">SnapBug<i class="login-page__brand-dot" /></span>
        </div>
        <p class="login-page__tagline">轻量研发协作工作台</p>
      </header>

      <section class="login-page__card" aria-labelledby="login-heading">
        <div class="login-page__card-head">
          <h1 id="login-heading" class="login-page__title">欢迎登录</h1>
          <p class="login-page__subtitle">使用团队成员账号登录，继续跟进缺陷与研发计划</p>
        </div>

        <base-form
          ref="loginFormRef"
          aria-label="账号密码登录"
          :model="form"
          :rules="rules"
          :disabled="isSubmitting"
          @submit="handleSubmit(loginFormRef)"
        >
          <base-form-item prop="account">
            <base-input
              v-model.trim="form.account"
              size="lg"
              prefix-icon="User"
              placeholder="请输入登录账号"
              autocomplete="username"
              clearable
            />
          </base-form-item>

          <base-form-item prop="password">
            <base-input
              v-model="form.password"
              type="password"
              size="lg"
              prefix-icon="KeyRound"
              placeholder="请输入登录密码"
              autocomplete="current-password"
              show-password
            />
          </base-form-item>

          <div class="login-page__options">
            <label class="login-page__checkbox">
              <input v-model="rememberAccount" type="checkbox" class="login-page__checkbox-input" />
              <span>记住账号</span>
            </label>
          </div>

          <base-button variant="primary" size="lg" native-type="submit" block :loading="isSubmitting">
            登录工作台
          </base-button>

          <p class="login-page__hint">
            <base-icon icon="Info" :size="14" aria-hidden="true" />
            <span>账号由团队管理员统一开通，忘记密码请联系管理员重置</span>
          </p>
        </base-form>
      </section>

      <footer class="login-page__footer">
        <span v-for="item in capabilities" :key="item.label" class="login-page__cap">
          <base-icon :icon="item.icon" :size="13" />
          <span>{{ item.label }}</span>
        </span>
      </footer>
    </div>
  </main>
</template>

<script setup lang="ts">
import GrainGradient from './components/grain-gradient/index.vue';
import { useLogin } from './composables/use-login';

import type { BaseIconName, FormInstance } from '@/types';

const capabilities: ReadonlyArray<{ icon: BaseIconName; label: string }> = [
  { icon: 'Bug', label: '缺陷追踪' },
  { icon: 'Sparkles', label: 'AI 润色' },
  { icon: 'NotebookPen', label: '私有笔记' },
  { icon: 'CalendarDays', label: '工作计划' },
];

const { isDark, toggleTheme, gradientColors, form, rules, rememberAccount, isSubmitting, handleSubmit } = useLogin();
const loginFormRef = useTemplateRef<FormInstance | null>('loginFormRef');
</script>

<style lang="scss" src="./index.scss" scoped></style>
