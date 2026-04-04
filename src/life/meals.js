import { addDays, format, parseISO } from 'date-fns';
import { ingredientAliasMap, mealDatabase } from './mealDatabase.js';

export const mealSlotDefinitions = [
  { id: 'breakfast', label: 'Breakfast' },
  { id: 'snack1', label: 'Mid-Morning Snack' },
  { id: 'lunch', label: 'Lunch' },
  { id: 'snack2', label: 'Evening Snack' },
  { id: 'dinner', label: 'Dinner' },
];

export const activityLevelOptions = [
  { id: 'sedentary', label: 'Sedentary', multiplier: 1.2 },
  { id: 'lightly-active', label: 'Lightly Active', multiplier: 1.375 },
  { id: 'moderately-active', label: 'Moderately Active', multiplier: 1.55 },
  { id: 'very-active', label: 'Very Active', multiplier: 1.725 },
  { id: 'extra-active', label: 'Extra Active', multiplier: 1.9 },
];

export const goalTypeOptions = [
  { id: 'weight-loss', label: 'Weight Loss' },
  { id: 'muscle-gain', label: 'Muscle Gain / Recomposition' },
  { id: 'maintain', label: 'Maintain Weight' },
  { id: 'fitness', label: 'Improve Fitness / Endurance' },
];

export const goalPaceOptions = [
  { id: 'mild', label: 'Mild' },
  { id: 'moderate', label: 'Moderate' },
  { id: 'aggressive', label: 'Aggressive' },
];

export const fastingModeOptions = [
  { id: 'standard', label: 'Standard' },
  { id: 'intermittent-16-8', label: 'Intermittent Fasting 16:8' },
];

const mealSlotIds = new Set(mealSlotDefinitions.map((slot) => slot.id));

const defaultMealDistribution = {
  breakfast: 0.25,
  snack1: 0.1,
  lunch: 0.35,
  snack2: 0.1,
  dinner: 0.2,
};

const fastingMealDistribution = {
  breakfast: 0,
  snack1: 0.15,
  lunch: 0.4,
  snack2: 0.15,
  dinner: 0.3,
};

const goalMacroProfiles = {
  'weight-loss': { protein: 0.35, carbs: 0.4, fat: 0.25 },
  'muscle-gain': { protein: 0.4, carbs: 0.4, fat: 0.2 },
  maintain: { protein: 0.25, carbs: 0.5, fat: 0.25 },
  fitness: { protein: 0.25, carbs: 0.55, fat: 0.2 },
};

const goalAdjustments = {
  'weight-loss': {
    mild: -250,
    moderate: -500,
    aggressive: -750,
  },
  'muscle-gain': {
    mild: 250,
    moderate: 350,
    aggressive: 500,
  },
  maintain: {
    mild: 0,
    moderate: 0,
    aggressive: 0,
  },
  fitness: {
    mild: 0,
    moderate: 100,
    aggressive: 150,
  },
};

const ingredientFamilies = {
  paneer: ['paneer', 'tofu'],
  tofu: ['tofu', 'paneer'],
  rice: ['rice', 'brown rice', 'brown_rice', 'quinoa', 'millet', 'dalia'],
  'brown rice': ['brown rice', 'brown_rice', 'rice', 'quinoa', 'millet'],
  brown_rice: ['brown_rice', 'brown rice', 'rice', 'quinoa', 'millet'],
  quinoa: ['quinoa', 'rice', 'brown rice', 'brown_rice', 'millet'],
  millet: ['millet', 'quinoa', 'rice', 'brown rice', 'brown_rice', 'dalia'],
  atta: ['atta', 'bread', 'multigrain bread', 'whole wheat bread', 'toast'],
  bread: ['bread', 'multigrain bread', 'whole wheat bread', 'toast', 'atta'],
  curd: ['curd', 'yogurt', 'greek yogurt', 'milk'],
  yogurt: ['yogurt', 'curd', 'greek yogurt', 'milk'],
  milk: ['milk', 'curd', 'yogurt', 'greek yogurt'],
  sprouts: ['sprouts', 'moong dal', 'chana', 'roasted chana'],
  'moong dal': ['moong dal', 'sprouts', 'masoor dal', 'chana dal', 'toor dal', 'urad dal'],
  'urad dal': ['urad dal', 'moong dal', 'toor dal', 'masoor dal'],
  'toor dal': ['toor dal', 'moong dal', 'masoor dal', 'urad dal', 'chana dal'],
  'masoor dal': ['masoor dal', 'moong dal', 'toor dal', 'chana dal'],
  'chana dal': ['chana dal', 'moong dal', 'toor dal', 'masoor dal'],
  dal: ['dal', 'moong dal', 'toor dal', 'masoor dal', 'urad dal', 'chana dal', 'rajma', 'chole', 'lobia'],
  rajma: ['rajma', 'chole', 'lobia', 'dal'],
  chole: ['chole', 'rajma', 'lobia', 'dal'],
  lobia: ['lobia', 'rajma', 'chole', 'dal'],
  spinach: ['spinach', 'palak', 'methi', 'cabbage', 'broccoli'],
  palak: ['palak', 'spinach', 'methi'],
  banana: ['banana', 'papaya', 'apple', 'orange', 'pomegranate', 'berries'],
  apple: ['apple', 'banana', 'orange', 'papaya', 'pomegranate', 'berries'],
  orange: ['orange', 'apple', 'banana', 'papaya', 'pomegranate', 'berries'],
  almonds: ['almonds', 'walnuts', 'cashews', 'groundnuts', 'peanuts'],
  walnuts: ['walnuts', 'almonds', 'cashews', 'groundnuts', 'peanuts'],
  cashews: ['cashews', 'almonds', 'walnuts', 'groundnuts', 'peanuts'],
};

