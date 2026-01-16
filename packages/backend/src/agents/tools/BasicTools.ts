/**
 * Orchestra © 2025
 * Author: Orchestra Team
 * License: Apache-2.0
 * Description: Basic tools for agents (calculator, web search, etc.)
 */

import { ITool } from '@/types';
import axios from 'axios';
import { log } from '@/utils/logger';

/**
 * Calculator tool - performs basic arithmetic operations
 */
export const calculatorTool: ITool = {
  name: 'calculator',
  description: 'Performs mathematical calculations. Supports basic arithmetic operations (+, -, *, /), exponentiation (**), and parentheses. Example: "2 + 2", "(5 * 3) - 2"',
  parameters: {
    type: 'object',
    properties: {
      expression: {
        type: 'string',
        description: 'The mathematical expression to evaluate',
      },
    },
    required: ['expression'],
  },
  handler: async (params: { expression: string }) => {
    try {
      // Sanitize the expression to prevent code injection
      const sanitized = params.expression.replace(/[^0-9+\-*/().\s**]/g, '');

      if (sanitized !== params.expression) {
        throw new Error('Invalid characters in expression');
      }

      // Use Function constructor instead of eval for better security
      const result = Function(`"use strict"; return (${sanitized})`)();

      log.debug('Calculator executed', { expression: params.expression, result });

      return {
        expression: params.expression,
        result,
        success: true,
      };
    } catch (error: any) {
      log.error('Calculator error', { error: error.message });
      return {
        expression: params.expression,
        error: error.message,
        success: false,
      };
    }
  },
};

/**
 * Web search tool - searches the web using a search API
 */
export const webSearchTool: ITool = {
  name: 'web_search',
  description: 'Searches the web for information. Returns a list of search results with titles, snippets, and URLs.',
  parameters: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'The search query',
      },
      limit: {
        type: 'number',
        description: 'Maximum number of results to return (default: 5)',
        default: 5,
      },
    },
    required: ['query'],
  },
  handler: async (params: { query: string; limit?: number }) => {
    try {
      // For demo purposes, we'll simulate search results
      // In production, integrate with Bing Search API, Google Custom Search, or similar
      log.debug('Web search executed', { query: params.query });

      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 500));

      const mockResults = [
        {
          title: `Results for: ${params.query}`,
          snippet: `Information about ${params.query} can be found here...`,
          url: `https://example.com/search?q=${encodeURIComponent(params.query)}`,
        },
        {
          title: `${params.query} - Overview`,
          snippet: `Learn more about ${params.query} and related topics...`,
          url: `https://example.com/wiki/${encodeURIComponent(params.query)}`,
        },
      ];

      const limit = params.limit ?? 5;
      return {
        query: params.query,
        results: mockResults.slice(0, limit),
        count: Math.min(mockResults.length, limit),
        success: true,
      };
    } catch (error: any) {
      log.error('Web search error', { error: error.message });
      return {
        query: params.query,
        error: error.message,
        success: false,
      };
    }
  },
};

/**
 * HTTP request tool - makes HTTP requests
 */
export const httpRequestTool: ITool = {
  name: 'http_request',
  description: 'Makes HTTP requests to external APIs. Supports GET, POST, PUT, DELETE methods.',
  parameters: {
    type: 'object',
    properties: {
      url: {
        type: 'string',
        description: 'The URL to request',
      },
      method: {
        type: 'string',
        enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
        description: 'HTTP method',
        default: 'GET',
      },
      headers: {
        type: 'object',
        description: 'Request headers',
      },
      body: {
        type: 'object',
        description: 'Request body (for POST, PUT, PATCH)',
      },
      timeout: {
        type: 'number',
        description: 'Request timeout in milliseconds',
        default: 30000,
      },
    },
    required: ['url'],
  },
  handler: async (params: {
    url: string;
    method?: string;
    headers?: Record<string, string>;
    body?: any;
    timeout?: number;
  }) => {
    try {
      log.debug('HTTP request executed', { url: params.url, method: params.method });

      const response = await axios({
        url: params.url,
        method: (params.method || 'GET') as any,
        headers: params.headers,
        data: params.body,
        timeout: params.timeout || 30000,
      });

      return {
        url: params.url,
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
        data: response.data,
        success: true,
      };
    } catch (error: any) {
      log.error('HTTP request error', { error: error.message });
      return {
        url: params.url,
        error: error.message,
        status: error.response?.status,
        success: false,
      };
    }
  },
};

