import { useMemo, useState } from 'react';
import { Download, FileArchive, Search, Trash2, Upload } from 'lucide-react';
import { formatFriendlyDate } from '../dashboardData.js';
import { getPortalDocumentDownloadUrl } from '../api.js';

const formatFileSize = (value) => {
  const bytes = Number(value || 0);
  if (!Number.isFinite(bytes) || bytes <= 0) return 'Unknown size';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const createDraft = () => ({
  file: null,
  title: '',
  category: 'other',
  tags: '',
  note: '',
  referenceDate: '',
  familyPersonId: '',
});

const VaultView = ({
  documents,
  family,
  isUploadingDocument,
  onUploadDocument,
  onDeleteDocument,
}) => {
  const [draft, setDraft] = useState(createDraft());
  const [searchText, setSearchText] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const filteredDocuments = useMemo(() => {
    const query = searchText.trim().toLowerCase();
    return documents.filter((document) => {
      if (categoryFilter !== 'all' && document.category !== categoryFilter) return false;
      if (!query) return true;

      return [
        document.title,
        document.category,
        document.note,
        document.original_name,
        ...(document.tags || []),
      ].some((value) => String(value || '').toLowerCase().includes(query));
    });
  }, [categoryFilter, documents, searchText]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!draft.file) return;

    await onUploadDocument({
      file: draft.file,
      title: draft.title,
      category: draft.category,
      tags: draft.tags.split(',').map((tag) => tag.trim()).filter(Boolean),
      note: draft.note,
      referenceDate: draft.referenceDate,
      familyPersonId: draft.familyPersonId,
    });

    setDraft(createDraft());
  };

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-4">
        {[
          { title: 'All documents', value: documents.length, detail: 'Only keep important things here' },
          { title: 'Health docs', value: documents.filter((document) => document.category === 'health').length, detail: 'Reports, prescriptions, medical files' },
          { title: 'Finance docs', value: documents.filter((document) => document.category === 'finance').length, detail: 'Statements and money paperwork' },
          { title: 'Family docs', value: documents.filter((document) => document.category === 'family').length, detail: 'Family-specific records and references' },
        ].map((card) => (
          <div key={card.title} className="life-panel">
            <p className="life-card-label">{card.title}</p>
            <p className="mt-2 text-3xl font-black tracking-tight text-slate-900 dark:text-white">{card.value}</p>
            <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-white/55">{card.detail}</p>
          </div>
        ))}
      </section>

      <div className="grid gap-6 xl:grid-cols-[0.95fr,1.05fr]">
        <section className="life-panel">
          <div className="flex items-start gap-3">
            <div className="rounded-2xl bg-slate-100 p-3 text-slate-700 dark:bg-white/10 dark:text-white">
              <Upload size={18} />
            </div>
            <div>
              <p className="life-card-label">Add document</p>
              <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                One vault for health, finance, identity, and family files
              </h2>
            </div>
          </div>

          <form className="mt-6 grid gap-4" onSubmit={handleSubmit}>
            <label className="space-y-2">
              <span className="life-card-label">File</span>
              <input
                type="file"
                onChange={(event) => setDraft((current) => ({ ...current, file: event.target.files?.[0] || null }))}
                className="life-input"
              />
            </label>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2">
                <span className="life-card-label">Title</span>
                <input
                  value={draft.title}
                  onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
                  placeholder="Q1 blood test"
                  className="life-input"
                />
              </label>
              <label className="space-y-2">
                <span className="life-card-label">Category</span>
                <select
                  value={draft.category}
                  onChange={(event) => setDraft((current) => ({ ...current, category: event.target.value }))}
                  className="life-input"
                >
                  <option value="other">Other</option>
                  <option value="health">Health</option>
                  <option value="finance">Finance</option>
                  <option value="family">Family</option>
                  <option value="identity">Identity</option>
                </select>
              </label>
              <label className="space-y-2">
                <span className="life-card-label">Reference date</span>
                <input
                  type="date"
                  value={draft.referenceDate}
                  onChange={(event) => setDraft((current) => ({ ...current, referenceDate: event.target.value }))}
                  className="life-input"
                />
              </label>
              <label className="space-y-2">
                <span className="life-card-label">Related family member</span>
                <select
                  value={draft.familyPersonId}
                  onChange={(event) => setDraft((current) => ({ ...current, familyPersonId: event.target.value }))}
                  className="life-input"
                >
                  <option value="">Not linked</option>
                  {family.people.map((person) => (
                    <option key={person.id} value={person.id}>{person.name || 'Unnamed person'}</option>
                  ))}
                </select>
              </label>
            </div>

            <label className="space-y-2">
              <span className="life-card-label">Tags</span>
              <input
                value={draft.tags}
                onChange={(event) => setDraft((current) => ({ ...current, tags: event.target.value }))}
                placeholder="doctor, tests, tax, passport"
                className="life-input"
              />
            </label>

            <label className="space-y-2">
              <span className="life-card-label">Notes</span>
              <textarea
                rows={3}
                value={draft.note}
                onChange={(event) => setDraft((current) => ({ ...current, note: event.target.value }))}
                placeholder="Why it matters or when to come back to it..."
                className="life-textarea"
              />
            </label>

            <button type="submit" disabled={isUploadingDocument} className="life-primary-button w-full justify-center disabled:cursor-not-allowed disabled:opacity-60">
              <Upload size={16} />
              {isUploadingDocument ? 'Uploading…' : 'Upload to vault'}
            </button>
          </form>
        </section>

        <section className="life-panel">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="life-card-label">Stored documents</p>
              <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                Search and retrieve what matters
              </h2>
            </div>

            <div className="flex flex-wrap gap-3">
              <label className="relative min-w-[240px]">
                <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-white/35" />
                <input
                  value={searchText}
                  onChange={(event) => setSearchText(event.target.value)}
                  placeholder="Search title, note, or tag"
                  className="life-input pl-11"
                />
              </label>
              <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} className="life-input min-w-[180px]">
                <option value="all">All categories</option>
                <option value="health">Health</option>
                <option value="finance">Finance</option>
                <option value="family">Family</option>
                <option value="identity">Identity</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <div className="mt-6 grid gap-4">
            {filteredDocuments.length === 0 ? (
              <div className="life-soft-card">
                <p className="text-sm leading-6 text-slate-600 dark:text-white/65">
                  No documents match this filter yet.
                </p>
              </div>
            ) : (
              filteredDocuments.map((document) => {
                const relatedPerson = family.people.find((person) => person.id === document.family_person_id);

                return (
                  <div key={document.id} className="life-soft-card">
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                      <div className="min-w-0">
                        <div className="flex items-center gap-3">
                          <div className="rounded-2xl bg-slate-100 p-3 text-slate-700 dark:bg-white/10 dark:text-white">
                            <FileArchive size={18} />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-lg font-bold text-slate-900 dark:text-white">{document.title || document.original_name}</p>
                            <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-white/55">
                              {[document.category, formatFriendlyDate(document.reference_date || document.created_at), formatFileSize(document.size_bytes), relatedPerson?.name].filter(Boolean).join(' • ')}
                            </p>
                          </div>
                        </div>

                        {document.note ? (
                          <p className="mt-4 text-sm leading-6 text-slate-600 dark:text-white/65">{document.note}</p>
                        ) : null}

                        {document.tags?.length ? (
                          <div className="mt-4 flex flex-wrap gap-2">
                            {document.tags.map((tag) => (
                              <span key={tag} className="tag">{tag}</span>
                            ))}
                          </div>
                        ) : null}
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <a href={getPortalDocumentDownloadUrl(document.id)} className="life-secondary-button px-4 py-2">
                          <Download size={16} />
                          Download
                        </a>
                        <button
                          type="button"
                          onClick={() => onDeleteDocument(document.id)}
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
      </div>
    </div>
  );
};

export default VaultView;