const proteinIngredientSet = new Set([
  'eggs', 'paneer', 'tofu', 'soya chunks', 'soy chunks', 'whey protein', 'curd', 'yogurt',
  'greek yogurt', 'milk', 'sprouts', 'moong dal', 'toor dal', 'masoor dal', 'urad dal',
  'chana dal', 'rajma', 'chole', 'lobia', 'roasted chana',
]);

const carbIngredientSet = new Set([
  'rice', 'brown rice', 'brown_rice', 'atta', 'bread', 'multigrain bread', 'whole wheat bread',
  'toast', 'poha', 'oats', 'dalia', 'quinoa', 'millet', 'sweet potato', 'potato', 'corn',
]);

const vegetableIngredientSet = new Set([
  'spinach', 'palak', 'methi', 'cabbage', 'cauliflower', 'broccoli', 'bottle gourd', 'lauki',
  'ridge gourd', 'bitter gourd', 'karela', 'peas', 'carrot', 'beetroot', 'tomato', 'onion',
  'garlic', 'ginger', 'green chili', 'capsicum', 'mushroom', 'bhindi',
]);

const fruitIngredientSet = new Set([
  'banana', 'apple', 'orange', 'papaya', 'pomegranate', 'berries', 'lemon',
]);

const fatIngredientSet = new Set([
  'almonds', 'walnuts', 'cashews', 'groundnuts', 'peanuts', 'flaxseeds', 'chia seeds',
  'sunflower seeds', 'sesame seeds', 'ghee', 'olive oil', 'coconut oil', 'butter',
]);

const normalizeStringList = (values = []) => [...new Set(
  (Array.isArray(values) ? values : [])
    .map((value) => String(value || '').trim())
    .filter(Boolean),
)];

const roundToFive = (value) => Math.round(Number(value || 0) / 5) * 5;
const roundMetric = (value) => Math.round(Number(value || 0));

const numeric = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const createEmptyMealRule = (overrides = {}) => ({
  fixedItems: [],
  flexibleItems: [],
  exampleMeals: [],
  note: '',
  ...overrides,
});

const createEmptyMealEntry = (overrides = {}) => ({
  id: crypto.randomUUID(),
  mealId: '',
  dishName: '',
  description: '',
  items: [],
  portion: '',
  portionItems: [],
  calories: 0,
  protein: 0,
  carbs: 0,
  fat: 0,
  prepNote: '',
  note: '',
  chosenReason: '',
  recipe: null,
  substitutions: [],
  nutritionSource: 'database',
  estimatedNutrition: false,
  completed: false,
  ...overrides,
});

const createDefaultPlannerProfile = () => ({
  heightCm: '',
  weightKg: '',
  age: '',
  gender: 'male',
  activityLevel: 'moderately-active',
  goalType: 'muscle-gain',
  goalPace: 'moderate',
  fastingMode: 'standard',
});

const createDefaultGenerationMeta = () => ({
  mode: 'library',
  requestedDays: 0,
  aiDays: 0,
  fallbackDays: 0,
  aiReturnedDays: 0,
  missingDays: 0,
  lastRunAt: '',
});

export const createEmptyMealsState = () => ({
  objective: 'Lean muscle',
  planLengthDays: 7,
  whatsappNumber: '',
  pantryItems: [],
  excludedItems: [],
  aiGuidance: [],
  plannerProfile: createDefaultPlannerProfile(),
  generationMeta: createDefaultGenerationMeta(),
  mealRules: Object.fromEntries(
    mealSlotDefinitions.map((slot) => [slot.id, createEmptyMealRule()]),
  ),
  generatedPlans: [],
});

const normalizeMealRule = (rule = {}) => createEmptyMealRule({
  ...rule,
  fixedItems: normalizeStringList(rule?.fixedItems),
  flexibleItems: normalizeStringList(rule?.flexibleItems),
  exampleMeals: normalizeStringList(rule?.exampleMeals),
  note: String(rule?.note || '').trim(),
});

const normalizePlannerProfile = (profile = {}) => ({
  heightCm: String(profile?.heightCm || '').trim(),
  weightKg: String(profile?.weightKg || '').trim(),
  age: String(profile?.age || '').trim(),
  gender: ['male', 'female', 'other'].includes(profile?.gender) ? profile.gender : 'male',
  activityLevel: activityLevelOptions.some((item) => item.id === profile?.activityLevel) ? profile.activityLevel : 'moderately-active',
  goalType: goalTypeOptions.some((item) => item.id === profile?.goalType) ? profile.goalType : 'muscle-gain',
  goalPace: goalPaceOptions.some((item) => item.id === profile?.goalPace) ? profile.goalPace : 'moderate',
  fastingMode: fastingModeOptions.some((item) => item.id === profile?.fastingMode) ? profile.fastingMode : 'standard',
});

