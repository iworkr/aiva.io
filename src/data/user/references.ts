/**
 * Server Actions for Reference Lookup
 * Handles finding and surfacing relevant past content
 */

"use server";

import { z } from "zod";
import { authActionClient } from "@/lib/safe-action";
import { createSupabaseUserServerActionClient } from "@/supabase-clients/user/createSupabaseUserServerActionClient";
import { isWorkspaceMember } from "./workspaces";
import { findReferences, hasReferenceRequest, type ReferenceResult } from "@/lib/ai/reference-engine";

// ============================================================================
// FIND REFERENCES FOR A MESSAGE
// ============================================================================

const findReferencesSchema = z.object({
  messageId: z.string().uuid(),
  workspaceId: z.string().uuid(),
});

export const findReferencesAction = authActionClient
  .schema(findReferencesSchema)
  .action(async ({ parsedInput, ctx: { userId } }) => {
    const { messageId, workspaceId } = parsedInput;

    // Verify workspace membership
    const isMember = await isWorkspaceMember(userId, workspaceId);
    if (!isMember) {
      throw new Error("You are not a member of this workspace");
    }

    const supabase = await createSupabaseUserServerActionClient();

    // Get the message
    const { data: message, error: msgError } = await supabase
      .from("messages")
      .select("id, subject, body, sender_email, sender_name")
      .eq("id", messageId)
      .eq("workspace_id", workspaceId)
      .single();

    if (msgError || !message) {
      throw new Error("Message not found");
    }

    // Find references
    const result = await findReferences({
      messageId: message.id,
      messageContent: message.body || "",
      messageSubject: message.subject || "",
      senderEmail: message.sender_email || "",
      workspaceId,
    });

    return {
      success: true,
      data: result,
    };
  });

// ============================================================================
// CHECK IF MESSAGE HAS REFERENCE REQUEST (Quick check)
// ============================================================================

const checkReferenceSchema = z.object({
  messageId: z.string().uuid(),
  workspaceId: z.string().uuid(),
});

export const checkReferenceRequestAction = authActionClient
  .schema(checkReferenceSchema)
  .action(async ({ parsedInput, ctx: { userId } }) => {
    const { messageId, workspaceId } = parsedInput;

    // Verify workspace membership
    const isMember = await isWorkspaceMember(userId, workspaceId);
    if (!isMember) {
      throw new Error("You are not a member of this workspace");
    }

    const supabase = await createSupabaseUserServerActionClient();

    // Get the message
    const { data: message, error: msgError } = await supabase
      .from("messages")
      .select("subject, body")
      .eq("id", messageId)
      .eq("workspace_id", workspaceId)
      .single();

    if (msgError || !message) {
      return { success: true, hasRequest: false };
    }

    const hasRequest = await hasReferenceRequest(
      message.body || "",
      message.subject || ""
    );

    return {
      success: true,
      hasRequest,
    };
  });

// ============================================================================
// GET ATTACHMENT BY ID
// ============================================================================

const getAttachmentSchema = z.object({
  attachmentId: z.string().uuid(),
  workspaceId: z.string().uuid(),
});

export const getAttachmentAction = authActionClient
  .schema(getAttachmentSchema)
  .action(async ({ parsedInput, ctx: { userId } }) => {
    const { attachmentId, workspaceId } = parsedInput;

    // Verify workspace membership
    const isMember = await isWorkspaceMember(userId, workspaceId);
    if (!isMember) {
      throw new Error("You are not a member of this workspace");
    }

    const supabase = await createSupabaseUserServerActionClient();

    const { data: attachment, error } = await supabase
      .from("attachments")
      .select(`
        *,
        message:messages(id, subject, sender_email, sender_name, timestamp)
      `)
      .eq("id", attachmentId)
      .eq("workspace_id", workspaceId)
      .single();

    if (error || !attachment) {
      throw new Error("Attachment not found");
    }

    return {
      success: true,
      data: attachment,
    };
  });

// ============================================================================
// SEARCH ATTACHMENTS
// ============================================================================

const searchAttachmentsSchema = z.object({
  workspaceId: z.string().uuid(),
  query: z.string().min(1).max(200),
  contentType: z.string().optional(),
  limit: z.number().int().positive().max(50).default(10),
});

