// Netlify Function: /api/push/send
const { createClient } = require('@supabase/supabase-js');
const webpush = require('web-push');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

webpush.setVapidDetails(
  'mailto:admin@yourdomain.com',
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
);

exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }
  try {
    const body = JSON.parse(event.body || '{}');
    const { userId, title, message, url } = body;
    // Récupère tous les abonnements de l'utilisateur (ou tous si admin)
    let query = supabase.from('push_subscriptions').select('*');
    if (userId) query = query.eq('user_id', userId);
    const { data: subs, error } = await query;
    if (error) return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
    let sent = 0, failed = 0;
    for (const sub of subs) {
      try {
        await webpush.sendNotification({
          endpoint: sub.endpoint,
          keys: sub.keys
        }, JSON.stringify({
          title: title || 'Notification',
          body: message || '',
          url: url || '/',
        }));
        sent++;
      } catch (e) {
        failed++;
      }
    }
    return { statusCode: 200, body: JSON.stringify({ sent, failed }) };
  } catch (e) {
    return { statusCode: 400, body: JSON.stringify({ error: e.message }) };
  }
};
