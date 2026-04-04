const { GoogleGenerativeAI } = require('@google/generative-ai');
const { GoogleAIFileManager } = require('@google/generative-ai/server');
const fs = require('fs');

const MODEL_NAME = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

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
  const raw = String(text || '').trim();
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced?.[1]?.trim() || raw;

  if (candidate.startsWith('{') && candidate.endsWith('}')) {
    return JSON.parse(candidate);
  }

  const jsonMatch = candidate.match(/\{[\s\S]*\}/);
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
              mealId: '',
              dishName: String(meal?.dishName || meal?.name || '').trim(),
              description: String(meal?.description || meal?.note || '').trim(),
              items: normalizeStringList(meal?.items),
              note: String(meal?.note || '').trim(),
              chosenReason: String(meal?.chosenReason || '').trim(),
              portion: String(meal?.portion || '').trim(),
              prepNote: String(meal?.prepNote || '').trim(),
              calories: Number(meal?.calories || 0),
              protein: Number(meal?.protein || 0),
              carbs: Number(meal?.carbs || 0),
              fat: Number(meal?.fat || 0),
              portionItems: [],
              substitutions: [],
              nutritionSource: String(meal?.nutritionSource || 'ai').trim(),
              estimatedNutrition: Boolean(meal?.estimatedNutrition),
              recipe: meal?.recipe ? {
                cookTime: String(meal.recipe.cookTime || '').trim(),
                steps: Array.isArray(meal.recipe.steps) ? meal.recipe.steps.map((step) => String(step || '').trim()).filter(Boolean) : [],
                tips: String(meal.recipe.tips || '').trim(),
              } : null,
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

async function generateMealPlanWithAI({ meals, profile, fitness, eligibleMeals = {}, recentPlans = [], options = {} }) {
  const { model } = requireClient();
  const requestedDays = [7, 14, 30].includes(Number(options.days)) ? Number(options.days) : 30;
  const startDate = String(options.startDate || new Date().toISOString().slice(0, 10));
  const latestEntry = Array.isArray(fitness?.entries) ? fitness.entries[0] || null : null;
  const compactMealsContext = {
    objective: meals?.objective || '',
    pantryItems: Array.isArray(meals?.pantryItems) ? meals.pantryItems : [],
    excludedItems: Array.isArray(meals?.excludedItems) ? meals.excludedItems : [],
    mealRules: meals?.mealRules || {},
  };
  const avoidDishesBySlot = options?.avoidDishesBySlot || {};
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
      latestEntry,
    },
    latestWeightKg: latestEntry?.weightKg || 86,
    meals: compactMealsContext,
    eligibleMeals,
    recentPlans: Array.isArray(recentPlans) ? recentPlans : [],
    avoidDishesBySlot,
    options: { startDate, days: requestedDays },
  }, null, 2)}

Instructions:
- Respect all excluded foods strictly.
- Use mandatory items for each slot whenever possible.
- Use flexible items and example meals to create variety.
- Prefer choosing from the eligible meal library provided in the context whenever possible.
- Use the recentPlans context as a hard anti-repetition guide for upcoming days.
- Respect avoidDishesBySlot strongly for the requested dates whenever a reasonable alternative exists.
- Favor lean-muscle, high-protein, moderate-carb choices.
- Think in complete meals, not just ingredient lists.
- Do not repeat the same raw material list across every meal.
- Do not repeat the same breakfast, lunch, or dinner dish on consecutive days.
- Across a 7-day span, aim for at least 4 distinct breakfasts, 4 distinct lunches, and 4 distinct dinners when ingredients allow.
- Do not keep using the same primary protein or same lead vegetable day after day if other eligible choices exist.
- If two dishes are similar, prefer the one using different raw materials from the recentPlans context.
- If the user weighs around 86 kg, make portions explicit enough to support roughly 130-150 g protein across the day unless the user data suggests otherwise.
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
          "dishName": "meal name",
          "description": "1 line reason",
          "items": ["item 1", "item 2"],
          "portion": "portion guidance",
          "calories": 350,
          "protein": 25,
          "carbs": 28,
          "fat": 12,
          "note": "why this meal fits",
          "chosenReason": "why this exact dish was selected",
          "prepNote": "prep note for staff/family",
          "nutritionSource": "ai",
          "estimatedNutrition": false,
          "recipe": {
            "cookTime": "15 min",
            "steps": ["step 1", "step 2"],
            "tips": "small tip"
          }
        },
        "snack1": { "dishName": "", "description": "", "items": [], "portion": "", "calories": 0, "protein": 0, "carbs": 0, "fat": 0, "note": "", "chosenReason": "", "prepNote": "", "nutritionSource": "ai", "estimatedNutrition": false, "recipe": { "cookTime": "", "steps": [], "tips": "" } },
        "lunch": { "dishName": "", "description": "", "items": [], "portion": "", "calories": 0, "protein": 0, "carbs": 0, "fat": 0, "note": "", "chosenReason": "", "prepNote": "", "nutritionSource": "ai", "estimatedNutrition": false, "recipe": { "cookTime": "", "steps": [], "tips": "" } },
        "snack2": { "dishName": "", "description": "", "items": [], "portion": "", "calories": 0, "protein": 0, "carbs": 0, "fat": 0, "note": "", "chosenReason": "", "prepNote": "", "nutritionSource": "ai", "estimatedNutrition": false, "recipe": { "cookTime": "", "steps": [], "tips": "" } },
        "dinner": { "dishName": "", "description": "", "items": [], "portion": "", "calories": 0, "protein": 0, "carbs": 0, "fat": 0, "note": "", "chosenReason": "", "prepNote": "", "nutritionSource": "ai", "estimatedNutrition": false, "recipe": { "cookTime": "", "steps": [], "tips": "" } }
      }
    }
  ]
}
  `;

  const result = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      responseMimeType: 'application/json',
      temperature: 0.8,
    },
  });
  const response = await result.response;
  const payload = extractJson(response.text());
  return normalizeMealsResponse(payload, { days: requestedDays });
}

module.exports = {
  analyzeReport,
  generateMealPlanWithAI,
  getAiApiKeyConfigured: () => Boolean(getApiKey()),
};
