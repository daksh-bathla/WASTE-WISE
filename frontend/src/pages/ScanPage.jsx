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
  food_peels: ['Banana peel', 'Orange peel', 'Potato peel', 'Mango peel', 'Apple peel', 'Watermelon rind', 'Coconut shell', 'Mixed scraps', 'Other'],
  waste_packaging: ['Glass', 'Plastic', 'Cardboard', 'Metal', 'Fabric', 'Paper', 'Mixed material'],
  electronics: ['Mobile phone', 'Laptop', 'Tablet', 'TV or monitor', 'Kitchen appliance', 'Cable or charger', 'Audio device', 'Other'],
  other_materials: ['Plastic', 'Metal', 'Wood', 'Glass', 'Fabric', 'Rubber', 'Paper', 'Ceramic', 'Mixed materials', 'Not sure'],
  other_disposing: ['Broken', 'Upgraded to newer version', 'No longer needed', 'Moving home', 'Gifted or wrong item', 'Other reason'],
};

const questionnaireOptions = {
  productForms: ['Powder', 'Liquid', 'Paste / Cream', 'Solid', 'Whole', 'Peels / Scraps', 'Granules'],
  reuseGoals: [
    { label: 'Body & Skin Care', value: 'skin_hair' },
    { label: 'Kitchen (non-edible reuse)', value: 'kitchen_non_edible' },
    { label: 'Plants & Gardening', value: 'garden_plants' },
    { label: 'Cleaning & Polish', value: 'cleaning' },
    { label: 'Creative DIY Crafts', value: 'craft_diy' },
    { label: 'Responsible Disposal', value: 'disposal' },
  ],
  householdItems: ['Honey', 'Coconut oil', 'Lemon / Vinegar', 'Baking soda', 'Besan (Gram flour)', 'Turmeric', 'Sugar / Jaggery', 'Salt', 'Curd / Yogurt', 'Aloe vera'],
};

const normalizeChatOption = (option) => {
  if (typeof option === 'string') return { value: option, label: option };
  return { value: option.value, label: option.label || option.value };
};

