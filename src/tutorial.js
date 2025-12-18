// tutorial.js
import { gsap } from "gsap";

/**
 * Tutorial & Autoplay init
 */
export function initTutorial(game) {
  game.tutorialLoopCount = 0;
  game.autoplayAfterLoops = 2;
  game.autoplayStepDuration = game.autoplayStepDuration ?? 0.6;
}

/**
 * Tutorial scheduling
 */
export function scheduleTutorial(game) {
  clearTimeout(game.tutorialTimeout);

  if (game.isGameOver || game.isAutoplaying) return;

  game.tutorialTimeout = setTimeout(() => {
    showTutorialHand(game);
  }, 2500);
}

/**
 * Show tutorial hand
 */
export function showTutorialHand(game) {
  if (game.isGameOver || game.isAutoplaying) return;

  const word = game.getTutorialWord();
  if (!word) return;

  const btns = game.getButtonsForWord(word);
  if (!btns || btns.length === 0) return;

  game.updateTutorialHint(word);
  if (game.tutorialHint) game.tutorialHint.visible = true;

  killHandTimeline(game);

  game.tutorialLoopCount = 0;

  const toLocal = (btn) => {
    const gp = btn.getGlobalPosition();
    return game.toLocal(gp);
  };

  const firstPos = toLocal(btns[0]);

  game.hand.visible = true;
  game.hand.alpha = 0;
  game.hand.position.set(firstPos.x, firstPos.y - 10);

  gsap.to(game.hand, {
    alpha: 1,
    duration: 0.25,
    ease: "sine.out",
  });

  game.handTL = gsap.timeline({
    repeat: -1,
    repeatDelay: 0.7,
    onRepeat: () => {
      game.tutorialLoopCount++;

      if (
        game.tutorialLoopCount >= game.autoplayAfterLoops &&
        !game.isAutoplaying
      ) {
        killHandTimeline(game);
        startAutoplay(game);
      }
    },
  });

  btns.forEach((btn, i) => {
    const p = toLocal(btn);
    game.handTL.to(
      game.hand,
      {
        x: p.x,
        y: p.y - 10,
        duration: game.handMoveDuration ?? 0.8,
        ease: "sine.inOut",
      },
      i === 0 ? 0 : "+=0.12"
    );
  });
}

/**
 * Hide tutorial hand
 */
export function hideTutorialHand(game) {
  clearTimeout(game.tutorialTimeout);

  if (game.tutorialHint) game.tutorialHint.visible = false;

  killHandTimeline(game);

  if (game.hand) {
    gsap.killTweensOf(game.hand);
    gsap.to(game.hand, {
      alpha: 0,
      duration: 0.2,
      ease: "sine.in",
      onComplete: () => {
        game.hand.visible = false;
      },
    });
  }
}

/**
 * Autoplay
 */
export function startAutoplay(game) {
  if (game.isGameOver || game.isAutoplaying) return;

  const word = game.getTutorialWord();
  if (!word) return;

  const btns = game.getButtonsForWord(word);
  if (!btns || btns.length === 0) return;

  game.isAutoplaying = true;
  killHandTimeline(game);

  game.resetSwipe();
  game.isSwiping = true;

  const toLocal = (btn) => {
    const gp = btn.getGlobalPosition();
    return game.toLocal(gp);
  };

  const firstPos = toLocal(btns[0]);

  game.hand.visible = true;
  game.hand.alpha = 1;
  game.hand.position.set(firstPos.x, firstPos.y - 10);

  game.drawLine({ x: game.hand.x, y: game.hand.y });
  game.addButton(btns[0]);

  if (game.autoplayTL) game.autoplayTL.kill();
  game.autoplayTL = gsap.timeline();

  for (let i = 1; i < btns.length; i++) {
    const btn = btns[i];
    const p = toLocal(btn);

    game.autoplayTL.to(game.hand, {
      x: p.x,
      y: p.y - 10,
      duration: game.autoplayStepDuration,
      ease: "sine.inOut",
      onUpdate: () => {
        game.drawLine({ x: game.hand.x, y: game.hand.y });
      },
      onComplete: () => {
        game.addButton(btn);
      },
    });
  }

  game.autoplayTL.call(() => finishAutoplay(game));
}

/**
 * Autoplay finish
 */
export function finishAutoplay(game) {
  if (game.autoplayTL) {
    game.autoplayTL.kill();
    game.autoplayTL = null;
  }

  game.isSwiping = true;

  gsap.delayedCall(0.18, () => {
    game.onUp();
    game.isAutoplaying = false;
    hideTutorialHand(game);
    scheduleTutorial(game);
  });
}

/**
 * Utils
 */
function killHandTimeline(game) {
  if (game.handTL) {
    game.handTL.kill();
    game.handTL = null;
  }
}
