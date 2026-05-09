from __future__ import annotations

import html
import os
import re
import threading
from typing import Any
from urllib.parse import quote

import aqt
from aqt import mw

from .config import MAIN_THREAD_TIMEOUT_SECONDS
from .serializers import SOUND_RE, card_state, extract_media_references, html_to_text, rating_options

ANKI_PLAY_RE = re.compile(r"\[anki:play:([aq]):(\d+)\]")


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


def require_collection() -> Any:
    col = getattr(mw, "col", None)
    if not col:
        raise RuntimeError("No collection is currently open.")
    return col


def media_directory() -> str:
    col = require_collection()
    media = getattr(col, "media", None)
    if not media:
        raise RuntimeError("Media manager is unavailable.")

    for attr_name in ("dir",):
        value = getattr(media, attr_name, None)
        if callable(value):
            try:
                result = value()
                if result:
                    return str(result)
            except Exception:
                continue
        elif value:
            return str(value)

    raise RuntimeError("Media directory is unavailable.")


def run_on_main_thread(callback: Any) -> Any:
    taskman = getattr(mw, "taskman", None)
    if taskman is None:
        return callback()

    result: dict[str, Any] = {}
    done = threading.Event()

    def runner() -> None:
        try:
            result["value"] = callback()
        except Exception as err:
            result["error"] = err
        finally:
            done.set()

    taskman.run_on_main(runner)
    if not done.wait(MAIN_THREAD_TIMEOUT_SECONDS):
        raise RuntimeError("Timed out while waiting for Anki main thread.")

    if "error" in result:
        raise result["error"]
    return result.get("value")


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
    col = require_collection()
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


def list_decks() -> list[dict[str, Any]]:
    require_collection()
    decks: list[dict[str, Any]] = []
    for root in scheduler_due_roots():
        decks.extend(flatten_due_tree(root, depth=0, parent_id=None))
    return decks


def get_deck_summary(deck_id: int) -> dict[str, Any]:
    for deck in list_decks():
        if int(deck["id"]) == int(deck_id):
            return deck
    raise RuntimeError("Deck not found in current collection.")


def list_models() -> list[dict[str, Any]]:
    col = require_collection()
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
                    item_id = model.get("id") if isinstance(model, dict) else getattr(model, "id", None)
                    if item_id is not None:
                        rows.append({"id": int(item_id), "name": str(name)})
            except Exception:
                rows = []

    return sorted(rows, key=lambda item: item["name"].lower())


def get_model(model_id: int) -> Any:
    col = require_collection()
    model_manager = col.models

    for method_name in ("get", "by_id"):
        method = getattr(model_manager, method_name, None)
        if callable(method):
            try:
                model = method(model_id)
                if model:
                    return model
            except Exception:
                continue

    for model in getattr(model_manager, "all", lambda: [])():
        current_id = model.get("id") if isinstance(model, dict) else getattr(model, "id", None)
        if current_id is not None and int(current_id) == int(model_id):
            return model

    raise RuntimeError("Model not found.")


def get_model_fields(model_id: int) -> list[dict[str, Any]]:
    model = get_model(model_id)
    fields = model.get("flds", []) if isinstance(model, dict) else getattr(model, "flds", [])

    normalized = []
    for index, field in enumerate(fields or []):
        name = field.get("name") if isinstance(field, dict) else getattr(field, "name", None)
        if name:
            normalized.append({"name": str(name), "order": index})

    return normalized


def answer_button_count(card: Any) -> int:
    sched = getattr(require_collection(), "sched", None)
    if not sched:
        return 4

    for method_name in ("answerButtons", "answer_buttons"):
        method = getattr(sched, method_name, None)
        if callable(method):
            try:
                return int(method(card))
            except Exception:
                continue

    return 4


def rendered_card_html(card: Any) -> dict[str, str]:
    front_html = ""
    back_html = ""

    for method_name in ("question", "q"):
        method = getattr(card, method_name, None)
        if callable(method):
            try:
                front_html = str(method() or "")
                if front_html:
                    break
            except Exception:
                continue

    for method_name in ("answer", "a"):
        method = getattr(card, method_name, None)
        if callable(method):
            try:
                back_html = str(method() or "")
                if back_html:
                    break
            except Exception:
                continue

    return {
        "front_html": front_html,
        "back_html": back_html,
    }


