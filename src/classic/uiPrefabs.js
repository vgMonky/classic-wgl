import {UIManager} from "/classic/ui.js";

// Color variables hsla (hue, saturation, light, alpha)
// h0 = accent hue (any)
// h1 = secondary hue (any)
// h-alert = allert hue (red)
// h-succses = succses hue (green)
// *we need a util func hslaToRgba(h,s,l,a) in UIManager and maybe directlly input hsla in all elements construction

// text size variables
let tHuge = 1.6 // huge
let tBig = 0.8 // big
let tMid = 0.6 // normal
let tSmall = 0.4 // small
let tTiny = 0.25 // tinny
 


export function initUI() {
    // init UIManager
    let UI = new UIManager(game);

    // add components
    initTopBar(UI)

    // Main View
    let group = UI.spawnArray(true, "left", 2, [0,0,0,0])
    let btn = initBtn(UI, "start", 1)
    let btn2 = initBtn(UI, "settings", 0.6)
    let btn3 = initBtn(UI, "donate", 0.6)
    group.addChild(btn)
    group.addChild(btn2)
    group.addChild(btn3)
    UI.root.addChild(group, "mid-center", "mid-center")

}

function initTopBar(UIManager) {
    let UI = UIManager
    // a container with full width at the top
    // must have: FPScounter, tittle text, menu button.
    // must update based on screen width breakpoints

    let topBarContainer = UI.spawnAnchor(undefined, undefined, [0,0.1,0,1])
    UI.root.addChild(topBarContainer, "top-center", "top-center")
    // instantiate sub-parts
    let FPS = initFPS(UI)
    let MenuBtn = initBtn(UI, "menu", tMid, () => {
        console.log("menu");
    });
    let title = UI.spawnText("Classic Engine + UI", undefined, 1000, [0,0.6,0,1])
    topBarContainer.addChild(FPS, "mid-left", "mid-left")
    topBarContainer.addChild(MenuBtn, "mid-right", "mid-right")
    topBarContainer.addChild(title, "mid-center", "mid-center")
    
    // update size
    UI.root.entity.registerCall("refreshUI", () => {
        topBarContainer.setSize(UI.root.width, FPS.height);
        // mobile
        if (UI.root.width < 700) {
            title.setTextScale(tSmall);
            title.setText("classic + UI");
        } 
        // desktop
        else if (UI.root.width < 1100) {
            title.setTextScale(tMid);
            title.setText("Classic Engine + UI");
        } 
        // wide desktop
        else {
            title.setTextScale(tBig);
            title.setText("Classic Engine + UI");

        }
    });    
}
 
function initFPS(UIManager) {
    let UI = UIManager
    // Static comp
    let FPSContainer = UI.spawnPadding([8,8,8,8], [0,0,0,0])
    let FPSText = UI.spawnText("FPS", tMid)
    FPSContainer.addChild(FPSText)
    UI.root.addChild(FPSContainer, "top-left", "top-left")
    // Dynamic comp
    let lastFPS = 0
    let timeAccumulator = 0
    UI.root.entity.registerCall("refreshUI", () => {
        timeAccumulator += game.deltaTime;
        if (timeAccumulator >= 0.1) {
            lastFPS = game.fps;
            FPSText.setText(lastFPS.toString());
            timeAccumulator = 0;
        }
        if (lastFPS >= 30) {
            FPSText.setTextColor([0,0.6,0,1])
        }else {FPSText.setTextColor([0.8,0,0,1])}
    })
    return FPSContainer
}


// Base components - generic reusable components:
// generic button 
function initBtn(UIManager, txt = "btn", txtSize = tMid, onClick = null) {
    let UI = UIManager;

    // Static comp
    let container = UI.spawnPadding([8, 8, 8, 8], [0, 0.15, 0, 0]);
    let text = UI.spawnText(txt.toString(), txtSize, 200, [0, 0.7, 0, 1], [0, 0.15, 0, 0]);
    container.addChild(text);
    UI.root.addChild(container, "top-right", "top-right");

    // Dynamic comp
    let container2Collider = UI.addColliderToElem(container);
    let speed = 150;

    UI.root.entity.registerCall("refreshUI", () => {
        // idle
        text.setTextColor([UI.newSine(0, 0.4, speed), UI.newSine(0.6, 0.9, speed), 0, 1]);

        // hover
        if (game.physics.gjk(container2Collider, game.physics.mouse)) {
            container.setColor([0, UI.newSine(0.5, 0.8, speed), 0, 1]);
            text.setTextColor([0, 0.1, 0, 1]);
        } else {
            container.setColor([0, 0.15, 0, 0]);
        }
    });

    // click
    container2Collider.addHandler("click", () => {
        if (onClick) {
            onClick();   // run custom action
        } else {
            console.log("clicked!!!");
        }
        return true; // returning true stops propagation
    });

    return container;
}
