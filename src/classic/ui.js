import game from "/classic/state.js";
import { Rectangle, Text, Sprite } from "/classic/transforms.js";

// // Objective: Final API based on UIManager class,
// after having basic elements and layout system, create various components as examples 

// --- Most basic UI element of the system is UIElement,
//     from this other elements can be extended ---

// A UIElement is just an entity with a rectangle component,
// its just an object that ocupies some space in the screen
 class UIElement {
    constructor(
        name, //: string
        color, //: [r, g, b, a] -> number between 0-1
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
            // border [width, color, radius]
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
        name, //: string
        text, //: string
        textScale, //: number
        maxWidth, //: number
        // a lineHeight argument?
        color, //: [r, g, b, a]
        bgColor, //: [r, g, b, a]
        zlayer //: number
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
        return this
    }
    

    _refreshPositions() {
        const [x, y] = this.position;
        const lineHeight = this.glyphSize[1] * this.textScale;

        for (let i = 0; i < this.textComps.length; i++) {
            this.textComps[i].position = [x, y + i * lineHeight, this.rectangle.position[2]];
        }
    }
}

class UISprite extends UIElement {
    constructor(
        name,   //: string
        texture,       //: string -> texture name from manifest.json
        width,         //: number -> pixels
        height,        //: number -> pixels
        frame,     //: number -> sprite sheet frame
        tileSetSize, //: number -> tiles in texture
        color, //: [r,g,b,a]
        zlayer //: number
    ) {
        super(name, color, width, height, zlayer);

        // Add Sprite component
        this.spriteComp = this.entity.addComponent(
            Sprite,
            [this.position[0], this.position[1], zlayer],
            [width / (64 * tileSetSize[0]) , height / (64 * tileSetSize[1]), 1], // scale in terms of pixels / texture? adjust if needed
            texture,
            true,             // ignoreCam → screen-space
            frame,
            tileSetSize,
            [0, 0] // dont change this anchor, use container element instead (e.g. UIAnchor)
        );

        this.tileSetSize = tileSetSize

        // Optional: update position on refresh
        this.entity.registerCall("refreshUI", () => {
            this._refreshPosition();
        });
    }

    _refreshPosition() {
        const [x, y] = this.position;
        this.spriteComp.position = [x, y, this.spriteComp.position[2]];
    }

    setPosition(x, y) {
        super.setPosition(x, y);
        this._refreshPosition();
        return this;
    }

    setSize(width, height) {
        super.setSize(width, height);
        // Update scale accordingly
        this.spriteComp.scale = [width / (64 * this.tileSetSize[0]), height / (64 * this.tileSetSize[1]), 1]; // adjust 64 if needed
        return this;
    }

    setFrame(frame) {
        this.spriteComp.frame = frame;
        return this;
    }
}


// --- There are also "container elements" that recalculate their
//     children screen position based on some parameters
//     and logics -> with addChild(params) & setChildrenPos(params) ---
//     Should we create a base class UIContainer extending UIElement ???

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
        color, //: [r, g, b, a] -> number between 0-1
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

// UIPadding: Container element that repositions its child
//            considering a padding size for each side.
class UIPadding extends UIElement {
    constructor(
        name, //: string
        padding, //: [top, right, bottom, left]
        color, //: [r, g, b, a]
        zlayer, //: number
    ) {
        // Start with dummy size; will be recalculated later
        super(name, color, 10, 10, zlayer);

        this.padding = padding;
        this.child = null;

        this.entity.registerCall("refreshUI", () => {
            this.setChildrenPos();
        });
    }

    addChild(child) {
        if (this.child) {
            throw new Error("UIPadding can only have one child!");
        }
        this.child = child;
        this.setChildrenPos();
        return this;
    }

    setPadding(padding) {
        this.padding = padding;
        this.setChildrenPos();
        return this;
    }

    setChildrenPos() {
        if (!this.child) return;

        const [top, right, bottom, left] = this.padding;

        // Recalculate self size: child size + padding
        this.width = this.child.width + left + right;
        this.height = this.child.height + top + bottom;
        this.rectangle.scale = [this.width, this.height, 1];

        // Reposition child inside
        const [x, y] = this.position;
        const childX = x + left;
        const childY = y + top;
        this.child.setPosition(childX, childY);
    }

    setPosition(x, y) {
        this.position = [x, y];
        this.rectangle.position = [x, y, this.rectangle.position[2]];

        // Update child pos too
        this.setChildrenPos();
        return this;
    }
}

// UIPanel: Container element that has a specific size, making the inner content
//          only render what fits in the panel. It should include scroll
//          behaiviour and scroll bar if inner content excedes the panel size.




// --- OKAY!!!
// --- How to use all this elements above? ---
class UIManager {
    constructor(gameInstance) {
        this.game = gameInstance;
        this.elements = new Map(); // name -> UIElement
        this.indexCounter = 0;
        this.zlayer = -1000;
    }

    // spawn methods
    spawnElement(
        width = 100,
        height = 100,
        color = [1, 1, 1, 0.1],
    ) {
        const name = this._generateName("element");
        const element = new UIElement(name, color, width, height, this.zlayer);
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
        const textElement = new UIText(name, text, textScale, maxWidth, color, bgColor, this.zlayer);
        this.elements.set(name, textElement);
        return textElement;
    }    

