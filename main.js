import { Game } from './game.js';
import { Renderer } from './renderer.js';
import { MorseAudioEngine } from './morse-audio.js';
import { GameLoop } from './game-loop.js';
import { InputHandler } from './input-handler.js';
import { DEFAULT_WORD_LIST } from './word-list.js';

// Main entry point - wires everything together
async function init() {
  // Get canvas
  const canvas = document.getElementById('gameCanvas');
  if (!canvas) {
    console.error('Canvas not found!');
    return;
  }

  // Create game components
  const game = new Game();
  const renderer = new Renderer(canvas);
  const audioEngine = new MorseAudioEngine();

  // Start game loop immediately so the menu renders while the worklet module loads
  const gameLoop = new GameLoop(game, renderer, audioEngine);
  gameLoop.start();

  // Initialize audio — async because AudioWorklet.addModule() returns a Promise
  await audioEngine.init(game.wpm);
  audioEngine.setEnabled(game.audioEnabled);

  // Create input handler after audio is ready
  const inputHandler = new InputHandler(game, audioEngine, gameLoop, renderer);

  // Handle first user interaction to enable audio context (browser autoplay policy)
  const enableAudio = () => {
    if (audioEngine.audioContext.state === 'suspended') {
      audioEngine.audioContext.resume();
    }
    document.removeEventListener('click', enableAudio);
    document.removeEventListener('keydown', enableAudio);
  };
  document.addEventListener('click', enableAudio);
  document.addEventListener('keydown', enableAudio);

  // --- Custom Words Input Logic ---
  const input = document.getElementById('customWordsInput');
  const btn = document.getElementById('addWordsBtn');
  const msg = document.getElementById('addWordsMsg');
  // Utility: shuffle array in-place (Fisher-Yates)
  function shuffleArray(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  }

  // Load custom words from localStorage (if any)
  const saved = localStorage.getItem('morseInvaderCustomWords');
  if (saved) {
    try {
      const arr = JSON.parse(saved);
      if (Array.isArray(arr)) {
        for (const w of arr) {
          if (!DEFAULT_WORD_LIST.includes(w)) {
            DEFAULT_WORD_LIST.push(w);
          }
        }
        shuffleArray(DEFAULT_WORD_LIST);
      }
    } catch {}
  }

  if (input && btn && msg) {
    // Allow pressing Enter in the input to trigger add
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        btn.click();
      }
    });

    btn.onclick = () => {
      let text = input.value.trim();
      if (!text) {
        msg.textContent = 'Paste or type some words.';
        return;
      }
      // Remove punctuation, split by whitespace, filter out empty, deduplicate
      let words = text
        .replace(/[^A-Za-z0-9\s]/g, ' ')
        .toUpperCase()
        .split(/\s+/)
        .filter(w => w.length >= 1);
      words = Array.from(new Set(words));
      if (words.length === 0) {
        msg.textContent = 'No valid words parsed.';
        return;
      }
      // Replace DEFAULT_WORD_LIST contents with new words
      DEFAULT_WORD_LIST.length = 0;
      for (const w of words) DEFAULT_WORD_LIST.push(w);
      shuffleArray(DEFAULT_WORD_LIST);
      localStorage.setItem('morseInvaderCustomWords', JSON.stringify(DEFAULT_WORD_LIST));
      msg.textContent = `Word list replaced with ${words.length} word${words.length === 1 ? '' : 's'}.`;
      input.value = '';
    };
  }

  console.log('Morse Code Space Invaders initialized!');
}

// Start when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
