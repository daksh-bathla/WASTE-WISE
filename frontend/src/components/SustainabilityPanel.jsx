import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, ChevronDown, Leaf } from 'lucide-react';
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
    .map((item) => item.trim())
    .filter(Boolean);
};

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const formatNumber = (value) => {
  const parsed = toNumber(value);
  return parsed === null ? 'unknown' : Math.round(parsed).toLocaleString('en-IN');
};

const formatPercent = (value) => {
  const parsed = toNumber(value);
  return parsed === null ? 'unknown' : Math.round(parsed).toLocaleString('en-IN');
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
      product_name: item.product_name || form.itemName || rawInput.product_name || 'Unknown item',
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
  alerts: (finding, productData, location) =>
    `This insight is tied to ${productData.product_name} in ${location.city}. Local AQI, humidity, temperature, and season can change whether storage, use, or disposal should wait for better conditions.`,
  carbon: (finding, productData, location) =>
    `For ${productData.category} products reaching ${location.city}, lifecycle impact comes from ingredients, packaging, manufacturing energy, transport, and disposal. Comparing ${formatNumber(finding.estimated_gco2e)}g CO2e with the Indian category average helps separate normal products from unusually intensive ones.`,
  routing: (finding, productData, location) =>
    `For a user in ${location.city}, transport impact matters most when an imported or long-distance product has a practical Indian equivalent. The useful signal here is the route, the main transport mode, and whether a realistic local option exists.`,
  resources: (finding, productData, location) =>
    `Resource pressure in ${location.state} can vary by water availability, electricity demand, land use, and season. This check only appears when ${productData.product_name} has a concern that is meaningfully higher than similar ${productData.category} products.`,
};

