import { useEffect, useState } from 'react';
import { Bell, Lock, MapPin, ShieldCheck, Trash2, User } from 'lucide-react';
import toast from 'react-hot-toast';
import AppLayout from '../components/AppLayout';
import { Badge, Button, Card, ConfirmDialog, Input, PageHeader } from '../components/ui';
import { useAuthStore } from '../store/authStore';
import { userApi } from '../utils/backendApi';

export default function ProfilePage() {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [stats, setStats] = useState(null);
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await userApi.getStats();
        if (data) {
          setStats(data);
        }
      } catch (err) {
        console.error('Failed to fetch profile stats:', err);
      }
    };
    fetchStats();
  }, []);

  const wasteDiverted = stats?.total_weight ? `${(stats.total_weight / 1000).toFixed(1)} kg` : '0 kg';
  const streakCount = stats?.streak_count || 0;

  return (
    <AppLayout>
      <div className="page-shell section-compact">
        <PageHeader eyebrow="Profile" title="Settings and safety profile" subtitle="Manage the context WasteWise uses for personalization and safety filtering." />

        <Card className="mb-6 overflow-hidden p-0">
          <div className="bg-gradient-to-br from-deep-purple to-deep-green p-7 text-white">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-end">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white/18 text-2xl font-extrabold">
                {(user?.name || 'WU').split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase()}
              </div>
              <div>
                <h1 className="text-4xl text-white">{user?.name || 'WasteWise User'}</h1>
                <p className="mt-2 text-white/82">{user?.city || 'Delhi'} - Member since 2024</p>
                <Badge color="warning" className="mt-4">{streakCount} day streak</Badge>
              </div>
            </div>
          </div>
          <div className="grid gap-4 p-6 sm:grid-cols-4">
            {[
              ['Scans done', String(stats?.scan_count || 0)],
              ['Items repurposed', String(stats?.repurposed_count || 0)],
              ['Community posts', String(stats?.community_count || 0)],
              ['Waste saved', wasteDiverted],
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl bg-light-purple p-4">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-deep-purple">{label}</p>
                <p className="mt-2 text-2xl font-extrabold text-text-primary">{value}</p>
              </div>
            ))}
          </div>
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          <SettingsCard icon={User} title="Personal info">
            <Input label="Name" defaultValue={user?.name || 'WasteWise User'} />
            <Input label="Email" defaultValue={user?.email || 'user@example.com'} disabled />
          </SettingsCard>

          <SettingsCard icon={MapPin} title="Location settings">
            <Input label="City" defaultValue={user?.city || 'Delhi'} />
            <Input label="State" defaultValue="Delhi" />
          </SettingsCard>

          <SettingsCard icon={ShieldCheck} title="Health profile">
            <Input label="Skin type" defaultValue="Normal" />
            <Input label="Allergies" placeholder="Add known allergies" />
          </SettingsCard>

          <SettingsCard icon={Bell} title="Notifications">
            {['Seasonal suggestions', 'Gaushala connection alerts', 'Community activity'].map((item) => (
              <label key={item} className="flex items-center justify-between rounded-2xl border border-border p-4 font-bold text-text-secondary">
                {item}
                <input type="checkbox" defaultChecked className="h-5 w-5 accent-deep-purple" />
              </label>
            ))}
          </SettingsCard>
        </div>

        <Card className="mt-6 border-danger bg-[#FFF0EE]">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div className="flex gap-3">
              <Lock size={23} className="mt-1 shrink-0 text-danger" />
              <div>
                <h3>Privacy and data</h3>
                <p className="mt-2 leading-7">
                  Your data is used for suggestion personalization. You can delete all local account data from this device.
                </p>
              </div>
            </div>
            <Button variant="danger" onClick={() => setConfirmOpen(true)}>
              <Trash2 size={17} /> Delete data
            </Button>
          </div>
        </Card>
      </div>

      <ConfirmDialog
        isOpen={confirmOpen}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => {
          setConfirmOpen(false);
          logout();
          toast.success('Local account data cleared');
          window.location.href = '/';
        }}
        type="danger"
        title="Delete all local data?"
        message="This clears the saved session on this device. Full account deletion will be available after cloud sync is connected."
        confirmText="Delete"
      />
    </AppLayout>
  );
}

function SettingsCard({ icon: Icon, title, children }) {
  return (
    <Card>
      <div className="mb-5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-light-purple text-deep-purple">
            <Icon size={21} />
          </div>
          <h3>{title}</h3>
        </div>
        <Button variant="secondary" size="sm">Edit</Button>
      </div>
      <div className="grid gap-4">{children}</div>
    </Card>
  );
}
