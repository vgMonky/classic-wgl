import game from "/classic/state.js";
import { Rectangle, Text } from "/classic/transforms.js";
import { Collider } from "/classic/collision.js";

// // Objective: Final API based on UIManager class
//
// -[x] let UI = new.UImanager(game)
// -[x] let element = UI.spawnElement(args...)
// -[x] let text = UI.spawnText(args..)
// -[ ] let button = UI.spawnBtn(args...)
// ...

// type Anchor =
//     | 'top-left' | 'top-center' | 'top-right'
//     | 'mid-left' | 'mid-center' | 'mid-right'
//     | 'bot-left' | 'bot-center' | 'bot-right';


// --- Most basic UI class  of the system is UIElement,
//     from this other elements can be extended ---

class UIElement {
    constructor(
        name, //: string
        parent, //: UIElement | game.canvas
        parentAnchor, //: Anchor
        selfAnchor, //: Anchor
        color, //: [n, n, n, n] -> number between 0-1
        width, //: number -> pixels
        height, //: nubmer -> pixels
        zlayer //: number
    ) {
        this.parent = parent;
        this.parentAnchor = parentAnchor;
        this.selfAnchor = selfAnchor;
        
        this.width = width;
        this.height = height;

        this._selfPositioned = true;

        // Spawn the entity
        this.entity = game.spawnEntity(name); // prefixed from UIManager

        // Initial position
        const [x, y] = this.calculateGlobalPos();

        // Add Rectangle component
        this.rectangle = this.entity.addComponent(
            Rectangle,
            [x, y, zlayer], // pos
            [this.width, this.height, 1], // scale
            color, // color
            true // ignoreCam
        );

        // Register update loop
        this.entity.registerCall("refreshUI", () => {
            const [nx, ny] = this.calculateGlobalPos();
            this.rectangle.position = [nx, ny, zlayer];
        });
    }

    getAnchorOffset(anchor, w, h) {
        const map = {
            'top-left': { x: 0, y: 0 },
            'top-center': { x: w / 2, y: 0 },
            'top-right': { x: w, y: 0 },
            'mid-left': { x: 0, y: h / 2 },
            'mid-center': { x: w / 2, y: h / 2 },
            'mid-right': { x: w, y: h / 2 },
            'bot-left': { x: 0, y: h },
            'bot-center': { x: w / 2, y: h },
            'bot-right': { x: w, y: h }
        };
        return map[anchor];
    }

    calculateGlobalPos() {
        if (!this._selfPositioned) return this._manualPos || [0, 0];
    
        const parentPos = this.parent instanceof UIElement
            ? this.parent.calculateGlobalPos()
            : [0, 0];
    
        const pw = this.parent.width;
        const ph = this.parent.height;
        const parentOffset = this.getAnchorOffset(this.parentAnchor, pw, ph);
        const selfOffset = this.getAnchorOffset(this.selfAnchor, this.width, this.height);
    
        return [
            parentPos[0] + parentOffset.x - selfOffset.x,
            parentPos[1] + parentOffset.y - selfOffset.y
        ];
    }
    
    setManualPosition(x, y) {
        this._manualPos = [x, y];
    }

    setAnchor(parent, parentAnchor, selfAnchor) {
        this.parent = parent
        this.parentAnchor = parentAnchor
        this.selfAnchor = selfAnchor
    }
}
 
class UIText extends UIElement {
    constructor(
        name, //: string
        parent,  //: UIElement | game.canvas
        parentAnchor,  //: Anchor
        selfAnchor, //: Anchor 
        text, //: string
        textScale, //: number -> a multiplayer
        maxWidth, //: number -> pixels
        color, //: [n, n, n, n] -> number between 0-1
        bgColor, //: [n, n, n, n] -> number between 0-1
        zlayer //: number
    ) {
        const fontSize = [16, 16];
        const glyphSize = [32, 32];
        const glyphStr = "!\"#$%&'()*+,-./?0123456789:;<=>@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`{|}~";

        const scaledGlyphSize = [
            glyphSize[0] * textScale,
            glyphSize[1] * textScale
        ];

        const maxCharPerLine = Math.floor(maxWidth / scaledGlyphSize[0]);
        const lines = UIText.wrapText(text, maxCharPerLine);
        const maxLineLength = Math.max(...lines.map(l => l.length));
        const lineCount = lines.length;

        const autoWidth = scaledGlyphSize[0] * maxLineLength;
        const autoHeight = scaledGlyphSize[1] * lineCount;

        super(name, parent, parentAnchor, selfAnchor, bgColor, autoWidth, autoHeight, zlayer);

        this.textScale = textScale;
        this.color = color;
        this.fontSize = fontSize;
        this.glyphSize = glyphSize;
        this.glyphStr = glyphStr;
        this.maxWidth = maxWidth;
        this.maxCharPerLine = maxCharPerLine;
        this.textComps = [];

        this.setText(text);

        this.entity.registerCall("refreshUI", () => {
            this._refreshPositions();
        });
    }

