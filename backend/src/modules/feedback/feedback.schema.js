const { z } = require('zod');

const FEEDBACK_TYPES = [
  'general',
  'suggestion',
  'bug_report',
  'user_experience',
  'other',
  // Allow direct title case from UI as well
  'General Feedback',
  'Suggestion',
  'Bug Report',
  'User Experience',
  'Other',
];

const FEEDBACK_STATUSES = ['NEW', 'IN_REVIEW', 'RESOLVED', 'ARCHIVED'];

const createFeedbackSchema = z.object({
  name: z.string().trim().max(255, 'Name cannot exceed 255 characters').optional().nullable(),
  email: z
    .string()
    .trim()
    .email('Please provide a valid email address')
    .max(255, 'Email cannot exceed 255 characters')
    .optional()
    .nullable()
    .or(z.literal('')),
  feedback_type: z.enum(FEEDBACK_TYPES, {
    errorMap: () => ({ message: 'Invalid feedback category selected' }),
  }),
  rating: z
    .number()
    .int()
    .min(1, 'Rating must be between 1 and 5')
    .max(5, 'Rating must be between 1 and 5')
    .optional()
    .nullable(),
  subject: z
    .string()
    .trim()
    .min(3, 'Subject must be at least 3 characters')
    .max(200, 'Subject cannot exceed 200 characters'),
  message: z
    .string()
    .trim()
    .min(10, 'Message must be at least 10 characters long')
    .max(3000, 'Message cannot exceed 3000 characters'),
  is_anonymous: z.boolean().optional().default(false),
  website: z.string().optional().nullable(), // Honeypot field for bot spam detection
});

const updateFeedbackStatusSchema = z.object({
  status: z.enum(FEEDBACK_STATUSES, {
    errorMap: () => ({ message: 'Status must be NEW, IN_REVIEW, RESOLVED, or ARCHIVED' }),
  }),
  admin_notes: z.string().trim().max(2000, 'Admin notes cannot exceed 2000 characters').optional().nullable(),
});

const getFeedbackQuerySchema = z.object({
  page: z.string().regex(/^\d+$/).transform(Number).optional().default('1'),
  limit: z.string().regex(/^\d+$/).transform(Number).optional().default('20'),
  status: z.enum([...FEEDBACK_STATUSES, 'ALL']).optional(),
  feedback_type: z.string().optional(),
  search: z.string().trim().optional(),
  sort: z.enum(['recent', 'rating_high', 'rating_low', 'oldest']).optional().default('recent'),
});

module.exports = {
  FEEDBACK_TYPES,
  FEEDBACK_STATUSES,
  createFeedbackSchema,
  updateFeedbackStatusSchema,
  getFeedbackQuerySchema,
};
