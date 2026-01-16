/**
 * Orchestra © 2025
 * Author: Orchestra Team
 * License: Apache-2.0
 * Description: Marketplace controller for workflow templates
 */

import { Request, Response } from 'express';
import { getDatabase } from '@/database/connection';
import { MarketplaceListing } from '@/database/entities/MarketplaceListing.entity';
import logger from '@/utils/logger';

export class MarketplaceController {
  /**
   * List marketplace listings
   */
  async list(req: Request, res: Response) {
    try {
      const { category, search, visibility } = req.query;
      const listingRepo = getDatabase().getRepository(MarketplaceListing);

      const query: any = {};

      if (category) {
        query.category = category;
      }

      if (visibility && (visibility === 'public' || visibility === 'private' || visibility === 'team')) {
        query.visibility = visibility;
      } else {
        // Default to public listings
        query.visibility = 'public';
      }

      let listings = await listingRepo.find({ where: query });

      // Simple search filter
      if (search && typeof search === 'string') {
        const searchLower = search.toLowerCase();
        listings = listings.filter((listing: MarketplaceListing) =>
          listing.title.toLowerCase().includes(searchLower) ||
          listing.description?.toLowerCase().includes(searchLower)
        );
      }

      logger.info('Marketplace listings retrieved', {
        count: listings.length,
        filters: { category, search, visibility },
      });

      res.json({
        success: true,
        listings,
      });
    } catch (error) {
      logger.error('Failed to list marketplace listings', { error });
      throw error;
    }
  }

  /**
   * Get listing by ID
   */
  async getById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const listingRepo = getDatabase().getRepository(MarketplaceListing);

      const listing = await listingRepo.findOne({ where: { id } });

      if (!listing) {
        return res.status(404).json({
          success: false,
          message: 'Listing not found',
        });
      }

      res.json({
        success: true,
        listing,
      });
    } catch (error) {
      logger.error('Failed to get listing', { error });
      throw error;
    }
  }

  /**
   * Publish workflow to marketplace
   */
  async publish(req: Request, res: Response) {
    try {
      const {
        workflowId,
        title,
        description,
        category,
        tags,
        visibility,
        teamId,
      } = req.body;
      const userId = req.user!.userId;

      if (!workflowId || !title) {
        return res.status(400).json({
          success: false,
          message: 'Workflow ID and title are required',
        });
      }

      const listingRepo = getDatabase().getRepository(MarketplaceListing);
      const listing = listingRepo.create({
        workflowId,
        title,
        description,
        category,
        tags: tags || [],
        visibility: visibility || 'private',
        verified: false,
        authorId: userId,
        teamId,
        downloads: 0,
        rating: 0,
      });

      await listingRepo.save(listing);

      logger.info('Workflow published to marketplace', {
        listingId: listing.id,
        workflowId,
        userId,
        visibility,
      });

      res.status(201).json({
        success: true,
        listing,
      });
    } catch (error) {
      logger.error('Failed to publish to marketplace', { error });
      throw error;
    }
  }

  /**
   * Update marketplace listing
   */
  async update(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { title, description, category, tags, visibility } = req.body;
      const userId = req.user!.userId;

      const listingRepo = getDatabase().getRepository(MarketplaceListing);
      const listing = await listingRepo.findOne({ where: { id } });

      if (!listing) {
        return res.status(404).json({
          success: false,
          message: 'Listing not found',
        });
      }

      // Check ownership
      if (listing.authorId !== userId && req.user!.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Access denied',
        });
      }

      if (title) listing.title = title;
      if (description !== undefined) listing.description = description;
      if (category) listing.category = category;
      if (tags) listing.tags = tags;
      if (visibility) listing.visibility = visibility;

      await listingRepo.save(listing);

      logger.info('Marketplace listing updated', {
        listingId: id,
        userId,
      });

      res.json({
        success: true,
        listing,
      });
    } catch (error) {
      logger.error('Failed to update listing', { error });
      throw error;
    }
  }

  /**
   * Delete marketplace listing
   */
  async delete(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user!.userId;

      const listingRepo = getDatabase().getRepository(MarketplaceListing);
      const listing = await listingRepo.findOne({ where: { id } });

      if (!listing) {
        return res.status(404).json({
          success: false,
          message: 'Listing not found',
        });
      }

      // Check ownership
      if (listing.authorId !== userId && req.user!.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Access denied',
        });
      }

      await listingRepo.delete(id);

      logger.info('Marketplace listing deleted', {
        listingId: id,
        userId,
      });

      res.json({
        success: true,
        message: 'Listing deleted successfully',
      });
    } catch (error) {
      logger.error('Failed to delete listing', { error });
      throw error;
    }
  }

  /**
   * Download/import workflow from marketplace
   */
  async download(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const listingRepo = getDatabase().getRepository(MarketplaceListing);

      const listing = await listingRepo.findOne({ where: { id } });

      if (!listing) {
        return res.status(404).json({
          success: false,
          message: 'Listing not found',
        });
      }

      // Increment download count
      listing.downloads += 1;
      await listingRepo.save(listing);

      logger.info('Workflow downloaded from marketplace', {
        listingId: id,
        workflowId: listing.workflowId,
      });

      res.json({
        success: true,
        workflowId: listing.workflowId,
        message: 'Workflow template available for import',
      });
    } catch (error) {
      logger.error('Failed to download from marketplace', { error });
      throw error;
    }
  }
}

export default new MarketplaceController();
