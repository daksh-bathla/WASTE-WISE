import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  Camera,
  CircuitBoard,
  Leaf,
  Package,
  Recycle,
  ShieldCheck,
  Upload,
  HelpCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import AppLayout from '../components/AppLayout';
import { Button, Card, Input, PageHeader } from '../components/ui';

const scanTypes = [
  {
    id: 'expired_product',
    title: 'Expired product',
    text: 'Food, dairy, oils, spices, cosmetics, or household products.',
    icon: Package,
  },
  {
    id: 'food_peels',
    title: 'Food peels and scraps',
    text: 'Fruit peels, vegetable trimmings, seeds, rinds, or leftovers.',
    icon: Leaf,
  },
  {
    id: 'waste_packaging',
    title: 'Waste packaging',
    text: 'Glass bottles, plastic containers, cardboard, tins, cartons.',
    icon: Recycle,
  },
  {
    id: 'electronics',
    title: 'Old electronics',
    text: 'Phones, laptops, cables, appliances, screens, chargers.',
    icon: CircuitBoard,
  },
  {
    id: 'other',
    title: 'Other',
    text: 'Stationery, toys, clothing, furniture, tools, or anything else that doesn\'t fit above.',
    icon: HelpCircle,
  },
];

const options = {
  expired_product: ['Dairy', 'Oils and fats', 'Grains and flour', 'Spices', 'Cosmetics', 'Packaged food', 'Beverage', 'Other'],
  food_peels: ['Banana peel', 'Potato peel', 'Mango peel', 'Apple peel', 'Watermelon rind', 'Coconut shell', 'Mixed scraps', 'Other'],
  waste_packaging: ['Glass', 'Plastic', 'Cardboard', 'Metal', 'Fabric', 'Paper', 'Mixed material'],
  electronics: ['Mobile phone', 'Laptop', 'Tablet', 'TV or monitor', 'Kitchen appliance', 'Cable or charger', 'Audio device', 'Other'],
  other_materials: ['Plastic', 'Metal', 'Wood', 'Glass', 'Fabric', 'Rubber', 'Paper', 'Ceramic', 'Mixed materials', 'Not sure'],
  other_disposing: ['Broken', 'Upgraded to newer version', 'No longer needed', 'Moving home', 'Gifted or wrong item', 'Other reason'],
};

const initialForm = {
  itemName: '',
  category: '',
  expiryDate: '',
  expiryType: 'best_before',
  quantity: '',
  ingredients: '',
  condition: '',
  notes: '',
  materialType: '',
  packagingMaterial: '',
  size: '',
  hasResidue: false,
  brand: '',
  age: '',
  issue: '',
  materials: [],
  disposingReasons: [],
  originalPurpose: '',
};

