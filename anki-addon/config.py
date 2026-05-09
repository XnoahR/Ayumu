from __future__ import annotations

from typing import Any

from aqt import mw

ADDON_VERSION = "0.2.1"
DEFAULT_PORT = 8766
DEFAULT_TTL = 300
MAIN_THREAD_TIMEOUT_SECONDS = 10
DEFAULT_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]


def load_config() -> dict[str, Any]:
    config = mw.addonManager.getConfig(__name__.rsplit(".", 1)[0]) or {}
    allowed_origins = config.get("allowed_origins")
    if not isinstance(allowed_origins, list):
        allowed_origins = DEFAULT_ALLOWED_ORIGINS

    return {
        "port": int(config.get("port", DEFAULT_PORT)),
        "session_ttl_seconds": int(config.get("session_ttl_seconds", DEFAULT_TTL)),
        "allowed_origins": [str(origin).rstrip("/") for origin in allowed_origins if origin],
    }


def current_timestamp() -> int:
    import time

    return int(time.time())
