const axios = require('axios');

const TAVILY_API_KEY = process.env.TAVILY_API_KEY;
const TAVILY_URL = 'https://api.tavily.com/search';

const search = async (query, options = {}) => {
  if (!TAVILY_API_KEY) {
    console.warn('TAVILY_API_KEY not set — returning empty results');
    return [];
  }

  try {
    const response = await axios.post(
      TAVILY_URL,
      {
        api_key: TAVILY_API_KEY,
        query,
        search_depth: options.search_depth || 'advanced',
        include_domains: options.include_domains || [],
        max_results: options.max_results || 5,
      },
      { timeout: 30000 }
    );

    return response.data.results || [];
  } catch (error) {
    console.error('Tavily search error:', error.message);
    return [];
  }
};

const searchTraditionalRemedy = async (componentName, goal, state, language) => {
  const baseQuery = `traditional Indian remedy ${componentName} ${goal} dadi maa ke nuske ayurvedic home remedies`;
  const regionalQuery = state ? `${baseQuery} ${state}` : baseQuery;

  const results = await search(regionalQuery, {
    search_depth: 'advanced',
    max_results: 5,
  });

  return results;
};

const searchModernUses = async (componentName, productCategory, location, weather) => {
  const query = `repurpose ${componentName} ${productCategory} hack mix combine zero waste ${location || ''}`;

  const results = await search(query, {
    search_depth: 'advanced',
    max_results: 5,
  });

  return results;
};

const searchDIYTutorial = async (product, component) => {
  const query = `DIY ${product} ${component} tutorial recipe step by step mix combine`;

  const results = await search(query, {
    search_depth: 'basic',
    max_results: 5,
  });

  return results;
};

const searchSocialDIYHacks = async (componentName) => {
  const query = `viral DIY hack ${componentName} repurpose recipe mix with baking soda vinegar honey oil`;

  const results = await search(query, {
    search_depth: 'advanced',
    max_results: 5,
  });

  return results;
};

module.exports = { search, searchTraditionalRemedy, searchModernUses, searchDIYTutorial, searchSocialDIYHacks };

