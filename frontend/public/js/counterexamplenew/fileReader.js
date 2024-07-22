/**
 * this file handles the reading of the generated files
 */

import { createContent } from "./counterexample.js";

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
    let mappers = await readJson("js/counterexamplenew/example/mapper.json");
    let model = await readXML("js/counterexamplenew/example/result.model.xml");
    createContent(mappers, model);
}

export {readFiles};