import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, ChevronDown, Cloud, Droplet, Leaf, Truck } from 'lucide-react';
import { sustainabilityApi } from '../utils/backendApi';

const parseJson = (value) => {
  if (!value || typeof value !== 'string') return value || null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

const splitIngredients = (value) => {
  if (Array.isArray(value)) return value;
  if (!value || typeof value !== 'string') return [];

  return value
    .split(/\n|,|;/)
    .map((ingredient) => ingredient.trim())
    .filter(Boolean);
};

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const formatNumber = (value) => {
  const number = toNumber(value);
  return number === null ? 'not available' : Math.round(number).toLocaleString('en-IN');
};

const formatPercent = (value) => {
  const number = toNumber(value);
  return number === null ? 'not available' : Math.round(number).toLocaleString('en-IN');
};

const buildPayload = (scanData, user) => {
  const scan = scanData?.scan || {};
  const item = scanData?.items?.[0] || {};
  const rawInput = parseJson(item.raw_input) || {};
  const form = rawInput.form || rawInput || {};
  const packagingFromComponents = (scanData?.components || [])
    .map((component) => component.meta)
    .find((meta) => /packaging|plastic|glass|cardboard|paper|metal|fabric|carton|bottle/i.test(meta || ''));

  return {
    productData: {
      product_name: item.product_name || form.itemName || rawInput.product_name || '',
      category: form.category || rawInput.category || scan.input_type || 'unknown',
      ingredients: splitIngredients(form.ingredients || rawInput.ingredients),
      packaging_material:
        form.packagingMaterial ||
        form.packaging_material ||
        form.materialType ||
        rawInput.packaging_material ||
        rawInput.packaging_materials ||
        packagingFromComponents ||
        '',
      quantity: form.quantity || rawInput.quantity || '',
      brand: form.brand || rawInput.brand || '',
    },
    location: {
      city: user?.city || form.city || rawInput.city || 'Delhi',
      state: user?.state || user?.region || form.state || rawInput.state || 'Delhi',
      lat: toNumber(scan.location_lat || user?.lat || user?.location_lat) || 28.6139,
      lng: toNumber(scan.location_lng || user?.lng || user?.location_lng) || 77.209,
    },
    weather: {
      temp: toNumber(scan.weather_temp),
      humidity: toNumber(scan.weather_humidity),
      uv: toNumber(scan.weather_uv),
      season: scan.season,
    },
  };
};

const panelVariants = {
  show: {
    transition: {
      staggerChildren: 0.15,
    },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.32, ease: 'easeOut' } },
};

const learnMoreCopy = {
  alerts: (productData, location) =>
    `Conditions in ${location.city}, ${location.state} can affect how ${productData.product_name} should be used, stored, or disposed of. Air pollution, heat, humidity, and monsoon runoff can have direct local health and environmental effects.`,
  carbon: (productData, location) =>
    `In India, the footprint of ${productData.category} products reaching ${location.city} includes ingredients, manufacturing energy, packaging, transport, and disposal. Comparing ${productData.product_name} with an Indian category average helps identify products with an unusually high lifecycle impact.`,
  routing: (productData, location) =>
    `For shoppers in ${location.city}, transport emissions matter most when an imported or long-distance product has a practical Indian equivalent. Choosing a regional option can reduce freight emissions while supporting a shorter supply chain.`,
  resources: (productData, location) =>
    `Water availability, electricity demand, land use, and growing seasons vary widely across India, including around ${location.city}. This resource check appears only when ${productData.product_name} has a specific concern that is meaningfully higher than similar ${productData.category} products.`,
};

function SustainabilitySkeleton() {
  return (
    <div className="mt-8 grid gap-3" aria-label="Loading sustainability insights">
      <div className="h-5 w-56 animate-pulse rounded-full bg-border-light" />
      <div className="rounded-xl border border-border bg-[var(--card-bg)] p-5">
        <div className="mb-4 h-4 w-40 animate-pulse rounded-full bg-border-light" />
        <div className="mb-3 h-3 w-full animate-pulse rounded-full bg-border-light" />
        <div className="h-3 w-2/3 animate-pulse rounded-full bg-border-light" />
      </div>
    </div>
  );
}

function InsightCard({ children, borderColor, iconColor, className = '' }) {
  return (
    <motion.article
      variants={cardVariants}
      className={`relative overflow-hidden rounded-xl border border-l-4 border-border bg-[var(--card-bg)] p-5 shadow-card ${className}`}
      style={{ borderLeftColor: borderColor }}
    >
      <Leaf size={112} className="pointer-events-none absolute -right-4 top-4 opacity-[0.05]" style={{ color: iconColor }} />
      <div className="relative">{children}</div>
    </motion.article>
  );
}

function CardHeader({ icon: Icon, title, color }) {
  return (
    <div className="mb-4 flex items-center gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-light-green" style={{ color }}>
        <Icon size={21} />
      </div>
      <h3 className="text-lg">{title}</h3>
    </div>
  );
}

