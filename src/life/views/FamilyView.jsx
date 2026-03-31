import { useEffect, useMemo, useRef, useState } from 'react';
import { GitBranchPlus, Link2, RefreshCcw, ScanSearch, Search, Trash2, Upload, UserPlus2, ZoomIn, ZoomOut } from 'lucide-react';
import {
  connectionOptions,
  getCanonicalRelationshipKey,
  getConnectionMeta,
  getRelationGenerationDelta,
  getRelationMeta,
  getRelationSideBias,
  relationOptions,
} from '../relations.js';

const CARD_WIDTH = 220;
const CARD_HEIGHT = 132;
const PARTNER_GAP = 22;

const densityPresets = {
  compact: {
    unitGap: 68,
    siblingGap: 42,
    clusterGap: 112,
    rowGap: 248,
    canvasPaddingX: 96,
    canvasPaddingY: 74,
    minCanvasWidth: 1920,
    rootGap: 148,
  },
  balanced: {
    unitGap: 84,
    siblingGap: 56,
    clusterGap: 144,
    rowGap: 284,
    canvasPaddingX: 120,
    canvasPaddingY: 88,
    minCanvasWidth: 2280,
    rootGap: 192,
  },
  spacious: {
    unitGap: 104,
    siblingGap: 74,
    clusterGap: 180,
    rowGap: 332,
    canvasPaddingX: 156,
    canvasPaddingY: 104,
    minCanvasWidth: 2720,
    rootGap: 248,
  },
};

const pairedRelationMatchers = {
  father: 'mother',
  mother: 'father',
  grandfather: 'grandmother',
  grandmother: 'grandfather',
  fatherInLaw: 'motherInLaw',
  motherInLaw: 'fatherInLaw',
};

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
const normalizePersonName = (value) => String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');

const numericBirthYear = (value) => {
  const parsed = Number.parseInt(String(value || ''), 10);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
};

const sortPeople = (left, right) => {
  const leftBirth = numericBirthYear(left.birthYear);
  const rightBirth = numericBirthYear(right.birthYear);
  if (Number.isFinite(leftBirth) && Number.isFinite(rightBirth) && leftBirth !== rightBirth) {
    return leftBirth - rightBirth;
  }
  return String(left.name || '').localeCompare(String(right.name || ''));
};

const createPersonDraft = (people = []) => ({
  name: '',
  relationKey: 'father',
  relationLabel: '',
  relationHindi: '',
  anchorId: people[0]?.id || 'person-self',
  birthYear: '',
  note: '',
});

const createRelationshipDraft = (people = []) => ({
  sourceId: people[0]?.id || 'person-self',
  type: 'custom',
  targetId: people[1]?.id || '',
  label: 'Related to',
  labelHindi: 'रिश्तेदार',
});

const getRowLabel = (generation) => {
  if (generation <= -2) return 'Grandparents and older generation';
  if (generation === -1) return 'Parents and elder generation';
  if (generation === 0) return 'Your generation';
  if (generation === 1) return 'Children and younger generation';
  if (generation >= 2) return 'Grandchildren and next generation';
  return 'Family generation';
};

const directRelationMetaMap = {
  self: { label: 'Self', hindi: 'मैं' },
  father: { label: 'Father', hindi: 'पिता' },
  mother: { label: 'Mother', hindi: 'माता' },
  parent: { label: 'Parent', hindi: 'माता-पिता' },
  spouse: { label: 'Spouse', hindi: 'जीवनसाथी' },
  son: { label: 'Son', hindi: 'बेटा' },
  daughter: { label: 'Daughter', hindi: 'बेटी' },
  child: { label: 'Child', hindi: 'संतान' },
  brother: { label: 'Brother', hindi: 'भाई' },
  sister: { label: 'Sister', hindi: 'बहन' },
  sibling: { label: 'Sibling', hindi: 'भाई / बहन' },
  grandfather: { label: 'Grandfather', hindi: 'दादा / नाना' },
  grandmother: { label: 'Grandmother', hindi: 'दादी / नानी' },
  grandparent: { label: 'Grandparent', hindi: 'दादा-दादी / नाना-नानी' },
  uncle: { label: 'Uncle', hindi: 'चाचा / मामा / फूफा' },
  aunt: { label: 'Aunt', hindi: 'चाची / मामी / बुआ / मौसी' },
  cousin: { label: 'Cousin', hindi: 'कजिन' },
  nephew: { label: 'Nephew', hindi: 'भतीजा / भांजा' },
  niece: { label: 'Niece', hindi: 'भतीजी / भांजी' },
  grandson: { label: 'Grandson', hindi: 'पोता / नाती' },
  granddaughter: { label: 'Granddaughter', hindi: 'पोती / नातिन' },
  grandchild: { label: 'Grandchild', hindi: 'पोता / पोती / नाती / नातिन' },
  fatherInLaw: { label: 'Father-in-law', hindi: 'ससुर' },
  motherInLaw: { label: 'Mother-in-law', hindi: 'सास' },
  parentInLaw: { label: 'Parent-in-law', hindi: 'सास / ससुर' },
  brotherInLaw: { label: 'Brother-in-law', hindi: 'जीजा / देवर / साला' },
  sisterInLaw: { label: 'Sister-in-law', hindi: 'भाभी / ननद / साली' },
  siblingInLaw: { label: 'Sibling-in-law', hindi: 'जीजा / भाभी / देवर / ननद / साला / साली' },
  childInLaw: { label: 'Child-in-law', hindi: 'बहू / दामाद' },
  friend: { label: 'Friend', hindi: 'मित्र' },
  custom: { label: 'Family member', hindi: 'परिवार सदस्य' },
};

const isOneOf = (value, options) => options.includes(value);

const composeParentRelation = (anchorKey, relationKey) => {
  if (isOneOf(anchorKey, ['self', 'brother', 'sister', 'sibling'])) return relationKey;
  if (isOneOf(anchorKey, ['spouse', 'brotherInLaw', 'sisterInLaw', 'siblingInLaw'])) {
    return relationKey === 'father' ? 'fatherInLaw' : 'motherInLaw';
  }
  if (isOneOf(anchorKey, ['son', 'daughter', 'child'])) return 'parent';
  if (isOneOf(anchorKey, ['cousin', 'nephew', 'niece'])) return relationKey === 'father' ? 'uncle' : 'aunt';
  return relationKey;
};

const composeChildRelation = (anchorKey, relationKey) => {
  if (isOneOf(anchorKey, ['self', 'spouse'])) return relationKey;
  if (isOneOf(anchorKey, ['father', 'mother', 'parent'])) return relationKey === 'son' ? 'brother' : 'sister';
  if (isOneOf(anchorKey, ['brother', 'sister', 'sibling', 'brotherInLaw', 'sisterInLaw', 'siblingInLaw'])) {
    return relationKey === 'son' ? 'nephew' : 'niece';
  }
  if (isOneOf(anchorKey, ['uncle', 'aunt', 'cousin'])) return 'cousin';
  if (isOneOf(anchorKey, ['son', 'daughter', 'child'])) return relationKey === 'son' ? 'grandson' : 'granddaughter';
  return relationKey;
};

const composeSiblingRelation = (anchorKey, relationKey) => {
  if (isOneOf(anchorKey, ['self', 'brother', 'sister', 'sibling'])) return relationKey;
  if (isOneOf(anchorKey, ['father', 'mother', 'parent', 'grandfather', 'grandmother', 'grandparent'])) {
    return relationKey === 'brother' ? 'uncle' : 'aunt';
  }
  if (isOneOf(anchorKey, ['spouse', 'brotherInLaw', 'sisterInLaw', 'siblingInLaw'])) {
    return relationKey === 'brother' ? 'brotherInLaw' : 'sisterInLaw';
  }
  if (isOneOf(anchorKey, ['son', 'daughter', 'child', 'grandson', 'granddaughter', 'grandchild'])) {
    return relationKey === 'brother' ? 'son' : 'daughter';
  }
  if (anchorKey === 'cousin') return 'cousin';
  return relationKey;
};

const composeSpouseRelation = (anchorKey) => {
  if (anchorKey === 'self') return 'spouse';
  if (isOneOf(anchorKey, ['father', 'mother', 'parent'])) return 'parent';
  if (isOneOf(anchorKey, ['brother', 'sister', 'sibling'])) return 'siblingInLaw';
  if (isOneOf(anchorKey, ['son', 'daughter', 'child'])) return 'childInLaw';
  if (anchorKey === 'uncle') return 'aunt';
  if (anchorKey === 'aunt') return 'uncle';
  if (anchorKey === 'grandfather') return 'grandmother';
  if (anchorKey === 'grandmother') return 'grandfather';
  if (isOneOf(anchorKey, ['grandparent'])) return 'grandparent';
  if (isOneOf(anchorKey, ['cousin', 'friend'])) return anchorKey;
  if (isOneOf(anchorKey, ['fatherInLaw', 'motherInLaw', 'parentInLaw'])) return 'parentInLaw';
  if (isOneOf(anchorKey, ['brotherInLaw', 'sisterInLaw', 'siblingInLaw'])) return 'siblingInLaw';
  return 'spouse';
};

const composeRelationToSelf = (anchorKey, person) => {
  if (person.id === 'person-self') return 'self';

  switch (person.relationKey) {
    case 'father':
    case 'mother':
      return composeParentRelation(anchorKey, person.relationKey);
    case 'son':
    case 'daughter':
      return composeChildRelation(anchorKey, person.relationKey);
    case 'brother':
    case 'sister':
      return composeSiblingRelation(anchorKey, person.relationKey);
    case 'spouse':
      return composeSpouseRelation(anchorKey);
    case 'grandfather':
    case 'grandmother':
      if (isOneOf(anchorKey, ['self', 'brother', 'sister', 'sibling'])) return person.relationKey;
      return 'grandparent';
    case 'uncle':
    case 'aunt':
      if (isOneOf(anchorKey, ['self', 'brother', 'sister', 'sibling'])) return person.relationKey;
      if (isOneOf(anchorKey, ['son', 'daughter', 'child'])) return person.relationKey === 'uncle' ? 'brother' : 'sister';
      return person.relationKey;
    case 'nephew':
    case 'niece':
    case 'cousin':
    case 'grandson':
    case 'granddaughter':
    case 'fatherInLaw':
    case 'motherInLaw':
    case 'brotherInLaw':
    case 'sisterInLaw':
    case 'friend':
      return person.relationKey;
    default:
      return person.relationKey || 'custom';
  }
};

const buildDirectRelationLookup = (family) => {
  const peopleById = Object.fromEntries((family.people || []).map((person) => [person.id, person]));
  const cache = new Map();

  const resolve = (personId, trail = new Set()) => {
    if (cache.has(personId)) return cache.get(personId);
    const person = peopleById[personId];
    if (!person) {
      return { key: 'custom', ...directRelationMetaMap.custom };
    }
    if (person.id === 'person-self') {
      const selfMeta = { key: 'self', ...directRelationMetaMap.self };
      cache.set(personId, selfMeta);
      return selfMeta;
    }

    if (!person.anchorId || trail.has(personId)) {
      const fallback = getRelationMeta(person.relationKey, person.relationLabel, person.relationHindi);
      const next = { key: person.relationKey || 'custom', ...fallback };
      cache.set(personId, next);
      return next;
    }

    const anchor = peopleById[person.anchorId];
    if (!anchor) {
      const fallback = getRelationMeta(person.relationKey, person.relationLabel, person.relationHindi);
      const next = { key: person.relationKey || 'custom', ...fallback };
      cache.set(personId, next);
      return next;
    }

    const anchorMeta = resolve(anchor.id, new Set([...trail, personId]));
    const directKey = composeRelationToSelf(anchorMeta.key, person);
    const next = directRelationMetaMap[directKey] || getRelationMeta(person.relationKey, person.relationLabel, person.relationHindi);
    const resolved = { key: directKey, ...next };
    cache.set(personId, resolved);
    return resolved;
  };

  return new Map((family.people || []).map((person) => [person.id, resolve(person.id)]));
};

const buildOrthogonalPath = (startX, startY, endX, endY) => {
  if (Math.abs(endY - startY) < 8) {
    return `M ${startX} ${startY} H ${endX}`;
  }

  const middleY = startY + (endY - startY) / 2;
  return `M ${startX} ${startY} V ${middleY} H ${endX} V ${endY}`;
};

