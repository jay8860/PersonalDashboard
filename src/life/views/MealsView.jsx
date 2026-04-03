import { useMemo, useState } from 'react';
import { mealDatabaseStats } from '../mealDatabase.js';
import {
  Bot,
  CalendarDays,
  CheckCircle2,
  ClipboardCopy,
  Droplets,
  MessageCircle,
  RefreshCcw,
  Replace,
  ShoppingBasket,
  Sparkles,
} from 'lucide-react';
import { formatFriendlyDate } from '../dashboardData.js';
import {
  activityLevelOptions,
  fastingModeOptions,
  formatMealPlanForSharing,
  getMealCompletionSummary,
  getRecipeForMeal,
  getUpcomingMealPlan,
  goalPaceOptions,
  goalTypeOptions,
  mealSlotDefinitions,
} from '../meals.js';

const parseLines = (value) => String(value || '')
  .split(/\r?\n/)
  .map((item) => item.trim())
  .filter(Boolean);

const progressPct = (current, target) => {
  if (!target) return 0;
  return Math.max(0, Math.min(100, Math.round((current / target) * 100)));
};

const SummaryPill = ({ label, value }) => (
  <div className="rounded-[1.2rem] border border-white/80 bg-white/75 px-4 py-3 dark:border-white/10 dark:bg-white/6">
    <p className="life-card-label">{label}</p>
    <p className="mt-2 text-lg font-black tracking-tight text-slate-900 dark:text-white">{value}</p>
  </div>
);

const NutritionBar = ({ label, current, target }) => (
  <div className="space-y-2">
    <div className="flex items-center justify-between text-sm">
      <span className="font-semibold text-slate-700 dark:text-white/80">{label}</span>
      <span className="text-slate-500 dark:text-white/45">{current}/{target}</span>
    </div>
    <div className="h-2 rounded-full bg-slate-200 dark:bg-white/10">
      <div className="h-2 rounded-full bg-sky-500" style={{ width: `${progressPct(current, target)}%` }} />
    </div>
  </div>
);

