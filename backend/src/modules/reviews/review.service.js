const db = require('../../config/db');
const { createNotification } = require('../notifications/notification.service');

/**
 * Get a user's public reputation summary and verified reviews list.
 */
const getUserReputation = async (userId, { page = 1, limit = 10, sort = 'recent', rating }) => {
  // 1. Fetch user base profile and role-specific details
  const userRes = await db.query(
    `SELECT u.id, u.email, u.full_name, u.role, u.avatar_url, u.status, u.created_at,
            fp.id AS provider_id, fp.business_name, fp.is_verified AS provider_verified, fp.total_donations,
            ng.id AS ngo_id, ng.organization_name, ng.is_verified AS ngo_verified, ng.total_received,
            vo.id AS volunteer_id, vo.vehicle_type, vo.total_deliveries, vo.rating AS volunteer_rating
     FROM users u
     LEFT JOIN food_providers fp ON fp.user_id = u.id
     LEFT JOIN ngos ng ON ng.user_id = u.id
     LEFT JOIN volunteers vo ON vo.user_id = u.id
     WHERE u.id = $1`,
    [userId]
  );

  if (userRes.rows.length === 0) {
    const err = new Error('User not found.');
    err.statusCode = 404;
    throw err;
  }

  const u = userRes.rows[0];

  if (u.role === 'admin') {
    const err = new Error('Administrators do not participate in community trust, ratings, or reputation.');
    err.statusCode = 400;
    throw err;
  }

  const profile = {
    id: u.id,
    full_name: u.full_name,
    role: u.role,
    avatar_url: u.avatar_url,
    status: u.status,
    created_at: u.created_at,
    is_verified:
      u.role === 'provider'
        ? !!u.provider_verified
        : u.role === 'ngo'
        ? !!u.ngo_verified
        : u.status === 'active',
    business_name: u.business_name || null,
    organization_name: u.organization_name || null,
    vehicle_type: u.vehicle_type || null,
  };

  // 2. Aggregate Rating Summary
  const aggRes = await db.query(
    `SELECT COUNT(*) AS total_reviews,
            COALESCE(AVG(rating), 0) AS average_rating,
            COUNT(CASE WHEN rating = 5 THEN 1 END) AS count_5,
            COUNT(CASE WHEN rating = 4 THEN 1 END) AS count_4,
            COUNT(CASE WHEN rating = 3 THEN 1 END) AS count_3,
            COUNT(CASE WHEN rating = 2 THEN 1 END) AS count_2,
            COUNT(CASE WHEN rating = 1 THEN 1 END) AS count_1
     FROM reviews
     WHERE reviewee_id = $1 AND moderation_status = 'approved'`,
    [userId]
  );

  const agg = aggRes.rows[0];
  const totalReviews = parseInt(agg.total_reviews, 10);
  const averageRating = totalReviews > 0 ? parseFloat(parseFloat(agg.average_rating).toFixed(1)) : 0;

  const count5 = parseInt(agg.count_5, 10);
  const count4 = parseInt(agg.count_4, 10);
  const count3 = parseInt(agg.count_3, 10);
  const count2 = parseInt(agg.count_2, 10);
  const count1 = parseInt(agg.count_1, 10);

  const ratingDistribution = {
    5: count5,
    4: count4,
    3: count3,
    2: count2,
    1: count1,
  };

  const ratingPercentages = {
    5: totalReviews > 0 ? Math.round((count5 / totalReviews) * 100) : 0,
    4: totalReviews > 0 ? Math.round((count4 / totalReviews) * 100) : 0,
    3: totalReviews > 0 ? Math.round((count3 / totalReviews) * 100) : 0,
    2: totalReviews > 0 ? Math.round((count2 / totalReviews) * 100) : 0,
    1: totalReviews > 0 ? Math.round((count1 / totalReviews) * 100) : 0,
  };

  // 3. Top Feedback Tags
  const tagsRes = await db.query(
    `SELECT tag, COUNT(*) AS count
     FROM (
       SELECT unnest(tags) AS tag
       FROM reviews
       WHERE reviewee_id = $1 AND moderation_status = 'approved'
     ) sub
     WHERE tag IS NOT NULL AND tag != ''
     GROUP BY tag
     ORDER BY count DESC
     LIMIT 8`,
    [userId]
  );

  const topTags = tagsRes.rows.map(r => ({
    tag: r.tag,
    count: parseInt(r.count, 10),
  }));

  // 4. Role-Specific Reliability & Transaction Statistics
  let reliability = null;

  if (u.role === 'provider' && u.provider_id) {
    const pStats = await db.query(
      `SELECT COUNT(*) AS total_donations,
              COUNT(CASE WHEN status IN ('completed', 'delivered') THEN 1 END) AS completed_donations,
              COUNT(CASE WHEN status = 'cancelled' THEN 1 END) AS cancelled_donations,
              COUNT(CASE WHEN status = 'expired' THEN 1 END) AS expired_donations
       FROM food_donations
       WHERE provider_id = $1`,
      [u.provider_id]
    );

    const s = pStats.rows[0];
    const totalDonations = parseInt(s.total_donations, 10);
    const completedDonations = parseInt(s.completed_donations, 10);
    const cancelledDonations = parseInt(s.cancelled_donations, 10);
    const expiredDonations = parseInt(s.expired_donations, 10);
    const successRate = totalDonations > 0
      ? parseFloat(((completedDonations / totalDonations) * 100).toFixed(1))
      : null;

    reliability = {
      type: 'provider',
      totalDonations,
      completedDonations,
      cancelledDonations,
      expiredDonations,
      successRate,
      metricsExplanation: {
        successRate: 'Completed donations delivered to shelters divided by total posted listings.',
        cancelled: 'Listings retracted by food provider prior to collection.',
        expired: 'Unclaimed supplies that surpassed safe consumption countdowns.',
      },
    };
  } else if (u.role === 'volunteer' && u.volunteer_id) {
    const vStats = await db.query(
      `SELECT COUNT(*) AS total_deliveries,
              COUNT(CASE WHEN status = 'delivered' THEN 1 END) AS completed_deliveries,
              COUNT(CASE WHEN status = 'failed' THEN 1 END) AS failed_deliveries
       FROM deliveries
       WHERE volunteer_id = $1`,
      [u.volunteer_id]
    );

    const onTimeStats = await db.query(
      `SELECT COUNT(*) AS total_with_deadline,
              COUNT(CASE WHEN d.delivery_time IS NOT NULL AND fd.expiry_time IS NOT NULL AND d.delivery_time <= fd.expiry_time THEN 1 END) AS on_time_count
       FROM deliveries d
       JOIN food_donations fd ON fd.id = d.donation_id
       WHERE d.volunteer_id = $1
         AND d.status = 'delivered'
         AND d.delivery_time IS NOT NULL
         AND fd.expiry_time IS NOT NULL`,
      [u.volunteer_id]
    );

    const s = vStats.rows[0];
    const ot = onTimeStats.rows[0];

    const totalDeliveries = parseInt(s.total_deliveries, 10);
    const completedDeliveries = parseInt(s.completed_deliveries, 10);
    const failedDeliveries = parseInt(s.failed_deliveries, 10);
    const totalWithDeadline = parseInt(ot.total_with_deadline, 10);
    const onTimeCount = parseInt(ot.on_time_count, 10);

    const deliverySuccessRate = totalDeliveries > 0
      ? parseFloat(((completedDeliveries / totalDeliveries) * 100).toFixed(1))
      : null;

    const onTimeDeliveryRate = totalWithDeadline >= 3
      ? parseFloat(((onTimeCount / totalWithDeadline) * 100).toFixed(1))
      : null;

    reliability = {
      type: 'volunteer',
      totalDeliveries,
      completedDeliveries,
      failedDeliveries,
      deliverySuccessRate,
      onTimeDeliveryRate,
      timedDeliveriesCount: totalWithDeadline,
      metricsExplanation: {
        deliverySuccessRate: 'Successfully handoff deliveries verified by NGO dropoff QR scan divided by total assignments.',
        onTimeDeliveryRate: 'Deliveries completed before food expiry deadline (requires at least 3 timestamped runs).',
      },
    };
  } else if (u.role === 'ngo' && u.ngo_id) {
    const ngoStats = await db.query(
      `SELECT COUNT(*) AS total_claims,
              COUNT(CASE WHEN status = 'accepted' THEN 1 END) AS completed_claims
       FROM donation_claims
       WHERE ngo_id = $1`,
      [u.ngo_id]
    );

    const s = ngoStats.rows[0];
    const totalClaims = parseInt(s.total_claims, 10);
    const completedClaims = parseInt(s.completed_claims, 10);

    reliability = {
      type: 'ngo',
      totalClaims,
      completedClaims,
      totalReceivedMeals: u.total_received || 0,
    };
  }

  // 5. Paginated Reviews Query
  const conditions = ["r.reviewee_id = $1", "r.moderation_status = 'approved'"];
  const params = [userId];

  if (rating) {
    params.push(parseInt(rating, 10));
    conditions.push(`r.rating = $${params.length}`);
  }

  const whereClause = 'WHERE ' + conditions.join(' AND ');

  const countRes = await db.query(
    `SELECT COUNT(*) FROM reviews r ${whereClause}`,
    params
  );
  const filteredTotal = parseInt(countRes.rows[0].count, 10);

  let orderClause = 'ORDER BY r.created_at DESC';
  if (sort === 'highest') {
    orderClause = 'ORDER BY r.rating DESC, r.created_at DESC';
  } else if (sort === 'lowest') {
    orderClause = 'ORDER BY r.rating ASC, r.created_at DESC';
  }

  const offset = (page - 1) * limit;
  const listParams = [...params, limit, offset];

  const reviewsRes = await db.query(
    `SELECT r.*,
            u_rev.full_name AS reviewer_name,
            u_rev.avatar_url AS reviewer_avatar,
            u_rev.role AS reviewer_user_role,
            COALESCE(fp.business_name, ng.organization_name, u_rev.full_name) AS reviewer_org_name,
            fd.title AS donation_title,
            fd.category AS donation_category,
            d.pickup_time,
            d.delivery_time
     FROM reviews r
     JOIN users u_rev ON u_rev.id = r.reviewer_id
     LEFT JOIN food_providers fp ON fp.user_id = u_rev.id
     LEFT JOIN ngos ng ON ng.user_id = u_rev.id
     JOIN food_donations fd ON fd.id = r.donation_id
     LEFT JOIN deliveries d ON d.id = r.delivery_id
     ${whereClause}
     ${orderClause}
     LIMIT $${listParams.length - 1} OFFSET $${listParams.length}`,
    listParams
  );

  return {
    profile,
    summary: {
      averageRating,
      totalReviews,
      ratingDistribution,
      ratingPercentages,
      topTags,
      reliability,
    },
    reviews: reviewsRes.rows.map(formatReviewRow),
    pagination: {
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      total: filteredTotal,
      totalPages: Math.ceil(filteredTotal / limit) || 1,
    },
  };
};

