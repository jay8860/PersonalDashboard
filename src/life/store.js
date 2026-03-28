const STORAGE_KEY = 'life-atlas-dashboard-v2';

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
  note: '',
  x: 160,
  y: 160,
  ...overrides,
});

export const createEmptyStore = () => ({
  version: 2,
  profile: { ...defaultProfile },
  family: {
    selectedPersonId: 'person-self',
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
  updatedAt: null,
});

export const createPerson = (overrides = {}) => createEmptyPerson(overrides);

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

export const normalizeDashboard = (raw = {}) => {
  const base = createEmptyStore();
  const people = normalizePeople(raw?.family?.people || base.family.people);

  return {
    version: 2,
    profile: normalizeProfile(raw?.profile),
    family: {
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
  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      ...normalizeDashboard(dashboard),
      updatedAt: new Date().toISOString(),
    }),
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