const MealsView = ({
  meals,
  plannerTargets,
  weeklySummary,
  shoppingList,
  goalProgress,
  nutritionProgress,
  onUpdateMeals,
  onGeneratePlans,
  onGenerateAiPlans,
  onToggleMealCompleted,
  onSwapMeal,
  onClearGeneratedPlans,
}) => {
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [copiedPlanId, setCopiedPlanId] = useState('');
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [aiError, setAiError] = useState('');
  const [recipeEntry, setRecipeEntry] = useState(null);
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

  const plannerProfile = meals.plannerProfile || {};
  const hydrationLiters = ((plannerTargets?.hydrationMl || 0) / 1000).toFixed(1);

  return (
    <div className="space-y-6">
      <section className="life-panel">
        <div className="grid gap-6 xl:grid-cols-[1.1fr,0.9fr]">
          <div>
            <p className="life-card-label">Intelligent meal planner</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900 dark:text-white">
              Build a calorie-aware Indian meal chart around your ingredients, body stats, and goal.
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600 dark:text-white/65">
              This planner now uses maintenance calories, goal calories, macro targets, fasting mode, ingredient filtering, and meal-slot calorie distribution before it generates breakfast, lunch, dinner, and two snacks.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <SummaryPill label="Maintenance" value={`${plannerTargets?.maintenanceCalories || 0} kcal`} />
            <SummaryPill label="Goal Calories" value={`${plannerTargets?.goalCalories || 0} kcal`} />
            <SummaryPill label="Protein Target" value={`${plannerTargets?.macros?.proteinGrams || 0} g`} />
            <SummaryPill label="Hydration" value={`${hydrationLiters} L / day`} />
          </div>
        </div>

        {plannerTargets?.safetyWarning ? (
          <div className="mt-4 rounded-[1.25rem] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-200">
            {plannerTargets.safetyWarning}
          </div>
        ) : null}
        {plannerTargets?.proteinNote ? (
          <div className="mt-3 rounded-[1.25rem] border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-800 dark:border-sky-500/25 dark:bg-sky-500/10 dark:text-sky-200">
            {plannerTargets.proteinNote}
          </div>
        ) : null}

        <div className="mt-6 grid gap-4 xl:grid-cols-3">
          <label className="space-y-2">
            <span className="life-card-label">Height (cm)</span>
            <input
              value={plannerProfile.heightCm || ''}
              onChange={(event) => onUpdateMeals({ plannerProfile: { ...plannerProfile, heightCm: event.target.value } })}
              className="life-input"
            />
          </label>
          <label className="space-y-2">
            <span className="life-card-label">Weight (kg)</span>
            <input
              value={plannerProfile.weightKg || ''}
              onChange={(event) => onUpdateMeals({ plannerProfile: { ...plannerProfile, weightKg: event.target.value } })}
              className="life-input"
            />
          </label>
          <label className="space-y-2">
            <span className="life-card-label">Age</span>
            <input
              value={plannerProfile.age || ''}
              onChange={(event) => onUpdateMeals({ plannerProfile: { ...plannerProfile, age: event.target.value } })}
              className="life-input"
            />
          </label>
          <label className="space-y-2">
            <span className="life-card-label">Gender</span>
            <select
              value={plannerProfile.gender || 'male'}
              onChange={(event) => onUpdateMeals({ plannerProfile: { ...plannerProfile, gender: event.target.value } })}
              className="life-input"
            >
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </label>
          <label className="space-y-2">
            <span className="life-card-label">Activity Level</span>
            <select
              value={plannerProfile.activityLevel || 'moderately-active'}
              onChange={(event) => onUpdateMeals({ plannerProfile: { ...plannerProfile, activityLevel: event.target.value } })}
              className="life-input"
            >
              {activityLevelOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
            </select>
          </label>
          <label className="space-y-2">
            <span className="life-card-label">Body Goal</span>
            <select
              value={plannerProfile.goalType || 'muscle-gain'}
              onChange={(event) => onUpdateMeals({ plannerProfile: { ...plannerProfile, goalType: event.target.value } })}
              className="life-input"
            >
              {goalTypeOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
            </select>
          </label>
          <label className="space-y-2">
            <span className="life-card-label">Goal Pace</span>
            <select
              value={plannerProfile.goalPace || 'moderate'}
              onChange={(event) => onUpdateMeals({ plannerProfile: { ...plannerProfile, goalPace: event.target.value } })}
              className="life-input"
            >
              {goalPaceOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
            </select>
          </label>
          <label className="space-y-2">
            <span className="life-card-label">Fasting Mode</span>
            <select
              value={plannerProfile.fastingMode || 'standard'}
              onChange={(event) => onUpdateMeals({ plannerProfile: { ...plannerProfile, fastingMode: event.target.value } })}
              className="life-input"
            >
              {fastingModeOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
            </select>
          </label>
          <label className="space-y-2">
            <span className="life-card-label">WhatsApp number</span>
            <input
              value={meals.whatsappNumber}
              onChange={(event) => onUpdateMeals({ whatsappNumber: event.target.value })}
              className="life-input"
            />
          </label>
        </div>

        <div className="mt-6 grid gap-4 xl:grid-cols-2">
          <label className="space-y-2">
            <span className="life-card-label">Available raw ingredients</span>
            <textarea
              rows={6}
              value={meals.pantryItems.join('\n')}
              onChange={(event) => onUpdateMeals({ pantryItems: parseLines(event.target.value) })}
              placeholder="Rice&#10;Atta&#10;Paneer&#10;Eggs&#10;Curd&#10;Moong dal"
              className="life-textarea"
            />
          </label>
          <label className="space-y-2">
            <span className="life-card-label">Strictly avoid</span>
            <textarea
              rows={6}
              value={meals.excludedItems.join('\n')}
              onChange={(event) => onUpdateMeals({ excludedItems: parseLines(event.target.value) })}
              placeholder="Sugar&#10;Deep fried foods&#10;Gluten"
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
          <button type="button" onClick={handleAiGeneration} disabled={isGeneratingAi} className="life-primary-button">
            <Bot size={16} />
            {isGeneratingAi ? 'Generating with AI...' : 'Generate with AI'}
          </button>
          {meals.generatedPlans.length ? (
            <button type="button" onClick={onClearGeneratedPlans} className="life-secondary-button">
              Clear chart
            </button>
          ) : null}
        </div>

        {aiError ? (
          <div className="mt-4 rounded-[1.25rem] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/25 dark:bg-rose-500/10 dark:text-rose-200">
            {aiError}
          </div>
        ) : null}

        <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <SummaryPill label="Meal Library" value={`${mealDatabaseStats.total} dishes`} />
          <SummaryPill label="Breakfasts" value={String(mealDatabaseStats.breakfast)} />
          <SummaryPill label="Lunches" value={String(mealDatabaseStats.lunch)} />
          <SummaryPill label="Dinners" value={String(mealDatabaseStats.dinner)} />
          <SummaryPill label="Snack Options" value={String(mealDatabaseStats.snacks)} />
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <div className="life-panel">
          <div className="flex items-start gap-3">
            <div className="rounded-2xl bg-sky-500/12 p-3 text-sky-700 dark:bg-sky-500/20 dark:text-sky-200">
              <Sparkles size={18} />
            </div>
            <div>
              <p className="life-card-label">Macro Progress</p>
              <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                Nutrition progress fills up as you mark meals done.
              </h2>
            </div>
          </div>
          <div className="mt-6 grid gap-4">
            <NutritionBar label="Calories" current={nutritionProgress?.calories?.current || 0} target={nutritionProgress?.calories?.target || 0} />
            <NutritionBar label="Protein (g)" current={nutritionProgress?.protein?.current || 0} target={nutritionProgress?.protein?.target || 0} />
            <NutritionBar label="Carbs (g)" current={nutritionProgress?.carbs?.current || 0} target={nutritionProgress?.carbs?.target || 0} />
            <NutritionBar label="Fat (g)" current={nutritionProgress?.fat?.current || 0} target={nutritionProgress?.fat?.target || 0} />
          </div>
        </div>

        <div className="life-panel">
          <div className="flex items-start gap-3">
            <div className="rounded-2xl bg-cyan-500/12 p-3 text-cyan-700 dark:bg-cyan-500/20 dark:text-cyan-200">
              <Droplets size={18} />
            </div>
            <div>
              <p className="life-card-label">Hydration & Adherence</p>
              <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                Water and goal adherence should stay visible next to food.
              </h2>
            </div>
          </div>
          <div className="mt-6 grid gap-3">
            <div className="life-soft-card">
              <p className="life-card-label">Water target</p>
              <p className="mt-2 text-2xl font-black tracking-tight text-slate-900 dark:text-white">{hydrationLiters} L</p>
              <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-white/55">
                Based on body weight × 30–35 ml.
              </p>
            </div>
            <div className="life-soft-card">
              <p className="life-card-label">Goal progress</p>
              <div className="mt-3 grid gap-2">
                {goalProgress?.slice(0, 7).map((item) => (
                  <div key={item.date} className="grid grid-cols-[6rem,1fr,4rem] items-center gap-3 text-sm">
                    <span className="text-slate-500 dark:text-white/45">{formatFriendlyDate(item.date)}</span>
                    <div className="h-2 rounded-full bg-slate-200 dark:bg-white/10">
                      <div
                        className={Math.abs(item.delta) <= 75 ? 'h-2 rounded-full bg-emerald-500' : item.delta > 0 ? 'h-2 rounded-full bg-amber-500' : 'h-2 rounded-full bg-sky-500'}
                        style={{ width: `${Math.max(8, Math.min(100, Math.round((item.actualCalories / Math.max(1, item.goalCalories)) * 100)))}%` }}
                      />
                    </div>
                    <span className="text-right text-slate-500 dark:text-white/45">{item.delta > 0 ? `+${item.delta}` : item.delta}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {meals.aiGuidance?.length ? (
        <section className="life-panel">
          <p className="life-card-label">AI guidance</p>
          <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            Strategy notes generated around your calorie and ingredient setup.
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

      <section className="life-panel">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="life-card-label">Weekly view</p>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-900 dark:text-white">
              See the week at a glance before you hand it to your household.
            </h2>
          </div>
          <p className="max-w-2xl text-sm leading-6 text-slate-500 dark:text-white/55">
            Average weekly calories are computed from the first seven planned days.
          </p>
        </div>
        <div className="mt-6 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-white/10">
                <th className="pb-3 pr-4">Day</th>
                <th className="pb-3 pr-4">Breakfast</th>
                <th className="pb-3 pr-4">Lunch</th>
                <th className="pb-3 pr-4">Dinner</th>
                <th className="pb-3 pr-0 text-right">Total kcal</th>
              </tr>
            </thead>
            <tbody>
              {weeklySummary?.rows?.map((row) => (
                <tr key={row.date} className="border-b border-slate-100 dark:border-white/5">
                  <td className="py-3 pr-4">{formatFriendlyDate(row.date)}</td>
                  <td className="py-3 pr-4">{row.breakfast}</td>
                  <td className="py-3 pr-4">{row.lunch}</td>
                  <td className="py-3 pr-4">{row.dinner}</td>
                  <td className="py-3 pr-0 text-right">{row.totalCalories}</td>
                </tr>
              ))}
              <tr>
                <td className="pt-4 font-bold">Avg</td>
                <td className="pt-4" />
                <td className="pt-4" />
                <td className="pt-4" />
                <td className="pt-4 text-right font-bold">{weeklySummary?.averageCalories || 0}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="life-panel">
        <div className="flex items-start gap-3">
          <div className="rounded-2xl bg-amber-500/12 p-3 text-amber-700 dark:bg-amber-500/20 dark:text-amber-200">
            <ShoppingBasket size={18} />
          </div>
          <div>
            <p className="life-card-label">Shopping list</p>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-900 dark:text-white">
              Approximate ingredient list for the week.
            </h2>
          </div>
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {shoppingList?.length ? shoppingList.map((item) => (
            <div key={item.name} className="life-soft-card">
              <p className="text-base font-bold capitalize text-slate-900 dark:text-white">{item.name}</p>
              <p className="mt-2 text-sm text-slate-500 dark:text-white/55">{item.quantity} {item.unit}</p>
            </div>
          )) : (
            <div className="life-soft-card">
              <p className="text-sm leading-6 text-slate-600 dark:text-white/65">Generate at least one week to see a shopping list.</p>
            </div>
          )}
        </div>
      </section>

      <section className="life-panel">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="life-card-label">Generated chart</p>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-900 dark:text-white">
              Daily plans with calories, macros, swaps, and recipe details.
            </h2>
          </div>
          <p className="max-w-2xl text-sm leading-6 text-slate-500 dark:text-white/55">
            Each meal is matched against your available ingredients, exclusions, and goal calories. Swaps stay within a similar calorie band.
          </p>
        </div>

        <div className="mt-6 grid gap-4">
          {meals.generatedPlans.length === 0 ? (
            <div className="life-soft-card">
              <p className="text-sm leading-6 text-slate-600 dark:text-white/65">
                No meal chart yet. Add your profile, ingredients, and rules, then generate 7, 14, or 30 days.
              </p>
            </div>
          ) : (
            meals.generatedPlans.map((plan) => {
              const summary = getMealCompletionSummary(plan);
              const delta = Number(plan.summary?.deltaVsGoal || 0);

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

                  <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                    <SummaryPill label="Maintenance" value={`${plan.summary?.maintenanceCalories || 0} kcal`} />
                    <SummaryPill label="Goal" value={`${plan.summary?.goalCalories || 0} kcal`} />
                    <SummaryPill label="Protein" value={`${plan.summary?.proteinTarget || 0} g`} />
                    <SummaryPill label="Carbs" value={`${plan.summary?.carbsTarget || 0} g`} />
                    <SummaryPill label="Fat" value={`${plan.summary?.fatTarget || 0} g`} />
                  </div>

                  <div className="mt-5 grid gap-3 xl:grid-cols-2">
                    {mealSlotDefinitions.map((slot) => {
                      const entry = plan.meals?.[slot.id];
                      const recipe = getRecipeForMeal(entry);

                      return (
                        <div key={slot.id} className="rounded-[1.3rem] border border-white/80 bg-white/70 p-4 dark:border-white/10 dark:bg-white/5">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <p className="life-card-label">{slot.label}</p>
                              <p className="mt-2 text-lg font-bold text-slate-900 dark:text-white">{entry?.dishName || 'TBD'}</p>
                              <p className="mt-2 text-sm leading-6 text-slate-700 dark:text-white/75">{entry?.description || ''}</p>
                              <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-white/60">
                                Ingredients used: {(entry?.items || []).join(', ') || '—'}
                              </p>
                              <p className="mt-2 text-sm font-semibold text-slate-700 dark:text-white/80">Portion: {entry?.portion || '—'}</p>
                              <p className="mt-2 text-sm text-slate-500 dark:text-white/55">
                                Calories: {entry?.calories || 0} kcal | Protein: {entry?.protein || 0} g | Carbs: {entry?.carbs || 0} g | Fat: {entry?.fat || 0} g
                              </p>
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

                          <div className="mt-4 flex flex-wrap gap-2">
                            <button type="button" onClick={() => onSwapMeal(plan.id, slot.id)} className="life-secondary-button px-3 py-2">
                              <Replace size={15} />
                              Swap meal
                            </button>
                            {recipe ? (
                              <button type="button" onClick={() => setRecipeEntry(recipe)} className="life-secondary-button px-3 py-2">
                                <Sparkles size={15} />
                                Recipe
                              </button>
                            ) : null}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-5 overflow-x-auto">
                    <table className="min-w-full text-left text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-white/10">
                          <th className="pb-3 pr-4">Meal</th>
                          <th className="pb-3 pr-4">Calories</th>
                        </tr>
                      </thead>
                      <tbody>
                        {mealSlotDefinitions.map((slot) => (
                          <tr key={slot.id} className="border-b border-slate-100 dark:border-white/5">
                            <td className="py-2 pr-4">{slot.label}</td>
                            <td className="py-2 pr-4">{plan.meals?.[slot.id]?.calories || 0}</td>
                          </tr>
                        ))}
                        <tr>
                          <td className="pt-3 pr-4 font-bold">TOTAL</td>
                          <td className="pt-3 pr-4 font-bold">{plan.summary?.dailyCalories || 0}</td>
                        </tr>
                        <tr>
                          <td className="pt-2 pr-4 text-slate-500 dark:text-white/45">vs Goal</td>
                          <td className="pt-2 pr-4 text-slate-500 dark:text-white/45">
                            {Math.abs(delta) <= 75 ? 'On target' : delta > 0 ? `+${delta} over` : `${Math.abs(delta)} under`}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      {recipeEntry ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4">
          <div className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-[2rem] bg-white p-6 shadow-2xl dark:bg-[#07111f]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="life-card-label">Recipe</p>
                <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-900 dark:text-white">{recipeEntry.title}</h2>
                <p className="mt-2 text-sm text-slate-500 dark:text-white/55">Cook time: {recipeEntry.cookTime || 'Quick prep'}</p>
              </div>
              <button type="button" onClick={() => setRecipeEntry(null)} className="life-secondary-button">Close</button>
            </div>
            <div className="mt-6 grid gap-3">
              {recipeEntry.steps.map((step) => (
                <div key={step} className="life-soft-card">
                  <p className="text-sm leading-6 text-slate-700 dark:text-white/75">{step}</p>
                </div>
              ))}
            </div>
            {recipeEntry.tips ? (
              <div className="mt-4 rounded-[1.25rem] border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-800 dark:border-sky-500/25 dark:bg-sky-500/10 dark:text-sky-200">
                Tip: {recipeEntry.tips}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default MealsView;
