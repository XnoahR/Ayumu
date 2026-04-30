const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const express = require('express');
const cors = require('cors');

loadEnvFile(path.join(__dirname, '.env'));

const app = express();
const PORT = process.env.PORT || 5000;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

app.use(cors());
app.use(express.json());

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;

  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex === -1) continue;

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim();
    if (!process.env[key]) {
      process.env[key] = value.replace(/^["']|["']$/g, '');
    }
  }
}

function requireSupabaseConfig() {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    const error = new Error('Supabase environment variables are not configured.');
    error.status = 500;
    throw error;
  }
}

function supabaseHeaders(extraHeaders = {}) {
  return {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    ...extraHeaders,
  };
}

async function supabaseRequest(table, query = '', options = {}) {
  requireSupabaseConfig();

  const url = new URL(`/rest/v1/${table}`, SUPABASE_URL);
  const queryString = query.startsWith('?') ? query.slice(1) : query;
  if (queryString) {
    url.search = queryString;
  }

  const response = await fetch(url, {
    ...options,
    headers: {
      ...supabaseHeaders(options.prefer ? { Prefer: options.prefer } : {}),
      ...(options.headers || {}),
    },
  });

  const text = await response.text();
  const body = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const error = new Error(body?.message || `Supabase request failed: ${response.status}`);
    error.status = response.status;
    error.details = body;
    throw error;
  }

  return body;
}

function encodeFilterValue(value) {
  return encodeURIComponent(String(value));
}

function inFilter(values) {
  return `in.(${values.map((value) => `"${String(value).replace(/"/g, '\\"')}"`).join(',')})`;
}

function assetUrl(asset) {
  if (asset.local_path) {
    return asset.local_path.startsWith('/') ? asset.local_path : `/${asset.local_path}`;
  }

  return asset.source_url;
}

function sanitizeAsset(asset) {
  return {
    id: asset.id,
    type: asset.asset_type,
    url: assetUrl(asset),
    sourceUrl: asset.source_url,
    localPath: asset.local_path,
    questionId: asset.question_id,
    passageId: asset.passage_id,
    exerciseId: asset.exercise_id,
  };
}

function sanitizeOption(option) {
  return {
    id: option.id,
    questionId: option.question_id,
    value: option.option_value,
    label: option.option_label,
    sortOrder: option.sort_order,
  };
}

function sanitizeQuestion(question, optionsByQuestion, assetsByQuestion, passagesById, assetsByPassage) {
  const passage = question.passage_id ? passagesById.get(question.passage_id) : null;

  return {
    id: question.id,
    exerciseId: question.exercise_id,
    passageId: question.passage_id,
    questionNumber: question.question_number,
    prompt: question.prompt,
    context: question.context,
    sourceGroupType: question.source_group_type,
    sourceGroupKey: question.source_group_key,
    options: optionsByQuestion.get(question.id) || [],
    assets: assetsByQuestion.get(question.id) || [],
    passage: passage
      ? {
          id: passage.id,
          passageNumber: passage.passage_number,
          title: passage.title,
          content: passage.content,
          assets: assetsByPassage.get(passage.id) || [],
        }
      : null,
  };
}

function groupBy(items, key) {
  const grouped = new Map();
  for (const item of items) {
    const value = item[key];
    if (!value) continue;
    if (!grouped.has(value)) grouped.set(value, []);
    grouped.get(value).push(item);
  }
  return grouped;
}

