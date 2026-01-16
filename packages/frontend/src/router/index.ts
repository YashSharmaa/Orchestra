/**
 * Orchestra © 2025
 * Author: Orchestra Team
 * License: Apache-2.0
 * Description: Vue Router configuration
 */

import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'home',
    component: () => import('@/views/HomeView.vue'),
    meta: {
      title: 'Orchestra - Home',
    },
  },
  {
    path: '/workflows',
    name: 'workflows',
    component: () => import('@/views/WorkflowsView.vue'),
    meta: {
      title: 'Workflows - Orchestra',
    },
  },
  {
    path: '/workflows/:id',
    name: 'workflow-editor',
    component: () => import('@/views/WorkflowEditorView.vue'),
    meta: {
      title: 'Workflow Editor - Orchestra',
    },
  },
  {
    path: '/marketplace',
    name: 'marketplace',
    component: () => import('@/views/MarketplaceView.vue'),
    meta: {
      title: 'Marketplace - Orchestra',
    },
  },
  {
    path: '/executions',
    name: 'executions',
    component: () => import('@/views/ExecutionsView.vue'),
    meta: {
      title: 'Executions - Orchestra',
    },
  },
  {
    path: '/settings',
    name: 'settings',
    component: () => import('@/views/SettingsView.vue'),
    meta: {
      title: 'Settings - Orchestra',
    },
  },
];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
});

// Update document title on route change
router.beforeEach((to, _from, next) => {
  if (to.meta.title) {
    document.title = to.meta.title as string;
  }
  next();
});

export default router;
