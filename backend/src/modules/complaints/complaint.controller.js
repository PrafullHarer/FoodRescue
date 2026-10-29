const complaintService = require('./complaint.service');
const {
  createComplaintSchema,
  createMessageSchema,
  assignComplaintSchema,
  updateStatusSchema,
  resolveComplaintSchema,
  rejectComplaintSchema,
  reopenComplaintSchema,
  updatePrioritySchema,
} = require('./complaint.schema');

const createComplaint = async (req, res, next) => {
  try {
    const validated = createComplaintSchema.parse(req.body);
    const complaint = await complaintService.createComplaint(req.user.id, req.user.role, validated);
    res.status(201).json({
      success: true,
      message: 'Complaint submitted successfully.',
      data: complaint,
    });
  } catch (err) {
    next(err);
  }
};

const getMyComplaints = async (req, res, next) => {
  try {
    const result = await complaintService.getUserComplaints(req.user.id, req.query);
    res.json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

const getComplaintById = async (req, res, next) => {
  try {
    const complaint = await complaintService.getComplaintById(req.params.id, req.user.id, req.user.role);
    res.json({
      success: true,
      data: complaint,
    });
  } catch (err) {
    next(err);
  }
};

const getComplaintMessages = async (req, res, next) => {
  try {
    const messages = await complaintService.getComplaintMessages(req.params.id, req.user.id, req.user.role);
    res.json({
      success: true,
      data: messages,
    });
  } catch (err) {
    next(err);
  }
};

const addComplaintMessage = async (req, res, next) => {
  try {
    const validated = createMessageSchema.parse(req.body);
    const message = await complaintService.addComplaintMessage(
      req.params.id,
      req.user.id,
      req.user.role,
      validated
    );
    res.status(201).json({
      success: true,
      message: 'Message added successfully.',
      data: message,
    });
  } catch (err) {
    next(err);
  }
};

const getComplaintHistory = async (req, res, next) => {
  try {
    const history = await complaintService.getComplaintHistory(req.params.id, req.user.id, req.user.role);
    res.json({
      success: true,
      data: history,
    });
  } catch (err) {
    next(err);
  }
};

const reopenComplaint = async (req, res, next) => {
  try {
    const validated = reopenComplaintSchema.parse(req.body);
    const complaint = await complaintService.reopenComplaint(
      req.params.id,
      req.user.id,
      req.user.role,
      validated.reason
    );
    res.json({
      success: true,
      message: 'Complaint reopened successfully.',
      data: complaint,
    });
  } catch (err) {
    next(err);
  }
};

// ─── ADMIN ENDPOINTS ──────────────────────────────────────────

const getAdminComplaints = async (req, res, next) => {
  try {
    const result = await complaintService.getAdminComplaints(req.query);
    res.json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

const getAdminComplaintStats = async (req, res, next) => {
  try {
    const stats = await complaintService.getAdminComplaintStats();
    res.json({
      success: true,
      data: stats,
    });
  } catch (err) {
    next(err);
  }
};

const assignComplaint = async (req, res, next) => {
  try {
    const validated = assignComplaintSchema.parse(req.body);
    const complaint = await complaintService.assignComplaint(
      req.params.id,
      req.user.id,
      validated.admin_user_id,
      validated.notes
    );
    res.json({
      success: true,
      message: 'Complaint assigned successfully.',
      data: complaint,
    });
  } catch (err) {
    next(err);
  }
};

const updateComplaintStatus = async (req, res, next) => {
  try {
    const validated = updateStatusSchema.parse(req.body);
    const complaint = await complaintService.updateComplaintStatus(
      req.params.id,
      req.user.id,
      validated.status,
      validated.reason
    );
    res.json({
      success: true,
      message: `Complaint status updated to ${validated.status}.`,
      data: complaint,
    });
  } catch (err) {
    next(err);
  }
};

const resolveComplaint = async (req, res, next) => {
  try {
    const validated = resolveComplaintSchema.parse(req.body);
    const complaint = await complaintService.resolveComplaint(
      req.params.id,
      req.user.id,
      validated.resolution_summary
    );
    res.json({
      success: true,
      message: 'Complaint marked as resolved.',
      data: complaint,
    });
  } catch (err) {
    next(err);
  }
};

const rejectComplaint = async (req, res, next) => {
  try {
    const validated = rejectComplaintSchema.parse(req.body);
    const complaint = await complaintService.rejectComplaint(
      req.params.id,
      req.user.id,
      validated.rejection_reason
    );
    res.json({
      success: true,
      message: 'Complaint marked as rejected.',
      data: complaint,
    });
  } catch (err) {
    next(err);
  }
};

const updatePriority = async (req, res, next) => {
  try {
    const validated = updatePrioritySchema.parse(req.body);
    const complaint = await complaintService.updatePriority(
      req.params.id,
      req.user.id,
      validated.priority,
      validated.reason
    );
    res.json({
      success: true,
      message: `Priority updated to ${validated.priority}.`,
      data: complaint,
    });
  } catch (err) {
    next(err);
  }
};

const exportComplaintsCSV = async (req, res, next) => {
  try {
    const csvContent = await complaintService.exportComplaintsCSV(req.query);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="foodrescue-complaints-${new Date().toISOString().slice(0, 10)}.csv"`
    );
    res.send(csvContent);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createComplaint,
  getMyComplaints,
  getComplaintById,
  getComplaintMessages,
  addComplaintMessage,
  getComplaintHistory,
  reopenComplaint,
  getAdminComplaints,
  getAdminComplaintStats,
  assignComplaint,
  updateComplaintStatus,
  resolveComplaint,
  rejectComplaint,
  updatePriority,
  exportComplaintsCSV,
};
