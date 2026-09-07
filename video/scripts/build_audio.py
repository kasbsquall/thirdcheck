"""Project driver: reuse the measured VO scene wavs and mix them with the Suno track.
Imports the skill's audio_gen (single source of truth for the mix chain) and only
overrides SCENES. No API calls: scene wavs already exist under <out>/scenes and the
music comes from MUSIC_FILE.

    MUSIC_FILE="assets/Perimeter Watch.wav" python video/scripts/build_audio.py video/audio_out
"""
import sys

sys.path.insert(0, r"C:\Users\User\.claude\skills\hackathon-video\scripts")
import audio_gen  # noqa: E402

# v3 narration (docs/19-video-script-v3.md). ids match the scene keys in the Remotion Video.tsx.
# Order and beats reflect the blind-jury edits: mail-room analogy before jargon, cited loss
# figure, Verified Inflows as its own beat, library breathing alone, a built-in-window beat for
# the execution pillar, and the settlement rail moved into the close.
# Tightened to land near 2:00: flowing sentences (fewer stops = fewer pauses) and the
# built-in-window evidence folded into `verify` so the execution pillar keeps its beat
# without a ninth scene. Ronin/Wormhole/Nomad move to the on-screen figure card, not the VO.
audio_gen.SCENES = [
    ("cold_open",
     "This is a real submission in this hackathon whose contract claims it verifies proofs through the "
     "Attestcoin precompile. Watch the reply: unknown selector, so the verification never runs. I "
     "confirmed it on-chain and disclosed it privately."),
    ("problem",
     "Think of the precompile as a mail room: it confirms a letter arrived in the real mail, not that "
     "it is the check you were owed, for the right amount and sender, and not one already cashed. That "
     "is the third check, left entirely to you."),
    ("falsifier",
     "So ThirdCheck forges real proofs of the wrong payment, and every one passes the precompile. Same "
     "proof, two contracts: the naive escrow pays out on real Creditcoin transactions, while the "
     "hardened one rejects each attack by name."),
    ("scorecard",
     "Then I aimed it at the whole hackathon, fifty-three submissions against one catalogue, and the "
     "gaps are not random: few check a proof's chain identity, and fewer pick the right log among "
     "many. The precompile is only as safe as its consumers."),
    ("reveal",
     "So the third check became its own product, aimed at the money coming in. Verified Inflows."),
    ("inflows",
     "This is where cross-chain money leaks: bridge hacks top a billion dollars. So ThirdCheck aims "
     "the third check at money coming in, crediting an inbound deposit only once it is proven on its "
     "own, no bridge trusted. Here is a real one, on testnet."),
    ("library",
     "The fix ships as a drop-in library, twelve binding checks in two calls, installable today for "
     "any Attestcoin consumer, with a cross-chain credit line my own team built running entirely on "
     "it."),
    ("verify",
     "One command reproduces all of it against the public chain, no key, and all of it was built "
     "inside the window from a burner key. To be precise, I did not fire the fake proof at a live "
     "deployment: you saw the precompile reject it, plus the source."),
    ("close",
     "That is the product: apps route orders and deposits through the hub, safe by construction, and a "
     "verified operator pays less. ThirdCheck is the check every Attestcoin integrator runs before "
     "mainnet, and how the ecosystem stays safe."),
]

if __name__ == "__main__":
    audio_gen.main()