export const normalizeMealsState = (meals = {}) => {
  const base = createEmptyMealsState();

  const mealRules = Object.fromEntries(
    mealSlotDefinitions.map((slot) => [
      slot.id,
      normalizeMealRule(meals?.mealRules?.[slot.id] || base.mealRules[slot.id]),
    ]),
  );

  const generatedPlans = (Array.isArray(meals?.generatedPlans) ? meals.generatedPlans : [])
    .filter((plan) => plan && plan.date)
    .map((plan) => ({
      id: String(plan.id || crypto.randomUUID()),
      date: String(plan.date),
      source: ['ai', 'library', 'library-fallback'].includes(plan?.source) ? plan.source : 'library',
      summary: plan.summary || null,
      meals: Object.fromEntries(
        mealSlotDefinitions.map((slot) => [
          slot.id,
          createEmptyMealEntry({
            ...plan?.meals?.[slot.id],
            items: normalizeStringList(plan?.meals?.[slot.id]?.items),
            portionItems: Array.isArray(plan?.meals?.[slot.id]?.portionItems) ? plan.meals[slot.id].portionItems : [],
            substitutions: Array.isArray(plan?.meals?.[slot.id]?.substitutions) ? plan.meals[slot.id].substitutions : [],
            chosenReason: String(plan?.meals?.[slot.id]?.chosenReason || '').trim(),
            nutritionSource: String(plan?.meals?.[slot.id]?.nutritionSource || 'database').trim(),
            estimatedNutrition: Boolean(plan?.meals?.[slot.id]?.estimatedNutrition),
            completed: Boolean(plan?.meals?.[slot.id]?.completed),
          }),
        ]),
      ),
      createdAt: String(plan.createdAt || new Date().toISOString()),
    }))
    .sort((left, right) => String(left.date).localeCompare(String(right.date)));

  return {
    objective: String(meals?.objective || base.objective).trim() || base.objective,
    planLengthDays: [7, 14, 30].includes(Number(meals?.planLengthDays)) ? Number(meals.planLengthDays) : base.planLengthDays,
    whatsappNumber: String(meals?.whatsappNumber || '').trim(),
    pantryItems: normalizeStringList(meals?.pantryItems),
    excludedItems: normalizeStringList(meals?.excludedItems),
    aiGuidance: normalizeStringList(meals?.aiGuidance),
    plannerProfile: normalizePlannerProfile(meals?.plannerProfile),
    generationMeta: {
      ...createDefaultGenerationMeta(),
      ...(meals?.generationMeta || {}),
      mode: ['library', 'ai', 'mixed', 'ai-partial'].includes(meals?.generationMeta?.mode) ? meals.generationMeta.mode : 'library',
      requestedDays: Number(meals?.generationMeta?.requestedDays) || 0,
      aiDays: Number(meals?.generationMeta?.aiDays) || 0,
      fallbackDays: Number(meals?.generationMeta?.fallbackDays) || 0,
      aiReturnedDays: Number(meals?.generationMeta?.aiReturnedDays) || 0,
      missingDays: Number(meals?.generationMeta?.missingDays) || 0,
      lastRunAt: String(meals?.generationMeta?.lastRunAt || ''),
    },
    mealRules,
    generatedPlans,
  };
};

const canonicalize = (value) => {
  const item = String(value || '').trim().toLowerCase();
  if (!item) return '';

  const found = Object.entries(ingredientAliasMap).find(([, aliases]) => aliases.some((alias) => item.includes(alias)));
  return found ? found[0] : item;
};

const buildAvailableIngredientSet = ({ pantryItems, mealRules }) => {
  const rawItems = [
    ...normalizeStringList(pantryItems),
    ...mealSlotDefinitions.flatMap((slot) => [
      ...normalizeStringList(mealRules[slot.id]?.fixedItems),
      ...normalizeStringList(mealRules[slot.id]?.flexibleItems),
    ]),
  ];

  return new Set(rawItems.map(canonicalize).filter(Boolean));
};

const buildExcludedSet = (excludedItems = []) => new Set(normalizeStringList(excludedItems).map(canonicalize));

const ingredientAvailable = (ingredient, availableIngredients) => {
  const canonical = canonicalize(ingredient);
  if (availableIngredients.has(canonical)) return true;
  const family = ingredientFamilies[canonical];
  if (family?.some((item) => availableIngredients.has(canonicalize(item)))) return true;
  if (canonical.includes('dal')) {
    return [...availableIngredients].some((item) => item.includes('dal') || ['rajma', 'chole', 'lobia'].includes(item));
  }
  return false;
};

const stringifyPortionItem = ({ label, quantity, unit }) => {
  const rounded = unit === 'g'
    ? Math.round(quantity / 5) * 5
    : Math.round(quantity * 4) / 4;
  return `${Number.isInteger(rounded) ? rounded : rounded.toFixed(2).replace(/\.00$/, '')} ${unit} ${label}`.trim();
};

const scalePortionItems = (portionItems = [], factor = 1) => portionItems.map((item) => ({
  ...item,
  quantity: Number(item.quantity || 0) * factor,
}));

const formatPortion = (portionItems = []) => portionItems.map(stringifyPortionItem).join(' + ');

