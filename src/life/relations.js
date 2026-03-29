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

const relationGenerationDelta = {
  self: 0,
  father: -1,
  mother: -1,
  spouse: 0,
  son: 1,
  daughter: 1,
  brother: 0,
  sister: 0,
  grandfather: -2,
  grandmother: -2,
  uncle: -1,
  aunt: -1,
  cousin: 0,
  nephew: 1,
  niece: 1,
  grandson: 2,
  granddaughter: 2,
  fatherInLaw: -1,
  motherInLaw: -1,
  brotherInLaw: 0,
  sisterInLaw: 0,
  friend: 0,
  custom: 0,
};

const relationSideBias = {
  father: -1,
  mother: 1,
  spouse: 1,
  son: -1,
  daughter: 1,
  brother: -1,
  sister: 1,
  grandfather: -1,
  grandmother: 1,
  uncle: -1,
  aunt: 1,
  cousin: 0,
  nephew: -1,
  niece: 1,
  grandson: -1,
  granddaughter: 1,
  fatherInLaw: -1,
  motherInLaw: 1,
  brotherInLaw: -1,
  sisterInLaw: 1,
  friend: 0,
  custom: 0,
  self: 0,
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

export const getRelationGenerationDelta = (value) => relationGenerationDelta[value] ?? 0;

export const getRelationSideBias = (value) => relationSideBias[value] ?? 0;

export const getRelationConnectionType = (value) => {
  const group = getRelationBlueprint(value).group;
  if (group === 'spouse') return 'spouse';
  if (group === 'parent' || group === 'elder') return 'parent';
  if (group === 'child' || group === 'descendant') return 'child';
  if (group === 'sibling') return 'sibling';
  return 'custom';
};

export const getCanonicalRelationshipKey = (relationship) => {
  if (!relationship?.sourceId || !relationship?.targetId) return '';
  const type = relationship.type || 'custom';
  const left = String(relationship.sourceId);
  const right = String(relationship.targetId);
  const normalizedLabel = normalizeLookup(relationship.label || 'custom');

  if (type === 'parent') {
    return `parent:${left}:${right}`;
  }

  if (type === 'child') {
    return `parent:${right}:${left}`;
  }

  if (type === 'spouse' || type === 'sibling') {
    return `${type}:${[left, right].sort().join(':')}`;
  }

  if (type === 'guardian') {
    return `guardian:${left}:${right}`;
  }

  if (
    normalizedLabel.includes('father of')
    || normalizedLabel.includes('mother of')
    || normalizedLabel.includes('grandfather of')
    || normalizedLabel.includes('grandmother of')
    || normalizedLabel.includes('uncle of')
    || normalizedLabel.includes('aunt of')
    || normalizedLabel.includes('father in law of')
    || normalizedLabel.includes('mother in law of')
  ) {
    return `parent:${left}:${right}`;
  }

  if (
    normalizedLabel.includes('son of')
    || normalizedLabel.includes('daughter of')
    || normalizedLabel.includes('grandson of')
    || normalizedLabel.includes('granddaughter of')
    || normalizedLabel.includes('nephew of')
    || normalizedLabel.includes('niece of')
    || normalizedLabel.includes('child of')
  ) {
    return `parent:${right}:${left}`;
  }

  if (normalizedLabel.includes('spouse of')) {
    return `spouse:${[left, right].sort().join(':')}`;
  }

  if (
    normalizedLabel.includes('brother of')
    || normalizedLabel.includes('sister of')
    || normalizedLabel.includes('cousin of')
    || normalizedLabel.includes('brother in law of')
    || normalizedLabel.includes('sister in law of')
    || normalizedLabel.includes('sibling of')
  ) {
    return `sibling:${[left, right].sort().join(':')}`;
  }

  return `custom:${[left, right].sort().join(':')}:${normalizedLabel}`;
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
  const type = getRelationConnectionType(person.relationKey);
  return {
    id: crypto.randomUUID(),
    sourceId: person.id,
    targetId: anchorPerson.id,
    type,
    label: blueprint.lineLabel,
    labelHindi: blueprint.lineHindi,
  };
};

export const normalizeNameToken = (value) => normalizeLookup(value);
