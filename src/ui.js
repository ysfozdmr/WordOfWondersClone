// ui.js
import { Container, Sprite, Text, Texture } from "pixi.js";
import { gsap } from "gsap";

/**
 * Init UI state
 */
export function initUI(game) {
  game.wordPreview = null;
  game.tutorialHint = null;
  game.playNow = null;
}

/**
 * Build word preview panel
 */
export function buildWordPreview(game) {
  const panel = new Container();
  panel.visible = false;

  const bg = new Sprite(Texture.from("assets/orangePanel.png"));
  bg.anchor.set(0.5);
  panel.addChild(bg);

  const txt = new Text("", {
    fill: 0xffffff,
    fontFamily: "Sniglet",
    fontSize: 36,
    fontWeight: "bold",
  });
  txt.anchor.set(0.5);
  panel.addChild(txt);

  panel.bg = bg;
  panel.txt = txt;

  panel.x = game.wordPreviewX;
  panel.y = game.wordPreviewY;

  game.wordPreview = panel;
  game.addChild(panel);
}

/**
 * Update word preview text
 */
export function updateWordPreview(game, text) {
  if (!game.wordPreview) return;

  game.wordPreview.txt.text = text;
  game.wordPreview.bg.width =
    game.wordPreview.txt.width + 60;

  game.wordPreview.visible = true;
}

/**
 * Hide word preview
 */
export function hideWordPreview(game) {
  if (game.wordPreview) {
    game.wordPreview.visible = false;
  }
}

/**
 * Build tutorial hint panel
 */
export function buildTutorialHint(game) {
  const panel = new Container();
  panel.visible = false;

  const bg = new Sprite(Texture.from("assets/greenPanel.png"));
  bg.anchor.set(0.5);
  panel.addChild(bg);

  const txt = new Text("", {
    fill: 0xffffff,
    fontFamily: "Sniglet",
    fontSize: 32,
    fontWeight: "bold",
  });
  txt.anchor.set(0.5);
  panel.addChild(txt);

  panel.bg = bg;
  panel.txt = txt;

  panel.x = game.tutorialHintX;
  panel.y = game.tutorialHintY;

  game.tutorialHint = panel;
  game.addChild(panel);
}

/**
 * Update tutorial hint text
 */
export function updateTutorialHint(game, word) {
  if (!game.tutorialHint) return;

  game.tutorialHint.txt.text = word;
  game.tutorialHint.bg.width =
    game.tutorialHint.txt.width + 50;

  game.tutorialHint.visible = true;
}

/**
 * Build Play Now button
 */
export function buildPlayNow(game) {
  const btn = new Container();
  btn.visible = false;

  const bg = new Sprite(Texture.from("assets/playNow.png"));
  bg.anchor.set(0.5);
  btn.addChild(bg);

  const txt = new Text("PLAY NOW!", {
    fill: 0xffffff,
    fontFamily: "Sniglet",
    fontSize: 36,
    fontWeight: "bold",
  });
  txt.anchor.set(0.5);
  btn.addChild(txt);

  btn.x = game.playNowX;
  btn.y = game.playNowY;

  // pulse animation (sürekli)
  gsap.to(btn.scale, {
    x: 1.1,
    y: 1.1,
    duration: 0.8,
    yoyo: true,
    repeat: -1,
    ease: "sine.inOut",
  });

  game.playNow = btn;
  game.addChild(btn);
}

/**
 * Show end screen
 */
export function showEndScreen(game) {
  // grid + tray gizleme game.js’te yapılmış olmalı
  // burada sadece UI açıyoruz

  const title = new Text("WORDS OF\nWONDERS", {
    fill: 0xffffff,
    fontSize: 58,
    fontFamily: "Sniglet",
    fontWeight: "bold",
    align: "center",
  });

  title.anchor.set(0.5);
  title.x = game.width / 2;
  title.y = 150;

  game.addChild(title);

  gsap.from(title, {
    alpha: 0,
    y: title.y - 30,
    duration: 0.6,
    ease: "power2.out",
  });

  if (game.playNow) {
    game.playNow.visible = true;
    game.playNow.alpha = 1;
    game.playNow.scale.set(1.15);
    game.playNow.y = game.playNowY - 40;

    gsap.from(game.playNow, {
      alpha: 0,
      scale: 0.9,
      duration: 0.5,
      ease: "power2.out",
    });
  }
}
