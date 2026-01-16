/**
 * Orchestra © 2025
 * Author: Orchestra Team
 * License: Apache-2.0
 * Description: Repository for execution data access
 */

import { Repository } from 'typeorm';
import { getDatabase } from '../connection';
import { Execution } from '../entities';
import { ExecutionStatus } from '@/types';

export class ExecutionRepository {
  private repository: Repository<Execution>;

  constructor() {
    this.repository = getDatabase().getRepository(Execution);
  }

  async findAll(workflowId?: string, limit: number = 50): Promise<Execution[]> {
    const query = this.repository
      .createQueryBuilder('execution')
      .orderBy('execution.startTime', 'DESC')
      .limit(limit);

    if (workflowId) {
      query.where('execution.workflowId = :workflowId', { workflowId });
    }

    return query.getMany();
  }

  async findById(id: string): Promise<Execution | null> {
    return this.repository.findOne({
      where: { id },
      relations: ['workflow'],
    });
  }

  async create(execution: Partial<Execution>): Promise<Execution> {
    const newExecution = this.repository.create(execution);
    return this.repository.save(newExecution);
  }

  async updateStatus(id: string, status: ExecutionStatus, error?: any): Promise<void> {
    const update: any = { status };

    if (status === 'success' || status === 'error' || status === 'canceled') {
      update.endTime = new Date();
    }

    if (error) {
      update.error = error;
    }

    await this.repository.update(id, update);
  }

  async updateData(id: string, data: any): Promise<void> {
    await this.repository.update(id, { data });
  }

  async findRunning(): Promise<Execution[]> {
    return this.repository.find({
      where: { status: 'running' },
    });
  }

  async deleteOld(daysToKeep: number): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = await this.repository
      .createQueryBuilder()
      .delete()
      .where('createdAt < :cutoffDate', { cutoffDate })
      .execute();

    return result.affected || 0;
  }

  async softDelete(id: string): Promise<void> {
    await this.repository.update(id, { deletedAt: new Date() });
  }
}