    static wrapText(str, maxCharPerLine) {
        const words = str.split(' ');
        const lines = [];
        let line = "";

        for (let word of words) {
            if ((line + word).length < maxCharPerLine) {
                line += (line.length ? " " : "") + word;
            } else {
                if (line.length > 0) lines.push(line);
                line = word;
            }
        }
        if (line.length) lines.push(line);
        return lines;
    }

    _refreshPositions() {
        const [x, y] = this.calculateGlobalPos();
        const lineHeight = this.glyphSize[1] * this.textScale;

        for (let i = 0; i < this.textComps.length; i++) {
            this.textComps[i].position = [x, y + i * lineHeight, this.rectangle.position[2]];
        }
    }

    setText(str) {
        for (let comp of this.textComps) {
            this.entity.removeComponent(comp);
        }
        this.textComps = [];

        const lines = UIText.wrapText(str, this.maxCharPerLine);
        const [x, y] = this.calculateGlobalPos();
        const lineHeight = this.glyphSize[1] * this.textScale;

        for (let i = 0; i < lines.length; i++) {
            const lineText = this.entity.addComponent(
                Text,
                [x, y + i * lineHeight, this.rectangle.position[2]],
                [this.textScale, this.textScale, 1],
                "font",
                [lines[i].length, 1],
                this.fontSize,
                this.glyphSize,
                this.glyphStr,
                this.color,
                [0, 0, 0, 0],
                true
            );
            lineText.setText(lines[i].toUpperCase());
            this.textComps.push(lineText);
        }
    }
}
// class UISprite ...

// class UIBtnText ...

// class UIBtnSprite ...


// --- There are also "container elements" that recalculate their
//     children screen position based on some parameters
//     and logics, tho this desactivates the childrens automatic
//     self-positioning (check `_selfPositioned` flag in UIElement) ---

// UIArray: Container element that positions its children based
//          on an array layout rule, and it adquires the width and 
//          height of the total size of its children and gaps
class UIArray extends UIElement {
    constructor(
        name, //: string
        parent, //: UIElement | game.canvas
        parentAnchor, //: Anchor
        selfAnchor, //: Anchor
        vertical, //: bool
        align, //: left" | "center" | "right"
        spacing, //: number -> pixels
        color, //: [n, n, n, n] -> number between 0-1
        zlayer //: number
    ) {
        super(name, parent, parentAnchor, selfAnchor, color, 10, 10, zlayer);
        this.vertical = vertical;
        this.align = align;
        this.spacing = spacing;
        this.children = [];

        this.entity.registerCall("refreshUI", () => {
            this._recalculateLayout();
        });
    }

    addChild(child) {
        this.children.push(child);
        child._selfPositioned = false;
        this._recalculateLayout();
    }

    _recalculateLayout() {
        const isVertical = this.vertical;

        // Step 1: Measure layout size
        let totalMain = 0;
        let maxCross = 0;

        for (const child of this.children) {
            const main = isVertical ? child.height : child.width;
            const cross = isVertical ? child.width : child.height;
            totalMain += main + this.spacing;
            maxCross = Math.max(maxCross, cross);
        }

        totalMain = Math.max(0, totalMain - this.spacing); // remove trailing spacing

        // Step 2: Resize this layout box
        this.width = isVertical ? maxCross : totalMain;
        this.height = isVertical ? totalMain : maxCross;
        this.rectangle.scale = [this.width, this.height, 1];

        // Step 3: Calculate top-left of self
        let [originX, originY] = this.calculateGlobalPos();
        const topLeftOffset = this.getAnchorOffset("top-left", this.width, this.height);
        originX -= topLeftOffset.x;
        originY -= topLeftOffset.y;        

        // Step 4: Position each child
        let offset = 0;
        for (const child of this.children) {
            const main = isVertical ? child.height : child.width;
            const cross = isVertical ? child.width : child.height;

            let crossOffset = 0;
            if (this.align === "center") {
                crossOffset = (isVertical ? this.width : this.height) / 2 - cross / 2;
            } else if (this.align === "right") {
                crossOffset = (isVertical ? this.width : this.height) - cross;
            }

            const x = isVertical ? originX + crossOffset : originX + offset;
            const y = isVertical ? originY + offset : originY + crossOffset;

            child.setManualPosition(x, y);
            offset += main + this.spacing;
        }
    }
}

