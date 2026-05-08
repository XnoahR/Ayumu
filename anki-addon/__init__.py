from __future__ import annotations

import json
import secrets
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import Any

import aqt
from aqt import mw
from aqt.qt import QAction
from aqt.utils import qconnect, showInfo

ADDON_VERSION = "0.1.0"
DEFAULT_PORT = 8766
DEFAULT_TTL = 300
DEFAULT_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]


def load_config() -> dict[str, Any]:
    config = mw.addonManager.getConfig(__name__) or {}
    allowed_origins = config.get("allowed_origins")
    if not isinstance(allowed_origins, list):
        allowed_origins = DEFAULT_ALLOWED_ORIGINS

    return {
        "port": int(config.get("port", DEFAULT_PORT)),
        "session_ttl_seconds": int(config.get("session_ttl_seconds", DEFAULT_TTL)),
        "allowed_origins": [str(origin).rstrip("/") for origin in allowed_origins if origin],
    }


def current_timestamp() -> int:
    return int(time.time())


def get_anki_version() -> str:
    app_version = getattr(aqt, "appVersion", None)
    if callable(app_version):
        try:
            value = app_version()
            if value:
                return str(value)
        except Exception:
            pass
    elif app_version:
        return str(app_version)

    pm = getattr(mw, "pm", None)
    meta = getattr(pm, "meta", None)
    if isinstance(meta, dict):
        value = meta.get("last_run_version")
        if value:
            return str(value)

    return "unknown"


def current_profile_name() -> str | None:
    pm = getattr(mw, "pm", None)
    if not pm:
        return None

    for attr_name in ("name", "profileName"):
        value = getattr(pm, attr_name, None)
        if callable(value):
            try:
                result = value()
                if result:
                    return str(result)
            except Exception:
                continue
        elif value:
            return str(value)

    return None


def collection_ready() -> bool:
    return bool(getattr(mw, "col", None))


def count_cards(query: str) -> int:
    col = getattr(mw, "col", None)
    if not col:
        return 0

    try:
        return len(col.find_cards(query))
    except Exception:
        return 0


def node_value(node: Any, *names: str, default: Any = None) -> Any:
    for name in names:
        if isinstance(node, dict) and name in node:
            return node.get(name)
        value = getattr(node, name, None)
        if value is not None:
            return value
    return default


def node_children(node: Any) -> list[Any]:
    children = node_value(node, "children", default=[])
    return list(children or [])


def node_deck_id(node: Any) -> int | None:
    raw = node_value(node, "deck_id", "deckId", "did", "id")
    if raw is None:
        return None
    try:
        return int(raw)
    except Exception:
        return None


def node_name(node: Any) -> str | None:
    raw = node_value(node, "name")
    return str(raw) if raw is not None else None


def scheduler_due_roots() -> list[Any]:
    col = getattr(mw, "col", None)
    if not col:
        raise RuntimeError("No collection is open.")

    sched = getattr(col, "sched", None)
    if not sched:
        raise RuntimeError("Scheduler is unavailable.")

    tree = None
    for method_name in ("deck_due_tree", "deckDueTree"):
        method = getattr(sched, method_name, None)
        if callable(method):
            try:
                tree = method()
                break
            except Exception:
                continue

    if tree is None:
        raise RuntimeError("Deck due tree API is unavailable.")

    if isinstance(tree, list):
        return tree

    children = node_children(tree)
    if children:
        return children

    return [tree]


def subtree_deck_ids(node: Any) -> list[int]:
    deck_ids: list[int] = []
    current_id = node_deck_id(node)
    if current_id is not None:
        deck_ids.append(current_id)

    for child in node_children(node):
        deck_ids.extend(subtree_deck_ids(child))

    deduped: list[int] = []
    seen: set[int] = set()
    for deck_id in deck_ids:
        if deck_id in seen:
            continue
        seen.add(deck_id)
        deduped.append(deck_id)
    return deduped


def count_deck_ids(deck_ids: list[int], extra_query: str = "") -> int:
    total = 0
    suffix = f" {extra_query}" if extra_query else ""
    for deck_id in deck_ids:
        total += count_cards(f"did:{deck_id}{suffix}")
    return total


def normalize_due_count(node: Any, *names: str) -> int:
    value = node_value(node, *names, default=0)
    try:
        return int(value or 0)
    except Exception:
        return 0


def normalize_name_id_rows(
    rows: Any,
    *,
    name_keys: tuple[str, ...] = ("name",),
    id_keys: tuple[str, ...] = ("id", "mid", "deck_id"),
) -> list[dict[str, Any]]:
    normalized: list[dict[str, Any]] = []
    for row in rows or []:
        name = None
        item_id = None

        if isinstance(row, dict):
            for key in name_keys:
                if row.get(key) is not None:
                    name = row.get(key)
                    break
            for key in id_keys:
                if row.get(key) is not None:
                    item_id = row.get(key)
                    break
        elif isinstance(row, (list, tuple)) and len(row) >= 2:
            item_id, name = row[0], row[1]
        else:
            for key in name_keys:
                value = getattr(row, key, None)
                if value is not None:
                    name = value
                    break
            for key in id_keys:
                value = getattr(row, key, None)
                if value is not None:
                    item_id = value
                    break

        if item_id is None or name is None:
            continue

        try:
            normalized.append({"id": int(item_id), "name": str(name)})
        except Exception:
            continue

    return normalized


