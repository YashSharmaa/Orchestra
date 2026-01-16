<!--
  Orchestra © 2025
  Author: Orchestra Team
  License: Apache-2.0
  Description: Complete marketplace view for workflow templates
-->

<template>
  <div class="marketplace-view h-full overflow-auto bg-gray-50">
    <div class="max-w-7xl mx-auto p-6">
      <!-- Header -->
      <div class="mb-6">
        <h2 class="text-2xl font-bold text-gray-900">Marketplace</h2>
        <p class="text-sm text-gray-600 mt-1">
          Discover and import workflow templates to accelerate your automation
        </p>
      </div>

      <!-- Search and Filters -->
      <div class="mb-6 card">
        <div class="flex flex-col lg:flex-row gap-4">
          <!-- Search -->
          <div class="flex-1 relative">
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Search templates..."
              class="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            <svg
              class="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>

          <!-- Sort -->
          <select
            v-model="sortBy"
            class="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value="popular">Most Popular</option>
            <option value="recent">Recently Added</option>
            <option value="rating">Highest Rated</option>
            <option value="downloads">Most Downloads</option>
          </select>
        </div>
      </div>

      <!-- Category Tabs -->
      <div class="mb-6 flex flex-wrap gap-2">
        <button
          v-for="category in categories"
          :key="category"
          @click="selectedCategory = category"
          class="px-4 py-2 rounded-lg transition-all"
          :class="
            selectedCategory === category
              ? 'bg-primary-600 text-white shadow-md'
              : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
          "
        >
          {{ category }}
        </button>
      </div>

      <!-- Templates Grid -->
      <div v-if="loading" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div
          v-for="i in 6"
          :key="i"
          class="card animate-pulse"
        >
          <div class="h-32 bg-gray-200 rounded mb-4" />
          <div class="h-4 bg-gray-200 rounded w-3/4 mb-2" />
          <div class="h-3 bg-gray-200 rounded w-full mb-2" />
          <div class="h-3 bg-gray-200 rounded w-5/6" />
        </div>
      </div>

      <div v-else-if="filteredTemplates.length === 0" class="card text-center py-12">
        <svg class="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
        </svg>
        <h3 class="text-lg font-semibold text-gray-900 mb-2">No templates found</h3>
        <p class="text-gray-600">
          {{ searchQuery ? 'Try adjusting your search criteria' : 'No templates available in this category' }}
        </p>
      </div>

      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div
          v-for="template in filteredTemplates"
          :key="template.id"
          class="card hover:shadow-xl transition-shadow cursor-pointer group"
          @click="showTemplateDetails(template)"
        >
          <!-- Badge -->
          <div class="flex items-start justify-between mb-3">
            <span
              v-if="template.verified"
              class="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded-full flex items-center"
            >
              <svg class="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
              </svg>
              Verified
            </span>
          </div>

          <!-- Title -->
          <h3 class="text-lg font-semibold text-gray-900 mb-2 group-hover:text-primary-600 transition-colors">
            {{ template.title }}
          </h3>

          <!-- Description -->
          <p class="text-sm text-gray-600 mb-4 line-clamp-2">
            {{ template.description }}
          </p>

          <!-- Stats -->
          <div class="flex items-center justify-between mb-4">
            <div class="flex items-center space-x-4 text-xs text-gray-500">
              <div class="flex items-center">
                <svg class="w-4 h-4 mr-1 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                {{ template.rating || 'N/A' }}
              </div>
              <div class="flex items-center">
                <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                {{ formatDownloads(template.downloads) }}
              </div>
            </div>
          </div>

          <!-- Tags -->
          <div class="flex flex-wrap gap-1 mb-3">
            <span
              v-for="tag in template.tags.slice(0, 3)"
              :key="tag"
              class="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded"
            >
              {{ tag }}
            </span>
            <span
              v-if="template.tags.length > 3"
              class="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded"
            >
              +{{ template.tags.length - 3 }}
            </span>
          </div>

          <!-- Footer -->
          <div class="flex items-center justify-between pt-3 border-t border-gray-200">
            <span class="text-xs text-gray-500">
              by {{ template.author }}
            </span>
            <button
              @click.stop="importTemplate(template)"
              class="px-3 py-1.5 bg-primary-600 text-white text-xs font-medium rounded-lg hover:bg-primary-700 transition-colors"
            >
              Import
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Template Details Modal -->
    <div
      v-if="selectedTemplate"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      @click="selectedTemplate = null"
    >
      <div
        class="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-auto"
        @click.stop
      >
        <div class="p-6">
          <!-- Header -->
          <div class="flex items-start justify-between mb-4">
            <div class="flex-1">
              <div class="flex items-center mb-2">
                <h3 class="text-2xl font-bold text-gray-900 mr-2">
                  {{ selectedTemplate.title }}
                </h3>
                <span
                  v-if="selectedTemplate.verified"
                  class="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded-full flex items-center"
                >
                  <svg class="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                  </svg>
                  Verified
                </span>
              </div>
              <p class="text-sm text-gray-600">
                by {{ selectedTemplate.author }} • {{ selectedTemplate.category }}
              </p>
            </div>
            <button
              @click="selectedTemplate = null"
              class="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <!-- Stats -->
          <div class="flex items-center space-x-6 mb-6 pb-6 border-b border-gray-200">
            <div class="flex items-center text-sm">
              <svg class="w-5 h-5 mr-1 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              <span class="font-semibold">{{ selectedTemplate.rating || 'N/A' }}</span>
              <span class="text-gray-500 ml-1">rating</span>
            </div>
            <div class="flex items-center text-sm">
              <svg class="w-5 h-5 mr-1 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <span class="font-semibold">{{ formatDownloads(selectedTemplate.downloads) }}</span>
              <span class="text-gray-500 ml-1">downloads</span>
            </div>
            <div class="flex items-center text-sm">
              <svg class="w-5 h-5 mr-1 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span class="text-gray-500">Updated {{ formatDate(selectedTemplate.updatedAt) }}</span>
            </div>
          </div>

          <!-- Description -->
          <div class="mb-6">
            <h4 class="text-lg font-semibold text-gray-900 mb-2">Description</h4>
            <p class="text-gray-600 whitespace-pre-wrap">{{ selectedTemplate.description }}</p>
          </div>

          <!-- Preview -->
          <div class="mb-6">
            <h4 class="text-lg font-semibold text-gray-900 mb-2">Workflow Preview</h4>
            <div class="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div class="text-sm text-gray-600 space-y-2">
                <div class="flex items-center">
                  <svg class="w-4 h-4 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                  <span><strong>{{ selectedTemplate.nodeCount }}</strong> nodes</span>
                </div>
                <div class="flex items-center">
                  <svg class="w-4 h-4 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                  <span><strong>{{ selectedTemplate.connectionCount }}</strong> connections</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Tags -->
          <div class="mb-6">
            <h4 class="text-lg font-semibold text-gray-900 mb-2">Tags</h4>
            <div class="flex flex-wrap gap-2">
              <span
                v-for="tag in selectedTemplate.tags"
                :key="tag"
                class="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-full"
              >
                {{ tag }}
              </span>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex items-center justify-end space-x-3 pt-6 border-t border-gray-200">
            <button
              @click="selectedTemplate = null"
              class="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              @click="importTemplate(selectedTemplate)"
              class="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center"
              :disabled="importing"
            >
              <svg v-if="!importing" class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <svg v-else class="w-5 h-5 mr-2 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              {{ importing ? 'Importing...' : 'Import Template' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';

