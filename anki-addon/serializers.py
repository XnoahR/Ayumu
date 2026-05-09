from __future__ import annotations

import re
from typing import Any

SOUND_RE = re.compile(r"\[sound:([^\]]+)\]")
IMG_RE = re.compile(r"<img[^>]+src=[\"']([^\"']+)[\"']", re.IGNORECASE)
HTML_TAG_RE = re.compile(r"<[^>]+>")


def extract_media_references(html: str) -> dict[str, list[str]]:
    audio = SOUND_RE.findall(html or "")
    images = IMG_RE.findall(html or "")
    return {
        "audio": list(dict.fromkeys(audio)),
        "images": list(dict.fromkeys(images)),
    }


def html_to_text(value: str) -> str:
    no_sound = SOUND_RE.sub("", value or "")
    no_tags = HTML_TAG_RE.sub(" ", no_sound)
    return " ".join(no_tags.split())


def card_state(card: Any) -> dict[str, bool]:
    queue = int(getattr(card, "queue", 0))
    card_type = int(getattr(card, "type", 0))
    is_new = queue == 0 or card_type == 0
    is_learning = queue in (1, 3) or card_type == 1
    is_review = queue == 2 or card_type == 2
    return {
        "is_new": is_new,
        "is_learning": is_learning,
        "is_review": is_review,
        "is_suspended": queue == -1,
    }


def rating_options(button_count: int) -> list[dict[str, Any]]:
    if button_count <= 2:
        labels = ["Ulang", "Baik"]
    elif button_count == 3:
        labels = ["Ulang", "Baik", "Mudah"]
    else:
        labels = ["Ulang", "Sulit", "Baik", "Mudah"]

    return [{"value": index + 1, "label": label} for index, label in enumerate(labels)]
