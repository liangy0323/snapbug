<script setup lang="ts">
import { getAppEnv, isOfflineCacheEnabled } from '@/env';
</script>

<template>
  <section>
    <h1><lucide-icon icon="House" :size="24" aria-hidden="true" /> 首页</h1>
    <p>当前环境：{{ getAppEnv() }}。离线缓存：{{ isOfflineCacheEnabled() ? '已开启' : '已关闭' }}。</p>
    <router-link :to="{ name: 'DemoComponents' }">查看基础组件</router-link>
  </section>
</template>