/**
 * String manipulation tool
 */
export const stringManipulationTool: ITool = {
  name: 'string_manipulation',
  description: 'Performs string operations like uppercase, lowercase, trim, replace, substring, etc.',
  parameters: {
    type: 'object',
    properties: {
      operation: {
        type: 'string',
        enum: ['uppercase', 'lowercase', 'trim', 'replace', 'substring', 'length', 'split'],
        description: 'The string operation to perform',
      },
      text: {
        type: 'string',
        description: 'The input text',
      },
      find: {
        type: 'string',
        description: 'Text to find (for replace operation)',
      },
      replaceWith: {
        type: 'string',
        description: 'Text to replace with (for replace operation)',
      },
      start: {
        type: 'number',
        description: 'Start index (for substring operation)',
      },
      end: {
        type: 'number',
        description: 'End index (for substring operation)',
      },
      delimiter: {
        type: 'string',
        description: 'Delimiter (for split operation)',
      },
    },
    required: ['operation', 'text'],
  },
  handler: async (params: {
    operation: string;
    text: string;
    find?: string;
    replaceWith?: string;
    start?: number;
    end?: number;
    delimiter?: string;
  }) => {
    try {
      let result: any;

      switch (params.operation) {
        case 'uppercase':
          result = params.text.toUpperCase();
          break;
        case 'lowercase':
          result = params.text.toLowerCase();
          break;
        case 'trim':
          result = params.text.trim();
          break;
        case 'replace':
          if (!params.find) throw new Error('find parameter required for replace operation');
          result = params.text.replace(new RegExp(params.find, 'g'), params.replaceWith || '');
          break;
        case 'substring':
          result = params.text.substring(params.start || 0, params.end);
          break;
        case 'length':
          result = params.text.length;
          break;
        case 'split':
          result = params.text.split(params.delimiter || ',');
          break;
        default:
          throw new Error(`Unknown operation: ${params.operation}`);
      }

      return {
        operation: params.operation,
        result,
        success: true,
      };
    } catch (error: any) {
      log.error('String manipulation error', { error: error.message });
      return {
        operation: params.operation,
        error: error.message,
        success: false,
      };
    }
  },
};

/**
 * DateTime tool
 */
