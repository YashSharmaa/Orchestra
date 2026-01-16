/**
 * Orchestra © 2025
 * Author: Orchestra Team
 * License: Apache-2.0
 * Description: Repository for workflow data access
 */

import { Repository } from 'typeorm';
import { getDatabase } from '../connection';
import { Workflow } from '../entities';

export class WorkflowRepository {
  private repository: Repository<Workflow>;

  constructor() {
    this.repository = getDatabase().getRepository(Workflow);
  }

  async findAll(userId?: string, teamId?: string): Promise<Workflow[]> {
    const query = this.repository.createQueryBuilder('workflow');

    if (userId) {
      query.where('workflow.ownerId = :userId', { userId });
    }

    if (teamId) {
      query.orWhere('workflow.teamId = :teamId', { teamId });
    }

    return query.getMany();
  }

  async findById(id: string): Promise<Workflow | null> {
    return this.repository.findOne({ where: { id } });
  }

  async findByIdWithOwner(id: string): Promise<Workflow | null> {
    return this.repository.findOne({
      where: { id },
      relations: ['owner'],
    });
  }

  async create(workflow: Partial<Workflow>): Promise<Workflow> {
    const newWorkflow = this.repository.create(workflow);
    return this.repository.save(newWorkflow);
  }

  async update(id: string, data: Partial<Workflow>): Promise<Workflow> {
    await this.repository.update(id, data);
    const updated = await this.findById(id);
    if (!updated) {
      throw new Error(`Workflow ${id} not found`);
    }
    return updated;
  }

  async delete(id: string): Promise<void> {
    await this.repository.delete(id);
  }

  async findTemplates(category?: string): Promise<Workflow[]> {
    const query = this.repository
      .createQueryBuilder('workflow')
      .where('workflow.isTemplate = :isTemplate', { isTemplate: true })
      .andWhere('workflow.isPublic = :isPublic', { isPublic: true });

    if (category) {
      query.andWhere('workflow.templateCategory = :category', { category });
    }

    return query.getMany();
  }
}
