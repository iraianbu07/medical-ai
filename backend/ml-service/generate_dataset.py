"""
VITAL-GUARD AI — Medical-Grade Synthetic Dataset Generator
Generates realistic patient vital sign data with physiologically-accurate
organ-system labels for training snapshot and trend models.
"""
import csv
import random
import os

random.seed(42)

# ── Clinically-accurate vital sign profiles ─────────────────────────
# Each profile defines vital ranges that map to specific clinical syndromes
# based on real physiological patterns, NOT arbitrary score ranges.

VITAL_PROFILES = {
    "stable": {
        "heart_rate": (60, 95),
        "respiratory_rate": (12, 18),
        "spo2": (96, 100),
        "temperature": (36.2, 37.2),
        "systolic_bp": (100, 135),
        "diastolic_bp": (65, 85),
    },
    "mild_abnormality": {
        "heart_rate": (55, 105),
        "respiratory_rate": (11, 22),
        "spo2": (93, 97),
        "temperature": (36.0, 38.5),
        "systolic_bp": (88, 145),
        "diastolic_bp": (58, 92),
    },
    "sepsis_sirs": {
        # SIRS criteria: Temp >38.3 or <36, HR >90, RR >20
        # Sepsis adds organ dysfunction
        "heart_rate": (92, 125),
        "respiratory_rate": (21, 30),
        "spo2": (90, 96),
        "temperature": (38.4, 40.2),  # Fever is primary driver
        "systolic_bp": (85, 120),
        "diastolic_bp": (55, 75),
    },
    "sepsis_sirs_hypothermic": {
        # Hypothermic sepsis variant (temp <36°C)
        "heart_rate": (95, 130),
        "respiratory_rate": (22, 32),
        "spo2": (89, 95),
        "temperature": (34.0, 35.9),  # Hypothermia variant
        "systolic_bp": (80, 110),
        "diastolic_bp": (50, 70),
    },
    "cardiac_tachycardia": {
        # Tachycardia with hemodynamic instability
        "heart_rate": (105, 145),
        "respiratory_rate": (16, 24),
        "spo2": (92, 97),
        "temperature": (36.3, 37.8),  # Normal-ish temp (NOT fever)
        "systolic_bp": (70, 88),      # Hypotension
        "diastolic_bp": (45, 58),     # Low diastolic
    },
    "cardiac_bradycardia": {
        # Bradycardia with hypotension
        "heart_rate": (35, 49),
        "respiratory_rate": (14, 20),
        "spo2": (93, 98),
        "temperature": (36.0, 37.2),
        "systolic_bp": (75, 95),
        "diastolic_bp": (50, 65),
    },
    "cardiac_hypertensive": {
        # Tachycardia with severe hypertension
        "heart_rate": (102, 140),
        "respiratory_rate": (18, 26),
        "spo2": (92, 97),
        "temperature": (36.5, 37.5),
        "systolic_bp": (182, 220),     # Severe hypertension
        "diastolic_bp": (105, 130),
    },
    "respiratory_failure": {
        # Primary gas exchange failure — low SpO2 is the defining feature
        "heart_rate": (85, 120),
        "respiratory_rate": (24, 38),   # Compensatory tachypnea
        "spo2": (78, 91),              # Hypoxemia is primary
        "temperature": (36.8, 38.2),   # Temp often normal
        "systolic_bp": (90, 130),
        "diastolic_bp": (60, 80),
    },
    "hypertensive_crisis": {
        # Isolated severe hypertension without primary cardiac pattern
        "heart_rate": (70, 100),        # HR may be normal
        "respiratory_rate": (14, 22),
        "spo2": (94, 99),
        "temperature": (36.4, 37.5),
        "systolic_bp": (185, 230),
        "diastolic_bp": (115, 140),
    },
    "hemodynamic_shock": {
        # Circulatory collapse: severe hypotension + compensatory tachycardia
        "heart_rate": (115, 160),
        "respiratory_rate": (26, 40),
        "spo2": (80, 92),
        "temperature": (35.0, 38.5),
        "systolic_bp": (50, 78),        # Severe hypotension
        "diastolic_bp": (30, 50),
    },
    "multi_organ": {
        # Multiple systems affected simultaneously
        "heart_rate": (110, 150),
        "respiratory_rate": (25, 38),
        "spo2": (80, 91),
        "temperature": (38.5, 40.5),    # Fever present
        "systolic_bp": (70, 95),
        "diastolic_bp": (40, 60),
    },
    "critical": {
        # Imminent collapse — extreme values across multiple systems
        "heart_rate": (130, 175),
        "respiratory_rate": (32, 48),
        "spo2": (65, 85),
        "temperature": (39.0, 41.5),
        "systolic_bp": (50, 75),
        "diastolic_bp": (25, 45),
    },
}

