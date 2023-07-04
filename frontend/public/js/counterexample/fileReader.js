/**
 * this file handles the reading of the generated files
 */

import {DATA_STRUCTURE} from "./datastructure.js";

/**
 * Read the json file mapper.json
 * @param {string}url url to the file
 * @returns {Promise<any>} content of the file
 */
async function readJson(url) {
    const response = await fetch(url);
    return response.json();
}
/**
 * Read the xml file result.model.xml
 * @param {string}url url to the file
 * @returns {Promise<any>} content of the file
 */
async function readXML(url) {
    const response = await fetch(url);
    let text = response.text();
    return new window.DOMParser().parseFromString(await text, "text/xml");
}

/**
 * Read all related files and import the data
 * @returns {Promise<void>}
 */
async function readFiles() {
    let mappers = await readJson("js/counterexample/example/mapper.json");
    let model = await readXML("js/counterexample/example/result.model.xml");
    DATA_STRUCTURE.importData(mappers, model);
}

export {readFiles};