function SustainabilitySkeleton() {
  return (
    <div className="mt-8 grid gap-3" aria-label="Loading sustainability insights">
      <div className="h-5 w-56 animate-pulse rounded-full bg-border-light" />
      <div className="rounded-xl border border-border bg-white p-5">
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
      className={`relative overflow-hidden rounded-xl border border-l-4 border-border bg-white p-5 shadow-card ${className}`}
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

function pickPrimaryFinding(findings = {}) {
  const candidates = [];

  if (findings.carbon) {
    const estimated = toNumber(findings.carbon.estimated_gco2e) || 0;
    const average = toNumber(findings.carbon.category_average_gco2e) || 0;
    const aboveAverage = toNumber(findings.carbon.percentage_above_average);
    const computedAboveAverage = average > 0 ? ((estimated - average) / average) * 100 : 0;
    const percent = aboveAverage ?? computedAboveAverage ?? 0;
    candidates.push({ type: 'carbon', score: percent >= 30 ? 3 : percent >= 10 ? 2 : 1, finding: findings.carbon });
  }

  if (findings.routing) {
    const transportEmissions = toNumber(findings.routing.transport_emissions_gco2e) || 0;
    const score = (findings.routing.is_imported ? 1 : 0) + (transportEmissions >= 100 ? 2 : transportEmissions >= 50 ? 1 : 0);
    candidates.push({ type: 'routing', score, finding: findings.routing });
  }

  if (findings.resources) {
    const highSeverity = (findings.resources.resource_concerns || []).filter((concern) => concern.severity === 'high').length;
    const score = highSeverity > 0 ? 3 : (findings.resources.resource_concerns || []).length > 0 ? 2 : 0;
    candidates.push({ type: 'resources', score, finding: findings.resources });
  }

  if (!candidates.length) return null;

  candidates.sort((left, right) => right.score - left.score || (left.type === 'carbon' ? -1 : 0));
  return candidates[0];
}

function RecommendationCard({ primaryFinding, productData, location, alertFinding }) {
  const primaryType = primaryFinding?.type || 'carbon';
  const finding = primaryFinding?.finding;

  const carbonAlternative = finding?.alternative_product;
  const routingAlternative = finding?.local_alternative;
  const resourceAlternative = finding?.sustainable_alternative;

  const headline =
    primaryType === 'routing'
      ? 'A local or regional alternative could cut delivery impact for this category.'
      : primaryType === 'resources'
        ? 'A more resource-efficient choice is worth considering for your next purchase.'
        : 'A lower-carbon alternative exists for this category — here is what to look for next time.';

  const summary =
    primaryType === 'routing'
      ? `A locally sourced or regionally produced option may be a better fit for ${productData.category || 'this category'} and can cut the transport story significantly.`
      : primaryType === 'resources'
        ? `A better option in this category can reduce pressure on water, land, or energy while still meeting your needs.`
        : `A better option in ${productData.category || 'this category'} may offer a lower footprint while keeping the same practical use.`;

  const bullets = [];

  if (primaryType === 'carbon' && carbonAlternative) {
    bullets.push(`Look for ${carbonAlternative.name} if you want a lower-footprint swap.`);
    if (carbonAlternative.co2_saved_percentage !== null && carbonAlternative.co2_saved_percentage !== undefined) {
      bullets.push(`${formatPercent(carbonAlternative.co2_saved_percentage)}% lower carbon footprint than the usual option.`);
    }
    if (finding?.specific_reason) {
      bullets.push(finding.specific_reason);
    }
  } else if (primaryType === 'routing' && routingAlternative) {
    bullets.push(`A local swap such as ${routingAlternative.description} is worth considering.`);
    if (routingAlternative.estimated_emission_reduction_percentage !== null && routingAlternative.estimated_emission_reduction_percentage !== undefined) {
      bullets.push(`Switching could reduce transport emissions by ${formatPercent(routingAlternative.estimated_emission_reduction_percentage)}%.`);
    }
    if (finding?.issue_description) {
      bullets.push(finding.issue_description);
    }
  } else if (primaryType === 'resources' && resourceAlternative) {
    bullets.push(`A more resource-efficient option like ${resourceAlternative.product_description} may be a better fit.`);
    if (resourceAlternative.resource_saving) {
      bullets.push(`Resource saving: ${resourceAlternative.resource_saving}.`);
    }
    if (finding?.resource_concerns?.length) {
      bullets.push(`${finding.resource_concerns[0].specific_problem}`);
    }
  }

  if (alertFinding) {
    bullets.push(`Current conditions are also worth noting: ${alertFinding.alert_description || 'a short-lived environmental condition may affect use or disposal right now.'}`);
  }

  return (
    <InsightCard borderColor="#52B788" iconColor="#52B788">
      <CardHeader icon={Leaf} title="Next time you buy this →" color="#52B788" />
      <p className="leading-7">{headline}</p>
      <p className="mt-3 text-sm leading-7 text-text-secondary">{summary}</p>

      <div className="mt-5 rounded-xl border border-border bg-[#F8FAFC] p-4">
        <h4 className="font-bold text-text-primary">What to look for next time</h4>
        <ul className="mt-3 space-y-2 text-sm leading-6 text-text-secondary">
          {bullets.map((bullet, index) => (
            <li key={`${bullet}-${index}`} className="flex gap-2">
              <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-primary-green" />
              <span>{bullet}</span>
            </li>
          ))}
        </ul>
      </div>

      {primaryType === 'carbon' && carbonAlternative && (
        <div className="mt-5 rounded-xl border border-primary-green bg-light-green p-4">
          <h4 className="font-bold text-text-primary">Good swap to consider: {carbonAlternative.name}</h4>
          <p className="mt-2 text-sm font-bold text-deep-green">{formatPercent(carbonAlternative.co2_saved_percentage)}% lower carbon footprint</p>
          <p className="mt-2 text-sm leading-6">Why it is better: {carbonAlternative.why_better}</p>
          <p className="mt-2 text-sm leading-6">Where to find it: {carbonAlternative.where_to_find}</p>
        </div>
      )}

      {primaryType === 'routing' && routingAlternative && (
        <div className="mt-5 rounded-xl border border-primary-green bg-light-green p-4">
          <h4 className="font-bold text-text-primary">Good swap to consider: {routingAlternative.description}</h4>
          <p className="mt-2 text-sm font-bold text-deep-green">Switching could reduce transport impact by {formatPercent(routingAlternative.estimated_emission_reduction_percentage)}%</p>
          {routingAlternative.indian_brand_examples?.length > 0 && (
            <p className="mt-2 text-sm leading-6">Indian options include: {routingAlternative.indian_brand_examples.join(', ')}</p>
          )}
        </div>
      )}

      {primaryType === 'resources' && resourceAlternative && (
        <div className="mt-5 rounded-xl border border-primary-green bg-light-green p-4">
          <h4 className="font-bold text-text-primary">Good swap to consider: {resourceAlternative.product_description}</h4>
          <p className="mt-2 text-sm font-bold text-deep-green">Resource saving: {resourceAlternative.resource_saving}</p>
          <p className="mt-2 text-sm leading-6">Why it is better: {resourceAlternative.why_better}</p>
        </div>
      )}

      <LearnMore>{learnMoreCopy.alerts(alertFinding || {}, productData, location)}</LearnMore>
    </InsightCard>
  );
}

function AlertCard({ finding, productData, location }) {
  const levelStyles = {
    advisory: { border: '#3B82F6', icon: '#3B82F6', bg: '#EFF6FF' },
    caution: { border: '#F4A261', icon: '#F4A261', bg: '#FFF5EE' },
    warning: { border: '#E76F51', icon: '#E76F51', bg: '#FFF0EE' },
  };
  const style = levelStyles[finding.alert_level] || levelStyles.advisory;

  return (
    <InsightCard
      borderColor={style.border}
      iconColor="#52B788"
      className={finding.alert_level === 'warning' ? 'sustainability-warning-card' : ''}
    >
      <CardHeader icon={AlertTriangle} title={finding.alert_title || 'Current condition note'} color={style.icon} />
      <p className="leading-7">{finding.alert_description}</p>

      {finding.recommended_action && (
        <div className="mt-5 rounded-xl p-4" style={{ backgroundColor: style.bg }}>
          <p className="text-sm font-bold text-text-primary">What to do: {finding.recommended_action}</p>
        </div>
      )}

      {finding.expires_when && (
        <p className="mt-3 text-xs font-bold text-text-muted">This alert applies until: {finding.expires_when}</p>
      )}

      <LearnMore>{learnMoreCopy.alerts(finding, productData, location)}</LearnMore>
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
        if (!response?.has_any_findings) {
          setFindings(null);
          setStatus('empty');
          return;
        }
        setFindings(response.findings || {});
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
  if (status !== 'ready' || !findings || Object.keys(findings).length === 0) return null;

  const primaryRecommendation = pickPrimaryFinding(findings);
  const showAlertCard = Boolean(findings.alerts);

  const cards = [];
  if (showAlertCard) {
    cards.push(<AlertCard key="alert" finding={findings.alerts} productData={payload.productData} location={payload.location} />);
  }
  if (primaryRecommendation) {
    cards.push(
      <RecommendationCard
        key="recommendation"
        primaryFinding={primaryRecommendation}
        productData={payload.productData}
        location={payload.location}
        alertFinding={findings.alerts}
      />
    );
  }

  if (cards.length === 0) return null;

  return (
    <motion.section className="mt-9" initial="hidden" animate="show" variants={panelVariants}>
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-light-green text-deep-green">
          <Leaf size={21} />
        </div>
        <h2 className="text-2xl">Next time you buy this →</h2>
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
