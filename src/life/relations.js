export const relationOptions = [
  { value: 'self', label: 'Self', hindi: 'मैं' },
  { value: 'father', label: 'Father', hindi: 'पिता' },
  { value: 'mother', label: 'Mother', hindi: 'माता' },
  { value: 'spouse', label: 'Spouse', hindi: 'जीवनसाथी' },
  { value: 'son', label: 'Son', hindi: 'बेटा' },
  { value: 'daughter', label: 'Daughter', hindi: 'बेटी' },
  { value: 'brother', label: 'Brother', hindi: 'भाई' },
  { value: 'sister', label: 'Sister', hindi: 'बहन' },
  { value: 'grandfather', label: 'Grandfather', hindi: 'दादा / नाना' },
  { value: 'grandmother', label: 'Grandmother', hindi: 'दादी / नानी' },
  { value: 'uncle', label: 'Uncle', hindi: 'चाचा / मामा / फूफा' },
  { value: 'aunt', label: 'Aunt', hindi: 'चाची / मामी / बुआ / मौसी' },
  { value: 'cousin', label: 'Cousin', hindi: 'कजिन / भाई-बहन' },
  { value: 'nephew', label: 'Nephew', hindi: 'भतीजा / भांजा' },
  { value: 'niece', label: 'Niece', hindi: 'भतीजी / भांजी' },
  { value: 'grandson', label: 'Grandson', hindi: 'पोता / नाती' },
  { value: 'granddaughter', label: 'Granddaughter', hindi: 'पोती / नातिन' },
  { value: 'fatherInLaw', label: 'Father-in-law', hindi: 'ससुर' },
  { value: 'motherInLaw', label: 'Mother-in-law', hindi: 'सास' },
  { value: 'brotherInLaw', label: 'Brother-in-law', hindi: 'जीजा / देवर / साला' },
  { value: 'sisterInLaw', label: 'Sister-in-law', hindi: 'भाभी / ननद / साली' },
  { value: 'friend', label: 'Friend', hindi: 'मित्र' },
  { value: 'custom', label: 'Custom', hindi: 'कस्टम' },
];

export const connectionOptions = [
  { value: 'parent', label: 'Parent of', hindi: 'माता-पिता' },
  { value: 'child', label: 'Child of', hindi: 'संतान' },
  { value: 'spouse', label: 'Spouse of', hindi: 'जीवनसाथी' },
  { value: 'sibling', label: 'Sibling of', hindi: 'भाई / बहन' },
  { value: 'guardian', label: 'Guardian of', hindi: 'अभिभावक' },
  { value: 'custom', label: 'Custom link', hindi: 'कस्टम लिंक' },
];

const relationBlueprints = {
  self: { group: 'self', lineLabel: 'Self', lineHindi: 'मैं' },
  father: { group: 'parent', lineLabel: 'Father of', lineHindi: 'पिता' },
  mother: { group: 'parent', lineLabel: 'Mother of', lineHindi: 'माता' },
  spouse: { group: 'spouse', lineLabel: 'Spouse of', lineHindi: 'जीवनसाथी' },
  son: { group: 'child', lineLabel: 'Son of', lineHindi: 'बेटा' },
  daughter: { group: 'child', lineLabel: 'Daughter of', lineHindi: 'बेटी' },
  brother: { group: 'sibling', lineLabel: 'Brother of', lineHindi: 'भाई' },
  sister: { group: 'sibling', lineLabel: 'Sister of', lineHindi: 'बहन' },
  grandfather: { group: 'elder', lineLabel: 'Grandfather of', lineHindi: 'दादा / नाना' },
  grandmother: { group: 'elder', lineLabel: 'Grandmother of', lineHindi: 'दादी / नानी' },
  uncle: { group: 'elder', lineLabel: 'Uncle of', lineHindi: 'चाचा / मामा / फूफा' },
  aunt: { group: 'elder', lineLabel: 'Aunt of', lineHindi: 'चाची / मामी / बुआ / मौसी' },
  cousin: { group: 'sibling', lineLabel: 'Cousin of', lineHindi: 'कजिन' },
  nephew: { group: 'child', lineLabel: 'Nephew of', lineHindi: 'भतीजा / भांजा' },
  niece: { group: 'child', lineLabel: 'Niece of', lineHindi: 'भतीजी / भांजी' },
  grandson: { group: 'descendant', lineLabel: 'Grandson of', lineHindi: 'पोता / नाती' },
  granddaughter: { group: 'descendant', lineLabel: 'Granddaughter of', lineHindi: 'पोती / नातिन' },
  fatherInLaw: { group: 'elder', lineLabel: 'Father-in-law of', lineHindi: 'ससुर' },
  motherInLaw: { group: 'elder', lineLabel: 'Mother-in-law of', lineHindi: 'सास' },
  brotherInLaw: { group: 'sibling', lineLabel: 'Brother-in-law of', lineHindi: 'जीजा / देवर / साला' },
  sisterInLaw: { group: 'sibling', lineLabel: 'Sister-in-law of', lineHindi: 'भाभी / ननद / साली' },
  friend: { group: 'friend', lineLabel: 'Friend of', lineHindi: 'मित्र' },
  custom: { group: 'custom', lineLabel: 'Related to', lineHindi: 'रिश्तेदार' },
};