interface MarketplaceTemplate {
  id: string;
  workflowId: string;
  title: string;
  description: string;
  category: string;
  tags: string[];
  author: string;
  verified: boolean;
  downloads: number;
  rating?: number;
  nodeCount: number;
  connectionCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const router = useRouter();

// State
const searchQuery = ref('');
const selectedCategory = ref('All');
const sortBy = ref('popular');
const loading = ref(true);
const importing = ref(false);
const selectedTemplate = ref<MarketplaceTemplate | null>(null);

const categories = ['All', 'Integration', 'AI/ML', 'Data Processing', 'Automation', 'Marketing', 'Sales', 'Support', 'Analytics'];

// Mock templates data (in real app, fetch from /api/marketplace)
const templates = ref<MarketplaceTemplate[]>([
  {
    id: '1',
    workflowId: 'wf_001',
    title: 'Customer Onboarding Automation',
    description: 'Comprehensive customer onboarding workflow that automatically sends welcome emails, creates CRM records, provisions accounts, and schedules follow-up tasks. Perfect for SaaS companies looking to streamline their onboarding process.',
    category: 'Automation',
    tags: ['crm', 'email', 'onboarding', 'automation'],
    author: 'Orchestra Team',
    verified: true,
    downloads: 1245,
    rating: 4.8,
    nodeCount: 12,
    connectionCount: 15,
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-02-20')
  },
  {
    id: '2',
    workflowId: 'wf_002',
    title: 'AI-Powered Lead Scoring',
    description: 'Automatically score and qualify leads using machine learning models. Analyzes lead behavior, demographic data, and engagement metrics to prioritize your sales pipeline.',
    category: 'AI/ML',
    tags: ['ai', 'ml', 'sales', 'lead-scoring'],
    author: 'DataScience Pro',
    verified: true,
    downloads: 892,
    rating: 4.9,
    nodeCount: 8,
    connectionCount: 10,
    createdAt: new Date('2024-01-20'),
    updatedAt: new Date('2024-02-18')
  },
  {
    id: '3',
    workflowId: 'wf_003',
    title: 'Multi-Channel Marketing Campaign',
    description: 'Launch coordinated marketing campaigns across email, SMS, and social media. Includes A/B testing, audience segmentation, and real-time performance tracking.',
    category: 'Marketing',
    tags: ['marketing', 'email', 'sms', 'social-media', 'campaigns'],
    author: 'Marketing Mavens',
    verified: true,
    downloads: 2156,
    rating: 4.7,
    nodeCount: 18,
    connectionCount: 22,
    createdAt: new Date('2024-01-10'),
    updatedAt: new Date('2024-02-19')
  },
  {
    id: '4',
    workflowId: 'wf_004',
    title: 'Automated Data Sync',
    description: 'Synchronize data between multiple systems in real-time. Supports bidirectional sync, conflict resolution, and data transformation rules.',
    category: 'Integration',
    tags: ['sync', 'integration', 'data', 'etl'],
    author: 'Integration Experts',
    verified: false,
    downloads: 567,
    rating: 4.5,
    nodeCount: 6,
    connectionCount: 8,
    createdAt: new Date('2024-02-01'),
    updatedAt: new Date('2024-02-15')
  },
  {
    id: '5',
    workflowId: 'wf_005',
    title: 'Support Ticket Automation',
    description: 'Intelligently route and prioritize support tickets using AI. Automatically categorizes tickets, assigns to appropriate teams, and suggests responses.',
    category: 'Support',
    tags: ['support', 'ai', 'tickets', 'automation', 'routing'],
    author: 'Support Solutions',
    verified: true,
    downloads: 1678,
    rating: 4.6,
    nodeCount: 10,
    connectionCount: 13,
    createdAt: new Date('2024-01-25'),
    updatedAt: new Date('2024-02-21')
  },
  {
    id: '6',
    workflowId: 'wf_006',
    title: 'Sales Pipeline Analytics',
    description: 'Generate comprehensive sales analytics and forecasting reports. Tracks deal progression, conversion rates, and revenue projections.',
    category: 'Analytics',
    tags: ['analytics', 'sales', 'reporting', 'forecasting'],
    author: 'Analytics Pro',
    verified: true,
    downloads: 934,
    rating: 4.8,
    nodeCount: 14,
    connectionCount: 16,
    createdAt: new Date('2024-01-18'),
    updatedAt: new Date('2024-02-17')
  },
  {
    id: '7',
    workflowId: 'wf_007',
    title: 'Document Processing Pipeline',
    description: 'Extract, process, and store information from documents using OCR and NLP. Supports PDF, images, and scanned documents.',
    category: 'Data Processing',
    tags: ['ocr', 'nlp', 'documents', 'ai', 'extraction'],
    author: 'AI Documents',
    verified: false,
    downloads: 423,
    rating: 4.4,
    nodeCount: 9,
    connectionCount: 11,
    createdAt: new Date('2024-02-05'),
    updatedAt: new Date('2024-02-20')
  },
  {
    id: '8',
    workflowId: 'wf_008',
    title: 'Social Media Monitoring',
    description: 'Monitor brand mentions across social media platforms. Includes sentiment analysis, trend detection, and automated response capabilities.',
    category: 'Marketing',
    tags: ['social-media', 'monitoring', 'sentiment', 'ai'],
    author: 'Social Insights',
    verified: true,
    downloads: 1345,
    rating: 4.7,
    nodeCount: 11,
    connectionCount: 14,
    createdAt: new Date('2024-01-22'),
    updatedAt: new Date('2024-02-16')
  },
  {
    id: '9',
    workflowId: 'wf_009',
    title: 'E-commerce Order Fulfillment',
    description: 'Streamline order processing from purchase to delivery. Includes inventory management, shipping coordination, and customer notifications.',
    category: 'Automation',
    tags: ['ecommerce', 'orders', 'fulfillment', 'shipping'],
    author: 'Commerce Solutions',
    verified: true,
    downloads: 2089,
    rating: 4.9,
    nodeCount: 16,
    connectionCount: 20,
    createdAt: new Date('2024-01-12'),
    updatedAt: new Date('2024-02-18')
  }
]);

// Computed
const filteredTemplates = computed(() => {
  let filtered = templates.value;

  // Filter by category
  if (selectedCategory.value !== 'All') {
    filtered = filtered.filter(t => t.category === selectedCategory.value);
  }

  // Filter by search query
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    filtered = filtered.filter(t =>
      t.title.toLowerCase().includes(query) ||
      t.description.toLowerCase().includes(query) ||
      t.tags.some(tag => tag.toLowerCase().includes(query)) ||
      t.author.toLowerCase().includes(query)
    );
  }

  // Sort
  filtered = [...filtered].sort((a, b) => {
    switch (sortBy.value) {
      case 'popular':
        return b.downloads - a.downloads;
      case 'recent':
        return b.updatedAt.getTime() - a.updatedAt.getTime();
      case 'rating':
        return (b.rating || 0) - (a.rating || 0);
      case 'downloads':
        return b.downloads - a.downloads;
      default:
        return 0;
    }
  });

  return filtered;
});

