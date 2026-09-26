"""
VITAL-GUARD AI — Medical-Grade Prediction Service
Loads trained models and provides risk predictions with clinically-accurate
organ-system classification based on physiological pattern matching.
"""
import os
import pickle
import numpy as np

ML_DIR = os.path.dirname(__file__)
SNAPSHOT_MODEL_PATH = os.path.join(ML_DIR, "snapshot_model.pkl")
TREND_MODEL_PATH = os.path.join(ML_DIR, "trend_model.pkl")
TREND_WINDOW = 10

FEATURES = ["heart_rate", "respiratory_rate", "spo2", "temperature", "systolic_bp", "diastolic_bp"]

# ── Clinical Reference Ranges (evidence-based) ─────────────────────
NORMAL_RANGES = {
    "heart_rate":       {"low": 60,  "high": 100, "critical_low": 40,  "critical_high": 150},
    "respiratory_rate": {"low": 12,  "high": 20,  "critical_low": 8,   "critical_high": 35},
    "spo2":             {"low": 95,  "high": 100, "critical_low": 88,  "critical_high": 100},
    "temperature":      {"low": 36.1,"high": 37.2,"critical_low": 35.0,"critical_high": 40.0},
    "systolic_bp":      {"low": 90,  "high": 140, "critical_low": 70,  "critical_high": 200},
    "diastolic_bp":     {"low": 60,  "high": 90,  "critical_low": 40,  "critical_high": 120},
}

# Load models
_snapshot_model = None
_trend_model = None


def _load_snapshot():
    global _snapshot_model
    if _snapshot_model is None and os.path.exists(SNAPSHOT_MODEL_PATH):
        with open(SNAPSHOT_MODEL_PATH, "rb") as f:
            _snapshot_model = pickle.load(f)
    return _snapshot_model


def _load_trend():
    global _trend_model
    if _trend_model is None and os.path.exists(TREND_MODEL_PATH):
        with open(TREND_MODEL_PATH, "rb") as f:
            _trend_model = pickle.load(f)
    return _trend_model


# ── Physiological Abnormality Detection ─────────────────────────────

def _get_abnormalities(vitals: dict) -> dict:
    """Detect which vital signs are abnormal and their severity.
    Returns a dict of {vital_name: {'direction': 'high'|'low', 'severity': 'mild'|'moderate'|'critical', 'value': float}}
    """
    abnormalities = {}
    for feat, ranges in NORMAL_RANGES.items():
        val = vitals.get(feat, 0)
        if feat == "spo2":
            # SpO2: lower is worse
            if val < ranges["critical_low"]:
                abnormalities[feat] = {"direction": "low", "severity": "critical", "value": val}
            elif val < ranges["low"]:
                abnormalities[feat] = {"direction": "low", "severity": "moderate", "value": val}
        else:
            # Other vitals: can be abnormal in either direction
            if val > ranges["critical_high"]:
                abnormalities[feat] = {"direction": "high", "severity": "critical", "value": val}
            elif val < ranges["critical_low"]:
                abnormalities[feat] = {"direction": "low", "severity": "critical", "value": val}
            elif val > ranges["high"]:
                abnormalities[feat] = {"direction": "high", "severity": "moderate", "value": val}
            elif val < ranges["low"]:
                abnormalities[feat] = {"direction": "low", "severity": "moderate", "value": val}
    return abnormalities


def _check_sirs_criteria(vitals: dict) -> int:
    """Count SIRS (Systemic Inflammatory Response Syndrome) criteria met.
    SIRS criteria:
    1. Temperature >38.3°C or <36°C
    2. Heart rate >90 bpm
    3. Respiratory rate >20 breaths/min
    4. (WBC not available, but we use SpO2 <94 as proxy for tissue hypoxia)
    """
    count = 0
    if vitals.get("temperature", 37) > 38.3 or vitals.get("temperature", 37) < 36.0:
        count += 1
    if vitals.get("heart_rate", 72) > 90:
        count += 1
    if vitals.get("respiratory_rate", 16) > 20:
        count += 1
    if vitals.get("spo2", 98) < 94:
        count += 1
    return count


