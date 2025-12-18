import { Container, Sprite, Text, Texture, Assets } from "pixi.js";
import gsap from "gsap";
import { GAME_WIDTH, GAME_HEIGHT } from "./index";

export default class UIManager {
  constructor() {
    this.playNowButton = null;
    this.background = null;
  }

  async loadBackground() {
    const texture = await Assets.load("assets/bg.png");
    const bg = new Sprite(texture);
    bg.width = GAME_WIDTH;
    bg.height = GAME_HEIGHT;
    bg.x = 0;
    bg.y = 0;
    this.background = bg;
    return bg;
  }

  createPlayNowButton() {
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

    gsap.to(cta.scale, {
      x: 1.08,
      y: 1.08,
      duration: 0.8,
      yoyo: true,
      repeat: -1,
      ease: "sine.inOut",
    });

    this.playNowButton = cta;
    return cta;
  }

  showEndScreen(gridContainer, trayContainer, wordPreview, line) {
    gridContainer.visible = false;
    trayContainer.visible = false;
    wordPreview.container.visible = false;
    line.clear();

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

    gsap.from(title, {
      alpha: 0,
      y: title.y - 25,
      duration: 0.6,
      ease: "power2.out",
    });

    if (this.playNowButton) {
      this.playNowButton.visible = true;
      this.playNowButton.y = GAME_HEIGHT - 240;
      this.playNowButton.scale.set(1.30);

      gsap.from(this.playNowButton, {
        alpha: 0,
        scale: 0.9,
        duration: 0.35,
        ease: "power2.out",
      });
    }

    return title;
  }
}