const mapCategoryToOption = (type, data) => {
  const cat = (data.category || '').toLowerCase();
  const material = (data.packaging_material || '').toLowerCase();
  
  if (type === 'expired_product') {
    if (cat.includes('dairy') || cat.includes('milk') || cat.includes('curd') || cat.includes('yogurt')) return 'Dairy';
    if (cat.includes('oil') || cat.includes('fat') || cat.includes('butter')) return 'Oils and fats';
    if (cat.includes('grain') || cat.includes('flour') || cat.includes('rice') || cat.includes('wheat')) return 'Grains and flour';
    if (cat.includes('spice') || cat.includes('masala')) return 'Spices';
    if (cat.includes('cosmetics') || cat.includes('cream') || cat.includes('shampoo') || cat.includes('soap')) return 'Cosmetics';
    if (cat.includes('beverage') || cat.includes('drink') || cat.includes('juice') || cat.includes('soda')) return 'Beverage';
    if (cat.includes('packaged') || cat.includes('food') || cat.includes('biscuit') || cat.includes('snack')) return 'Packaged food';
    return 'Other';
  }
  
  if (type === 'food_peels') {
    if (cat.includes('banana')) return 'Banana peel';
    if (cat.includes('potato')) return 'Potato peel';
    if (cat.includes('mango')) return 'Mango peel';
    if (cat.includes('apple')) return 'Apple peel';
    if (cat.includes('watermelon')) return 'Watermelon rind';
    if (cat.includes('coconut')) return 'Coconut shell';
    if (cat.includes('peel') || cat.includes('scrap') || cat.includes('leftover')) return 'Mixed scraps';
    return 'Other';
  }
  
  if (type === 'waste_packaging') {
    if (material.includes('glass')) return 'Glass';
    if (material.includes('plastic')) return 'Plastic';
    if (material.includes('cardboard')) return 'Cardboard';
    if (material.includes('metal') || material.includes('tin') || material.includes('aluminum')) return 'Metal';
    if (material.includes('fabric') || material.includes('cloth')) return 'Fabric';
    if (material.includes('paper')) return 'Paper';
    return 'Mixed material';
  }
  
  if (type === 'electronics') {
    if (cat.includes('phone') || cat.includes('mobile')) return 'Mobile phone';
    if (cat.includes('laptop') || cat.includes('computer')) return 'Laptop';
    if (cat.includes('tablet') || cat.includes('ipad')) return 'Tablet';
    if (cat.includes('tv') || cat.includes('monitor') || cat.includes('screen')) return 'TV or monitor';
    if (cat.includes('appliance') || cat.includes('kitchen') || cat.includes('microwave')) return 'Kitchen appliance';
    if (cat.includes('cable') || cat.includes('charger') || cat.includes('wire')) return 'Cable or charger';
    if (cat.includes('audio') || cat.includes('speaker') || cat.includes('headphone')) return 'Audio device';
    return 'Other';
  }
  
  return '';
};

const mapConditionToOption = (type, riskIndicators = []) => {
  const risks = riskIndicators.map(r => r.toLowerCase()).join(' ');
  
  if (type === 'food_peels') {
    if (risks.includes('mould') || risks.includes('mold') || risks.includes('rot')) return 'Mold visible';
    if (risks.includes('dry') || risks.includes('wilt')) return 'Slightly dry';
    if (risks.includes('ripe') || risks.includes('soft')) return 'Overripe';
    return 'Fresh';
  }
  
  if (type === 'waste_packaging') {
    if (risks.includes('dirty') || risks.includes('residue') || risks.includes('smell')) return 'Has food residue';
    if (risks.includes('damage') || risks.includes('crack') || risks.includes('break')) return 'Damaged';
    return 'Clean';
  }
  
  if (type === 'electronics') {
    if (risks.includes('battery') || risks.includes('swell')) return 'Damaged battery';
    if (risks.includes('screen') || risks.includes('crack')) return 'Broken screen';
    if (risks.includes('not working') || risks.includes('dead') || risks.includes('broken')) return 'Not working';
    return 'Working';
  }
  
  return '';
};

const fileToBase64 = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => {
    const result = reader.result;
    resolve(typeof result === 'string' && result.includes(',') ? result.split(',')[1] : result);
  };
  reader.onerror = reject;
  reader.readAsDataURL(file);
});

