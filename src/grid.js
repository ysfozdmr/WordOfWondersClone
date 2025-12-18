// grid.js
import { Container, Sprite, Text, Texture } from "pixi.js";

/**
 * Init grid state
 */
export function initGrid(game) {
  game.cells = new Map();
  game.wordToSlot = new Map();
}

/**
 * Build grid + slots
 */
export function buildExactGridAndSlots(game) {
  game.gridContainer = new Container();
  game.addChild(game.gridContainer);

  parseWords(game);

  for (const [slotId, letters] of game.wordToSlot.entries()) {
    letters.forEach((ch, index) => {
      createCell(game, slotId, ch, index);
    });
  }
}

/**
 * Parse words into slot structure
 */
function parseWords(game) {
  game.wordToSlot.clear();
  game.words.forEach((word, slotId) => {
    game.wordToSlot.set(slotId, word.split(""));
  });
}

/**
 * Create single cell
 */
function createCell(game, slotId, ch, index) {
  const cell = new Container();

  const col = index;
  const row = slotId;

  const x = game.gridStartX + col * game.cellSize;
  const y = game.gridStartY + row * game.cellSize;

  cell.x = x;
  cell.y = y;

  const bg = new Sprite(Texture.from("assets/rect.png"));
  bg.anchor.set(0.5);
  bg.width = game.cellSize;
  bg.height = game.cellSize;
  cell.addChild(bg);

  const txt = new Text("", {
    fill: 0xffffff,
    fontSize: 48,
    fontFamily: "Sniglet",
    fontWeight: "bold",
  });
  txt.anchor.set(0.5);
  cell.addChild(txt);

  cell.gfx = bg;
  cell.txt = txt;
  cell.slotId = slotId;
  cell.index = index;

  game.cells.set(`${slotId}_${index}`, cell);
  game.gridContainer.addChild(cell);
}

/**
 * Reveal word into grid
 */
export function revealWord(game, word) {
  const slotId = game.words.indexOf(word);
  if (slotId === -1) return;

  for (const cell of game.cells.values()) {
    if (cell.slotId !== slotId) continue;

    const ch = game.wordToSlot.get(slotId)[cell.index];
    if (!ch) continue;

    cell.txt.text = ch;
  }
}
