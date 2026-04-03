import { createEmptyMealsState, normalizeMealsState } from './meals.js';

const STORAGE_KEY = 'life-atlas-dashboard-v4';

const defaultHiddenPlannerSections = ['reminders'];
const defaultHeaderMode = 'auto';
const defaultFamilyTreeView = {
  focusMode: 'lineage',
  isolateBranch: false,
  layoutDensity: 'balanced',
  showGenerationLabels: true,
  viewRootPersonId: 'person-self',
};

const defaultProfile = {
  fullName: '',
  preferredName: '',
  headline: '',
  birthDate: '',
  city: '',
  country: 'India',
  email: '',
  phone: '',
  occupation: '',
  languages: 'English, Hindi',
  photoUrl: '',
  bio: '',
  values: '',
  goals: '',
  heightCm: '',
  notes: '',
};

const defaultGoals = {
  targetWeightKg: '',
  weeklyWorkoutMinutes: '150',
  stepTarget: '8000',
  sleepTarget: '7.5',
};

const createEmptyPerson = (overrides = {}) => ({
  id: crypto.randomUUID(),
  name: '',
  relationKey: 'custom',
  relationLabel: '',
  relationHindi: '',
  relationGroup: 'custom',
  anchorId: '',
  birthYear: '',
  birthday: '',
  location: '',
  email: '',
  phone: '',
  medicalNotes: '',
  note: '',
  x: 160,
  y: 160,
  ...overrides,
});

const createFamilyChart = (overrides = {}) => ({
  id: crypto.randomUUID(),
  name: 'Family chart',
  rootPersonId: 'person-self',
  createdAt: new Date().toISOString(),
  ...overrides,
});

const createEmptyReminder = (overrides = {}) => ({
  id: crypto.randomUUID(),
  title: '',
  dueAt: '',
  type: 'personal',
  status: 'pending',
  notes: '',
  createdAt: new Date().toISOString(),
  ...overrides,
});

const createEmptyMedicine = (overrides = {}) => ({
  id: crypto.randomUUID(),
  name: '',
  dose: '',
  schedule: 'daily',
  times: '',
  purpose: '',
  startDate: '',
  endDate: '',
  relatedPersonId: 'person-self',
  active: true,
  notes: '',
  takenLog: [],
  ...overrides,
});

const createEmptyQuickNote = (overrides = {}) => ({
  id: crypto.randomUUID(),
  text: '',
  category: 'general',
  createdAt: new Date().toISOString(),
  ...overrides,
});

export const createEmptyStore = () => ({
  version: 5,
  profile: { ...defaultProfile },
  family: {
    selectedPersonId: 'person-self',
    activeChartId: 'chart-main',
    charts: [
      createFamilyChart({
        id: 'chart-main',
        name: 'Main family chart',
        rootPersonId: 'person-self',
      }),
    ],
    people: [
      createEmptyPerson({
        id: 'person-self',
        name: 'You',
        relationKey: 'self',
        relationGroup: 'self',
        x: 140,
        y: 160,
      }),
    ],
    relationships: [],
  },
  fitness: {
    goals: { ...defaultGoals },
    entries: [],
  },
  planner: {
    reminders: [],
    medicines: [],
    quickNotes: [],
  },
  meals: createEmptyMealsState(),
  preferences: {
    dashboardMode: 'today',
    hiddenTabs: [],
    hiddenPlannerSections: [...defaultHiddenPlannerSections],
    headerMode: defaultHeaderMode,
    hiddenHeaderControls: [],
    familyTreeView: { ...defaultFamilyTreeView },
  },
  updatedAt: null,
});

export const createPerson = (overrides = {}) => createEmptyPerson(overrides);
export const createSavedFamilyChart = (overrides = {}) => createFamilyChart(overrides);
export const createReminder = (overrides = {}) => createEmptyReminder(overrides);
export const createMedicine = (overrides = {}) => createEmptyMedicine(overrides);
export const createQuickNote = (overrides = {}) => createEmptyQuickNote(overrides);

const normalizeProfile = (profile = {}) => ({
  ...defaultProfile,
  ...profile,
});

