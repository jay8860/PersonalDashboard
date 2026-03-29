import { addDays, format, isAfter, isBefore, isValid, parseISO, startOfDay, startOfMonth, subDays } from 'date-fns';
import { buildAnalytics } from '../finance/utils/analytics.js';
import { reclassifyStoredTransaction } from '../finance/utils/classification.js';
import { applyOverridesToTransactions, applyRulesToTransactions } from '../finance/utils/transactionOverrides.js';

const toDate = (value) => {
  if (!value) return null;
  const parsed = parseISO(String(value));
  return isValid(parsed) ? parsed : null;
};

export const getEffectiveFinanceProfile = (profile) => {
  const refreshedTransactions = (profile?.transactions || []).map((transaction) => reclassifyStoredTransaction(transaction));
  const ruleAdjustedTransactions = applyRulesToTransactions(refreshedTransactions, profile?.rules || []);
  const effectiveTransactions = applyOverridesToTransactions(ruleAdjustedTransactions, profile?.overrides || {});

  return {
    ...(profile || {}),
    transactions: effectiveTransactions,
  };
};

export const buildFinanceOverview = (profile) => {
  const effectiveProfile = getEffectiveFinanceProfile(profile || { statements: [], transactions: [], rules: [], overrides: {} });
  const includedTransactions = (effectiveProfile.transactions || []).filter((transaction) => !transaction.excludedFromAnalysis);
  const analytics = buildAnalytics(
    {
      ...effectiveProfile,
      transactions: includedTransactions,
    },
    { year: 'all', statementId: 'all' },
  );

  const monthKey = new Date().toISOString().slice(0, 7);
  const currentMonthTransactions = analytics.transactions.filter((transaction) => String(transaction.date || '').startsWith(monthKey));
  const currentMonthInflow = currentMonthTransactions
    .filter((transaction) => transaction.direction === 'credit')
    .reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0);
  const currentMonthOutflow = currentMonthTransactions
    .filter((transaction) => transaction.direction === 'debit')
    .reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0);
  const currentMonthNet = currentMonthInflow - currentMonthOutflow;
  const currentMonthSpend = analytics.trueSpendTransactions
    .filter((transaction) => String(transaction.date || '').startsWith(monthKey))
    .reduce((sum, transaction) => sum + (transaction.direction === 'credit' ? -Number(transaction.amount || 0) : Number(transaction.amount || 0)), 0);

  return {
    analytics,
    currentMonthInflow,
    currentMonthOutflow,
    currentMonthNet,
    currentMonthSpend,
    topSpendCategory: analytics.trueSpendCategoryRanking[0] || analytics.categoryRanking[0] || null,
    topMerchant: analytics.trueSpendMerchantRanking[0] || analytics.merchantRanking[0] || null,
    subscriptions: analytics.subscriptions || [],
    biggestSpend: analytics.biggestSpend || null,
  };
};

export const buildHealthTimelineItems = (healthFeed, limit = 6) => {
  const notes = (healthFeed?.notes || []).map((note) => ({
    id: 'note-' + String(note.id),
    date: note.created_at,
    kind: 'Daily note',
    title: 'Daily note',
    description: note.note_text,
  }));

  const timeline = (healthFeed?.timeline || []).map((entry) => ({
    id: 'timeline-' + String(entry.id),
    date: entry.event_date || entry.created_at,
    kind: entry.category || 'Timeline',
    title: entry.title,
    description: entry.details || entry.date_text || '',
  }));

  const measurements = (healthFeed?.measurements || []).map((entry) => ({
    id: 'measurement-' + String(entry.id),
    date: entry.event_date || entry.created_at,
    kind: 'Measurements',
    title: 'Body measurements',
    description: entry.measurement_text,
  }));

  const reports = (healthFeed?.history || []).map((record) => ({
    id: 'history-' + String(record.id),
    date: record.created_at,
    kind: 'Health upload',
    title: String(record.type || 'Health record').replace(/_/g, ' '),
    description: record.data?.summary || record.data?.title || 'Uploaded to your health dashboard.',
  }));

  return [...timeline, ...notes, ...measurements, ...reports]
    .filter((item) => item.date)
    .sort((left, right) => String(right.date).localeCompare(String(left.date)))
    .slice(0, limit);
};

export const getUpcomingReminders = (reminders = [], days = 7) => {
  const today = startOfDay(new Date());
  const horizon = addDays(today, days);
  return reminders
    .filter((reminder) => reminder.status !== 'done' && reminder.dueAt)
    .filter((reminder) => {
      const dueDate = toDate(reminder.dueAt);
      if (!dueDate) return false;
      return !isBefore(dueDate, today) && !isAfter(dueDate, horizon);
    })
    .sort((left, right) => String(left.dueAt).localeCompare(String(right.dueAt)));
};

export const getActiveMedicines = (medicines = []) => medicines.filter((medicine) => medicine.active !== false);

export const getTakenTodayCount = (medicines = []) => {
  const today = new Date().toISOString().slice(0, 10);
  return medicines.filter((medicine) => (medicine.takenLog || []).includes(today)).length;
};

export const getUpcomingFamilyBirthdays = (people = [], days = 30) => {
  const today = startOfDay(new Date());
  const horizon = addDays(today, days);

  return people
    .filter((person) => person.birthday)
    .map((person) => {
      const birthday = toDate(person.birthday);
      if (!birthday) return null;
      const thisYear = new Date(today.getFullYear(), birthday.getMonth(), birthday.getDate());
      const nextOccurrence = isBefore(thisYear, today)
        ? new Date(today.getFullYear() + 1, birthday.getMonth(), birthday.getDate())
        : thisYear;
      return {
        ...person,
        nextBirthday: nextOccurrence,
      };
    })
    .filter(Boolean)
    .filter((person) => !isAfter(person.nextBirthday, horizon))
    .sort((left, right) => left.nextBirthday - right.nextBirthday);
};

export const buildWeeklyReviewData = ({ dashboard, financeProfile, healthFeed, documents }) => {
  const reviewStart = subDays(startOfDay(new Date()), 6);
  const reminders = (dashboard?.planner?.reminders || []).filter((reminder) => reminder.dueAt && toDate(reminder.dueAt) && !isBefore(toDate(reminder.dueAt), reviewStart));
  const completedReminders = reminders.filter((reminder) => reminder.status === 'done');
  const recentFitness = (dashboard?.fitness?.entries || []).filter((entry) => entry.date && !isBefore(toDate(entry.date), reviewStart));
  const recentHealthTimeline = buildHealthTimelineItems(healthFeed, 12).filter((item) => !isBefore(toDate(item.date), reviewStart));
  const recentDocuments = (documents || []).filter((doc) => !isBefore(toDate(doc.created_at), reviewStart));
  const financeOverview = buildFinanceOverview(financeProfile || { statements: [], transactions: [], rules: [], overrides: {} });

  return {
    remindersDue: reminders.length,
    remindersDone: completedReminders.length,
    fitnessCheckIns: recentFitness.length,
    healthEvents: recentHealthTimeline.length,
    documentsAdded: recentDocuments.length,
    financeOverview,
  };
};

export const formatFriendlyDateTime = (value) => {
  const parsed = toDate(value);
  if (!parsed) return 'Not scheduled';
  return format(parsed, 'dd MMM • p');
};

export const formatFriendlyDate = (value) => {
  const parsed = toDate(value);
  if (!parsed) return 'No date';
  return format(parsed, 'dd MMM yyyy');
};
