/**
 * Contextual Reference Engine
 * Finds relevant past messages and attachments based on current context
 * Uses NLP classification + semantic search
 */

"use server";

import { createSupabaseUserServerActionClient } from "@/supabase-clients/user/createSupabaseUserServerActionClient";
import { OpenAI } from "openai";

// Lazy-load OpenAI client
let openaiClient: OpenAI | null = null;

function getOpenAIClient(): OpenAI | null {
  if (!openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.warn("[ReferenceEngine] OPENAI_API_KEY not configured");
      return null;
    }
    openaiClient = new OpenAI({ apiKey });
  }
  return openaiClient;
}

export type ReferenceType = 
  | "price_guide"
  | "proposal"
  | "invoice"
  | "contract"
  | "report"
  | "document"
  | "email"
  | "contact"
  | "file"
  | "none";

export interface ReferenceRequest {
  messageId: string;
  messageContent: string;
  messageSubject: string;
  senderEmail: string;
  workspaceId: string;
}

export interface FoundReference {
  type: "email" | "file" | "contact";
  id: string;
  title: string;
  preview?: string;
  relevanceScore: number;
  sourceMessageId?: string;
  attachmentId?: string;
  timestamp?: string;
  metadata?: Record<string, any>;
}

export interface ReferenceResult {
  hasReference: boolean;
  requestType: ReferenceType;
  requestDetail?: string;
  references: FoundReference[];
  aiExplanation?: string;
  confidence: number;
}

/**
 * Classify what type of reference the message is asking for
 */
