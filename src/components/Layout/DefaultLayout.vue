<template>
  <div class="app-shell">
    <TopNav />
    <main class="app-main">
      <div class="app-main__inner">
        <router-view />
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import TopNav from "@/components/TopNav.vue";
</script>

<style scoped>
.app-shell {
  min-height: 100vh;
  background: var(--isales-muted);
  display: flex;
  flex-direction: column;
}
.app-main {
  flex: 1;
  padding: 24px 0 48px;
}
.app-main__inner {
  max-width: 1280px;
  margin: 0 auto;
  padding: 0 24px;
}
</style>
