// electron/services/embeddingMapper.cjs
// Provides semantic embedding similarity and keyword mismatch detection
// Uses @xenova/transformers (on-device). Lazy loads model, caches pipeline & embeddings.

let pipelineInstance = null;
let loadingPromise = null;
const MODEL_NAME = process.env.EMBEDDING_MODEL_NAME || 'Xenova/all-MiniLM-L6-v2';
const DISABLE_EMBEDDINGS = process.env.DISABLE_EMBEDDINGS === 'true';

// Simple in-memory embedding cache (candidateText|mandateText -> embedding Float32Array)
const embeddingCache = new Map();
// Cache for individual phrase embeddings to avoid recomputation
const phraseEmbeddingCache = new Map();

async function getPipeline() {
  if (DISABLE_EMBEDDINGS) {
    throw new Error('Embeddings disabled by DISABLE_EMBEDDINGS env flag');
  }
  if (pipelineInstance) return pipelineInstance;
  if (loadingPromise) return loadingPromise;
  console.log('\n[embeddingMapper] 🚀 Loading embedding model:', MODEL_NAME);
  loadingPromise = import('@xenova/transformers')
    .then(async ({ pipeline }) => {
      const pipe = await pipeline('feature-extraction', MODEL_NAME);
      console.log('[embeddingMapper] ✅ Model loaded successfully');
      pipelineInstance = pipe;
      return pipe;
    })
    .catch(err => {
      console.error('[embeddingMapper] ❌ Failed to load model:', err.message);
      throw err;
    });
  return loadingPromise;
}

function normalizeText(text) {
  return (text || '')
    .toString()
    .replace(/[^\w\s.-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function tokenizeKeywords(parts) {
  const tokens = new Set();
  parts.forEach(p => {
    normalizeText(p).split(/[\s,/]+/).forEach(tok => {
      if (tok && tok.length > 1) tokens.add(tok);
    });
  });
  return Array.from(tokens).sort();
}

async function embed(text) {
  const norm = normalizeText(text);
  if (embeddingCache.has(norm)) return embeddingCache.get(norm);
  const pipe = await getPipeline();
  const output = await pipe(norm, { pooling: 'mean', normalize: true });
  const embedding = output.data; // already normalized Float32Array
  embeddingCache.set(norm, embedding);
  return embedding;
}

async function embedPhrase(value) {
  const norm = normalizeText(value);
  if (phraseEmbeddingCache.has(norm)) return phraseEmbeddingCache.get(norm);
  const emb = await embed(norm);
  phraseEmbeddingCache.set(norm, emb);
  return emb;
}

function cosine(a, b) {
  if (a.length !== b.length) return 0;
  let dot = 0;
  for (let i = 0; i < a.length; i++) dot += a[i] * b[i];
  return dot; // normalized embeddings => dot == cosine
}

async function computeSemanticFit(candidate, mandate) {
  const start = Date.now();
  const result = {
    semanticScore: 0,
    mismatches: [],
    candidateKeywords: [],
    mandateKeywords: [],
    similarity: 0,
    timingMs: 0,
    model: MODEL_NAME,
    disabled: DISABLE_EMBEDDINGS,
    error: null,
  };

  if (DISABLE_EMBEDDINGS) {
    console.log('[embeddingMapper] ⚠️ Embeddings disabled, returning semanticScore=0');
    return result;
  }

  try {
    const candidateParts = [
      candidate.name,
      candidate.current_title,
      candidate.current_firm,
      candidate.location,
      ...(candidate.sectors || []),
      ...(candidate.functions || []),
      ...(candidate.asset_classes || []),
      ...(candidate.geographies || []),
      candidate.seniority
    ].filter(Boolean);
    const mandateParts = [
      mandate.name,
      mandate.location,
      mandate.primary_sector,
      ...(mandate.sectors || []),
      ...(mandate.functions || []),
      ...(mandate.asset_classes || []),
      ...(mandate.regions || []),
      mandate.seniority_min,
      mandate.seniority_max
    ].filter(Boolean);

    const candidateText = candidateParts.join(' | ');
    const mandateText = mandateParts.join(' | ');

    result.candidateKeywords = tokenizeKeywords(candidateParts);
    result.mandateKeywords = tokenizeKeywords(mandateParts);

    // Keyword mismatches: mandate keywords missing in candidate keywords
    const candidateSet = new Set(result.candidateKeywords);
    result.mismatches = result.mandateKeywords.filter(k => !candidateSet.has(k));

    // Compute embeddings & cosine similarity
    const embCandidate = await embed(candidateText);
    const embMandate = await embed(mandateText);
    const similarity = cosine(embCandidate, embMandate);
    result.similarity = similarity;

    // Map similarity (rough heuristic) to semantic score 0-1
    // <0.60 => low (0.25), 0.60-0.75 => medium (0.55), 0.75-0.85 => good (0.75), >0.85 => excellent (1.0)
    let semanticScore;
    if (similarity < 0.60) semanticScore = 0.25;
    else if (similarity < 0.75) semanticScore = 0.55;
    else if (similarity < 0.85) semanticScore = 0.75;
    else semanticScore = 1.0;
    result.semanticScore = semanticScore;

    result.timingMs = Date.now() - start;
  } catch (err) {
    result.error = err.message;
    console.error('[embeddingMapper] ❌ Semantic fit failed:', err);
  }

  return result;
}

module.exports = {
  computeSemanticFit,
  embedPhrase,
  normalizeText,
};