export const dateTimeTool: ITool = {
  name: 'datetime',
  description: 'Gets current date/time or performs date calculations. Can format dates, add/subtract time, etc.',
  parameters: {
    type: 'object',
    properties: {
      operation: {
        type: 'string',
        enum: ['now', 'format', 'add', 'subtract', 'diff'],
        description: 'The datetime operation to perform',
        default: 'now',
      },
      date: {
        type: 'string',
        description: 'ISO date string (for format, add, subtract, diff operations)',
      },
      format: {
        type: 'string',
        description: 'Output format (iso, unix, or date string)',
        default: 'iso',
      },
      amount: {
        type: 'number',
        description: 'Amount to add/subtract',
      },
      unit: {
        type: 'string',
        enum: ['seconds', 'minutes', 'hours', 'days', 'months', 'years'],
        description: 'Time unit for add/subtract',
      },
      compareDate: {
        type: 'string',
        description: 'Second date for diff operation',
      },
    },
    required: ['operation'],
  },
  handler: async (params: {
    operation: string;
    date?: string;
    format?: string;
    amount?: number;
    unit?: string;
    compareDate?: string;
  }) => {
    try {
      let result: any;
      const now = new Date();
      const targetDate = params.date ? new Date(params.date) : now;

      switch (params.operation) {
        case 'now':
          result = params.format === 'unix' ? now.getTime() : now.toISOString();
          break;
        case 'format':
          result = params.format === 'unix' ? targetDate.getTime() : targetDate.toISOString();
          break;
        case 'add':
        case 'subtract': {
          if (!params.amount || !params.unit) {
            throw new Error('amount and unit required for add/subtract');
          }
          const multiplier = params.operation === 'add' ? 1 : -1;
          const newDate = new Date(targetDate);

          switch (params.unit) {
            case 'seconds':
              newDate.setSeconds(newDate.getSeconds() + params.amount * multiplier);
              break;
            case 'minutes':
              newDate.setMinutes(newDate.getMinutes() + params.amount * multiplier);
              break;
            case 'hours':
              newDate.setHours(newDate.getHours() + params.amount * multiplier);
              break;
            case 'days':
              newDate.setDate(newDate.getDate() + params.amount * multiplier);
              break;
            case 'months':
              newDate.setMonth(newDate.getMonth() + params.amount * multiplier);
              break;
            case 'years':
              newDate.setFullYear(newDate.getFullYear() + params.amount * multiplier);
              break;
          }

          result = params.format === 'unix' ? newDate.getTime() : newDate.toISOString();
          break;
        }
        case 'diff': {
          if (!params.compareDate) {
            throw new Error('compareDate required for diff operation');
          }
          const date1 = targetDate.getTime();
          const date2 = new Date(params.compareDate).getTime();
          const diffMs = Math.abs(date2 - date1);

          result = {
            milliseconds: diffMs,
            seconds: Math.floor(diffMs / 1000),
            minutes: Math.floor(diffMs / 60000),
            hours: Math.floor(diffMs / 3600000),
            days: Math.floor(diffMs / 86400000),
          };
          break;
        }
        default:
          throw new Error(`Unknown operation: ${params.operation}`);
      }

      return {
        operation: params.operation,
        result,
        success: true,
      };
    } catch (error: any) {
      log.error('DateTime error', { error: error.message });
      return {
        operation: params.operation,
        error: error.message,
        success: false,
      };
    }
  },
};

/**
 * JSON parser tool
 */
export const jsonParserTool: ITool = {
  name: 'json_parser',
  description: 'Parses JSON strings, extracts values, or formats JSON.',
  parameters: {
    type: 'object',
    properties: {
      operation: {
        type: 'string',
        enum: ['parse', 'stringify', 'extract'],
        description: 'The JSON operation to perform',
      },
      data: {
        type: 'string',
        description: 'JSON string to parse or object to stringify',
      },
      path: {
        type: 'string',
        description: 'JSON path to extract (e.g., "user.name")',
      },
      pretty: {
        type: 'boolean',
        description: 'Pretty print JSON (for stringify)',
        default: false,
      },
    },
    required: ['operation', 'data'],
  },
  handler: async (params: {
    operation: string;
    data: string;
    path?: string;
    pretty?: boolean;
  }) => {
    try {
      let result: any;

      switch (params.operation) {
        case 'parse':
          result = JSON.parse(params.data);
          break;
        case 'stringify':
          const obj = typeof params.data === 'string' ? JSON.parse(params.data) : params.data;
          result = JSON.stringify(obj, null, params.pretty ? 2 : 0);
          break;
        case 'extract': {
          if (!params.path) throw new Error('path required for extract operation');
          const obj = JSON.parse(params.data);
          const parts = params.path.split('.');
          result = parts.reduce((acc, part) => acc?.[part], obj);
          break;
        }
        default:
          throw new Error(`Unknown operation: ${params.operation}`);
      }

      return {
        operation: params.operation,
        result,
        success: true,
      };
    } catch (error: any) {
      log.error('JSON parser error', { error: error.message });
      return {
        operation: params.operation,
        error: error.message,
        success: false,
      };
    }
  },
};

/**
 * Get all basic tools
 */
export function getBasicTools(): ITool[] {
  return [
    calculatorTool,
    webSearchTool,
    httpRequestTool,
    stringManipulationTool,
    dateTimeTool,
    jsonParserTool,
  ];
}
