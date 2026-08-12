const checkHardBlocks = (componentName, productCategory) => {
  const lowerName = (componentName || '').toLowerCase();
  const lowerCategory = (productCategory || '').toLowerCase();

  if (lowerName.includes('avocado')) {
    return { blocked: true, reason: 'Avocado is toxic to most animals and should not be fed.' };
  }

  if (lowerName.includes('potato peel') || lowerName.includes('potato skin')) {
    return {
      blockedForAnimals: ['dog', 'cat'],
      reason: 'Potato peel contains solanine which is toxic to dogs and cats.',
    };
  }

  if (lowerName.includes('onion') || lowerName.includes('garlic')) {
    return {
      blockedForAnimals: ['dog', 'cat'],
      reason: 'Onion and garlic cause haemolytic anaemia in dogs and cats.',
    };
  }

  if (lowerName.includes('tomato peel') || lowerName.includes('tomato skin')) {
    return {
      blockedForAnimals: ['dog', 'cat'],
      reason: 'Tomato parts contain solanine which is toxic to dogs and cats.',
    };
  }

  if (lowerCategory.includes('electronics') || lowerCategory.includes('electronic')) {
    return {
      blockPreciousMetalExtraction: true,
      reason: 'Precious metal extraction requires dangerous industrial chemicals.',
    };
  }

  return { blocked: false };
};

const checkUserSafety = (component, userMedical, expiryInfo) => {
  const warnings = [];
  const mustNot = [];

  if (!userMedical) return { warnings, mustNot, must_not: mustNot };

  if (userMedical.is_pregnant) {
    warnings.push('Extra caution needed: you are currently pregnant. Avoid all topical applications without doctor approval.');
  }

  if (userMedical.allergies) {
    const allergies = userMedical.allergies.toLowerCase();
    const ingredient = (component?.component_name || '').toLowerCase();

    if (allergies.includes('nut') && (ingredient.includes('coconut') || ingredient.includes('almond') || ingredient.includes('cashew'))) {
      mustNot.push('You have a nut allergy — this component may trigger a reaction.');
    }
  }

  if (expiryInfo.daysPastExpiry > 180 && expiryInfo.category === 'dairy') {
    mustNot.push('This dairy product is over 180 days past expiry — do not use on body.');
  }

  if (expiryInfo.hasMould) {
    mustNot.push('Visible mould detected — do not use on body or skin.');
  }

  return { warnings, mustNot, must_not: mustNot };
};

module.exports = { checkHardBlocks, checkUserSafety };
