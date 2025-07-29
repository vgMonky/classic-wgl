import game from "/classic/state.js";
import { Rectangle, Text } from "/classic/transforms.js";
import { Collider } from "/classic/collision.js";

// // Objective: Final API based on UIManager class
// ...

// type Anchor =
//     | 'top-left' | 'top-center' | 'top-right'
//     | 'mid-left' | 'mid-center' | 'mid-right'
//     | 'bot-left' | 'bot-center' | 'bot-right';


// --- Most basic UI class  of the system is UIElement,
//     from this other elements can be extended ---

// A UIElement is just an entity with a rectangle component,
// its just an object that ocupies some space in the screen
// *extract parent anchoring to UIPanael
class UIElement {
    constructor(
        name, //: string
        color, //: [n, n, n, n] -> number between 0-1
        width, //: number -> pixels
        height, //: nubmer -> pixels
        zlayer //: number
    ) { 
        this.width = width;
        this.height = height;
        this.position = [0, 0]

        // Spawn the entity
        this.entity = game.spawnEntity(name); // prefixed from UIManager

        // Add Rectangle component using position
        const [x, y] = this.position;
        this.rectangle = this.entity.addComponent(
            Rectangle,
            [x, y, zlayer], // pos
            [this.width, this.height, 1], // scale
            color, // color
            true // ignoreCam
        );
    }
    
    setPosition(x, y) {
        this.position = [x, y];
        this.rectangle.position = [x, y, this.rectangle.position[2]];
        
        // if its a layout container...
        if (typeof this.setChildrenPos === "function") {
            this.setChildrenPos();
        }
        return this;
    }

