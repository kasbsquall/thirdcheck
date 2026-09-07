"""Re-mix VO + Suno music so the track sustains under the end card and fades with the LAST
frame, instead of 4s before the voice ends (which left the close silent). Reuses the concat
vo.wav and music.mp3 that build_audio.py already produced; only the music fade timing changes.

    python scripts/remix_audio.py video/audio_out <tail_seconds>
Writes final_audio.wav in the out dir and copies it into remotion/public/.
"""
import json, subprocess, sys
from pathlib import Path

LEAD = 1.6
MUSIC_GAIN = 0.042  # the tuned bed level; do not raise without being asked
FADE = 2.6          # music fade-out at the very end


def run(args, what):
    r = subprocess.run(args, capture_output=True, text=True)
    if r.returncode != 0:
        raise SystemExit(f"ffmpeg failed ({what}):\n{r.stderr[-1500:]}")
    return r


def main():
    out = Path(sys.argv[1])
    tail = float(sys.argv[2]) if len(sys.argv) > 2 else 3.0
    vo_end = json.loads((out / "scene_timing.json").read_text())["vo"]
    film_end = vo_end + tail
    fo = film_end - FADE
    lead_ms = int(LEAD * 1000)
    stage = out / "_premaster.wav"

    run(["ffmpeg", "-y", "-i", str(out / "vo.wav"), "-i", str(out / "music.mp3"),
         "-filter_complex",
         # pad the sidechain trigger with silence to the film end, or sidechaincompress ends
         # with the voice and the music (and the whole close) goes silent early.
         f"[0:a]volume=-6dB,adelay={lead_ms}:all=1,asplit=2[vo][scraw];"
         f"[scraw]apad=whole_dur={film_end:.2f}[sc];"
         f"[1:a]volume={MUSIC_GAIN},afade=t=in:st=0:d=0.7,afade=t=out:st={fo:.2f}:d={FADE}[mus];"
         f"[mus][sc]sidechaincompress=threshold=0.05:ratio=3:attack=20:release=450[duck];"
         f"[vo][duck]amix=inputs=2:duration=longest:normalize=0[a]",
         "-map", "[a]", "-t", f"{film_end:.2f}", "-c:a", "pcm_s16le", str(stage)], "mix")

    # two-pass loudnorm, linear
    meas = subprocess.run(["ffmpeg", "-hide_banner", "-i", str(stage), "-af",
                           "loudnorm=I=-18:TP=-3:LRA=11:print_format=json", "-f", "null", "-"],
                          capture_output=True, text=True)
    try:
        blob = meas.stderr[meas.stderr.rindex("{"):meas.stderr.rindex("}") + 1]
        m = json.loads(blob)
        af = ("equalizer=f=3000:t=q:w=1.2:g=-2.5,equalizer=f=7500:t=q:w=1.6:g=-2,"
              f"loudnorm=I=-18:TP=-3:LRA=11:linear=true:measured_I={m['input_i']}:"
              f"measured_TP={m['input_tp']}:measured_LRA={m['input_lra']}:measured_thresh={m['input_thresh']}")
    except (ValueError, KeyError):
        af = "equalizer=f=3000:t=q:w=1.2:g=-2.5,loudnorm=I=-18:TP=-3:LRA=11"

    run(["ffmpeg", "-y", "-i", str(stage), "-af", af, "-c:a", "pcm_s16le", str(out / "final_audio.wav")], "loudnorm")
    stage.unlink(missing_ok=True)

    pub = Path("public/final_audio.wav")
    pub.write_bytes((out / "final_audio.wav").read_bytes())
    d = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(pub)],
                       capture_output=True, text=True).stdout.strip()
    print(f"final_audio.wav {float(d):.2f}s (film_end {film_end:.2f}s, music fades {fo:.2f}->{film_end:.2f})")


if __name__ == "__main__":
    main()