def _check_cardiac_pattern(vitals: dict, abnormalities: dict) -> bool:
    """Detect cardiac compromise pattern:
    - Tachycardia (HR >100) or bradycardia (HR <50)
    - WITH hemodynamic instability (SBP <90 or DBP <60 or SBP >180)
    - OR significant HR abnormality with BP abnormality
    """
    hr = vitals.get("heart_rate", 72)
    sbp = vitals.get("systolic_bp", 120)
    dbp = vitals.get("diastolic_bp", 80)

    hr_abnormal = hr > 100 or hr < 50
    bp_abnormal = sbp < 90 or dbp < 60 or sbp > 180 or dbp > 100

    # Strong cardiac: clear tachycardia/bradycardia + BP instability
    if hr_abnormal and bp_abnormal:
        return True

    # Moderate cardiac: significant tachycardia with borderline BP
    if hr > 110 and (sbp < 100 or dbp < 65):
        return True

    # Bradycardia with any hypotension
    if hr < 50 and sbp < 100:
        return True

    return False


def _check_respiratory_pattern(vitals: dict, abnormalities: dict) -> bool:
    """Detect primary respiratory failure pattern:
    - SpO2 <92% (moderate-severe hypoxemia)
    - OR SpO2 <95% AND RR >24 (compensated respiratory distress)
    - OR RR >28 (severe tachypnea regardless)
    """
    spo2 = vitals.get("spo2", 98)
    rr = vitals.get("respiratory_rate", 16)

    if spo2 < 92:
        return True
    if spo2 < 95 and rr > 24:
        return True
    if rr > 28:
        return True
    return False


def _check_shock_pattern(vitals: dict, abnormalities: dict) -> bool:
    """Detect hemodynamic shock pattern:
    - SBP <80 AND HR >110 (compensatory tachycardia to hypotension)
    - OR SBP <70 (severe hypotension alone)
    """
    sbp = vitals.get("systolic_bp", 120)
    hr = vitals.get("heart_rate", 72)
    spo2 = vitals.get("spo2", 98)

    if sbp < 80 and hr > 110:
        return True
    if sbp < 70:
        return True
    if sbp < 85 and hr > 120 and spo2 < 93:
        return True
    return False


def _check_hypertensive_crisis(vitals: dict) -> bool:
    """Detect hypertensive crisis:
    - SBP >180 AND/OR DBP >120
    """
    sbp = vitals.get("systolic_bp", 120)
    dbp = vitals.get("diastolic_bp", 80)
    return sbp > 180 or dbp > 120


def _count_affected_systems(vitals: dict, abnormalities: dict) -> int:
    """Count how many organ systems show abnormalities.
    Systems: Cardiovascular, Respiratory, Thermoregulatory, Vascular/BP
    """
    systems = 0
    if "heart_rate" in abnormalities:
        systems += 1
    if "spo2" in abnormalities or "respiratory_rate" in abnormalities:
        systems += 1
    if "temperature" in abnormalities:
        systems += 1
    if "systolic_bp" in abnormalities or "diastolic_bp" in abnormalities:
        systems += 1
    return systems


# ── Core Classification Engine ──────────────────────────────────────

