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

  // Draw a rounded rectangle path
  drawRoundedRect(x, y, width, height, radius = 8) {
    const ctx = this.ctx;
    const r = Math.min(radius, width / 2, height / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + width - r, y);
    ctx.arcTo(x + width, y, x + width, y + r, r);
    ctx.lineTo(x + width, y + height - r);
    ctx.arcTo(x + width, y + height, x + width - r, y + height, r);
    ctx.lineTo(x + r, y + height);
    ctx.arcTo(x, y + height, x, y + height - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
  }

  // Draw a styled button (rounded rect + text)
  drawButton(x, y, width, height, text, opts = {}) {
    const ctx = this.ctx;
    const {
      fill = '#333333',
      stroke = null,
      textColor = '#ffffff',
      font = 'bold 18px monospace',
      radius = 8,
      shadow = false
    } = opts;

    ctx.save();
    if (shadow) {
      ctx.shadowColor = 'rgba(0,0,0,0.5)';
      ctx.shadowBlur = 12;
      ctx.shadowOffsetY = 4;
    }

    ctx.fillStyle = fill;
    this.drawRoundedRect(x, y, width, height, radius);
    ctx.fill();

    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = 2;
      this.drawRoundedRect(x, y, width, height, radius);
      ctx.stroke();
    }

    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    ctx.fillStyle = textColor;
    ctx.font = font;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x + width / 2, y + height / 2);
    ctx.restore();
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
    // Optimized button sizes for clean layout
    const btnWidth = 36;
    const btnHeight = 28;
    const btnSpacing = 4;
    const cols = 14; // Better fit for 800px width
    const startX = (this.width - (cols * (btnWidth + btnSpacing) - btnSpacing)) / 2;
    const gridY = 158;

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
      // Draw styled button
      if (isSelected) {
        this.drawButton(x, y, btnWidth, btnHeight, chars[i], {
          fill: '#0077cc',
          stroke: '#00497a',
          textColor: '#000000',
          font: 'bold 20px monospace',
          radius: 6,
          shadow: false
        });
      } else {
        this.drawButton(x, y, btnWidth, btnHeight, chars[i], {
          fill: '#222831',
          stroke: '#444',
          textColor: '#bfc7cc',
          font: 'bold 20px monospace',
          radius: 6,
          shadow: false
        });
      }
    }

    // WPM control - place below the character grid to avoid overlap
    const colsUsed = cols;
    const rowsUsed = Math.ceil(chars.length / colsUsed);
    const gridHeight = rowsUsed * (btnHeight + btnSpacing) - btnSpacing;
    const bottomOfGrid = gridY + gridHeight;
    const paddingAfterGrid = 18;
    const wpmY = bottomOfGrid + paddingAfterGrid;
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = '16px monospace';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('SPEED', this.width / 2, wpmY);

    const wpmBoxY = wpmY + 15;
    const wpmBoxWidth = 140;
    const wpmBoxHeight = 48;
    const wpmBoxX = this.width / 2 - wpmBoxWidth / 2;

    // WPM buttons
    const btnSize = 44;
    const upBtnX = wpmBoxX + wpmBoxWidth + 12;
    const downBtnX = wpmBoxX - btnSize - 12;

    // Up button
    this.wpmButtons.up = { x: upBtnX, y: wpmBoxY, width: btnSize, height: btnSize };
    this.drawButton(upBtnX, wpmBoxY, btnSize, btnSize, '▲', {
      fill: '#1a2a38',
      stroke: '#666666',
      textColor: '#00a3ff',
      font: 'bold 28px monospace',
      radius: 8,
      shadow: false
    });

    // Down button
    this.wpmButtons.down = { x: downBtnX, y: wpmBoxY, width: btnSize, height: btnSize };
    this.drawButton(downBtnX, wpmBoxY, btnSize, btnSize, '▼', {
      fill: '#1a2a38',
      stroke: '#666666',
      textColor: '#00a3ff',
      font: 'bold 28px monospace',
      radius: 8,
      shadow: false
    });

    // WPM display box
    // WPM display box
    this.ctx.fillStyle = '#081421';
    this.drawRoundedRect(wpmBoxX, wpmBoxY, wpmBoxWidth, wpmBoxHeight, 10);
    this.ctx.fill();
    this.ctx.strokeStyle = '#0077cc';
    this.ctx.lineWidth = 2;
    this.drawRoundedRect(wpmBoxX, wpmBoxY, wpmBoxWidth, wpmBoxHeight, 10);
    this.ctx.stroke();
    this.ctx.fillStyle = '#ff6666';
    this.ctx.font = 'bold 26px monospace';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(`${wpm} WPM`, this.width / 2, wpmBoxY + wpmBoxHeight / 2);

    // Toggle buttons in a cleaner layout
    const toggleY = wpmBoxY + wpmBoxHeight + 20;
    const toggleSpacing = 8;
    const toggleWidth = 110;
    const toggleHeight = 42;
    
    // Audio toggle
    const audioX = this.width / 2 - (toggleWidth * 1.5) - toggleSpacing;
    this.audioButton = { x: audioX, y: toggleY, width: toggleWidth, height: toggleHeight };
    this.drawButton(this.audioButton.x, this.audioButton.y, this.audioButton.width, this.audioButton.height, `Audio ${audioEnabled ? 'ON' : 'OFF'}`, {
      fill: audioEnabled ? '#0077cc' : '#444444',
      stroke: audioEnabled ? '#005999' : '#666666',
      textColor: audioEnabled ? '#ffffff' : '#cccccc',
      font: 'bold 16px monospace',
      radius: 8,
      shadow: false
    });

    // Morse display toggle
    const morseX = this.width / 2 - toggleWidth / 2;
    this.morseButton = { x: morseX, y: toggleY, width: toggleWidth, height: toggleHeight };
    this.drawButton(this.morseButton.x, this.morseButton.y, this.morseButton.width, this.morseButton.height, `Morse ${showMorseCode ? 'ON' : 'OFF'}`, {
      fill: showMorseCode ? '#0077cc' : '#444444',
      stroke: showMorseCode ? '#005999' : '#666666',
      textColor: showMorseCode ? '#ffffff' : '#cccccc',
      font: 'bold 16px monospace',
      radius: 8,
      shadow: false
    });

    // Word Mode toggle
    const wordModeX = this.width / 2 + toggleWidth / 2 + toggleSpacing;
    this.wordModeButton = { x: wordModeX, y: toggleY, width: toggleWidth, height: toggleHeight };
    this.drawButton(this.wordModeButton.x, this.wordModeButton.y, this.wordModeButton.width, this.wordModeButton.height, `Word ${wordMode ? 'ON' : 'OFF'}`, {
      fill: wordMode ? '#00aa00' : '#444444',
      stroke: wordMode ? '#007700' : '#666666',
      textColor: '#ffffff',
      font: 'bold 16px monospace',
      radius: 8,
      shadow: false
    });

    // Start button
    const startY = toggleY + toggleHeight + 20;
    this.startButton = { x: this.width / 2 - 120, y: startY, width: 240, height: 50 };
    this.drawButton(this.startButton.x, this.startButton.y, this.startButton.width, this.startButton.height, '🚀 START GAME', {
      fill: '#cc2020',
      stroke: '#8b1414',
      textColor: '#ffffff',
      font: 'bold 24px monospace',
      radius: 12,
      shadow: true
    });
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
