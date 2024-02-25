import { globals } from "../shared-data.js";
import { proof } from "./proof.js";

const openOntology = document.getElementById('openOntologyInNew');
const proofWidthRange = document.getElementById("proofWidthRange");
const proofHeightRange = document.getElementById("proofHeightRange");

//Inputs
const minHorizontalCompactnessInput = document.getElementById("minHorizontalCompactness");
const maxHorizontalCompactnessInput = document.getElementById("maxHorizontalCompactness");
const minVerticalCompactnessInput = document.getElementById("minVerticalCompactness");
const maxVerticalCompactnessInput = document.getElementById("maxVerticalCompactness");

//Selections
const shorteningMethodSelection = document.getElementById("shorteningMode");
const maxLengthInput = document.getElementById("maximumLength");
const maxLengthInputReset = document.getElementById("maximumLengthReset");
const tooltipPositionSelection = document.getElementById("toolTipPosition");

//Toggle buttons
const allowOverlapBtn = document.getElementById("toggleAllowOverlap");
const showRulesBtn = document.getElementById("toggleRulesDisplay");
const magicToggleBtn = document.getElementById("toggleMagicMode");
const layoutToggleBtn = document.getElementById("toggleLayoutMode");
const shortenRules = document.getElementById("toggleRuleNamesShortening");
const planarToggleBtn = document.getElementById("togglePlanar");
const overlapAllowingSettings = document.getElementById("proof-overlap-allowing-settings");

//Buttons
const collapseAll = document.getElementById("collapseAll");
const shortenAllBtn = document.getElementById("shortenAllInProofBtn");
const proofWidthRangeResetBtn = document.getElementById("proofWidthRangeReset");
const proofHeightRangeResetBtn = document.getElementById("proofHeightRangeReset");

const controls = [
    {
        name: "allowOverlapBtn",
        el: allowOverlapBtn,
        fn: allowOverlapBtnFunction,
        type: 'click'
    },
    {
        name: "showRulesBtn",
        el: showRulesBtn,
        fn: showRulesBtnFunction,
        type: 'click'
    },
    {
        name: "collapseAll",
        el: collapseAll,
        fn: collapseAllBtnFunction,
        type: 'click'
    },
    {
        name: "magicToggleBtn",
        el: magicToggleBtn,
        fn: magicToggleBtnFunction,
        type: 'click'
    },
    {
        name: "layoutToggleBtn",
        el: layoutToggleBtn,
        fn: layoutToggleBtnFunction,
        type: 'click'
    },
    {
        name: "planarToggleBtn",
        el: planarToggleBtn,
        fn: planarToggleBtnFunction,
        type: 'click'
    },
    {
        name: "shortenAllBtn",
        el: shortenAllBtn,
        fn: shortenAllBtnFunction,
        type: 'click'
    },
    {
        name: "shortenRules",
        el: shortenRules,
        fn: shortenRulesFunction,
        type: 'click'
    },
    {
        name: "maxLengthInputReset",
        el: maxLengthInputReset,
        fn: maxLengthInputResetFunction,
        type: 'click'
    },
    {
        name: "proofWidthRangeResetBtn",
        el: proofWidthRangeResetBtn,
        fn: proofWidthRangeResetBtnFunction,
        type: 'click'
    },
    {
        name: "proofHeightRangeResetBtn",
        el: proofHeightRangeResetBtn,
        fn: proofHeightRangeResetBtnFunction,
        type: 'click'
    },
    {
        name: "openOntology",
        el: openOntology,
        fn: openOntologyFunction,
        type: 'click'
    },
    {
        name: "maxLengthInput",
        el: maxLengthInput,
        fn: maxLengthInputFunction,
        type: 'input'
    },
    {
        name: "minHorizontalCompactnessInput",
        el: minHorizontalCompactnessInput,
        fn: minHorizontalCompactnessInputFunction,
        type: 'input'
    },
    {
        name: "maxHorizontalCompactnessInput",
        el: maxHorizontalCompactnessInput,
        fn: maxHorizontalCompactnessInputFunction,
        type: 'input'
    },
    {
        name: "proofWidthRange",
        el: proofWidthRange,
        fn: proofWidthRangeFunction,
        type: 'input'
    },
    {
        name: "minVerticalCompactnessInput",
        el: minVerticalCompactnessInput,
        fn: minVerticalCompactnessInputFunction,
        type: 'input'
    },
    {
        name: "maxVerticalCompactnessInput",
        el: maxVerticalCompactnessInput,
        fn: maxVerticalCompactnessInputFunction,
        type: 'input'
    },
    {
        name: "proofHeightRange",
        el: proofHeightRange,
        fn: proofHeightRangeFunction,
        type: 'input'
    },
    {
        name: "shorteningMethodSelection",
        el: shorteningMethodSelection,
        fn: shorteningMethodSelectionFunction,
        type: 'change'
    },
    {
        name: "tooltipPositionSelection",
        el: tooltipPositionSelection,
        fn: tooltipPositionSelectionFunction,
        type: 'change'
    },
    {
        name: "window",
        el: window,
        fn: windowFunction,
        type: 'resize'
    },
    {
        name: "document",
        el: document,
        fn: documentFunction,
        type: 'center-root'
    },
];