export const calculateCalorieTargets = ({ meals, profile, fitness } = {}) => {
  const normalized = normalizeMealsState(meals || {});
  const plannerProfile = normalizePlannerProfile({
    ...normalized.plannerProfile,
    heightCm: normalized.plannerProfile.heightCm || profile?.heightCm || '',
    weightKg: normalized.plannerProfile.weightKg || fitness?.entries?.[0]?.weightKg || '',
  });

  const weightKg = numeric(plannerProfile.weightKg) || 86;
  const heightCm = numeric(plannerProfile.heightCm) || numeric(profile?.heightCm) || 175;
  const age = numeric(plannerProfile.age) || 30;
  const gender = plannerProfile.gender;
  const activity = activityLevelOptions.find((item) => item.id === plannerProfile.activityLevel) || activityLevelOptions[2];
  const goalType = plannerProfile.goalType;
  const goalPace = plannerProfile.goalPace;

  const bmrBase = (10 * weightKg) + (6.25 * heightCm) - (5 * age);
  const bmr = gender === 'female' ? bmrBase - 161 : bmrBase + 5;
  const tdee = bmr * activity.multiplier;
  let goalCalories = tdee + (goalAdjustments[goalType]?.[goalPace] || 0);
  let safetyWarning = '';

  if (goalType === 'weight-loss') {
    const floor = gender === 'female' ? 1200 : 1500;
    if (goalCalories < floor) {
      goalCalories = floor;
      safetyWarning = `Weight-loss calories were capped at ${floor} kcal for safety.`;
    }
  }

  const macros = goalMacroProfiles[goalType] || goalMacroProfiles.maintain;
  const rawProtein = (goalCalories * macros.protein) / 4;
  const proteinCap = weightKg * 2.2;
  const proteinGrams = goalType === 'muscle-gain' && rawProtein > proteinCap ? proteinCap : rawProtein;
  const proteinNote = goalType === 'muscle-gain' && rawProtein > proteinCap
    ? `Protein target was capped at ${Math.round(proteinCap)} g to stay within 2.2 g/kg bodyweight.`
    : '';

  return {
    plannerProfile,
    weightKg,
    heightCm,
    age,
    gender,
    activity,
    goalType,
    goalPace,
    maintenanceCalories: roundToFive(tdee),
    goalCalories: roundToFive(goalCalories),
    macros: {
      proteinPct: macros.protein,
      carbsPct: macros.carbs,
      fatPct: macros.fat,
      proteinGrams: roundMetric(proteinGrams),
      carbsGrams: roundMetric((goalCalories * macros.carbs) / 4),
      fatGrams: roundMetric((goalCalories * macros.fat) / 9),
    },
    hydrationMl: roundMetric(weightKg * 32.5),
    mealDistribution: plannerProfile.fastingMode === 'intermittent-16-8' ? fastingMealDistribution : defaultMealDistribution,
    safetyWarning,
    proteinNote,
  };
};

const mealMatchesFilters = ({ meal, slotId, availableIngredients, excludedIngredients }) => {
  if (!meal.slots.includes(slotId)) return false;
  if (meal.ingredients.some((ingredient) => excludedIngredients.has(canonicalize(ingredient)))) return false;

  return meal.primaryIngredients.every((ingredient) => {
    const canonical = canonicalize(ingredient);
    return ingredientAvailable(canonical, availableIngredients)
      || meal.substitutions.some((sub) => canonicalize(sub.from) === canonical && ingredientAvailable(sub.to, availableIngredients));
  });
};

const mealPreferenceScore = ({ meal, slotId, targetCalories, goalType, rule, repeatPenalty }) => {
  const calorieGap = Math.abs(meal.calories - targetCalories);
  const macroBonus = meal.goalTags.includes(goalType) ? -40 : 0;
  const proteinBonus = goalType === 'muscle-gain' ? -meal.protein * 2 : 0;
  const weightLossBonus = goalType === 'weight-loss' ? -(meal.protein * 1.2) + meal.fat : 0;
  const fixedBonus = rule.fixedItems.length && rule.fixedItems.some((item) => meal.ingredients.some((ingredient) => canonicalize(ingredient) === canonicalize(item))) ? -25 : 0;
  const noteBonus = rule.note ? -5 : 0;
  const slotBonus = slotId.startsWith('snack') ? 0 : -meal.ingredients.length;

  return calorieGap + repeatPenalty + macroBonus + proteinBonus + weightLossBonus + fixedBonus + noteBonus + slotBonus;
};

const buildChosenReason = ({ meal, slotId, targetCalories, goalType, rule, calorieGap }) => {
  const reasons = [];
  reasons.push(`matched your available ingredients for ${slotId}`);
  reasons.push(`${Math.round(Math.abs(calorieGap))} kcal away from the ${targetCalories} kcal target`);
  if (meal.goalTags.includes(goalType)) reasons.push(`tagged as a good ${goalType.replace('-', ' ')} fit`);
  if (rule.fixedItems.length && rule.fixedItems.some((item) => meal.ingredients.some((ingredient) => canonicalize(ingredient) === canonicalize(item)))) {
    reasons.push('includes one of your priority ingredients');
  }
  return reasons.join(' | ');
};

const toTitleCase = (value) => String(value || '')
  .replace(/_/g, ' ')
  .replace(/\b\w/g, (match) => match.toUpperCase());

const uniqueItems = (items = []) => [...new Set(items.filter(Boolean))];

const pickFirstMatching = (items, matcher) => items.find((item) => matcher(canonicalize(item))) || '';

const hasCategoryItem = (items, category) => items.some((item) => category.has(canonicalize(item)));

