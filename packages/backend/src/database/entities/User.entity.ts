/**
 * Orchestra © 2025
 * Author: Orchestra Team
 * License: Apache-2.0
 * Description: User entity for authentication and authorization
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { UserRole } from '@/types';
import { Workflow } from './Workflow.entity';
import { Credential } from './Credential.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  email!: string;

  @Column({ nullable: true })
  passwordHash?: string;

  @Column({ nullable: true })
  firstName?: string;

  @Column({ nullable: true })
  lastName?: string;

  @Column({
    type: 'varchar',
    enum: ['admin', 'editor', 'viewer', 'developer'],
    default: 'editor',
  })
  role!: UserRole;

  @Column({ type: 'uuid', nullable: true })
  teamId?: string;

  @Column({ type: 'jsonb', nullable: true })
  settings?: Record<string, any>;

  @Column({ default: true })
  isActive!: boolean;

  @Column({ nullable: true })
  lastLoginAt?: Date;

  @OneToMany(() => Workflow, (workflow) => workflow.owner)
  workflows!: Workflow[];

  @OneToMany(() => Credential, (credential) => credential.owner)
  credentials!: Credential[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
