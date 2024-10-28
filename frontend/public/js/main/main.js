import { init_proof, proof } from '../proof/proof.js';
import { init_ontology } from '../ontology/ontology.js';
import { upload } from '../utils/upload-file.js';

let status = {};
let interval = undefined;

const signaturePathText = document.getElementById("signatureFilePath");
const signaturePathFile = document.getElementById("uploadSignatureTrigger");
const browseFilePathText = document.getElementById("browseFilePath");
const clearSigFilePath = document.getElementById("clearSignatureFile");
const computeAxiomsBtn = document.getElementById('computeAxiomPairBtn');
const openSplit = document.getElementById('openSplitInNew');

window.onload = function () {
  //Mapping elements with events to their functions
  cytoscape.warnings(false);
  const thingsWithListeners = [
    { type: 'click', thing: clearSigFilePath, fn: clearSigFilePathFunction },
    { type: 'click', thing: computeAxiomsBtn, fn: computeAxiomsBtnFunction },
    { type: 'click', thing: openSplit, fn: openSplitFunction },
  ];

  // Remove listeners
  thingsWithListeners.forEach(twl => {
    if (twl && twl.thing) {
      twl.thing.removeEventListener(twl.type, twl.fn);
    }
  });

  const projects = document.getElementById("current-projects");
  projects && fetch('/projects')
    .then(res => res.json())
    .then(res => {
      res.projects.forEach(proj => {
        const project = document.createElement('div');
        project.className = 'collection-item';

        project.innerHTML = proj;
        project.onclick = () => {
          window.location.replace("/?id=" + proj);
        }

        projects.appendChild(project);
      });
    })
    .catch(error => {
      console.error('Error:', error);
    });

  if (computeAxiomsBtn && signaturePathText && signaturePathText && browseFilePathText) {
    computeAxiomsBtn.addEventListener('click', computeAxiomsBtnFunction);

    //Clear all input files fields
    signaturePathText.value = "";
    signaturePathFile.value = "";
    signaturePathText.classList.remove("valid");
    proof.signatureFile = undefined;

    browseFilePathText.value = "";
    browseFilePathText.classList.remove("valid");
    proof.proofFile = undefined;
  }

  if (clearSigFilePath) {
    clearSigFilePath.addEventListener("click", clearSigFilePathFunction);
  }

  if (openSplit) {
    openSplit.addEventListener("click", openSplitFunction)
  }

  init_views();
}

function createConceptDropdowns(concepts) {
  const lhs = document.getElementById('lhsConcepts');
  lhs.innerHTML = '';

  
  function sortNames(c1, c2) {
    let arg1 = c1.substring(c1.indexOf("#") + 1).toLowerCase();
    let arg2 = c2.substring(c2.indexOf("#") + 1).toLowerCase();

    if (arg1 < arg2) {
      return -1;
    }
    if (arg1 > arg2) {
      return 1;
    }
    return 0;
  }

  const lhsOptions = { truthy: [], falsey: [] }
  
  Object.keys(concepts)
    .sort(sortNames)
    .forEach(k => {
      if (k !== "owl:Nothing") {
        const concept = document.createElement('option');
        concept.value = k;
        concept.innerHTML = concepts[k].short;
        if (concepts[k].rhs && concepts[k].rhs.length > 0) {
          concept.classList.add('option-rhs-true');
          lhsOptions.truthy.push(concept);
        } else {
          concept.classList.add('option-rhs-false'); 
          lhsOptions.falsey.push(concept);
        }
      }
    });

  [ ...lhsOptions.truthy, 
    ...lhsOptions.falsey
  ].forEach(concept => {
    lhs.appendChild(concept);
  });
  
  const updateRHS = function () {
    const rhs = document.getElementById('rhsConcepts');
    rhs.innerHTML = '';

    const key = lhs.options[lhs.selectedIndex].value;
    const currentConcept = concepts[key];
    const conceptList = Object.keys(concepts);
    // decodes the encoding done on server.js to send less data
    const ccs = new Set(currentConcept.rhs.map(ek => conceptList[ek-100]));
    const rhsOptions = { truthy: [], falsey: [] };
    
    conceptList.forEach(rhsKey => {
      const rhsC = document.createElement('option');
      rhsC.value = rhsKey;
      rhsC.innerHTML = concepts[rhsKey].short;
      if (ccs.has(rhsKey)) {
        rhsC.classList.add('option-rhs-true');
        rhsOptions.truthy.push(rhsC);
      } else {
        rhsC.classList.add('option-rhs-false');
        rhsOptions.falsey.push(rhsC);
      }
    });

    [ ...rhsOptions.truthy, 
      ...rhsOptions.falsey
    ].forEach(concept => {
      rhs.appendChild(concept);
    });
  };
  updateRHS();

  lhs.removeEventListener('change', updateRHS);
  lhs.addEventListener('change', updateRHS);
}