const buildFallbackTemplatePool = ({ slotId, pantryItems, rule }) => {
  const ingredients = uniqueItems([
    ...rule.fixedItems,
    ...rule.flexibleItems,
    ...pantryItems,
  ]).map(canonicalize).filter(Boolean);

  const protein = pickFirstMatching(ingredients, (item) => proteinIngredientSet.has(item));
  const carb = pickFirstMatching(ingredients, (item) => carbIngredientSet.has(item));
  const vegetable = pickFirstMatching(ingredients, (item) => vegetableIngredientSet.has(item));
  const fruit = pickFirstMatching(ingredients, (item) => fruitIngredientSet.has(item));
  const fat = pickFirstMatching(ingredients, (item) => fatIngredientSet.has(item));

  const templates = [];

  if (slotId === 'breakfast') {
    if (protein === 'eggs') {
      templates.push({
        name: `Egg${vegetable ? ` and ${toTitleCase(vegetable)}` : ''} Breakfast Plate`,
        items: uniqueItems([protein, vegetable, carb]),
        portion: `3 eggs${vegetable ? ` + 1 cup ${vegetable}` : ''}${carb ? ` + 1 serving ${toTitleCase(carb)}` : ''}`,
        calories: 380,
        protein: 28,
        carbs: carb ? 26 : 10,
        fat: 18,
      });
    }
    if (protein === 'paneer' || protein === 'tofu') {
      templates.push({
        name: `${toTitleCase(protein)} Breakfast Bowl`,
        items: uniqueItems([protein, vegetable, carb]),
        portion: `150 g ${toTitleCase(protein)}${vegetable ? ` + 1 cup ${toTitleCase(vegetable)}` : ''}${carb ? ` + 1 serving ${toTitleCase(carb)}` : ''}`,
        calories: 360,
        protein: 24,
        carbs: carb ? 24 : 12,
        fat: 16,
      });
    }
    if (protein || fruit) {
      templates.push({
        name: `${toTitleCase(protein || 'curd')} and ${toTitleCase(fruit || vegetable || 'seed')} Morning Bowl`,
        items: uniqueItems([protein || 'curd', fruit || vegetable, fat]),
        portion: `${protein ? '1 serving' : '1 cup'} ${toTitleCase(protein || 'curd')}${fruit ? ` + 1 ${toTitleCase(fruit)}` : ''}${fat ? ` + 1 tbsp ${toTitleCase(fat)}` : ''}`,
        calories: 300,
        protein: 18,
        carbs: 24,
        fat: 10,
      });
    }
  }

  if (slotId === 'lunch') {
    if (protein && (carb || hasCategoryItem(ingredients, carbIngredientSet))) {
      templates.push({
        name: `${toTitleCase(protein)} ${carb ? `with ${toTitleCase(carb)}` : 'Lunch Plate'}`,
        items: uniqueItems([protein, carb, vegetable]),
        portion: `${protein === 'eggs' ? '3 eggs' : protein.includes('dal') || ['rajma', 'chole', 'lobia'].includes(protein) ? '1.5 cups' : '150 g'} ${toTitleCase(protein)}${carb ? ` + 1 serving ${toTitleCase(carb)}` : ''}${vegetable ? ` + 1 cup ${toTitleCase(vegetable)}` : ''}`,
        calories: 620,
        protein: 34,
        carbs: 52,
        fat: 16,
      });
    }
    if (hasCategoryItem(ingredients, new Set(['moong dal', 'toor dal', 'masoor dal', 'urad dal', 'chana dal', 'rajma', 'chole', 'lobia']))) {
      templates.push({
        name: `${toTitleCase(protein && protein.includes('dal') ? protein : 'Dal')} Home Lunch Plate`,
        items: uniqueItems([protein && protein.includes('dal') ? protein : 'dal', carb || 'rice', vegetable]),
        portion: `1.5 cups ${toTitleCase(protein && protein.includes('dal') ? protein : 'dal')}${carb ? ` + 1 serving ${toTitleCase(carb)}` : ''}${vegetable ? ` + 1 cup ${toTitleCase(vegetable)}` : ''}`,
        calories: 590,
        protein: 28,
        carbs: 68,
        fat: 12,
      });
    }
  }

  if (slotId === 'dinner') {
    if (protein) {
      templates.push({
        name: `Light ${toTitleCase(protein)} Dinner`,
        items: uniqueItems([protein, vegetable, carb === 'rice' ? '' : carb]),
        portion: `${protein === 'eggs' ? '3 eggs' : protein.includes('dal') || ['rajma', 'chole', 'lobia'].includes(protein) ? '1.25 cups' : '130 g'} ${toTitleCase(protein)}${vegetable ? ` + 1 cup ${toTitleCase(vegetable)}` : ''}${carb && carb !== 'rice' ? ` + small ${toTitleCase(carb)} serving` : ''}`,
        calories: 420,
        protein: 28,
        carbs: 24,
        fat: 15,
      });
    }
      templates.push({
        name: `${toTitleCase(vegetable || 'Vegetable')} and ${toTitleCase(protein || 'Dal')} Evening Plate`,
        items: uniqueItems([vegetable || 'vegetables', protein || 'dal', carb && carb !== 'rice' ? carb : '']),
      portion: `${vegetable ? `1.5 cups ${toTitleCase(vegetable)}` : '1 bowl vegetables'}${protein ? ` + 1 serving ${toTitleCase(protein)}` : ' + 1 cup dal'}`,
      calories: 390,
      protein: 24,
      carbs: 26,
      fat: 14,
    });
  }

  if (slotId.startsWith('snack')) {
    if (protein || fruit || fat) {
      templates.push({
        name: `${toTitleCase(protein || fruit || 'Pantry')} Snack Box`,
        items: uniqueItems([protein, fruit, fat]),
        portion: `${protein === 'eggs' ? '2 eggs' : protein ? `1 serving ${toTitleCase(protein)}` : fruit ? `1 ${toTitleCase(fruit)}` : ''}${fat ? ' + 1 small handful nuts/seeds' : ''}`,
        calories: 180,
        protein: protein ? 12 : 5,
        carbs: fruit ? 16 : 10,
        fat: fat ? 8 : 5,
      });
    }
  }

  return templates.filter((template) => template.items.length);
};

