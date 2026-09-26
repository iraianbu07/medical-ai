"""
Report Simulation API — VITAL-GUARD AI
Generates realistic patient simulation reports for demonstration and clinical training.
"""
import random
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from database import get_db
from auth import get_current_patient
from models import Patient

router = APIRouter(prefix="/report", tags=["Report Simulation"])
IST = timezone(timedelta(hours=5, minutes=30))

# ── Pre-built simulation scenarios ─────────────────────────────────────────────

SIMULATION_SCENARIOS = {
    "sepsis_alert": {
        "label": "Sepsis / SIRS Alert",
        "description": "Patient presenting with fever, tachycardia, and elevated respiratory rate suggesting SIRS/Sepsis.",
        "vitals": {"heart_rate": 118, "spo2": 92.4, "temperature": 39.1, "respiratory_rate": 24, "systolic_bp": 94, "diastolic_bp": 62},
        "vgi": 74.5,
        "risk_category": "Sepsis / SIRS",
        "estimated_hours_to_deterioration": 3.5,
        "alert": True,
        "clinical_reasoning": "Temperature 39.1°C with HR 118 bpm and RR 24/min meets ≥2 SIRS criteria. SpO₂ dip to 92.4% suggests early hypoxemia.",
        "recommendations": [
            {"priority": "HIGH", "text": "Start IV fluids (30ml/kg)", "desc": "For sepsis management", "color": "#ef4444"},
            {"priority": "HIGH", "text": "Blood cultures × 2 before antibiotics", "desc": "Source identification", "color": "#ef4444"},
            {"priority": "MEDIUM", "text": "Broad-spectrum IV antibiotics", "desc": "Within 1 hour of diagnosis", "color": "#f59e0b"},
            {"priority": "MEDIUM", "text": "Lactate level measurement", "desc": "Assess tissue perfusion", "color": "#f59e0b"},
        ],
        "timeline": [
            {"hours": 0, "risk": 74.5}, {"hours": 2, "risk": 79.2}, {"hours": 4, "risk": 84.1},
            {"hours": 6, "risk": 88.0}, {"hours": 8, "risk": 91.5}, {"hours": 10, "risk": 94.2}, {"hours": 12, "risk": 96.8}
        ],
        "explanation": [
            {"factor": "Temperature Elevated", "value": "39.1°C", "impact": "high", "severity": "moderate"},
            {"factor": "Heart Rate Elevated", "value": "118 bpm", "impact": "medium", "severity": "moderate"},
            {"factor": "SpO₂ Below Normal", "value": "92.4%", "impact": "high", "severity": "moderate"},
            {"factor": "Respiratory Rate Elevated", "value": "24/min", "impact": "medium", "severity": "moderate"},
        ],
    },
    "hemodynamic_shock": {
        "label": "Hemodynamic Shock",
        "description": "Critical presentation with severe hypotension and compensatory tachycardia indicating circulatory collapse.",
        "vitals": {"heart_rate": 138, "spo2": 89.0, "temperature": 37.6, "respiratory_rate": 28, "systolic_bp": 72, "diastolic_bp": 44},
        "vgi": 91.0,
        "risk_category": "Hemodynamic Shock",
        "estimated_hours_to_deterioration": 0.8,
        "alert": True,
        "clinical_reasoning": "SBP 72 mmHg with compensatory tachycardia (HR 138 bpm) indicates circulatory collapse. Immediate resuscitation required.",
        "recommendations": [
            {"priority": "HIGH", "text": "Emergency resuscitation protocol", "desc": "Immediate IV fluid bolus 500ml", "color": "#ef4444"},
            {"priority": "HIGH", "text": "Vasopressors (norepinephrine)", "desc": "If MAP <65 after fluid challenge", "color": "#ef4444"},
            {"priority": "HIGH", "text": "ICU transfer immediately", "desc": "Critical hemodynamic instability", "color": "#ef4444"},
            {"priority": "MEDIUM", "text": "Arterial line placement", "desc": "Continuous BP monitoring", "color": "#f59e0b"},
        ],
        "timeline": [
            {"hours": 0, "risk": 91.0}, {"hours": 2, "risk": 93.5}, {"hours": 4, "risk": 95.2},
            {"hours": 6, "risk": 97.0}, {"hours": 8, "risk": 98.1}, {"hours": 10, "risk": 99.0}, {"hours": 12, "risk": 99.5}
        ],
        "explanation": [
            {"factor": "Systolic BP Low", "value": "72 mmHg", "impact": "high", "severity": "critical"},
            {"factor": "Heart Rate Elevated", "value": "138 bpm", "impact": "high", "severity": "critical"},
            {"factor": "SpO₂ Below Normal", "value": "89.0%", "impact": "high", "severity": "critical"},
            {"factor": "Respiratory Rate Elevated", "value": "28/min", "impact": "high", "severity": "moderate"},
        ],
    },
    "respiratory_failure": {
        "label": "Respiratory Failure",
        "description": "Progressive hypoxemia with increasing work of breathing, consistent with acute respiratory failure.",
        "vitals": {"heart_rate": 104, "spo2": 88.0, "temperature": 38.4, "respiratory_rate": 31, "systolic_bp": 108, "diastolic_bp": 70},
        "vgi": 68.2,
        "risk_category": "Respiratory Failure",
        "estimated_hours_to_deterioration": 2.1,
        "alert": True,
        "clinical_reasoning": "SpO₂ 88.0% with RR 31/min indicates acute hypoxemic respiratory failure. Supplemental O₂ urgently required.",
        "recommendations": [
            {"priority": "HIGH", "text": "Supplemental O₂ therapy (15L NRB)", "desc": "SpO₂ below safe threshold", "color": "#ef4444"},
            {"priority": "HIGH", "text": "Chest X-ray stat", "desc": "Rule out pneumothorax, consolidation", "color": "#ef4444"},
            {"priority": "MEDIUM", "text": "ABG analysis", "desc": "Assess ventilatory adequacy", "color": "#f59e0b"},
            {"priority": "LOW", "text": "Prepare for NIV if no improvement", "desc": "CPAP or BiPAP readiness", "color": "#10b981"},
        ],
        "timeline": [
            {"hours": 0, "risk": 68.2}, {"hours": 2, "risk": 74.0}, {"hours": 4, "risk": 79.5},
            {"hours": 6, "risk": 83.2}, {"hours": 8, "risk": 87.0}, {"hours": 10, "risk": 90.1}, {"hours": 12, "risk": 92.5}
        ],
        "explanation": [
            {"factor": "SpO₂ Below Normal", "value": "88.0%", "impact": "high", "severity": "critical"},
            {"factor": "Respiratory Rate Elevated", "value": "31/min", "impact": "high", "severity": "moderate"},
            {"factor": "Temperature Elevated", "value": "38.4°C", "impact": "medium", "severity": "moderate"},
            {"factor": "Heart Rate Elevated", "value": "104 bpm", "impact": "medium", "severity": "moderate"},
        ],
    },
    "cardiac_risk": {
        "label": "Cardiac Risk",
        "description": "Hemodynamic compromise with cardiac rhythm abnormalities and borderline BP.",
        "vitals": {"heart_rate": 148, "spo2": 94.5, "temperature": 37.2, "respiratory_rate": 20, "systolic_bp": 88, "diastolic_bp": 56},
        "vgi": 62.8,
        "risk_category": "Cardiac Risk",
        "estimated_hours_to_deterioration": 4.2,
        "alert": True,
        "clinical_reasoning": "HR 148 bpm with BP 88/56 mmHg indicates cardiac compromise. Arrhythmia or decompensated heart failure suspected.",
        "recommendations": [
            {"priority": "HIGH", "text": "Cardiology consult (STAT)", "desc": "Hemodynamic instability detected", "color": "#ef4444"},
            {"priority": "HIGH", "text": "12-lead ECG immediately", "desc": "Rule out arrhythmia and STEMI", "color": "#ef4444"},
            {"priority": "MEDIUM", "text": "Cardiac enzyme panel", "desc": "Troponin, BNP levels", "color": "#f59e0b"},
            {"priority": "MEDIUM", "text": "Continuous cardiac monitoring", "desc": "Telemetry bed required", "color": "#f59e0b"},
        ],
        "timeline": [
            {"hours": 0, "risk": 62.8}, {"hours": 2, "risk": 68.5}, {"hours": 4, "risk": 73.0},
            {"hours": 6, "risk": 77.5}, {"hours": 8, "risk": 81.2}, {"hours": 10, "risk": 84.5}, {"hours": 12, "risk": 87.0}
        ],
        "explanation": [
            {"factor": "Heart Rate Elevated", "value": "148 bpm", "impact": "high", "severity": "critical"},
            {"factor": "Systolic BP Low", "value": "88 mmHg", "impact": "high", "severity": "moderate"},
            {"factor": "Diastolic BP Low", "value": "56 mmHg", "impact": "medium", "severity": "moderate"},
            {"factor": "SpO₂ Borderline", "value": "94.5%", "impact": "medium", "severity": "moderate"},
        ],
    },
    "hypertensive_crisis": {
        "label": "Hypertensive Crisis",
        "description": "Severely elevated blood pressure with risk of end-organ damage — stroke, MI, renal failure.",
        "vitals": {"heart_rate": 92, "spo2": 97.0, "temperature": 37.0, "respiratory_rate": 18, "systolic_bp": 210, "diastolic_bp": 128},
        "vgi": 55.0,
        "risk_category": "Hypertensive Crisis",
        "estimated_hours_to_deterioration": 5.0,
        "alert": False,
        "clinical_reasoning": "BP 210/128 mmHg is severely elevated with end-organ risk. Urgent BP reduction required.",
        "recommendations": [
            {"priority": "HIGH", "text": "IV antihypertensive therapy", "desc": "Labetalol or Nicardipine infusion", "color": "#ef4444"},
            {"priority": "HIGH", "text": "CT head to rule out stroke", "desc": "Neurological deficit screening", "color": "#ef4444"},
            {"priority": "MEDIUM", "text": "Renal function panel (STAT)", "desc": "Creatinine, BUN, urinalysis", "color": "#f59e0b"},
            {"priority": "LOW", "text": "Target MAP <110 in 1st hour", "desc": "Gradual BP reduction protocol", "color": "#10b981"},
        ],
        "timeline": [
            {"hours": 0, "risk": 55.0}, {"hours": 2, "risk": 60.0}, {"hours": 4, "risk": 65.0},
            {"hours": 6, "risk": 70.0}, {"hours": 8, "risk": 74.5}, {"hours": 10, "risk": 78.0}, {"hours": 12, "risk": 81.0}
        ],
        "explanation": [
            {"factor": "Systolic BP Elevated", "value": "210 mmHg", "impact": "high", "severity": "critical"},
            {"factor": "Diastolic BP Elevated", "value": "128 mmHg", "impact": "high", "severity": "critical"},
            {"factor": "Heart Rate Borderline", "value": "92 bpm", "impact": "low", "severity": "normal"},
        ],
    },
    "stable_monitoring": {
        "label": "Stable — Routine Monitoring",
        "description": "All vital signs within normal physiological ranges. Routine monitoring recommended.",
        "vitals": {"heart_rate": 72, "spo2": 98.2, "temperature": 36.8, "respiratory_rate": 14, "systolic_bp": 118, "diastolic_bp": 76},
        "vgi": 8.5,
        "risk_category": "Stable",
        "estimated_hours_to_deterioration": 48.0,
        "alert": False,
        "clinical_reasoning": "All vital signs within normal ranges. No immediate clinical concerns detected based on current assessment.",
        "recommendations": [
            {"priority": "LOW", "text": "Continue routine monitoring", "desc": "Patient vitals stable", "color": "#10b981"},
            {"priority": "LOW", "text": "Monitor SpO₂ every 4 hours", "desc": "Standard ward protocol", "color": "#10b981"},
            {"priority": "LOW", "text": "Repeat vitals in 1 hour", "desc": "Track for deviation", "color": "#10b981"},
        ],
        "timeline": [
            {"hours": 0, "risk": 8.5}, {"hours": 2, "risk": 9.0}, {"hours": 4, "risk": 9.5},
            {"hours": 6, "risk": 10.0}, {"hours": 8, "risk": 10.5}, {"hours": 10, "risk": 11.0}, {"hours": 12, "risk": 11.8}
        ],
        "explanation": [
            {"factor": "All Vitals Within Range", "value": "Normal", "impact": "low", "severity": "normal"},
        ],
    },
}

