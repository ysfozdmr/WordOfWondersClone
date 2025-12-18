// tray.js
import { Container, Sprite, Text, Texture } from "pixi.js";

/**
 * Tray init
 */
export function initTray(game) {
  game.buttons = [];
  game.activeButtons = [];
}

/**
 * Build tray UI
 */
export function buildTray(game) {
  game.trayContainer = new Container();
  game.addChild(game.trayContainer);

  layoutTrayButtons(game);
}

/**
 * Layout tray buttons (letters + shuffle)
 */
export function layoutTrayButtons(game) {
  // eski harf butonlarını kaldır
  for (const b of game.buttons) {
    game.trayContainer.removeChild(b);
  }
  game.buttons = [];

  const { x: cx, y: cy } = game.trayCenter;
  const r = game.trayRadius;

  game.letters.forEach((l, i) => {
    const angle = (Math.PI * 2 / game.letters.length) * i - Math.PI / 2;

    const btn = new Container();
    btn.x = cx + Math.cos(angle) * r;
    btn.y = cy + Math.sin(angle) * r;
    btn.eventMode = "static";
    btn.cursor = "pointer";
    btn.letter = l;

    // 🔵 circle
    const circle = new Sprite(Texture.from("assets/circle0.png"));
    circle.anchor.set(0.5);
    circle.width = 70;
    circle.height = 70;
    circle.visible = false;
    btn.addChild(circle);
    btn.circle = circle;

    // 🔤 text
    const txt = new Text(l, {
      fill: 0xff9f1a,
      fontSize: 46,
      fontWeight: "bold",
      fontFamily: "Sniglet",
    });
    txt.anchor.set(0.5);
    btn.addChild(txt);
    btn.txt = txt;

    btn.on("pointerdown", () => startSwipe(game, btn));

    game.buttons.push(btn);
    game.trayContainer.addChild(btn);
  });
}

/**
 * Start swipe
 */
export function startSwipe(game, btn, fromAutoplay = false) {
  if (game.isGameOver) return;
  if (game.isAutoplaying && !fromAutoplay) return;

  if (!fromAutoplay) {
    game.hideTutorialHand?.();
    game.cancelAutoplay?.();
  }

  resetSwipe(game);
  game.isSwiping = true;
  addButton(game, btn);
}

/**
 * Add button to active swipe
 */
export function addButton(game, btn) {
  if (game.activeButtons.includes(btn)) return;

  game.activeButtons.push(btn);

  btn.circle.visible = true;
  btn.circle.tint = 0xff9f1a;
  btn.txt.style.fill = 0xffffff;
}

/**
 * Reset swipe
 */
export function resetSwipe(game) {
  for (const b of game.activeButtons) {
    b.circle.visible = false;
    b.txt.style.fill = 0xff9f1a;
  }
  game.activeButtons.length = 0;
  game.isSwiping = false;
}

/**
 * Shuffle letters
 */
export function shuffleLetters(game) {
  for (let i = game.letters.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [game.letters[i], game.letters[j]] = [
      game.letters[j],
      game.letters[i],
    ];
  }

  layoutTrayButtons(game);
}
