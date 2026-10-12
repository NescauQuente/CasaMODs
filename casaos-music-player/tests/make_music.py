"""Generates test tracks: kick drum on the beat (bass), hi-hats between (treble), a soft pad."""
import math, os, random, struct, wave, zlib

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


def png(path_or_none, w, h, pixel):
    """A PNG with no dependencies; pixel(x, y) -> (r, g, b)"""
    raw = b"".join(b"\x00" + bytes(c for x in range(w) for c in pixel(x, y)) for y in range(h))
    def chunk(t, d):
        return struct.pack(">I", len(d)) + t + d + struct.pack(">I", zlib.crc32(t + d) & 0xffffffff)
    data = b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 2, 0, 0, 0)) + chunk(b"IDAT", zlib.compress(raw)) + chunk(b"IEND", b"")
    if path_or_none:
        with open(path_or_none, "wb") as f:
            f.write(data)
    return data


def syncsafe(n):
    return bytes([(n >> 21) & 127, (n >> 14) & 127, (n >> 7) & 127, n & 127])


def frame(fid, body):
    return fid.encode() + struct.pack(">I", len(body)) + b"\x00\x00" + body


def tagged_mp3(path, seconds):
    """Silent MPEG-1 Layer III (128 kbps, 44.1 kHz, mono) after an ID3v2.3 tag:
    a UTF-16 title, Latin-1 artist and album, and a front cover (green, a red corner)."""
    cover = png(None, 64, 64, lambda x, y: (220, 40, 40) if x < 16 and y < 16 else (30, 170, 70))
    frames = (frame("TIT2", b"\x01" + "Canção de Teste".encode("utf-16")) +
              frame("TPE1", b"\x00The Testers") +
              frame("TALB", b"\x00Test Album") +
              frame("APIC", b"\x00image/png\x00\x03\x00" + cover))
    tag = b"ID3\x03\x00\x00" + syncsafe(len(frames) + 256) + frames + b"\x00" * 256   # with padding
    mp3 = b"\xff\xfb\x90\xc0" + b"\x00" * 413                                         # 417 bytes: silence
    with open(path, "wb") as f:
        f.write(tag + mp3 * int(seconds * 44100 / 1152))


# Tags and covers, in folders the default library doesn't read (a hidden one)
os.makedirs(os.path.join(ROOT, ".tagged"), exist_ok=True)
tagged_mp3(os.path.join(ROOT, ".tagged", "04 Tagged.mp3"), 30)
png(os.path.join(ROOT, "Album", "cover.png"), 32, 32, lambda x, y: (40, 60, 210))
print("ok", sorted(os.listdir(ROOT)))