function allowOverlapBtnFunction() {
    proof.allowOverlap = allowOverlapBtn.checked;
    overlapAllowingSettings.style.display = proof.allowOverlap ? "block" : "none";
    proof.update();
}

function showRulesBtnFunction() {
    proof.showRules = showRulesBtn.checked;
    proof.update(true);
}

function collapseAllBtnFunction() {
    // disable magic mode
    magicToggleBtn.checked = false;
    proof.isMagic = false;
    proof.magic.currentMagicAction = "";
    proof.axioms.showConclusionOnly();
}

function getShowRulesWrapper() {
    return showRulesBtn && document.getElementById("show-rules-div-wrapper");
}

function magicToggleBtnFunction() {
    // Clear the SVG content
    proof.svgRootLayer.selectAll("*").remove();
    proof.isMagic = magicToggleBtn.checked;
    
    if (magicToggleBtn.checked) {
        showRulesBtn.checked = true;
        proof.showRules = true;
        getShowRulesWrapper().style.display = "none";
   
    } else {
        getShowRulesWrapper().style.display = "flex";
        proof.magic.currentMagicAction = undefined;
    }

    proof.update(true);
}

function getPlanarWrapper() {
    return planarToggleBtn && document.getElementById("planar-div-wrapper");
}

function layoutToggleBtnFunction() {
    // Clear the SVG content
    proof.svgRootLayer.selectAll("*").remove();

    proof.isLinear = layoutToggleBtn.checked;

    if (layoutToggleBtn.checked) {
        getPlanarWrapper().style.display = "flex";
    } else {
        getPlanarWrapper().style.display = "none";
    }
    
    proof.update(true);
}

function planarToggleBtnFunction() {
    proof.linear.isDistancePriority = planarToggleBtn.checked;
    proof.update();
}

function updateShorteningButton() {
    if (!proof.shortenAll) {
        shortenAllBtn.textContent = "Shorten all";
        shortenAllBtn.title = "Shorten all text in the proof";
    } else {
        shortenAllBtn.textContent = "Undo shortening";
        shortenAllBtn.title = "Undo shortening effect in the proof";
    }
}

function shorten() {
    let nodeID;
    let nodesClass = proof.isRuleShort ? ".axiom,.rule" : ".axiom";

    if (!proof.shortenAll) {
        //Restore all to original
        nodesClass = ".axiom,.rule";
    }

    //Handle rules
    if (!nodesClass.includes("rule")) {
        d3.selectAll(".rule").filter(d => d).each(d => {
            nodeID = "N" + d.data.source.id;
            proof.nodeVisuals.nodesDisplayFormat.set(nodeID, "original");
            proof.nodeVisuals.nodesCurrentDisplayFormat.set(nodeID, "original");
        });
    }

    //Record the shortening
    d3.selectAll(nodesClass).filter(d => d).each(d => {
        nodeID = "N" + d.data.source.id;
        if (proof.shortenAll && proof.nodeVisuals.nodesDisplayFormat.get(nodeID) !== "textual") {
            proof.nodeVisuals.nodesDisplayFormat.set(nodeID, "shortened");
            proof.nodeVisuals.nodesCurrentDisplayFormat.set(nodeID, "shortened");
        } else if (proof.nodeVisuals.nodesDisplayFormat.get(nodeID) !== "textual") {
            proof.nodeVisuals.nodesDisplayFormat.set(nodeID, "original");
            proof.nodeVisuals.nodesCurrentDisplayFormat.set(nodeID, "original");
        }
    });

    //Redraw
    proof.update();
}

function shortenRulesFunction() {
    proof.isRuleShort = shortenRules.checked;
    shorten();
}

function shortenAllBtnFunction() {
    proof.shortenAll = !proof.shortenAll;
    updateShorteningButton();
    shorten();
}

function proofWidthRangeResetBtnFunction() {
    proofWidthRange.value = proof.width;
    proof.update();
}

function proofHeightRangeResetBtnFunction() {
    proofHeightRange.value = proof.height;
    proof.update();
}

function maxLengthInputFunction() {
    if (globals.labelsShorteningHelper) {
        globals.labelsShorteningHelper.applyShortening(globals.shorteningMethod);
        proof.update();
    }
}

