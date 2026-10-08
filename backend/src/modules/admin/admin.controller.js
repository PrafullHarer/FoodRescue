const adminService = require('./admin.service');

/**
 * POST /api/admin/verify/:type/:id
 */
const verifyEntity = async (req, res, next) => {
  try {
    const { type, id } = req.params;
    if (!['provider', 'ngo'].includes(type)) {
      return res.status(400).json({ success: false, message: 'Type must be "provider" or "ngo".' });
    }

    const result = await adminService.verifyEntity(type, id, req.user.id);
    res.json({ success: true, message: `${type} verified successfully.`, data: result });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/admin/pending-verifications
 */
const getPendingVerifications = async (req, res, next) => {
  try {
    const result = await adminService.getPendingVerifications();
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/admin/complaints
 */
const getComplaints = async (req, res, next) => {
  try {
    const result = await adminService.getComplaints({
      page: req.query.page ? parseInt(req.query.page, 10) : 1,
      limit: req.query.limit ? parseInt(req.query.limit, 10) : 20,
      status: req.query.status,
    });
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/admin/complaints/:id/resolve
 */
const resolveComplaint = async (req, res, next) => {
  try {
    const result = await adminService.resolveComplaint(
      req.params.id,
      req.body.resolution_notes,
      req.user.id
    );
    res.json({ success: true, message: 'Complaint resolved.', data: result });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/admin/audit-logs
 */
const getAuditLogs = async (req, res, next) => {
  try {
    const result = await adminService.getAuditLogs({
      page: req.query.page ? parseInt(req.query.page, 10) : 1,
      limit: req.query.limit ? parseInt(req.query.limit, 10) : 50,
      actorId: req.query.actor_id,
      action: req.query.action,
      entityType: req.query.entity_type,
    });
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  verifyEntity,
  getPendingVerifications,
  getComplaints,
  resolveComplaint,
  getAuditLogs,
};
