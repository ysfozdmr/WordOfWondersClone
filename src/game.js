import { Container } from "pixi.js";
import gsap from "gsap";

import GridManager from "./GridManager";
import TrayManager from "./TrayManager";
import SwipeManager from "./SwipeManager";
import WordPreview from "./WordPreview";
import TutorialManager from "./TutorialManager";
import UIManager from "./UIManager";

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
    this.eventMode = "static";


    this.words = parseWords(levelData.lvlWords);
    this.validWords = new Set(this.words);
    this.found = new Set();
    this.isGameOver = false;
    this.isAutoplaying = false;


    this.ui = new UIManager();
    this.grid = new GridManager(this);
    this.tray = new TrayManager(this, levelData.lvlLetters);
    this.swipe = new SwipeManager(this);
    this.wordPreview = new WordPreview(this.tray.trayCenter, this.tray.trayRadius);
    this.tutorial = new TutorialManager(this);

    this.init();
  }

  async init() {

    const bg = await this.ui.loadBackground();
    this.addChildAt(bg, 0);


    this.addChild(this.grid.container);
    this.grid.build(this.words);


    this.addChild(this.tray.container);
    this.tray.build();


    this.tray.container.addChildAt(this.swipe.line, 1);


    this.addChild(this.wordPreview.container);


    const tutorialHand = this.tutorial.buildHand();
    this.addChild(tutorialHand);

    const gridBottomY = this.grid.getBottomY();
    const tutorialHint = this.tutorial.buildHintPanel(gridBottomY);
    this.addChild(tutorialHint);


    const playNowBtn = this.ui.createPlayNowButton();
    this.addChild(playNowBtn);


    this.on("pointermove", (e) => this.swipe.onMove(e), this);
    this.on("pointerup", () => this.swipe.onUp(), this);
    this.on("pointerupoutside", () => this.swipe.onUp(), this);


    this.tutorial.schedule();
  }

  startSwipe(btn, fromAutoplay = false) {
    this.swipe.start(btn, fromAutoplay);
  }

  endGame() {
    this.isGameOver = true;
    this.eventMode = "none";

    this.tutorial.hide();
    this.tutorial.cancelAutoplay();

    gsap.delayedCall(0.8, () => {
      const title = this.ui.showEndScreen(
        this.grid.container,
        this.tray.container,
        this.wordPreview,
        this.swipe.line
      );
      this.addChild(title);
    });
  }
}