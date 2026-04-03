import { useMemo, useState } from 'react';
import { Bot, CalendarDays, CheckCircle2, ClipboardCopy, MessageCircle, RefreshCcw, UtensilsCrossed } from 'lucide-react';
import { formatFriendlyDate } from '../dashboardData.js';
import {
  formatMealPlanForSharing,
  getMealCompletionSummary,
  getUpcomingMealPlan,
  mealSlotDefinitions,
} from '../meals.js';

const parseLines = (value) => String(value || '')
  .split(/\r?\n/)
  .map((item) => item.trim())
  .filter(Boolean);

const MealRuleEditor = ({ slot, rule, onUpdateRule }) => (
  <section className="life-panel">
    <div className="flex items-start gap-3">
      <div className="rounded-2xl bg-emerald-500/12 p-3 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200">
        <UtensilsCrossed size={18} />
      </div>
      <div>
        <p className="life-card-label">{slot.label}</p>
        <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-900 dark:text-white">
          Lock the staples, then leave smart room for variation.
        </h2>
      </div>
    </div>

    <div className="mt-6 grid gap-4 xl:grid-cols-2">
      <label className="space-y-2">
        <span className="life-card-label">Mandatory items</span>
        <textarea
          rows={5}
          value={rule.fixedItems.join('\n')}
          onChange={(event) => onUpdateRule(slot.id, { fixedItems: parseLines(event.target.value) })}
          placeholder="3 eggs&#10;Sprouts&#10;Orange"
          className="life-textarea"
        />
      </label>

      <label className="space-y-2">
        <span className="life-card-label">Flexible items</span>
        <textarea
          rows={5}
          value={rule.flexibleItems.join('\n')}
          onChange={(event) => onUpdateRule(slot.id, { flexibleItems: parseLines(event.target.value) })}
          placeholder="Greek yogurt&#10;Paneer bhurji&#10;Roasted chana"
          className="life-textarea"
        />
      </label>

      <label className="space-y-2 xl:col-span-2">
        <span className="life-card-label">Example meals</span>
        <textarea
          rows={4}
          value={rule.exampleMeals.join('\n')}
          onChange={(event) => onUpdateRule(slot.id, { exampleMeals: parseLines(event.target.value) })}
          placeholder="Whey shake + 3-egg bhurji + cucumber salad&#10;2 chapatis + rajma + curd"
          className="life-textarea"
        />
      </label>

      <label className="space-y-2 xl:col-span-2">
        <span className="life-card-label">Rule note</span>
        <input
          value={rule.note}
          onChange={(event) => onUpdateRule(slot.id, { note: event.target.value })}
          placeholder="Keep lunch lower-carb and high-protein."
          className="life-input"
        />
      </label>
    </div>
  </section>
);