const getChatbotFlow = (scanType) => {
  const flows = {
    expired_product: {
      subtitle: 'Expired product reuse planner',
      steps: [
        {
          id: 'name',
          message: 'What expired product are you scanning? (e.g. turmeric powder, sour curd, face cream)',
          input: 'text',
          field: 'itemName',
          placeholder: 'Type product name...',
        },
        {
          id: 'form',
          message: 'What physical form is this product in?',
          input: 'select',
          field: 'productForm',
          options: questionnaireOptions.productForms,
        },
        {
          id: 'goals',
          message: 'What would you like to explore for this item?',
          input: 'multiselect',
          field: 'reuseGoals',
          options: questionnaireOptions.reuseGoals,
        },
        {
          id: 'household',
          message: 'Do you have any of these at home to combine with? (optional)',
          input: 'multiselect',
          field: 'availableItems',
          options: questionnaireOptions.householdItems,
          optional: true,
        },
        { id: 'confirm', message: 'Ready! We will match verified reuse ideas from the dataset and add AI suggestions when needed.', input: 'confirm' },
      ],
    },
    food_peels: {
      subtitle: 'Peels & scraps assistant',
      steps: [
        {
          id: 'name',
          message: 'What peels or food scraps do you have? (e.g. orange peel, banana peel, potato peels)',
          input: 'text',
          field: 'itemName',
          placeholder: 'Type peel or scrap name...',
        },
        {
          id: 'type',
          message: 'Which scrap type is the closest match?',
          input: 'select',
          field: 'category',
          options: options.food_peels,
        },
        {
          id: 'condition',
          message: 'What condition are the peels in?',
          input: 'select',
          field: 'condition',
          options: ['Fresh', 'Slightly dry', 'Overripe', 'Mold visible', 'Mixed condition'],
        },
        {
          id: 'quantity',
          message: 'Roughly how much do you have? (optional)',
          input: 'text',
          field: 'quantity',
          placeholder: 'e.g. 6 peels, 500 g',
          optional: true,
        },
        { id: 'confirm', message: 'Great — we will pull verified peel reuse ideas from the dataset.', input: 'confirm' },
      ],
    },
    waste_packaging: {
      subtitle: 'Packaging reuse assistant',
      steps: [
        {
          id: 'name',
          message: 'What packaging item are you scanning? (e.g. plastic bottle, glass jar, milk carton)',
          input: 'text',
          field: 'itemName',
          placeholder: 'Type packaging item...',
        },
        {
          id: 'material',
          message: 'What is the main material?',
          input: 'select',
          field: 'materialType',
          options: options.waste_packaging,
        },
        {
          id: 'condition',
          message: 'What condition is the packaging in?',
          input: 'select',
          field: 'condition',
          options: ['Clean', 'Has food residue', 'Damaged', 'Chemical residue', 'Mixed'],
        },
        {
          id: 'size',
          message: 'What size is it?',
          input: 'select',
          field: 'size',
          options: ['Small', 'Medium', 'Large', 'Bulk'],
        },
        { id: 'confirm', message: 'Ready to find packaging reuse and upcycling ideas.', input: 'confirm' },
      ],
    },
    electronics: {
      subtitle: 'Electronics pathways assistant',
      steps: [
        {
          id: 'name',
          message: 'What electronic item are you scanning? (e.g. old speakers, mobile phone, laptop)',
          input: 'text',
          field: 'itemName',
          placeholder: 'Type device name...',
        },
        {
          id: 'category',
          message: 'What type of device is it?',
          input: 'select',
          field: 'category',
          options: options.electronics,
        },
        {
          id: 'condition',
          message: 'What condition is the device in?',
          input: 'select',
          field: 'condition',
          options: ['Working', 'Minor issue', 'Not working', 'Damaged battery', 'Broken screen', 'Unknown'],
        },
        {
          id: 'issue',
          message: 'Any specific issue? (optional — e.g. battery swollen, no sound)',
          input: 'text',
          field: 'issue',
          placeholder: 'Describe the issue or skip',
          optional: true,
        },
        { id: 'confirm', message: 'We will show verified reuse ideas plus repair, resale, and recycling pathways.', input: 'confirm' },
      ],
    },
    other: {
      subtitle: 'General item assistant',
      steps: [
        {
          id: 'name',
          message: 'What item are you scanning? (e.g. wooden chair, plastic toy, old notebook)',
          input: 'text',
          field: 'itemName',
          placeholder: 'Type item name...',
        },
        {
          id: 'materials',
          message: 'What material(s) is it made of? Select all that apply.',
          input: 'multiselect',
          field: 'materials',
          options: options.other_materials,
        },
        {
          id: 'condition',
          message: 'What condition is the item in?',
          input: 'select',
          field: 'condition',
          options: ['Working but unwanted', 'Broken or damaged', 'Partially functional', 'Completely non-functional'],
        },
        {
          id: 'size',
          message: 'Roughly how big is it?',
          input: 'select',
          field: 'size',
          options: ['Small (fits in a hand)', 'Medium (fits in a bag)', 'Large (furniture or appliance sized)'],
        },
        { id: 'confirm', message: 'Ready to search the dataset and AI for safe reuse routes.', input: 'confirm' },
      ],
    },
  };

  return flows[scanType] || flows.other;
};

