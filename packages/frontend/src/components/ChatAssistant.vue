<!--
  Orchestra © 2025
  Author: Orchestra Team
  License: Apache-2.0
  Description: AI chat assistant interface with message history
-->

<template>
  <div class="chat-assistant h-full flex flex-col bg-white border-l border-gray-200">
    <!-- Header -->
    <div class="px-4 py-3 border-b border-gray-200 bg-gradient-to-r from-primary-50 to-purple-50">
      <div class="flex items-center justify-between">
        <div class="flex items-center space-x-3">
          <div class="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center">
            <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <div>
            <h3 class="text-sm font-semibold text-gray-900">AI Assistant</h3>
            <p class="text-xs text-gray-500">{{ isTyping ? 'Typing...' : 'Ready to help' }}</p>
          </div>
        </div>
        <div class="flex items-center space-x-2">
          <button
            @click="clearChat"
            class="p-1.5 hover:bg-white rounded transition-colors"
            title="Clear chat"
          >
            <svg class="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
          <button
            @click="emit('close')"
            class="p-1.5 hover:bg-white rounded transition-colors"
            title="Close"
          >
            <svg class="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>

    <!-- Messages Area -->
    <div
      ref="messagesContainer"
      class="flex-1 overflow-y-auto scrollbar-thin p-4 space-y-4 bg-gray-50"
    >
      <!-- Welcome Message -->
      <div v-if="messages.length === 0" class="text-center py-12">
        <div class="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-primary-100 to-purple-100 flex items-center justify-center">
          <svg class="w-8 h-8 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
        </div>
        <h4 class="text-lg font-semibold text-gray-900 mb-2">Welcome to AI Assistant</h4>
        <p class="text-sm text-gray-600 mb-4 max-w-xs mx-auto">
          I can help you build workflows, explain nodes, and answer questions about Orchestra.
        </p>
        <div class="space-y-2">
          <button
            v-for="suggestion in suggestions"
            :key="suggestion"
            @click="sendMessage(suggestion)"
            class="block w-full max-w-xs mx-auto px-4 py-2 text-sm text-left bg-white border border-gray-200 rounded-lg hover:border-primary-300 hover:bg-primary-50 transition-colors"
          >
            {{ suggestion }}
          </button>
        </div>
      </div>

      <!-- Message List -->
      <div
        v-for="message in messages"
        :key="message.id"
        class="flex"
        :class="message.role === 'user' ? 'justify-end' : 'justify-start'"
      >
        <div
          class="max-w-[80%] flex space-x-2"
          :class="message.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''"
        >
          <!-- Avatar -->
          <div
            class="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center"
            :class="
              message.role === 'user'
                ? 'bg-primary-100 text-primary-600'
                : 'bg-gradient-to-br from-primary-500 to-purple-600 text-white'
            "
          >
            <svg v-if="message.role === 'user'" class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clip-rule="evenodd" />
            </svg>
            <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>

          <!-- Message Content -->
          <div>
            <div
              class="px-4 py-2 rounded-2xl"
              :class="
                message.role === 'user'
                  ? 'bg-primary-600 text-white'
                  : 'bg-white border border-gray-200 text-gray-900'
              "
            >
              <p class="text-sm whitespace-pre-wrap">{{ message.content }}</p>
            </div>
            <div
              class="text-xs text-gray-500 mt-1 px-2"
              :class="message.role === 'user' ? 'text-right' : 'text-left'"
            >
              {{ formatTime(message.timestamp) }}
            </div>
          </div>
        </div>
      </div>

      <!-- Typing Indicator -->
      <div v-if="isTyping" class="flex justify-start">
        <div class="flex space-x-2">
          <div class="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-purple-600 text-white flex items-center justify-center flex-shrink-0">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <div class="px-4 py-2 bg-white border border-gray-200 rounded-2xl">
            <div class="flex space-x-1">
              <div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 0ms"></div>
              <div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 150ms"></div>
              <div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 300ms"></div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Input Area -->
    <div class="p-4 border-t border-gray-200 bg-white">
      <form @submit.prevent="handleSubmit" class="flex space-x-2">
        <input
          v-model="inputMessage"
          type="text"
          placeholder="Ask me anything about Orchestra..."
          class="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          :disabled="isTyping"
        />
        <button
          type="submit"
          class="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          :disabled="!inputMessage.trim() || isTyping"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
        </button>
      </form>

      <!-- Quick Actions -->
      <div class="mt-2 flex flex-wrap gap-2">
        <button
          v-for="action in quickActions"
          :key="action"
          @click="sendMessage(action)"
          class="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200 transition-colors"
          :disabled="isTyping"
        >
          {{ action }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick, watch } from 'vue';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'message', message: string): void;
}>();

// State
const messages = ref<Message[]>([]);
const inputMessage = ref('');
const isTyping = ref(false);
const messagesContainer = ref<HTMLElement | null>(null);

