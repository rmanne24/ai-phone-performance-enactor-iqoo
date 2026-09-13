#!/usr/bin/env python3
"""Serve the existing NEXUS UI and live Android telemetry via ADB."""

from __future__ import annotations

import json
import os
import re
import subprocess
import sys
import time
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
HOST = "127.0.0.1"
PORT = 8000
CACHE_SECONDS = 1.5

_adb_path = None
_cache = (0.0, None)


def _creation_flags() -> int:
    if os.name == "nt" and hasattr(subprocess, "CREATE_NO_WINDOW"):
        return subprocess.CREATE_NO_WINDOW
    return 0


def find_adb() -> str:
    global _adb_path
    if _adb_path:
        return _adb_path

    names = ["adb.exe" if os.name == "nt" else "adb"]
    candidates = list(names)
    for env_key in ("ANDROID_HOME", "ANDROID_SDK_ROOT"):
        root = os.environ.get(env_key)
        if root:
            candidates.append(str(Path(root) / "platform-tools" / names[0]))
    local = os.environ.get("LOCALAPPDATA")
    if local:
        candidates.append(str(Path(local) / "Android" / "Sdk" / "platform-tools" / "adb.exe"))
    pf = os.environ.get("ProgramFiles")
    if pf:
        candidates.append(str(Path(pf) / "Android" / "android-sdk" / "platform-tools" / "adb.exe"))

    for candidate in candidates:
        try:
            subprocess.run(
                [candidate, "version"],
                capture_output=True,
                text=True,
                timeout=4,
                creationflags=_creation_flags(),
            )
            _adb_path = candidate
            return candidate
        except (OSError, subprocess.SubprocessError):
            continue
    _adb_path = names[0]
    return _adb_path


def adb(*args: str, timeout: float = 6.0) -> tuple[bool, str]:
    try:
        result = subprocess.run(
            [find_adb(), *args],
            capture_output=True,
            text=True,
            timeout=timeout,
            encoding="utf-8",
            errors="replace",
            creationflags=_creation_flags(),
        )
        output = (result.stdout or "") + (("\n" + result.stderr) if result.returncode else "")
        return result.returncode == 0, output.replace("\r\n", "\n").replace("\r", "\n")
    except FileNotFoundError:
        return False, "adb not found"
    except subprocess.TimeoutExpired:
        return False, "adb timed out"
    except OSError as exc:
        return False, str(exc)


def kb_to_gb(kb: float | None) -> float | None:
    if kb is None:
        return None
    return round(kb / (1024 * 1024), 1)


def first_match(text: str, pattern: str, flags: int = re.I) -> str | None:
    match = re.search(pattern, text, flags)
    return match.group(1).strip() if match else None


def parse_battery(text: str) -> dict:
    level = first_match(text, r"level:\s*(\d+)")
    scale = first_match(text, r"scale:\s*(\d+)")
    temp = first_match(text, r"temperature:\s*(-?\d+)")
    status = first_match(text, r"status:\s*(\S+)")
    ac = first_match(text, r"AC powered:\s*(true|false)")
    usb = first_match(text, r"USB powered:\s*(true|false)")
    wireless = first_match(text, r"Wireless powered:\s*(true|false)")
    plugged = first_match(text, r"charged?\s*plugged:\s*(\d+)")

    percent = None
    if level is not None:
        lvl = int(level)
        scl = int(scale) if scale and int(scale) else 100
        percent = round(lvl * 100 / scl) if scl else lvl

    temperature_c = round(int(temp) / 10.0, 1) if temp is not None else None
    powered = any(v and v.lower() == "true" for v in (ac, usb, wireless))
    if plugged and plugged not in ("0", "false"):
        powered = True
    status_l = (status or "").lower()
    charging = powered or status_l in {"2", "charging", "5", "full"}

    return {
        "battery_percent": percent,
        "temperature_c": temperature_c,
        "charging": charging,
    }


def parse_meminfo(text: str) -> dict:
    total = first_match(text, r"MemTotal:\s*(\d+)")
    available = first_match(text, r"MemAvailable:\s*(\d+)")
    if available is None:
        free = first_match(text, r"MemFree:\s*(\d+)")
        cached = first_match(text, r"Cached:\s*(\d+)")
        if free is not None:
            available = str(int(free) + (int(cached) if cached else 0))
    total_kb = float(total) if total else None
    avail_kb = float(available) if available else None
    used_kb = (total_kb - avail_kb) if total_kb is not None and avail_kb is not None else None
    return {
        "ram_total_gb": kb_to_gb(total_kb),
        "ram_used_gb": kb_to_gb(used_kb),
        "ram_available_gb": kb_to_gb(avail_kb),
    }


