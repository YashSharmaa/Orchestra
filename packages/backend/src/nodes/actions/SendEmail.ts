/**
 * Orchestra © 2025
 * Author: Orchestra Team
 * License: Apache-2.0
 * Description: Send Email node for sending emails via SMTP
 */

import * as nodemailer from 'nodemailer';
import { NodeBase } from '../base/NodeBase';
import {
  INodeTypeDescription,
  INodeExecutionContext,
  INodeData,
  INodeDataItem,
} from '@/types';

export class SendEmail extends NodeBase {
  description: INodeTypeDescription = {
    displayName: 'Send Email',
    name: 'sendEmail',
    group: ['action', 'notification'],
    version: 1,
    description: 'Send emails via SMTP',
    defaults: {
      name: 'Send Email',
      color: '#EA4335',
    },
    inputs: ['main'],
    outputs: ['main'],
    properties: [
      {
        displayName: 'SMTP Host',
        name: 'host',
        type: 'string',
        default: '',
        required: true,
        description: 'SMTP server hostname',
        placeholder: 'smtp.gmail.com',
      },
      {
        displayName: 'SMTP Port',
        name: 'port',
        type: 'number',
        default: 587,
        required: true,
        description: 'SMTP server port (587 for TLS, 465 for SSL)',
        typeOptions: {
          minValue: 1,
          maxValue: 65535,
        },
      },
      {
        displayName: 'Secure Connection',
        name: 'secure',
        type: 'boolean',
        default: false,
        description: 'Use SSL/TLS (port 465). If false, uses STARTTLS (port 587)',
      },
      {
        displayName: 'Username',
        name: 'username',
        type: 'string',
        default: '',
        required: true,
        description: 'SMTP authentication username',
      },
      {
        displayName: 'Password',
        name: 'password',
        type: 'string',
        default: '',
        required: true,
        typeOptions: {
          password: true,
        },
        description: 'SMTP authentication password',
      },
      {
        displayName: 'From Email',
        name: 'fromEmail',
        type: 'string',
        default: '',
        required: true,
        description: 'Sender email address',
        placeholder: 'sender@example.com',
      },
      {
        displayName: 'From Name',
        name: 'fromName',
        type: 'string',
        default: '',
        description: 'Sender name',
        placeholder: 'John Doe',
      },
      {
        displayName: 'To',
        name: 'toEmail',
        type: 'string',
        default: '',
        required: true,
        description: 'Recipient email address(es), comma-separated',
        placeholder: 'recipient@example.com, another@example.com',
      },
      {
        displayName: 'CC',
        name: 'ccEmail',
        type: 'string',
        default: '',
        description: 'CC email address(es), comma-separated',
        placeholder: 'cc@example.com',
      },
      {
        displayName: 'BCC',
        name: 'bccEmail',
        type: 'string',
        default: '',
        description: 'BCC email address(es), comma-separated',
        placeholder: 'bcc@example.com',
      },
      {
        displayName: 'Subject',
        name: 'subject',
        type: 'string',
        default: '',
        required: true,
        description: 'Email subject line',
        placeholder: 'Hello from Orchestra',
      },
      {
        displayName: 'Email Type',
        name: 'emailType',
        type: 'options',
        default: 'text',
        description: 'Type of email content',
        options: [
          { name: 'Plain Text', value: 'text' },
          { name: 'HTML', value: 'html' },
          { name: 'Both', value: 'both' },
        ],
      },
      {
        displayName: 'Text Content',
        name: 'text',
        type: 'string',
        default: '',
        displayOptions: {
          show: {
            emailType: ['text', 'both'],
          },
        },
        typeOptions: {
          rows: 5,
        },
        description: 'Plain text email content',
      },
      {
        displayName: 'HTML Content',
        name: 'html',
        type: 'string',
        default: '',
        displayOptions: {
          show: {
            emailType: ['html', 'both'],
          },
        },
        typeOptions: {
          rows: 10,
          alwaysOpenEditWindow: true,
        },
        description: 'HTML email content',
      },
      {
        displayName: 'Reply To',
        name: 'replyTo',
        type: 'string',
        default: '',
        description: 'Reply-to email address',
        placeholder: 'reply@example.com',
      },
      {
        displayName: 'Priority',
        name: 'priority',
        type: 'options',
        default: 'normal',
        description: 'Email priority',
        options: [
          { name: 'High', value: 'high' },
          { name: 'Normal', value: 'normal' },
          { name: 'Low', value: 'low' },
        ],
      },
      {
        displayName: 'Attachments',
        name: 'attachments',
        type: 'json',
        default: '[]',
        description: 'Email attachments as JSON array',
        placeholder: '[{"filename": "file.txt", "content": "base64content", "encoding": "base64"}]',
      },
    ],
  };

