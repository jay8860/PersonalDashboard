import { useState } from 'react';
import { ChevronDown, ChevronUp, NotebookPen, Pill, Plus, Trash2 } from 'lucide-react';
import { formatFriendlyDate, formatFriendlyDateTime } from '../dashboardData.js';

const createMedicineDraft = () => ({
  name: '',
  dose: '',
  times: '',
  purpose: '',
  startDate: '',
  endDate: '',
  relatedPersonId: 'person-self',
  notes: '',
});

const createNoteDraft = () => ({
  text: '',
  category: 'general',
});

const PlannerView = ({
  planner,
  family,
  dashboardMode,
  hiddenSections = [],
  onToggleSectionVisibility,
  onAddMedicine,
  onUpdateMedicine,
  onDeleteMedicine,
  onToggleMedicineTakenToday,
  onAddQuickNote,
  onDeleteQuickNote,
}) => {
  const [medicineDraft, setMedicineDraft] = useState(createMedicineDraft());
  const [noteDraft, setNoteDraft] = useState(createNoteDraft());
  const [showMedicineComposer, setShowMedicineComposer] = useState(() => dashboardMode !== 'today' || planner.medicines.length === 0);
  const [showNoteComposer, setShowNoteComposer] = useState(() => dashboardMode !== 'today' || planner.quickNotes.length === 0);

  const today = new Date().toISOString().slice(0, 10);
  const activeMedicines = planner.medicines.filter((medicine) => medicine.active !== false);
  const medicinesVisible = !hiddenSections.includes('medicines');
  const notesVisible = !hiddenSections.includes('quickNotes');
  const summaryCards = [
    medicinesVisible ? { title: 'Active medicines', value: activeMedicines.length, detail: 'Only keep real current medicines here', icon: Pill, className: 'bg-gradient-to-br from-fuchsia-100/80 via-white/72 to-rose-100/65 dark:from-fuchsia-500/12 dark:via-white/6 dark:to-rose-500/8' } : null,
    notesVisible ? { title: 'Quick notes', value: planner.quickNotes.length, detail: 'Loose thoughts worth keeping', icon: NotebookPen, className: 'bg-gradient-to-br from-amber-100/80 via-white/72 to-orange-100/65 dark:from-amber-500/12 dark:via-white/6 dark:to-orange-500/8' } : null,
  ].filter(Boolean);

  const handleMedicineSubmit = (event) => {
    event.preventDefault();
    if (!medicineDraft.name.trim()) return;
    onAddMedicine(medicineDraft);
    setMedicineDraft(createMedicineDraft());
    if (dashboardMode === 'today') setShowMedicineComposer(false);
  };

  const handleNoteSubmit = (event) => {
    event.preventDefault();
    if (!noteDraft.text.trim()) return;
    onAddQuickNote(noteDraft);
    setNoteDraft(createNoteDraft());
    if (dashboardMode === 'today') setShowNoteComposer(false);
  };

  return (
    <div className="space-y-6">
      <section className="life-panel">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="life-card-label">Planner visibility</p>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-900 dark:text-white">
              Keep the planner limited to what is useful right now.
            </h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              { id: 'medicines', label: 'Medicines', visible: medicinesVisible },
              { id: 'quickNotes', label: 'Quick Notes', visible: notesVisible },
            ].map((section) => (
              <button
                key={section.id}
                type="button"
                onClick={() => onToggleSectionVisibility(section.id)}
                className={section.visible ? 'life-tab life-tab-active whitespace-nowrap' : 'life-tab whitespace-nowrap opacity-55'}
              >
                {section.label}
                {section.visible ? ' • shown' : ' • hidden'}
              </button>
            ))}
          </div>
        </div>
      </section>

      {summaryCards.length > 0 ? (
        <section className={`grid gap-4 ${summaryCards.length >= 4 ? 'md:grid-cols-4' : summaryCards.length === 3 ? 'md:grid-cols-3' : summaryCards.length === 2 ? 'md:grid-cols-2' : ''}`}>
          {summaryCards.map((card) => (
            <div key={card.title} className={`life-panel ${card.className}`}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="life-card-label">{card.title}</p>
                  <p className="mt-2 text-3xl font-black tracking-tight text-slate-900 dark:text-white">{card.value}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-white/55">{card.detail}</p>
                </div>
                <div className="rounded-2xl bg-white/60 p-3 text-slate-700 backdrop-blur dark:bg-white/12 dark:text-white">
                  <card.icon size={18} />
                </div>
              </div>
            </div>
          ))}
        </section>
      ) : (
        <section className="life-panel">
          <p className="text-sm leading-6 text-slate-600 dark:text-white/65">
            All planner sections are hidden right now. Turn on only the ones you want to keep in view.
          </p>
        </section>
      )}

      <div className="space-y-6">
        <section className="space-y-6">
          {medicinesVisible ? (
            <section className="life-panel">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex items-start gap-3">
                <div className="rounded-2xl bg-fuchsia-500/12 p-3 text-fuchsia-700 dark:bg-fuchsia-500/20 dark:text-fuchsia-200">
                  <Pill size={18} />
                </div>
                <div>
                  <p className="life-card-label">Medicine tracker</p>
                  <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                    Current medicines, without the spreadsheet feeling
                  </h2>
                </div>
              </div>

              <button type="button" onClick={() => setShowMedicineComposer((current) => !current)} className="life-secondary-button">
                {showMedicineComposer ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                {showMedicineComposer ? 'Hide form' : 'Add medicine'}
              </button>
            </div>

            {showMedicineComposer ? (
              <form className="mt-6 grid gap-4 rounded-[1.5rem] border border-white/80 bg-white/55 p-5 backdrop-blur dark:border-white/10 dark:bg-white/6" onSubmit={handleMedicineSubmit}>
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="space-y-2">
                    <span className="life-card-label">Medicine name</span>
                    <input
                      value={medicineDraft.name}
                      onChange={(event) => setMedicineDraft((current) => ({ ...current, name: event.target.value }))}
                      placeholder="Vitamin D3"
                      className="life-input"
                    />
                  </label>
                  <label className="space-y-2">
                    <span className="life-card-label">Dose</span>
                    <input
                      value={medicineDraft.dose}
                      onChange={(event) => setMedicineDraft((current) => ({ ...current, dose: event.target.value }))}
                      placeholder="1 tablet"
                      className="life-input"
                    />
                  </label>
                  <label className="space-y-2">
                    <span className="life-card-label">Time / frequency</span>
                    <input
                      value={medicineDraft.times}
                      onChange={(event) => setMedicineDraft((current) => ({ ...current, times: event.target.value }))}
                      placeholder="After breakfast"
                      className="life-input"
                    />
                  </label>
                  <label className="space-y-2">
                    <span className="life-card-label">Purpose</span>
                    <input
                      value={medicineDraft.purpose}
                      onChange={(event) => setMedicineDraft((current) => ({ ...current, purpose: event.target.value }))}
                      placeholder="Vitamin support"
                      className="life-input"
                    />
                  </label>
                  <label className="space-y-2">
                    <span className="life-card-label">Start date</span>
                    <input
                      type="date"
                      value={medicineDraft.startDate}
                      onChange={(event) => setMedicineDraft((current) => ({ ...current, startDate: event.target.value }))}
                      className="life-input"
                    />
                  </label>
                  <label className="space-y-2">
                    <span className="life-card-label">End date</span>
                    <input
                      type="date"
                      value={medicineDraft.endDate}
                      onChange={(event) => setMedicineDraft((current) => ({ ...current, endDate: event.target.value }))}
                      className="life-input"
                    />
                  </label>
                </div>

                <label className="space-y-2">
                  <span className="life-card-label">For</span>
                  <select
                    value={medicineDraft.relatedPersonId}
                    onChange={(event) => setMedicineDraft((current) => ({ ...current, relatedPersonId: event.target.value }))}
                    className="life-input"
                  >
                    {family.people.map((person) => (
                      <option key={person.id} value={person.id}>{person.name || 'Unnamed person'}</option>
                    ))}
                  </select>
                </label>

                <label className="space-y-2">
                  <span className="life-card-label">Notes</span>
                  <textarea
                    rows={3}
                    value={medicineDraft.notes}
                    onChange={(event) => setMedicineDraft((current) => ({ ...current, notes: event.target.value }))}
                    placeholder="Doctor advice, side effects, refill note..."
                    className="life-textarea"
                  />
                </label>

                <button type="submit" className="life-primary-button w-full justify-center">
                  <Plus size={16} />
                  Add medicine
                </button>
              </form>
            ) : (
              <div className="mt-6 life-soft-card bg-gradient-to-r from-white/82 via-fuchsia-50/60 to-white/70 dark:from-white/8 dark:via-fuchsia-500/8 dark:to-white/5">
                <p className="text-sm leading-6 text-slate-600 dark:text-white/68">
                  Keep only active medicines visible. Open the form when you need to add or adjust one.
                </p>
              </div>
            )}

            <div className="mt-6 grid gap-3">
              {planner.medicines.length === 0 ? (
                <div className="life-soft-card">
                  <p className="text-sm leading-6 text-slate-600 dark:text-white/65">
                    No medicines logged. Keep this section empty unless it is actively helpful.
                  </p>
                </div>
              ) : (
                planner.medicines.map((medicine) => {
                  const relatedPerson = family.people.find((person) => person.id === medicine.relatedPersonId);
                  const takenToday = medicine.takenLog?.includes(today);

                  return (
                    <div key={medicine.id} className="life-soft-card">
                      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                        <div>
                          <p className="text-base font-bold text-slate-900 dark:text-white">{medicine.name}</p>
                          <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-white/55">
                            {[medicine.dose, medicine.times, medicine.purpose, relatedPerson?.name].filter(Boolean).join(' • ')}
                          </p>
                          {dashboardMode === 'deep' ? (
                            <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-white/55">
                              {[medicine.startDate ? `Start ${formatFriendlyDate(medicine.startDate)}` : '', medicine.endDate ? `End ${formatFriendlyDate(medicine.endDate)}` : '', medicine.notes].filter(Boolean).join(' • ')}
                            </p>
                          ) : null}
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => onToggleMedicineTakenToday(medicine.id)}
                            className={takenToday ? 'life-primary-button px-4 py-2' : 'life-secondary-button px-4 py-2'}
                          >
                            {takenToday ? 'Taken today' : 'Mark taken'}
                          </button>
                          <button
                            type="button"
                            onClick={() => onUpdateMedicine(medicine.id, { active: medicine.active === false })}
                            className="life-secondary-button px-4 py-2"
                          >
                            {medicine.active === false ? 'Activate' : 'Pause'}
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteMedicine(medicine.id)}
                            className="rounded-xl p-2 text-rose-500 transition hover:bg-rose-50 dark:hover:bg-rose-500/10"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            </section>
          ) : null}

          {notesVisible ? (
            <section className="life-panel">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex items-start gap-3">
                <div className="rounded-2xl bg-amber-500/12 p-3 text-amber-700 dark:bg-amber-500/20 dark:text-amber-200">
                  <NotebookPen size={18} />
                </div>
                <div>
                  <p className="life-card-label">Quick notes</p>
                  <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                    Capture small thoughts without a wall of fields
                  </h2>
                </div>
              </div>

              <button type="button" onClick={() => setShowNoteComposer((current) => !current)} className="life-secondary-button">
                {showNoteComposer ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                {showNoteComposer ? 'Hide form' : 'Add note'}
              </button>
            </div>

            {showNoteComposer ? (
              <form className="mt-6 grid gap-4 rounded-[1.5rem] border border-white/80 bg-white/55 p-5 backdrop-blur dark:border-white/10 dark:bg-white/6" onSubmit={handleNoteSubmit}>
                <label className="space-y-2">
                  <span className="life-card-label">Note</span>
                  <textarea
                    rows={3}
                    value={noteDraft.text}
                    onChange={(event) => setNoteDraft((current) => ({ ...current, text: event.target.value }))}
                    placeholder="Insurance renewal in June, ask doctor about sleep, review subscription..."
                    className="life-textarea"
                  />
                </label>

                <label className="space-y-2">
                  <span className="life-card-label">Category</span>
                  <select
                    value={noteDraft.category}
                    onChange={(event) => setNoteDraft((current) => ({ ...current, category: event.target.value }))}
                    className="life-input"
                  >
                    <option value="general">General</option>
                    <option value="health">Health</option>
                    <option value="finance">Finance</option>
                    <option value="family">Family</option>
                    <option value="idea">Idea</option>
                  </select>
                </label>

                <button type="submit" className="life-primary-button w-full justify-center">
                  <Plus size={16} />
                  Save quick note
                </button>
              </form>
            ) : (
              <div className="mt-6 life-soft-card bg-gradient-to-r from-white/82 via-amber-50/60 to-white/70 dark:from-white/8 dark:via-amber-500/8 dark:to-white/5">
                <p className="text-sm leading-6 text-slate-600 dark:text-white/68">
                  Notes stay useful when they are quick and lightweight. Open the form only when you need it.
                </p>
              </div>
            )}

            <div className="mt-6 grid gap-3">
              {planner.quickNotes.length === 0 ? (
                <div className="life-soft-card">
                  <p className="text-sm leading-6 text-slate-600 dark:text-white/65">
                    No quick notes yet.
                  </p>
                </div>
              ) : (
                planner.quickNotes.map((note) => (
                  <div key={note.id} className="life-soft-card">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="life-card-label">{note.category}</p>
                        <p className="mt-2 text-sm leading-6 text-slate-700 dark:text-white/70">{note.text}</p>
                        <p className="mt-2 text-xs text-slate-400 dark:text-white/40">{formatFriendlyDateTime(note.createdAt)}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => onDeleteQuickNote(note.id)}
                        className="rounded-xl p-2 text-rose-500 transition hover:bg-rose-50 dark:hover:bg-rose-500/10"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
            </section>
          ) : null}

          {!medicinesVisible && !notesVisible ? (
            <section className="life-panel">
              <p className="life-card-label">Planner trimmed down</p>
              <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                The planner is hidden until you need it again.
              </h2>
              <div className="mt-6 life-soft-card">
                <p className="text-sm leading-6 text-slate-600 dark:text-white/65">
                  Bring medicines or quick notes back from the visibility controls whenever they become useful again.
                </p>
              </div>
            </section>
          ) : null}
        </section>
      </div>
    </div>
  );
};

export default PlannerView;
