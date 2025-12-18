// game.js
// v4 – Exact grid (senin istediğin şekil) + Swipe + Line + Center Shuffle button (STABLE)

import { Container, Graphics, Text, Sprite, Assets, Texture } from "pixi.js";
import gsap from "gsap";
import { GAME_WIDTH, GAME_HEIGHT } from ".";

// Eğer senden "0,0,GOLD,H|..." formatı gelirse bunu array'e çeviriyoruz:
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
  lvlWords: ["GOLD", "GOD", "DOG", "LOG"], // veya: "0,0,GOLD,H|0,0,GOD,V|..."
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

    // UI containers
    this.gridContainer = new Container();
    this.addChild(this.gridContainer);

    this.trayContainer = new Container();
    this.addChild(this.trayContainer);


    // Grid + Tray
    this.buildExactGridAndSlots();
    this.buildTray();

    this.line = new Graphics();
    this.trayContainer.addChildAt(this.line, 1);

    // Input
    this.on("pointermove", this.onMove, this);
    this.on("pointerup", this.onUp, this);
    this.on("pointerupoutside", this.onUp, this);

    this.createWordPreview();
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

    // ---- word-slot mapping (AYNI, DOKUNMADIM) ----
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
    const cellSize = 64;     // 🔥 biraz büyüttük
    const gap = 12;

    const cols = 4;
    const gridW = cols * cellSize + (cols - 1) * gap;
    const startX = (GAME_WIDTH - gridW) / 2-20;
    const startY = 40;

    this.cells = new Map();

    for (const [gx, gy] of shapeCoords) {
      const key = `${gx},${gy}`;

      // ---- CELL SPRITE ----
      const gfx = new Sprite(Texture.from("assets/rect.png"));
      gfx.width = cellSize;
      gfx.height = cellSize;


      gfx.x = startX + gx * (cellSize + gap) + cellSize / 2;
      gfx.y = startY + gy * (cellSize + gap) + cellSize / 2;

      // ---- TEXT (NET, STABİL) ----
      const txt = new Text("", {
        fill: 0x333333,
        fontSize: 55,          // 🔥 SABİT VE BÜYÜK
        fontWeight: "bold",
        fontFamily: "Sniglet",
      });

      txt.anchor.set(0.5);
      gfx.addChild(txt);
      const b = gfx.getLocalBounds();
      txt.position.set(
        b.x + b.width / 2,
        b.y + b.height / 2
      );
      txt.scale.set(2.5);       // 🔴 GARANTİ

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

    // 🔥 boyut ver (PNG büyük gelir)
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
    // sadece eski HARF butonlarını kaldır
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

      // 🔵 circle0.png (normalde GİZLİ)
      const circle = new Sprite(Texture.from("assets/circle.png"));
      circle.anchor.set(0.5);

      // 🔥 SABİT BOYUT
      circle.width = 70;
      circle.height = 70;

      circle.visible = false;
      btn.addChild(circle);
      btn.circle = circle;

      // 🔤 TEXT (normalde TURUNCU)
      const txt = new Text(l, {
        fill: 0xff9f1a,
        fontSize: 46,
        fontWeight: "bold",
        fontFamily: "Sniglet",
      });
      txt.anchor.set(0.5);
      btn.addChild(txt);
      btn.txt = txt;

      btn.isActive = false;

      btn.on("pointerdown", () => this.startSwipe(btn));

      this.buttons.push(btn);
      this.trayContainer.addChild(btn);
    });
    // 🔥 Shuffle her zaman EN ÜSTTE olsun
    if (this.shuffleBtn) {
      this.trayContainer.removeChild(this.shuffleBtn);
      this.trayContainer.addChild(this.shuffleBtn);

      this.shuffleBtn.x = this.trayCenter.x;
      this.shuffleBtn.y = this.trayCenter.y;
    }

  }

  shuffleLetters() {
    if (this.isSwiping) return;

    const { x: cx, y: cy } = this.trayCenter;
    const r = this.trayRadius;

    // 1) Harfleri merkeze topla
    this.buttons.forEach((btn, i) => {
      gsap.to(btn, {
        x: cx,
        y: cy,
        duration: 0.25,
        ease: "power2.inOut",
        delay: i * 0.02,
      });
    });

    // ❌ 2) this.shuffleBtn rotation KALDIR (buton dönmesin)
    // gsap.to(this.shuffleBtn, { rotation: this.shuffleBtn.rotation + Math.PI * 2, ... });

    // ✅ 3) BUTONLARI gerçekten karıştır (pozisyonlar değişsin)
    const shuffledButtons = [...this.buttons];
    for (let i = shuffledButtons.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledButtons[i], shuffledButtons[j]] = [shuffledButtons[j], shuffledButtons[i]];
    }

    // 4) Yeni hedef pozisyonları hesapla (slot pozisyonları sabit)
    const positions = this.buttons.map((_, i) => {
      const angle = (Math.PI * 2 / this.buttons.length) * i - Math.PI / 2;
      return {
        x: cx + Math.cos(angle) * r,
        y: cy + Math.sin(angle) * r,
      };
    });

    // 5) Merkezden dağıt: karışmış butonları yeni slotlara gönder
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

      // önemli: bundan sonra hit-test vb. için sıralama da karışmış olsun
      this.buttons = shuffledButtons;
    });
  }



  /* ================= SWIPE + LINE ================= */
  startSwipe(btn) {

    if (this.isGameOver) return;

    this.resetSwipe();
    this.isSwiping = true;
    this.addButton(btn);

  }

  onMove(e) {
    if (!this.isSwiping) return;

    const p = e.global;

    // Manual hit-test on letter buttons
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

    // 🔥 swipe görünümü
    btn.circle.visible = true;
    btn.circle.tint = 0xff9f1a;   // ← BUNU EKLEDİN
    btn.txt.style.fill = 0xffffff;

    this.updateWordPreview();
  }

  drawLine(p) {
    this.line.clear();
    this.line.lineStyle({
      width: 10,
      color: 0xff9f1a,
      cap: "round",
      join: "round",
    });

    this.activeButtons.forEach((b, i) => {
      if (i === 0) this.line.moveTo(b.x, b.y);
      else this.line.lineTo(b.x, b.y);
    });

    if (p) this.line.lineTo(p.x, p.y);
  }

  onUp() {
    if (!this.isSwiping) return;
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
      // 🔥 BEYAZ UÇAN HARF
      const flyTxt = new Text(target.ch, {
        fill: 0xffffff,
        fontSize: 32,
        fontWeight: "bold",
        fontFamily: "Sniglet",
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
          // 🔥 %65'e gelince cell turunculaşsın
          if (this.progress() > 0.65 && !target.cell._highlighted) {
            target.cell._highlighted = true;
            target.cell.gfx.tint = 0xff9f1a;
          }
        },

        onComplete: () => {
          // grid yazısı
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
      fontFamily: "Sniglet",
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
    // Artık swipe yapılamasın
    this.isGameOver = true;

    // Input'u kilitle
    this.eventMode = "none";

    // Küçük gecikme (son kelime animasyonu bitsin)
    gsap.delayedCall(0.4, () => {
      const complete = new Text("LEVEL COMPLETE", {
        fill: 0xffffff,
        fontSize: 36,
        fontWeight: "bold",
        fontFamily: "Sniglet",
      });

      complete.anchor.set(0.5);
      complete.x = GAME_WIDTH / 2;
      complete.y = GAME_HEIGHT / 2;

      this.addChild(complete);

      gsap.from(complete.scale, {
        x: 0,
        y: 0,
        duration: 0.6,
        ease: "back.out",
      });
    });
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




}