const chooseMealForSlot = ({
  slotId,
  targetCalories,
  goalType,
  availableIngredients,
  excludedIngredients,
  rule,
  dayIndex,
  recentMealIds,
}) => {
  const candidates = mealDatabase
    .filter((meal) => mealMatchesFilters({ meal, slotId, availableIngredients, excludedIngredients }))
    .map((meal) => ({
      meal,
      calorieGap: Math.abs(meal.calories - targetCalories),
      score: mealPreferenceScore({
        meal,
        slotId,
        targetCalories,
        goalType,
        rule,
        repeatPenalty: recentMealIds.includes(meal.id) ? 120 : 0,
      }),
    }))
    .sort((left, right) => left.score - right.score || left.meal.name.localeCompare(right.meal.name));

  const selected = candidates[Math.min(dayIndex % Math.max(candidates.length, 1), Math.max(0, candidates.length - 1))] || candidates[0] || null;
  if (!selected) return null;
  return {
    meal: selected.meal,
    chosenReason: buildChosenReason({
      meal: selected.meal,
      slotId,
      targetCalories,
      goalType,
      rule,
      calorieGap: selected.calorieGap,
    }),
  };
};

const scaleMeal = ({ meal, targetCalories, rule, chosenReason = '' }) => {
  const factor = meal.calories ? Math.max(0.75, Math.min(1.35, targetCalories / meal.calories)) : 1;
  const portionItems = scalePortionItems(meal.portionItems, factor);

  return createEmptyMealEntry({
    mealId: meal.id,
    dishName: meal.name,
    description: meal.description,
    items: normalizeStringList([...meal.ingredients, ...rule.fixedItems]),
    portionItems,
    portion: formatPortion(portionItems),
    calories: roundToFive(meal.calories * factor),
    protein: roundMetric(meal.protein * factor),
    carbs: roundMetric(meal.carbs * factor),
    fat: roundMetric(meal.fat * factor),
    prepNote: rule.note || meal.recipe?.tips || '',
    note: meal.description,
    chosenReason,
    recipe: meal.recipe,
    substitutions: meal.substitutions || [],
    nutritionSource: 'database',
    estimatedNutrition: false,
  });
};

const buildFallbackMeal = ({ slotId, targetCalories, rule, pantryItems, dayIndex, recentFallbackNames = [] }) => {
  const templates = buildFallbackTemplatePool({ slotId, pantryItems, rule });
  const rankedTemplates = templates
    .map((template) => ({
      ...template,
      gap: Math.abs((template.calories || targetCalories) - targetCalories),
      repeatPenalty: recentFallbackNames.includes(template.name) ? 150 : 0,
    }))
    .sort((left, right) => (left.gap + left.repeatPenalty) - (right.gap + right.repeatPenalty) || left.name.localeCompare(right.name));

  const template = rankedTemplates[Math.min(dayIndex % Math.max(rankedTemplates.length, 1), Math.max(0, rankedTemplates.length - 1))]
    || rankedTemplates[0]
    || {
      name: slotId.startsWith('snack') ? 'Pantry Snack Plate' : 'Pantry Home Plate',
      items: normalizeStringList([...rule.fixedItems, ...rule.flexibleItems]).slice(0, slotId.startsWith('snack') ? 3 : 5),
      portion: slotId.startsWith('snack') ? '1 compact serving' : '1 balanced plate',
      calories: targetCalories,
      protein: slotId.startsWith('snack') ? 10 : 20,
      carbs: slotId === 'lunch' ? 40 : 20,
      fat: 8,
    };

  const factor = template.calories ? Math.max(0.8, Math.min(1.2, targetCalories / template.calories)) : 1;

  return createEmptyMealEntry({
    dishName: template.name,
    description: 'Pantry-derived meal built from the ingredients you marked as available.',
    items: normalizeStringList(template.items),
    portion: template.portion,
    calories: roundToFive((template.calories || targetCalories) * factor),
    protein: roundMetric((template.protein || 0) * factor),
    carbs: roundMetric((template.carbs || 0) * factor),
    fat: roundMetric((template.fat || 0) * factor),
    prepNote: rule.note || 'Use the pantry ingredients shown and keep the plate close to this portion.',
    note: 'Estimated pantry-derived meal because no strong database match was available for the current pantry.',
    chosenReason: 'No strong database recipe matched your current ingredient set, so the planner built the closest pantry-based estimated meal instead.',
    nutritionSource: 'estimate',
    estimatedNutrition: true,
  });
};

const buildDaySummary = ({ date, meals, targets, comparisonCalories }) => {
  const dailyCalories = mealSlotDefinitions.reduce((sum, slot) => sum + Number(meals[slot.id]?.calories || 0), 0);
  const dailyProtein = mealSlotDefinitions.reduce((sum, slot) => sum + Number(meals[slot.id]?.protein || 0), 0);
  const dailyCarbs = mealSlotDefinitions.reduce((sum, slot) => sum + Number(meals[slot.id]?.carbs || 0), 0);
  const dailyFat = mealSlotDefinitions.reduce((sum, slot) => sum + Number(meals[slot.id]?.fat || 0), 0);

  return {
    date,
    maintenanceCalories: targets.maintenanceCalories,
    goalCalories: targets.goalCalories,
    proteinTarget: targets.macros.proteinGrams,
    carbsTarget: targets.macros.carbsGrams,
    fatTarget: targets.macros.fatGrams,
    dailyCalories,
    dailyProtein,
    dailyCarbs,
    dailyFat,
    deltaVsGoal: dailyCalories - comparisonCalories,
  };
};

