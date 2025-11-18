const { getSetting } = require("../models/settingsModel.cjs");

/**
 * Returns the active provider info from settings (llm_providers) or fallback to openai_api_key
 */
async function getActiveProvider() {
  try {
    const raw = await getSetting("llm_providers");
    if (raw) {
      const map = typeof raw === "string" ? JSON.parse(raw) : raw;
      for (const [name, info] of Object.entries(map || {})) {
        // Prefer active providers that have a configured key. If an active provider
        // exists but has no key, ignore it and fall back to other keys (e.g., openai_api_key).
        if (info && info.isActive && info.key)
          return { name, key: info.key, info };
      }
    }
  } catch (e) {
    console.warn("llmAdapter: failed to read llm_providers", e);
  }

  // fallback to single OpenAI key
  try {
    const key = await getSetting("openai_api_key");
    if (key) return { name: "openai", key };
  } catch (e) {
    // ignore
  }

  return null;
}

// Normalize model names safely (guard against undefined/null and strip 'models/' prefix)
function normalizeModel(rawModel, defaultModel = "gemini-2.5-flash") {
  try {
    return String(rawModel || defaultModel).replace(/^models\//, "");
  } catch (e) {
    console.warn(
      "[llmAdapter] normalizeModel failed, falling back to default",
      e,
      { rawModel }
    );
    return defaultModel;
  }
}

/**
 * Call chat completions using LangChain when possible, otherwise fall back to HTTP
 * messages: array of { role, content }
 */
async function chat(messages, opts = {}) {
  const provider = await getActiveProvider();

  // Debug: log what provider was found
  console.log(
    "[llmAdapter] active provider:",
    provider?.name,
    "model in info:",
    provider?.info?.model
  );

  // Determine model with provider-specific defaults
  let model = opts.model || (provider && provider.info && provider.info.model);

  // Force base model choices when provider is explicit
  if (provider && provider.name === "google") {
    // Force a Gemini model id (can be overridden by opts.model)
    // Use gemini-2.5-flash by default (faster, more available)
    model = model || "models/gemini-2.5-flash";
  } else if (provider && provider.name === "openai") {
    // Force GPT-4o if no explicit model
    model = model || "gpt-4o";
  }

  // Normalize / choose defaults per provider
  if (provider && provider.name === "google") {
    const googleDefaultModel = "gemini-2.5-flash";
    if (!model || /^gpt[-_]/i.test(model)) {
      model = googleDefaultModel;
    }
    // Strip "models/" prefix if present
    model = normalizeModel(model, googleDefaultModel);
  } else {
    // OpenAI or unknown provider
    if (!model) {
      model = "gpt-4o-mini";
    }
  }

  console.log("[llmAdapter] using model:", model, "for provider:", provider?.name);

  const temperature =
    typeof opts.temperature === "number" ? opts.temperature : 0;

  // -------- OpenAI via LangChain ChatOpenAI --------
  if (provider && provider.name === "openai") {
    try {
      console.log("[llmAdapter] Attempting LangChain ChatOpenAI...");
      const mod = await import("@langchain/openai");
      const { ChatOpenAI } = mod;

      if (!ChatOpenAI) {
        throw new Error("ChatOpenAI not found in @langchain/openai");
      }

      // Ensure we have an API key: prefer provider.key, otherwise fallback to settings
      const openaiKey =
        (provider && provider.key) || (await getSetting("openai_api_key"));
      if (!openaiKey) {
        throw new Error(
          "No OpenAI API key configured for LangChain ChatOpenAI"
        );
      }

      const maxTokens =
        typeof opts.max_tokens === "number" ? opts.max_tokens : 4096;

      const chatModel = new ChatOpenAI({
        apiKey: openaiKey,
        openAIApiKey: openaiKey,
        modelName: model,
        temperature,
        maxTokens, // higher default than before
      });

      try {
        console.log("[llmAdapter] Preparing LangChain messages...");
        const {
          HumanMessage,
          SystemMessage,
        } = await import("@langchain/core/messages");
        const langchainMessages = messages.map((m) => {
          if (m.role === "system") return new SystemMessage(m.content);
          return new HumanMessage(m.content);
        });

        // Try different invocation patterns depending on LangChain version
        if (typeof chatModel.call === "function") {
          console.log("[llmAdapter] Using chatModel.call(langchainMessages)");
          const resp = await chatModel.call(langchainMessages);
          if (typeof resp === "string") return resp;
          if (resp && resp.content) return resp.content;
          if (resp && resp.text) return resp.text;
          if (resp && resp.message && resp.message.content)
            return resp.message.content;
          return String(resp);
        }

        if (typeof chatModel.invoke === "function") {
          console.log("[llmAdapter] Using chatModel.invoke(langchainMessages)");
          const resp = await chatModel.invoke(langchainMessages);
          if (typeof resp === "string") return resp;
          if (resp && resp.content) return resp.content;
          if (resp && resp.message && resp.message.content)
            return resp.message.content;
          return String(resp);
        }

        if (typeof chatModel.generate === "function") {
          console.log(
            "[llmAdapter] Using chatModel.generate([langchainMessages])"
          );
          const gen = await chatModel.generate([langchainMessages]);
          const first = gen?.generations?.[0]?.[0];
          if (first) {
            if (first.text) return first.text;
            if (first.message && first.message.content)
              return first.message.content;
            if (first.delta) return first.delta;
          }
          return JSON.stringify(gen);
        }

        throw new Error(
          "LangChain ChatOpenAI model does not expose call/generate/invoke methods"
        );
      } catch (callErr) {
        console.warn(
          "[llmAdapter] LangChain ChatOpenAI invocation failed, falling back to HTTP:",
          callErr && callErr.message ? callErr.message : callErr
        );
        // fall through to HTTP fallback
      }
    } catch (importErr) {
      console.warn(
        "[llmAdapter] LangChain ChatOpenAI not available or failed, falling back to HTTP:",
        importErr && importErr.message ? importErr.message : importErr
      );
      // fall through to HTTP fallback
    }
  }

  // -------- Google (Gemini) provider --------
  if (provider && provider.name === "google") {
    // 1) Try LangChain ChatGoogleGenerativeAI
    try {
      console.log(
        "[llmAdapter] Attempting LangChain ChatGoogleGenerativeAI (invoke)..."
      );

      const mod = await import("@langchain/google-genai");
      const { ChatGoogleGenerativeAI } = mod;

      if (!ChatGoogleGenerativeAI) {
        throw new Error(
          "ChatGoogleGenerativeAI not found in @langchain/google-genai"
        );
      }

      // Normalize model id: strip "models/" if present
      const modelId = normalizeModel(model, "gemini-2.5-flash");

      // Prefer provider.key, otherwise GOOGLE_API_KEY from settings
      const googleKey =
        (provider && provider.key) || (await getSetting("google_api_key"));
      if (!googleKey) {
        throw new Error(
          "No Google API key configured for LangChain ChatGoogleGenerativeAI"
        );
      }

      const maxOutputTokens =
        typeof opts.max_tokens === "number" ? opts.max_tokens : 8192;

      const client = new ChatGoogleGenerativeAI({
        model: modelId,
        apiKey: googleKey,
        temperature,
        maxOutputTokens, // increased default
      });

      const input = messages
        .map((m) => `${m.role}: ${m.content}`)
        .join("\n");

      let resp = await client.invoke(input);

      const extractText = (r) => {
        if (!r) return "";
        if (typeof r === "string") return r;
        if (typeof r.content === "string") return r.content;
        if (Array.isArray(r.content)) {
          const parts = r.content
            .map((p) => {
              if (typeof p === "string") return p;
              if (!p) return "";
              if (p.text) return p.text;
              if (p.type === "text" && p.content) return p.content;
              return "";
            })
            .filter(Boolean);
          if (parts.length) return parts.join("\n");
        }
        return "";
      };

      let text = extractText(resp);

      const finishReason =
        resp?.additional_kwargs?.finishReason ||
        resp?.response_metadata?.finishReason;
      if (
        finishReason &&
        String(finishReason).toUpperCase().includes("MAX_TOKENS")
      ) {
        console.warn(
          "[llmAdapter] Gemini finished with MAX_TOKENS. Consider increasing opts.max_tokens if you need more."
        );
        console.warn(
          "[llmAdapter] Response object:",
          JSON.stringify(resp, null, 2)
        );
      }

      if (text && text.trim()) return text;

      // If text is empty but we have a response, log warning and return empty string
      // DO NOT return the entire response object as that breaks JSON parsing
      console.warn(
        "[llmAdapter] Gemini returned empty text. Finish reason:",
        finishReason
      );
      console.warn(
        "[llmAdapter] Full response:",
        JSON.stringify(resp, null, 2)
      );
      
      // Return empty string or throw error instead of returning the object
      throw new Error(
        `Gemini returned empty response. Finish reason: ${finishReason}. Please increase max_tokens.`
      );
    } catch (lcErr) {
      console.warn(
        "[llmAdapter] LangChain ChatGoogleGenerativeAI failed, falling back to HTTP:",
        lcErr && lcErr.message ? lcErr.message : lcErr
      );
      // fall through to HTTP fallback
    }

    // 2) HTTP fallback: direct Gemini API call with retry logic
    try {
      let fetchFn = global.fetch;
      if (!fetchFn) {
        const nf = await import("node-fetch");
        fetchFn = nf.default;
      }

      let modelId = normalizeModel(model, "gemini-2.5-flash");
      const maxOutputTokens =
        typeof opts.max_tokens === "number" ? opts.max_tokens : 8192;

      // Retry logic for 503 errors
      const maxRetries = 3;
      let lastError = null;

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          // If retrying and we were using Pro, fall back to Flash
          if (attempt > 1 && modelId.includes('pro')) {
            console.log(`[llmAdapter] Retry ${attempt}: Falling back to gemini-2.5-flash`);
            modelId = 'gemini-2.5-flash';
          }

          const endpoint = `https://generativelanguage.googleapis.com/v1/models/${modelId}:generateContent?key=${provider.key}`;

          // Combine messages into Gemini "contents"
          const contents = [
            {
              parts: [
                {
                  text: messages
                    .map((m) => `${m.role}: ${m.content}`)
                    .join("\n"),
                },
              ],
            },
          ];

          const body = {
            contents,
            generationConfig: {
              maxOutputTokens,
              temperature,
            },
          };

          console.log(`[llmAdapter] Google HTTP attempt ${attempt}/${maxRetries}:`, {
            provider: !!provider,
            providerKey: provider.key ? "<present>" : "<missing>",
            model: modelId,
            maxOutputTokens,
          });

          const resp = await fetchFn(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });

          if (!resp.ok) {
            const txt = await resp.text();
            const error = new Error(`Google Generative API error: ${resp.status} ${txt}`);
            
            // If 503 (overloaded) and we have retries left, continue loop
            if (resp.status === 503 && attempt < maxRetries) {
              lastError = error;
              const waitTime = Math.pow(2, attempt) * 1000; // Exponential backoff: 2s, 4s, 8s
              console.warn(`[llmAdapter] 503 error, retrying in ${waitTime}ms...`);
              await new Promise(resolve => setTimeout(resolve, waitTime));
              continue;
            }
            
            throw error;
          }

          // Success! Parse and return the response
          const j = await resp.json();
          const content =
            j?.candidates?.[0]?.content?.parts?.[0]?.text ||
            j?.candidates?.[0]?.text ||
            "";

          return content;
        } catch (attemptError) {
          lastError = attemptError;
          
          // If this was the last attempt, throw the error
          if (attempt === maxRetries) {
            throw lastError;
          }
          
          // Otherwise continue to next retry
          console.warn(`[llmAdapter] Attempt ${attempt} failed:`, attemptError.message);
        }
      }

      // If we got here, all retries failed
      throw lastError || new Error('All retry attempts failed');
    } catch (e) {
      // Explicit google provider and both paths failed – bubble up
      throw e;
    }
  }

  // -------- Fallback: OpenAI via HTTP (provider missing or not google) --------
  try {
    const activeKey =
      (provider && provider.key) || (await getSetting("openai_api_key"));
    if (!activeKey) throw new Error("No API key configured");

    let fetchFn = global.fetch;
    if (!fetchFn) {
      const nf = await import("node-fetch");
      fetchFn = nf.default;
    }

    // Ensure messages array shape is correct
    const formattedMessages = Array.isArray(messages)
      ? messages.map((m) => ({
          role: m.role || "user",
          content: m.content || "",
        }))
      : [{ role: "user", content: String(messages) }];

    const maxTokens =
      typeof opts.max_tokens === "number" ? opts.max_tokens : 4096;

    const payload = {
      model,
      messages: formattedMessages,
      temperature,
      max_tokens: maxTokens, // increased default; no more forced 2048 cap
    };

    const resp = await fetchFn(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${activeKey}`,
        },
        body: JSON.stringify(payload),
      }
    );

    if (!resp.ok) {
      const txt = await resp.text();
      throw new Error(`OpenAI HTTP error: ${resp.status} ${txt}`);
    }

    const j = await resp.json();
    const content =
      j?.choices?.[0]?.message?.content || j?.choices?.[0]?.text || "";
    return content;
  } catch (e) {
    throw e;
  }
}

module.exports = { getActiveProvider, chat };
