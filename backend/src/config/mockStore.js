const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

// Pre-hashed 'password123' with 10 salt rounds
const PASSWORD_HASH = '$2a$10$wE9fLgX5yqE1QZ6F7yT5OeX7mK0Y.vL1P4o2y.v2a0.Z7yT5OeX7m'; // We'll compute dynamically

const providerUserId = '11111111-1111-1111-1111-111111111111';
const providerProfileId = '22222222-2222-2222-2222-222222222222';
const ngoUserId = '33333333-3333-3333-3333-333333333333';
const ngoProfileId = '44444444-4444-4444-4444-444444444444';
const volunteerUserId = '55555555-5555-5555-5555-555555555555';
const volunteerProfileId = '66666666-6666-6666-6666-666666666666';
const adminUserId = '77777777-7777-7777-7777-777777777777';

const mockDb = {
  users: [],
  food_providers: [],
  ngos: [],
  volunteers: [],
  food_donations: [],
  donation_claims: [],
  deliveries: [],
  qr_codes: [],
  notifications: [],
  complaints: [],
  audit_logs: [],
  refresh_tokens: [],
};

// Initialize seed data
(async () => {
  const hash = await bcrypt.hash('password123', 10);

  mockDb.users = [
    {
      id: adminUserId,
      email: 'admin@foodrescue.org',
      password_hash: hash,
      role: 'admin',
      status: 'active',
      full_name: 'System Administrator',
      phone: '+1 555-0100',
      created_at: new Date().toISOString(),
    },
    {
      id: providerUserId,
      email: 'provider@foodrescue.org',
      password_hash: hash,
      role: 'provider',
      status: 'active',
      full_name: 'Green Valley Bakery & Cafe',
      phone: '+1 555-0101',
      created_at: new Date().toISOString(),
    },
    {
      id: ngoUserId,
      email: 'ngo@foodrescue.org',
      password_hash: hash,
      role: 'ngo',
      status: 'active',
      full_name: 'Hope Harvest Community Shelter',
      phone: '+1 555-0102',
      created_at: new Date().toISOString(),
    },
    {
      id: volunteerUserId,
      email: 'volunteer@foodrescue.org',
      password_hash: hash,
      role: 'volunteer',
      status: 'active',
      full_name: 'Alex Morgan (Volunteer)',
      phone: '+1 555-0103',
      created_at: new Date().toISOString(),
    },
  ];

  mockDb.food_providers = [
    {
      id: providerProfileId,
      user_id: providerUserId,
      business_name: 'Green Valley Bakery & Cafe',
      business_type: 'Bakery & Deli',
      address: '124 Market St, Downtown',
      latitude: 37.7749,
      longitude: -122.4194,
      is_verified: true,
      total_donations: 42,
      created_at: new Date().toISOString(),
    },
  ];

  mockDb.ngos = [
    {
      id: ngoProfileId,
      user_id: ngoUserId,
      organization_name: 'Hope Harvest Community Shelter',
      registration_no: 'NGO-88421-US',
      address: '450 Mission Blvd, San Francisco',
      latitude: 37.779,
      longitude: -122.418,
      capacity: 500,
      is_verified: true,
      total_received: 128,
      created_at: new Date().toISOString(),
    },
  ];

  mockDb.volunteers = [
    {
      id: volunteerProfileId,
      user_id: volunteerUserId,
      availability: 'available',
      vehicle_type: 'car',
      max_distance_km: 15,
      total_deliveries: 34,
      rating: 4.9,
      created_at: new Date().toISOString(),
    },
  ];

  const don1Id = '88888888-8888-8888-8888-888888888881';
  const don2Id = '88888888-8888-8888-8888-888888888882';
  const don3Id = '88888888-8888-8888-8888-888888888883';

  mockDb.food_donations = [
    {
      id: don1Id,
      provider_id: providerProfileId,
      title: 'Fresh Artisan Sourdough & Croissants',
      description: '25 freshly baked organic sourdough loaves and chocolate croissants in sealed bakery crates.',
      category: 'bakery',
      quantity: 35,
      unit: 'items',
      weight_kg: 18.5,
      pickup_address: '124 Market St, Downtown',
      latitude: 37.7749,
      longitude: -122.4194,
      pickup_window_start: new Date().toISOString(),
      pickup_window_end: new Date(Date.now() + 4 * 3600000).toISOString(),
      expiry_time: new Date(Date.now() + 8 * 3600000).toISOString(),
      status: 'posted',
      created_at: new Date().toISOString(),
    },
    {
      id: don2Id,
      provider_id: providerProfileId,
      title: 'Gourmet Roasted Veggie & Rice Trays',
      description: 'Catered Mediterranean brown rice and roasted vegetables trays, kept in hot holding.',
      category: 'cooked_meals',
      quantity: 60,
      unit: 'servings',
      weight_kg: 24.0,
      pickup_address: '124 Market St, Downtown',
      latitude: 37.7749,
      longitude: -122.4194,
      pickup_window_start: new Date().toISOString(),
      pickup_window_end: new Date(Date.now() + 3 * 3600000).toISOString(),
      expiry_time: new Date(Date.now() + 6 * 3600000).toISOString(),
      status: 'posted',
      created_at: new Date().toISOString(),
    },
    {
      id: don3Id,
      provider_id: providerProfileId,
      title: 'Organic Crisp Apples & Citrus Boxes',
      description: '4 crates of crisp gala apples and fresh oranges from local orchard supply.',
      category: 'fruits_vegetables',
      quantity: 80,
      unit: 'lbs',
      weight_kg: 36.0,
      pickup_address: '124 Market St, Downtown',
      latitude: 37.7749,
      longitude: -122.4194,
      pickup_window_start: new Date().toISOString(),
      pickup_window_end: new Date(Date.now() + 12 * 3600000).toISOString(),
      expiry_time: new Date(Date.now() + 48 * 3600000).toISOString(),
      status: 'posted',
      created_at: new Date().toISOString(),
    },
  ];

  mockDb.notifications = [
    {
      id: uuidv4(),
      user_id: providerUserId,
      type: 'in_app',
      title: 'Welcome to FoodRescue',
      body: 'Your food provider profile is active and verified.',
      is_read: false,
      created_at: new Date().toISOString(),
    },
    {
      id: uuidv4(),
      user_id: ngoUserId,
      type: 'in_app',
      title: 'New Surplus Available Nearby',
      body: 'Fresh Artisan Sourdough & Croissants posted in your area.',
      is_read: false,
      created_at: new Date().toISOString(),
    },
    {
      id: uuidv4(),
      user_id: volunteerUserId,
      type: 'in_app',
      title: 'Ready for Deliveries',
      body: 'You are marked available to accept rescue missions.',
      is_read: false,
      created_at: new Date().toISOString(),
    },
  ];

  mockDb.complaints = [];
  mockDb.audit_logs = [
    {
      id: uuidv4(),
      actor_id: adminUserId,
      action: 'SYSTEM_INIT',
      details: 'FoodRescue mock in-memory service initialized',
      user_email: 'admin@foodrescue.org',
      created_at: new Date().toISOString(),
    },
  ];
})();

