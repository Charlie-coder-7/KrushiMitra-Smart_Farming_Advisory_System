const symptomGuidance = {
  yellowing: { label: ['Yellowing leaves', 'ପତ୍ର ହଳଦିଆ ହେବା'], issue: ['may relate to nutrient imbalance, water stress, root problems, or natural leaf aging.', 'ପୋଷକ ଅସନ୍ତୁଳନ, ପାଣି ଚାପ, ମୂଳ ସମସ୍ୟା କିମ୍ବା ପତ୍ରର ସ୍ୱାଭାବିକ ବୟସ ଯୋଗୁଁ ହୋଇପାରେ।'], causes: ['Check whether old or new leaves are affected, whether soil is too wet or dry, and whether several plants show the same pattern.', 'ପୁରୁଣା କି ନୂଆ ପତ୍ର ହଳଦିଆ ହେଉଛି, ମାଟି ଅଧିକ ଓଦା କିମ୍ବା ଶୁଖିଲା କି, ଏବଂ ଅନେକ ଗଛରେ ଏକାଭଳି ଲକ୍ଷଣ ଅଛି କି ଯାଞ୍ଚ କରନ୍ତୁ।'] },
  'brown-spots': { label: ['Brown spots', 'ବାଦାମୀ ଦାଗ'], issue: ['can result from fungal or bacterial leaf spots, nutrient stress, or injury; this guide cannot confirm which.', 'ଫଙ୍ଗସ୍ କିମ୍ବା ବ୍ୟାକ୍ଟେରିଆ ଜନିତ ଦାଗ, ପୋଷକ ଅଭାବ କିମ୍ବା ପତ୍ରର କ୍ଷତି ଯୋଗୁଁ ହୋଇପାରେ; ଏହି ଗାଇଡ୍ ନିଶ୍ଚିତ କରିପାରିବ ନାହିଁ।'], causes: ['Note whether spots are spreading, have yellow edges, or appear after prolonged leaf wetness. Similar spots can have different causes.', 'ଦାଗ ବଢ଼ୁଛି କି, ହଳଦିଆ ଧାର ଅଛି କି, କିମ୍ବା ପତ୍ର ଦୀର୍ଘ ସମୟ ଓଦା ରହିବା ପରେ ଦେଖାଦେଇଛି କି ଲକ୍ଷ୍ୟ କରନ୍ତୁ। ଏକାଭଳି ଦାଗର ଭିନ୍ନ କାରଣ ହୋଇପାରେ।'] },
  holes: { label: ['Holes or chewed edges', 'ପତ୍ରରେ ଛିଦ୍ର କିମ୍ବା କଟା ଧାର'], issue: ['may indicate chewing insects or caterpillars; inspect the plant before taking action.', 'ଚୋବାଉଥିବା କୀଟ କିମ୍ବା ଶୁକ ଯୋଗୁଁ ହୋଇପାରେ; ପଦକ୍ଷେପ ନେବା ପୂର୍ବରୁ ଗଛ ଯାଞ୍ଚ କରନ୍ତୁ।'], causes: ['Look under leaves and near growing tips for insects, eggs, webbing, or fresh droppings. Old holes may remain after pests are gone.', 'ପତ୍ର ତଳେ ଓ ନୂଆ କଅଁଳ ସ୍ଥାନରେ କୀଟ, ଅଣ୍ଡା, ଜାଲ କିମ୍ବା ତାଜା ମଳ ଅଛି କି ଦେଖନ୍ତୁ। କୀଟ ଚାଲିଯିବା ପରେ ମଧ୍ୟ ପୁରୁଣା ଛିଦ୍ର ରହିପାରେ।'] },
  'white-powder': { label: ['White powdery coating', 'ଧଳା ଗୁଣ୍ଡ ଭଳି ଆବରଣ'], issue: ['could be powdery mildew or residue; confirm that it spreads on living leaves before treating.', 'ପାଉଡରି ମିଲ୍ଡିଉ କିମ୍ବା ଅନ୍ୟ ଆବରଣ ହୋଇପାରେ; ଚିକିତ୍ସା ପୂର୍ବରୁ ଜୀବନ୍ତ ପତ୍ରରେ ଏହା ବଢ଼ୁଛି କି ଯାଞ୍ଚ କରନ୍ତୁ।'], causes: ['Check whether the coating rubs off or spreads to nearby leaves. Dust and spray residue can look similar.', 'ଆବରଣ ହାତରେ ଲାଗୁଛି କିମ୍ବା ପାଖ ପତ୍ରକୁ ବଢ଼ୁଛି କି ଯାଞ୍ଚ କରନ୍ତୁ। ଧୂଳି ଓ ଔଷଧର ଅବଶେଷ ମଧ୍ୟ ଏଭଳି ଦେଖାଯାଇପାରେ।'] },
  curling: { label: ['Curled or distorted leaves', 'ମୋଡ଼ିଯାଇଥିବା ପତ୍ର'], issue: ['may relate to sap-feeding insects, water stress, heat, or nutrient imbalance.', 'ରସ ଶୋଷୁଥିବା କୀଟ, ପାଣି ଚାପ, ଅଧିକ ଗରମ କିମ୍ବା ପୋଷକ ଅସନ୍ତୁଳନ ଯୋଗୁଁ ହୋଇପାରେ।'], causes: ['Inspect new leaves for small insects and compare affected plants with healthy plants nearby.', 'ନୂଆ ପତ୍ରରେ ଛୋଟ କୀଟ ଅଛି କି ଦେଖନ୍ତୁ ଏବଂ ପ୍ରଭାବିତ ଗଛକୁ ପାଖର ସୁସ୍ଥ ଗଛ ସହ ତୁଳନା କରନ୍ତୁ।'] },
  wilting: { label: ['Wilting', 'ଗଛ ମଉଳିବା'], issue: ['can result from lack of water, waterlogging, root damage, or disease.', 'ପାଣି ଅଭାବ, ପାଣି ଜମିବା, ମୂଳ କ୍ଷତି କିମ୍ବା ରୋଗ ଯୋଗୁଁ ହୋଇପାରେ।'], causes: ['Check soil moisture at root depth. If soil is wet but plants keep wilting, seek local expert help promptly.', 'ମୂଳ ଗଭୀରତାରେ ମାଟିର ଆର୍ଦ୍ରତା ଯାଞ୍ଚ କରନ୍ତୁ। ମାଟି ଓଦା ଥିଲେ ମଧ୍ୟ ଗଛ ମଉଳୁଥିଲେ ଶୀଘ୍ର ସ୍ଥାନୀୟ ବିଶେଷଜ୍ଞଙ୍କ ସହ କଥା ହୁଅନ୍ତୁ।'] },
  rotting: { label: ['Soft or rotting stem/root', 'କାଣ୍ଡ କିମ୍ବା ମୂଳ ନରମ/ପଚିବା'], issue: ['may be associated with excess moisture, poor drainage, or infection.', 'ଅଧିକ ଆର୍ଦ୍ରତା, ନିଷ୍କାସନ ସମସ୍ୟା କିମ୍ବା ସଂକ୍ରମଣ ଯୋଗୁଁ ହୋଇପାରେ।'], causes: ['Check for standing water, soil drainage, and whether the problem is spreading between plants.', 'ଜମିରେ ପାଣି ଜମିଛି କି, ମାଟିରୁ ପାଣି ନିଷ୍କାସନ ହେଉଛି କି, ଏବଂ ସମସ୍ୟା ଗଛରୁ ଗଛକୁ ବଢ଼ୁଛି କି ଯାଞ୍ଚ କରନ୍ତୁ।'] },
  'slow-growth': { label: ['Slow or stunted growth', 'ଧୀର କିମ୍ବା ଅଟକିଥିବା ବୃଦ୍ଧି'], issue: ['may relate to soil nutrients, root condition, water, temperature, or plant spacing.', 'ମାଟିର ପୋଷକ, ମୂଳର ଅବସ୍ଥା, ପାଣି, ତାପମାତ୍ରା କିମ୍ବା ଗଛର ଘନତା ଯୋଗୁଁ ହୋଇପାରେ।'], causes: ['Compare growth across the field. Consider a soil test before applying fertilizer.', 'କ୍ଷେତରେ ଗଛର ବୃଦ୍ଧି ତୁଳନା କରନ୍ତୁ। ସାର ପ୍ରୟୋଗ ପୂର୍ବରୁ ମାଟି ପରୀକ୍ଷା କରାଇବା ବିଚାର କରନ୍ତୁ।'] },
  unsure: { label: ['Not sure / no clear symptom', 'ଜଣାନାହିଁ / ସ୍ପଷ୍ଟ ଲକ୍ଷଣ ନାହିଁ'], issue: ['this offline guide does not scan photo pixels or make an automatic disease diagnosis.', 'ଏହି ଅଫଲାଇନ୍ ଗାଇଡ୍ ଫଟୋକୁ ସ୍ୱୟଂଚାଳିତ ଭାବେ ଯାଞ୍ଚ କିମ୍ବା ରୋଗ ନିର୍ଣ୍ଣୟ କରେନାହିଁ।'], causes: ['Take a well-lit photo of the whole plant and a close-up of the affected area, then ask a local agriculture officer to review it.', 'ଗଛର ସ୍ପଷ୍ଟ ଫଟୋ ଓ ପ୍ରଭାବିତ ଅଂଶର ନିକଟ ଫଟୋ ନିଅନ୍ତୁ ଏବଂ ସ୍ଥାନୀୟ କୃଷି ଅଧିକାରୀଙ୍କୁ ଦେଖାନ୍ତୁ।'] },
};

