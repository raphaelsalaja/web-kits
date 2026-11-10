"""Re-encodes a clip at 60 fps with every frame a keyframe.

Frames are placed by the presentation timestamps ffprobe lists. ffmpeg's own
resampling falls back to decode timestamps on the simulator's recordings,
which repeat and run 1.7 s behind, so it can't be used here.

Usage: intra.py <source> <target>
"""

import bisect
import json
import subprocess
import sys

FPS = 60

source, target = sys.argv[1:3]

probe = json.loads(
    subprocess.check_output(
        [
            "ffprobe", "-v", "error", "-select_streams", "v:0",
            "-show_entries", "stream=width,height:frame=pts_time",
            "-of", "json", source,
        ]
    )
)
width = probe["streams"][0]["width"]
height = probe["streams"][0]["height"]
times = sorted(float(f["pts_time"].rstrip(",")) for f in probe["frames"])
size = width * height * 3

decode = subprocess.Popen(
    [
        "ffmpeg", "-nostdin", "-v", "fatal", "-i", source, "-map", "0:v:0",
        "-fps_mode", "passthrough", "-f", "rawvideo", "-pix_fmt", "rgb24", "-",
    ],
    stdout=subprocess.PIPE,
)
encode = subprocess.Popen(
    [
        "ffmpeg", "-nostdin", "-v", "error", "-y", "-f", "rawvideo",
        "-pix_fmt", "rgb24", "-s", f"{width}x{height}", "-r", str(FPS), "-i", "-",
        "-c:v", "libx264", "-preset", "veryfast", "-crf", "14", "-g", "1",
        "-bf", "0", "-pix_fmt", "yuv420p", "-movflags", "+faststart", target,
    ],
    stdin=subprocess.PIPE,
)

index, frame = -1, None
for n in range(int(times[-1] * FPS) + 1):
    want = max(bisect.bisect_right(times, n / FPS + 1e-6) - 1, 0)
    while index < want:
        chunk = decode.stdout.read(size)
        if len(chunk) < size:
            break
        frame, index = chunk, index + 1
    encode.stdin.write(frame)

encode.stdin.close()
decode.kill()
sys.exit(encode.wait())
