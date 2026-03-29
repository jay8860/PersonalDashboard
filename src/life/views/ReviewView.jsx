import { Activity, ArrowRight, BadgeIndianRupee, BellRing, FileArchive, HeartPulse, Network } from 'lucide-react';
import { formatCurrency } from '../../finance/utils/format.js';
import { formatFriendlyDate, formatFriendlyDateTime } from '../dashboardData.js';

const ReviewView = ({
  dashboardMode,
  weeklyReview,
  financeOverview,
  healthTimeline,
  documents,
  fitnessEntries,
  upcomingReminders,
  upcomingBirthdays,
  onNavigate,
}) => {
  const reviewNotes = [];

  if ((weeklyReview.remindersDue || 0) > (weeklyReview.remindersDone || 0)) {
    reviewNotes.push('More reminders were opened than closed this week. Clear a few before adding new ones.');
  }
  if ((financeOverview.currentMonthNet || 0) < 0) {
    reviewNotes.push('Current month net cash flow is negative. Review the biggest spends before the month runs away from you.');
  }
  if ((weeklyReview.fitnessCheckIns || 0) === 0) {
    reviewNotes.push('No fitness check-ins were logged this week. Even one quick entry keeps the trend useful.');
  }
  if ((weeklyReview.documentsAdded || 0) === 0) {
    reviewNotes.push('No new documents were added this week. That is fine if nothing important changed.');
  }

  if (reviewNotes.length === 0) {
    reviewNotes.push('This week looks steady. Keep the system light and only log things that will help future you.');
  }

  return (
    <div className="space-y-6">
      <section className="life-panel">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <p className="life-kicker">Weekly Review</p>
            <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-900 dark:text-white md:text-4xl">
              One page to understand the week
            </h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-slate-600 dark:text-white/72">
              This is the honest summary: what moved, what needs action, and what can be safely ignored.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={() => onNavigate('planner')} className="life-secondary-button">
              Planner
            </button>
            <button type="button" onClick={() => onNavigate('finance')} className="life-secondary-button">
              Finance
            </button>
            <button type="button" onClick={() => onNavigate('health')} className="life-secondary-button">
              Health
            </button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-5">
        {[
          { title: 'Reminders done', value: weeklyReview.remindersDone, detail: `${weeklyReview.remindersDue} touched this week`, icon: BellRing },
          { title: 'Health events', value: weeklyReview.healthEvents, detail: 'Notes, uploads, or measurements', icon: HeartPulse },
          { title: 'Fitness logs', value: weeklyReview.fitnessCheckIns, detail: 'Manual entries this week', icon: Activity },
          { title: 'Docs added', value: weeklyReview.documentsAdded, detail: 'New files stored in vault', icon: FileArchive },
          { title: 'Current month spend', value: formatCurrency(financeOverview.currentMonthSpend || 0), detail: `Net ${formatCurrency(financeOverview.currentMonthNet || 0)}`, icon: BadgeIndianRupee },
        ].map((card) => (
          <div key={card.title} className="life-panel">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="life-card-label">{card.title}</p>
                <p className="mt-2 text-2xl font-black tracking-tight text-slate-900 dark:text-white">{card.value}</p>
                <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-white/55">{card.detail}</p>
              </div>
              <div className="rounded-2xl bg-slate-100 p-3 text-slate-700 dark:bg-white/10 dark:text-white">
                <card.icon size={18} />
              </div>
            </div>
          </div>
        ))}
      </section>

      <div className="grid gap-6 xl:grid-cols-[0.9fr,1.1fr]">
        <section className="life-panel">
          <p className="life-card-label">Review notes</p>
          <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            What to do next
          </h2>

          <div className="mt-6 grid gap-4">
            {reviewNotes.map((note) => (
              <div key={note} className="life-soft-card">
                <p className="text-sm leading-6 text-slate-700 dark:text-white/70">{note}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 grid gap-4">
            <div className="life-soft-card">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="life-card-label">Top spend category</p>
                  <p className="mt-2 text-lg font-bold text-slate-900 dark:text-white">
                    {financeOverview.topSpendCategory?.label || 'Not enough finance data yet'}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-white/55">
                    {financeOverview.topSpendCategory
                      ? formatCurrency(financeOverview.topSpendCategory.amount || 0)
                      : 'Import statements to make this meaningful'}
                  </p>
                </div>
                <BadgeIndianRupee size={18} className="mt-1 text-slate-400 dark:text-white/45" />
              </div>
            </div>

            <div className="life-soft-card">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="life-card-label">Family upcoming</p>
                  <p className="mt-2 text-lg font-bold text-slate-900 dark:text-white">
                    {upcomingBirthdays[0]?.name || 'No birthdays soon'}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-white/55">
                    {upcomingBirthdays[0] ? formatFriendlyDate(upcomingBirthdays[0].nextBirthday) : 'Add birthdays in the family tree'}
                  </p>
                </div>
                <Network size={18} className="mt-1 text-slate-400 dark:text-white/45" />
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-6">
          <section className="life-panel">
            <p className="life-card-label">Recent health timeline</p>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-900 dark:text-white">
              The week in health events
            </h2>
            <div className="mt-6 grid gap-4">
              {healthTimeline.length === 0 ? (
                <div className="life-soft-card">
                  <p className="text-sm leading-6 text-slate-600 dark:text-white/65">
                    No recent health items in the feed yet.
                  </p>
                </div>
              ) : (
                healthTimeline.slice(0, dashboardMode === 'deep' ? 10 : 6).map((item) => (
                  <div key={item.id} className="life-soft-card">
                    <p className="life-card-label">{item.kind}</p>
                    <p className="mt-2 text-base font-bold text-slate-900 dark:text-white">{item.title}</p>
                    <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-white/55">
                      {[formatFriendlyDate(item.date), item.description].filter(Boolean).join(' • ')}
                    </p>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="life-panel">
            <p className="life-card-label">Coming up</p>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-900 dark:text-white">
              Next reminders, latest docs, and fitness
            </h2>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="life-soft-card">
                <p className="life-card-label">Upcoming reminders</p>
                <div className="mt-4 space-y-3">
                  {upcomingReminders.length === 0 ? (
                    <p className="text-sm leading-6 text-slate-600 dark:text-white/65">No upcoming reminders.</p>
                  ) : (
                    upcomingReminders.slice(0, 4).map((reminder) => (
                      <div key={reminder.id}>
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">{reminder.title}</p>
                        <p className="mt-1 text-xs text-slate-500 dark:text-white/45">{formatFriendlyDateTime(reminder.dueAt)}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="life-soft-card">
                <p className="life-card-label">Latest documents</p>
                <div className="mt-4 space-y-3">
                  {documents.length === 0 ? (
                    <p className="text-sm leading-6 text-slate-600 dark:text-white/65">No documents in vault yet.</p>
                  ) : (
                    documents.slice(0, 4).map((document) => (
                      <div key={document.id}>
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">{document.title}</p>
                        <p className="mt-1 text-xs text-slate-500 dark:text-white/45">{formatFriendlyDate(document.reference_date || document.created_at)}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="mt-4 life-soft-card">
              <p className="life-card-label">Latest fitness entries</p>
              <div className="mt-4 space-y-3">
                {fitnessEntries.length === 0 ? (
                  <p className="text-sm leading-6 text-slate-600 dark:text-white/65">No fitness entries yet.</p>
                ) : (
                  fitnessEntries.slice(0, dashboardMode === 'deep' ? 5 : 3).map((entry) => (
                    <div key={entry.id} className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">
                          {entry.weightKg ? `${entry.weightKg} kg` : 'Check-in'}
                        </p>
                        <p className="mt-1 text-xs text-slate-500 dark:text-white/45">
                          {[formatFriendlyDate(entry.date), entry.sleepHours ? `${entry.sleepHours} h sleep` : '', entry.workoutMinutes ? `${entry.workoutMinutes} min workout` : ''].filter(Boolean).join(' • ')}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <button type="button" onClick={() => onNavigate('planner')} className="mt-6 life-primary-button w-full justify-center">
              Open Planner
              <ArrowRight size={16} />
            </button>
          </section>
        </section>
      </div>
    </div>
  );
};

export default ReviewView;