const normalizePeople = (people = []) => {
  const normalized = [...people].map((person, index) => createEmptyPerson({
    ...person,
    relationGroup: person?.relationGroup || 'custom',
    anchorId: person?.anchorId || '',
    x: Number.isFinite(Number(person?.x)) ? Number(person.x) : 140 + (index % 4) * 240,
    y: Number.isFinite(Number(person?.y)) ? Number(person.y) : 140 + Math.floor(index / 4) * 170,
  }));

  if (!normalized.some((person) => person.id === 'person-self')) {
    normalized.unshift(createEmptyPerson({
      id: 'person-self',
      name: 'You',
      relationKey: 'self',
      relationGroup: 'self',
      x: 140,
      y: 160,
    }));
  }

  return normalized;
};

const normalizeRelationships = (relationships = [], people = []) => {
  const personIds = new Set(people.map((person) => person.id));

  return [...relationships]
    .filter((relationship) => personIds.has(relationship?.sourceId) && personIds.has(relationship?.targetId))
    .map((relationship) => ({
      id: relationship?.id || crypto.randomUUID(),
      sourceId: relationship.sourceId,
      targetId: relationship.targetId,
      type: relationship?.type || 'custom',
      label: relationship?.label || '',
      labelHindi: relationship?.labelHindi || '',
    }));
};

const normalizeFamilyCharts = (charts = [], people = []) => {
  const personIds = new Set(people.map((person) => person.id));
  const normalizedCharts = [...charts]
    .filter(Boolean)
    .map((chart) => createFamilyChart({
      ...chart,
      rootPersonId: personIds.has(chart?.rootPersonId) ? chart.rootPersonId : 'person-self',
      name: chart?.name?.trim() || 'Family chart',
      createdAt: chart?.createdAt || new Date().toISOString(),
    }));

  if (!normalizedCharts.some((chart) => chart.id === 'chart-main')) {
    normalizedCharts.unshift(createFamilyChart({
      id: 'chart-main',
      name: 'Main family chart',
      rootPersonId: 'person-self',
    }));
  }

  return normalizedCharts;
};

const normalizeGoals = (goals = {}) => ({
  ...defaultGoals,
  ...goals,
});

const normalizeEntries = (entries = []) => [...entries]
  .filter(Boolean)
  .map((entry) => ({
    id: entry?.id || crypto.randomUUID(),
    date: entry?.date || '',
    weightKg: entry?.weightKg || '',
    bodyFatPct: entry?.bodyFatPct || '',
    waistCm: entry?.waistCm || '',
    chestCm: entry?.chestCm || '',
    hipCm: entry?.hipCm || '',
    restingHeartRate: entry?.restingHeartRate || '',
    steps: entry?.steps || '',
    sleepHours: entry?.sleepHours || '',
    workoutMinutes: entry?.workoutMinutes || '',
    waterLiters: entry?.waterLiters || '',
    note: entry?.note || '',
  }))
  .sort((left, right) => String(right.date).localeCompare(String(left.date)));

const normalizeReminders = (reminders = []) => [...reminders]
  .filter(Boolean)
  .map((reminder) => createEmptyReminder({
    ...reminder,
    status: reminder?.status === 'done' ? 'done' : 'pending',
    dueAt: reminder?.dueAt || '',
    createdAt: reminder?.createdAt || new Date().toISOString(),
  }))
  .sort((left, right) => (
    Number(left.status === 'done') - Number(right.status === 'done')
    || String(left.dueAt || '').localeCompare(String(right.dueAt || ''))
    || String(right.createdAt || '').localeCompare(String(left.createdAt || ''))
  ));

const normalizeMedicines = (medicines = []) => [...medicines]
  .filter(Boolean)
  .map((medicine) => createEmptyMedicine({
    ...medicine,
    active: medicine?.active !== false,
    takenLog: Array.isArray(medicine?.takenLog) ? medicine.takenLog.filter(Boolean) : [],
  }))
  .sort((left, right) => Number(right.active) - Number(left.active) || String(left.name || '').localeCompare(String(right.name || '')));

const normalizeQuickNotes = (quickNotes = []) => [...quickNotes]
  .filter(Boolean)
  .map((note) => createEmptyQuickNote({
    ...note,
    createdAt: note?.createdAt || new Date().toISOString(),
  }))
  .sort((left, right) => String(right.createdAt || '').localeCompare(String(left.createdAt || '')));

