<script setup lang="ts">
const isLoading = ref(true);
</script>

<template>
  <section>
    <h1>基础组件</h1>
    <section aria-labelledby="icon-title">
      <h2 id="icon-title">LucideIcon</h2>
      <p>
        <lucide-icon icon="House" :size="24" aria-label="首页图标" role="img" />
        <lucide-icon icon="Bell" :size="24" aria-label="通知图标" role="img" />
      </p>
    </section>
    <section aria-labelledby="loading-title">
      <h2 id="loading-title">CircleLoading</h2>
      <button type="button" :aria-pressed="isLoading" @click="isLoading = !isLoading">显示加载指示器</button>
      <div v-if="isLoading" class="loading-example">
        <circle-loading />
        <circle-loading :size="36" color="#267555" />
      </div>
    </section>
  </section>
</template>

<style lang="scss" scoped>
.loading-example {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-block-start: 1rem;
}
</style>
