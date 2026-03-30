import { motion } from 'framer-motion';
import {
  Activity,
  ArrowRight,
  BadgeIndianRupee,
  CalendarRange,
  FileArchive,
  HeartPulse,
  Network,
  NotebookPen,
  Pill,
  UserRound,
} from 'lucide-react';
import { formatCurrency } from '../../finance/utils/format.js';
import { formatFriendlyDate } from '../dashboardData.js';

const buildWelcomeLine = (profile) => {
  const parts = [profile.city, profile.country, profile.occupation].filter(Boolean);
  return parts.length ? parts.join(' • ') : 'Everything important in one place';
};

const formatWeight = (entry) => {
  if (!entry?.weightKg) return 'No check-in yet';
  return `${entry.weightKg} kg`;
};

const HomeOverview = ({
  dashboardMode,
  profile,
  family,
  planner,
  fitness,
  financeOverview,
  healthTimeline,
  documents,
  upcomingBirthdays,
  weeklyReview,
  hiddenSections = [],
  onNavigate,
  onOpenQuickAdd,
}) => {
  const displayName = profile.preferredName?.trim() || profile.fullName?.trim() || 'Life Atlas';
  const latestFitnessEntry = fitness.entries[0];
  const activeMedicines = (planner.medicines || []).slice(0, 4);
  const medicinesVisible = !hiddenSections.includes('medicines');
  const recentDocuments = (documents || []).slice(0, 4);
  const topHealthItem = healthTimeline[0];

  const headlineCards = [
    medicinesVisible ? {
      title: 'Medicines',
      value: activeMedicines.length ? `${activeMedicines.length} active` : 'None active',
      detail: activeMedicines.length ? `${activeMedicines.filter((medicine) => medicine.takenLog?.includes(new Date().toISOString().slice(0, 10))).length} logged today` : 'Add medicines only if useful',
      icon: Pill,
      action: () => onNavigate('planner'),
      actionLabel: 'Manage medicines',
      panelClass: 'bg-gradient-to-br from-fuchsia-100/80 via-white/70 to-rose-100/65 dark:from-fuchsia-500/12 dark:via-slate-950/70 dark:to-rose-500/10',
      iconClass: 'bg-fuchsia-500/12 text-fuchsia-700 dark:bg-fuchsia-500/20 dark:text-fuchsia-200',
    } : null,
    {
      title: 'This month spend',
      value: formatCurrency(financeOverview.currentMonthSpend || 0),
      detail: `Net flow ${formatCurrency(financeOverview.currentMonthNet || 0)}`,
      icon: BadgeIndianRupee,
      action: () => onNavigate('finance'),
      actionLabel: 'Open finance',
      panelClass: 'bg-gradient-to-br from-emerald-100/80 via-white/70 to-teal-100/65 dark:from-emerald-500/12 dark:via-slate-950/70 dark:to-teal-500/10',
      iconClass: 'bg-emerald-500/12 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200',
    },
    {
      title: 'Latest health signal',
      value: topHealthItem?.title || 'No recent health updates',
      detail: topHealthItem?.date ? formatFriendlyDate(topHealthItem.date) : 'Upload or log something in Health',
      icon: HeartPulse,
      action: () => onNavigate('health'),
      actionLabel: 'Open health',
      panelClass: 'bg-gradient-to-br from-amber-100/85 via-white/70 to-orange-100/65 dark:from-amber-500/12 dark:via-slate-950/70 dark:to-orange-500/10',
      iconClass: 'bg-amber-500/12 text-amber-700 dark:bg-amber-500/20 dark:text-amber-200',
    },
  ].filter(Boolean);

  const priorityShortcuts = [
    {
      title: 'Family tree',
      value: `${family.people.length} people`,
      detail: upcomingBirthdays[0]
        ? `Next birthday: ${upcomingBirthdays[0].name}`
        : 'Keep names and relations fresh',
      icon: Network,
      action: () => onNavigate('family'),
      iconClass: 'bg-sky-500/12 text-sky-700 dark:bg-sky-500/18 dark:text-sky-200',
    },
    {
      title: 'Health',
      value: topHealthItem?.title || 'No fresh update',
      detail: topHealthItem?.date ? formatFriendlyDate(topHealthItem.date) : 'Open your health dashboard',
      icon: HeartPulse,
      action: () => onNavigate('health'),
      iconClass: 'bg-fuchsia-500/12 text-fuchsia-700 dark:bg-fuchsia-500/18 dark:text-fuchsia-200',
    },
    {
      title: 'Finance',
      value: formatCurrency(financeOverview.currentMonthSpend || 0),
      detail: financeOverview.biggestSpend?.merchant || financeOverview.biggestSpend?.narration || 'Open your spending profile',
      icon: BadgeIndianRupee,
      action: () => onNavigate('finance'),
      iconClass: 'bg-emerald-500/12 text-emerald-700 dark:bg-emerald-500/18 dark:text-emerald-200',
    },
    {
      title: 'Vault',
      value: `${documents.length} doc${documents.length === 1 ? '' : 's'}`,
      detail: recentDocuments[0]?.title || 'Store only the documents you actually need',
      icon: FileArchive,
      action: () => onNavigate('vault'),
      iconClass: 'bg-amber-500/12 text-amber-700 dark:bg-amber-500/18 dark:text-amber-200',
    },
  ];

  return (
    <div className="space-y-6">
      <section className="life-panel relative overflow-hidden">
        <div className="absolute inset-y-0 right-[-8%] top-[-12%] w-[18rem] rounded-full bg-sky-200/55 blur-[110px] dark:bg-sky-500/12" />
        <div className="absolute bottom-[-20%] left-[10%] h-48 w-48 rounded-full bg-fuchsia-200/40 blur-[90px] dark:bg-fuchsia-500/10" />
        <div className="relative grid gap-8 xl:grid-cols-[1.1fr,0.9fr] xl:items-start">
          <div className="max-w-3xl space-y-5">
            <span className="life-kicker">Today Home</span>
            <div className="space-y-3">
              <h1 className="max-w-3xl text-4xl font-black tracking-tight text-slate-900 dark:text-white md:text-5xl">
                {displayName}
              </h1>
              <p className="text-sm leading-6 text-slate-500 dark:text-white/60">{buildWelcomeLine(profile)}</p>
              <p className="max-w-2xl text-base leading-8 text-slate-600 dark:text-white/72">
                This view is meant to stay useful. Keep only what helps you decide, remember, or act.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              {onOpenQuickAdd ? (
                <button type="button" onClick={onOpenQuickAdd} className="life-primary-button">
                  Quick Add
                  <ArrowRight size={16} />
                </button>
              ) : null}
              <button type="button" onClick={() => onNavigate('planner')} className="life-secondary-button">
                Planner
              </button>
              <button type="button" onClick={() => onNavigate('vault')} className="life-secondary-button">
                Document Vault
              </button>
            </div>

            <div className="flex flex-wrap gap-3">
              {[
                `${family.people.length} family records`,
                `${documents.length} documents ready`,
                `${healthTimeline.length} health timeline items`,
              ].map((item) => (
                <span key={item} className="tag">{item}</span>
              ))}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-1">
            <div className="rounded-[2rem] border border-white/80 bg-gradient-to-br from-slate-950 via-sky-700 to-violet-600 p-6 text-white shadow-[0_24px_64px_rgba(37,99,235,0.22)]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/55">Weekly pulse</p>
              <p className="mt-4 text-4xl font-black tracking-tight">
                {weeklyReview.healthEvents}
              </p>
              <p className="mt-3 text-sm leading-6 text-white/72">
                health updates captured this week
              </p>
              <div className="mt-6 flex items-center gap-3">
                <div className="rounded-full bg-white/12 px-3 py-1 text-xs font-semibold text-white/75">
                  {weeklyReview.healthEvents} health updates
                </div>
                <div className="rounded-full bg-white/12 px-3 py-1 text-xs font-semibold text-white/75">
                  {weeklyReview.documentsAdded} docs added
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-2">
              <div className="life-soft-card bg-gradient-to-br from-white/88 via-sky-50/70 to-white/72 dark:from-white/12 dark:via-sky-500/8 dark:to-white/6">
                <p className="life-card-label">Latest fitness</p>
                <p className="mt-2 text-3xl font-black tracking-tight text-slate-900 dark:text-white">
                  {formatWeight(latestFitnessEntry)}
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-white/55">
                  {latestFitnessEntry?.date ? formatFriendlyDate(latestFitnessEntry.date) : 'Track once and trends begin here'}
                </p>
              </div>
              <div className="life-soft-card bg-gradient-to-br from-white/88 via-fuchsia-50/70 to-white/72 dark:from-white/12 dark:via-fuchsia-500/8 dark:to-white/6">
                <p className="life-card-label">Mood of the system</p>
                <p className="mt-2 text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                  {activeMedicines.length || recentDocuments.length ? 'Active' : 'Calm'}
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-white/55">
                  {(medicinesVisible && activeMedicines.length) || recentDocuments.length
                    ? 'Your core trackers have live context.'
                    : 'Nothing urgent right now.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-4">
        {headlineCards.map((card, index) => (
          <motion.button
            key={card.title}
            type="button"
            onClick={card.action}
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
            className={`life-panel text-left transition hover:-translate-y-1 hover:shadow-md ${card.panelClass}`}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="life-card-label">{card.title}</p>
                <p className="mt-3 text-2xl font-black tracking-tight text-slate-900 dark:text-white">{card.value}</p>
                <p className="mt-3 text-sm leading-6 text-slate-500 dark:text-white/55">{card.detail}</p>
                <p className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                  {card.actionLabel}
                  <ArrowRight size={14} />
                </p>
              </div>
              <div className={`rounded-2xl p-3 ${card.iconClass}`}>
                <card.icon size={18} />
              </div>
            </div>
          </motion.button>
        ))}
      </section>

      <section className="life-panel">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="life-card-label">Priority shortcuts</p>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-900 dark:text-white">
              Open the four areas you are most likely to need next
            </h2>
          </div>
          <p className="max-w-xl text-sm leading-6 text-slate-500 dark:text-white/55">
            This keeps the portal practical: fewer decisions, faster navigation, and clearer entry points into health, finance, family, and documents.
          </p>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {priorityShortcuts.map((shortcut) => (
            <button
              key={shortcut.title}
              type="button"
              onClick={shortcut.action}
              className="life-soft-card text-left transition hover:-translate-y-1 hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="life-card-label">{shortcut.title}</p>
                  <p className="mt-3 text-xl font-black tracking-tight text-slate-900 dark:text-white">{shortcut.value}</p>
                  <p className="mt-3 text-sm leading-6 text-slate-500 dark:text-white/55">{shortcut.detail}</p>
                </div>
                <div className={`rounded-2xl p-3 ${shortcut.iconClass}`}>
                  <shortcut.icon size={18} />
                </div>
              </div>
            </button>
          ))}
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.15fr,0.85fr]">
        <section className="life-panel">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="life-card-label">Today focus</p>
              <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                What actually needs your attention
              </h2>
            </div>
            <button type="button" onClick={() => onNavigate('review')} className="life-secondary-button px-4 py-2">
              Weekly Review
            </button>
          </div>

          <div className="mt-6 grid gap-4">
            {(!medicinesVisible || activeMedicines.length === 0) && upcomingBirthdays.length === 0 ? (
              <div className="life-soft-card">
                <p className="text-sm leading-6 text-slate-600 dark:text-white/65">
                  No urgent items right now. Keep this space lean and only track what truly helps.
                </p>
              </div>
            ) : null}

            {medicinesVisible && activeMedicines.map((medicine) => (
              <div key={medicine.id} className="life-soft-card">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="life-card-label">Medicine</p>
                    <p className="mt-2 text-lg font-bold text-slate-900 dark:text-white">{medicine.name}</p>
                    <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-white/55">
                      {[medicine.dose, medicine.times, medicine.purpose].filter(Boolean).join(' • ') || 'No extra details yet'}
                    </p>
                  </div>
                  <Pill size={18} className="mt-1 text-slate-400 dark:text-white/45" />
                </div>
              </div>
            ))}

            {upcomingBirthdays.slice(0, 3).map((person) => (
              <div key={person.id} className="life-soft-card">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="life-card-label">Family milestone</p>
                    <p className="mt-2 text-lg font-bold text-slate-900 dark:text-white">{person.name}</p>
                    <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-white/55">
                      Birthday on {formatFriendlyDate(person.nextBirthday)}
                    </p>
                  </div>
                  <Network size={18} className="mt-1 text-slate-400 dark:text-white/45" />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="life-panel">
          <p className="life-card-label">Fast context</p>
          <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            Key signals across your life
          </h2>

          <div className="mt-6 grid gap-4">
            <div className="life-soft-card">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="life-card-label">Family</p>
                  <p className="mt-2 text-lg font-bold text-slate-900 dark:text-white">{family.people.length} people in your tree</p>
                  <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-white/55">
                    {upcomingBirthdays[0]
                      ? `Next birthday: ${upcomingBirthdays[0].name} on ${formatFriendlyDate(upcomingBirthdays[0].nextBirthday)}`
                      : 'Add birthdays to make the family tree more practical.'}
                  </p>
                </div>
                <Network size={18} className="mt-1 text-slate-400 dark:text-white/45" />
              </div>
            </div>

            <div className="life-soft-card">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="life-card-label">Document vault</p>
                  <p className="mt-2 text-lg font-bold text-slate-900 dark:text-white">{documents.length} document{documents.length === 1 ? '' : 's'}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-white/55">
                    {recentDocuments[0]
                      ? `Latest: ${recentDocuments[0].title}`
                      : 'Store only the documents you will actually need later.'}
                  </p>
                </div>
                <FileArchive size={18} className="mt-1 text-slate-400 dark:text-white/45" />
              </div>
            </div>

            <div className="life-soft-card">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="life-card-label">Profile</p>
                  <p className="mt-2 text-lg font-bold text-slate-900 dark:text-white">
                    {profile.headline?.trim() || 'Keep your basics current'}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-white/55">
                    {[profile.email, profile.phone].filter(Boolean).join(' • ') || 'Contact details are still empty'}
                  </p>
                </div>
                <UserRound size={18} className="mt-1 text-slate-400 dark:text-white/45" />
              </div>
            </div>
          </div>
        </section>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.9fr,1.1fr]">
        <section className="life-panel">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="life-card-label">Recent health timeline</p>
              <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                Health events in plain language
              </h2>
            </div>
            <button type="button" onClick={() => onNavigate('health')} className="life-secondary-button px-4 py-2">
              Open Health
            </button>
          </div>

          <div className="mt-6 grid gap-4">
            {healthTimeline.length === 0 ? (
              <div className="life-soft-card">
                <p className="text-sm leading-6 text-slate-600 dark:text-white/65">
                  Upload records or add notes in the health dashboard and the important moments will appear here.
                </p>
              </div>
            ) : (
              healthTimeline.slice(0, dashboardMode === 'deep' ? 8 : 5).map((item) => (
                <div key={item.id} className="life-soft-card">
                  <p className="life-card-label">{item.kind}</p>
                  <p className="mt-2 text-lg font-bold text-slate-900 dark:text-white">{item.title}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-white/55">
                    {[formatFriendlyDate(item.date), item.description].filter(Boolean).join(' • ')}
                  </p>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="life-panel">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="life-card-label">Outcome summary</p>
              <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                Finance, fitness, and review at a glance
              </h2>
            </div>
            <button type="button" onClick={() => onNavigate('finance')} className="life-secondary-button px-4 py-2">
              Open Finance
            </button>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {[
              {
                title: 'Top spend category',
                value: financeOverview.topSpendCategory?.label || 'Not enough data',
                detail: financeOverview.topSpendCategory ? formatCurrency(financeOverview.topSpendCategory.amount || 0) : 'Import statements to surface this',
                icon: BadgeIndianRupee,
              },
              {
                title: 'Largest spend',
                value: financeOverview.biggestSpend?.merchant || financeOverview.biggestSpend?.narration || 'None yet',
                detail: financeOverview.biggestSpend ? `${formatCurrency(financeOverview.biggestSpend.amount || 0)} • ${formatFriendlyDate(financeOverview.biggestSpend.date)}` : 'Your standout transaction will show here',
                icon: CalendarRange,
              },
              {
                title: 'Fitness check-ins',
                value: String(fitness.entries.length),
                detail: latestFitnessEntry?.date ? `Latest on ${formatFriendlyDate(latestFitnessEntry.date)}` : 'Add measurements when they matter',
                icon: Activity,
              },
              {
                title: 'Weekly review',
                value: `${weeklyReview.healthEvents} health events`,
                detail: `${weeklyReview.documentsAdded} new docs • ${weeklyReview.fitnessCheckIns} fitness logs`,
                icon: NotebookPen,
              },
            ].map((card) => (
              <div key={card.title} className="life-soft-card">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="life-card-label">{card.title}</p>
                    <p className="mt-2 text-xl font-black tracking-tight text-slate-900 dark:text-white">{card.value}</p>
                    <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-white/55">{card.detail}</p>
                  </div>
                  <div className="rounded-2xl bg-slate-100 p-3 text-slate-700 dark:bg-white/10 dark:text-white">
                    <card.icon size={18} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

export default HomeOverview;