async function classifyReferenceRequest(
  content: string,
  subject: string
): Promise<{ type: ReferenceType; detail?: string; confidence: number }> {
  const openai = getOpenAIClient();
  
  if (!openai) {
    return { type: "none", confidence: 0 };
  }

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You analyze emails to detect if someone is asking for or referencing a document/file.

REFERENCE TYPES:
- price_guide: Asking for pricing, rate cards, price lists
- proposal: Asking for proposals, quotes, offers
- invoice: Asking for invoices, bills, receipts
- contract: Asking for contracts, agreements, terms
- report: Asking for reports, analyses, summaries
- document: Generic document request
- email: Referencing a previous email/conversation
- file: Asking for a specific file
- none: No document/file request detected

Respond with JSON only:
{
  "type": "<reference_type>",
  "detail": "<what specifically they're asking for, if any>",
  "confidence": <0.0 to 1.0>
}`,
        },
        {
          role: "user",
          content: `Subject: ${subject}\n\nContent: ${content.substring(0, 1000)}`,
        },
      ],
      temperature: 0.1,
      max_tokens: 150,
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(completion.choices[0].message.content || "{}");
    return {
      type: result.type || "none",
      detail: result.detail,
      confidence: result.confidence || 0,
    };
  } catch (error) {
    console.error("[ReferenceEngine] Classification error:", error);
    return { type: "none", confidence: 0 };
  }
}

/**
 * Search for relevant emails in the workspace
 */
async function searchEmails(
  workspaceId: string,
  senderEmail: string,
  keywords: string[],
  limit: number = 5
): Promise<FoundReference[]> {
  const supabase = await createSupabaseUserServerActionClient();
  const references: FoundReference[] = [];

  // Build search query
  const searchTerms = keywords.join(" | ");
  
  // Search by full-text and sender
  const { data: messages, error } = await supabase
    .from("messages")
    .select("id, subject, body, sender_email, sender_name, timestamp, created_at")
    .eq("workspace_id", workspaceId)
    .or(`sender_email.eq.${senderEmail},sender_email.ilike.%${senderEmail.split("@")[0]}%`)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error || !messages) {
    console.error("[ReferenceEngine] Email search error:", error);
    return references;
  }

  // Score and filter results based on keyword relevance
  for (const msg of messages) {
    const content = `${msg.subject || ""} ${msg.body || ""}`.toLowerCase();
    let score = 0;
    
    for (const keyword of keywords) {
      if (content.includes(keyword.toLowerCase())) {
        score += 1;
      }
    }
    
    if (score > 0) {
      references.push({
        type: "email",
        id: msg.id,
        title: msg.subject || "(no subject)",
        preview: (msg.body || "").substring(0, 150).replace(/<[^>]*>/g, ""),
        relevanceScore: Math.min(score / keywords.length, 1),
        sourceMessageId: msg.id,
        timestamp: msg.timestamp || msg.created_at,
        metadata: {
          senderEmail: msg.sender_email,
          senderName: msg.sender_name,
        },
      });
    }
  }

  // Sort by relevance and limit
  return references
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, limit);
}

/**
 * Search for relevant attachments in the workspace
 */
async function searchAttachments(
  workspaceId: string,
  keywords: string[],
  contentType?: string,
  limit: number = 5
): Promise<FoundReference[]> {
  const supabase = await createSupabaseUserServerActionClient();
  const references: FoundReference[] = [];

  // Build query
  let query = supabase
    .from("attachments")
    .select(`
      id,
      filename,
      content_preview,
      extracted_title,
      extracted_summary,
      content_type,
      mime_type,
      message_id,
      created_at
    `)
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false })
    .limit(30);

  if (contentType) {
    query = query.eq("content_type", contentType);
  }

  const { data: attachments, error } = await query;

  if (error || !attachments) {
    console.error("[ReferenceEngine] Attachment search error:", error);
    return references;
  }

  // Score and filter results
  for (const att of attachments) {
    const searchableContent = `${att.filename || ""} ${att.extracted_title || ""} ${att.content_preview || ""} ${att.extracted_summary || ""}`.toLowerCase();
    let score = 0;
    
    for (const keyword of keywords) {
      if (searchableContent.includes(keyword.toLowerCase())) {
        score += 1;
      }
    }
    
    if (score > 0) {
      references.push({
        type: "file",
        id: att.id,
        title: att.extracted_title || att.filename,
        preview: att.extracted_summary || att.content_preview?.substring(0, 150),
        relevanceScore: Math.min(score / keywords.length, 1),
        attachmentId: att.id,
        sourceMessageId: att.message_id,
        timestamp: att.created_at || undefined,
        metadata: {
          filename: att.filename,
          contentType: att.content_type,
          mimeType: att.mime_type,
        },
      });
    }
  }

  // Sort by relevance and limit
  return references
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, limit);
}

/**
 * Extract keywords for searching
 */
async function extractSearchKeywords(
  content: string,
  requestType: ReferenceType,
  requestDetail?: string
): Promise<string[]> {
  const openai = getOpenAIClient();
  
  // Base keywords from request detail
  const keywords: string[] = [];
  
  if (requestDetail) {
    // Split detail into words
    keywords.push(...requestDetail.split(/\s+/).filter(w => w.length > 2));
  }

  // Type-specific keywords
  const typeKeywords: Record<ReferenceType, string[]> = {
    price_guide: ["price", "pricing", "rate", "cost", "fee", "guide", "list"],
    proposal: ["proposal", "quote", "offer", "bid", "estimate"],
    invoice: ["invoice", "bill", "receipt", "payment", "due"],
    contract: ["contract", "agreement", "terms", "signed", "legal"],
    report: ["report", "analysis", "summary", "findings", "results"],
    document: ["document", "file", "attachment"],
    email: ["email", "message", "sent", "replied"],
    file: ["file", "attached", "document"],
    contact: ["contact", "person", "email"],
    none: [],
  };

  keywords.push(...(typeKeywords[requestType] || []));

  // Use AI to extract additional keywords if available
  if (openai) {
    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "Extract 5-10 search keywords from this email that could help find relevant documents or past messages. Return only a JSON array of strings.",
          },
          {
            role: "user",
            content: content.substring(0, 500),
          },
        ],
        temperature: 0.1,
        max_tokens: 100,
        response_format: { type: "json_object" },
      });

      const result = JSON.parse(completion.choices[0].message.content || "{}");
      if (Array.isArray(result.keywords)) {
        keywords.push(...result.keywords);
      }
    } catch (error) {
      console.error("[ReferenceEngine] Keyword extraction error:", error);
    }
  }

  // Deduplicate and clean
  return [...new Set(keywords.map(k => k.toLowerCase().trim()))].filter(k => k.length > 2);
}

/**
 * Main function: Find relevant references for a message
 */
export async function findReferences(
  request: ReferenceRequest
): Promise<ReferenceResult> {
  const { messageContent, messageSubject, senderEmail, workspaceId } = request;

  // Step 1: Classify what type of reference is being requested
  const classification = await classifyReferenceRequest(messageContent, messageSubject);

  if (classification.type === "none" || classification.confidence < 0.3) {
    return {
      hasReference: false,
      requestType: "none",
      references: [],
      confidence: classification.confidence,
    };
  }

  // Step 2: Extract search keywords
  const keywords = await extractSearchKeywords(
    messageContent,
    classification.type,
    classification.detail
  );

  // Step 3: Search for relevant content
  const [emailRefs, attachmentRefs] = await Promise.all([
    searchEmails(workspaceId, senderEmail, keywords),
    searchAttachments(workspaceId, keywords),
  ]);

  // Combine and sort all references
  const allReferences = [...emailRefs, ...attachmentRefs]
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, 5);

  // Step 4: Generate AI explanation
  let aiExplanation: string | undefined;
  const openai = getOpenAIClient();
  
  if (openai && allReferences.length > 0) {
    try {
      const topRef = allReferences[0];
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "Generate a brief, friendly one-line explanation for why this resource is relevant. Keep it under 100 characters.",
          },
          {
            role: "user",
            content: `Request: ${classification.detail || classification.type}
Found: ${topRef.title}
Type: ${topRef.type}`,
          },
        ],
        temperature: 0.3,
        max_tokens: 50,
      });

      aiExplanation = completion.choices[0].message.content?.trim();
    } catch (error) {
      console.error("[ReferenceEngine] Explanation generation error:", error);
    }
  }

  return {
    hasReference: allReferences.length > 0,
    requestType: classification.type,
    requestDetail: classification.detail,
    references: allReferences,
    aiExplanation,
    confidence: classification.confidence,
  };
}

/**
 * Quick check if a message likely contains a reference request
 * (Faster than full findReferences for filtering)
 */
export async function hasReferenceRequest(
  content: string,
  subject: string
): Promise<boolean> {
  // Quick keyword-based check first
  const quickPatterns = [
    /send\s+(?:me\s+)?(?:the|a|your)\s+/i,
    /where\s+(?:is|are|did)\s+(?:the|a|my)/i,
    /(?:need|looking for|asking for)\s+(?:the|a)/i,
    /(?:price|pricing|rate|cost|quote|proposal|invoice|contract|report|document|file|attachment)/i,
    /can\s+you\s+(?:send|forward|share|attach)/i,
    /(?:attached|enclosed|included)\s+(?:is|are|was)/i,
  ];

  const text = `${subject} ${content}`;
  
  for (const pattern of quickPatterns) {
    if (pattern.test(text)) {
      return true;
    }
  }

  return false;
}

