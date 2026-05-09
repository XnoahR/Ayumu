from __future__ import annotations

import secrets
import threading
from typing import Any

from .anki_runtime import collection_ready, current_profile_name, get_anki_version
from .config import ADDON_VERSION, current_timestamp, load_config


class BridgeState:
    def __init__(self) -> None:
        self.config = load_config()
        self.started_at = current_timestamp()
        self.sessions: dict[str, dict[str, Any]] = {}
        self.review_sessions: dict[str, dict[str, Any]] = {}
        self.lock = threading.Lock()
        self.server = None
        self.thread = None
        self.startup_error: str | None = None

    def prune_sessions(self) -> None:
        now = current_timestamp()
        with self.lock:
            expired = [token for token, payload in self.sessions.items() if payload["expires_at"] <= now]
            for token in expired:
                self.sessions.pop(token, None)
                self.review_sessions.pop(token, None)

    def issue_session(self, origin: str | None) -> dict[str, Any]:
        self.prune_sessions()
        token = secrets.token_urlsafe(24)
        expires_at = current_timestamp() + self.config["session_ttl_seconds"]
        payload = {
            "origin": origin.rstrip("/") if origin else None,
            "expires_at": expires_at,
            "issued_at": current_timestamp(),
        }
        with self.lock:
            self.sessions[token] = payload
            self.review_sessions.pop(token, None)
        return {"token": token, "expires_at": expires_at}

    def validate_session(self, token: str | None, origin: str | None) -> bool:
        if not token:
            return False

        self.prune_sessions()
        normalized_origin = origin.rstrip("/") if origin else None
        with self.lock:
            session = self.sessions.get(token)
            if not session:
                return False
            if session["origin"] and session["origin"] != normalized_origin:
                return False
            return session["expires_at"] > current_timestamp()

    def validate_session_token(self, token: str | None) -> bool:
        if not token:
            return False

        self.prune_sessions()
        with self.lock:
            session = self.sessions.get(token)
            if not session:
                return False
            return session["expires_at"] > current_timestamp()

    def origin_allowed(self, origin: str | None) -> bool:
        if not origin:
            return True
        normalized_origin = origin.rstrip("/")
        return normalized_origin in self.config["allowed_origins"]

    def set_review_state(self, token: str, state: dict[str, Any]) -> None:
        with self.lock:
            self.review_sessions[token] = state

    def get_review_state(self, token: str) -> dict[str, Any] | None:
        with self.lock:
            return self.review_sessions.get(token)

    def health_payload(self) -> dict[str, Any]:
        return {
            "ok": True,
            "bridge": "ayumu-desktop-bridge",
            "addon_version": ADDON_VERSION,
            "anki_version": get_anki_version(),
            "profile_loaded": collection_ready(),
            "profile_name": current_profile_name(),
            "port": self.config["port"],
            "session_required": True,
            "allowed_origins": self.config["allowed_origins"],
            "uptime_seconds": max(0, current_timestamp() - self.started_at),
        }


STATE = BridgeState()