  async execute(context: INodeExecutionContext): Promise<INodeData> {
    const items = this.getInputData(context);
    const returnData: INodeDataItem[] = [];

    // Get SMTP configuration
    const host = this.getNodeParameter(context, 'host') as string;
    const port = this.getNodeParameter(context, 'port', 587) as number;
    const secure = this.getNodeParameter(context, 'secure', false) as boolean;
    const username = this.getNodeParameter(context, 'username') as string;
    const password = this.getNodeParameter(context, 'password') as string;

    // Validate required parameters
    this.validateRequiredParameters(context, ['host', 'port', 'username', 'password', 'fromEmail', 'toEmail', 'subject']);

    // Create transporter
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: {
        user: username,
        pass: password,
      },
      tls: {
        rejectUnauthorized: false, // Allow self-signed certificates in dev
      },
    });

    // Verify connection
    try {
      await transporter.verify();
      this.log('SMTP connection verified successfully');
    } catch (error) {
      this.handleError(error, 'Failed to verify SMTP connection');
    }

    // Get email parameters
    const fromEmail = this.getNodeParameter(context, 'fromEmail') as string;
    const fromName = this.getNodeParameter(context, 'fromName', '') as string;
    const toEmail = this.getNodeParameter(context, 'toEmail') as string;
    const ccEmail = this.getNodeParameter(context, 'ccEmail', '') as string;
    const bccEmail = this.getNodeParameter(context, 'bccEmail', '') as string;
    const subject = this.getNodeParameter(context, 'subject') as string;
    const emailType = this.getNodeParameter(context, 'emailType', 'text') as string;
    const replyTo = this.getNodeParameter(context, 'replyTo', '') as string;
    const priority = this.getNodeParameter(context, 'priority', 'normal') as string;

    // Process each input item
    for (let i = 0; i < Math.max(items.length, 1); i++) {
      try {
        // Replace variables in email fields
        const processedSubject = this.replaceVariables(subject, context, i);
        const processedToEmail = this.replaceVariables(toEmail, context, i);
        const processedCcEmail = ccEmail ? this.replaceVariables(ccEmail, context, i) : '';
        const processedBccEmail = bccEmail ? this.replaceVariables(bccEmail, context, i) : '';

        // Build mail options
        const mailOptions: any = {
          from: fromName ? `"${fromName}" <${fromEmail}>` : fromEmail,
          to: processedToEmail,
          subject: processedSubject,
        };

        // Add CC and BCC if provided
        if (processedCcEmail) {
          mailOptions.cc = processedCcEmail;
        }
        if (processedBccEmail) {
          mailOptions.bcc = processedBccEmail;
        }

        // Add reply-to if provided
        if (replyTo) {
          mailOptions.replyTo = this.replaceVariables(replyTo, context, i);
        }

        // Set priority
        if (priority === 'high') {
          mailOptions.priority = 'high';
          mailOptions.headers = { 'X-Priority': '1' };
        } else if (priority === 'low') {
          mailOptions.priority = 'low';
          mailOptions.headers = { 'X-Priority': '5' };
        }

        // Add email content
        if (emailType === 'text' || emailType === 'both') {
          const textContent = this.getNodeParameter(context, 'text', '') as string;
          mailOptions.text = this.replaceVariables(textContent, context, i);
        }

        if (emailType === 'html' || emailType === 'both') {
          const htmlContent = this.getNodeParameter(context, 'html', '') as string;
          mailOptions.html = this.replaceVariables(htmlContent, context, i);
        }

        // Add attachments if provided
        const attachmentsParam = this.getNodeParameter(context, 'attachments', '[]') as string;
        try {
          const attachments = typeof attachmentsParam === 'string'
            ? JSON.parse(attachmentsParam)
            : attachmentsParam;

          if (Array.isArray(attachments) && attachments.length > 0) {
            mailOptions.attachments = attachments;
          }
        } catch (error) {
          this.log('Failed to parse attachments, skipping', error);
        }

        // Send email
        this.log(`Sending email to ${processedToEmail}`);
        const info = await transporter.sendMail(mailOptions);

        // Create result item
        const resultItem: INodeDataItem = {
          json: {
            success: true,
            messageId: info.messageId,
            accepted: info.accepted,
            rejected: info.rejected,
            response: info.response,
            to: processedToEmail,
            subject: processedSubject,
          },
        };

        returnData.push(resultItem);
        this.log(`Email sent successfully: ${info.messageId}`);
      } catch (error: any) {
        if (context.node.alwaysOutputData) {
          returnData.push({
            json: {
              success: false,
              error: error.message,
            },
          });
        } else {
          this.handleError(error, 'Failed to send email');
        }
      }
    }

    return this.returnData(returnData);
  }
}
