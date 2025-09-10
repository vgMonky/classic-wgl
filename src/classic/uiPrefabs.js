import {UIManager} from "/classic/ui.js";

export function initUI() {
    // init UI sys
    let UI = new UIManager(game);

    // add components
    initFPS(UI)
}

function initFPS(UIManager) {
    let UI = UIManager
    let FPS = UI.spawnPadding([10,10,10,10], [0,0,0,1])
        .addChild(UI.spawnText("hello", 0.5))
    UI.root.addChild(FPS, "top-left", "top-left")
}