def classify_by_physiology(vitals: dict, vgi: float, history: list = None) -> str:
    """
    Medical-grade classification based on physiological pattern matching.
    Examines WHICH vitals are abnormal and WHAT syndrome they indicate,
    rather than using arbitrary VGI score thresholds.

    Classification hierarchy (highest priority first):
    1. Critical Deterioration — VGI ≥85 with any critical abnormality
    2. Hemodynamic Shock — circulatory collapse pattern
    3. Multi-Organ Risk — 3+ organ systems affected
    4. Sepsis / SIRS — meets ≥2 SIRS criteria with fever
    5. Cardiac Risk — cardiac compromise pattern
    6. Respiratory Failure — primary respiratory failure
    7. Hypertensive Crisis — isolated severe hypertension
    8. Mild Abnormality — 1-2 vitals mildly abnormal
    9. Stable — all vitals within normal ranges
    """
    abnormalities = _get_abnormalities(vitals)
    sirs_count = _check_sirs_criteria(vitals)
    is_cardiac = _check_cardiac_pattern(vitals, abnormalities)
    is_respiratory = _check_respiratory_pattern(vitals, abnormalities)
    is_shock = _check_shock_pattern(vitals, abnormalities)
    is_hypertensive = _check_hypertensive_crisis(vitals)
    affected_systems = _count_affected_systems(vitals, abnormalities)

    # Has any critical-level abnormality?
    has_critical = any(a["severity"] == "critical" for a in abnormalities.values())

    # ── Priority 1: Critical Deterioration ──
    if vgi >= 85 and has_critical:
        return "Critical Deterioration"

    # ── Priority 2: Hemodynamic Shock ──
    if is_shock:
        return "Hemodynamic Shock"

    # ── Priority 3: Critical Deterioration (critical vitals + high VGI) ──
    if has_critical and vgi >= 70:
        return "Critical Deterioration"

    # ── Priority 4: Multi-Organ Risk ──
    if affected_systems >= 3:
        return "Multi-Organ Risk"

    # ── Priority 5: Sepsis / SIRS ──
    # Requires fever/hypothermia + at least 1 other SIRS criterion
    temp = vitals.get("temperature", 37)
    has_temp_abnormality = temp > 38.3 or temp < 36.0
    if has_temp_abnormality and sirs_count >= 2:
        return "Sepsis / SIRS"

    # ── Priority 6: Cardiac Risk ──
    if is_cardiac:
        return "Cardiac Risk"

    # ── Priority 7: Respiratory Failure ──
    if is_respiratory:
        return "Respiratory Failure"

    # ── Priority 8: Hypertensive Crisis ──
    if is_hypertensive:
        return "Hypertensive Crisis"

    # ── Priority 9: Mild Abnormality ──
    if abnormalities:
        return "Mild Abnormality"

    # ── Priority 10: Stable ──
    return "Stable"


def get_clinical_reasoning(vitals: dict, category: str, abnormalities: dict = None) -> str:
    """Generate a brief clinical reasoning string explaining WHY this label was assigned."""
    if abnormalities is None:
        abnormalities = _get_abnormalities(vitals)

    hr = vitals.get("heart_rate", 72)
    spo2 = vitals.get("spo2", 98)
    rr = vitals.get("respiratory_rate", 16)
    temp = vitals.get("temperature", 37)
    sbp = vitals.get("systolic_bp", 120)
    dbp = vitals.get("diastolic_bp", 80)

    reasoning_map = {
        "Stable": "All vital signs are within normal physiological ranges.",
        "Mild Abnormality": _mild_reasoning(abnormalities),
        "Sepsis / SIRS": f"Temperature {temp}°C with HR {hr} bpm and RR {rr}/min meets ≥2 SIRS criteria, suggesting systemic inflammatory or infectious process.",
        "Cardiac Risk": f"HR {hr} bpm with BP {sbp}/{dbp} mmHg indicates hemodynamic instability consistent with cardiac compromise.",
        "Respiratory Failure": f"SpO₂ {spo2}% with RR {rr}/min indicates impaired gas exchange consistent with respiratory failure.",
        "Hypertensive Crisis": f"BP {sbp}/{dbp} mmHg is severely elevated, indicating hypertensive emergency requiring urgent evaluation.",
        "Hemodynamic Shock": f"SBP {sbp} mmHg with compensatory tachycardia (HR {hr} bpm) indicates circulatory collapse.",
        "Multi-Organ Risk": f"Abnormalities detected across {_count_affected_systems(vitals, abnormalities)} organ systems, suggesting multi-organ dysfunction.",
        "Critical Deterioration": f"Critical vital sign derangements with high deterioration index indicate imminent clinical collapse.",
    }
    return reasoning_map.get(category, "Clinical assessment required.")