const buildFamilyLayout = (family, density = 'balanced') => {
  const densityConfig = densityPresets[density] || densityPresets.balanced;
  const {
    siblingGap,
    rowGap,
    canvasPaddingX,
    canvasPaddingY,
    minCanvasWidth,
    rootGap,
  } = densityConfig;
  const people = [...(family.people || [])].sort(sortPeople);
  const peopleById = Object.fromEntries(people.map((person) => [person.id, person]));
  const generationById = new Map();

  const resolveGeneration = (personId, trail = new Set()) => {
    if (generationById.has(personId)) return generationById.get(personId);
    if (personId === 'person-self') {
      generationById.set(personId, 0);
      return 0;
    }

    const person = peopleById[personId];
    if (person == null || trail.has(personId)) return 0;

    const anchor = person.anchorId ? peopleById[person.anchorId] : null;
    const baseGeneration = anchor
      ? resolveGeneration(anchor.id, new Set([...trail, personId]))
      : 0;
    const nextGeneration = baseGeneration + getRelationGenerationDelta(person.relationKey);
    generationById.set(personId, nextGeneration);
    return nextGeneration;
  };

  people.forEach((person) => {
    resolveGeneration(person.id);
  });

  const candidatePairs = [];
  const addPairCandidate = (leftId, rightId, priority) => {
    if (!leftId || !rightId || leftId === rightId) return;
    const left = peopleById[leftId];
    const right = peopleById[rightId];
    if (left == null || right == null) return;
    if ((generationById.get(leftId) ?? 0) !== (generationById.get(rightId) ?? 0)) return;
    const [firstId, secondId] = [leftId, rightId].sort();
    candidatePairs.push({
      ids: [firstId, secondId],
      key: `pair:${firstId}:${secondId}`,
      priority,
    });
  };

  people.forEach((person) => {
    if (person.relationKey === 'spouse' && person.anchorId && peopleById[person.anchorId]) {
      addPairCandidate(person.id, person.anchorId, 30);
    }
  });

  (family.relationships || []).forEach((relationship) => {
    if (relationship.type === 'spouse') {
      addPairCandidate(relationship.sourceId, relationship.targetId, 40);
    }
  });

  const sameAnchorGroups = new Map();
  people.forEach((person) => {
    if (!person.anchorId) return;
    const key = `${person.anchorId}:${generationById.get(person.id) ?? 0}`;
    const existing = sameAnchorGroups.get(key) || [];
    existing.push(person);
    sameAnchorGroups.set(key, existing);
  });

  sameAnchorGroups.forEach((group) => {
    group.forEach((person) => {
      const matchKey = pairedRelationMatchers[person.relationKey];
      if (!matchKey) return;
      const partner = group.find((candidate) => candidate.id !== person.id && candidate.relationKey === matchKey);
      if (partner) addPairCandidate(person.id, partner.id, 20);
    });
  });

  const chosenPairs = [];
  const pairedIds = new Set();
  [...candidatePairs]
    .sort((left, right) => right.priority - left.priority || left.key.localeCompare(right.key))
    .forEach((candidate) => {
      const [leftId, rightId] = candidate.ids;
      if (pairedIds.has(leftId) || pairedIds.has(rightId)) return;
      pairedIds.add(leftId);
      pairedIds.add(rightId);
      chosenPairs.push(candidate.ids);
    });

  const units = [];
  const personToUnitKey = new Map();

  const buildUnit = (members, isCouple) => {
    const orderedMembers = [...members].sort((left, right) => (
      getRelationSideBias(left.relationKey) - getRelationSideBias(right.relationKey)
      || sortPeople(left, right)
    ));
    const key = `unit:${orderedMembers.map((member) => member.id).join(':')}`;
    const generation = generationById.get(orderedMembers[0].id) ?? 0;
    const width = orderedMembers.length * CARD_WIDTH + (orderedMembers.length - 1) * PARTNER_GAP;

    const unit = {
      key,
      members: orderedMembers,
      generation,
      sideBias: orderedMembers.reduce((sum, member) => sum + getRelationSideBias(member.relationKey), 0) / orderedMembers.length,
      width,
      isCouple,
      containsSelf: orderedMembers.some((member) => member.id === 'person-self'),
    };

    orderedMembers.forEach((member) => {
      personToUnitKey.set(member.id, key);
    });

    units.push(unit);
  };

  chosenPairs.forEach(([leftId, rightId]) => {
    buildUnit([peopleById[leftId], peopleById[rightId]], true);
  });

  people.forEach((person) => {
    if (!personToUnitKey.has(person.id)) {
      buildUnit([person], false);
    }
  });

  const unitByKey = new Map(units.map((unit) => [unit.key, unit]));
  const unitsByGeneration = new Map();
  units.forEach((unit) => {
    const existing = unitsByGeneration.get(unit.generation) || [];
    existing.push(unit);
    unitsByGeneration.set(unit.generation, existing);
  });

  const generationRows = [...unitsByGeneration.keys()].sort((left, right) => left - right);
  const rowYByGeneration = new Map(
    generationRows.map((generation, index) => [generation, canvasPaddingY + index * rowGap]),
  );

  const dedupedRelationships = [];
  const seenRelationships = new Set();
  const parentEdges = new Map();
  const parentCandidatesByChild = new Map();
  const siblingPairs = new Map();
  const peerLinksByKey = new Map();

  const addSetMap = (map, key, value) => {
    if (!key || !value) return;
    const next = map.get(key) || new Set();
    next.add(value);
    map.set(key, next);
  };

  const addParentEdge = (parentUnitKey, childUnitKey) => {
    if (!parentUnitKey || !childUnitKey || parentUnitKey === childUnitKey) return;
    const key = `${parentUnitKey}:${childUnitKey}`;
    if (parentEdges.has(key)) return;
    parentEdges.set(key, { parentUnitKey, childUnitKey });
    addSetMap(parentCandidatesByChild, childUnitKey, parentUnitKey);
  };

  const addSiblingPair = (leftUnitKey, rightUnitKey) => {
    if (!leftUnitKey || !rightUnitKey || leftUnitKey === rightUnitKey) return;
    const [left, right] = [leftUnitKey, rightUnitKey].sort();
    const key = `${left}:${right}`;
    if (siblingPairs.has(key)) return;
    siblingPairs.set(key, {
      key: `peer:${left}:${right}:sibling`,
      leftUnitKey: left,
      rightUnitKey: right,
      type: 'sibling',
      dashed: true,
    });
  };

  const addPeerLink = (leftUnitKey, rightUnitKey, type, dashed) => {
    if (!leftUnitKey || !rightUnitKey || leftUnitKey === rightUnitKey) return;
    const [left, right] = [leftUnitKey, rightUnitKey].sort();
    const key = `peer:${left}:${right}:${type}`;
    if (peerLinksByKey.has(key)) return;
    peerLinksByKey.set(key, {
      key,
      leftUnitKey: left,
      rightUnitKey: right,
      type,
      dashed,
    });
  };

  people.forEach((person) => {
    if (!person.anchorId || person.relationKey === 'spouse') return;
    const anchor = peopleById[person.anchorId];
    const sourceUnitKey = personToUnitKey.get(person.id);
    const anchorUnitKey = anchor ? personToUnitKey.get(anchor.id) : '';
    if (!anchor || !sourceUnitKey || !anchorUnitKey || sourceUnitKey === anchorUnitKey) return;

    const personGeneration = generationById.get(person.id) ?? 0;
    const anchorGeneration = generationById.get(anchor.id) ?? 0;
    if (personGeneration > anchorGeneration) {
      addParentEdge(anchorUnitKey, sourceUnitKey);
    } else if (personGeneration < anchorGeneration) {
      addParentEdge(sourceUnitKey, anchorUnitKey);
    } else if (person.relationKey === 'brother' || person.relationKey === 'sister') {
      addSiblingPair(sourceUnitKey, anchorUnitKey);
    }
  });

  (family.relationships || []).forEach((relationship) => {
    const key = getCanonicalRelationshipKey(relationship);
    if (!key || seenRelationships.has(key)) return;
    seenRelationships.add(key);
    dedupedRelationships.push(relationship);

    const sourceUnitKey = personToUnitKey.get(relationship.sourceId);
    const targetUnitKey = personToUnitKey.get(relationship.targetId);
    if (!sourceUnitKey || !targetUnitKey || sourceUnitKey === targetUnitKey) return;

    if (relationship.type === 'parent') {
      addParentEdge(sourceUnitKey, targetUnitKey);
      return;
    }

    if (relationship.type === 'child') {
      addParentEdge(targetUnitKey, sourceUnitKey);
      return;
    }

    if (relationship.type === 'spouse') return;

    if (relationship.type === 'sibling') {
      addSiblingPair(sourceUnitKey, targetUnitKey);
      return;
    }

    addPeerLink(
      sourceUnitKey,
      targetUnitKey,
      relationship.type,
      relationship.type === 'custom' || relationship.type === 'guardian',
    );
  });

  let changed = true;
  while (changed) {
    changed = false;
    siblingPairs.forEach((pair) => {
      const leftParents = parentCandidatesByChild.get(pair.leftUnitKey) || new Set();
      const rightParents = parentCandidatesByChild.get(pair.rightUnitKey) || new Set();
      const mergedParents = new Set([...leftParents, ...rightParents]);
      if (mergedParents.size === 0) return;

      [pair.leftUnitKey, pair.rightUnitKey].forEach((unitKey) => {
        const nextParents = new Set(parentCandidatesByChild.get(unitKey) || []);
        const sizeBefore = nextParents.size;
        mergedParents.forEach((parentUnitKey) => nextParents.add(parentUnitKey));
        if (nextParents.size !== sizeBefore) {
          parentCandidatesByChild.set(unitKey, nextParents);
          changed = true;
        }
      });
    });
  }

  const pickPrimaryParent = (childUnitKey, parentUnitKeys) => {
    const childUnit = unitByKey.get(childUnitKey);
    const childGeneration = childUnit?.generation ?? 0;

    return [...parentUnitKeys].sort((leftKey, rightKey) => {
      const leftUnit = unitByKey.get(leftKey);
      const rightUnit = unitByKey.get(rightKey);
      const leftAnchorsChild = childUnit?.members.some((member) => member.anchorId && personToUnitKey.get(member.anchorId) === leftKey);
      const rightAnchorsChild = childUnit?.members.some((member) => member.anchorId && personToUnitKey.get(member.anchorId) === rightKey);
      if (leftAnchorsChild !== rightAnchorsChild) {
        return Number(rightAnchorsChild) - Number(leftAnchorsChild);
      }

      const leftDistance = Math.abs((leftUnit?.generation ?? 0) - (childGeneration - 1));
      const rightDistance = Math.abs((rightUnit?.generation ?? 0) - (childGeneration - 1));
      if (leftDistance !== rightDistance) return leftDistance - rightDistance;

      if ((leftUnit?.containsSelf ?? false) !== (rightUnit?.containsSelf ?? false)) {
        return Number(rightUnit?.containsSelf) - Number(leftUnit?.containsSelf);
      }

      return (leftUnit?.members[0]?.name || '').localeCompare(rightUnit?.members[0]?.name || '');
    })[0];
  };

  const primaryParentByChild = new Map();
  const childrenByParent = new Map();
  [...parentCandidatesByChild.entries()].forEach(([childUnitKey, parentUnitKeys]) => {
    const chosenParentKey = pickPrimaryParent(childUnitKey, parentUnitKeys);
    if (!chosenParentKey) return;
    primaryParentByChild.set(childUnitKey, chosenParentKey);
    addSetMap(childrenByParent, chosenParentKey, childUnitKey);
  });

  const sortChildUnitsForParent = (parentUnitKey, leftKey, rightKey) => {
    const leftUnit = unitByKey.get(leftKey);
    const rightUnit = unitByKey.get(rightKey);
    const leftMember = leftUnit?.members.find((member) => member.anchorId && personToUnitKey.get(member.anchorId) === parentUnitKey) || leftUnit?.members[0];
    const rightMember = rightUnit?.members.find((member) => member.anchorId && personToUnitKey.get(member.anchorId) === parentUnitKey) || rightUnit?.members[0];
    return sortPeople(leftMember, rightMember)
      || (leftUnit?.sideBias ?? 0) - (rightUnit?.sideBias ?? 0)
      || (leftUnit?.members[0]?.name || '').localeCompare(rightUnit?.members[0]?.name || '');
  };

  const orderedChildrenByParent = new Map(
    [...childrenByParent.entries()].map(([parentUnitKey, childUnitSet]) => [
      parentUnitKey,
      [...childUnitSet].sort((leftKey, rightKey) => sortChildUnitsForParent(parentUnitKey, leftKey, rightKey)),
    ]),
  );

  const subtreeHasSelfCache = new Map();
  const subtreeHasSelf = (unitKey, trail = new Set()) => {
    if (subtreeHasSelfCache.has(unitKey)) return subtreeHasSelfCache.get(unitKey);
    if (trail.has(unitKey)) return false;
    const unit = unitByKey.get(unitKey);
    const children = orderedChildrenByParent.get(unitKey) || [];
    const next = Boolean(unit?.containsSelf || children.some((childKey) => subtreeHasSelf(childKey, new Set([...trail, unitKey]))));
    subtreeHasSelfCache.set(unitKey, next);
    return next;
  };

  const measureCache = new Map();
  const measureSubtree = (unitKey, trail = new Set()) => {
    if (measureCache.has(unitKey)) return measureCache.get(unitKey);
    if (trail.has(unitKey)) return unitByKey.get(unitKey)?.width || CARD_WIDTH;

    const unit = unitByKey.get(unitKey);
    const children = orderedChildrenByParent.get(unitKey) || [];
    if (!unit) return CARD_WIDTH;

    const childWidths = children.map((childKey) => measureSubtree(childKey, new Set([...trail, unitKey])));
    const childrenWidth = childWidths.reduce((sum, width) => sum + width, 0) + Math.max(0, childWidths.length - 1) * siblingGap;
    const width = Math.max(unit.width, childrenWidth);
    measureCache.set(unitKey, width);
    return width;
  };

  const rootCandidates = units
    .map((unit) => unit.key)
    .filter((unitKey) => !primaryParentByChild.has(unitKey));
  const rootUnitKeys = (rootCandidates.length ? rootCandidates : units.map((unit) => unit.key))
    .sort((leftKey, rightKey) => {
      const leftUnit = unitByKey.get(leftKey);
      const rightUnit = unitByKey.get(rightKey);
      if (subtreeHasSelf(leftKey) !== subtreeHasSelf(rightKey)) {
        return Number(subtreeHasSelf(rightKey)) - Number(subtreeHasSelf(leftKey));
      }
      if ((leftUnit?.generation ?? 0) !== (rightUnit?.generation ?? 0)) {
        return (leftUnit?.generation ?? 0) - (rightUnit?.generation ?? 0);
      }
      return (leftUnit?.members[0]?.name || '').localeCompare(rightUnit?.members[0]?.name || '');
    });

  const totalRootWidth = rootUnitKeys.reduce((sum, unitKey) => sum + measureSubtree(unitKey), 0)
    + Math.max(0, rootUnitKeys.length - 1) * rootGap;
  const canvasWidth = Math.max(minCanvasWidth, totalRootWidth + canvasPaddingX * 2);
  const canvasHeight = canvasPaddingY * 2 + Math.max(0, generationRows.length - 1) * rowGap + CARD_HEIGHT;
  const innerWidth = canvasWidth - canvasPaddingX * 2;

  const unitPlacement = new Map();
  const placeUnitTree = (unitKey, leftX, trail = new Set()) => {
    if (trail.has(unitKey)) return;

    const unit = unitByKey.get(unitKey);
    if (!unit) return;
    const subtreeWidth = measureSubtree(unitKey, trail);
    const y = rowYByGeneration.get(unit.generation) || canvasPaddingY;
    const x = leftX + (subtreeWidth - unit.width) / 2;

    unitPlacement.set(unitKey, {
      ...unit,
      x,
      y,
      centerX: x + unit.width / 2,
      centerY: y + CARD_HEIGHT / 2,
      topY: y,
      bottomY: y + CARD_HEIGHT,
    });

    const children = orderedChildrenByParent.get(unitKey) || [];
    if (children.length === 0) return;

    const totalChildrenWidth = children.reduce((sum, childKey) => sum + measureSubtree(childKey), 0)
      + Math.max(0, children.length - 1) * siblingGap;
    let childCursorX = leftX + (subtreeWidth - totalChildrenWidth) / 2;

    children.forEach((childKey) => {
      placeUnitTree(childKey, childCursorX, new Set([...trail, unitKey]));
      childCursorX += measureSubtree(childKey) + siblingGap;
    });
  };

  let rootCursorX = canvasPaddingX + Math.max(0, (innerWidth - totalRootWidth) / 2);
  rootUnitKeys.forEach((unitKey) => {
    placeUnitTree(unitKey, rootCursorX);
    rootCursorX += measureSubtree(unitKey) + rootGap;
  });

  const positionedUnits = [...unitPlacement.values()].sort((left, right) => left.x - right.x || left.y - right.y);
  const personLayout = new Map();
  positionedUnits.forEach((unit) => {
    unit.members.forEach((member, index) => {
      const x = unit.x + index * (CARD_WIDTH + PARTNER_GAP);
      personLayout.set(member.id, {
        x,
        y: unit.y,
        topY: unit.y,
        bottomY: unit.y + CARD_HEIGHT,
        centerX: x + CARD_WIDTH / 2,
        centerY: unit.y + CARD_HEIGHT / 2,
      });
    });
  });

  const familyGroupMap = new Map();
  const groupKeyByChild = new Map();
  [...primaryParentByChild.entries()].forEach(([childUnitKey, parentUnitKey]) => {
    const childPlacement = unitPlacement.get(childUnitKey);
    if (!childPlacement) return;
    const groupKey = `${parentUnitKey}:${childPlacement.topY}`;
    const existing = familyGroupMap.get(groupKey) || {
      key: groupKey,
      parentUnitKey,
      childUnitKeys: [],
      dashed: false,
    };
    if (!existing.childUnitKeys.includes(childUnitKey)) {
      existing.childUnitKeys.push(childUnitKey);
      groupKeyByChild.set(childUnitKey, groupKey);
    }
    familyGroupMap.set(groupKey, existing);
  });

  const familyGroups = [...familyGroupMap.values()].map((group) => ({
    ...group,
    childUnitKeys: [...group.childUnitKeys].sort((leftKey, rightKey) => (
      (unitPlacement.get(leftKey)?.centerX || 0) - (unitPlacement.get(rightKey)?.centerX || 0)
    )),
  }));

  siblingPairs.forEach((pair) => {
    const leftParent = primaryParentByChild.get(pair.leftUnitKey);
    const rightParent = primaryParentByChild.get(pair.rightUnitKey);
    if (leftParent && rightParent && leftParent === rightParent) return;
    peerLinksByKey.set(pair.key, pair);
  });

  const duplicateRelationshipCount = Math.max(0, (family.relationships || []).length - dedupedRelationships.length);

  return {
    canvasWidth,
    canvasHeight,
    generationRows,
    positionedUnits,
    personLayout,
    personToUnitKey,
    peopleById,
    dedupedRelationships,
    duplicateRelationshipCount,
    familyGroups,
    peerLinks: [...peerLinksByKey.values()],
    unitByKey: new Map(positionedUnits.map((unit) => [unit.key, unit])),
    primaryParentByChild,
    parentCandidatesByChild: new Map([...parentCandidatesByChild.entries()].map(([key, value]) => [key, [...value]])),
    childrenByParent: new Map([...orderedChildrenByParent.entries()].map(([key, value]) => [key, [...value]])),
    groupKeyByChild,
    rowGap,
    canvasPaddingY,
  };
};

