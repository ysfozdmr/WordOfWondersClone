
import { Container, Graphics, Text, Sprite, Assets, Texture } from "pixi.js";
import gsap from "gsap";
import { GAME_WIDTH, GAME_HEIGHT } from ".";

function parseWords(input) {
  if (Array.isArray(input)) return input;
  if (typeof input === "string") {
    return input
      .split("|")
      .map((p) => p.split(",")[2])
      .filter(Boolean);
  }
  return [];
}

const levelData = {
  lvlLetters: "G,O,D,L",
  lvlWords: ["GOLD", "GOD", "DOG", "LOG"], 
};

export default class Game extends Container {
  constructor() {
    super();
    this.loadBackground();
    this.eventMode = "static";

    this.words = parseWords(levelData.lvlWords);
    this.validWords = new Set(this.words);

    this.isSwiping = false;
    this.activeWord = "";
    this.activeButtons = [];
    this.found = new Set();

    this.tutorialLoopCount = 0;   
    this.autoplayAfterLoops = 2;  

   
    this.gridContainer = new Container();
    this.addChild(this.gridContainer);

    this.trayContainer = new Container();
    this.addChild(this.trayContainer);

    this.autoplayTimeout = null;
    this.isAutoplaying = false;

    this.autoplayStepDuration = 1.2;

    // Grid + Tray
    this.buildExactGridAndSlots();
    this.buildTutorialHintPanel();
    this.buildTray();
    this.buildPlayNow();

    this.line = new Graphics();
    this.trayContainer.addChildAt(this.line, 1);

    // Input
    this.on("pointermove", this.onMove, this);
    this.on("pointerup", this.onUp, this);
    this.on("pointerupoutside", this.onUp, this);

    this.createWordPreview();




    this.buildTutorialHand();
    this.scheduleTutorialHand();
  }


  /* ================= GRID: EXACT SHAPE + SLOT MAPPING ================= */
  buildExactGridAndSlots() {
    const shapeCoords = [
      [0, 0], [1, 0], [2, 0], [3, 0],
      [0, 1], [2, 1],
      [0, 2], [1, 2], [2, 2],
    ];

    const slots = {
      TOP: { id: "TOP", x: 0, y: 0, dir: "H", len: 4 },
      LEFT: { id: "LEFT", x: 0, y: 0, dir: "V", len: 3 },
      BOTTOM: { id: "BOTTOM", x: 0, y: 2, dir: "H", len: 3 },
      MID: { id: "MID", x: 2, y: 0, dir: "V", len: 3 },
    };

   
    const words = [...this.words];
    const top =
      words.find(w => w.length === 4) ||
      words.reduce((a, b) => (b.length > a.length ? b : a), words[0]);

    const rem1 = words.filter(w => w !== top);
    const left = rem1.find(w => w[0] === top[0]) || rem1[0];
    const rem2 = rem1.filter(w => w !== left);
    const mid = rem2.find(w => w[0] === top[2]) || rem2[0];
    const bottom = rem2.filter(w => w !== mid)[0];

    this.wordToSlot = new Map();
    this.wordToSlot.set(top, "TOP");
    this.wordToSlot.set(left, "LEFT");
    this.wordToSlot.set(mid, "MID");
    this.wordToSlot.set(bottom, "BOTTOM");

    // ---- GRID LAYOUT ----
    const cellSize = 72;   
    const gap = 14;

    const cols = 4;
    const gridW = cols * cellSize + (cols - 1) * gap;
    const startX = (GAME_WIDTH - gridW) / 2 - 30;
    const startY = 40;

    this.cellSize = cellSize;
    this.gap = gap;
    this.gridStartY = startY;
    this.gridRows = 3;

    this.cells = new Map();

    for (const [gx, gy] of shapeCoords) {
      const key = `${gx},${gy}`;

      // ---- CELL SPRITE ----
      const gfx = new Sprite(Texture.from("assets/rect.png"));
      gfx.width = cellSize;
      gfx.height = cellSize;


      gfx.x = startX + gx * (cellSize + gap) + cellSize / 2;
      gfx.y = startY + gy * (cellSize + gap) + cellSize / 2;

      // ---- TEXT  ----
      const txt = new Text("", {
        fill: 0x333333,
        fontSize: 55,          
        fontWeight: "bold",

      });

      txt.anchor.set(0.5);
      gfx.addChild(txt);
      const b = gfx.getLocalBounds();
      txt.position.set(
        b.x + b.width / 2,
        b.y + b.height / 2
      );
      txt.scale.set(2.5);      

      this.gridContainer.addChild(gfx);

      this.cells.set(key, {
        gfx,
        txt,
        slotChars: new Map(),
      });
    }

    // ---- SLOT BIND ----
    const bind = (slot, word) => {
      if (!slot || !word) return;
      for (let i = 0; i < slot.len; i++) {
        const x = slot.x + (slot.dir === "H" ? i : 0);
        const y = slot.y + (slot.dir === "V" ? i : 0);
        const cell = this.cells.get(`${x},${y}`);
        if (cell) cell.slotChars.set(slot.id, word[i]);
      }
    };

    bind(slots.TOP, top);
    bind(slots.LEFT, left);
    bind(slots.MID, mid);
    bind(slots.BOTTOM, bottom);
  }


