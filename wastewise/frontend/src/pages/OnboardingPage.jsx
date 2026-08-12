import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, HeartPulse, Home, Languages, MapPin, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import AppLayout from '../components/AppLayout';
import { Button, Card, Input, PageHeader, ProgressBar, StepIndicator } from '../components/ui';
import { useAuthStore, useProfileStore } from '../store/authStore';
import { userApi } from '../utils/backendApi';

const languages = ['Hindi', 'English', 'Tamil', 'Bengali', 'Marathi', 'Telugu', 'Kannada', 'Gujarati'];
const states = ['Delhi', 'Maharashtra', 'Karnataka', 'Tamil Nadu', 'Gujarat', 'Rajasthan', 'Uttar Pradesh', 'West Bengal', 'Kerala', 'Punjab'];
const cultures = ['Hindu', 'Muslim', 'Sikh', 'Christian', 'Jain', 'Buddhist', 'Other', 'Prefer not to say'];
const skinTypes = ['Normal', 'Oily', 'Dry', 'Sensitive', 'Combination'];
const dietaryOptions = ['Diabetic', 'Vegan', 'Jain diet', 'Halal only', 'Gluten-free'];
const animals = ['Cattle', 'Buffalo', 'Goat', 'Dog', 'Cat', 'Chicken', 'None nearby'];