    spawnSprite(
        texture = "editorIcons",   // texture name from manifest.json
        width = 64,                // width in pixels
        height = 64,               // height in pixels
        frame = 0,                 // sprite sheet frame
        tileSetSize = [1, 1],      // tiles in texture
        color = [1,1,1,0.2]
    ) {
        const name = this._generateName("sprite");
        const sprite = new UISprite(name, texture, width, height, frame, tileSetSize, color, this.zlayer);
        this.elements.set(name, sprite);
        return sprite;
    }    

    spawnArray(
        vertical = true,
        align = "left", // or "center", "right"
        spacing = 5,
        color = [0.1, 0.2, 0.1, 0.8],
    ) {
        const name = this._generateName("array");
        const array = new UIArray(name, vertical, align, spacing, color, this.zlayer);
        this.elements.set(name, array);
        return array;
    }

    spawnAnchor(
        width = 300,
        height = 200,
        color = [0.06, 0.15, 0.06, 1],
    ) {
        const name = this._generateName("panel");
        const panel = new UIAnchor(name, color, width, height, this.zlayer);
        this.elements.set(name, panel);
        return panel;
    }

    spawnPadding(
        padding = [10, 10, 10, 10],
        color = [0.1, 0.1, 0.1, 0.1],
    ) {
        const name = this._generateName("padding");
        const pad = new UIPadding(name, padding, color, this.zlayer);
        this.elements.set(name, pad);
        return pad;
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
    let root = UI.spawnAnchor(game.canvas.width, game.canvas.height, [0.02,0.15,0.04,0.7])

    root.entity.registerCall("refreshUI", () => {
        root.setSize(game.canvas.width, game.canvas.height)
    });


    // items component
    let s = 40
    let menu = UI.spawnArray(false, "center", 9, [0,0.2,0,0])
        .addChild(UI.spawnAnchor(s, s)
            .addChild(UI.spawnText("1",0.5, 50, [1,1,1,1])))
        .addChild(UI.spawnAnchor(s, s)
            .addChild(UI.spawnText("2",0.5, 50, [1,1,1,1])))
        .addChild(UI.spawnAnchor(s, s)
            .addChild(UI.spawnText("3",0.5, 50, [1,1,1,1])))
        .addChild(UI.spawnAnchor(s+15, s+15)
            .addChild(UI.spawnText("4",0.8, 500, [1,1,1,1])
                .setText("u")))
        .addChild(UI.spawnAnchor(s, s).addChild(UI.spawnText("5",0.5, 50, [1,1,1,1])))
        .addChild(UI.spawnAnchor(s, s).addChild(UI.spawnText("6",0.5, 50, [1,1,1,1])))
        .addChild(UI.spawnAnchor(s, s).addChild(UI.spawnText("7",0.5, 50, [1,1,1,1])))
    root.addChild(menu, "bot-center", "bot-center")

    // game over component
    // create the elements
    let gameover = UI.spawnPadding([40, 40, 40, 40], [0,0.1,0,1])
    let content = UI.spawnArray(true, "center", 12, [0,0,0,0])
    let text1 = UI.spawnText("Game over", 1.4, 200, [0.8,0.2,0.2,1])        
    let text2 = UI.spawnText("start again", 0.5, 200, undefined, [0,0.3,0,0.05])
    // nest the elements
    content.addChild(text1)
    content.addChild(text2)
    gameover.addChild(content)
    root.addChild(gameover, "mid-center", "mid-center");
    // test pad animation
    root.entity.registerCall("refreshUI", () => {
        let max = 50;
        let min = 40;
    
        // Use time (in ms) to animate the sine wave
        let t = Date.now() / 200; // adjust divisor to change speed
        let sine = Math.sin(t); // oscillates between -1 and 1
    
        // Map sine wave [-1,1] to [min,max]
        let value = min + (sine + 1) / 2 * (max - min);
    
        // Apply padding
        gameover.setPadding([value, value, value, value]);
    });
    

    // minimap component
    let minimap = UI.spawnPadding([10,10,10,10], [0,0.1,0,0.9])
        .addChild(UI.spawnAnchor(200, 200, [0,0,0,0])
            .addChild(
                UI.spawnText("mini map,   lets try some text wrapping here :)", 0.4, 200, [0,0.8,0,1], [0,0.1,0,1]),
                "bot-left", "bot-left"
            )
        )
    root.addChild(minimap,"top-right", "top-right")

    // fps counter component
    let fpsPad = UI.spawnPadding([5,5,5,5], [0,0.1,0,1])
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
    fpsPad.addChild(fpsC)


    // sprite test component
    let myAnchor = UI.spawnAnchor(60, 60, [1,1,1,0.1])
    let mySprite = UI.spawnSprite("editorIcons", 60, 60, 0, [4, 4]);
    myAnchor.addChild(mySprite, "top-right", "mid-center")
    root.addChild(myAnchor, "bot-left", "bot-left")

    // test sprite size animation
    root.entity.registerCall("refreshUI", () => {
        let max = 80;
        let min = 60;
    
        // Use time (in ms) to animate the sine wave
        let t = Date.now() / 200; // adjust divisor to change speed
        let sine = Math.sin(t); // oscillates between -1 and 1
    
        // Map sine wave [-1,1] to [min,max]
        let value = min + (sine + 1) / 2 * (max - min);
    
        // Apply padding
        mySprite.setSize(value, value);
    });

}