# Category display names
CATEGORY_NAMES = {
    "stable": "Stable",
    "mild_abnormality": "Mild Abnormality",
    "sepsis_sirs": "Sepsis / SIRS",
    "sepsis_sirs_hypothermic": "Sepsis / SIRS",
    "cardiac_tachycardia": "Cardiac Risk",
    "cardiac_bradycardia": "Cardiac Risk",
    "cardiac_hypertensive": "Cardiac Risk",
    "respiratory_failure": "Respiratory Failure",
    "hypertensive_crisis": "Hypertensive Crisis",
    "hemodynamic_shock": "Hemodynamic Shock",
    "multi_organ": "Multi-Organ Risk",
    "critical": "Critical Deterioration",
}

# Risk score ranges per category (approximate VGI ranges for regression target)
RISK_RANGES = {
    "stable":                 (0, 20),
    "mild_abnormality":       (15, 35),
    "sepsis_sirs":            (35, 65),
    "sepsis_sirs_hypothermic":(40, 70),
    "cardiac_tachycardia":    (40, 75),
    "cardiac_bradycardia":    (35, 65),
    "cardiac_hypertensive":   (45, 75),
    "respiratory_failure":    (50, 80),
    "hypertensive_crisis":    (40, 70),
    "hemodynamic_shock":      (70, 95),
    "multi_organ":            (65, 90),
    "critical":               (85, 100),
}

# Hours-to-deterioration ranges
HOURS_RANGES = {
    "stable":                  (24, 72),
    "mild_abnormality":        (12, 36),
    "sepsis_sirs":             (4, 12),
    "sepsis_sirs_hypothermic": (3, 10),
    "cardiac_tachycardia":     (3, 10),
    "cardiac_bradycardia":     (3, 10),
    "cardiac_hypertensive":    (2, 8),
    "respiratory_failure":     (2, 8),
    "hypertensive_crisis":     (2, 6),
    "hemodynamic_shock":       (0.5, 3),
    "multi_organ":             (1, 6),
    "critical":                (0.5, 2),
}

# Sampling weights — more samples for common conditions
PROFILE_WEIGHTS = {
    "stable":                  0.20,
    "mild_abnormality":        0.15,
    "sepsis_sirs":             0.10,
    "sepsis_sirs_hypothermic": 0.05,
    "cardiac_tachycardia":     0.10,
    "cardiac_bradycardia":     0.05,
    "cardiac_hypertensive":    0.05,
    "respiratory_failure":     0.10,
    "hypertensive_crisis":     0.05,
    "hemodynamic_shock":       0.05,
    "multi_organ":             0.05,
    "critical":                0.05,
}


def gen_vital(ranges):
    return {k: round(random.uniform(*v), 1) for k, v in ranges.items()}


def gen_risk(label):
    lo, hi = RISK_RANGES[label]
    return round(random.uniform(lo, hi), 1)


def gen_hours(label):
    lo, hi = HOURS_RANGES[label]
    return round(random.uniform(lo, hi), 1)