// UIPadding: Container element that repositions its children in the global pos
//            considering a padding size for each side.

// UIPanel: Container element that repositions its children in the global pos
//          based on its own position, but cuts the inside content if it excedees
//          its width or heigth, making it discoverable with a scroll bar.


// --- How to use all this elements above? ---
class UIManager {
    constructor(gameInstance) {
        this.game = gameInstance;
        this.elements = new Map(); // name -> UIElement
        this.indexCounter = 0;
    }

    // spawn methods
    spawnElement(
        width = 100,
        height = 100,
        color = [1, 1, 1, 0.1],
        parent = game.canvas,
        parentAnchor = "mid-center",
        selfAnchor = "mid-center",
    ) {
        const name = this._generateName("element");
        const element = new UIElement(name, parent, parentAnchor, selfAnchor, color, width, height, -1000);
        this.elements.set(name, element);
        return element;
    }

    spawnText(
        text = "Text",
        textScale = 1,
        maxWidth = 260,
        color = [0, 0.7, 0, 1],
        bgColor = [0, 0.1, 0, 1],
    ) {
        const name = this._generateName("text");
        const textElement = new UIText(name, game.canvas, "mid-center", "mid-center", text, textScale, maxWidth, color, bgColor, -1000);
        this.elements.set(name, textElement);
        return textElement;
    }    

    spawnArray(
        vertical = true,
        align = "left", // or "center", "right"
        spacing = 5,
        color = [0.1, 0.2, 0.1, 0.8],
    ) {
        const name = this._generateName("array");
        const array = new UIArray(name, game.canvas, "mid-center", "mid-center", vertical, align, spacing, color, -1000);
        this.elements.set(name, array);
        return array;
    }    

    // other methods
    _generateName(type = "element") {
        return `ui-${this.indexCounter++}-${type}`;
    }

    getElement(name) {
        return this.elements.get(name);
    }

    destroyElement(name) {
        const element = this.elements.get(name);
        if (element) {
            this.game.destroyEntity(element.entity);
            this.elements.delete(name);
        }
    }

    clearAll() {
        for (const [name, element] of this.elements.entries()) {
            this.game.destroyEntity(element.entity);
        }
        this.elements.clear();
    }
}    

export function initUI() {
    let UI = new UIManager(game);
    
    // ## UI Element
    UI.spawnElement() // spawns default box at the center of the canvas
     // or with specified args...
    UI.spawnElement(300, 30, [1, 1, 1, 1], game.canvas, "top-center", "top-center");
    // setting anchor reference dynamically with `setAnchor()`:
    let box = UI.spawnElement() // default box
    box.setAnchor(game.canvas, "mid-right", "mid-right") // now box is in the right of the game.canvas

    // ## UI Text
    UI.spawnText("hello text");
    // ...or
    UI.spawnText("second text", 0.4, 100, [0,0,1,1], [1,1,1,0.0]).setAnchor(box, "top-left", "top-left");

    // ## UI Array Examples
    // array vertical center
    let arr = UI.spawnArray(true, "center", 4);
    arr.addChild(UI.spawnText("Status A", 1, 350));
    arr.addChild(UI.spawnText("Health = 232", 0.5));
    arr.addChild(UI.spawnText("Stamina = 50", 0.5));
    arr.addChild(UI.spawnText("Ammo = 35", 0.5));
    // array horizontal
    let arr2 = UI.spawnArray(false, "center", 8, [1,0,0,0.1]) // color red
    arr2.addChild(UI.spawnElement(30, 30))
    arr2.addChild(UI.spawnElement(30, 30))
    arr2.addChild(UI.spawnElement(30, 30))
    arr2.addChild(UI.spawnElement(30, 30))
    arr2.addChild(UI.spawnElement(30, 30))
    arr2.addChild(UI.spawnElement(50, 50))
    arr2.addChild(UI.spawnElement(30, 30))
    // ... it works recursively, meaning you can nest more than one array
    let parentArray = UI.spawnArray(true, "center", 10, [0,0,0,0]) // transparent
    parentArray.addChild(arr)
    parentArray.addChild(arr2)
    parentArray.setAnchor(game.canvas, "bot-center", "bot-center")
}