export function localAdvisory({ crop = '', growthStage = '', symptom = 'unsure', language = 'en' } = {}) {
  const selected = symptomGuidance[symptom] || symptomGuidance.unsure;
  const langIndex = language === 'or' ? 1 : 0;
  const context = [String(crop || '').trim(), String(growthStage || '').trim()].filter(Boolean).join(' · ');
  const lead = context ? `${context}${langIndex ? ' ଫସଲରେ ' : ' crop — '}` : '';
  return {
    probableIssue: `${lead}${selected.label[langIndex]}: ${selected.issue[langIndex]}`,
    causes: selected.causes[langIndex],
    activeIngredients: langIndex ? 'ଏହି ସରଳ ନିୟମ ଭିତ୍ତିକ ଗାଇଡ୍ କୌଣସି ରାସାୟନିକ ଔଷଧ ସୁପାରିଶ କରେନାହିଁ। ପ୍ରୟୋଗ ପୂର୍ବରୁ ସ୍ଥାନୀୟ କୃଷି ବିଶେଷଜ୍ଞଙ୍କୁ ପଚାରନ୍ତୁ।' : 'This simple rule-based guide does not recommend chemical treatments. Ask a local agriculture expert before applying any product.',
    organicAlternatives: langIndex ? 'କୀଟ ଦେଖିଲେ ହାତରେ ବାଛି କାଢ଼ନ୍ତୁ; ପ୍ରଭାବିତ ଅଂଶ କାଟିବା ପରେ ଯନ୍ତ୍ର ସଫା କରନ୍ତୁ।' : 'If pests are visible, remove them by hand where practical. Clean tools after pruning affected parts.',
    preventiveMeasures: langIndex ? 'କିଛି ଗଛକୁ ନିୟମିତ ଯାଞ୍ଚ କରନ୍ତୁ, ଲକ୍ଷଣର ତାରିଖ ଲେଖନ୍ତୁ ଏବଂ ପ୍ରଭାବିତ ଅଂଶ ଅନ୍ୟ ଜମିକୁ ନେବେ ନାହିଁ।' : 'Check several plants regularly, record when symptoms appear, and avoid moving affected plant material between fields.',
    irrigationGuidance: langIndex ? 'ମାଟିର ଆର୍ଦ୍ରତା ଓ ଫସଲର ଅବସ୍ଥା ଦେଖି ପାଣି ଦିଅନ୍ତୁ; ପାଣି ଜମିବାକୁ ଦିଅନ୍ତୁ ନାହିଁ।' : 'Base watering on soil moisture and crop stage; avoid both prolonged dryness and waterlogging.',
    treatmentTiming: langIndex ? 'ଲକ୍ଷଣ ବଢ଼ିଲେ କିମ୍ବା ଅନେକ ଗଛକୁ ଛୁଇଁଲେ, ଔଷଧ ପ୍ରୟୋଗ ପୂର୍ବରୁ କୃଷି ଅଧିକାରୀ କିମ୍ବା KVK ସହ ପରାମର୍ଶ କରନ୍ତୁ।' : 'If symptoms spread or affect many plants, ask an agriculture officer or KVK before treatment.',
    provider: langIndex ? 'ସ୍ଥାନୀୟ ଲକ୍ଷଣ ଗାଇଡ୍' : 'Local symptom guide',
  };
}