// Suggestions and quick actions
const suggestions = [
  'How do I create a workflow?',
  'What nodes are available?',
  'Explain the HTTP Request node',
  'Help me build an automation',
];

const quickActions = [
  'Add HTTP node',
  'Add Database node',
  'Add AI Agent',
  'Explain workflow',
];

// Message handling
async function handleSubmit() {
  if (!inputMessage.value.trim() || isTyping.value) return;

  const userMessage: Message = {
    id: `msg_${Date.now()}`,
    role: 'user',
    content: inputMessage.value.trim(),
    timestamp: new Date(),
  };

  messages.value.push(userMessage);
  emit('message', userMessage.content);

  const userInput = inputMessage.value;
  inputMessage.value = '';

  await scrollToBottom();

  // Simulate AI response (in real app, call API)
  await simulateAIResponse(userInput);
}

async function sendMessage(text: string) {
  inputMessage.value = text;
  await handleSubmit();
}

async function simulateAIResponse(userInput: string) {
  isTyping.value = true;
  await scrollToBottom();

  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000));

  const response = generateResponse(userInput);

  const assistantMessage: Message = {
    id: `msg_${Date.now()}`,
    role: 'assistant',
    content: response,
    timestamp: new Date(),
  };

  messages.value.push(assistantMessage);
  isTyping.value = false;

  await scrollToBottom();
}

function generateResponse(input: string): string {
  const lowerInput = input.toLowerCase();

  // Simple response generation (in real app, use actual AI)
  if (lowerInput.includes('workflow') && lowerInput.includes('create')) {
    return "To create a workflow:\n\n1. Click the '+' button in the node library\n2. Drag nodes onto the canvas\n3. Connect nodes by dragging from output to input ports\n4. Configure each node's properties\n5. Click 'Save' and then 'Run' to execute\n\nWould you like help with a specific type of workflow?";
  }

  if (lowerInput.includes('http') || lowerInput.includes('request')) {
    return "The HTTP Request node allows you to make API calls to external services. You can:\n\n- Choose HTTP methods (GET, POST, PUT, DELETE, PATCH)\n- Set custom headers and authentication\n- Send JSON or form data\n- Handle responses and errors\n\nWould you like me to add an HTTP Request node to your workflow?";
  }

  if (lowerInput.includes('node') && lowerInput.includes('available')) {
    return "Orchestra provides several node types:\n\nTriggers:\n- Webhook: Receive HTTP requests\n- Schedule: Run on a cron schedule\n\nActions:\n- HTTP Request: Make API calls\n- Send Email: Send emails\n- Database: Query databases\n\nLogic:\n- If: Conditional branching\n- Switch: Multiple conditions\n\nTransform:\n- Set: Modify data\n- Filter: Filter items\n\nWhich type would you like to learn more about?";
  }

  if (lowerInput.includes('ai') || lowerInput.includes('agent')) {
    return "Orchestra supports AI agents that can:\n\n- Use tools to accomplish tasks\n- Maintain conversation context\n- Access long-term memory\n- Collaborate in agent groups\n\nYou can integrate AI agents into your workflows using the AI Agent node. Would you like an example?";
  }

  if (lowerInput.includes('database')) {
    return "The Database node supports multiple database systems including PostgreSQL, MySQL, SQL Server, and SQLite.\n\nYou can:\n- Execute SELECT, INSERT, UPDATE, DELETE queries\n- Use parameterized queries for security\n- Handle connection pooling\n- Process results in batch\n\nWould you like help setting up a database connection?";
  }

  // Default response
  return "I'm here to help you with Orchestra! I can assist with:\n\n- Building and configuring workflows\n- Explaining node types and their usage\n- Troubleshooting execution issues\n- Best practices for automation\n\nWhat would you like to know more about?";
}

function clearChat() {
  if (messages.value.length > 0 && confirm('Are you sure you want to clear the chat history?')) {
    messages.value = [];
  }
}

function formatTime(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  if (diff < 60000) {
    return 'Just now';
  } else if (diff < 3600000) {
    const minutes = Math.floor(diff / 60000);
    return `${minutes}m ago`;
  } else if (diff < 86400000) {
    const hours = Math.floor(diff / 3600000);
    return `${hours}h ago`;
  } else {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
}

async function scrollToBottom() {
  await nextTick();
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
  }
}

// Watch for new messages and scroll
watch(
  () => messages.value.length,
  () => {
    scrollToBottom();
  }
);

// Public API
defineExpose({
  addMessage: (content: string, role: 'user' | 'assistant' = 'assistant') => {
    const message: Message = {
      id: `msg_${Date.now()}`,
      role,
      content,
      timestamp: new Date(),
    };
    messages.value.push(message);
    scrollToBottom();
  },
  clearChat,
});
</script>

<style scoped>
/* Animate typing indicator */
@keyframes bounce {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-4px);
  }
}

.animate-bounce {
  animation: bounce 1s ease-in-out infinite;
}
</style>
