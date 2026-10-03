"""Subset the Jua display face to the Hangul syllables used in site and app copy.

Jua's full Korean file is 368 KB; headings only use a few hundred syllables, so
the subset is a fraction of that. Re-run after copy changes (new syllables fall
back to Pretendard until then):

    pip install fonttools brotli
    python scripts/subset-jua.py

Writes site/public/fonts/jua-ko.woff2 and src/styles/fonts/jua-korean-400-normal.woff2.
"""
import glob
import io
import os
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'site/node_modules/@fontsource/jua/files/jua-korean-400-normal.woff2')
SOURCES = ['site/src/**/*.json', 'site/src/**/*.astro', 'src/**/*.tsx', 'src/**/*.ts', 'content/**/*.json']

chars = set()
for pattern in SOURCES:
    for f in glob.glob(os.path.join(ROOT, pattern), recursive=True):
        text = io.open(f, encoding='utf-8', errors='ignore').read()
        chars.update(ch for ch in text if 0xAC00 <= ord(ch) <= 0xD7A3 or 0x3131 <= ord(ch) <= 0x318E)
text_file = os.path.join(ROOT, '.jua-chars.txt')
io.open(text_file, 'w', encoding='utf-8').write(''.join(sorted(chars)))
outs = [os.path.join(ROOT, 'site/public/fonts/jua-ko.woff2'), os.path.join(ROOT, 'src/styles/fonts/jua-korean-400-normal.woff2')]
try:
    for out in outs:
        subprocess.run([sys.executable, '-m', 'fontTools.subset', SRC, f'--text-file={text_file}',
                        '--unicodes=U+3000-303F,U+FF01-FF60', '--flavor=woff2', "--layout-features=*",
                        f'--output-file={out}'], check=True)
finally:
    os.remove(text_file)
print(f'{len(chars)} syllables -> {os.path.getsize(outs[0]) // 1024} KB')
