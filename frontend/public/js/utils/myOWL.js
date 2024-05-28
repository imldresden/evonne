// OWL Related Functions
const owlFunctions = {
    //Used when converting the ontology file into OWL/XML format
    getOWlFileName: function (name) {
        let n = name;
        if (name.endsWith(".owl"))
            return n;

        if (name.includes("."))
            n = name.substring(0, name.lastIndexOf("."));
        else
            n = name

        return n + ".owl";
    }
}

export {owlFunctions};