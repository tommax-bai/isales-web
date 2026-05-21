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
  padding: var(--isales-space-6) 0 var(--isales-space-12);
}
.app-main__inner {
  max-width: var(--isales-container-max);
  margin: 0 auto;
  padding: 0 var(--isales-container-px);
}
</style>
