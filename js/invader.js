import { MORSE_CODE } from './constants.js';

// Helper: convert a word to morse code (letters separated by 3 spaces)
function wordToMorse(word) {
  // Use three spaces between letters for proper Morse word spacing
  return word.split('').map(ch => MORSE_CODE[ch] || '').join('   ');
}

// Helper: split Morse code string into an array of symbols and inter-letter gaps
// e.g. '.-   -...' => ['.', '-', ' ', ' ', ' ', '-', '.', '.', '.']
function splitMorseSymbols(morse) {
  // Replace triple spaces with a special marker, then split
  return morse.replace(/ {3}/g, ' | ').split('').map(s => (s === '|' ? '   ' : s));
}

// Invader class - supports both single letter and word invaders
export class Invader {
  // If wordMode is true, 'letter' is a word; otherwise, it's a single character
  constructor(x, y, letter, type, wordMode = false) {
    this.x = x;
    this.y = y;
    this.type = type; // 'type1', 'type2', or 'type3'
    this.width = 33; // 11 pixels * 3 scale
    this.height = 24; // 8 pixels * 3 scale
    this.isDestroyed = false;
    this.isActive = false; // currently spelling morse
    this.hasPlayedFullMorse = false; // track if we've shown the full morse code
    this.playingSymbolIndex = -1; // index of symbol currently being played (-1 = none)

    if (wordMode) {
      this.word = letter.toUpperCase();
      this.letter = null;
      this.morseCode = wordToMorse(this.word);
      this.currentSymbolIndex = 0; // index in morseCode string (including spaces)
    } else {
      this.letter = letter.toUpperCase();
      this.word = null;
      this.morseCode = MORSE_CODE[this.letter] || '-----';
      this.currentSymbolIndex = 0;
    }
    this.wordMode = wordMode;
  }

  // Get the current symbol being spelled (dot, dash, or space between letters)
  get currentSymbol() {
    if (this.currentSymbolIndex >= this.morseCode.length) {
      return null;
    }
    return this.morseCode[this.currentSymbolIndex];
  }

  // Get the morse code to display (for rendering)
  get displayedMorse() {
    if (this.hasPlayedFullMorse) {
      return this.morseCode;
    }
    if (this.playingSymbolIndex >= 0) {
      return this.morseCode.substring(0, this.playingSymbolIndex + 1);
    }
    return this.morseCode.substring(0, this.currentSymbolIndex);
  }

  // Advance to next symbol in the morse code
  // Returns true if there are more symbols, false if finished
  advanceSymbol() {
    if (this.currentSymbolIndex < this.morseCode.length - 1) {
      this.currentSymbolIndex++;
      return true;
    }
    this.hasPlayedFullMorse = true;
    return false;
  }

  // Reset morse spelling to beginning
  resetMorse() {
    this.currentSymbolIndex = 0;
    this.isActive = false;
    this.playingSymbolIndex = -1;
    this.hasPlayedFullMorse = false;
  }

  // Check if a point is within this invader's bounds
  containsPoint(px, py) {
    const left = this.x - this.width / 2;
    const right = this.x + this.width / 2;
    const top = this.y - this.height / 2;
    const bottom = this.y + this.height / 2;
    return px >= left && px <= right && py >= top && py <= bottom;
  }
}
