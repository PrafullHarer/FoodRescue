const { z } = require('zod');

const COMPLAINT_CATEGORIES = [
  'food_quality_safety',
  'provider_misconduct',
  'ngo_misconduct',
  'volunteer_misconduct',
  'missed_pickup',
  'late_delivery',
  'damaged_packaging',
  'incorrect_quantity',
  'cancellation_dispute',
  'qr_verification',
  'communication_problem',
  'other',
];

const COMPLAINT_PRIORITIES = ['low', 'medium', 'high', 'critical'];

const COMPLAINT_STATUSES = [
  'submitted',
  'under_review',
  'assigned',
  'awaiting_user_response',
  'escalated',
  'resolved',
  'rejected',
  'closed',
  'reopened',
];

const createComplaintSchema = z.object({
  title: z.string().trim().min(3, 'Title must be at least 3 characters').max(200, 'Title cannot exceed 200 characters'),
  category: z.enum(COMPLAINT_CATEGORIES, {
    errorMap: () => ({ message: 'Invalid complaint category' }),
  }),
  description: z.string().trim().min(10, 'Description must be at least 10 characters').max(3000, 'Description cannot exceed 3000 characters'),
  donation_id: z.string().uuid('Invalid donation ID').optional().nullable(),
  delivery_id: z.string().uuid('Invalid delivery ID').optional().nullable(),
  subject_user_id: z.string().uuid('Invalid subject user ID').optional().nullable(),
  incident_date: z.string().optional().nullable(),
  supporting_evidence_url: z.string().url('Invalid evidence URL').optional().nullable().or(z.literal('')),
});

const createMessageSchema = z.object({
  message: z.string().trim().min(1, 'Message cannot be empty').max(2000, 'Message cannot exceed 2000 characters'),
  visibility: z.enum(['user', 'internal']).default('user'),
});

const assignComplaintSchema = z.object({
  admin_user_id: z.string().uuid('Invalid admin user ID'),
  notes: z.string().trim().max(1000).optional(),
});

const updateStatusSchema = z.object({
  status: z.enum(COMPLAINT_STATUSES),
  reason: z.string().trim().max(1000).optional(),
});

const resolveComplaintSchema = z.object({
  resolution_summary: z.string().trim().min(5, 'Resolution summary must be at least 5 characters').max(2000),
});

const rejectComplaintSchema = z.object({
  rejection_reason: z.string().trim().min(5, 'Rejection reason must be at least 5 characters').max(2000),
});

const reopenComplaintSchema = z.object({
  reason: z.string().trim().min(5, 'Reopening reason must be at least 5 characters').max(2000),
});

const updatePrioritySchema = z.object({
  priority: z.enum(COMPLAINT_PRIORITIES),
  reason: z.string().trim().max(1000).optional(),
});

module.exports = {
  COMPLAINT_CATEGORIES,
  COMPLAINT_PRIORITIES,
  COMPLAINT_STATUSES,
  createComplaintSchema,
  createMessageSchema,
  assignComplaintSchema,
  updateStatusSchema,
  resolveComplaintSchema,
  rejectComplaintSchema,
  reopenComplaintSchema,
  updatePrioritySchema,
};
