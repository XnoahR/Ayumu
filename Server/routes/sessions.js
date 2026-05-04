// Session Routes - Exam session management

const express = require('express');
const crypto = require('crypto');
const { generateSessionCode, ANON_COOKIE } = require('../middleware/auth');

const router = express.Router();

// Helper to encode filter values
function enc(value) {
  return encodeURIComponent(String(value));
}

function inFilter(values) {
  return `in.(${values.map((v) => `"${String(v).replace(/"/g, '\\"')}"`).join(',')})`;
}

/**
 * POST /api/sessions
 * Create a new exam session
 */
router.post('/', async (req, res, next) => {
  try {
    const { supabaseRequest } = req.app.locals;
    const userId = req.userId;
    const { level = 'N5', template_id = 'balanced_75' } = req.body;

    if (!userId) {
      return res.status(401).json({ message: 'User not resolved' });
    }

    // Get template
    const [template] = await supabaseRequest(
      'quiz_package_templates',
      `select=id,name,total_questions,section_counts&id=eq.${enc(template_id)}&limit=1`
    );

    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }

    // Generate seed
    const seed = `${userId}:${level}:${template_id}:${Date.now()}`;
    const sessionCode = generateSessionCode();

    // Load candidate units for each section
    const selectedUnits = [];
    const allQuestionIds = [];

    for (const [section, targetCount] of Object.entries(template.section_counts)) {
      // Get questions for this level + section
      const questions = await supabaseRequest(
        'quiz_questions',
        [
          'select=id,exercise_id,passage_id,question_number,source_group_type,source_group_key,quiz_exercises!inner(level,section)',
          `quiz_exercises.level=eq.${enc(level)}`,
          `quiz_exercises.section=eq.${enc(section)}`,
          'order=exercise_id.asc,question_number.asc',
          'limit=3000',
        ].join('&')
      );

      // Build units
      const units = new Map();
      for (const q of questions) {
        let key = `${section}:question:${q.id}`;
        if (q.source_group_key) key = `${section}:${q.source_group_key}`;
        else if (q.passage_id) key = `${section}:passage:${q.passage_id}`;

        if (!units.has(key)) {
          units.set(key, {
            section,
            unitKey: key,
            sourceGroupKey: q.source_group_key,
            questions: [],
          });
        }
        units.get(key).questions.push(q);
      }

      // Shuffle units
      const shuffledUnits = [...units.values()]
        .map((u) => ({
          ...u,
          questions: u.questions.sort((a, b) => a.question_number - b.question_number),
        }))
        .sort(() => Math.random() - 0.5);

      // Pick units to reach target count
      let pickedUnits = [];
      let currentCount = 0;

      // Try exact count with simple greedy
      for (const unit of shuffledUnits) {
        if (currentCount + unit.questions.length <= targetCount) {
          pickedUnits.push(unit);
          currentCount += unit.questions.length;
        }
        if (currentCount === targetCount) break;
      }

      // If exact count not reached, try any combination
      if (currentCount !== targetCount) {
        // Reset and use all questions from fewer units
        pickedUnits = [];
        currentCount = 0;
        for (const unit of shuffledUnits) {
          if (currentCount < targetCount) {
            pickedUnits.push(unit);
            currentCount += unit.questions.length;
          }
        }
      }

      selectedUnits.push(...pickedUnits);
      for (const unit of pickedUnits) {
        for (const q of unit.questions) {
          allQuestionIds.push(q.id);
        }
      }
    }

    // Generate option orders for each question
    const optionOrders = allQuestionIds.map(() => {
      const order = [1, 2, 3, 4];
      for (let i = order.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [order[i], order[j]] = [order[j], order[i]];
      }
      return order;
    });

    // Create session record
    const [session] = await supabaseRequest('user_sessions', '', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      prefer: 'return=representation',
      body: JSON.stringify({
        session_code: sessionCode,
        user_id: userId,
        level,
        question_ids: allQuestionIds,
        option_orders: optionOrders,
        user_answers: {},
        status: 'active',
        metadata: {
          source: req.headers['x-discord-user-id'] ? 'discord' : 'web',
          user_agent: req.headers['user-agent'],
        },
      }),
    });

    res.status(201).json({
      session_code: sessionCode,
      url: `${(process.env.CLIENT_URL || 'http://localhost:3000').split(',')[0].trim()}/exam/${sessionCode}`,
      question_count: allQuestionIds.length,
      expires_at: session.expires_at,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/sessions/:code
 * Get session data (questions + current progress)
 */
router.get('/:code', async (req, res, next) => {
  try {
    const { supabaseRequest } = req.app.locals;
    const { code } = req.params;

    // Get session
    const [session] = await supabaseRequest(
      'user_sessions',
      `select=id,user_id,package_id,level,question_ids,option_orders,user_answers,status,started_at,expires_at,score,time_spent_seconds&session_code=eq.${enc(code)}&limit=1`
    );

    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    // Check if expired
    const now = new Date();
    const expiresAt = new Date(session.expires_at);
    if (expiresAt < now && session.status === 'active') {
      await supabaseRequest(
        'user_sessions',
        `status=eq.active&session_code=eq.${enc(code)}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'expired' }),
        }
      );
      session.status = 'expired';
    }

    // Load questions (reusing existing loadQuizByQuestionIds logic)
    const { loadQuizByQuestionIds } = req.app.locals;
    const quiz = await loadQuizByQuestionIds(session.question_ids);

    // Apply option orders to questions and map sections
    const questionsWithShuffledOptions = quiz.questions.map((q, idx) => {
      const order = session.option_orders[idx] || [1, 2, 3, 4];
      const shuffledOptions = order.map((optIdx) => q.options[optIdx - 1]).filter(Boolean);
      const exercise = quiz.exerciseMap.get(q.exerciseId);
      return {
        ...q,
        options: shuffledOptions,
        originalOptionOrder: order,
        section: exercise?.section || 'unknown',
        exerciseTitle: exercise?.title || '',
      };
    });

    res.json({
      session: {
        code,
        level: session.level,
        status: session.status,
        user_answers: session.user_answers,
        started_at: session.started_at,
        expires_at: session.expires_at,
        score: session.score,
        time_spent_seconds: session.time_spent_seconds,
      },
      questions: questionsWithShuffledOptions,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/sessions/:code/answer
 * Save an answer
 */
router.post('/:code/answer', async (req, res, next) => {
  try {
    const { supabaseRequest } = req.app.locals;
    const { code } = req.params;
    const { question_index, selected_option } = req.body;

    const [session] = await supabaseRequest(
      'user_sessions',
      `select=id,user_answers,status,expires_at&session_code=eq.${enc(code)}&limit=1`
    );

    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    if (session.status !== 'active') {
      return res.status(400).json({ message: `Session is ${session.status}` });
    }

    const answers = { ...session.user_answers };
    answers[String(question_index)] = selected_option;

    await supabaseRequest(
      'user_sessions',
      `session_code=eq.${enc(code)}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_answers: answers }),
      }
    );

    res.json({ success: true, question_index, selected_option });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/sessions/:code/submit
 * Finalize exam and calculate score
 */
router.post('/:code/submit', async (req, res, next) => {
  try {
    const { supabaseRequest } = req.app.locals;
    const { code } = req.params;

    const [session] = await supabaseRequest(
      'user_sessions',
      `select=id,user_id,level,question_ids,option_orders,user_answers,status,started_at&session_code=eq.${enc(code)}&limit=1`
    );

    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    if (session.status === 'completed') {
      return res.status(400).json({ message: 'Session already completed' });
    }

    // Get correct answers
    const questions = await supabaseRequest(
      'quiz_questions',
      `select=id,answer_value,quiz_question_options!inner(option_value,is_correct)&id=${inFilter(session.question_ids)}&limit=1000`
    );

    let correct = 0;
    const sectionBreakdown = {};

    for (let i = 0; i < session.question_ids.length; i++) {
      const qId = session.question_ids[i];
      const question = questions.find((q) => q.id === qId);
      if (!question) continue;

      const userAnswer = session.user_answers[String(i)];
      const correctOption = question.quiz_question_options.find((o) => o.is_correct);
      const isCorrect = correctOption
        ? String(userAnswer) === String(correctOption.option_value)
        : String(userAnswer) === String(question.answer_value);

      if (isCorrect) correct++;

      // Track by section (we need exercise info)
      // For now, simplified breakdown
    }

    const total = session.question_ids.length;
    const percentage = Math.round((correct / total) * 100);
    const timeSpent = Math.floor(
      (Date.now() - new Date(session.started_at).getTime()) / 1000
    );

    // Update session
    await supabaseRequest(
      'user_sessions',
      `session_code=eq.${enc(code)}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'completed',
          score: correct,
          time_spent_seconds: timeSpent,
        }),
      }
    );

    // Create result record
    const [result] = await supabaseRequest('user_results', '', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      prefer: 'return=representation',
      body: JSON.stringify({
        user_id: session.user_id,
        session_id: session.id,
        level: session.level,
        score: correct,
        total_questions: total,
        percentage,
        section_breakdown: {},
        time_spent_seconds: timeSpent,
      }),
    });

    // Update streak
    await updateStreak(supabaseRequest, session.user_id, correct, total);

    // Check achievements
    const newAchievements = await checkAchievements(
      supabaseRequest,
      session.user_id,
      correct,
      total,
      percentage,
      session.level,
      timeSpent
    );

    res.json({
      score: correct,
      total,
      percentage,
      time_spent_seconds: timeSpent,
      new_achievements: newAchievements,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/sessions/claim
 * Transfer anonymous sessions/results to authenticated user (Discord or JWT)
 * Reads anonymous user ID from ayumu_tanin_id cookie — no body required
 */
router.post('/claim', async (req, res, next) => {
  try {
    const { supabaseRequest } = req.app.locals;
    const targetUserId = req.userId;

    if (!targetUserId) {
      return res.status(400).json({ message: 'Authentication required' });
    }

    // Verify target is not anonymous itself
    const [targetUser] = await supabaseRequest(
      'users',
      `select=is_anonymous&id=eq.${enc(targetUserId)}&limit=1`
    );
    if (!targetUser || targetUser.is_anonymous) {
      return res.status(400).json({ message: 'Must be signed in to claim progress' });
    }

    // Get anonymous user UUID from cookie
    const anonymousUserId = req.cookies[ANON_COOKIE];
    if (!anonymousUserId) {
      return res.status(400).json({ message: 'No anonymous progress found to claim' });
    }

    // Verify anonymous user exists
    const [anonUser] = await supabaseRequest(
      'users',
      `select=id,is_anonymous&id=eq.${enc(anonymousUserId)}&limit=1`
    );
    if (!anonUser || !anonUser.is_anonymous) {
      return res.status(400).json({ message: 'No anonymous progress found' });
    }

    // Transfer sessions
    await supabaseRequest(
      'user_sessions',
      `user_id=eq.${enc(anonymousUserId)}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: targetUserId }),
      }
    );

    // Transfer results
    await supabaseRequest(
      'user_results',
      `user_id=eq.${enc(anonymousUserId)}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: targetUserId }),
      }
    );

    // Transfer achievements
    await supabaseRequest(
      'user_achievements',
      `user_id=eq.${enc(anonymousUserId)}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: targetUserId }),
      }
    );

    // Transfer stats
    await supabaseRequest(
      'user_stats',
      `user_id=eq.${enc(anonymousUserId)}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: targetUserId }),
      }
    );

    // Delete anonymous user
    await supabaseRequest(
      'users',
      `id=eq.${enc(anonymousUserId)}`,
      { method: 'DELETE' }
    );

    // Clear the anonymous cookie
    res.clearCookie(ANON_COOKIE, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    });

    res.json({ success: true, message: 'Progress claimed successfully' });
  } catch (error) {
    next(error);
  }
});

// ═══════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════

async function updateStreak(supabaseRequest, userId, score, total) {
  const today = new Date().toISOString().split('T')[0];
  const isPerfect = score === total;

  // Check if streak entry exists for today
  const [existing] = await supabaseRequest(
    'user_streaks',
    `select=id,exam_count,total_score&user_id=eq.${enc(userId)}&date=eq.${today}&limit=1`
  );

  if (existing) {
    await supabaseRequest(
      'user_streaks',
      `id=eq.${enc(existing.id)}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          exam_count: existing.exam_count + 1,
          total_score: existing.total_score + score,
          is_perfect: existing.is_perfect || isPerfect,
        }),
      }
    );
  } else {
    await supabaseRequest('user_streaks', '', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: userId,
        date: today,
        exam_count: 1,
        total_score: score,
        is_perfect: isPerfect,
      }),
    });
  }
}

