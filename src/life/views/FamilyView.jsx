import { useEffect, useMemo, useRef, useState } from 'react';
import { GitBranchPlus, Link2, RefreshCcw, ScanSearch, Trash2, UserPlus2, ZoomIn, ZoomOut } from 'lucide-react';
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
const UNIT_GAP = 64;
const SIBLING_GAP = 34;
const CLUSTER_GAP = 108;
const ROW_GAP = 248;
const CANVAS_PADDING_X = 96;
const CANVAS_PADDING_Y = 88;
const MIN_CANVAS_WIDTH = 1940;

const pairedRelationMatchers = {
  father: 'mother',
  mother: 'father',
  grandfather: 'grandmother',
  grandmother: 'grandfather',
  fatherInLaw: 'motherInLaw',
  motherInLaw: 'fatherInLaw',
};

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

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

  return new Map((family.people || []).map((person) => {
    const meta = resolve(person.id);
    return [person.id, { label: meta.label, hindi: meta.hindi }];
  }));
};

const buildOrthogonalPath = (startX, startY, endX, endY) => {
  if (Math.abs(endY - startY) < 8) {
    return `M ${startX} ${startY} H ${endX}`;
  }

  const middleY = startY + (endY - startY) / 2;
  return `M ${startX} ${startY} V ${middleY} H ${endX} V ${endY}`;
};

