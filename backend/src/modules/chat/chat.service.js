const fs = require('fs');
const path = require('path');
const db = require('../../config/db');

// Load navigation knowledge base and system prompt
const knowledgePath = path.resolve(__dirname, 'navigation-knowledge.json');
const promptPath = path.resolve(__dirname, 'system-prompt.txt');

let navigationKnowledge = {};
try {
  navigationKnowledge = JSON.parse(fs.readFileSync(knowledgePath, 'utf8'));
} catch (err) {
  console.warn('⚠️ [CHAT] Failed to parse navigation-knowledge.json:', err.message);
}

let systemPromptText = '';
try {
  systemPromptText = fs.readFileSync(promptPath, 'utf8');
} catch (err) {
  console.warn('⚠️ [CHAT] Failed to read system-prompt.txt:', err.message);
}

// In-memory chat log buffer for review and analytics (also persisted to logs file)
const chatLogsBuffer = [];
const logFilePath = path.resolve(__dirname, '../../../logs/chat-audit.jsonl');

/**
 * Ensure log directory exists
 */
function ensureLogDir() {
  const dir = path.dirname(logFilePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * Mask PII (Personal Identifiable Information) such as emails and phone numbers.
 */
function maskPII(text) {
  if (!text || typeof text !== 'string') return '';
  // Mask email addresses: john.doe@example.com -> j***@example.com
  let masked = text.replace(/([a-zA-Z0-9._%+-])[a-zA-Z0-9._%+-]*@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g, '$1***@$2');
  // Mask 10-12 digit phone numbers / Indian mobile numbers
  masked = masked.replace(/(?:\+91[\-\s]?)?[6-9]\d{4}[\-\s]?\d{5}/g, '+91 98*** 43210');
  // Mask PAN / ID formats: 5 letters, 4 digits, 1 letter
  masked = masked.replace(/[A-Z]{5}[0-9]{4}[A-Z]{1}/gi, '*****1234*');
  return masked;
}

/**
 * Detect language of message (English, Hindi, Marathi).
 */
function detectLanguage(text) {
  if (!text) return 'en';
  // Check for Marathi-specific words / patterns
  const marathiMarkers = ['आहे', 'मला', 'कसे', 'करा', 'करायचे', 'अन्न', 'देणगी', 'मदत', 'धन्यवाद', 'नमस्कार', 'पावती', 'नोंदणी'];
  const hindiMarkers = ['है', 'मुझे', 'कैसे', 'करें', 'भोजन', 'दान', 'सहायता', 'शुक्रिया', 'नमस्ते', 'रसीद', 'पंजीकरण'];
  
  for (const m of marathiMarkers) {
    if (text.includes(m)) return 'mr';
  }
  for (const h of hindiMarkers) {
    if (text.includes(h)) return 'hi';
  }
  return 'en';
}

/**
 * Permissive on-topic term check.
 */
function isPermissiveOnTopic(text) {
  const clean = text.toLowerCase();

  const platformTerms = [
    'donation', 'donate', 'donating', 'donated', 'food', 'meal', 'claim', 'claiming', 'claimed',
    'ngo', 'shelter', 'kitchen', 'provider', 'restaurant', 'caterer', 'bakery', 'supermarket',
    'volunteer', 'courier', 'driver', 'mission', 'rescue', 'delivery', 'deliveries',
    'qr', 'code', 'pickup', 'dropoff', 'scan', 'verify', 'verification',
    'receipt', 'certificate', 'tax', '80g', 'esg', 'carbon', 'impact', 'metrics',
    'login', 'log in', 'signin', 'sign in', 'register', 'signup', 'sign up',
    'password', 'forgot password', 'reset password', 'delete account', 'delete option', 'profile',
    'support', 'contact', 'email', 'feedback', 'review', 'complaint', 'incident', 'hotspot',
    'servings', 'surplus', 'expiry', 'batch', 'weight', 'produce', 'prepared', 'listing', 'listings',
    'admin', 'user', 'role', 'status', 'account', 'help', 'website', 'platform', 'site', 'don-'
  ];

  for (const term of platformTerms) {
    if (clean.includes(term)) return true;
  }

  // Greetings and common polite phrases
  const greetingsAndThanks = [
    'hello', 'hi', 'hey', 'greetings', 'good morning', 'good afternoon', 'good evening',
    'namaste', 'kem cho', 'kasa kay', 'thanks', 'thank you', 'dhanyawad', 'shukriya', 'aabhar', 'bye', 'goodbye'
  ];

  for (const g of greetingsAndThanks) {
    if (clean.includes(g)) return true;
  }

  return false;
}

/**
 * Check if the user is attempting prompt injection, PII harvesting, or pretending to be an admin in text.
 */
function isPrivacyOrInjectionAttack(text, user) {
  const clean = text.toLowerCase();

  const injectionTriggers = [
    'ignore previous instructions',
    'ignore all rules',
    'system prompt',
    'developer mode',
    'jailbreak',
    'dan mode'
  ];

  for (const trigger of injectionTriggers) {
    if (clean.includes(trigger)) {
      return { isAttack: true, type: 'INJECTION' };
    }
  }

  // Harvesting all user data / emails
  const harvestingTriggers = [
    'show all users',
    'list all users',
    'all user emails',
    'all users\' emails',
    'all emails',
    'dump users',
    'user passwords',
    'show passwords',
    'export all users'
  ];

  for (const trigger of harvestingTriggers) {
    if (clean.includes(trigger)) {
      return { isAttack: true, type: 'PII_HARVESTING' };
    }
  }

  // Text claim of being an admin when verified JWT is not admin
  const claimsAdmin = clean.includes('i am admin') || clean.includes("i'm admin") || clean.includes('as an admin') || clean.includes('i am the admin');
  if (claimsAdmin && (!user || user.role !== 'admin')) {
    return { isAttack: true, type: 'ROLE_SPOOF' };
  }

  return { isAttack: false };
}

/**
 * Lookup donation details from the database with strict role authorization and privacy rules.
 */
async function lookupDonationFromDB(text, user) {
  // If guest, lookup is forbidden
  if (!user) {
    return {
      handled: true,
      requiresLogin: true,
      text: "To track or view donation details, please log in to your FoodRescue account first. You can log in at [Login](/login)."
    };
  }

  // Extract donation code (e.g. DON-849201) or UUID or check "my last donation"
  const donCodeMatch = text.match(/DON-?\d{5,8}/i);
  const uuidMatch = text.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
  const isMyDonation = /my\s+(?:last\s+)?donation|last\s+donation|my\s+listing/i.test(text);

  let query = '';
  let params = [];

  if (donCodeMatch) {
    const code = donCodeMatch[0].toUpperCase().replace(/^(DON)(\d+)/, '$1-$2');
    query = `
      SELECT fd.*, 
             fp.user_id AS provider_user_id,
             fp.business_name AS provider_business_name,
             dc.id AS claim_id,
             dc.status AS claim_status,
             n.user_id AS ngo_user_id,
             n.organization_name AS ngo_organization_name,
             del.id AS delivery_id,
             del.status AS delivery_status,
             v.user_id AS volunteer_user_id
      FROM food_donations fd
      LEFT JOIN food_providers fp ON fd.provider_id = fp.id
      LEFT JOIN donation_claims dc ON dc.donation_id = fd.id
      LEFT JOIN ngos n ON dc.ngo_id = n.id
      LEFT JOIN deliveries del ON del.donation_id = fd.id
      LEFT JOIN volunteers v ON del.volunteer_id = v.id
      WHERE fd.donation_code ILIKE $1 OR fd.id::text ILIKE $1
      ORDER BY fd.created_at DESC
      LIMIT 1
    `;
    params = [`%${code}%`];
  } else if (uuidMatch) {
    query = `
      SELECT fd.*, 
             fp.user_id AS provider_user_id,
             fp.business_name AS provider_business_name,
             dc.id AS claim_id,
             dc.status AS claim_status,
             n.user_id AS ngo_user_id,
             n.organization_name AS ngo_organization_name,
             del.id AS delivery_id,
             del.status AS delivery_status,
             v.user_id AS volunteer_user_id
      FROM food_donations fd
      LEFT JOIN food_providers fp ON fd.provider_id = fp.id
      LEFT JOIN donation_claims dc ON dc.donation_id = fd.id
      LEFT JOIN ngos n ON dc.ngo_id = n.id
      LEFT JOIN deliveries del ON del.donation_id = fd.id
      LEFT JOIN volunteers v ON del.volunteer_id = v.id
      WHERE fd.id = $1
      LIMIT 1
    `;
    params = [uuidMatch[0]];
  } else if (isMyDonation) {
    // Look up latest donation for this user based on their verified JWT role
    if (user.role === 'provider') {
      query = `
        SELECT fd.*, 
               fp.user_id AS provider_user_id,
               fp.business_name AS provider_business_name,
               dc.id AS claim_id,
               dc.status AS claim_status,
               n.user_id AS ngo_user_id,
               n.organization_name AS ngo_organization_name,
               del.id AS delivery_id,
               del.status AS delivery_status,
               v.user_id AS volunteer_user_id
        FROM food_donations fd
        JOIN food_providers fp ON fd.provider_id = fp.id
        LEFT JOIN donation_claims dc ON dc.donation_id = fd.id
        LEFT JOIN ngos n ON dc.ngo_id = n.id
        LEFT JOIN deliveries del ON del.donation_id = fd.id
        LEFT JOIN volunteers v ON del.volunteer_id = v.id
        WHERE fp.user_id = $1
        ORDER BY fd.created_at DESC
        LIMIT 1
      `;
      params = [user.id];
    } else if (user.role === 'ngo') {
      query = `
        SELECT fd.*, 
               fp.user_id AS provider_user_id,
               fp.business_name AS provider_business_name,
               dc.id AS claim_id,
               dc.status AS claim_status,
               n.user_id AS ngo_user_id,
               n.organization_name AS ngo_organization_name,
               del.id AS delivery_id,
               del.status AS delivery_status,
               v.user_id AS volunteer_user_id
        FROM donation_claims dc
        JOIN food_donations fd ON dc.donation_id = fd.id
        JOIN ngos n ON dc.ngo_id = n.id
        LEFT JOIN food_providers fp ON fd.provider_id = fp.id
        LEFT JOIN deliveries del ON del.donation_id = fd.id
        LEFT JOIN volunteers v ON del.volunteer_id = v.id
        WHERE n.user_id = $1
        ORDER BY dc.created_at DESC
        LIMIT 1
      `;
      params = [user.id];
    } else if (user.role === 'volunteer') {
      query = `
        SELECT fd.*, 
               fp.user_id AS provider_user_id,
               fp.business_name AS provider_business_name,
               dc.id AS claim_id,
               dc.status AS claim_status,
               n.user_id AS ngo_user_id,
               n.organization_name AS ngo_organization_name,
               del.id AS delivery_id,
               del.status AS delivery_status,
               v.user_id AS volunteer_user_id
        FROM deliveries del
        JOIN food_donations fd ON del.donation_id = fd.id
        JOIN volunteers v ON del.volunteer_id = v.id
        LEFT JOIN food_providers fp ON fd.provider_id = fp.id
        LEFT JOIN donation_claims dc ON dc.donation_id = fd.id
        LEFT JOIN ngos n ON dc.ngo_id = n.id
        WHERE v.user_id = $1
        ORDER BY del.created_at DESC
        LIMIT 1
      `;
      params = [user.id];
    } else {
      query = `
        SELECT fd.*, 
               fp.user_id AS provider_user_id,
               fp.business_name AS provider_business_name,
               dc.id AS claim_id,
               dc.status AS claim_status,
               n.user_id AS ngo_user_id,
               n.organization_name AS ngo_organization_name,
               del.id AS delivery_id,
               del.status AS delivery_status,
               v.user_id AS volunteer_user_id
        FROM food_donations fd
        LEFT JOIN food_providers fp ON fd.provider_id = fp.id
        LEFT JOIN donation_claims dc ON dc.donation_id = fd.id
        LEFT JOIN ngos n ON dc.ngo_id = n.id
        LEFT JOIN deliveries del ON del.donation_id = fd.id
        LEFT JOIN volunteers v ON del.volunteer_id = v.id
        ORDER BY fd.created_at DESC
        LIMIT 1
      `;
      params = [];
    }
  } else {
    // No specific donation reference found
    return { handled: false };
  }

  try {
    const { rows } = await db.query(query, params);
    if (rows.length === 0) {
      return {
        handled: true,
        text: "No donation found matching that ID. Please check the donation code (e.g. DON-849201) or review your listings in [My Listings](/donations/my)."
      };
    }

    const row = rows[0];

    // Authorization evaluation:
    // Owning provider, claiming NGO, assigned volunteer, or admin
    const isOwner = row.provider_user_id === user.id;
    const isClaimingNgo = row.ngo_user_id === user.id;
    const isAssignedVolunteer = row.volunteer_user_id === user.id;
    const isAdmin = user.role === 'admin';
    const isParticipant = isOwner || isClaimingNgo || isAssignedVolunteer || isAdmin;

    if (isParticipant) {
      // Full details (with sensitive phone/email masked)
      const receiptNote = row.status === 'COMPLETED'
        ? "📄 **Tax & Impact Receipt:** Available for download at [Impact & Receipts](/impact)"
        : "📄 **Tax & Impact Receipt:** Generated upon completed delivery.";

      return {
        handled: true,
        text: `### 📦 Donation Details (${row.donation_code || 'ID: ' + row.id.slice(0, 8)})
- **Title:** ${row.title}
- **Category:** ${row.category}
- **Quantity / Servings:** ${row.quantity} ${row.unit || 'servings'}${row.weight_kg ? ` (${row.weight_kg} kg)` : ''}
- **Current Status:** **${row.status}**
- **Pickup Window:** ${row.pickup_window_start ? new Date(row.pickup_window_start).toLocaleString() : 'N/A'} - ${row.pickup_window_end ? new Date(row.pickup_window_end).toLocaleString() : 'N/A'}
- **Pickup Address:** ${maskPII(row.pickup_address || 'Registered provider location')}
${row.claim_status ? `- **Claim Status:** ${row.claim_status}` : ''}
${row.delivery_status ? `- **Delivery Status:** ${row.delivery_status}` : ''}
${receiptNote}

You can manage this donation anytime in [My Listings](/donations/my).`
      };
    } else {
      // STRICT PRIVACY RULE #1: Non-owners and guests may see ONLY title, category, servings, status.
      // Never return pickup address, coordinates, phone, email, business name of private users, or QR codes.
      return {
        handled: true,
        text: `### 📦 Public Donation Overview (${row.donation_code || 'ID: ' + row.id.slice(0, 8)})
- **Title:** ${row.title}
- **Category:** ${row.category}
- **Servings:** ${row.quantity} ${row.unit || 'servings'}
- **Status:** **${row.status}**

*Note: In accordance with FoodRescue privacy policy, detailed pickup addresses, courier coordinates, and direct donor contact details are restricted exclusively to the owning provider, assigned NGO, and active courier.*`
      };
    }
  } catch (err) {
    console.error('❌ [CHAT] Database lookup error:', err.message);
    return {
      handled: true,
      text: "An error occurred while looking up that donation. Please try again or visit [My Listings](/donations/my)."
    };
  }
}

/**
 * Deterministic expert engine for navigation, role guidance, and FAQs.
 */
function generateDeterministicReply(text, user) {
  const clean = text.toLowerCase();
  const lang = detectLanguage(text);

  // 1. Off-topic check: Must be permissive, but if completely unrelated, politely refuse
  if (!isPermissiveOnTopic(text)) {
    if (lang === 'mr') {
      return "मी फक्त या अन्नदान प्लॅटफॉर्मशी संबंधित प्रश्नांमध्ये मदत करू शकतो. देणगी किंवा वेबसाइट वापरण्याबद्दल मला काही विचारू शकता का?";
    }
    if (lang === 'hi') {
      return "मैं केवल इस दान मंच से संबंधित प्रश्नों में आपकी सहायता कर सकता हूँ। क्या दान करने या वेबसाइट का उपयोग करने के बारे में कोई प्रश्न है?";
    }
    return "I can only help with questions about this donation platform. Is there something about donations or using the site I can help with?";
  }

  // 2. Greetings
  if (/^(hi|hello|hey|namaste|kem cho|kasa kay|good morning|good afternoon|good evening)\b/i.test(text.trim())) {
    const roleGreeting = user ? ` (${user.role.toUpperCase()})` : '';
    if (lang === 'mr') {
      return `नमस्कार! मी आपला FoodRescue AI सहाय्यक आहे${roleGreeting}. अन्नदान, क्लेम किंवा वेबसाइट नेव्हिगेशनबद्दल मी आपल्याला कशी मदत करू शकतो?`;
    }
    if (lang === 'hi') {
      return `नमस्ते! मैं आपका FoodRescue AI सहायक हूँ${roleGreeting}। भोजन दान, क्लेम या वेबसाइट के उपयोग के बारे में मैं आपकी क्या मदद कर सकता हूँ?`;
    }
    return `Hello! I am your FoodRescue AI Assistant${roleGreeting}. How can I help you today with food donations, rescue missions, receipts, or site navigation?`;
  }

  // 3. Thanks
  if (/^(thank you|thanks|dhanyawad|shukriya|aabhar)\b/i.test(text.trim())) {
    if (lang === 'mr') return "आपले स्वागत आहे! अन्नाची नासाडी रोखण्यासाठी FoodRescue सोबत जोडल्याबद्दल धन्यवाद! 🍲🌱";
    if (lang === 'hi') return "आपका स्वागत है! भोजन की बर्बादी रोकने के लिए FoodRescue से जुड़ने हेतु धन्यवाद! 🍲🌱";
    return "You're very welcome! Thank you for helping eliminate edible food waste with FoodRescue! 🍲🌱";
  }

  // 4. Role-aware guidance: NGO asking to create a listing / post food
  const asksToCreateDonation = /(create|post|publish|list|add)\s+(?:a\s+)?(?:donation|food|listing)/i.test(clean);
  if (user && user.role === 'ngo' && asksToCreateDonation) {
    return `Only **Food Providers** (restaurants, caterers, bakeries, supermarkets) can post surplus food listings. 

As a verified **NGO**, your role is to rescue and distribute surplus food! Here is what you can do instead:
1. Browse live food donations posted by local businesses at [Available Donations](/donations/available).
2. Review servings, food categories, and pickup deadlines.
3. Click **"Claim Food"** on any suitable batch to reserve meals for your community shelter.
4. Arrange volunteer courier pickup or choose self-pickup.`;
  }

  // 5. "Where is the receipt option?" / Receipt navigation
  if (/where.*(receipt|certificate|80g|tax|download.*receipt)/i.test(clean) || /(how|where).*(get|find|download).*receipt/i.test(clean)) {
    return `### 📄 How to find and download your Donation Receipt:
1. Open the platform sidebar and click [Impact & Receipts](/impact).
2. Scroll to the **"Completed Donations & ESG Impact"** section.
3. Locate the completed donation batch.
4. Click the **"Download Receipt"** or **"View 80G Certificate"** button next to that donation.
5. Your certified PDF receipt (including carbon-reduction metrics and tax-exemption verification) will download instantly.

*Note:* Receipts are available for Food Providers and claiming NGOs once the delivery is marked COMPLETED.`;
  }

  // 6. "How do I donate?" / Post donation guide
  if (/(how.*(?:do i|can i|to)\s+donate)|(how.*post.*food)|(steps to donate)/i.test(clean)) {
    return `### 🍲 Step-by-Step Guide: How to Donate Surplus Food
1. **Ensure you have a Food Provider account:** Surplus food donations are posted by registered providers (restaurants, bakeries, caterers, grocery stores). If not registered, sign up at [Register as Provider](/register?role=provider).
2. **Open the Donation Form:** Click [Post Surplus Food](/donations/create) in the sidebar or header navigation.
3. **Enter Meal Details:**
   - Food title (e.g., "50 portions of freshly cooked vegetable biryani").
   - Category (Prepared Meal, Bakery, Produce, Dairy, Packaged).
   - Quantity / Servings count and approximate weight (kg).
   - Allergen information and dietary tags (Vegetarian, Vegan, Halal).
4. **Set Pickup Window & Expiry:** Specify safe consumption time and pickup hours.
5. **Confirm Location:** Check your pickup address and map pin.
6. **Publish Listing:** Click **"Publish Donation Listing"**. Verified NGOs and volunteer couriers within your vicinity will be notified automatically to claim and rescue the batch!`;
  }

  // 7. How to claim food (NGO)
  if (/how.*(?:claim|request).*food/i.test(clean)) {
    return `### 🤝 How NGOs Claim Surplus Food:
1. Log in with your verified **NGO** account.
2. Go to [Available Donations](/donations/available).
3. Filter by distance, category, or serving quantity.
4. Click on a listing to inspect food quality and pickup time.
5. Click **"Claim Donation"** and select whether you want a community volunteer courier dispatched or will handle self-pickup.
6. Once accepted, track courier progress in real-time until safe drop-off at your shelter!`;
  }

  // 8. Forgot password / Reset password
  if (/(forgot|reset).*password/i.test(clean)) {
    return `### 🔐 How to Reset Your Password:
1. If logged out, go to [Forgot Password](/forgot-password).
2. Enter your registered email address and submit.
3. Check your email for the 6-digit secure verification code.
4. Enter the code and set your new strong password.
5. If already logged in, you can update your credentials under [Profile & Settings](/profile).`;
  }

  // 9. Contact Support / Help
  if (/(contact|support|phone|helpline|email support|reach out)/i.test(clean)) {
    return `### 📞 Contact & Support
For any operational questions, delivery disputes, or verification support:
- **Official Support Email:** [${navigationKnowledge.platform?.supportEmail || '2026.food.rescue@gmail.com'}](mailto:${navigationKnowledge.platform?.supportEmail || '2026.food.rescue@gmail.com'})
- **Contact Page:** Visit our dedicated [Contact Support](/contact) page for response times and email assistance.
- **Support Hours:** 24/7 incident monitoring and food recovery dispatch.`;
  }

  // 10. General navigation fallback based on navigation-knowledge.json
  const routes = navigationKnowledge.routes || [];
  for (const r of routes) {
    const routeKeywords = r.path.replace('/', '').split('-');
    const matchesRoute = routeKeywords.some(kw => kw.length > 2 && clean.includes(kw));
    if (matchesRoute) {
      return `You can access **${r.title}** directly at [${r.title}](${r.path}).
- **Description:** ${r.description}
- **Accessible By:** ${r.roles.join(', ')}`;
    }
  }

  // Default helpful response
  return `I can help you navigate FoodRescue, learn how to post or claim donations, track delivery missions, or download tax receipts. 

What would you like assistance with?
- [Available Donations](/donations/available)
- [Post Surplus Food](/donations/create)
- [Impact & Receipts](/impact)
- [Profile & Account](/profile)
- [Contact Support](/contact)`;
}

/**
 * Call Gemini API with strict system prompt and user context.
 */
async function callGemini(message, user, conversationHistory = []) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  try {
    const roleContext = user ? `Verified User: ID=${user.id}, Role=${user.role}, Name=${user.full_name}` : 'Unauthenticated Visitor (Role=guest)';
    
    const formattedHistory = conversationHistory.slice(-10).map(msg => ({
      role: msg.sender === 'user' ? 'user' : 'model',
      parts: [{ text: msg.text }]
    }));

    const contents = [
      ...formattedHistory,
      {
        role: 'user',
        parts: [{
          text: `[Context: ${roleContext}]\n\nUser Question: ${message}`
        }]
      }
    ];

    const payload = {
      contents,
      systemInstruction: {
        parts: [{
          text: `${systemPromptText}\n\nSITE NAVIGATION KNOWLEDGE BASE (Source of truth):\n${JSON.stringify(navigationKnowledge)}`
        }]
      },
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 600
      }
    };

    // Use Gemini 2.0 Flash or 1.5 Flash endpoint
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      console.warn('⚠️ [CHAT] Gemini API returned error status:', response.status);
      return null;
    }

    const data = await response.json();
    const candidate = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    return candidate ? maskPII(candidate.trim()) : null;
  } catch (err) {
    console.warn('⚠️ [CHAT] Gemini API call exception, falling back to local engine:', err.message);
    return null;
  }
}