export default function ScanPage() {
  const [scanType, setScanType] = useState('');
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [visionLoading, setVisionLoading] = useState(false);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const navigate = useNavigate();

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
    setVisionLoading(true);

    try {
      const toastId = toast.loading('AI is reading image...');
      const { scanApi } = await import('../utils/backendApi');
      const photoData = await fileToBase64(file);
      const data = await scanApi.vision({
        photo_data: photoData,
        photo_mime: file.type || 'image/jpeg',
      });

      toast.success('Product details auto-filled!', { id: toastId });
      
      setForm((current) => ({
        ...current,
        itemName: data.product_name || (data.brand ? `${data.brand} ${data.product_name || ''}`.trim() : current.itemName),
        brand: data.brand || current.brand,
        packagingMaterial: data.packaging_material || current.packagingMaterial,
        category: mapCategoryToOption(scanType, data) || current.category,
        expiryDate: data.expiry_date || current.expiryDate,
        expiryType: ['best_before', 'use_by', 'expiry_date'].includes(data.expiry_type) ? data.expiry_type : current.expiryType,
        ingredients: Array.isArray(data.ingredients) ? data.ingredients.join(', ') : data.ingredients || current.ingredients,
        condition: mapConditionToOption(scanType, data.risk_indicators || []) || current.condition,
        quantity: data.quantity || current.quantity,
        notes: data.risk_indicators?.length ? `Detected concerns: ${data.risk_indicators.join(', ')}` : current.notes,
      }));
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'AI analysis failed.');
    } finally {
      setVisionLoading(false);
    }
  };

  const handleQuickScan = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
    setVisionLoading(true);

    try {
      const toastId = toast.loading('AI is detecting product category...');
      const { scanApi } = await import('../utils/backendApi');
      const photoData = await fileToBase64(file);
      const data = await scanApi.vision({
        photo_data: photoData,
        photo_mime: file.type || 'image/jpeg',
      });

      toast.success('Category detected!', { id: toastId });
      
      let detectedScanType = 'other';
      if (data.detected_category) {
        detectedScanType = data.detected_category;
      } else {
        const categoryLower = (data.category || '').toLowerCase();
        if (categoryLower.includes('peel') || categoryLower === 'peels' || categoryLower.includes('scrap')) {
          detectedScanType = 'food_peels';
        } else if (categoryLower.includes('packaging') || ['glass', 'plastic', 'cardboard', 'metal', 'fabric', 'paper', 'mixed material'].includes(data.packaging_material?.toLowerCase() || '')) {
          detectedScanType = 'waste_packaging';
        } else if (categoryLower.includes('electronic') || categoryLower.includes('phone') || categoryLower.includes('laptop') || categoryLower.includes('tv') || categoryLower.includes('appliance')) {
          detectedScanType = 'electronics';
        } else if (categoryLower.includes('expired')) {
          detectedScanType = 'expired_product';
        }
      }

      setScanType(detectedScanType);
      
      const newForm = {
        ...initialForm,
        itemName: data.product_name || (data.brand ? `${data.brand} ${data.product_name || ''}`.trim() : ''),
        brand: data.brand || '',
        packagingMaterial: data.packaging_material || '',
        category: mapCategoryToOption(detectedScanType, data),
        expiryDate: data.expiry_date || '',
        expiryType: ['best_before', 'use_by', 'expiry_date'].includes(data.expiry_type) ? data.expiry_type : 'best_before',
        ingredients: Array.isArray(data.ingredients) ? data.ingredients.join(', ') : data.ingredients || '',
        condition: mapConditionToOption(detectedScanType, data.risk_indicators || []),
        quantity: data.quantity || '',
        notes: data.risk_indicators?.length ? `Detected concerns: ${data.risk_indicators.join(', ')}` : '',
      };
      
      // Map components to materials for 'other'
      if (detectedScanType === 'other' && data.key_components) {
         newForm.materials = Array.isArray(data.key_components) ? data.key_components : [data.key_components];
      }
      
      setForm(newForm);

      if (data.confidence_score !== undefined && data.confidence_score < 80) {
        toast('Please review the selected category and details. AI confidence was low.', { icon: '⚠️', duration: 4000 });
      }
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'AI analysis failed.');
      setScanType('other');
    } finally {
      setVisionLoading(false);
    }
  };

  const selectedType = scanTypes.find((type) => type.id === scanType);
  const Icon = selectedType?.icon || Camera;

  const update = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  const chooseType = (type) => {
    setScanType(type);
    setForm(initialForm);
  };

  const validate = () => {
    if (!scanType) return 'Choose what you are scanning';
    if (scanType === 'electronics') {
      if (!form.category) return 'Choose the device category';
      if (!form.condition) return 'Choose device condition';
      return '';
    }
    if (!form.itemName.trim() && !form.category) return 'Add an item name or category';
    return '';
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const error = validate();
    if (error) {
      toast.error(error);
      return;
    }

    setLoading(true);
    window.setTimeout(() => {
      navigate('/processing', {
        state: {
          scanType,
          itemName: form.itemName || form.category || 'your item',
          form,
          photoFile,
        },
      });
      setLoading(false);
    }, 450);
  };

  if (!scanType) {
    return (
      <AppLayout>
        <div className="page-shell section-compact">
          <PageHeader
            eyebrow="New scan"
            title="What are you scanning?"
            subtitle="Choose the closest type. You can add a photo, describe the item, and refine details before analysis."
          />

          <div className="surface-card p-6 mb-8 bg-gradient-to-br from-[#eefbf2] via-white to-[#eefbf2] border-2 border-dashed border-[#b8e6c1] relative overflow-hidden flex flex-col sm:flex-row items-center justify-between gap-6 transition-all duration-300 hover:border-deep-green">
            <div className="flex gap-4 items-center">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#52b788] text-white shadow-lg shadow-green-200">
                <Camera size={27} />
              </div>
              <div>
                <h3 className="text-deep-green font-bold">Quick AI Image Scan</h3>
                <p className="text-sm mt-1 leading-relaxed">
                  Upload or capture a photo first. AI will auto-detect the type and fill details for you!
                </p>
              </div>
            </div>
            
            <label className="btn btn-primary cursor-pointer">
              {visionLoading ? (
                <>
                  <div className="spinner spinner-sm mr-2" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Upload size={18} />
                  Scan / Upload Photo
                </>
              )}
              <input 
                type="file" 
                accept="image/*" 
                className="hidden" 
                disabled={visionLoading}
                onChange={handleQuickScan} 
              />
            </label>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            {scanTypes.map(({ id, title, text, icon: TypeIcon }) => (
              <button key={id} type="button" className="choice-card p-6" onClick={() => chooseType(id)}>
                <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-light-purple text-deep-purple">
                  <TypeIcon size={27} />
                </div>
                <h3>{title}</h3>
                <p className="mt-3 leading-7">{text}</p>
                <div className="mt-6 flex items-center gap-2 font-bold text-deep-purple">
                  Select <ArrowRight size={17} />
                </div>
              </button>
            ))}
          </div>

          <Card className="mt-6 border-warning bg-[#FFF5EE]">
            <div className="flex gap-3">
              <AlertTriangle size={22} className="mt-1 shrink-0 text-warning" />
              <p className="leading-7">
                WasteWise will never suggest unsafe consumption of expired items. Sensitive results include safety
                gates, patch-test guidance, and disposal paths when reuse is not appropriate.
              </p>
            </div>
          </Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="page-shell section-compact">
        <PageHeader
          eyebrow="Scan details"
          title={selectedType.title}
          subtitle="Add enough detail for component-level suggestions. You can still submit with partial information."
          onBackClick={() => setScanType('')}
        />

        <form className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]" onSubmit={handleSubmit}>
          <Card className="h-fit relative">
            <div className="scan-frame flex flex-col items-center justify-center p-6 text-center relative overflow-hidden min-h-[220px]">
              {photoPreview ? (
                <img src={photoPreview} alt="Preview" className="absolute inset-0 w-full h-full object-cover rounded-2xl" />
              ) : (
                <>
                  <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-white text-deep-purple shadow-card">
                    <Upload size={29} />
                  </div>
                  <h3 className="mt-5">Add a photo</h3>
                  <p className="mt-2 max-w-xs text-sm leading-6">
                    A clear photo helps separate packaging, edible parts, peels, labels, and damaged components.
                  </p>
                </>
              )}
              
              {visionLoading && (
                <div className="absolute inset-0 bg-white/80 z-20 flex flex-col items-center justify-center backdrop-blur-sm">
                  <div className="spinner spinner-lg mb-4" />
                  <p className="font-bold text-deep-purple">AI is reading product details...</p>
                </div>
              )}

              <label className={`mt-5 cursor-pointer rounded-xl px-5 py-2.5 font-bold transition-all ${photoPreview ? 'bg-white/90 text-deep-purple z-10 backdrop-blur-sm hover:bg-white' : 'bg-[#E8E0F0] text-deep-purple hover:bg-[#DBCDE8]'}`}>
                {photoPreview ? 'Change photo' : 'Choose photo'}
                <input 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  disabled={visionLoading}
                  onChange={handlePhotoUpload} 
                />
              </label>
            </div>

            <div className="mt-5 rounded-2xl border border-primary-green bg-light-green p-4">
              <div className="mb-2 flex items-center gap-2 font-bold text-text-primary">
                <ShieldCheck size={18} className="text-deep-green" />
                Safety first
              </div>
              <p className="text-sm leading-6">
                If an item looks moldy, smells sharp, leaks, or contains batteries, WasteWise will prioritize disposal
                and certified handling.
              </p>
            </div>
          </Card>

          <Card className="p-7">
            <div className="mb-6 flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-light-purple text-deep-purple">
                <Icon size={24} />
              </div>
              <div>
                <h3>{selectedType.title}</h3>
                <p className="text-sm">Fill what you know.</p>
              </div>
            </div>

            {scanType === 'expired_product' && <ExpiredProductFields form={form} update={update} />}
            {scanType === 'food_peels' && <FoodPeelFields form={form} update={update} />}
            {scanType === 'waste_packaging' && <PackagingFields form={form} update={update} />}
            {scanType === 'electronics' && <ElectronicsFields form={form} update={update} />}
            {scanType === 'other' && <OtherFields form={form} update={update} />}

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <Button variant="secondary" onClick={() => setScanType('')}>Change type</Button>
              <Button type="submit" variant={scanType === 'electronics' ? 'success' : 'primary'} loading={loading}>
                Analyse item <ArrowRight size={17} />
              </Button>
            </div>
          </Card>
        </form>
      </div>
    </AppLayout>
  );
}

