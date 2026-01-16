/**
 * Orchestra © 2025
 * Author: Orchestra Team
 * License: Apache-2.0
 * Description: Workflow entity for storing workflow definitions
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { INode, IConnection, IWorkflowSettings } from '@/types';
import { User } from './User.entity';
import { Execution } from './Execution.entity';

@Entity('workflows')
export class Workflow {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  name!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'int', default: 1 })
  version!: number;

  @Column({ type: 'jsonb' })
  nodes!: INode[];

  @Column({ type: 'jsonb' })
  connections!: IConnection[];

  @Column({ type: 'jsonb', nullable: true })
  settings?: IWorkflowSettings;

  @Column({ type: 'uuid' })
  ownerId!: string;

  @Column({ type: 'uuid', nullable: true })
  teamId?: string;

  @Column({ type: 'simple-array', nullable: true })
  tags?: string[];

  @Column({ default: false })
  isPublic!: boolean;

  @Column({ default: false })
  isTemplate!: boolean;

  @Column({ nullable: true })
  templateCategory?: string;

  @Column({ default: false })
  verified!: boolean;

  @Column({ default: true })
  isActive!: boolean;

  @ManyToOne(() => User, (user) => user.workflows)
  @JoinColumn({ name: 'ownerId' })
  owner!: User;

  @OneToMany(() => Execution, (execution) => execution.workflow)
  executions!: Execution[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
