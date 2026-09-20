import dotenv from 'dotenv';

dotenv.config();
console.log('Gemini Key Detected:', !!process.env.GEMINI_API_KEY);
import express from 'express';
import path from 'path';
import { GoogleGenAI } from '@google/genai';
import { ALL_KNOWLEDGE_CHUNKS, DEMO_KNOWLEDGE_DOCUMENTS } from './src/data/demoKnowledgeBase';
import { defaultRagEngine } from './src/services/ragService';
import { QueryRoute, LanguageCode, UserProfile, GrievanceFormData, GrievanceLetter } from './src/types';

const app = express();
const PORT = 3000;

app.use(express.json());

// In-memory persistent stores for sessions & workflows
const userProfilesStore: Record<string, UserProfile> = {};
const workflowStatesStore: Record<string, any> = {};

// Lazy Gemini client initialization with telemetry User-Agent
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  if (!process.env.GEMINI_API_KEY) {
    return null;
  }
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

// ----------------------------------------------------
// 1. QUERY CLASSIFIER / ROUTER LOGIC
// ----------------------------------------------------
function classifyQueryLocal(query: string): { route: QueryRoute; confidence: number; reasoning: string } {
  const q = query.toLowerCase();

  // 1. Voting rights & Elections intent (checked before general rights)
  if (
    q.includes('vote') || q.includes('voting') || q.includes('election') || 
    q.includes('ఓటు') || q.includes('ఓటింగ్') || q.includes('ఎన్నిక') ||
    q.includes('मतदान') || q.includes('चुनाव') || q.includes('చట్టబద్ధ')
  ) {
    return {
      route: 'GOVERNANCE_PROCEDURE',
      confidence: 0.95,
      reasoning: 'The query asks about voting qualifications, election rules, or democratic governance in bylaws.',
    };
  }

  // 2. Grievance queries
  if (
    q.includes('grievance') || q.includes('complaint') || q.includes('complain') ||
    q.includes('ఫిర్యాదు') || q.includes('शिकायत') || q.includes('petition')
  ) {
    return {
      route: 'GRIEVANCE',
      confidence: 0.92,
      reasoning: 'The query requests grievance redressal or formal dispute filing.',
    };
  }

  // 3. Inspection & Legal Rights (only when voting is not mentioned)
  if (
    q.includes('inspect') || q.includes('audit') || q.includes('ombudsman') ||
    q.includes('రికార్డు') || q.includes('ఆడిట్') || q.includes('హక్కు')
  ) {
    return {
      route: 'LEGAL_RIGHTS',
      confidence: 0.9,
      reasoning: 'The query pertains to statutory rights to inspect records or audit reports.',
    };
  }

  return {
    route: 'GENERAL_COOPERATIVE_INFORMATION',
    confidence: 0.75,
    reasoning: 'General cooperative inquiry.',
  };
}