function ExpiredProductFields({ form, update }) {
  return (
    <div className="grid gap-5">
      <Input label="Product name" placeholder="Example: curd, coconut oil, face cream" value={form.itemName} onChange={(e) => update('itemName', e.target.value)} />
      <SelectField label="Category" value={form.category} onChange={(value) => update('category', value)} options={options.expired_product} />
      <div className="grid gap-5 md:grid-cols-2">
        <Input label="Expiry date" type="date" value={form.expiryDate} onChange={(e) => update('expiryDate', e.target.value)} />
        <SelectField label="Date type" value={form.expiryType} onChange={(value) => update('expiryType', value)} options={['best_before', 'use_by', 'expiry_date']} format />
      </div>
      <Input label="Quantity left" placeholder="Example: 200 ml, half bottle, 3 spoons" value={form.quantity} onChange={(e) => update('quantity', e.target.value)} />
      <TextArea label="Ingredients or label notes" placeholder="Paste key ingredients if visible" value={form.ingredients} onChange={(e) => update('ingredients', e.target.value)} />
    </div>
  );
}

function FoodPeelFields({ form, update }) {
  return (
    <div className="grid gap-5">
      <Input label="What scraps do you have?" placeholder="Example: banana peels and apple cores" value={form.itemName} onChange={(e) => update('itemName', e.target.value)} />
      <SelectField label="Main scrap type" value={form.category} onChange={(value) => update('category', value)} options={options.food_peels} />
      <div className="grid gap-5 md:grid-cols-2">
        <Input label="Quantity" placeholder="Example: 500 g, 6 peels" value={form.quantity} onChange={(e) => update('quantity', e.target.value)} />
        <SelectField label="Condition" value={form.condition} onChange={(value) => update('condition', value)} options={['Fresh', 'Slightly dry', 'Overripe', 'Mold visible', 'Mixed condition']} />
      </div>
      <TextArea label="Notes" placeholder="Any salt, oil, spice, or contamination?" value={form.notes} onChange={(e) => update('notes', e.target.value)} />
    </div>
  );
}

