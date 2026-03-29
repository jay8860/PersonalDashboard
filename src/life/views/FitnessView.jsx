import { useState } from 'react';
import { format } from 'date-fns';
import { Activity, BedDouble, ChevronDown, ChevronUp, Droplets, HeartPulse, Scale, TimerReset, Trash2, TrendingUp, Waves, Footprints } from 'lucide-react';
import {
  CartesianGrid,
  ComposedChart,
  Line,
  Bar,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

const createEntryDraft = () => ({
  date: new Date().toISOString().slice(0, 10),
  weightKg: '',
  bodyFatPct: '',
  waistCm: '',
  chestCm: '',
  hipCm: '',
  restingHeartRate: '',
  steps: '',
  sleepHours: '',
  workoutMinutes: '',
  waterLiters: '',
  note: '',
});

const numeric = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const formatMetric = (value, unit) => {
  if (value == null || value === '') return 'Not set';
  return Number(value).toFixed(1) + unit;
};

const computeBmi = (weightKg, heightCm) => {
  const weight = numeric(weightKg);
  const height = numeric(heightCm);
  if (weight == null || height == null || height === 0) return null;
  const meters = height / 100;
  return weight / (meters * meters);
};

const FitnessView = ({ fitness, profile, onAddEntry, onDeleteEntry, onGoalsChange }) => {
  const [entryDraft, setEntryDraft] = useState(createEntryDraft());
  const [showAdvancedFields, setShowAdvancedFields] = useState(false);
  const sortedEntries = [...fitness.entries].sort((left, right) => String(right.date).localeCompare(String(left.date)));
  const timelineData = [...sortedEntries].reverse().map((entry) => ({
    label: entry.date ? format(new Date(entry.date), 'dd MMM') : '',
    weightKg: numeric(entry.weightKg),
    bodyFatPct: numeric(entry.bodyFatPct),
    waistCm: numeric(entry.waistCm),
    sleepHours: numeric(entry.sleepHours),
    steps: numeric(entry.steps),
    workoutMinutes: numeric(entry.workoutMinutes),
    restingHeartRate: numeric(entry.restingHeartRate),
  }));

  const latest = sortedEntries[0];
  const previous = sortedEntries[1];
  const latestWeight = numeric(latest?.weightKg);
  const previousWeight = numeric(previous?.weightKg);
  const weightDelta = latestWeight == null || previousWeight == null ? null : latestWeight - previousWeight;
  const averageSleep = sortedEntries.length
    ? sortedEntries.reduce((sum, entry) => sum + (numeric(entry.sleepHours) || 0), 0) / sortedEntries.length
    : null;
  const averageSteps = sortedEntries.length
    ? Math.round(sortedEntries.reduce((sum, entry) => sum + (numeric(entry.steps) || 0), 0) / sortedEntries.length)
    : null;
  const averageWorkout = sortedEntries.length
    ? Math.round(sortedEntries.reduce((sum, entry) => sum + (numeric(entry.workoutMinutes) || 0), 0) / sortedEntries.length)
    : null;
  const latestBmi = computeBmi(latest?.weightKg, profile.heightCm);

  const insights = [];

  if (sortedEntries.length < 3) {
    insights.push('Add at least 3 check-ins to unlock clearer weekly trend signals.');
  }

  const targetWeight = numeric(fitness.goals.targetWeightKg);
  if (latestWeight == null || targetWeight == null) {
  } else {
    const gap = latestWeight - targetWeight;
    if (Math.abs(gap) < 0.5) insights.push('You are very close to your target weight. Keep the current rhythm steady.');
    else if (gap > 0) insights.push('Current weight is ' + gap.toFixed(1) + ' kg above the target. A consistent sleep and workout streak will matter more than single-day swings.');
    else insights.push('Current weight is ' + Math.abs(gap).toFixed(1) + ' kg below the target. Double-check whether this is intentional and healthy for you.');
  }

  const sleepTarget = numeric(fitness.goals.sleepTarget);
  if (averageSleep == null || sleepTarget == null) {
  } else if (averageSleep < sleepTarget) {
    insights.push('Average sleep is ' + averageSleep.toFixed(1) + ' hours, below your ' + fitness.goals.sleepTarget + '-hour target.');
  }

  const stepTarget = numeric(fitness.goals.stepTarget);
  if (averageSteps == null || stepTarget == null) {
  } else if (averageSteps >= stepTarget) {
    insights.push('Your average steps are meeting or beating the current daily target.');
  }

  const workoutTarget = numeric(fitness.goals.weeklyWorkoutMinutes);
  if (averageWorkout == null || workoutTarget == null) {
  } else {
    const projectedWeekly = averageWorkout * 7;
    if (projectedWeekly >= workoutTarget) {
      insights.push('At the current pace, you are on track for roughly ' + String(projectedWeekly) + ' workout minutes per week.');
    }
  }

  const handleSubmit = (event) => {
    event.preventDefault();
    if (entryDraft.date === '') return;
    onAddEntry(entryDraft);
    setEntryDraft(createEntryDraft());
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[0.92fr,1.08fr]">
        <section className="life-panel">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-start gap-3">
              <div className="rounded-2xl bg-sky-500/12 p-3 text-sky-700 dark:bg-sky-500/20 dark:text-sky-200">
                <Scale size={18} />
              </div>
              <div>
                <p className="life-card-label">Add a check-in</p>
                <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                  Core vitals first, advanced measurements only when you need them
                </h2>
              </div>
            </div>

            <button type="button" onClick={() => setShowAdvancedFields((current) => !current)} className="life-secondary-button">
              {showAdvancedFields ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              {showAdvancedFields ? 'Hide advanced' : 'Show advanced'}
            </button>
          </div>
          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            <div className="grid gap-4 md:grid-cols-2">
              {[
                ['Date', 'date', 'date'],
                ['Weight (kg)', 'weightKg', 'number'],
                ['Waist (cm)', 'waistCm', 'number'],
                ['Steps', 'steps', 'number'],
                ['Sleep (hours)', 'sleepHours', 'number'],
                ['Workout Minutes', 'workoutMinutes', 'number'],
                ['Resting HR', 'restingHeartRate', 'number'],
              ].map(([label, key, type]) => (
                <label key={key} className="space-y-2">
                  <span className="life-card-label">{label}</span>
                  <input
                    type={type}
                    value={entryDraft[key]}
                    onChange={(event) => setEntryDraft((current) => ({ ...current, [key]: event.target.value }))}
                    className="life-input"
                  />
                </label>
              ))}
            </div>
            {showAdvancedFields ? (
              <div className="grid gap-4 rounded-[1.5rem] border border-white/80 bg-white/55 p-4 backdrop-blur dark:border-white/10 dark:bg-white/6 md:grid-cols-2">
                {[
                  ['Body Fat (%)', 'bodyFatPct', 'number'],
                  ['Chest (cm)', 'chestCm', 'number'],
                  ['Hip (cm)', 'hipCm', 'number'],
                  ['Water (liters)', 'waterLiters', 'number'],
                ].map(([label, key, type]) => (
                  <label key={key} className="space-y-2">
                    <span className="life-card-label">{label}</span>
                    <input
                      type={type}
                      value={entryDraft[key]}
                      onChange={(event) => setEntryDraft((current) => ({ ...current, [key]: event.target.value }))}
                      className="life-input"
                    />
                  </label>
                ))}
              </div>
            ) : null}
            <label className="space-y-2">
              <span className="life-card-label">Notes</span>
              <textarea
                value={entryDraft.note}
                onChange={(event) => setEntryDraft((current) => ({ ...current, note: event.target.value }))}
                rows={3}
                placeholder="Workout quality, soreness, food notes, stress, travel, or anything important..."
                className="life-textarea"
              />
            </label>
            <button type="submit" className="life-primary-button w-full justify-center">
              Save check-in
            </button>
          </form>
        </section>

        <section className="life-panel">
          <div className="flex items-start gap-3">
            <div className="rounded-2xl bg-slate-100 p-3 text-slate-700 dark:bg-white/10 dark:text-white">
              <TrendingUp size={18} />
            </div>
            <div>
              <p className="life-card-label">Targets</p>
              <h3 className="mt-2 text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                Keep your current targets visible.
              </h3>
            </div>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {[
              ['Target Weight (kg)', 'targetWeightKg'],
              ['Weekly Workout Minutes', 'weeklyWorkoutMinutes'],
              ['Daily Step Target', 'stepTarget'],
              ['Sleep Target (hours)', 'sleepTarget'],
            ].map(([label, key]) => (
              <label key={key} className="space-y-2">
                <span className="life-card-label">{label}</span>
                <input
                  type="number"
                  value={fitness.goals[key]}
                  onChange={(event) => onGoalsChange(key, event.target.value)}
                  className="life-input"
                />
              </label>
            ))}
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {[
              { title: 'Latest weight', value: formatMetric(latest?.weightKg, ' kg'), help: weightDelta == null ? 'Add more than one entry to see the change.' : (weightDelta > 0 ? '+' : '') + weightDelta.toFixed(1) + ' kg vs previous', icon: Scale },
              { title: 'Latest BMI', value: latestBmi ? latestBmi.toFixed(1) : 'Not set', help: profile.heightCm ? 'Based on height ' + profile.heightCm + ' cm' : 'Add your height in About Me for BMI.', icon: Activity },
              { title: 'Avg sleep', value: averageSleep ? averageSleep.toFixed(1) + ' h' : 'Not set', help: 'Average across your stored check-ins', icon: BedDouble },
              { title: 'Avg steps', value: averageSteps ? averageSteps.toLocaleString() : 'Not set', help: 'Average daily steps from your entries', icon: Footprints },
            ].map((card) => (
              <div key={card.title} className="life-soft-card">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="life-card-label">{card.title}</p>
                    <p className="mt-2 text-2xl font-black tracking-tight text-slate-900 dark:text-white">{card.value}</p>
                    <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-white/55">{card.help}</p>
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

      <div className="grid gap-6 xl:grid-cols-[1.05fr,0.95fr]">
        <section className="life-panel">
          <div>
            <p className="life-card-label">Body trends</p>
            <h3 className="mt-2 text-2xl font-black tracking-tight text-slate-900 dark:text-white">Weight, waist, and body-fat trend</h3>
          </div>
          <div className="mt-6 h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={timelineData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.18)" />
                <XAxis dataKey="label" stroke="rgba(100, 116, 139, 0.6)" />
                <YAxis yAxisId="weight" stroke="rgba(100, 116, 139, 0.6)" />
                <YAxis yAxisId="body" orientation="right" stroke="rgba(100, 116, 139, 0.6)" />
                <Tooltip
                  contentStyle={{
                    background: 'rgba(15, 23, 42, 0.92)',
                    border: '1px solid rgba(148, 163, 184, 0.16)',
                    borderRadius: '18px',
                  }}
                />
                <Line yAxisId="weight" type="monotone" dataKey="weightKg" stroke="#0f766e" strokeWidth={3} dot={{ r: 3 }} />
                <Line yAxisId="body" type="monotone" dataKey="bodyFatPct" stroke="#f97316" strokeWidth={2.5} dot={{ r: 2 }} />
                <Bar yAxisId="body" dataKey="waistCm" fill="rgba(59, 130, 246, 0.28)" radius={[10, 10, 0, 0]} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="life-panel">
          <div>
            <p className="life-card-label">Recovery and activity</p>
            <h3 className="mt-2 text-2xl font-black tracking-tight text-slate-900 dark:text-white">Sleep, steps, and workout load</h3>
          </div>
          <div className="mt-6 h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={timelineData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.18)" />
                <XAxis dataKey="label" stroke="rgba(100, 116, 139, 0.6)" />
                <YAxis yAxisId="activity" stroke="rgba(100, 116, 139, 0.6)" />
                <YAxis yAxisId="sleep" orientation="right" stroke="rgba(100, 116, 139, 0.6)" />
                <Tooltip
                  contentStyle={{
                    background: 'rgba(15, 23, 42, 0.92)',
                    border: '1px solid rgba(148, 163, 184, 0.16)',
                    borderRadius: '18px',
                  }}
                />
                <Bar yAxisId="activity" dataKey="steps" fill="rgba(6, 182, 212, 0.35)" radius={[10, 10, 0, 0]} />
                <Line yAxisId="sleep" type="monotone" dataKey="sleepHours" stroke="#f59e0b" strokeWidth={2.5} dot={{ r: 2 }} />
                <Line yAxisId="activity" type="monotone" dataKey="workoutMinutes" stroke="#7c3aed" strokeWidth={2.5} dot={{ r: 2 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.95fr,1.05fr]">
        <section className="life-panel">
          <p className="life-card-label">Insights</p>
          <h3 className="mt-2 text-2xl font-black tracking-tight text-slate-900 dark:text-white">Quick read of your current trajectory</h3>
          <div className="mt-6 grid gap-4">
            {insights.length === 0 ? (
              <div className="life-soft-card">
                <p className="text-sm leading-6 text-slate-500 dark:text-white/55">
                  Add a few more entries or set your targets to generate specific observations here.
                </p>
              </div>
            ) : (
              insights.map((insight) => (
                <div key={insight} className="life-soft-card">
                  <p className="text-sm leading-6 text-slate-700 dark:text-white/70">{insight}</p>
                </div>
              ))
            )}
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {[
              { title: 'Resting HR', value: formatMetric(latest?.restingHeartRate, ' bpm'), icon: HeartPulse },
              { title: 'Water', value: formatMetric(latest?.waterLiters, ' L'), icon: Droplets },
              { title: 'Workout minutes', value: latest?.workoutMinutes ? latest.workoutMinutes + ' min' : 'Not set', icon: TimerReset },
              { title: 'Sleep hours', value: latest?.sleepHours ? latest.sleepHours + ' h' : 'Not set', icon: Waves },
            ].map((card) => (
              <div key={card.title} className="life-soft-card">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="life-card-label">{card.title}</p>
                    <p className="mt-2 text-xl font-black text-slate-900 dark:text-white">{card.value}</p>
                  </div>
                  <div className="rounded-2xl bg-slate-100 p-3 text-slate-700 dark:bg-white/10 dark:text-white">
                    <card.icon size={18} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="life-panel">
          <p className="life-card-label">Recent entries</p>
          <h3 className="mt-2 text-2xl font-black tracking-tight text-slate-900 dark:text-white">Your latest measurement history</h3>
          <div className="mt-6 overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Weight</th>
                  <th>Waist</th>
                  <th>Sleep</th>
                  <th>Steps</th>
                  <th>Workout</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {sortedEntries.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="text-center text-slate-500 dark:text-white/50">No fitness data yet.</td>
                  </tr>
                ) : (
                  sortedEntries.map((entry) => (
                    <tr key={entry.id}>
                      <td>{entry.date ? format(new Date(entry.date), 'dd MMM yyyy') : 'No date'}</td>
                      <td>{entry.weightKg ? entry.weightKg + ' kg' : '—'}</td>
                      <td>{entry.waistCm ? entry.waistCm + ' cm' : '—'}</td>
                      <td>{entry.sleepHours ? entry.sleepHours + ' h' : '—'}</td>
                      <td>{entry.steps || '—'}</td>
                      <td>{entry.workoutMinutes ? entry.workoutMinutes + ' min' : '—'}</td>
                      <td className="text-right">
                        <button
                          type="button"
                          onClick={() => onDeleteEntry(entry.id)}
                          className="rounded-xl p-2 text-rose-500 transition hover:bg-rose-50 dark:hover:bg-rose-500/10"
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
};

export default FitnessView;