const normalizePreferences = (preferences = {}) => ({
  dashboardMode: preferences?.dashboardMode === 'deep' ? 'deep' : 'today',
  hiddenTabs: Array.isArray(preferences?.hiddenTabs)
    ? [...new Set(preferences.hiddenTabs.filter((value) => typeof value === 'string' && value !== 'home'))]
    : [],
  hiddenPlannerSections: (() => {
    const hidden = Array.isArray(preferences?.hiddenPlannerSections)
      ? preferences.hiddenPlannerSections.filter((value) => typeof value === 'string')
      : [];
    return [...new Set([...defaultHiddenPlannerSections, ...hidden])];
  })(),
  headerMode: preferences?.headerMode === 'persistent' ? 'persistent' : defaultHeaderMode,
  hiddenHeaderControls: Array.isArray(preferences?.hiddenHeaderControls)
    ? [...new Set(preferences.hiddenHeaderControls.filter((value) => typeof value === 'string'))]
    : [],
  familyTreeView: {
    focusMode: preferences?.familyTreeView?.focusMode === 'direct' ? 'direct' : defaultFamilyTreeView.focusMode,
    isolateBranch: Boolean(preferences?.familyTreeView?.isolateBranch),
    layoutDensity: ['compact', 'balanced', 'spacious'].includes(preferences?.familyTreeView?.layoutDensity)
      ? preferences.familyTreeView.layoutDensity
      : defaultFamilyTreeView.layoutDensity,
    showGenerationLabels: preferences?.familyTreeView?.showGenerationLabels !== false,
    viewRootPersonId: typeof preferences?.familyTreeView?.viewRootPersonId === 'string' && preferences.familyTreeView.viewRootPersonId.trim()
      ? preferences.familyTreeView.viewRootPersonId
      : defaultFamilyTreeView.viewRootPersonId,
  },
});

export const normalizeDashboard = (raw = {}) => {
  const base = createEmptyStore();
  const people = normalizePeople(raw?.family?.people || base.family.people);
  const charts = normalizeFamilyCharts(raw?.family?.charts || base.family.charts, people);

  return {
    version: 5,
    profile: normalizeProfile(raw?.profile),
    family: {
      activeChartId: raw?.family?.activeChartId && charts.some((chart) => chart.id === raw.family.activeChartId)
        ? raw.family.activeChartId
        : charts[0]?.id || 'chart-main',
      charts,
      selectedPersonId: raw?.family?.selectedPersonId && people.some((person) => person.id === raw.family.selectedPersonId)
        ? raw.family.selectedPersonId
        : 'person-self',
      people,
      relationships: normalizeRelationships(raw?.family?.relationships, people),
    },
    fitness: {
      goals: normalizeGoals(raw?.fitness?.goals),
      entries: normalizeEntries(raw?.fitness?.entries),
    },
    planner: {
      reminders: normalizeReminders(raw?.planner?.reminders),
      medicines: normalizeMedicines(raw?.planner?.medicines),
      quickNotes: normalizeQuickNotes(raw?.planner?.quickNotes),
    },
    meals: normalizeMealsState(raw?.meals),
    preferences: normalizePreferences(raw?.preferences),
    updatedAt: raw?.updatedAt || null,
  };
};

export const loadDashboard = () => {
  if (typeof window === 'undefined') return createEmptyStore();

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return createEmptyStore();
    return normalizeDashboard(JSON.parse(raw));
  } catch {
    return createEmptyStore();
  }
};

export const saveDashboard = (dashboard) => {
  if (typeof window === 'undefined') return;
  const next = {
    ...normalizeDashboard(dashboard),
    updatedAt: new Date().toISOString(),
  };
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
};

export const hasMeaningfulDashboardData = (dashboard) => {
  const next = normalizeDashboard(dashboard);
  return Boolean(
    next.profile.fullName
    || next.profile.preferredName
    || next.profile.bio
    || next.family.people.length > 1
    || next.fitness.entries.length > 0
    || next.planner.reminders.length > 0
    || next.planner.medicines.length > 0
    || next.planner.quickNotes.length > 0
    || next.meals.generatedPlans.length > 0
    || next.meals.pantryItems.length > 0
    || next.meals.aiGuidance.length > 0
    || Object.values(next.meals.mealRules || {}).some((rule) => (
      rule.fixedItems.length > 0 || rule.flexibleItems.length > 0 || rule.exampleMeals.length > 0
    ))
  );
};

export const downloadJsonFile = (filename, payload) => {
  if (typeof window === 'undefined') return;

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.URL.revokeObjectURL(url);
};
