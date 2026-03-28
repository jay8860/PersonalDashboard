import { differenceInYears, format } from 'date-fns';
import { BriefcaseBusiness, CalendarDays, Globe2, Languages, Mail, MapPin, Target, UserRound } from 'lucide-react';

const Field = ({ label, value, onChange, type = 'text', placeholder }) => (
  <label className="space-y-2">
    <span className="life-card-label">{label}</span>
    <input
      type={type}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      className="life-input"
    />
  </label>
);

const TextAreaField = ({ label, value, onChange, placeholder }) => (
  <label className="space-y-2">
    <span className="life-card-label">{label}</span>
    <textarea
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      rows={4}
      className="life-textarea"
    />
  </label>
);

const buildAgeLabel = (birthDate) => {
  if (birthDate == null || birthDate === '') return 'Age will appear here';
  return String(differenceInYears(new Date(), new Date(birthDate))) + ' years old';
};

const buildHeaderLine = (profile) => {
  const parts = [profile.city, profile.country, profile.occupation].filter(Boolean);
  return parts.length ? parts.join(' • ') : 'Add your city, country, and role';
};

const ProfileView = ({ profile, onChange }) => {
  const displayName = profile.preferredName?.trim() || profile.fullName?.trim() || 'Your name';

  return (
    <div className="grid gap-6 xl:grid-cols-[0.95fr,1.05fr]">
      <section className="life-panel overflow-hidden">
        <div className="relative overflow-hidden rounded-[1.75rem] bg-slate-950 px-6 py-8 text-white">
          <div className="absolute left-[-5%] top-[-10%] h-44 w-44 rounded-full bg-amber-400/35 blur-3xl" />
          <div className="absolute bottom-[-20%] right-[-5%] h-52 w-52 rounded-full bg-teal-400/25 blur-3xl" />
          <div className="relative z-10">
            <span className="inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white/70">
              About Me
            </span>
            <div className="mt-6 flex items-center gap-5">
              <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-[1.75rem] border border-white/10 bg-white/10">
                {profile.photoUrl?.trim() ? (
                  <img src={profile.photoUrl} alt={displayName} className="h-full w-full object-cover" />
                ) : (
                  <UserRound size={36} className="text-white/75" />
                )}
              </div>
              <div>
                <h1 className="text-3xl font-black tracking-tight">{displayName}</h1>
                <p className="mt-2 text-sm text-white/70">{profile.headline?.trim() || 'Add a short personal headline'}</p>
                <p className="mt-2 text-sm text-white/55">{buildHeaderLine(profile)}</p>
              </div>
            </div>
            <p className="mt-6 max-w-2xl text-sm leading-7 text-white/75">
              {profile.bio?.trim() || 'This card becomes your quick reference summary. Add a short bio, your focus areas, and any details you want handy in one place.'}
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {[
            { label: 'Birthday', value: profile.birthDate ? format(new Date(profile.birthDate), 'dd MMM yyyy') : 'Not added', icon: CalendarDays },
            { label: 'Age', value: buildAgeLabel(profile.birthDate), icon: CalendarDays },
            { label: 'Occupation', value: profile.occupation || 'Not added', icon: BriefcaseBusiness },
            { label: 'Languages', value: profile.languages || 'Not added', icon: Languages },
            { label: 'Base', value: [profile.city, profile.country].filter(Boolean).join(', ') || 'Not added', icon: MapPin },
            { label: 'Reach Me', value: profile.email || profile.phone || 'Not added', icon: Mail },
          ].map((item) => (
            <div key={item.label} className="life-soft-card">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="life-card-label">{item.label}</p>
                  <p className="mt-2 text-base font-semibold text-slate-900 dark:text-white">{item.value}</p>
                </div>
                <div className="rounded-2xl bg-slate-100 p-3 text-slate-700 dark:bg-white/10 dark:text-white">
                  <item.icon size={18} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="life-panel">
        <div className="space-y-6">
          <div>
            <p className="life-card-label">Editable profile</p>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-900 dark:text-white">
              Keep your general details ready for yourself and for the rest of this dashboard.
            </h2>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Full Name" value={profile.fullName} onChange={(value) => onChange('fullName', value)} placeholder="Jayant Nahata" />
            <Field label="Preferred Name" value={profile.preferredName} onChange={(value) => onChange('preferredName', value)} placeholder="Jayant" />
            <Field label="Headline" value={profile.headline} onChange={(value) => onChange('headline', value)} placeholder="Builder, analyst, and systems thinker" />
            <Field label="Birth Date" type="date" value={profile.birthDate} onChange={(value) => onChange('birthDate', value)} />
            <Field label="City" value={profile.city} onChange={(value) => onChange('city', value)} placeholder="Jaipur" />
            <Field label="Country" value={profile.country} onChange={(value) => onChange('country', value)} placeholder="India" />
            <Field label="Occupation" value={profile.occupation} onChange={(value) => onChange('occupation', value)} placeholder="Entrepreneur" />
            <Field label="Languages" value={profile.languages} onChange={(value) => onChange('languages', value)} placeholder="English, Hindi" />
            <Field label="Email" type="email" value={profile.email} onChange={(value) => onChange('email', value)} placeholder="name@example.com" />
            <Field label="Phone" value={profile.phone} onChange={(value) => onChange('phone', value)} placeholder="+91 ..." />
            <Field label="Height (cm)" type="number" value={profile.heightCm} onChange={(value) => onChange('heightCm', value)} placeholder="178" />
            <Field label="Photo URL" value={profile.photoUrl} onChange={(value) => onChange('photoUrl', value)} placeholder="https://..." />
          </div>

          <div className="grid gap-4">
            <TextAreaField
              label="Bio"
              value={profile.bio}
              onChange={(value) => onChange('bio', value)}
              placeholder="Who you are, what matters to you, what kind of life you are building..."
            />
            <TextAreaField
              label="Values"
              value={profile.values}
              onChange={(value) => onChange('values', value)}
              placeholder="Integrity, family, health, freedom, learning..."
            />
            <TextAreaField
              label="Current Goals"
              value={profile.goals}
              onChange={(value) => onChange('goals', value)}
              placeholder="Fitness goals, financial goals, work goals, or family priorities..."
            />
            <TextAreaField
              label="Personal Notes"
              value={profile.notes}
              onChange={(value) => onChange('notes', value)}
              placeholder="Anything else you want available across this dashboard..."
            />
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {[
              { title: 'Identity', text: 'Your name, contact, headline, and picture become the root identity of the dashboard.', icon: UserRound },
              { title: 'Location', text: 'Base city and country make the profile card feel grounded and easier to scan.', icon: Globe2 },
              { title: 'Direction', text: 'Goals and values help the overview section reflect what matters right now.', icon: Target },
            ].map((item) => (
              <div key={item.title} className="life-soft-card">
                <div className="rounded-2xl bg-slate-100 p-3 text-slate-700 dark:bg-white/10 dark:text-white">
                  <item.icon size={18} />
                </div>
                <p className="mt-4 text-base font-bold text-slate-900 dark:text-white">{item.title}</p>
                <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-white/55">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default ProfileView;
