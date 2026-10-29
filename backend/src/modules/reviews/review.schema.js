const { z } = require('zod');

const createReviewSchema = z.object({
  delivery_id: z.string().uuid('Valid delivery UUID required').optional().nullable(),
  donation_id: z.string().uuid('Valid donation UUID required'),
  claim_id: z.string().uuid().optional().nullable(),
  reviewee_id: z.string().uuid('Valid reviewee UUID required'),
  rating: z.coerce.number().int().min(1, 'Rating must be between 1 and 5 stars').max(5, 'Rating must be between 1 and 5 stars'),
  comment: z.string().max(1000, 'Comment cannot exceed 1000 characters').optional().default(''),
  tags: z.array(z.string()).max(10, 'Maximum 10 feedback tags allowed').optional().default([]),
  review_type: z.string().max(50).optional().default('claim'),
});

const updateReviewSchema = z.object({
  rating: z.coerce.number().int().min(1).max(5).optional(),
  comment: z.string().max(1000, 'Comment cannot exceed 1000 characters').optional(),
  tags: z.array(z.string()).max(10).optional(),
});

const reportReviewSchema = z.object({
  reason: z.string().min(5, 'Reason must be at least 5 characters').max(500, 'Reason cannot exceed 500 characters'),
});

const moderateReviewSchema = z.object({
  status: z.enum(['approved', 'hidden', 'flagged']),
  resolution_notes: z.string().max(500).optional(),
});

const getReviewsQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(50).optional().default(10),
  sort: z.enum(['recent', 'highest', 'lowest']).optional().default('recent'),
  rating: z.coerce.number().int().min(1).max(5).optional(),
  type: z.enum(['received', 'submitted']).optional().default('received'),
});

module.exports = {
  createReviewSchema,
  updateReviewSchema,
  reportReviewSchema,
  moderateReviewSchema,
  getReviewsQuerySchema,
};
