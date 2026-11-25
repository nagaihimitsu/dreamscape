"""Make a free-time backdrop loop from a generated video whose camera should stand still (2026-11-25).

Steps: measure the camera's slow drift on the upper part of the picture (buildings, sky) and undo it; find the stretch
whose end looks most like its start (avoiding a jump inside the source); fade its last second into its first; write a
silent H.264 MP4 and the WebP of its first frame (the city's backdropImagePath).

    python3 make_loop.py <source.mp4> <out.mp4> <out_poster.webp> [--avoid <frame>]

Needs opencv-python-headless, numpy, Pillow and ffmpeg. Settings used for Delhi: see README.md.
"""
import argparse
import subprocess

import cv2
import numpy as np
from PIL import Image

FPS = 24
CROP_Y, CROP_X = 16, 8  # the margin the drift correction may leave empty


def read_frames(path):
    capture = cv2.VideoCapture(path)
    frames = []
    while True:
        ok, frame = capture.read()
        if not ok:
            return frames
        frames.append(frame)


def drift(frames):
    """A similarity transform per frame onto frame 0, from SIFT matches in the upper 55% (the still part)."""
    height, width = frames[0].shape[:2]
    mask = np.zeros((height, width), np.uint8)
    mask[: int(height * 0.55), :] = 255
    sift = cv2.SIFT_create(3000)
    matcher = cv2.BFMatcher()
    keys0, desc0 = sift.detectAndCompute(cv2.cvtColor(frames[0], cv2.COLOR_BGR2GRAY), mask)
    out = []
    for frame in frames:
        keys, desc = sift.detectAndCompute(cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY), mask)
        good = [a for a, b in matcher.knnMatch(desc, desc0, k=2) if a.distance < 0.7 * b.distance]
        src = np.float32([keys[m.queryIdx].pt for m in good])
        dst = np.float32([keys0[m.trainIdx].pt for m in good])
        matrix, _ = cv2.estimateAffinePartial2D(src, dst, method=cv2.RANSAC, ransacReprojThreshold=2)
        out.append(matrix)
    return out


def steady(frame, matrix):
    height, width = frame.shape[:2]
    warped = cv2.warpAffine(frame, matrix, (width, height), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE)
    return warped[CROP_Y:-CROP_Y, CROP_X:-CROP_X]


def best_loop(small, fade, lengths, avoid):
    """(start, length) whose fade window matches the window one length later best, not crossing `avoid`."""
    best = None
    count = len(small)
    for length in lengths:
        for start in range(0, count - length - fade + 1):
            if avoid is not None and start <= avoid < start + length + fade:
                continue
            score = np.mean([np.abs(small[start + k] - small[start + length + k]).mean() for k in range(0, fade, 4)])
            if best is None or score < best[0]:
                best = (score, start, length)
    return best


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("source")
    parser.add_argument("out")
    parser.add_argument("poster")
    parser.add_argument("--avoid", type=int, help="a frame after which the source jumps (two clips joined)")
    parser.add_argument("--crf", default="24")
    args = parser.parse_args()

    frames = read_frames(args.source)
    matrices = drift(frames)
    steadied = [steady(frame, matrix) for frame, matrix in zip(frames, matrices)]
    small = [cv2.resize(cv2.cvtColor(f, cv2.COLOR_BGR2GRAY), (96, 168), interpolation=cv2.INTER_AREA).astype(np.float32)
             for f in steadied]
    fade = FPS
    score, start, length = best_loop(small, fade, range(6 * FPS, 10 * FPS + 1, 2), args.avoid)
    print(f"loop: start {start / FPS:.2f}s, length {length / FPS:.2f}s, fade {fade / FPS:.2f}s, score {score:.2f}")

    clip = [f.astype(np.float32) for f in steadied[start:start + length + fade]]
    height, width = clip[0].shape[:2]
    encoder = subprocess.Popen(
        ["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "bgr24", "-s", f"{width}x{height}", "-r", str(FPS),
         "-i", "-", "-vf", "scale=720:-2:flags=lanczos", "-c:v", "libx264", "-preset", "slow", "-crf", args.crf,
         "-pix_fmt", "yuv420p", "-profile:v", "high", "-movflags", "+faststart", "-an", args.out],
        stdin=subprocess.PIPE)
    for t in range(length):
        frame = clip[fade + t]
        k = t - (length - fade)
        if k >= 0:  # the last second fades into the frames just before the loop's first
            x = (k + 1) / (fade + 1)
            x = x * x * (3 - 2 * x)
            frame = (1 - x) * frame + x * clip[k]
        encoder.stdin.write(np.clip(frame, 0, 255).astype(np.uint8).tobytes())
    encoder.stdin.close()
    encoder.wait()
    Image.fromarray(cv2.cvtColor(steadied[start + fade], cv2.COLOR_BGR2RGB)).save(args.poster, quality=80, method=6)


if __name__ == "__main__":
    main()
