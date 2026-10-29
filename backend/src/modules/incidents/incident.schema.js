const { z } = require('zod');

const incidentTypes = [
  'late_delivery',
  'missed_pickup',
  'failed_qr_scan',
  'donation_cancellation',
  'delivery_cancellation',
  'stuck_in_transit',
  'food_safety_quality',
  'provider_complaint',
  'ngo_complaint',
  'volunteer_no_show',
  'other',
];

const incidentSeverities = ['low', 'medium', 'high', 'critical'];

const incidentStatuses = [
  'open',
  'acknowledged',
  'investigating',
  'awaiting_response',
  'resolved',
  'closed',
  'reopened',
];

const createManualIncidentSchema = z.object({
  incident_type: z.enum(incidentTypes),
  title: z.string().min(5, 'Title must be at least 5 characters').max(255),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  severity: z.enum(incidentSeverities).optional().default('medium'),
  donation_id: z.string().uuid().optional().nullable(),
  delivery_id: z.string().uuid().optional().nullable(),
  related_qr_code: z.string().max(255).optional().nullable(),
  evidence_urls: z.array(z.string().url()).optional().default([]),
});

const updateStatusSchema = z.object({
  status: z.enum(incidentStatuses),
  notes: z.string().max(1000).optional(),
});

const updateSeveritySchema = z.object({
  severity: z.enum(incidentSeverities),
  reason: z.string().min(3, 'A reason is required when changing severity').max(500),
});

const assignIncidentSchema = z.object({
  admin_user_id: z.string().uuid(),
  notes: z.string().max(500).optional(),
});

const addNoteSchema = z.object({
  note: z.string().min(2, 'Note cannot be empty').max(2000),
  is_internal: z.boolean().optional().default(true),
});

const resolveIncidentSchema = z.object({
  resolution_summary: z.string().min(5, 'Resolution summary must be provided').max(2000),
  notes: z.string().max(500).optional(),
});

const reopenIncidentSchema = z.object({
  reason: z.string().min(5, 'Reason for reopening must be provided').max(1000),
});

module.exports = {
  incidentTypes,
  incidentSeverities,
  incidentStatuses,
  createManualIncidentSchema,
  updateStatusSchema,
  updateSeveritySchema,
  assignIncidentSchema,
  addNoteSchema,
  resolveIncidentSchema,
  reopenIncidentSchema,
};
