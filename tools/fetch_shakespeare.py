# Fetch the course corpus: Tiny Shakespeare, the concatenated-plays text file
# circulated by Andrej Karpathy's char-rnn repository. The text itself is
# Shakespeare, public domain. This script is the committed producer of
# public/data/tinyshakespeare.txt: it downloads, verifies the hash, and writes
# the file, so the corpus in the repo is reproducible rather than provenance-free.
#
# Run: python3 tools/fetch_shakespeare.py

import hashlib
import sys
import urllib.request
from pathlib import Path

URL = "https://raw.githubusercontent.com/karpathy/char-rnn/master/data/tinyshakespeare/input.txt"
SHA256 = "86c4e6aa9db7c042ec79f339dcb96d42b0075e16b8fc2e86bf0ca57e2dc565ed"
DEST = Path(__file__).resolve().parents[1] / "public" / "data" / "tinyshakespeare.txt"


def main() -> int:
    with urllib.request.urlopen(URL) as resp:
        data = resp.read()
    digest = hashlib.sha256(data).hexdigest()
    if digest != SHA256:
        print(f"FAIL: sha256 mismatch\n  expected {SHA256}\n  got      {digest}")
        print("The upstream file changed; do not commit it without re-checking provenance.")
        return 1
    DEST.parent.mkdir(parents=True, exist_ok=True)
    DEST.write_bytes(data)
    print(f"wrote {DEST} ({len(data)} bytes, sha256 verified)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
