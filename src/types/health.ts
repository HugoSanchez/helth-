export interface HealthRecord {
    id: string;
    user_id: string;
    record_name: string;
    record_type: "lab_report" | "prescription" | "imaging" | "clinical_notes" | "other";
    record_subtype?: string;
    doctor_name?: string;
    date?: string;
    file_url?: string;
    summary?: string;
    created_at: string;
    updated_at: string;
}
