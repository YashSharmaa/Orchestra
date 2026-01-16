<!--
  Orchestra © 2025
  Author: Orchestra Team
  License: Apache-2.0
  Description: Settings and configuration view
-->

<template>
  <div class="h-full p-6 overflow-auto">
    <h2 class="text-2xl font-bold mb-6">Settings</h2>

    <!-- Tabs -->
    <div class="border-b border-gray-200 mb-6">
      <nav class="-mb-px flex space-x-8">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          @click="activeTab = tab.id"
          :class="[
            'py-2 px-1 border-b-2 font-medium text-sm',
            activeTab === tab.id
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          ]"
        >
          {{ tab.name }}
        </button>
      </nav>
    </div>

    <!-- User Settings Tab -->
    <div v-if="activeTab === 'user'" class="space-y-6">
      <div class="card">
        <h3 class="text-lg font-semibold mb-4">Profile Information</h3>
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              v-model="userProfile.email"
              type="email"
              class="input w-full"
              placeholder="your.email@example.com"
              :disabled="true"
            />
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">First Name</label>
              <input
                v-model="userProfile.firstName"
                type="text"
                class="input w-full"
                placeholder="John"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
              <input
                v-model="userProfile.lastName"
                type="text"
                class="input w-full"
                placeholder="Doe"
              />
            </div>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Role</label>
            <input
              v-model="userProfile.role"
              type="text"
              class="input w-full"
              :disabled="true"
            />
          </div>
          <div class="flex justify-end">
            <button @click="saveUserProfile" class="btn btn-primary">
              Save Profile
            </button>
          </div>
        </div>
      </div>

      <div class="card">
        <h3 class="text-lg font-semibold mb-4">Preferences</h3>
        <div class="space-y-4">
          <div class="flex items-center justify-between">
            <div>
              <p class="font-medium">Dark Mode</p>
              <p class="text-sm text-gray-500">Use dark theme across the application</p>
            </div>
            <label class="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" v-model="preferences.darkMode" class="sr-only peer" />
              <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
          <div class="flex items-center justify-between">
            <div>
              <p class="font-medium">Email Notifications</p>
              <p class="text-sm text-gray-500">Receive workflow execution notifications</p>
            </div>
            <label class="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" v-model="preferences.emailNotifications" class="sr-only peer" />
              <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
          <div class="flex justify-end">
            <button @click="savePreferences" class="btn btn-primary">
              Save Preferences
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Credentials Tab -->
    <div v-if="activeTab === 'credentials'" class="space-y-6">
      <div class="card">
        <div class="flex justify-between items-center mb-4">
          <h3 class="text-lg font-semibold">API Credentials</h3>
          <button @click="showAddCredential = true" class="btn btn-primary btn-sm">
            + Add Credential
          </button>
        </div>

        <div v-if="credentials.length === 0" class="text-center py-8 text-gray-500">
          No credentials configured. Add your first credential to connect external services.
        </div>

        <div v-else class="space-y-2">
          <div
            v-for="cred in credentials"
            :key="cred.id"
            class="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            <div class="flex items-center space-x-4">
              <div class="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
              </div>
              <div>
                <p class="font-medium">{{ cred.name }}</p>
                <p class="text-sm text-gray-500">{{ cred.type }}</p>
              </div>
            </div>
            <div class="flex items-center space-x-2">
              <button
                @click="editCredential(cred)"
                class="px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded"
              >
                Edit
              </button>
              <button
                @click="deleteCredential(cred.id)"
                class="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- System Tab (Admin only) -->
    <div v-if="activeTab === 'system' && isAdmin" class="space-y-6">
      <div class="card">
        <h3 class="text-lg font-semibold mb-4">System Configuration</h3>
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">API Rate Limit</label>
            <input
              v-model="systemSettings.apiRateLimit"
              type="number"
              class="input w-full"
              placeholder="100"
            />
            <p class="text-xs text-gray-500 mt-1">Requests per minute per user</p>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Max Concurrent Executions</label>
            <input
              v-model="systemSettings.maxConcurrentExecutions"
              type="number"
              class="input w-full"
              placeholder="10"
            />
          </div>
          <div class="flex items-center justify-between">
            <div>
              <p class="font-medium">Public Marketplace</p>
              <p class="text-sm text-gray-500">Allow users to publish workflows publicly</p>
            </div>
            <label class="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" v-model="systemSettings.publicMarketplace" class="sr-only peer" />
              <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
          <div class="flex justify-end">
            <button @click="saveSystemSettings" class="btn btn-primary">
              Save System Settings
            </button>
          </div>
        </div>
      </div>
    </div>

    <div v-if="activeTab === 'system' && !isAdmin" class="card">
      <p class="text-gray-500 text-center py-8">
        You need administrator privileges to access system settings.
      </p>
    </div>

    <!-- Add/Edit Credential Modal -->
    <div v-if="showAddCredential" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg p-6 w-full max-w-md">
        <h3 class="text-lg font-semibold mb-4">{{ editingCredential ? 'Edit' : 'Add' }} Credential</h3>
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input
              v-model="credentialForm.name"
              type="text"
              class="input w-full"
              placeholder="My API Key"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Type</label>
            <select v-model="credentialForm.type" class="input w-full">
              <option value="api-key">API Key</option>
              <option value="oauth2">OAuth 2.0</option>
              <option value="basic">Basic Auth</option>
              <option value="bearer">Bearer Token</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Value</label>
            <input
              v-model="credentialForm.value"
              type="password"
              class="input w-full"
              placeholder="Enter credential value"
            />
          </div>
        </div>
        <div class="flex justify-end space-x-2 mt-6">
          <button @click="cancelCredentialForm" class="btn btn-secondary">Cancel</button>
          <button @click="saveCredential" class="btn btn-primary">Save</button>
        </div>
      </div>
    </div>

    <!-- Notification -->
    <div v-if="notification" class="fixed bottom-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg">
      {{ notification }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useAuthStore } from '@/stores/auth';
