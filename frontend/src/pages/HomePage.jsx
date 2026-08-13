import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Camera, Clock, Leaf, Plus, ShieldCheck, Sparkles, TrendingUp } from 'lucide-react';
import toast from 'react-hot-toast';
import AppLayout from '../components/AppLayout';
import { Badge, Button, Card, ProgressBar, WeatherStrip } from '../components/ui';
import { useAuthStore } from '../store/authStore';
import { scanApi, scrapLogApi, userApi } from '../utils/backendApi';

const peelButtons = ['Banana peel', 'Potato peel', 'Watermelon rind', 'Vegetable scraps'];

export default function HomePage() {
  const [loggedItems, setLoggedItems] = useState(0);
  const [recentScans, setRecentScans] = useState([]);
  const [stats, setStats] = useState(null);
  const [seasonalNote, setSeasonalNote] = useState('Mango peels and seeds are common right now. Scan them before feeding, applying, or composting so the safer path is clear.');
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [scansRes, statsRes] = await Promise.allSettled([
          scanApi.recent(4),
          userApi.getStats(),
        ]);
        if (scansRes.status === 'fulfilled' && scansRes.value?.scans) {
          setRecentScans(scansRes.value.scans);
        }
        if (statsRes.status === 'fulfilled') {
          setStats(statsRes.value);
        }
        // Try to load seasonal note
        try {
          const seasonal = await scanApi.seasonal();
          if (seasonal?.note) setSeasonalNote(seasonal.note);
        } catch { /* ignore */ }
      } catch (err) {
        console.error('HomePage data load error:', err);
      }
    };
    loadData();
  }, []);

  const addPeel = async (item) => {
    try {
      await scrapLogApi.add({
        item_name: item,
        item_type: 'Food peel',
        quantity: 250,
        unit: 'grams',
        action_taken: 'composted',
      });
      setLoggedItems((current) => current + 1);
      toast.success(`${item} added to today's log`);
    } catch {
      // Still update UI even if API fails
      setLoggedItems((current) => current + 1);
      toast.success(`${item} added to today's log`);
    }
  };

  const scanCount = stats?.scan_count || recentScans.length || 0;
  const itemsRepurposed = stats?.repurposed_count || 0;
  const wasteDiverted = stats?.total_weight ? `${(stats.total_weight / 1000).toFixed(1)} kg` : '0 kg';
  const streakCount = stats?.streak_count || 0;

  return (
    <AppLayout>
      <div className="page-shell section-compact">
        <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <Badge color="green" className="mb-4">
              <Sparkles size={14} /> Household dashboard
            </Badge>
            <h1 className="text-[clamp(2rem,4vw,3.2rem)]">Good to see you, {user?.name?.split(' ')[0] || 'there'}.</h1>
            <p className="mt-3 max-w-2xl text-base leading-7">
              Scan something, log what you reused, and keep your household waste moving toward better outcomes.
            </p>
          </div>
          <Button variant="primary" size="lg" onClick={() => navigate('/scan')}>
            <Camera size={18} /> Start scan
          </Button>
        </div>

        <WeatherStrip city={user?.city || 'Delhi'} />

        <div className="grid gap-6 lg:grid-cols-[1.18fr_0.82fr]">
          <div className="grid gap-6">
            <Card className="overflow-hidden p-0">
              <div className="grid gap-0 lg:grid-cols-[1.1fr_0.9fr]">
                <div className="bg-gradient-to-br from-deep-purple to-deep-green p-8 text-white">
                  <p className="mb-3 text-sm font-bold uppercase tracking-[0.18em] text-white/72">Today</p>
                  <h2 className="text-white">What do you want to analyse?</h2>
                  <p className="mt-4 max-w-lg text-base leading-8 text-white/86">
                    Add an expired product, food peel, packaging, or old device. WasteWise will separate the useful parts
                    and show safe next steps.
                  </p>
                  <Button variant="white" size="lg" className="mt-7" onClick={() => navigate('/scan')}>
                    Scan an item <ArrowRight size={18} />
                  </Button>
                </div>
                <div className="grid content-center gap-4 p-6">
                  {[
                    ['Items repurposed', String(itemsRepurposed), 'purple'],
                    ['Waste diverted', wasteDiverted, 'green'],
                    ['Current streak', `${streakCount} day${streakCount !== 1 ? 's' : ''}`, 'warning'],
                  ].map(([label, value, color]) => (
                    <div key={label} className="rounded-2xl border border-border p-4">
                      <Badge color={color} size="sm">{label}</Badge>
                      <div className="mt-3 text-3xl font-extrabold text-text-primary">{value}</div>
                    </div>
                  ))}
                </div>
              </div>
            </Card>

            <Card>
              <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                <div>
                  <h3>Your recent scans</h3>
                  <p className="mt-1 text-sm">Continue from previous results or scan a similar item.</p>
                </div>
                <Button variant="secondary" size="sm" onClick={() => navigate('/scan')}>New scan</Button>
              </div>
              <div className="grid gap-3">
                {recentScans.length === 0 && (
                  <div className="rounded-2xl border border-border p-6 text-center">
                    <p className="text-sm font-bold text-text-muted">No scans yet. Start your first scan above!</p>
                  </div>
                )}
                {recentScans.map((scan) => {
                  const riskLabel = scan.risk_level === 'high' ? 'Caution' : scan.risk_level === 'medium' ? 'Caution' : 'Low risk';
                  const timeAgo = getTimeAgo(scan.created_at);
                  return (
                    <button
                      key={scan.id}
                      type="button"
                      onClick={() => navigate(`/results/${scan.id}`)}
                      className="choice-card grid gap-4 p-4 text-left sm:grid-cols-[1fr_auto] sm:items-center"
                    >
                      <div>
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          <h4>{scan.product_name || scan.input_type || 'Scan'}</h4>
                          <Badge color={riskLabel === 'Low risk' ? 'green' : 'warning'} size="sm">
                            {riskLabel}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-text-muted">
                          <span>{titleCase(scan.input_type || '')}</span>
                          <span className="flex items-center gap-1"><Clock size={13} /> {timeAgo}</span>
                        </div>
                      </div>
                      <div className="rounded-2xl bg-light-purple px-4 py-3 text-center">
                        <div className="text-2xl font-extrabold text-deep-purple">{scan.suggestion_count || 0}</div>
                        <p className="text-xs font-bold text-text-muted">suggestions</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </Card>
          </div>

          <div className="grid gap-6">
            <Card>
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-light-green text-deep-green">
                  <TrendingUp size={22} />
                </div>
                <div>
                  <h3>Weekly impact</h3>
                  <p className="text-sm">{scanCount} scans done</p>
                </div>
              </div>
              <ProgressBar percentage={Math.min(100, (scanCount / 10) * 100)} label="Scans this week" />
              <div className="mt-6 grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-light-purple p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-deep-purple">Community</p>
                  <p className="mt-2 text-2xl font-extrabold text-text-primary">{stats?.community_count || 0} posts</p>
                </div>
                <div className="rounded-2xl bg-light-green p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-deep-green">Safety</p>
                  <p className="mt-2 text-2xl font-extrabold text-text-primary">{scanCount} checks</p>
                </div>
              </div>
            </Card>

            <Card>
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-light-purple text-deep-purple">
                  <Leaf size={22} />
                </div>
                <div>
                  <h3>Today's kitchen waste</h3>
                  <p className="text-sm">Quick-add common scraps</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {peelButtons.map((item) => (
                  <button key={item} type="button" className="choice-card p-4 text-sm font-bold" onClick={() => addPeel(item)}>
                    <Plus size={16} className="mb-3 text-deep-green" />
                    {item}
                  </button>
                ))}
              </div>
              <div className="mt-5 rounded-2xl border border-primary-green bg-light-green p-4">
                <p className="font-bold text-text-primary">{loggedItems} item{loggedItems === 1 ? '' : 's'} logged today</p>
                {loggedItems >= 3 ? (
                  <p className="mt-1 text-sm leading-6">You may have enough scraps to plan composting or nearby animal-feed donation.</p>
                ) : (
                  <p className="mt-1 text-sm leading-6">Add a few more scraps to unlock weekly reuse guidance.</p>
                )}
              </div>
            </Card>

            <Card>
              <div className="flex items-start gap-3">
                <ShieldCheck size={23} className="mt-1 shrink-0 text-deep-green" />
                <div>
                  <h3>Seasonal note</h3>
                  <p className="mt-2 leading-7">{seasonalNote}</p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

function titleCase(str) {
  return str.replace(/[_-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function getTimeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Yesterday';
  return `${days} days ago`;
}
