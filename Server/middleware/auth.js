// Authentication & User Resolution Middleware
// Handles Discord bot users and anonymous web users

const { nanoid } = require('nanoid');
const { jwtVerify, createRemoteJWKSet } = require('jose');

const SUPABASE_URL = process.env.SUPABASE_URL;
const JWKS = SUPABASE_URL
  ? createRemoteJWKSet(new URL(`${SUPABASE_URL}/auth/v1/.well-known/jwks.json`))
  : null;

// Generate a short session code: aym_xxxxxx
function generateSessionCode() {
  return 'aym_' + nanoid(8).toLowerCase().replace(/[_-]/g, 'x');
}

// Generate anonymous user ID cookie name
const ANON_COOKIE = 'ayumu_tanin_id';

function enc(value) {
  return encodeURIComponent(String(value));
}

/**
 * Resolve user from request
 * Priority:
 * 1. X-Discord-User-Id header (from bot)
 * 2. Authorization: Bearer <jwt> (Supabase Auth, web OAuth)
 * 3. Anonymous cookie (from web without login)
 * 
 * Attaches req.userId (UUID from our users table)
 */
async function resolveUser(req, res, next) {
  try {
    const { supabaseRequest } = req.app.locals;
    let userId = null;

    // 1. Check Discord header (bot)
    const discordId = req.headers['x-discord-user-id'];
    if (discordId) {
      const [user] = await supabaseRequest(
        'users',
        `select=id&discord_id=eq.${enc(discordId)}&limit=1`
      );

      if (user) {
        userId = user.id;
      } else {
        // Auto-create Discord user
        const [newUser] = await supabaseRequest('users', '', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          prefer: 'return=representation',
          body: JSON.stringify({
            discord_id: discordId,
            username: `discord_${discordId}`,
            is_anonymous: false,
          }),
        });
        userId = newUser.id;
      }
    }

    // 2. Check Supabase Auth JWT (web OAuth)
    const authHeader = req.headers['authorization'];
    if (!userId && JWKS && authHeader?.startsWith('Bearer ')) {
      try {
        const token = authHeader.slice(7);
        const { payload } = await jwtVerify(token, JWKS);

        if (payload.sub) {
          const [user] = await supabaseRequest(
            'users',
            `select=id&auth_id=eq.${enc(payload.sub)}&limit=1`
          );
          if (user) {
            userId = user.id;
          }
        }
      } catch (err) {
        console.warn('JWT verification failed:', err.message);
        // Fall through to anonymous cookie
      }
    }

    // 3. Check anonymous cookie
    if (!userId) {
      let anonId = req.cookies[ANON_COOKIE];
      
      if (!anonId) {
        // Create new anonymous user
        const [newUser] = await supabaseRequest('users', '', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          prefer: 'return=representation',
          body: JSON.stringify({
            is_anonymous: true,
          }),
        });
        anonId = newUser.id;
        
        // Set cookie (7 days)
        res.cookie(ANON_COOKIE, anonId, {
          maxAge: 7 * 24 * 60 * 60 * 1000,
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
        });
      }

      // Verify anonymous user exists
      const [user] = await supabaseRequest(
        'users',
        `select=id&id=eq.${encodeURIComponent(anonId)}&limit=1`
      );

      if (user) {
        userId = user.id;
      } else {
        // Cookie invalid, create new
        const [newUser] = await supabaseRequest('users', '', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          prefer: 'return=representation',
          body: JSON.stringify({
            is_anonymous: true,
          }),
        });
        userId = newUser.id;
        res.cookie(ANON_COOKIE, userId, {
          maxAge: 7 * 24 * 60 * 60 * 1000,
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
        });
      }
    }

    req.userId = userId;
    next();
  } catch (error) {
    console.error('User resolution error:', error);
    res.status(500).json({ message: 'Failed to resolve user' });
  }
}

/**
 * Require authenticated user (not anonymous)
 */
function requireAuth(req, res, next) {
  if (!req.userId) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  next();
}

module.exports = {
  resolveUser,
  requireAuth,
  generateSessionCode,
  ANON_COOKIE,
};
