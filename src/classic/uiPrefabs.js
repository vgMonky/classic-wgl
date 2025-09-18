import {UIManager} from "/classic/ui.js";

// Define global UI variables, could go on a uiVar.js file
// --- Color variables hsla (hue, saturation, light, alpha) ---
// h0 = accent hue (any)
// h1 = secondary hue (any)
// h-alert = allert hue (red)
// h-succses = succses hue (green)
// ***we need a util func hslaToRgba(h,s,l,a) in UIManager and maybe directlly input hsla in all elements construction
// --- Text scale variables ---
let tHuge = 1.6 // huge
let tBig = 0.8 // big
let tMid = 0.5 // normal
let tSmall = 0.4 // small

// Define global UI state, could go on a uiState.js file
// --- sideMenu state and actions ---
let sideMenuIsOpen = false;
function toggleSideMenu() {
    sideMenuIsOpen = !sideMenuIsOpen;
    console.log(sideMenuIsOpen ? "Menu opened" : "Menu closed");
}
// --- mainView state and actions ---
let viewState = 0
function setView(index) {viewState = index}

// Define main init func for this first example
export function initUI() {
    // init UIManager
    let UI = new UIManager(game);

    // add components
    initTopBar(UI)
    initMainView(UI)
    initSideMenu(UI)

    //UI.root.setEnabled(false) //skip all recurive
}

function initTopBar(UIManager) {
    let UI = UIManager

    let topBarContainer = UI.spawnAnchor(undefined, undefined, [0,0.08,0,1])
    UI.root.addChild(topBarContainer, "top-center", "top-center")
    // instantiate sub-parts
    let FPS = initFPS(UI)
    let MenuBtn = initBtn(UI, "menu", tMid, () => {
        toggleSideMenu()
    });
    let title = UI.spawnText("Classic Engine + UI", undefined, 1000, [0,0.6,0,1], [0,0,0,0])
    // set positions
    topBarContainer.addChild(FPS, "mid-left", "mid-left")
    topBarContainer.addChild(MenuBtn, "mid-right", "mid-right")
    topBarContainer.addChild(title, "mid-center", "mid-center")
    
    // make reactive based on screen breakpoints
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
            topBarContainer.setSize(UI.root.width, FPS.height + 15);
        }
    });  
    
    
}