def _mild_reasoning(abnormalities: dict) -> str:
    parts = []
    labels = {
        "heart_rate": "Heart rate",
        "respiratory_rate": "Respiratory rate",
        "spo2": "SpO₂",
        "temperature": "Temperature",
        "systolic_bp": "Systolic BP",
        "diastolic_bp": "Diastolic BP",
    }
    for feat, info in abnormalities.items():
        direction = "elevated" if info["direction"] == "high" else "low"
        parts.append(f"{labels.get(feat, feat)} mildly {direction} at {info['value']}")
    if parts:
        return "; ".join(parts) + ". No syndrome pattern detected."
    return "Minor vital sign variation detected."


# ── Model Inference Functions ───────────────────────────────────────

def snapshot_predict(vitals: dict) -> dict:
    model = _load_snapshot()
    if model is None:
        return None

    X = np.array([[vitals[f] for f in FEATURES]])
    risk_score = float(model["regressor"].predict(X)[0])
    risk_score = max(0, min(100, risk_score))

    # Use physiological classification instead of ML classifier
    category = classify_by_physiology(vitals, risk_score)

    importances = model.get("feature_importances", {})

    return {
        "risk_score": round(risk_score, 1),
        "risk_category": category,
        "feature_importances": importances,
    }


def trend_predict(history: list) -> dict:
    model = _load_trend()
    if model is None or len(history) < 2:
        return None

    window = model.get("window", TREND_WINDOW)

    # Use last `window` records, pad if less
    recent = history[-window:]
    row = []
    for record in recent:
        row.extend([
            record.get("heart_rate", 72),
            record.get("respiratory_rate", 16),
            record.get("spo2", 98),
            record.get("temperature", 37.0),
            record.get("systolic_bp", 120),
            record.get("diastolic_bp", 80),
        ])

    # Pad if fewer than window records
    while len(row) < window * 6:
        row = row[:6] + row  # repeat first record

    row = row[:window * 6]

    X = np.array([row])
    risk_score = float(model["regressor"].predict(X)[0])
    risk_score = max(0, min(100, risk_score))

    # Use physiological classification on the LATEST vitals in the history
    latest_vitals = history[-1]
    category = classify_by_physiology(latest_vitals, risk_score, history)

    hours = float(model["hours_regressor"].predict(X)[0])
    hours = max(0.5, hours)

    return {
        "risk_score": round(risk_score, 1),
        "risk_category": category,
        "estimated_hours": round(hours, 1),
    }


def compute_baseline(history: list) -> dict:
    if len(history) < 3:
        return {}
    baseline = {}
    for feat in FEATURES:
        key = feat
        vals = [h.get(key, 0) for h in history if key in h]
        if vals:
            baseline[key] = round(sum(vals) / len(vals), 1)
    return baseline