export const generateMealPlans = (meals, options = {}, context = {}) => {
  const normalizedMeals = normalizeMealsState(meals);
  const targets = calculateCalorieTargets({ meals: normalizedMeals, profile: context.profile, fitness: context.fitness });
  const startDate = options?.startDate || new Date().toISOString().slice(0, 10);
  const parsedStart = parseISO(startDate);
  const totalDays = Number(options?.days) || normalizedMeals.planLengthDays || 7;
  const availableIngredients = buildAvailableIngredientSet({
    pantryItems: normalizedMeals.pantryItems,
    mealRules: normalizedMeals.mealRules,
  });
  const excludedIngredients = buildExcludedSet(normalizedMeals.excludedItems);

  const recentMealIds = [];
  const recentFallbackNames = Object.fromEntries(mealSlotDefinitions.map((slot) => [slot.id, []]));

  return Array.from({ length: totalDays }, (_, dayIndex) => {
    const date = format(addDays(parsedStart, dayIndex), 'yyyy-MM-dd');

    const dayMeals = Object.fromEntries(
      mealSlotDefinitions.map((slot) => {
        const slotTargetCalories = roundToFive(targets.goalCalories * (targets.mealDistribution[slot.id] || 0));
        const rule = normalizedMeals.mealRules[slot.id];

        if (targets.plannerProfile.fastingMode === 'intermittent-16-8' && slot.id === 'breakfast') {
          return [slot.id, createEmptyMealEntry({
            dishName: 'Fasting window',
            description: 'Breakfast skipped due to 16:8 fasting mode.',
            items: [],
            portion: 'Hydration only',
            calories: 0,
            protein: 0,
            carbs: 0,
            fat: 0,
            prepNote: 'Shift calories into lunch, snacks, and dinner.',
          })];
        }

        const selectedMeal = chooseMealForSlot({
          slotId: slot.id,
          targetCalories: slotTargetCalories,
          goalType: targets.goalType,
          availableIngredients,
          excludedIngredients,
          rule,
          dayIndex,
          recentMealIds,
        });

        const mealEntry = selectedMeal
          ? scaleMeal({
            meal: selectedMeal.meal,
            targetCalories: slotTargetCalories,
            rule,
            chosenReason: selectedMeal.chosenReason,
          })
          : buildFallbackMeal({
            slotId: slot.id,
            targetCalories: slotTargetCalories,
            rule,
            pantryItems: normalizedMeals.pantryItems,
            dayIndex,
            recentFallbackNames: recentFallbackNames[slot.id],
          });

        if (selectedMeal?.meal) recentMealIds.unshift(selectedMeal.meal.id);
        if (recentMealIds.length > 14) recentMealIds.pop();
        if (!selectedMeal?.meal && mealEntry?.dishName) {
          recentFallbackNames[slot.id].unshift(mealEntry.dishName);
          if (recentFallbackNames[slot.id].length > 7) recentFallbackNames[slot.id].pop();
        }

        return [slot.id, mealEntry];
      }),
    );

    return {
      id: crypto.randomUUID(),
      date,
      source: 'library',
      summary: buildDaySummary({
        date,
        meals: dayMeals,
        targets,
        comparisonCalories: targets.goalCalories,
      }),
      meals: dayMeals,
      createdAt: new Date().toISOString(),
    };
  });
};

export const formatMealPlanForSharing = (plan, mealsState) => {
  if (!plan) return '';
  const targetSummary = plan.summary;
  const plannerProfile = mealsState?.plannerProfile || {};

  return [
    `Meal plan for ${format(parseISO(plan.date), 'EEE, dd MMM')}`,
    `Height: ${plannerProfile.heightCm || '-'} cm | Weight: ${plannerProfile.weightKg || '-'} kg | Goal: ${plannerProfile.goalType || '-'}`,
    `Maintenance: ${targetSummary?.maintenanceCalories || '-'} kcal | Goal: ${targetSummary?.goalCalories || '-'} kcal`,
    ...mealSlotDefinitions.map((slot) => {
      const entry = plan.meals?.[slot.id];
      return `${slot.label}: ${entry?.dishName || 'TBD'} | ${entry?.portion || 'No portion'} | ${entry?.calories || 0} kcal`;
    }),
    `Daily total: ${targetSummary?.dailyCalories || 0} kcal`,
  ].join('\n');
};

export const formatMultipleMealPlansForSharing = (plans = [], mealsState) => plans
  .map((plan) => formatMealPlanForSharing(plan, mealsState))
  .filter(Boolean)
  .join('\n\n--------------------\n\n');

export const getUpcomingMealPlan = (plans = [], today = new Date().toISOString().slice(0, 10)) => (
  [...plans].find((plan) => plan.date >= today) || plans[0] || null
);

export const getMealCompletionSummary = (plan) => {
  if (!plan) return { completed: 0, total: mealSlotDefinitions.length };
  const total = mealSlotDefinitions.filter((slot) => plan.meals?.[slot.id]?.dishName !== 'Fasting window').length;
  const completed = mealSlotDefinitions.filter((slot) => plan.meals?.[slot.id]?.completed).length;
  return { completed, total };
};

export const buildWeeklyMealSummary = (plans = []) => {
  const firstSeven = plans.slice(0, 7);
  const averageCalories = firstSeven.length
    ? roundToFive(firstSeven.reduce((sum, plan) => sum + Number(plan.summary?.dailyCalories || 0), 0) / firstSeven.length)
    : 0;

  return {
    rows: firstSeven.map((plan) => ({
      date: plan.date,
      source: plan.source || 'library',
      breakfast: plan.meals?.breakfast?.dishName || '—',
      snack1: plan.meals?.snack1?.dishName || '—',
      lunch: plan.meals?.lunch?.dishName || '—',
      snack2: plan.meals?.snack2?.dishName || '—',
      dinner: plan.meals?.dinner?.dishName || '—',
      totalCalories: plan.summary?.dailyCalories || 0,
    })),
    averageCalories,
  };
};

const simplifyIngredientName = (item) => String(item || '').replace(/_/g, ' ');

