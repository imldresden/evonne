import { init_proof, proof } from '../proof/proof.js';
import { init_ontology } from '../ontology/ontology.js';
import { init_counter } from '../counterexample/counterexample.js';

import { upload } from '../utils/upload-file.js';
import { init as init_controls } from '../utils/controls.js'

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

  init_controls();
  init_views();
}

function createConceptDropdowns(concepts) {
  const lhs = document.getElementById('lhsConcepts');
  lhs.innerHTML = '';
  const cl = Object.keys(concepts); // sorted in server.js  

  const toProof = document.createElement('optgroup')
  const toCE = document.createElement('optgroup')
  
  toProof.label = "Proofs Exist:"
  toCE.label = "Doesn't Follow From Ontology:";

  cl.forEach(k => {
    if (k !== "owl:Nothing") {
      const concept = document.createElement('option');
      concept.value = k;
      concept.innerHTML = concepts[k].short;
      if (concepts[k].rhs && concepts[k].rhs.length > 0) {
        concept.classList.add('option-rhs-true');
        toProof.appendChild(concept);
      } else {
        concept.classList.add('option-rhs-false');
        toCE.appendChild(concept);
      }
    }
  });

  lhs.appendChild(toProof);
  lhs.appendChild(toCE);

  const updateRHS = function () {
    const rhs = document.getElementById('rhsConcepts');
    rhs.innerHTML = '';

    const key = lhs.options[lhs.selectedIndex].value;
    const currentConcept = concepts[key];

    // decodes the encoding done on server.js to send less data
    const ccs = new Set(currentConcept.rhs.map(ek => cl[ek - 100]));

    const toProof = document.createElement('optgroup')
    const toCE = document.createElement('optgroup')

    toProof.label = "Can Be Proved:";
    toCE.label = "Doesn't Follow From Ontology:";

    cl.forEach(rhsKey => {
      const rhsC = document.createElement('option');
      rhsC.value = rhsKey;
      rhsC.innerHTML = concepts[rhsKey].short;
      if (ccs.has(rhsKey)) {
        rhsC.classList.add('option-rhs-true');
        toProof.appendChild(rhsC);
      } else {
        rhsC.classList.add('option-rhs-false');
        toCE.appendChild(rhsC);
      }
    });

    rhs.appendChild(toProof);
    rhs.appendChild(toCE);
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

        const container = document.getElementById('container-main')
        if (res.explanation.type === 'pr') {
          const onlyProof = window.location.href.includes('/proof')
          const onlyAD = window.location.href.includes('/ontology')
          if (!onlyProof && !onlyAD) {
            container.innerHTML = `
              <div class="container container-split container-flex">
                <div class="container-left" id="proof-container"></div>
                <div class="resizer" data-direction="horizontal"></div>
                <div class="container-right" id="ontology-container"></div>
              </div>`
              init_proof({ file: res.explanation.proof, ruleNamesMap: res.ruleNamesMap });
              init_ontology({ ad: res.explanation.ad, ontology: res.ontology });
          }

          if (onlyProof) {
            container.innerHTML = `<div class="container container-flex" id="proof-container"></div>`
            init_proof({ file: res.explanation.proof, ruleNamesMap: res.ruleNamesMap });
          }

          if (onlyAD) {
            container.innerHTML = `<div class="container container-flex" id="ontology-container"></div>`
            init_ontology({ ad: res.explanation.ad, ontology: res.ontology });
          }
          
        } else if (res.explanation.type === 'ce') {
            container.innerHTML = `<div class="container container-flex" id="ce-container"></div>`;
            init_counter({ model: res.explanation.model, mapper: res.explanation.mapper, ontology: res.ontology });
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
  
  const body = new FormData();
  body.append('id', getSessionId());
  body.append('ontology', status.ontology);
  const lhs = document.getElementById('lhsConcepts');
  const rhs = document.getElementById('rhsConcepts');

  body.append('lhs', lhs.value);
  body.append('rhs', rhs.value);
  body.append('method', document.getElementById('methodsList').value);
  if (rhs.options[rhs.selectedIndex].classList.contains('option-rhs-true')) {
    body.append('type', 'pr')
  } else { // if (rhs.options[rhs.selectedIndex].classList.contains('option-rhs-false')) {
    body.append('type', 'ce')
  }
  body.append('signaturePath', proof.signatureFile
    ? "frontend/public/data/" + getSessionId() + "/" + proof.signatureFile.name
    : "NoSignature");
  body.append('translate2NL', document.getElementById('checkboxT2NL').checked);

  fetch('/explain', {
    method: 'POST',
    body,
  }).then(res => res.json())
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