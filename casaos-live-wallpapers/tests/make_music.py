"""Generates test tracks: kick drum on the beat (bass), hi-hats between (treble), a soft pad."""
import math, os, random, struct, wave

ROOT = os.path.join(os.path.dirname(__file__), "music")
RATE = 22050

def track(path, seconds, bpm, base):
    random.seed(path)
    n = int(RATE * seconds)
    beat = 60.0 / bpm
    data = []
    for i in range(n):
        t = i / RATE
        bt = t % beat
        kick = math.sin(2 * math.pi * (55 + 90 * math.exp(-bt * 30)) * bt) * math.exp(-bt * 9) * 0.85
        ht = (t + beat / 2) % (beat / 2)
        hat = (random.random() * 2 - 1) * math.exp(-ht * 70) * 0.25
        pad = 0.08 * (math.sin(2 * math.pi * base * t) + math.sin(2 * math.pi * base * 1.5 * t))
        v = max(-1, min(1, kick + hat + pad))
        data.append(struct.pack("<h", int(v * 30000)))
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with wave.open(path, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(RATE)
        w.writeframes(b"".join(data))

track(os.path.join(ROOT, "01 Pulse.wav"), 45, 120, 220)
track(os.path.join(ROOT, "02 Drift.wav"), 45, 100, 196)
track(os.path.join(ROOT, "Album", "03 Echo.wav"), 45, 128, 247)
track(os.path.join(ROOT, ".hidden.wav"), 2, 120, 220)
open(os.path.join(ROOT, "notes.txt"), "w").write("not audio")
print("ok", sorted(os.listdir(ROOT)))
