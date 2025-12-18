import { Graphics } from "pixi.js";

export default class SwipeManager {
  constructor(gameRef) {
    this.game = gameRef;
    this.line = new Graphics();
    
    this.isSwiping = false;
    this.activeWord = "";
    this.activeButtons = [];
  }

  start(btn, fromAutoplay = false) {
    if (this.game.isGameOver) return;
    if (this.game.isAutoplaying && !fromAutoplay) return;

    if (!fromAutoplay) {
      this.game.tutorial.hide();
      this.game.tutorial.cancelAutoplay();
    }

    this.reset();
    this.isSwiping = true;
    this.addButton(btn);
  }

  onMove(e) {
    if (!this.isSwiping) return;

    const p = e.global;

    for (const btn of this.game.tray.buttons) {
      if (this.activeButtons.includes(btn)) continue;
      const dx = p.x - btn.x;
      const dy = p.y - btn.y;
      if (Math.sqrt(dx * dx + dy * dy) < 36) {
        this.addButton(btn);
        break;
      }
    }

    this.drawLine(p);
  }

  addButton(btn) {
    if (btn.isActive) return;

    btn.isActive = true;
    this.activeButtons.push(btn);
    this.activeWord += btn.letter;

    btn.circle.visible = true;
    btn.circle.tint = 0xff9f1a;
    btn.txt.style.fill = 0xffffff;

    this.game.wordPreview.update(this.activeWord);
  }

  drawLine(handPos) {
    if ((!this.isSwiping && !this.game.isAutoplaying) || this.activeButtons.length === 0) {
      return;
    }

    this.line.clear();
    this.line.lineStyle({
      width: 10,
      color: 0xff9f1a,
      cap: "round",
      join: "round",
    });

    if (this.activeButtons.length > 0) {
      this.line.moveTo(this.activeButtons[0].x, this.activeButtons[0].y);

      for (let i = 1; i < this.activeButtons.length; i++) {
        this.line.lineTo(this.activeButtons[i].x, this.activeButtons[i].y);
      }
    }

    if (handPos) {
      this.line.lineTo(handPos.x, handPos.y);
    }
  }

  onUp() {
    if (!this.isSwiping && !this.game.isAutoplaying) return;

    this.isSwiping = false;

    const w = this.activeWord;
    const valid = this.game.validWords.has(w) && !this.game.found.has(w);

    if (valid) {
      this.game.found.add(w);
      this.game.grid.revealWord(w, this.game.wordPreview.container, this.game);
      this.game.wordPreview.hide();

      if (this.game.found.size === this.game.validWords.size) {
        this.game.endGame();
      }
    } else {
      this.game.wordPreview.fail();
    }

    this.reset();
    this.game.tutorial.schedule();
  }

  reset() {
    this.game.tray.resetButtons(this.activeButtons);
    this.activeButtons = [];
    this.activeWord = "";
    this.line.clear();
  }
}