/** Analyze the uploaded crop photo through Gemini's server-side REST API. */
export async function getGeminiAdvisory({ crop, growthStage = '', symptom = 'unsure', district = '', block = '', village = '', farmerContext = {}, image, mimeType, apiKey, language = 'en', model = 'gemini-3.8-flash', fetchImpl = fetch, apiBaseUrl = 'https://generativelanguage.googleapis.com/v1beta', modelChain = null }) {
  if (!apiKey) throw new Error('Gemini API key is not configured on the server.');
  if (!Buffer.isBuffer(image) || !image.length) throw new Error('A crop image is required.');
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(mimeType)) throw new Error('Unsupported crop image type.');
  const farmDetails = [farmerContext.farmSizeAcres != null ? `farm size ${farmerContext.farmSizeAcres} acres` : '', farmerContext.soilType ? `soil type ${farmerContext.soilType}` : '', farmerContext.irrigationSource ? `irrigation ${farmerContext.irrigationSource}` : '', farmerContext.farmingExperienceYears != null ? `${farmerContext.farmingExperienceYears} years farming experience` : '', farmerContext.soil ? `soil test context: ${farmerContext.soil}` : ''].filter(Boolean).join('; ') || 'not provided';
  const prompt = `You are a careful crop-health assistant helping a farmer in Odisha, India. The attached image is the primary evidence: inspect its visible details before using the context. Crop=${crop}; growth stage=${growthStage || 'not provided'}; farmer-selected symptom=${symptom}; location=${[village, block, district].filter(Boolean).join(', ') || 'not provided'}; farmer-reported farm details=${farmDetails}. Use soil, irrigation, and farm size details to tailor practical non-chemical, irrigation, and prevention guidance where relevant. Treat these details as farmer-reported context, not verified measurements; never infer a diagnosis from them or let them override the photo. Return only valid JSON with string fields probableIssue, causes, activeIngredients, organicAlternatives, preventiveMeasures, irrigationGuidance, treatmentTiming. Write in ${language === 'or' ? 'Odia' : 'English'}. For probableIssue, give a crop-specific likely finding supported by the photo, state the visible evidence, and include a qualitative confidence (low, moderate, or high); do not invent a numeric accuracy score. If the image is unclear, the crop cannot be identified, or evidence is insufficient, state that plainly instead of guessing. Distinguish a possible issue from a confirmed diagnosis. For activeIngredients, base any candidate strictly on the same image-based finding and this crop: name a relevant active ingredient, pesticide type, target pest/disease, and why it fits only when the visual evidence supports it. Label it a candidate for local KVK/agriculture officer confirmation, never a prescription. If evidence is insufficient, explicitly say no pesticide can be safely suggested from this photo. Do not give brand names, dosage, dilution, or spray frequency. Do not claim a product is registered; instruct the farmer to verify the current product label for this exact crop and target and confirm with an officer before use. Prefer non-chemical measures where suitable.`;
  const url = `${apiBaseUrl.replace(/\/$/, '')}/models/${encodeURIComponent(model)}:generateContent`;
  const requestBody = JSON.stringify({ contents: [{ role: 'user', parts: [{ text: prompt }, { inline_data: { mime_type: mimeType, data: image.toString('base64') } }] }], generationConfig: { responseMimeType: 'application/json', temperature: 0.2 } });
  const makeOptions = () => ({
    method: 'POST', headers: { 'content-type': 'application/json', 'x-goog-api-key': apiKey },
    body: requestBody,
    signal: AbortSignal.timeout(30_000),
  });
  let response;
  for (let attempt = 0; attempt < 3; attempt++) {
    try { response = await fetchImpl(url, makeOptions()); }
    catch (error) {
      if (attempt === 2) throw new Error(`Gemini request failed: ${error?.name === 'TimeoutError' ? 'request timed out' : 'network error'}`);
    }
    if (response?.status < 500 || attempt === 2) break;
    await new Promise((resolve) => setTimeout(resolve, 400 * (attempt + 1)));
  }
  if (!response.ok) {
    // Gemini quotas are per model on some plans. Keep the configured model as
    // first choice, then use the verified vision-capable Flash Lite model if
    // the primary model is exhausted or unavailable.
    const fallbackChain = modelChain || [...new Set([model, 'gemini-3.1-flash-lite', 'gemini-3.5-flash-lite'])];
    const modelIndex = fallbackChain.indexOf(model);
    if ([404, 429, 503].includes(response.status) && modelIndex >= 0 && modelIndex < fallbackChain.length - 1) {
      const fallbackModel = fallbackChain[modelIndex + 1];
      const fallback = await getGeminiAdvisory({ crop, growthStage, symptom, district, block, village, farmerContext, image, mimeType, apiKey, language, model: fallbackModel, fetchImpl, apiBaseUrl, modelChain: fallbackChain });
      fallback.provider = `Gemini image analysis (${fallbackModel} fallback)`;
      return fallback;
    }
    const messages = { 400: 'Gemini rejected the image or request format (HTTP 400).', 401: 'Gemini API key is invalid (HTTP 401).', 403: 'Gemini API key lacks permission or quota access (HTTP 403).', 404: `Gemini model “${model}” was not found (HTTP 404).`, 429: 'Gemini quota or rate limit reached (HTTP 429).' };
    throw new Error(messages[response.status] || `Gemini service returned HTTP ${response.status}.`);
  }
  const payload = await response.json();
  const text = payload?.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('').trim();
  if (!text) throw new Error('Gemini returned no image analysis. Check image quality and try again.');
  let parsed;
  try { parsed = JSON.parse(text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')); }
  catch { throw new Error('Gemini returned an unreadable analysis. Please try again.'); }
  const fields = ['probableIssue', 'causes', 'activeIngredients', 'organicAlternatives', 'preventiveMeasures', 'irrigationGuidance', 'treatmentTiming'];
  const result = Object.fromEntries(fields.map((field) => {
    const value = parsed[field];
    const textValue = typeof value === 'string' ? value : Array.isArray(value) ? value.filter((item) => typeof item === 'string').join('; ') : '';
    return [field, textValue.trim().slice(0, 2000)];
  }));
  if (!result.probableIssue) throw new Error('Gemini did not provide a usable crop finding. Please try again.');
  result.provider = 'Gemini image analysis';
  return result;
}

export async function translateAssessmentText({ fields, targetLanguage, apiKey, model = 'gemini-3.8-flash', fetchImpl = fetch, apiBaseUrl = 'https://generativelanguage.googleapis.com/v1beta' }) {
  if (!apiKey) throw new Error('Gemini API key is not configured on the server.');
  if (!['en', 'or'].includes(targetLanguage)) throw new Error('Unsupported assessment language.');
  const keys = ['probableIssue', 'causes', 'activeIngredients', 'organicAlternatives', 'prevention', 'irrigation', 'timing', 'weather', 'soil'];
  const input = Object.fromEntries(keys.map((key) => [key, String(fields?.[key] || '').slice(0, 2000)]));
  const languageName = targetLanguage === 'or' ? 'Odia' : 'English';
  const prompt = `Translate the following crop assessment report text into ${languageName}. Preserve all agricultural meaning, uncertainty, warnings, pesticide active ingredient names, units, numbers, and proper names exactly. Translate every field value, do not add recommendations or facts. Return only valid JSON with the exact same keys and string values. Input: ${JSON.stringify(input)}`;
  const models = [...new Set([model, 'gemini-3.1-flash-lite', 'gemini-3.5-flash-lite'])];
  let lastError;
  for (const candidate of models) {
    const url = `${apiBaseUrl.replace(/\/$/, '')}/models/${encodeURIComponent(candidate)}:generateContent`;
    let response;
    try {
      response = await fetchImpl(url, { method: 'POST', headers: { 'content-type': 'application/json', 'x-goog-api-key': apiKey }, body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: prompt }] }], generationConfig: { responseMimeType: 'application/json', temperature: 0.1 } }), signal: AbortSignal.timeout(30_000) });
    } catch (error) { lastError = error; continue; }
    if (!response.ok) {
      lastError = new Error(`Gemini translation returned HTTP ${response.status}.`);
      if ([404, 429, 503].includes(response.status)) continue;
      throw lastError;
    }
    const payload = await response.json();
    const text = payload?.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('').trim();
    if (!text) { lastError = new Error('Gemini returned no translated text.'); continue; }
    let translated;
    try { translated = JSON.parse(text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')); }
    catch { lastError = new Error('Gemini returned invalid translated text.'); continue; }
    const result = Object.fromEntries(keys.map((key) => [key, typeof translated[key] === 'string' ? translated[key].trim().slice(0, 2000) : input[key]]));
    if (keys.some((key) => input[key] && !result[key])) { lastError = new Error('Gemini returned an incomplete translation.'); continue; }
    return result;
  }
  throw lastError || new Error('Gemini translation is unavailable.');
}