function initFPS(UIManager) {
    let UI = UIManager
    // Static comp
    let FPSContainer = UI.spawnPadding([10,20,10,20], [0,0,0,0])
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

// function initSideMenu that uses initMenuContent internally
function initSideMenu(UIManager) {
    // Static comp
    let UI = UIManager
    let overlay = UI.spawnAnchor(UI.root.width, UI.root.height, [0,0.05,0,0.92])
    UI.root.addChild(overlay, "top-left", "top-left")
    let sideContainer = UI.spawnAnchor(200, UI.root.height)
    UI.root.addChild(sideContainer, "top-right", "top-right")
    let content = initMenuContent(UI)
    sideContainer.addChild(content, "top-left", "top-left")

    // Dynamic comp
    let overlayCollider = UI.addColliderToElem(overlay);

    UI.root.entity.registerCall("refreshUI", () => {
        // idle
        overlay.setSize(UI.root.width-sideContainer.width, UI.root.height)
        sideContainer.setSize(sideContainer.width, UI.root.height)
        overlay.setColor([0,0.05,0,0.92]);
        // hover
        if (game.physics.gjk(overlayCollider, game.physics.mouse)) {
            overlay.setColor([0.05, 0, 0, 0.92]);
        }
        // click
        if (game.wasMouseButtonReleased(0) && game.physics.gjk(overlayCollider, game.physics.mouse)) {
            if (sideMenuIsOpen==true) {
                toggleSideMenu();
            }
        }
    });
    UI.root.entity.registerCall("refreshUI", () => {
        // in open state
        if (sideMenuIsOpen==true) {
            sideContainer.setColor([0,0.1,0,1])
            sideContainer.setSize(UI.interpolation(sideContainer.width, 200), UI.root.height)
        }
        // in close state
        else {
            sideContainer.setSize(UI.interpolation(sideContainer.width, 0), UI.root.height);
            overlay.setColor([0,0,0,0])
            overlay.setSize(0,0)
        }
    });
}

function initMenuContent(UIManager) {
    let UI = UIManager
    let container = UI.spawnPadding([56,36,36,18],[0,0.1,0,0]) 
    let group = UI.spawnArray(true, "left", 2, [0,0,0,0])
    container.addChild(group)
    let btn = initBtn(UI, "init", tMid, () => {
        console.log("init view...")
        setView(0)
        toggleSideMenu()
    })
    let btn2 = initBtn(UI, "alpha", tMid, () => {
        console.log("alpha view...")
        setView(1)
        toggleSideMenu()
    })
    let btn3 = initBtn(UI, "beta", tMid, () => {
        console.log("beta view...")
        setView(2)
        toggleSideMenu()
    })
    let btn4 = initBtn(UI, "invest", tMid, () => {
        console.log("invest view...")
        setView(3)
        toggleSideMenu()
    })
    group.addChild(btn)
    group.addChild(btn2)
    group.addChild(btn3)
    group.addChild(btn4)

    return container
}

function initMainView(UIManager) {
    let UI = UIManager
    let pad = UI.spawnPadding([20,20,20,20], [0,0.08,0,0.98])
    let container = UI.spawnArray(true, "center", 0, [0,0,0,0])
    pad.addChild(container)
    UI.root.addChild(pad)
    

    // init each view...
    let v0 = init00(UI)
    container.addChild(v0)
    let v1 = init01(UI)
    container.addChild(v1)
    let v2 = init02(UI)
    container.addChild(v2)
    let v3 = init03(UI)
    container.addChild(v3)

    // if viewState whatever, show whatever and hide all the others
    UI.root.entity.registerCall("refreshUI", () => {
        if (viewState == 0) {vSet(v0)}
        if (viewState == 1) {vSet(v1)}
        if (viewState == 2) {vSet(v2)}
        if (viewState == 3) {vSet(v3)}
    })

    function vSet(v){
        v0.setEnabled(false)
        v1.setEnabled(false)
        v2.setEnabled(false)
        v3.setEnabled(false)
        v.setEnabled(true)
    }
}

function init00(UIManager) {
    let UI = UIManager
    let array = UI.spawnArray(true, "center", 6, [1,0,0,0])
    UI.root.addChild(array)
    let iso = UI.spawnSprite(undefined, 200, 200, 2, [4,4], [0,0.2,0,0])
    let title = UI.spawnText("SKYGPU", tHuge, 1000, undefined, [0,0,0,0])
    let desc = UI.spawnText("decentralized network", tMid, 500, undefined, [0,0,0,0])
    array.addChild(iso)
    array.addChild(title)
    array.addChild(desc)

    return array
}
function init01(UIManager) {
    let UI = UIManager
    let array = UI.spawnArray(true, "center", 15, [1,0,0,0])
    UI.root.addChild(array)
    let title = UI.spawnText("alpha view", tBig, 1000, undefined, [0,0,0,0])
    array.addChild(title)

    return array
}
function init02(UIManager) {
    let UI = UIManager
    let array = UI.spawnArray(true, "center", 15, [1,0,0,0])
    UI.root.addChild(array)
    let title = UI.spawnText("beta view", tBig, 1000, undefined, [0,0,0,0])
    array.addChild(title)

    return array
}
function init03(UIManager) {
    let UI = UIManager
    let array = UI.spawnArray(true, "center", 15, [1,0,0,0])
    UI.root.addChild(array)
    let title = UI.spawnText("invest view", tBig, 1000, undefined, [0,0,0,0])
    array.addChild(title)

    return array
}


// Base components - generic reusable components:
// generic button 
function initBtn(UIManager, txt = "btn", txtSize = tMid, onClick = null) {
    let UI = UIManager;

    // Static comp
    let container = UI.spawnPadding([10, 20, 10, 20], [0, 0.15, 0, 0]);
    let text = UI.spawnText(txt.toString(), txtSize, 200, [0, 0.7, 0, 1], [0, 0.15, 0, 0]);
    container.addChild(text);

    // Dynamic comp
    let container2Collider = UI.addColliderToElem(container);
    let speed = 150;

    UI.root.entity.registerCall("refreshUI", () => {
        // idle
        text.setTextColor([UI.newSine(0, 0.4, speed), UI.newSine(0.6, 0.9, speed), 0, 1]);
        container.setColor([0, 0.15, 0, 0]);

        // hover
        if (game.physics.gjk(container2Collider, game.physics.mouse)) {
            container.setColor([0, UI.newSine(0.5, 0.8, speed), 0, 1]);
            text.setTextColor([0, 0.1, 0, 1]);
        }
        // click
        if (game.wasMouseButtonReleased(0) && game.physics.gjk(container2Collider, game.physics.mouse)) {
            if (onClick) {
                onClick();   // run custom action
            } else {
                console.log("clicked!!!");
            }
        }
    });


    return container;
}