/**
 * Log anonymized question and feedback
 */
function logInteraction({ userId, role, message, reply, feedback, isUnanswered }) {
  try {
    ensureLogDir();
    const entry = {
      timestamp: new Date().toISOString(),
      userId: userId || 'anonymous',
      role: role || 'guest',
      message: maskPII(message),
      reply: maskPII(reply),
      feedback: feedback || null,
      isUnanswered: Boolean(isUnanswered)
    };

    chatLogsBuffer.push(entry);
    if (chatLogsBuffer.length > 500) chatLogsBuffer.shift();

    fs.appendFileSync(logFilePath, JSON.stringify(entry) + '\n', 'utf8');
  } catch (err) {
    console.warn('⚠️ [CHAT] Failed to append chat audit log:', err.message);
  }
}

/**
 * Main processMessage entry point
 */
async function processMessage({ message, user, conversationHistory = [] }) {
  if (!message || typeof message !== 'string') {
    return {
      success: false,
      reply: "Please send a valid text message."
    };
  }

  const trimmed = message.trim();
  if (trimmed.length > 1000) {
    return {
      success: false,
      reply: "Message exceeds maximum allowed length of 1000 characters. Please shorten your question."
    };
  }

  // 1. Check for prompt injection / PII harvesting / Role spoofing in message text
  const securityCheck = isPrivacyOrInjectionAttack(trimmed, user);
  if (securityCheck.isAttack) {
    const refusalText = "I can't share other users' personal information to protect their privacy.";
    logInteraction({ userId: user?.id, role: user?.role, message: trimmed, reply: refusalText });
    return {
      success: true,
      reply: refusalText
    };
  }

  // 2. Donation Lookup Check
  const isDonationLookup = /(donation\s+id|transaction\s+id|don-\d+|last\s+donation|my\s+donation|status\s+of\s+my)/i.test(trimmed);
  if (isDonationLookup) {
    const lookupResult = await lookupDonationFromDB(trimmed, user);
    if (lookupResult.handled) {
      logInteraction({ userId: user?.id, role: user?.role, message: trimmed, reply: lookupResult.text });
      return {
        success: true,
        reply: lookupResult.text
      };
    }
  }

  // 3. Try Gemini LLM if key is present
  if (process.env.GEMINI_API_KEY) {
    const geminiReply = await callGemini(trimmed, user, conversationHistory);
    if (geminiReply) {
      logInteraction({ userId: user?.id, role: user?.role, message: trimmed, reply: geminiReply });
      return {
        success: true,
        reply: geminiReply
      };
    }
  }

  // 4. Deterministic Rule & Knowledge Base Fallback
  const deterministicReply = generateDeterministicReply(trimmed, user);
  logInteraction({ userId: user?.id, role: user?.role, message: trimmed, reply: deterministicReply });
  return {
    success: true,
    reply: deterministicReply
  };
}

/**
 * Record user feedback (thumbs up / thumbs down)
 */
function recordFeedback({ userId, messageId, feedback, comment }) {
  logInteraction({
    userId: userId || 'anonymous',
    message: `[FEEDBACK ${feedback.toUpperCase()}] messageId=${messageId}`,
    reply: comment ? maskPII(comment) : '',
    feedback
  });
  return { success: true, message: 'Feedback recorded securely. Thank you!' };
}

module.exports = {
  processMessage,
  recordFeedback,
  maskPII,
  isPermissiveOnTopic,
  isPrivacyOrInjectionAttack,
  lookupDonationFromDB,
  generateDeterministicReply
};
