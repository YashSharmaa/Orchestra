/**
 * Orchestra © 2025
 * Author: Orchestra Team
 * License: Apache-2.0
 * Description: Credential entity for storing encrypted credentials
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './User.entity';

@Entity('credentials')
export class Credential {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  name!: string;

  @Column()
  type!: string;

  @Column({ type: 'text' })
  encryptedData!: string;

  @Column({ type: 'uuid' })
  ownerId!: string;

  @Column({ type: 'uuid', nullable: true })
  teamId?: string;

  @Column({ default: false })
  isShared!: boolean;

  @ManyToOne(() => User, (user) => user.credentials)
  @JoinColumn({ name: 'ownerId' })
  owner!: User;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