  /* ================= TRAY + SHUFFLE ================= */
  buildTray() {
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT - 220;

    this.trayCenter = { x: cx, y: cy };
    this.trayRadius = 70;

    // Background circle
    const bg = new Graphics().beginFill(0xffffff).drawCircle(0, 0, 120).endFill();
    bg.alpha = 0.70;
    bg.position.set(cx, cy);
    this.trayContainer.addChild(bg);

    // Shuffle button (center)
    const shuffle = new Sprite(Texture.from("assets/shuffle.png"));
    shuffle.anchor.set(0.5);

   
    shuffle.width = 48;
    shuffle.height = 48;

    shuffle.eventMode = "static";
    shuffle.cursor = "pointer";

    shuffle.on("pointerdown", () => this.shuffleLetters());

    this.shuffleBtn = shuffle;
    this.trayContainer.addChild(shuffle);

    // Letters
    this.letters = levelData.lvlLetters.split(",");
    this.buttons = [];
    this.layoutTrayButtons();
  }

  layoutTrayButtons() {
    
    for (const b of this.buttons) {
      this.trayContainer.removeChild(b);
    }
    this.buttons = [];

    const { x: cx, y: cy } = this.trayCenter;
    const r = this.trayRadius;

    this.letters.forEach((l, i) => {
      const angle = (Math.PI * 2 / this.letters.length) * i - Math.PI / 2;

      // 🔥 BUTTON = CONTAINER
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

      btn.on("pointerdown", () => this.startSwipe(btn));

      this.buttons.push(btn);
      this.trayContainer.addChild(btn);
    });
   
    if (this.shuffleBtn) {
      this.shuffleBtn.x = this.trayCenter.x;
      this.shuffleBtn.y = this.trayCenter.y;


      if (this.line && this.trayContainer.children.includes(this.line)) {
       
        this.trayContainer.setChildIndex(this.shuffleBtn, this.trayContainer.getChildIndex(this.line) + 1);
      }
    }

  }

