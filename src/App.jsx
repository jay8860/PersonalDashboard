import {
  startTransition,
  useDeferredValue,
  useEffect,
  useEffectEvent,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Activity,
  BadgeIndianRupee,
  BellRing,
  ChevronDown,
  Download,
  FileArchive,
  HeartPulse,
  LayoutDashboard,
  Moon,
  Network,
  NotebookPen,
  Plus,
  Search,
  SlidersHorizontal,
  Sun,
  UserRound,
} from 'lucide-react';
import FinanceDashboard from './finance/FinanceDashboard.jsx';
import { hasMeaningfulProfileData, loadStoredProfile, replaceStoredProfile } from './finance/utils/storage.js';
import HealthDashboard from './health/HealthDashboard.jsx';
import { getDailyNotes, getHealthData, getMeasurements, getTimeline } from './health/api.js';
import { deletePortalDocument, getPortalState, listPortalDocuments, putPortalState, uploadPortalDocument } from './life/api.js';
import {
  buildFinanceOverview,
  buildHealthTimelineItems,
  buildWeeklyReviewData,
  getActiveMedicines,
  getTakenTodayCount,
  getUpcomingFamilyBirthdays,
} from './life/dashboardData.js';
import {
  buildAutoRelationship,
  getCanonicalRelationshipKey,
  normalizeNameToken,
  resolveRelationInput,
  suggestFamilyPosition,
} from './life/relations.js';
import { buildGlobalSearchResults } from './life/search.js';
import {
  createMedicine,
  createPerson,
  createQuickNote,
  createReminder,
  downloadJsonFile,
  hasMeaningfulDashboardData,
  loadDashboard,
  normalizeDashboard,
  saveDashboard,
} from './life/store.js';
import FamilyView from './life/views/FamilyView.jsx';
import FitnessView from './life/views/FitnessView.jsx';
import HomeOverview from './life/views/HomeOverview.jsx';
import PlannerView from './life/views/PlannerView.jsx';
import ProfileView from './life/views/ProfileView.jsx';
import ReviewView from './life/views/ReviewView.jsx';
import VaultView from './life/views/VaultView.jsx';

const themeKey = 'life-atlas-theme';
const selfAliases = new Set(['', 'self', 'me', 'myself', 'you', 'person-self']);
let portalBootstrapPromise = null;
let portalBootstrapCache = null;

const tabItems = [
  { id: 'home', label: 'Home', icon: LayoutDashboard },
  { id: 'planner', label: 'Planner', icon: BellRing },
  { id: 'health', label: 'Health', icon: HeartPulse },
  { id: 'finance', label: 'Finance', icon: BadgeIndianRupee },
  { id: 'family', label: 'Family', icon: Network },
  { id: 'fitness', label: 'Fitness', icon: Activity },
  { id: 'vault', label: 'Vault', icon: FileArchive },
  { id: 'review', label: 'Weekly Review', icon: NotebookPen },
  { id: 'profile', label: 'About Me', icon: UserRound },
];

const plannerSectionItems = [
  { id: 'medicines', label: 'Medicines' },
  { id: 'quickNotes', label: 'Quick Notes' },
];

const headerControlItems = [
  { id: 'quickAdd', label: 'Quick Add' },
  { id: 'search', label: 'Search' },
  { id: 'statusTags', label: 'Status chips' },
  { id: 'export', label: 'Export' },
  { id: 'themeToggle', label: 'Theme toggle' },
  { id: 'subtitle', label: 'Header summary' },
];

const quickAddTypes = [
  { id: 'family', label: 'Family member' },
  { id: 'medicine', label: 'Medicine', section: 'medicines' },
  { id: 'note', label: 'Quick note', section: 'quickNotes' },
  { id: 'fitness', label: 'Fitness check-in' },
];

const buildInitialTab = () => {
  if (typeof window === 'undefined') return 'home';
  const next = window.location.hash.replace('#', '');
  return tabItems.some((item) => item.id === next) ? next : 'home';
};

const readThemePreference = () => {
  if (typeof window === 'undefined') return false;
  const storedTheme = window.localStorage.getItem(themeKey);
  if (storedTheme === 'dark') return true;
  if (storedTheme === 'light') return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
};

const timestampValue = (value) => {
  const parsed = value ? new Date(value).getTime() : 0;
  return Number.isFinite(parsed) ? parsed : 0;
};

const toIsoDateTime = (value) => {
  if (!value) return '';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? '' : parsed.toISOString();
};

const stampDashboard = (next) => ({
  ...next,
  updatedAt: new Date().toISOString(),
});

const appendRelationshipIfMissing = (relationships = [], relationship) => {
  if (relationship == null) return relationships;
  const nextKey = getCanonicalRelationshipKey(relationship);
  if (!nextKey) return relationships;
  return relationships.some((item) => getCanonicalRelationshipKey(item) === nextKey)
    ? relationships
    : [...relationships, relationship];
};

const createQuickAddDraft = (family) => ({
  type: 'family',
  title: '',
  dueAt: '',
  notes: '',
  relationKey: 'sibling',
  anchorId: family.selectedPersonId || 'person-self',
  dose: '',
  times: '',
  purpose: '',
  text: '',
  category: 'general',
  date: new Date().toISOString().slice(0, 10),
  weightKg: '',
});

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

const collectFamilyBranchIds = (family, rootIds = []) => {
  const childrenByAnchor = new Map();

  family.people.forEach((person) => {
    if (!person.anchorId || person.id === 'person-self') return;
    const existing = childrenByAnchor.get(person.anchorId) || [];
    existing.push(person.id);
    childrenByAnchor.set(person.anchorId, existing);
  });

  const collected = new Set();
  const visit = (personId) => {
    if (!personId || collected.has(personId) || personId === 'person-self') return;
    collected.add(personId);
    (childrenByAnchor.get(personId) || []).forEach(visit);
  };

  rootIds.forEach(visit);
  return collected;
};

const findBranchRootsForRelationship = (family, canonicalKey) => {
  if (!canonicalKey) return [];
  const peopleById = Object.fromEntries((family.people || []).map((person) => [person.id, person]));

  return (family.people || [])
    .filter((person) => person.id !== 'person-self' && person.anchorId)
    .filter((person) => {
      const anchorPerson = peopleById[person.anchorId];
      if (!anchorPerson) return false;
      const autoRelationship = buildAutoRelationship({ person, anchorPerson });
      return getCanonicalRelationshipKey(autoRelationship) === canonicalKey;
    })
    .map((person) => person.id);
};

