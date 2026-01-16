/**
 * Orchestra © 2025
 * Author: Orchestra Team
 * License: Apache-2.0
 * Description: HTTP Request node for making API calls
 */

import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';
import { NodeBase } from '../base/NodeBase';
import {
  INodeTypeDescription,
  INodeExecutionContext,
  INodeData,
  INodeDataItem,
} from '@/types';

export class HttpRequest extends NodeBase {
  description: INodeTypeDescription = {
    displayName: 'HTTP Request',
    name: 'httpRequest',
    group: ['action'],
    version: 1,
    description: 'Make HTTP requests to any URL',
    defaults: {
      name: 'HTTP Request',
      color: '#4285F4',
    },
    inputs: ['main'],
    outputs: ['main'],
    properties: [
      {
        displayName: 'Method',
        name: 'method',
        type: 'options',
        default: 'GET',
        required: true,
        description: 'The HTTP method to use',
        options: [
          { name: 'GET', value: 'GET' },
          { name: 'POST', value: 'POST' },
          { name: 'PUT', value: 'PUT' },
          { name: 'PATCH', value: 'PATCH' },
          { name: 'DELETE', value: 'DELETE' },
          { name: 'HEAD', value: 'HEAD' },
          { name: 'OPTIONS', value: 'OPTIONS' },
        ],
      },
      {
        displayName: 'URL',
        name: 'url',
        type: 'string',
        default: '',
        required: true,
        description: 'The URL to make the request to',
        placeholder: 'https://api.example.com/endpoint',
      },
      {
        displayName: 'Authentication',
        name: 'authentication',
        type: 'options',
        default: 'none',
        description: 'The authentication method to use',
        options: [
          { name: 'None', value: 'none' },
          { name: 'Basic Auth', value: 'basicAuth' },
          { name: 'Bearer Token', value: 'bearerToken' },
          { name: 'API Key', value: 'apiKey' },
        ],
      },
      {
        displayName: 'Username',
        name: 'username',
        type: 'string',
        default: '',
        displayOptions: {
          show: {
            authentication: ['basicAuth'],
          },
        },
        description: 'Username for basic authentication',
      },
      {
        displayName: 'Password',
        name: 'password',
        type: 'string',
        default: '',
        displayOptions: {
          show: {
            authentication: ['basicAuth'],
          },
        },
        typeOptions: {
          password: true,
        },
        description: 'Password for basic authentication',
      },
      {
        displayName: 'Token',
        name: 'token',
        type: 'string',
        default: '',
        displayOptions: {
          show: {
            authentication: ['bearerToken'],
          },
        },
        typeOptions: {
          password: true,
        },
        description: 'Bearer token for authentication',
      },
      {
        displayName: 'API Key Header Name',
        name: 'apiKeyHeaderName',
        type: 'string',
        default: 'X-API-Key',
        displayOptions: {
          show: {
            authentication: ['apiKey'],
          },
        },
        description: 'Name of the header for API key',
      },
      {
        displayName: 'API Key',
        name: 'apiKey',
        type: 'string',
        default: '',
        displayOptions: {
          show: {
            authentication: ['apiKey'],
          },
        },
        typeOptions: {
          password: true,
        },
        description: 'The API key value',
      },
      {
        displayName: 'Headers',
        name: 'headers',
        type: 'json',
        default: '{}',
        description: 'Additional headers as JSON object',
        placeholder: '{"Content-Type": "application/json"}',
      },
      {
        displayName: 'Query Parameters',
        name: 'queryParameters',
        type: 'json',
        default: '{}',
        description: 'Query parameters as JSON object',
        placeholder: '{"param1": "value1", "param2": "value2"}',
      },
      {
        displayName: 'Body',
        name: 'body',
        type: 'json',
        default: '{}',
        displayOptions: {
          show: {
            method: ['POST', 'PUT', 'PATCH'],
          },
        },
        description: 'Request body as JSON',
        placeholder: '{"key": "value"}',
      },
      {
        displayName: 'Timeout',
        name: 'timeout',
        type: 'number',
        default: 30000,
        description: 'Request timeout in milliseconds',
        typeOptions: {
          minValue: 1000,
          maxValue: 300000,
        },
      },
      {
        displayName: 'Response Format',
        name: 'responseFormat',
        type: 'options',
        default: 'json',
        description: 'Expected response format',
        options: [
          { name: 'JSON', value: 'json' },
          { name: 'Text', value: 'text' },
          { name: 'Binary', value: 'binary' },
        ],
      },
      {
        displayName: 'Follow Redirects',
        name: 'followRedirects',
        type: 'boolean',
        default: true,
        description: 'Whether to follow HTTP redirects',
      },
      {
        displayName: 'Ignore SSL Issues',
        name: 'ignoreSSL',
        type: 'boolean',
        default: false,
        description: 'Whether to ignore SSL certificate errors',
      },
    ],
  };