const weatherCodes = new Map([[0, 'Clear sky'], [1, 'Mainly clear'], [2, 'Partly cloudy'], [3, 'Overcast'], [45, 'Fog'], [48, 'Rime fog'], [51, 'Light drizzle'], [53, 'Drizzle'], [55, 'Dense drizzle'], [56, 'Freezing drizzle'], [57, 'Dense freezing drizzle'], [61, 'Light rain'], [63, 'Rain'], [65, 'Heavy rain'], [66, 'Freezing rain'], [67, 'Heavy freezing rain'], [71, 'Light snow'], [73, 'Snow'], [75, 'Heavy snow'], [77, 'Snow grains'], [80, 'Rain showers'], [81, 'Rain showers'], [82, 'Heavy rain showers'], [85, 'Snow showers'], [86, 'Heavy snow showers'], [95, 'Thunderstorm'], [96, 'Thunderstorm with hail'], [99, 'Thunderstorm with heavy hail']]);
const weatherConditionsOdia = new Map([[0,'ନିର୍ମଳ ଆକାଶ'],[1,'ପ୍ରାୟ ନିର୍ମଳ ଆକାଶ'],[2,'ଆଂଶିକ ମେଘୁଆ'],[3,'ମେଘାଚ୍ଛନ୍ନ'],[45,'କୁହୁଡ଼ି'],[48,'ବରଫ କଣିକାଯୁକ୍ତ କୁହୁଡ଼ି'],[51,'ହାଲୁକା ଝିପିଝିପି ବର୍ଷା'],[53,'ଝିପିଝିପି ବର୍ଷା'],[55,'ଘନ ଝିପିଝିପି ବର୍ଷା'],[56,'ବରଫ ଜମାଉଥିବା ଝିପିଝିପି ବର୍ଷା'],[57,'ଘନ ବରଫ ଜମାଉଥିବା ଝିପିଝିପି ବର୍ଷା'],[61,'ହାଲୁକା ବର୍ଷା'],[63,'ବର୍ଷା'],[65,'ପ୍ରବଳ ବର୍ଷା'],[66,'ବରଫ ଜମାଉଥିବା ବର୍ଷା'],[67,'ପ୍ରବଳ ବରଫ ଜମାଉଥିବା ବର୍ଷା'],[71,'ହାଲୁକା ତୁଷାରପାତ'],[73,'ତୁଷାରପାତ'],[75,'ପ୍ରବଳ ତୁଷାରପାତ'],[77,'ତୁଷାର କଣିକା'],[80,'ଅଳ୍ପ ସମୟର ବର୍ଷା'],[81,'ଅଳ୍ପ ସମୟର ବର୍ଷା'],[82,'ଅଳ୍ପ ସମୟର ପ୍ରବଳ ବର୍ଷା'],[85,'ଅଳ୍ପ ସମୟର ତୁଷାରପାତ'],[86,'ଅଳ୍ପ ସମୟର ପ୍ରବଳ ତୁଷାରପାତ'],[95,'ଘଡ଼ଘଡ଼ି ସହ ବର୍ଷା'],[96,'କୁଆପଥର ସହ ଘଡ଼ଘଡ଼ି ବର୍ଷା'],[99,'ପ୍ରବଳ କୁଆପଥର ସହ ଘଡ଼ଘଡ଼ି ବର୍ଷା']]);

