const axios = require('axios');

const CHROMADB_URL = process.env.CHROMADB_URL || 'http://localhost:8000';

const ensureCollection = async (name, metadata = {}) => {
  try {
    await axios.post(`${CHROMADB_URL}/api/v1/collections`, {
      name,
      metadata,
    });
    console.log(`ChromaDB collection created: ${name}`);
  } catch (error) {
    if (error.response?.status === 409 || error.response?.status === 400) {
      console.log(`ChromaDB collection already exists: ${name}`);
    } else {
      console.error(`Error creating ChromaDB collection ${name}:`, error.message);
    }
  }
};

const initCollections = async () => {
  const collections = [
    { name: 'animal_feed_safety', metadata: { description: 'Animal nutrition and toxicity documents' } },
    { name: 'ayush_knowledge', metadata: { description: 'AYUSH, CCRAS traditional medicine documents' } },
    { name: 'nuske_database', metadata: { description: 'Verified traditional nuske with sources' } },
  ];

  for (const col of collections) {
    await ensureCollection(col.name, col.metadata);
  }
};

const queryCollection = async (collectionName, queryTexts, nResults = 5) => {
  try {
    const collectionData = await axios.get(`${CHROMADB_URL}/api/v1/collections/${collectionName}`);
    const collectionId = collectionData.data.id;

    const response = await axios.post(
      `${CHROMADB_URL}/api/v1/collections/${collectionId}/query`,
      {
        query_texts: queryTexts,
        n_results: nResults,
        include: ['documents', 'metadatas', 'distances'],
      }
    );

    return response.data;
  } catch (error) {
    console.error(`ChromaDB query error for ${collectionName}:`, error.message);
    return { documents: [[]], metadatas: [[]], distances: [[]] };
  }
};

const addDocument = async (collectionName, documents, metadatas, ids) => {
  try {
    const collectionData = await axios.get(`${CHROMADB_URL}/api/v1/collections/${collectionName}`);
    const collectionId = collectionData.data.id;

    await axios.post(
      `${CHROMADB_URL}/api/v1/collections/${collectionId}/add`,
      {
        documents,
        metadatas,
        ids,
      }
    );
  } catch (error) {
    console.error(`ChromaDB add document error for ${collectionName}:`, error.message);
  }
};

module.exports = { initCollections, queryCollection, addDocument };
