const assert = require('node:assert/strict');
const { fastSuggestionGenerator } = require('./services/fastTrackService');

const userProfile = { state: 'Delhi' };

const suggestionFor = (componentName, componentType, context) => {
  const suggestions = fastSuggestionGenerator(
    { id: 1, component_name: componentName, component_type: componentType },
    userProfile,
    {},
    context
  );

  assert.equal(suggestions.length, 1, `${componentName} should produce exactly one focused result`);
  return suggestions[0];
};

const tests = [
  {
    name: 'blocks turmeric cleaning advice instead of inventing a cleaner',
    run: () => {
      const suggestion = suggestionFor('Turmeric powder', 'expired_product', {
        productForm: 'Powder',
        reuseGoal: 'cleaning',
        availableItems: ['Baking soda', 'Lemon / Vinegar'],
      });
      const text = `${suggestion.title} ${suggestion.steps.join(' ')}`.toLowerCase();
      assert.match(suggestion.title, /do not use turmeric powder as a cleaner/i);
      assert.doesNotMatch(text, /apply to stained surfaces|clean turmeric powder with soap water/);
    },
  },
  {
    name: 'uses a constrained external-only turmeric option when the required fresh base is available',
    run: () => {
      const suggestion = suggestionFor('Turmeric', 'expired_product', {
        productForm: 'Powder',
        reuseGoal: 'skin_hair',
        availableItems: ['Honey', 'Besan (Gram flour)'],
      });
      const text = `${suggestion.title} ${suggestion.steps.join(' ')}`.toLowerCase();
      assert.match(suggestion.title, /patch-test turmeric and honey hand mask/i);
      assert.match(text, /do not add expired curd/);
      assert.doesNotMatch(text, /golden milk|drink before bed/);
    },
  },
  {
    name: 'blocks expired dairy from becoming a plant feed or hair mask',
    run: () => {
      const suggestion = suggestionFor('Expired curd', 'expired_product', {
        productForm: 'Paste / Cream',
        reuseGoal: 'garden_plants',
        availableItems: ['Honey', 'Turmeric'],
      });
      const text = `${suggestion.title} ${suggestion.steps.join(' ')}`.toLowerCase();
      assert.match(suggestion.title, /do not add expired curd directly to plants/i);
      assert.doesNotMatch(text, /hair mask|plant feed|water your/);
    },
  },
  {
    name: 'uses the selected vinegar for a verified citrus-peel cleaner',
    run: () => {
      const suggestion = suggestionFor('Orange peels', 'organic', {
        productForm: 'Peels / Scraps',
        reuseGoal: 'cleaning',
        availableItems: ['Lemon / Vinegar'],
      });
      const text = `${suggestion.title} ${suggestion.steps.join(' ')}`.toLowerCase();
      assert.match(suggestion.title, /citrus-peel vinegar surface cleaner/i);
      assert.match(text, /10 to 14 days/);
      assert.match(text, /never mix with bleach/);
    },
  },
  {
    name: 'does not turn an unknown liquid into a cleaner, plant feed, or face pack',
    run: () => {
      const suggestion = suggestionFor('Mystery product', 'expired_product', {
        productForm: 'Liquid',
        reuseGoal: 'cleaning',
        availableItems: ['Honey', 'Baking soda'],
      });
      const text = `${suggestion.title} ${suggestion.steps.join(' ')}`.toLowerCase();
      assert.match(suggestion.title, /sort mystery product before disposal/i);
      assert.doesNotMatch(text, /surface cleaner|water your garden|face pack/);
    },
  },
];

for (const test of tests) {
  test.run();
  console.log(`PASS: ${test.name}`);
}

console.log(`\n${tests.length} fast-track suggestion regression tests passed.`);
