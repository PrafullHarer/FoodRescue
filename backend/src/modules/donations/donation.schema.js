const { z } = require('zod');

const foodCategoryEnum = z.enum([
  'cooked_meals', 'raw_ingredients', 'packaged_food', 'beverages',
  'bakery', 'dairy', 'fruits_vegetables', 'other',
]);

const createDonationSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().optional(),
  category: foodCategoryEnum,
  quantity: z.number().int().positive('Quantity must be a positive integer'),
  unit: z.string().default('servings'),
  weight_kg: z.number().positive().optional(),
  image_url: z.string().url().optional(),
  pickup_address: z.string().min(5, 'Pickup address is required'),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  pickup_window_start: z.string().datetime({ message: 'Invalid datetime format' }),
  pickup_window_end: z.string().datetime({ message: 'Invalid datetime format' }),
  expiry_time: z.string().datetime({ message: 'Invalid datetime format' }),
  special_instructions: z.string().optional(),
});

const updateDonationSchema = z.object({
  title: z.string().min(3).optional(),
  description: z.string().optional(),
  category: foodCategoryEnum.optional(),
  quantity: z.number().int().positive().optional(),
  unit: z.string().optional(),
  weight_kg: z.number().positive().optional(),
  image_url: z.string().url().optional(),
  pickup_address: z.string().min(5).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  pickup_window_start: z.string().datetime().optional(),
  pickup_window_end: z.string().datetime().optional(),
  expiry_time: z.string().datetime().optional(),
  special_instructions: z.string().optional(),
});

const claimDonationSchema = z.object({
  ngo_id: z.string().uuid('Invalid NGO ID'),
});

module.exports = {
  createDonationSchema,
  updateDonationSchema,
  claimDonationSchema,
};