function LearnMore({ children }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="mt-5 border-t border-border pt-4">
      <button
        type="button"
        className="flex items-center gap-2 bg-transparent text-sm font-bold text-deep-green"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
      >
        Learn more
        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.18 }}>
          <ChevronDown size={16} />
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <p className="pt-3 text-sm leading-6">{children}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function CarbonCard({ finding, productData, location }) {
  const estimated = toNumber(finding.estimated_gco2e);
  const average = toNumber(finding.category_average_gco2e);
  const computedAboveAverage = average && estimated !== null ? ((estimated - average) / average) * 100 : null;
  const aboveAverage = toNumber(finding.percentage_above_average) ?? computedAboveAverage;
  const isHigh = (aboveAverage ?? 0) >= 30;
  const barColor = isHigh ? '#E76F51' : '#F4A261';
  const barMaximum = Math.max(estimated || 0, average || 0, 1);
  const productWidth = Math.min(100, ((estimated || 0) / barMaximum) * 100);
  const averageMarker = Math.min(100, ((average || 0) / barMaximum) * 100);

  return (
    <InsightCard borderColor={barColor} iconColor="#52B788">
      <CardHeader icon={Cloud} title="Carbon footprint analysis" color={barColor} />

      <div className="mb-5">
        <div className="relative h-3 overflow-hidden rounded-full bg-border-light">
          <motion.div
            className="h-full rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${productWidth}%` }}
            transition={{ duration: 0.65, ease: 'easeOut' }}
            style={{ backgroundColor: barColor }}
          />
          <span
            className="absolute -top-1 h-5 w-0.5 bg-text-primary"
            style={{ left: `${averageMarker}%` }}
            title="Category average"
          />
        </div>
        <div className="mt-2 flex justify-between text-xs font-medium text-text-muted">
          <span>This product: {formatNumber(estimated)}g CO2e</span>
          <span>Average: {formatNumber(average)}g CO2e</span>
        </div>
      </div>

      <p className="leading-7">
        This product produces approximately {formatNumber(estimated)}g CO2e - {formatPercent(aboveAverage)}% above the average for {productData.category} products ({formatNumber(average)}g CO2e).
      </p>

      {finding.primary_emission_source && (
        <span className="mt-4 inline-flex rounded-full bg-[#FFF5EE] px-3 py-1 text-xs font-bold capitalize text-[#A54A35]">
          Primary emission source: {finding.primary_emission_source}
        </span>
      )}

      {finding.specific_reason && <p className="mt-4 text-sm leading-6">Why this matters: {finding.specific_reason}</p>}

      {finding.alternative_product && (
        <div className="mt-5 rounded-xl border border-primary-green bg-light-green p-4">
          <h4 className="font-bold text-text-primary">Consider instead: {finding.alternative_product.name}</h4>
          <p className="mt-2 text-sm font-bold text-deep-green">{formatPercent(finding.alternative_product.co2_saved_percentage)}% lower carbon footprint</p>
          <p className="mt-2 text-sm leading-6">Why it is better: {finding.alternative_product.why_better}</p>
          <p className="mt-2 text-sm leading-6">Where to find it: {finding.alternative_product.where_to_find}</p>
        </div>
      )}

      <LearnMore>{learnMoreCopy.carbon(productData, location)}</LearnMore>
    </InsightCard>
  );
}

function RoutingCard({ finding, productData, location }) {
  return (
    <InsightCard borderColor="#52B788" iconColor="#52B788">
      <CardHeader icon={Truck} title="Supply chain and delivery impact" color="#52B788" />
      <p className="leading-7">
        This product travelled approximately {formatNumber(finding.estimated_transport_km)}km to reach you, primarily via {finding.primary_transport_mode}.
      </p>
      <p className="mt-3 text-sm leading-6">Transport emissions: about {formatNumber(finding.transport_emissions_gco2e)}g CO2e per unit</p>

      {finding.is_imported && (
        <span className="mt-4 inline-flex rounded-full bg-[#E8F5EE] px-3 py-1 text-xs font-bold text-deep-green">Imported product</span>
      )}

      {finding.issue_description && <p className="mt-4 text-sm leading-6">{finding.issue_description}</p>}

      {finding.local_alternative && (
        <div className="mt-5 rounded-xl border border-primary-green bg-light-green p-4">
          <h4 className="font-bold text-text-primary">A local alternative exists: {finding.local_alternative.description}</h4>
          <p className="mt-2 text-sm font-bold text-deep-green">
            Switching could reduce transport emissions by {formatPercent(finding.local_alternative.estimated_emission_reduction_percentage)}%
          </p>
          {finding.local_alternative.indian_brand_examples?.length > 0 && (
            <p className="mt-2 text-sm leading-6">Indian options include: {finding.local_alternative.indian_brand_examples.join(', ')}</p>
          )}
        </div>
      )}

      <LearnMore>{learnMoreCopy.routing(productData, location)}</LearnMore>
    </InsightCard>
  );
}

