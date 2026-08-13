import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Lock, Mail, ShieldCheck, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button, Card, Input, Navbar } from '../components/ui';
import { useAuthStore } from '../store/authStore';
import { authApi } from '../utils/backendApi';

export default function LoginPage() {
  const [formData, setFormData] = useState({ email: '', password: '', remember: true });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const setUser = useAuthStore((state) => state.setUser);
  const setToken = useAuthStore((state) => state.setToken);
  const nextPath = location.state?.from || '/home';

  const validateForm = () => {
    const nextErrors = {};
    if (!formData.email.trim()) nextErrors.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) nextErrors.email = 'Enter a valid email address';
    if (!formData.password) nextErrors.password = 'Password is required';
    return nextErrors;
  };

  const finishLogin = (user, token) => {
    setUser(user);
    setToken(token);
    toast.success('Welcome back');
    navigate(nextPath, { replace: true });
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
      const result = await authApi.login({
        email: formData.email,
        password: formData.password,
      });
      const user = result.user || { id: result.userId, name: result.name || 'WasteWise User', email: formData.email, city: result.city || '' };
      finishLogin(user, result.token);
    } catch (error) {
      toast.error(error.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const continueAsGuest = () => {
    finishLogin(
      { id: 'guest', name: 'Guest User', email: 'guest@wastewise.local', city: 'Delhi' },
      `wastewise_guest_${Date.now()}`
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-light-purple via-white to-light-green">
      <Navbar />

      <main className="app-main page-shell grid items-center gap-10 py-12 lg:grid-cols-[0.9fr_1fr]">
        <section className="hidden lg:block">
          <BadgePanel />
        </section>

        <Card className="mx-auto w-full max-w-md p-7 sm:p-8">
          <div className="mb-8">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-deep-purple">Welcome back</p>
            <h1 className="text-[2.35rem] leading-tight">Sign in to WasteWise</h1>
            <p className="mt-3 leading-7">Continue your scans, saved suggestions, and waste diversion log.</p>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit}>
            <Input
              label="Email address"
              type="email"
              placeholder="you@example.com"
              value={formData.email}
              onChange={(event) => {
                setFormData({ ...formData, email: event.target.value });
                if (errors.email) setErrors({ ...errors, email: '' });
              }}
              error={errors.email}
              leftIcon={<Mail size={18} />}
            />

            <Input
              label="Password"
              type="password"
              placeholder="Enter your password"
              value={formData.password}
              onChange={(event) => {
                setFormData({ ...formData, password: event.target.value });
                if (errors.password) setErrors({ ...errors, password: '' });
              }}
              error={errors.password}
              leftIcon={<Lock size={18} />}
            />

            <div className="flex items-center justify-between gap-3 text-sm">
              <label className="flex items-center gap-2 font-bold text-text-secondary">
                <input
                  type="checkbox"
                  checked={formData.remember}
                  onChange={(event) => setFormData({ ...formData, remember: event.target.checked })}
                  className="h-4 w-4 rounded border-border accent-deep-purple"
                />
                Remember me
              </label>
              <button type="button" className="font-bold text-deep-purple hover:text-[#7B52AF]">
                Forgot password?
              </button>
            </div>

            <Button type="submit" variant="primary" size="lg" loading={loading} className="w-full">
              Sign in
            </Button>
          </form>

          <Button variant="secondary" className="mt-4 w-full" onClick={continueAsGuest}>
            Continue as guest
          </Button>

          <p className="mt-6 border-t border-border pt-6 text-center text-sm">
            New to WasteWise?{' '}
            <Link to="/signup" className="font-bold text-deep-purple hover:text-[#7B52AF]">
              Create an account
            </Link>
          </p>
        </Card>
      </main>
    </div>
  );
}

function BadgePanel() {
  return (
    <div className="relative overflow-hidden rounded-[28px] border border-primary-purple bg-[var(--card-bg)] p-8 shadow-hover">
      <div className="absolute right-[-80px] top-[-80px] h-56 w-56 rounded-full bg-light-purple blur-2xl" />
      <div className="absolute bottom-[-80px] left-[-80px] h-56 w-56 rounded-full bg-light-green blur-2xl" />
      <div className="relative">
        <div className="mb-8 flex h-14 w-14 items-center justify-center rounded-2xl bg-deep-purple text-white">
          <Sparkles size={26} />
        </div>
        <h2>Pick up where your household left off.</h2>
        <p className="mt-4 max-w-md text-base leading-8">
          Your profile helps WasteWise avoid unsafe suggestions and prioritize ideas that fit your city, weather,
          household, and preferences.
        </p>
        <div className="mt-8 grid gap-3">
          {['Saved safety notes', 'Recent scans and results', 'Weekly kitchen waste tracker'].map((item) => (
            <div key={item} className="flex items-center gap-3 rounded-2xl bg-light-green p-4">
              <ShieldCheck size={20} className="text-deep-green" />
              <span className="font-bold text-text-primary">{item}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
