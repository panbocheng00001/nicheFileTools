import re

from capture_shots import parse_shot_list, RECIPES, PUBLIC_CONVERT

shots = parse_shot_list()
listed = {(s, f) for s, fs in shots.items() for f in fs}
existing = {p.relative_to(PUBLIC_CONVERT).as_posix() for p in PUBLIC_CONVERT.rglob("*") if p.is_file()}
pending = sorted(
    s for s in (listed - set(RECIPES))
    if f"{s[0]}/{s[1]}" not in existing
)

text = open("../src/lib/convert-content.ts", encoding="utf-8").read()
alts = {}
for f, a in re.findall(r'file: "([^"]+)", alt: "([^"]+)"', text):
    alts[f] = a

print(f"pending: {len(pending)}\n")
for slug, fname in pending:
    print(f"{slug} | {fname}")
    print(f"    alt: {alts.get(fname, '???')}")
