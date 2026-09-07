"""Project driver: reuse the measured VO scene wavs and mix them with the Suno track.
Imports the skill's audio_gen (single source of truth for the mix chain) and only
overrides SCENES. No API calls: scene wavs already exist under <out>/scenes and the
music comes from MUSIC_FILE.

    MUSIC_FILE="assets/Perimeter Watch.wav" python video/scripts/build_audio.py video/audio_out
"""
import sys

sys.path.insert(0, r"C:\Users\User\.claude\skills\hackathon-video\scripts")
import audio_gen  # noqa: E402

# Final v4 narration. ids match the scene keys used in the Remotion Video.tsx.
audio_gen.SCENES = [
    ("cold_open",
     "This is a real proof on Creditcoin. A seller shipped, the proof checked out, and it released "
     "a payment that never happened."),
    ("problem",
     "Creditcoin's precompile proves a transaction was included in a block. It does not prove the "
     "transaction succeeded, came from the contract you expect, or that you have not already counted "
     "it. Everything past inclusion is the third check, and it is left to every developer to get right."),
    ("scorecard",
     "We rebuilt the integration patterns a consumer reaches for. The common ones release "
     "money against a proof of the wrong thing. We name no one, we show the pattern. "
     "The proof is real. The payment is wrong."),
    ("falsifier",
     "So we built the falsifier. Against a naive escrow, valid proofs release payments that never "
     "happened. Against the hardened one, every one of those attacks is rejected, and only the correct "
     "payment settles. Every transaction is mined on Creditcoin. You can open them yourself."),
    ("library",
     "The catalogue is twelve checks each team reimplements and gets wrong. We collapse it to two calls, "
     "in a library any consumer can drop in."),
    ("rails",
     "Then we turned it into rails. Projects route a cross-chain payment through one neutral hub they "
     "could not run alone. The third check runs by construction, a small capped fee is taken. "
     "Operators that pass it pay less."),
    ("settlement",
     "Here is one order, settled end to end. Paid on Sepolia, proven to Creditcoin, released to a seller "
     "by a separate operator, the fee captured by the protocol. Three distinct addresses. All mined on "
     "testnet."),
    ("verify",
     "You do not have to trust any of this. Feed it a tampered proof, the check fails on the spot. "
     "Feed it the real one, every claim reproduces straight off the public chain."),
    ("close",
     "The proof is real. The payment is wrong. ThirdCheck is the difference."),
]

audio_gen.main()
