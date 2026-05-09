from __future__ import annotations

import json
import mimetypes
from pathlib import Path
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import Any
from urllib.parse import parse_qs, unquote, urlparse

from aqt import mw
from aqt.qt import QAction
from aqt.utils import qconnect, showInfo

from .anki_runtime import (
    begin_review,
    collection_ready,
    get_model_fields,
    load_card_by_id,
    list_decks,
    list_models,
    media_directory,
    render_document,
    submit_review,
    run_on_main_thread,
)
from .config import ADDON_VERSION, current_timestamp
from .review_state import STATE, BridgeState


class AyumuBridgeHandler(BaseHTTPRequestHandler):
    server_version = f"AyumuBridge/{ADDON_VERSION}"

    @property
    def state(self) -> BridgeState:
        return STATE

    def do_OPTIONS(self) -> None:
        origin = self.headers.get("Origin")
        if not self.state.origin_allowed(origin):
            self.respond_json(403, {"message": "Origin not allowed."}, origin=origin)
            return
        self.send_response(204)
        self.send_cors_headers(origin)
        self.end_headers()

    def do_GET(self) -> None:
        origin = self.headers.get("Origin")
        if not self.state.origin_allowed(origin):
            self.respond_json(403, {"message": "Origin not allowed."}, origin=origin)
            return

        parsed = urlparse(self.path)
        route = parsed.path

        if route == "/health":
            self.respond_json(200, self.state.health_payload(), origin=origin)
            return

        if route == "/review/render":
            if not collection_ready():
                self.respond_html(503, "<h1>No collection is currently open.</h1>", origin=origin)
                return

            query = parse_qs(parsed.query or "")
            token = (query.get("session") or [None])[0]
            side = (query.get("side") or ["front"])[0]
            autoplay = (query.get("autoplay") or ["0"])[0] == "1"

            if not self.state.validate_session_token(token):
                self.respond_html(401, "<h1>Missing or expired bridge session.</h1>", origin=origin)
                return

            review_state = self.state.get_review_state(token)
            if not review_state or not review_state.get("current_card_id"):
                self.respond_html(409, "<h1>No active review card for this browser session.</h1>", origin=origin)
                return

            try:
                current_card_id = int(review_state["current_card_id"])
                document = run_on_main_thread(
                    lambda: render_document(
                        load_card_by_id(current_card_id),
                        "back" if side == "back" else "front",
                        f"http://127.0.0.1:{self.state.config['port']}",
                        autoplay=autoplay,
                    )
                )
                self.respond_html(200, document, origin=origin)
            except Exception as err:
                self.respond_html(500, f"<h1>{str(err)}</h1>", origin=origin)
            return

        if route.startswith("/media/"):
            if not collection_ready():
                self.respond_json(503, {"message": "No collection is currently open."}, origin=origin)
                return
            try:
                self.respond_media(route, origin=origin)
            except FileNotFoundError:
                self.respond_json(404, {"message": "Media file not found."}, origin=origin)
            except Exception as err:
                self.respond_json(500, {"message": str(err)}, origin=origin)
            return

        if route == "/decks":
            if not self.require_session(origin):
                return
            if not collection_ready():
                self.respond_json(503, {"message": "No collection is currently open."}, origin=origin)
                return
            payload = run_on_main_thread(lambda: {"decks": list_decks()})
            self.respond_json(200, payload, origin=origin)
            return

        if route == "/models":
            if not self.require_session(origin):
                return
            if not collection_ready():
                self.respond_json(503, {"message": "No collection is currently open."}, origin=origin)
                return
            payload = run_on_main_thread(lambda: {"models": list_models()})
            self.respond_json(200, payload, origin=origin)
            return

        if route.startswith("/models/") and route.endswith("/fields"):
            if not self.require_session(origin):
                return
            if not collection_ready():
                self.respond_json(503, {"message": "No collection is currently open."}, origin=origin)
                return
            model_id = self.extract_route_id(route, "models", "fields")
            if model_id is None:
                self.respond_json(400, {"message": "Invalid model id."}, origin=origin)
                return
            fields = run_on_main_thread(lambda: get_model_fields(model_id))
            self.respond_json(200, {"model_id": model_id, "fields": fields}, origin=origin)
            return

        if route.startswith("/decks/") and route.endswith("/cards"):
            token = self.require_session(origin)
            if not token:
                return
            if not collection_ready():
                self.respond_json(503, {"message": "No collection is currently open."}, origin=origin)
                return
            deck_id = self.extract_route_id(route, "decks", "cards")
            if deck_id is None:
                self.respond_json(400, {"message": "Invalid deck id."}, origin=origin)
                return
            try:
                review = begin_review(deck_id)
                self.state.set_review_state(
                    token,
                    {
                        "deck_id": deck_id,
                        "current_card_id": review["card"]["card_id"] if review.get("card") else None,
                        "answered_count": 0,
                        "started_at": current_timestamp(),
                    },
                )
                self.respond_json(
                    200,
                    {
                        "deck_id": deck_id,
                        "cards": [review["card"]] if review.get("card") else [],
                        "active_card": review.get("card"),
                        "session_summary": {
                            **review["summary"],
                            "answered_count": 0,
                            "started_at": current_timestamp(),
                        },
                    },
                    origin=origin,
                )
            except Exception as err:
                self.respond_json(500, {"message": str(err)}, origin=origin)
            return

        if collection_ready():
            try:
                self.respond_media(route, origin=origin, allow_root=True)
                return
            except FileNotFoundError:
                pass
            except Exception as err:
                self.respond_json(500, {"message": str(err)}, origin=origin)
                return

        self.respond_json(404, {"message": "Not found."}, origin=origin)

    def do_POST(self) -> None:
        origin = self.headers.get("Origin")
        if not self.state.origin_allowed(origin):
            self.respond_json(403, {"message": "Origin not allowed."}, origin=origin)
            return

        parsed = urlparse(self.path)
        route = parsed.path

        if route == "/session":
            session = self.state.issue_session(origin)
            self.respond_json(
                201,
                {
                    "session": session["token"],
                    "expires_at": session["expires_at"],
                    "health": self.state.health_payload(),
                },
                origin=origin,
            )
            return

        if route == "/review":
            token = self.require_session(origin)
            if not token:
                return
            if not collection_ready():
                self.respond_json(503, {"message": "No collection is currently open."}, origin=origin)
                return

            try:
                payload = self.parse_json_body()
            except ValueError as err:
                self.respond_json(400, {"message": str(err)}, origin=origin)
                return

            review_state = self.state.get_review_state(token)
            if not review_state:
                self.respond_json(409, {"message": "No active review session for this browser session."}, origin=origin)
                return

            card_id = payload.get("card_id")
            rating = payload.get("rating")
            if card_id is None or rating is None:
                self.respond_json(400, {"message": "card_id and rating are required."}, origin=origin)
                return

            try:
                deck_id = int(review_state["deck_id"])
                result = submit_review(deck_id, int(card_id), int(rating))
                next_card = result.get("card")
                answered_count = int(review_state.get("answered_count", 0)) + 1
                self.state.set_review_state(
                    token,
                    {
                        **review_state,
                        "current_card_id": next_card["card_id"] if next_card else None,
                        "answered_count": answered_count,
                    },
                )
                self.respond_json(
                    200,
                    {
                        "deck_id": deck_id,
                        "next_card": next_card,
                        "session_summary": {
                            **result["summary"],
                            "answered_count": answered_count,
                            "started_at": review_state.get("started_at"),
                        },
                    },
                    origin=origin,
                )
            except Exception as err:
                self.respond_json(500, {"message": str(err)}, origin=origin)
            return

        self.respond_json(404, {"message": "Not found."}, origin=origin)

    def extract_route_id(self, path: str, prefix: str, suffix: str) -> int | None:
        parts = [part for part in path.split("/") if part]
        if len(parts) != 3 or parts[0] != prefix or parts[2] != suffix:
            return None
        try:
            return int(parts[1])
        except Exception:
            return None

    def parse_json_body(self) -> dict[str, Any]:
        length = int(self.headers.get("Content-Length") or 0)
        raw = self.rfile.read(length) if length else b"{}"
        try:
            payload = json.loads(raw.decode("utf-8") or "{}")
        except Exception as err:
            raise ValueError("Invalid JSON body.") from err
        if not isinstance(payload, dict):
            raise ValueError("JSON body must be an object.")
        return payload

    def require_session(self, origin: str | None) -> str | None:
        token = self.headers.get("X-Ayumu-Bridge-Session")
        if self.state.validate_session(token, origin):
            return token
        self.respond_json(401, {"message": "Missing or expired bridge session."}, origin=origin)
        return None

    def respond_media(self, route: str, *, origin: str | None, allow_root: bool = False) -> None:
        media_root = Path(media_directory()).resolve()
        if route.startswith("/media/"):
            relative_path = unquote(route.removeprefix("/media/")).lstrip("/\\")
        elif allow_root:
            relative_path = unquote(route).lstrip("/\\")
        else:
            raise FileNotFoundError(route)
        candidate = (media_root / relative_path).resolve()

        if media_root not in candidate.parents and candidate != media_root:
            raise RuntimeError("Invalid media path.")
        if not candidate.exists() or not candidate.is_file():
            raise FileNotFoundError(relative_path)

        body = candidate.read_bytes()
        content_type, _ = mimetypes.guess_type(candidate.name)
        self.send_response(200)
        self.send_cors_headers(origin)
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Type", content_type or "application/octet-stream")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def respond_html(self, status: int, document: str, *, origin: str | None) -> None:
        body = document.encode("utf-8")
        self.send_response(status)
        self.send_cors_headers(origin)
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def respond_json(self, status: int, payload: dict[str, Any], *, origin: str | None) -> None:
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_cors_headers(origin)
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def send_cors_headers(self, origin: str | None) -> None:
        if origin:
            self.send_header("Access-Control-Allow-Origin", origin.rstrip("/"))
            self.send_header("Vary", "Origin")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, X-Ayumu-Bridge-Session")

    def log_message(self, format: str, *args: Any) -> None:
        return