def audio_markup(filename: str, media_base_url: str, *, label: str | None = None, button_text: str | None = None) -> str:
    src = f"{media_base_url.rstrip('/')}/media/{quote(filename)}"
    safe_label = html.escape(label or filename, quote=True)
    button_markup = ""
    if button_text:
        safe_button = html.escape(button_text, quote=True)
        button_markup = (
            f'<button type="button" class="ayumu-audio-button" data-audio-src="{src}">{safe_button}</button>'
        )

    return (
        '<span class="ayumu-audio-chip">'
        f"{button_markup}"
        f'<audio controls preload="none" src="{src}"></audio>'
        f'<span class="ayumu-audio-label">{safe_label}</span>'
        "</span>"
    )


def extract_filename_from_av_tag(tag: Any) -> str | None:
    for attr_name in ("filename", "fname", "sound", "path", "name"):
        value = getattr(tag, attr_name, None)
        if value:
            return os.path.basename(str(value))

    if isinstance(tag, dict):
        for key in ("filename", "fname", "sound", "path", "name"):
            value = tag.get(key)
            if value:
                return os.path.basename(str(value))

    tag_text = str(tag or "")
    sound_match = SOUND_RE.search(tag_text)
    if sound_match:
        return sound_match.group(1)
    return None


def collect_side_audio_refs(card: Any, side: str) -> list[str]:
    method_names = (
        ("question_av_tags", "questionAvTags", "q_av_tags") if side == "front"
        else ("answer_av_tags", "answerAvTags", "a_av_tags")
    )

    for method_name in method_names:
        method = getattr(card, method_name, None)
        if callable(method):
            try:
                filenames = [
                    filename
                    for filename in (extract_filename_from_av_tag(tag) for tag in (method() or []))
                    if filename
                ]
                if filenames:
                    return filenames
            except Exception:
                continue

    note = card.note()
    field_values: list[str] = []
    if hasattr(note, "values"):
        try:
            field_values = [str(value or "") for value in note.values()]
        except Exception:
            field_values = []

    if not field_values:
        model = note.note_type() if hasattr(note, "note_type") else None
        fields = model.get("flds", []) if isinstance(model, dict) else getattr(model, "flds", [])
        for field in fields or []:
            field_name = field.get("name") if isinstance(field, dict) else getattr(field, "name", None)
            if not field_name:
                continue
            try:
                field_values.append(str(note[field_name] or ""))
            except Exception:
                continue

    collected: list[str] = []
    for value in field_values:
        collected.extend(extract_media_references(value).get("audio", []))
    return list(dict.fromkeys(collected))


def replace_sound_tags(value: str, media_base_url: str) -> str:
    def _replacement(match: Any) -> str:
        filename = match.group(1)
        return audio_markup(filename, media_base_url)

    return SOUND_RE.sub(_replacement, value or "")


def replace_anki_play_tokens(value: str, side_audio_refs: list[str], media_base_url: str) -> str:
    def _replacement(match: Any) -> str:
        side_marker = match.group(1)
        index = int(match.group(2))
        if index < 0 or index >= len(side_audio_refs):
            return html.escape(match.group(0))
        filename = side_audio_refs[index]
        return audio_markup(
            filename,
            media_base_url,
            label=filename,
            button_text=f"Putar audio {side_marker.upper()}{index + 1}",
        )

    return ANKI_PLAY_RE.sub(_replacement, value or "")


def normalize_rendered_html(card: Any, side: str, media_base_url: str, body_html: str) -> str:
    side_audio_refs = collect_side_audio_refs(card, side)
    body_html = replace_sound_tags(body_html, media_base_url)
    body_html = replace_anki_play_tokens(body_html, side_audio_refs, media_base_url)
    return body_html


def ensure_card_timer(card: Any) -> None:
    for attr_name in ("timer_started", "timerStarted", "started"):
        if hasattr(card, attr_name) and getattr(card, attr_name, None) is not None:
            return

    for method_name in ("start_timer", "startTimer", "start_timer_if_needed"):
        method = getattr(card, method_name, None)
        if callable(method):
            try:
                method()
                return
            except Exception:
                continue


