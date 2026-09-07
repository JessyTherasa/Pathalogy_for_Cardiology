export type UserRole =
  | 'Cardiologist'
  | 'Pathologist'
  | 'Imaging Specialist'
  | 'Molecular Specialist'
  | 'Reviewer'
  | 'Administrator';


export type ConsentStatus = 'Granted' | 'Restricted' | 'Pending';
export type CaseStatus = 'Complete' | 'Needs Review' | 'Incomplete' | 'Blocked' | 'Under Review';
export type RiskLevel = 'Low' | 'Moderate' | 'High';
export type FreshnessState = 'Current' | 'Stale' | 'Very Stale' | 'Missing';
export type ModalityType = 'Pathology' | 'Imaging' | 'Molecular';

export interface ModalitySummary {
  present: boolean;
  count: number;
  freshness: FreshnessState;
  latest_test?: string;
  latest_result?: string;
  latest_timestamp?: string;
}

export interface CaseItem {
  id: number;
  case_id: string;
  patient_synthetic_id: string;
  age_range: string;
  gender: string;
  consent_status: ConsentStatus;
  risk_level: RiskLevel;
  status: CaseStatus;
  created_at: string;
  updated_at: string;
  completeness_percentage: number;
  pathology: ModalitySummary;
  imaging: ModalitySummary;
  molecular: ModalitySummary;
  evidence_health: string;
  review_status: string;
}

export interface EvidenceProvenanceStep {
  step: string;
  system: string;
  timestamp: string;
  status: string;
  description: string;
}

export interface EvidenceEventItem {
  id: number;
  event_id: string;
  case_id: string;
  modality: ModalityType;
  vendor: string;
  test_name: string;
  result_summary: string;
  interpretation: string;
  event_timestamp: string;
  ingestion_timestamp?: string;
  freshness: FreshnessState;
  specimen_id?: string;
  parent_specimen_id?: string;
  source_system: string;
  device_system: string;
  validation_status: string;
  review_status: string;
  raw_payload?: string;
  is_restricted?: boolean;
}

export interface EvidenceDetail extends EvidenceEventItem {
  provenance: EvidenceProvenanceStep[];
}

export interface LineageNode {
  id: string;
  label: string;
  type: string;
  details: Record<string, any>;
  status: string;
  children: LineageNode[];
}

export interface LineageGraphResponse {
  case_id: string;
  root_specimens: LineageNode[];
  has_mismatch: boolean;
  mismatch_details?: string;
}

export interface ReviewDecisionItem {
  id: number;
  case_id: string;
  reviewer_role: string;
  reviewer_name: string;
  status: string;
  decision_text: string;
  missing_evidence_identified?: string;
  stale_evidence_identified?: string;
  lineage_issue_identified?: string;
  created_at: string;
}

export interface AuditLogItem {
  id: number;
  case_id?: string;
  user_role: string;
  action: string;
  resource: string;
  timestamp: string;
  result: string;
  details?: string;
}

export interface UserFeedbackItem {
  id: number;
  user_role: string;
  task_completed: string;
  time_taken_seconds: number;
  ease_of_use: number;
  timeline_clarity: number;
  completeness_confidence: number;
  comments?: string;
  suggested_improvements?: string;
  created_at: string;
}

export interface FeedbackMetrics {
  total_responses: number;
  avg_ease_of_use: number;
  avg_timeline_clarity: number;
  avg_completeness_confidence: number;
  avg_time_seconds: number;
}

export interface ExperimentRunItem {
  id: number;
  run_type: string;
  baseline_time_seconds: number;
  prototype_time_seconds: number;
  accuracy_baseline: number;
  accuracy_prototype: number;
  missing_detected: number;
  stale_detected: number;
  lineage_detected: number;
  created_at: string;
  notes?: string;
}

export interface ExperimentSummary {
  total_runs: number;
  mean_baseline_seconds: number;
  median_baseline_seconds: number;
  mean_prototype_seconds: number;
  median_prototype_seconds: number;
  time_reduction_percentage: number;
  time_saved_minutes: number;
  accuracy_baseline: number;
  accuracy_prototype: number;
  runs: ExperimentRunItem[];
}

export interface DashboardMetrics {
  total_cases: number;
  complete_cases: number;
  cases_needing_review: number;
  incomplete_cases: number;
  missing_evidence_cases: number;
  stale_evidence_cases: number;
  modality_counts: Record<string, number>;
  vendor_counts: Record<string, number>;
  recent_events_count: number;
}
