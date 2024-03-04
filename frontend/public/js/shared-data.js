import { LabelsShorteningHelper } from "./shortening/helper.js";
import { ContextMenu } from "./utils/context-menu.js";

// this file should only contain variables and functions which are used across views. 
// Keep it clean! 

const globals = {
  shorteningMethod: "camel",
  fontCharacterWidth: 8.1,
  contextMenu: new ContextMenu(),
  labelsShorteningHelper: new LabelsShorteningHelper(),  
}

export { globals };