// Actions
function showTemplateDetails(template: MarketplaceTemplate) {
  selectedTemplate.value = template;
}

async function importTemplate(template: MarketplaceTemplate) {
  importing.value = true;
  try {
    // In real app, call API: POST /api/marketplace/import/:id
    await new Promise(resolve => setTimeout(resolve, 1500));

    console.log('Importing template:', template.id);

    // Increment downloads (in real app, this would be done by the backend)
    template.downloads++;

    showNotification(`Successfully imported "${template.title}"`, 'success');
    selectedTemplate.value = null;

    // Navigate to the new workflow
    setTimeout(() => {
      router.push('/workflows');
    }, 1000);
  } catch (error) {
    console.error('Failed to import template:', error);
    showNotification('Failed to import template', 'error');
  } finally {
    importing.value = false;
  }
}

// Helper functions
function formatDownloads(count: number): string {
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}k`;
  }
  return count.toString();
}

function formatDate(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
  if (days < 365) return `${Math.floor(days / 30)} months ago`;

  return date.toLocaleDateString();
}

function showNotification(message: string, type: 'success' | 'error' | 'warning' | 'info') {
  // In real app, use proper notification system
  console.log(`[${type.toUpperCase()}] ${message}`);
}

// Lifecycle
onMounted(async () => {
  // Simulate loading templates from API
  try {
    await new Promise(resolve => setTimeout(resolve, 800));
    // In real app: templates.value = await fetch('/api/marketplace').then(r => r.json())
    loading.value = false;
  } catch (error) {
    console.error('Failed to load marketplace templates:', error);
    showNotification('Failed to load marketplace templates', 'error');
    loading.value = false;
  }
});
</script>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