async function loadQuizByQuestionIds(questionIds) {
  if (!questionIds.length) {
    return { questions: [], exerciseMap: new Map() };
  }

  const filter = inFilter(questionIds);
  const questions = await supabaseRequest(
    'quiz_questions',
    `select=id,exercise_id,passage_id,question_number,prompt,context,source_group_type,source_group_key&order=question_number.asc&id=${filter}&limit=1000`
  );

  const orderedQuestions = questionIds
    .map((id) => questions.find((question) => question.id === id))
    .filter(Boolean);

  const exerciseIds = [...new Set(orderedQuestions.map((question) => question.exercise_id).filter(Boolean))];
  const passageIds = [...new Set(orderedQuestions.map((question) => question.passage_id).filter(Boolean))];

  const [options, assets, passages, exercises] = await Promise.all([
    supabaseRequest(
      'quiz_question_options',
      `select=id,question_id,option_value,option_label,sort_order&question_id=${filter}&order=sort_order.asc&limit=4000`
    ),
    supabaseRequest(
      'quiz_assets',
      `select=id,exercise_id,question_id,passage_id,asset_type,source_url,local_path&or=(question_id.${filter}${passageIds.length ? `,passage_id.${inFilter(passageIds)}` : ''}${exerciseIds.length ? `,exercise_id.${inFilter(exerciseIds)}` : ''})&limit=4000`
    ),
    passageIds.length
      ? supabaseRequest(
          'quiz_passages',
          `select=id,exercise_id,passage_number,title,content&id=${inFilter(passageIds)}&order=passage_number.asc&limit=1000`
        )
      : Promise.resolve([]),
    exerciseIds.length
      ? supabaseRequest(
          'quiz_exercises',
          `select=id,source,section,level,exercise_number,title,slug,source_url&id=${inFilter(exerciseIds)}&limit=1000`
        )
      : Promise.resolve([]),
  ]);

  const optionsByQuestion = groupBy(options.map(sanitizeOption), 'questionId');
  const sanitizedAssets = assets.map(sanitizeAsset);
  const assetsByQuestion = groupBy(sanitizedAssets, 'questionId');
  const assetsByPassage = groupBy(sanitizedAssets, 'passageId');
  const passagesById = new Map(passages.map((passage) => [passage.id, passage]));
  const exerciseMap = new Map(exercises.map((exercise) => [exercise.id, exercise]));

  return {
    questions: orderedQuestions.map((question) =>
      sanitizeQuestion(question, optionsByQuestion, assetsByQuestion, passagesById, assetsByPassage)
    ),
    exerciseMap,
  };
}

app.get('/api/health', (req, res) => {
  res.json({
    message: 'Server is running!',
    supabaseConfigured: Boolean(SUPABASE_URL && SUPABASE_KEY),
  });
});

app.get('/api', (req, res) => {
  res.json({
    message: 'Welcome to Ayumu API',
    version: '1.0.0',
  endpoints: [
      '/api/metadata',
      '/api/exercises',
      '/api/exercises/:id/quiz',
      '/api/questions/:id/answer',
      '/api/packages',
      'POST /api/packages',
      '/api/packages/:id/quiz',
    ],
  });
});

app.get('/api/metadata', async (req, res, next) => {
  try {
    const exercises = await supabaseRequest('quiz_exercises', 'select=section,level&limit=1000');
    const levels = [...new Set(exercises.map((exercise) => exercise.level))].sort();
    const sections = [...new Set(exercises.map((exercise) => exercise.section))].sort();

    const counts = exercises.reduce((acc, exercise) => {
      acc[exercise.level] ||= {};
      acc[exercise.level][exercise.section] = (acc[exercise.level][exercise.section] || 0) + 1;
      return acc;
    }, {});

    res.json({ levels, sections, counts });
  } catch (error) {
    next(error);
  }
});

app.get('/api/exercises', async (req, res, next) => {
  try {
    const { level = 'N5', section = 'grammar' } = req.query;
    const query = [
      'select=id,source,section,level,exercise_number,title,slug,source_url,published_at',
      `level=eq.${encodeFilterValue(level)}`,
      `section=eq.${encodeFilterValue(section)}`,
      'order=exercise_number.asc',
      'limit=100',
    ].join('&');

    const exercises = await supabaseRequest('quiz_exercises', query);
    res.json({ exercises });
  } catch (error) {
    next(error);
  }
});

app.get('/api/exercises/:id/quiz', async (req, res, next) => {
  try {
    const exerciseId = req.params.id;
    const [exercise] = await supabaseRequest(
      'quiz_exercises',
      `select=id,source,section,level,exercise_number,title,slug,source_url&id=eq.${encodeFilterValue(exerciseId)}&limit=1`
    );

    if (!exercise) {
      res.status(404).json({ message: 'Exercise not found' });
      return;
    }

    const questions = await supabaseRequest(
      'quiz_questions',
      `select=id&exercise_id=eq.${encodeFilterValue(exerciseId)}&order=question_number.asc&limit=300`
    );
    const questionIds = questions.map((question) => question.id);
    const quiz = await loadQuizByQuestionIds(questionIds);

    res.json({
      type: 'exercise',
      exercise,
      questions: quiz.questions,
    });
  } catch (error) {
    next(error);
  }
});

