const path = require('path');
const { loadDatasetPatterns } = require('./services/datasetPatternService');

const dataset = loadDatasetPatterns();
console.log(`\nWasteWise Dataset — ${dataset.length} entries\n`);
console.log('='.repeat(80));

const byCategory = {};
for (const entry of dataset) {
  const cat = entry.category || 'unknown';
  if (!byCategory[cat]) byCategory[cat] = [];
  byCategory[cat].push(entry);
}

for (const [category, entries] of Object.entries(byCategory).sort()) {
  console.log(`\n## ${category.toUpperCase()} (${entries.length} items)`);
  entries.forEach((entry, index) => {
    const keywords = (entry.input_keywords || []).join(', ');
    const ideas = (entry.component_breakdown || [])
      .flatMap((part) => (part.suggestions || []).map((s) => s.title))
      .filter((title, i, all) => all.indexOf(title) === i)
      .slice(0, 3);
    console.log(`  ${index + 1}. ${keywords}`);
    if (ideas.length) console.log(`     Ideas: ${ideas.join(' | ')}`);
  });
}

console.log('\n' + '='.repeat(80));
console.log('FLAT LIST (all input keywords):');
console.log('='.repeat(80));
dataset.forEach((entry, i) => {
  (entry.input_keywords || []).forEach((kw) => console.log(`${String(i + 1).padStart(2)}. ${kw}`));
});
