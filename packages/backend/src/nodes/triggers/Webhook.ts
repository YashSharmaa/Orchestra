/**
 * Orchestra © 2025
 * Author: Orchestra Team
 * License: Apache-2.0
 * Description: Webhook trigger node for receiving HTTP requests
 */

import { NodeBase } from '../base/NodeBase';
import {
  INodeTypeDescription,
  INodeExecutionContext,
  INodeData,
  INodeDataItem,
} from '@/types';

export class Webhook extends NodeBase {
  description: INodeTypeDescription = {
    displayName: 'Webhook',
    name: 'webhook',
    group: ['trigger'],
    version: 1,
    description: 'Trigger workflow by receiving HTTP webhook requests',
    defaults: {
      name: 'Webhook',
      color: '#00A86B',
    },
    inputs: [],
    outputs: ['main'],
    webhooks: [
      {
        name: 'default',
        httpMethod: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD'],
        responseMode: 'onReceived',
        path: 'webhook',
      },
    ],
    properties: [
      {
        displayName: 'Path',
        name: 'path',
        type: 'string',
        default: 'webhook',
        required: true,
        description: 'The URL path for this webhook',
        placeholder: 'my-webhook',
      },
      {
        displayName: 'HTTP Method',
        name: 'httpMethod',
        type: 'multiOptions',
        default: ['POST'],
        required: true,
        description: 'The HTTP methods to listen for',
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
        displayName: 'Response Mode',
        name: 'responseMode',
        type: 'options',
        default: 'onReceived',
        description: 'When to respond to the webhook',
        options: [
          {
            name: 'Immediately',
            value: 'onReceived',
            description: 'Respond immediately when webhook is received',
          },
          {
            name: 'When Last Node Finishes',
            value: 'lastNode',
            description: 'Respond with data from the last executed node',
          },
        ],
      },
      {
        displayName: 'Response Code',
        name: 'responseCode',
        type: 'number',
        default: 200,
        description: 'The HTTP status code to return',
        typeOptions: {
          minValue: 100,
          maxValue: 599,
        },
      },
      {
        displayName: 'Response Data',
        name: 'responseData',
        type: 'string',
        default: 'firstEntryJson',
        displayOptions: {
          show: {
            responseMode: ['lastNode'],
          },
        },
        description: 'What data to return',
        options: [
          {
            name: 'First Entry JSON',
            value: 'firstEntryJson',
          },
          {
            name: 'All Entries',
            value: 'allEntries',
          },
          {
            name: 'No Response Body',
            value: 'noData',
          },
        ],
      },
      {
        displayName: 'Response Headers',
        name: 'responseHeaders',
        type: 'json',
        default: '{}',
        description: 'Custom headers to include in the response',
        placeholder: '{"Content-Type": "application/json"}',
      },
      {
        displayName: 'Authentication',
        name: 'authentication',
        type: 'options',
        default: 'none',
        description: 'Authentication method for the webhook',
        options: [
          { name: 'None', value: 'none' },
          { name: 'Basic Auth', value: 'basicAuth' },
          { name: 'Header Auth', value: 'headerAuth' },
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
        required: true,
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
        required: true,
        typeOptions: {
          password: true,
        },
        description: 'Password for basic authentication',
      },
      {
        displayName: 'Header Name',
        name: 'headerName',
        type: 'string',
        default: 'X-API-Key',
        displayOptions: {
          show: {
            authentication: ['headerAuth'],
          },
        },
        required: true,
        description: 'Name of the authentication header',
      },
      {
        displayName: 'Header Value',
        name: 'headerValue',
        type: 'string',
        default: '',
        displayOptions: {
          show: {
            authentication: ['headerAuth'],
          },
        },
        required: true,
        typeOptions: {
          password: true,
        },
        description: 'Expected value of the authentication header',
      },
    ],
  };

  async execute(context: INodeExecutionContext): Promise<INodeData> {
    // Webhook nodes are special - they don't execute in the traditional sense
    // The execution engine handles the HTTP request and passes the data here

    // For webhook triggers, the input data contains the webhook request
    const items = this.getInputData(context);

    // If no input data, create from context (webhook data should be in context.inputData)
    if (items.length === 0) {
      // This would normally be populated by the webhook handler
      // For now, return empty data
      return this.returnData([this.createDataItem({ received: true })]);
    }

    // Return the webhook data as-is
    return this.returnData(items);
  }

  /**
   * Process incoming webhook request
   * This method is called by the webhook handler
   */
  async processWebhookRequest(
    request: {
      method: string;
      headers: Record<string, string>;
      query: Record<string, any>;
      body: any;
      params: Record<string, string>;
    },
    context: INodeExecutionContext
  ): Promise<{
    statusCode: number;
    headers: Record<string, string>;
    body: any;
  }> {
    // Validate authentication if required
    const authentication = this.getNodeParameter(context, 'authentication', 'none') as string;

    if (authentication === 'basicAuth') {
      const expectedUsername = this.getNodeParameter(context, 'username') as string;
      const expectedPassword = this.getNodeParameter(context, 'password') as string;

      const authHeader = request.headers['authorization'] || request.headers['Authorization'];
      if (!authHeader || !authHeader.startsWith('Basic ')) {
        throw new Error('Missing or invalid Authorization header');
      }

      const credentials = Buffer.from(authHeader.substring(6), 'base64').toString();
      const [username, password] = credentials.split(':');

      if (username !== expectedUsername || password !== expectedPassword) {
        throw new Error('Invalid credentials');
      }
    } else if (authentication === 'headerAuth') {
      const headerName = this.getNodeParameter(context, 'headerName', 'X-API-Key') as string;
      const expectedValue = this.getNodeParameter(context, 'headerValue') as string;

      const actualValue = request.headers[headerName] || request.headers[headerName.toLowerCase()];

      if (actualValue !== expectedValue) {
        throw new Error(`Invalid or missing ${headerName} header`);
      }
    }

    // Construct webhook data
    const webhookData: INodeDataItem = {
      json: {
        headers: request.headers,
        query: request.query,
        body: request.body,
        params: request.params,
        method: request.method,
        timestamp: new Date().toISOString(),
      },
    };

    // Get response configuration
    const responseMode = this.getNodeParameter(context, 'responseMode', 'onReceived') as string;
    const responseCode = this.getNodeParameter(context, 'responseCode', 200) as number;
    const responseHeadersParam = this.getNodeParameter(context, 'responseHeaders', '{}') as string;

    let responseHeaders: Record<string, string> = {};
    try {
      responseHeaders = typeof responseHeadersParam === 'string'
        ? JSON.parse(responseHeadersParam)
        : responseHeadersParam;
    } catch (error) {
      this.log('Failed to parse response headers, using empty object');
    }

    // Set default content-type if not specified
    if (!responseHeaders['Content-Type'] && !responseHeaders['content-type']) {
      responseHeaders['Content-Type'] = 'application/json';
    }

    // Return response configuration
    return {
      statusCode: responseCode,
      headers: responseHeaders,
      body: responseMode === 'onReceived'
        ? { success: true, message: 'Webhook received' }
        : null, // Will be filled by workflow execution result
    };
  }
}
