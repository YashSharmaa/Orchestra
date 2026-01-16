/**
 * Orchestra © 2025
 * Author: Orchestra Team
 * License: Apache-2.0
 * Description: Azure OpenAI integration and LLM provider abstraction
 */

import axios, { AxiosInstance } from 'axios';
import { getConfig } from '@/utils/config';
import { log } from '@/utils/logger';
import { IModelConfig } from '@/types';

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant' | 'function' | 'tool';
  content: string;
  name?: string;
  function_call?: {
    name: string;
    arguments: string;
  };
  tool_calls?: ToolCall[];
  tool_call_id?: string;
}

export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

export interface FunctionDefinition {
  name: string;
  description: string;
  parameters: Record<string, any>;
}

export interface LLMCompletionOptions {
  messages: LLMMessage[];
  functions?: FunctionDefinition[];
  tools?: { type: 'function'; function: FunctionDefinition }[];
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  stop?: string[];
  toolChoice?: 'none' | 'auto' | { type: 'function'; function: { name: string } };
}

export interface LLMCompletionResponse {
  id: string;
  content: string;
  role: 'assistant';
  finishReason: 'stop' | 'length' | 'function_call' | 'tool_calls' | 'content_filter';
  functionCall?: {
    name: string;
    arguments: string;
  };
  toolCalls?: ToolCall[];
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

/**
 * LLM Provider for Azure OpenAI and other providers
 */
export class LLMProvider {
  private config = getConfig();
  private axiosInstance: AxiosInstance | null = null;
  private modelConfig: IModelConfig;

  constructor(modelConfig: IModelConfig) {
    this.modelConfig = modelConfig;
    this.initializeProvider();
  }

