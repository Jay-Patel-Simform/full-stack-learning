#!/usr/bin/env python3
"""Print the human prompts from Claude Code sessions for one day, grouped by project."""
import json, re, sys, os, glob, datetime

arg = " ".join(sys.argv[1:]).strip()
if arg in ("", "today"):
    date = datetime.date.today()
elif arg == "yesterday":
    date = datetime.date.today() - datetime.timedelta(days=1)
else:
    for fmt in ("%d %b %Y", "%d %B %Y", "%Y-%m-%d", "%d/%m/%Y"):
        try:
            date = datetime.datetime.strptime(arg, fmt).date()
            break
        except ValueError:
            continue
    else:
        sys.exit(f"Unreadable date {arg!r}. Try: 18 Sep 2026 | 2026-09-18 | today | yesterday")
day = date.strftime("%d %b %Y")
start = datetime.datetime.combine(date, datetime.time()).astimezone()
end = start + datetime.timedelta(days=1)

def text(msg):
    c = msg.get("content")
    if isinstance(c, str):
        s = c
    else:
        s = " ".join(b.get("text", "") for b in c if isinstance(b, dict))
    s = re.sub(r"<command-(message|name)>.*?</command-\1>", "", s, flags=re.S)
    s = re.sub(r"<command-args>(.*?)</command-args>", r"\1", s, flags=re.S)
    s = re.sub(r"<[^>]+-reminder>.*?</[^>]+-reminder>", "", s, flags=re.S)
    return " ".join(s.split())

hits = {}
for path in glob.glob(os.path.expanduser("~/.claude/projects/*/*.jsonl")):
    for line in open(path, errors="replace"):
        if '"kind":"human"' not in line:
            continue
        try:
            e = json.loads(line)
        except ValueError:
            continue
        if e.get("type") != "user" or e.get("origin", {}).get("kind") != "human":
            continue
        ts = datetime.datetime.fromisoformat(e["timestamp"].replace("Z", "+00:00")).astimezone()
        if not (start <= ts < end):
            continue
        t = text(e.get("message", {}))
        if t:
            hits.setdefault(e.get("cwd") or os.path.basename(os.path.dirname(path)), []).append((ts, t))

print(f"# {day}")
if not hits:
    print("No sessions.")
for project, items in sorted(hits.items()):
    print(f"\n## {project}")
    seen = {}
    for ts, t in sorted(items):
        key = t[:120]
        if key in seen:
            seen[key][1] += 1
            continue
        seen[key] = [ts, 1]
    for key, (ts, n) in sorted(seen.items(), key=lambda kv: kv[1][0]):
        again = f" (x{n})" if n > 1 else ""
        print(f"- {ts:%H:%M} {key}{again}")
