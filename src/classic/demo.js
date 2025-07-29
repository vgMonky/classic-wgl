import game from "/classic/state.js"

import {
    initCursor,
    initFPSCounter,
    initInfoText,
    initCameraControllerWASD,
    initSelectionMonitor,
    initTilemap,
    initTilemapEditor,
    initNavMeshEditor,
    initAgent,
    initDEVButtons
} from "./prefabs.js";
import { initUI, initTut, initMenu } from "./ui.js";


async function initContext() {

    window.game = game;

    await game.init();
    await game.loadResources();

    await game.load("/state.json");
    
    initCursor();
    initFPSCounter();
    initInfoText();
    initCameraControllerWASD();
    initSelectionMonitor();
    initTilemap();
    initTilemapEditor();
    await initNavMeshEditor();

    initAgent();

    initDEVButtons();

    // UI system example
    initUI();
    //initTut();
    //initMenu();

    game.camera.position[0] += 800;

    game.launch();

}

window.addEventListener("load", initContext, false);
