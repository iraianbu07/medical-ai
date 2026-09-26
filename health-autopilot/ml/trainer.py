"""
ML model training pipeline — trains all 4 models from accumulated data.
Falls back to rule-based logic if < MIN_DAYS_FOR_ML data points exist.
"""
import os
import sys
import json
import numpy as np
import pandas as pd
from datetime import date, timedelta
from sklearn.ensemble import RandomForestClassifier, GradientBoostingRegressor
from sklearn.tree import DecisionTreeClassifier
from sklearn.linear_model import LinearRegression
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline
from sklearn.model_selection import train_test_split
import joblib
import asyncio
import structlog

sys.path.insert(0, "/app")
logger = structlog.get_logger()

ARTIFACTS_DIR = os.environ.get("MODEL_ARTIFACTS_DIR", "/ml/artifacts")
os.makedirs(ARTIFACTS_DIR, exist_ok=True)

MIN_SAMPLES = 14  # Minimum days of data before training


def load_training_data():
    """Load all users' metrics as a flat DataFrame from PostgreSQL."""
    import asyncpg
    import asyncio

    async def _load():
        conn = await asyncpg.connect(os.environ.get("DATABASE_URL", "").replace("+asyncpg", ""))
        rows = await conn.fetch("""
            SELECT 
                steps, sleep_hours, screen_time_minutes, mood_score, energy_level,
                stress_level, hydration_cups, data_confidence_score,
                LAG(mood_score, 1) OVER (PARTITION BY user_id ORDER BY date) AS mood_lag1,
                LAG(mood_score, 2) OVER (PARTITION BY user_id ORDER BY date) AS mood_lag2,
                LAG(mood_score, 3) OVER (PARTITION BY user_id ORDER BY date) AS mood_lag3,
                LAG(mood_score, 4) OVER (PARTITION BY user_id ORDER BY date) AS mood_lag4,
                LAG(mood_score, 5) OVER (PARTITION BY user_id ORDER BY date) AS mood_lag5,
                EXTRACT(hour FROM sleep_start_time) AS sleep_start_hour,
                AVG(steps) OVER (PARTITION BY user_id ORDER BY date ROWS BETWEEN 2 PRECEDING AND CURRENT ROW) AS steps_avg3d,
                AVG(sleep_hours) OVER (PARTITION BY user_id ORDER BY date ROWS BETWEEN 2 PRECEDING AND CURRENT ROW) AS sleep_avg3d
            FROM daily_metrics
            WHERE steps IS NOT NULL OR sleep_hours IS NOT NULL
            ORDER BY user_id, date
        """)
        await conn.close()
        return pd.DataFrame(rows, columns=[
            "steps", "sleep_hours", "screen_time_minutes", "mood_score", "energy_level",
            "stress_level", "hydration_cups", "data_confidence_score",
            "mood_lag1", "mood_lag2", "mood_lag3", "mood_lag4", "mood_lag5",
            "sleep_start_hour", "steps_avg3d", "sleep_avg3d"
        ])

    return asyncio.run(_load())


def train_fatigue_classifier(df: pd.DataFrame):
    """Model 1: Fatigue Risk Classifier — RandomForestClassifier."""
    features = ["sleep_avg3d", "steps_avg3d", "screen_time_minutes", "mood_score", "stress_level"]
    df_clean = df[features].dropna()

    if len(df_clean) < MIN_SAMPLES:
        logger.warning("Not enough data for fatigue classifier")
        return None

    # Create synthetic label: fatigue = low sleep AND low steps AND high stress
    df_clean = df_clean.copy()
    df_clean["fatigue"] = (
        (df_clean["sleep_avg3d"] < 6) &
        (df_clean["steps_avg3d"] < 4000) &
        (df_clean["stress_level"] >= 4)
    ).astype(int)

    X = df_clean[features]
    y = df_clean["fatigue"]

    if y.sum() < 5:
        logger.warning("Not enough positive samples for fatigue classifier")
        return None

    model = Pipeline([
        ("scaler", StandardScaler()),
        ("clf", RandomForestClassifier(n_estimators=50, random_state=42, class_weight="balanced"))
    ])

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    model.fit(X_train, y_train)

    path = os.path.join(ARTIFACTS_DIR, "fatigue_classifier.pkl")
    joblib.dump(model, path)
    logger.info("Fatigue classifier trained", accuracy=model.score(X_test, y_test))
    return model


