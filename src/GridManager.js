import { Container, Sprite, Text, Texture } from "pixi.js";
import gsap from "gsap";
import { GAME_WIDTH } from "./index";

export default class GridManager {
  constructor(gameRef) {
    this.game = gameRef;
    this.container = new Container();
    this.cells = new Map();
    this.wordToSlot = new Map();
    
    this.cellSize = 72;
    this.gap = 14;
    this.gridStartY = 40;
    this.gridRows = 3;
  }

  build(words) {
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

    // Slot assignment
    const wordList = [...words];
    const top =
      wordList.find(w => w.length === 4) ||
      wordList.reduce((a, b) => (b.length > a.length ? b : a), wordList[0]);

    const rem1 = wordList.filter(w => w !== top);
    const left = rem1.find(w => w[0] === top[0]) || rem1[0];
    const rem2 = rem1.filter(w => w !== left);
    const mid = rem2.find(w => w[0] === top[2]) || rem2[0];
    const bottom = rem2.filter(w => w !== mid)[0];

    this.wordToSlot.set(top, "TOP");
    this.wordToSlot.set(left, "LEFT");
    this.wordToSlot.set(mid, "MID");
    this.wordToSlot.set(bottom, "BOTTOM");

    // Grid layout
    const cols = 4;
    const gridW = cols * this.cellSize + (cols - 1) * this.gap;
    const startX = (GAME_WIDTH - gridW) / 2 - 30;

    // Create cells
    for (const [gx, gy] of shapeCoords) {
      const key = `${gx},${gy}`;

      const gfx = new Sprite(Texture.from("assets/rect.png"));
      gfx.width = this.cellSize;
      gfx.height = this.cellSize;
      gfx.x = startX + gx * (this.cellSize + this.gap) + this.cellSize / 2;
      gfx.y = this.gridStartY + gy * (this.cellSize + this.gap) + this.cellSize / 2;

      const txt = new Text("", {
        fill: 0x333333,
        fontSize: 55,
        fontWeight: "bold",
      });

      txt.anchor.set(0.5);
      gfx.addChild(txt);
      const b = gfx.getLocalBounds();
      txt.position.set(b.x + b.width / 2, b.y + b.height / 2);
      txt.scale.set(2.5);

      this.container.addChild(gfx);

      this.cells.set(key, {
        gfx,
        txt,
        slotChars: new Map(),
      });
    }

    // Bind slots
    this.bindSlot(slots.TOP, top);
    this.bindSlot(slots.LEFT, left);
    this.bindSlot(slots.MID, mid);
    this.bindSlot(slots.BOTTOM, bottom);
  }

  bindSlot(slot, word) {
    if (!slot || !word) return;
    for (let i = 0; i < slot.len; i++) {
      const x = slot.x + (slot.dir === "H" ? i : 0);
      const y = slot.y + (slot.dir === "V" ? i : 0);
      const cell = this.cells.get(`${x},${y}`);
      if (cell) cell.slotChars.set(slot.id, word[i]);
    }
  }

  revealWord(word, wordPreview, parentContainer) {
    const slotId = this.wordToSlot.get(word);
    if (!slotId) return;

    const startX = wordPreview.x;
    const startY = wordPreview.y;
    const targets = [];

    for (const cell of this.cells.values()) {
      const ch = cell.slotChars.get(slotId);
      if (!ch) continue;
      targets.push({ cell, ch });
    }

    targets.forEach((target, index) => {
      const flyTxt = new Text(target.ch, {
        fill: 0xffffff,
        fontSize: 32,
        fontWeight: "bold",
      });

      flyTxt.anchor.set(0.5);
      flyTxt.x = startX;
      flyTxt.y = startY;

      parentContainer.addChild(flyTxt);

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
          parentContainer.removeChild(flyTxt);
          flyTxt.destroy();
        },
      });
    });
  }

  getBottomY() {
    return this.gridStartY + this.gridRows * (this.cellSize + this.gap);
  }
}