const complaintService = require('./complaint.service');

/**
 * POST /api/complaints
 */
const createComplaint = async (req, res, next) => {
  try {
    const { subject, category, description, donation_id } = req.body;

    if (!subject || !subject.trim()) {
      return res.status(400).json({ success: false, message: 'Subject is required.' });
    }
    if (!description || !description.trim()) {
      return res.status(400).json({ success: false, message: 'Description is required.' });
    }
    if (subject.trim().length > 255) {
      return res.status(400).json({ success: false, message: 'Subject must be 255 characters or less.' });
    }
    if (description.trim().length > 5000) {
      return res.status(400).json({ success: false, message: 'Description must be 5000 characters or less.' });
    }

    const complaint = await complaintService.createComplaint({
      userId: req.user.id,
      subject: subject.trim(),
      category: category?.trim() || null,
      description: description.trim(),
      donationId: donation_id || null,
    });

    res.status(201).json({
      success: true,
      message: 'Complaint submitted successfully.',
      data: complaint,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/complaints
 */
const getMyComplaints = async (req, res, next) => {
  try {
    const result = await complaintService.getUserComplaints(req.user.id, {
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
 * GET /api/complaints/:id
 */
const getComplaintById = async (req, res, next) => {
  try {
    const complaint = await complaintService.getComplaintById(
      req.params.id,
      req.user.id,
      req.user.role
    );
    res.json({ success: true, data: complaint });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createComplaint,
  getMyComplaints,
  getComplaintById,
};
