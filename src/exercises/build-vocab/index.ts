import type { Exercise } from "../types";
import bench from "../../bench/chapter2.json";
import skeleton from "./skeleton.py?raw";
import tests from "./tests.py?raw";
import solution from "./solution.py?raw";

export const buildVocabExercise: Exercise = {
  id: "build-vocab",
  title: "Text to ids, and back",
  prompt: [
    "The corpus is one long Python string, and every table in the rest of this " +
      "course is numbers. These three functions are the crossing between the two, " +
      "and the text is handed to them: build_vocab(text) reads a piece of text and " +
      "decides which number stands for which character. Nothing here opens a file. " +
      "The tests pass short strings, and the snippet at the end passes the whole " +
      "corpus.",
    "The numbering first, because the other two functions do nothing but apply it. " +
      "Collect the distinct characters of the text, sort them, and a character's id " +
      "is its place in that sorted list, counting from 0. The sorting is the whole " +
      "of the decision: it is what makes the numbering come out the same every time " +
      "it is built from the same text, which is what lets ids saved in one run mean " +
      "the same thing in the next.",
    "What build_vocab returns, in order. chars is that sorted list. stoi is a dict " +
      "from character to id, and it is said \"stoy\", for string to int. itos is the " +
      "same numbering the other way, id to character, said \"eye-toss\". Two dicts " +
      "rather than one, because the course needs the lookup in both directions and a " +
      "dict only goes one way.",
    "encode(text, stoi) walks a string and returns a NumPy array of its ids, one per " +
      "character, in order. Ask for dtype=np.int64 rather than letting NumPy choose: " +
      "np.array([]) on the empty string comes out float64, and a float cannot index a " +
      "row of a table. decode(ids, itos) is the way back, an array of ids in and the " +
      "string they spell out.",
    "One trap, with a test for each half. encode must use the stoi it is handed " +
      "rather than building a fresh vocabulary out of its own text argument, and " +
      "decode must use the itos it is handed. Ids carry no characters inside them: " +
      `the same five ids spell "to be" under chapter 1's ` +
      `${bench.crossing.own_vocab.length}-character vocabulary and something else ` +
      `entirely under the corpus's ${bench.units.vocab_size}, and nothing in the ids ` +
      "themselves says which vocabulary they came from.",
    "Once the tests pass, cross the whole corpus with your own functions. Send this " +
      "to the scratch pad and run it:",
    {
      code:
        "text = load_corpus()\n" +
        "chars, stoi, itos = build_vocab(text)\n" +
        "ids = encode(text, stoi)\n" +
        'print(f"{len(chars)} characters in the vocabulary, {len(ids)} ids")\n' +
        'print("decode(encode(text)) == text:", decode(ids, itos) == text)\n' +
        "\n" +
        "# The same line, numbered by two different vocabularies.\n" +
        'line = "to be, or not to be"\n' +
        'print("under the corpus\'s vocabulary:  ", encode(line, stoi).tolist())\n' +
        "_, own_stoi, _ = build_vocab(line)\n" +
        'print("under the line\'s own vocabulary:", encode(line, own_stoi).tolist())',
    },
    `The round trip prints True, and it is the receipt on all ${bench.units.chars.toLocaleString()} ` +
      "characters at once: no character was lost, none was added, and nothing was " +
      "quietly turned into something else. That check is worth keeping in mind for " +
      "chapter 12, where the text stops being Shakespeare and the vocabulary stops " +
      "covering it.",
    `The two id lists are the same line twice. Under the corpus's vocabulary it opens ` +
      `${bench.crossing.corpus_ids.slice(0, 3).join(", ")}; under its own it opens ` +
      `${bench.crossing.own_ids.slice(0, 3).join(", ")}. Same characters, same order, ` +
      `different numbers, because there are ${bench.units.vocab_size} characters to be ` +
      `sorted among rather than ${bench.crossing.own_vocab.length}.`,
  ],
  skeleton,
  tests,
  solution,
  hints: [
    "build_vocab is three lines and no arithmetic: sorted(set(text)) gives chars, " +
      "then one dict comprehension over enumerate(chars) each way. encode is a list " +
      "comprehension inside np.array(..., dtype=np.int64). decode is one \"\".join " +
      "with a lookup inside it.",
    "The structure, in pseudocode:\n\n" +
      "    build_vocab(text):\n" +
      "        chars = sorted(set(text))\n" +
      "        stoi = {ch: i for i, ch in enumerate(chars)}\n" +
      "        itos = {i: ch for i, ch in enumerate(chars)}\n" +
      "        return chars, stoi, itos\n\n" +
      "    encode(text, stoi):\n" +
      "        return np.array([stoi[ch] for ch in text], dtype=np.int64)\n\n" +
      "    decode(ids, itos):\n" +
      "        return \"\".join(itos[int(i)] for i in ids)\n\n" +
      "    enumerate(chars) hands you (0, first character), (1, second), and so\n" +
      "    on, which is exactly the pairing both dicts need.",
  ],
};
