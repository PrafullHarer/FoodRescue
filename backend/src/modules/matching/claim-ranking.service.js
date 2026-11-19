/**
 * Shelter Claim Priority & Need Ranking Algorithm
 *
 * Evaluates and ranks all NGO claims on a donation using a multi-factor equity & suitability model:
 * 1. Need & Equity Factor (35%): Recent donations in past 7 & 30 days (fewer receipts = higher hunger urgency)
 * 2. Community Reviews & Trust Factor (25%): Bayesian smoothed provider rating & review volume
 * 3. Capacity & Absorption Factor (20%): Shelter daily population vs donation quantity (optimal match with zero waste)
 * 4. Distance & Freshness Factor (15%): Geographic proximity in km to minimize transit time
 * 5. Reliability & Verification Factor (5%): Official NGO verification & historical completion track record
 */

const db = require('../../config/db');

/**
 * Weights for the composite score (sums to 1.0)
 */
const RANKING_WEIGHTS = {
  need: 0.35,
  reviews: 0.25,
  capacity: 0.20,
  distance: 0.15,
  reliability: 0.05,
};

/**
 * Clamp a number between min and max.
 */
const clamp = (val, min = 0, max = 100) => Math.max(min, Math.min(max, val));

/**
 * Calculate Need & Equity Score (0-100)
 * Shelters that have not received donations recently have a higher hunger relief urgency.
 */
const calculateNeedScore = (claim) => {
  const past7Count = Number(claim.past_7_days_count || 0);
  const past7Qty = Number(claim.past_7_days_quantity || 0);
  const past30Count = Number(claim.past_30_days_count || 0);
  const past30Qty = Number(claim.past_30_days_quantity || 0);
  const capacity = Number(claim.ngo_capacity || 100);

  // Base 7-day score: steep drop-off if NGO is already receiving frequent donations
  let base7Score = 100;
  if (past7Count === 0) {
    base7Score = 100; // Critical urgency: 0 donations in the last 7 days
  } else if (past7Count === 1) {
    base7Score = 82;  // High urgency: only 1 donation in 7 days
  } else if (past7Count === 2) {
    base7Score = 65;  // Moderate urgency
  } else if (past7Count === 3) {
    base7Score = 45;  // Low urgency
  } else {
    base7Score = Math.max(15, 45 - (past7Count - 3) * 10); // Multiple recent donations
  }

  // 30-day deficit adjustment: compare past 30 days intake against monthly capacity (30 * capacity)
  const monthlyCapacityEstimate = Math.max(300, capacity * 30);
  const monthlyFillRatio = past30Qty / monthlyCapacityEstimate;

  let modifier = 0;
  if (monthlyFillRatio < 0.10) {
    modifier += 6; // Severely underserved over the month
  } else if (monthlyFillRatio < 0.25) {
    modifier += 3;
  } else if (monthlyFillRatio > 0.80) {
    modifier -= 6; // Well-supplied shelter
  }

  const needScore = clamp(Math.round(base7Score + modifier), 10, 100);

  // Categorize Need Level
  let needLevel = 'MODERATE';
  let needLabel = 'Moderate Need · Balanced distribution';
  if (needScore >= 85) {
    needLevel = 'CRITICAL';
    needLabel = 'Critical Urgency · 0 recent donations';
  } else if (needScore >= 70) {
    needLevel = 'HIGH';
    needLabel = 'High Urgency · Minimal recent aid';
  } else if (needScore < 50) {
    needLevel = 'STABLE';
    needLabel = 'Well-Supplied · Received recent donations';
  }

  return {
    score: needScore,
    level: needLevel,
    label: needLabel,
    past7Count,
    past7Qty,
    past30Count,
    past30Qty,
  };
};

/**
 * Calculate Community Reviews & Trust Score (0-100)
 * Uses Bayesian smoothing with a prior of 3.8 stars over 3 baseline virtual reviews.
 * This prevents brand new NGOs from being penalized to 0, while strongly rewarding verified high-rated NGOs.
 */