  /**
   * Initialize the provider based on configuration
   */
  private initializeProvider(): void {
    if (this.modelConfig.provider === 'azure-openai' && this.config.ai.azureOpenAI?.enabled) {
      const azureConfig = this.config.ai.azureOpenAI;
      this.axiosInstance = axios.create({
        baseURL: azureConfig.endpoint,
        headers: {
          'api-key': azureConfig.apiKey,
          'Content-Type': 'application/json',
        },
        timeout: 120000, // 2 minutes
      });
      log.info('Azure OpenAI provider initialized', {
        deployment: azureConfig.deployment,
      });
    } else if (this.modelConfig.provider === 'openai' && this.config.ai.openAI?.enabled) {
      this.axiosInstance = axios.create({
        baseURL: 'https://api.openai.com/v1',
        headers: {
          Authorization: `Bearer ${this.config.ai.openAI.apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 120000,
      });
      log.info('OpenAI provider initialized', { model: this.config.ai.openAI.model });
    } else {
      log.warn('No LLM provider configured or enabled');
    }
  }

  /**
   * Generate a completion from the LLM
   */
  async complete(options: LLMCompletionOptions): Promise<LLMCompletionResponse> {
    if (!this.axiosInstance) {
      throw new Error('LLM provider not initialized. Check your configuration.');
    }

    try {
      const startTime = Date.now();

      if (this.modelConfig.provider === 'azure-openai') {
        const response = await this.completeAzure(options);
        const duration = Date.now() - startTime;
        log.debug('Azure OpenAI completion successful', {
          duration,
          tokens: response.usage.totalTokens,
        });
        return response;
      } else if (this.modelConfig.provider === 'openai') {
        const response = await this.completeOpenAI(options);
        const duration = Date.now() - startTime;
        log.debug('OpenAI completion successful', {
          duration,
          tokens: response.usage.totalTokens,
        });
        return response;
      }

      throw new Error(`Unsupported provider: ${this.modelConfig.provider}`);
    } catch (error: any) {
      log.error('LLM completion failed', {
        error: error.message,
        provider: this.modelConfig.provider,
        model: this.modelConfig.model,
      });
      throw new Error(`LLM completion failed: ${error.message}`);
    }
  }

  /**
   * Complete using Azure OpenAI
   */
  private async completeAzure(options: LLMCompletionOptions): Promise<LLMCompletionResponse> {
    const azureConfig = this.config.ai.azureOpenAI!;
    const url = `/openai/deployments/${azureConfig.deployment}/chat/completions?api-version=${azureConfig.apiVersion}`;

    const requestBody: any = {
      messages: options.messages,
      temperature: options.temperature ?? this.modelConfig.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? this.modelConfig.maxTokens ?? 2000,
      top_p: options.topP ?? this.modelConfig.topP ?? 1,
      frequency_penalty: options.frequencyPenalty ?? this.modelConfig.frequencyPenalty ?? 0,
      presence_penalty: options.presencePenalty ?? this.modelConfig.presencePenalty ?? 0,
    };

    if (options.stop) {
      requestBody.stop = options.stop;
    }

    // Handle function calling (legacy) or tool calls (new)
    if (options.tools && options.tools.length > 0) {
      requestBody.tools = options.tools;
      requestBody.tool_choice = options.toolChoice ?? 'auto';
    } else if (options.functions && options.functions.length > 0) {
      requestBody.functions = options.functions;
    }

    const response = await this.axiosInstance!.post(url, requestBody);
    const choice = response.data.choices[0];

    return {
      id: response.data.id,
      content: choice.message.content || '',
      role: 'assistant',
      finishReason: choice.finish_reason,
      functionCall: choice.message.function_call,
      toolCalls: choice.message.tool_calls,
      usage: {
        promptTokens: response.data.usage.prompt_tokens,
        completionTokens: response.data.usage.completion_tokens,
        totalTokens: response.data.usage.total_tokens,
      },
    };
  }

  /**
   * Complete using OpenAI
   */
  private async completeOpenAI(options: LLMCompletionOptions): Promise<LLMCompletionResponse> {
    const url = '/chat/completions';
    const model = this.modelConfig.model || this.config.ai.openAI!.model;

    const requestBody: any = {
      model,
      messages: options.messages,
      temperature: options.temperature ?? this.modelConfig.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? this.modelConfig.maxTokens ?? 2000,
      top_p: options.topP ?? this.modelConfig.topP ?? 1,
      frequency_penalty: options.frequencyPenalty ?? this.modelConfig.frequencyPenalty ?? 0,
      presence_penalty: options.presencePenalty ?? this.modelConfig.presencePenalty ?? 0,
    };

    if (options.stop) {
      requestBody.stop = options.stop;
    }

    if (options.tools && options.tools.length > 0) {
      requestBody.tools = options.tools;
      requestBody.tool_choice = options.toolChoice ?? 'auto';
    } else if (options.functions && options.functions.length > 0) {
      requestBody.functions = options.functions;
    }

    const response = await this.axiosInstance!.post(url, requestBody);
    const choice = response.data.choices[0];

    return {
      id: response.data.id,
      content: choice.message.content || '',
      role: 'assistant',
      finishReason: choice.finish_reason,
      functionCall: choice.message.function_call,
      toolCalls: choice.message.tool_calls,
      usage: {
        promptTokens: response.data.usage.prompt_tokens,
        completionTokens: response.data.usage.completion_tokens,
        totalTokens: response.data.usage.total_tokens,
      },
    };
  }

  /**
   * Generate embeddings for text
   */
  async generateEmbedding(text: string): Promise<number[]> {
    if (!this.axiosInstance) {
      throw new Error('LLM provider not initialized');
    }

    try {
      if (this.modelConfig.provider === 'azure-openai') {
        const azureConfig = this.config.ai.azureOpenAI!;
        const url = `/openai/deployments/${azureConfig.embeddingDeployment}/embeddings?api-version=${azureConfig.apiVersion}`;

        const response = await this.axiosInstance.post(url, {
          input: text,
        });

        return response.data.data[0].embedding;
      } else if (this.modelConfig.provider === 'openai') {
        const response = await this.axiosInstance.post('/embeddings', {
          model: 'text-embedding-ada-002',
          input: text,
        });

        return response.data.data[0].embedding;
      }

      throw new Error(`Embeddings not supported for provider: ${this.modelConfig.provider}`);
    } catch (error: any) {
      log.error('Embedding generation failed', { error: error.message });
      throw new Error(`Embedding generation failed: ${error.message}`);
    }
  }

  /**
   * Stream completion with real-time token generation
   * This enables real-time response streaming for better user experience
   *
   * Note: Streaming support varies by provider:
   * - Azure OpenAI: Supported via Server-Sent Events (SSE)
   * - OpenAI: Supported via Server-Sent Events (SSE)
   * - Other providers: May require custom implementation
   */
  async streamComplete(
    options: LLMCompletionOptions,
    onChunk: (chunk: string) => void
  ): Promise<void> {
    if (!this.axiosInstance) {
      throw new Error('LLM provider not initialized. Check your configuration.');
    }

    try {
      if (this.modelConfig.provider === 'azure-openai') {
        await this.streamCompleteAzure(options, onChunk);
      } else if (this.modelConfig.provider === 'openai') {
        await this.streamCompleteOpenAI(options, onChunk);
      } else {
        throw new Error(`Streaming not supported for provider: ${this.modelConfig.provider}`);
      }
    } catch (error: any) {
      log.error('Streaming completion error', {
        error: error.message,
        provider: this.modelConfig.provider,
      });
      throw new Error(`Streaming failed: ${error.message}`);
    }
  }

  /**
   * Stream completion using Azure OpenAI
   */
  private async streamCompleteAzure(
    options: LLMCompletionOptions,
    onChunk: (chunk: string) => void
  ): Promise<void> {
    const azureConfig = this.config.ai.azureOpenAI!;
    const url = `/openai/deployments/${azureConfig.deployment}/chat/completions?api-version=${azureConfig.apiVersion}`;

    const requestBody: any = {
      messages: options.messages,
      temperature: options.temperature ?? this.modelConfig.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? this.modelConfig.maxTokens ?? 2000,
      top_p: options.topP ?? this.modelConfig.topP ?? 1,
      frequency_penalty: options.frequencyPenalty ?? this.modelConfig.frequencyPenalty ?? 0,
      presence_penalty: options.presencePenalty ?? this.modelConfig.presencePenalty ?? 0,
      stream: true,
    };

    if (options.stop) {
      requestBody.stop = options.stop;
    }

    if (options.tools && options.tools.length > 0) {
      requestBody.tools = options.tools;
      requestBody.tool_choice = options.toolChoice ?? 'auto';
    } else if (options.functions && options.functions.length > 0) {
      requestBody.functions = options.functions;
    }

    const response = await this.axiosInstance!.post(url, requestBody, {
      responseType: 'stream',
    });

    return this.processStream(response.data, onChunk);
  }

  /**
   * Stream completion using OpenAI
   */
  private async streamCompleteOpenAI(
    options: LLMCompletionOptions,
    onChunk: (chunk: string) => void
  ): Promise<void> {
    const url = '/chat/completions';
    const model = this.modelConfig.model || this.config.ai.openAI!.model;

    const requestBody: any = {
      model,
      messages: options.messages,
      temperature: options.temperature ?? this.modelConfig.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? this.modelConfig.maxTokens ?? 2000,
      top_p: options.topP ?? this.modelConfig.topP ?? 1,
      frequency_penalty: options.frequencyPenalty ?? this.modelConfig.frequencyPenalty ?? 0,
      presence_penalty: options.presencePenalty ?? this.modelConfig.presencePenalty ?? 0,
      stream: true,
    };

    if (options.stop) {
      requestBody.stop = options.stop;
    }

    if (options.tools && options.tools.length > 0) {
      requestBody.tools = options.tools;
      requestBody.tool_choice = options.toolChoice ?? 'auto';
    } else if (options.functions && options.functions.length > 0) {
      requestBody.functions = options.functions;
    }

    const response = await this.axiosInstance!.post(url, requestBody, {
      responseType: 'stream',
    });

    return this.processStream(response.data, onChunk);
  }

  /**
   * Process Server-Sent Events stream
   */
  private processStream(stream: any, onChunk: (chunk: string) => void): Promise<void> {
    return new Promise((resolve, reject) => {
      stream.on('data', (chunk: Buffer) => {
        const lines = chunk.toString().split('\n').filter((line: string) => line.trim() !== '');

        for (const line of lines) {
          const message = line.replace(/^data: /, '');
          if (message === '[DONE]') {
            continue;
          }

          try {
            const parsed = JSON.parse(message);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              onChunk(content);
            }
          } catch (error) {
            // Skip invalid JSON lines (common in SSE streams)
            continue;
          }
        }
      });

      stream.on('end', resolve);
      stream.on('error', reject);
    });
  }
}

/**
 * Create an LLM provider instance
 */
export function createLLMProvider(modelConfig: IModelConfig): LLMProvider {
  return new LLMProvider(modelConfig);
}
