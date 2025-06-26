// Netlify Function: /api/push/subscribe
const { createClient } = require('@supabase/supabase-js');
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }
  try {
    const body = JSON.parse(event.body || '{}');
    const { subscription, userAgent, userId } = body;
    if (!subscription || !subscription.endpoint) {
      return { statusCode: 400, body: 'Missing subscription' };
    }
    // Upsert abonnement (1 par endpoint)
    const { data, error } = await supabase
      .from('push_subscriptions')
      .upsert({
        user_id: userId || null,
        endpoint: subscription.endpoint,
        keys: subscription.keys,
        user_agent: userAgent || null,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'endpoint' });
    if (error) {
      return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
    }
    return { statusCode: 200, body: JSON.stringify({ success: true }) };
  } catch (e) {
    return { statusCode: 400, body: JSON.stringify({ error: e.message }) };
  }
};
