// run this to tell git not to track this file
// git update-index --skip-worktree test/playground/index.ts

import { Application, Ticker } from "pixi.js";
import { Live2DModel } from "../src";

const canvas = document.getElementById("canvas") as HTMLCanvasElement;
canvas.width = 800;
canvas.height = 600;
const modelURL = "/model/21miku_night/21miku_night.model3.json";

async function main() {
    const app = new Application({
        view: canvas,
    });
    (window as any).app = app;

    const model = await Live2DModel.from(modelURL, {
        ticker: Ticker.shared,
        autoFocus: false,
    });

    app.stage.addChild(model);
    model.scale.set(0.2);
}

main().then();

const control = document.getElementById("control")!;
control.innerHTML += `
<button onclick="window.click()">go!</button>
`;

function click() {
    const app = (window as any).app as Application;
    const model = app.stage.getChildAt(0) as Live2DModel;
    model.parallelMotion([
        { group: "w-adult-nod02", index: 0 },
        { group: "face_night_closeeye_01", index: 0 },
    ]);
}

(window as any).click = click;
