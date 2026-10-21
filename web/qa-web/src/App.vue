<script setup lang="ts">
import { RouterView } from 'vue-router';
import AppHeader from './components/AppHeader.vue';
import AppFooter from './components/AppFooter.vue';
import { onMounted, onUnmounted } from 'vue';
import { store } from './store';

const restoreWhenVisible = () => {
  if (document.visibilityState === 'visible') void store.restoreSession();
};
onMounted(() => {
  void store.loadDoctors().catch(() => {}); // 页面显示 store 中的可重试错误，不使用 JSON 回退。
  void store.restoreSession();
  document.addEventListener('visibilitychange', restoreWhenVisible);
});
onUnmounted(() => document.removeEventListener('visibilitychange', restoreWhenVisible));
</script>

<template>
  <a-layout class="app-layout">
    <AppHeader />
    <a-layout-content class="app-content">
      <RouterView />
    </a-layout-content>
    <AppFooter />
  </a-layout>
</template>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
    'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
    sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

.app-layout {
  min-height: 100vh;
}

.app-content {
  background: #fff;
}
</style>