const buildFocusState = (
  family,
  layout,
  mode = 'lineage',
  viewRootPersonId = family.selectedPersonId || 'person-self',
  selectedPersonId = family.selectedPersonId || viewRootPersonId,
) => {
  const rootPersonId = viewRootPersonId || 'person-self';
  const selectedUnitKey = layout.personToUnitKey.get(rootPersonId) || '';
  const selectedUnit = selectedUnitKey ? layout.unitByKey.get(selectedUnitKey) : null;
  const ancestorUnitKeys = new Set();
  const descendantUnitKeys = new Set();
  const siblingUnitKeys = new Set();
  const highlightedFamilyGroupKeys = new Set();

  const includeAncestors = (recursive) => {
    let ancestorCursor = selectedUnitKey;
    while (ancestorCursor) {
      const parentUnitKey = layout.primaryParentByChild.get(ancestorCursor);
      if (!parentUnitKey || ancestorUnitKeys.has(parentUnitKey)) break;
      ancestorUnitKeys.add(parentUnitKey);
      const groupKey = layout.groupKeyByChild.get(ancestorCursor);
      if (groupKey) highlightedFamilyGroupKeys.add(groupKey);
      if (!recursive) break;
      ancestorCursor = parentUnitKey;
    }
  };

  const walkDescendants = (unitKey, recursive) => {
    const childUnitKeys = layout.childrenByParent.get(unitKey) || [];
    childUnitKeys.forEach((childUnitKey) => {
      if (descendantUnitKeys.has(childUnitKey)) return;
      descendantUnitKeys.add(childUnitKey);
      const groupKey = layout.groupKeyByChild.get(childUnitKey);
      if (groupKey) highlightedFamilyGroupKeys.add(groupKey);
      if (recursive) walkDescendants(childUnitKey, recursive);
    });
  };

  if (mode === 'direct') {
    includeAncestors(false);
    walkDescendants(selectedUnitKey, false);
  } else {
    includeAncestors(true);
    walkDescendants(selectedUnitKey, true);
  }

  const selectedParentUnitKey = layout.primaryParentByChild.get(selectedUnitKey);
  if (selectedParentUnitKey) {
    const siblingCandidates = layout.childrenByParent.get(selectedParentUnitKey) || [];
    siblingCandidates.forEach((unitKey) => {
      if (unitKey !== selectedUnitKey) siblingUnitKeys.add(unitKey);
    });
  }

  const cardRoles = new Map([[rootPersonId, selectedPersonId === rootPersonId ? 'selected' : 'root']]);
  const ancestorIds = new Set();
  const descendantIds = new Set();
  const spouseIds = new Set();
  const siblingIds = new Set();

  if (selectedUnit?.members.length === 2) {
    selectedUnit.members.forEach((member) => {
      if (member.id !== rootPersonId) spouseIds.add(member.id);
    });
  }

  ancestorUnitKeys.forEach((unitKey) => {
    const unit = layout.unitByKey.get(unitKey);
    unit?.members.forEach((member) => ancestorIds.add(member.id));
  });

  descendantUnitKeys.forEach((unitKey) => {
    const unit = layout.unitByKey.get(unitKey);
    unit?.members.forEach((member) => descendantIds.add(member.id));
  });
  siblingUnitKeys.forEach((unitKey) => {
    const unit = layout.unitByKey.get(unitKey);
    unit?.members.forEach((member) => siblingIds.add(member.id));
  });

  spouseIds.forEach((id) => {
    if (!cardRoles.has(id)) cardRoles.set(id, 'spouse');
  });
  siblingIds.forEach((id) => {
    if (!cardRoles.has(id)) cardRoles.set(id, 'sibling');
  });
  ancestorIds.forEach((id) => {
    if (!cardRoles.has(id)) cardRoles.set(id, 'ancestor');
  });
  descendantIds.forEach((id) => {
    if (!cardRoles.has(id)) cardRoles.set(id, 'descendant');
  });
  if (selectedPersonId && selectedPersonId !== rootPersonId) {
    cardRoles.set(selectedPersonId, 'selected');
  }

  const focusedUnitKeys = new Set([selectedUnitKey, ...ancestorUnitKeys, ...descendantUnitKeys, ...siblingUnitKeys]);
  const focusedPersonIds = new Set();
  focusedUnitKeys.forEach((unitKey) => {
    const unit = layout.unitByKey.get(unitKey);
    unit?.members.forEach((member) => focusedPersonIds.add(member.id));
  });
  const highlightedCoupleUnitKeys = new Set(
    [...focusedUnitKeys].filter((unitKey) => layout.unitByKey.get(unitKey)?.members.length === 2),
  );
  const highlightedPeerLinkKeys = new Set(
    layout.peerLinks
      .filter((link) => focusedUnitKeys.has(link.leftUnitKey) && focusedUnitKeys.has(link.rightUnitKey))
      .map((link) => link.key),
  );

  return {
    cardRoles,
    highlightedFamilyGroupKeys,
    highlightedCoupleUnitKeys,
    highlightedPeerLinkKeys,
    ancestorCount: ancestorIds.size,
    spouseCount: spouseIds.size,
    siblingCount: siblingIds.size,
    descendantCount: descendantIds.size,
    focusedUnitKeys,
    focusedPersonIds,
    rootPersonId,
    hasBranchFocus: cardRoles.size > 1,
  };
};