function maxLengthInputResetFunction() {
    maxLengthInput.value = globals.labelsShorteningHelper._bSFs._maxLength;
    const badge = maxLengthInput.parentNode
        && maxLengthInput.parentNode.parentNode.querySelector("span.badge")

    if (badge) {
        badge.innerHTML = maxLengthInput.value
    }
    
    proof.update();
}

function minHorizontalCompactnessInputFunction() {
    const clampedMin =
        minHorizontalCompactnessInput.value * proof.width >
        proofWidthRange.value;
    proofWidthRange.min = fixDecimals(minHorizontalCompactnessInput.value * proof.width);

    if (clampedMin) {
        proofWidthRange.value = proofWidthRange.min;
        proof.width = proofWidthRange.min;
        proof.update();
    }
}

function maxHorizontalCompactnessInputFunction() {
    const clampedMax =
        maxHorizontalCompactnessInput.value * proof.width <
        proofWidthRange.value;
    proofWidthRange.max = fixDecimals(maxHorizontalCompactnessInput.value * proof.width);

    if (clampedMax) {
        proofWidthRange.value = proofWidthRange.max;
        proof.width = proofWidthRange.max;
        proof.update();
    }
}

function proofWidthRangeFunction() {
    proof.width = proofWidthRange.value;
    proof.update();
}

function minVerticalCompactnessInputFunction() {
    const clampedMin =
        minVerticalCompactnessInput.value * proof.height >
        proofHeightRange.value;
    proofHeightRange.min = fixDecimals(minVerticalCompactnessInput.value * proof.height);

    if (clampedMin) {
        proofHeightRange.value = proofHeightRange.min;
        proof.height = proofHeightRange.min;
        proof.update();
    }
}

function maxVerticalCompactnessInputFunction() {
    const clampedMax =
        maxVerticalCompactnessInput.value * proof.height <
        proofHeightRange.value;

    proofHeightRange.max = fixDecimals(maxVerticalCompactnessInput.value * proof.height);
    if (clampedMax) {
        proofHeightRange.value = proofHeightRange.max;
        proof.height = proofHeightRange.max;
        proof.update();
    }
}

function proofHeightRangeFunction() {
    proof.height = proofHeightRange.value;
    proof.update();
}

function openOntologyFunction() {
    window.open('/ontology?id=' + getSessionId())
}

function shorteningMethodSelectionFunction() {
    maxLengthInput.closest(".input-range-wrapper").style.display = shorteningMethodSelection.value === "basic" ? "block" : "none";

    globals.shorteningMethod = shorteningMethodSelection.value;
    proof.update();
}

function tooltipPositionSelectionFunction() {
    proof.ruleExplanationPosition = tooltipPositionSelection.value;
    proof.update();
}

function windowFunction() {
    proof.update();
}

function documentFunction() {
    if (proof.minimap) {
        if (!proof.allowOverlap) {
            proof.minimap.main.pan({ x: proof.width / 2, y: 0 });
        } else {
            proof.minimap.main.pan({ x: 0, y: 50 });
        }
    }
}

function init() {
    // set listeners
    let isHTMLValid = true;
    const missing = [];
    controls.forEach(control => {
        if (!control.el) {
            missing.push(control.name)
            isHTMLValid = false;
        } else {
            control.el.removeEventListener(control.type, control.fn);
            control.el.addEventListener(control.type, control.fn);
        }
    });

    if (missing.length !== 0) {
        console.error(`controls: [${missing.join(', ')}] invalid`)
    }

    if (!isHTMLValid) {
        return;
    }

    // configure the html 
    allowOverlapBtn.checked = false;
    overlapAllowingSettings.style.display = proof.allowOverlap ? "block" : "none";
    shortenRules.checked = false;

    magicToggleBtn.checked = false;
    layoutToggleBtn.checked = false;
    planarToggleBtn.checked = true;
    showRulesBtn.checked = true;
    getPlanarWrapper() ? getPlanarWrapper().style.display = "none" : "";

    shorteningMethodSelection.value = globals.shorteningMethod;
    maxLengthInput.closest(".input-range-wrapper").style.display = "none";

    updateShorteningButton();

    tooltipPositionSelection.value = proof.ruleExplanationPosition;

    proofWidthRange.max = fixDecimals(maxHorizontalCompactnessInput.value * proof.width);
    proofWidthRange.min = fixDecimals(minHorizontalCompactnessInput.value * proof.width);
    proofWidthRange.value = fixDecimals(proof.width);

    proofHeightRange.min = fixDecimals(minVerticalCompactnessInput.value * proof.height);
    proofHeightRange.max = fixDecimals(maxVerticalCompactnessInput.value * proof.height);
    proofHeightRange.value = fixDecimals(proof.height);
}

export { controls, init };