function executeMockQuery(text, params = []) {
  const sql = text.trim();
  const lower = sql.toLowerCase();

  // 1. SELECT from users
  if (lower.startsWith('select') && lower.includes('from users')) {
    if (lower.includes('where email = $1')) {
      const email = params[0];
      const found = mockDb.users.find(u => u.email.toLowerCase() === (email || '').toLowerCase());
      return { rows: found ? [{ ...found }] : [] };
    }
    if (lower.includes('where id = $1')) {
      const id = params[0];
      const found = mockDb.users.find(u => u.id === id);
      return { rows: found ? [{ ...found }] : [] };
    }
    return { rows: [...mockDb.users] };
  }

  // 2. INSERT INTO users
  if (lower.startsWith('insert into users')) {
    const newUser = {
      id: uuidv4(),
      email: params[0],
      password_hash: params[1],
      role: params[2],
      full_name: params[3],
      phone: params[4] || null,
      status: params[5] || 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    mockDb.users.push(newUser);
    return { rows: [newUser] };
  }

  // 3. SELECT from food_providers
  if (lower.startsWith('select') && lower.includes('from food_providers')) {
    if (lower.includes('where user_id = $1')) {
      const found = mockDb.food_providers.find(p => p.user_id === params[0]);
      return { rows: found ? [{ ...found }] : [] };
    }
    if (lower.includes('where id = $1')) {
      const found = mockDb.food_providers.find(p => p.id === params[0]);
      return { rows: found ? [{ ...found }] : [] };
    }
    return { rows: [...mockDb.food_providers] };
  }

  // 4. SELECT from ngos
  if (lower.startsWith('select') && lower.includes('from ngos')) {
    if (lower.includes('where user_id = $1')) {
      const found = mockDb.ngos.find(n => n.user_id === params[0]);
      return { rows: found ? [{ ...found }] : [] };
    }
    if (lower.includes('where id = $1')) {
      const found = mockDb.ngos.find(n => n.id === params[0]);
      return { rows: found ? [{ ...found }] : [] };
    }
    return { rows: [...mockDb.ngos] };
  }

  // 5. SELECT from volunteers
  if (lower.startsWith('select') && lower.includes('from volunteers')) {
    if (lower.includes('where user_id = $1')) {
      const found = mockDb.volunteers.find(v => v.user_id === params[0]);
      return { rows: found ? [{ ...found }] : [] };
    }
    if (lower.includes('where id = $1')) {
      const found = mockDb.volunteers.find(v => v.id === params[0]);
      return { rows: found ? [{ ...found }] : [] };
    }
    return { rows: [...mockDb.volunteers] };
  }

  // 6. Refresh tokens queries
  if (lower.startsWith('insert into refresh_tokens')) {
    const rt = {
      id: uuidv4(),
      user_id: params[0],
      token_hash: params[1],
      expires_at: params[2],
      revoked: false,
      created_at: new Date().toISOString(),
    };
    mockDb.refresh_tokens.push(rt);
    return { rows: [rt] };
  }

  if (lower.startsWith('select') && lower.includes('from refresh_tokens')) {
    const tokenHash = params[0];
    const rt = mockDb.refresh_tokens.find(t => t.token_hash === tokenHash);
    if (!rt) return { rows: [] };
    const user = mockDb.users.find(u => u.id === rt.user_id) || {};
    return {
      rows: [{
        ...rt,
        email: user.email,
        role: user.role,
        full_name: user.full_name,
        status: user.status,
      }],
    };
  }

  if (lower.startsWith('update refresh_tokens')) {
    const tokenHash = params[0];
    const rt = mockDb.refresh_tokens.find(t => t.token_hash === tokenHash || t.id === tokenHash);
    if (rt) rt.revoked = true;
    return { rows: rt ? [rt] : [] };
  }

  // 7. Food donations queries
  if (lower.startsWith('select') && lower.includes('from food_donations')) {
    if (lower.includes('where') && (lower.includes('id = $1') || lower.includes('fd.id = $1'))) {
      const found = mockDb.food_donations.find(d => d.id === params[0]);
      return { rows: found ? [{ ...found }] : [] };
    }
    let list = [...mockDb.food_donations];
    if (params[0]) {
      list = list.filter(d => d.status === params[0] || d.provider_id === params[0]);
    }
    return { rows: list };
  }

  if (lower.startsWith('insert into food_donations')) {
    const newDonation = {
      id: uuidv4(),
      provider_id: params[0],
      title: params[1] || 'Donation Item',
      description: params[2] || '',
      category: params[3] || 'cooked_meals',
      quantity: params[4] || 10,
      unit: params[5] || 'servings',
      weight_kg: params[6] || 5,
      pickup_address: params[7] || '123 Rescue St',
      latitude: params[8] || 37.77,
      longitude: params[9] || -122.41,
      pickup_window_start: params[10] || new Date().toISOString(),
      pickup_window_end: params[11] || new Date(Date.now() + 4 * 3600000).toISOString(),
      expiry_time: params[12] || new Date(Date.now() + 8 * 3600000).toISOString(),
      status: 'posted',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    mockDb.food_donations.unshift(newDonation);
    return { rows: [newDonation] };
  }

  if (lower.startsWith('update food_donations')) {
    const id = params[params.length - 1];
    const item = mockDb.food_donations.find(d => d.id === id);
    if (item && lower.includes('status =')) {
      item.status = params[0] || 'cancelled';
    }
    return { rows: item ? [item] : [] };
  }

  // 8. Notifications queries
  if (lower.startsWith('select') && lower.includes('from notifications')) {
    const userId = params[0];
    const userNotes = mockDb.notifications.filter(n => !userId || n.user_id === userId);
    return { rows: userNotes };
  }

  if (lower.startsWith('insert into notifications')) {
    const newNote = {
      id: uuidv4(),
      user_id: params[0],
      type: params[1] || 'in_app',
      title: params[2] || 'Notification',
      body: params[3] || '',
      is_read: false,
      created_at: new Date().toISOString(),
    };
    mockDb.notifications.unshift(newNote);
    return { rows: [newNote] };
  }

  if (lower.startsWith('update notifications')) {
    mockDb.notifications.forEach(n => { n.is_read = true; });
    return { rows: mockDb.notifications };
  }

  // 9. Generic Fallback
  return { rows: [] };
}

module.exports = {
  mockDb,
  executeMockQuery,
};
