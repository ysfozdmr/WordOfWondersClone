import { Container, Graphics, Sprite, Text, Texture } from "pixi.js";
import gsap from "gsap";
import { GAME_WIDTH, GAME_HEIGHT } from "./index";

export default class TrayManager {
  constructor(gameRef, letters) {
    this.game = gameRef;
    this.container = new Container();
    this.letters = letters.split(",");
    this.buttons = [];
    this.shuffleBtn = null;
    
    this.trayCenter = { x: GAME_WIDTH / 2, y: GAME_HEIGHT - 220 };
    this.trayRadius = 70;
  }

  build() {
    const { x: cx, y: cy } = this.trayCenter;

   
    const bg = new Graphics()
      .beginFill(0xffffff)
      .drawCircle(0, 0, 120)
      .endFill();
    bg.alpha = 0.70;
    bg.position.set(cx, cy);
    this.container.addChild(bg);

   
    const shuffle = new Sprite(Texture.from("assets/shuffle.png"));
    shuffle.anchor.set(0.5);
    shuffle.width = 48;
    shuffle.height = 48;
    shuffle.eventMode = "static";
    shuffle.cursor = "pointer";
    shuffle.on("pointerdown", () => this.shuffle());

    this.shuffleBtn = shuffle;
    this.container.addChild(shuffle);

    
    this.layoutButtons();
  }

  layoutButtons() {
    
    for (const b of this.buttons) {
      this.container.removeChild(b);
    }
    this.buttons = [];

    const { x: cx, y: cy } = this.trayCenter;
    const r = this.trayRadius;

    this.letters.forEach((l, i) => {
      const angle = (Math.PI * 2 / this.letters.length) * i - Math.PI / 2;

      const btn = new Container();
      btn.x = cx + Math.cos(angle) * r;
      btn.y = cy + Math.sin(angle) * r;
      btn.eventMode = "static";
      btn.cursor = "pointer";
      btn.letter = l;

      const circle = new Sprite(Texture.from("assets/circle.png"));
      circle.anchor.set(0.5);
      circle.width = 70;
      circle.height = 70;
      circle.visible = false;
      btn.addChild(circle);
      btn.circle = circle;

      const txt = new Text(l, {
        fill: 0xff9f1a,
        fontSize: 46,
        fontWeight: "bold",
      });
      txt.anchor.set(0.5);
      btn.addChild(txt);
      btn.txt = txt;

      btn.isActive = false;
      btn.on("pointerdown", () => this.game.startSwipe(btn));

      this.buttons.push(btn);
      this.container.addChild(btn);
    });

    
    if (this.shuffleBtn) {
      this.shuffleBtn.x = this.trayCenter.x;
      this.shuffleBtn.y = this.trayCenter.y;
    }
  }

  shuffle() {
    if (this.game.isSwiping || this.game.isAutoplaying) return;

    this.game.tutorial.hide();
    this.game.tutorial.cancelAutoplay();

    const { x: cx, y: cy } = this.trayCenter;
    const r = this.trayRadius;

    
    this.buttons.forEach((btn, i) => {
      gsap.to(btn, {
        x: cx,
        y: cy,
        duration: 0.25,
        ease: "power2.inOut",
        delay: i * 0.02,
      });
    });

   
    const shuffledButtons = [...this.buttons];
    for (let i = shuffledButtons.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledButtons[i], shuffledButtons[j]] = [shuffledButtons[j], shuffledButtons[i]];
    }

    
    const positions = this.buttons.map((_, i) => {
      const angle = (Math.PI * 2 / this.buttons.length) * i - Math.PI / 2;
      return {
        x: cx + Math.cos(angle) * r,
        y: cy + Math.sin(angle) * r,
      };
    });

   
    gsap.delayedCall(0.28, () => {
      shuffledButtons.forEach((btn, i) => {
        gsap.to(btn, {
          x: positions[i].x,
          y: positions[i].y,
          duration: 0.45,
          ease: "power3.out",
          delay: i * 0.03,
        });
      });

      this.buttons = shuffledButtons;

      const total = 0.45 + (this.buttons.length - 1) * 0.03;
      gsap.delayedCall(total + 0.05, () => this.game.tutorial.schedule());
    });
  }

  getButtonsForWord(word) {
    const used = new Set();
    const result = [];

    for (const ch of word) {
      const btn = this.buttons.find(b => b.letter === ch && !used.has(b));
      if (!btn) return null;
      used.add(btn);
      result.push(btn);
    }

    return result;
  }

  resetButtons(activeButtons) {
    activeButtons.forEach((b) => {
      gsap.to(b.scale, { x: 1, y: 1, duration: 0.08 });
      b.isActive = false;
      b.circle.visible = false;
      b.txt.style.fill = 0xff9f1a;
    });
  }
}