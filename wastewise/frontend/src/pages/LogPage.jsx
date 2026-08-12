/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useState } from 'react';
import { Download, Leaf, MapPin, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import AppLayout from '../components/AppLayout';
import { Badge, Button, Card, EmptyState, Input, PageHeader } from '../components/ui';
import { scrapLogApi, userApi } from '../utils/backendApi';
import { useAuthStore } from '../store/authStore';

export default function LogPage() {
  const [item, setItem] = useState('');
  const [type, setType] = useState('Food peel');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('grams');
  const [action, setAction] = useState('Repurposed');
  const [entries, setEntries] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const user = useAuthStore((state) => state.user);

  const fetchLog = async () => {
    try {
      const data = await scrapLogApi.list(10, 0);
      if (data && Array.isArray(data.logs)) {
        setEntries(data.logs);
      }
    } catch (err) {
      console.error('Failed to fetch scrap log:', err);
    }
  };

  const fetchStats = async () => {
    try {
      const data = await userApi.getStats();
      if (data) {
        setStats(data);
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  };

  useEffect(() => {
    fetchLog();
    fetchStats();
  }, []);

  const addEntry = async () => {
    if (!item.trim()) {
      toast.error('Add an item name');
      return;
    }
    if (!quantity.trim() || isNaN(Number(quantity))) {
      toast.error('Add a valid numerical quantity');
      return;
    }

    setLoading(true);
    try {
      await scrapLogApi.add({
        item_name: item,
        item_type: type,
        quantity: Number(quantity),
        unit: unit,
        action_taken: action.toLowerCase().replace(/ /g, '_'),
      });
      
      // Reset form and reload data
      setItem('');
      setQuantity('');
      toast.success('Added to scrap log');
      await Promise.all([fetchLog(), fetchStats()]);
    } catch (err) {
      toast.error(err.message || 'Failed to add log entry');
    } finally {
      setLoading(false);
    }
  };

  const wasteDiverted = stats?.total_weight ? `${(stats.total_weight / 1000).toFixed(1)} kg` : '0 kg';
  const cattleFedCount = stats?.cattle_fed_count || 0;

  return (
    <AppLayout>
      <div className="page-shell section-compact">
        <PageHeader
          eyebrow="Scrap log"
          title="Track what your household saved"
          subtitle="Log peels, packaging, electronics, and reuse actions to keep your weekly impact visible."
          action={<Button variant="secondary"><Download size={16} /> Export CSV</Button>}
        />

        <div className="grid gap-5 md:grid-cols-3">
          {[
            ['Total logged', `${entries.length} items`, 'purple'],
            ['Waste diverted', wasteDiverted, 'green'],
            ['Cattle feed ready', `${cattleFedCount} times`, 'warning'],
          ].map(([label, value, color]) => (
            <Card key={label}>
              <Badge color={color}>{label}</Badge>
              <p className="mt-4 text-3xl font-extrabold text-text-primary">{value}</p>
            </Card>
          ))}
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_0.86fr]">
          <Card>
            <h3>Add to log</h3>
            <div className="mt-5 grid gap-5">
              <Input label="What did you have?" placeholder="Example: banana peels" value={item} onChange={(event) => setItem(event.target.value)} />
              <div className="grid gap-5 md:grid-cols-3">
                <Select label="Type" value={type} onChange={(e) => setType(e.target.value)} options={['Food peel', 'Leftover food', 'Packaging', 'Electronics', 'Other']} />
                <Input label="Quantity" placeholder="500" value={quantity} onChange={(event) => setQuantity(event.target.value)} />
                <Select label="Unit" value={unit} onChange={(e) => setUnit(e.target.value)} options={['grams', 'kg', 'pieces']} />
              </div>
              <Select label="What did you do with it?" value={action} onChange={(e) => setAction(e.target.value)} options={['Repurposed', 'Fed to animals', 'Composted', 'Sold or donated', 'Disposed properly']} />
              <Button variant="primary" onClick={addEntry} loading={loading}><Plus size={17} /> Save log entry</Button>
            </div>
          </Card>

          <Card className="border-primary-green bg-light-green">
            <div className="flex items-start gap-3">
              <MapPin size={23} className="mt-1 shrink-0 text-deep-green" />
              <div>
                <h3>Gaushala connection</h3>
                <p className="mt-2 leading-7">
                  You have enough peels this week to supplement nearby cattle feed for {Math.max(1, Math.floor((stats?.peel_weight || 0) / 1000))} day{Math.max(1, Math.floor((stats?.peel_weight || 0) / 1000)) !== 1 ? 's' : ''}. Nearby verified locations
                  can be shown based on your city ({user?.city || 'Delhi'}).
                </p>
                <Button variant="success" className="mt-5">Find nearby options</Button>
              </div>
            </div>
          </Card>
        </div>

        <Card className="mt-6">
          <div className="mb-5 flex items-center gap-3">
            <Leaf className="text-deep-green" size={22} />
            <h3>Log history</h3>
          </div>
          <div className="grid gap-3">
            {entries.length === 0 ? (
              <EmptyState
                title="Your log is empty"
                description="Start tracking what your household reuses, composts, or repurposes to see your weekly impact."
                actionLabel="Add first entry"
                onAction={() => document.getElementById('log-item-input')?.focus()}
              />
            ) : entries.map((entry) => (
              <div key={entry.id} className="grid gap-3 rounded-2xl border border-border p-4 md:grid-cols-[1fr_auto] md:items-center">
                <div>
                  <h4 className="capitalize">{entry.item_name}</h4>
                  <p className="text-sm">
                    {entry.item_type} - {entry.quantity} {entry.unit} - {new Date(entry.logged_date).toLocaleDateString()}
                  </p>
                </div>
                <Badge color="green" className="capitalize">{entry.action_taken.replace(/_/g, ' ')}</Badge>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </AppLayout>
  );
}

function Select({ label, options, value, onChange }) {
  return (
    <div>
      <label className="input-label">{label}</label>
      <select className="input-field" value={value} onChange={onChange}>
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    </div>
  );
}
