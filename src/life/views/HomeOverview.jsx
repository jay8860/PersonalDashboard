import { motion } from 'framer-motion';
import { Activity, ArrowRight, BadgeIndianRupee, Download, Network, UserRound } from 'lucide-react';
import { format } from 'date-fns';

const tabCards = [
  {
    id: 'profile',
    title: 'About Me',
    subtitle: 'Store your personal profile, headline, and life notes in one place.',
    color: 'from-amber-500/25 via-orange-500/15 to-rose-500/10',
  },
  {
    id: 'family',
    title: 'Family Tree',
    subtitle: 'Drag people around, connect them visually, and keep Hindi plus English labels side by side.',
    color: 'from-emerald-500/25 via-teal-500/15 to-sky-500/10',
  },
  {
    id: 'fitness',
    title: 'My Fitness',
    subtitle: 'Track measurements, see trends, and turn check-ins into simple insights.',
    color: 'from-sky-500/25 via-cyan-500/15 to-indigo-500/10',
  },
  {
    id: 'finance',
    title: 'Finance Cockpit',
    subtitle: 'Open the statement dashboard without leaving this project.',
    color: 'from-violet-500/25 via-fuchsia-500/15 to-indigo-500/10',
  },
];

const buildCompletion = (profile) => {
  const fields = [
    profile.fullName,
    profile.headline,
    profile.birthDate,
    profile.city,
    profile.occupation,
    profile.languages,
    profile.bio,
    profile.goals,
  ];
  const completed = fields.filter((value) => String(value || '').trim()).length;
  return Math.round((completed / fields.length) * 100);
};

const formatLastCheckIn = (date) => {
  if (date == null || date === '') return 'No check-in yet';
  return format(new Date(date), 'dd MMM yyyy');
};

const formatWeight = (value) => {
  if (value == null || value === '') return 'Not set';
  return Number(value).toFixed(1) + ' kg';
};

const HomeOverview = ({ profile, family, fitness, financeSummary, onNavigate, onExport }) => {
  const latestEntry = fitness.entries[0];
  const completion = buildCompletion(profile);
  const displayName = profile.preferredName?.trim() || profile.fullName?.trim() || 'Your personal HQ';

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[2rem] border border-white/50 bg-white/80 p-6 shadow-premium backdrop-blur-premium dark:border-white/10 dark:bg-white/5 md:p-8">
        <div className="grid gap-8 xl:grid-cols-[1.1fr,0.9fr]">
          <div className="space-y-5">
            <span className="life-kicker">Life Atlas</span>
            <div className="space-y-3">
              <h1 className="max-w-3xl text-4xl font-black tracking-tight text-slate-900 dark:text-white md:text-5xl">
                One dashboard for you, your family, your fitness, and your money.
              </h1>
              <p className="max-w-2xl text-base leading-7 text-slate-600 dark:text-white/65">
                Build a private personal command center, keep it deployable on Railway, and grow it over time without
                needing a database to get started.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button type="button" onClick={() => onNavigate('profile')} className="life-primary-button">
                Personal Details
                <ArrowRight size={16} />
              </button>
              <button type="button" onClick={() => onNavigate('family')} className="life-secondary-button">
                Family Tree
              </button>
              <button type="button" onClick={onExport} className="life-secondary-button">
                <Download size={16} />
                Export Snapshot
              </button>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="life-soft-card">
                <p className="life-card-label">Profile owner</p>
                <p className="mt-2 text-xl font-black text-slate-900 dark:text-white">{displayName}</p>
                <p className="mt-2 text-sm text-slate-500 dark:text-white/55">
                  {profile.headline?.trim() || 'Add a headline in About Me so this space feels more like you.'}
                </p>
              </div>
              <div className="life-soft-card">
                <p className="life-card-label">Latest fitness check-in</p>
                <p className="mt-2 text-xl font-black text-slate-900 dark:text-white">{formatWeight(latestEntry?.weightKg)}</p>
                <p className="mt-2 text-sm text-slate-500 dark:text-white/55">{formatLastCheckIn(latestEntry?.date)}</p>
              </div>
              <div className="life-soft-card">
                <p className="life-card-label">Finance records</p>
                <p className="mt-2 text-xl font-black text-slate-900 dark:text-white">
                  {financeSummary.statementCount} statement{financeSummary.statementCount === 1 ? '' : 's'}
                </p>
                <p className="mt-2 text-sm text-slate-500 dark:text-white/55">
                  {financeSummary.transactionCount} transactions already available inside the finance tab.
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-1">
            {[
              {
                title: 'Profile Completeness',
                value: String(completion) + '%',
                help: 'Details filled across your bio, goals, and key facts',
                icon: UserRound,
              },
              {
                title: 'Family Members',
                value: family.people.length,
                help: 'People currently placed on your editable family canvas',
                icon: Network,
              },
              {
                title: 'Fitness Entries',
                value: fitness.entries.length,
                help: 'Check-ins stored for charting and progress reviews',
                icon: Activity,
              },
              {
                title: 'Finance Statements',
                value: financeSummary.statementCount,
                help: 'Imported from the built-in bank statement dashboard',
                icon: BadgeIndianRupee,
              },
            ].map((card, index) => (
              <motion.div
                key={card.title}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.06 }}
                className="life-panel"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="life-card-label">{card.title}</p>
                    <p className="mt-2 text-3xl font-black tracking-tight text-slate-900 dark:text-white">{card.value}</p>
                    <p className="mt-3 text-sm leading-6 text-slate-500 dark:text-white/55">{card.help}</p>
                  </div>
                  <div className="rounded-2xl bg-slate-100 p-4 text-slate-700 dark:bg-white/10 dark:text-white">
                    <card.icon size={24} />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-4">
        {tabCards.map((card, index) => (
          <motion.button
            key={card.id}
            type="button"
            onClick={() => onNavigate(card.id)}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            whileHover={{ y: -4 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: index * 0.05 }}
            className="relative overflow-hidden rounded-[2rem] border border-white/50 bg-white/85 p-6 text-left shadow-premium backdrop-blur-premium dark:border-white/10 dark:bg-white/5"
          >
            <div className={['absolute inset-0 bg-gradient-to-br', card.color].join(' ')} />
            <div className="relative z-10">
              <p className="life-card-label text-slate-600 dark:text-white/45">Workspace</p>
              <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-900 dark:text-white">{card.title}</h2>
              <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-white/60">{card.subtitle}</p>
              <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white dark:bg-white dark:text-slate-900">
                Open
                <ArrowRight size={15} />
              </div>
            </div>
          </motion.button>
        ))}
      </section>
    </div>
  );
};

export default HomeOverview;
