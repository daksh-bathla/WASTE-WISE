export const resultSummary = {
  scanId: '1',
  itemName: 'expired curd',
  suggestionsCount: 7,
  partsCount: 3,
  weatherNote: 'Recommended for Delhi summer with normal skin profile',
};

export const components = [
  {
    id: 'curd-solids',
    name: 'Curd solids',
    meta: 'organic - sour but usable externally',
    suggestions: [
      {
        id: 'cooling-face-pack',
        title: 'Cooling face pack for oily T-zone',
        moduleType: 'Traditional',
        tagColor: 'purple',
        component: 'Curd solids',
        credibility: 'Traditional practice',
        sourceName: 'AYUSH wellness note',
        sourceUrl: 'https://www.ayush.gov.in',
        rating: 4.7,
        tried: 182,
        personalisation: 'Best as a topical use in hot weather. Avoid if smell is sharp or skin is sensitive today.',
        region: 'North India',
        steps: [
          { title: 'Check smell and texture', text: 'Use only if it smells sour but not rotten and there is no mold.' },
          { title: 'Patch test first', text: 'Apply a pea-sized amount on the inner arm and wait 20 minutes.' },
          { title: 'Apply briefly', text: 'Mix one spoon curd with rice flour, apply for 6 to 8 minutes, then rinse.' },
        ],
        disclaimer: {
          who: 'Do not use on broken, irritated, sunburned, or acne-inflamed skin.',
          stop: 'Stop immediately if there is burning, itching, redness, or swelling.',
          notes: 'This is a household wellness use, not treatment for a medical condition.',
          patch: true,
        },
      },
      {
        id: 'hair-rinse',
        title: 'Short-contact hair mask',
        moduleType: 'DIY',
        tagColor: 'green',
        component: 'Curd solids',
        credibility: 'Community verified',
        sourceName: 'Household practice',
        sourceUrl: 'https://www.fao.org/food-loss-and-food-waste',
        rating: 4.5,
        tried: 96,
        personalisation: 'Suitable when the curd is only mildly sour and your household has no dairy allergy.',
        region: 'India',
        ingredients: ['2 spoons curd', '1 spoon aloe gel', 'Water for rinsing'],
        equipment: ['Bowl', 'Spoon', 'Towel'],
        estimatedTime: '15 minutes',
        shelfLife: 'Use immediately',
        steps: [
          { title: 'Mix fresh', text: 'Combine curd and aloe gel in a clean bowl.' },
          { title: 'Apply to lengths', text: 'Keep it away from scalp irritation and leave for 8 to 10 minutes.' },
          { title: 'Rinse fully', text: 'Wash with plain water first, then use your normal cleanser if needed.' },
        ],
        disclaimer: {
          who: 'Avoid if anyone using it has dairy sensitivity, scalp wounds, or fungal scalp concerns.',
          stop: 'Stop if itching or odor worsens.',
          notes: 'External use only. Do not store the mixture.',
          patch: true,
        },
      },
    ],
  },
  {
    id: 'whey',
    name: 'Whey liquid',
    meta: 'liquid - dilute before garden use',
    suggestions: [
      {
        id: 'compost-booster',
        title: 'Diluted compost moisture booster',
        moduleType: 'Modern',
        tagColor: 'green',
        component: 'Whey liquid',
        credibility: 'Research-backed',
        sourceName: 'Food waste composting guide',
        sourceUrl: 'https://www.fao.org/food-loss-and-food-waste',
        rating: 4.8,
        tried: 231,
        personalisation: 'Good option for balcony compost if added slowly and balanced with dry leaves.',
        region: 'Urban homes',
        steps: [
          { title: 'Dilute heavily', text: 'Mix one part whey with ten parts water.' },
          { title: 'Add to browns', text: 'Pour a small amount over dry leaves, shredded paper, or cocopeat.' },
          { title: 'Check odor next day', text: 'If sour smell builds up, add more dry material and pause liquids.' },
        ],
        disclaimer: {
          who: 'Do not pour undiluted whey into potted plants or drains.',
          stop: 'Stop if compost smells rotten or attracts pests.',
          notes: 'Use small quantities only and balance with dry material.',
          patch: false,
        },
      },
    ],
  },
  {
    id: 'container',
    name: 'Plastic container',
    meta: 'packaging - rinse before reuse',
    suggestions: [
      {
        id: 'seedling-pot',
        title: 'Drainage seedling starter',
        moduleType: 'DIY',
        tagColor: 'purple',
        component: 'Plastic container',
        credibility: 'Community verified',
        sourceName: 'Urban gardening practice',
        sourceUrl: 'https://www.india.gov.in/topics/agriculture',
        rating: 4.4,
        tried: 78,
        personalisation: 'A good fit if the container is clean, odor-free, and not oily.',
        region: 'Balcony gardens',
        ingredients: ['Clean container', 'Soil mix', 'Seeds'],
        equipment: ['Small nail or punch', 'Tray'],
        estimatedTime: '10 minutes',
        shelfLife: 'One growing cycle',
        steps: [
          { title: 'Wash and dry', text: 'Rinse thoroughly and dry in sunlight.' },
          { title: 'Add drainage', text: 'Make three to four small holes at the base.' },
          { title: 'Plant seeds', text: 'Fill with soil mix and place on a tray to catch water.' },
        ],
        disclaimer: {
          who: 'Do not reuse containers that held chemicals or have a strong sour odor after washing.',
          stop: 'Discard if the container cracks or grows mold.',
          notes: 'Use for plants only, not food storage.',
          patch: false,
        },
      },
    ],
  },
];

