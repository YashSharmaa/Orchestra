<!--
  Orchestra © 2025
  Author: Orchestra Team
  License: Apache-2.0
  Description: Home view with welcome screen and quick actions
-->

<template>
  <div class="h-full flex items-center justify-center bg-gradient-to-br from-primary-50 to-white">
    <div class="text-center max-w-3xl px-6">
      <h1 class="text-6xl font-bold text-gray-900 mb-4">🎼 Orchestra</h1>
      <p class="text-2xl text-gray-600 mb-8">
        Next-generation workflow automation and AI orchestration platform
      </p>
      <div class="flex justify-center space-x-4">
        <router-link to="/workflows" class="btn-primary">
          Get Started
        </router-link>
        <router-link to="/marketplace" class="btn-secondary">
          Browse Templates
        </router-link>
      </div>

      <div class="mt-16 grid grid-cols-3 gap-8 text-left">
        <div class="card">
          <div class="text-primary-600 text-3xl mb-2">🎯</div>
          <h3 class="text-lg font-semibold mb-2">Visual Workflows</h3>
          <p class="text-sm text-gray-600">
            Design powerful workflows with an intuitive drag-and-drop editor
          </p>
        </div>
        <div class="card">
          <div class="text-primary-600 text-3xl mb-2">🤖</div>
          <h3 class="text-lg font-semibold mb-2">AI-Native</h3>
          <p class="text-sm text-gray-600">
            Leverage multi-agent AI systems for complex automation tasks
          </p>
        </div>
        <div class="card">
          <div class="text-primary-600 text-3xl mb-2">🔒</div>
          <h3 class="text-lg font-semibold mb-2">Enterprise Ready</h3>
          <p class="text-sm text-gray-600">
            Built-in RBAC, SSO, audit logging, and compliance features
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// Home view logic
</script>