app.post('/api/questions/:id/answer', async (req, res, next) => {
  try {
    const { selectedOption } = req.body;
    if (!selectedOption) {
      res.status(400).json({ message: 'selectedOption is required' });
      return;
    }

    const questionId = req.params.id;
    const [question] = await supabaseRequest(
      'quiz_questions',
      `select=id,answer_value,answer_note&id=eq.${encodeFilterValue(questionId)}&limit=1`
    );

    if (!question) {
      res.status(404).json({ message: 'Question not found' });
      return;
    }

    const options = await supabaseRequest(
      'quiz_question_options',
      `select=option_value,option_label,is_correct&question_id=eq.${encodeFilterValue(questionId)}&order=sort_order.asc`
    );

    const correctOption =
      options.find((option) => option.is_correct) ||
      options.find((option) => option.option_value === question.answer_value);

    res.json({
      correct: String(selectedOption) === String(question.answer_value),
      selectedOption: String(selectedOption),
      correctOption: correctOption
        ? {
            value: correctOption.option_value,
            label: correctOption.option_label,
          }
        : {
            value: question.answer_value,
            label: question.answer_value,
          },
      answerNote: question.answer_note,
    });
  } catch (error) {
    next(error);
  }
});

app.get('/api/packages', async (req, res, next) => {
  try {
    const { level = 'N3', userKey = 'test' } = req.query;
    const packages = await supabaseRequest(
      'user_quiz_packages',
      [
        'select=id,user_key,level,template_id,package_number,title,question_count,unit_count,seed,created_at',
        `level=eq.${encodeFilterValue(level)}`,
        `user_key=eq.${encodeFilterValue(userKey)}`,
        'order=package_number.asc',
        'limit=50',
      ].join('&')
    );

    res.json({ packages });
  } catch (error) {
    next(error);
  }
});

function seededRandom(seed) {
  let state = crypto.createHash('sha256').update(seed).digest().readUInt32LE(0);

  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

function shuffleWithSeed(items, seed) {
  const random = seededRandom(seed);
  const copy = [...items];

  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }

  return copy;
}

function unitKeyForQuestion(section, question) {
  if (question.source_group_key) return `${section}:${question.source_group_key}`;
  if (question.passage_id) return `${section}:passage:${question.passage_id}`;
  return `${section}:question:${question.id}`;
}

function buildQuestionUnits(section, questions) {
  const units = new Map();

  for (const question of questions) {
    const key = unitKeyForQuestion(section, question);
    if (!units.has(key)) {
      units.set(key, {
        section,
        unitKey: key,
        sourceGroupKey: question.source_group_key,
        questions: [],
      });
    }

    units.get(key).questions.push(question);
  }

  return [...units.values()].map((unit) => ({
    ...unit,
    questions: unit.questions.sort((a, b) => a.question_number - b.question_number),
  }));
}

function pickExactQuestionCount(units, targetCount) {
  const dp = new Map([[0, []]]);

  for (const unit of units) {
    const size = unit.questions.length;
    const entries = [...dp.entries()];

    for (const [count, selectedUnits] of entries) {
      const nextCount = count + size;
      if (nextCount > targetCount || dp.has(nextCount)) continue;

      dp.set(nextCount, [...selectedUnits, unit]);
      if (nextCount === targetCount) {
        return dp.get(nextCount);
      }
    }
  }

  return dp.get(targetCount) || null;
}

async function loadCandidateUnits(level, section, seed) {
  const questions = await supabaseRequest(
    'quiz_questions',
    [
      'select=id,exercise_id,passage_id,question_number,source_group_type,source_group_key,quiz_exercises!inner(level,section)',
      `quiz_exercises.level=eq.${encodeFilterValue(level)}`,
      `quiz_exercises.section=eq.${encodeFilterValue(section)}`,
      'order=exercise_id.asc,question_number.asc',
      'limit=3000',
    ].join('&')
  );

  return shuffleWithSeed(buildQuestionUnits(section, questions), seed);
}