    setSize(width, height) {
        this.width = width;
        this.height = height;
    }
  
}

 
class UIText extends UIElement {
    constructor(
        name,
        text,
        textScale,
        maxWidth,
        color,
        bgColor,
        zlayer
    ) {
        // Setup font and sizing before calling super
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

        // Now we can safely call super
        super(name, bgColor, autoWidth, autoHeight, zlayer);

        // Assign the rest
        this.textScale = textScale;
        this.color = color;
        this.fontSize = fontSize;
        this.glyphSize = glyphSize;
        this.glyphStr = glyphStr;
        this.maxWidth = maxWidth;
        this.maxCharPerLine = maxCharPerLine;
        this.textComps = [];

        // Create text lines
        this.setText(text);

        // Let refreshUI reposition text lines
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

    setText(str) {
        for (let comp of this.textComps) {
            this.entity.removeComponent(comp);
        }
        this.textComps = [];

        const lines = UIText.wrapText(str, this.maxCharPerLine);
        const lineHeight = this.glyphSize[1] * this.textScale;

        for (let i = 0; i < lines.length; i++) {
            const textComp = this.entity.addComponent(
                Text,
                [0, 0, this.rectangle.position[2]], // position will be updated in refresh
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
            textComp.setText(lines[i].toUpperCase());
            this.textComps.push(textComp);
        }

        this._refreshPositions();
    }

    _refreshPositions() {
        const [x, y] = this.position;
        const lineHeight = this.glyphSize[1] * this.textScale;

        for (let i = 0; i < this.textComps.length; i++) {
            this.textComps[i].position = [x, y + i * lineHeight, this.rectangle.position[2]];
        }
    }
}

// class UISprite ...


// --- There are also "container elements" that recalculate their
//     children screen position based on some parameters
//     and logics, tho this desactivates the childrens automatic
//     self-positioning (check `_selfPositioned` flag in UIElement) ---

class UIPanel extends UIElement {
    constructor(
        name, //: string
        color, //: [n, n, n, n] -> number between 0-1
        width, //: number -> pixels
        height, //: number -> pixels
        zlayer //: number
    ) {
        super(name, color, width, height, zlayer);
        this.children = [];

        this.entity.registerCall("refreshUI", () => {
            this.setChildrenPos();
        });
    }

    addChild(child, selfAnchor = "mid-center", childAnchor = "mid-center") {
        this.children.push({ child, selfAnchor, childAnchor });
        return this;
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

    setChildrenPos() {
        const [panelX, panelY] = this.position;

        for (const { child, selfAnchor, childAnchor } of this.children) {
            const panelOffset = this.getAnchorOffset(selfAnchor, this.width, this.height);
            const childOffset = this.getAnchorOffset(childAnchor, child.width, child.height);

            const x = panelX + panelOffset.x - childOffset.x;
            const y = panelY + panelOffset.y - childOffset.y;

            child.setPosition(x, y);

        }
    }
}



// UIArray: Container element that positions its children based
//          on an array layout rule, and it adquires the width and 
//          height of the total size of its children and gaps
class UIArray extends UIElement {
    constructor(
        name, //: string
        vertical, //: bool
        align, //: left" | "center" | "right"
        spacing, //: number -> pixels
        color, //: [n, n, n, n] -> number between 0-1
        zlayer //: number
    ) {
        super(name, color, 10, 10, zlayer);
        this.vertical = vertical;
        this.align = align;
        this.spacing = spacing;
        this.children = [];

        this.entity.registerCall("refreshUI", () => {
            this.setChildrenPos();
        });
    }

    addChild(child) {
        this.children.push(child);
        return this;
    }

    setChildrenPos() {
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
    
        totalMain = Math.max(0, totalMain - this.spacing);
    
        // Step 2: Resize self
        this.width = isVertical ? maxCross : totalMain;
        this.height = isVertical ? totalMain : maxCross;
        this.rectangle.scale = [this.width, this.height, 1];
    
        // Step 3: Position each child
        const [startX, startY] = this.position;
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
    
            const x = isVertical ? startX + crossOffset : startX + offset;
            const y = isVertical ? startY + offset : startY + crossOffset;
    
            child.setPosition(x, y);
            offset += main + this.spacing;
        }
    }    
}

// UIPadding: Container element that repositions its children in the global pos
//            considering a padding size for each side.

// UIPanel: Container element that repositions its children in the global pos
//          based on its own position, a self anchor, and a child anchor.


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
    ) {
        const name = this._generateName("element");
        const element = new UIElement(name, color, width, height, -1000);
        this.elements.set(name, element);
        return element;
    }

    spawnPanel(
        width = 300,
        height = 200,
        color = [0.2, 0.2, 0.8, 1],
    ) {
        const name = this._generateName("panel");
        const panel = new UIPanel(name, color, width, height, -1000);
        this.elements.set(name, panel);
        return panel;
    }

    spawnText(
        text = "Text",
        textScale = 1,
        maxWidth = 260,
        color = [0, 0.7, 0, 1],
        bgColor = [0, 0.1, 0, 1],
    ) {
        const name = this._generateName("text");
        const textElement = new UIText(name, text, textScale, maxWidth, color, bgColor, -1000);
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
        const array = new UIArray(name, vertical, align, spacing, color, -1000);
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

    UI.spawnPanel(game.canvas.width, game.canvas.height / 2, [0.2, 0.2, 0.8, 1])
        .setPosition(10, 10)
        .addChild(
            UI.spawnPanel(200, 200, [1, 1, 1, 1])
                .addChild(
                    UI.spawnArray(true, "left", 10, [0.2, 0.5, 0.2, 0.5])
                        .addChild(UI.spawnElement(50, 50, [1, 0, 0, 1]))
                        .addChild(UI.spawnElement(60, 60, [0, 1, 0, 1]))
                        .addChild(UI.spawnElement(30, 30, [1, 1, 0, 1])),
                    "top-left", "top-left"
                )
                .addChild(
                    UI.spawnText("hello"),
                    "bot-center", "top-center"
                ),
            "bot-center", "mid-center"
        );
}



// examples:
export function initTut() {

}

export function initMenu() {

}
