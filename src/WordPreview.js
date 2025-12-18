import { Container, Graphics, Text } from "pixi.js";
import gsap from "gsap";

export default class WordPreview {
  constructor(trayCenter, trayRadius) {
    this.container = new Container();
    this.container.visible = false;
    
    this.trayCenter = trayCenter;
    this.trayRadius = trayRadius;

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

    this.container.addChild(bg, txt);
    this.bg = bg;
    this.txt = txt;
  }

  update(word) {
    this.container.visible = true;
    this.container.alpha = 1;

    this.txt.text = word;

    const padding = 20;
    const w = this.txt.width + padding * 2;

    this.bg.clear()
      .beginFill(0xff9f1a)
      .drawRoundedRect(-w / 2, -22, w, 44, 12)
      .endFill();

    this.container.x = this.trayCenter.x;
    this.container.y = this.trayCenter.y - this.trayRadius - 80;
  }

  hide() {
    gsap.to(this.container, {
      alpha: 0,
      duration: 0.15,
      onComplete: () => {
        this.container.visible = false;
      },
    });
  }

  fail() {
    const wp = this.container;

    gsap.fromTo(
      wp,
      { x: wp.x - 6 },
      {
        x: wp.x + 6,
        duration: 0.06,
        yoyo: true,
        repeat: 4,
        onComplete: () => this.hide(),
      }
    );
  }

  get x() {
    return this.container.x;
  }

  get y() {
    return this.container.y;
  }
}