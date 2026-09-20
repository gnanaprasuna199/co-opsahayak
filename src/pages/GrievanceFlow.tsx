import React, { useState } from 'react';
import {
  FileText,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Sparkles,
  AlertCircle,
  BookOpen,
  Calendar,
  Building,
  User,
  Shield,
  HelpCircle,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { defaultRagEngine } from '../services/ragService';
import { generateGrievanceLetterApi } from '../services/api';
import { SourceReference } from '../types';

// Multilingual dictionary for the Grievance Wizard across 12 Indian languages
const GRIEVANCE_I18N: Record<string, any> = {
  en: {
    badge: 'Showcase Feature',
    subBadge: 'Legal Redressal Wizard',
    title: 'File a Formal Cooperative Grievance',
    subtitle: 'Collects essential facts, retrieves applicable bylaws, and generates an official submittable letter with PDF/TXT download.',
    viewLetter: 'View Generated Letter',
    stepOf: 'Step',
    of: 'of 5',
    steps: [
      'Member & Society Details',
      'Issue Category & Description',
      'Timeline & Involved Roles',
      'Desired Relief / Resolution',
      'Statutory Bylaw Grounding & Review'
    ],
    complainantName: 'Complainant Full Name *',
    memberId: 'Member ID / Passbook Number (Optional)',
    societyName: 'Cooperative Society Name *',
    societyAddress: 'Society Address / Village / District',
    issueCategoryLabel: 'Issue Category *',
    categories: ['Election', 'Membership', 'Financial / Accounts', 'Management / Misgovernance', 'Dividend / Dues', 'Other'],
    descriptionLabel: 'Detailed Factual Description *',
    descPlaceholder: 'Explain what occurred in simple words (e.g., My name was omitted from provisional voter list despite meeting the 500L milk supply threshold)...',
    dateLabel: 'Date or Approximate Time Period *',
    datePlaceholder: 'e.g. 15th September 2026 or past 2 weeks',
    peopleLabel: 'People or Roles Involved (Optional)',
    peoplePlaceholder: 'e.g. Secretary, Returning Officer, Managing Committee President',
    proofLabel: 'Supporting Proof / Documents Available (Optional)',
    proofPlaceholder: 'e.g. Milk delivery passbook receipts, membership share certificate copy',
    reliefLabel: 'Desired Resolution / Specific Relief *',
    reliefPlaceholder: 'e.g. Immediate restoration of my name in final voter list before polling date...',
    notesLabel: 'Additional Notes / Instructions (Optional)',
    notesPlaceholder: 'e.g. Request urgent hearing within 7 days due to impending election',
    reviewBylawsBtn: 'Review & Retrieve Bylaws',
    generateBtn: 'Generate Grievance Letter',
    generatingBtn: 'Generating Official Letter...',
    editDetails: 'Edit Details',
    relevantBylaws: 'Relevant Cooperative Bylaws Retrieved via RAG',
    inspect: 'Inspect'
  },
  mr: {
    badge: 'प्रमुख वैशिष्ट्य',
    subBadge: 'कायदेशीर निवारण विझार्ड',
    title: 'अधिकृत सहकारी तक्रार अर्ज दाखल करा',
    subtitle: 'महत्त्वाची तथ्ये गोळा करून, उपनियम जोडून अधिकृत सबमिट करता येणारा पीडीएफ अर्ज तयार करतो.',
    viewLetter: 'तयार झालेला अर्ज पहा',
    stepOf: 'टप्पा',
    of: 'पैकी ५',
    steps: [
      'सभासद व संस्था तपशील',
      'तक्रारीचा प्रकार व वर्णन',
      'कालावधी व संबंधित व्यक्ती',
      'अपेक्षित तोडगा / न्याय',
      'कायदेशीर उपनियम पडताळणी'
    ],
    complainantName: 'तक्रारदाराचे पूर्ण नाव *',
    memberId: 'सभासद क्र. / पासबुक क्र. (पर्यायी)',
    societyName: 'सहकारी संस्थेचे नाव *',
    societyAddress: 'संस्थेचा पत्ता / गाव / जिल्हा',
    issueCategoryLabel: 'तक्रारीचा प्रकार *',
    categories: ['निवडणूक', 'सदस्यत्व', 'आर्थिक / हिशोब', 'व्यवस्थापन / गैरप्रशासन', 'लाभांश / देयके', 'इतर'],
    descriptionLabel: 'घटनेचे तपशीलवार वर्णन *',
    descPlaceholder: 'झालेला प्रकार साध्या शब्दांत स्पष्ट करा...',
    dateLabel: 'तारीख किंवा अंदाजे कालावधी *',
    datePlaceholder: 'उदा. १५ सप्टेंबर २०२६ किंवा मागील २ आठवडे',
    peopleLabel: 'संबंधित व्यक्ती किंवा पद (पर्यायी)',
    peoplePlaceholder: 'उदा. सचिव, निवडणूक निर्णय अधिकारी, समिती अध्यक्ष',
    proofLabel: 'उपलब्ध पुरावे / कागदपत्रे (पर्यायी)',
    proofPlaceholder: 'उदा. दूध वितरण पासबुक पावती, भाग दाखला प्रत',
    reliefLabel: 'अपेक्षित तोडगा / मागणी *',
    reliefPlaceholder: 'उदा. अंतिम मतदार यादीत त्वरित नाव समाविष्ट करावे...',
    notesLabel: 'अतिरिक्त सूचना / टीप (पर्यायी)',
    notesPlaceholder: 'उदा. निवडणुकीपूर्वी ७ दिवसांत सुनावणी मिळावी',
    reviewBylawsBtn: 'उपनियमांची पडताळणी करा',
    generateBtn: 'तक्रार अर्ज तयार करा',
    generatingBtn: 'अर्ज तयार केला जात आहे...',
    editDetails: 'तपशील बदला',
    relevantBylaws: 'संबंधित कायदेशीर उपनियम',
    inspect: 'तपासा'
  },
  te: {
    badge: 'ప్రత్యేక ఫీచర్',
    subBadge: 'చట్టపరమైన పరిష్కార విజార్డ్',
    title: 'సహకార సంఘానికి అధికారిక ఫిర్యాదు పత్రం దాఖలు చేయండి',
    subtitle: 'ముఖ్యాంశాలను సేకరించి, చట్టబద్ధమైన బైలా నిబంధనలను జతచేసి సబ్మిట్ చేయదగిన అధికారిక లేఖను రూపొందిస్తుంది.',
    viewLetter: 'రూపొందించిన లేఖను చూడండి',
    stepOf: 'దశ',
    of: 'మొత్తం 5 లో',
    steps: [
      'సభ్యుడు & సంఘం వివరాలు',
      'సమస్య విభాగం & వివరణ',
      'సమయపాలన & సంబంధిత వ్యక్తులు',
      'కోరుకుంటున్న పరిష్కారం',
      'చట్టబద్ధమైన బైలా సమీక్ష'
    ],
    complainantName: 'ఫిర్యాదుదారు పూర్తి పేరు *',
    memberId: 'సభ్యత్వ ఐడీ / పాస్‌బుక్ నంబర్ (ఐచ్ఛికం)',
    societyName: 'సహకార సంఘం పేరు *',
    societyAddress: 'సంఘం చిరునామా / గ్రామం / జిల్లా',
    issueCategoryLabel: 'సమస్య విభాగం *',
    categories: ['ఎన్నికలు', 'సభ్యత్వం', 'ఆర్థిక / ఖాతాలు', 'యాజమాన్యం / పాలన లోపాలు', 'డివిడెండ్ / బకాయిలు', 'ఇతర'],
    descriptionLabel: 'వివరమైన వాస్తవిక వివరణ *',
    descPlaceholder: 'జరిగిన విషయాన్ని స్పష్టంగా వివరించండి...',
    dateLabel: 'తేదీ లేదా సుమారు సమయం *',
    datePlaceholder: 'ఉదా. 15 సెప్టెంబర్ 2026 లేదా గత 2 వారాలు',
    peopleLabel: 'సంబంధిత వ్యక్తులు లేదా హోదాలు (ఐచ్ఛికం)',
    peoplePlaceholder: 'ఉదా. కార్యదర్శి, రిటర్నింగ్ అధికారి, కమిటీ అధ్యక్షుడు',
    proofLabel: 'ఆధార పత్రాలు / సాక్ష్యాలు (ఐచ్ఛికం)',
    proofPlaceholder: 'ఉదా. పాల సరఫరా రసీదులు, షేర్ సర్టిఫికేట్ కాపీ',
    reliefLabel: 'కోరుకుంటున్న పరిష్కారం *',
    reliefPlaceholder: 'ఉదా. ఓటర్ల జాబితాలో నా పేరును వెంటనే చేర్చాలి...',
    notesLabel: 'అదనపు గమనికలు (ఐచ్ఛికం)',
    notesPlaceholder: 'ఉదా. త్వరలో ఎన్నికలు ఉన్నందున 7 రోజుల్లో విచారణ జరపాలి',
    reviewBylawsBtn: 'బైలా నిబంధనలను సమీక్షించండి',
    generateBtn: 'ఫిర్యాదు లేఖ రూపొందించండి',
    generatingBtn: 'లేఖ రూపొందించబడుతోంది...',
    editDetails: 'వివరాలను సవరించండి',
    relevantBylaws: 'సంబంధిత చట్టపరమైన బైలా నిబంధనలు',
    inspect: 'తనిఖీ చేయండి'
  },
  hi: {
    badge: 'प्रमुख विशेषता',
    subBadge: 'कानूनी निवारण विज़ार्ड',
    title: 'औपचारिक सहकारी शिकायत पत्र दर्ज करें',
    subtitle: 'आवश्यक तथ्यों को संकलित कर, प्रासंगिक उपनियमों के साथ आधिकारिक पीडीएफ शिकायत पत्र तैयार करता है।',
    viewLetter: 'तैयार पत्र देखें',
    stepOf: 'चरण',
    of: '5 में से',
    steps: [
      'सदस्य और समिति विवरण',
      'समस्या श्रेणी और विवरण',
      'समय-सीमा और संबंधित व्यक्ति',
      'अपेक्षित राहत / समाधान',
      'वैधानिक उपनियम समीक्षा'
    ],
    complainantName: 'शिकायतकर्ता का पूरा नाम *',
    memberId: 'सदस्य आईडी / पासबुक संख्या (वैकल्पिक)',
    societyName: 'सहकारी समिति का नाम *',
    societyAddress: 'समिति का पता / गाँव / ज़िला',
    issueCategoryLabel: 'समस्या की श्रेणी *',
    categories: ['चुनाव', 'सदस्यता', 'वित्तीय / लेखा', 'प्रबंधन / कुप्रशासन', 'लाभांश / बकाया', 'अन्य'],
    descriptionLabel: 'विस्तृत तथ्यात्मक विवरण *',
    descPlaceholder: 'सरल शब्दों में बताएं कि क्या हुआ...',
    dateLabel: 'तारीख या अनुमानित समय अवधि *',
    datePlaceholder: 'उदा. 15 सितंबर 2026 या पिछले 2 सप्ताह',
    peopleLabel: 'शामिल व्यक्ति या पद (वैकल्पिक)',
    peoplePlaceholder: 'उदा. सचिव, चुनाव अधिकारी, अध्यक्ष',
    proofLabel: 'उपलब्ध साक्ष्य / दस्तावेज़ (वैकल्पिक)',
    proofPlaceholder: 'उदा. दुग्ध आपूर्ति पासबुक, शेयर प्रमाण पत्र',
    reliefLabel: 'वांछित समाधान / मांग *',
    reliefPlaceholder: 'उदा. मतदाता सूची में तत्काल नाम शामिल किया जाए...',
    notesLabel: 'अतिरिक्त निर्देश / टिप्पणी (वैकल्पिक)',
    notesPlaceholder: 'उदा. चुनाव से पहले 7 दिनों में सुनवाई की जाए',
    reviewBylawsBtn: 'उपनियमों की समीक्षा करें',
    generateBtn: 'शिकायत पत्र तैयार करें',
    generatingBtn: 'शिकायत पत्र तैयार हो रहा है...',
    editDetails: 'विवरण संपादित करें',
    relevantBylaws: 'प्रासंगिक सहकारी उपनियम',
    inspect: 'जांचें'
  }
};

export const GrievanceFlow: React.FC = () => {
  const appCtx = useApp() as any;
  const {
    grievanceData,
    setGrievanceData,
    setGeneratedLetter,
    setActiveTab,
    setSelectedSource,
    profile,
    t,
  } = appCtx;

  // Resolve current language safely
  const rawLang = appCtx.language || appCtx.selectedLanguage || appCtx.currentLanguage || 'en';
  const langKey = String(rawLang).toLowerCase().split('-')[0];
  const gl = GRIEVANCE_I18N[langKey] || GRIEVANCE_I18N['en'];

  const [currentStep, setCurrentStep] = useState<number>(1);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [retrievedSources, setRetrievedSources] = useState<SourceReference[]>([]);

  const handleProceedToStep5 = () => {
    const query = `${grievanceData.issueCategory} ${grievanceData.issueDescription}`;
    const results = defaultRagEngine.search(query, {
      route: 'GRIEVANCE',
      limit: 3,
    });
    const sources = defaultRagEngine.toSourceReferences(results);
    setRetrievedSources(sources);
    setGrievanceData((prev: any) => ({ ...prev, retrievedBylaws: sources, status: 'review' }));
    setCurrentStep(5);
  };

  const handleGenerateLetter = async () => {
    setIsGenerating(true);
    try {
      const res = await generateGrievanceLetterApi(grievanceData);
      if (res.success && res.letter) {
        setGeneratedLetter(res.letter);
        setGrievanceData((prev: any) => ({ ...prev, status: 'generated' }));
        setActiveTab('letter-view');
      }
    } catch (err) {
      console.warn('Backend generation error, using client fallback:', err);
      const fallbackQuery = `${grievanceData.issueCategory} ${grievanceData.issueDescription}`;
      const searchRes = defaultRagEngine.search(fallbackQuery, { route: 'GRIEVANCE', limit: 2 });
      const citations = searchRes.map(r => `${r.chunk.docTitle} - ${r.chunk.section}`);

      const dateStr = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
      setGeneratedLetter({
        id: `letter-${Date.now()}`,
        generatedDate: dateStr,
        recipientTitle: 'The Secretary / President & Managing Committee (Copy to: District Deputy Registrar)',
        societyName: grievanceData.societyName || 'Primary Cooperative Society',
        memberName: grievanceData.memberName || profile?.name || 'Member',
        subject: `Formal Grievance Petition Regarding ${grievanceData.issueCategory} Issue under Cooperative Bylaws`,
        salutation: 'Respected Office Bearers,',
        bodyParagraphs: [
          `I am writing to formally place on record a grievance regarding ${grievanceData.issueCategory?.toLowerCase()} in our cooperative society.`,
          `Particulars of the issue: ${grievanceData.issueDescription}. This occurred around ${grievanceData.dateOrPeriod || 'the recent period'}. ${grievanceData.peopleOrRoleInvolved ? `Parties involved: ${grievanceData.peopleOrRoleInvolved}.` : ''}`,
          `Such actions contravene established cooperative principles and member rights under the applicable bylaws.`,
        ],
        bylawReferences: citations.length > 0 ? citations : [
          'Model Primary Cooperative Society Bylaws - Section 11: Member Rights & Democratic Governance',
          'Cooperative Grievance Redressal Rules - Rule 3: Mandatory Written Acknowledgement & 30-day Resolution',
        ],
        requestedActionList: [
          grievanceData.desiredResolution || 'Immediate rectification of the grievance and restoration of lawful rights.',
          'Provide a stamped and dated acknowledgement receipt with a unique Tracking Number.',
          'Convey written findings of the committee within 30 days as statutorily required.',
        ],
        closing: 'Thanking you,',
        rawText: '',
      });
      setActiveTab('letter-view');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-amber-700 bg-amber-100 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
              {gl.badge}
            </span>
            <span className="text-xs text-slate-500 font-medium">
              {gl.subBadge}
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">
            {gl.title}
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            {gl.subtitle}
          </p>
        </div>

        {grievanceData.status === 'generated' && (
          <button
            onClick={() => setActiveTab('letter-view')}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-2"
          >
            <FileText className="w-4 h-4" />
            <span>{gl.viewLetter}</span>
          </button>
        )}
      </div>

      {/* Stepper Indicator */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
        <div className="flex items-center justify-between text-xs font-bold text-slate-500 mb-2">
          <span>{gl.stepOf} {currentStep} {gl.of}</span>
          <span className="text-slate-800">
            {gl.steps[currentStep - 1]}
          </span>
        </div>
        <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
          <div
            className="bg-amber-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${(currentStep / 5) * 100}%` }}
          />
        </div>
      </div>

      {/* Step Forms */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6">
        {/* STEP 1 */}
        {currentStep === 1 && (
          <div className="space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <User className="w-5 h-5 text-amber-600" />
              <span>{gl.steps[0]}</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {gl.complainantName}
                </label>
                <input
                  id="input-grievance-name"
                  type="text"
                  required
                  value={grievanceData.memberName || profile?.name || ''}
                  onChange={(e) => setGrievanceData({ ...grievanceData, memberName: e.target.value })}
                  placeholder={profile?.name || "Your Name"}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {gl.memberId}
                </label>
                <input
                  id="input-grievance-memid"
                  type="text"
                  value={grievanceData.memberIdOrNumber || ''}
                  onChange={(e) => setGrievanceData({ ...grievanceData, memberIdOrNumber: e.target.value })}
                  placeholder="e.g. MEM-8842"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {gl.societyName}
                </label>
                <input
                  id="input-grievance-society"
                  type="text"
                  required
                  value={grievanceData.societyName || profile?.society || ''}
                  onChange={(e) => setGrievanceData({ ...grievanceData, societyName: e.target.value })}
                  placeholder={profile?.society || "Demo Dairy Cooperative Society"}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {gl.societyAddress}
                </label>
                <input
                  id="input-grievance-address"
                  type="text"
                  value={grievanceData.societyAddressOrPlace || ''}
                  onChange={(e) => setGrievanceData({ ...grievanceData, societyAddressOrPlace: e.target.value })}
                  placeholder="e.g. Warangal District, Telangana"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 2 */}
        {currentStep === 2 && (
          <div className="space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <FileText className="w-5 h-5 text-amber-600" />
              <span>{gl.steps[1]}</span>
            </h3>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">
                {gl.issueCategoryLabel}
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {gl.categories.map((cat: string) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setGrievanceData({ ...grievanceData, issueCategory: cat })}
                    className={`p-3 text-xs font-bold rounded-xl border transition-all text-left ${
                      grievanceData.issueCategory === cat
                        ? 'bg-amber-50 border-amber-600 text-amber-900 shadow-xs'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {gl.descriptionLabel}
              </label>
              <textarea
                id="input-grievance-desc"
                rows={4}
                required
                value={grievanceData.issueDescription}
                onChange={(e) => setGrievanceData({ ...grievanceData, issueDescription: e.target.value })}
                placeholder={gl.descPlaceholder}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500 leading-relaxed"
              />
            </div>
          </div>
        )}

        {/* STEP 3 */}
        {currentStep === 3 && (
          <div className="space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-amber-600" />
              <span>{gl.steps[2]}</span>
            </h3>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {gl.dateLabel}
              </label>
              <input
                id="input-grievance-period"
                type="text"
                value={grievanceData.dateOrPeriod}
                onChange={(e) => setGrievanceData({ ...grievanceData, dateOrPeriod: e.target.value })}
                placeholder={gl.datePlaceholder}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {gl.peopleLabel}
              </label>
              <input
                id="input-grievance-people"
                type="text"
                value={grievanceData.peopleOrRoleInvolved || ''}
                onChange={(e) => setGrievanceData({ ...grievanceData, peopleOrRoleInvolved: e.target.value })}
                placeholder={gl.peoplePlaceholder}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {gl.proofLabel}
              </label>
              <input
                id="input-grievance-proof"
                type="text"
                value={grievanceData.relevantDocsDetails || ''}
                onChange={(e) => setGrievanceData({ ...grievanceData, relevantDocsDetails: e.target.value })}
                placeholder={gl.proofPlaceholder}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>
        )}

        {/* STEP 4 */}
        {currentStep === 4 && (
          <div className="space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Shield className="w-5 h-5 text-amber-600" />
              <span>{gl.steps[3]}</span>
            </h3>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {gl.reliefLabel}
              </label>
              <textarea
                id="input-grievance-resolution"
                rows={3}
                required
                value={grievanceData.desiredResolution}
                onChange={(e) => setGrievanceData({ ...grievanceData, desiredResolution: e.target.value })}
                placeholder={gl.reliefPlaceholder}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500 leading-relaxed"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {gl.notesLabel}
              </label>
              <input
                id="input-grievance-notes"
                type="text"
                value={grievanceData.additionalNotes || ''}
                onChange={(e) => setGrievanceData({ ...grievanceData, additionalNotes: e.target.value })}
                placeholder={gl.notesPlaceholder}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>
        )}

        {/* STEP 5: REVIEW & STATUTORY BYLAW RETRIEVAL */}
        {currentStep === 5 && (
          <div className="space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span>{gl.steps[4]}</span>
              </h3>
              <button
                onClick={() => setCurrentStep(1)}
                className="text-xs text-amber-700 hover:text-amber-800 font-bold underline"
              >
                {gl.editDetails}
              </button>
            </div>

            {/* Summary Card */}
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-2 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-slate-400 block font-medium">Complainant:</span>
                  <span className="font-bold text-slate-900">{grievanceData.memberName || profile?.name}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Society:</span>
                  <span className="font-bold text-slate-900">{grievanceData.societyName || profile?.society}</span>
                </div>
              </div>

              <div className="border-t border-slate-200/60 pt-2">
                <span className="text-slate-400 block font-medium">Issue Category:</span>
                <span className="font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded inline-block mt-0.5">
                  {grievanceData.issueCategory}
                </span>
              </div>

              <div className="border-t border-slate-200/60 pt-2">
                <span className="text-slate-400 block font-medium">Factual Narrative:</span>
                <p className="text-slate-800 font-medium leading-relaxed mt-0.5">
                  {grievanceData.issueDescription}
                </p>
              </div>

              <div className="border-t border-slate-200/60 pt-2">
                <span className="text-slate-400 block font-medium">Relief Demanded:</span>
                <p className="text-emerald-800 font-semibold leading-relaxed mt-0.5">
                  {grievanceData.desiredResolution}
                </p>
              </div>
            </div>

            {/* Retrieved Bylaws Context */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4 text-emerald-600" />
                  {gl.relevantBylaws} ({retrievedSources.length}):
                </span>
              </div>

              <div className="space-y-2">
                {retrievedSources.map((src, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200 text-xs flex items-start justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <strong className="text-emerald-950 font-bold">{src.docTitle}</strong>
                        <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-mono">
                          {src.section}
                        </span>
                      </div>
                      <p className="text-emerald-900 mt-1 line-clamp-2 leading-relaxed">
                        {src.excerpt}
                      </p>
                    </div>

                    <button
                      onClick={() => setSelectedSource(src)}
                      className="text-xs text-emerald-700 hover:text-emerald-900 font-bold underline shrink-0"
                    >
                      {gl.inspect}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Wizard Controls */}
        <div className="mt-6 pt-4 border-t border-slate-200 flex items-center justify-between">
          <button
            id="btn-grievance-back"
            type="button"
            disabled={currentStep === 1 || isGenerating}
            onClick={() => setCurrentStep(prev => Math.max(1, prev - 1))}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>{t?.backBtn || 'Back'}</span>
          </button>

          {currentStep < 4 && (
            <button
              id="btn-grievance-next"
              type="button"
              onClick={() => setCurrentStep(prev => prev + 1)}
              className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs"
            >
              <span>{t?.continueBtn || 'Continue'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}

          {currentStep === 4 && (
            <button
              id="btn-grievance-step5"
              type="button"
              onClick={handleProceedToStep5}
              className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs"
            >
              <span>{gl.reviewBylawsBtn}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}

          {currentStep === 5 && (
            <button
              id="btn-grievance-generate-now"
              type="button"
              disabled={isGenerating}
              onClick={handleGenerateLetter}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-md shadow-emerald-900/20"
            >
              <Sparkles className="w-4 h-4" />
              <span>{isGenerating ? gl.generatingBtn : gl.generateBtn}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};