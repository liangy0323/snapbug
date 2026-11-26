<template>
  <main class="login-page">
    <div class="login-page__visual" aria-hidden="true">
      <img class="login-page__illustration" :src="loginIllustration" alt="" />
    </div>

    <div class="login-page__panel">
      <div class="login-page__toolbar">
        <base-button variant="ghost" size="sm" :icon="isDark ? 'Sun' : 'Moon'" @click="toggleTheme">
          {{ isDark ? '亮色' : '暗黑' }}
        </base-button>
      </div>

      <div class="login-page__content">
        <section class="login-page__card" aria-labelledby="login-heading">
          <h1 id="login-heading" class="login-page__title">
            <strong class="login-page__greeting">欢迎登录</strong>
            SnapBug 工作台
          </h1>

          <div class="login-page__tabs" role="tablist" aria-label="登录方式">
            <span class="login-page__tab login-page__tab--active" role="tab" aria-selected="true">账号密码</span>
            <span class="login-page__tab-indicator" aria-hidden="true" />
          </div>

          <div class="login-page__form-stage">
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
                登录
              </base-button>

              <p class="login-page__hint">
                <base-icon icon="Info" :size="14" aria-hidden="true" />
                <span>账号由团队管理员统一开通，忘记密码请联系管理员重置</span>
              </p>
            </base-form>
          </div>
        </section>
      </div>

      <footer class="login-page__footer">SnapBug · 轻量研发协作工作台</footer>
    </div>
  </main>
</template>

<script setup lang="ts">
/**
 * 导入静态资源
 */
import loginIllustration from '@/assets/images/login.webp';

/**
 * 导入 composables
 */
import { useLogin } from './composables/use-login';

/**
 * 导入类型声明
 */
import type { FormInstance } from '@/types';

/**
 * 引入 composables
 */
const { isDark, toggleTheme, form, rules, rememberAccount, isSubmitting, handleSubmit } = useLogin();

/**
 * 定义响应式数据
 */
const loginFormRef = useTemplateRef<FormInstance | null>('loginFormRef');
</script>

<style lang="scss" src="./index.scss" scoped></style>
