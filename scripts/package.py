"""Package the skill as cerulean.zip, ready to share and install.

Usage:
    python package.py                  # writes cerulean.zip in the current folder
    python package.py -o other/path.zip

The zip holds a single folder, cerulean/, with SKILL.md at its root: the shape Claude Code expects (unzipped into a
skills folder) and claude.ai expects (uploaded in the skills settings). Python caches, backups, git files and
galleries built with build.py --gallery are left out.
"""
import argparse
import zipfile
from pathlib import Path

SKILL = Path(__file__).resolve().parent.parent
SKIP_PARTS = {"__pycache__", ".DS_Store", ".git", ".github"}
SKIP_NAMES = {".gitignore", ".gitattributes"}
SKIP_SUFFIXES = {".pyc", ".bak", ".zip"}
SKIP_PREFIXES = ("cerulean-gallery-",)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("-o", "--output", type=Path, default=Path("cerulean.zip"))
    args = ap.parse_args()
    files = sorted(p for p in SKILL.rglob("*") if p.is_file()
                   and not SKIP_PARTS.intersection(p.relative_to(SKILL).parts)
                   and p.name not in SKIP_NAMES and p.suffix not in SKIP_SUFFIXES
                   and not p.name.startswith(SKIP_PREFIXES))
    with zipfile.ZipFile(args.output, "w", zipfile.ZIP_DEFLATED) as z:
        for p in files:
            z.write(p, Path("cerulean") / p.relative_to(SKILL))
    print(f"{args.output.resolve()}: {len(files)} files, {args.output.stat().st_size // 1024} KB")


if __name__ == "__main__":
    main()
