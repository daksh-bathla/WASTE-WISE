import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowUpDown, ExternalLink, Star, WandSparkles } from 'lucide-react';
import AppLayout from '../components/AppLayout';
import SustainabilityPanel from '../components/SustainabilityPanel';
import { Badge, Card, PageHeader, WeatherStrip } from '../components/ui';
import { scanApi, suggestionsApi, normalizeScanResults } from '../utils/backendApi';
import { useAuthStore } from '../store/authStore';

const filters = ['All', 'Traditional', 'DIY', 'Modern', 'Cultural', 'Health'];

const isExcludedSuggestion = (suggestion) => {
  const text = `${suggestion?.title || ''} ${suggestion?.personalisation || ''} ${suggestion?.personalisationNote || ''}`.toLowerCase();
  const moduleType = String(suggestion?.moduleType || '').toLowerCase();

  return moduleType.includes('animal') ||
    moduleType.includes('feed') ||
    moduleType.includes('disposal') ||
    /safe disposal plan|could not be confirmed safely|sort .* before disposal/i.test(text) ||
    /multi-purpose home repurpose|every material has value|repurpose\s+.*mixed scraps|feed\s+.*(?:cow|cattle|goat|buffalo)/i.test(text);
};

export default function ResultsPage() {
  const [activeFilter, setActiveFilter] = useState('All');
  const [sortBy, setSortBy] = useState('Most relevant');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const { scanId } = useParams();
  const user = useAuthStore((state) => state.user);
  const hasValidScanId = Boolean(scanId && !['undefined', 'null'].includes(String(scanId).toLowerCase()));

  useEffect(() => {
    if (!hasValidScanId) {
      navigate('/home', { replace: true });
      return undefined;
    }

    let cancelled = false;
    const fetchResults = async () => {
      try {
        setLoading(true);
        let raw = await scanApi.results(scanId);
        let normalized = normalizeScanResults(raw);

        const hasItems = Array.isArray(raw?.items) && raw.items.length > 0;
        const missingSuggestions = hasItems && normalized.components.every((component) => component.suggestions.length === 0);

        if (missingSuggestions) {
          await suggestionsApi.generate({
            scan_id: Number(scanId),
            selected_goals: ['all'],
            contextual_answers: {},
          });
          raw = await scanApi.results(scanId);
          normalized = normalizeScanResults(raw);
        }

        if (!cancelled) {
          setData(normalized);
        }
      } catch (err) {
        console.error('Failed to fetch results:', err);
        if (!cancelled) {
          const scanMissing = err.status === 404 || /scan not found/i.test(err.message || '');
          if (scanMissing) {
            navigate('/home', { replace: true });
            return;
          }
          setError(err.message);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchResults();
    return () => { cancelled = true; };
  }, [scanId, hasValidScanId, navigate]);

  const filteredComponents = useMemo(() => {
    if (!data?.components) return [];
    return data.components
      .map((component) => ({
        ...component,
        suggestions: component.suggestions.filter((suggestion) => !isExcludedSuggestion(suggestion) && (activeFilter === 'All' || suggestion.moduleType === activeFilter)),
      }))
      .filter((component) => component.suggestions.length);
  }, [activeFilter, data]);

  if (!hasValidScanId) {
    return null;
  }

  if (loading) {
    return (
      <AppLayout>
        <div className="page-shell section-compact">
          <div className="grid gap-4">
            <div className="h-24 animate-pulse rounded-3xl bg-slate-100" />
            <div className="grid gap-4 md:grid-cols-2">
              <div className="h-40 animate-pulse rounded-3xl bg-slate-100" />
              <div className="h-40 animate-pulse rounded-3xl bg-slate-100" />
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (error || !data) {
    return (
      <AppLayout>
        <div className="page-shell flex min-h-[calc(100vh-152px)] items-center justify-center">
          <Card className="max-w-lg p-7 text-center">
            <h2 className="text-2xl">Results not found</h2>
            <p className="mt-3">{error || 'No data available for this scan.'}</p>
            <button className="btn btn-primary btn-md mt-5" onClick={() => navigate('/scan')}>Start new scan</button>
          </Card>
        </div>
      </AppLayout>
    );
  }

  const itemName = data.scan?.input_type || data.items?.[0]?.product_name || 'your item';

  return (
    <AppLayout>
      <div className="page-shell section-compact">
        <WeatherStrip city={user?.city || 'Delhi'} />

        <PageHeader
          eyebrow="Results"
          title={`Found ${data.totalSuggestions} suggestion${data.totalSuggestions !== 1 ? 's' : ''} across ${data.components.length} part${data.components.length !== 1 ? 's' : ''} of your ${data.items?.[0]?.product_name || itemName}`}
          subtitle="Every suggestion is grouped by physical component so you can reuse, compost, donate, or dispose of each part safely."
        />

        {data.scan?.input_type === 'electronics' && (
          <Card className="mb-6 border-primary-green bg-light-green/40">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm leading-6">
                Verified reuse ideas are shown below. For repair quotes, resale value, and certified recycling, open the electronics pathways page.
              </p>
              <button
                type="button"
                className="btn btn-secondary btn-sm shrink-0"
                onClick={() => navigate(`/results/${scanId}/ewaste`)}
              >
                Repair, resale &amp; recycle
              </button>
            </div>
          </Card>
        )}

        <Card className="mb-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-light-purple text-deep-purple">
                <WandSparkles size={22} />
              </div>
              <div>
                <h3>Personalized summary</h3>
                <p className="mt-1 leading-7">Season: {data.scan?.season || 'current'}. Unsafe consumption paths are hidden.</p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-2xl border border-border px-3 py-2">
              <ArrowUpDown size={16} className="text-text-muted" />
              <select className="bg-transparent text-sm font-bold text-text-secondary outline-none" value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
                <option>Most relevant</option>
                <option>Safest first</option>
                <option>Easiest first</option>
              </select>
            </div>
          </div>
        </Card>

        <div className="mb-7 flex gap-2 overflow-x-auto pb-2">
          {filters.map((filter) => (
            <button
              key={filter}
              type="button"
              onClick={() => setActiveFilter(filter)}
              className={`badge shrink-0 ${activeFilter === filter ? 'badge-purple' : 'badge-neutral'}`}
            >
              {filter}
            </button>
          ))}
        </div>

        <div className="grid gap-7">
          {filteredComponents.map((component) => (
            <section key={component.id}>
              <div className="mb-3 flex flex-wrap items-center gap-3">
                <h2 className="text-2xl uppercase tracking-[0.08em]">{component.name}</h2>
                <Badge color="neutral">{component.meta}</Badge>
              </div>

              <div className="grid gap-4">
                {component.suggestions.map((suggestion) => (
                  <button
                    key={suggestion.id}
                    type="button"
                    className="choice-card p-0 text-left"
                    onClick={() => navigate(`/results/${scanId}/suggestion/${suggestion.id}`, { state: { suggestion, scan: data.scan } })}
                  >
                    <div className="grid gap-5 p-5 lg:grid-cols-[1fr_auto] lg:items-start">
                      <div>
                        <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                          <h3>{suggestion.title}</h3>
                          <Badge color={suggestion.tagColor}>{suggestion.moduleType}</Badge>
                        </div>
                        <p className="rounded-2xl bg-white border border-primary-green/40 p-3 text-sm font-medium leading-6 text-text-secondary">
                          {suggestion.personalisation}
                        </p>
                        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs font-bold text-text-muted">
                          <Badge color="neutral" size="sm">{suggestion.credibility}</Badge>
                          <span className="flex items-center gap-1">
                            {suggestion.sourceName} <ExternalLink size={12} />
                          </span>
                        </div>
                      </div>
                      <div className="rounded-2xl border border-border bg-white px-4 py-3 lg:text-right">
                        <div className="flex items-center gap-1 font-extrabold text-text-primary lg:justify-end">
                          <Star size={16} className="fill-warning text-warning" /> {suggestion.rating}
                        </div>
                        <p className="mt-1 text-xs font-bold text-text-muted">{suggestion.tried} tried this</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </section>
          ))}

          {filteredComponents.length === 0 && (
            <Card className="p-7 text-center">
              {activeFilter === 'All' ? (
                <>
                  <p className="font-bold text-text-muted">No suggestions were generated for this item yet.</p>
                  <p className="mt-2 text-sm text-text-muted">AI services may have been busy. Try scanning again for better results.</p>
                  <button className="btn btn-primary btn-sm mt-5" onClick={() => navigate('/scan')}>Scan another item</button>
                </>
              ) : (
                <p className="font-bold text-text-muted">No suggestions match this filter. Try switching to <button type="button" className="text-deep-purple underline" onClick={() => setActiveFilter('All')}>All</button>.</p>
              )}
            </Card>
          )}
        </div>

        <SustainabilityPanel scanData={data} user={user} />
      </div>
    </AppLayout>
  );
}