async function checkAchievements(supabaseRequest, userId, score, total, percentage, level, timeSpent) {
  const newAchievements = [];

  // Get all achievements
  const achievements = await supabaseRequest('achievements', 'select=*&limit=100');

  // Get user's current achievements
  const userAchievements = await supabaseRequest(
    'user_achievements',
    `select=achievement_id&user_id=eq.${enc(userId)}&limit=100`
  );
  const unlockedCodes = new Set(userAchievements.map((ua) => ua.achievement_id));

  // Get user's total exams
  const [stats] = await supabaseRequest(
    'user_results',
    `select=count&user_id=eq.${enc(userId)}`
  );
  const totalExams = parseInt(stats?.count || 0) + 1;

  for (const ach of achievements) {
    if (unlockedCodes.has(ach.id)) continue;

    let unlocked = false;

    switch (ach.code) {
      case 'FIRST_EXAM':
        unlocked = totalExams >= 1;
        break;
      case 'EXAM_10':
        unlocked = totalExams >= 10;
        break;
      case 'EXAM_50':
        unlocked = totalExams >= 50;
        break;
      case 'EXAM_100':
        unlocked = totalExams >= 100;
        break;
      case 'PERFECT_N5':
        unlocked = level === 'N5' && percentage === 100;
        break;
      case 'PERFECT_N4':
        unlocked = level === 'N4' && percentage === 100;
        break;
      case 'SPEED_DEMON':
        unlocked = level === 'N5' && timeSpent < 1800;
        break;
    }

    if (unlocked) {
      await supabaseRequest('user_achievements', '', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          achievement_id: ach.id,
        }),
      });
      newAchievements.push(ach);
    }
  }

  return newAchievements;
}

module.exports = router;