export const buildShoppingList = (plans = []) => {
  const tallies = new Map();
  plans.slice(0, 7).forEach((plan) => {
    mealSlotDefinitions.forEach((slot) => {
      const entry = plan.meals?.[slot.id];
      if (!entry) return;
      entry.items.forEach((item) => {
        const key = simplifyIngredientName(item).toLowerCase();
        tallies.set(key, (tallies.get(key) || 0) + 1);
      });
    });
  });

  return [...tallies.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .map(([name, count]) => ({
      name,
      quantity: count,
      unit: 'use(s)',
    }));
};

export const buildNutritionProgress = (plan) => {
  const target = plan?.summary || {};
  const completedMeals = mealSlotDefinitions
    .map((slot) => plan?.meals?.[slot.id])
    .filter((entry) => entry?.completed);

  const totals = completedMeals.reduce((sum, entry) => ({
    calories: sum.calories + Number(entry.calories || 0),
    protein: sum.protein + Number(entry.protein || 0),
    carbs: sum.carbs + Number(entry.carbs || 0),
    fat: sum.fat + Number(entry.fat || 0),
  }), { calories: 0, protein: 0, carbs: 0, fat: 0 });

  return {
    calories: {
      current: roundMetric(totals.calories),
      target: roundMetric(target.goalCalories || 0),
    },
    protein: {
      current: roundMetric(totals.protein),
      target: roundMetric(target.proteinTarget || 0),
    },
    carbs: {
      current: roundMetric(totals.carbs),
      target: roundMetric(target.carbsTarget || 0),
    },
    fat: {
      current: roundMetric(totals.fat),
      target: roundMetric(target.fatTarget || 0),
    },
  };
};

export const buildGoalProgress = (plans = []) => plans.slice(0, 7).map((plan) => ({
  date: plan.date,
  goalCalories: plan.summary?.goalCalories || 0,
  actualCalories: plan.summary?.dailyCalories || 0,
  delta: plan.summary?.deltaVsGoal || 0,
}));

export const buildEligibleMealCatalog = ({ mealsState, profile, fitness, perSlot = 12 }) => {
  const normalizedMeals = normalizeMealsState(mealsState);
  const targets = calculateCalorieTargets({ meals: normalizedMeals, profile, fitness });
  const availableIngredients = buildAvailableIngredientSet({
    pantryItems: normalizedMeals.pantryItems,
    mealRules: normalizedMeals.mealRules,
  });
  const excludedIngredients = buildExcludedSet(normalizedMeals.excludedItems);

  return Object.fromEntries(
    mealSlotDefinitions.map((slot) => {
      const targetCalories = roundToFive(targets.goalCalories * (targets.mealDistribution[slot.id] || 0));
      const eligiblePool = mealDatabase
        .filter((meal) => mealMatchesFilters({ meal, slotId: slot.id, availableIngredients, excludedIngredients }))
        .sort((left, right) => Math.abs(left.calories - targetCalories) - Math.abs(right.calories - targetCalories));

      const signatureSet = new Set();
      const diversified = [];
      eligiblePool.forEach((meal) => {
        const signature = [
          canonicalize(meal.primaryIngredients?.[0] || ''),
          canonicalize(meal.primaryIngredients?.[1] || ''),
          meal.tags?.[0] || '',
        ].filter(Boolean).join('|');
        if (!signature || signatureSet.has(signature) || diversified.length >= perSlot) return;
        signatureSet.add(signature);
        diversified.push(meal);
      });

      const fallbackFill = eligiblePool.filter((meal) => !diversified.includes(meal)).slice(0, Math.max(0, perSlot - diversified.length));
      const eligible = [...diversified, ...fallbackFill]
        .slice(0, perSlot)
        .map((meal) => ({
          id: meal.id,
          dishName: meal.name,
          calories: meal.calories,
          protein: meal.protein,
          carbs: meal.carbs,
          fat: meal.fat,
          ingredients: meal.ingredients,
          primaryIngredients: meal.primaryIngredients,
          tags: meal.tags,
          description: meal.description,
        }));

      return [slot.id, eligible];
    }),
  );
};

export const swapMealEntry = ({ mealsState, plan, slotId, profile, fitness }) => {
  if (!plan || !isMealSlotId(slotId)) return null;
  const normalizedMeals = normalizeMealsState(mealsState);
  const targets = calculateCalorieTargets({ meals: normalizedMeals, profile, fitness });
  const availableIngredients = buildAvailableIngredientSet({
    pantryItems: normalizedMeals.pantryItems,
    mealRules: normalizedMeals.mealRules,
  });
  const excludedIngredients = buildExcludedSet(normalizedMeals.excludedItems);
  const currentMeal = plan.meals?.[slotId];
  const targetCalories = currentMeal?.calories || roundToFive(targets.goalCalories * (targets.mealDistribution[slotId] || 0));

  const alternative = mealDatabase
    .filter((meal) => mealMatchesFilters({ meal, slotId, availableIngredients, excludedIngredients }))
    .filter((meal) => meal.id !== currentMeal?.mealId)
    .filter((meal) => Math.abs(meal.calories - targetCalories) <= 140)
    .sort((left, right) => Math.abs(left.calories - targetCalories) - Math.abs(right.calories - targetCalories))[0];

  return alternative
    ? scaleMeal({
      meal: alternative,
      targetCalories,
      rule: normalizedMeals.mealRules[slotId],
      chosenReason: `Swapped within a similar calorie band using your currently eligible ${slotId} options.`,
    })
    : null;
};

export const getRecipeForMeal = (entry) => {
  if (!entry?.recipe) return null;
  return {
    title: entry.dishName,
    cookTime: entry.recipe.cookTime,
    steps: entry.recipe.steps || [],
    tips: entry.recipe.tips || '',
  };
};

export const isMealSlotId = (value) => mealSlotIds.has(value);
