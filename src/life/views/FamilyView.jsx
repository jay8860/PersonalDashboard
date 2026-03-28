import { useEffect, useRef, useState } from 'react';
import { GitBranchPlus, Grip, Link2, ScanSearch, Trash2, UserPlus2, ZoomIn, ZoomOut } from 'lucide-react';
import { connectionOptions, getConnectionMeta, getRelationMeta, relationOptions } from '../relations.js';

const CANVAS_WIDTH = 1880;
const CANVAS_HEIGHT = 1160;
const CARD_WIDTH = 190;
const CARD_HEIGHT = 112;

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

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

const buildEdgeGeometry = (source, target) => {
  const sourceCenterX = source.x + CARD_WIDTH / 2;
  const sourceCenterY = source.y + CARD_HEIGHT / 2;
  const targetCenterX = target.x + CARD_WIDTH / 2;
  const targetCenterY = target.y + CARD_HEIGHT / 2;
  const horizontal = Math.abs(targetCenterX - sourceCenterX) >= Math.abs(targetCenterY - sourceCenterY);

  if (horizontal) {
    const sourceOnRight = targetCenterX > sourceCenterX;
    const startX = sourceOnRight ? source.x + CARD_WIDTH : source.x;
    const startY = sourceCenterY;
    const endX = sourceOnRight ? target.x : target.x + CARD_WIDTH;
    const endY = targetCenterY;
    const control = Math.max(84, Math.abs(endX - startX) * 0.36);
    const offset = sourceOnRight ? control : -control;
    return {
      path: 'M ' + String(startX) + ' ' + String(startY) + ' C ' + String(startX + offset) + ' ' + String(startY) + ', ' + String(endX - offset) + ' ' + String(endY) + ', ' + String(endX) + ' ' + String(endY),
      labelX: (startX + endX) / 2,
      labelY: (startY + endY) / 2 - 18,
    };
  }

  const sourceBelow = targetCenterY > sourceCenterY;
  const startX = sourceCenterX;
  const startY = sourceBelow ? source.y + CARD_HEIGHT : source.y;
  const endX = targetCenterX;
  const endY = sourceBelow ? target.y : target.y + CARD_HEIGHT;
  const control = Math.max(84, Math.abs(endY - startY) * 0.36);
  const offset = sourceBelow ? control : -control;

  return {
    path: 'M ' + String(startX) + ' ' + String(startY) + ' C ' + String(startX) + ' ' + String(startY + offset) + ', ' + String(endX) + ' ' + String(endY - offset) + ', ' + String(endX) + ' ' + String(endY),
    labelX: (startX + endX) / 2,
    labelY: (startY + endY) / 2 - 20,
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
  const [zoom, setZoom] = useState(0.78);
  const [dragState, setDragState] = useState(null);
  const canvasViewportRef = useRef(null);

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
    const fitted = clamp(Math.min((bounds.width - 24) / CANVAS_WIDTH, (bounds.height - 24) / CANVAS_HEIGHT, 1), 0.55, 0.92);
    setZoom(Number(fitted.toFixed(2)));
    canvasViewportRef.current.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    const id = window.requestAnimationFrame(fitCanvas);
    window.addEventListener('resize', fitCanvas);
    return () => {
      window.cancelAnimationFrame(id);
      window.removeEventListener('resize', fitCanvas);
    };
  }, []);

  useEffect(() => {
    if (dragState == null) return undefined;

    const handlePointerMove = (event) => {
      const viewport = canvasViewportRef.current;
      const bounds = viewport?.getBoundingClientRect();
      if (bounds == null || viewport == null) return;

      const scrollLeft = viewport.scrollLeft;
      const scrollTop = viewport.scrollTop;
      const pointerX = (event.clientX - bounds.left + scrollLeft) / zoom;
      const pointerY = (event.clientY - bounds.top + scrollTop) / zoom;
      const x = clamp(pointerX - dragState.offsetX, 24, CANVAS_WIDTH - CARD_WIDTH - 24);
      const y = clamp(pointerY - dragState.offsetY, 24, CANVAS_HEIGHT - CARD_HEIGHT - 24);

      onUpdatePerson(dragState.personId, { x, y });
    };

    const handlePointerUp = () => setDragState(null);

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [dragState, onUpdatePerson, zoom]);

  const startDrag = (event, person) => {
    event.preventDefault();
    event.stopPropagation();
    const viewport = canvasViewportRef.current;
    const bounds = viewport?.getBoundingClientRect();
    if (bounds == null || viewport == null) return;

    const scrollLeft = viewport.scrollLeft;
    const scrollTop = viewport.scrollTop;
    const pointerX = (event.clientX - bounds.left + scrollLeft) / zoom;
    const pointerY = (event.clientY - bounds.top + scrollTop) / zoom;

    setDragState({
      personId: person.id,
      offsetX: pointerX - person.x,
      offsetY: pointerY - person.y,
    });
    onSelectPerson(person.id);
  };

  const selectedPerson = family.people.find((person) => person.id === family.selectedPersonId) || family.people[0];
  const peopleById = Object.fromEntries(family.people.map((person) => [person.id, person]));
  const selectedAnchor = selectedPerson?.anchorId ? peopleById[selectedPerson.anchorId] : null;

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
    <div className="grid gap-6 xl:grid-cols-[380px,minmax(0,1fr)]">
      <div className="space-y-6">
        <section className="life-panel">
          <div className="flex items-start gap-3">
            <div className="rounded-2xl bg-slate-100 p-3 text-slate-700 dark:bg-white/10 dark:text-white">
              <UserPlus2 size={18} />
            </div>
            <div>
              <p className="life-card-label">Quick add</p>
              <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                Add one person and create the line automatically.
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
                <span className="life-card-label">Relationship</span>
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
              Add and connect
            </button>
            <p className="text-xs leading-5 text-slate-500 dark:text-white/55">
              The card is placed near the linked person and the relationship line appears immediately.
            </p>
          </form>
        </section>

        <section className="life-panel">
          <div className="flex items-start gap-3">
            <div className="rounded-2xl bg-slate-100 p-3 text-slate-700 dark:bg-white/10 dark:text-white">
              <ScanSearch size={18} />
            </div>
            <div>
              <p className="life-card-label">Bulk add</p>
              <h3 className="mt-2 text-xl font-black tracking-tight text-slate-900 dark:text-white">
                Import multiple names in one shot.
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
                  'Riya | niece | Mohan | 2016 | Loves painting',
                ].join('\n')}
              />
            </label>
            <button type="submit" className="life-secondary-button w-full justify-center">
              Bulk add and connect
            </button>
            <p className="text-xs leading-5 text-slate-500 dark:text-white/55">
              Use the linked-to column to attach each person to you or to another person already in the tree.
            </p>
            {bulkFeedback ? (
              <div className="rounded-2xl border border-slate-200/80 bg-slate-50 px-4 py-3 text-sm text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-white/70">
                {bulkFeedback}
              </div>
            ) : null}
          </form>
        </section>

        <section className="life-panel">
          <div className="flex items-start gap-3">
            <div className="rounded-2xl bg-slate-100 p-3 text-slate-700 dark:bg-white/10 dark:text-white">
              <GitBranchPlus size={18} />
            </div>
            <div>
              <p className="life-card-label">Advanced links</p>
              <h3 className="mt-2 text-xl font-black tracking-tight text-slate-900 dark:text-white">
                Add or edit manual relationship lines.
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
              Create manual link
            </button>
          </form>

          <div className="mt-6 space-y-3">
            {family.relationships.length === 0 ? (
              <p className="text-sm leading-6 text-slate-500 dark:text-white/55">
                Relationship lines appear automatically for quick adds and bulk adds. Use the form above only for special cases.
              </p>
            ) : (
              family.relationships.map((relationship) => {
                const meta = getConnectionMeta(relationship.type, relationship.label, relationship.labelHindi);
                const source = peopleById[relationship.sourceId];
                const target = peopleById[relationship.targetId];

                return (
                  <div key={relationship.id} className="rounded-[1.2rem] border border-slate-200/80 bg-slate-50/85 p-4 dark:border-white/10 dark:bg-white/5">
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
                  <div className="rounded-[1.2rem] border border-slate-200/80 bg-slate-50/85 px-4 py-3 text-sm text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-white/60">
                    Drag the handle on the card to reposition it.
                  </div>
                )}
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
            <p className="life-card-label">Family canvas</p>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-900 dark:text-white">
              A wider, zoomed-out tree with smoother dragging and bilingual labels.
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => setZoom((current) => clamp(Number((current - 0.08).toFixed(2)), 0.5, 1.1))} className="life-secondary-button px-4 py-2">
              <ZoomOut size={16} />
            </button>
            <div className="rounded-full border border-slate-200/80 bg-white/80 px-4 py-2 text-sm font-semibold text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-white/70">
              {Math.round(zoom * 100)}%
            </div>
            <button type="button" onClick={() => setZoom((current) => clamp(Number((current + 0.08).toFixed(2)), 0.5, 1.1))} className="life-secondary-button px-4 py-2">
              <ZoomIn size={16} />
            </button>
            <button type="button" onClick={fitCanvas} className="life-secondary-button">
              Fit view
            </button>
          </div>
        </div>

        <div ref={canvasViewportRef} className="mt-6 h-[76vh] overflow-auto rounded-[1.5rem] border border-slate-200/80 bg-slate-50/70 p-3 dark:border-white/10 dark:bg-slate-950/40">
          <div className="relative" style={{ width: CANVAS_WIDTH * zoom, minHeight: CANVAS_HEIGHT * zoom }}>
            <div className="family-grid relative rounded-[1.2rem]" style={{ width: CANVAS_WIDTH, height: CANVAS_HEIGHT, transform: 'scale(' + String(zoom) + ')', transformOrigin: 'top left' }}>
              <svg className="absolute inset-0 h-full w-full" viewBox={'0 0 ' + String(CANVAS_WIDTH) + ' ' + String(CANVAS_HEIGHT)} fill="none">
                {family.relationships.map((relationship) => {
                  const source = peopleById[relationship.sourceId];
                  const target = peopleById[relationship.targetId];
                  if (source == null || target == null) return null;

                  const geometry = buildEdgeGeometry(source, target);
                  const meta = getConnectionMeta(relationship.type, relationship.label, relationship.labelHindi);

                  return (
                    <g key={relationship.id}>
                      <path
                        d={geometry.path}
                        stroke="rgba(15, 23, 42, 0.35)"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeDasharray={relationship.type === 'custom' ? '8 8' : undefined}
                      />
                      <foreignObject x={geometry.labelX - 82} y={geometry.labelY - 18} width="164" height="58">
                        <div className="pointer-events-none rounded-full border border-slate-200/80 bg-white/95 px-3 py-2 text-center text-[11px] font-semibold leading-4 text-slate-700 shadow-sm backdrop-blur dark:border-white/10 dark:bg-slate-950/92 dark:text-white/80">
                          {meta.label}
                          <span className="block text-[10px] font-medium text-slate-400 dark:text-white/40">{meta.hindi}</span>
                        </div>
                      </foreignObject>
                    </g>
                  );
                })}
              </svg>

              {family.people.map((person) => {
                const relationMeta = getRelationMeta(person.relationKey, person.relationLabel, person.relationHindi);
                const isSelected = person.id === family.selectedPersonId;

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
                      ? 'absolute select-none rounded-[1.25rem] border border-slate-950 bg-slate-950 p-4 text-left text-white shadow-lg dark:border-white dark:bg-white dark:text-slate-950'
                      : 'absolute select-none rounded-[1.25rem] border border-slate-200/80 bg-white/94 p-4 text-left text-slate-900 shadow-sm transition hover:border-slate-300 hover:shadow-md dark:border-white/10 dark:bg-slate-950/88 dark:text-white'}
                    style={{ width: CARD_WIDTH, minHeight: CARD_HEIGHT, transform: 'translate(' + String(person.x) + 'px, ' + String(person.y) + 'px)' }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-base font-black tracking-tight">{person.name || 'Unnamed person'}</p>
                        <p className={isSelected ? 'mt-1 text-sm font-semibold text-white/80 dark:text-slate-700' : 'mt-1 text-sm font-semibold text-slate-500 dark:text-white/55'}>
                          {relationMeta.label}
                        </p>
                        <p className={isSelected ? 'text-xs text-white/60 dark:text-slate-600' : 'text-xs text-slate-400 dark:text-white/35'}>
                          {relationMeta.hindi}
                        </p>
                      </div>
                      <div
                        onPointerDown={(event) => startDrag(event, person)}
                        className={isSelected ? 'cursor-grab rounded-xl bg-white/10 p-2 text-white/85 dark:bg-slate-900/10 dark:text-slate-800' : 'cursor-grab rounded-xl bg-slate-100 p-2 text-slate-600 dark:bg-white/10 dark:text-white/70'}
                      >
                        <Grip size={14} />
                      </div>
                    </div>
                    <div className={isSelected ? 'mt-4 space-y-1 text-xs text-white/65 dark:text-slate-600' : 'mt-4 space-y-1 text-xs text-slate-500 dark:text-white/50'}>
                      <p>{person.birthYear ? 'Born ' + person.birthYear : 'Birth year not added'}</p>
                      <p className="line-clamp-2">{person.note || 'Add a small note for city, branch, memory, or context.'}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default FamilyView;
