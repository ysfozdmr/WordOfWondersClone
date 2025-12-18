import * as PIXI from "pixi.js";
import { Application, Sprite, Texture } from "pixi.js";
import { initAssets } from "./assets";
import { gsap } from "gsap";
import { CustomEase, PixiPlugin } from "gsap/all";
import Game from "./game";

export const GAME_WIDTH = 480;
export const GAME_HEIGHT = 800;

// PIXI APP
export const app = new Application({
  backgroundColor: 0x00000000, // 🔴 TRANSPARENT (ÇOK ÖNEMLİ)
  antialias: true,
  hello: true,
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
});

// GSAP ticker
app.ticker.stop();
gsap.ticker.add(() => {
  app.ticker.update();
});

async function init() {
  document.body.appendChild(app.view);

  await initAssets();


  gsap.registerPlugin(PixiPlugin, CustomEase);
  PixiPlugin.registerPIXI(PIXI);

  const bg = new Sprite(Texture.from("assets/bg.png"));
  bg.width = GAME_WIDTH;
  bg.height = GAME_HEIGHT;
  bg.x = 0;
  bg.y = 0;

  app.stage.addChild(bg);


  const game = new Game();
  app.stage.addChild(game);
}

init();