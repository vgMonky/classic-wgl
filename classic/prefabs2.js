import game from "./state.js";
import { Rectangle } from "./transforms.js";
import { Collider } from "./collision.js";

// // Objective: Final API based on UIManager class
//
// let UI = new.UImanager(game)
// let panel = UI.spawnPanel(args...)
// let button = UI.spawnBtn(args...)
// let text = UI.spawnText(args..)
// ...

// type Anchor =
//     | 'top-left' | 'top-center' | 'top-right'
//     | 'mid-left' | 'mid-center' | 'mid-right'
//     | 'bot-left' | 'bot-center' | 'bot-right';

// Most basic UI class is UIElement, from this other elements can be extanded.
class UIElement {
    constructor(name, parent, parentAnchor, selfAnchor ) {
        this.parent = parent;
        this.parentAnchor = parentAnchor;
        this.selfAnchor = selfAnchor;

        this.width = 100;
        this.height = 100;

        // Spawn the entity
        this.entity = game.spawnEntity(`ui-${name}`);

        // Initial position
        const [x, y] = this.calculatePos();

        // Add Rectangle component
        this.rectangle = this.entity.addComponent(
            Rectangle,
            [x, y, -1000], // pos
            [this.width, this.height, 1], // scale
            [1, 0, 0, 0.3], // color
            true // ignoreCam
        );

        // Register update loop
        this.entity.registerCall("update", () => {
            const [nx, ny] = this.calculatePos();
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

    calculatePos() {
        const pw = this.parent.width;
        const ph = this.parent.height;
        const parentOffset = this.getAnchorOffset(this.parentAnchor, pw, ph);
        const selfOffset = this.getAnchorOffset(this.selfAnchor, this.width, this.height);

        return [parentOffset.x - selfOffset.x, parentOffset.y - selfOffset.y];
    }
}

export function initUI() {
    new UIElement( "box", game.canvas, "top-left", "top-left");
    new UIElement( "box1", game.canvas, "top-center", "top-center");
    new UIElement( "box2", game.canvas, "top-right", "top-right");
    new UIElement( "box3", game.canvas, "mid-left", "mid-left");
    new UIElement( "box4", game.canvas, "mid-center", "mid-center");
    new UIElement( "box5", game.canvas, "mid-right", "mid-right");
    new UIElement( "box6", game.canvas, "bot-left", "bot-left");
    new UIElement( "box7", game.canvas, "bot-center", "bot-center");
    new UIElement( "box8", game.canvas, "bot-right", "bot-right");
}