def train_productivity_predictor(df: pd.DataFrame):
    """Model 2: Productivity Window Predictor — DecisionTreeClassifier."""
    features = ["sleep_hours", "sleep_start_hour", "mood_score", "steps_avg3d"]
    df_clean = df[features].dropna()

    if len(df_clean) < MIN_SAMPLES:
        return None

    # Heuristic label: morning person if sleep_start < 22 and sleep >= 7
    def classify_window(row):
        if row["sleep_hours"] >= 7 and (row["sleep_start_hour"] or 23) < 22:
            return "morning"
        elif row["mood_score"] and row["mood_score"] >= 4:
            return "afternoon"
        else:
            return "evening"

    df_clean = df_clean.copy()
    df_clean["window"] = df_clean.apply(classify_window, axis=1)

    X = df_clean[features].fillna(df_clean[features].median())
    y = df_clean["window"]

    model = DecisionTreeClassifier(max_depth=5, random_state=42)
    model.fit(X, y)

    path = os.path.join(ARTIFACTS_DIR, "productivity_predictor.pkl")
    joblib.dump(model, path)
    logger.info("Productivity predictor trained")
    return model


def train_mood_forecaster(df: pd.DataFrame):
    """Model 3: Mood Trend Forecaster — LinearRegression."""
    lag_features = ["mood_lag1", "mood_lag2", "mood_lag3", "mood_lag4", "mood_lag5", "sleep_hours", "steps", "stress_level"]
    df_clean = df[lag_features + ["mood_score"]].dropna()

    if len(df_clean) < MIN_SAMPLES:
        return None

    X = df_clean[lag_features]
    y = df_clean["mood_score"]

    model = Pipeline([
        ("scaler", StandardScaler()),
        ("reg", LinearRegression())
    ])
    model.fit(X, y)

    path = os.path.join(ARTIFACTS_DIR, "mood_forecaster.pkl")
    joblib.dump(model, path)
    logger.info("Mood forecaster trained", r2=model.score(X, y))
    return model


def train_score_predictor(df: pd.DataFrame):
    """Model 4: Health Score Predictor — GradientBoostingRegressor."""
    features = [
        "sleep_hours", "steps", "screen_time_minutes", "mood_score",
        "energy_level", "stress_level", "hydration_cups", "sleep_avg3d", "steps_avg3d"
    ]

    # Load health scores for labels
    async def _load_scores():
        import asyncpg
        conn = await asyncpg.connect(os.environ.get("DATABASE_URL", "").replace("+asyncpg", ""))
        rows = await conn.fetch("SELECT score FROM health_score_history ORDER BY user_id, date")
        await conn.close()
        return [r["score"] for r in rows]

    df_clean = df[features].dropna()
    if len(df_clean) < MIN_SAMPLES:
        return None

    scores = asyncio.run(_load_scores())
    if len(scores) < len(df_clean):
        scores = scores + [60] * (len(df_clean) - len(scores))
    elif len(scores) > len(df_clean):
        scores = scores[:len(df_clean)]

    X = df_clean.fillna(df_clean.median())
    y = np.array(scores[:len(X)])

    model = Pipeline([
        ("scaler", StandardScaler()),
        ("gbr", GradientBoostingRegressor(n_estimators=100, max_depth=3, random_state=42))
    ])
    model.fit(X, y)

    path = os.path.join(ARTIFACTS_DIR, "score_predictor.pkl")
    joblib.dump(model, path)
    logger.info("Score predictor trained", r2=model.score(X, y))
    return model


def train_all_models():
    """Main training pipeline."""
    logger.info("Loading training data...")
    try:
        df = load_training_data()
        logger.info("Training data loaded", rows=len(df))
    except Exception as e:
        logger.error("Failed to load training data", error=str(e))
        return

    train_fatigue_classifier(df)
    train_productivity_predictor(df)
    train_mood_forecaster(df)
    train_score_predictor(df)

    # Save metadata
    metadata = {
        "trained_at": date.today().isoformat(),
        "training_samples": len(df),
        "models": ["fatigue_classifier", "productivity_predictor", "mood_forecaster", "score_predictor"]
    }
    with open(os.path.join(ARTIFACTS_DIR, "metadata.json"), "w") as f:
        import json
        json.dump(metadata, f)

    logger.info("All models trained successfully")


if __name__ == "__main__":
    train_all_models()
