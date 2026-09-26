"""
Open-Meteo weather client — free API, no key needed.
Fetches current weather + daily forecast for user location.
"""
import httpx
from typing import Optional, Dict
from app.config import settings
import structlog

logger = structlog.get_logger()

WMO_CODES = {
    0: "clear", 1: "clear", 2: "partly_cloudy", 3: "cloudy",
    45: "fog", 48: "fog",
    51: "drizzle", 53: "drizzle", 55: "drizzle",
    61: "rain", 63: "rain", 65: "heavy_rain",
    71: "snow", 73: "snow", 75: "heavy_snow", 77: "snow",
    80: "rain", 81: "rain", 82: "heavy_rain",
    85: "snow", 86: "snow",
    95: "storm", 96: "storm", 99: "storm",
}


async def get_weather(lat: float, lon: float) -> Optional[Dict]:
    """Fetch current weather from Open-Meteo API."""
    url = f"{settings.OPENMETEO_BASE_URL}/forecast"
    params = {
        "latitude": lat,
        "longitude": lon,
        "current": "temperature_2m,weathercode,windspeed_10m,precipitation",
        "daily": "temperature_2m_max,temperature_2m_min,weathercode,precipitation_sum",
        "timezone": "auto",
        "forecast_days": 2,
    }

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(url, params=params)
            response.raise_for_status()
            data = response.json()

        current = data.get("current", {})
        wmo_code = current.get("weathercode", 0)
        condition = WMO_CODES.get(wmo_code, "clear")

        return {
            "condition": condition,
            "temperature_celsius": current.get("temperature_2m"),
            "wind_speed_kmh": current.get("windspeed_10m"),
            "precipitation_mm": current.get("precipitation", 0),
            "is_raining": condition in ("rain", "heavy_rain", "drizzle", "storm"),
            "is_cold": (current.get("temperature_2m") or 20) < 10,
            "is_hot": (current.get("temperature_2m") or 20) > 32,
            "wmo_code": wmo_code,
        }
    except Exception as e:
        logger.warning("Weather fetch failed", error=str(e))
        return None


async def get_weather_cached(lat: float, lon: float, redis_client) -> Optional[Dict]:
    """Cache weather in Redis for 1 hour."""
    import json
    cache_key = f"weather:{lat:.2f}:{lon:.2f}"

    try:
        cached = await redis_client.get(cache_key)
        if cached:
            return json.loads(cached)
    except Exception:
        pass

    weather = await get_weather(lat, lon)
    if weather:
        try:
            await redis_client.setex(cache_key, 3600, json.dumps(weather))
        except Exception:
            pass

    return weather