def list_decks() -> list[dict[str, Any]]:
    col = getattr(mw, "col", None)
    if not col:
        raise RuntimeError("No collection is open.")

    decks: list[dict[str, Any]] = []
    for root in scheduler_due_roots():
        decks.extend(flatten_due_tree(root, depth=0, parent_id=None))

    return decks


def flatten_due_tree(node: Any, *, depth: int, parent_id: int | None) -> list[dict[str, Any]]:
    deck_id = node_deck_id(node)
    name = node_name(node)
    if deck_id is None or not name:
        flattened: list[dict[str, Any]] = []
        for child in node_children(node):
            flattened.extend(flatten_due_tree(child, depth=depth, parent_id=parent_id))
        return flattened

    subtree_ids = subtree_deck_ids(node)
    review_due = normalize_due_count(node, "review_count", "reviewCount", "due_count", "dueCount")

    current_row = {
        "id": deck_id,
        "name": name,
        "depth": depth,
        "parent_id": parent_id,
        "total_cards": count_deck_ids(subtree_ids),
        "new_count": normalize_due_count(node, "new_count", "newCount"),
        "learn_count": normalize_due_count(node, "learn_count", "learnCount"),
        "review_count": review_due,
        "due_count": review_due,
        "suspended_count": count_deck_ids(subtree_ids, "is:suspended"),
    }

    flattened = [current_row]
    for child in node_children(node):
        flattened.extend(flatten_due_tree(child, depth=depth + 1, parent_id=deck_id))
    return flattened


def list_models() -> list[dict[str, Any]]:
    col = getattr(mw, "col", None)
    if not col:
        raise RuntimeError("No collection is open.")

    model_manager = col.models
    rows: list[dict[str, Any]] = []

    for method_name in ("all_names_and_ids", "all"):
        method = getattr(model_manager, method_name, None)
        if callable(method):
            try:
                rows = normalize_name_id_rows(method())
                if rows:
                    break
            except Exception:
                continue

    if not rows:
        names_method = getattr(model_manager, "all_names", None)
        by_name = getattr(model_manager, "by_name", None)
        if callable(names_method) and callable(by_name):
            try:
                rows = []
                for name in names_method():
                    model = by_name(name)
                    item_id = None
                    if isinstance(model, dict):
                        item_id = model.get("id")
                    else:
                        item_id = getattr(model, "id", None)
                    if item_id is not None:
                        rows.append({"id": int(item_id), "name": str(name)})
            except Exception:
                rows = []

    return sorted(rows, key=lambda item: item["name"].lower())


class BridgeState:
    def __init__(self) -> None:
        self.config = load_config()
        self.started_at = current_timestamp()
        self.sessions: dict[str, dict[str, Any]] = {}
        self.lock = threading.Lock()
        self.server: ThreadingHTTPServer | None = None
        self.thread: threading.Thread | None = None
        self.startup_error: str | None = None

    def prune_sessions(self) -> None:
        now = current_timestamp()
        with self.lock:
            expired = [token for token, payload in self.sessions.items() if payload["expires_at"] <= now]
            for token in expired:
                self.sessions.pop(token, None)

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

    def origin_allowed(self, origin: str | None) -> bool:
        if not origin:
            return True
        normalized_origin = origin.rstrip("/")
        return normalized_origin in self.config["allowed_origins"]

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

        if self.path == "/health":
            self.respond_json(200, self.state.health_payload(), origin=origin)
            return

        if self.path == "/decks":
            if not self.require_session(origin):
                return
            if not collection_ready():
                self.respond_json(503, {"message": "No collection is currently open."}, origin=origin)
                return
            self.respond_json(200, {"decks": list_decks()}, origin=origin)
            return

        if self.path == "/models":
            if not self.require_session(origin):
                return
            if not collection_ready():
                self.respond_json(503, {"message": "No collection is currently open."}, origin=origin)
                return
            self.respond_json(200, {"models": list_models()}, origin=origin)
            return

        self.respond_json(404, {"message": "Not found."}, origin=origin)

    def do_POST(self) -> None:
        origin = self.headers.get("Origin")
        if not self.state.origin_allowed(origin):
            self.respond_json(403, {"message": "Origin not allowed."}, origin=origin)
            return

        if self.path == "/session":
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

        self.respond_json(404, {"message": "Not found."}, origin=origin)

    def require_session(self, origin: str | None) -> bool:
        token = self.headers.get("X-Ayumu-Bridge-Session")
        if self.state.validate_session(token, origin):
            return True
        self.respond_json(401, {"message": "Missing or expired bridge session."}, origin=origin)
        return False

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
    profile_name = current_profile_name() or "No collection open"
    showInfo(
        "Ayumu Desktop Bridge is running.\n\n"
        f"URL: http://127.0.0.1:{STATE.config['port']}\n"
        f"Anki version: {get_anki_version()}\n"
        f"Profile: {profile_name}\n\n"
        "Allowed origins:\n"
        f"{allowed_origins}"
    )


def install_menu() -> None:
    action = QAction("Ayumu Bridge Status", mw)
    qconnect(action.triggered, show_bridge_status)
    mw.form.menuTools.addAction(action)


start_bridge_server()
install_menu()