function PackagingFields({ form, update }) {
  return (
    <div className="grid gap-5">
      <Input label="Packaging item" placeholder="Example: glass jar, milk carton, plastic bottle" value={form.itemName} onChange={(e) => update('itemName', e.target.value)} />
      <SelectField label="Material" value={form.materialType || form.category} onChange={(value) => { update('materialType', value); update('category', value); }} options={options.waste_packaging} />
      <div className="grid gap-5 md:grid-cols-2">
        <SelectField label="Size" value={form.size} onChange={(value) => update('size', value)} options={['Small', 'Medium', 'Large', 'Bulk']} />
        <SelectField label="Condition" value={form.condition} onChange={(value) => update('condition', value)} options={['Clean', 'Has food residue', 'Damaged', 'Chemical residue', 'Mixed']} />
      </div>
      <label className="flex items-center gap-3 rounded-2xl border border-border p-4 font-bold text-text-secondary">
        <input type="checkbox" checked={form.hasResidue} onChange={(event) => update('hasResidue', event.target.checked)} className="h-4 w-4 accent-deep-purple" />
        It has residue or smell
      </label>
    </div>
  );
}

function ElectronicsFields({ form, update }) {
  return (
    <div className="grid gap-5">
      <SelectField label="Device category" value={form.category} onChange={(value) => update('category', value)} options={options.electronics} />
      <Input label="Brand or model" placeholder="Optional" value={form.brand} onChange={(e) => update('brand', e.target.value)} />
      <div className="grid gap-5 md:grid-cols-2">
        <SelectField label="Device age" value={form.age} onChange={(value) => update('age', value)} options={['Less than 2 years', '2-5 years', '5-10 years', 'More than 10 years']} />
        <SelectField label="Condition" value={form.condition} onChange={(value) => update('condition', value)} options={['Working', 'Minor issue', 'Not working', 'Damaged battery', 'Broken screen', 'Unknown']} />
      </div>
      <TextArea label="Specific issue" placeholder="Example: battery swollen, screen cracked, charger not working" value={form.issue} onChange={(e) => update('issue', e.target.value)} />
      <div className="rounded-2xl border border-danger bg-[#FFF0EE] p-4">
        <div className="mb-2 flex items-center gap-2 font-bold text-text-primary">
          <AlertTriangle size={18} className="text-danger" />
          Certified handling required
        </div>
        <p className="text-sm leading-6">
          Do not open batteries, screens, or circuit boards at home. Results will prioritize repair, resale, donation,
          salvage, and certified recycling.
        </p>
      </div>
    </div>
  );
}

