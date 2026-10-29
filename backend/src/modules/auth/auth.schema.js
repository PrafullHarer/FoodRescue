const { z } = require('zod');

const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
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

const googleAuthSchema = z.object({
  id_token: z.string().optional(),
  credential: z.string().optional(),
}).refine(data => data.id_token || data.credential, {
  message: 'Google identity token (id_token or credential) is required',
});

const completeProfileSchema = z.object({
  full_name: z.string().min(2, 'Full name must be at least 2 characters'),
  phone: z.string().min(7, 'Phone number is required (min 7 digits)'),
  role: z.enum(['provider', 'ngo', 'volunteer'], {
    errorMap: () => ({ message: 'Role must be provider, ngo, or volunteer' }),
  }),

  // Provider
  business_name: z.string().optional().nullable().or(z.literal('')),
  business_type: z.string().optional().nullable().or(z.literal('')),
  address: z.string().optional().nullable().or(z.literal('')),
  latitude: z.union([z.number(), z.string().transform(v => parseFloat(v) || 0)]).optional().default(28.6139),
  longitude: z.union([z.number(), z.string().transform(v => parseFloat(v) || 0)]).optional().default(77.2090),
  operating_hours: z.any().optional(),

  // NGO
  organization_name: z.string().optional().nullable().or(z.literal('')),
  registration_no: z.string().optional().nullable().or(z.literal('')),
  capacity: z.union([z.number(), z.string().transform(v => parseInt(v, 10) || 100)]).optional(),
  food_preferences: z.any().optional(),

  // Volunteer
  vehicle_type: z.string().optional().nullable().or(z.literal('')),
  max_distance_km: z.union([z.number(), z.string().transform(v => parseFloat(v) || 10)]).optional().default(10),
}).superRefine((data, ctx) => {
  if (data.role === 'provider') {
    if (!data.business_name || data.business_name.trim().length < 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['business_name'],
        message: 'Business name is required for food providers',
      });
    }
    if (!data.address || data.address.trim().length < 3) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['address'],
        message: 'Valid pickup address is required for food providers',
      });
    }
  } else if (data.role === 'ngo') {
    if (!data.organization_name || data.organization_name.trim().length < 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['organization_name'],
        message: 'Organization or shelter name is required for NGOs',
      });
    }
    if (!data.address || data.address.trim().length < 3) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['address'],
        message: 'Physical shelter/kitchen address is required for NGOs',
      });
    }
  } else if (data.role === 'volunteer') {
    if (!data.vehicle_type) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['vehicle_type'],
        message: 'Vehicle type is required for volunteer couriers',
      });
    }
  }
});

module.exports = {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  googleAuthSchema,
  completeProfileSchema,
};
