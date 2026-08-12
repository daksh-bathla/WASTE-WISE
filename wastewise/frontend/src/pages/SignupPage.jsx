import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CheckCircle2, Lock, Mail, ShieldCheck, User } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button, Card, Input, Navbar } from '../components/ui';
import { useAuthStore } from '../store/authStore';
import { authApi } from '../utils/backendApi';

export default function SignupPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    agree: false,
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const setUser = useAuthStore((state) => state.setUser);
  const setToken = useAuthStore((state) => state.setToken);

  const validateForm = () => {
    const nextErrors = {};
    if (!formData.name.trim()) nextErrors.name = 'Full name is required';
    if (!formData.email.trim()) nextErrors.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) nextErrors.email = 'Enter a valid email address';
    if (!formData.password) nextErrors.password = 'Password is required';
    else if (formData.password.length < 8) nextErrors.password = 'Use at least 8 characters';
    if (!formData.confirmPassword) nextErrors.confirmPassword = 'Confirm your password';
    else if (formData.password !== formData.confirmPassword) nextErrors.confirmPassword = 'Passwords do not match';
    if (!formData.agree) nextErrors.agree = 'Please agree before creating your account';
    return nextErrors;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const nextErrors = validateForm();
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }

    setLoading(true);
    try {
      const result = await authApi.signup({
        name: formData.name,
        email: formData.email,
        password: formData.password,
      });
      setUser({ id: result.userId || result.user?.id || Date.now(), name: formData.name, email: formData.email, city: '' });
      setToken(result.token || `wastewise_session_${Date.now()}`);
      toast.success('Account created');
      navigate('/onboarding');
    } catch (error) {
      toast.error(error.message || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field, value) => {
    setFormData((current) => ({ ...current, [field]: value }));
    if (errors[field]) setErrors((current) => ({ ...current, [field]: '' }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-light-purple via-white to-light-green">
      <Navbar />

      <main className="app-main page-shell grid items-center gap-10 py-12 lg:grid-cols-[0.9fr_1fr]">
        <section className="hidden lg:block">
          <div className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-deep-purple to-deep-green p-9 text-white shadow-hover">
            <div className="absolute right-[-70px] top-[-70px] h-48 w-48 rounded-full bg-white/15 blur-2xl" />
            <div className="absolute bottom-[-70px] left-[-70px] h-48 w-48 rounded-full bg-white/15 blur-2xl" />
            <div className="relative">
              <div className="mb-8 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/18">
                <ShieldCheck size={27} />
              </div>
              <h2 className="text-white">A safer reuse profile from day one.</h2>
              <p className="mt-4 max-w-md text-base leading-8 text-white/82">
                WasteWise learns just enough context to personalize suggestions and avoid risky ideas for your
                household.
              </p>
              <div className="mt-8 grid gap-4">
                {[
                  'Personalized for city, season, and household',
                  'Safety notes before sensitive suggestions',
                  'Free access to scan, log, and community tools',
                ].map((item) => (
                  <div key={item} className="flex items-center gap-3 rounded-2xl bg-white/14 p-4 font-bold text-white">
                    <CheckCircle2 size={20} /> {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <Card className="mx-auto w-full max-w-md p-7 sm:p-8">
          <div className="mb-8">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-deep-purple">Create account</p>
            <h1 className="text-[2.35rem] leading-tight">Join WasteWise</h1>
            <p className="mt-3 leading-7">Set up your zero waste companion in under a minute.</p>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit}>
            <Input
              label="Full name"
              placeholder="Your name"
              value={formData.name}
              onChange={(event) => updateField('name', event.target.value)}
              error={errors.name}
              leftIcon={<User size={18} />}
            />
            <Input
              label="Email address"
              type="email"
              placeholder="you@example.com"
              value={formData.email}
              onChange={(event) => updateField('email', event.target.value)}
              error={errors.email}
              leftIcon={<Mail size={18} />}
            />
            <Input
              label="Password"
              type="password"
              placeholder="At least 8 characters"
              value={formData.password}
              onChange={(event) => updateField('password', event.target.value)}
              error={errors.password}
              leftIcon={<Lock size={18} />}
            />
            <Input
              label="Confirm password"
              type="password"
              placeholder="Repeat your password"
              value={formData.confirmPassword}
              onChange={(event) => updateField('confirmPassword', event.target.value)}
              error={errors.confirmPassword}
              leftIcon={<Lock size={18} />}
            />

            <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-border bg-light-purple p-4">
              <input
                type="checkbox"
                checked={formData.agree}
                onChange={(event) => updateField('agree', event.target.checked)}
                className="mt-1 h-4 w-4 rounded border-border accent-deep-purple"
              />
              <span className="text-sm leading-6 text-text-secondary">
                I agree to the Terms and Privacy Policy and understand suggestions include safety boundaries.
              </span>
            </label>
            {errors.agree && <span className="input-error">{errors.agree}</span>}

            <Button type="submit" variant="primary" size="lg" loading={loading} className="w-full">
              Create account
            </Button>
          </form>

          <p className="mt-6 border-t border-border pt-6 text-center text-sm">
            Already have an account?{' '}
            <Link to="/login" className="font-bold text-deep-purple hover:text-[#7B52AF]">
              Sign in
            </Link>
          </p>
        </Card>
      </main>
    </div>
  );
}
