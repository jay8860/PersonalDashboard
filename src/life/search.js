import { formatCurrency } from '../finance/utils/format.js';
import { getRelationMeta } from './relations.js';

const includesQuery = (values, query) => values.some((value) => String(value || '').toLowerCase().includes(query));

const compactDate = (value) => {
  if (!value) return '';
  try {
    return new Date(value).toLocaleDateString(undefined, { day: '2-digit', month: 'short' });
  } catch {
    return '';
  }
};

export const buildGlobalSearchResults = ({
  query,
  dashboard,
  documents,
  financeProfile,
  healthTimeline,
}) => {
  const normalizedQuery = String(query || '').trim().toLowerCase();
  if (!normalizedQuery) return [];

  const results = [];
  const seen = new Set();
  const people = dashboard?.family?.people || [];
  const peopleById = new Map(people.map((person) => [person.id, person]));

  const pushResult = (item) => {
    const key = `${item.tab}:${item.id}`;
    if (seen.has(key)) return;
    seen.add(key);
    results.push(item);
  };

  const profile = dashboard?.profile || {};
  if (includesQuery([
    profile.fullName,
    profile.preferredName,
    profile.headline,
    profile.bio,
    profile.city,
    profile.country,
    profile.email,
    profile.phone,
    profile.occupation,
    profile.goals,
    profile.notes,
  ], normalizedQuery)) {
    pushResult({
      id: 'profile-root',
      tab: 'profile',
      badge: 'About',
      title: profile.preferredName || profile.fullName || 'About Me',
      subtitle: profile.headline || [profile.city, profile.country, profile.occupation].filter(Boolean).join(' • ') || 'Open your profile details',
    });
  }

  people.forEach((person) => {
    const relation = getRelationMeta(person.relationKey, person.relationLabel, person.relationHindi);
    if (!includesQuery([
      person.name,
      relation.label,
      relation.hindi,
      person.location,
      person.note,
      person.email,
      person.phone,
      person.medicalNotes,
    ], normalizedQuery)) {
      return;
    }

    pushResult({
      id: person.id,
      tab: 'family',
      badge: 'Family',
      title: person.name || 'Unnamed family member',
      subtitle: [relation.label, relation.hindi, person.location].filter(Boolean).join(' • '),
      personId: person.id,
    });
  });

  (dashboard?.planner?.reminders || []).forEach((reminder) => {
    if (!includesQuery([reminder.title, reminder.type, reminder.notes], normalizedQuery)) return;
    pushResult({
      id: reminder.id,
      tab: 'planner',
      badge: 'Reminder',
      title: reminder.title || 'Reminder',
      subtitle: [reminder.type, compactDate(reminder.dueAt), reminder.status].filter(Boolean).join(' • '),
    });
  });

  (dashboard?.planner?.medicines || []).forEach((medicine) => {
    const relatedPerson = peopleById.get(medicine.relatedPersonId);
    if (!includesQuery([medicine.name, medicine.dose, medicine.schedule, medicine.times, medicine.purpose, medicine.notes, relatedPerson?.name], normalizedQuery)) return;
    pushResult({
      id: medicine.id,
      tab: 'planner',
      badge: 'Medicine',
      title: medicine.name || 'Medicine',
      subtitle: [medicine.dose, medicine.times, relatedPerson?.name].filter(Boolean).join(' • '),
    });
  });

  (dashboard?.planner?.quickNotes || []).forEach((note) => {
    if (!includesQuery([note.text, note.category], normalizedQuery)) return;
    pushResult({
      id: note.id,
      tab: 'planner',
      badge: 'Note',
      title: note.text.length > 64 ? `${note.text.slice(0, 64)}…` : note.text || 'Quick note',
      subtitle: [note.category, compactDate(note.createdAt)].filter(Boolean).join(' • '),
    });
  });

  (documents || []).forEach((document) => {
    const relatedPerson = peopleById.get(document.family_person_id);
    if (!includesQuery([
      document.title,
      document.category,
      document.note,
      document.original_name,
      ...(document.tags || []),
      relatedPerson?.name,
    ], normalizedQuery)) {
      return;
    }

    pushResult({
      id: String(document.id),
      tab: 'vault',
      badge: 'Vault',
      title: document.title || document.original_name || 'Document',
      subtitle: [document.category, relatedPerson?.name, compactDate(document.reference_date || document.created_at)].filter(Boolean).join(' • '),
    });
  });

  (financeProfile?.transactions || []).slice(0, 600).forEach((transaction) => {
    if (!includesQuery([
      transaction.merchant,
      transaction.narration,
      transaction.refNo,
      transaction.category,
      transaction.bucketGroup,
      ...(transaction.tags || []),
      transaction.note,
    ], normalizedQuery)) {
      return;
    }

    const title = transaction.merchant || transaction.narration || 'Transaction';
    const amount = formatCurrency(transaction.amount || 0);
    pushResult({
      id: transaction.uniqueKey || `${transaction.date}-${title}-${transaction.amount}`,
      tab: 'finance',
      badge: 'Finance',
      title,
      subtitle: [amount, compactDate(transaction.date), transaction.category || transaction.bucketGroup].filter(Boolean).join(' • '),
    });
  });

  (healthTimeline || []).forEach((item) => {
    if (!includesQuery([item.kind, item.title, item.description], normalizedQuery)) return;
    pushResult({
      id: item.id,
      tab: 'health',
      badge: 'Health',
      title: item.title || item.kind || 'Health item',
      subtitle: [item.kind, compactDate(item.date), item.description].filter(Boolean).join(' • '),
    });
  });

  return results.slice(0, 24);
};
