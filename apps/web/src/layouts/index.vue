<template>
  <div class="app-layout">
    <header class="app-layout__header">
      <span class="app-layout__title">LY Rsbuild SPA</span>
      <nav class="app-layout__nav" aria-label="演示导航">
        <router-link :to="{ name: 'DemoHome' }">首页</router-link>
        <router-link :to="{ name: 'DemoComponents' }">基础组件</router-link>
      </nav>
    </header>
    <main class="app-layout__content">
      <router-view />
    </main>
  </div>
</template>

<style lang="scss" scoped>
.app-layout {
  max-inline-size: 54rem;
  margin-inline: auto;
  padding: 1rem;
}

.app-layout__header,
.app-layout__nav {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 1rem;
}

.app-layout__header {
  justify-content: space-between;
  border-block-end: 1px solid var(--border-color, #d0d7de);
  padding-block-end: 0.75rem;
}

.app-layout__title,
.app-layout__nav .router-link-exact-active {
  font-weight: 700;
}

.app-layout__nav a {
  color: var(--color-primary, #2056ad);
}

.app-layout__content {
  padding-block: 1rem;
}
</style>