export const allSuggestions = components.flatMap((component) => component.suggestions);

export const ewasteAssessment = {
  device: 'Old smartphone',
  city: 'Delhi',
  canRepair: true,
  repairDifficulty: 'Medium',
  commonFix: 'Battery replacement or charging-port cleaning is the most likely first check.',
  resaleValue: 'Rs 900 - Rs 2,400',
  platforms: [
    { name: 'Cashify', type: 'Resale', note: 'Doorstep pickup available in many cities.', url: 'https://cashify.in' },
    { name: 'OLX', type: 'Resale', note: 'Useful if the phone powers on and screen is usable.', url: 'https://olx.in' },
    { name: 'Goonj', type: 'Donation', note: 'Consider donation if the phone can be repaired for basic use.', url: 'https://goonj.org' },
  ],
  salvage: [
    { component: 'Speaker module', condition: 'Likely usable', reuse: 'Can be reused in a small hobby audio project by a trained repair person.' },
    { component: 'Camera module', condition: 'Unknown', reuse: 'Keep only if removed by a technician; otherwise recycle with device.' },
  ],
  recyclers: [
    { name: 'Attero Recycling', pickup: 'Drop-off or partner pickup', type: 'Certified recycling' },
    { name: 'Karo Sambhav', pickup: 'Collection network', type: 'Responsible recycling' },
    { name: 'E-Parisaraa', pickup: 'Facility drop-off', type: 'Certified recycling' },
  ],
};

export const logEntries = [
  { item: 'Banana peels', type: 'Food peel', quantity: '350 g', action: 'Composted', date: 'Today' },
  { item: 'Glass jar', type: 'Packaging', quantity: '1 piece', action: 'Repurposed', date: 'Yesterday' },
  { item: 'Old charger', type: 'Electronics', quantity: '1 piece', action: 'Disposed properly', date: '3 days ago' },
];

export const communityPosts = [
  { item: 'Expired coconut oil', made: 'Wood polish', user: 'Ananya, Pune', rating: 5, worked: 42, time: '2 hours ago', tag: 'DIY' },
  { item: 'Watermelon rind', made: 'Cattle feed supplement', user: 'Ravi, Jaipur', rating: 4, worked: 31, time: 'Yesterday', tag: 'Animal feed' },
  { item: 'Old cardboard box', made: 'Seedling tray', user: 'Meera, Kochi', rating: 5, worked: 27, time: '3 days ago', tag: 'Gardening' },
];
