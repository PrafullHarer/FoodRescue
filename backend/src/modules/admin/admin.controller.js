const adminService = require('./admin.service');

/**
 * GET /api/admin/verifications
 * List user verifications with role, status filters, and search.
 */
const getVerifications = async (req, res, next) => {
  try {
    const result = await adminService.getVerifications({
      page: req.query.page ? parseInt(req.query.page, 10) : 1,
      limit: req.query.limit ? parseInt(req.query.limit, 10) : 20,
      status: req.query.status,
      role: req.query.role,
      search: req.query.search,
    });
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/admin/verifications/:userId
 * Get complete registration & verification details for a user.
 */
const getVerificationDetail = async (req, res, next) => {
  try {
    const result = await adminService.getVerificationDetail(req.params.userId);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/admin/verifications/:userId/approve
 * Approve user registration.
 */
const approveVerification = async (req, res, next) => {
  try {
    const result = await adminService.approveVerification(req.params.userId, req.user.id);
    res.json({
      success: true,
      message: 'User account has been verified and approved.',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/admin/verifications/:userId/reject
 * Reject user registration with reason.
 */
const rejectVerification = async (req, res, next) => {
  try {
    const { reason } = req.body;
    if (!reason || !reason.trim()) {
      return res.status(400).json({ success: false, message: 'Rejection reason is required.' });
    }
    const result = await adminService.rejectVerification(req.params.userId, reason, req.user.id);
    res.json({
      success: true,
      message: 'User registration has been rejected.',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/admin/verifications/:userId/request-info
 * Request additional information from a user.
 */
const requestVerificationInfo = async (req, res, next) => {
  try {
    const { notes } = req.body;
    if (!notes || !notes.trim()) {
      return res.status(400).json({ success: false, message: 'Notes for required information are required.' });
    }
    const result = await adminService.requestVerificationInfo(req.params.userId, notes, req.user.id);
    res.json({
      success: true,
      message: 'Information request has been sent to the user.',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/admin/verifications/:userId/suspend
 * Suspend an approved account.
 */
const suspendUser = async (req, res, next) => {
  try {
    const result = await adminService.suspendUser(req.params.userId, req.user.id);
    res.json({
      success: true,
      message: 'User account has been suspended and active sessions revoked.',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

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
      role: req.query.role,
      category: req.query.category,
      search: req.query.search,
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

/**
 * PATCH /api/admin/complaints/:id/status
 */
const updateComplaintStatus = async (req, res, next) => {
  try {
    const { status, admin_response } = req.body;
    if (!status) {
      return res.status(400).json({ success: false, message: 'Status is required.' });
    }
    const result = await adminService.updateComplaintStatus(
      req.params.id,
      { status, admin_response },
      req.user.id
    );
    res.json({ success: true, message: `Complaint status updated to ${status}.`, data: result });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/admin/verifications/:userId/documents
 * Attach a verification document.
 */
const addVerificationDocument = async (req, res, next) => {
  try {
    const { document_name, document_url, document_type, file_size } = req.body;
    if (!document_name || !document_url) {
      return res.status(400).json({ success: false, message: 'Document name and URL are required.' });
    }
    const result = await adminService.addVerificationDocument(req.params.userId, {
      document_name,
      document_url,
      document_type,
      file_size,
    });
    res.status(201).json({ success: true, message: 'Document uploaded.', data: result });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getVerifications,
  getVerificationDetail,
  approveVerification,
  rejectVerification,
  requestVerificationInfo,
  suspendUser,
  addVerificationDocument,
  verifyEntity,
  getPendingVerifications,
  getComplaints,
  resolveComplaint,
  updateComplaintStatus,
  getAuditLogs,
};
