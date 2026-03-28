import { startTransition, useEffect, useState } from 'react';
import { BadgeIndianRupee, Download, HeartPulse, Moon, Network, Sun, UserRound } from 'lucide-react';
import FinanceDashboard from './finance/FinanceDashboard.jsx';
import HealthDashboard from './health/HealthDashboard.jsx';
import { loadStoredProfile } from './finance/utils/storage.js';
import { createPerson, downloadJsonFile, loadDashboard, saveDashboard } from './life/store.js';
import ProfileView from './life/views/ProfileView.jsx';
import FamilyView from './life/views/FamilyView.jsx';
import { buildAutoRelationship, normalizeNameToken, resolveRelationInput, suggestFamilyPosition } from './life/relations.js';

const themeKey = 'life-atlas-theme';
const selfAliases = new Set(['', 'self', 'me', 'myself', 'you', 'person-self']);

const tabItems = [
  { id: 'profile', label: 'About Me', icon: UserRound },
  { id: 'family', label: 'Family Tree', icon: Network },
  { id: 'health', label: 'Health Dashboard', icon: HeartPulse },
  { id: 'finance', label: 'Finance Dashboard', icon: BadgeIndianRupee },
];

const buildInitialTab = () => {
  if (typeof window === 'undefined') return 'profile';
  const next = window.location.hash.replace('#', '');
  return tabItems.some((item) => item.id === next) ? next : 'profile';
};

const readThemePreference = () => {
  const storedTheme = window.localStorage.getItem(themeKey);
  if (storedTheme === 'dark') return true;
  if (storedTheme === 'light') return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
};

const readFinanceSummary = () => {
  const profile = loadStoredProfile();
  const statements = profile.statements || [];
  const transactions = profile.transactions || [];

  return {
    statementCount: statements.length,
    transactionCount: transactions.length,
    bankStatementCount: statements.filter((statement) => (statement.accountType === 'credit' ? false : true)).length,
    cardStatementCount: statements.filter((statement) => statement.accountType === 'credit').length,
    lastUpdatedAt: profile.lastUpdatedAt || null,
  };
};

const findAnchorPerson = (family, anchorId) => {
  if (anchorId && family.people.some((person) => person.id === anchorId)) {
    return family.people.find((person) => person.id === anchorId);
  }

  return family.people.find((person) => person.id === family.selectedPersonId)
    || family.people.find((person) => person.id === 'person-self')
    || family.people[0];
};

const buildPersonFromDraft = (family, draft) => {
  const anchorPerson = findAnchorPerson(family, draft.anchorId);
  const placement = suggestFamilyPosition({
    anchorPerson,
    relationKey: draft.relationKey,
    customLabel: draft.relationLabel,
    customHindi: draft.relationHindi,
    people: family.people,
  });

  const person = createPerson({
    name: draft.name.trim(),
    relationKey: draft.relationKey,
    relationLabel: draft.relationLabel?.trim() || '',
    relationHindi: draft.relationHindi?.trim() || '',
    relationGroup: placement.relationGroup,
    anchorId: anchorPerson.id,
    birthYear: draft.birthYear?.trim() || '',
    note: draft.note?.trim() || '',
    x: placement.x,
    y: placement.y,
  });

  return {
    person,
    relationship: buildAutoRelationship({ person, anchorPerson }),
  };
};

const ModuleShell = ({ activeTab, onTabChange, children }) => (
  <div className="min-h-screen bg-slate-950 text-white">
    <div className="fixed left-4 top-4 z-[90] rounded-full border border-white/12 bg-slate-950/88 px-4 py-2 text-sm font-semibold text-white/80 backdrop-blur">
      Life Atlas
    </div>
    <div className="fixed right-4 top-4 z-[90] flex flex-wrap items-center justify-end gap-2">
      {tabItems.filter((item) => item.id !== activeTab).map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => onTabChange(item.id)}
          className="rounded-full border border-white/12 bg-slate-950/88 px-4 py-2 text-sm font-semibold text-white/85 backdrop-blur transition hover:bg-white/10"
        >
          {item.label}
        </button>
      ))}
    </div>
    {children}
  </div>
);