const unavailableWeather = (summary = 'Current weather could not be retrieved. Check your connection and try again.') => ({ summary, provider: 'Unavailable' });

const reverseLocationCache = new Map();
export async function reverseGeocode({ latitude, longitude, language = 'en', fetchImpl = fetch }) {
  const key = `${Number(latitude).toFixed(4)},${Number(longitude).toFixed(4)},${language}`;
  const cached = reverseLocationCache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.location;
  try {
    const url = new URL('https://nominatim.openstreetmap.org/reverse');
    url.search = new URLSearchParams({ format: 'jsonv2', lat: String(latitude), lon: String(longitude), zoom: '14', addressdetails: '1', 'accept-language': language === 'or' ? 'or,en' : 'en' });
    const response = await fetchImpl(url, { headers: { 'User-Agent': 'KrushiMitra/1.0 (GPS place-name lookup)' }, signal: AbortSignal.timeout(8000) });
    if (!response.ok) return null;
    const payload = await response.json();
    const address = payload?.address || {};
    const village = address.village || address.hamlet || address.town || address.city || address.municipality || address.suburb || address.neighbourhood || payload?.name || null;
    const district = address.state_district || address.district || address.county || address.city_district || null;
    const state = address.state || null;
    const location = village || district || state ? { village, district, state, displayName: [village, district, state].filter(Boolean).join(', '), attribution: '© OpenStreetMap contributors' } : null;
    if (location) {
      if (reverseLocationCache.size >= 500) reverseLocationCache.delete(reverseLocationCache.keys().next().value);
      reverseLocationCache.set(key, { location, expiresAt: Date.now() + 6 * 60 * 60 * 1000 });
    }
    return location;
  } catch { return null; }
}