const calculateReviewsScore = (claim) => {
  const avgRating = Number(claim.average_rating || 0);
  const totalReviews = Number(claim.total_reviews || 0);

  const PRIOR_COUNT = 3;
  const PRIOR_RATING = 3.8;

  // Bayesian average
  const smoothedRating = (totalReviews * avgRating + PRIOR_COUNT * PRIOR_RATING) / (totalReviews + PRIOR_COUNT);

  // Normalize 0-5 stars to 0-100 scale
  let rawScore = (smoothedRating / 5.0) * 100;

  // Volume bonus for proven NGOs with 5+ reviews and >= 4.5 rating
  if (totalReviews >= 5 && avgRating >= 4.5) {
    rawScore += 5;
  } else if (totalReviews >= 15 && avgRating >= 4.7) {
    rawScore += 8;
  }

  const reviewsScore = clamp(Math.round(rawScore), 20, 100);

  let trustBadge = 'Standard Trust';
  if (avgRating >= 4.8 && totalReviews >= 5) {
    trustBadge = 'Exceptional Trust';
  } else if (avgRating >= 4.3 && totalReviews >= 2) {
    trustBadge = 'Highly Rated';
  } else if (totalReviews === 0) {
    trustBadge = 'New Verified Shelter';
  }

  return {
    score: reviewsScore,
    avgRating,
    totalReviews,
    smoothedRating: Math.round(smoothedRating * 10) / 10,
    trustBadge,
  };
};

/**
 * Calculate Capacity & Absorption Score (0-100)
 * Evaluates whether the donation fits the shelter's population without waste or overcapacity.
 */
const calculateCapacityScore = (claim, donationQty = 50) => {
  const capacity = Number(claim.ngo_capacity || 100);
  const safeCapacity = Math.max(capacity, 20);
  const ratio = donationQty / safeCapacity;

  let score = 100;
  let fitLabel = 'Ideal Capacity Fit';

  if (ratio <= 0.35) {
    score = 100; // Perfect fit, easily absorbed within regular daily meal service
    fitLabel = 'Optimal Absorption (Zero Spoilage Risk)';
  } else if (ratio <= 0.70) {
    score = 92;  // Excellent fit, covers substantial resident portion
    fitLabel = 'Great Fit (Covers 35-70% of Daily Needs)';
  } else if (ratio <= 1.00) {
    score = 85;  // Meets full single-day capacity
    fitLabel = 'Full Daily Match (100% Absorbed Today)';
  } else if (ratio <= 1.50) {
    score = 68;  // Stretched capacity
    fitLabel = 'Stretched Capacity (May need multi-meal storage)';
  } else if (ratio <= 2.00) {
    score = 50;  // High volume relative to shelter size
    fitLabel = 'High Volume (Requires active refrigeration)';
  } else {
    score = 30;  // Overcapacity
    fitLabel = 'Overcapacity Warning (Exceeds 2x daily meals)';
  }

  // Large shelter bonus: shelters supporting >= 250 people feed more community members
  if (capacity >= 250) {
    score += 5;
  }

  const capacityScore = clamp(Math.round(score), 20, 100);

  return {
    score: capacityScore,
    capacity,
    ratio: Math.round(ratio * 100) / 100,
    fitLabel,
  };
};

/**
 * Calculate Distance & Freshness Score (0-100)
 * Shorter distance ensures quicker transit and maximum food freshness.
 */
const calculateDistanceScore = (claim) => {
  const distanceKm = claim.distance_km !== null && claim.distance_km !== undefined
    ? Number(claim.distance_km)
    : null;

  if (distanceKm === null) {
    return {
      score: 65, // Neutral score if distance is unavailable
      distanceKm: null,
      label: 'Distance pending location sync',
    };
  }

  let score = 100;
  if (distanceKm <= 2.0) {
    score = 100; // Hyper-local, under 2 km
  } else if (distanceKm <= 5.0) {
    score = 88;  // Very close, 2-5 km
  } else if (distanceKm <= 10.0) {
    score = 74;  // Reasonable local reach, 5-10 km
  } else if (distanceKm <= 20.0) {
    score = 55;  // Moderate transit distance
  } else {
    score = Math.max(20, 50 - (distanceKm - 20) * 1.5);
  }

  const distanceScore = clamp(Math.round(score), 20, 100);

  return {
    score: distanceScore,
    distanceKm,
    label: `${distanceKm} km from pickup`,
  };
};