def compute_explanation(vitals: dict, baseline: dict, snapshot_result: dict, category: str = None) -> list:
    """Generate clinically-meaningful explanation factors."""
    factors = []
    feature_importances = snapshot_result.get("feature_importances", {}) if snapshot_result else {}
    abnormalities = _get_abnormalities(vitals)

    labels = {
        "heart_rate": "Heart Rate",
        "respiratory_rate": "Respiratory Rate",
        "spo2": "SpO₂",
        "temperature": "Temperature",
        "systolic_bp": "Systolic BP",
        "diastolic_bp": "Diastolic BP",
    }
    units = {
        "heart_rate": "bpm",
        "respiratory_rate": "/min",
        "spo2": "%",
        "temperature": "°C",
        "systolic_bp": "mmHg",
        "diastolic_bp": "mmHg",
    }

    # Clinical significance descriptions
    clinical_context = {
        "heart_rate": {
            "high": "Tachycardia — may indicate cardiac stress, pain, fever, hypovolemia, or anxiety",
            "low": "Bradycardia — may indicate heart block, medication effect, or increased vagal tone",
        },
        "respiratory_rate": {
            "high": "Tachypnea — may indicate respiratory distress, metabolic acidosis, or pain",
            "low": "Bradypnea — may indicate CNS depression or respiratory muscle fatigue",
        },
        "spo2": {
            "low": "Hypoxemia — impaired oxygen delivery to tissues, may indicate pneumonia, PE, or ARDS",
        },
        "temperature": {
            "high": "Fever — may indicate infection, inflammation, or drug reaction",
            "low": "Hypothermia — may indicate sepsis, exposure, or endocrine disorder",
        },
        "systolic_bp": {
            "high": "Hypertension — increases risk of stroke, aortic dissection, and end-organ damage",
            "low": "Hypotension — may indicate shock, dehydration, or cardiac failure",
        },
        "diastolic_bp": {
            "high": "Diastolic hypertension — indicates increased peripheral vascular resistance",
            "low": "Diastolic hypotension — may indicate vasodilation or aortic regurgitation",
        },
    }

    # Sort abnormalities by severity (critical first), then by feature importance
    sorted_feats = sorted(
        FEATURES,
        key=lambda f: (
            0 if abnormalities.get(f, {}).get("severity") == "critical" else
            1 if abnormalities.get(f, {}).get("severity") == "moderate" else 2,
            -(feature_importances.get(f, 0))
        )
    )

    for feat in sorted_feats:
        val = vitals.get(feat, 0)
        bl = baseline.get(feat)
        imp = feature_importances.get(feat, 0)
        abnormal_info = abnormalities.get(feat)
        deviation = round(val - bl, 1) if bl else None

        if abnormal_info or (deviation and abs(deviation) > 5):
            severity = abnormal_info["severity"] if abnormal_info else "mild"
            direction = abnormal_info["direction"] if abnormal_info else ("high" if deviation > 0 else "low")

            impact = "high" if severity == "critical" else ("medium" if severity == "moderate" else "low")

            # Build descriptive factor name
            desc = f"{labels.get(feat, feat)}"
            if deviation:
                dir_word = "above" if deviation > 0 else "below"
                desc += f" {dir_word} baseline"

            # Add clinical context
            clinical_note = clinical_context.get(feat, {}).get(direction, "")

            factor = {
                "factor": desc,
                "value": f"{val} {units.get(feat, '')}",
                "baseline": f"{bl} {units.get(feat, '')}'" if bl else None,
                "deviation": deviation,
                "impact": impact,
                "importance": round(imp, 4) if imp else 0,
                "severity": severity,
            }
            if clinical_note:
                factor["clinical_note"] = clinical_note

            factors.append(factor)

    if not factors:
        factors.append({
            "factor": "All Vitals Within Normal Range",
            "value": "Normal",
            "impact": "low",
            "importance": 0,
            "severity": "normal",
        })

    return factors[:6]


def compute_timeline(current_vgi: float, history: list) -> list:
    """Project risk trajectory into the future."""
    timeline = []
    # Estimate rate of change from history
    if len(history) >= 3:
        recent_vgis = []
        for h in history[-5:]:
            v = h
            hr_risk = max(0, (v.get("heart_rate", 72) - 90) * 0.5)
            spo2_risk = max(0, (95 - v.get("spo2", 98)) * 3)
            rr_risk = max(0, (v.get("respiratory_rate", 16) - 20) * 1.5)
            temp_risk = max(0, (v.get("temperature", 37) - 37.5) * 5)
            bp_risk = max(0, (90 - v.get("systolic_bp", 120)) * 0.8) + max(0, (v.get("systolic_bp", 120) - 160) * 0.5)
            est_vgi = min(100, max(0, hr_risk + spo2_risk + rr_risk + temp_risk + bp_risk))
            recent_vgis.append(est_vgi)
        if len(recent_vgis) >= 2:
            rate = (recent_vgis[-1] - recent_vgis[0]) / max(1, len(recent_vgis))
        else:
            rate = current_vgi * 0.02
    else:
        rate = current_vgi * 0.025

    for h in [0, 2, 4, 6, 8, 10, 12]:
        projected = min(100, max(0, current_vgi + rate * h))
        timeline.append({"hours": h, "risk": round(projected, 1)})

    return timeline