export async function getWeather({ district, block, village, latitude, longitude, language = 'en', apiKey, apiUrl = 'https://api.weatherapi.com/v1/current.json', fetchImpl = fetch }) {
  const location = [village, block, district].filter((v) => typeof v === 'string' && v.trim()).join(', ');
  const hasCoordinates = latitude !== null && latitude !== undefined && latitude !== '' && longitude !== null && longitude !== undefined && longitude !== '' && Number.isFinite(Number(latitude)) && Number.isFinite(Number(longitude));

  // Retain WeatherAPI as the preferred provider when configured, but always fall back to a keyless provider.
  if (apiKey && location) {
    try {
      const url = new URL(apiUrl); url.searchParams.set('key', apiKey); url.searchParams.set('q', hasCoordinates ? `${latitude},${longitude}` : location); url.searchParams.set('aqi', 'no');
      const response = await fetchImpl(url, { signal: AbortSignal.timeout(8_000) });
      if (!response.ok) throw new Error('Weather provider error');
      const current = (await response.json()).current;
      if (Number.isFinite(current?.temp_c)) {
        const condition = current.condition?.text || (language === 'or' ? 'ବର୍ତ୍ତମାନର ପାଣିପାଗ' : 'Current conditions');
        return { summary: `${current.temp_c} °C · ${condition} · ${language === 'or' ? 'ଆର୍ଦ୍ରତା' : 'humidity'} ${current.humidity}%`, provider: 'WeatherAPI', temperatureC: current.temp_c, feelsLikeC: current.feelslike_c, condition, humidity: current.humidity, precipitation: current.precip_mm, windSpeedKmh: current.wind_kph, observedAt: current.last_updated || new Date().toISOString() };
      }
    } catch { /* fall through to Open-Meteo */ }
  }

  try {
    let coords = hasCoordinates ? { latitude: Number(latitude), longitude: Number(longitude) } : null;
    if (!coords && location) {
      const searchTerms = [village, block, district].filter((v) => typeof v === 'string' && v.trim());
      for (const term of searchTerms) {
        const geocodeUrl = new URL('https://geocoding-api.open-meteo.com/v1/search');
        geocodeUrl.search = new URLSearchParams({ name: term, count: '5', language: language === 'or' ? 'or' : 'en', countryCode: 'IN', format: 'json' });
        const response = await fetchImpl(geocodeUrl, { signal: AbortSignal.timeout(8_000) });
        if (!response.ok) continue;
        const results = (await response.json()).results || [];
        const match = results.find((item) => !district || item.admin2?.toLowerCase().includes(district.toLowerCase()) || item.admin1?.toLowerCase().includes(district.toLowerCase())) || results[0];
        if (Number.isFinite(match?.latitude) && Number.isFinite(match?.longitude)) { coords = { latitude: match.latitude, longitude: match.longitude }; break; }
      }
    }
    if (!coords) return unavailableWeather(language === 'or' ? 'ବର୍ତ୍ତମାନର ପାଣିପାଗ ପାଇଁ ଚାଷ ଅଞ୍ଚଳ ଲେଖନ୍ତୁ କିମ୍ବା ଅବସ୍ଥାନ ଅନୁମତି ଦିଅନ୍ତୁ।' : 'Set your farm location or allow location access to get current weather.');
    const url = new URL('https://api.open-meteo.com/v1/forecast');
    url.search = new URLSearchParams({ ...coords, current: 'temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m', timezone: 'auto' });
    const response = await fetchImpl(url, { signal: AbortSignal.timeout(8_000) });
    if (!response.ok) throw new Error('Open-Meteo provider error');
    const payload = await response.json(); const current = payload.current;
    if (!Number.isFinite(current?.temperature_2m)) throw new Error('Weather response is incomplete');
    const condition = (language === 'or' ? weatherConditionsOdia : weatherCodes).get(current.weather_code) || (language === 'or' ? 'ପାଣିପାଗ ତଥ୍ୟ ଉପଲବ୍ଧ ନାହିଁ' : 'Conditions unavailable');
    const temperatureC = current.temperature_2m; const humidity = current.relative_humidity_2m;
    return { summary: `${temperatureC} °C · ${condition}${Number.isFinite(humidity) ? ` · ${language === 'or' ? 'ଆର୍ଦ୍ରତା' : 'humidity'} ${humidity}%` : ''}`, provider: 'Open-Meteo', temperatureC, feelsLikeC: current.apparent_temperature, humidity, precipitation: current.precipitation, windSpeedKmh: current.wind_speed_10m, condition, observedAt: current.time, latitude: coords.latitude, longitude: coords.longitude };
  } catch { return unavailableWeather(language === 'or' ? 'ବର୍ତ୍ତମାନର ପାଣିପାଗ ମିଳିଲା ନାହିଁ। ଇଣ୍ଟରନେଟ୍ ଯାଞ୍ଚ କରି ପୁଣି ଚେଷ୍ଟା କରନ୍ତୁ।' : undefined); }
}