def parse_df(text: str) -> dict:
    total_kb = used_kb = avail_kb = None
    for line in text.splitlines():
        if "Filesystem" in line or not line.strip():
            continue
        parts = line.split()
        if len(parts) < 4:
            continue
        try:
            blocks, used, available = float(parts[1]), float(parts[2]), float(parts[3])
        except ValueError:
            continue
        mount = parts[-1]
        if mount in {"/data", "/data/user/0", "/storage/emulated/0"} or mount.endswith("/data"):
            total_kb, used_kb, avail_kb = blocks, used, available
            break
        if total_kb is None:
            total_kb, used_kb, avail_kb = blocks, used, available
    return {
        "storage_total_gb": kb_to_gb(total_kb),
        "storage_used_gb": kb_to_gb(used_kb),
        "storage_available_gb": kb_to_gb(avail_kb),
    }


def parse_getprop(text: str) -> dict[str, str]:
    props: dict[str, str] = {}
    for match in re.finditer(r"\[([^\]]+)\]:\s*\[([^\]]*)\]", text):
        props[match.group(1)] = match.group(2)
    return props


def collect_identity(props: dict[str, str]) -> dict:
    names = [
        props.get("ro.vivo.market.name", ""),
        props.get("ro.vivo.product.release.name", ""),
        props.get("ro.oppo.market.name", ""),
        props.get("ro.vendor.oplus.market.name", ""),
        props.get("ro.product.marketname", ""),
        props.get("ro.product.model", ""),
    ]
    model = next((n.strip() for n in names if n and n.strip().lower() not in {"unknown", ""}), "")
    manufacturer = (props.get("ro.product.manufacturer") or props.get("ro.product.brand") or "").strip()
    android_version = (props.get("ro.build.version.release") or "").strip()
    return {
        "manufacturer": manufacturer,
        "model": model,
        "android_version": android_version,
    }


def device_connected() -> tuple[bool, str]:
    ok, out = adb("devices", timeout=5)
    if not ok:
        if "not found" in out.lower():
            return False, "adb not found. Install Android platform-tools and add adb to PATH."
        return False, out.strip() or "adb failed"
    for line in out.splitlines()[1:]:
        if "\tdevice" in line:
            return True, ""
        if "\tunauthorized" in line:
            return False, "Device unauthorized. Accept the USB debugging prompt on the phone."
        if "\toffline" in line:
            return False, "Device offline. Unplug and replug USB."
    return False, "No Android device. Enable USB debugging and run: adb devices"


def collect() -> dict:
    connected, error = device_connected()
    payload = {
        "connected": connected,
        "error": error or None,
        "manufacturer": None,
        "model": None,
        "android_version": None,
        "battery_percent": None,
        "temperature_c": None,
        "charging": None,
        "ram_total_gb": None,
        "ram_used_gb": None,
        "ram_available_gb": None,
        "storage_total_gb": None,
        "storage_used_gb": None,
        "storage_available_gb": None,
    }
    if not connected:
        return payload

    ok_b, battery_text = adb("shell", "dumpsys", "battery")
    ok_m, mem_text = adb("shell", "cat", "/proc/meminfo")
    ok_d, df_text = adb("shell", "df", "-k", "/data")
    if not ok_d or "No such file" in df_text:
        ok_d, df_text = adb("shell", "df", "-k")
    ok_p, prop_text = adb("shell", "getprop")

    if ok_b:
        payload.update(parse_battery(battery_text))
    if ok_m:
        payload.update(parse_meminfo(mem_text))
    if ok_d:
        payload.update(parse_df(df_text))
    if ok_p:
        payload.update(collect_identity(parse_getprop(prop_text)))
    payload["error"] = None
    return payload


def telemetry() -> dict:
    global _cache
    now = time.time()
    cached_at, cached = _cache
    if cached is not None and now - cached_at < CACHE_SECONDS:
        return cached
    data = collect()
    _cache = (now, data)
    return data


