"""Real word-level captions, aligned offline with faster-whisper (no TTS credits needed).

Transcribes each already-rendered scene wav with word timestamps, aligns those against the
known script words (so the caption text stays the script, not ASR guesses), offsets by the
scene start from scene_timing.json, and renders spelled numbers as digits so amounts read
fast. Overwrites captions.json.

    python video/scripts/align_captions.py video/audio_out
"""
import difflib
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, r"C:\Users\User\.claude\skills\hackathon-video\scripts")
import audio_gen  # noqa: E402
import build_audio  # noqa: E402,F401 — sets audio_gen.SCENES to the v3 narration (no main() on import)

from faster_whisper import WhisperModel  # noqa: E402

NUMWORDS = {"fifty-three": "53", "twelve": "12"}


def norm(w: str) -> str:
    return re.sub(r"[^a-z0-9]", "", w.lower())


def as_digits(word: str) -> str:
    core = word.strip(".,:;!?").lower()
    if core in NUMWORDS:
        return NUMWORDS[core] + word[len(word.rstrip(".,:;!?")):]
    return word


def align_scene(script_words: list[str], asr: list[dict]) -> list[dict]:
    """Map each script word to a (start,end) borrowed from the best-matching ASR word."""
    sk = [norm(w) for w in script_words]
    ak = [norm(a["w"]) for a in asr]
    sm = difflib.SequenceMatcher(a=sk, b=ak, autojunk=False)
    times: list[tuple[float, float] | None] = [None] * len(script_words)
    for tag, i1, i2, j1, j2 in sm.get_opcodes():
        if tag == "equal":
            for k in range(i2 - i1):
                times[i1 + k] = (asr[j1 + k]["start"], asr[j1 + k]["end"])
        elif tag in ("replace", "delete", "insert"):
            # borrow the span from the ASR block if any, else leave for interpolation
            if j2 > j1:
                s, e = asr[j1]["start"], asr[j2 - 1]["end"]
                span = (e - s) / max(1, i2 - i1)
                for k in range(i1, i2):
                    times[k] = (s + span * (k - i1), s + span * (k - i1 + 1))
    # fill any remaining gaps by interpolating between known neighbours
    for k in range(len(times)):
        if times[k] is None:
            prev = next((times[j][1] for j in range(k - 1, -1, -1) if times[j]), None)
            nxt = next((times[j][0] for j in range(k + 1, len(times)) if times[j]), None)
            if prev is None and nxt is None:
                times[k] = (0.0, 0.1)
            elif prev is None:
                times[k] = (max(0.0, nxt - 0.2), nxt)
            elif nxt is None:
                times[k] = (prev, prev + 0.2)
            else:
                times[k] = (prev, nxt)
    return [{"t": t, "e": e} for (t, e) in times]


def main(out: Path) -> None:
    timing = json.loads((out / "scene_timing.json").read_text())
    starts = {s["id"]: s["start"] for s in timing["scenes"]}
    model = WhisperModel("base.en", device="cpu", compute_type="int8")
    caps = []
    for sid, text in audio_gen.SCENES:
        wav = out / "scenes" / f"{sid}.wav"
        segs, _ = model.transcribe(str(wav), word_timestamps=True)
        asr = [{"w": w.word.strip(), "start": w.start, "end": w.end}
               for seg in segs for w in seg.words]
        script_words = text.split()
        rel = align_scene(script_words, asr)
        base = starts[sid]
        for word, r in zip(script_words, rel):
            caps.append({"t": round(base + r["t"], 3), "e": round(base + r["e"], 3),
                         "w": as_digits(word)})
        print(f"  {sid:11s} script={len(script_words):3d}  asr={len(asr):3d}")
    (out / "captions.json").write_text(json.dumps(caps, indent=0))
    print(f"captions.json: {len(caps)} words, whisper-aligned")


if __name__ == "__main__":
    main(Path(sys.argv[1]))