function ResourcesCard({ finding, productData, location }) {
  const concerns = Array.isArray(finding.resource_concerns) ? finding.resource_concerns : [];

  return (
    <InsightCard borderColor="#3B82F6" iconColor="#52B788">
      <CardHeader icon={Droplet} title="Resource intensity" color="#3B82F6" />

      <div className="grid gap-4">
        {concerns.map((concern, index) => {
          const isHigh = concern.severity === 'high';
          const tagClass = isHigh ? 'bg-[#FFF0EE] text-[#A54A35]' : 'bg-[#FFF5EE] text-[#A15C20]';

          return (
            <div key={`${concern.resource_type}-${index}`}>
              <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold capitalize ${tagClass}`}>
                {concern.resource_type}
              </span>
              {concern.specific_problem && <p className="mt-2 leading-7">{concern.specific_problem}</p>}
              {concern.quantified_impact && <p className="mt-1 text-xs font-medium leading-5 text-text-muted">{concern.quantified_impact}</p>}
            </div>
          );
        })}
      </div>

      {finding.sustainable_alternative && (
        <div className="mt-5 rounded-xl border border-primary-green bg-light-green p-4">
          <h4 className="font-bold text-text-primary">A more resource-efficient option: {finding.sustainable_alternative.product_description}</h4>
          <p className="mt-2 text-sm font-bold text-deep-green">Resource saving: {finding.sustainable_alternative.resource_saving}</p>
          <p className="mt-2 text-sm leading-6">Why: {finding.sustainable_alternative.why_better}</p>
        </div>
      )}

      <LearnMore>{learnMoreCopy.resources(productData, location)}</LearnMore>
    </InsightCard>
  );
}

function AlertCard({ finding, productData, location }) {
  const levelStyles = {
    advisory: { border: '#3B82F6', icon: '#3B82F6', bg: '#DBEAFE' },
    caution: { border: '#F4A261', icon: '#C96C17', bg: '#FDE9D5' },
    warning: { border: '#E76F51', icon: '#C94C2F', bg: '#FAD9D2' },
  };
  const style = levelStyles[finding.alert_level] || levelStyles.advisory;

  return (
    <InsightCard
      borderColor={style.border}
      iconColor="#52B788"
      className={finding.alert_level === 'warning' ? 'sustainability-warning-card' : ''}
    >
      <CardHeader icon={AlertTriangle} title={finding.alert_title} color={style.icon} />
      <p className="leading-7">{finding.alert_description}</p>

      <div className="mt-5 rounded-xl p-4" style={{ backgroundColor: style.bg }}>
        <p className="text-sm font-bold text-text-primary">What to do: {finding.recommended_action}</p>
      </div>

      {finding.expires_when && (
        <p className="mt-3 text-xs font-bold text-text-muted">This alert applies until: {finding.expires_when}</p>
      )}

      <LearnMore>{learnMoreCopy.alerts(productData, location)}</LearnMore>
    </InsightCard>
  );
}

export default function SustainabilityPanel({ scanData, user }) {
  const [status, setStatus] = useState('loading');
  const [findings, setFindings] = useState(null);
  const payload = useMemo(() => buildPayload(scanData, user), [scanData, user]);

  useEffect(() => {
    let active = true;

    const runAnalysis = async () => {
      try {
        setStatus('loading');
        const response = await sustainabilityApi.analyse(payload);
        if (!active) return;

        if (!response?.has_any_findings || !response.findings || Object.keys(response.findings).length === 0) {
          setFindings(null);
          setStatus('empty');
          return;
        }

        setFindings(response.findings);
        setStatus('ready');
      } catch (error) {
        console.error('Sustainability analysis failed:', error);
        if (active) {
          setFindings(null);
          setStatus('empty');
        }
      }
    };

    runAnalysis();
    return () => {
      active = false;
    };
  }, [payload]);

  if (status === 'loading') return <SustainabilitySkeleton />;
  if (status !== 'ready' || !findings) return null;

  const cards = [];
  if (findings.alerts?.has_alert) {
    cards.push(<AlertCard key="alerts" finding={findings.alerts} productData={payload.productData} location={payload.location} />);
  }
  if (findings.carbon?.has_issue) {
    cards.push(<CarbonCard key="carbon" finding={findings.carbon} productData={payload.productData} location={payload.location} />);
  }
  if (findings.routing?.applicable && findings.routing?.has_issue) {
    cards.push(<RoutingCard key="routing" finding={findings.routing} productData={payload.productData} location={payload.location} />);
  }
  if (findings.resources?.has_issue) {
    cards.push(<ResourcesCard key="resources" finding={findings.resources} productData={payload.productData} location={payload.location} />);
  }

  // Reject malformed responses rather than presenting a generic sustainability panel.
  if (cards.length === 0) return null;

  return (
    <motion.section className="mt-9" initial="hidden" animate="show" variants={panelVariants}>
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-light-green text-deep-green">
          <Leaf size={21} />
        </div>
        <h2 className="text-2xl">Sustainability insights for this product</h2>
      </div>

      <motion.div className="grid gap-4" variants={panelVariants}>
        {cards}
      </motion.div>

      <p className="mt-4 text-xs font-medium leading-5 text-text-muted">
        Sustainability estimates are based on available data and may vary. These are educational insights to support informed choices.
      </p>
    </motion.section>
  );
}
