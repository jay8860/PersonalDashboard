const { GoogleGenerativeAI } = require('@google/generative-ai');
const { GoogleAIFileManager } = require('@google/generative-ai/server');
const fs = require('fs');

const MODEL_NAME = process.env.GEMINI_MODEL || 'gemini-2.0-flash';

const getApiKey = () => (
  process.env.GEMINI_API_KEY
  || process.env.GOOGLE_API_KEY
  || process.env.GOOGLE_GENERATIVE_AI_API_KEY
  || ''
).trim();

const requireClient = () => {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('Google AI API key is missing. Set GEMINI_API_KEY or GOOGLE_API_KEY on the server.');
  }

  return {
    model: new GoogleGenerativeAI(apiKey).getGenerativeModel({ model: MODEL_NAME }),
    fileManager: new GoogleAIFileManager(apiKey),
  };
};

const extractJson = (text) => {
  const jsonMatch = String(text || '').match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Failed to parse AI response as JSON');
  }
  return JSON.parse(jsonMatch[0]);
};

const mealSlotDefinitions = [
  { id: 'breakfast', label: 'Breakfast' },
  { id: 'snack1', label: 'Snack 1' },
  { id: 'lunch', label: 'Lunch' },
  { id: 'snack2', label: 'Snack 2' },
  { id: 'dinner', label: 'Dinner' },
];

const normalizeStringList = (values) => (
  Array.isArray(values)
    ? [...new Set(values.map((value) => String(value || '').trim()).filter(Boolean))]
    : []
);

const normalizeMealsResponse = (payload, options = {}) => {
  const days = Number(options.days) || 30;

  return {
    aiGuidance: normalizeStringList(payload?.aiGuidance),
    generatedPlans: (Array.isArray(payload?.generatedPlans) ? payload.generatedPlans : []).slice(0, days).map((plan, dayIndex) => ({
      id: String(plan?.id || `ai-plan-${dayIndex + 1}`),
      date: String(plan?.date || ''),
      createdAt: new Date().toISOString(),
      meals: Object.fromEntries(
        mealSlotDefinitions.map((slot) => {
          const meal = plan?.meals?.[slot.id] || {};
          return [
            slot.id,
            {
              items: normalizeStringList(meal?.items),
              note: String(meal?.note || '').trim(),
              portion: String(meal?.portion || '').trim(),
              prepNote: String(meal?.prepNote || '').trim(),
              completed: false,
            },
          ];
        }),
      ),
    })).filter((plan) => plan.date),
  };
};

async function analyzeReport(filePath, mimeType) {
  const { model, fileManager } = requireClient();
  const stats = fs.statSync(filePath);
  const fileSizeMB = stats.size / (1024 * 1024);

  let filePart;

  if (mimeType === 'text/plain' || filePath.toLowerCase().endsWith('.txt')) {
    filePart = { text: fs.readFileSync(filePath, 'utf-8') };
  } else if (fileSizeMB > 15) {
    const uploadResponse = await fileManager.uploadFile(filePath, {
      mimeType,
      displayName: 'Medical Report',
    });

    filePart = {
      fileData: {
        fileUri: uploadResponse.file.uri,
        mimeType: uploadResponse.file.mimeType,
      },
    };
  } else {
    const fileData = fs.readFileSync(filePath);
    filePart = {
      inlineData: {
        data: fileData.toString('base64'),
        mimeType,
      },
    };
  }

  const prompt = `
    Analyze this medical report/prescription provided.
    1. Extract key health vitals and lab results.
    2. Identify values outside the normal range.
    3. Summarize overall health status.
    4. Suggest next steps to discuss with a doctor.
    5. Highlight positive signals.

    Return valid JSON only in this shape:
    {
      "vitals": [{"name": "...", "value": "...", "unit": "...", "status": "normal/high/low"}],
      "summary": "...",
      "highlights": [{"title": "...", "desc": "...", "color": "rose/emerald/indigo"}],
      "concerns": ["..."],
      "positives": ["..."],
      "nextSteps": ["..."]
    }
  `;

  const result = await model.generateContent([prompt, filePart]);
  const response = await result.response;
  return extractJson(response.text());
}

async function generateMealPlanWithAI({ meals, profile, fitness, options = {} }) {
  const { model } = requireClient();
  const requestedDays = [7, 14, 30].includes(Number(options.days)) ? Number(options.days) : 30;
  const startDate = String(options.startDate || new Date().toISOString().slice(0, 10));

  const prompt = `
You are designing a vegetarian-with-eggs meal plan for a personal dashboard.

User context:
${JSON.stringify({
    profile: {
      preferredName: profile?.preferredName || profile?.fullName || '',
      occupation: profile?.occupation || '',
      city: profile?.city || '',
      country: profile?.country || '',
      goals: profile?.goals || '',
      heightCm: profile?.heightCm || '',
    },
    fitness: {
      goals: fitness?.goals || {},
      latestEntry: Array.isArray(fitness?.entries) ? fitness.entries[0] || null : null,
    },
    meals,
    options: { startDate, days: requestedDays },
  }, null, 2)}

Instructions:
- Respect all excluded foods strictly.
- Use mandatory items for each slot whenever possible.
- Use flexible items and example meals to create variety.
- Favor lean-muscle, high-protein, moderate-carb choices.
- Suggest realistic portion guidance in household language like "3 eggs", "150 g paneer", "1 bowl", "2 chapatis".
- Keep meals practical for home preparation in India.
- Give concise prep notes that can be shared with house staff or family.
- Do not include medical claims or extreme dieting advice.

Return valid JSON only in this exact shape:
{
  "aiGuidance": ["short strategy note", "short strategy note"],
  "generatedPlans": [
    {
      "date": "YYYY-MM-DD",
      "meals": {
        "breakfast": {
          "items": ["item 1", "item 2"],
          "portion": "portion guidance",
          "note": "why this meal fits",
          "prepNote": "prep note for staff/family"
        },
        "snack1": { "items": [], "portion": "", "note": "", "prepNote": "" },
        "lunch": { "items": [], "portion": "", "note": "", "prepNote": "" },
        "snack2": { "items": [], "portion": "", "note": "", "prepNote": "" },
        "dinner": { "items": [], "portion": "", "note": "", "prepNote": "" }
      }
    }
  ]
}
  `;

  const result = await model.generateContent(prompt);
  const response = await result.response;
  const payload = extractJson(response.text());
  return normalizeMealsResponse(payload, { days: requestedDays });
}

module.exports = {
  analyzeReport,
  generateMealPlanWithAI,
  getAiApiKeyConfigured: () => Boolean(getApiKey()),
};
