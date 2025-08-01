import {loadOntology, loadLayout, loadAtomicDecomposition, loadConstraints} from '../ontology/ontology.js';
import { loadProof, loadSignature} from '../main/main.js';
import {ReasonerName} from "./ReasonerName.js";

const listenerFunctions = [loadProof, loadOntology, loadLayout];
const fileUploadInput = document.getElementById('browseButton');

function adaptUploadFileModal(whatToUpload) {
  document.getElementById("what-is-uploaded").textContent = whatToUpload;
  listenerFunctions.forEach(fn => {
    document.getElementById("browseButton").removeEventListener("change", fn);
  });
  fileUploadInput.value = '';
  for (let e of document.getElementsByClassName('file-path validate valid')) {
    e.value = '';
  }
  M.Modal.getInstance(document.getElementById('uploadFileModal')).open();
}

// blank project 
const createBlankProject = document.getElementById("createBlank");
createBlankProject && createBlankProject.addEventListener("click", async () => {
  const id = await (await fetch("/uuid")).text();
  const response = await fetch("/create?id=" + id);
  
  if (response.ok) {
    window.location.href = "/?id=" + id;
  } else {
    console.error("Something went wrong. Please reload this page and try again. If the problem persists, feel free to contact the authors");
  }
});

function setReasonerOptionValues() {
  document.getElementById("elkOption").value = ReasonerName.elk();
  document.getElementById("elkCDOption").value = ReasonerName.elkCD();
  document.getElementById("hermitOption").value = ReasonerName.hermit();
}

// for uploading the actual ontology, project menu 
const uploadOntologyTriggers = Array.from(document.getElementsByClassName("uploadOntologyTrigger"));
uploadOntologyTriggers.forEach(trigger => {
  setReasonerOptionValues();

  const loadConstraintsTextField = document.getElementById("browseConstraintsFilePath");
  loadConstraintsTextField.value = "";

  const reasonerChoice = document.getElementById('classificationReasoner');
  const CDChoiceDiv = document.getElementById("CDChoice");
  reasonerChoice.addEventListener("change",()=>{
    if (reasonerChoice.value === ReasonerName.elkCD()){
      CDChoiceDiv.style.display = "block";
    }else{
      CDChoiceDiv.style.display = "none";
    }
  });

  const loadConstraintsFileBtn = document.getElementById("browseConstraintsButton");
  loadConstraintsFileBtn.addEventListener("change",loadConstraints);

  trigger.addEventListener("click", () => {
    adaptUploadFileModal('n ontology for a new project');
    //We now allow the user to upload any file format. We internally convert to OWL XML format
    fileUploadInput.accept = '';//'.xml, .owl';
    fileUploadInput.addEventListener("change", loadOntology);
  });
});

// ontology menu 
const uploadOntologyADTrigger = document.getElementById("uploadOntologyADTrigger");
uploadOntologyADTrigger && uploadOntologyADTrigger.addEventListener("click", () => {
  adaptUploadFileModal('n atomic decomposition of an ontology');
  fileUploadInput.accept = '.xml';
  fileUploadInput.addEventListener("change", loadAtomicDecomposition);
});

const uploadLayoutTrigger = document.getElementById("uploadLayoutTrigger");
uploadLayoutTrigger && uploadLayoutTrigger.addEventListener("click", () => {
  adaptUploadFileModal('n ontology layout');
  fileUploadInput.accept = '.json';
  fileUploadInput.addEventListener("change", loadLayout);
});

// proof menu
const uploadProofTrigger = document.getElementById("uploadProofTrigger");
uploadProofTrigger && uploadProofTrigger.addEventListener("click", () => {
  adaptUploadFileModal(' proof');
  fileUploadInput.accept = '.xml';
  fileUploadInput.addEventListener("change", loadProof);
});

// input Modal
const uploadSignatureTrigger = document.getElementById("uploadSignatureTrigger");
uploadSignatureTrigger && uploadSignatureTrigger.addEventListener("click", () => {
  uploadSignatureTrigger.accept = '.txt';
  uploadSignatureTrigger.addEventListener("change", loadSignature);
});

export function upload(file, fn, type = '') {
  const formData = new FormData();
  formData.append('id', getSessionId());
  formData.append('file', file);
  formData.append('type', type);

  fetch('/upload', {
    method: 'POST',
    body: formData
  })
  .then(fn)
  .catch(error => {
    console.error('Error:', error);
  });

}