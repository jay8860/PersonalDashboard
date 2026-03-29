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

  const maxRowWidth = generationRows.reduce((largest, generation) => {
    const rowUnits = unitsByGeneration.get(generation) || [];
    const rowWidth = rowUnits.reduce((sum, unit) => sum + unit.width, 0) + Math.max(0, rowUnits.length - 1) * UNIT_GAP;
    return Math.max(largest, rowWidth);
  }, 0);
  const canvasWidth = Math.max(MIN_CANVAS_WIDTH, maxRowWidth + CANVAS_PADDING_X * 2);
  const canvasHeight = CANVAS_PADDING_Y * 2 + Math.max(0, generationRows.length - 1) * ROW_GAP + CARD_HEIGHT;

  const clusterMembers = new Map();
  units.forEach((unit) => {
    const anchorUnitKey = unit.anchorPersonId ? personToUnitKey.get(unit.anchorPersonId) || '' : '';
    const clusterKey = `${anchorUnitKey || 'root'}:${unit.generation}`;
    const existing = clusterMembers.get(clusterKey) || [];
    existing.push(unit);
    clusterMembers.set(clusterKey, existing);
  });

  clusterMembers.forEach((cluster) => {
    cluster.sort((left, right) => (
      left.sideBias - right.sideBias
      || left.members.map((member) => member.name).join(' ').localeCompare(right.members.map((member) => member.name).join(' '))
    ));
  });

  const unitPlacement = new Map();
  [...generationRows]
    .sort((left, right) => Math.abs(left) - Math.abs(right) || left - right)
    .forEach((generation) => {
      const rowUnits = unitsByGeneration.get(generation) || [];
      const annotated = rowUnits.map((unit) => {
        const anchorUnitKey = unit.anchorPersonId ? personToUnitKey.get(unit.anchorPersonId) || '' : '';
        const clusterKey = `${anchorUnitKey || 'root'}:${unit.generation}`;
        const cluster = clusterMembers.get(clusterKey) || [unit];
        const clusterIndex = Math.max(0, cluster.findIndex((candidate) => candidate.key === unit.key));
        const anchorPlacement = anchorUnitKey ? unitPlacement.get(anchorUnitKey) : null;
        const spread = Math.max(unit.width + 34, 264);
        let preferredX = canvasWidth / 2;

        if (unit.containsSelf) {
          preferredX = canvasWidth / 2;
        } else if (anchorPlacement) {
          preferredX = anchorPlacement.centerX + (clusterIndex - (cluster.length - 1) / 2) * spread + unit.sideBias * 36;
        } else if (generation === 0) {
          preferredX = canvasWidth / 2 + unit.sideBias * 260;
        } else {
          preferredX = canvasWidth / 2 + unit.sideBias * 220;
        }

        return { unit, preferredX };
      }).sort((left, right) => left.preferredX - right.preferredX || left.unit.sideBias - right.unit.sideBias);

      const totalWidth = annotated.reduce((sum, entry) => sum + entry.unit.width, 0) + Math.max(0, annotated.length - 1) * UNIT_GAP;
      const averagePreferredX = annotated.length
        ? annotated.reduce((sum, entry) => sum + entry.preferredX, 0) / annotated.length
        : canvasWidth / 2;
      const centeredX = clamp(averagePreferredX, CANVAS_PADDING_X + totalWidth / 2, canvasWidth - CANVAS_PADDING_X - totalWidth / 2);
      let cursorX = centeredX - totalWidth / 2;

      annotated.forEach(({ unit }) => {
        const x = cursorX;
        const y = rowYByGeneration.get(generation) || CANVAS_PADDING_Y;
        unitPlacement.set(unit.key, {
          ...unit,
          x,
          y,
          centerX: x + unit.width / 2,
          centerY: y + CARD_HEIGHT / 2,
          topY: y,
          bottomY: y + CARD_HEIGHT,
        });
        cursorX += unit.width + UNIT_GAP;
      });
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

  const displayLinks = new Map();
  const addDisplayLink = (key, payload) => {
    if (!key || displayLinks.has(key)) return;
    displayLinks.set(key, payload);
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
      addDisplayLink(`family:${anchorUnitKey}:${sourceUnitKey}`, {
        kind: 'family',
        parentUnitKey: anchorUnitKey,
        childUnitKey: sourceUnitKey,
      });
    } else if (personGeneration < anchorGeneration) {
      addDisplayLink(`family:${sourceUnitKey}:${anchorUnitKey}`, {
        kind: 'family',
        parentUnitKey: sourceUnitKey,
        childUnitKey: anchorUnitKey,
      });
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
      addDisplayLink(`family:${sourceUnitKey}:${targetUnitKey}`, {
        kind: 'family',
        parentUnitKey: sourceUnitKey,
        childUnitKey: targetUnitKey,
        dashed: false,
      });
      return;
    }

    if (relationship.type === 'child') {
      addDisplayLink(`family:${targetUnitKey}:${sourceUnitKey}`, {
        kind: 'family',
        parentUnitKey: targetUnitKey,
        childUnitKey: sourceUnitKey,
        dashed: false,
      });
      return;
    }

    if (relationship.type === 'spouse') return;

    addDisplayLink(`peer:${[sourceUnitKey, targetUnitKey].sort().join(':')}:${relationship.type}`, {
      kind: 'peer',
      leftUnitKey: sourceUnitKey,
      rightUnitKey: targetUnitKey,
      dashed: relationship.type === 'custom' || relationship.type === 'guardian',
    });
  });

  const duplicateRelationshipCount = Math.max(0, (family.relationships || []).length - dedupedRelationships.length);

  return {
    canvasWidth,
    canvasHeight,
    generationRows,
    positionedUnits,
    personLayout,
    peopleById,
    dedupedRelationships,
    duplicateRelationshipCount,
    links: [...displayLinks.values()],
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
                  {getRelationMeta(selectedPerson.relationKey, selectedPerson.relationLabel, selectedPerson.relationHindi).label}
                  {' • '}
                  {getRelationMeta(selectedPerson.relationKey, selectedPerson.relationLabel, selectedPerson.relationHindi).hindi}
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

                {layout.links.map((link, index) => {
                  if (link.kind === 'family') {
                    const parentUnit = layout.positionedUnits.find((unit) => unit.key === link.parentUnitKey);
                    const childUnit = layout.positionedUnits.find((unit) => unit.key === link.childUnitKey);
                    if (!parentUnit || !childUnit) return null;

                    const path = buildOrthogonalPath(parentUnit.centerX, parentUnit.bottomY, childUnit.centerX, childUnit.topY);
                    return (
                      <path
                        key={`family:${link.parentUnitKey}:${link.childUnitKey}:${index}`}
                        d={path}
                        stroke="rgba(15, 23, 42, 0.36)"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeDasharray={link.dashed ? '8 8' : undefined}
                      />
                    );
                  }

                  const leftUnit = layout.positionedUnits.find((unit) => unit.key === link.leftUnitKey);
                  const rightUnit = layout.positionedUnits.find((unit) => unit.key === link.rightUnitKey);
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
                    const relationMeta = getRelationMeta(person.relationKey, person.relationLabel, person.relationHindi);
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