def weighted_choice():
    """Choose a profile label based on weights."""
    labels = list(PROFILE_WEIGHTS.keys())
    weights = [PROFILE_WEIGHTS[l] for l in labels]
    return random.choices(labels, weights=weights, k=1)[0]


def generate_snapshot_dataset(n=8000):
    os.makedirs(os.path.dirname(__file__) or ".", exist_ok=True)
    path = os.path.join(os.path.dirname(__file__), "snapshot_dataset.csv")
    with open(path, "w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["heart_rate", "respiratory_rate", "spo2", "temperature", "systolic_bp", "diastolic_bp", "risk_score", "risk_category"])
        for _ in range(n):
            label = weighted_choice()
            v = gen_vital(VITAL_PROFILES[label])
            risk = gen_risk(label)
            cat = CATEGORY_NAMES[label]
            writer.writerow([v["heart_rate"], v["respiratory_rate"], v["spo2"], v["temperature"], v["systolic_bp"], v["diastolic_bp"], risk, cat])
    print(f"Generated {n} snapshot samples → {path}")


def generate_trend_dataset(n=5000, window=10):
    path = os.path.join(os.path.dirname(__file__), "trend_dataset.csv")
    headers = []
    for i in range(window):
        for feat in ["hr", "rr", "spo2", "temp", "sbp", "dbp"]:
            headers.append(f"{feat}_{i}")
    headers += ["risk_score", "risk_category", "hours_to_deterioration"]

    # Clinically-meaningful trajectories
    trajectories = [
        ("stable", "stable"),
        ("stable", "mild_abnormality"),
        ("stable", "sepsis_sirs"),
        ("stable", "cardiac_tachycardia"),
        ("stable", "respiratory_failure"),
        ("mild_abnormality", "sepsis_sirs"),
        ("mild_abnormality", "cardiac_tachycardia"),
        ("mild_abnormality", "respiratory_failure"),
        ("sepsis_sirs", "multi_organ"),
        ("sepsis_sirs", "hemodynamic_shock"),
        ("cardiac_tachycardia", "hemodynamic_shock"),
        ("cardiac_tachycardia", "critical"),
        ("respiratory_failure", "critical"),
        ("respiratory_failure", "multi_organ"),
        ("multi_organ", "critical"),
        ("stable", "hypertensive_crisis"),
        ("mild_abnormality", "cardiac_bradycardia"),
        ("stable", "sepsis_sirs_hypothermic"),
        ("cardiac_hypertensive", "critical"),
    ]

    with open(path, "w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(headers)

        for _ in range(n):
            start_label, end_label = random.choice(trajectories)

            row = []
            for i in range(window):
                t = i / (window - 1) if window > 1 else 1.0
                # Interpolate between start and end vital ranges
                vitals = {}
                for feat in ["heart_rate", "respiratory_rate", "spo2", "temperature", "systolic_bp", "diastolic_bp"]:
                    s_lo, s_hi = VITAL_PROFILES[start_label][feat]
                    e_lo, e_hi = VITAL_PROFILES[end_label][feat]
                    lo = s_lo + (e_lo - s_lo) * t
                    hi = s_hi + (e_hi - s_hi) * t
                    vitals[feat] = round(random.uniform(lo, hi), 1)
                row.extend([vitals["heart_rate"], vitals["respiratory_rate"], vitals["spo2"], vitals["temperature"], vitals["systolic_bp"], vitals["diastolic_bp"]])

            risk = gen_risk(end_label)
            hours = gen_hours(end_label)
            cat = CATEGORY_NAMES[end_label]
            row.extend([risk, cat, hours])
            writer.writerow(row)

    print(f"Generated {n} trend samples (window={window}) → {path}")


if __name__ == "__main__":
    generate_snapshot_dataset()
    generate_trend_dataset()
    print("Medical-grade dataset generation complete!")
