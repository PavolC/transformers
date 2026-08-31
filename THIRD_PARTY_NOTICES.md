# Third-party notices

## nanoGPT (MIT)

`tools/fixtures/gen_parity_fixture.py` (arriving with the chapter 9 to 11
work) derives its PyTorch reference model from nanoGPT, and the committed
parity fixture it generates is derived output. The notice below travels with
that file and with this repository. No nanoGPT-derived code ships in the built
site today; if that ever changes, the build must emit this notice into its
output and link it from the footer (see CLAUDE.md, hard rules).

```
MIT License

Copyright (c) 2022 Andrej Karpathy

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## Tiny Shakespeare (public domain)

`public/data/tinyshakespeare.txt` is Shakespeare's text, public domain, in the
concatenated form circulated by Andrej Karpathy's char-rnn repository.
`tools/fetch_shakespeare.py` records the source URL and the sha256 of the
committed file.
