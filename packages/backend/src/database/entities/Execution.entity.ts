/**
 * Orchestra © 2025
 * Author: Orchestra Team
 * License: Apache-2.0
 * Description: Execution entity for storing workflow execution records
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ExecutionMode, ExecutionStatus, IExecutionData, IExecutionError } from '@/types';
import { Workflow } from './Workflow.entity';

@Entity('executions')
export class Execution {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  workflowId!: string;

  @Column({
    type: 'varchar',
    enum: ['manual', 'trigger', 'webhook', 'scheduled', 'internal'],
  })
  mode!: ExecutionMode;

  @Column({
    type: 'varchar',
    enum: ['new', 'running', 'success', 'error', 'waiting', 'canceled', 'crashed'],
  })
  status!: ExecutionStatus;

  @Column({ type: 'timestamp' })
  startTime!: Date;

  @Column({ type: 'timestamp', nullable: true })
  endTime?: Date;

  @Column({ type: 'jsonb', nullable: true })
  error?: IExecutionError;

  @Column({ type: 'jsonb' })
  data!: IExecutionData;

  @Column({ type: 'uuid', nullable: true })
  userId?: string;

  @Column({ type: 'uuid', nullable: true })
  parentExecutionId?: string;

  @Column({ type: 'int', default: 0 })
  retryCount!: number;

  @Column({ type: 'timestamp', nullable: true })
  deletedAt?: Date;

  @ManyToOne(() => Workflow, (workflow) => workflow.executions)
  @JoinColumn({ name: 'workflowId' })
  workflow!: Workflow;

  @CreateDateColumn()
  createdAt!: Date;
}
