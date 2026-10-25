/**
 * Application-wide constants.
 */
module.exports = {
  // Donation status machine valid transitions
  DONATION_STATUS_TRANSITIONS: {
    posted:             ['matched', 'expired', 'cancelled'],
    matched:            ['claimed', 'expired', 'cancelled'],
    claimed:            ['volunteer_assigned', 'expired', 'cancelled'],
    volunteer_assigned: ['collected', 'expired', 'cancelled'],
    collected:          ['delivered', 'cancelled'],
    delivered:          ['completed'],
    completed:          [],
    expired:            [],
    cancelled:          [],
  },

  // Smart Matching Engine weights
  MATCHING_WEIGHTS: {
    distance:       0.30,  // wd — closer is better
    quantity:       0.20,  // wq — capacity match
    foodPref:       0.20,  // wf — food preference alignment
    time:           0.15,  // wt — urgency / time remaining
    pastPerformance: 0.15, // wp — NGO pickup reliability
  },

  // Points awarded per action (gamification)
  POINTS: {
    donation_posted:    10,
    donation_claimed:    5,
    delivery_completed: 20,
    badge_earned:       15,
  },

  // Pagination defaults
  PAGINATION: {
    defaultPage: 1,
    defaultLimit: 20,
    maxLimit: 100,
  },
};
