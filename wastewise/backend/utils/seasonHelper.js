const getSeason = (month) => {
  if (month >= 3 && month <= 5) return 'summer';
  if (month >= 6 && month <= 9) return 'monsoon';
  if (month >= 10 && month <= 11) return 'autumn';
  return 'winter';
};

const getSeasonalSuggestion = (month, state) => {
  const seasonalMap = {
    5: {
      produce: 'Mango and watermelon',
      message: 'Mango season is here — mango peels and watermelon rinds are common right now.',
    },
    6: {
      produce: 'Mango and lychee',
      message: 'Peak mango and lychee season — lots of peels and seeds to repurpose.',
    },
    10: {
      produce: 'Citrus and pomegranate',
      message: 'Citrus and pomegranate season — peels can be dried and stored for later use.',
    },
    11: {
      produce: 'Mustard greens and winter vegetables',
      message: 'Winter vegetables are in season — scraps are great for cattle feed.',
    },
    12: {
      produce: 'Winter greens and root vegetables',
      message: 'Winter harvest — carrot peels and beet greens can be composted or fed to animals.',
    },
  };

  return seasonalMap[month] || null;
};

module.exports = { getSeason, getSeasonalSuggestion };
