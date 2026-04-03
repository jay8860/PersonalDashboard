import { addDays, format, parseISO } from 'date-fns';

export const mealSlotDefinitions = [
  { id: 'breakfast', label: 'Breakfast' },
  { id: 'snack1', label: 'Snack 1' },
  { id: 'lunch', label: 'Lunch' },
  { id: 'snack2', label: 'Snack 2' },
  { id: 'dinner', label: 'Dinner' },
];

const mealSlotIds = new Set(mealSlotDefinitions.map((slot) => slot.id));

const normalizeStringList = (values = []) => [...new Set(
  (Array.isArray(values) ? values : [])
    .map((value) => String(value || '').trim())
    .filter(Boolean),
)];

const createEmptyMealRule = (overrides = {}) => ({
  fixedItems: [],
  flexibleItems: [],
  exampleMeals: [],
  note: '',
  ...overrides,
});

const createEmptyMealEntry = (overrides = {}) => ({
  items: [],
  note: '',
  portion: '',
  prepNote: '',
  completed: false,
  ...overrides,
});

export const createEmptyMealsState = () => ({
  objective: 'Lean muscle',
  planLengthDays: 30,
  whatsappNumber: '',
  pantryItems: [],
  excludedItems: [],
  aiGuidance: [],
  mealRules: Object.fromEntries(
    mealSlotDefinitions.map((slot) => [slot.id, createEmptyMealRule()]),
  ),
  generatedPlans: [],
});

export const normalizeMealRule = (rule = {}) => createEmptyMealRule({
  ...rule,
  fixedItems: normalizeStringList(rule?.fixedItems),
  flexibleItems: normalizeStringList(rule?.flexibleItems),
  exampleMeals: normalizeStringList(rule?.exampleMeals),
  note: String(rule?.note || '').trim(),
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
      meals: Object.fromEntries(
        mealSlotDefinitions.map((slot) => [
          slot.id,
          createEmptyMealEntry({
            ...plan?.meals?.[slot.id],
            items: normalizeStringList(plan?.meals?.[slot.id]?.items),
            note: String(plan?.meals?.[slot.id]?.note || '').trim(),
            portion: String(plan?.meals?.[slot.id]?.portion || '').trim(),
            prepNote: String(plan?.meals?.[slot.id]?.prepNote || '').trim(),
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
    mealRules,
    generatedPlans,
  };
};

const formatPool = (items = [], excluded = new Set()) => normalizeStringList(items)
  .filter((item) => !excluded.has(item.toLowerCase()));

const pickRotatingItems = (items = [], count = 1, seed = 0) => {
  if (items.length === 0 || count <= 0) return [];
  const picks = [];

  for (let index = 0; index < Math.min(count, items.length); index += 1) {
    picks.push(items[(seed + index) % items.length]);
  }

  return picks;
};

const buildMealEntry = ({ slot, rule, pantryItems, excludedLookup, dayIndex }) => {
  const fixedItems = formatPool(rule.fixedItems, excludedLookup);
  const flexibleItems = formatPool(rule.flexibleItems, excludedLookup);
  const exampleMeals = formatPool(rule.exampleMeals, excludedLookup);
  const sharedPool = formatPool(pantryItems, excludedLookup).filter((item) => !fixedItems.includes(item));

  const targetFlexibleCount = slot.id.startsWith('snack') ? 1 : 2;
  const rotatingPool = flexibleItems.length ? flexibleItems : sharedPool;
  const selectedExample = exampleMeals.length
    ? exampleMeals[(dayIndex + mealSlotDefinitions.findIndex((definition) => definition.id === slot.id)) % exampleMeals.length]
    : '';
  const extraItems = selectedExample
    ? [selectedExample]
    : pickRotatingItems(
      rotatingPool.filter((item) => !fixedItems.includes(item)),
      targetFlexibleCount,
      dayIndex + mealSlotDefinitions.findIndex((definition) => definition.id === slot.id),
    );

  const items = normalizeStringList([...fixedItems, ...extraItems]);

  return createEmptyMealEntry({
    items,
    note: rule.note,
    portion: '',
    prepNote: '',
  });
};

export const generateMealPlans = (meals, options = {}) => {
  const normalizedMeals = normalizeMealsState(meals);
  const startDate = options?.startDate || new Date().toISOString().slice(0, 10);
  const parsedStart = parseISO(startDate);
  const totalDays = Number(options?.days) || normalizedMeals.planLengthDays || 30;
  const excludedLookup = new Set(normalizedMeals.excludedItems.map((item) => item.toLowerCase()));

  return Array.from({ length: totalDays }, (_, index) => {
    const date = format(addDays(parsedStart, index), 'yyyy-MM-dd');

    return {
      id: crypto.randomUUID(),
      date,
      meals: Object.fromEntries(
        mealSlotDefinitions.map((slot) => [
          slot.id,
          buildMealEntry({
            slot,
            rule: normalizedMeals.mealRules[slot.id],
            pantryItems: normalizedMeals.pantryItems,
            excludedLookup,
            dayIndex: index,
          }),
        ]),
      ),
      createdAt: new Date().toISOString(),
    };
  });
};

export const formatMealPlanForSharing = (plan, mealsState) => {
  if (!plan) return '';
  const objective = String(mealsState?.objective || '').trim();
  const heading = `Meal plan for ${format(parseISO(plan.date), 'EEE, dd MMM')}`;
  const intro = objective ? `Goal: ${objective}` : '';

  return [
    heading,
    intro,
    ...mealSlotDefinitions.map((slot) => {
      const entry = plan.meals?.[slot.id];
      const items = (entry?.items || []).join(', ') || 'TBD';
      const portion = entry?.portion ? ` | Portion: ${entry.portion}` : '';
      const note = entry?.note ? ` | Note: ${entry.note}` : '';
      return `${slot.label}: ${items}${portion}${note}`;
    }),
  ].filter(Boolean).join('\n');
};

export const getUpcomingMealPlan = (plans = [], today = new Date().toISOString().slice(0, 10)) => (
  [...plans].find((plan) => plan.date >= today) || plans[0] || null
);

export const getMealCompletionSummary = (plan) => {
  if (!plan) return { completed: 0, total: mealSlotDefinitions.length };
  const completed = mealSlotDefinitions.filter((slot) => plan.meals?.[slot.id]?.completed).length;
  return {
    completed,
    total: mealSlotDefinitions.length,
  };
};

export const isMealSlotId = (value) => mealSlotIds.has(value);