app.post('/api/packages', async (req, res, next) => {
  try {
    const { level = 'N3', userKey = 'test', templateId = 'balanced_75' } = req.body || {};
    const [template] = await supabaseRequest(
      'quiz_package_templates',
      `select=id,name,total_questions,section_counts&id=eq.${encodeFilterValue(templateId)}&limit=1`
    );

    if (!template) {
      res.status(404).json({ message: 'Package template not found' });
      return;
    }

    const latestPackages = await supabaseRequest(
      'user_quiz_packages',
      [
        'select=package_number',
        `user_key=eq.${encodeFilterValue(userKey)}`,
        `level=eq.${encodeFilterValue(level)}`,
        `template_id=eq.${encodeFilterValue(templateId)}`,
        'order=package_number.desc',
        'limit=1',
      ].join('&')
    );

    const packageNumber = (latestPackages[0]?.package_number || 0) + 1;
    const seed = `${userKey}:${level}:${templateId}:${packageNumber}`;
    const selectedUnits = [];

    for (const [section, targetCount] of Object.entries(template.section_counts)) {
      const units = await loadCandidateUnits(level, section, `${seed}:${section}`);
      const pickedUnits = pickExactQuestionCount(units, targetCount);

      if (!pickedUnits) {
        res.status(422).json({
          message: `Unable to build an exact ${targetCount} question section for ${section}`,
          section,
          targetCount,
        });
        return;
      }

      selectedUnits.push(...pickedUnits);
    }

    const packageId = crypto.randomUUID();
    const packagePayload = {
      id: packageId,
      user_key: userKey,
      level,
      template_id: template.id,
      package_number: packageNumber,
      title: `${level} ${template.name} Paket ${packageNumber}`,
      question_count: template.total_questions,
      unit_count: selectedUnits.length,
      seed,
    };

    const [createdPackage] = await supabaseRequest('user_quiz_packages', '', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      prefer: 'return=representation',
      body: JSON.stringify(packagePayload),
    });

    const items = [];
    let questionOrder = 1;

    selectedUnits.forEach((unit, unitIndex) => {
      unit.questions.forEach((question) => {
        items.push({
          id: crypto.randomUUID(),
          package_id: packageId,
          question_id: question.id,
          section: unit.section,
          source_group_key: unit.sourceGroupKey,
          unit_key: unit.unitKey,
          unit_order: unitIndex + 1,
          question_order: questionOrder,
        });
        questionOrder += 1;
      });
    });

    await supabaseRequest('user_quiz_package_items', '', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      prefer: 'return=minimal',
      body: JSON.stringify(items),
    });

    res.status(201).json({
      package: createdPackage,
      itemsCreated: items.length,
      rules: {
        atomicUnits: true,
        groupedBy: ['source_group_key', 'passage_id', 'question_id'],
      },
    });
  } catch (error) {
    next(error);
  }
});

app.get('/api/packages/:id/quiz', async (req, res, next) => {
  try {
    const packageId = req.params.id;
    const [quizPackage] = await supabaseRequest(
      'user_quiz_packages',
      `select=id,user_key,level,template_id,package_number,title,question_count,unit_count,seed&id=eq.${encodeFilterValue(packageId)}&limit=1`
    );

    if (!quizPackage) {
      res.status(404).json({ message: 'Package not found' });
      return;
    }

    const items = await supabaseRequest(
      'user_quiz_package_items',
      [
        'select=id,package_id,question_id,section,source_group_key,unit_key,unit_order,question_order',
        `package_id=eq.${encodeFilterValue(packageId)}`,
        'order=unit_order.asc,question_order.asc',
        'limit=300',
      ].join('&')
    );

    const questionIds = items.map((item) => item.question_id);
    const quiz = await loadQuizByQuestionIds(questionIds);
    const questionsById = new Map(quiz.questions.map((question) => [question.id, question]));

    const questions = items
      .map((item) => {
        const question = questionsById.get(item.question_id);
        return question
          ? {
              ...question,
              packageItem: {
                id: item.id,
                section: item.section,
                unitKey: item.unit_key,
                unitOrder: item.unit_order,
                questionOrder: item.question_order,
                sourceGroupKey: item.source_group_key,
              },
              exercise: quiz.exerciseMap.get(question.exerciseId) || null,
            }
          : null;
      })
      .filter(Boolean);

    res.json({
      type: 'package',
      package: quizPackage,
      questions,
    });
  } catch (error) {
    next(error);
  }
});

app.use((error, req, res, next) => {
  console.error(error);
  res.status(error.status || 500).json({
    message: error.message || 'Internal server error',
    details: error.details,
  });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