/**
 * Get authenticated user's reputation overview, received reviews, and submitted reviews.
 */
const getMyReviews = async (userId, { type = 'received', page = 1, limit = 10, sort = 'recent', rating }) => {
  // First obtain user's public reputation summary for the dashboard header
  const userRep = await getUserReputation(userId, { page: 1, limit: 1 });

  const offset = (page - 1) * limit;

  if (type === 'submitted') {
    // Reviews submitted by current user
    const conditions = ["r.reviewer_id = $1"];
    const params = [userId];

    if (rating) {
      params.push(parseInt(rating, 10));
      conditions.push(`r.rating = $${params.length}`);
    }

    const whereClause = 'WHERE ' + conditions.join(' AND ');

    const countRes = await db.query(
      `SELECT COUNT(*) FROM reviews r ${whereClause}`,
      params
    );
    const total = parseInt(countRes.rows[0].count, 10);

    let orderClause = 'ORDER BY r.created_at DESC';
    if (sort === 'highest') orderClause = 'ORDER BY r.rating DESC, r.created_at DESC';
    if (sort === 'lowest') orderClause = 'ORDER BY r.rating ASC, r.created_at DESC';

    const listParams = [...params, limit, offset];

    const reviewsRes = await db.query(
      `SELECT r.*,
              u_target.full_name AS reviewee_name,
              u_target.avatar_url AS reviewee_avatar,
              u_target.role AS reviewee_user_role,
              COALESCE(fp.business_name, ng.organization_name, u_target.full_name) AS reviewee_org_name,
              fd.title AS donation_title,
              fd.category AS donation_category
       FROM reviews r
       JOIN users u_target ON u_target.id = r.reviewee_id
       LEFT JOIN food_providers fp ON fp.user_id = u_target.id
       LEFT JOIN ngos ng ON ng.user_id = u_target.id
       JOIN food_donations fd ON fd.id = r.donation_id
       ${whereClause}
       ${orderClause}
       LIMIT $${listParams.length - 1} OFFSET $${listParams.length}`,
      listParams
    );

    return {
      profile: userRep.profile,
      summary: userRep.summary,
      reviews: reviewsRes.rows.map(formatReviewRow),
      pagination: {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  // Default: Reviews received by current user (shows both approved & flagged so user has full visibility)
  const conditions = ["r.reviewee_id = $1"];
  const params = [userId];

  if (rating) {
    params.push(parseInt(rating, 10));
    conditions.push(`r.rating = $${params.length}`);
  }

  const whereClause = 'WHERE ' + conditions.join(' AND ');

  const countRes = await db.query(
    `SELECT COUNT(*) FROM reviews r ${whereClause}`,
    params
  );
  const total = parseInt(countRes.rows[0].count, 10);

  let orderClause = 'ORDER BY r.created_at DESC';
  if (sort === 'highest') orderClause = 'ORDER BY r.rating DESC, r.created_at DESC';
  if (sort === 'lowest') orderClause = 'ORDER BY r.rating ASC, r.created_at DESC';

  const listParams = [...params, limit, offset];

  const reviewsRes = await db.query(
    `SELECT r.*,
            u_rev.full_name AS reviewer_name,
            u_rev.avatar_url AS reviewer_avatar,
            u_rev.role AS reviewer_user_role,
            COALESCE(fp.business_name, ng.organization_name, u_rev.full_name) AS reviewer_org_name,
            fd.title AS donation_title,
            fd.category AS donation_category
     FROM reviews r
     JOIN users u_rev ON u_rev.id = r.reviewer_id
     LEFT JOIN food_providers fp ON fp.user_id = u_rev.id
     LEFT JOIN ngos ng ON ng.user_id = u_rev.id
     JOIN food_donations fd ON fd.id = r.donation_id
     ${whereClause}
     ${orderClause}
     LIMIT $${listParams.length - 1} OFFSET $${listParams.length}`,
    listParams
  );

  return {
    profile: userRep.profile,
    summary: userRep.summary,
    reviews: reviewsRes.rows.map(formatReviewRow),
    pagination: {
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
};

/**
 * Determine review eligibility for an authenticated user on a specific delivery.
 */
const getDeliveryEligibility = async (deliveryId, currentUserId) => {
  const dRes = await db.query(
    `SELECT d.*,
            fd.title AS donation_title,
            fd.status AS donation_status,
            fd.category AS donation_category,
            fp.user_id AS provider_user_id,
            fp.business_name AS provider_name,
            fp.is_verified AS provider_verified,
            ng.user_id AS ngo_user_id,
            ng.organization_name AS ngo_name,
            ng.is_verified AS ngo_verified,
            vo.user_id AS volunteer_user_id,
            u_vol.full_name AS volunteer_name
     FROM deliveries d
     JOIN food_donations fd ON fd.id = d.donation_id
     JOIN food_providers fp ON fp.id = fd.provider_id
     JOIN ngos ng ON ng.id = d.ngo_id
     LEFT JOIN volunteers vo ON vo.id = d.volunteer_id
     LEFT JOIN users u_vol ON u_vol.id = vo.user_id
     WHERE d.id = $1`,
    [deliveryId]
  );

  if (dRes.rows.length === 0) {
    const err = new Error('Delivery transaction not found.');
    err.statusCode = 404;
    throw err;
  }

  const d = dRes.rows[0];

  // Verify participation
  const isProvider = d.provider_user_id === currentUserId;
  const isNgo = d.ngo_user_id === currentUserId;
  const isVolunteer = d.volunteer_user_id === currentUserId;

  if (!isProvider && !isNgo && !isVolunteer) {
    return {
      eligible: false,
      reason: 'not_participant',
      message: 'You are not a participant in this delivery transaction.',
    };
  }

  // Delivery must be delivered/completed for full review exchange
  if (d.status !== 'delivered' && d.donation_status !== 'delivered' && d.donation_status !== 'completed') {
    return {
      eligible: false,
      reason: 'transaction_not_completed',
      message: `Reviews unlock once the delivery is completed and verified (current status: ${d.status}).`,
    };
  }

  // Determine potential review targets based on role
  const targets = [];

  if (isNgo) {
    // 1. NGO reviewing Provider
    targets.push({
      targetRole: 'provider',
      targetUserId: d.provider_user_id,
      targetName: d.provider_name || 'Food Provider',
      isVerified: !!d.provider_verified,
      reviewType: 'ngo_to_provider',
      presetTags: ['Fresh Food', 'Hygienic Packaging', 'Accurate Portions', 'Prompt Handover', 'Polite Staff'],
    });

    // 2. NGO reviewing Volunteer (if volunteer was involved)
    if (d.volunteer_user_id) {
      targets.push({
        targetRole: 'volunteer',
        targetUserId: d.volunteer_user_id,
        targetName: d.volunteer_name || 'Volunteer Courier',
        isVerified: true,
        reviewType: 'ngo_to_volunteer',
        presetTags: ['Careful Food Handling', 'On-Time Arrival', 'Great Communication', 'Professional & Friendly'],
      });
    }
  } else if (isProvider) {
    // 1. Provider reviewing Volunteer (if courier involved)
    if (d.volunteer_user_id) {
      targets.push({
        targetRole: 'volunteer',
        targetUserId: d.volunteer_user_id,
        targetName: d.volunteer_name || 'Volunteer Courier',
        isVerified: true,
        reviewType: 'provider_to_volunteer',
        presetTags: ['Prompt Pickup', 'Inspected Carefully', 'Smooth QR Handshake', 'Respectful'],
      });
    }

    // 2. Provider reviewing NGO
    targets.push({
      targetRole: 'ngo',
      targetUserId: d.ngo_user_id,
      targetName: d.ngo_name || 'Shelter / NGO',
      isVerified: !!d.ngo_verified,
      reviewType: 'provider_to_ngo',
      presetTags: ['Reliable Claim', 'Fast Coordination', 'Verified Organization', 'Respectful Partnership'],
    });
  } else if (isVolunteer) {
    // 1. Volunteer reviewing Provider
    targets.push({
      targetRole: 'provider',
      targetUserId: d.provider_user_id,
      targetName: d.provider_name || 'Food Provider',
      isVerified: !!d.provider_verified,
      reviewType: 'volunteer_to_provider',
      presetTags: ['Food Ready on Time', 'Secure Packaging', 'Clear Pickup Instructions', 'Polite Staff'],
    });

    // 2. Volunteer reviewing NGO
    targets.push({
      targetRole: 'ngo',
      targetUserId: d.ngo_user_id,
      targetName: d.ngo_name || 'Shelter / NGO',
      isVerified: !!d.ngo_verified,
      reviewType: 'volunteer_to_ngo',
      presetTags: ['Smooth Dropoff Reception', 'Instant QR Verification', 'Helpful Staff', 'Accessible Location'],
    });
  }

  // Check which targets current user has already reviewed
  const existingReviewsRes = await db.query(
    `SELECT * FROM reviews
     WHERE delivery_id = $1 AND reviewer_id = $2`,
    [deliveryId, currentUserId]
  );
  const existingReviews = existingReviewsRes.rows;

  const targetsWithStatus = targets.map(target => {
    const existing = existingReviews.find(
      r => r.reviewee_id === target.targetUserId && r.review_type === target.reviewType
    );
    return {
      ...target,
      alreadyReviewed: !!existing,
      existingReview: existing ? formatReviewRow(existing) : null,
    };
  });

  return {
    eligible: true,
    delivery: {
      id: d.id,
      donation_id: d.donation_id,
      donation_title: d.donation_title,
      donation_category: d.donation_category,
      status: d.status,
      delivery_time: d.delivery_time,
    },
    targets: targetsWithStatus,
  };
};

/**
 * Submit a verified transaction review with comprehensive validation.
 */
const createReview = async ({
  delivery_id,
  donation_id,
  claim_id,
  reviewee_id,
  rating,
  comment = '',
  tags = [],
  review_type = 'claim',
  currentUserId,
}) => {
  // 1. Validate numeric rating
  const numericRating = parseInt(rating, 10);
  if (isNaN(numericRating) || numericRating < 1 || numericRating > 5) {
    const err = new Error('Rating must be an integer between 1 and 5.');
    err.statusCode = 400;
    throw err;
  }

  // 2. Prevent self-reviews
  if (currentUserId === reviewee_id) {
    const err = new Error('Self-reviews are strictly prohibited.');
    err.statusCode = 400;
    throw err;
  }

  // 3. Obtain reviewer role from database (never trust client)
  const reviewerRes = await db.query(
    'SELECT id, role, full_name FROM users WHERE id = $1',
    [currentUserId]
  );
  if (reviewerRes.rows.length === 0) {
    const err = new Error('Reviewer account not found.');
    err.statusCode = 404;
    throw err;
  }
  const reviewerUser = reviewerRes.rows[0];
  const reviewerRole = reviewerUser.role;

  // 4. Obtain reviewee role from database
  const revieweeRes = await db.query(
    'SELECT id, role, full_name FROM users WHERE id = $1',
    [reviewee_id]
  );
  if (revieweeRes.rows.length === 0) {
    const err = new Error('Reviewee account not found.');
    err.statusCode = 404;
    throw err;
  }
  const revieweeUser = revieweeRes.rows[0];
  const reviewedRole = revieweeUser.role;

  // 5. Verify the actual transaction relationship & completion status
  let verifiedDonationId = donation_id;
  let verifiedDeliveryId = delivery_id || null;
  let donationTitle = 'Food Donation';

  if (delivery_id) {
    const dRes = await db.query(
      `SELECT d.*,
              fd.title AS donation_title,
              fd.status AS donation_status,
              fp.user_id AS provider_user_id,
              ng.user_id AS ngo_user_id,
              vo.user_id AS volunteer_user_id
       FROM deliveries d
       JOIN food_donations fd ON fd.id = d.donation_id
       JOIN food_providers fp ON fp.id = fd.provider_id
       JOIN ngos ng ON ng.id = d.ngo_id
       LEFT JOIN volunteers vo ON vo.id = d.volunteer_id
       WHERE d.id = $1`,
      [delivery_id]
    );

    if (dRes.rows.length === 0) {
      const err = new Error('Associated delivery transaction not found.');
      err.statusCode = 404;
      throw err;
    }

    const d = dRes.rows[0];
    verifiedDonationId = d.donation_id;
    donationTitle = d.donation_title;

    // Check completion
    if (d.status !== 'delivered' && d.donation_status !== 'delivered' && d.donation_status !== 'completed') {
      const err = new Error(`Reviews can only be posted for completed transactions (current status: ${d.status}).`);
      err.statusCode = 400;
      throw err;
    }

    // Check that reviewer was a participant
    const participants = [d.provider_user_id, d.ngo_user_id, d.volunteer_user_id].filter(Boolean);
    if (!participants.includes(currentUserId)) {
      const err = new Error('You were not a verified party in this delivery.');
      err.statusCode = 403;
      throw err;
    }

    // Check that reviewee was a counterparty
    if (!participants.includes(reviewee_id)) {
      const err = new Error('The reviewee was not a participant in this transaction.');
      err.statusCode = 400;
      throw err;
    }
  } else {
    // Claim / Donation direct handover verification
    const donRes = await db.query(
      `SELECT fd.*,
              fp.user_id AS provider_user_id,
              dc.id AS matched_claim_id,
              ng.user_id AS ngo_user_id
       FROM food_donations fd
       JOIN food_providers fp ON fp.id = fd.provider_id
       LEFT JOIN donation_claims dc ON dc.donation_id = fd.id AND dc.status = 'accepted'
       LEFT JOIN ngos ng ON ng.id = dc.ngo_id
       WHERE fd.id = $1`,
      [donation_id]
    );

    if (donRes.rows.length === 0) {
      const err = new Error('Donation not found.');
      err.statusCode = 404;
      throw err;
    }

    const don = donRes.rows[0];
    donationTitle = don.title;

    if (!['delivered', 'completed', 'claimed'].includes(don.status)) {
      const err = new Error('Reviews can only be submitted for completed food claims.');
      err.statusCode = 400;
      throw err;
    }

    const participants = [don.provider_user_id, don.ngo_user_id].filter(Boolean);
    if (!participants.includes(currentUserId) || !participants.includes(reviewee_id)) {
      const err = new Error('Invalid review transaction parties.');
      err.statusCode = 403;
      throw err;
    }
  }

  // 6. Check for Duplicate Review
  const duplicateQuery = verifiedDeliveryId
    ? `SELECT id FROM reviews WHERE delivery_id = $1 AND reviewer_id = $2 AND reviewee_id = $3 AND review_type = $4`
    : `SELECT id FROM reviews WHERE donation_id = $1 AND reviewer_id = $2 AND reviewee_id = $3 AND review_type = $4`;
  const duplicateParams = verifiedDeliveryId
    ? [verifiedDeliveryId, currentUserId, reviewee_id, review_type]
    : [verifiedDonationId, currentUserId, reviewee_id, review_type];

  const existingRes = await db.query(duplicateQuery, duplicateParams);
  if (existingRes.rows.length > 0) {
    const err = new Error('You have already submitted a review for this transaction and recipient.');
    err.statusCode = 409;
    throw err;
  }

  // 7. Insert the Review
  const insertRes = await db.query(
    `INSERT INTO reviews (
       donation_id, delivery_id, claim_id,
       reviewer_id, reviewee_id,
       reviewer_role, reviewed_role, review_type,
       rating, comment, tags, moderation_status
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'approved')
     RETURNING *`,
    [
      verifiedDonationId,
      verifiedDeliveryId,
      claim_id || null,
      currentUserId,
      reviewee_id,
      reviewerRole,
      reviewedRole,
      review_type,
      numericRating,
      comment.trim(),
      Array.isArray(tags) ? tags : [],
    ]
  );

  const review = insertRes.rows[0];

  // 8. If reviewee is a volunteer, update their cached average rating in volunteers table
  if (reviewedRole === 'volunteer') {
    await db.query(
      `UPDATE volunteers
       SET rating = (
         SELECT COALESCE(ROUND(AVG(rating)::numeric, 1), 5.0)
         FROM reviews
         WHERE reviewee_id = $1 AND moderation_status = 'approved'
       )
       WHERE user_id = $1`,
      [reviewee_id]
    ).catch(() => {});
  }

  // 9. Dispatch in-app notification to reviewee
  const reviewerName = reviewerUser.full_name || 'A community partner';
  await createNotification({
    userId: reviewee_id,
    title: `⭐ New ${numericRating}-Star Rating Received!`,
    body: `${reviewerName} (${reviewerRole.toUpperCase()}) left you a ${numericRating}-star review for "${donationTitle}".`,
    type: 'in_app',
    data: {
      type: 'review',
      review_id: review.id,
      donation_id: verifiedDonationId,
      delivery_id: verifiedDeliveryId,
      rating: numericRating,
    },
  }).catch(() => {});

  return formatReviewRow(review);
};

/**
 * Edit an existing review (only permitted by author).
 */
const updateReview = async (reviewId, currentUserId, { rating, comment, tags }) => {
  const revRes = await db.query('SELECT * FROM reviews WHERE id = $1', [reviewId]);

  if (revRes.rows.length === 0) {
    const err = new Error('Review not found.');
    err.statusCode = 404;
    throw err;
  }

  const review = revRes.rows[0];

  if (review.reviewer_id !== currentUserId) {
    const err = new Error('Unauthorized: You can only edit your own reviews.');
    err.statusCode = 403;
    throw err;
  }

  const updates = [];
  const params = [];

  if (rating !== undefined) {
    const numRating = parseInt(rating, 10);
    if (isNaN(numRating) || numRating < 1 || numRating > 5) {
      const err = new Error('Rating must be between 1 and 5.');
      err.statusCode = 400;
      throw err;
    }
    params.push(numRating);
    updates.push(`rating = $${params.length}`);
  }

  if (comment !== undefined) {
    params.push(comment.trim());
    updates.push(`comment = $${params.length}`);
  }

  if (tags !== undefined && Array.isArray(tags)) {
    params.push(tags);
    updates.push(`tags = $${params.length}`);
  }

  updates.push(`updated_at = NOW()`);
  params.push(reviewId);

  const { rows } = await db.query(
    `UPDATE reviews SET ${updates.join(', ')} WHERE id = $${params.length} RETURNING *`,
    params
  );

  // Update volunteer rating if reviewee is volunteer
  if (review.reviewed_role === 'volunteer') {
    await db.query(
      `UPDATE volunteers
       SET rating = (
         SELECT COALESCE(ROUND(AVG(rating)::numeric, 1), 5.0)
         FROM reviews
         WHERE reviewee_id = $1 AND moderation_status = 'approved'
       )
       WHERE user_id = $1`,
      [review.reviewee_id]
    ).catch(() => {});
  }

  return formatReviewRow(rows[0]);
};

/**
 * Report a review for administrative moderation.
 */
const reportReview = async (reviewId, currentUserId, { reason }) => {
  const revRes = await db.query('SELECT * FROM reviews WHERE id = $1', [reviewId]);
  if (revRes.rows.length === 0) {
    const err = new Error('Review not found.');
    err.statusCode = 404;
    throw err;
  }

  await db.query(
    `UPDATE reviews
     SET moderation_status = 'flagged', flag_reason = $1, updated_at = NOW()
     WHERE id = $2`,
    [reason.trim(), reviewId]
  );

  return { success: true, message: 'Review reported for administrative review.' };
};

/**
 * Admin moderation of a review.
 */
const moderateReview = async (reviewId, adminUserId, { status, resolution_notes }) => {
  const { rows } = await db.query(
    `UPDATE reviews
     SET moderation_status = $1, flag_reason = COALESCE($2, flag_reason), updated_at = NOW()
     WHERE id = $3
     RETURNING *`,
    [status, resolution_notes || null, reviewId]
  );

  if (rows.length === 0) {
    const err = new Error('Review not found.');
    err.statusCode = 404;
    throw err;
  }

  return formatReviewRow(rows[0]);
};

/**
 * Get all reviews for a specific delivery.
 */
const getDeliveryReviews = async (deliveryId) => {
  const { rows } = await db.query(
    `SELECT r.*,
            u_rev.full_name AS reviewer_name,
            u_rev.avatar_url AS reviewer_avatar,
            u_rev.role AS reviewer_user_role,
            COALESCE(fp.business_name, ng.organization_name, u_rev.full_name) AS reviewer_org_name,
            u_tar.full_name AS reviewee_name,
            u_tar.role AS reviewee_user_role
     FROM reviews r
     JOIN users u_rev ON u_rev.id = r.reviewer_id
     JOIN users u_tar ON u_tar.id = r.reviewee_id
     LEFT JOIN food_providers fp ON fp.user_id = u_rev.id
     LEFT JOIN ngos ng ON ng.user_id = u_rev.id
     WHERE r.delivery_id = $1 AND r.moderation_status = 'approved'
     ORDER BY r.created_at ASC`,
    [deliveryId]
  );

  return rows.map(formatReviewRow);
};

/**
 * Helper to normalize and enrich a review row for clean API output.
 */
function formatReviewRow(r) {
  return {
    id: r.id,
    donation_id: r.donation_id,
    delivery_id: r.delivery_id,
    claim_id: r.claim_id,
    reviewer_id: r.reviewer_id,
    reviewee_id: r.reviewee_id,
    reviewer_role: r.reviewer_role,
    reviewed_role: r.reviewed_role,
    review_type: r.review_type,
    rating: parseInt(r.rating, 10),
    comment: r.comment || '',
    tags: r.tags || [],
    moderation_status: r.moderation_status,
    created_at: r.created_at,
    updated_at: r.updated_at,
    is_verified_transaction: true,
    reviewer: {
      id: r.reviewer_id,
      name: r.reviewer_name || 'Community Member',
      role: r.reviewer_user_role || r.reviewer_role,
      avatar_url: r.reviewer_avatar || null,
      organization_name: r.reviewer_org_name || null,
    },
    reviewee: r.reviewee_name ? {
      id: r.reviewee_id,
      name: r.reviewee_name,
      role: r.reviewee_user_role || r.reviewed_role,
      organization_name: r.reviewee_org_name || null,
    } : undefined,
    transaction: r.donation_title ? {
      donation_id: r.donation_id,
      title: r.donation_title,
      category: r.donation_category || null,
    } : undefined,
  };
}

module.exports = {
  getUserReputation,
  getMyReviews,
  getDeliveryEligibility,
  createReview,
  updateReview,
  reportReview,
  moderateReview,
  getDeliveryReviews,
};