const FamilyView = ({
  family,
  viewPreferences = {},
  onChangeViewPreferences,
  onSelectChart,
  onCreateChart,
  onRenameChart,
  onDeleteChart,
  onAddPerson,
  onBulkAdd,
  onUpdatePerson,
  onDeletePerson,
  onAddRelationship,
  onDeleteRelationship,
  onSelectPerson,
  onImportBackup,
}) => {
  const [personDraft, setPersonDraft] = useState(createPersonDraft(family.people));
  const [relationshipDraft, setRelationshipDraft] = useState(createRelationshipDraft(family.people));
  const [bulkText, setBulkText] = useState('');
  const [bulkFeedback, setBulkFeedback] = useState('');
  const [backupFeedback, setBackupFeedback] = useState('');
  const [isImportingBackup, setIsImportingBackup] = useState(false);
  const [zoom, setZoom] = useState(0.64);
  const [newChartName, setNewChartName] = useState('');
  const [familySearchQuery, setFamilySearchQuery] = useState('');
  const [focusMode, setFocusMode] = useState(viewPreferences.focusMode === 'direct' ? 'direct' : 'lineage');
  const [isolateBranch, setIsolateBranch] = useState(Boolean(viewPreferences.isolateBranch));
  const [layoutDensity, setLayoutDensity] = useState(['compact', 'balanced', 'spacious'].includes(viewPreferences.layoutDensity) ? viewPreferences.layoutDensity : 'balanced');
  const [showGenerationLabels, setShowGenerationLabels] = useState(viewPreferences.showGenerationLabels !== false);
  const canvasViewportRef = useRef(null);
  const backupInputRef = useRef(null);
  const quickAddSectionRef = useRef(null);

  const fullLayout = useMemo(() => buildFamilyLayout(family, layoutDensity), [family, layoutDensity]);
  const directRelationLookup = useMemo(() => buildDirectRelationLookup(family), [family]);
  const charts = family.charts || [];
  const activeChart = charts.find((chart) => chart.id === family.activeChartId) || charts[0] || { id: 'chart-main', name: 'Main family chart', rootPersonId: 'person-self' };
  const activeChartRootPersonId = activeChart?.rootPersonId || 'person-self';
  const chartRootUnitKeys = useMemo(() => {
    const initialUnitKey = fullLayout.personToUnitKey.get(activeChartRootPersonId) || fullLayout.personToUnitKey.get('person-self') || '';
    if (!initialUnitKey) return [];

    const findRelevantParentUnitKeys = (unitKey, personIds) => {
      const candidateUnitKeys = fullLayout.parentCandidatesByChild.get(unitKey) || [];
      const unit = fullLayout.unitByKey.get(unitKey);
      if (candidateUnitKeys.length <= 1 || (unit?.members.length || 0) <= 1) return candidateUnitKeys;

      const relevantUnitKeys = candidateUnitKeys.filter((parentUnitKey) => {
        const parentUnit = fullLayout.unitByKey.get(parentUnitKey);
        if (!parentUnit) return false;

        const anchoredToCurrentPeople = parentUnit.members.some((member) => personIds.includes(member.anchorId));
        const explicitParentLink = fullLayout.dedupedRelationships.some((relationship) => {
          if (relationship.type !== 'parent' && relationship.type !== 'child') return false;
          if (relationship.type === 'parent') {
            return personIds.includes(relationship.targetId) && parentUnit.members.some((member) => member.id === relationship.sourceId);
          }
          return personIds.includes(relationship.sourceId) && parentUnit.members.some((member) => member.id === relationship.targetId);
        });

        return anchoredToCurrentPeople || explicitParentLink;
      });

      return relevantUnitKeys.length > 0 ? relevantUnitKeys : candidateUnitKeys;
    };

    const resolvedRoots = new Set();
    const walkUp = (unitKey, personIds, trail = new Set()) => {
      if (!unitKey || trail.has(unitKey)) {
        if (unitKey) resolvedRoots.add(unitKey);
        return;
      }

      const relevantParents = findRelevantParentUnitKeys(unitKey, personIds);
      if (relevantParents.length === 0) {
        resolvedRoots.add(unitKey);
        return;
      }

      relevantParents.forEach((parentUnitKey) => {
        const parentUnit = fullLayout.unitByKey.get(parentUnitKey);
        walkUp(parentUnitKey, parentUnit?.members.map((member) => member.id) || [], new Set([...trail, unitKey]));
      });
    };

    walkUp(initialUnitKey, [activeChartRootPersonId]);
    return [...resolvedRoots];
  }, [activeChartRootPersonId, fullLayout.dedupedRelationships, fullLayout.parentCandidatesByChild, fullLayout.personToUnitKey, fullLayout.unitByKey]);
  const chartScopeUnitKeys = useMemo(() => {
    if (activeChart.id === 'chart-main') {
      return new Set(fullLayout.positionedUnits.map((unit) => unit.key));
    }

    const candidateChildrenByParent = new Map();
    fullLayout.parentCandidatesByChild.forEach((parentUnitKeys, childUnitKey) => {
      parentUnitKeys.forEach((parentUnitKey) => {
        const next = candidateChildrenByParent.get(parentUnitKey) || [];
        if (!next.includes(childUnitKey)) next.push(childUnitKey);
        candidateChildrenByParent.set(parentUnitKey, next);
      });
    });

    const collected = new Set();
    const walk = (unitKey) => {
      if (!unitKey || collected.has(unitKey)) return;
      collected.add(unitKey);
      (candidateChildrenByParent.get(unitKey) || []).forEach(walk);
    };

    chartRootUnitKeys.forEach(walk);
    if (collected.size === 0) {
      const fallbackUnitKey = fullLayout.personToUnitKey.get(activeChartRootPersonId) || fullLayout.personToUnitKey.get('person-self') || '';
      walk(fallbackUnitKey);
    }

    return collected.size > 0 ? collected : new Set(fullLayout.positionedUnits.map((unit) => unit.key));
  }, [activeChart.id, activeChartRootPersonId, chartRootUnitKeys, fullLayout.parentCandidatesByChild, fullLayout.personToUnitKey, fullLayout.positionedUnits]);
  const chartPersonIds = useMemo(() => {
    if (activeChart.id === 'chart-main') {
      return new Set(family.people.map((person) => person.id));
    }

    const peopleById = new Map((family.people || []).map((person) => [person.id, person]));
    const parentsByPerson = new Map();
    const childrenByPerson = new Map();
    const siblingsByPerson = new Map();
    const spousesByPerson = new Map();

    const addLink = (map, key, value) => {
      if (!key || !value || key === value || !peopleById.has(key) || !peopleById.has(value)) return;
      const next = map.get(key) || new Set();
      next.add(value);
      map.set(key, next);
    };

    (family.people || []).forEach((person) => {
      if (!person.anchorId || !peopleById.has(person.anchorId)) return;

      if (person.relationKey === 'spouse') {
        addLink(spousesByPerson, person.id, person.anchorId);
        addLink(spousesByPerson, person.anchorId, person.id);
        return;
      }

      const generationDelta = getRelationGenerationDelta(person.relationKey);
      if (generationDelta < 0) {
        addLink(parentsByPerson, person.anchorId, person.id);
        addLink(childrenByPerson, person.id, person.anchorId);
        return;
      }

      if (generationDelta > 0) {
        addLink(childrenByPerson, person.anchorId, person.id);
        addLink(parentsByPerson, person.id, person.anchorId);
        return;
      }

      addLink(siblingsByPerson, person.id, person.anchorId);
      addLink(siblingsByPerson, person.anchorId, person.id);
    });

    (family.relationships || []).forEach((relationship) => {
      if (!peopleById.has(relationship.sourceId) || !peopleById.has(relationship.targetId)) return;

      if (relationship.type === 'spouse') {
        addLink(spousesByPerson, relationship.sourceId, relationship.targetId);
        addLink(spousesByPerson, relationship.targetId, relationship.sourceId);
        return;
      }

      if (relationship.type === 'sibling') {
        addLink(siblingsByPerson, relationship.sourceId, relationship.targetId);
        addLink(siblingsByPerson, relationship.targetId, relationship.sourceId);
        return;
      }

      if (relationship.type === 'parent') {
        addLink(parentsByPerson, relationship.targetId, relationship.sourceId);
        addLink(childrenByPerson, relationship.sourceId, relationship.targetId);
        return;
      }

      if (relationship.type === 'child') {
        addLink(parentsByPerson, relationship.sourceId, relationship.targetId);
        addLink(childrenByPerson, relationship.targetId, relationship.sourceId);
      }
    });

    const ids = new Set();
    const visitedBlood = new Set();

    const includeBloodFamily = (personId) => {
      if (!personId || visitedBlood.has(personId) || !peopleById.has(personId)) return;
      visitedBlood.add(personId);
      ids.add(personId);

      (spousesByPerson.get(personId) || new Set()).forEach((spouseId) => {
        ids.add(spouseId);
        (childrenByPerson.get(spouseId) || new Set()).forEach(includeBloodFamily);
      });

      (parentsByPerson.get(personId) || new Set()).forEach(includeBloodFamily);
      (childrenByPerson.get(personId) || new Set()).forEach(includeBloodFamily);
      (siblingsByPerson.get(personId) || new Set()).forEach(includeBloodFamily);
    };

    includeBloodFamily(activeChartRootPersonId);

    if (ids.size === 0 && family.people.some((person) => person.id === activeChartRootPersonId)) {
      ids.add(activeChartRootPersonId);
    }

    return ids;
  }, [activeChart.id, activeChartRootPersonId, family.people, family.relationships]);
  const layoutFamily = useMemo(() => {
    if (activeChart.id === 'chart-main') return family;

    const people = family.people.filter((person) => chartPersonIds.has(person.id));
    if (people.length === 0) {
      return {
        ...family,
        selectedPersonId: activeChartRootPersonId,
      };
    }

    const visiblePersonIds = new Set(people.map((person) => person.id));
    const selectedPersonId = visiblePersonIds.has(family.selectedPersonId)
      ? family.selectedPersonId
      : visiblePersonIds.has(activeChartRootPersonId)
        ? activeChartRootPersonId
        : people[0]?.id || activeChartRootPersonId;

    return {
      ...family,
      people,
      relationships: (family.relationships || []).filter((relationship) => (
        visiblePersonIds.has(relationship.sourceId) && visiblePersonIds.has(relationship.targetId)
      )),
      selectedPersonId,
    };
  }, [activeChart.id, activeChartRootPersonId, chartPersonIds, family]);
  const layout = useMemo(() => buildFamilyLayout(layoutFamily, layoutDensity), [layoutFamily, layoutDensity]);
  const focusState = useMemo(
    () => buildFocusState(layoutFamily, layout, focusMode, activeChartRootPersonId, layoutFamily.selectedPersonId),
    [activeChartRootPersonId, layoutFamily, layout, focusMode],
  );

  useEffect(() => {
    setPersonDraft((current) => ({
      ...current,
      anchorId: family.people.some((person) => person.id === current.anchorId) ? current.anchorId : family.selectedPersonId || 'person-self',
    }));
    setRelationshipDraft((current) => ({
      ...current,
      sourceId: family.people.some((person) => person.id === current.sourceId) ? current.sourceId : family.people[0]?.id || 'person-self',
      targetId: family.people.some((person) => person.id === current.targetId) ? current.targetId : family.people[1]?.id || '',
    }));
  }, [family.people, family.selectedPersonId]);

  useEffect(() => {
    setFocusMode(viewPreferences.focusMode === 'direct' ? 'direct' : 'lineage');
    setIsolateBranch(Boolean(viewPreferences.isolateBranch));
    setLayoutDensity(['compact', 'balanced', 'spacious'].includes(viewPreferences.layoutDensity) ? viewPreferences.layoutDensity : 'balanced');
    setShowGenerationLabels(viewPreferences.showGenerationLabels !== false);
  }, [
    viewPreferences.focusMode,
    viewPreferences.isolateBranch,
    viewPreferences.layoutDensity,
    viewPreferences.showGenerationLabels,
  ]);

  useEffect(() => {
    setNewChartName(activeChart?.name || '');
  }, [activeChart?.id, activeChart?.name]);

  const duplicateNameGroups = useMemo(() => {
    const groups = new Map();
    family.people.forEach((person) => {
      const token = normalizePersonName(person.name);
      if (!token) return;
      const next = groups.get(token) || [];
      next.push(person);
      groups.set(token, next);
    });

    return [...groups.entries()]
      .filter(([, peopleInGroup]) => peopleInGroup.length > 1)
      .map(([token, peopleInGroup]) => ({
        key: token,
        label: peopleInGroup[0]?.name || 'Unnamed person',
        people: [...peopleInGroup].sort(sortPeople),
      }))
      .sort((left, right) => right.people.length - left.people.length || left.label.localeCompare(right.label));
  }, [family.people]);

  const familySearchResults = useMemo(() => {
    const token = normalizePersonName(familySearchQuery);
    if (!token) return [];
    return family.people
      .filter((person) => normalizePersonName(person.name).includes(token))
      .sort(sortPeople)
      .slice(0, 8);
  }, [family.people, familySearchQuery]);

  const centerViewportOnPerson = (personId, nextZoom = zoom, behavior = 'smooth') => {
    const viewport = canvasViewportRef.current;
    const bounds = viewport?.getBoundingClientRect();
    if (bounds == null || viewport == null) return;

    const focusLayout = layout.personLayout.get(personId)
      || layout.personLayout.get(layoutFamily.selectedPersonId || activeChartRootPersonId || 'person-self')
      || layout.personLayout.get('person-self')
      || layout.personLayout.values().next().value;

    if (!focusLayout) {
      viewport.scrollTo({ top: 0, left: 0, behavior });
      return;
    }

    const scaledCenterX = focusLayout.centerX * nextZoom;
    const scaledCenterY = focusLayout.centerY * nextZoom;
    const maxLeft = Math.max(0, layout.canvasWidth * nextZoom - bounds.width);
    const maxTop = Math.max(0, layout.canvasHeight * nextZoom - bounds.height);
    const left = clamp(scaledCenterX - bounds.width / 2, 0, maxLeft);
    const top = clamp(Math.max(0, scaledCenterY - bounds.height * 0.32), 0, maxTop);

    viewport.scrollTo({ top, left, behavior });
  };

  const fitCanvas = () => {
    const viewport = canvasViewportRef.current;
    const bounds = viewport?.getBoundingClientRect();
    if (bounds == null || viewport == null) return;
    const fitted = clamp(
      Math.min((bounds.width - 24) / layout.canvasWidth, (bounds.height - 24) / layout.canvasHeight, 1),
      0.34,
      0.92,
    );
    const nextZoom = Number(fitted.toFixed(2));
    setZoom(nextZoom);
    centerViewportOnPerson(layoutFamily.selectedPersonId || activeChartRootPersonId || 'person-self', nextZoom);
  };

  useEffect(() => {
    const id = window.requestAnimationFrame(fitCanvas);
    window.addEventListener('resize', fitCanvas);
    return () => {
      window.cancelAnimationFrame(id);
      window.removeEventListener('resize', fitCanvas);
    };
  }, [layout.canvasHeight, layout.canvasWidth]);

  useEffect(() => {
    if (!layoutFamily.selectedPersonId) return undefined;
    const id = window.requestAnimationFrame(() => centerViewportOnPerson(layoutFamily.selectedPersonId));
    return () => window.cancelAnimationFrame(id);
  }, [activeChartRootPersonId, layoutFamily.selectedPersonId, zoom, layout.canvasHeight, layout.canvasWidth]);

  const selectedPerson = layoutFamily.people.find((person) => person.id === layoutFamily.selectedPersonId)
    || family.people.find((person) => person.id === family.selectedPersonId)
    || layoutFamily.people[0]
    || family.people[0];
  const selectedAnchor = selectedPerson?.anchorId ? layout.peopleById[selectedPerson.anchorId] : null;
  const selectedRelationMeta = selectedPerson
    ? directRelationLookup.get(selectedPerson.id) || getRelationMeta(selectedPerson.relationKey, selectedPerson.relationLabel, selectedPerson.relationHindi)
    : null;
  const selectedUnitKey = selectedPerson ? layout.personToUnitKey.get(selectedPerson.id) || '' : '';
  const selectedUnit = selectedUnitKey ? layout.unitByKey.get(selectedUnitKey) : null;
  const selectedParentUnit = selectedUnitKey ? layout.unitByKey.get(layout.primaryParentByChild.get(selectedUnitKey) || '') : null;
  const selectedChildUnits = selectedUnitKey
    ? (layout.childrenByParent.get(selectedUnitKey) || []).map((key) => layout.unitByKey.get(key)).filter(Boolean)
    : [];
  const selectedSiblingUnits = selectedParentUnit
    ? ((layout.childrenByParent.get(selectedParentUnit.key) || []).filter((key) => key !== selectedUnitKey).map((key) => layout.unitByKey.get(key)).filter(Boolean))
    : [];
  const selectedSpousePeople = selectedUnit?.members.filter((person) => person.id !== selectedPerson?.id) || [];
  const selectedParentPeople = selectedParentUnit?.members || [];
  const selectedChildPeople = selectedChildUnits.flatMap((unit) => unit.members);
  const selectedSiblingPeople = selectedSiblingUnits.flatMap((unit) => unit.members);
  const selectedPathToSelf = useMemo(() => {
    if (!selectedPerson) return '';
    if (selectedPerson.id === 'person-self') return 'You';

    const pathNames = [];
    const visited = new Set();
    let cursor = selectedPerson;
    while (cursor && !visited.has(cursor.id)) {
      visited.add(cursor.id);
      pathNames.unshift(cursor.name || 'Unnamed person');
      if (cursor.id === 'person-self') break;
      cursor = cursor.anchorId ? layout.peopleById[cursor.anchorId] : null;
    }

    return pathNames[0] === 'You' ? pathNames.join(' → ') : ['You', ...pathNames].join(' → ');
  }, [layout.peopleById, selectedPerson]);

  const primeQuickAdd = (relationKey) => {
    if (!selectedPerson) return;
    setPersonDraft((current) => ({
      ...current,
      anchorId: selectedPerson.id,
      relationKey,
      relationLabel: relationKey === 'custom' ? current.relationLabel : '',
      relationHindi: relationKey === 'custom' ? current.relationHindi : '',
      name: '',
      birthYear: '',
      note: '',
    }));
    quickAddSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleSelectPerson = (personId) => {
    onSelectPerson(personId);
    setFamilySearchQuery('');
    window.requestAnimationFrame(() => centerViewportOnPerson(personId));
  };

  const handleSelectChart = (chartId) => {
    onSelectChart?.(chartId);
    setFamilySearchQuery('');
  };

  const handleCreateChartFromSelected = () => {
    if (!selectedPerson) return;
    onCreateChart?.({
      name: newChartName?.trim() || `${selectedPerson.name || 'Family'} chart`,
      rootPersonId: selectedPerson.id,
    });
  };

  const handleRenameActiveChart = () => {
    if (!activeChart || !newChartName.trim()) return;
    onRenameChart?.(activeChart.id, newChartName.trim());
  };

  const applyViewPreferencePatch = (patch) => {
    onChangeViewPreferences?.(patch);
  };

  const handleFocusModeChange = (nextMode) => {
    const resolved = nextMode === 'direct' ? 'direct' : 'lineage';
    setFocusMode(resolved);
    applyViewPreferencePatch({ focusMode: resolved });
  };

  const handleIsolateBranchToggle = () => {
    setIsolateBranch((current) => {
      const next = !current;
      applyViewPreferencePatch({ isolateBranch: next });
      return next;
    });
  };

  const handleDensityChange = (nextDensity) => {
    const resolved = ['compact', 'balanced', 'spacious'].includes(nextDensity) ? nextDensity : 'balanced';
    setLayoutDensity(resolved);
    applyViewPreferencePatch({ layoutDensity: resolved });
  };

  const handleGenerationLabelsToggle = () => {
    setShowGenerationLabels((current) => {
      const next = !current;
      applyViewPreferencePatch({ showGenerationLabels: next });
      return next;
    });
  };

  const resetFamilyView = () => {
    setFamilySearchQuery('');
    setFocusMode('lineage');
    setIsolateBranch(false);
    setLayoutDensity('balanced');
    setShowGenerationLabels(true);
    setZoom(0.64);
    applyViewPreferencePatch({
      focusMode: 'lineage',
      isolateBranch: false,
      layoutDensity: 'balanced',
      showGenerationLabels: true,
    });
    handleSelectChart('chart-main');
    window.requestAnimationFrame(() => centerViewportOnPerson('person-self', 0.64));
  };

  const chartVisibleUnitKeys = useMemo(
    () => new Set(layout.positionedUnits.map((unit) => unit.key)),
    [layout.positionedUnits],
  );

  const visibleUnitKeys = useMemo(() => {
    if (!(isolateBranch && focusState.hasBranchFocus)) {
      return chartVisibleUnitKeys;
    }
    return new Set([...chartVisibleUnitKeys].filter((unitKey) => focusState.focusedUnitKeys.has(unitKey)));
  }, [chartVisibleUnitKeys, focusState.focusedUnitKeys, focusState.hasBranchFocus, isolateBranch]);

  const visibleUnits = useMemo(
    () => layout.positionedUnits.filter((unit) => visibleUnitKeys.has(unit.key)),
    [layout.positionedUnits, visibleUnitKeys],
  );
  const visibleCanvasBounds = useMemo(() => {
    if (visibleUnits.length === 0) return null;

    let minX = Number.POSITIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;

    visibleUnits.forEach((unit) => {
      minX = Math.min(minX, unit.x);
      minY = Math.min(minY, unit.y);
      maxX = Math.max(maxX, unit.x + unit.width);
      maxY = Math.max(maxY, unit.y + CARD_HEIGHT);
    });

    const paddingX = 96;
    const paddingY = 84;
    return {
      minX: Math.max(0, minX - paddingX),
      minY: Math.max(0, minY - paddingY),
      maxX: maxX + paddingX,
      maxY: maxY + paddingY,
      width: Math.max(CARD_WIDTH, maxX - minX + paddingX * 2),
      height: Math.max(CARD_HEIGHT, maxY - minY + paddingY * 2),
    };
  }, [visibleUnits]);
  const visibleFamilyGroups = useMemo(
    () => layout.familyGroups.filter((group) => visibleUnitKeys.has(group.parentUnitKey) && group.childUnitKeys.some((key) => visibleUnitKeys.has(key))),
    [layout.familyGroups, visibleUnitKeys],
  );
  const visiblePeerLinks = useMemo(
    () => layout.peerLinks.filter((link) => visibleUnitKeys.has(link.leftUnitKey) && visibleUnitKeys.has(link.rightUnitKey)),
    [layout.peerLinks, visibleUnitKeys],
  );
  const visibleGenerationRows = useMemo(() => {
    if (!(isolateBranch && focusState.hasBranchFocus)) return layout.generationRows;
    const visibleGenerations = new Set(visibleUnits.map((unit) => unit.generation));
    return layout.generationRows.filter((generation) => visibleGenerations.has(generation));
  }, [focusState.hasBranchFocus, isolateBranch, layout.generationRows, visibleUnits]);

  const fitVisibleCanvas = (behavior = 'smooth') => {
    const viewport = canvasViewportRef.current;
    const bounds = viewport?.getBoundingClientRect();
    if (bounds == null || viewport == null || visibleCanvasBounds == null) return;

    const nextZoom = Number(
      clamp(
        Math.min((bounds.width - 24) / visibleCanvasBounds.width, (bounds.height - 24) / visibleCanvasBounds.height, 1),
        0.34,
        0.92,
      ).toFixed(2),
    );

    setZoom(nextZoom);

    const centerX = ((visibleCanvasBounds.minX + visibleCanvasBounds.maxX) / 2) * nextZoom;
    const centerY = ((visibleCanvasBounds.minY + visibleCanvasBounds.maxY) / 2) * nextZoom;
    const maxLeft = Math.max(0, layout.canvasWidth * nextZoom - bounds.width);
    const maxTop = Math.max(0, layout.canvasHeight * nextZoom - bounds.height);
    const left = clamp(centerX - bounds.width / 2, 0, maxLeft);
    const top = clamp(centerY - bounds.height * 0.42, 0, maxTop);

    viewport.scrollTo({ top, left, behavior });
  };

  useEffect(() => {
    if (visibleUnits.length === 0) return undefined;
    const id = window.requestAnimationFrame(() => fitVisibleCanvas('smooth'));
    return () => window.cancelAnimationFrame(id);
  }, [activeChart.id, isolateBranch, layoutDensity, visibleUnits.length]);

  const handlePersonSubmit = (event) => {
    event.preventDefault();
    if (personDraft.name.trim() === '') return;
    onAddPerson(personDraft);
    setPersonDraft(createPersonDraft(family.people));
  };

  const handleBulkSubmit = (event) => {
    event.preventDefault();
    const result = onBulkAdd(bulkText);
    setBulkFeedback(result.message);
    if (result.added > 0) setBulkText('');
  };

  const handleRelationshipSubmit = (event) => {
    event.preventDefault();
    if (relationshipDraft.sourceId === '' || relationshipDraft.targetId === '') return;
    if (relationshipDraft.sourceId === relationshipDraft.targetId) return;
    onAddRelationship(relationshipDraft);
    setRelationshipDraft(createRelationshipDraft(family.people));
  };

  const handleBackupImport = async (event) => {
    const file = event.target.files?.[0];
    if (!file || typeof onImportBackup !== 'function') return;

    setIsImportingBackup(true);
    try {
      const message = await onImportBackup(file);
      setBackupFeedback(message || `Imported ${file.name}.`);
    } catch (error) {
      setBackupFeedback(error instanceof Error ? error.message : 'Could not import that backup file.');
    } finally {
      setIsImportingBackup(false);
      event.target.value = '';
    }
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[390px,minmax(0,1fr)]">
      <div className="space-y-6">
        <section className="life-panel">
          <div className="flex items-start gap-3">
            <div className="rounded-2xl bg-indigo-500/12 p-3 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-200">
              <GitBranchPlus size={18} />
            </div>
            <div>
              <p className="life-card-label">Family charts</p>
              <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                Save separate charts for your side, your wife&apos;s side, or any in-law family.
              </h2>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            {charts.map((chart) => (
              <button
                key={chart.id}
                type="button"
                onClick={() => handleSelectChart(chart.id)}
                className={chart.id === activeChart.id ? 'life-tab life-tab-active whitespace-nowrap' : 'life-tab whitespace-nowrap'}
              >
                {chart.name}
              </button>
            ))}
          </div>

          <div className="mt-6 space-y-4">
            <label className="space-y-2">
              <span className="life-card-label">Chart name</span>
              <input
                value={newChartName}
                onChange={(event) => setNewChartName(event.target.value)}
                placeholder="Wife side family"
                className="life-input"
              />
            </label>

            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={handleCreateChartFromSelected} className="life-primary-button">
                Create chart from selected person
              </button>
              <button type="button" onClick={handleRenameActiveChart} className="life-secondary-button">
                Rename current chart
              </button>
              {activeChart.id !== 'chart-main' ? (
                <button type="button" onClick={() => onDeleteChart?.(activeChart.id)} className="life-danger-button">
                  Delete current chart
                </button>
              ) : null}
            </div>

            <p className="text-xs leading-5 text-slate-500 dark:text-white/55">
              Best result: create a chart from the elder or root person of that family side, like your wife&apos;s father, her grandfather, or your sister&apos;s in-law family elder.
            </p>
          </div>
        </section>

        <section ref={quickAddSectionRef} className="life-panel">
          <div className="flex items-start gap-3">
            <div className="rounded-2xl bg-sky-500/12 p-3 text-sky-700 dark:bg-sky-500/20 dark:text-sky-200">
              <UserPlus2 size={18} />
            </div>
            <div>
              <p className="life-card-label">Quick add</p>
              <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                Add one person and let the family map place them logically.
              </h2>
            </div>
          </div>

          <form className="mt-6 space-y-4" onSubmit={handlePersonSubmit}>
            <label className="space-y-2">
              <span className="life-card-label">Name</span>
              <input
                value={personDraft.name}
                onChange={(event) => setPersonDraft((current) => ({ ...current, name: event.target.value }))}
                placeholder="Enter family member name"
                className="life-input"
              />
            </label>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2">
                <span className="life-card-label">Relationship to linked person</span>
                <select
                  value={personDraft.relationKey}
                  onChange={(event) => setPersonDraft((current) => ({ ...current, relationKey: event.target.value }))}
                  className="life-input"
                >
                  {relationOptions.filter((option) => option.value !== 'self').map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>

              <label className="space-y-2">
                <span className="life-card-label">Linked to</span>
                <select
                  value={personDraft.anchorId}
                  onChange={(event) => setPersonDraft((current) => ({ ...current, anchorId: event.target.value }))}
                  className="life-input"
                >
                  {family.people.map((person) => (
                    <option key={person.id} value={person.id}>{person.name || 'Unnamed person'}</option>
                  ))}
                </select>
              </label>
            </div>

            {personDraft.relationKey === 'custom' ? (
              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2">
                  <span className="life-card-label">Custom English label</span>
                  <input
                    value={personDraft.relationLabel}
                    onChange={(event) => setPersonDraft((current) => ({ ...current, relationLabel: event.target.value }))}
                    placeholder="Elder cousin"
                    className="life-input"
                  />
                </label>
                <label className="space-y-2">
                  <span className="life-card-label">Custom Hindi label</span>
                  <input
                    value={personDraft.relationHindi}
                    onChange={(event) => setPersonDraft((current) => ({ ...current, relationHindi: event.target.value }))}
                    placeholder="बड़े भैया"
                    className="life-input"
                  />
                </label>
              </div>
            ) : null}

            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2">
                <span className="life-card-label">Birth year</span>
                <input
                  value={personDraft.birthYear}
                  onChange={(event) => setPersonDraft((current) => ({ ...current, birthYear: event.target.value }))}
                  placeholder="1988"
                  className="life-input"
                />
              </label>
              <label className="space-y-2">
                <span className="life-card-label">Short note</span>
                <input
                  value={personDraft.note}
                  onChange={(event) => setPersonDraft((current) => ({ ...current, note: event.target.value }))}
                  placeholder="Lives in Jaipur"
                  className="life-input"
                />
              </label>
            </div>

            <button type="submit" className="life-primary-button w-full justify-center">
              Add to family map
            </button>
            <p className="text-xs leading-5 text-slate-500 dark:text-white/55">
              Parents go above, children go below, spouses pair together, and the labels stay under each person.
            </p>
          </form>
        </section>

        <section className="life-panel">
          <div className="flex items-start gap-3">
            <div className="rounded-2xl bg-fuchsia-500/12 p-3 text-fuchsia-700 dark:bg-fuchsia-500/20 dark:text-fuchsia-200">
              <ScanSearch size={18} />
            </div>
            <div>
              <p className="life-card-label">Bulk add</p>
              <h3 className="mt-2 text-xl font-black tracking-tight text-slate-900 dark:text-white">
                Add many family members in one shot.
              </h3>
            </div>
          </div>

          <form className="mt-6 space-y-4" onSubmit={handleBulkSubmit}>
            <label className="space-y-2">
              <span className="life-card-label">Format</span>
              <textarea
                value={bulkText}
                onChange={(event) => setBulkText(event.target.value)}
                rows={8}
                className="life-textarea"
                placeholder={[
                  'Name | relationship | linked to | birth year | note',
                  'Mohan | father | Me | 1958 | Jaipur',
                  'Sunita | mother | Me | 1961 | Jaipur',
                  'Riya | spouse | Arjun | 1992 | Delhi',
                  'Kabir | son | Arjun | 2019 | Loves cricket',
                ].join('\n')}
              />
            </label>
            <button type="submit" className="life-secondary-button w-full justify-center">
              Bulk add family
            </button>
            <p className="text-xs leading-5 text-slate-500 dark:text-white/55">
              Use the linked-to column to connect each person to the person they relate to. The map will arrange the generations for you.
            </p>
            {bulkFeedback ? (
              <div className="rounded-[1.2rem] border border-white/80 bg-white/70 px-4 py-3 text-sm text-slate-600 backdrop-blur dark:border-white/10 dark:bg-white/8 dark:text-white/70">
                {bulkFeedback}
              </div>
            ) : null}
          </form>
        </section>

        {duplicateNameGroups.length > 0 ? (
          <section className="life-panel">
            <div className="flex items-start gap-3">
              <div className="rounded-2xl bg-rose-500/12 p-3 text-rose-700 dark:bg-rose-500/20 dark:text-rose-200">
                <ScanSearch size={18} />
              </div>
              <div>
                <p className="life-card-label">Potential duplicates</p>
                <h3 className="mt-2 text-xl font-black tracking-tight text-slate-900 dark:text-white">
                  These names appear more than once. Review them before the tree gets noisy.
                </h3>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              {duplicateNameGroups.map((group) => (
                <div key={group.key} className="rounded-[1.2rem] border border-white/80 bg-white/70 p-4 backdrop-blur dark:border-white/10 dark:bg-white/8">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">
                    {group.label} appears {group.people.length} times
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {group.people.map((person) => {
                      const relationMeta = directRelationLookup.get(person.id) || getRelationMeta(person.relationKey, person.relationLabel, person.relationHindi);
                      return (
                        <button
                          key={person.id}
                          type="button"
                          onClick={() => handleSelectPerson(person.id)}
                          className="life-tab whitespace-nowrap"
                        >
                          {person.name || 'Unnamed person'}
                          {' • '}
                          {relationMeta.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        <section className="life-panel">
          <div className="flex items-start gap-3">
            <div className="rounded-2xl bg-emerald-500/12 p-3 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200">
              <Upload size={18} />
            </div>
            <div>
              <p className="life-card-label">Restore backup</p>
              <h3 className="mt-2 text-xl font-black tracking-tight text-slate-900 dark:text-white">
                Load your current portal backup here before refining the tree.
              </h3>
            </div>
          </div>

          <div className="mt-6 space-y-4">
            <p className="text-sm leading-6 text-slate-500 dark:text-white/55">
              Import the JSON backup you exported from Life Atlas to populate the latest family, profile, fitness, planner, and finance data locally.
            </p>
            <input
              ref={backupInputRef}
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={handleBackupImport}
            />
            <button
              type="button"
              onClick={() => backupInputRef.current?.click()}
              disabled={isImportingBackup}
              className="life-secondary-button w-full justify-center"
            >
              <Upload size={16} />
              {isImportingBackup ? 'Importing backup...' : 'Import portal backup JSON'}
            </button>
            <p className="text-xs leading-5 text-slate-500 dark:text-white/55">
              The backup restores the data records. Vault document files stay wherever they were originally stored.
            </p>
            {backupFeedback ? (
              <div className="rounded-[1.2rem] border border-white/80 bg-white/70 px-4 py-3 text-sm text-slate-600 backdrop-blur dark:border-white/10 dark:bg-white/8 dark:text-white/70">
                {backupFeedback}
              </div>
            ) : null}
          </div>
        </section>

        <section className="life-panel">
          <div className="flex items-start gap-3">
            <div className="rounded-2xl bg-amber-500/12 p-3 text-amber-700 dark:bg-amber-500/20 dark:text-amber-200">
              <GitBranchPlus size={18} />
            </div>
            <div>
              <p className="life-card-label">Advanced links</p>
              <h3 className="mt-2 text-xl font-black tracking-tight text-slate-900 dark:text-white">
                Add only the links that are genuinely special.
              </h3>
            </div>
          </div>

          <form className="mt-6 space-y-4" onSubmit={handleRelationshipSubmit}>
            <label className="space-y-2">
              <span className="life-card-label">From</span>
              <select
                value={relationshipDraft.sourceId}
                onChange={(event) => setRelationshipDraft((current) => ({ ...current, sourceId: event.target.value }))}
                className="life-input"
              >
                {family.people.map((person) => (
                  <option key={person.id} value={person.id}>{person.name || 'Unnamed person'}</option>
                ))}
              </select>
            </label>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2">
                <span className="life-card-label">Relationship</span>
                <select
                  value={relationshipDraft.type}
                  onChange={(event) => {
                    const meta = getConnectionMeta(event.target.value, relationshipDraft.label, relationshipDraft.labelHindi);
                    setRelationshipDraft((current) => ({
                      ...current,
                      type: event.target.value,
                      label: event.target.value === 'custom' ? current.label : meta.label,
                      labelHindi: event.target.value === 'custom' ? current.labelHindi : meta.hindi,
                    }));
                  }}
                  className="life-input"
                >
                  {connectionOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>

              <label className="space-y-2">
                <span className="life-card-label">To</span>
                <select
                  value={relationshipDraft.targetId}
                  onChange={(event) => setRelationshipDraft((current) => ({ ...current, targetId: event.target.value }))}
                  className="life-input"
                >
                  <option value="">Select person</option>
                  {family.people.map((person) => (
                    <option key={person.id} value={person.id}>{person.name || 'Unnamed person'}</option>
                  ))}
                </select>
              </label>
            </div>

            {relationshipDraft.type === 'custom' ? (
              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2">
                  <span className="life-card-label">English label</span>
                  <input
                    value={relationshipDraft.label}
                    onChange={(event) => setRelationshipDraft((current) => ({ ...current, label: event.target.value }))}
                    className="life-input"
                  />
                </label>
                <label className="space-y-2">
                  <span className="life-card-label">Hindi label</span>
                  <input
                    value={relationshipDraft.labelHindi}
                    onChange={(event) => setRelationshipDraft((current) => ({ ...current, labelHindi: event.target.value }))}
                    className="life-input"
                  />
                </label>
              </div>
            ) : null}

            <button type="submit" className="life-secondary-button w-full justify-center">
              <Link2 size={16} />
              Add link
            </button>
          </form>

          <div className="mt-6 space-y-3">
            {layout.dedupedRelationships.length === 0 ? (
              <p className="text-sm leading-6 text-slate-500 dark:text-white/55">
                Straight lines are created from the family map automatically. Use manual links only when the default structure is not enough.
              </p>
            ) : (
              layout.dedupedRelationships.map((relationship) => {
                const meta = getConnectionMeta(relationship.type, relationship.label, relationship.labelHindi);
                const source = layout.peopleById[relationship.sourceId];
                const target = layout.peopleById[relationship.targetId];

                return (
                  <div key={relationship.id} className="rounded-[1.2rem] border border-white/80 bg-white/70 p-4 backdrop-blur dark:border-white/10 dark:bg-white/8">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">
                          {source?.name || 'Unknown'} <span className="text-slate-400">→</span> {target?.name || 'Unknown'}
                        </p>
                        <p className="mt-1 text-sm text-slate-500 dark:text-white/55">{meta.label} • {meta.hindi}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => onDeleteRelationship(relationship.id)}
                        className="rounded-xl p-2 text-rose-500 transition hover:bg-rose-50 dark:hover:bg-rose-500/10"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}

            {layout.duplicateRelationshipCount > 0 ? (
              <div className="rounded-[1.2rem] border border-sky-200/80 bg-sky-50/85 px-4 py-3 text-sm text-sky-700 dark:border-sky-500/20 dark:bg-sky-500/10 dark:text-sky-200">
                {layout.duplicateRelationshipCount} duplicate link{layout.duplicateRelationshipCount === 1 ? ' was' : 's were'} merged in the view so the family map stays cleaner.
              </div>
            ) : null}
          </div>
        </section>

        {selectedPerson ? (
          <section className="life-panel">
            <p className="life-card-label">Selected person</p>
            <div className="mt-4 space-y-4">
              <div>
                <p className="text-xl font-black text-slate-900 dark:text-white">{selectedPerson.name || 'Unnamed person'}</p>
                <p className="mt-2 text-sm text-slate-500 dark:text-white/55">
                  {selectedRelationMeta?.label || getRelationMeta(selectedPerson.relationKey, selectedPerson.relationLabel, selectedPerson.relationHindi).label}
                  {' • '}
                  {selectedRelationMeta?.hindi || getRelationMeta(selectedPerson.relationKey, selectedPerson.relationLabel, selectedPerson.relationHindi).hindi}
                </p>
                <p className="mt-1 text-xs text-slate-400 dark:text-white/35">
                  Linked to: {selectedAnchor?.name || 'No linked person'}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <span className="tag">{selectedPathToSelf}</span>
                {selectedSpousePeople.length ? <span className="tag">{selectedSpousePeople.length} spouse</span> : null}
                {selectedParentPeople.length ? <span className="tag">{selectedParentPeople.length} parent link</span> : null}
                {selectedSiblingPeople.length ? <span className="tag">{selectedSiblingPeople.length} sibling link</span> : null}
                {selectedChildPeople.length ? <span className="tag">{selectedChildPeople.length} child{selectedChildPeople.length === 1 ? '' : 'ren'}</span> : null}
              </div>

              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-[1.2rem] border border-white/80 bg-white/70 px-4 py-3 text-sm text-slate-600 backdrop-blur dark:border-white/10 dark:bg-white/8 dark:text-white/70">
                  <p className="life-card-label">Parents</p>
                  <p className="mt-2 font-semibold text-slate-900 dark:text-white">
                    {selectedParentPeople.length ? selectedParentPeople.map((person) => person.name || 'Unnamed person').join(', ') : 'No parent link yet'}
                  </p>
                </div>
                <div className="rounded-[1.2rem] border border-white/80 bg-white/70 px-4 py-3 text-sm text-slate-600 backdrop-blur dark:border-white/10 dark:bg-white/8 dark:text-white/70">
                  <p className="life-card-label">Spouse</p>
                  <p className="mt-2 font-semibold text-slate-900 dark:text-white">
                    {selectedSpousePeople.length ? selectedSpousePeople.map((person) => person.name || 'Unnamed person').join(', ') : 'No spouse linked'}
                  </p>
                </div>
                <div className="rounded-[1.2rem] border border-white/80 bg-white/70 px-4 py-3 text-sm text-slate-600 backdrop-blur dark:border-white/10 dark:bg-white/8 dark:text-white/70">
                  <p className="life-card-label">Siblings</p>
                  <p className="mt-2 font-semibold text-slate-900 dark:text-white">
                    {selectedSiblingPeople.length ? selectedSiblingPeople.map((person) => person.name || 'Unnamed person').join(', ') : 'No sibling link yet'}
                  </p>
                </div>
                <div className="rounded-[1.2rem] border border-white/80 bg-white/70 px-4 py-3 text-sm text-slate-600 backdrop-blur dark:border-white/10 dark:bg-white/8 dark:text-white/70">
                  <p className="life-card-label">Children</p>
                  <p className="mt-2 font-semibold text-slate-900 dark:text-white">
                    {selectedChildPeople.length ? selectedChildPeople.map((person) => person.name || 'Unnamed person').join(', ') : 'No children linked'}
                  </p>
                </div>
              </div>

              <div>
                <p className="life-card-label">Quick actions</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button type="button" onClick={() => centerViewportOnPerson(selectedPerson.id)} className="life-secondary-button px-4 py-2">
                    Center on chart
                  </button>
                  <button type="button" onClick={() => handleSelectPerson('person-self')} className="life-tab whitespace-nowrap">
                    Jump to me
                  </button>
                  <button type="button" onClick={() => primeQuickAdd('father')} className="life-tab whitespace-nowrap">
                    Add father
                  </button>
                  <button type="button" onClick={() => primeQuickAdd('mother')} className="life-tab whitespace-nowrap">
                    Add mother
                  </button>
                  <button type="button" onClick={() => primeQuickAdd('spouse')} className="life-tab whitespace-nowrap">
                    Add spouse
                  </button>
                  <button type="button" onClick={() => primeQuickAdd('brother')} className="life-tab whitespace-nowrap">
                    Add brother
                  </button>
                  <button type="button" onClick={() => primeQuickAdd('sister')} className="life-tab whitespace-nowrap">
                    Add sister
                  </button>
                  <button type="button" onClick={() => primeQuickAdd('son')} className="life-tab whitespace-nowrap">
                    Add son
                  </button>
                  <button type="button" onClick={() => primeQuickAdd('daughter')} className="life-tab whitespace-nowrap">
                    Add daughter
                  </button>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2">
                  <span className="life-card-label">Birth year</span>
                  <input
                    value={selectedPerson.birthYear}
                    onChange={(event) => onUpdatePerson(selectedPerson.id, { birthYear: event.target.value })}
                    className="life-input"
                  />
                </label>
                {selectedPerson.relationKey === 'custom' ? (
                  <label className="space-y-2">
                    <span className="life-card-label">Custom Hindi label</span>
                    <input
                      value={selectedPerson.relationHindi}
                      onChange={(event) => onUpdatePerson(selectedPerson.id, { relationHindi: event.target.value })}
                      className="life-input"
                    />
                  </label>
                ) : (
                  <div className="rounded-[1.2rem] border border-white/80 bg-white/70 px-4 py-3 text-sm text-slate-500 backdrop-blur dark:border-white/10 dark:bg-white/8 dark:text-white/60">
                    The map auto-arranges by generation, so you can focus on names and relationships instead of moving boxes around.
                  </div>
                )}
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2">
                  <span className="life-card-label">Birthday</span>
                  <input
                    type="date"
                    value={selectedPerson.birthday}
                    onChange={(event) => onUpdatePerson(selectedPerson.id, { birthday: event.target.value })}
                    className="life-input"
                  />
                </label>
                <label className="space-y-2">
                  <span className="life-card-label">Location</span>
                  <input
                    value={selectedPerson.location}
                    onChange={(event) => onUpdatePerson(selectedPerson.id, { location: event.target.value })}
                    placeholder="Jaipur"
                    className="life-input"
                  />
                </label>
                <label className="space-y-2">
                  <span className="life-card-label">Email</span>
                  <input
                    value={selectedPerson.email}
                    onChange={(event) => onUpdatePerson(selectedPerson.id, { email: event.target.value })}
                    placeholder="name@example.com"
                    className="life-input"
                  />
                </label>
                <label className="space-y-2">
                  <span className="life-card-label">Phone</span>
                  <input
                    value={selectedPerson.phone}
                    onChange={(event) => onUpdatePerson(selectedPerson.id, { phone: event.target.value })}
                    placeholder="+91 ..."
                    className="life-input"
                  />
                </label>
              </div>

              {selectedPerson.relationKey === 'custom' ? (
                <label className="space-y-2">
                  <span className="life-card-label">Custom English label</span>
                  <input
                    value={selectedPerson.relationLabel}
                    onChange={(event) => onUpdatePerson(selectedPerson.id, { relationLabel: event.target.value })}
                    className="life-input"
                  />
                </label>
              ) : null}

              <label className="space-y-2">
                <span className="life-card-label">Note</span>
                <textarea
                  value={selectedPerson.note}
                  onChange={(event) => onUpdatePerson(selectedPerson.id, { note: event.target.value })}
                  rows={3}
                  className="life-textarea"
                />
              </label>

              <label className="space-y-2">
                <span className="life-card-label">Medical or context notes</span>
                <textarea
                  value={selectedPerson.medicalNotes}
                  onChange={(event) => onUpdatePerson(selectedPerson.id, { medicalNotes: event.target.value })}
                  rows={3}
                  className="life-textarea"
                />
              </label>

              {selectedPerson.id === 'person-self' ? null : (
                <button
                  type="button"
                  onClick={() => onDeletePerson(selectedPerson.id)}
                  className="life-danger-button w-full justify-center"
                >
                  <Trash2 size={16} />
                  Remove person
                </button>
              )}
            </div>
          </section>
        ) : null}
      </div>

      <section className="life-panel overflow-hidden">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="life-card-label">Family map</p>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-900 dark:text-white">
              {activeChart.name}
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-500 dark:text-white/55">
              This chart shows one family side at a time, so your main family, your wife&apos;s side, or any in-law family can stay separate instead of crowding one chart.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => setZoom((current) => clamp(Number((current - 0.08).toFixed(2)), 0.3, 1.05))} className="life-secondary-button px-4 py-2">
              <ZoomOut size={16} />
            </button>
            <div className="rounded-full border border-white/80 bg-white/70 px-4 py-2 text-sm font-semibold text-slate-700 backdrop-blur dark:border-white/10 dark:bg-white/8 dark:text-white/75">
              {Math.round(zoom * 100)}%
            </div>
            <button type="button" onClick={() => setZoom((current) => clamp(Number((current + 0.08).toFixed(2)), 0.3, 1.05))} className="life-secondary-button px-4 py-2">
              <ZoomIn size={16} />
            </button>
            <button type="button" onClick={fitCanvas} className="life-secondary-button">
              <RefreshCcw size={16} />
              Fit smart layout
            </button>
            <button type="button" onClick={() => handleSelectPerson('person-self')} className="life-secondary-button">
              Jump to me
            </button>
            <button type="button" onClick={resetFamilyView} className="life-secondary-button">
              Reset view
            </button>
          </div>
        </div>

        <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1.05fr),auto] xl:items-start">
          <div className="space-y-4">
            <label className="relative block">
              <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-white/35" />
              <input
                value={familySearchQuery}
                onChange={(event) => setFamilySearchQuery(event.target.value)}
                placeholder="Find a family member and jump to them"
                className="life-input pl-11"
              />
            </label>
            {familySearchQuery.trim() ? (
              <div className="flex flex-wrap gap-2">
                {familySearchResults.length === 0 ? (
                  <span className="tag">No match</span>
                ) : (
                  familySearchResults.map((person) => {
                    const relationMeta = directRelationLookup.get(person.id) || getRelationMeta(person.relationKey, person.relationLabel, person.relationHindi);
                    return (
                      <button
                        key={person.id}
                        type="button"
                        onClick={() => handleSelectPerson(person.id)}
                        className="life-tab whitespace-nowrap"
                      >
                        {person.name || 'Unnamed person'}
                        {' • '}
                        {relationMeta.label}
                      </button>
                    );
                  })
                )}
              </div>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-2 xl:max-w-[28rem] xl:justify-end">
            {[
              { id: 'lineage', label: 'Full lineage' },
              { id: 'direct', label: 'Direct family' },
            ].map((mode) => (
              <button
                key={mode.id}
                type="button"
                onClick={() => handleFocusModeChange(mode.id)}
                className={focusMode === mode.id ? 'life-tab life-tab-active whitespace-nowrap' : 'life-tab whitespace-nowrap opacity-70'}
              >
                {mode.label}
              </button>
            ))}
            <button
              type="button"
              onClick={handleIsolateBranchToggle}
              className={isolateBranch ? 'life-tab life-tab-active whitespace-nowrap' : 'life-tab whitespace-nowrap opacity-70'}
            >
              {isolateBranch ? 'Branch only' : 'Show full tree'}
            </button>
            {[
              { id: 'compact', label: 'Compact' },
              { id: 'balanced', label: 'Balanced' },
              { id: 'spacious', label: 'Spacious' },
            ].map((density) => (
              <button
                key={density.id}
                type="button"
                onClick={() => handleDensityChange(density.id)}
                className={layoutDensity === density.id ? 'life-tab life-tab-active whitespace-nowrap' : 'life-tab whitespace-nowrap opacity-70'}
              >
                {density.label}
              </button>
            ))}
            <button
              type="button"
              onClick={handleGenerationLabelsToggle}
              className={showGenerationLabels ? 'life-tab whitespace-nowrap' : 'life-tab whitespace-nowrap opacity-70'}
            >
              {showGenerationLabels ? 'Hide row labels' : 'Show row labels'}
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {focusState.hasBranchFocus ? (
            <>
              <span className="tag">{selectedPerson?.name || 'Selected person'} in focus</span>
              <span className="tag">{focusMode === 'lineage' ? 'Full lineage focus' : 'Direct family focus'}</span>
              {isolateBranch ? <span className="tag">Only this branch visible</span> : null}
              {focusState.spouseCount ? <span className="tag">{focusState.spouseCount} spouse link{focusState.spouseCount === 1 ? '' : 's'}</span> : null}
              {focusState.siblingCount ? <span className="tag">{focusState.siblingCount} sibling card{focusState.siblingCount === 1 ? '' : 's'}</span> : null}
              {focusState.ancestorCount ? <span className="tag">{focusState.ancestorCount} ancestor card{focusState.ancestorCount === 1 ? '' : 's'}</span> : null}
              {focusState.descendantCount ? <span className="tag">{focusState.descendantCount} descendant card{focusState.descendantCount === 1 ? '' : 's'}</span> : null}
            </>
          ) : null}
          {visibleGenerationRows.map((generation) => (
            <span key={generation} className="tag">
              {getRowLabel(generation)}
            </span>
          ))}
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-[1.2rem] border border-white/80 bg-white/70 px-4 py-3 text-sm text-slate-600 backdrop-blur dark:border-white/10 dark:bg-white/8 dark:text-white/70">
            <p className="life-card-label">Card legend</p>
            <p className="mt-2"><span className="font-semibold text-slate-900 dark:text-white">Dark card</span> = selected person</p>
          </div>
          <div className="rounded-[1.2rem] border border-sky-200 bg-sky-50/85 px-4 py-3 text-sm text-sky-700 backdrop-blur dark:border-sky-400/30 dark:bg-sky-500/12 dark:text-sky-200">
            Root of the current chart is indigo. Ancestors are blue and descendants stay green.
          </div>
          <div className="rounded-[1.2rem] border border-violet-200 bg-violet-50/85 px-4 py-3 text-sm text-violet-700 backdrop-blur dark:border-violet-400/30 dark:bg-violet-500/12 dark:text-violet-200">
            Spouses are violet and sibling branch context stays amber.
          </div>
          <div className="rounded-[1.2rem] border border-white/80 bg-white/70 px-4 py-3 text-sm text-slate-600 backdrop-blur dark:border-white/10 dark:bg-white/8 dark:text-white/70">
            Straight solid lines show family structure. Dashed lines show lighter peer links.
          </div>
        </div>

        <div ref={canvasViewportRef} className="mt-6 h-[78vh] overflow-auto rounded-[1.5rem] border border-white/80 bg-slate-50/72 p-3 dark:border-white/10 dark:bg-slate-950/35">
          <div className="relative" style={{ width: layout.canvasWidth * zoom, minHeight: layout.canvasHeight * zoom }}>
            <div
              className="family-grid relative rounded-[1.6rem]"
              style={{
                width: layout.canvasWidth,
                height: layout.canvasHeight,
                transform: `scale(${zoom})`,
                transformOrigin: 'top left',
              }}
            >
              {showGenerationLabels ? visibleGenerationRows.map((generation) => {
                const top = (layout.generationRows.indexOf(generation) * layout.rowGap) + layout.canvasPaddingY - 34;
                return (
                  <div key={generation} className="absolute left-6" style={{ top }}>
                    <span className="tag">{getRowLabel(generation)}</span>
                  </div>
                );
              }) : null}

              <svg className="absolute inset-0 h-full w-full" viewBox={`0 0 ${layout.canvasWidth} ${layout.canvasHeight}`} fill="none">
                {visibleUnits.filter((unit) => unit.members.length === 2).map((unit) => {
                  const leftCard = layout.personLayout.get(unit.members[0].id);
                  const rightCard = layout.personLayout.get(unit.members[1].id);
                  if (!leftCard || !rightCard) return null;
                  const y = unit.y + 34;
                  const startX = leftCard.x + CARD_WIDTH;
                  const endX = rightCard.x;
                  return (
                    <line
                      key={`pair:${unit.key}`}
                      x1={startX}
                      y1={y}
                      x2={endX}
                      y2={y}
                      stroke={focusState.highlightedCoupleUnitKeys.has(unit.key)
                        ? 'rgba(79, 70, 229, 0.96)'
                        : focusState.hasBranchFocus
                          ? 'rgba(148, 163, 184, 0.24)'
                          : 'rgba(59, 130, 246, 0.72)'}
                      strokeWidth={focusState.highlightedCoupleUnitKeys.has(unit.key) ? '4' : '3'}
                      strokeLinecap="round"
                    />
                  );
                })}

                {visibleFamilyGroups.map((group, index) => {
                  const parentUnit = layout.unitByKey.get(group.parentUnitKey);
                  const childUnits = group.childUnitKeys
                    .filter((key) => visibleUnitKeys.has(key))
                    .map((key) => layout.unitByKey.get(key))
                    .filter(Boolean);
                  if (!parentUnit || childUnits.length === 0) return null;
                  const isHighlighted = focusState.highlightedFamilyGroupKeys.has(group.key);
                  const stroke = isHighlighted
                    ? 'rgba(37, 99, 235, 0.96)'
                    : focusState.hasBranchFocus
                      ? 'rgba(148, 163, 184, 0.28)'
                      : 'rgba(15, 23, 42, 0.36)';
                  const strokeWidth = isHighlighted ? '3.5' : '2.5';

                  const childTopY = Math.min(...childUnits.map((unit) => unit.topY));
                  const junctionY = parentUnit.bottomY + Math.max(34, Math.min(86, (childTopY - parentUnit.bottomY) * 0.42));

                  if (childUnits.length === 1) {
                    const childUnit = childUnits[0];
                    const path = buildOrthogonalPath(parentUnit.centerX, parentUnit.bottomY, childUnit.centerX, childUnit.topY);
                    return (
                      <path
                        key={`family:${group.parentUnitKey}:${childUnit.key}:${index}`}
                        d={path}
                        stroke={stroke}
                        strokeWidth={strokeWidth}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeDasharray={group.dashed ? '8 8' : undefined}
                      />
                    );
                  }

                  const firstChild = childUnits[0];
                  const lastChild = childUnits[childUnits.length - 1];
                  return (
                    <g key={`family-group:${group.key}:${index}`}>
                      <path
                        d={`M ${parentUnit.centerX} ${parentUnit.bottomY} V ${junctionY}`}
                        stroke={stroke}
                        strokeWidth={strokeWidth}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeDasharray={group.dashed ? '8 8' : undefined}
                      />
                      <path
                        d={`M ${firstChild.centerX} ${junctionY} H ${lastChild.centerX}`}
                        stroke={stroke}
                        strokeWidth={strokeWidth}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeDasharray={group.dashed ? '8 8' : undefined}
                      />
                      {childUnits.map((childUnit) => (
                        <path
                          key={`family-branch:${group.key}:${childUnit.key}`}
                          d={`M ${childUnit.centerX} ${junctionY} V ${childUnit.topY}`}
                          stroke={stroke}
                          strokeWidth={strokeWidth}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeDasharray={group.dashed ? '8 8' : undefined}
                        />
                      ))}
                    </g>
                  );
                })}

                {visiblePeerLinks.map((link, index) => {
                  const leftUnit = layout.unitByKey.get(link.leftUnitKey);
                  const rightUnit = layout.unitByKey.get(link.rightUnitKey);
                  if (!leftUnit || !rightUnit) return null;
                  const [first, second] = leftUnit.centerX <= rightUnit.centerX ? [leftUnit, rightUnit] : [rightUnit, leftUnit];
                  const path = buildOrthogonalPath(first.centerX, first.centerY, second.centerX, second.centerY);
                  const isHighlighted = focusState.highlightedPeerLinkKeys.has(link.key);
                  return (
                    <path
                      key={`peer:${first.key}:${second.key}:${index}`}
                      d={path}
                      stroke={isHighlighted
                        ? 'rgba(79, 70, 229, 0.82)'
                        : focusState.hasBranchFocus
                          ? 'rgba(148, 163, 184, 0.18)'
                          : 'rgba(99, 102, 241, 0.38)'}
                      strokeWidth={isHighlighted ? '2.5' : '2'}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeDasharray={link.dashed ? '8 8' : '4 8'}
                    />
                  );
                })}
              </svg>

              {visibleUnits.map((unit) => (
                <div
                  key={unit.key}
                  className="absolute"
                  style={{ left: unit.x, top: unit.y, width: unit.width, height: CARD_HEIGHT }}
                >
                  {unit.isCouple ? (
                    <div className="absolute left-1/2 top-[-18px] -translate-x-1/2 rounded-full border border-white/80 bg-white/88 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-600 backdrop-blur dark:border-white/10 dark:bg-slate-950/80 dark:text-white/65">
                      Couple
                    </div>
                  ) : null}

                  {unit.members.map((person, index) => {
                    const relationMeta = directRelationLookup.get(person.id) || getRelationMeta(person.relationKey, person.relationLabel, person.relationHindi);
                    const isSelected = person.id === family.selectedPersonId;
                    const cardRole = focusState.cardRoles.get(person.id) || 'default';
                    const isHighlightedRelative = cardRole === 'root' || cardRole === 'spouse' || cardRole === 'ancestor' || cardRole === 'descendant' || cardRole === 'sibling';
                    const shouldDim = focusState.hasBranchFocus && !isSelected && !isHighlightedRelative;
                    const left = index * (CARD_WIDTH + PARTNER_GAP);
                    const cardClass = isSelected
                      ? 'absolute rounded-[1.4rem] border border-slate-950 bg-slate-950 p-4 text-left text-white shadow-lg dark:border-white dark:bg-white dark:text-slate-950'
                      : cardRole === 'root'
                        ? 'absolute rounded-[1.4rem] border border-indigo-200 bg-indigo-50/92 p-4 text-left text-slate-900 shadow-[0_18px_40px_rgba(79,70,229,0.14)] backdrop-blur transition hover:-translate-y-0.5 hover:shadow-lg dark:border-indigo-400/30 dark:bg-indigo-500/12 dark:text-white'
                      : cardRole === 'spouse'
                        ? 'absolute rounded-[1.4rem] border border-violet-200 bg-violet-50/92 p-4 text-left text-slate-900 shadow-[0_18px_40px_rgba(124,58,237,0.14)] backdrop-blur transition hover:-translate-y-0.5 hover:shadow-lg dark:border-violet-400/30 dark:bg-violet-500/12 dark:text-white'
                        : cardRole === 'sibling'
                          ? 'absolute rounded-[1.4rem] border border-amber-200 bg-amber-50/92 p-4 text-left text-slate-900 shadow-[0_18px_40px_rgba(245,158,11,0.14)] backdrop-blur transition hover:-translate-y-0.5 hover:shadow-lg dark:border-amber-400/30 dark:bg-amber-500/12 dark:text-white'
                        : cardRole === 'ancestor'
                          ? 'absolute rounded-[1.4rem] border border-sky-200 bg-sky-50/92 p-4 text-left text-slate-900 shadow-[0_18px_40px_rgba(14,165,233,0.14)] backdrop-blur transition hover:-translate-y-0.5 hover:shadow-lg dark:border-sky-400/30 dark:bg-sky-500/12 dark:text-white'
                          : cardRole === 'descendant'
                            ? 'absolute rounded-[1.4rem] border border-emerald-200 bg-emerald-50/92 p-4 text-left text-slate-900 shadow-[0_18px_40px_rgba(16,185,129,0.14)] backdrop-blur transition hover:-translate-y-0.5 hover:shadow-lg dark:border-emerald-400/30 dark:bg-emerald-500/12 dark:text-white'
                            : shouldDim
                              ? 'absolute rounded-[1.4rem] border border-white/75 bg-white/70 p-4 text-left text-slate-900 opacity-45 shadow-sm backdrop-blur transition hover:opacity-75 dark:border-white/10 dark:bg-slate-950/72 dark:text-white'
                              : 'absolute rounded-[1.4rem] border border-white/90 bg-white/82 p-4 text-left text-slate-900 shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:shadow-md dark:border-white/10 dark:bg-slate-950/82 dark:text-white';
                    const relationClass = isSelected
                      ? 'mt-1 text-sm font-semibold text-white/85 dark:text-slate-700'
                      : cardRole === 'root'
                        ? 'mt-1 text-sm font-semibold text-indigo-700 dark:text-indigo-200'
                      : cardRole === 'spouse'
                        ? 'mt-1 text-sm font-semibold text-violet-700 dark:text-violet-200'
                        : cardRole === 'sibling'
                          ? 'mt-1 text-sm font-semibold text-amber-700 dark:text-amber-200'
                        : cardRole === 'ancestor'
                          ? 'mt-1 text-sm font-semibold text-sky-700 dark:text-sky-200'
                          : cardRole === 'descendant'
                            ? 'mt-1 text-sm font-semibold text-emerald-700 dark:text-emerald-200'
                            : 'mt-1 text-sm font-semibold text-slate-500 dark:text-white/60';
                    const hindiClass = isSelected
                      ? 'text-xs text-white/65 dark:text-slate-600'
                      : cardRole === 'root'
                        ? 'text-xs text-indigo-500 dark:text-indigo-200/75'
                      : cardRole === 'spouse'
                        ? 'text-xs text-violet-500 dark:text-violet-200/75'
                        : cardRole === 'sibling'
                          ? 'text-xs text-amber-500 dark:text-amber-200/75'
                        : cardRole === 'ancestor'
                          ? 'text-xs text-sky-500 dark:text-sky-200/75'
                          : cardRole === 'descendant'
                            ? 'text-xs text-emerald-500 dark:text-emerald-200/75'
                            : 'text-xs text-slate-400 dark:text-white/40';
                    const detailsClass = isSelected
                      ? 'mt-4 space-y-1 text-xs text-white/68 dark:text-slate-600'
                      : shouldDim
                        ? 'mt-4 space-y-1 text-xs text-slate-400 dark:text-white/38'
                        : 'mt-4 space-y-1 text-xs text-slate-500 dark:text-white/52';

                    return (
                      <div
                        key={person.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => handleSelectPerson(person.id)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            handleSelectPerson(person.id);
                          }
                        }}
                        className={cardClass}
                        style={{ left, top: 0, width: CARD_WIDTH, minHeight: CARD_HEIGHT }}
                      >
                        <div className="min-w-0">
                          <p className="truncate text-base font-black tracking-tight">{person.name || 'Unnamed person'}</p>
                          <p className={relationClass}>
                            {relationMeta.label}
                          </p>
                          <p className={hindiClass}>
                            {relationMeta.hindi}
                          </p>
                        </div>

                        <div className={detailsClass}>
                          <p>{person.birthYear ? `Born ${person.birthYear}` : 'Birth year not added'}</p>
                          <p>{person.location || 'Location not added'}</p>
                          <p className="line-clamp-2">{person.note || 'Add a note for city, branch, or context.'}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default FamilyView;