const MealsView = ({
  meals,
  onUpdateMeals,
  onUpdateMealRule,
  onGeneratePlans,
  onGenerateAiPlans,
  onToggleMealCompleted,
  onClearGeneratedPlans,
}) => {
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [copiedPlanId, setCopiedPlanId] = useState('');
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [aiError, setAiError] = useState('');
  const upcomingPlan = useMemo(() => getUpcomingMealPlan(meals.generatedPlans), [meals.generatedPlans]);
  const upcomingSummary = getMealCompletionSummary(upcomingPlan);

  const handleCopyPlan = async (plan) => {
    const shareText = formatMealPlanForSharing(plan, meals);
    try {
      await navigator.clipboard.writeText(shareText);
      setCopiedPlanId(plan.id);
      window.setTimeout(() => setCopiedPlanId((current) => (current === plan.id ? '' : current)), 1800);
    } catch {
      setCopiedPlanId('');
    }
  };

  const openWhatsAppDraft = (plan) => {
    const shareText = formatMealPlanForSharing(plan, meals);
    const number = String(meals.whatsappNumber || '').replace(/[^\d]/g, '');
    const url = number
      ? `https://wa.me/${number}?text=${encodeURIComponent(shareText)}`
      : `https://wa.me/?text=${encodeURIComponent(shareText)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleAiGeneration = async () => {
    setIsGeneratingAi(true);
    setAiError('');
    try {
      await onGenerateAiPlans({ startDate, days: meals.planLengthDays });
    } catch (error) {
      setAiError(error.message || 'AI generation failed.');
    } finally {
      setIsGeneratingAi(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="life-panel">
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr),minmax(20rem,0.75fr)]">
          <div>
            <p className="life-card-label">Meal decider</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900 dark:text-white">
              Pre-decide what you will eat so the plan wins before cravings do.
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600 dark:text-white/65">
              Fix what must stay constant, list what can rotate, block foods you do not want, and generate a weekly or monthly meal chart you can copy or send on WhatsApp.
            </p>
          </div>

          <div className="grid gap-3">
            <div className="life-soft-card bg-gradient-to-br from-emerald-100/80 via-white/75 to-teal-100/65 dark:from-emerald-500/12 dark:via-white/8 dark:to-teal-500/8">
              <p className="life-card-label">Next planned day</p>
              <p className="mt-2 text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                {upcomingPlan ? formatFriendlyDate(upcomingPlan.date) : 'No plan generated yet'}
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-white/55">
                {upcomingPlan
                  ? `${upcomingSummary.completed}/${upcomingSummary.total} meals marked done`
                  : 'Generate your first plan and it will show up here.'}
              </p>
            </div>

            <div className="life-soft-card">
              <p className="life-card-label">Plan coverage</p>
              <p className="mt-2 text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                {meals.generatedPlans.length} day{meals.generatedPlans.length === 1 ? '' : 's'}
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-white/55">
                {meals.generatedPlans.length
                  ? 'Reuse or regenerate anytime as your routine changes.'
                  : 'The planner can generate 7, 14, or 30 days at a time.'}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-4 xl:grid-cols-2">
          <label className="space-y-2">
            <span className="life-card-label">Goal</span>
            <input
              value={meals.objective}
              onChange={(event) => onUpdateMeals({ objective: event.target.value })}
              placeholder="Lean muscle with high protein and controlled carbs"
              className="life-input"
            />
          </label>

          <label className="space-y-2">
            <span className="life-card-label">WhatsApp number</span>
            <input
              value={meals.whatsappNumber}
              onChange={(event) => onUpdateMeals({ whatsappNumber: event.target.value })}
              placeholder="9198XXXXXXXX"
              className="life-input"
            />
          </label>

          <label className="space-y-2">
            <span className="life-card-label">Raw materials you usually eat</span>
            <textarea
              rows={5}
              value={meals.pantryItems.join('\n')}
              onChange={(event) => onUpdateMeals({ pantryItems: parseLines(event.target.value) })}
              placeholder="Eggs&#10;Paneer&#10;Soya chunks&#10;Greek yogurt&#10;Cucumber"
              className="life-textarea"
            />
          </label>

          <label className="space-y-2">
            <span className="life-card-label">Do not eat</span>
            <textarea
              rows={5}
              value={meals.excludedItems.join('\n')}
              onChange={(event) => onUpdateMeals({ excludedItems: parseLines(event.target.value) })}
              placeholder="Chips&#10;White bread&#10;Sugary juice"
              className="life-textarea"
            />
          </label>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <div className="flex flex-wrap gap-2">
            {[7, 14, 30].map((days) => {
              const active = Number(meals.planLengthDays) === days;
              return (
                <button
                  key={days}
                  type="button"
                  onClick={() => onUpdateMeals({ planLengthDays: days })}
                  className={active ? 'life-tab life-tab-active whitespace-nowrap' : 'life-tab whitespace-nowrap opacity-70'}
                >
                  {days} days
                </button>
              );
            })}
          </div>

          <label className="flex items-center gap-3">
            <span className="life-card-label whitespace-nowrap">Start date</span>
            <input
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
              className="life-input min-w-[11rem]"
            />
          </label>

          <button type="button" onClick={() => onGeneratePlans({ startDate, days: meals.planLengthDays })} className="life-primary-button">
            <CalendarDays size={16} />
            Generate plan
          </button>

          <button type="button" onClick={() => onGeneratePlans({ startDate, days: meals.planLengthDays })} className="life-secondary-button">
            <RefreshCcw size={16} />
            Regenerate
          </button>

          <button
            type="button"
            onClick={handleAiGeneration}
            disabled={isGeneratingAi}
            className="life-primary-button"
          >
            <Bot size={16} />
            {isGeneratingAi ? 'Generating with AI...' : 'Generate with AI'}
          </button>

          {meals.generatedPlans.length ? (
            <button type="button" onClick={onClearGeneratedPlans} className="life-secondary-button">
              Clear current chart
            </button>
          ) : null}
        </div>

        {aiError ? (
          <div className="mt-4 rounded-[1.25rem] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/25 dark:bg-rose-500/10 dark:text-rose-200">
            {aiError}
          </div>
        ) : null}
      </section>

      {meals.aiGuidance?.length ? (
        <section className="life-panel">
          <p className="life-card-label">AI guidance</p>
          <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            Strategy notes behind the suggested meals
          </h2>
          <div className="mt-6 grid gap-3">
            {meals.aiGuidance.map((item) => (
              <div key={item} className="life-soft-card">
                <p className="text-sm leading-6 text-slate-700 dark:text-white/75">{item}</p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <div className="grid gap-6">
        {mealSlotDefinitions.map((slot) => (
          <MealRuleEditor
            key={slot.id}
            slot={slot}
            rule={meals.mealRules[slot.id]}
            onUpdateRule={onUpdateMealRule}
          />
        ))}
      </div>

      <section className="life-panel">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="life-card-label">Generated chart</p>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-900 dark:text-white">
              Copy the day, send it across, and tick meals off as they happen.
            </h2>
          </div>
          <p className="max-w-2xl text-sm leading-6 text-slate-500 dark:text-white/55">
            The planner uses your mandatory items first, then rotates through examples and flexible options while filtering out excluded foods.
          </p>
        </div>

        <div className="mt-6 grid gap-4">
          {meals.generatedPlans.length === 0 ? (
            <div className="life-soft-card">
              <p className="text-sm leading-6 text-slate-600 dark:text-white/65">
                No meal chart yet. Set your rules above, then generate 7, 14, or 30 days.
              </p>
            </div>
          ) : (
            meals.generatedPlans.map((plan) => {
              const summary = getMealCompletionSummary(plan);

              return (
                <div key={plan.id} className="life-soft-card">
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div>
                      <p className="life-card-label">Day plan</p>
                      <h3 className="mt-2 text-xl font-black tracking-tight text-slate-900 dark:text-white">
                        {formatFriendlyDate(plan.date)}
                      </h3>
                      <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-white/55">
                        {summary.completed}/{summary.total} meals completed
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={() => handleCopyPlan(plan)} className="life-secondary-button px-4 py-2">
                        <ClipboardCopy size={16} />
                        {copiedPlanId === plan.id ? 'Copied' : 'Copy day'}
                      </button>
                      <button type="button" onClick={() => openWhatsAppDraft(plan)} className="life-primary-button px-4 py-2">
                        <MessageCircle size={16} />
                        WhatsApp draft
                      </button>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-3 xl:grid-cols-2">
                    {mealSlotDefinitions.map((slot) => {
                      const entry = plan.meals?.[slot.id];
                      return (
                        <div key={slot.id} className="rounded-[1.3rem] border border-white/80 bg-white/70 p-4 dark:border-white/10 dark:bg-white/5">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <p className="life-card-label">{slot.label}</p>
                              <p className="mt-2 text-sm leading-6 text-slate-700 dark:text-white/75">
                                {(entry?.items || []).join(', ') || 'TBD'}
                              </p>
                              {entry?.portion ? (
                                <p className="mt-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-white/45">
                                  Portion: {entry.portion}
                                </p>
                              ) : null}
                              {entry?.note ? (
                                <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-white/45">{entry.note}</p>
                              ) : null}
                              {entry?.prepNote ? (
                                <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-white/45">Prep: {entry.prepNote}</p>
                              ) : null}
                            </div>

                            <button
                              type="button"
                              onClick={() => onToggleMealCompleted(plan.id, slot.id)}
                              className={entry?.completed ? 'life-primary-button px-3 py-2' : 'life-secondary-button px-3 py-2'}
                            >
                              <CheckCircle2 size={15} />
                              {entry?.completed ? 'Done' : 'Mark done'}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
};

export default MealsView;
