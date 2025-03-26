export interface HealthRecord {
    id: string;
    user_id: string;
    record_name: string;
    record_type: "lab_report" | "prescription" | "imaging" | "clinical_notes" | "other";
    doctor_name: string | null;
    date: string | null;
    file_url: string | null;
    summary: string | null;
    created_at: string;
    updated_at: string;
}