  async execute(context: INodeExecutionContext): Promise<INodeData> {
    const items = this.getInputData(context);
    const returnData: INodeDataItem[] = [];

    // Get parameters
    const method = this.getNodeParameter(context, 'method', 'GET') as string;
    const url = this.getNodeParameter(context, 'url') as string;
    const authentication = this.getNodeParameter(context, 'authentication', 'none') as string;
    const timeout = this.getNodeParameter(context, 'timeout', 30000) as number;
    const responseFormat = this.getNodeParameter(context, 'responseFormat', 'json') as string;
    const followRedirects = this.getNodeParameter(context, 'followRedirects', true) as boolean;
    const ignoreSSL = this.getNodeParameter(context, 'ignoreSSL', false) as boolean;

    // Validate required parameters
    this.validateRequiredParameters(context, ['url']);

    // Parse headers and query parameters
    let headers: Record<string, string> = {};
    let queryParameters: Record<string, any> = {};
    let body: any;

    try {
      const headersParam = this.getNodeParameter(context, 'headers', '{}') as string;
      headers = typeof headersParam === 'string' ? JSON.parse(headersParam) : headersParam;
    } catch (error) {
      this.handleError(error, 'Failed to parse headers');
    }

    try {
      const queryParam = this.getNodeParameter(context, 'queryParameters', '{}') as string;
      queryParameters = typeof queryParam === 'string' ? JSON.parse(queryParam) : queryParam;
    } catch (error) {
      this.handleError(error, 'Failed to parse query parameters');
    }

    if (['POST', 'PUT', 'PATCH'].includes(method)) {
      try {
        const bodyParam = this.getNodeParameter(context, 'body', '{}') as string;
        body = typeof bodyParam === 'string' ? JSON.parse(bodyParam) : bodyParam;
      } catch (error) {
        this.handleError(error, 'Failed to parse body');
      }
    }

    // Process each input item
    for (let i = 0; i < Math.max(items.length, 1); i++) {
      try {
        // Replace variables in URL
        const processedUrl = this.replaceVariables(url, context, i);

        // Build request config
        const requestConfig: AxiosRequestConfig = {
          method: method as any,
          url: processedUrl,
          headers: { ...headers },
          params: queryParameters,
          timeout,
          maxRedirects: followRedirects ? 5 : 0,
          validateStatus: () => true, // Don't throw on any status
        };

        // Add body if applicable
        if (body && ['POST', 'PUT', 'PATCH'].includes(method)) {
          requestConfig.data = body;
        }

        // Add authentication
        switch (authentication) {
          case 'basicAuth':
            const username = this.getNodeParameter(context, 'username', '') as string;
            const password = this.getNodeParameter(context, 'password', '') as string;
            requestConfig.auth = { username, password };
            break;

          case 'bearerToken':
            const token = this.getNodeParameter(context, 'token', '') as string;
            requestConfig.headers!['Authorization'] = `Bearer ${token}`;
            break;

          case 'apiKey':
            const apiKeyHeaderName = this.getNodeParameter(context, 'apiKeyHeaderName', 'X-API-Key') as string;
            const apiKey = this.getNodeParameter(context, 'apiKey', '') as string;
            requestConfig.headers![apiKeyHeaderName] = apiKey;
            break;
        }

        // Handle SSL
        if (ignoreSSL) {
          requestConfig.httpsAgent = new (require('https').Agent)({
            rejectUnauthorized: false,
          });
        }

        // Set response type
        if (responseFormat === 'binary') {
          requestConfig.responseType = 'arraybuffer';
        }

        // Make the request
        this.log(`Making ${method} request to ${processedUrl}`);
        const response: AxiosResponse = await axios(requestConfig);

        // Process response
        let responseData: any;
        if (responseFormat === 'json') {
          responseData = response.data;
        } else if (responseFormat === 'text') {
          responseData = typeof response.data === 'string' ? response.data : String(response.data);
        } else if (responseFormat === 'binary') {
          responseData = {
            data: Buffer.from(response.data).toString('base64'),
            contentType: response.headers['content-type'],
          };
        }

        // Create result item
        const resultItem: INodeDataItem = {
          json: {
            statusCode: response.status,
            statusMessage: response.statusText,
            headers: response.headers,
            body: responseData,
          },
        };

        returnData.push(resultItem);
      } catch (error: any) {
        if (context.node.alwaysOutputData) {
          returnData.push({
            json: {
              error: error.message,
              statusCode: error.response?.status,
              headers: error.response?.headers,
            },
          });
        } else {
          this.handleError(error, 'HTTP request failed');
        }
      }
    }

    return this.returnData(returnData);
  }
}