export default function OnboardingPage() {
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState({
    name: '',
    languages: ['English'],
    city: '',
    state: 'Delhi',
    isRural: false,
    culture: '',
    skinType: '',
    allergies: '',
    dietary: [],
    ageGroup: '',
    pregnant: false,
    animals: [],
    familyMembers: 3,
    childrenCount: 0,
    elderlyCount: 0,
  });
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const setStoredProfile = useProfileStore((state) => state.setProfile);

  const update = (field, value) => setProfile((current) => ({ ...current, [field]: value }));
  const toggle = (field, value) => {
    setProfile((current) => ({
      ...current,
      [field]: current[field].includes(value)
        ? current[field].filter((item) => item !== value)
        : [...current[field], value],
    }));
  };

  const next = () => {
    if (step === 1 && !profile.name.trim()) {
      toast.error('Please enter your name');
      return;
    }
    if (step === 1 && profile.languages.length === 0) {
      toast.error('Choose at least one language');
      return;
    }
    if (step === 2 && (!profile.city.trim() || !profile.state)) {
      toast.error('Add your city and state');
      return;
    }
    setStep((current) => Math.min(current + 1, 4));
  };

  const finish = async () => {
    setSaving(true);
    try {
      // Persist profile to backend API
      await userApi.updateProfile({
        name: profile.name || user?.name,
        language: profile.languages[0] || 'English',
        culture: profile.culture,
        region: profile.state,
        state: profile.state,
        city: profile.city,
        is_rural: profile.isRural,
        skin_type: profile.skinType,
        allergies: profile.allergies,
        is_diabetic: profile.dietary.includes('Diabetic'),
        is_vegan: profile.dietary.includes('Vegan'),
        is_jain: profile.dietary.includes('Jain diet'),
        is_halal: profile.dietary.includes('Halal only'),
        is_gluten_free: profile.dietary.includes('Gluten-free'),
        age_group: profile.ageGroup,
        is_pregnant: profile.pregnant,
        animals: profile.animals.filter((a) => a !== 'None nearby'),
        family_members: profile.familyMembers,
        children_count: profile.childrenCount,
        elderly_count: profile.elderlyCount,
      });
      const nextUser = { ...user, name: profile.name || user?.name, city: profile.city || user?.city };
      setUser(nextUser);
      setStoredProfile(profile);
      toast.success('Profile ready');
      navigate('/home');
    } catch (error) {
      console.error('Profile save error:', error);
      // Still save locally even if backend fails
      const nextUser = { ...user, name: profile.name || user?.name, city: profile.city || user?.city };
      setUser(nextUser);
      setStoredProfile(profile);
      toast.success('Profile saved locally');
      navigate('/home');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppLayout>
      <div className="page-shell section-compact">
        <PageHeader
          eyebrow="Personal setup"
          title="Make WasteWise safer for your household"
          subtitle="A little context helps filter risky ideas and prioritize practical options for your city, weather, culture, and family."
        />

        <div className="grid gap-8 lg:grid-cols-[0.72fr_1.28fr]">
          <Card className="h-fit">
            <StepIndicator
              currentStep={step}
              totalSteps={4}
              labels={['Identity', 'Location', 'Safety', 'Home']}
            />
            <ProgressBar percentage={step * 25} label="Setup progress" />
            <div className="mt-8 space-y-4">
              {[
                { icon: Languages, text: 'Language controls voice and interface labels.' },
                { icon: MapPin, text: 'Location helps with weather, season, and nearby options.' },
                { icon: ShieldCheck, text: 'Health and dietary context blocks unsafe suggestions.' },
                { icon: Home, text: 'Household details improve reuse and animal-feed guidance.' },
              ].map(({ icon: Icon, text }) => (
                <div key={text} className="flex gap-3 rounded-2xl bg-light-purple p-4">
                  <Icon size={19} className="mt-0.5 shrink-0 text-deep-purple" />
                  <p className="text-sm font-medium leading-6">{text}</p>
                </div>
              ))}
            </div>
          </Card>

          {step === 1 && (
            <Card className="p-7">
              <div className="mb-7 flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-light-purple text-deep-purple">
                  <Languages size={24} />
                </div>
                <div>
                  <h2 className="text-3xl">Your name and language</h2>
                  <p className="mt-2">Choose the languages you are comfortable receiving instructions in.</p>
                </div>
              </div>
              <Input
                label="Full name"
                placeholder="Your name"
                value={profile.name || user?.name || ''}
                onChange={(event) => update('name', event.target.value)}
                className="mb-6"
              />
              <ChoiceGrid
                options={languages}
                selected={profile.languages}
                onToggle={(value) => toggle('languages', value)}
              />
              <FlowActions onNext={next} />
            </Card>
          )}

          {step === 2 && (
            <Card className="p-7">
              <div className="mb-7 flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-light-green text-deep-green">
                  <MapPin size={24} />
                </div>
                <div>
                  <h2 className="text-3xl">Your region and culture</h2>
                  <p className="mt-2">Used for seasonal context, local disposal options, and culturally aware alternatives.</p>
                </div>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <div>
                  <label className="input-label">State</label>
                  <select className="input-field" value={profile.state} onChange={(event) => update('state', event.target.value)}>
                    {states.map((state) => <option key={state}>{state}</option>)}
                  </select>
                </div>
                <Input
                  label="City"
                  placeholder="Your city"
                  value={profile.city}
                  onChange={(event) => update('city', event.target.value)}
                />
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {[
                  ['Urban', false],
                  ['Rural or farm area', true],
                ].map(([label, value]) => (
                  <button
                    key={label}
                    type="button"
                    className={`choice-card p-4 font-bold ${profile.isRural === value ? 'selected' : ''}`}
                    onClick={() => update('isRural', value)}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div className="mt-6">
                <label className="input-label">Culture or tradition</label>
                <ChoiceGrid options={cultures} selected={[profile.culture]} onToggle={(value) => update('culture', value)} single />
              </div>
              <FlowActions onBack={() => setStep(1)} onNext={next} />
            </Card>
          )}

          {step === 3 && (
            <Card className="p-7">
              <div className="mb-7 flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-light-purple text-deep-purple">
                  <HeartPulse size={24} />
                </div>
                <div>
                  <h2 className="text-3xl">Safety profile</h2>
                  <p className="mt-2">Optional, but useful for filtering topical, dietary, and animal-related advice.</p>
                </div>
              </div>

              <label className="input-label">Skin type</label>
              <ChoiceGrid options={skinTypes} selected={[profile.skinType]} onToggle={(value) => update('skinType', value)} single />

              <Input
                label="Known allergies or sensitivities"
                placeholder="Example: nuts, dairy, fragrance, latex"
                value={profile.allergies}
                onChange={(event) => update('allergies', event.target.value)}
                className="mt-6"
              />

              <div className="mt-6">
                <label className="input-label">Dietary flags</label>
                <ChoiceGrid options={dietaryOptions} selected={profile.dietary} onToggle={(value) => toggle('dietary', value)} />
              </div>

              <div className="mt-6 grid gap-5 md:grid-cols-2">
                <div>
                  <label className="input-label">Age group</label>
                  <select className="input-field" value={profile.ageGroup} onChange={(event) => update('ageGroup', event.target.value)}>
                    <option value="">Prefer not to say</option>
                    <option>Under 18</option>
                    <option>18-40</option>
                    <option>40-65</option>
                    <option>65+</option>
                  </select>
                </div>
                <label className="flex items-center gap-3 rounded-2xl border border-border p-4 font-bold text-text-secondary">
                  <input
                    type="checkbox"
                    checked={profile.pregnant}
                    onChange={(event) => update('pregnant', event.target.checked)}
                    className="h-4 w-4 accent-deep-purple"
                  />
                  Pregnant or breastfeeding
                </label>
              </div>

              <FlowActions onBack={() => setStep(2)} onNext={next} />
            </Card>
          )}

          {step === 4 && (
            <Card className="p-7">
              <div className="mb-7 flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-light-green text-deep-green">
                  <Home size={24} />
                </div>
                <div>
                  <h2 className="text-3xl">Your household</h2>
                  <p className="mt-2">This helps with portion limits, composting choices, and animal-safe guidance.</p>
                </div>
              </div>

              <label className="input-label">Animals in or near your household</label>
              <ChoiceGrid options={animals} selected={profile.animals} onToggle={(value) => toggle('animals', value)} green />

              <div className="mt-6 grid gap-5 md:grid-cols-3">
                <NumberField label="Family members" value={profile.familyMembers} onChange={(value) => update('familyMembers', value)} min={1} />
                <NumberField label="Children under 12" value={profile.childrenCount} onChange={(value) => update('childrenCount', value)} />
                <NumberField label="Elderly members" value={profile.elderlyCount} onChange={(value) => update('elderlyCount', value)} />
              </div>

              <div className="mt-6 rounded-2xl border border-primary-green bg-light-green p-4">
                <p className="font-bold text-text-primary">Privacy note</p>
                <p className="mt-1 text-sm leading-6">
                  This information is used only to personalize suggestions and safety notes in your WasteWise experience.
                </p>
              </div>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-end">
                <Button variant="secondary" onClick={() => setStep(3)}>Back</Button>
                <Button variant="success" onClick={finish} loading={saving}>Complete setup</Button>
              </div>
            </Card>
          )}
        </div>
      </div>
    </AppLayout>
  );
}

function ChoiceGrid({ options, selected, onToggle, single = false, green = false }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {options.map((option) => {
        const isSelected = selected.includes(option);
        return (
          <button
            key={option}
            type="button"
            className={`choice-card ${green ? 'green' : ''} ${isSelected ? 'selected' : ''} p-4 text-sm font-bold`}
            onClick={() => {
              if (single && isSelected) return onToggle('');
              onToggle(option);
            }}
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}

function NumberField({ label, value, onChange, min = 0 }) {
  return (
    <div>
      <label className="input-label">{label}</label>
      <input
        type="number"
        min={min}
        value={value}
        onChange={(event) => onChange(Number(event.target.value || min))}
        className="input-field"
      />
    </div>
  );
}

function FlowActions({ onBack, onNext }) {
  return (
    <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-end">
      {onBack && <Button variant="secondary" onClick={onBack}>Back</Button>}
      <Button variant="primary" onClick={onNext}>
        Next <ChevronRight size={17} />
      </Button>
    </div>
  );
}