def render_document(card: Any, side: str, media_base_url: str, *, autoplay: bool = False) -> str:
    rendered = rendered_card_html(card)
    model = card.note().note_type() if hasattr(card.note(), "note_type") else None
    template_css = ""
    if isinstance(model, dict):
        template_css = str(model.get("css") or "")
    elif model is not None:
        template_css = str(getattr(model, "css", "") or "")

    body_html = rendered["back_html"] if side == "back" else rendered["front_html"]
    body_html = normalize_rendered_html(card, side, media_base_url, body_html)
    base_href = f"{media_base_url.rstrip('/')}/"

    return f"""<!doctype html>
<html lang="ja">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <base href="{html.escape(base_href, quote=True)}">
    <style>
      :root {{
        color-scheme: dark;
      }}

      html, body {{
        margin: 0;
        min-height: 100%;
        background: #141921;
      }}

      body {{
        color: #eef2ff;
        font-family: Inter, "Segoe UI", Arial, sans-serif;
      }}

      .card {{
        min-height: 100vh;
        box-sizing: border-box;
        padding: 24px 20px 28px;
        background: #141921;
        color: #eef2ff;
      }}

      #qa {{
        min-height: calc(100vh - 52px);
      }}

      .ayumu-audio-chip {{
        display: inline-flex;
        flex-direction: column;
        gap: 6px;
        max-width: 100%;
        margin: 10px 0;
      }}

      .ayumu-audio-button {{
        align-self: start;
        border: 1px solid #354052;
        border-radius: 999px;
        background: #16142f;
        color: #eef2ff;
        cursor: pointer;
        font: inherit;
        font-size: 12px;
        font-weight: 700;
        padding: 8px 12px;
      }}

      .ayumu-audio-chip audio {{
        max-width: 100%;
      }}

      .ayumu-audio-label {{
        color: #aab4c8;
        font-size: 12px;
        word-break: break-all;
      }}
    </style>
    <style>{template_css}</style>
    <script>
      (() => {{
        const noop = () => {{}};
        window.ga = window.ga || noop;
        window.gtag = window.gtag || noop;
        window.analytics = window.analytics || {{ track: noop, page: noop, identify: noop }};
        globalThis.ga = globalThis.ga || window.ga;
        globalThis.gtag = globalThis.gtag || window.gtag;
        window.qa = document.getElementById("qa");
        globalThis.qa = globalThis.qa || window.qa;

        const playAudioSequence = (audioList) => {{
          const queue = [...audioList].filter((audio) => audio && typeof audio.play === "function");
          if (!queue.length) return;

          let index = 0;
          const playNext = () => {{
            if (index >= queue.length) return;
            const audio = queue[index++];
            const cleanup = () => {{
              audio.removeEventListener("ended", handleEnded);
              audio.removeEventListener("error", handleEnded);
            }};
            const handleEnded = () => {{
              cleanup();
              playNext();
            }};

            audio.currentTime = 0;
            audio.addEventListener("ended", handleEnded, {{ once: true }});
            audio.addEventListener("error", handleEnded, {{ once: true }});
            audio.play().catch(() => {{
              cleanup();
              playNext();
            }});
          }};

          playNext();
        }};
        window.playAudioSequence = playAudioSequence;
        globalThis.playAudioSequence = playAudioSequence;

        const replayAudio = (selector) => {{
          playAudioSequence(document.querySelectorAll(selector));
        }};

        window.pycmd = (command) => {{
          if (!command || typeof command !== "string") return;
          if (command.startsWith("anki:play:")) {{
            const match = command.match(/^anki:play:[aq]:(\d+)$/);
            if (match) {{
              const index = Number(match[1]);
              const audios = [...document.querySelectorAll("audio")];
              const target = audios[index] || audios[0];
              if (target && typeof target.play === "function") {{
                target.play().catch(() => {{}});
              }}
            }}
            return;
          }}
          if (command.startsWith("play:")) {{
            replayAudio("audio");
            return;
          }}
          if (command === "ans") {{
            return;
          }}
        }};
      }})();
    </script>
  </head>
  <body class="card card{int(getattr(card, "ord", 0)) + 1}">
    <div id="qa">
      {body_html}
    </div>
    <script>
      (() => {{
        window.qa = document.getElementById("qa");
        globalThis.qa = globalThis.qa || window.qa;
        const playAudioSequence = window.playAudioSequence || globalThis.playAudioSequence;
        document.querySelectorAll(".ayumu-audio-button").forEach((button) => {{
          button.addEventListener("click", () => {{
            const wrapper = button.closest(".ayumu-audio-chip");
            const audio = wrapper ? wrapper.querySelector("audio") : null;
            if (audio && typeof audio.play === "function") {{
              audio.play().catch(() => {{}});
            }}
          }});
        }});
        if ({str(autoplay).lower()} && typeof playAudioSequence === "function") {{
          playAudioSequence(document.querySelectorAll("audio"));
        }}
      }})();
    </script>
  </body>
</html>"""