def start_bridge_server() -> None:
    try:
        server = ThreadingHTTPServer(("127.0.0.1", STATE.config["port"]), AyumuBridgeHandler)
        STATE.server = server
        STATE.thread = threading.Thread(target=server.serve_forever, daemon=True)
        STATE.thread.start()
    except OSError as err:
        STATE.startup_error = str(err)


def show_bridge_status() -> None:
    if STATE.startup_error:
        showInfo(
            "Ayumu Desktop Bridge could not start.\n\n"
            f"Reason: {STATE.startup_error}\n\n"
            "Check whether another tool is already using this port, then restart Anki."
        )
        return

    allowed_origins = "\n".join(f"- {origin}" for origin in STATE.config["allowed_origins"])
    profile_name = STATE.health_payload().get("profile_name") or "No collection open"
    showInfo(
        "Ayumu Desktop Bridge is running.\n\n"
        f"URL: http://127.0.0.1:{STATE.config['port']}\n"
        f"Anki version: {STATE.health_payload().get('anki_version')}\n"
        f"Profile: {profile_name}\n\n"
        "Allowed origins:\n"
        f"{allowed_origins}"
    )


def install_menu() -> None:
    action = QAction("Ayumu Bridge Status", mw)
    qconnect(action.triggered, show_bridge_status)
    mw.form.menuTools.addAction(action)