const buildFamilyLayout = (family) => {
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
    if (person == null) return 0;
    if (trail.has(personId)) return 0;

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
    const anchorPersonId = orderedMembers.find((member) => member.anchorId && !orderedMembers.some((candidate) => candidate.id === member.anchorId))?.anchorId || '';
    const averageBias = orderedMembers.reduce((sum, member) => sum + getRelationSideBias(member.relationKey), 0) / orderedMembers.length;
    const width = orderedMembers.length * CARD_WIDTH + (orderedMembers.length - 1) * PARTNER_GAP;

    const unit = {
      key,
      members: orderedMembers,
      generation,
      anchorPersonId,
      sideBias: averageBias,
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

  const unitsByGeneration = new Map();
  units.forEach((unit) => {
    const existing = unitsByGeneration.get(unit.generation) || [];
    existing.push(unit);
    unitsByGeneration.set(unit.generation, existing);
  });

  const generationRows = [...unitsByGeneration.keys()].sort((left, right) => left - right);
  const rowYByGeneration = new Map(
    generationRows.map((generation, index) => [generation, CANVAS_PADDING_Y + index * ROW_GAP]),
  );

  const familyLinkMap = new Map();
  const peerLinkMap = new Map();
  const unitByKey = new Map(units.map((unit) => [unit.key, unit]));
  const sortUnitKeys = (unitKeys = []) => [...unitKeys].sort((leftKey, rightKey) => {
    const left = unitByKey.get(leftKey);
    const right = unitByKey.get(rightKey);
    if (!left || !right) return String(leftKey).localeCompare(String(rightKey));
    return left.sideBias - right.sideBias
      || left.members.map((member) => member.name).join(' ').localeCompare(right.members.map((member) => member.name).join(' '));
  });
  const addFamilyLink = (parentUnitKey, childUnitKey, dashed = false) => {
    if (!parentUnitKey || !childUnitKey || parentUnitKey === childUnitKey) return;
    const key = `family:${parentUnitKey}:${childUnitKey}`;
    if (familyLinkMap.has(key)) {
      const existing = familyLinkMap.get(key);
      existing.dashed = existing.dashed && Boolean(dashed);
      return;
    }
    familyLinkMap.set(key, {
      kind: 'family',
      parentUnitKey,
      childUnitKey,
      dashed: Boolean(dashed),
    });
  };
  const addPeerLink = (leftUnitKey, rightUnitKey, dashed) => {
    if (!leftUnitKey || !rightUnitKey || leftUnitKey === rightUnitKey) return;
    const [firstKey, secondKey] = [leftUnitKey, rightUnitKey].sort();
    const key = `peer:${firstKey}:${secondKey}`;
    if (peerLinkMap.has(key)) return;
    peerLinkMap.set(key, {
      kind: 'peer',
      leftUnitKey: firstKey,
      rightUnitKey: secondKey,
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
      addFamilyLink(anchorUnitKey, sourceUnitKey);
    } else if (personGeneration < anchorGeneration) {
      addFamilyLink(sourceUnitKey, anchorUnitKey);
    }
  });

  const dedupedRelationships = [];
  const seenRelationships = new Set();

  (family.relationships || []).forEach((relationship) => {
    const key = getCanonicalRelationshipKey(relationship);
    if (!key || seenRelationships.has(key)) return;
    seenRelationships.add(key);
    dedupedRelationships.push(relationship);

    const sourceUnitKey = personToUnitKey.get(relationship.sourceId);
    const targetUnitKey = personToUnitKey.get(relationship.targetId);
    if (!sourceUnitKey || !targetUnitKey || sourceUnitKey === targetUnitKey) return;

    if (relationship.type === 'parent') {
      addFamilyLink(sourceUnitKey, targetUnitKey, false);
      return;
    }

    if (relationship.type === 'child') {
      addFamilyLink(targetUnitKey, sourceUnitKey, false);
      return;
    }

    if (relationship.type === 'spouse') return;

    addPeerLink(sourceUnitKey, targetUnitKey, relationship.type === 'custom' || relationship.type === 'guardian');
  });

  const duplicateRelationshipCount = Math.max(0, (family.relationships || []).length - dedupedRelationships.length);
  const familyLinks = [...familyLinkMap.values()];
  const peerLinks = [...peerLinkMap.values()];
  const parentCandidatesByChild = new Map();

  familyLinks.forEach((link) => {
    const existing = parentCandidatesByChild.get(link.childUnitKey) || [];
    existing.push(link.parentUnitKey);
    parentCandidatesByChild.set(link.childUnitKey, existing);
  });

  const parentPriority = (unitKey) => {
    const unit = unitByKey.get(unitKey);
    if (!unit) return 0;
    return (unit.isCouple ? 8 : 0) + unit.members.length * 2 + (unit.containsSelf ? 1 : 0);
  };

  const primaryParentByChild = new Map();
  parentCandidatesByChild.forEach((candidateParents, childUnitKey) => {
    const parentKey = [...new Set(candidateParents)].sort((leftKey, rightKey) => (
      parentPriority(rightKey) - parentPriority(leftKey)
      || (unitByKey.get(leftKey)?.generation ?? 0) - (unitByKey.get(rightKey)?.generation ?? 0)
      || String(leftKey).localeCompare(String(rightKey))
    ))[0];
    if (parentKey) primaryParentByChild.set(childUnitKey, parentKey);
  });

  const childrenByParent = new Map();
  primaryParentByChild.forEach((parentUnitKey, childUnitKey) => {
    const existing = childrenByParent.get(parentUnitKey) || [];
    existing.push(childUnitKey);
    childrenByParent.set(parentUnitKey, existing);
  });

  const subtreeWidthCache = new Map();
  const subtreeHasSelfCache = new Map();
  const getSubtreeHasSelf = (unitKey, trail = new Set()) => {
    if (subtreeHasSelfCache.has(unitKey)) return subtreeHasSelfCache.get(unitKey);
    if (trail.has(unitKey)) return unitByKey.get(unitKey)?.containsSelf || false;
    const unit = unitByKey.get(unitKey);
    if (!unit) return false;
    const nextTrail = new Set([...trail, unitKey]);
    const hasSelf = unit.containsSelf || sortUnitKeys(childrenByParent.get(unitKey) || []).some((childUnitKey) => getSubtreeHasSelf(childUnitKey, nextTrail));
    subtreeHasSelfCache.set(unitKey, hasSelf);
    return hasSelf;
  };

  const getSubtreeWidth = (unitKey, trail = new Set()) => {
    if (subtreeWidthCache.has(unitKey)) return subtreeWidthCache.get(unitKey);
    const unit = unitByKey.get(unitKey);
    if (!unit) return CARD_WIDTH;
    if (trail.has(unitKey)) return unit.width;

    const nextTrail = new Set([...trail, unitKey]);
    const childUnitKeys = sortUnitKeys(childrenByParent.get(unitKey) || []);
    const childGap = childUnitKeys.length > 1 ? SIBLING_GAP : 0;
    const descendantsWidth = childUnitKeys.reduce((sum, childUnitKey) => sum + getSubtreeWidth(childUnitKey, nextTrail), 0)
      + Math.max(0, childUnitKeys.length - 1) * childGap;
    const width = Math.max(unit.width, descendantsWidth);
    subtreeWidthCache.set(unitKey, width);
    return width;
  };

  const rootUnitKeys = sortUnitKeys(
    units
      .map((unit) => unit.key)
      .filter((unitKey) => !primaryParentByChild.has(unitKey)),
  ).sort((leftKey, rightKey) => {
    const leftHasSelf = Number(getSubtreeHasSelf(leftKey));
    const rightHasSelf = Number(getSubtreeHasSelf(rightKey));
    const leftUnit = unitByKey.get(leftKey);
    const rightUnit = unitByKey.get(rightKey);
    return rightHasSelf - leftHasSelf
      || (leftUnit?.generation ?? 0) - (rightUnit?.generation ?? 0)
      || (leftUnit?.sideBias ?? 0) - (rightUnit?.sideBias ?? 0)
      || String(leftKey).localeCompare(String(rightKey));
  });

  const totalForestWidth = rootUnitKeys.reduce((sum, unitKey) => sum + getSubtreeWidth(unitKey), 0)
    + Math.max(0, rootUnitKeys.length - 1) * CLUSTER_GAP;
  const canvasWidth = Math.max(MIN_CANVAS_WIDTH, totalForestWidth + CANVAS_PADDING_X * 2);
  const canvasHeight = CANVAS_PADDING_Y * 2 + Math.max(0, generationRows.length - 1) * ROW_GAP + CARD_HEIGHT;

  const unitPlacement = new Map();
  const placeSubtree = (unitKey, centerX, trail = new Set()) => {
    const unit = unitByKey.get(unitKey);
    if (!unit || trail.has(unitKey)) return;

    const y = rowYByGeneration.get(unit.generation) || CANVAS_PADDING_Y;
    const x = centerX - unit.width / 2;
    unitPlacement.set(unit.key, {
      ...unit,
      x,
      y,
      centerX,
      centerY: y + CARD_HEIGHT / 2,
      topY: y,
      bottomY: y + CARD_HEIGHT,
    });

    const childUnitKeys = sortUnitKeys(childrenByParent.get(unitKey) || []);
    if (childUnitKeys.length === 0) return;

    const childGap = childUnitKeys.length > 1 ? SIBLING_GAP : 0;
    const nextTrail = new Set([...trail, unitKey]);
    const totalChildrenWidth = childUnitKeys.reduce((sum, childUnitKey) => sum + getSubtreeWidth(childUnitKey, nextTrail), 0)
      + Math.max(0, childUnitKeys.length - 1) * childGap;
    let cursorX = centerX - totalChildrenWidth / 2;

    childUnitKeys.forEach((childUnitKey) => {
      const childWidth = getSubtreeWidth(childUnitKey, nextTrail);
      const childCenterX = cursorX + childWidth / 2;
      placeSubtree(childUnitKey, childCenterX, nextTrail);
      cursorX += childWidth + childGap;
    });
  };

  const focusedRootIndex = Math.max(0, rootUnitKeys.findIndex((unitKey) => getSubtreeHasSelf(unitKey)));
  if (rootUnitKeys.length > 0) {
    const focusedRootKey = rootUnitKeys[focusedRootIndex] || rootUnitKeys[0];
    const focusedWidth = getSubtreeWidth(focusedRootKey);
    placeSubtree(focusedRootKey, canvasWidth / 2);

    let leftCursor = canvasWidth / 2 - focusedWidth / 2 - CLUSTER_GAP;
    for (let index = focusedRootIndex - 1; index >= 0; index -= 1) {
      const rootKey = rootUnitKeys[index];
      const rootWidth = getSubtreeWidth(rootKey);
      placeSubtree(rootKey, leftCursor - rootWidth / 2);
      leftCursor -= rootWidth + CLUSTER_GAP;
    }

    let rightCursor = canvasWidth / 2 + focusedWidth / 2 + CLUSTER_GAP;
    for (let index = focusedRootIndex + 1; index < rootUnitKeys.length; index += 1) {
      const rootKey = rootUnitKeys[index];
      const rootWidth = getSubtreeWidth(rootKey);
      placeSubtree(rootKey, rightCursor + rootWidth / 2);
      rightCursor += rootWidth + CLUSTER_GAP;
    }
  }

  sortUnitKeys(units.map((unit) => unit.key))
    .filter((unitKey) => !unitPlacement.has(unitKey))
    .forEach((unitKey) => {
      const fallbackWidth = getSubtreeWidth(unitKey);
      placeSubtree(unitKey, CANVAS_PADDING_X + fallbackWidth / 2);
    });

  const positionedUnits = [...unitPlacement.values()];
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
  const familyGroups = new Map();

  familyLinks.forEach((link) => {
    const childPlacement = unitPlacement.get(link.childUnitKey);
    const groupKey = `${link.parentUnitKey}:${childPlacement?.topY || 0}`;
    const existing = familyGroups.get(groupKey) || {
      key: groupKey,
      parentUnitKey: link.parentUnitKey,
      childUnitKeys: [],
      dashed: Boolean(link.dashed),
    };

    if (!existing.childUnitKeys.includes(link.childUnitKey)) {
      existing.childUnitKeys.push(link.childUnitKey);
    }

    existing.dashed = existing.dashed && Boolean(link.dashed);
    familyGroups.set(groupKey, existing);
  });

  const orderedFamilyGroups = [...familyGroups.values()].map((group) => ({
    ...group,
    childUnitKeys: [...group.childUnitKeys].sort((leftKey, rightKey) => (
      (unitPlacement.get(leftKey)?.centerX || 0) - (unitPlacement.get(rightKey)?.centerX || 0)
    )),
  }));

  return {
    canvasWidth,
    canvasHeight,
    generationRows,
    positionedUnits,
    personLayout,
    peopleById,
    dedupedRelationships,
    duplicateRelationshipCount,
    familyGroups: orderedFamilyGroups,
    peerLinks,
  };
};

const FamilyView = ({
  family,
  onAddPerson,
  onBulkAdd,
  onUpdatePerson,
  onDeletePerson,
  onAddRelationship,
  onDeleteRelationship,
  onSelectPerson,
}) => {
  const [personDraft, setPersonDraft] = useState(createPersonDraft(family.people));
  const [relationshipDraft, setRelationshipDraft] = useState(createRelationshipDraft(family.people));
  const [bulkText, setBulkText] = useState('');
  const [bulkFeedback, setBulkFeedback] = useState('');
  const [zoom, setZoom] = useState(0.64);
  const canvasViewportRef = useRef(null);

  const layout = useMemo(() => buildFamilyLayout(family), [family]);
  const directRelationLookup = useMemo(() => buildDirectRelationLookup(family), [family]);
  const unitLookup = useMemo(
    () => new Map(layout.positionedUnits.map((unit) => [unit.key, unit])),
    [layout.positionedUnits],
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

  const fitCanvas = () => {
    const bounds = canvasViewportRef.current?.getBoundingClientRect();
    if (bounds == null) return;
    const fitted = clamp(
      Math.min((bounds.width - 24) / layout.canvasWidth, (bounds.height - 24) / layout.canvasHeight, 1),
      0.34,
      0.92,
    );
    setZoom(Number(fitted.toFixed(2)));
    canvasViewportRef.current?.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    const id = window.requestAnimationFrame(fitCanvas);
    window.addEventListener('resize', fitCanvas);
    return () => {
      window.cancelAnimationFrame(id);
      window.removeEventListener('resize', fitCanvas);
    };
  }, [layout.canvasHeight, layout.canvasWidth]);

  const selectedPerson = family.people.find((person) => person.id === family.selectedPersonId) || family.people[0];
  const selectedAnchor = selectedPerson?.anchorId ? layout.peopleById[selectedPerson.anchorId] : null;
  const selectedRelationMeta = selectedPerson
    ? directRelationLookup.get(selectedPerson.id) || getRelationMeta(selectedPerson.relationKey, selectedPerson.relationLabel, selectedPerson.relationHindi)
    : null;

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

  return (
    <div className="grid gap-6 xl:grid-cols-[390px,minmax(0,1fr)]">
      <div className="space-y-6">
        <section className="life-panel">
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
              Generational layout, straight lines, and smoother couple-and-child grouping.
            </h2>
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
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {layout.generationRows.map((generation) => (
            <span key={generation} className="tag">
              {getRowLabel(generation)}
            </span>
          ))}
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
              {layout.generationRows.map((generation) => {
                const top = (layout.generationRows.indexOf(generation) * ROW_GAP) + CANVAS_PADDING_Y - 34;
                return (
                  <div key={generation} className="absolute left-6" style={{ top }}>
                    <span className="tag">{getRowLabel(generation)}</span>
                  </div>
                );
              })}

              <svg className="absolute inset-0 h-full w-full" viewBox={`0 0 ${layout.canvasWidth} ${layout.canvasHeight}`} fill="none">
                {layout.positionedUnits.filter((unit) => unit.members.length === 2).map((unit) => {
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
                      stroke="rgba(59, 130, 246, 0.72)"
                      strokeWidth="3"
                      strokeLinecap="round"
                    />
                  );
                })}

                {layout.familyGroups.map((group, index) => {
                  const parentUnit = unitLookup.get(group.parentUnitKey);
                  const childUnits = group.childUnitKeys.map((key) => unitLookup.get(key)).filter(Boolean);
                  if (!parentUnit || childUnits.length === 0) return null;

                  const childTopY = Math.min(...childUnits.map((unit) => unit.topY));
                  const junctionY = parentUnit.bottomY + Math.max(34, Math.min(86, (childTopY - parentUnit.bottomY) * 0.42));

                  if (childUnits.length === 1) {
                    const childUnit = childUnits[0];
                    const path = buildOrthogonalPath(parentUnit.centerX, parentUnit.bottomY, childUnit.centerX, childUnit.topY);
                    return (
                      <path
                        key={`family:${group.parentUnitKey}:${childUnit.key}:${index}`}
                        d={path}
                        stroke="rgba(15, 23, 42, 0.36)"
                        strokeWidth="2.5"
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
                        stroke="rgba(15, 23, 42, 0.36)"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeDasharray={group.dashed ? '8 8' : undefined}
                      />
                      <path
                        d={`M ${firstChild.centerX} ${junctionY} H ${lastChild.centerX}`}
                        stroke="rgba(15, 23, 42, 0.36)"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeDasharray={group.dashed ? '8 8' : undefined}
                      />
                      {childUnits.map((childUnit) => (
                        <path
                          key={`family-branch:${group.key}:${childUnit.key}`}
                          d={`M ${childUnit.centerX} ${junctionY} V ${childUnit.topY}`}
                          stroke="rgba(15, 23, 42, 0.36)"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeDasharray={group.dashed ? '8 8' : undefined}
                        />
                      ))}
                    </g>
                  );
                })}

                {layout.peerLinks.map((link, index) => {
                  const leftUnit = unitLookup.get(link.leftUnitKey);
                  const rightUnit = unitLookup.get(link.rightUnitKey);
                  if (!leftUnit || !rightUnit) return null;
                  const [first, second] = leftUnit.centerX <= rightUnit.centerX ? [leftUnit, rightUnit] : [rightUnit, leftUnit];
                  const path = buildOrthogonalPath(first.centerX, first.centerY, second.centerX, second.centerY);
                  return (
                    <path
                      key={`peer:${first.key}:${second.key}:${index}`}
                      d={path}
                      stroke="rgba(99, 102, 241, 0.38)"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeDasharray={link.dashed ? '8 8' : '4 8'}
                    />
                  );
                })}
              </svg>

              {layout.positionedUnits.map((unit) => (
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
                    const left = index * (CARD_WIDTH + PARTNER_GAP);

                    return (
                      <div
                        key={person.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => onSelectPerson(person.id)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            onSelectPerson(person.id);
                          }
                        }}
                        className={isSelected
                          ? 'absolute rounded-[1.4rem] border border-slate-950 bg-slate-950 p-4 text-left text-white shadow-lg dark:border-white dark:bg-white dark:text-slate-950'
                          : 'absolute rounded-[1.4rem] border border-white/90 bg-white/82 p-4 text-left text-slate-900 shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:shadow-md dark:border-white/10 dark:bg-slate-950/82 dark:text-white'}
                        style={{ left, top: 0, width: CARD_WIDTH, minHeight: CARD_HEIGHT }}
                      >
                        <div className="min-w-0">
                          <p className="truncate text-base font-black tracking-tight">{person.name || 'Unnamed person'}</p>
                          <p className={isSelected ? 'mt-1 text-sm font-semibold text-white/85 dark:text-slate-700' : 'mt-1 text-sm font-semibold text-slate-500 dark:text-white/60'}>
                            {relationMeta.label}
                          </p>
                          <p className={isSelected ? 'text-xs text-white/65 dark:text-slate-600' : 'text-xs text-slate-400 dark:text-white/40'}>
                            {relationMeta.hindi}
                          </p>
                        </div>

                        <div className={isSelected ? 'mt-4 space-y-1 text-xs text-white/68 dark:text-slate-600' : 'mt-4 space-y-1 text-xs text-slate-500 dark:text-white/52'}>
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
