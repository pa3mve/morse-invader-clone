import { GameConfig, INVADER_SPRITES, PLAYER_SPRITE, MORSE_CODE } from './constants.js';

// Renderer class - handles all canvas drawing
export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.width = canvas.width;
    this.height = canvas.height;
    this.wrongFlashAlpha = 0; // for red flash on wrong answer

    // Character button layout for menu
    this.charButtons = [];
    this.wpmButtons = { up: null, down: null };
    this.startButton = null;
    this.audioButton = null;
    this.morseButton = null;

    this.setupClickAreas();
  }

  setupClickAreas() {
    // Will be populated each frame since positions depend on text measurement
  }

  clear() {
    this.ctx.fillStyle = '#000';
    this.ctx.fillRect(0, 0, this.width, this.height);
  }

  // Draw a pixel art sprite at position
  drawPixelSprite(sprite, x, y, scale = 3, color = '#0077cc') {
    this.ctx.fillStyle = color;
    const offsetX = -(sprite[0].length * scale) / 2;
    const offsetY = -(sprite.length * scale) / 2;

    for (let row = 0; row < sprite.length; row++) {
      for (let col = 0; col < sprite[row].length; col++) {
        if (sprite[row][col]) {
          this.ctx.fillRect(
            x + offsetX + col * scale,
            y + offsetY + row * scale,
            scale,
            scale
          );
        }
      }
    }
  }

  // Draw an invader
  drawInvader(invader, showMorse = true) {
    if (invader.isDestroyed) return;

    const sprite = INVADER_SPRITES[invader.type];
    const color = invader.isActive ? '#ff4444' : '#0077cc';
    this.drawPixelSprite(sprite, invader.x, invader.y, 3, color);

    // Draw nothing above invader in word mode if Morse display is OFF
    // (intentionally left blank)

    // Draw morse code below active invader (not letter)
    if (invader.isActive) {
      this.drawMorseDisplay(invader, showMorse);
    }
  }

  // Draw the player's cannon
  drawPlayer(player) {
    const color = '#ff4444';
    this.drawPixelSprite(PLAYER_SPRITE, player.x, player.y, 3, color);
  }

  // Draw a laser projectile
  drawLaser(laser) {
    if (!laser.active) return;

    this.ctx.fillStyle = '#ff6666';
    this.ctx.fillRect(laser.x - 2, laser.y, 4, 15);

    // Add glow effect
    this.ctx.shadowColor = '#ff6666';
    this.ctx.shadowBlur = 10;
    this.ctx.fillRect(laser.x - 2, laser.y, 4, 15);
    this.ctx.shadowBlur = 0;
  }

  // Draw morse code display BELOW the invader, with dots and dashes on same baseline
  // Dots are circles, dashes are rectangles - all aligned at bottom
  drawMorseDisplay(invader, showMorse) {
    if (!showMorse) return;

    const morse = invader.displayedMorse;
    if (!morse) return;

    // Use the same split logic as in invader.js for word mode
    // We'll treat three spaces as a big gap between letters
    const dotRadius = 4;
    const dashWidth = 12;
    const dashHeight = 6;
    const spacing = 6; // space between symbols
    const letterSpacing = 18; // extra space for inter-letter gap (3x normal)
    const baselineY = invader.y + invader.height / 2 + 15; // below the invader

    // Split morse into symbols and inter-letter gaps
    let symbols = [];
    if (invader.wordMode) {
      // Use the same splitting as in invader.js
      symbols = morse.split('');
    } else {
      symbols = morse.split('');
    }

    // Calculate total width to center the morse code
    let totalWidth = 0;
    for (let i = 0; i < symbols.length; i++) {
      const symbol = symbols[i];
      if (symbol === '.') {
        totalWidth += dotRadius * 2;
        totalWidth += spacing;
      } else if (symbol === '-') {
        totalWidth += dashWidth;
        totalWidth += spacing;
      } else if (symbol === ' ') {
        // Check for triple space (inter-letter)
        if (symbols.slice(i, i + 3).join('') === '   ') {
          totalWidth += letterSpacing;
          i += 2; // skip next two spaces
        } else {
          totalWidth += spacing; // normal intra-letter space
        }
      }
    }
    if (totalWidth > 0) totalWidth -= spacing; // remove trailing space

    let currentX = invader.x - totalWidth / 2;

    this.ctx.fillStyle = '#ffffff';

    for (let i = 0; i < symbols.length; i++) {
      const symbol = symbols[i];
      if (symbol === '.') {
        this.ctx.beginPath();
        this.ctx.arc(currentX + dotRadius, baselineY - dotRadius, dotRadius, 0, Math.PI * 2);
        this.ctx.fill();
        currentX += dotRadius * 2 + spacing;
      } else if (symbol === '-') {
        this.ctx.fillRect(currentX, baselineY - dashHeight, dashWidth, dashHeight);
        currentX += dashWidth + spacing;
      } else if (symbol === ' ') {
        // Check for triple space (inter-letter)
        if (symbols.slice(i, i + 3).join('') === '   ') {
          currentX += letterSpacing;
          i += 2; // skip next two spaces
        } else {
          currentX += spacing;
        }
      }
    }

    // Decorative: draw shooting pulses at each end of the morse display when a symbol is playing
    if (invader.playingSymbolIndex >= 0) {
      // leftmost X is startX, rightmost is currentX
      const pulseWidth = 6;
      const pulseHeight = 18;
      const leftX = invader.x - totalWidth / 2 - pulseWidth - 4;
      const rightX = invader.x + totalWidth / 2 + 4;

      this.ctx.fillStyle = '#ff6666';
      this.ctx.shadowColor = '#ff6666';
      this.ctx.shadowBlur = 12;
      // left pulse
      this.ctx.fillRect(leftX, baselineY - pulseHeight - 6, pulseWidth, pulseHeight);
      // right pulse
      this.ctx.fillRect(rightX, baselineY - pulseHeight - 6, pulseWidth, pulseHeight);
      this.ctx.shadowBlur = 0;
    }
  }

  // Draw explosion particles
  drawExplosion(explosion) {
    if (!explosion.active) return;

    for (const particle of explosion.particles) {
      if (particle.life > 0) {
        this.ctx.globalAlpha = particle.life;
        this.ctx.fillStyle = particle.color;
        this.ctx.fillRect(
          particle.x - particle.size / 2,
          particle.y - particle.size / 2,
          particle.size,
          particle.size
        );
      }
    }
    this.ctx.globalAlpha = 1;
  }

  // Draw decorative morse bullet
  drawDecorativeBullet(bullet) {
    // Minimal anchor (subtle, non-red) — small gray dot to mark position
    this.ctx.fillStyle = '#303030';
    this.ctx.beginPath();
    this.ctx.arc(bullet.x, bullet.y, 3, 0, Math.PI * 2);
    this.ctx.fill();

    // Draw current morse token near the bullet (above it)
    if (bullet.tokens && bullet.tokenIndex < bullet.tokens.length) {
      const token = bullet.tokens[bullet.tokenIndex];
      const isActive = bullet.tokenTimer > 0;
      const centerX = bullet.x;
      const centerY = bullet.y - 14;

      if (token === '.') {
        this.ctx.fillStyle = isActive ? '#ffffff' : '#888888';
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, 4, 0, Math.PI * 2);
        this.ctx.fill();
      } else if (token === '-') {
        this.ctx.fillStyle = isActive ? '#ffffff' : '#888888';
        this.ctx.fillRect(centerX - 10, centerY - 4, 20, 8);
      }
    }
  }

  // Draw the HUD (score, lives, level, WPM)
  drawHUD(score, lives, level, wpm, typedBuffer) {
    this.ctx.fillStyle = '#bfe6ff';
    this.ctx.font = '16px monospace';
    this.ctx.textAlign = 'left';
    this.ctx.fillText(`SCORE: ${score}`, 20, 30);
    this.ctx.fillText(`LEVEL: ${level}`, 20, 50);
    this.ctx.fillText(`LIVES: ${'♥'.repeat(lives)}`, 20, 70);

    this.ctx.textAlign = 'right';
    this.ctx.fillText(`WPM: ${wpm}`, this.width - 20, 30);

    // Show typed buffer at bottom center
    this.ctx.fillStyle = '#0077cc';
    this.ctx.textAlign = 'center';
    this.ctx.font = 'bold 24px monospace';
    this.ctx.fillText(typedBuffer, this.width / 2, this.height - 20);
  }

  // Draw red flash for wrong answer
  drawWrongFeedback() {
    if (this.wrongFlashAlpha > 0) {
      this.ctx.fillStyle = `rgba(255, 0, 0, ${this.wrongFlashAlpha})`;
      this.ctx.fillRect(0, 0, this.width, this.height);
      this.wrongFlashAlpha -= 0.05; // fade out
    }
  }

  // Trigger red flash
  triggerWrongFeedback() {
    this.wrongFlashAlpha = 0.3;
  }

  // Draw the menu screen with clickable character selection and word mode toggle
  drawMenu(learnedChars, wpm, audioEnabled, showMorseCode, wordMode) {
    this.clear();
    this.charButtons = [];

    // Title
    this.ctx.fillStyle = '#0077cc';
    this.ctx.font = 'bold 36px monospace';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('MORSE INVADERS', this.width / 2, 60);

    // Subtitle
    this.ctx.fillStyle = '#8aa3b8';
    this.ctx.font = '14px monospace';
    this.ctx.fillText('Click letters/numbers to select learned characters', this.width / 2, 130);

    // Instructions
    this.ctx.fillStyle = '#6b7f8f';
    this.ctx.font = '12px monospace';
    this.ctx.fillText('Type the letter shown below the invader to shoot. ESC to end game.', this.width / 2, 145);

    // Character selection grid - A-Z + 0-9 + punctuation
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.,?=';
    const btnWidth = 24;
    const btnHeight = 18;
    const btnSpacing = 3;
    const cols = 19;
    const startX = (this.width - (cols * (btnWidth + btnSpacing) - btnSpacing)) / 2;
    const gridY = 165;

    for (let i = 0; i < chars.length; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = startX + col * (btnWidth + btnSpacing);
      const y = gridY + row * (btnHeight + btnSpacing);
      const isSelected = learnedChars.includes(chars[i]);

      this.charButtons.push({
        char: chars[i],
        x: x,
        y: y,
        width: btnWidth,
        height: btnHeight,
        selected: isSelected
      });

      // Draw button
      if (isSelected) {
        this.ctx.fillStyle = '#0077cc';
        this.ctx.fillRect(x, y, btnWidth, btnHeight);
        this.ctx.fillStyle = '#000000';
      } else {
        this.ctx.fillStyle = '#333333';
        this.ctx.fillRect(x, y, btnWidth, btnHeight);
        this.ctx.strokeStyle = '#666666';
        this.ctx.strokeRect(x, y, btnWidth, btnHeight);
        this.ctx.fillStyle = '#888888';
      }

      this.ctx.font = 'bold 14px monospace';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(chars[i], x + btnWidth / 2, y + btnHeight / 2 + 5);
    }

    // WPM control
    const wpmY = 270;
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = '16px monospace';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('SPEED', this.width / 2, wpmY);

    const wpmBoxY = wpmY + 15;
    const wpmBoxWidth = 100;
    const wpmBoxHeight = 35;
    const wpmBoxX = this.width / 2 - wpmBoxWidth / 2;

    // WPM buttons
    const upBtnX = wpmBoxX + wpmBoxWidth + 10;
    const downBtnX = wpmBoxX - 40;
    const btnSize = 30;

    // Up button
    this.wpmButtons.up = { x: upBtnX, y: wpmBoxY, width: btnSize, height: btnSize };
    this.ctx.fillStyle = '#1a2a38';
    this.ctx.fillRect(upBtnX, wpmBoxY, btnSize, btnSize);
    this.ctx.strokeStyle = '#666666';
    this.ctx.strokeRect(upBtnX, wpmBoxY, btnSize, btnSize);
    this.ctx.fillStyle = '#0077cc';
    this.ctx.font = 'bold 20px monospace';
    this.ctx.fillText('▲', upBtnX + btnSize / 2, wpmBoxY + btnSize / 2 + 7);

    // Down button
    this.wpmButtons.down = { x: downBtnX, y: wpmBoxY, width: btnSize, height: btnSize };
    this.ctx.fillStyle = '#1a2a38';
    this.ctx.fillRect(downBtnX, wpmBoxY, btnSize, btnSize);
    this.ctx.strokeStyle = '#666666';
    this.ctx.strokeRect(downBtnX, wpmBoxY, btnSize, btnSize);
    this.ctx.fillStyle = '#0077cc';
    this.ctx.fillText('▼', downBtnX + btnSize / 2, wpmBoxY + btnSize / 2 + 7);

    // WPM display box
    this.ctx.fillStyle = '#081421';
    this.ctx.fillRect(wpmBoxX, wpmBoxY, wpmBoxWidth, wpmBoxHeight);
    this.ctx.strokeStyle = '#0077cc';
    this.ctx.strokeRect(wpmBoxX, wpmBoxY, wpmBoxWidth, wpmBoxHeight);
    this.ctx.fillStyle = '#ff6666';
    this.ctx.font = 'bold 20px monospace';
    this.ctx.fillText(`${wpm} WPM`, this.width / 2, wpmBoxY + wpmBoxHeight / 2 + 7);

    // Audio toggle
    const audioY = 330;
    this.audioButton = { x: this.width / 2 - 60, y: audioY, width: 120, height: 35 };
    this.ctx.fillStyle = audioEnabled ? '#0077cc' : '#ff4444';
    this.ctx.fillRect(this.audioButton.x, this.audioButton.y, this.audioButton.width, this.audioButton.height);
    this.ctx.fillStyle = audioEnabled ? '#000000' : '#ffffff';
    this.ctx.font = 'bold 16px monospace';
    this.ctx.fillText(`Audio ${audioEnabled ? 'ON' : 'OFF'}`, this.width / 2, audioY + 23);

    // Word Mode toggle
    // Morse Code display toggle
    const morseY = audioY + 45;
    this.morseButton = { x: this.width / 2 - 60, y: morseY, width: 120, height: 35 };
    this.ctx.fillStyle = showMorseCode ? '#0077cc' : '#ff4444';
    this.ctx.fillRect(this.morseButton.x, this.morseButton.y, this.morseButton.width, this.morseButton.height);
    this.ctx.fillStyle = showMorseCode ? '#000000' : '#ffffff';
    this.ctx.font = 'bold 14px monospace';
    this.ctx.fillText(`Morse ${showMorseCode ? 'ON' : 'OFF'}`, this.width / 2, morseY + 23);

    // Word Mode button (now below Morse toggle)
    const wordModeY = morseY + 45;
    this.wordModeButton = { x: this.width / 2 - 60, y: wordModeY, width: 120, height: 35 };
    this.ctx.fillStyle = wordMode ? '#00ff00' : '#333333';
    this.ctx.fillRect(this.wordModeButton.x, this.wordModeButton.y, this.wordModeButton.width, this.wordModeButton.height);
    this.ctx.strokeStyle = '#00ff00';
    this.ctx.strokeRect(this.wordModeButton.x, this.wordModeButton.y, this.wordModeButton.width, this.wordModeButton.height);
    this.ctx.fillStyle = wordMode ? '#000000' : '#ffffff';
    this.ctx.font = 'bold 16px monospace';
    this.ctx.fillText(`Word Mode: ${wordMode ? 'ON' : 'OFF'}`, this.width / 2, wordModeY + 23);

    // Start button
    const startY = wordModeY + 50;
    this.startButton = { x: this.width / 2 - 100, y: startY, width: 200, height: 45 };
    this.ctx.fillStyle = '#cc2020';
    this.ctx.fillRect(this.startButton.x, this.startButton.y, this.startButton.width, this.startButton.height);
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = 'bold 20px monospace';
    this.ctx.fillText('START GAME', this.width / 2, startY + 30);
  }

  // Draw game over screen
  drawGameOver(score, level) {
    this.clear();

    this.ctx.fillStyle = '#ff0000';
    this.ctx.font = 'bold 48px monospace';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('GAME OVER', this.width / 2, 200);

    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = '24px monospace';
    this.ctx.fillText(`Final Score: ${score}`, this.width / 2, 280);
    this.ctx.fillText(`Level Reached: ${level}`, this.width / 2, 320);

    this.ctx.fillStyle = '#00ff00';
    this.ctx.font = '20px monospace';
    this.ctx.fillText('Press ENTER to Restart', this.width / 2, 400);
  }
}
