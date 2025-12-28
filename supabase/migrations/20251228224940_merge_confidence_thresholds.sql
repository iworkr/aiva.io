-- ============================================================================
-- Merge Confidence Thresholds Migration
-- Merges human_review_confidence_threshold into auto_send_confidence_threshold
-- ============================================================================

-- Migrate existing human_review_confidence_threshold values to auto_send_confidence_threshold
-- We preserve the more conservative (higher) threshold setting
UPDATE workspace_settings
SET auto_send_confidence_threshold = GREATEST(
  COALESCE(auto_send_confidence_threshold, 0.85),
  COALESCE(human_review_confidence_threshold, 0.60)
)
WHERE human_review_confidence_threshold IS NOT NULL
  AND (
    human_review_confidence_threshold > COALESCE(auto_send_confidence_threshold, 0.85)
    OR auto_send_confidence_threshold IS NULL
  );

-- Mark human_review_confidence_threshold as deprecated
COMMENT ON COLUMN workspace_settings.human_review_confidence_threshold IS 
  'DEPRECATED: Use auto_send_confidence_threshold instead. This column is kept for backward compatibility but is no longer used.';

-- Add comment to auto_send_confidence_threshold explaining it's now the unified threshold
COMMENT ON COLUMN workspace_settings.auto_send_confidence_threshold IS 
  'Unified confidence threshold (0.50-0.95). When auto-send is enabled: only auto-send when confidence >= this threshold, otherwise require review. When auto-send is disabled: always require review.';

