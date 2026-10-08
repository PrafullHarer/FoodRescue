const { z } = require('zod');

const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  full_name: z.string().min(2, 'Full name must be at least 2 characters'),
  phone: z.string().optional(),
  role: z.enum(['provider', 'ngo', 'volunteer'], {
    errorMap: () => ({ message: 'Role must be provider, ngo, or volunteer' }),
  }),

  // Provider-specific fields (required when role === 'provider')
  business_name: z.string().optional(),
  business_type: z.string().optional(),
  address: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  operating_hours: z.record(z.string()).optional(),

  // NGO-specific fields (required when role === 'ngo')
  organization_name: z.string().optional(),
  registration_no: z.string().optional(),
  capacity: z.number().int().positive().optional(),
  food_preferences: z.array(z.string()).optional(),

  // Volunteer-specific fields
  vehicle_type: z.string().optional(),
  max_distance_km: z.number().positive().optional(),
}).refine(
  (data) => {
    if (data.role === 'provider') {
      return data.business_name && data.address && data.latitude != null && data.longitude != null;
    }
    return true;
  },
  { message: 'Provider role requires business_name, address, latitude, and longitude', path: ['business_name'] }
).refine(
  (data) => {
    if (data.role === 'ngo') {
      return data.organization_name && data.address && data.latitude != null && data.longitude != null;
    }
    return true;
  },
  { message: 'NGO role requires organization_name, address, latitude, and longitude', path: ['organization_name'] }
);

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
