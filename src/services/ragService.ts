import { ALL_KNOWLEDGE_CHUNKS, DEMO_KNOWLEDGE_DOCUMENTS } from '../data/demoKnowledgeBase';
import { KnowledgeChunk, SearchResult, SourceReference, QueryRoute } from '../types';

export class RagEngine {
  private chunks: KnowledgeChunk[];

  constructor(chunks: KnowledgeChunk[] = ALL_KNOWLEDGE_CHUNKS) {
    this.chunks = chunks;
  }

  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      // Preserve all Unicode Indic script blocks (Devanagari, Bengali, Gurmukhi, Gujarati, Odia, Tamil, Telugu, Kannada, Malayalam)
      .replace(/[^\w\s\u0900-\u0D7F]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.trim().length > 1);
  }

  public search(
    query: string,
    options: { limit?: number; route?: QueryRoute; minScore?: number } = {}
  ): SearchResult[] {
    const limit = options.limit ?? 3;
    const minScore = options.minScore ?? 0.05;
    const queryTokens = this.tokenize(query);
    const lowerQ = query.toLowerCase();

    // Multilingual voting keywords across Indian languages:
    // en: vote, voting, election
    // te: ఓటు, ఓటింగ్, ఎన్నిక
    // kn: ಓಟು, ಮತ, ಚುನಾವಣೆ, ಹಕ್ಕು
    // hi/mr: मतदान, वोट, चुनाव, अधिकार
    // ta: வாக்கு, தேர்தல், உரிமை
    // ml: വോട്ട്, തിരഞ്ഞെടുപ്പ്
    // bn: ভোট, নির্বাচন
    // gu: મત, ચૂંટણી
    const isVotingQuery =
      lowerQ.includes('vote') ||
      lowerQ.includes('voting') ||
      lowerQ.includes('election') ||
      // Telugu
      lowerQ.includes('ఓటు') ||
      lowerQ.includes('ఓటింగ్') ||
      lowerQ.includes('ఎన్నిక') ||
      // Kannada
      lowerQ.includes('ಓಟು') ||
      lowerQ.includes('ಮತ') ||
      lowerQ.includes('ಚುನಾವಣೆ') ||
      // Hindi / Marathi
      lowerQ.includes('मतदान') ||
      lowerQ.includes('चुनाव') ||
      lowerQ.includes('वोट') ||
      // Tamil
      lowerQ.includes('வாக்கு') ||
      lowerQ.includes('தேர்தல்') ||
      // Malayalam
      lowerQ.includes('വോട്ട്') ||
      lowerQ.includes('തിരഞ്ഞെടുപ്പ്') ||
      // Bengali
      lowerQ.includes('ভোট') ||
      lowerQ.includes('নির্বাচন') ||
      // Gujarati
      lowerQ.includes('મત') ||
      lowerQ.includes('ચૂંટણી');

    // Multilingual grievance keywords
    const isGrievanceQuery =
      lowerQ.includes('grievance') ||
      lowerQ.includes('complaint') ||
      lowerQ.includes('ఫిర్యాదు') ||
      lowerQ.includes('ದೂರು') ||
      lowerQ.includes('शिकायत') ||
      lowerQ.includes('புகார்') ||
      lowerQ.includes('പരാതി') ||
      lowerQ.includes('অভিযোগ');

    // Multilingual inspection/audit keywords
    const isAuditQuery =
      lowerQ.includes('audit') ||
      lowerQ.includes('inspect') ||
      lowerQ.includes('records') ||
      lowerQ.includes('ఆడిట్') ||
      lowerQ.includes('ಲೆಕ್ಕಪರಿಶೋಧನೆ') ||
      lowerQ.includes('ತಪಾಸಣೆ') ||
      lowerQ.includes('लेखापरीक्षण');

    const scoredResults: SearchResult[] = this.chunks.map((chunk) => {
      let score = 0;
      const contentTokens = this.tokenize(chunk.content);
      const titleTokens = this.tokenize(`${chunk.docTitle} ${chunk.section} ${chunk.chapterOrPart}`);
      const keywordTokens = chunk.keywords.map((k) => k.toLowerCase());

      queryTokens.forEach((token) => {
        if (keywordTokens.some((k) => k.includes(token))) score += 2.0;
        if (titleTokens.includes(token)) score += 1.5;
        const matches = contentTokens.filter((t) => t.includes(token)).length;
        if (matches > 0) score += Math.min(matches * 0.4, 2.0);
      });

      // Semantic boosters based on detected intent
      if (isVotingQuery) {
        if (chunk.id === 'bylaw-sec-11') score += 5.0; // One member one vote
        if (chunk.id === 'bylaw-sec-7') score += 3.5;
        if (chunk.id === 'elect-rule-7') score += 3.0;
        if (chunk.id === 'mscs-sec-38') score -= 3.0; // Avoid inspection section
      }

      if (isGrievanceQuery && chunk.docType === 'Grievance Rules') {
        score += 4.0;
      }

      if (isAuditQuery && chunk.id === 'mscs-sec-38') {
        score += 4.0;
      }

      if (options.route === 'GOVERNANCE_PROCEDURE' && (chunk.docType === 'Bylaw' || chunk.docType === 'Election Rules')) {
        score += 1.5;
      }

      // If no tokens matched directly but intent is clearly voting, give bylaw-sec-11 baseline score
      if (score === 0 && isVotingQuery && chunk.id === 'bylaw-sec-11') {
        score = 3.0;
      }

      const normalizedScore = Math.min(score / (Math.max(queryTokens.length, 1) * 1.5 + 1), 0.99);

      return {
        chunk,
        score: parseFloat(normalizedScore.toFixed(3)),
        snippet: chunk.content.substring(0, 240) + '...',
      };
    });

    return scoredResults
      .filter((r) => r.score >= minScore)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  public toSourceReferences(results: SearchResult[]): SourceReference[] {
    return results.map((r) => ({
      docTitle: r.chunk.docTitle,
      docType: r.chunk.docType,
      source: r.chunk.source,
      section: r.chunk.section,
      chapter: r.chunk.chapterOrPart,
      pageNumber: r.chunk.pageNumber,
      isDemoData: r.chunk.isDemoData,
      excerpt: r.snippet,
    }));
  }

  public formatGroundingContext(results: SearchResult[]): string {
    if (results.length === 0) {
      return 'No verified cooperative documents matched the query.';
    }
    return results
      .map(
        (r, idx) =>
          `[Source ${idx + 1}] Document: ${r.chunk.docTitle}\nSection: ${r.chunk.section}\nContent: ${r.chunk.content}`
      )
      .join('\n---\n');
  }

  public getAllDocuments() {
    return DEMO_KNOWLEDGE_DOCUMENTS;
  }
}

export const defaultRagEngine = new RagEngine();