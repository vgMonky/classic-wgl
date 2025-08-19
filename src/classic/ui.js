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
        
        // if its a layout container set recursive...
        if (typeof this.setChildrenPos === "function") {
            this.setChildrenPos();
        }
        return this;
    }

    setSize(width, height) {
        this.width = width;
        this.height = height;
        this.rectangle.scale = [this.width, this.height, 1]
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
        const lines = UIText.wrapText(str, this.maxCharPerLine);
    
        // If we have fewer lines now, remove the extra components
        while (this.textComps.length > lines.length) {
            const comp = this.textComps.pop();
            this.entity.removeComponent(comp);
        }
    
        // Update existing components and add new ones if needed
        for (let i = 0; i < lines.length; i++) {
            if (this.textComps[i]) {
                // Just update the text of the existing component
                this.textComps[i].setText(lines[i].toUpperCase());
            } else {
                // Create new component if not enough
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
//     and logics ---

// UIAnchor: Container element that repositions its children in the global pos
//          based on its own position, a self anchor, and a child anchor.
class UIAnchor extends UIElement {
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

// UIPanel: Container element that has a specific size, making the inner content
//          only render what fits in the panel. It should also include scroll
//          behaiviour and scroll bar. 


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

    spawnAnchor(
        width = 300,
        height = 200,
        color = [0.06, 0.15, 0.06, 1],
    ) {
        const name = this._generateName("panel");
        const panel = new UIAnchor(name, color, width, height, -1000);
        this.elements.set(name, panel);
        return panel;
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

    // root element, UI manager should internally set this maybe?
    // for sure it will allways be necesarry because only parents can calculate elements position
    let root = UI.spawnAnchor(game.canvas.width, game.canvas.height, [0.02,0.15,0.04,0.8])

    root.entity.registerCall("refreshUI", () => {
        root.setSize(game.canvas.width, game.canvas.height)
    });


    // items component
    let s = 40
    let menu = UI.spawnArray(false, "center", 9, [0,0.2,0,0])
        .addChild(UI.spawnAnchor(s, s).addChild(UI.spawnText("1",0.5, 50, [1,1,1,1])))
        .addChild(UI.spawnAnchor(s, s).addChild(UI.spawnText("2",0.5, 50, [1,1,1,1])))
        .addChild(UI.spawnAnchor(s, s).addChild(UI.spawnText("3",0.5, 50, [1,1,1,1])))
        .addChild(UI.spawnAnchor(s+15, s+15).addChild(UI.spawnText("4",0.8, 50, [1,1,1,1])))
        .addChild(UI.spawnAnchor(s, s).addChild(UI.spawnText("5",0.5, 50, [1,1,1,1])))
        .addChild(UI.spawnAnchor(s, s).addChild(UI.spawnText("6",0.5, 50, [1,1,1,1])))
        .addChild(UI.spawnAnchor(s, s).addChild(UI.spawnText("7",0.5, 50, [1,1,1,1])))
    root.addChild(menu, "bot-center", "bot-center")

    // game over component
    // we need padding container here!!!
    let gameover = UI.spawnArray(true, "center", 12, [0,0.1,0,1])
        .addChild(UI.spawnText("Game over", 1.4, 200, [0.8,0.2,0.2,1]))
        .addChild(UI.spawnText("start again", 0.5, 200, [1,1,1,1], [0,0.3,0,1]))
    root.addChild(gameover, "mid-center", "mid-center")

    // minimap component
    let minimap = UI.spawnAnchor(200, 200, [0,0.1,0,0.9])
        .addChild(
            UI.spawnText("mini map,   lets try some text wrapping here :)", 0.4, 200, [1,1,1,1], [0,0,0,0])
        )
    root.addChild(minimap,"top-right", "top-right")

    // fps counter component
    let fpsC = UI.spawnText("fps", 0.8, 100);
    let lastFPS = 0;
    let timeAccumulator = 0;
    fpsC.entity.registerCall("refreshUI", () => {
        timeAccumulator += game.deltaTime;
        if (timeAccumulator >= 0.1) {
            lastFPS = game.fps;
            fpsC.setText(lastFPS.toString());
            timeAccumulator = 0;
        }
    });

}



// examples:
export function initTut() {

}

export function initMenu() {

}
