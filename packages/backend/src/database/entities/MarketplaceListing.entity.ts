/**
 * Orchestra © 2025
 * Author: Orchestra Team
 * License: Apache-2.0
 * Description: Marketplace listing entity for workflow templates
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('marketplace_listings')
export class MarketplaceListing {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  workflowId!: string;

  @Column()
  title!: string;

  @Column({ type: 'text' })
  description!: string;

  @Column()
  category!: string;

  @Column({ type: 'simple-array' })
  tags!: string[];

  @Column({ type: 'uuid' })
  authorId!: string;

  @Column({ type: 'uuid', nullable: true })
  teamId?: string;

  @Column({
    type: 'varchar',
    enum: ['private', 'team', 'organization', 'public'],
    default: 'private',
  })
  visibility!: string;

  @Column({ default: false })
  verified!: boolean;

  @Column({ type: 'int', default: 0 })
  downloads!: number;

  @Column({ type: 'decimal', precision: 3, scale: 2, nullable: true })
  rating?: number;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