// ----------------------------------------------------
// 2. TOOL IMPLEMENTATIONS
// ----------------------------------------------------
const toolsRegistry = {
  classifyQuery: async (args: { query: string }) => {
    return classifyQueryLocal(args.query);
  },

  retrieveKnowledge: async (args: { query: string; route?: QueryRoute; limit?: number }) => {
    const results = defaultRagEngine.search(args.query, {
      route: args.route,
      limit: args.limit || 3,
    });
    return {
      count: results.length,
      results: results.map(r => ({
        docTitle: r.chunk.docTitle,
        docType: r.chunk.docType,
        source: r.chunk.source,
        section: r.chunk.section,
        chapter: r.chunk.chapterOrPart,
        pageNumber: r.chunk.pageNumber,
        isDemoData: r.chunk.isDemoData,
        excerpt: r.snippet,
        score: r.score,
        fullContent: r.chunk.content,
      })),
      contextText: defaultRagEngine.formatGroundingContext(results),
    };
  },

  searchBylaws: async (args: { sectionKeyword: string }) => {
    const results = defaultRagEngine.search(args.sectionKeyword, { limit: 4 });
    return {
      matches: results.map(r => ({
        section: r.chunk.section,
        bylaw: r.chunk.content,
        source: r.chunk.source,
      })),
    };
  },

  getProcedure: async (args: { procedureType: 'election' | 'grievance' | 'registration' | 'voting_rights' | 'membership' }) => {
    const keyMap = {
      election: 'State Cooperative Societies Election Rules',
      grievance: 'Cooperative Grievance Redressal & Member Dispute Rules',
      registration: 'Cooperative Society Formation & Registration Manual',
      voting_rights: 'One Member One Vote Principle',
      membership: 'Admission & Eligibility of Members',
    };
    const results = defaultRagEngine.search(keyMap[args.procedureType] || args.procedureType, { limit: 2 });
    return {
      procedureType: args.procedureType,
      stepsSummary: results.map(r => r.chunk.content),
    };
  },

  generateGrievanceLetter: async (args: { formData: GrievanceFormData }) => {
    const query = `${args.formData.issueCategory} ${args.formData.issueDescription}`;
    const searchRes = defaultRagEngine.search(query, { route: 'GRIEVANCE', limit: 2 });
    const citedRules = searchRes.map(r => `${r.chunk.docTitle}, ${r.chunk.section}: ${r.chunk.content.substring(0, 140)}...`);

    const dateStr = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
    const letter: GrievanceLetter = {
      id: `letter-${Date.now()}`,
      generatedDate: dateStr,
      recipientTitle: 'The President / Secretary & Managing Committee (Copy to: District Deputy Registrar)',
      societyName: args.formData.societyName || 'Primary Cooperative Society',
      memberName: args.formData.memberName || 'Aggrieved Member',
      subject: `Formal Grievance Regarding ${args.formData.issueCategory} Issue under Statutory Cooperative Bylaws`,
      salutation: 'Respected Office Bearers,',
      bodyParagraphs: [
        `I am a bona fide member of ${args.formData.societyName || 'the Society'}. I am formally submitting this petition regarding an ongoing dispute concerning ${args.formData.issueCategory.toLowerCase()}.`,
        `Facts of the matter: During the period of ${args.formData.dateOrPeriod || 'the current cooperative year'}, the following grievance occurred: ${args.formData.issueDescription}. This action directly infringes upon my statutory membership entitlements and fair governance principles.`,
        args.formData.peopleOrRoleInvolved ? `Parties involved or responsible: ${args.formData.peopleOrRoleInvolved}.` : '',
        `Under the applicable cooperative bylaws, the society is obligated to maintain transparent operations and provide an official acknowledgement receipt within 24 hours of receiving this grievance.`,
      ].filter(Boolean),
      bylawReferences: citedRules.length > 0 ? citedRules : [
        'Model Primary Cooperative Society Bylaws - Section 11: Member Rights & Non-discrimination',
        'Cooperative Grievance Redressal Rules - Rule 3: Mandatory Internal Grievance Cell and 30-day Resolution Window',
        'Cooperative Grievance Redressal Rules - Rule 14: Prohibition of Retaliatory Suspension or Penalty',
      ],
      requestedActionList: [
        args.formData.desiredResolution || 'Immediate rectification of the grievance and restoration of lawful rights.',
        'Issue a stamped and dated acknowledgement receipt with a Grievance Tracking Number.',
        'Table this matter before the next immediate meeting of the Managing Committee and convey the written decision within 30 days.',
      ],
      closing: 'Thanking you in anticipation of a prompt and lawful resolution.',
      rawText: '',
    };
    return letter;
  },

  getUserProfile: async (args: { userId: string }) => {
    return userProfilesStore[args.userId] || null;
  },

  updateUserProfile: async (args: { userId: string; profile: UserProfile }) => {
    userProfilesStore[args.userId] = args.profile;
    return { success: true, profile: args.profile };
  },

  saveWorkflowState: async (args: { taskId: string; state: any }) => {
    workflowStatesStore[args.taskId] = args.state;
    return { success: true, savedAt: new Date().toISOString() };
  },

  getWorkflowState: async (args: { taskId: string }) => {
    return workflowStatesStore[args.taskId] || null;
  },
};

// ----------------------------------------------------
// 3. API ENDPOINTS
// ----------------------------------------------------

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    geminiConfigured: !!process.env.GEMINI_API_KEY,
    appName: 'Co-opSahayak',
    version: '1.0.0',
  });
});