def serialize_card(card: Any) -> dict[str, Any]:
    note = card.note()
    model = note.note_type() if hasattr(note, "note_type") else get_model(int(getattr(note, "mid", 0)))
    model_id = int(model.get("id")) if isinstance(model, dict) else int(getattr(model, "id"))
    model_name = str(model.get("name")) if isinstance(model, dict) else str(getattr(model, "name"))
    field_defs = get_model_fields(model_id)
    rendered = rendered_card_html(card)
    css = str(model.get("css") or "") if isinstance(model, dict) else str(getattr(model, "css", "") or "")

    fields: dict[str, Any] = {}
    audio_refs: list[str] = []
    image_refs: list[str] = []

    for field in field_defs:
        field_name = field["name"]
        raw_value = note[field_name] if hasattr(note, "__getitem__") else ""
        html_value = str(raw_value or "")
        media = extract_media_references(html_value)
        audio_refs.extend(media["audio"])
        image_refs.extend(media["images"])
        fields[field_name] = {
            "name": field_name,
            "order": field["order"],
            "html": html_value,
            "text": html_to_text(html_value),
            "audio": media["audio"],
            "images": media["images"],
        }

    return {
        "card_id": int(card.id),
        "note_id": int(card.nid),
        "deck_id": int(card.did),
        "model_id": model_id,
        "model_name": model_name,
        "fields": fields,
        "tags": list(getattr(note, "tags", []) or []),
        "audio": list(dict.fromkeys(audio_refs)),
        "images": list(dict.fromkeys(image_refs)),
        "state": card_state(card),
        "available_ratings": rating_options(answer_button_count(card)),
        "rendered": rendered,
        "template_css": css,
    }


def select_deck(deck_id: int) -> None:
    col = require_collection()
    deck_manager = getattr(col, "decks", None)
    if not deck_manager:
        raise RuntimeError("Deck manager is unavailable.")

    method = getattr(deck_manager, "select", None)
    if not callable(method):
        raise RuntimeError("Deck selection API is unavailable.")

    method(deck_id)


def reset_scheduler() -> None:
    sched = getattr(require_collection(), "sched", None)
    if not sched:
        raise RuntimeError("Scheduler is unavailable.")

    method = getattr(sched, "reset", None)
    if callable(method):
        method()


def scheduler_get_card() -> Any | None:
    sched = getattr(require_collection(), "sched", None)
    if not sched:
        raise RuntimeError("Scheduler is unavailable.")

    for method_name in ("getCard", "get_card"):
        method = getattr(sched, method_name, None)
        if callable(method):
            return method()

    raise RuntimeError("Scheduler getCard API is unavailable.")


def scheduler_answer_card(card: Any, rating: int) -> None:
    sched = getattr(require_collection(), "sched", None)
    if not sched:
        raise RuntimeError("Scheduler is unavailable.")

    for method_name in ("answerCard", "answer_card"):
        method = getattr(sched, method_name, None)
        if callable(method):
            method(card, rating)
            return

    raise RuntimeError("Scheduler answerCard API is unavailable.")


def load_card_by_id(card_id: int) -> Any:
    col = require_collection()
    for method_name in ("get_card", "getCard"):
        method = getattr(col, method_name, None)
        if callable(method):
            card = method(card_id)
            if card:
                return card
    raise RuntimeError("Card not found in collection.")


def begin_review(deck_id: int) -> dict[str, Any]:
    def _run() -> dict[str, Any]:
        select_deck(deck_id)
        reset_scheduler()
        card = scheduler_get_card()
        if card:
            ensure_card_timer(card)
        summary = get_deck_summary(deck_id)
        return {
            "deck_id": deck_id,
            "summary": summary,
            "card": serialize_card(card) if card else None,
        }

    return run_on_main_thread(_run)


def submit_review(deck_id: int, card_id: int, rating: int) -> dict[str, Any]:
    def _run() -> dict[str, Any]:
        select_deck(deck_id)
        card = load_card_by_id(card_id)
        ensure_card_timer(card)
        available_count = max(1, len(rating_options(answer_button_count(card))))
        safe_rating = max(1, min(int(rating), available_count))
        try:
            scheduler_answer_card(card, safe_rating)
        except TypeError as err:
            if "NoneType" not in str(err):
                raise
            active_scheduler_card = scheduler_get_card()
            if not active_scheduler_card or int(getattr(active_scheduler_card, "id", 0)) != int(card_id):
                raise
            ensure_card_timer(active_scheduler_card)
            scheduler_answer_card(active_scheduler_card, safe_rating)
        next_card = scheduler_get_card()
        if next_card:
            ensure_card_timer(next_card)
        summary = get_deck_summary(deck_id)
        return {
            "deck_id": deck_id,
            "summary": summary,
            "card": serialize_card(next_card) if next_card else None,
        }

    return run_on_main_thread(_run)