const offsetPatterns = {
  self: [[0, 0]],
  parent: [[-220, -180], [220, -180], [0, -260], [-420, -180], [420, -180]],
  elder: [[-280, -320], [280, -320], [0, -400], [-500, -300], [500, -300]],
  spouse: [[260, 0], [-260, 0], [340, 90], [-340, 90]],
  sibling: [[-260, 0], [260, 0], [-340, 120], [340, 120], [-420, -40], [420, -40]],
  child: [[-220, 210], [220, 210], [0, 300], [-420, 210], [420, 210]],
  descendant: [[-280, 380], [280, 380], [0, 460], [-500, 380], [500, 380]],
  friend: [[300, 0], [-300, 0], [380, 140], [-380, 140]],
  custom: [[260, 160], [-260, 160], [340, -140], [-340, -140], [0, 260]],
};

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const normalizeLookup = (value) => String(value || '')
  .trim()
  .toLowerCase()
  .replace(/[_-]+/g, ' ')
  .replace(/\s+/g, ' ');

export const getRelationMeta = (value, customLabel = '', customHindi = '') => {
  if (value === 'custom') {
    return {
      label: customLabel?.trim() || 'Custom relation',
      hindi: customHindi?.trim() || 'कस्टम रिश्ता',
    };
  }

  const option = relationOptions.find((item) => item.value === value);
  if (option) return option;

  return {
    label: customLabel?.trim() || 'Family member',
    hindi: customHindi?.trim() || 'परिवार सदस्य',
  };
};

export const getConnectionMeta = (value, customLabel = '', customHindi = '') => {
  if (value === 'custom') {
    return {
      label: customLabel?.trim() || 'Related to',
      hindi: customHindi?.trim() || 'रिश्तेदार',
    };
  }

  const option = connectionOptions.find((item) => item.value === value);
  if (option) return option;

  return {
    label: customLabel?.trim() || 'Related to',
    hindi: customHindi?.trim() || 'रिश्तेदार',
  };
};

export const resolveRelationInput = (input, fallback = 'custom') => {
  const normalized = normalizeLookup(input);
  if (!normalized) {
    return relationOptions.find((option) => option.value === fallback) || relationOptions[relationOptions.length - 1];
  }

  const exactMatch = relationOptions.find((option) => (
    normalizeLookup(option.value) === normalized
    || normalizeLookup(option.label) === normalized
    || normalizeLookup(option.hindi) === normalized
  ));

  if (exactMatch) return exactMatch;

  const partialMatch = relationOptions.find((option) => (
    normalizeLookup(option.label).includes(normalized)
    || normalizeLookup(option.value).includes(normalized)
    || normalizeLookup(option.hindi).includes(normalized)
  ));

  return partialMatch || relationOptions.find((option) => option.value === fallback) || relationOptions[relationOptions.length - 1];
};

export const getRelationBlueprint = (value, customLabel = '', customHindi = '') => {
  const relationMeta = getRelationMeta(value, customLabel, customHindi);
  const defaults = relationBlueprints[value] || relationBlueprints.custom;

  return {
    ...defaults,
    relationLabel: relationMeta.label,
    relationHindi: relationMeta.hindi,
    lineLabel: value === 'custom' ? relationMeta.label || defaults.lineLabel : defaults.lineLabel,
    lineHindi: value === 'custom' ? relationMeta.hindi || defaults.lineHindi : defaults.lineHindi,
  };
};

export const suggestFamilyPosition = ({ anchorPerson, relationKey, customLabel = '', customHindi = '', people = [], minX = 32, maxX = 1660, minY = 32, maxY = 1040 }) => {
  const blueprint = getRelationBlueprint(relationKey, customLabel, customHindi);
  const group = blueprint.group || 'custom';
  const patterns = offsetPatterns[group] || offsetPatterns.custom;
  const relatedCount = people.filter((person) => person.anchorId === anchorPerson.id && person.relationGroup === group).length;
  const [baseX, baseY] = patterns[relatedCount % patterns.length];
  const ring = Math.floor(relatedCount / patterns.length);
  const spread = ring * 72;

  return {
    x: clamp(anchorPerson.x + baseX + (baseX >= 0 ? spread : -spread), minX, maxX),
    y: clamp(anchorPerson.y + baseY + (baseY >= 0 ? spread * 0.55 : -spread * 0.35), minY, maxY),
    relationGroup: group,
  };
};

export const buildAutoRelationship = ({ person, anchorPerson }) => {
  if (person == null || anchorPerson == null) return null;
  if (person.id === anchorPerson.id) return null;
  if (person.relationKey === 'self') return null;

  const blueprint = getRelationBlueprint(person.relationKey, person.relationLabel, person.relationHindi);
  return {
    id: crypto.randomUUID(),
    sourceId: person.id,
    targetId: anchorPerson.id,
    type: 'custom',
    label: blueprint.lineLabel,
    labelHindi: blueprint.lineHindi,
  };
};

export const normalizeNameToken = (value) => normalizeLookup(value);
