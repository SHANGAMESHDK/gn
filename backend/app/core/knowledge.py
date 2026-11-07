"""
What the Radhimaa assistant knows.

1. Learned facts (from "/learncl" chats). Stored in Firestore when service-account
   credentials are configured, so they survive redeploys and restarts; otherwise in
   app/data/ai_knowledge.json as before. On first Firestore use, facts already in the
   JSON file are copied over.

   Credentials (either one):
     FIREBASE_SERVICE_ACCOUNT_JSON   the service-account key JSON, pasted as one env value
     GOOGLE_APPLICATION_CREDENTIALS  path to the key file
   Optional: KNOWLEDGE_COLLECTION (default "ai_knowledge").

2. Live campus data, built fresh for every chat: buildings (app/data/campus_info.json,
   written by scripts/export_campus3d.py), events and stalls (same files the API serves).
"""
from __future__ import annotations

import json
import os
import threading
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path

DATA = Path(__file__).resolve().parents[1] / "data"
FACTS_FILE = DATA / "ai_knowledge.json"
CAMPUS_INFO_FILE = DATA / "campus_info.json"
EVENTS_FILE = DATA / "events.json"
STALLS_FILE = DATA / "stalls.json"

IST = timezone(timedelta(hours=5, minutes=30))
CACHE_SECONDS = 60
MAX_FACTS_IN_PROMPT = 300


def _norm(text: str) -> str:
    return " ".join(text.lower().split())


class FactStore:
    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._cache: list[str] | None = None
        self._cache_at = 0.0
        self._db = None
        self._collection = os.environ.get("KNOWLEDGE_COLLECTION", "ai_knowledge")
        self.backend = "file"
        self._init_firestore()

    # ---------- setup ----------
    def _init_firestore(self) -> None:
        raw = os.environ.get("FIREBASE_SERVICE_ACCOUNT_JSON")
        path = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS")
        if not raw and not path:
            print("Knowledge: no Firebase credentials, using", FACTS_FILE.name)
            return
        try:
            import firebase_admin
            from firebase_admin import credentials, firestore

            cred = credentials.Certificate(json.loads(raw)) if raw else credentials.Certificate(path)
            try:
                app = firebase_admin.get_app("knowledge")
            except ValueError:
                app = firebase_admin.initialize_app(cred, name="knowledge")
            self._db = firestore.client(app)
            self.backend = "firestore"
            self._seed_from_file()
            print(f"Knowledge: using Firestore collection '{self._collection}'")
        except Exception as e:  # keep the assistant working even if Firestore is misconfigured
            print("Knowledge: Firestore unavailable, falling back to file:", e)
            self._db = None
            self.backend = "file"

    def _seed_from_file(self) -> None:
        col = self._db.collection(self._collection)
        if any(True for _ in col.limit(1).stream()):
            return
        for text in self._read_file():
            col.add({"text": text, "source": "ai_knowledge.json", "created_at": datetime.now(timezone.utc)})

    # ---------- file backend ----------
    @staticmethod
    def _read_file() -> list[str]:
        if not FACTS_FILE.exists():
            return []
        try:
            data = json.loads(FACTS_FILE.read_text(encoding="utf-8"))
            return [str(x).strip() for x in data if str(x).strip()]
        except Exception:
            return []

    # ---------- API ----------
    def all(self) -> list[str]:
        with self._lock:
            if self._cache is not None and time.time() - self._cache_at < CACHE_SECONDS:
                return self._cache
            facts: list[str]
            if self._db is not None:
                try:
                    docs = self._db.collection(self._collection).order_by("created_at").stream()
                    facts = [d.to_dict().get("text", "") for d in docs]
                    facts = [f for f in facts if f]
                except Exception as e:
                    print("Knowledge: Firestore read failed, using file:", e)
                    facts = self._read_file()
            else:
                facts = self._read_file()
            self._cache, self._cache_at = facts, time.time()
            return facts

    def add(self, text: str, source: str = "chat") -> bool:
        """Save a fact. Returns False if it was empty or already known."""
        text = " ".join(str(text or "").split())
        if not text:
            return False
        if _norm(text) in {_norm(f) for f in self.all()}:
            return False
        with self._lock:
            if self._db is not None:
                self._db.collection(self._collection).add(
                    {"text": text, "source": source, "created_at": datetime.now(timezone.utc)}
                )
            else:
                facts = self._read_file()
                facts.append(text)
                FACTS_FILE.write_text(json.dumps(facts, indent=2, ensure_ascii=False), encoding="utf-8")
            self._cache = None
        return True


fact_store = FactStore()


# ---------- live campus data ----------
def _load(path: Path) -> list:
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
        return data if isinstance(data, list) else []
    except Exception:
        return []


def _minutes(hhmm: str) -> int | None:
    try:
        h, m = hhmm.split(":")[:2]
        return int(h) * 60 + int(m)
    except Exception:
        return None


def campus_context(now: datetime | None = None) -> str:
    now = now or datetime.now(IST)
    lines = [f"Current time on campus: {now.strftime('%A %d %b %Y, %I:%M %p')} (IST)."]

    buildings = _load(CAMPUS_INFO_FILE)
    if buildings:
        lines.append("\nBuildings on campus:")
        for b in buildings:
            bits = [b["name"]]
            if b.get("also_called"):
                bits.append(f"(also called {b['also_called']})")
            if b.get("floors"):
                bits.append(f"- {b['floors']} floors{' (estimated)' if b.get('floors_estimated') else ''}")
            if b.get("description"):
                bits.append(f"- {b['description']}")
            lines.append("- " + " ".join(bits))

    events = _load(EVENTS_FILE)
    if events:
        lines.append("\nEvents:")
        for e in events[:40]:
            live = " [LIVE NOW]" if e.get("is_live") else ""
            lines.append(f"- {e.get('title')}{live}: {e.get('time', '')} at {e.get('building_id', '')}, by {e.get('organizer', '')}. {e.get('description', '')}".strip())

    stalls = [s for s in _load(STALLS_FILE) if s.get("status", "active") == "active"]
    if stalls:
        cur = now.hour * 60 + now.minute
        lines.append("\nStalls:")
        for s in stalls[:60]:
            o, c = _minutes(s.get("opening_time", "")), _minutes(s.get("closing_time", ""))
            state = ""
            if o is not None and c is not None:
                state = " (open now)" if o <= cur <= c else " (closed now)"
                state = f", {s['opening_time']}-{s['closing_time']}{state}"
            where = s.get("building", "")
            floor = f", floor {s['floor']}" if s.get("floor") not in (None, "") else ""
            lines.append(f"- {s.get('name')} ({s.get('category', '')}) at {where}{floor}{state}. {s.get('description', '')}".strip())

    return "\n".join(lines)


def knowledge_prompt() -> str:
    """Everything the assistant should know, for the system instruction."""
    facts = fact_store.all()[-MAX_FACTS_IN_PROMPT:]
    parts = ["CAMPUS DATA (authoritative, from the EECNAV database):", campus_context()]
    if facts:
        parts.append("\nFACTS LEARNED FROM USERS (may be informal; prefer campus data if they conflict):\n- " + "\n- ".join(facts))
    parts.append("\nIf the answer is not in this data, say you are not sure instead of guessing. "
                 "For directions, tell the user to tap the building in the map or 3D view and press Directions.")
    return "\n".join(parts) + "\n"