function init_views(loop = false) {
  const urlParams = new URLSearchParams(window.location.search);
  if (!urlParams.get('id')) {
    return;
  }

  const modal = M.Modal.getInstance(document.getElementById('selectAxiomModal'));

  fetch('/project/?id=' + getSessionId())
    .then(res => res.json())
    .then(res => {
      status = res;
      console.log(res);

      if (res.status === 'custom' || res.reasoner === 'n/a') { // blank project
        clearInterval(interval);
        return;
      }

      blockProofMethods(res.reasoner);

      if (!loop) {
        if (res.names && Object.keys(res.names).length > 0) {
          createConceptDropdowns(res.names);
        } else {
          console.error('concept names not available! extract them first')
        }
      }

      if (res.status === 'busy') {
        console.log('project is busy...')
      } else if (res.status === 'pending') {
        if (res.axioms && res.axioms.length === 1) {
          console.error('atomic decomposition missing');
        } else {
          console.error('proofs + ad missing');
        }

        modal.open();
      } else if (res.status === 'ready') {
        clearInterval(interval);
        modal.close();

        if (document.getElementById('proof-container')) {
          init_proof({ file: res.proofs[0], ruleNamesMap: res.ruleNamesMap });
        }
        // if (document.getElementById('proof-container')) {
        //   init_counter({ ad: res.ad });
        // }
        if (document.getElementById('ontology-container')) {
          init_ontology({ ad: res.ad, ontology: res.ontology });
        }

        //Hide computing indicator
        document.getElementById('computingGif').style.display = "none";
      }
    })
    .catch(error => {
      clearInterval(interval);
      console.error('Error:', error);
    });
}

// for progress.spy
function progress(message) {
  document.getElementById('custom-messages').innerHTML += "<br>" + message;
}


function clearSigFilePathFunction() {
  signaturePathText.value = "";
  signaturePathFile.value = "";
  signaturePathText.classList.remove("valid");
  proof.signatureFile = undefined;
}


function computeAxiomsBtnFunction() {

  //Show computing indicator
  document.getElementById('computingGif').style.display = "inline-block";
  const rhsElement = document.getElementById('rhsConcepts');
  const isRhh = rhsElement.options[rhsElement.selectedIndex].classList.contains('option-rhh');
  const body = new FormData();
  body.append('id', getSessionId());
  body.append('ontology', status.ontology);
  body.append('lhs', document.getElementById('lhsConcepts').value);
  body.append('rhs', document.getElementById('rhsConcepts').value);
  body.append('method', document.getElementById('methodsList').value);
  body.append('signaturePath', proof.signatureFile
    ? "frontend/public/data/" + getSessionId() + "/" + proof.signatureFile.name
    : "NoSignature");
  body.append('translate2NL', document.getElementById('checkboxT2NL').checked);

  const endpoint = isRhh ? '/counterexample' : '/axiom';

  fetch(endpoint, {
    method: 'POST',
    body,
  })
    .then(res => res.json())
    .then(res => {
      console.log(res)
      interval = setInterval(() => {
        init_views(true);
      }, 2000)
    })
    .catch(error => {
      console.error('Error:', error);
    });
}

function openSplitFunction() {
  window.open('/?id=' + getSessionId())
}

function blockProofMethods(reasoner) {
  const options = document.getElementById("methodsList").getElementsByTagName("option");
  let valuesToBlock;

  if (!reasoner)
    return;

  if (reasoner.toLowerCase() === "hermit") {
    valuesToBlock = ["1", "2", "3"];
    options[3].selected = true;
  }

  else if (reasoner.toLowerCase() === "elk") {
    valuesToBlock = ["4", "5", "6", "7", "8", "9", "10", "11", "12"];
    options[0].selected = true;
  }

  for (let i = 0; i < options.length; i++) {
    options[i].disabled = valuesToBlock.includes((i + 1).toString());
  }
}

function loadProof(event) {
  proof.proofFile = event.target.files[0];
  upload(proof.proofFile, _ => init_proof());
}

function loadSignature(event) {
  proof.signatureFile = event.target.files[0];
  upload(proof.signatureFile);
}

export { progress, loadProof, loadSignature }