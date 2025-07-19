import game from "/classic/state.js";
import { Rectangle } from "/classic/transforms.js";
import { Collider } from "/classic/collision.js";

// type Anchor =
//     | 'top-left' | 'top-center' | 'top-right'
//     | 'mid-left' | 'mid-center' | 'mid-right'
//     | 'bot-left' | 'bot-center' | 'bot-right';

// Most basic UI class is UIElement, from this other elements can be extanded.
class UIElement {
    constructor(name, parent, parentAnchor, selfAnchor, color) {
        this.parent = parent;
        this.parentAnchor = parentAnchor;
        this.selfAnchor = selfAnchor;

        this.width = 100;
        this.height = 100;

        // Spawn the entity
        this.entity = game.spawnEntity(`ui-${name}`);

        // Initial position
        const [x, y] = this.calculateGlobalPos();

        // Add Rectangle component
        this.rectangle = this.entity.addComponent(
            Rectangle,
            [x, y, -1000], // pos
            [this.width, this.height, 1], // scale
            color, // color
            true // ignoreCam
        );

        // Register update loop
        this.entity.registerCall("refreshUI", () => {
            const [nx, ny] = this.calculateGlobalPos();
            this.rectangle.position = [nx, ny, -1000];
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
        const parentPos = this.parent instanceof UIElement
            ? this.parent.calculateGlobalPos()
            : [0, 0]; // If root (canvas), assume 0,0
    
        const pw = this.parent.width;
        const ph = this.parent.height;
        const parentOffset = this.getAnchorOffset(this.parentAnchor, pw, ph);
        const selfOffset = this.getAnchorOffset(this.selfAnchor, this.width, this.height);
    
        return [
            parentPos[0] + parentOffset.x - selfOffset.x,
            parentPos[1] + parentOffset.y - selfOffset.y
        ];
    }
}    

// // Objective: Final API based on UIManager class
//
// let UI = new.UImanager(game)
// let panel = UI.spawnPanel(args...)
// let button = UI.spawnBtn(args...)
// let text = UI.spawnText(args..)
// ...
class UIManager {
    constructor(gameInstance) {
        this.game = gameInstance;
        this.elements = new Map(); // name -> UIElement
    }

    spawnElement(name, parent, parentAnchor, selfAnchor, color = [0, 0, 0, 0.3]) {
        if (this.elements.has(name)) {
            console.error(`[UIManager] Error: can't spawn element with duplicated name "${name}"`);
            return null;
        }

        const element = new UIElement(name, parent, parentAnchor, selfAnchor, color);
        this.elements.set(name, element);
        return element;
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
    
    UI.spawnElement( "box", game.canvas, "top-left", "top-left")
    UI.spawnElement( "box1", game.canvas, "top-center", "top-center");
    UI.spawnElement( "box1", game.canvas, "top-right", "top-right"); // consol.warn same name!

    let parent = UI.spawnElement( "boxParent", game.canvas, "mid-center", "mid-center");
    let child = UI.spawnElement("boxChild", parent, "mid-center", "top-right", [1,0,0,0.1])
    child.destroyElement
}