const fetchPortalBootstrap = async () => {
  if (portalBootstrapCache) return portalBootstrapCache;
  if (!portalBootstrapPromise) {
    portalBootstrapPromise = Promise.all([
      getPortalState('lifeAtlas').catch(() => null),
      getPortalState('financeAtlas').catch(() => null),
      listPortalDocuments().catch(() => []),
      getHealthData().catch(() => []),
      getDailyNotes(40).catch(() => []),
      getTimeline(60).catch(() => []),
      getMeasurements(60).catch(() => []),
    ]).then(([lifeState, financeState, documents, history, notes, timeline, measurements]) => {
      const payload = {
        lifeState,
        financeState,
        documents: Array.isArray(documents) ? documents : [],
        history: Array.isArray(history) ? history : [],
        notes: Array.isArray(notes) ? notes : [],
        timeline: Array.isArray(timeline) ? timeline : [],
        measurements: Array.isArray(measurements) ? measurements : [],
      };
      portalBootstrapCache = payload;
      return payload;
    }).finally(() => {
      portalBootstrapPromise = null;
    });
  }

  return portalBootstrapPromise;
};

function App() {
  const shellHeaderRef = useRef(null);
  const lastScrollYRef = useRef(0);
  const [activeTab, setActiveTab] = useState(buildInitialTab);
  const [isDark, setIsDark] = useState(false);
  const [portalChromeOffset, setPortalChromeOffset] = useState(220);
  const [dashboard, setDashboard] = useState(() => normalizeDashboard(loadDashboard()));
  const [financeProfile, setFinanceProfile] = useState(() => loadStoredProfile());
  const [portalDocuments, setPortalDocuments] = useState([]);
  const [healthFeed, setHealthFeed] = useState({
    history: [],
    notes: [],
    timeline: [],
    measurements: [],
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [quickAddDraft, setQuickAddDraft] = useState(() => createQuickAddDraft(loadDashboard().family || { people: [], selectedPersonId: 'person-self' }));
  const [isUploadingDocument, setIsUploadingDocument] = useState(false);
  const [isLoadingPortal, setIsLoadingPortal] = useState(true);
  const [hasHydrated, setHasHydrated] = useState(false);
  const [isHeaderCondensed, setIsHeaderCondensed] = useState(false);

  const deferredSearchQuery = useDeferredValue(searchQuery);
  const hiddenTabs = dashboard.preferences.hiddenTabs || [];
  const hiddenPlannerSections = dashboard.preferences.hiddenPlannerSections || [];
  const hiddenHeaderControls = dashboard.preferences.hiddenHeaderControls || [];
  const headerMode = dashboard.preferences.headerMode || 'auto';
  const visibleTabItems = useMemo(
    () => tabItems.filter((item) => item.id === 'home' || !hiddenTabs.includes(item.id)),
    [hiddenTabs],
  );
  const visibleQuickAddTypes = useMemo(
    () => quickAddTypes.filter((item) => item.section == null || !hiddenPlannerSections.includes(item.section)),
    [hiddenPlannerSections],
  );
  const showQuickAddControl = !hiddenHeaderControls.includes('quickAdd') && visibleQuickAddTypes.length > 0;
  const showSearchControl = !hiddenHeaderControls.includes('search');
  const showStatusTags = !hiddenHeaderControls.includes('statusTags');
  const showExportControl = !hiddenHeaderControls.includes('export');
  const showThemeControl = !hiddenHeaderControls.includes('themeToggle');
  const showSubtitle = !hiddenHeaderControls.includes('subtitle');
  const shouldKeepHeaderExpanded = customizeOpen || quickAddOpen || searchQuery.trim().length > 0;
  const headerCollapsed = headerMode === 'auto' && isHeaderCondensed && !shouldKeepHeaderExpanded;

  const updateDashboard = (updater) => {
    setDashboard((current) => stampDashboard(typeof updater === 'function' ? updater(current) : updater));
  };

  const refreshHealthFeed = useEffectEvent(async () => {
    try {
      const [history, notes, timeline, measurements] = await Promise.all([
        getHealthData(),
        getDailyNotes(40),
        getTimeline(60),
        getMeasurements(60),
      ]);

      setHealthFeed({
        history: Array.isArray(history) ? history : [],
        notes: Array.isArray(notes) ? notes : [],
        timeline: Array.isArray(timeline) ? timeline : [],
        measurements: Array.isArray(measurements) ? measurements : [],
      });
    } catch {
      // Keep the latest successful data instead of blanking the screen.
    }
  });

  const hydratePortal = useEffectEvent(async () => {
    const localDashboard = normalizeDashboard(loadDashboard());
    const localFinance = loadStoredProfile();

    setDashboard(localDashboard);
    setFinanceProfile(localFinance);
    setIsLoadingPortal(true);

    try {
      const {
        lifeState,
        financeState,
        documents,
        history,
        notes,
        timeline,
        measurements,
      } = await fetchPortalBootstrap();

      const remoteDashboard = lifeState?.value ? normalizeDashboard(lifeState.value) : null;
      const shouldUseRemoteDashboard = remoteDashboard && (
        !hasMeaningfulDashboardData(localDashboard)
        || timestampValue(lifeState.updatedAt) > timestampValue(localDashboard.updatedAt)
      );

      const nextDashboard = shouldUseRemoteDashboard ? remoteDashboard : localDashboard;
      if (shouldUseRemoteDashboard) {
        saveDashboard(nextDashboard);
      } else if (hasMeaningfulDashboardData(localDashboard)) {
        putPortalState('lifeAtlas', localDashboard).catch(() => {});
      }

      const shouldUseRemoteFinance = financeState?.value && (
        !hasMeaningfulProfileData(localFinance)
        || timestampValue(financeState.updatedAt) > timestampValue(localFinance.lastUpdatedAt)
      );

      const nextFinance = shouldUseRemoteFinance
        ? replaceStoredProfile(financeState.value, { sync: false })
        : localFinance;

      if (!shouldUseRemoteFinance && hasMeaningfulProfileData(localFinance)) {
        putPortalState('financeAtlas', localFinance).catch(() => {});
      }

      setDashboard(nextDashboard);
      setFinanceProfile(nextFinance);
      setPortalDocuments(Array.isArray(documents) ? documents : []);
      setHealthFeed({
        history: Array.isArray(history) ? history : [],
        notes: Array.isArray(notes) ? notes : [],
        timeline: Array.isArray(timeline) ? timeline : [],
        measurements: Array.isArray(measurements) ? measurements : [],
      });
    } finally {
      setIsLoadingPortal(false);
      setHasHydrated(true);
    }
  });

  useEffect(() => {
    const syncTheme = () => {
      const next = readThemePreference();
      setIsDark(next);
      document.documentElement.classList.toggle('dark', next);
    };

    syncTheme();
    hydratePortal();

    const syncFromHash = () => {
      const next = window.location.hash.replace('#', '');
      setActiveTab(tabItems.some((item) => item.id === next) ? next : 'home');
    };

    const syncFinanceFromStorage = () => {
      setFinanceProfile(loadStoredProfile());
    };

    const handleWindowFocus = () => {
      syncTheme();
      refreshHealthFeed();
    };

    window.addEventListener('storage', syncTheme);
    window.addEventListener('storage', syncFinanceFromStorage);
    window.addEventListener('hashchange', syncFromHash);
    window.addEventListener('statement-atlas:changed', syncFinanceFromStorage);
    window.addEventListener('focus', handleWindowFocus);

    return () => {
      window.removeEventListener('storage', syncTheme);
      window.removeEventListener('storage', syncFinanceFromStorage);
      window.removeEventListener('hashchange', syncFromHash);
      window.removeEventListener('statement-atlas:changed', syncFinanceFromStorage);
      window.removeEventListener('focus', handleWindowFocus);
    };
  }, []);

  useEffect(() => {
    const element = shellHeaderRef.current;
    if (element == null || typeof window === 'undefined') return undefined;

    const updateOffset = () => {
      const rect = element.getBoundingClientRect();
      setPortalChromeOffset(Math.ceil(rect.height + 20));
    };

    updateOffset();
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(updateOffset) : null;
    observer?.observe(element);
    window.addEventListener('resize', updateOffset);

    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', updateOffset);
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    if (headerMode !== 'auto') {
      setIsHeaderCondensed(false);
      return undefined;
    }

    const handleScroll = () => {
      const currentY = window.scrollY;
      const delta = currentY - lastScrollYRef.current;

      if (currentY <= 56 || shouldKeepHeaderExpanded) {
        setIsHeaderCondensed(false);
      } else if (delta > 10 && currentY > 180) {
        setIsHeaderCondensed(true);
      } else if (delta < -10) {
        setIsHeaderCondensed(false);
      }

      lastScrollYRef.current = currentY;
    };

    lastScrollYRef.current = window.scrollY;
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [headerMode, shouldKeepHeaderExpanded]);

  useEffect(() => {
    if (!hasHydrated) return undefined;

    const saveTimer = window.setTimeout(() => {
      saveDashboard(dashboard);
    }, 180);

    const syncTimer = window.setTimeout(() => {
      putPortalState('lifeAtlas', dashboard).catch(() => {});
    }, 900);

    return () => {
      window.clearTimeout(saveTimer);
      window.clearTimeout(syncTimer);
    };
  }, [dashboard, hasHydrated]);

  useEffect(() => {
    window.history.replaceState(null, '', `#${activeTab}`);
  }, [activeTab]);

  useEffect(() => {
    if (visibleTabItems.some((item) => item.id === activeTab)) return;
    setActiveTab('home');
  }, [activeTab, visibleTabItems]);

  useEffect(() => {
    setQuickAddDraft((current) => ({
      ...current,
      anchorId: dashboard.family.people.some((person) => person.id === current.anchorId)
        ? current.anchorId
        : dashboard.family.selectedPersonId || 'person-self',
    }));
  }, [dashboard.family.people, dashboard.family.selectedPersonId]);

  useEffect(() => {
    if (visibleQuickAddTypes.some((item) => item.id === quickAddDraft.type)) return;
    setQuickAddDraft((current) => ({
      ...createQuickAddDraft(dashboard.family),
      type: visibleQuickAddTypes[0]?.id || 'family',
    }));
  }, [dashboard.family, quickAddDraft.type, visibleQuickAddTypes]);

  const financeOverview = useMemo(() => buildFinanceOverview(financeProfile), [financeProfile]);
  const healthTimeline = useMemo(() => buildHealthTimelineItems(healthFeed, 18), [healthFeed]);
  const medicinesVisible = !hiddenPlannerSections.includes('medicines');
  const quickNotesVisible = !hiddenPlannerSections.includes('quickNotes');
  const activeMedicines = useMemo(() => getActiveMedicines(dashboard.planner.medicines), [dashboard.planner.medicines]);
  const takenTodayCount = useMemo(() => getTakenTodayCount(dashboard.planner.medicines), [dashboard.planner.medicines]);
  const upcomingBirthdays = useMemo(() => getUpcomingFamilyBirthdays(dashboard.family.people, 45), [dashboard.family.people]);
  const weeklyReview = useMemo(
    () => buildWeeklyReviewData({
      dashboard,
      financeProfile,
      healthFeed,
      documents: portalDocuments,
    }),
    [dashboard, financeProfile, healthFeed, portalDocuments],
  );
  const statusTags = [
    medicinesVisible && activeMedicines.length ? `${activeMedicines.length} active medicine${activeMedicines.length === 1 ? '' : 's'}` : null,
    medicinesVisible && takenTodayCount ? `${takenTodayCount} taken today` : null,
    dashboard.family.people.length > 1 ? `${dashboard.family.people.length} family records` : null,
    portalDocuments.length ? `${portalDocuments.length} docs in vault` : 'Vault ready',
  ].filter(Boolean);

  const searchResults = useMemo(() => buildGlobalSearchResults({
    query: deferredSearchQuery,
    dashboard,
    documents: portalDocuments,
    financeProfile,
    healthTimeline,
  }), [dashboard, deferredSearchQuery, financeProfile, healthTimeline, portalDocuments]);

  const changeTab = (nextTab) => {
    if (nextTab === activeTab) return;
    setIsHeaderCondensed(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    startTransition(() => setActiveTab(nextTab));
  };

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle('dark', next);
    window.localStorage.setItem(themeKey, next ? 'dark' : 'light');
  };

  const exportSnapshot = () => {
    downloadJsonFile(`life-atlas-backup-${new Date().toISOString().slice(0, 10)}.json`, {
      exportedAt: new Date().toISOString(),
      lifeAtlas: dashboard,
      financeDashboard: financeProfile,
      documentVault: portalDocuments,
      healthSummary: {
        historyCount: healthFeed.history.length,
        notesCount: healthFeed.notes.length,
        timelineCount: healthFeed.timeline.length,
        measurementsCount: healthFeed.measurements.length,
      },
    });
  };

  const importPortalBackup = async (file) => {
    let parsed;

    try {
      parsed = JSON.parse(await file.text());
    } catch {
      throw new Error('That file is not valid JSON.');
    }

    const rawDashboard = parsed?.lifeAtlas && typeof parsed.lifeAtlas === 'object'
      ? parsed.lifeAtlas
      : parsed;

    if (rawDashboard == null || typeof rawDashboard !== 'object') {
      throw new Error('This backup does not contain a valid Life Atlas dashboard.');
    }

    const nextDashboard = stampDashboard(normalizeDashboard(rawDashboard));
    saveDashboard(nextDashboard);
    setDashboard(nextDashboard);
    putPortalState('lifeAtlas', nextDashboard).catch(() => {});

    let financeMessage = '';
    if (parsed?.financeDashboard && typeof parsed.financeDashboard === 'object') {
      const nextFinance = replaceStoredProfile(parsed.financeDashboard, { sync: true });
      setFinanceProfile(nextFinance);
      financeMessage = nextFinance.statements.length
        ? ` and ${nextFinance.statements.length} finance statement${nextFinance.statements.length === 1 ? '' : 's'}`
        : ' and the finance profile';
    }

    setSearchQuery('');
    setQuickAddOpen(false);
    setCustomizeOpen(false);
    changeTab('family');

    const peopleCount = nextDashboard.family.people.length;
    return `Imported ${peopleCount} family record${peopleCount === 1 ? '' : 's'}${financeMessage}. Vault file metadata was left unchanged.`;
  };

  const updateProfileField = (field, value) => {
    updateDashboard((current) => {
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
    updateDashboard((current) => {
      const built = buildPersonFromDraft(current.family, draft);
      return {
        ...current,
        family: {
          ...current.family,
          selectedPersonId: built.person.id,
          people: [...current.family.people, built.person],
          relationships: appendRelationshipIfMissing(current.family.relationships, built.relationship),
        },
      };
    });
  };

  const addPeopleInBulk = (bulkText) => {
    let summary = { added: 0, skipped: [] };

    updateDashboard((current) => {
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
          summary.skipped.push(`Line ${index + 1}: missing name.`);
          return;
        }

        const relation = resolveRelationInput(relationInput, 'custom');
        const anchorToken = normalizeNameToken(anchorInput);
        const fallbackAnchor = findAnchorPerson(nextFamily, nextFamily.selectedPersonId);
        const anchorPerson = selfAliases.has(anchorToken)
          ? nextFamily.people.find((person) => person.id === 'person-self') || fallbackAnchor
          : knownPeople.get(anchorToken) || fallbackAnchor;

        if (!anchorPerson) {
          summary.skipped.push(`Line ${index + 1}: could not resolve the linked person.`);
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
        nextFamily.relationships = appendRelationshipIfMissing(nextFamily.relationships, built.relationship);
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
      return { ...summary, message: `Added ${summary.added} family member${summary.added === 1 ? '' : 's'}.` };
    }

    if (summary.added > 0) {
      return {
        ...summary,
        message: `Added ${summary.added} family member${summary.added === 1 ? '' : 's'}. ${summary.skipped.join(' ')}`,
      };
    }

    return {
      ...summary,
      message: summary.skipped.join(' '),
    };
  };

  const updatePerson = (personId, patch) => {
    updateDashboard((current) => ({
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
    const targetPerson = dashboard.family.people.find((person) => person.id === personId);
    if (!targetPerson) return;

    const branchIds = collectFamilyBranchIds(dashboard.family, [personId]);
    const descendantCount = Math.max(0, branchIds.size - 1);
    const message = descendantCount > 0
      ? `Delete ${targetPerson.name || 'this person'} from the family tree? This will also remove ${descendantCount} attached descendant${descendantCount === 1 ? '' : 's'}.`
      : `Delete ${targetPerson.name || 'this person'} from the family tree?`;

    if (!window.confirm(message)) return;

    updateDashboard((current) => ({
      ...current,
      family: {
        ...current.family,
        selectedPersonId: branchIds.has(current.family.selectedPersonId) ? 'person-self' : current.family.selectedPersonId,
        people: current.family.people.filter((person) => !branchIds.has(person.id)),
        relationships: current.family.relationships.filter((relationship) => !branchIds.has(relationship.sourceId) && !branchIds.has(relationship.targetId)),
      },
    }));
  };

  const addRelationship = (draft) => {
    updateDashboard((current) => ({
      ...current,
      family: {
        ...current.family,
        relationships: appendRelationshipIfMissing(current.family.relationships, {
          id: crypto.randomUUID(),
          sourceId: draft.sourceId,
          targetId: draft.targetId,
          type: draft.type,
          label: draft.label?.trim() || 'Related to',
          labelHindi: draft.labelHindi?.trim() || 'रिश्तेदार',
        }),
      },
    }));
  };

  const deleteRelationship = (relationshipId) => {
    const targetRelationship = dashboard.family.relationships.find((relationship) => relationship.id === relationshipId);
    if (!targetRelationship) return;

    const targetKey = getCanonicalRelationshipKey(targetRelationship);
    const branchRootIds = findBranchRootsForRelationship(dashboard.family, targetKey);
    const branchIds = collectFamilyBranchIds(dashboard.family, branchRootIds);
    const branchRootNames = [...new Set(branchRootIds
      .map((personId) => dashboard.family.people.find((person) => person.id === personId)?.name)
      .filter(Boolean))];
    const descendantCount = Math.max(0, branchIds.size - branchRootIds.length);
    const message = branchRootIds.length > 0
      ? `Delete this relationship? This will also remove ${branchRootNames.join(', ') || 'the linked family member'} from the chart${descendantCount > 0 ? ` and ${descendantCount} attached descendant${descendantCount === 1 ? '' : 's'}` : ''}.`
      : 'Delete this relationship from the family chart?';

    if (!window.confirm(message)) return;

    updateDashboard((current) => {
      const currentTarget = current.family.relationships.find((relationship) => relationship.id === relationshipId);
      const currentKey = getCanonicalRelationshipKey(currentTarget);
      const currentBranchRootIds = findBranchRootsForRelationship(current.family, currentKey);
      const currentBranchIds = collectFamilyBranchIds(current.family, currentBranchRootIds);

      return {
        ...current,
        family: {
          ...current.family,
          selectedPersonId: currentBranchIds.has(current.family.selectedPersonId) ? 'person-self' : current.family.selectedPersonId,
          people: current.family.people.filter((person) => !currentBranchIds.has(person.id)),
          relationships: current.family.relationships.filter((relationship) => {
            if (currentBranchIds.has(relationship.sourceId) || currentBranchIds.has(relationship.targetId)) return false;
            return currentKey
              ? getCanonicalRelationshipKey(relationship) !== currentKey
              : relationship.id !== relationshipId;
          }),
        },
      };
    });
  };

  const addFitnessEntry = (draft) => {
    updateDashboard((current) => ({
      ...current,
      fitness: {
        ...current.fitness,
        entries: [
          {
            id: crypto.randomUUID(),
            ...draft,
          },
          ...current.fitness.entries,
        ].sort((left, right) => String(right.date).localeCompare(String(left.date))),
      },
    }));
  };

  const deleteFitnessEntry = (entryId) => {
    updateDashboard((current) => ({
      ...current,
      fitness: {
        ...current.fitness,
        entries: current.fitness.entries.filter((entry) => entry.id !== entryId),
      },
    }));
  };

  const changeFitnessGoal = (key, value) => {
    updateDashboard((current) => ({
      ...current,
      fitness: {
        ...current.fitness,
        goals: {
          ...current.fitness.goals,
          [key]: value,
        },
      },
    }));
  };

  const addReminder = (draft) => {
    updateDashboard((current) => ({
      ...current,
      planner: {
        ...current.planner,
        reminders: [
          createReminder({
            title: draft.title.trim(),
            dueAt: toIsoDateTime(draft.dueAt),
            type: draft.type,
            notes: draft.notes?.trim() || '',
          }),
          ...current.planner.reminders,
        ],
      },
    }));
  };

  const updateReminder = (reminderId, patch) => {
    updateDashboard((current) => ({
      ...current,
      planner: {
        ...current.planner,
        reminders: current.planner.reminders.map((reminder) => (
          reminder.id === reminderId
            ? { ...reminder, ...patch }
            : reminder
        )),
      },
    }));
  };

  const deleteReminder = (reminderId) => {
    updateDashboard((current) => ({
      ...current,
      planner: {
        ...current.planner,
        reminders: current.planner.reminders.filter((reminder) => reminder.id !== reminderId),
      },
    }));
  };

  const addMedicine = (draft) => {
    updateDashboard((current) => ({
      ...current,
      planner: {
        ...current.planner,
        medicines: [
          createMedicine({
            name: draft.name.trim(),
            dose: draft.dose?.trim() || '',
            times: draft.times?.trim() || '',
            purpose: draft.purpose?.trim() || '',
            startDate: draft.startDate || '',
            endDate: draft.endDate || '',
            relatedPersonId: draft.relatedPersonId || 'person-self',
            notes: draft.notes?.trim() || '',
          }),
          ...current.planner.medicines,
        ],
      },
    }));
  };

  const updateMedicine = (medicineId, patch) => {
    updateDashboard((current) => ({
      ...current,
      planner: {
        ...current.planner,
        medicines: current.planner.medicines.map((medicine) => (
          medicine.id === medicineId
            ? { ...medicine, ...patch }
            : medicine
        )),
      },
    }));
  };

  const deleteMedicine = (medicineId) => {
    updateDashboard((current) => ({
      ...current,
      planner: {
        ...current.planner,
        medicines: current.planner.medicines.filter((medicine) => medicine.id !== medicineId),
      },
    }));
  };

  const toggleMedicineTakenToday = (medicineId) => {
    const today = new Date().toISOString().slice(0, 10);

    updateDashboard((current) => ({
      ...current,
      planner: {
        ...current.planner,
        medicines: current.planner.medicines.map((medicine) => {
          if (medicine.id !== medicineId) return medicine;
          const takenLog = new Set(medicine.takenLog || []);
          if (takenLog.has(today)) takenLog.delete(today);
          else takenLog.add(today);
          return {
            ...medicine,
            takenLog: [...takenLog],
          };
        }),
      },
    }));
  };

  const addQuickNote = (draft) => {
    updateDashboard((current) => ({
      ...current,
      planner: {
        ...current.planner,
        quickNotes: [
          createQuickNote({
            text: draft.text.trim(),
            category: draft.category || 'general',
          }),
          ...current.planner.quickNotes,
        ],
      },
    }));
  };

  const deleteQuickNote = (noteId) => {
    updateDashboard((current) => ({
      ...current,
      planner: {
        ...current.planner,
        quickNotes: current.planner.quickNotes.filter((note) => note.id !== noteId),
      },
    }));
  };

  const toggleHiddenTab = (tabId) => {
    if (tabId === 'home') return;
    updateDashboard((current) => {
      const hiddenSet = new Set(current.preferences.hiddenTabs || []);
      if (hiddenSet.has(tabId)) hiddenSet.delete(tabId);
      else hiddenSet.add(tabId);
      return {
        ...current,
        preferences: {
          ...current.preferences,
          hiddenTabs: [...hiddenSet],
        },
      };
    });
  };

  const togglePlannerSectionVisibility = (sectionId) => {
    updateDashboard((current) => {
      const hiddenSet = new Set(current.preferences.hiddenPlannerSections || []);
      if (hiddenSet.has(sectionId)) hiddenSet.delete(sectionId);
      else hiddenSet.add(sectionId);
      return {
        ...current,
        preferences: {
          ...current.preferences,
          hiddenPlannerSections: [...hiddenSet],
        },
      };
    });
  };

  const setHeaderModePreference = (nextMode) => {
    updateDashboard((current) => ({
      ...current,
      preferences: {
        ...current.preferences,
        headerMode: nextMode === 'persistent' ? 'persistent' : 'auto',
      },
    }));
  };

  const toggleHeaderControlVisibility = (controlId) => {
    updateDashboard((current) => {
      const hiddenSet = new Set(current.preferences.hiddenHeaderControls || []);
      if (hiddenSet.has(controlId)) hiddenSet.delete(controlId);
      else hiddenSet.add(controlId);
      return {
        ...current,
        preferences: {
          ...current.preferences,
          hiddenHeaderControls: [...hiddenSet],
        },
      };
    });

    if (controlId === 'quickAdd' && !hiddenHeaderControls.includes('quickAdd')) {
      setQuickAddOpen(false);
    }

    if (controlId === 'search' && !hiddenHeaderControls.includes('search')) {
      setSearchQuery('');
    }
  };

  const handleUploadDocument = async (payload) => {
    setIsUploadingDocument(true);
    try {
      const saved = await uploadPortalDocument(payload);
      setPortalDocuments((current) => [saved, ...current]);
      changeTab('vault');
    } finally {
      setIsUploadingDocument(false);
    }
  };

  const handleDeleteDocument = async (documentId) => {
    await deletePortalDocument(documentId);
    setPortalDocuments((current) => current.filter((document) => document.id !== documentId));
  };

  const handleSearchResult = (result) => {
    setSearchQuery('');
    if (result.personId) {
      setDashboard((current) => ({
        ...current,
        family: {
          ...current.family,
          selectedPersonId: result.personId,
        },
      }));
    }
    changeTab(result.tab);
  };

  const handleQuickAddSubmit = (event) => {
    event.preventDefault();

    if (quickAddDraft.type === 'reminder') {
      if (!quickAddDraft.title.trim()) return;
      addReminder({
        title: quickAddDraft.title,
        dueAt: quickAddDraft.dueAt,
        type: quickAddDraft.category === 'general' ? 'personal' : quickAddDraft.category,
        notes: quickAddDraft.notes,
      });
      changeTab('planner');
    }

    if (quickAddDraft.type === 'medicine') {
      if (!quickAddDraft.title.trim()) return;
      addMedicine({
        name: quickAddDraft.title,
        dose: quickAddDraft.dose,
        times: quickAddDraft.times,
        purpose: quickAddDraft.purpose,
        relatedPersonId: dashboard.family.selectedPersonId || 'person-self',
        notes: quickAddDraft.notes,
      });
      changeTab('planner');
    }

    if (quickAddDraft.type === 'family') {
      if (!quickAddDraft.title.trim()) return;
      addPerson({
        name: quickAddDraft.title,
        relationKey: quickAddDraft.relationKey,
        relationLabel: '',
        relationHindi: '',
        anchorId: quickAddDraft.anchorId,
        birthYear: '',
        note: quickAddDraft.notes,
      });
      changeTab('family');
    }

    if (quickAddDraft.type === 'note') {
      if (!quickAddDraft.text.trim()) return;
      addQuickNote({
        text: quickAddDraft.text,
        category: quickAddDraft.category,
      });
      changeTab('planner');
    }

    if (quickAddDraft.type === 'fitness') {
      if (!quickAddDraft.date) return;
      addFitnessEntry({
        date: quickAddDraft.date,
        weightKg: quickAddDraft.weightKg,
        bodyFatPct: '',
        waistCm: '',
        chestCm: '',
        hipCm: '',
        restingHeartRate: '',
        steps: '',
        sleepHours: '',
        workoutMinutes: '',
        waterLiters: '',
        note: quickAddDraft.notes,
      });
      changeTab('fitness');
    }

    setQuickAddDraft(createQuickAddDraft(dashboard.family));
    setQuickAddOpen(false);
  };

  const renderActiveView = () => {
    switch (activeTab) {
      case 'home':
        return (
          <HomeOverview
            dashboardMode={dashboard.preferences.dashboardMode}
            profile={dashboard.profile}
            family={dashboard.family}
            planner={{
              medicines: medicinesVisible ? activeMedicines : [],
              quickNotes: quickNotesVisible ? dashboard.planner.quickNotes : [],
            }}
            fitness={dashboard.fitness}
            financeOverview={financeOverview}
            healthTimeline={healthTimeline}
            documents={portalDocuments}
            upcomingBirthdays={upcomingBirthdays}
            weeklyReview={weeklyReview}
            hiddenSections={hiddenPlannerSections}
            onNavigate={changeTab}
            onOpenQuickAdd={showQuickAddControl ? () => setQuickAddOpen(true) : undefined}
          />
        );
      case 'profile':
        return <ProfileView profile={dashboard.profile} onChange={updateProfileField} />;
      case 'family':
        return (
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
            onImportBackup={importPortalBackup}
          />
        );
      case 'planner':
        return (
          <PlannerView
            planner={dashboard.planner}
            family={dashboard.family}
            dashboardMode={dashboard.preferences.dashboardMode}
            hiddenSections={hiddenPlannerSections}
            onToggleSectionVisibility={togglePlannerSectionVisibility}
            onAddReminder={addReminder}
            onUpdateReminder={updateReminder}
            onDeleteReminder={deleteReminder}
            onAddMedicine={addMedicine}
            onUpdateMedicine={updateMedicine}
            onDeleteMedicine={deleteMedicine}
            onToggleMedicineTakenToday={toggleMedicineTakenToday}
            onAddQuickNote={addQuickNote}
            onDeleteQuickNote={deleteQuickNote}
          />
        );
      case 'fitness':
        return (
          <FitnessView
            fitness={dashboard.fitness}
            profile={dashboard.profile}
            onAddEntry={addFitnessEntry}
            onDeleteEntry={deleteFitnessEntry}
            onGoalsChange={changeFitnessGoal}
          />
        );
      case 'vault':
        return (
          <VaultView
            documents={portalDocuments}
            family={dashboard.family}
            isUploadingDocument={isUploadingDocument}
            onUploadDocument={handleUploadDocument}
            onDeleteDocument={handleDeleteDocument}
          />
        );
      case 'review':
        return (
          <ReviewView
            dashboardMode={dashboard.preferences.dashboardMode}
            weeklyReview={weeklyReview}
            financeOverview={financeOverview}
            healthTimeline={healthTimeline}
            documents={portalDocuments}
            fitnessEntries={dashboard.fitness.entries}
            upcomingReminders={[]}
            upcomingBirthdays={upcomingBirthdays}
            onNavigate={changeTab}
          />
        );
      case 'health':
        return <HealthDashboard embedded portalOffset={portalChromeOffset} portalIsDark={isDark} />;
      case 'finance':
        return <FinanceDashboard embedded portalOffset={portalChromeOffset} portalIsDark={isDark} />;
      default:
        return null;
    }
  };

  return (
    <div className={isDark ? 'life-shell min-h-screen bg-[#050816] text-white transition-colors duration-500 dark' : 'life-shell min-h-screen bg-[#f4f7ff] text-slate-900 transition-colors duration-500'}>
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-[-10%] top-[-12%] h-[28rem] w-[28rem] rounded-full bg-sky-300/30 blur-[150px] dark:bg-sky-500/10" />
        <div className="absolute right-[12%] top-[4%] h-[16rem] w-[16rem] rounded-full bg-fuchsia-200/30 blur-[120px] dark:bg-fuchsia-500/10" />
        <div className="absolute bottom-[-12%] right-[-6%] h-[24rem] w-[24rem] rounded-full bg-amber-300/22 blur-[150px] dark:bg-amber-500/10" />
        <div className="absolute bottom-[15%] left-[18%] h-[18rem] w-[18rem] rounded-full bg-teal-200/22 blur-[130px] dark:bg-teal-500/8" />
      </div>

      <header ref={shellHeaderRef} className={`sticky top-0 z-50 px-4 transition-all duration-300 ${headerCollapsed ? 'pt-3' : 'pt-4'}`}>
        <div className={`mx-auto max-w-[1600px] border border-white/80 bg-white/75 shadow-[0_24px_70px_rgba(15,23,42,0.12)] backdrop-blur-2xl transition-all duration-300 dark:border-white/10 dark:bg-slate-950/72 ${headerCollapsed ? 'rounded-[1.4rem] p-3' : 'rounded-[1.8rem] p-4'}`}>
          <div className={`flex flex-col ${headerCollapsed ? 'gap-3' : 'gap-4'}`}>
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex items-center gap-4">
                <div className={`flex items-center justify-center rounded-[1.2rem] bg-slate-950 text-white dark:bg-white dark:text-slate-950 ${headerCollapsed ? 'h-11 w-11' : 'h-14 w-14'}`}>
                  <span className="text-lg font-black tracking-tight">LA</span>
                </div>
                <div>
                  {!headerCollapsed ? <p className="life-kicker">Personal Command Center</p> : null}
                  <div className={`flex flex-wrap items-center gap-2 ${headerCollapsed ? '' : 'mt-3'}`}>
                    <h1 className={`${headerCollapsed ? 'text-xl' : 'text-2xl'} font-black tracking-tight text-slate-900 dark:text-white`}>Life Atlas</h1>
                    {headerCollapsed ? <span className="tag">Focus view</span> : null}
                  </div>
                  {showSubtitle && !headerCollapsed ? (
                    <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500 dark:text-white/60">
                      A practical home for your profile, family, medicines, documents, health records, and finances.
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {showQuickAddControl && !headerCollapsed ? (
                  <button type="button" onClick={() => setQuickAddOpen((current) => !current)} className="life-primary-button">
                    <Plus size={16} />
                    Quick Add
                  </button>
                ) : null}
                {showExportControl && !headerCollapsed ? (
                  <button type="button" onClick={exportSnapshot} className="life-secondary-button">
                    <Download size={16} />
                    Export
                  </button>
                ) : null}
                {showThemeControl ? (
                  <button type="button" onClick={toggleTheme} className="life-secondary-button">
                    {isDark ? <Sun size={16} /> : <Moon size={16} />}
                    {isDark ? 'Light' : 'Dark'}
                  </button>
                ) : null}
              </div>
            </div>

            {!headerCollapsed && (showSearchControl || showStatusTags) ? (
              <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr),auto] xl:items-center">
                {showSearchControl ? (
                  <label className="relative">
                    <Search size={17} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-white/35" />
                    <input
                      value={searchQuery}
                      onChange={(event) => setSearchQuery(event.target.value)}
                      placeholder="Search across family, medicines, documents, health, and finance"
                      className="life-input pl-11"
                    />
                  </label>
                ) : <div />}

                {showStatusTags ? (
                  <div className="flex flex-wrap gap-2">
                    {statusTags.map((label) => (
                      <span key={label} className="tag">{label}</span>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}

            <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
              <div className="flex gap-2 overflow-x-auto pb-1">
                {visibleTabItems.map((item) => {
                  const active = item.id === activeTab;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => changeTab(item.id)}
                      className={active ? 'life-tab life-tab-active whitespace-nowrap' : 'life-tab whitespace-nowrap'}
                    >
                      <item.icon size={16} />
                      {item.label}
                    </button>
                  );
                })}
              </div>

              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => setCustomizeOpen((current) => !current)} className="life-secondary-button whitespace-nowrap">
                  {headerCollapsed ? <ChevronDown size={16} /> : <SlidersHorizontal size={16} />}
                  {customizeOpen ? 'Hide controls' : headerCollapsed ? 'Open controls' : 'Customize view'}
                </button>
              </div>
            </div>

            {customizeOpen ? (
              <section className="life-panel border-dashed">
                <div className="grid gap-5 xl:grid-cols-[0.78fr,1fr,1fr]">
                  <div>
                    <p className="life-card-label">Header behavior</p>
                    <h2 className="mt-2 text-xl font-black tracking-tight text-slate-900 dark:text-white">
                      Let the command center stay pinned or step aside on scroll.
                    </h2>
                    <div className="mt-5 flex flex-wrap gap-2">
                      {[
                        { id: 'auto', label: 'Auto-hide', description: 'Shrinks while you scroll' },
                        { id: 'persistent', label: 'Persistent', description: 'Always stays open' },
                      ].map((mode) => {
                        const active = headerMode === mode.id;
                        return (
                          <button
                            key={mode.id}
                            type="button"
                            onClick={() => setHeaderModePreference(mode.id)}
                            className={active ? 'life-tab life-tab-active whitespace-nowrap' : 'life-tab whitespace-nowrap opacity-70'}
                          >
                            {mode.label}
                            {active ? ' • active' : ` • ${mode.description}`}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <p className="life-card-label">Top controls</p>
                    <h2 className="mt-2 text-xl font-black tracking-tight text-slate-900 dark:text-white">
                      Hide extra controls when you want the content to breathe.
                    </h2>
                    <div className="mt-5 flex flex-wrap gap-2">
                      {headerControlItems.map((control) => {
                        const hidden = hiddenHeaderControls.includes(control.id);
                        return (
                          <button
                            key={control.id}
                            type="button"
                            onClick={() => toggleHeaderControlVisibility(control.id)}
                            className={hidden ? 'life-tab whitespace-nowrap opacity-55' : 'life-tab life-tab-active whitespace-nowrap'}
                          >
                            {control.label}
                            {hidden ? ' • hidden' : ' • shown'}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <p className="life-card-label">Visible tabs</p>
                    <h2 className="mt-2 text-xl font-black tracking-tight text-slate-900 dark:text-white">
                      Keep only the main areas you want to see every day.
                    </h2>
                    <div className="mt-5 flex flex-wrap gap-2">
                      {tabItems.map((item) => {
                        const hidden = item.id !== 'home' && hiddenTabs.includes(item.id);
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => toggleHiddenTab(item.id)}
                            className={hidden ? 'life-tab whitespace-nowrap opacity-55' : 'life-tab life-tab-active whitespace-nowrap'}
                          >
                            <item.icon size={16} />
                            {item.label}
                            {item.id === 'home' ? ' • fixed' : hidden ? ' • hidden' : ' • shown'}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="mt-6">
                  <p className="life-card-label">Planner sections</p>
                  <h2 className="mt-2 text-xl font-black tracking-tight text-slate-900 dark:text-white">
                    Keep only active medicines or quick notes in the planner.
                  </h2>
                  <div className="mt-5 flex flex-wrap gap-2">
                    {plannerSectionItems.map((section) => {
                      const hidden = hiddenPlannerSections.includes(section.id);
                      return (
                        <button
                          key={section.id}
                          type="button"
                          onClick={() => togglePlannerSectionVisibility(section.id)}
                          className={hidden ? 'life-tab whitespace-nowrap opacity-55' : 'life-tab life-tab-active whitespace-nowrap'}
                        >
                          {section.label}
                          {hidden ? ' • hidden' : ' • shown'}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </section>
            ) : null}

            {quickAddOpen ? (
              <section className="life-panel border-dashed">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="life-card-label">Universal quick add</p>
                    <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                      Add something useful in a few seconds
                    </h2>
                  </div>
                  <select
                    value={quickAddDraft.type}
                    onChange={(event) => setQuickAddDraft((current) => ({
                      ...createQuickAddDraft(dashboard.family),
                      type: event.target.value,
                    }))}
                    className="life-input max-w-[220px]"
                  >
                    {visibleQuickAddTypes.map((option) => (
                      <option key={option.id} value={option.id}>{option.label}</option>
                    ))}
                  </select>
                </div>

                <form className="mt-6 grid gap-4" onSubmit={handleQuickAddSubmit}>
                  {quickAddDraft.type === 'reminder' ? (
                    <div className="grid gap-4 md:grid-cols-3">
                      <input
                        value={quickAddDraft.title}
                        onChange={(event) => setQuickAddDraft((current) => ({ ...current, title: event.target.value }))}
                        placeholder="Reminder title"
                        className="life-input"
                      />
                      <input
                        type="datetime-local"
                        value={quickAddDraft.dueAt}
                        onChange={(event) => setQuickAddDraft((current) => ({ ...current, dueAt: event.target.value }))}
                        className="life-input"
                      />
                      <select
                        value={quickAddDraft.category}
                        onChange={(event) => setQuickAddDraft((current) => ({ ...current, category: event.target.value }))}
                        className="life-input"
                      >
                        <option value="general">Personal</option>
                        <option value="health">Health</option>
                        <option value="finance">Finance</option>
                        <option value="family">Family</option>
                        <option value="work">Work</option>
                      </select>
                      <textarea
                        rows={2}
                        value={quickAddDraft.notes}
                        onChange={(event) => setQuickAddDraft((current) => ({ ...current, notes: event.target.value }))}
                        placeholder="Optional notes"
                        className="life-textarea md:col-span-3"
                      />
                    </div>
                  ) : null}

                  {quickAddDraft.type === 'medicine' ? (
                    <div className="grid gap-4 md:grid-cols-4">
                      <input
                        value={quickAddDraft.title}
                        onChange={(event) => setQuickAddDraft((current) => ({ ...current, title: event.target.value }))}
                        placeholder="Medicine name"
                        className="life-input"
                      />
                      <input
                        value={quickAddDraft.dose}
                        onChange={(event) => setQuickAddDraft((current) => ({ ...current, dose: event.target.value }))}
                        placeholder="Dose"
                        className="life-input"
                      />
                      <input
                        value={quickAddDraft.times}
                        onChange={(event) => setQuickAddDraft((current) => ({ ...current, times: event.target.value }))}
                        placeholder="When to take"
                        className="life-input"
                      />
                      <input
                        value={quickAddDraft.purpose}
                        onChange={(event) => setQuickAddDraft((current) => ({ ...current, purpose: event.target.value }))}
                        placeholder="Purpose"
                        className="life-input"
                      />
                      <textarea
                        rows={2}
                        value={quickAddDraft.notes}
                        onChange={(event) => setQuickAddDraft((current) => ({ ...current, notes: event.target.value }))}
                        placeholder="Optional notes"
                        className="life-textarea md:col-span-4"
                      />
                    </div>
                  ) : null}

                  {quickAddDraft.type === 'family' ? (
                    <div className="grid gap-4 md:grid-cols-3">
                      <input
                        value={quickAddDraft.title}
                        onChange={(event) => setQuickAddDraft((current) => ({ ...current, title: event.target.value }))}
                        placeholder="Family member name"
                        className="life-input"
                      />
                      <select
                        value={quickAddDraft.relationKey}
                        onChange={(event) => setQuickAddDraft((current) => ({ ...current, relationKey: event.target.value }))}
                        className="life-input"
                      >
                        <option value="father">Father</option>
                        <option value="mother">Mother</option>
                        <option value="brother">Brother</option>
                        <option value="sister">Sister</option>
                        <option value="son">Son</option>
                        <option value="daughter">Daughter</option>
                        <option value="husband">Husband</option>
                        <option value="wife">Wife</option>
                        <option value="uncle">Uncle</option>
                        <option value="aunt">Aunt</option>
                        <option value="cousin">Cousin</option>
                        <option value="nephew">Nephew</option>
                        <option value="niece">Niece</option>
                        <option value="grandfather">Grandfather</option>
                        <option value="grandmother">Grandmother</option>
                      </select>
                      <select
                        value={quickAddDraft.anchorId}
                        onChange={(event) => setQuickAddDraft((current) => ({ ...current, anchorId: event.target.value }))}
                        className="life-input"
                      >
                        {dashboard.family.people.map((person) => (
                          <option key={person.id} value={person.id}>{person.name || 'Unnamed person'}</option>
                        ))}
                      </select>
                      <textarea
                        rows={2}
                        value={quickAddDraft.notes}
                        onChange={(event) => setQuickAddDraft((current) => ({ ...current, notes: event.target.value }))}
                        placeholder="Optional note"
                        className="life-textarea md:col-span-3"
                      />
                    </div>
                  ) : null}

                  {quickAddDraft.type === 'note' ? (
                    <div className="grid gap-4 md:grid-cols-4">
                      <textarea
                        rows={3}
                        value={quickAddDraft.text}
                        onChange={(event) => setQuickAddDraft((current) => ({ ...current, text: event.target.value }))}
                        placeholder="Write the note"
                        className="life-textarea md:col-span-3"
                      />
                      <select
                        value={quickAddDraft.category}
                        onChange={(event) => setQuickAddDraft((current) => ({ ...current, category: event.target.value }))}
                        className="life-input"
                      >
                        <option value="general">General</option>
                        <option value="health">Health</option>
                        <option value="finance">Finance</option>
                        <option value="family">Family</option>
                        <option value="idea">Idea</option>
                      </select>
                    </div>
                  ) : null}

                  {quickAddDraft.type === 'fitness' ? (
                    <div className="grid gap-4 md:grid-cols-3">
                      <input
                        type="date"
                        value={quickAddDraft.date}
                        onChange={(event) => setQuickAddDraft((current) => ({ ...current, date: event.target.value }))}
                        className="life-input"
                      />
                      <input
                        type="number"
                        value={quickAddDraft.weightKg}
                        onChange={(event) => setQuickAddDraft((current) => ({ ...current, weightKg: event.target.value }))}
                        placeholder="Weight (kg)"
                        className="life-input"
                      />
                      <textarea
                        rows={2}
                        value={quickAddDraft.notes}
                        onChange={(event) => setQuickAddDraft((current) => ({ ...current, notes: event.target.value }))}
                        placeholder="Optional note"
                        className="life-textarea"
                      />
                    </div>
                  ) : null}

                  <div className="flex flex-wrap justify-end gap-3">
                    <button type="button" onClick={() => setQuickAddOpen(false)} className="life-secondary-button">
                      Close
                    </button>
                    <button type="submit" className="life-primary-button">
                      Save item
                    </button>
                  </div>
                </form>
              </section>
            ) : null}

            {searchQuery.trim() ? (
              <section className="life-panel">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="life-card-label">Search results</p>
                    <h2 className="mt-2 text-xl font-black tracking-tight text-slate-900 dark:text-white">
                      {searchResults.length} match{searchResults.length === 1 ? '' : 'es'}
                    </h2>
                  </div>
                  <button type="button" onClick={() => setSearchQuery('')} className="life-secondary-button px-4 py-2">
                    Clear
                  </button>
                </div>

                <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {searchResults.length === 0 ? (
                    <div className="life-soft-card md:col-span-2 xl:col-span-3">
                      <p className="text-sm leading-6 text-slate-600 dark:text-white/65">
                        No exact matches yet. Try a family name, medicine, merchant, or document title.
                      </p>
                    </div>
                  ) : (
                    searchResults.map((result) => (
                      <button
                        key={`${result.tab}-${result.id}`}
                        type="button"
                        onClick={() => handleSearchResult(result)}
                        className="life-soft-card text-left transition hover:-translate-y-0.5 hover:shadow-md"
                      >
                        <p className="life-card-label">{result.badge}</p>
                        <p className="mt-2 text-base font-bold text-slate-900 dark:text-white">{result.title}</p>
                        <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-white/55">{result.subtitle}</p>
                      </button>
                    ))
                  )}
                </div>
              </section>
            ) : null}
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-[1600px] px-4 pb-12 pt-5">
        {isLoadingPortal && activeTab === 'home' ? (
          <section className="life-panel">
            <p className="life-card-label">Loading</p>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-900 dark:text-white">
              Pulling your latest portal data together
            </h2>
          </section>
        ) : renderActiveView()}
      </main>
    </div>
  );
}

export default App;
