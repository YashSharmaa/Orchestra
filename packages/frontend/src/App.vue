<!--
  Orchestra © 2025
  Author: Orchestra Team
  License: Apache-2.0
  Description: Main application component
-->

<template>
  <div class="h-full flex flex-col">
    <!-- Header -->
    <header class="bg-white border-b border-gray-200 px-6 py-4">
      <div class="flex items-center justify-between">
        <div class="flex items-center space-x-4">
          <h1 class="text-2xl font-bold text-primary-600">🎼 Orchestra</h1>
          <nav class="flex space-x-1">
            <router-link
              to="/workflows"
              class="px-3 py-2 rounded-md text-sm font-medium hover:bg-gray-100 transition-colors"
              active-class="bg-primary-50 text-primary-600"
            >
              Workflows
            </router-link>
            <router-link
              to="/marketplace"
              class="px-3 py-2 rounded-md text-sm font-medium hover:bg-gray-100 transition-colors"
              active-class="bg-primary-50 text-primary-600"
            >
              Marketplace
            </router-link>
            <router-link
              to="/executions"
              class="px-3 py-2 rounded-md text-sm font-medium hover:bg-gray-100 transition-colors"
              active-class="bg-primary-50 text-primary-600"
            >
              Executions
            </router-link>
          </nav>
        </div>
        <div class="flex items-center space-x-4">
          <button
            class="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
          >
            <span class="inline-block w-8 h-8 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center">
              U
            </span>
          </button>
          <router-link
            to="/settings"
            class="p-2 text-gray-500 hover:text-gray-700 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clip-rule="evenodd" />
            </svg>
          </router-link>
        </div>
      </div>
    </header>

    <!-- Main content -->
    <main class="flex-1 overflow-hidden">
      <router-view />
    </main>
  </div>
</template>

<script setup lang="ts">
// Main app logic will go here
</script>
