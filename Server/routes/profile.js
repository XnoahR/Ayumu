// Profile & Leaderboard Routes

const express = require('express');
const router = express.Router();

function enc(value) {
  return encodeURIComponent(String(value));
}

/**
 * GET /api/profile
 * Get user profile, stats, and achievements
 */
router.get('/profile', async (req, res, next) => {
  try {
    const { supabaseRequest } = req.app.locals;
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ message: 'User not resolved' });
    }

    // Get user info
    const [user] = await supabaseRequest(
      'users',
      `select=id,username,display_name,avatar_url,is_anonymous,discord_id,created_at,last_active_at&id=eq.${enc(userId)}&limit=1`
    );

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Get stats
    const [stats] = await supabaseRequest(
      'user_stats',
      `select=*&user_id=eq.${enc(userId)}&limit=1`
    );

    // Get achievements
    const userAchievements = await supabaseRequest(
      'user_achievements',
      `select=*,achievements!inner(id,code,name,description,icon_url,category,points,is_secret,created_at)&user_id=eq.${enc(userId)}&order=unlocked_at.desc&limit=100`
    );

    // Get recent results
    const recentResults = await supabaseRequest(
      'user_results',
      `select=id,level,score,total_questions,percentage,time_spent_seconds,completed_at&user_id=eq.${enc(userId)}&order=completed_at.desc&limit=5`
    );

    // Calculate rank
    const rank = calculateRank(stats?.total_xp || 0);

    res.json({
      user: {
        id: user.id,
        username: user.username,
        display_name: user.display_name,
        avatar_url: user.avatar_url,
        is_anonymous: user.is_anonymous,
        created_at: user.created_at,
      },
      stats: stats || {
        total_exams: 0,
        total_questions_answered: 0,
        total_correct: 0,
        current_streak: 0,
        longest_streak: 0,
        avg_score: 0,
        best_score: 0,
        best_level: null,
        total_xp: 0,
      },
      rank,
      achievements: userAchievements.map((ua) => ({
        code: ua.achievements.code,
        name: ua.achievements.name,
        description: ua.achievements.description,
        icon_url: ua.achievements.icon_url,
        category: ua.achievements.category,
        points: ua.achievements.points,
        unlocked_at: ua.unlocked_at,
      })),
      recent_results: recentResults,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/leaderboard
 * Get leaderboard data
 */
router.get('/leaderboard', async (req, res, next) => {
  try {
    const { supabaseRequest } = req.app.locals;
    const { level, period = 'alltime', limit = 10 } = req.query;

    // Build query based on period
    let dateFilter = '';
    if (period === 'weekly') {
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      dateFilter = `completed_at=gte.${weekAgo}`;
    } else if (period === 'monthly') {
      const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      dateFilter = `completed_at=gte.${monthAgo}`;
    }

    let query = [
      'select=user_id,level,score,total_questions,percentage,completed_at',
    ];

    if (level) {
      query.push(`level=eq.${enc(level)}`);
    }

    if (dateFilter) {
      query.push(dateFilter);
    }

    query.push('order=score.desc');
    query.push(`limit=${parseInt(limit)}`);

    const results = await supabaseRequest('user_results', query.join('&'));

    // Get user details for each result
    const userIds = [...new Set(results.map((r) => r.user_id))];
    const users = await supabaseRequest(
      'users',
      `select=id,username,display_name,avatar_url&id=${inFilter(userIds)}&limit=100`
    );

    const userMap = new Map(users.map((u) => [u.id, u]));

    // Aggregate by user
    const userScores = {};
    for (const result of results) {
      if (!userScores[result.user_id]) {
        userScores[result.user_id] = {
          user_id: result.user_id,
          total_score: 0,
          total_exams: 0,
          best_score: 0,
        };
      }
      userScores[result.user_id].total_score += result.score;
      userScores[result.user_id].total_exams += 1;
      userScores[result.user_id].best_score = Math.max(
        userScores[result.user_id].best_score,
        result.score
      );
    }

    // Convert to array and sort
    const leaderboard = Object.values(userScores)
      .map((entry) => {
        const user = userMap.get(entry.user_id);
        return {
          user_id: entry.user_id,
          username: user?.display_name || user?.username || 'Unknown',
          avatar_url: user?.avatar_url,
          total_score: entry.total_score,
          total_exams: entry.total_exams,
          best_score: entry.best_score,
        };
      })
      .sort((a, b) => b.total_score - a.total_score)
      .slice(0, parseInt(limit));

    // Add rank
    leaderboard.forEach((entry, index) => {
      entry.rank = index + 1;
    });

    res.json({
      period,
      level: level || 'all',
      entries: leaderboard,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/leaderboard/:userId
 * Get user's rank position
 */
router.get('/leaderboard/:userId/rank', async (req, res, next) => {
  try {
    const { supabaseRequest } = req.app.locals;
    const { userId } = req.params;

    // Get all scores
    const results = await supabaseRequest(
      'user_results',
      `select=user_id,score&order=score.desc&limit=10000`
    );

    // Aggregate
    const userScores = {};
    for (const result of results) {
      if (!userScores[result.user_id]) {
        userScores[result.user_id] = { user_id: result.user_id, total_score: 0 };
      }
      userScores[result.user_id].total_score += result.score;
    }

    const sorted = Object.values(userScores).sort((a, b) => b.total_score - a.total_score);
    const userRank = sorted.findIndex((u) => u.user_id === userId);

    if (userRank === -1) {
      return res.json({ rank: null, total_users: sorted.length });
    }

    res.json({
      rank: userRank + 1,
      total_users: sorted.length,
      total_score: sorted[userRank].total_score,
    });
  } catch (error) {
    next(error);
  }
});

// ═══════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════

function calculateRank(xp) {
  if (xp >= 10000) return { name: 'Sensei', icon: '👑', next_xp: null };
  if (xp >= 5000) return { name: 'Master', icon: '⭐', next_xp: 10000 };
  if (xp >= 1500) return { name: 'Scholar', icon: '🎓', next_xp: 5000 };
  if (xp >= 500) return { name: 'Apprentice', icon: '📚', next_xp: 1500 };
  return { name: 'Beginner', icon: '🌱', next_xp: 500 };
}

function inFilter(values) {
  return `in.(${values.map((v) => `"${String(v).replace(/"/g, '\\"')}"`).join(',')})`;
}

module.exports = router;