app.post('/api/route-query', async (req, res) => {
  try {
    const { query } = req.body;
    if (!query) {
      res.status(400).json({ error: 'Query string required' });
      return;
    }
    const classification = classifyQueryLocal(query);
    res.json(classification);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/rag/search', async (req, res) => {
  try {
    const { query, route, limit } = req.body;
    const searchResults = defaultRagEngine.search(query, {
      route: route as QueryRoute,
      limit: limit || 3,
    });
    res.json({
      query,
      results: searchResults,
      sources: defaultRagEngine.toSourceReferences(searchResults),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/tools/execute', async (req, res) => {
  try {
    const { toolName, args } = req.body;
    const toolFn = (toolsRegistry as any)[toolName];
    if (!toolFn) {
      res.status(404).json({ error: `Tool ${toolName} not found` });
      return;
    }
    const result = await toolFn(args || {});
    res.json({ success: true, toolName, result });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/grievance/generate-letter', async (req, res) => {
  try {
    const { formData } = req.body;
    if (!formData) {
      res.status(400).json({ error: 'formData is required' });
      return;
    }
    const letter = await toolsRegistry.generateGrievanceLetter({ formData });
    res.json({ success: true, letter });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// 4. MULTI-STEP AGENT ORCHESTRATION CHAT ENDPOINT
// ----------------------------------------------------
app.post('/api/chat', async (req, res) => {
  try {
    const { query, history, profile, language } = req.body;
    if (!query || typeof query !== 'string') {
      res.status(400).json({ error: 'Query is required' });
      return;
    }

    const requestedLang: LanguageCode = language || profile?.responseLanguage || 'en';
    const userName = profile?.name || 'Member';
    const societyName = profile?.societyName || 'Cooperative Society';

    // Step 1: Query Classification & Tool Selection
    const classification = classifyQueryLocal(query);
    const toolsUsed: string[] = ['classifyQuery'];

    // If out of scope, politely redirect
    if (classification.route === 'OUT_OF_SCOPE') {
      let outOfScopeMsg = "I specialize strictly in cooperative societies, member rights, voting rules, bylaws, and grievance drafting. Please ask a question related to cooperative governance or procedures.";
      if (requestedLang === 'te') {
        outOfScopeMsg = "నమస్కారం, నేను సహకార సంఘాల ఉపనియమాలు, సభ్యుల హక్కులు, ఓటింగ్ మరియు ఫిర్యాదుల తయారీలో మాత్రమే సహాయం చేయగలను. దయచేసి సహకార సంఘానికి సంబంధించిన ప్రశ్నలను అడగండి.";
      } else if (requestedLang === 'hi') {
        outOfScopeMsg = "नमस्ते, मैं केवल सहकारी समितियों, सदस्य अधिकारों, मतदान नियमों, उपनियमों और शिकायत पत्र से संबंधित सहायता प्रदान करता हूँ। कृपया सहकारी समिति से संबंधित प्रश्न पूछें।";
      }

      res.json({
        response: outOfScopeMsg,
        route: classification.route,
        sources: [],
        toolsUsed,
        suggestedFollowups: [
          requestedLang === 'te' ? 'నా ఓటు హక్కుల గురించి తెలపండి' : 'Can I vote in my cooperative election?',
          requestedLang === 'te' ? 'ఫిర్యాదు ఎలా దాఖలు చేయాలి?' : 'How do I file a grievance?',
        ],
      });
      return;
    }

    // Step 2: RAG Retrieval Tool
    toolsUsed.push('retrieveKnowledge');
    const searchResults = defaultRagEngine.search(query, {
      route: classification.route,
      limit: 3,
    });
    const sources = defaultRagEngine.toSourceReferences(searchResults);
    const groundingContext = defaultRagEngine.formatGroundingContext(searchResults);

    // Step 3: Check if Gemini Client is available for generation
    const gemini = getGeminiClient();
    let finalAnswer = '';

    const langNameMap: Record<LanguageCode, string> = {
      en: 'English',
      te: 'Telugu (తెలుగు)',
      hi: 'Hindi (हिन्दी)',
      kn: 'Kannada (ಕನ್ನಡ)',
      ta: 'Tamil (தமிழ்)',
      ml: 'Malayalam (മലയാളം)',
      mr: 'Marathi (मराठी)',
      bn: 'Bengali (বাংলা)',
      gu: 'Gujarati (ગુજરાતી)',
      pa: 'Punjabi (ਪੰਜਾਬੀ)',
      or: 'Odia (ଓଡ଼ିଆ)',
      as: 'Assamese (অসমীয়া)',
    };

    const targetLangName = langNameMap[requestedLang] || 'English';

    if (gemini) {
      try {
        const systemPrompt = `You are "Co-opSahayak", an authoritative AI Legal Helpdesk for Indian cooperative societies.
CRITICAL TRANSLATION & LANGUAGE RULES:
1. Target response language is "${targetLangName}".
2. You MUST translate and synthesize ALL explanations, procedures, and legal terms entirely into natural, fluent ${targetLangName} (using native script).
3. DO NOT output paragraphs in English. If the provided grounding source is in English, translate its meaning and explain it thoroughly in ${targetLangName}.
4. Always cite the relevant Bylaw or Act section name.
5. Ground your answer strictly in the provided sources:
${groundingContext}`;

        const userPrompt = `User question: "${query}"
Query Category: ${classification.route}
Target Language: ${targetLangName}`;

        const modelResponse = await gemini.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: userPrompt,
          config: {
            systemInstruction: systemPrompt,
            temperature: 0.2, // low temperature for high grounding accuracy
          },
        });

        finalAnswer = modelResponse.text || '';
      } catch (geminiError: any) {
        console.warn('Gemini API call failed, falling back to deterministic synthesis:', geminiError.message);
      }
    }

    // Multilingual synthesis fallback (works even if GEMINI_API_KEY is not configured or offline)
    if (!finalAnswer) {
      const top = searchResults[0]?.chunk;

      if (!top) {
        const notFoundMap: Record<LanguageCode, string> = {
          te: 'క్షమించండి, అందుబాటులో ఉన్న సహకార నిబంధనల నుండి ఈ సమాచారం ధృవీకరించబడలేదు.',
          kn: 'ಕ್ಷಮಿಸಿ, ಲಭ್ಯವಿರುವ ಸಹಕಾರಿ ಬೈಲಾಗಳು ಅಥವಾ ಕಾಯ್ದೆಗಳಿಂದ ಈ ಮಾಹಿತಿಯನ್ನು ಪರಿಶೀಲಿಸಲು ಸಾಧ್ಯವಾಗಲಿಲ್ಲ.',
          hi: 'क्षमा करें, उपलब्ध सहकारी उप-नियमों या अधिनियमों से इस जानकारी को सत्यापित नहीं किया जा सका।',
          ta: 'மன்னிக்கவும், கிடைக்கக்கூடிய கூட்டுறவு துணை விதிகளிலிருந்து இந்த தகவலை சரிபார்க்க முடியவில்லை.',
          mr: 'क्षमस्व, उपलब्ध सहकारी उपनियमांमधून ही माहिती सत्यापित केली जाऊ शकली नाही.',
          ml: 'ക്ഷമിക്കണം, ലഭ്യമായ സഹകരണ ഉപനിയമങ്ങളിൽ നിന്ന് ഈ വിവരം സ്ഥിരീകരിക്കാനായില്ല.',
          bn: 'দুঃখিত, উপলব্ধ সমবায় উপ-আইন থেকে এই তথ্য যাচাই করা যায়নি।',
          gu: 'માફ કરશો, ઉપલબ્ધ સહકારી પેટા-નિયમોમાંથી આ માહિતી ચકાસી શકાઈ નથી.',
          pa: 'ਮਾਫ ਕਰਨਾ, ਉਪਲਬਧ ਸਹਿਕਾਰੀ ਉਪ-ਨਿਯਮਾਂ ਤੋਂ ਇਸ ਜਾਣਕਾਰੀ ਦੀ ਪੁਸ਼ਟੀ ਨਹੀਂ ਕੀਤੀ ਜਾ ਸਕੀ।',
          or: 'ଦୁଃଖିତ, ଉପଲବ୍ଧ ସମବାୟ ନିୟମାବଳୀରୁ ଏହି ତଥ୍ୟ ଯାଞ୍ଚ କରାଯାଇ ପାରିଲା ନାହିଁ।',
          as: 'দুখিত, উপলব্ধ সমবায় উপ-আইনৰ পৰা এই তথ্য সত্যাপন কৰিব পৰা নগ’ল।',
          en: 'I could not verify this information from the currently available cooperative bylaws and statutory acts.',
        };
        finalAnswer = notFoundMap[requestedLang] || notFoundMap.en;
      } else if (top.id === 'bylaw-sec-11' || top.id === 'elect-rule-7') {
        // Voting Rights / Election query
        const votingAnswerMap: Record<LanguageCode, string> = {
          te: `సహకార సంఘ నిబంధనావళి (సెక్షన్ 11: 'ఒక సభ్యుడు - ఒకే ఓటు' సూత్రం) ప్రకారం:\n\n1. సహకార సంఘంలో ప్రతి యాక్టివ్ సభ్యునికి షేర్ల సంఖ్యతో సంబంధం లేకుండా ఖచ్చితంగా ఒక ఓటు హక్కు ఉంటుంది. ప్రాథమిక సంఘాలలో ప్రాక్సీ ఓటింగ్ పూర్తిగా నిషేధించబడింది.\n2. ఓటు హక్కు రద్దు నిబంధనలు: 90 రోజులకు మించి బకాయిలు ఉండకూడదు, ఎన్నికల తేదీకి కనీసం 30 రోజుల ముందు సభ్యత్వం పొంది ఉండాలి మరియు కనీస పాల/ఉత్పత్తి సరఫరా పూర్తి చేసి యాక్టివ్ సభ్యుడిగా ఉండాలి.\n\nసూచన: ఓటర్ల జాబితాలో మీ పేరు లేకపోతే రిటర్నింగ్ అధికారికి 10 రోజుల్లో లిఖితపూర్వక అభ్యంతరం దాఖలు చేయవచ్చు.`,
          kn: `ಮಾದರಿ ಪ್ರಾಥಮಿಕ ಸಹಕಾರ ಸಂಘದ ಉಪನಿಯಮಗಳು (ವಿಭಾಗ 11: 'ಒಬ್ಬ ಸದಸ್ಯ, ಒಂದು ಮತ' ತತ್ವ) ಪ್ರಕಾರ:\n\n1. ಸಹಕಾರ ಸಂಘದಲ್ಲಿ ಷೇರುಗಳ ಸಂಖ್ಯೆಯನ್ನು ಲೆಕ್ಕಿಸದೆ ಪ್ರತಿ ಸಕ್ರಿಯ ಸದಸ್ಯರಿಗೆ ನಿಖರವಾಗಿ ಒಂದು ಮತದ ಹಕ್ಕಿರುತ್ತದೆ. ಪ್ರಾಕ್ಸಿ (ಬದಲಿ) ಮತದಾನವನ್ನು ಸಂಪೂರ್ಣವಾಗಿ ನಿಷೇಧಿಸಲಾಗಿದೆ.\n2. ಅನರ್ಹತೆಯ ನಿಯಮಗಳು: 90 ದಿನಗಳಿಗಿಂತ ಹೆಚ್ಚು ಸಾಲದ ಬಾಕಿ ಇರಬಾರದು, ಚುನಾವಣೆಗೆ ಕನಿಷ್ಠ 30 ದಿನಗಳ ಮೊದಲು ಸದಸ್ಯತ್ವ ಪಡೆದಿರಬೇಕು ಮತ್ತು ಕನಿಷ್ಠ ವಹಿವಾಟು ನಡೆಸಿ ಸಕ್ರಿಯ ಸದಸ್ಯರಾಗಿರಬೇಕು.\n\nಸೂಚನೆ: ಮತದಾರರ ಪಟ್ಟಿಯಲ್ಲಿ ನಿಮ್ಮ ಹೆಸರಿಲ್ಲದಿದ್ದರೆ 10 ದಿನಗಳೊಳಗೆ ಚುನಾವಣಾ ಅಧಿಕಾರಿಗೆ ಆಕ್ಷೇಪಣೆ ಸಲ್ಲಿಸಬಹುದು.`,
          hi: `आदर्श प्राथमिक सहकारी समिति उप-नियम (धारा 11: 'एक सदस्य एक वोट' सिद्धांत) के अनुसार:\n\n1. प्रत्येक सक्रिय सदस्य को शेयरों की संख्या की परवाह किए बिना ठीक एक वोट का अधिकार है। प्रॉक्सी वोटिंग पूरी तरह से प्रतिबंधित है।\n2. अयोग्यता के नियम: 90 दिनों से अधिक का कोई ऋण बकाया नहीं होना चाहिए, चुनाव से कम से कम 30 दिन पहले सदस्यता ली गई हो, और न्यूनतम उत्पाद आपूर्ति का कोटा पूरा होना चाहिए।\n\nसुझाव: यदि मतदाता सूची में आपका नाम छूट गया है, तो 10 दिनों के भीतर आपत्ति दर्ज करें।`,
          ta: `மாதிரி கூட்டுறவு சங்க துணை விதிகள் (பிரிவு 11: 'ஒரு உறுப்பினர் ஒரு வாக்கு' கொள்கை) படி:\n\n1. ஒவ்வொரு செயலில் உள்ள உறுப்பினருக்கும் சரியாக ஒரு வாக்கு உரிமை உண்டு. பினாமி (Proxy) வாக்குப்பதிவு தடைசெய்யப்பட்டுள்ளது.\n2. தகுதியிழப்பு விதிகள்: 90 நாட்களுக்கு மேல் கடன் பாக்கி இருக்கக்கூடாது, தேர்தலுக்கு 30 நாட்களுக்கு முன் உறுப்பினராக சேர்ந்திருக்க வேண்டும்.\n\nகுறிப்பு: வாக்காளர் பட்டியலில் உங்கள் பெயர் இல்லையெனில் 10 நாட்களுக்குள் தேர்தல் அதிகாரியிடம் ஆட்சேபனை மனு சமர்ப்பிக்கலாம்.`,
          mr: `सहकारी संस्था उपनियम (कलम 11: 'एक सभासद एक मत' तत्त्व) नुसार:\n\n1. प्रत्येक सक्रिय सभासदास त्याच्याकडील शेअर्सच्या संख्येचा विचार न करता फक्त एक मत देण्याचा अधिकार आहे. प्रतिनिधीमार्फत (प्रॉक्सी) मतदान पूर्णपणे निषिद्ध आहे.\n2. मतदानासाठी अपात्रता: 90 दिवसांपेक्षा जास्त थकबाकी नसावी, निवडणुकीच्या किमान 30 दिवस आधी सदस्यत्व घेतलेले असावे.\n\nसूचना: मतदार यादीत नाव नसल्यास 10 दिवसांत निवडणूक अधिकाऱ्याकडे लेखी तक्रार दाखल करा.`,
          ml: `മാതൃകാ സഹകരണ സംഘം ഉപനിയമങ്ങൾ (വകുപ്പ് 11: 'ഒരു അംഗത്തിന് ഒരു വോട്ട്' തത്വം) അനുസരിച്ച്:\n\n1. ഓഹരികളുടെ എണ്ണം പരിഗണിക്കാതെ ഓരോ സജീവ അംഗത്തിനും കൃത്യമായി ഒരു വോട്ട് ചെയ്യാനുള്ള അവകാശമുണ്ട്. പ്രോക്സി വോട്ടിംഗ് നിരോധിച്ചിരിക്കുന്നു.\n2. അയോഗ്യതകൾ: 90 ദിവസത്തിൽ കൂടുതൽ വായ്പാ കുടിശ്ശിക ഉണ്ടാകരുത്, തെരഞ്ഞെടുപ്പിന് 30 ദിവസം മുമ്പെങ്കിലും അംഗത്വം നേടിയിരിക്കണം.`,
          bn: `মডেল সমবায় সমিতি উপ-আইন (ধারা ১১: 'এক সদস্য এক ভোট' নীতি) অনুযায়ী:\n\n১. শেয়ারের সংখ্যা নির্বিশেষে প্রতিটি সক্রিয় সদস্যের ঠিক একটি ভোট দেওয়ার অধিকার রয়েছে। প্রক্সি ভোটিং নিষিদ্ধ।\n২. ৯০ দিনের বেশি ঋণ বকেয়া থাকলে বা নির্বাচনের ৩০ দিনের মধ্যে সদস্যপদ গ্রহণ করলে ভোটদানের অধিকার স্থগিত হতে পারে।`,
          gu: `મોડેલ સહકારી મંડળી પેટા-નિયમો (કલમ 11: 'એક સભ્ય એક મત' સિદ્ધાંત) મુજબ:\n\n1. દરેક સક્રિય સભ્યને શેરની સંખ્યા ધ્યાનમાં લીધા વિના બરાબર એક મત આપવાનો અધિકાર છે. પ્રોક્સી મતદાન પ્રતિબંધિત છે.\n2. 90 દિવસથી વધુ લોનની બાકી ન હોવી જોઈએ અને ચૂંટણીના 30 દિવસ પહેલા સભ્યપદ લીધેલું હોવું જોઈએ.`,
          pa: `ਸਹਿਕਾਰੀ ਸਭਾ ਦੇ ਉਪ-ਨਿਯਮ (ਧਾਰਾ 11: 'ਇੱਕ ਮੈਂਬਰ ਇੱਕ ਵੋਟ' ਸਿਧਾਂਤ) ਅਨੁਸਾਰ ਹਰੇਕ ਸਰਗਰਮ ਮੈਂਬਰ ਕੋਲ ਇੱਕ ਵੋਟ ਦਾ ਅਧਿਕਾਰ ਹੈ। ਪ੍ਰੌਕਸੀ ਵੋਟਿੰਗ ਦੀ ਮਨਾਹੀ ਹੈ।`,
          or: `ସମବାୟ ସମିତି ଉପ-ନିୟମ (ଧାରା 11: 'ଜଣେ ସଭ୍ୟ ଗୋଟିଏ ଭୋଟ୍') ଅନୁଯାୟୀ ପ୍ରତ୍ୟେକ ସକ୍ରିୟ ସଦସ୍ୟଙ୍କର ଗୋଟିଏ ଭୋଟ୍ ଦେବାର ଅଧିକାର ରହିଛି।`,
          as: `সমবায় সমিতিৰ উপ-আইন (ধাৰা ১১: 'এজন সদস্য এটা ভোট') অনুসৰি প্ৰতিজন সক্ৰিয় সদস্যৰ এটা ভোট দিয়াৰ অধিকাৰ আছে।`,
          en: `According to Model Bylaws Section 11 (One Member, One Vote Principle):\n\nEvery active member is entitled to exactly one vote regardless of shares held. Proxy voting is strictly prohibited. Members with overdue loans exceeding 90 days or admitted within 30 days of the election are disqualified from voting.`,
        };
        finalAnswer = votingAnswerMap[requestedLang] || votingAnswerMap.en;
      } else {
        // General rights / inspection fallback
        const rightsAnswerMap: Record<LanguageCode, string> = {
          te: `సహకార చట్ట నిబంధనల ప్రకారం (${top.docTitle} - ${top.section}):\n\nప్రతి సభ్యుడికి సొసైటీ రికార్డులు, ఆడిట్ నివేదికలు మరియు నిబంధనలను ఉచితంగా తనిఖీ చేసే చట్టబద్ధమైన హక్కు ఉంది. 15 రోజుల్లో ధృవీకరించిన కాపీలను అందించడం సొసైటీ బాధ్యత.`,
          kn: `ಸಹಕಾರಿ ಕಾಯ್ದೆಯ ನಿಬಂಧನೆಗಳ ಪ್ರಕಾರ (${top.docTitle} - ${top.section}):\n\nಪ್ರತಿಯೊಬ್ಬ ಸದಸ್ಯರಿಗೆ ಸಂಘದ ದಾಖಲೆಗಳು, ಲೆಕ್ಕಪರಿಶೋಧನಾ ವರದಿಗಳು ಮತ್ತು ನಿಯಮಾವಳಿಗಳನ್ನು ಪರಿಶೀಲಿಸುವ ಶಾಸನಬದ್ಧ ಹಕ್ಕಿದೆ. 15 ದಿನಗಳೊಳಗೆ ಪ್ರಮಾಣೀಕೃತ ಪ್ರತಿಗಳನ್ನು ಒದಗಿಸುವುದು ಸಂಘದ ಕರ್ತವ್ಯವಾಗಿದೆ.`,
          hi: `सहकारी अधिनियम के प्रावधानों के अनुसार (${top.docTitle} - ${top.section}):\n\nप्रत्येक सदस्य को समिति के रिकॉर्ड, ऑडिट रिपोर्ट और उप-नियमों का निरीक्षण करने का वैधानिक अधिकार है।`,
          ta: `கூட்டுறவுச் சட்ட விதிகளின்படி (${top.docTitle} - ${top.section}):\n\nஒவ்வொரு உறுப்பினருக்கும் சங்க ஆவணங்கள் மற்றும் தணிக்கை அறிக்கைகளை ஆய்வு செய்யும் சட்டப்பூர்வ உரிமை உண்டு.`,
          mr: `सहकारी कायद्यानुसार (${top.docTitle} - ${top.section}):\n\nप्रत्येक सभासदास संस्थेची कागदपत्रे आणि ऑडिट रिपोर्ट तपासण्याचा कायदेशीर अधिकार आहे.`,
          ml: `സഹകരണ നിയമപ്രകാരം (${top.docTitle} - ${top.section}):\n\nസൊസൈറ്റി രേഖകളും ഓഡിറ്റ് റിപ്പോർട്ടുകളും പരിശോധിക്കാൻ ഓരോ അംഗത്തിനും നിയമപരമായ അവകാശമുണ്ട്.`,
          bn: `সমবায় আইন অনুযায়ী (${top.docTitle} - ${top.section}):\n\nপ্রতিটি সদস্যের সমিতির নথি এবং নিরীক্ষা প্রতিবেদন পরিদর্শন করার আইনি অধিকার রয়েছে।`,
          gu: `સહકારી કાયદા મુજબ (${top.docTitle} - ${top.section}):\n\nદરેક સભ્યને મંડળીના રેકોર્ડ અને ઓડિટ રિપોર્ટ તપાસવાનો કાનૂની અધિકાર છે.`,
          pa: `ਸਹਿਕਾਰੀ ਕਾਨੂੰਨ ਅਨੁਸਾਰ ਰਿਕਾਰਡ ਅਤੇ ਆਡਿਟ ਰਿਪੋਰਟਾਂ ਦੀ ਜਾਂਚ ਕਰਨ ਦਾ ਅਧਿਕਾਰ ਹੈ।`,
          or: `ସମବାୟ ଆଇନ ଅନୁଯାୟୀ ରେକର୍ଡ ଏବଂ ଅଡିଟ୍ ରିପୋର୍ଟ ଯାଞ୍ଚ କରିବାର ଅଧିକାର ରହିଛି।`,
          as: `সমবায় আইন অনুসৰি নথি আৰু অডিট ৰিপোৰ্ট পৰিদৰ্শন কৰাৰ অধিকাৰ আছে।`,
          en: `Based on ${top.docTitle} (${top.section}):\n\nMembers have the statutory right to inspect books, accounts, and audit reports without fees during normal business hours.`,
        };
        finalAnswer = rightsAnswerMap[requestedLang] || rightsAnswerMap.en;
      }
    }

    // Suggested follow-up questions in user's language
    let suggestedFollowups = [
      'What are my rights to inspect society audit records?',
      'How to file an objection against the provisional voter list?',
      'Can I file a formal grievance letter with Co-opSahayak?',
    ];
    if (requestedLang === 'te') {
      suggestedFollowups = [
        'సొసైటీ ఆడిట్ రికార్డులను పరిశీలించే హక్కు నాకు ఉందా?',
        'ఓటర్ల జాబితాపై అభ్యంతరం ఎలా వ్యక్తం చేయాలి?',
        'ఫిర్యాదు పత్రాన్ని ఎలా రూపొందించాలి?',
      ];
    } else if (requestedLang === 'hi') {
      suggestedFollowups = [
        'क्या मुझे समिति के ऑडिट रिकॉर्ड देखने का अधिकार है?',
        'मतदाता सूची पर आपत्ति कैसे दर्ज करें?',
        'शिकायत पत्र कैसे डाउनलोड करें?',
      ];
    }

    res.json({
      response: finalAnswer,
      route: classification.route,
      sources,
      toolsUsed,
      suggestedFollowups,
      reasoning: classification.reasoning,
    });
  } catch (err: any) {
    console.error('Chat endpoint error:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// ----------------------------------------------------
// 5. VITE INTEGRATION & SERVER BOOT
// ----------------------------------------------------
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Co-opSahayak Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