const formatChatAnswer = (step, form) => {
  const value = form[step.field];
  if (step.input === 'multiselect') {
    if (!Array.isArray(value) || !value.length) return step.optional ? 'Skipped' : '';
    return value
      .map((entry) => normalizeChatOption(step.options.find((opt) => normalizeChatOption(opt).value === entry) || entry).label)
      .join(', ');
  }
  if (step.input === 'select') return value || '';
  return String(value || '').trim();
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
  productForm: '',
  reuseGoals: [],
  availableItems: [],
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
    const combined = `${cat} ${(data.product_name || '').toLowerCase()}`;
    if (combined.includes('banana')) return 'Banana peel';
    if (combined.includes('orange') || combined.includes('citrus') || combined.includes('mosambi')) return 'Orange peel';
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

const SUPPORTED_VISION_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_VISION_UPLOAD_BYTES = 12 * 1024 * 1024;
const LARGE_IMAGE_BYTES = 4 * 1024 * 1024;
const MAX_VISION_DIMENSION = 2560;

const resizeImageForVision = (file) => new Promise((resolve, reject) => {
  const objectUrl = URL.createObjectURL(file);
  const image = new Image();

  image.onload = () => {
    URL.revokeObjectURL(objectUrl);
    const longestSide = Math.max(image.naturalWidth, image.naturalHeight);
    const scale = longestSide > MAX_VISION_DIMENSION ? MAX_VISION_DIMENSION / longestSide : 1;
    const width = Math.max(1, Math.round(image.naturalWidth * scale));
    const height = Math.max(1, Math.round(image.naturalHeight * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');

    if (!context) {
      reject(new Error('Your browser could not prepare this image for analysis.'));
      return;
    }

    context.fillStyle = '#FFFFFF';
    context.fillRect(0, 0, width, height);
    context.drawImage(image, 0, 0, width, height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    resolve({ photo_data: dataUrl.split(',')[1], photo_mime: 'image/jpeg' });
  };

  image.onerror = () => {
    URL.revokeObjectURL(objectUrl);
    reject(new Error('We could not read this image. Please choose a JPG, PNG, or WEBP photo.'));
  };

  image.src = objectUrl;
});

const createVisionPayload = async (file) => {
  if (!SUPPORTED_VISION_IMAGE_TYPES.has(file.type)) {
    throw new Error('Choose a JPG, PNG, or WEBP photo for accurate analysis.');
  }

  if (file.size > MAX_VISION_UPLOAD_BYTES) {
    throw new Error('Choose an image smaller than 12 MB so the label can be analysed reliably.');
  }

  if (file.size > LARGE_IMAGE_BYTES) return resizeImageForVision(file);

  return {
    photo_data: await fileToBase64(file),
    photo_mime: file.type,
  };
};

const hasPartialVisionData = (data) => Boolean(
  data?.product_name
  || data?.detected_category
  || (data?.category && String(data.category).toLowerCase() !== 'unknown')
  || data?.brand
  || data?.packaging_material
  || (Array.isArray(data?.ingredients) && data.ingredients.length)
);

const needsManualVisionReview = (data) => {
  if (!data) return true;
  if (data.vision_failed && !hasPartialVisionData(data)) return true;

  const name = String(data.product_name || '').trim().toLowerCase();
  if (name && !['scanned item', 'unknown', 'item'].includes(name)) return false;

  return !hasPartialVisionData(data);
};

const applyVisionToForm = (data, scanType, initial = initialForm) => ({
  ...initial,
  itemName: data.product_name
    || (data.brand ? `${data.brand} ${data.category || ''}`.trim() : '')
    || initial.itemName,
  brand: data.brand || '',
  packagingMaterial: data.packaging_material || '',
  category: mapCategoryToOption(scanType, data),
  expiryDate: data.expiry_date || '',
  expiryType: ['best_before', 'use_by', 'expiry_date'].includes(data.expiry_type) ? data.expiry_type : 'best_before',
  ingredients: Array.isArray(data.ingredients) ? data.ingredients.join(', ') : data.ingredients || '',
  condition: mapConditionToOption(scanType, data.risk_indicators || []),
  quantity: data.quantity || '',
  notes: data.risk_indicators?.length ? `Detected concerns: ${data.risk_indicators.join(', ')}` : '',
});

export default function ScanPage() {
  const [scanType, setScanType] = useState('');
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [visionLoading, setVisionLoading] = useState(false);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [visionData, setVisionData] = useState(null);
  const [useChatbot, setUseChatbot] = useState(true);
  const [chatbotStep, setChatbotStep] = useState(0);
  const navigate = useNavigate();

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
    setVisionLoading(true);
    const toastId = toast.loading('AI is reading the product label and packaging...');

    try {
      const { scanApi } = await import('../utils/backendApi');
      const data = await scanApi.vision(await createVisionPayload(file));

      if (needsManualVisionReview(data)) {
        toast.error(data?.note || 'Could not identify this item. Try a clearer photo or enter details manually.', { id: toastId });
        return;
      }

      setVisionData(data);

      if (data.requires_manual_review || Number(data.confidence_score) < 70) {
        toast('AI filled what it could — please review the details.', { icon: '⚠️', id: toastId });
      } else {
        toast.success('Product details auto-filled!', { id: toastId });
      }

      setForm((current) => ({
        ...applyVisionToForm(data, scanType, current),
        itemName: data.product_name
          || (data.brand ? `${data.brand} ${data.category || ''}`.trim() : '')
          || current.itemName,
      }));
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'AI analysis failed.', { id: toastId });
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
    const toastId = toast.loading('AI is identifying the item, label, and packaging...');

    try {
      const { scanApi } = await import('../utils/backendApi');
      const data = await scanApi.vision(await createVisionPayload(file));

      if (needsManualVisionReview(data)) {
        toast.error(data?.note || 'Could not identify this item. Try a clearer photo or pick a category manually.', { id: toastId });
        return;
      }

      setVisionData(data);

      if (data.requires_manual_review || Number(data.confidence_score) < 70) {
        toast('Category detected — please review the details.', { icon: '⚠️', id: toastId });
      } else {
        toast.success('Category detected!', { id: toastId });
      }
      
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

      const newForm = applyVisionToForm(data, detectedScanType);
      
      // Map components to materials for 'other'
      if (detectedScanType === 'other' && data.key_components) {
         newForm.materials = Array.isArray(data.key_components) ? data.key_components : [data.key_components];
      }
      
      setForm(newForm);

      if (data.confidence_score !== undefined && Number(data.confidence_score) < 80) {
        toast('Please review the selected category and details. AI confidence was low.', { icon: '⚠️', duration: 4000 });
      }
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'AI analysis failed.', { id: toastId });
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
    setChatbotStep(0);
  };

  const validate = () => {
    if (!scanType) return 'Choose what you are scanning';
    if (scanType === 'electronics') {
      if (!form.category) return 'Choose the device category';
      if (!form.condition) return 'Choose device condition';
      return '';
    }
    if (!form.itemName.trim() && !form.category) return 'Add an item name or category';
    if (scanType === 'expired_product') {
      if (!form.productForm) return 'Choose the product form so we can avoid unsuitable suggestions';
      if (!form.reuseGoals?.length) return 'Choose at least one outcome for this item';
    }
    if (scanType === 'food_peels' && !form.category && !form.itemName.trim()) return 'Add a peel type or name';
    if (scanType === 'waste_packaging' && !form.materialType && !form.category) return 'Choose the packaging material';
    if (scanType === 'other' && !form.materials?.length) return 'Select at least one material';
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
          visionData,
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
                accept="image/jpeg,image/png,image/webp" 
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
                  accept="image/jpeg,image/png,image/webp" 
                  className="hidden" 
                  disabled={visionLoading}
                  onChange={handlePhotoUpload} 
                />
              </label>
            </div>

            <div className="mt-5 rounded-2xl border border-primary-green bg-white p-4 shadow-sm">
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
            <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-light-purple text-deep-purple">
                  <Icon size={24} />
                </div>
                <div>
                  <h3>{selectedType.title}</h3>
                  <p className="text-sm">Provide details for the AI analysis.</p>
                </div>
              </div>

              {/* Chatbot / Form Toggle */}
              <div className="flex bg-slate-100 p-1 rounded-xl w-fit">
                <button
                  type="button"
                  onClick={() => {
                    setUseChatbot(true);
                    setChatbotStep(0);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    useChatbot ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Smart Assistant
                </button>
                <button
                  type="button"
                  onClick={() => setUseChatbot(false)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    !useChatbot ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Manual Form
                </button>
              </div>
            </div>

            {useChatbot ? (
              <SmartWasteChatbot
                scanType={scanType}
                form={form}
                update={update}
                chatbotStep={chatbotStep}
                setChatbotStep={setChatbotStep}
                loading={loading}
              />
            ) : (
              <>
                {scanType === 'expired_product' && <ExpiredProductFields form={form} update={update} />}
                {scanType === 'food_peels' && <FoodPeelFields form={form} update={update} />}
                {scanType === 'waste_packaging' && <PackagingFields form={form} update={update} />}
                {scanType === 'electronics' && <ElectronicsFields form={form} update={update} />}
                {scanType === 'other' && <OtherFields form={form} update={update} />}
                {scanType === 'expired_product' && <SuggestionPreferences form={form} update={update} />}

                <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-end">
                  <Button variant="secondary" onClick={() => setScanType('')}>Change type</Button>
                  <Button type="submit" variant={scanType === 'electronics' ? 'success' : 'primary'} loading={loading}>
                    Analyse item <ArrowRight size={17} />
                  </Button>
                </div>
              </>
            )}
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

function SuggestionPreferences({ form, update }) {
  return (
    <div className="mt-6 grid gap-5 rounded-2xl border border-[#b8e6c1] bg-[#f4fcf6] p-5">
      <div>
        <h3 className="text-base text-deep-green">Tailor the reuse plan</h3>
        <p className="mt-1 text-sm leading-6">These details stop the app from guessing an unsuitable use for your item.</p>
      </div>
      <div className="grid gap-5 md:grid-cols-2">
        <SelectField
          label="Physical form"
          value={form.productForm}
          onChange={(value) => update('productForm', value)}
          options={questionnaireOptions.productForms}
        />
        <MultiSelectChips
          label="What would you like to do?"
          options={questionnaireOptions.reuseGoals}
          selected={form.reuseGoals || []}
          onChange={(value) => update('reuseGoals', value)}
        />
      </div>
      <MultiSelectChips
        label="Household items available (optional)"
        options={questionnaireOptions.householdItems}
        selected={form.availableItems}
        onChange={(value) => update('availableItems', value)}
      />
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
        {fieldOptions.map((option) => {
          const optionValue = typeof option === 'string' ? option : option.value;
          const optionLabel = typeof option === 'string'
            ? (format ? option.replaceAll('_', ' ') : option)
            : option.label;

          return (
            <option key={optionValue} value={optionValue}>
              {optionLabel}
            </option>
          );
        })}
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
  const normalizeOption = (option) => {
    if (typeof option === 'string') {
      return { value: option, label: option };
    }
    return {
      value: option.value,
      label: option.label || option.value,
    };
  };

  const toggle = (value) => {
    if (selected.includes(value)) {
      onChange(selected.filter((item) => item !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  return (
    <div>
      <label className="input-label mb-2 block">{label}</label>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const { value, label: optionLabel } = normalizeOption(option);
          return (
            <button
              key={value}
              type="button"
              onClick={() => toggle(value)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                selected.includes(value)
                  ? 'bg-deep-purple text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {optionLabel}
            </button>
          );
        })}
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

function SmartWasteChatbot({ scanType, form, update, chatbotStep, setChatbotStep, loading }) {
  const flow = getChatbotFlow(scanType);
  const steps = flow.steps;
  const totalSteps = steps.length;
  const currentStep = steps[chatbotStep] || steps[0];
  const isConfirmStep = currentStep?.input === 'confirm';

  const advance = () => setChatbotStep((prev) => Math.min(prev + 1, totalSteps - 1));
  const goBack = () => setChatbotStep((prev) => Math.max(prev - 1, 0));

  const handleTextNext = () => {
    const value = String(form[currentStep.field] || '').trim();
    if (!value && !currentStep.optional) {
      toast.error('Please enter a value to continue');
      return;
    }
    if (currentStep.field === 'materialType') update('category', form.materialType);
    advance();
  };

  const handleSelect = (value) => {
    update(currentStep.field, value);
    if (currentStep.field === 'materialType') update('category', value);
    advance();
  };

  const toggleMulti = (value) => {
    const selected = Array.isArray(form[currentStep.field]) ? form[currentStep.field] : [];
    update(
      currentStep.field,
      selected.includes(value) ? selected.filter((entry) => entry !== value) : [...selected, value]
    );
  };

  const handleMultiNext = () => {
    const selected = form[currentStep.field] || [];
    if (!selected.length && !currentStep.optional) {
      toast.error('Choose at least one option to continue');
      return;
    }
    advance();
  };

  return (
    <div className="flex h-[520px] flex-col overflow-hidden rounded-2xl border border-slate-100 bg-slate-50 shadow-inner">
      <div className="flex items-center justify-between bg-[#52b788] px-5 py-4 font-semibold text-white shadow-sm">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-white/20 p-1.5">
            <Leaf size={20} className="text-white" />
          </div>
          <div>
            <h3 className="m-0 text-sm font-bold text-white">Smart Waste Assistant</h3>
            <p className="m-0 text-[10px] text-white/80">{flow.subtitle}</p>
          </div>
        </div>
        <div className="rounded-full bg-white/20 px-2 py-1 text-xs font-bold">
          Step {chatbotStep + 1} of {totalSteps}
        </div>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto bg-white/50 p-5">
        {steps.slice(0, chatbotStep + 1).map((step, index) => (
          <div key={step.id} className="space-y-3">
            <div className="flex items-start gap-3 animate-fade-in">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#52b788] text-xs font-bold text-white">AI</div>
              <div className="max-w-[85%] rounded-2xl rounded-tl-none border border-slate-100 bg-white p-3.5 text-sm leading-relaxed text-slate-800 shadow-sm">
                {step.message}
              </div>
            </div>
            {index < chatbotStep && step.input !== 'confirm' && (
              <div className="flex justify-end animate-fade-in">
                <div className="max-w-[85%] rounded-2xl rounded-tr-none border border-[#b8e6c1] bg-[#E2F9E8] p-3 text-sm font-medium text-slate-800 shadow-sm">
                  {formatChatAnswer(step, form) || '—'}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="border-t border-slate-100 bg-slate-50 p-4">
        {currentStep.input === 'text' && (
          <div className="flex gap-2">
            <input
              type="text"
              placeholder={currentStep.placeholder || 'Type your answer...'}
              value={form[currentStep.field] || ''}
              onChange={(e) => update(currentStep.field, e.target.value)}
              className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-[#52b788] focus:outline-none"
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleTextNext())}
            />
            <button type="button" onClick={handleTextNext} className="rounded-xl bg-[#52b788] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#40916c]">
              {currentStep.optional ? 'Skip' : 'Next'}
            </button>
          </div>
        )}

        {currentStep.input === 'select' && (
          <div className="grid grid-cols-2 gap-2">
            {currentStep.options.map((option) => {
              const { value, label } = normalizeChatOption(option);
              const selected = form[currentStep.field] === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => handleSelect(value)}
                  className={`rounded-xl border px-3 py-2 text-sm font-semibold transition-all hover:bg-slate-100 ${
                    selected ? 'border-[#52b788] bg-[#E2F9E8] text-deep-green' : 'border-slate-200 bg-white text-slate-700'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        )}

        {currentStep.input === 'multiselect' && (
          <div className="space-y-3">
            <div className="flex max-h-[120px] flex-wrap gap-1.5 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1">
              {currentStep.optional && (
                <button
                  type="button"
                  onClick={() => update(currentStep.field, [])}
                  className={`rounded-lg px-3 py-1 text-xs font-semibold transition-all ${
                    !(form[currentStep.field] || []).length ? 'bg-[#52b788] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  None / Skip
                </button>
              )}
              {currentStep.options.map((option) => {
                const { value, label } = normalizeChatOption(option);
                const selected = (form[currentStep.field] || []).includes(value);
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => toggleMulti(value)}
                    className={`rounded-lg px-3 py-1 text-xs font-semibold transition-all ${
                      selected ? 'bg-[#52b788] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
            <button type="button" onClick={handleMultiNext} className="w-full rounded-xl bg-[#52b788] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#40916c]">
              Continue with {(form[currentStep.field] || []).length} selected
            </button>
          </div>
        )}

        {isConfirmStep && (
          <div className="flex items-center justify-between">
            <button type="button" onClick={goBack} className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100">
              Back
            </button>
            <Button type="submit" variant="success" loading={loading} className="rounded-xl bg-[#52b788] px-6 py-2.5 font-bold text-white hover:bg-[#40916c]">
              Find Reuse Ideas <ArrowRight size={16} className="ml-2" />
            </Button>
          </div>
        )}

        {chatbotStep > 0 && !isConfirmStep && (
          <div className="mt-2 flex justify-start">
            <button type="button" onClick={goBack} className="flex animate-fade-in items-center gap-1 text-xs text-slate-500 hover:underline">
              ← Go back
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