function SelectField({ label, value, onChange, options: fieldOptions, format = false }) {
  return (
    <div>
      <label className="input-label">{label}</label>
      <select className="input-field" value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">Select</option>
        {fieldOptions.map((option) => (
          <option key={option} value={option}>
            {format ? option.replaceAll('_', ' ') : option}
          </option>
        ))}
      </select>
    </div>
  );
}

function TextArea({ label, value, onChange, placeholder }) {
  return (
    <div>
      <label className="input-label">{label}</label>
      <textarea className="input-field min-h-[110px] resize-y" value={value} onChange={onChange} placeholder={placeholder} />
    </div>
  );
}

function MultiSelectChips({ label, options, selected, onChange }) {
  const toggle = (opt) => {
    if (selected.includes(opt)) {
      onChange(selected.filter((item) => item !== opt));
    } else {
      onChange([...selected, opt]);
    }
  };

  return (
    <div>
      <label className="input-label mb-2 block">{label}</label>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => toggle(opt)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              selected.includes(opt)
                ? 'bg-deep-purple text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}

function OtherFields({ form, update }) {
  return (
    <div className="grid gap-5">
      <Input label="Item name *" placeholder="Example: Ballpoint pen, wooden chair, plastic toy" value={form.itemName} onChange={(e) => update('itemName', e.target.value)} required />
      
      <MultiSelectChips 
        label="Item material (select one or more)" 
        options={options.other_materials} 
        selected={form.materials} 
        onChange={(val) => update('materials', val)} 
      />
      
      <div className="grid gap-5 md:grid-cols-2">
        <SelectField label="Item condition" value={form.condition} onChange={(value) => update('condition', value)} options={['Working but unwanted', 'Broken or damaged', 'Partially functional', 'Completely non-functional']} />
        <SelectField label="Approximate age" value={form.age} onChange={(value) => update('age', value)} options={['Less than 1 year', '1 to 3 years', '3 to 5 years', 'More than 5 years']} />
      </div>
      
      <SelectField label="Size" value={form.size} onChange={(value) => update('size', value)} options={['Small (fits in a hand)', 'Medium (fits in a bag)', 'Large (furniture or appliance sized)']} />
      
      <Input label="Original purpose (optional)" placeholder="What was this item originally used for?" value={form.originalPurpose} onChange={(e) => update('originalPurpose', e.target.value)} />
      
      <MultiSelectChips 
        label="Why are you disposing? (optional)" 
        options={options.other_disposing} 
        selected={form.disposingReasons} 
        onChange={(val) => update('disposingReasons', val)} 
      />
    </div>
  );
}
