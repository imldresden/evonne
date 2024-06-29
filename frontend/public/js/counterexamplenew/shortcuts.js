import {DATA_STRUCTURE} from "./datastructure.js";
import {
    TOOL_CLEAR_SELECTION,
    TOOL_GROUP,
    TOOL_HIDE,
    TOOL_LASSO_SELECTION,
    TOOL_MANAGER,
    TOOL_NORMAL_SELECTION,
    TOOL_RECTANGLE_SELECTION,
    TOOL_REDO,
    TOOL_SHOW_HIDDEN_NODES,
    TOOL_UNDO,
    TOOL_TOGGLE_SHORTENING_MODE
} from "./tools.js";
import {DRAW_MANAGER} from "./draw.js";

// key codes of the keys that are used for shortcuts
const KEY_CODE_Z = 90;
const KEY_CODE_Y = 89;
const KEY_CODE_G = 71;
const KEY_CODE_H = 72;
const KEY_CODE_L = 76;
const KEY_CODE_R = 82;
const KEY_CODE_C = 67;
const KEY_CODE_N = 78;
const KEY_CODE_S = 83;
const KEY_CODE_M = 77;

/**
 * Event that is triggered when the user presses a key
 * @param event
 */
function handleKeyDown(event) {

    // Get the key event that is stored inside the key handle by the key code
    let keyEvent = KEY_PRESS_HANDLER.get(event.keyCode);
    // if there is no key event mapped to this key code nothing will happen
    if (keyEvent === undefined) return;
    // if the key event needs the ctrl key to be pressed, but the ctrl key isn't pressed, nothing will happen
    if (keyEvent.ctrlKeyPressed && !event.ctrlKey) return;
    // if the key event needs the ctrl key and the ctrl key is pressed, then we have to prevent the default event to be triggered
    if (keyEvent.ctrlKeyPressed && event.ctrlKey) {
        event.preventDefault();
    }

    keyEvent.callback();
}

/**
 * activate the short cut listener
 */
function activateKeyPressListener() {
    document.addEventListener("keydown", handleKeyDown);
}
/**
 * deactivate the short cut listener, e.g. when the user types something into the search bar
 */
function deactivateKeyPressListener() {
    document.removeEventListener("keydown", handleKeyDown);
}

/**
 * this class manages the key events
 */
class KeyPressHandler {

    constructor() {
        this.map = {};
    }

    /**
     * Register a new event which will be triggered, when the key with keycode is pressed
     * @param {number}keyCode from the keydown event
     * @param {KeyEvent}keyEvent the event that is supposed to be triggered by pressing the key mapped to the keyCode
     */
    register(keyCode, keyEvent) {
        this.map[keyCode] = keyEvent;
    }

    get(keyCode) {
        return this.map[keyCode];
    }
}

class KeyEvent {

    /**
     * Event for key presses
     * @param {function}callback function that will be executed when the user presses a key (the key is stored inside the {@link KeyPressHandler})
     * @param {boolean}ctrlKeyPressed if this is set to true, the event will only be triggered when the user is also pressing the CTRL key
     */
    constructor(callback, ctrlKeyPressed = false) {
        this.callback = callback;
        this.ctrlKeyPressed = ctrlKeyPressed;
    }

}

/**
 * Singleton instance of the KeyPressHandler
 * @type {KeyPressHandler}
 */
const KEY_PRESS_HANDLER = new KeyPressHandler();

// register "g" to perform grouping
KEY_PRESS_HANDLER.register(KEY_CODE_G, new KeyEvent(function () {
    TOOL_MANAGER.execute(TOOL_GROUP);
}));

// register CTRL + Z to perform undo
KEY_PRESS_HANDLER.register(KEY_CODE_Z, new KeyEvent(function () {
    TOOL_MANAGER.execute(TOOL_UNDO);
}, true));

// register CTRL + Y to perform redo
KEY_PRESS_HANDLER.register(KEY_CODE_Y, new KeyEvent(function () {
    TOOL_MANAGER.execute(TOOL_REDO);
}, true));

// J key to test something, if this is still here if somebody else is reading it I just forgot to delete it :)
// if so: Hope you are having a nice day! And I hope you dont have that many problems understanding my code ^^ have fun :P
KEY_PRESS_HANDLER.register(74, new KeyEvent(function () {
    DATA_STRUCTURE.debug = !DATA_STRUCTURE.debug;
    DRAW_MANAGER.draw(DATA_STRUCTURE.buildSnapshot());
    console.log("REMOVE THIS FUNCTION")
}));

// register H to perform hide
KEY_PRESS_HANDLER.register(KEY_CODE_H, new KeyEvent(function () {
    TOOL_MANAGER.execute(TOOL_HIDE);
}));

// register L to perform hide
KEY_PRESS_HANDLER.register(KEY_CODE_L, new KeyEvent(function () {
    TOOL_MANAGER.execute(TOOL_LASSO_SELECTION);
}));

// register R to perform selection mode normal
KEY_PRESS_HANDLER.register(KEY_CODE_R, new KeyEvent(function () {
    TOOL_MANAGER.execute(TOOL_RECTANGLE_SELECTION);
}));

// register C to perform selection mode normal
KEY_PRESS_HANDLER.register(KEY_CODE_C, new KeyEvent(function () {
    TOOL_MANAGER.execute(TOOL_CLEAR_SELECTION);
}));

// register N to perform selection mode normal
KEY_PRESS_HANDLER.register(KEY_CODE_N, new KeyEvent(function () {
    TOOL_MANAGER.execute(TOOL_NORMAL_SELECTION);
}));

// register S to perform selection mode normal
KEY_PRESS_HANDLER.register(KEY_CODE_S, new KeyEvent(function () {
    TOOL_MANAGER.execute(TOOL_SHOW_HIDDEN_NODES);
}));

// register m to toggle the shortening mode
KEY_PRESS_HANDLER.register(KEY_CODE_M, new KeyEvent(function () {
    TOOL_MANAGER.execute(TOOL_TOGGLE_SHORTENING_MODE);
}))


export {activateKeyPressListener, deactivateKeyPressListener};