SIMULATED_PATIENTS = [
    {"name": "Arjun Mehta", "age": 67, "gender": "Male", "conditions": "Type 2 Diabetes, Hypertension", "risk_level": "High"},
    {"name": "Priya Sharma", "age": 45, "gender": "Female", "conditions": "Asthma, Obesity", "risk_level": "Medium"},
    {"name": "Ravi Kumar", "age": 78, "gender": "Male", "conditions": "CHF, CKD Stage 3", "risk_level": "High"},
    {"name": "Lakshmi Nair", "age": 34, "gender": "Female", "conditions": "None", "risk_level": "Low"},
    {"name": "Vikram Patel", "age": 55, "gender": "Male", "conditions": "Coronary Artery Disease, Hyperlipidemia", "risk_level": "High"},
]


@router.get("/scenarios")
def list_scenarios():
    """List all available simulation scenarios."""
    return [
        {
            "id": key,
            "label": val["label"],
            "description": val["description"],
            "vgi": val["vgi"],
            "risk_category": val["risk_category"],
            "alert": val["alert"],
        }
        for key, val in SIMULATION_SCENARIOS.items()
    ]


@router.get("/simulate/{scenario_id}")
def simulate_report(
    scenario_id: str,
    patient_index: int = 0,
    patient: Patient = Depends(get_current_patient),
    db: Session = Depends(get_db),
):
    """Generate a simulated patient report for a given scenario."""
    if scenario_id not in SIMULATION_SCENARIOS:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail=f"Scenario '{scenario_id}' not found.")

    scenario = SIMULATION_SCENARIOS[scenario_id]

    # Use real patient info if available, otherwise use simulated patient
    sim_patient = SIMULATED_PATIENTS[patient_index % len(SIMULATED_PATIENTS)]

    # Use real patient data from DB if it exists
    real_patient = db.query(Patient).filter(Patient.patient_id == patient.patient_id).first()
    profile_name = real_patient.name if real_patient and real_patient.name and real_patient.name != "Patient" else sim_patient["name"]
    profile_age = real_patient.age if real_patient and real_patient.age else sim_patient["age"]
    profile_gender = real_patient.gender if real_patient and real_patient.gender else sim_patient["gender"]
    profile_conditions = real_patient.conditions if real_patient and real_patient.conditions else sim_patient["conditions"]
    profile_risk = real_patient.risk_level if real_patient and real_patient.risk_level else sim_patient["risk_level"]

    return {
        "scenario_id": scenario_id,
        "generated_at": datetime.now(IST).isoformat(),
        "patient": {
            "patient_id": patient.patient_id,
            "name": profile_name,
            "age": profile_age,
            "gender": profile_gender,
            "conditions": profile_conditions,
            "risk_level": profile_risk,
        },
        "prediction": {
            "vgi": scenario["vgi"],
            "risk_category": scenario["risk_category"],
            "clinical_reasoning": scenario["clinical_reasoning"],
            "estimated_hours_to_deterioration": scenario["estimated_hours_to_deterioration"],
            "alert": scenario["alert"],
            "alert_message": f"⚠️ {scenario['risk_category']}: {scenario['clinical_reasoning']}" if scenario["alert"] else None,
            "current_vitals": scenario["vitals"],
            "timeline": scenario["timeline"],
            "explanation": scenario["explanation"],
        },
        "recommendations": scenario["recommendations"],
        "label": scenario["label"],
        "description": scenario["description"],
    }