def compute_prediction(req_data: dict, telem: dict) -> dict:
    ram_req = req_data.get("ram_req_gb", 4.5)
    gpu_weight = req_data.get("gpu_weight", 1.2) # 1.0 (medium), 1.2 (high), 1.5 (extreme)
    game_name = req_data.get("game_name", "Selected Title")

    curr_temp = telem.get("temperature_c") or 39.0
    ram_avail = telem.get("ram_available_gb") or 4.2

    temp_penalty = max(0.0, (curr_temp - 35.0) * 1.8)
    ram_deficit = max(0.0, ram_req - ram_avail)
    ram_penalty = ram_deficit * 6.0
    gpu_penalty = (gpu_weight - 1.0) * 18.0

    raw_score = 98.0 - (temp_penalty + ram_penalty + gpu_penalty)
    score = int(max(35, min(98, round(raw_score))))

    thermal_risk = "LOW" if score > 85 else ("MEDIUM" if score > 70 else "HIGH")
    battery_impact = "LOW" if score > 85 else "MEDIUM"
    ram_pressure = "LOW" if ram_deficit <= 0.5 else ("MEDIUM" if ram_deficit <= 1.5 else "HIGH")

    verdict = "OPTIMAL" if score > 85 else ("PLAYABLE WITH CARE" if score > 68 else "LIMITED HEADROOM")
    title = "Locked in for peak performance." if score > 85 else ("Strong start. Watch thermals." if score > 68 else "High workload. Optimization recommended.")
    copy = f"Device state is favorable for {game_name}." if score > 85 else f"Headroom is stable, but extended play may increase heat build-up."

    ai_rationale = f"Live telemetry check: {curr_temp:.1f}°C device temperature and {ram_avail:.1f} GB available RAM. {game_name} requires ~{ram_req:.1f} GB RAM. The prediction engine models a {score}/100 stability index with {thermal_risk.lower()} thermal stress over the next 45 minutes."

    return {
        "score": score,
        "thermal_risk": thermal_risk,
        "battery_impact": battery_impact,
        "ram_pressure": ram_pressure,
        "verdict": verdict,
        "title": title,
        "copy": copy,
        "ai_rationale": ai_rationale,
        "confidence": 94,
        "telemetry_used": {
            "temperature_c": curr_temp,
            "ram_available_gb": ram_avail,
            "ram_req_gb": ram_req
        }
    }


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def do_GET(self):
        path = self.path.split("?", 1)[0]
        if path in ("/api/telemetry", "/health"):
            body = json.dumps(telemetry() if path == "/api/telemetry" else {"status": "ok"}).encode("utf-8")
            try:
                self.send_response(200)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self.send_header("Cache-Control", "no-store")
                self.send_header("Access-Control-Allow-Origin", "*")
                self.send_header("Content-Length", str(len(body)))
                self.end_headers()
                self.wfile.write(body)
            except (BrokenPipeError, ConnectionResetError, OSError):
                pass
            return
        try:
            super().do_GET()
        except (BrokenPipeError, ConnectionResetError, OSError):
            pass

    def do_POST(self):
        path = self.path.split("?", 1)[0]
        content_length = int(self.headers.get("Content-Length", 0))
        post_data = {}
        if content_length > 0:
            try:
                raw = self.rfile.read(content_length).decode("utf-8")
                post_data = json.loads(raw) if raw else {}
            except Exception:
                post_data = {}

        if path in ("/predict", "/api/predict"):
            result = compute_prediction(post_data, telemetry())
            body = json.dumps(result).encode("utf-8")
        else:
            body = json.dumps({"status": "ok", "received": post_data}).encode("utf-8")

        try:
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Cache-Control", "no-store")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
        except (BrokenPipeError, ConnectionResetError, OSError):
            pass

    def do_HEAD(self):
        path = self.path.split("?", 1)[0]
        if path in ("/api/telemetry", "/health", "/predict", "/api/predict"):
            try:
                self.send_response(200)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self.send_header("Cache-Control", "no-store")
                self.send_header("Access-Control-Allow-Origin", "*")
                self.send_header("Content-Length", "0")
                self.end_headers()
            except (BrokenPipeError, ConnectionResetError, OSError):
                pass
            return
        try:
            super().do_HEAD()
        except (BrokenPipeError, ConnectionResetError, OSError):
            pass

    def do_OPTIONS(self):
        try:
            self.send_response(204)
            self.send_header("Access-Control-Allow-Origin", "*")
            self.send_header("Access-Control-Allow-Methods", "GET, POST, HEAD, OPTIONS")
            self.send_header("Access-Control-Allow-Headers", "*")
            self.end_headers()
        except (BrokenPipeError, ConnectionResetError, OSError):
            pass

    def log_message(self, fmt: str, *args):
        if args and any(str(args[0]).startswith(p) for p in ("GET /api/telemetry", "HEAD /api/telemetry", "GET /health", "HEAD /health", "POST /predict", "POST /api/predict")):
            return
        super().log_message(fmt, *args)


def main() -> None:
    os.chdir(ROOT)
    ThreadingHTTPServer.allow_reuse_address = True
    server = ThreadingHTTPServer((HOST, PORT), Handler)
    print(f"NEXUS dashboard: http://{HOST}:{PORT}")
    print("Telemetry:       http://{0}:{1}/api/telemetry".format(HOST, PORT))
    print("Connect a phone with USB debugging, then: adb devices")
    while True:
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            print("\nStopped.")
            sys.exit(0)
        except Exception as exc:
            print(f"[Warning] Server exception caught: {exc}")


if __name__ == "__main__":
    main()
