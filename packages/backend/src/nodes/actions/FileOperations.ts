/**
 * Orchestra © 2025
 * Author: Orchestra Team
 * License: Apache-2.0
 * Description: File operations node for reading, writing, and manipulating files
 */

import { NodeBase } from '../base/NodeBase';
import {
  INodeTypeDescription,
  INodeExecutionContext,
  INodeData,
  INodeDataItem,
} from '@/types';
import * as fs from 'fs/promises';
import * as path from 'path';

export class FileOperations extends NodeBase {
  description: INodeTypeDescription = {
    displayName: 'File Operations',
    name: 'fileOperations',
    group: ['action'],
    version: 1,
    description: 'Read, write, and manipulate files',
    defaults: {
      name: 'File Operations',
      color: '#F4B400',
    },
    inputs: ['main'],
    outputs: ['main'],
    properties: [
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        default: 'read',
        required: true,
        description: 'File operation to perform',
        options: [
          { name: 'Read File', value: 'read' },
          { name: 'Write File', value: 'write' },
          { name: 'Append to File', value: 'append' },
          { name: 'Delete File', value: 'delete' },
          { name: 'List Directory', value: 'list' },
          { name: 'Create Directory', value: 'mkdir' },
          { name: 'File Exists', value: 'exists' },
        ],
      },
      {
        displayName: 'File Path',
        name: 'filePath',
        type: 'string',
        default: '',
        displayOptions: {
          show: {
            operation: ['read', 'write', 'append', 'delete', 'exists'],
          },
        },
        required: true,
        description: 'Path to the file',
        placeholder: '/path/to/file.txt',
      },
      {
        displayName: 'Directory Path',
        name: 'directoryPath',
        type: 'string',
        default: '',
        displayOptions: {
          show: {
            operation: ['list', 'mkdir'],
          },
        },
        required: true,
        description: 'Path to the directory',
        placeholder: '/path/to/directory',
      },
      {
        displayName: 'Content',
        name: 'content',
        type: 'string',
        default: '',
        displayOptions: {
          show: {
            operation: ['write', 'append'],
          },
        },
        required: true,
        typeOptions: {
          rows: 5,
        },
        description: 'Content to write to file',
      },
      {
        displayName: 'Encoding',
        name: 'encoding',
        type: 'options',
        default: 'utf8',
        displayOptions: {
          show: {
            operation: ['read', 'write', 'append'],
          },
        },
        description: 'File encoding',
        options: [
          { name: 'UTF-8', value: 'utf8' },
          { name: 'ASCII', value: 'ascii' },
          { name: 'Base64', value: 'base64' },
          { name: 'Binary', value: 'binary' },
        ],
      },
    ],
  };

  async execute(context: INodeExecutionContext): Promise<INodeData> {
    const items = this.getInputData(context);
    const returnData: INodeDataItem[] = [];

    const operation = this.getNodeParameter(context, 'operation', 'read') as string;

    try {
      for (let i = 0; i < Math.max(items.length, 1); i++) {
        let result: any = {};

        if (operation === 'read') {
          const filePath = this.getNodeParameter(context, 'filePath') as string;
          const encoding = this.getNodeParameter(context, 'encoding', 'utf8') as BufferEncoding;

          const content = await fs.readFile(filePath, encoding);

          result = {
            success: true,
            filePath,
            content,
            size: Buffer.byteLength(content),
          };

          this.log(`Read file: ${filePath}`);
        } else if (operation === 'write') {
          const filePath = this.getNodeParameter(context, 'filePath') as string;
          const content = this.getNodeParameter(context, 'content', '') as string;
          const encoding = this.getNodeParameter(context, 'encoding', 'utf8') as BufferEncoding;

          await fs.writeFile(filePath, content, encoding);

          result = {
            success: true,
            filePath,
            operation: 'write',
            size: Buffer.byteLength(content),
          };

          this.log(`Wrote file: ${filePath}`);
        } else if (operation === 'append') {
          const filePath = this.getNodeParameter(context, 'filePath') as string;
          const content = this.getNodeParameter(context, 'content', '') as string;
          const encoding = this.getNodeParameter(context, 'encoding', 'utf8') as BufferEncoding;

          await fs.appendFile(filePath, content, encoding);

          result = {
            success: true,
            filePath,
            operation: 'append',
            size: Buffer.byteLength(content),
          };

          this.log(`Appended to file: ${filePath}`);
        } else if (operation === 'delete') {
          const filePath = this.getNodeParameter(context, 'filePath') as string;

          await fs.unlink(filePath);

          result = {
            success: true,
            filePath,
            operation: 'delete',
          };

          this.log(`Deleted file: ${filePath}`);
        } else if (operation === 'list') {
          const directoryPath = this.getNodeParameter(context, 'directoryPath') as string;

          const files = await fs.readdir(directoryPath);

          result = {
            success: true,
            directoryPath,
            files,
            count: files.length,
          };

          this.log(`Listed directory: ${directoryPath} (${files.length} items)`);
        } else if (operation === 'mkdir') {
          const directoryPath = this.getNodeParameter(context, 'directoryPath') as string;

          await fs.mkdir(directoryPath, { recursive: true });

          result = {
            success: true,
            directoryPath,
            operation: 'mkdir',
          };

          this.log(`Created directory: ${directoryPath}`);
        } else if (operation === 'exists') {
          const filePath = this.getNodeParameter(context, 'filePath') as string;

          try {
            await fs.access(filePath);
            result = {
              success: true,
              filePath,
              exists: true,
            };
          } catch {
            result = {
              success: true,
              filePath,
              exists: false,
            };
          }

          this.log(`Checked file existence: ${filePath} (${result.exists})`);
        }

        returnData.push({
          json: result,
        });
      }

      return this.returnData(returnData);
    } catch (error: any) {
      this.handleError(error, 'File operation failed');
      return this.returnData([{
        json: {
          success: false,
          error: error.message,
          operation,
        },
      }]);
    }
  }
}
