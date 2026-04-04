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
  recipe: null,
  substitutions: [],
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

export const createEmptyMealsState = () => ({
  objective: 'Lean muscle',
  planLengthDays: 7,
  whatsappNumber: '',
  pantryItems: [],
  excludedItems: [],
  aiGuidance: [],
  plannerProfile: createDefaultPlannerProfile(),
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
      summary: plan.summary || null,
      meals: Object.fromEntries(
        mealSlotDefinitions.map((slot) => [
          slot.id,
          createEmptyMealEntry({
            ...plan?.meals?.[slot.id],
            items: normalizeStringList(plan?.meals?.[slot.id]?.items),
            portionItems: Array.isArray(plan?.meals?.[slot.id]?.portionItems) ? plan.meals[slot.id].portionItems : [],
            substitutions: Array.isArray(plan?.meals?.[slot.id]?.substitutions) ? plan.meals[slot.id].substitutions : [],
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
  if (canonical === 'dal') {
    return [...availableIngredients].some((item) => item.includes('dal') || ['rajma', 'chole'].includes(item));
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

  return candidates[Math.min(dayIndex % Math.max(candidates.length, 1), Math.max(0, candidates.length - 1))]?.meal || candidates[0]?.meal || null;
};

const scaleMeal = ({ meal, targetCalories, rule }) => {
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
    recipe: meal.recipe,
    substitutions: meal.substitutions || [],
  });
};

const buildFallbackMeal = ({ slotId, targetCalories, rule }) => {
  const baseName = slotId.startsWith('snack') ? 'Custom snack plate' : 'Custom home meal';
  const items = normalizeStringList([...rule.fixedItems, ...rule.flexibleItems]).slice(0, slotId.startsWith('snack') ? 3 : 5);
  return createEmptyMealEntry({
    dishName: baseName,
    description: 'Built from the ingredients you marked as available.',
    items,
    portion: slotId.startsWith('snack') ? '1 compact serving' : '1 balanced plate',
    calories: roundToFive(targetCalories),
    protein: slotId.startsWith('snack') ? 10 : 20,
    carbs: slotId === 'lunch' ? 40 : 20,
    fat: 8,
    prepNote: rule.note || 'Use your available ingredients and keep portions aligned to the calorie target.',
    note: 'Fallback meal because the current ingredient set did not match a stronger database recipe.',
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
          ? scaleMeal({ meal: selectedMeal, targetCalories: slotTargetCalories, rule })
          : buildFallbackMeal({ slotId: slot.id, targetCalories: slotTargetCalories, rule });

        if (selectedMeal) recentMealIds.unshift(selectedMeal.id);
        if (recentMealIds.length > 8) recentMealIds.pop();

        return [slot.id, mealEntry];
      }),
    );

    return {
      id: crypto.randomUUID(),
      date,
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
      breakfast: plan.meals?.breakfast?.dishName || '—',
      lunch: plan.meals?.lunch?.dishName || '—',
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
    .filter((meal) => Math.abs(meal.calories - targetCalories) <= 80)
    .sort((left, right) => Math.abs(left.calories - targetCalories) - Math.abs(right.calories - targetCalories))[0];

  return alternative
    ? scaleMeal({ meal: alternative, targetCalories, rule: normalizedMeals.mealRules[slotId] })
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
