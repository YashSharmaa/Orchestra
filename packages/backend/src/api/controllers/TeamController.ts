/**
 * Orchestra © 2025
 * Author: Orchestra Team
 * License: Apache-2.0
 * Description: Team management controller
 */

import { Request, Response } from 'express';
import { getDatabase } from '@/database/connection';
import { Team } from '@/database/entities/Team.entity';
import logger from '@/utils/logger';

export class TeamController {
  /**
   * List all teams
   */
  async list(req: Request, res: Response) {
    try {
      const userId = req.user!.userId;
      const teamRepo = getDatabase().getRepository(Team);

      const teams = await teamRepo.find();

      logger.info('Teams listed', {
        userId,
        count: teams.length,
      });

      res.json({
        success: true,
        teams,
      });
    } catch (error) {
      logger.error('Failed to list teams', { error });
      throw error;
    }
  }

  /**
   * Get team by ID
   */
  async getById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const teamRepo = getDatabase().getRepository(Team);

      const team = await teamRepo.findOne({ where: { id } });

      if (!team) {
        return res.status(404).json({
          success: false,
          message: 'Team not found',
        });
      }

      res.json({
        success: true,
        team,
      });
    } catch (error) {
      logger.error('Failed to get team', { error });
      throw error;
    }
  }

  /**
   * Create new team
   */
  async create(req: Request, res: Response) {
    try {
      const { name, description, settings } = req.body;
      const userId = req.user!.userId;

      if (!name) {
        return res.status(400).json({
          success: false,
          message: 'Team name is required',
        });
      }

      const teamRepo = getDatabase().getRepository(Team);
      const team = teamRepo.create({
        name,
        description,
        settings: settings || {},
      });

      await teamRepo.save(team);

      logger.info('Team created', {
        teamId: team.id,
        name,
        userId,
      });

      res.status(201).json({
        success: true,
        team,
      });
    } catch (error) {
      logger.error('Failed to create team', { error });
      throw error;
    }
  }

  /**
   * Update team
   */
  async update(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { name, description, settings } = req.body;
      const userId = req.user!.userId;

      const teamRepo = getDatabase().getRepository(Team);
      const team = await teamRepo.findOne({ where: { id } });

      if (!team) {
        return res.status(404).json({
          success: false,
          message: 'Team not found',
        });
      }

      if (name) team.name = name;
      if (description !== undefined) team.description = description;
      if (settings) team.settings = settings;

      await teamRepo.save(team);

      logger.info('Team updated', {
        teamId: id,
        userId,
      });

      res.json({
        success: true,
        team,
      });
    } catch (error) {
      logger.error('Failed to update team', { error });
      throw error;
    }
  }

  /**
   * Delete team
   */
  async delete(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user!.userId;

      const teamRepo = getDatabase().getRepository(Team);
      const result = await teamRepo.delete(id);

      if (result.affected === 0) {
        return res.status(404).json({
          success: false,
          message: 'Team not found',
        });
      }

      logger.info('Team deleted', {
        teamId: id,
        userId,
      });

      res.json({
        success: true,
        message: 'Team deleted successfully',
      });
    } catch (error) {
      logger.error('Failed to delete team', { error });
      throw error;
    }
  }
}

export default new TeamController();
