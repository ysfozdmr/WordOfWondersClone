import { Container, Sprite, Text, Texture } from "pixi.js";
import gsap from "gsap";
import { GAME_WIDTH } from "./index";

export default class TutorialManager {
  constructor(gameRef) {
    this.game = gameRef;
    this.hand = null;
    this.hintPanel = null;
    this.handTL = null;
    this.tutorialTimeout = null;
    this.autoplayTimeout = null;
    this.autoplayTL = null;
    
    this.tutorialLoopCount = 0;
    this.autoplayAfterLoops = 2;
    this.autoplayStepDuration = 1.2;
  }

  buildHand() {
    this.hand = new Sprite(Texture.from("assets/hand.png"));
    this.hand.anchor.set(0.2, 0.1);
    this.hand.scale.set(0.4);
    this.hand.visible = false;
    return this.hand;
  }

  buildHintPanel(gridBottomY) {
    this.hintPanel = new Container();

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

    this.hintPanel.addChild(bg, txt);
    this.hintPanel.bg = bg;
    this.hintPanel.txt = txt;
    this.hintPanel.x = GAME_WIDTH / 2;
    this.hintPanel.y = gridBottomY + 60;
    this.hintPanel.visible = false;

    return this.hintPanel;
  }

  schedule() {
    clearTimeout(this.tutorialTimeout);

    if (this.game.isGameOver || this.game.isAutoplaying) return;

    this.tutorialTimeout = setTimeout(() => {
      this.show();
    }, 7000);
  }

  hide() {
    clearTimeout(this.tutorialTimeout);

    if (this.hintPanel) this.hintPanel.visible = false;

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

  show() {
    if (this.game.isGameOver || this.game.isAutoplaying) return;

    const word = this.getTutorialWord();
    if (!word) return;

    const btns = this.game.tray.getButtonsForWord(word);
    if (!btns || btns.length === 0) return;

    this.updateHint(word);
    if (this.hintPanel) this.hintPanel.visible = true;

    if (this.handTL) {
      this.handTL.kill();
      this.handTL = null;
    }

    this.tutorialLoopCount = 0;

    const toHandPos = (btn) => {
      const gp = btn.getGlobalPosition();
      const lp = this.game.toLocal(gp);
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

        if (this.tutorialLoopCount >= this.autoplayAfterLoops && !this.game.isAutoplaying) {
          if (this.handTL) {
            this.handTL.kill();
            this.handTL = null;
          }
          this.startAutoplay();
        }
      },
    });

    btns.forEach((btn, i) => {
      this.handTL.to(
        this.hand,
        {
          x: () => toHandPos(btn).x,
          y: () => toHandPos(btn).y,
          duration: 0.7,
          ease: "power1.inOut",
        },
        i === 0 ? 0 : "+=0.04"
      );
    });
  }

  updateHint(word) {
    if (!this.hintPanel) return;
    this.hintPanel.txt.text = `Connect the letters ${word}`;
  }

  getTutorialWord() {
    return this.game.words.find(w => !this.game.found.has(w));
  }

  cancelAutoplay() {
    clearTimeout(this.autoplayTimeout);
    this.game.isAutoplaying = false;

    if (this.autoplayTL) {
      this.autoplayTL.kill();
      this.autoplayTL = null;
    }
  }

  startAutoplay() {
    if (this.game.isGameOver || this.game.isAutoplaying) return;

    const word = this.getTutorialWord();
    if (!word) return;

    const btns = this.game.tray.getButtonsForWord(word);
    if (!btns || btns.length === 0) return;

    this.game.isAutoplaying = true;

    if (this.handTL) {
      this.handTL.kill();
      this.handTL = null;
    }

    this.game.swipe.reset();
    this.game.swipe.isSwiping = true;

    const toLocalPos = (btn) => {
      const gp = btn.getGlobalPosition();
      return this.game.toLocal(gp);
    };

    const firstPos = toLocalPos(btns[0]);
    this.hand.visible = true;
    this.hand.alpha = 1;
    this.hand.position.set(firstPos.x, firstPos.y - 10);

    this.game.swipe.drawLine({ x: this.hand.x, y: this.hand.y });
    this.game.swipe.addButton(btns[0]);

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
          this.game.swipe.drawLine({ x: this.hand.x, y: this.hand.y });
        },
        onComplete: () => {
          this.game.swipe.addButton(btn);
        },
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

    this.game.swipe.isSwiping = true;

    gsap.delayedCall(0.18, () => {
      this.game.swipe.onUp();
      this.game.isAutoplaying = false;
      this.hide();
      this.schedule();
    });
  }
}