def estimate_hours(vgi: float, category: str) -> float:
    """Estimate hours to deterioration based on VGI and clinical category."""
    # Category-specific time estimates (evidence-based urgency levels)
    category_hours = {
        "Stable": (24, 72),
        "Mild Abnormality": (12, 36),
        "Sepsis / SIRS": (4, 12),
        "Cardiac Risk": (3, 10),
        "Respiratory Failure": (2, 8),
        "Hypertensive Crisis": (2, 6),
        "Hemodynamic Shock": (0.5, 3),
        "Multi-Organ Risk": (1, 6),
        "Critical Deterioration": (0.5, 2),
    }
    lo, hi = category_hours.get(category, (6, 24))
    # Interpolate based on VGI within the category's range
    t = max(0, min(1, vgi / 100))
    hours = hi - (hi - lo) * t
    return round(max(0.5, hours), 1)


# ── Main Prediction Function ───────────────────────────────────────

def predict_risk(current_vitals: dict, history: list) -> dict:
    """Main prediction function combining snapshot and trend models
    with medical-grade physiological classification."""
    # Snapshot prediction
    snap = snapshot_predict(current_vitals)

    # Trend prediction
    full_history = history + [current_vitals]
    trend = trend_predict(full_history)

    # Risk score fusion
    if snap and trend:
        vgi = (snap["risk_score"] + trend["risk_score"]) / 2
    elif snap:
        vgi = snap["risk_score"]
    elif trend:
        vgi = trend["risk_score"]
    else:
        return None

    vgi = round(max(0, min(100, vgi)), 1)

    # ── MEDICAL-GRADE CLASSIFICATION ──
    # Use physiological pattern matching, NOT score thresholds
    category = classify_by_physiology(current_vitals, vgi, history)

    # ── Override VGI if the ML model under-predicted a severe clinical condition ──
    if category == "Critical Deterioration" and vgi < 85:
        vgi = 85.0 + (15.0 * (vgi / 100))
    elif category == "Hemodynamic Shock" and vgi < 80:
        vgi = 80.0 + (15.0 * (vgi / 100))
    elif category == "Multi-Organ Risk" and vgi < 75:
        vgi = 75.0 + (15.0 * (vgi / 100))
    elif category == "Sepsis / SIRS" and vgi < 70:
        vgi = 70.0 + (15.0 * (vgi / 100))
    elif category == "Cardiac Risk" and vgi < 70:
        vgi = 70.0 + (15.0 * (vgi / 100))
    elif category == "Respiratory Failure" and vgi < 70:
        vgi = 70.0 + (15.0 * (vgi / 100))
    
    vgi = round(min(100.0, vgi), 1)

    # Estimate hours based on category + VGI
    hours = estimate_hours(vgi, category)

    # Baseline
    baseline = compute_baseline(history)

    # Clinical explanation
    explanation = compute_explanation(current_vitals, baseline, snap, category)

    # Clinical reasoning
    reasoning = get_clinical_reasoning(current_vitals, category)

    # Timeline
    timeline = compute_timeline(vgi, history)

    # Alert
    alert = vgi >= 70 or category in ("Critical Deterioration", "Hemodynamic Shock", "Multi-Organ Risk")

    return {
        "vgi": vgi,
        "risk_category": category,
        "clinical_reasoning": reasoning,
        "estimated_hours_to_deterioration": hours,
        "explanation": explanation,
        "baseline": baseline,
        "timeline": timeline,
        "alert": alert,
        "alert_message": f"⚠️ {category}: {reasoning} Estimated deterioration in {hours} hours. Immediate clinical review recommended." if alert else None,
    }