function App() {
  const [activeTab, setActiveTab] = useState(buildInitialTab);
  const [isDark, setIsDark] = useState(false);
  const [dashboard, setDashboard] = useState(() => loadDashboard());
  const [financeSummary, setFinanceSummary] = useState(() => readFinanceSummary());

  useEffect(() => {
    const syncTheme = () => {
      const next = readThemePreference();
      setIsDark(next);
      document.documentElement.classList.toggle('dark', next);
    };

    syncTheme();
    window.addEventListener('storage', syncTheme);
    window.addEventListener('focus', syncTheme);

    return () => {
      window.removeEventListener('storage', syncTheme);
      window.removeEventListener('focus', syncTheme);
    };
  }, []);

  useEffect(() => {
    saveDashboard(dashboard);
  }, [dashboard]);

  useEffect(() => {
    const syncFromHash = () => {
      const next = window.location.hash.replace('#', '');
      if (tabItems.some((item) => item.id === next)) {
        setActiveTab(next);
        return;
      }
      setActiveTab('profile');
    };

    const syncFinance = () => setFinanceSummary(readFinanceSummary());

    window.addEventListener('hashchange', syncFromHash);
    window.addEventListener('storage', syncFinance);
    window.addEventListener('focus', syncFinance);

    return () => {
      window.removeEventListener('hashchange', syncFromHash);
      window.removeEventListener('storage', syncFinance);
      window.removeEventListener('focus', syncFinance);
    };
  }, []);

  useEffect(() => {
    window.history.replaceState(null, '', '#' + activeTab);
  }, [activeTab]);

  const changeTab = (nextTab) => {
    if (nextTab === activeTab) return;
    window.scrollTo({ top: 0, behavior: 'smooth' });
    startTransition(() => setActiveTab(nextTab));
  };

  const toggleTheme = () => {
    const next = isDark === false;
    setIsDark(next);
    document.documentElement.classList.toggle('dark', next);
    window.localStorage.setItem(themeKey, next ? 'dark' : 'light');
  };

  const exportSnapshot = () => {
    downloadJsonFile(
      'life-atlas-backup-' + new Date().toISOString().slice(0, 10) + '.json',
      {
        exportedAt: new Date().toISOString(),
        lifeAtlas: dashboard,
        financeDashboard: loadStoredProfile(),
        healthDashboard: {
          note: 'Health records live in the health module database. Use the Health Dashboard export inside that module for health backups.',
        },
      },
    );
  };

  const updateProfileField = (field, value) => {
    setDashboard((current) => {
      const nextProfile = { ...current.profile, [field]: value };
      const selfName = nextProfile.preferredName?.trim() || nextProfile.fullName?.trim() || 'You';

      return {
        ...current,
        profile: nextProfile,
        family: {
          ...current.family,
          people: current.family.people.map((person) => (
            person.id === 'person-self'
              ? { ...person, name: selfName }
              : person
          )),
        },
      };
    });
  };

  const addPerson = (draft) => {
    setDashboard((current) => {
      const built = buildPersonFromDraft(current.family, draft);
      return {
        ...current,
        family: {
          ...current.family,
          selectedPersonId: built.person.id,
          people: [...current.family.people, built.person],
          relationships: built.relationship == null
            ? current.family.relationships
            : [...current.family.relationships, built.relationship],
        },
      };
    });
  };

  const addPeopleInBulk = (bulkText) => {
    let summary = { added: 0, skipped: [] };

    setDashboard((current) => {
      const lines = String(bulkText || '')
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);

      if (lines.length === 0) {
        summary = { added: 0, skipped: ['Add at least one line before importing.'] };
        return current;
      }

      const nextFamily = {
        ...current.family,
        people: [...current.family.people],
        relationships: [...current.family.relationships],
      };
      const knownPeople = new Map();

      nextFamily.people.forEach((person) => {
        const token = normalizeNameToken(person.name);
        if (token) knownPeople.set(token, person);
        knownPeople.set(person.id, person);
      });

      let lastAddedId = null;

      lines.forEach((line, index) => {
        const parts = line.split('|').map((part) => part.trim());
        const [name, relationInput = 'custom', anchorInput = '', birthYear = '', ...noteParts] = parts;
        const note = noteParts.join(' | ').trim();

        if (!name) {
          summary.skipped.push('Line ' + String(index + 1) + ': missing name.');
          return;
        }

        const relation = resolveRelationInput(relationInput, 'custom');
        const anchorToken = normalizeNameToken(anchorInput);
        const fallbackAnchor = findAnchorPerson(nextFamily, nextFamily.selectedPersonId);
        const anchorPerson = selfAliases.has(anchorToken)
          ? nextFamily.people.find((person) => person.id === 'person-self') || fallbackAnchor
          : knownPeople.get(anchorToken) || fallbackAnchor;

        if (!anchorPerson) {
          summary.skipped.push('Line ' + String(index + 1) + ': could not resolve the linked person.');
          return;
        }

        const built = buildPersonFromDraft(nextFamily, {
          name,
          relationKey: relation.value,
          relationLabel: relation.value === 'custom' ? relationInput : '',
          relationHindi: '',
          anchorId: anchorPerson.id,
          birthYear,
          note,
        });

        nextFamily.people.push(built.person);
        if (built.relationship) nextFamily.relationships.push(built.relationship);
        nextFamily.selectedPersonId = built.person.id;
        const token = normalizeNameToken(built.person.name);
        if (token) knownPeople.set(token, built.person);
        knownPeople.set(built.person.id, built.person);
        lastAddedId = built.person.id;
        summary.added += 1;
      });

      if (lastAddedId == null) {
        return current;
      }

      return {
        ...current,
        family: {
          ...nextFamily,
          selectedPersonId: lastAddedId,
        },
      };
    });

    if (summary.added > 0 && summary.skipped.length === 0) {
      return { ...summary, message: 'Added ' + String(summary.added) + ' family member' + (summary.added === 1 ? '' : 's') + '.' };
    }

    if (summary.added > 0) {
      return {
        ...summary,
        message: 'Added ' + String(summary.added) + ' family member' + (summary.added === 1 ? '' : 's') + '. ' + summary.skipped.join(' '),
      };
    }

    return {
      ...summary,
      message: summary.skipped.join(' '),
    };
  };

  const updatePerson = (personId, patch) => {
    setDashboard((current) => ({
      ...current,
      family: {
        ...current.family,
        people: current.family.people.map((person) => (
          person.id === personId
            ? { ...person, ...patch }
            : person
        )),
      },
    }));
  };

  const deletePerson = (personId) => {
    if (personId === 'person-self') return;

    setDashboard((current) => ({
      ...current,
      family: {
        ...current.family,
        selectedPersonId: current.family.selectedPersonId === personId ? 'person-self' : current.family.selectedPersonId,
        people: current.family.people.filter((person) => person.id !== personId),
        relationships: current.family.relationships.filter((relationship) => relationship.sourceId !== personId && relationship.targetId !== personId),
      },
    }));
  };

  const addRelationship = (draft) => {
    setDashboard((current) => ({
      ...current,
      family: {
        ...current.family,
        relationships: [
          ...current.family.relationships,
          {
            id: crypto.randomUUID(),
            sourceId: draft.sourceId,
            targetId: draft.targetId,
            type: draft.type,
            label: draft.label?.trim() || 'Related to',
            labelHindi: draft.labelHindi?.trim() || 'रिश्तेदार',
          },
        ],
      },
    }));
  };

  const deleteRelationship = (relationshipId) => {
    setDashboard((current) => ({
      ...current,
      family: {
        ...current.family,
        relationships: current.family.relationships.filter((relationship) => relationship.id !== relationshipId),
      },
    }));
  };

  if (activeTab === 'health') {
    return (
      <ModuleShell activeTab={activeTab} onTabChange={changeTab}>
        <HealthDashboard />
      </ModuleShell>
    );
  }

  if (activeTab === 'finance') {
    return (
      <ModuleShell activeTab={activeTab} onTabChange={changeTab}>
        <FinanceDashboard />
      </ModuleShell>
    );
  }

  return (
    <div className={isDark ? 'life-shell min-h-screen bg-[#0f172a] text-white transition-colors duration-500 dark' : 'life-shell min-h-screen bg-[#f6f7fb] text-slate-900 transition-colors duration-500'}>
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-[-8%] top-[-8%] h-[24rem] w-[24rem] rounded-full bg-sky-300/22 blur-[130px] dark:bg-sky-500/8" />
        <div className="absolute bottom-[-12%] right-[-6%] h-[22rem] w-[22rem] rounded-full bg-amber-300/18 blur-[130px] dark:bg-amber-500/8" />
      </div>

      <header className="sticky top-0 z-40 px-4 pb-4 pt-4">
        <div className="mx-auto max-w-[1500px] rounded-[1.6rem] border border-slate-200/75 bg-white/92 p-5 shadow-sm backdrop-blur dark:border-white/10 dark:bg-slate-950/80">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-[1.2rem] bg-slate-950 text-white dark:bg-white dark:text-slate-950">
                <span className="text-lg font-black tracking-tight">LA</span>
              </div>
              <div>
                <p className="life-kicker">Personal Command Center</p>
                <h1 className="mt-3 text-2xl font-black tracking-tight text-slate-900 dark:text-white">Life Atlas</h1>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500 dark:text-white/60">
                  Personal details, a cleaner family tree, and your original health plus finance dashboards in one place.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={exportSnapshot} className="life-secondary-button">
                <Download size={16} />
                Export Life Atlas Data
              </button>
              <button type="button" onClick={toggleTheme} className="life-secondary-button">
                {isDark ? <Sun size={16} /> : <Moon size={16} />}
                {isDark ? 'Light' : 'Dark'}
              </button>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {tabItems.map((item) => {
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => changeTab(item.id)}
                  className={active ? 'life-tab life-tab-active' : 'life-tab'}
                >
                  <item.icon size={16} />
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-[1500px] px-4 pb-12">
        {activeTab === 'profile' ? (
          <ProfileView profile={dashboard.profile} onChange={updateProfileField} />
        ) : null}

        {activeTab === 'family' ? (
          <FamilyView
            family={dashboard.family}
            onAddPerson={addPerson}
            onBulkAdd={addPeopleInBulk}
            onUpdatePerson={updatePerson}
            onDeletePerson={deletePerson}
            onAddRelationship={addRelationship}
            onDeleteRelationship={deleteRelationship}
            onSelectPerson={(personId) => setDashboard((current) => ({
              ...current,
              family: {
                ...current.family,
                selectedPersonId: personId,
              },
            }))}
          />
        ) : null}
      </main>
    </div>
  );
}

export default App;
