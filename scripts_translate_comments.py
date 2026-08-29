import os, re, time
from deep_translator import GoogleTranslator

SRC = r"E:/googleProduct/nicheFileTools/web/src"
EXTS = {".ts", ".tsx", ".css", ".js", ".mjs"}
SKIP_DIRS = {"node_modules", ".next", "dist", ".turbo", "out"}

CJK = re.compile(r'[\u4e00-\u9fff]')
COMMENT = re.compile(r'(/\*.*?\*/|//[^\n]*)', re.DOTALL)

TRANSLATOR = GoogleTranslator(source='zh-CN', target='en')
CACHE = {}

def tr(text):
    if not CJK.search(text):
        return text
    if text in CACHE:
        return CACHE[text]
    for attempt in range(3):
        try:
            out = TRANSLATOR.translate(text)
            CACHE[text] = out
            return out
        except Exception:
            time.sleep(0.5)
    return text  # give up, keep original

def repl(m):
    t = m.group(0)
    if t.startswith('//'):
        return '//' + tr(t[2:])
    # block comment /* ... */
    inner = t[2:-2]
    lines = inner.split('\n')
    newlines = [tr(ln) for ln in lines]
    return '/*' + '\n'.join(newlines) + '*/'

def process_file(path):
    with open(path, 'r', encoding='utf-8') as f:
        src = f.read()
    new = COMMENT.sub(repl, src)
    if new != src:
        with open(path, 'w', encoding='utf-8') as f:
            f.write(new)
        return True
    return False

count = 0
changed = 0
for root, dirs, files in os.walk(SRC):
    dirs[:] = [d for d in dirs if d not in SKIP_DIRS]
    for fn in files:
        if os.path.splitext(fn)[1] in EXTS:
            count += 1
            full = os.path.join(root, fn)
            if process_file(full):
                changed += 1
                rel = os.path.relpath(full, SRC)
                print("CHANGED:", rel)

print(f"\nScanned {count} files, changed {changed}.")