import api from '@/services/api';

const authStore = useAuthStore();

const activeTab = ref('user');
const notification = ref('');
const showAddCredential = ref(false);
const editingCredential = ref<any>(null);

const tabs = [
  { id: 'user', name: 'User Settings' },
  { id: 'credentials', name: 'Credentials' },
  { id: 'system', name: 'System' },
];

const userProfile = ref({
  email: authStore.user?.email || '',
  firstName: authStore.user?.firstName || '',
  lastName: authStore.user?.lastName || '',
  role: authStore.user?.role || 'viewer',
});

const preferences = ref({
  darkMode: false,
  emailNotifications: true,
});

const credentials = ref<any[]>([]);

const credentialForm = ref({
  name: '',
  type: 'api-key',
  value: '',
});

const systemSettings = ref({
  apiRateLimit: 100,
  maxConcurrentExecutions: 10,
  publicMarketplace: false,
});

const isAdmin = computed(() => authStore.user?.role === 'admin');

async function loadCredentials() {
  try {
    const response = await api.get('/api/credentials');
    credentials.value = response.data || [];
  } catch (error) {
    console.error('Failed to load credentials:', error);
  }
}

function saveUserProfile() {
  // In real implementation, call API to save profile
  showNotification('Profile updated successfully');
}

function savePreferences() {
  // In real implementation, call API to save preferences
  showNotification('Preferences saved successfully');
}

async function saveCredential() {
  try {
    if (editingCredential.value) {
      // Update existing credential
      await api.put(`/api/credentials/${editingCredential.value.id}`, credentialForm.value);
      showNotification('Credential updated successfully');
    } else {
      // Create new credential
      await api.post('/api/credentials', credentialForm.value);
      showNotification('Credential added successfully');
    }
    await loadCredentials();
    cancelCredentialForm();
  } catch (error) {
    console.error('Failed to save credential:', error);
    showNotification('Failed to save credential');
  }
}

function editCredential(cred: any) {
  editingCredential.value = cred;
  credentialForm.value = {
    name: cred.name,
    type: cred.type,
    value: '', // Never show actual credential value
  };
  showAddCredential.value = true;
}

async function deleteCredential(id: string) {
  if (!confirm('Are you sure you want to delete this credential?')) {
    return;
  }

  try {
    await api.delete(`/api/credentials/${id}`);
    showNotification('Credential deleted successfully');
    await loadCredentials();
  } catch (error) {
    console.error('Failed to delete credential:', error);
    showNotification('Failed to delete credential');
  }
}

function cancelCredentialForm() {
  showAddCredential.value = false;
  editingCredential.value = null;
  credentialForm.value = {
    name: '',
    type: 'api-key',
    value: '',
  };
}

function saveSystemSettings() {
  // In real implementation, call API to save system settings
  showNotification('System settings saved successfully');
}

function showNotification(message: string) {
  notification.value = message;
  setTimeout(() => {
    notification.value = '';
  }, 3000);
}

onMounted(() => {
  loadCredentials();
});
</script>
