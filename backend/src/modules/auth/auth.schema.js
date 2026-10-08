const { z } = require('zod');

const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  full_name: z.string().min(2, 'Full name must be at least 2 characters'),
  phone: z.string().optional().nullable().or(z.literal('')),
  role: z.enum(['provider', 'ngo', 'volunteer'], {
    errorMap: () => ({ message: 'Role must be provider, ngo, or volunteer' }),
  }),

  // Provider-specific fields
  business_name: z.string().optional().nullable().or(z.literal('')),
  business_type: z.string().optional().nullable().or(z.literal('')),
  address: z.string().optional().nullable().or(z.literal('')),
  latitude: z.union([z.number(), z.string().transform(v => parseFloat(v) || 0)]).optional().default(28.6139),
  longitude: z.union([z.number(), z.string().transform(v => parseFloat(v) || 0)]).optional().default(77.2090),
  operating_hours: z.any().optional(),

  // NGO-specific fields
  organization_name: z.string().optional().nullable().or(z.literal('')),
  registration_no: z.string().optional().nullable().or(z.literal('')),
  capacity: z.union([z.number(), z.string().transform(v => parseInt(v, 10) || 100)]).optional(),
  food_preferences: z.any().optional(),

  // Volunteer-specific fields
  vehicle_type: z.string().optional().nullable().or(z.literal('')),
  max_distance_km: z.union([z.number(), z.string().transform(v => parseFloat(v) || 10)]).optional().default(10),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

const refreshTokenSchema = z.object({
  refresh_token: z.string().min(1, 'Refresh token is required'),
});

module.exports = {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
};
