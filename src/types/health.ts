export interface HealthRecord {
    record_type: "lab_report" | "prescription" | "imaging" | "clinical_notes" | "other";
    record_name: string;
    summary: string;
    doctor_name: string | null;
    date: string | null;
}
