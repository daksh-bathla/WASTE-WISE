import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AlertTriangle, ExternalLink, Recycle, RefreshCw, Smartphone, Wrench } from 'lucide-react';
import AppLayout from '../components/AppLayout';
import { Badge, Card, PageHeader, LoadingSpinner } from '../components/ui';
import { suggestionsApi, normalizeEwasteForPage } from '../utils/backendApi';

export default function EwastePage() {
  const { scanId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const hasValidScanId = Boolean(scanId && !['undefined', 'null'].includes(String(scanId).toLowerCase()));

  useEffect(() => {
    if (!hasValidScanId) {
      navigate('/home', { replace: true });
      return undefined;
    }

    let cancelled = false;
    const loadEwasteData = async () => {
      try {
        setLoading(true);
        // Using scan results for the e-waste page details since there is no separate endpoint
        const res = await suggestionsApi.ewaste(scanId);
        if (!cancelled) {
          setData(normalizeEwasteForPage(res));
        }
      } catch (err) {
        console.error('Failed to load ewaste results:', err);
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    loadEwasteData();
    return () => { cancelled = true; };
  }, [scanId, hasValidScanId, navigate]);

  if (!hasValidScanId) {
    return null;
  }

  if (loading) {
    return (
      <AppLayout>
        <div className="page-shell flex min-h-[calc(100vh-152px)] items-center justify-center">
          <div className="text-center">
            <LoadingSpinner size="lg" />
            <p className="mt-4 font-bold text-text-muted">Loading e-waste assessment…</p>
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
            <p className="mt-3">{error || 'No e-waste data available for this scan.'}</p>
            <button className="btn btn-primary btn-md mt-5" onClick={() => navigate('/scan')}>Start new scan</button>
          </Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="page-shell section-compact">
        <PageHeader
          eyebrow="Electronics assessment"
          title={`${data.device || 'Electronic device'} pathways`}
          subtitle="Repair, resale, donation, salvage, and certified recycling options are separated so risky handling stays blocked."
        />

        <div className="grid gap-6">
          <Card className="border-primary-green">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-light-green text-deep-green">
                  <Wrench size={24} />
                </div>
                <div>
                  <Badge color="green" className="mb-3">Repair first</Badge>
                  <h2 className="text-3xl">This might still be repairable</h2>
                  <p className="mt-3 max-w-2xl leading-7">
                    {data.commonFix || 'Check if a simple repair can fix it.'} Difficulty: {data.repairDifficulty || 'Unknown'}.
                  </p>
                </div>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <a
                  href={`https://www.ifixit.com/Search?query=${encodeURIComponent(data.device || 'electronics repair')}`}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-secondary btn-md"
                >
                  Find repair guide <ExternalLink size={16} />
                </a>
                <a
                  href={`https://www.google.com/maps/search/mobile+repair+shop+near+${data.city || 'me'}`}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-primary btn-md"
                >
                  Local repair shops
                </a>
              </div>
            </div>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-light-purple text-deep-purple">
                  <Smartphone size={22} />
                </div>
                <div>
                  <h3>Sell or donate</h3>
                  <p className="text-sm">Estimated resale value: {data.resaleValue || 'Unknown'}</p>
                </div>
              </div>
              <div className="grid gap-3">
                {(data.platforms || []).map((platform) => (
                  <div key={platform.name} className="rounded-2xl border border-border p-4">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <h4>{platform.name}</h4>
                      <Badge color={platform.type === 'Donation' ? 'green' : 'purple'} size="sm">{platform.type}</Badge>
                    </div>
                    <p className="text-sm leading-6">{platform.note}</p>
                    <a href={platform.url} target="_blank" rel="noreferrer" className="mt-3 inline-flex text-sm font-bold text-deep-purple">
                      Visit <ExternalLink size={14} className="ml-1" />
                    </a>
                  </div>
                ))}
              </div>
            </Card>

            <Card>
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-light-green text-deep-green">
                  <RefreshCw size={22} />
                </div>
                <div>
                  <h3>Salvage useful parts</h3>
                  <p className="text-sm">Only with trained handling.</p>
                </div>
              </div>
              <div className="grid gap-3">
                {(data.salvage || []).map((item) => (
                  <div key={item.component} className="rounded-2xl border border-border p-4">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <h4>{item.component}</h4>
                      <Badge color="neutral" size="sm">{item.condition}</Badge>
                    </div>
                    <p className="text-sm leading-6">{item.reuse}</p>
                  </div>
                ))}
                {(!data.salvage || data.salvage.length === 0) && (
                  <p className="text-sm text-text-muted py-4">No salvageable parts identified without professional inspection.</p>
                )}
              </div>
            </Card>
          </div>

          <Card>
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-light-purple text-deep-purple">
                <Recycle size={22} />
              </div>
              <div>
                <h3>Certified recycling</h3>
                <p className="text-sm">Use responsible recyclers for batteries, screens, and circuit boards.</p>
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              {(data.recyclers || []).map((recycler) => (
                <div key={recycler.name} className="rounded-2xl border border-border p-4">
                  <Badge color="green" size="sm">{recycler.type}</Badge>
                  <h4 className="mt-3">{recycler.name}</h4>
                  <p className="mt-2 text-sm">{recycler.pickup}</p>
                </div>
              ))}
            </div>
          </Card>

          <Card className="border-danger bg-[#FFF0EE]">
            <div className="flex gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-danger">
                <AlertTriangle size={24} />
              </div>
              <div>
                <h3>About precious metals in electronics</h3>
                <p className="mt-3 leading-7">
                  Your device likely contains small amounts of gold, copper, and other metals in its circuit board.
                  These are real and valuable. However, extracting them at home requires dangerous industrial chemicals
                  and can cause severe burns and toxic fume inhalation. Always take your device to a certified recycler
                  with the proper facility to do this safely.
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