/**
 * Calculate Reliability & Verification Score (0-100)
 */
const calculateReliabilityScore = (claim) => {
  let score = claim.ngo_is_verified ? 80 : 40;

  const completedCount = Number(claim.total_completed_count || 0);
  if (completedCount >= 10) {
    score += 20;
  } else if (completedCount >= 5) {
    score += 15;
  } else if (completedCount >= 1) {
    score += 10;
  }

  const reliabilityScore = clamp(Math.round(score), 20, 100);

  return {
    score: reliabilityScore,
    isVerified: !!claim.ngo_is_verified,
    completedCount,
  };
};

/**
 * Synthesize a natural human-readable AI recommendation reason.
 */
const generateRecommendationReason = ({
  rank,
  priorityScore,
  needDetails,
  reviewsDetails,
  capacityDetails,
  distanceDetails,
  claim,
  donationQty,
}) => {
  const parts = [];

  // Need rationale
  if (needDetails.past7Count === 0) {
    parts.push('Highest hunger urgency (0 donations received in past 7 days)');
  } else if (needDetails.past7Count === 1) {
    parts.push('High community need (only 1 donation in past 7 days)');
  } else {
    parts.push(`Received ${needDetails.past7Count} donations (${needDetails.past7Qty} meals) this week`);
  }

  // Reviews rationale
  if (reviewsDetails.totalReviews > 0) {
    parts.push(`${reviewsDetails.avgRating.toFixed(1)}★ community trust from ${reviewsDetails.totalReviews} review${reviewsDetails.totalReviews > 1 ? 's' : ''}`);
  } else {
    parts.push('New registered verified shelter');
  }

  // Capacity rationale
  parts.push(`capacity of ${capacityDetails.capacity} meals/day easily absorbs this ${donationQty}-meal parcel`);

  // Distance rationale
  if (distanceDetails.distanceKm !== null) {
    parts.push(`located ${distanceDetails.distanceKm} km away`);
  }

  if (rank === 1) {
    return `Top Match (${priorityScore}% score): ${parts.slice(0, 3).join(', ')}, ${parts[3] || 'ready for immediate distribution'}.`;
  } else if (rank === 2) {
    return `Strong Alternative (${priorityScore}% score): ${parts.slice(0, 3).join(', ')}.`;
  } else {
    if (needDetails.past7Count >= 3) {
      return `Balanced Priority (${priorityScore}% score): Has received ${needDetails.past7Count} donations this week; prioritizing shelters with greater hunger urgency.`;
    }
    return `Candidate (${priorityScore}% score): ${parts.slice(0, 2).join(', ')}.`;
  }
};

/**
 * Score a single claim against a donation.
 */
const scoreClaim = (claim, donation) => {
  const donationQty = Number(donation?.quantity || 50);

  const need = calculateNeedScore(claim);
  const reviews = calculateReviewsScore(claim);
  const capacity = calculateCapacityScore(claim, donationQty);
  const distance = calculateDistanceScore(claim);
  const reliability = calculateReliabilityScore(claim);

  // Composite weighted score
  const rawPriorityScore =
    need.score * RANKING_WEIGHTS.need +
    reviews.score * RANKING_WEIGHTS.reviews +
    capacity.score * RANKING_WEIGHTS.capacity +
    distance.score * RANKING_WEIGHTS.distance +
    reliability.score * RANKING_WEIGHTS.reliability;

  const priorityScore = clamp(Math.round(rawPriorityScore), 1, 100);

  return {
    priority_score: priorityScore,
    match_score: priorityScore / 100.0, // Stored as 0.0 - 1.0 in DB
    need_score: need.score,
    need_level: need.level,
    need_label: need.label,
    reviews_score: reviews.score,
    reviews_badge: reviews.trustBadge,
    capacity_score: capacity.score,
    capacity_fit_label: capacity.fitLabel,
    distance_score: distance.score,
    distance_label: distance.label,
    reliability_score: reliability.score,
    _details: {
      need,
      reviews,
      capacity,
      distance,
      reliability,
      donationQty,
    },
  };
};

