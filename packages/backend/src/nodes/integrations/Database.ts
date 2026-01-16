/**
 * Orchestra © 2025
 * Author: Orchestra Team
 * License: Apache-2.0
 * Description: Database node for executing database queries
 */

import { NodeBase } from '../base/NodeBase';
import {
  INodeTypeDescription,
  INodeExecutionContext,
  INodeData,
  INodeDataItem,
} from '@/types';

// Import database clients
import { Pool as PgPool } from 'pg';
import mysql from 'mysql2/promise';
import * as mssql from 'mssql';
import sqlite3 from 'sqlite3';
import { promisify } from 'util';

export class Database extends NodeBase {
  description: INodeTypeDescription = {
    displayName: 'Database',
    name: 'database',
    group: ['database', 'integration'],
    version: 1,
    description: 'Execute database queries (PostgreSQL, MySQL, etc.)',
    defaults: {
      name: 'Database',
      color: '#336791',
    },
    inputs: ['main'],
    outputs: ['main'],
    properties: [
      {
        displayName: 'Database Type',
        name: 'databaseType',
        type: 'options',
        default: 'postgres',
        required: true,
        description: 'Type of database to connect to',
        options: [
          { name: 'PostgreSQL', value: 'postgres' },
          { name: 'MySQL', value: 'mysql' },
          { name: 'Microsoft SQL Server', value: 'mssql' },
          { name: 'SQLite', value: 'sqlite' },
        ],
      },
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        default: 'query',
        required: true,
        description: 'Operation to perform',
        options: [
          { name: 'Execute Query', value: 'query' },
          { name: 'Insert', value: 'insert' },
          { name: 'Update', value: 'update' },
          { name: 'Delete', value: 'delete' },
        ],
      },
      {
        displayName: 'Host',
        name: 'host',
        type: 'string',
        default: 'localhost',
        required: true,
        displayOptions: {
          show: {
            databaseType: ['postgres', 'mysql', 'mssql'],
          },
        },
        description: 'Database host',
      },
      {
        displayName: 'Port',
        name: 'port',
        type: 'number',
        default: 5432,
        required: true,
        displayOptions: {
          show: {
            databaseType: ['postgres', 'mysql', 'mssql'],
          },
        },
        description: 'Database port',
        typeOptions: {
          minValue: 1,
          maxValue: 65535,
        },
      },
      {
        displayName: 'Database',
        name: 'database',
        type: 'string',
        default: '',
        required: true,
        description: 'Database name',
      },
      {
        displayName: 'Username',
        name: 'username',
        type: 'string',
        default: '',
        required: true,
        displayOptions: {
          show: {
            databaseType: ['postgres', 'mysql', 'mssql'],
          },
        },
        description: 'Database username',
      },
      {
        displayName: 'Password',
        name: 'password',
        type: 'string',
        default: '',
        required: true,
        displayOptions: {
          show: {
            databaseType: ['postgres', 'mysql', 'mssql'],
          },
        },
        typeOptions: {
          password: true,
        },
        description: 'Database password',
      },
      {
        displayName: 'Query',
        name: 'query',
        type: 'string',
        default: '',
        displayOptions: {
          show: {
            operation: ['query'],
          },
        },
        required: true,
        typeOptions: {
          rows: 10,
          alwaysOpenEditWindow: true,
        },
        description: 'SQL query to execute',
        placeholder: 'SELECT * FROM users WHERE id = $1',
      },
      {
        displayName: 'Table',
        name: 'table',
        type: 'string',
        default: '',
        displayOptions: {
          show: {
            operation: ['insert', 'update', 'delete'],
          },
        },
        required: true,
        description: 'Table name',
      },
      {
        displayName: 'Columns',
        name: 'columns',
        type: 'json',
        default: '{}',
        displayOptions: {
          show: {
            operation: ['insert', 'update'],
          },
        },
        required: true,
        typeOptions: {
          rows: 5,
        },
        description: 'Columns and values as JSON object',
        placeholder: '{"name": "John", "email": "john@example.com"}',
      },
      {
        displayName: 'Where Condition',
        name: 'whereCondition',
        type: 'string',
        default: '',
        displayOptions: {
          show: {
            operation: ['update', 'delete'],
          },
        },
        description: 'WHERE clause condition',
        placeholder: 'id = 123',
      },
      {
        displayName: 'Parameters',
        name: 'parameters',
        type: 'json',
        default: '[]',
        description: 'Query parameters as JSON array (for parameterized queries)',
        placeholder: '[1, "value2", true]',
      },
      {
        displayName: 'Return Fields',
        name: 'returnFields',
        type: 'string',
        default: '*',
        displayOptions: {
          show: {
            operation: ['insert', 'update'],
          },
        },
        description: 'Fields to return after insert/update (PostgreSQL RETURNING clause)',
      },
      {
        displayName: 'SSL',
        name: 'ssl',
        type: 'boolean',
        default: false,
        displayOptions: {
          show: {
            databaseType: ['postgres', 'mysql', 'mssql'],
          },
        },
        description: 'Use SSL/TLS connection',
      },
    ],
  };

  async execute(context: INodeExecutionContext): Promise<INodeData> {
    const items = this.getInputData(context);
    const returnData: INodeDataItem[] = [];

    const databaseType = this.getNodeParameter(context, 'databaseType', 'postgres') as string;
    const operation = this.getNodeParameter(context, 'operation', 'query') as string;

    // Get connection parameters
    const host = this.getNodeParameter(context, 'host', 'localhost') as string;
    const port = this.getNodeParameter(context, 'port', 5432) as number;
    const database = this.getNodeParameter(context, 'database') as string;
    const username = this.getNodeParameter(context, 'username', '') as string;
    const password = this.getNodeParameter(context, 'password', '') as string;
    const ssl = this.getNodeParameter(context, 'ssl', false) as boolean;

    // Validate required parameters
    this.validateRequiredParameters(context, ['database']);

    if (databaseType === 'postgres') {
      await this.executePostgres(context, items, operation, {
        host,
        port,
        database,
        username,
        password,
        ssl,
      }, returnData);
    } else if (databaseType === 'mysql') {
      await this.executeMySQL(context, items, operation, {
        host,
        port,
        database,
        username,
        password,
        ssl,
      }, returnData);
    } else if (databaseType === 'mssql') {
      await this.executeMSSQL(context, items, operation, {
        host,
        port,
        database,
        username,
        password,
        ssl,
      }, returnData);
    } else if (databaseType === 'sqlite') {
      await this.executeSQLite(context, items, operation, {
        database,
      }, returnData);
    } else {
      throw new Error(`Database type ${databaseType} is not yet implemented`);
    }

    return this.returnData(returnData);
  }

  private async executePostgres(
    context: INodeExecutionContext,
    items: INodeDataItem[],
    operation: string,
    config: {
      host: string;
      port: number;
      database: string;
      username: string;
      password: string;
      ssl: boolean;
    },
    returnData: INodeDataItem[]
  ): Promise<void> {
    // Create connection pool
    const pool = new PgPool({
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.username,
      password: config.password,
      ssl: config.ssl ? { rejectUnauthorized: false } : false,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });

    try {
      // Test connection
      const client = await pool.connect();
      client.release();
      this.log('Database connection established');

      // Process each input item
      for (let i = 0; i < Math.max(items.length, 1); i++) {
        try {
          let query: string;
          let parameters: any[] = [];

          if (operation === 'query') {
            // Execute custom query
            query = this.getNodeParameter(context, 'query') as string;
            query = this.replaceVariables(query, context, i);

            // Parse parameters
            const parametersParam = this.getNodeParameter(context, 'parameters', '[]') as string;
            try {
              parameters = typeof parametersParam === 'string'
                ? JSON.parse(parametersParam)
                : parametersParam;
            } catch (error) {
              this.log('Failed to parse parameters, using empty array');
            }
          } else if (operation === 'insert') {
            // Build INSERT query
            const result = this.buildInsertQuery(context, i);
            query = result.query;
            parameters = result.parameters;
          } else if (operation === 'update') {
            // Build UPDATE query
            const result = this.buildUpdateQuery(context, i);
            query = result.query;
            parameters = result.parameters;
          } else if (operation === 'delete') {
            // Build DELETE query
            const result = this.buildDeleteQuery(context, i);
            query = result.query;
            parameters = result.parameters;
          } else {
            throw new Error(`Unknown operation: ${operation}`);
          }

          // Execute query
          this.log(`Executing query: ${query}`, parameters);
          const result = await pool.query(query, parameters);

          // Create result item
          const resultItem: INodeDataItem = {
            json: {
              success: true,
              rowCount: result.rowCount || 0,
              rows: result.rows || [],
              command: result.command,
            },
          };

          returnData.push(resultItem);
        } catch (error: any) {
          if (context.node.alwaysOutputData) {
            returnData.push({
              json: {
                success: false,
                error: error.message,
              },
            });
          } else {
            throw error;
          }
        }
      }
    } catch (error: any) {
      this.handleError(error, 'Database operation failed');
    } finally {
      // Close pool
      await pool.end();
      this.log('Database connection closed');
    }
  }

  private buildInsertQuery(
    context: INodeExecutionContext,
    itemIndex: number
  ): { query: string; parameters: any[] } {
    const table = this.getNodeParameter(context, 'table') as string;
    const columnsParam = this.getNodeParameter(context, 'columns', '{}') as string;
    const returnFields = this.getNodeParameter(context, 'returnFields', '*') as string;

    let columns: Record<string, any>;
    try {
      columns = typeof columnsParam === 'string' ? JSON.parse(columnsParam) : columnsParam;
    } catch (error) {
      throw new Error('Failed to parse columns JSON');
    }

    const columnNames = Object.keys(columns);
    const values = Object.values(columns);
    const placeholders = values.map((_, idx) => `$${idx + 1}`);

    const query = `INSERT INTO ${table} (${columnNames.join(', ')}) VALUES (${placeholders.join(', ')}) RETURNING ${returnFields}`;

    return { query, parameters: values };
  }

  private buildUpdateQuery(
    context: INodeExecutionContext,
    itemIndex: number
  ): { query: string; parameters: any[] } {
    const table = this.getNodeParameter(context, 'table') as string;
    const columnsParam = this.getNodeParameter(context, 'columns', '{}') as string;
    const whereCondition = this.getNodeParameter(context, 'whereCondition', '') as string;
    const returnFields = this.getNodeParameter(context, 'returnFields', '*') as string;

    let columns: Record<string, any>;
    try {
      columns = typeof columnsParam === 'string' ? JSON.parse(columnsParam) : columnsParam;
    } catch (error) {
      throw new Error('Failed to parse columns JSON');
    }

    const columnNames = Object.keys(columns);
    const values = Object.values(columns);
    const setClause = columnNames.map((name, idx) => `${name} = $${idx + 1}`).join(', ');

    let query = `UPDATE ${table} SET ${setClause}`;

    if (whereCondition) {
      query += ` WHERE ${this.replaceVariables(whereCondition, context, itemIndex)}`;
    }

    query += ` RETURNING ${returnFields}`;

    return { query, parameters: values };
  }

  private buildDeleteQuery(
    context: INodeExecutionContext,
    itemIndex: number
  ): { query: string; parameters: any[] } {
    const table = this.getNodeParameter(context, 'table') as string;
    const whereCondition = this.getNodeParameter(context, 'whereCondition', '') as string;

    let query = `DELETE FROM ${table}`;

    if (whereCondition) {
      query += ` WHERE ${this.replaceVariables(whereCondition, context, itemIndex)}`;
    }

    return { query, parameters: [] };
  }

  private async executeMySQL(
    context: INodeExecutionContext,
    items: INodeDataItem[],
    operation: string,
    config: {
      host: string;
      port: number;
      database: string;
      username: string;
      password: string;
      ssl: boolean;
    },
    returnData: INodeDataItem[]
  ): Promise<void> {
    // Create connection pool
    const pool = mysql.createPool({
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.username,
      password: config.password,
      ssl: config.ssl ? {} : undefined,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    });

    try {
      // Test connection
      const connection = await pool.getConnection();
      connection.release();
      this.log('MySQL connection established');

      // Process each input item
      for (let i = 0; i < Math.max(items.length, 1); i++) {
        try {
          let query: string;
          let parameters: any[] = [];

          if (operation === 'query') {
            query = this.getNodeParameter(context, 'query') as string;
            query = this.replaceVariables(query, context, i);
            query = query.replace(/\$(\d+)/g, '?'); // Convert $1, $2 to ?

            const parametersParam = this.getNodeParameter(context, 'parameters', '[]') as string;
            try {
              parameters = typeof parametersParam === 'string'
                ? JSON.parse(parametersParam)
                : parametersParam;
            } catch (error) {
              this.log('Failed to parse parameters, using empty array');
            }
          } else if (operation === 'insert') {
            const result = this.buildInsertQueryMySQL(context, i);
            query = result.query;
            parameters = result.parameters;
          } else if (operation === 'update') {
            const result = this.buildUpdateQueryMySQL(context, i);
            query = result.query;
            parameters = result.parameters;
          } else if (operation === 'delete') {
            const result = this.buildDeleteQuery(context, i);
            query = result.query;
            parameters = result.parameters;
          } else {
            throw new Error(`Unknown operation: ${operation}`);
          }

          this.log(`Executing MySQL query: ${query}`, parameters);
          const [rows, fields] = await pool.query(query, parameters);

          const resultItem: INodeDataItem = {
            json: {
              success: true,
              affectedRows: (rows as any).affectedRows || 0,
              insertId: (rows as any).insertId,
              rows: Array.isArray(rows) ? rows : [],
            },
          };

          returnData.push(resultItem);
        } catch (error: any) {
          if (context.node.alwaysOutputData) {
            returnData.push({
              json: {
                success: false,
                error: error.message,
              },
            });
          } else {
            throw error;
          }
        }
      }
    } catch (error: any) {
      this.handleError(error, 'MySQL operation failed');
    } finally {
      await pool.end();
      this.log('MySQL connection closed');
    }
  }

  private async executeMSSQL(
    context: INodeExecutionContext,
    items: INodeDataItem[],
    operation: string,
    config: {
      host: string;
      port: number;
      database: string;
      username: string;
      password: string;
      ssl: boolean;
    },
    returnData: INodeDataItem[]
  ): Promise<void> {
    const poolConfig: mssql.config = {
      server: config.host,
      port: config.port,
      database: config.database,
      user: config.username,
      password: config.password,
      options: {
        encrypt: config.ssl,
        trustServerCertificate: !config.ssl,
      },
      pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000,
      },
    };

    const pool = new mssql.ConnectionPool(poolConfig);

    try {
      await pool.connect();
      this.log('MSSQL connection established');

      for (let i = 0; i < Math.max(items.length, 1); i++) {
        try {
          let query: string;
          let parameters: any[] = [];

          if (operation === 'query') {
            query = this.getNodeParameter(context, 'query') as string;
            query = this.replaceVariables(query, context, i);
            query = query.replace(/\$(\d+)/g, (_, num) => `@param${num}`); // Convert $1 to @param1

            const parametersParam = this.getNodeParameter(context, 'parameters', '[]') as string;
            try {
              parameters = typeof parametersParam === 'string'
                ? JSON.parse(parametersParam)
                : parametersParam;
            } catch (error) {
              this.log('Failed to parse parameters, using empty array');
            }
          } else if (operation === 'insert') {
            const result = this.buildInsertQueryMSSQL(context, i);
            query = result.query;
            parameters = result.parameters;
          } else if (operation === 'update') {
            const result = this.buildUpdateQueryMSSQL(context, i);
            query = result.query;
            parameters = result.parameters;
          } else if (operation === 'delete') {
            const result = this.buildDeleteQuery(context, i);
            query = result.query;
            parameters = result.parameters;
          } else {
            throw new Error(`Unknown operation: ${operation}`);
          }

          this.log(`Executing MSSQL query: ${query}`, parameters);
          const request = pool.request();

          // Add parameters
          parameters.forEach((param, idx) => {
            request.input(`param${idx + 1}`, param);
          });

          const result = await request.query(query);

          const resultItem: INodeDataItem = {
            json: {
              success: true,
              rowsAffected: result.rowsAffected[0] || 0,
              rows: result.recordset || [],
            },
          };

          returnData.push(resultItem);
        } catch (error: any) {
          if (context.node.alwaysOutputData) {
            returnData.push({
              json: {
                success: false,
                error: error.message,
              },
            });
          } else {
            throw error;
          }
        }
      }
    } catch (error: any) {
      this.handleError(error, 'MSSQL operation failed');
    } finally {
      await pool.close();
      this.log('MSSQL connection closed');
    }
  }

  private async executeSQLite(
    context: INodeExecutionContext,
    items: INodeDataItem[],
    operation: string,
    config: {
      database: string;
    },
    returnData: INodeDataItem[]
  ): Promise<void> {
    const db = new sqlite3.Database(config.database);
    const dbRun = promisify(db.run.bind(db));
    const dbAll = promisify(db.all.bind(db));

    try {
      this.log('SQLite connection established');

      for (let i = 0; i < Math.max(items.length, 1); i++) {
        try {
          let query: string;
          let parameters: any[] = [];

          if (operation === 'query') {
            query = this.getNodeParameter(context, 'query') as string;
            query = this.replaceVariables(query, context, i);
            query = query.replace(/\$(\d+)/g, '?'); // Convert $1, $2 to ?

            const parametersParam = this.getNodeParameter(context, 'parameters', '[]') as string;
            try {
              parameters = typeof parametersParam === 'string'
                ? JSON.parse(parametersParam)
                : parametersParam;
            } catch (error) {
              this.log('Failed to parse parameters, using empty array');
            }
          } else if (operation === 'insert') {
            const result = this.buildInsertQuerySQLite(context, i);
            query = result.query;
            parameters = result.parameters;
          } else if (operation === 'update') {
            const result = this.buildUpdateQuerySQLite(context, i);
            query = result.query;
            parameters = result.parameters;
          } else if (operation === 'delete') {
            const result = this.buildDeleteQuery(context, i);
            query = result.query;
            parameters = result.parameters;
          } else {
            throw new Error(`Unknown operation: ${operation}`);
          }

          this.log(`Executing SQLite query: ${query}`, parameters);

          let rows: any[];
          if (operation === 'query' || query.toUpperCase().startsWith('SELECT')) {
            // SQLite allows passing parameters as array or spread
            rows = parameters.length > 0
              ? (await (dbAll as any)(query, parameters)) as any[]
              : (await dbAll(query)) as any[];
          } else {
            const result: any = parameters.length > 0
              ? await (dbRun as any)(query, parameters)
              : await dbRun(query);
            rows = [{ changes: result.changes, lastID: result.lastID }];
          }

          const resultItem: INodeDataItem = {
            json: {
              success: true,
              rows: rows,
              rowCount: rows.length,
            },
          };

          returnData.push(resultItem);
        } catch (error: any) {
          if (context.node.alwaysOutputData) {
            returnData.push({
              json: {
                success: false,
                error: error.message,
              },
            });
          } else {
            throw error;
          }
        }
      }
    } catch (error: any) {
      this.handleError(error, 'SQLite operation failed');
    } finally {
      db.close();
      this.log('SQLite connection closed');
    }
  }

  private buildInsertQueryMySQL(
    context: INodeExecutionContext,
    itemIndex: number
  ): { query: string; parameters: any[] } {
    const table = this.getNodeParameter(context, 'table') as string;
    const columnsParam = this.getNodeParameter(context, 'columns', '{}') as string;

    let columns: Record<string, any>;
    try {
      columns = typeof columnsParam === 'string' ? JSON.parse(columnsParam) : columnsParam;
    } catch (error) {
      throw new Error('Failed to parse columns JSON');
    }

    const columnNames = Object.keys(columns);
    const values = Object.values(columns);
    const placeholders = values.map(() => '?');

    const query = `INSERT INTO ${table} (${columnNames.join(', ')}) VALUES (${placeholders.join(', ')})`;

    return { query, parameters: values };
  }

  private buildUpdateQueryMySQL(
    context: INodeExecutionContext,
    itemIndex: number
  ): { query: string; parameters: any[] } {
    const table = this.getNodeParameter(context, 'table') as string;
    const columnsParam = this.getNodeParameter(context, 'columns', '{}') as string;
    const whereCondition = this.getNodeParameter(context, 'whereCondition', '') as string;

    let columns: Record<string, any>;
    try {
      columns = typeof columnsParam === 'string' ? JSON.parse(columnsParam) : columnsParam;
    } catch (error) {
      throw new Error('Failed to parse columns JSON');
    }

    const columnNames = Object.keys(columns);
    const values = Object.values(columns);
    const setClause = columnNames.map(name => `${name} = ?`).join(', ');

    let query = `UPDATE ${table} SET ${setClause}`;

    if (whereCondition) {
      query += ` WHERE ${this.replaceVariables(whereCondition, context, itemIndex)}`;
    }

    return { query, parameters: values };
  }

  private buildInsertQueryMSSQL(
    context: INodeExecutionContext,
    itemIndex: number
  ): { query: string; parameters: any[] } {
    const table = this.getNodeParameter(context, 'table') as string;
    const columnsParam = this.getNodeParameter(context, 'columns', '{}') as string;

    let columns: Record<string, any>;
    try {
      columns = typeof columnsParam === 'string' ? JSON.parse(columnsParam) : columnsParam;
    } catch (error) {
      throw new Error('Failed to parse columns JSON');
    }

    const columnNames = Object.keys(columns);
    const values = Object.values(columns);
    const placeholders = values.map((_, idx) => `@param${idx + 1}`);

    const query = `INSERT INTO ${table} (${columnNames.join(', ')}) OUTPUT INSERTED.* VALUES (${placeholders.join(', ')})`;

    return { query, parameters: values };
  }

  private buildUpdateQueryMSSQL(
    context: INodeExecutionContext,
    itemIndex: number
  ): { query: string; parameters: any[] } {
    const table = this.getNodeParameter(context, 'table') as string;
    const columnsParam = this.getNodeParameter(context, 'columns', '{}') as string;
    const whereCondition = this.getNodeParameter(context, 'whereCondition', '') as string;

    let columns: Record<string, any>;
    try {
      columns = typeof columnsParam === 'string' ? JSON.parse(columnsParam) : columnsParam;
    } catch (error) {
      throw new Error('Failed to parse columns JSON');
    }

    const columnNames = Object.keys(columns);
    const values = Object.values(columns);
    const setClause = columnNames.map((name, idx) => `${name} = @param${idx + 1}`).join(', ');

    let query = `UPDATE ${table} SET ${setClause}`;

    if (whereCondition) {
      query += ` WHERE ${this.replaceVariables(whereCondition, context, itemIndex)}`;
    }

    query += ` OUTPUT INSERTED.*`;

    return { query, parameters: values };
  }

  private buildInsertQuerySQLite(
    context: INodeExecutionContext,
    itemIndex: number
  ): { query: string; parameters: any[] } {
    const table = this.getNodeParameter(context, 'table') as string;
    const columnsParam = this.getNodeParameter(context, 'columns', '{}') as string;

    let columns: Record<string, any>;
    try {
      columns = typeof columnsParam === 'string' ? JSON.parse(columnsParam) : columnsParam;
    } catch (error) {
      throw new Error('Failed to parse columns JSON');
    }

    const columnNames = Object.keys(columns);
    const values = Object.values(columns);
    const placeholders = values.map(() => '?');

    const query = `INSERT INTO ${table} (${columnNames.join(', ')}) VALUES (${placeholders.join(', ')})`;

    return { query, parameters: values };
  }

  private buildUpdateQuerySQLite(
    context: INodeExecutionContext,
    itemIndex: number
  ): { query: string; parameters: any[] } {
    const table = this.getNodeParameter(context, 'table') as string;
    const columnsParam = this.getNodeParameter(context, 'columns', '{}') as string;
    const whereCondition = this.getNodeParameter(context, 'whereCondition', '') as string;

    let columns: Record<string, any>;
    try {
      columns = typeof columnsParam === 'string' ? JSON.parse(columnsParam) : columnsParam;
    } catch (error) {
      throw new Error('Failed to parse columns JSON');
    }

    const columnNames = Object.keys(columns);
    const values = Object.values(columns);
    const setClause = columnNames.map(name => `${name} = ?`).join(', ');

    let query = `UPDATE ${table} SET ${setClause}`;

    if (whereCondition) {
      query += ` WHERE ${this.replaceVariables(whereCondition, context, itemIndex)}`;
    }

    return { query, parameters: values };
  }
}