export const searchAttachmentsAction = authActionClient
  .schema(searchAttachmentsSchema)
  .action(async ({ parsedInput, ctx: { userId } }) => {
    const { workspaceId, query, contentType, limit } = parsedInput;

    // Verify workspace membership
    const isMember = await isWorkspaceMember(userId, workspaceId);
    if (!isMember) {
      throw new Error("You are not a member of this workspace");
    }

    const supabase = await createSupabaseUserServerActionClient();

    let queryBuilder = supabase
      .from("attachments")
      .select(`
        id,
        filename,
        content_type,
        mime_type,
        size_bytes,
        extracted_title,
        extracted_summary,
        content_preview,
        created_at,
        message:messages(id, subject, sender_email, sender_name)
      `)
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (contentType) {
      queryBuilder = queryBuilder.eq("content_type", contentType);
    }

    // Use full-text search if available, otherwise ilike
    queryBuilder = queryBuilder.or(
      `filename.ilike.%${query}%,extracted_title.ilike.%${query}%,content_preview.ilike.%${query}%`
    );

    const { data: attachments, error } = await queryBuilder;

    if (error) {
      throw new Error(`Search failed: ${error.message}`);
    }

    return {
      success: true,
      data: attachments || [],
    };
  });

// ============================================================================
// SAVE ATTACHMENT METADATA
// ============================================================================

const saveAttachmentSchema = z.object({
  workspaceId: z.string().uuid(),
  messageId: z.string().uuid(),
  channelConnectionId: z.string().uuid().optional(),
  providerAttachmentId: z.string().optional(),
  filename: z.string(),
  mimeType: z.string().optional(),
  sizeBytes: z.number().optional(),
  contentPreview: z.string().optional(),
  contentType: z.string().optional(),
  extractedTitle: z.string().optional(),
  extractedSummary: z.string().optional(),
  keywords: z.array(z.string()).optional(),
  downloadUrl: z.string().optional(),
});

export const saveAttachmentAction = authActionClient
  .schema(saveAttachmentSchema)
  .action(async ({ parsedInput, ctx: { userId } }) => {
    const {
      workspaceId,
      messageId,
      channelConnectionId,
      providerAttachmentId,
      filename,
      mimeType,
      sizeBytes,
      contentPreview,
      contentType,
      extractedTitle,
      extractedSummary,
      keywords,
      downloadUrl,
    } = parsedInput;

    // Verify workspace membership
    const isMember = await isWorkspaceMember(userId, workspaceId);
    if (!isMember) {
      throw new Error("You are not a member of this workspace");
    }

    const supabase = await createSupabaseUserServerActionClient();

    // Check if attachment already exists (only if we have a provider ID)
    let existing = null;
    if (providerAttachmentId) {
      const { data } = await supabase
        .from("attachments")
        .select("id")
        .eq("message_id", messageId)
        .eq("provider_attachment_id", providerAttachmentId)
        .single();
      existing = data;
    }

    if (existing) {
      // Update existing
      const { data, error } = await supabase
        .from("attachments")
        .update({
          filename,
          mime_type: mimeType,
          size_bytes: sizeBytes,
          content_preview: contentPreview,
          content_type: contentType,
          extracted_title: extractedTitle,
          extracted_summary: extractedSummary,
          keywords,
          download_url: downloadUrl,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id)
        .select()
        .single();

      if (error) throw new Error(`Update failed: ${error.message}`);
      return { success: true, data, isNew: false };
    }

    // Insert new
    const { data, error } = await supabase
      .from("attachments")
      .insert({
        workspace_id: workspaceId,
        message_id: messageId,
        channel_connection_id: channelConnectionId,
        provider_attachment_id: providerAttachmentId,
        filename,
        mime_type: mimeType,
        size_bytes: sizeBytes,
        content_preview: contentPreview,
        content_type: contentType,
        extracted_title: extractedTitle,
        extracted_summary: extractedSummary,
        keywords,
        download_url: downloadUrl,
      })
      .select()
      .single();

    if (error) throw new Error(`Insert failed: ${error.message}`);
    return { success: true, data, isNew: true };
  });