/**
 * Rank an array of claims for a donation using the priority algorithm.
 *
 * Sorting hierarchy:
 * 1. Accepted claim always takes #1 if already awarded
 * 2. Pending claims ranked by priority_score DESC, then claimed_at ASC (earliest applicant breaks ties)
 * 3. Rejected claims placed at the end
 *
 * @param {Array<Object>} claims - Decorated claim objects
 * @param {Object} donation - Donation entity
 * @returns {Array<Object>} Claims sorted with rank, priority scores, and recommendation reasons
 */
const rankDonationClaims = (claims, donation) => {
  if (!claims || claims.length === 0) return [];

  // 1. Calculate scores for each claim
  const scoredClaims = claims.map((claim) => {
    const scores = scoreClaim(claim, donation);
    return {
      ...claim,
      ...scores,
    };
  });

  // 2. Separate into status buckets
  const accepted = scoredClaims.filter((c) => c.claim_status === 'accepted');
  const pending = scoredClaims.filter((c) => c.claim_status === 'pending');
  const rejected = scoredClaims.filter((c) => c.claim_status === 'rejected');
  const others = scoredClaims.filter((c) => !['accepted', 'pending', 'rejected'].includes(c.claim_status));

  // Sort pending claims by priority_score DESC, then by claimed_at ASC
  pending.sort((a, b) => {
    if (b.priority_score !== a.priority_score) {
      return b.priority_score - a.priority_score;
    }
    const timeA = new Date(a.claimed_at || 0).getTime();
    const timeB = new Date(b.claimed_at || 0).getTime();
    return timeA - timeB;
  });

  // Combine in presentation order
  const rankedList = [...accepted, ...pending, ...others, ...rejected];

  // Assign ranks & badges
  let currentRank = 1;
  const finalized = rankedList.map((claim) => {
    const isAccepted = claim.claim_status === 'accepted';
    const isPending = claim.claim_status === 'pending';

    let rankNumber = currentRank;
    if (isPending || isAccepted) {
      rankNumber = currentRank++;
    }

    let recommendationBadge = null;
    if (isAccepted) {
      recommendationBadge = 'Selected Recipient';
    } else if (rankNumber === 1) {
      recommendationBadge = '#1 Top Recommendation';
    } else if (rankNumber === 2) {
      recommendationBadge = '#2 Strong Match';
    } else if (rankNumber === 3) {
      recommendationBadge = '#3 Qualified Alternative';
    } else {
      recommendationBadge = `#${rankNumber} Applicant`;
    }

    const recommendationReason = generateRecommendationReason({
      rank: rankNumber,
      priorityScore: claim.priority_score,
      needDetails: claim._details.need,
      reviewsDetails: claim._details.reviews,
      capacityDetails: claim._details.capacity,
      distanceDetails: claim._details.distance,
      claim,
      donationQty: claim._details.donationQty,
    });

    // Remove internal _details from clean response
    const { _details, ...cleanClaim } = claim;

    return {
      ...cleanClaim,
      rank: rankNumber,
      recommendation_badge: recommendationBadge,
      recommendation_reason: recommendationReason,
    };
  });

  return finalized;
};

/**
 * Persist computed match_scores to the donation_claims table asynchronously.
 */
const persistClaimMatchScores = async (rankedClaims) => {
  if (!rankedClaims || rankedClaims.length === 0) return;

  try {
    const updatePromises = rankedClaims.map((claim) => {
      if (!claim.claim_id || claim.match_score === undefined) return null;
      return db.query(
        'UPDATE donation_claims SET match_score = $1 WHERE id = $2',
        [claim.match_score, claim.claim_id]
      );
    });

    await Promise.all(updatePromises.filter(Boolean));
  } catch (err) {
    // Non-fatal warning: ranking still functions even if cache update encounters a lock
    console.warn('Warning: Could not persist claim match_scores:', err.message);
  }
};

module.exports = {
  RANKING_WEIGHTS,
  calculateNeedScore,
  calculateReviewsScore,
  calculateCapacityScore,
  calculateDistanceScore,
  calculateReliabilityScore,
  scoreClaim,
  rankDonationClaims,
  persistClaimMatchScores,
};