  shuffleLetters() {
    if (this.isSwiping) return;
    if (this.isAutoplaying) return;

    this.hideTutorialHand();
    this.cancelAutoplay();


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
      gsap.delayedCall(total + 0.05, () => this.scheduleTutorialHand());
    });

  }



  /* ================= SWIPE + LINE ================= */
  startSwipe(btn, fromAutoplay = false) {
    if (this.isGameOver) return;

    if (this.isAutoplaying && !fromAutoplay) return;

    if (!fromAutoplay) {
      this.hideTutorialHand();
      this.cancelAutoplay();
    }

    this.resetSwipe();
    this.isSwiping = true;
    this.addButton(btn);
  }




  onMove(e) {
    if (!this.isSwiping) return;

    const p = e.global;


    for (const btn of this.buttons) {
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

    this.updateWordPreview();
  }

  drawLine(handPos) {
    if (
      (!this.isSwiping && !this.isAutoplaying) ||
      this.activeButtons.length === 0
    ) return;

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
    if (!this.isSwiping && !this.isAutoplaying) return;

    this.isSwiping = false;

    const w = this.activeWord;
    const valid = this.validWords.has(w) && !this.found.has(w);

    if (valid) {
      this.found.add(w);
      this.revealWord(w);
      this.hideWordPreview();

      if (this.found.size === this.validWords.size) {
        this.endGame();
      }
    } else {
      this.failWordPreview();
    }

    this.resetSwipe();

    this.scheduleTutorialHand();

  }

  /* ================= REVEAL (slot based) ================= */
  revealWord(word) {
    const slotId = this.wordToSlot.get(word);
    if (!slotId) return;

    const startX = this.wordPreview.x;
    const startY = this.wordPreview.y;

    const targets = [];

    for (const cell of this.cells.values()) {
      const ch = cell.slotChars.get(slotId);
      if (!ch) continue;
      targets.push({ cell, ch });
    }

    this.hideWordPreview();

    targets.forEach((target, index) => {
    
      const flyTxt = new Text(target.ch, {
        fill: 0xffffff,
        fontSize: 32,
        fontWeight: "bold",

      });

      flyTxt.anchor.set(0.5);
      flyTxt.x = startX;
      flyTxt.y = startY;

      this.addChild(flyTxt);

      const cellGlobal = target.cell.gfx.getGlobalPosition();
      const destX = cellGlobal.x + target.cell.gfx.width / 2;
      const destY = cellGlobal.y + target.cell.gfx.height / 2;

      gsap.to(flyTxt, {
        x: destX,
        y: destY,
        duration: 0.55,
        delay: index * 0.08,
        ease: "power2.inOut",

        onUpdate: function () {
        
          if (this.progress() > 0.65 && !target.cell._highlighted) {
            target.cell._highlighted = true;
            target.cell.gfx.tint = 0xff9f1a;
          }
        },

        onComplete: () => {
     
          target.cell.txt.text = target.ch;
          target.cell.txt.style.fill = 0xffffff;

          this.removeChild(flyTxt);
          flyTxt.destroy();
        },
      });

    });
  }


  resetSwipe() {
    this.activeButtons.forEach((b) => {
      gsap.to(b.scale, { x: 1, y: 1, duration: 0.08 });

      b.isActive = false;
      b.circle.visible = false;
      b.txt.style.fill = 0xff9f1a;
    });

    this.activeButtons = [];
    this.activeWord = "";
    this.line.clear();
  }
  /* ================= Word Preview ================= */
  createWordPreview() {
    this.wordPreview = new Container();
    this.wordPreview.visible = false;
    this.addChild(this.wordPreview);

    const bg = new Graphics()
      .beginFill(0xff9f1a)
      .drawRoundedRect(-40, -22, 80, 44, 12)
      .endFill();

    const txt = new Text("", {
      fill: 0xffffff,
      fontSize: 24,
      fontWeight: "bold",

    });
    txt.anchor.set(0.5);

    this.wordPreview.addChild(bg, txt);

    this.wordPreview.bg = bg;
    this.wordPreview.txt = txt;

  }

  updateWordPreview() {
    const wp = this.wordPreview;
    wp.visible = true;
    wp.alpha = 1;

    wp.txt.text = this.activeWord;

    const padding = 20;
    const w = wp.txt.width + padding * 2;

    wp.bg.clear()
      .beginFill(0xff9f1a)
      .drawRoundedRect(-w / 2, -22, w, 44, 12)
      .endFill();


    wp.x = this.trayCenter.x;
    wp.y = this.trayCenter.y - this.trayRadius - 80;
  }



  hideWordPreview() {
    gsap.to(this.wordPreview, {
      alpha: 0,
      duration: 0.15,
      onComplete: () => {
        this.wordPreview.visible = false;
      },
    });
  }

  failWordPreview() {
    const wp = this.wordPreview;

    gsap.fromTo(
      wp,
      { x: wp.x - 6 },
      {
        x: wp.x + 6,
        duration: 0.06,
        yoyo: true,
        repeat: 4,
        onComplete: () => this.hideWordPreview(),
      }
    );
  }

  /* ================= Game End ================= */

  endGame() {
    this.isGameOver = true;

   
    this.eventMode = "none";


    this.hideTutorialHand();
    this.cancelAutoplay();

    gsap.delayedCall(0.8, () => {
      this.showEndScreen();
    });
  }
  showEndScreen() {
  
    this.gridContainer.visible = false;
    this.trayContainer.visible = false;
    this.wordPreview.visible = false;
    this.line.clear();


    const title = new Text("WORDS OF\nWONDERS", {
      fill: 0xffffff,
      fontSize: 58,
      fontWeight: "bold",
      align: "center",
      fontFamily: "Sniglet",
    });

    title.anchor.set(0.5);
    title.x = GAME_WIDTH / 2;
    title.y = 140;
    this.addChild(title);

    gsap.from(title, {
      alpha: 0,
      y: title.y - 25,
      duration: 0.6,
      ease: "power2.out",
    });


    if (this.playNow) {
      this.playNow.visible = true;

  
      this.playNow.y = GAME_HEIGHT - 240;


      this.playNow.scale.set(1.30);

  
      gsap.from(this.playNow, {
        alpha: 0,
        scale: 0.9,
        duration: 0.35,
        ease: "power2.out",
      });
    }
  }


  /* ================= Sprite and Textures ================= */

  async loadBackground() {
    console.log("BG: load start");

    const texture = await Assets.load("assets/bg.png");
    console.log("BG: texture loaded", texture);

    const bg = new Sprite(texture);
    console.log("BG: sprite created");

    bg.width = GAME_WIDTH;
    bg.height = GAME_HEIGHT;
    bg.x = 0;
    bg.y = 0;

    this.addChildAt(bg, 0);
    console.log("BG: added to stage", this.children);

    this.bg = bg;
  }

  buildPlayNow() {
   
    const cta = new Container();

  
    const bg = new Sprite(Texture.from("assets/install0.png"));
    bg.anchor.set(0.5);


    bg.width = 220;
    bg.height = 64;

   
    const txt = new Text("PLAY NOW!", {
      fill: 0xffffff,
      fontSize: 28,
      fontWeight: "bold",
     
    });
    txt.anchor.set(0.5);


    cta.addChild(bg, txt);

 
    cta.x = GAME_WIDTH / 2;
    cta.y = GAME_HEIGHT - 65;

   
    this.addChild(cta);

   
    gsap.to(cta.scale, {
      x: 1.08,
      y: 1.08,
      duration: 0.8,
      yoyo: true,
      repeat: -1,
      ease: "sine.inOut",
    });

  
    this.playNow = cta;
  }
  /* ================= Tutorial and Auto Play ================= */
  buildTutorialHand() {
    this.hand = new Sprite(Texture.from("assets/hand.png"));
    this.hand.anchor.set(0.2, 0.1); 
    this.hand.scale.set(0.4);
    this.hand.visible = false;

    this.addChild(this.hand);

    this.tutorialTimeout = null;
  }
  scheduleTutorialHand() {
    clearTimeout(this.tutorialTimeout);

   
    if (this.isGameOver || this.isAutoplaying) return;

    this.tutorialTimeout = setTimeout(() => {
      this.showTutorialHand();
    }, 7000); 
  }

  hideTutorialHand() {
    clearTimeout(this.tutorialTimeout);

    if (this.tutorialHint) this.tutorialHint.visible = false;

    if (this.handTL) {
      this.handTL.kill();
      this.handTL = null;
    }

    if (this.hand) {
      gsap.killTweensOf(this.hand);
      gsap.to(this.hand, {
        alpha: 0,
        duration: 0.2,
        ease: "sine.in",
        onComplete: () => {
          this.hand.visible = false;
        },
      });
    }
  }

  getTutorialWord() {
    return this.words.find(w => !this.found.has(w));
  }

  getButtonsForWord(word) {
    const used = new Set();
    const result = [];

    for (const ch of word) {
      const btn = this.buttons.find(
        b => b.letter === ch && !used.has(b)
      );
      if (!btn) return null;

      used.add(btn);
      result.push(btn);
    }

    return result;
  }
  showTutorialHand() {
    if (this.isGameOver) return;
    if (this.isAutoplaying) return;

    const word = this.getTutorialWord();
    if (!word) return;

    const btns = this.getButtonsForWord(word);
    if (!btns || btns.length === 0) return;

 
    this.updateTutorialHint(word);
    if (this.tutorialHint) this.tutorialHint.visible = true;


    if (this.handTL) {
      this.handTL.kill();
      this.handTL = null;
    }

    this.tutorialLoopCount = 0;

    const toHandPos = (btn) => {
      const gp = btn.getGlobalPosition();   
      const lp = this.toLocal(gp);         
      return { x: lp.x, y: lp.y - 10 };
    };

  
    const firstP = toHandPos(btns[0]);
    this.hand.visible = true;
    this.hand.alpha = 0;
    this.hand.position.set(firstP.x, firstP.y);
    gsap.to(this.hand, { alpha: 1, duration: 0.18, ease: "sine.out" });

   
    this.handTL = gsap.timeline({
      repeat: -1,
      repeatDelay: 0.7,
      onRepeat: () => {
        this.tutorialLoopCount++;

      
        if (this.tutorialLoopCount >= this.autoplayAfterLoops && !this.isAutoplaying) {
          
          if (this.handTL) {
            this.handTL.kill();
            this.handTL = null;
          }
          this.startAutoplay();
        }
      },
    });

    btns.forEach((btn, i) => {
      this.handTL.to(this.hand, {
        x: () => toHandPos(btn).x,
        y: () => toHandPos(btn).y,
        duration: 0.7,         
        ease: "power1.inOut",
      }, i === 0 ? 0 : "+=0.04");
    });
  }




  buildTutorialHintPanel() {
    this.tutorialHint = new Container();

    
    const bg = new Sprite(Texture.from("assets/greenPanel.png"));
    bg.anchor.set(0.5);

    
    bg.width = 260;
    bg.height = 40;

   
    const txt = new Text("", {
      fill: 0xffffff,
      fontSize: 22,
      fontWeight: "bold",
      fontFamily: "Sniglet",
    });
    txt.anchor.set(0.5);

    this.tutorialHint.addChild(bg, txt);

    this.tutorialHint.bg = bg;
    this.tutorialHint.txt = txt;

   
    const gridBottomY =
      this.gridStartY +
      this.gridRows * (this.cellSize + this.gap);

    this.tutorialHint.x = GAME_WIDTH / 2;
    this.tutorialHint.y = gridBottomY + 60;

    this.addChild(this.tutorialHint);
    this.setChildIndex(this.tutorialHint, this.children.length - 1);
    this.tutorialHint.visible = false;

  }

  updateTutorialHint(word) {
    if (!this.tutorialHint) return;

    this.tutorialHint.txt.text = `Connect the letters ${word}`;
  }
  scheduleAutoplay() {
    clearTimeout(this.autoplayTimeout);

    this.autoplayTimeout = setTimeout(() => {
      this.startAutoplay();
    }, 5000); 
  }
  cancelAutoplay() {
    clearTimeout(this.autoplayTimeout);
    this.isAutoplaying = false;

    if (this.autoplayTL) {
      this.autoplayTL.kill();
      this.autoplayTL = null;
    }
  }


  startAutoplay() {
    if (this.isGameOver) return;
    if (this.isAutoplaying) return;

    const word = this.getTutorialWord();
    if (!word) return;

    const btns = this.getButtonsForWord(word);
    if (!btns || btns.length === 0) return;

    this.isAutoplaying = true;

   
    if (this.handTL) {
      this.handTL.kill();
      this.handTL = null;
    }

    
    this.resetSwipe();
    this.isSwiping = true;

    const toLocalPos = (btn) => {
      const gp = btn.getGlobalPosition();
      return this.toLocal(gp);
    };


    const firstPos = toLocalPos(btns[0]);
    this.hand.visible = true;
    this.hand.alpha = 1;
    this.hand.position.set(firstPos.x, firstPos.y - 10);

    this.drawLine({ x: this.hand.x, y: this.hand.y });

   
    this.addButton(btns[0]);

 
    if (this.autoplayTL) {
      this.autoplayTL.kill();
    }

    this.autoplayTL = gsap.timeline();

   
    for (let i = 1; i < btns.length; i++) {
      const btn = btns[i];
      const p = toLocalPos(btn);

      this.autoplayTL.to(this.hand, {
        x: p.x,
        y: p.y - 10,
        duration: this.autoplayStepDuration,
        ease: "power1.inOut",

       
        onUpdate: () => {
          this.drawLine({ x: this.hand.x, y: this.hand.y });
        },

       
        onComplete: () => {
          this.addButton(btn);
        }
      });
    }

   
    this.autoplayTL.call(() => {
      this.finishAutoplay();
    });
  }



  finishAutoplay() {
    if (this.autoplayTL) {
      this.autoplayTL.kill();
      this.autoplayTL = null;
    }

    this.isSwiping = true;

    gsap.delayedCall(0.18, () => {
      this.onUp();

      this.isAutoplaying = false;

      this.hideTutorialHand();
      this.scheduleTutorialHand();
    });
  }



}