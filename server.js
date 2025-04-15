import express from 'express';
import sprightly from 'sprightly';
import http from 'http';
import { Server } from 'socket.io';
import { spawn } from 'child_process';
import {
  unlink,
  existsSync,
  mkdirSync,
  lstatSync,
  copyFileSync,
  readdirSync,
  readFileSync,
  renameSync,
} from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { createRequire } from "module";
import * as path from 'path';
import { owlFunctions } from "./frontend/public/js/utils/myOWL.js";
import { ReasonerName } from "./frontend/public/js/utils/ReasonerName.js";
import {ProofType} from "./frontend/public/js/utils/ProofType.js";

const require = createRequire(import.meta.url);
require('dotenv').config();
const upload = require('express-fileupload');

const MODE = process.env.MODE || 'demo';
const PORT = process.env.PORT || 3000;
const EXAMPLES = process.env.EXAMPLES || 'study';
console.log("Environment: " + MODE);

const app = express();
app.engine('spy', sprightly);
app.set('views', './frontend/views');
app.set('view engine', 'spy');
app.use('/', express.static('./frontend/public'));
app.use('/libs', express.static('./node_modules'));
app.use(upload());

const http_ = http.createServer(app);
const io_ = new Server(http_);
const title = "evonne";
const sessions = {};
const dataDir = './frontend/public/data/';
const examplesDir = './frontend/public/examples/';
const fs = require('fs');

const proofFileName = 'proof';
const externalProofFileName = proofFileName+'.json';

const constraintsFileName = 'constraints.txt';
const concreteDomainFileName = 'concreteDomain.txt';

if (!existsSync(dataDir)) {
  mkdirSync(dataDir);
}

app.get('/test', (req, res) => {
  res.render('pages/test.spy', {
    title: "evonne lib",
    uuid: uuidv4(),
  });
});

app.get('/uuid', (req, res) => {
  res.status(200).send(uuidv4());
});

function listExamples() {
  let html = ''
  readdirSync(examplesDir).forEach(example => {
    if ((+example) >=0 && (+example) < 100) {
      html += `<div onclick="loadExample('${example}', '${example}')" class="collection-item">
          [BENCHMARK]: Case ${example}
      </div>`
    }
  })
  return html;
}

// pages
const page = (req, res) => {
  const id = req.query.id;
  if (!id) {
    renderMain(req, res);
  } else {
    ensureIfExample(id, res);
    res.render('pages/main.spy', {
      title,
      uuid: id,
      settings_specific: '<< proof/settings >> << ontology/settings >> << ce/settings >>',
      advanced_settings_specific: '<< proof/advanced-settings >>',
      sidebars_specific: '<< ontology/repairs >>',
      menu_specific: `${MODE === 'demo' ? '' : '<< widgets/menus/projects >> << widgets/menus/compute >>'} << proof/menu >> << ontology/menu >>`,
      general_settings: '<< widgets/menus/shortening >>',
      other_examples: listExamples(),
    });
  }
}

app.get('/', page);
app.get('/ontology', page);
app.get('/proof', page);

app.get('/euler', (_, response) => {
  response.render('euler/euler.spy')
});

app.get('/inference', (_, response) => {
  response.render('inference/inference.spy');
});

function parseMap(mapStr) {
  const map = new Map();
  const entries = mapStr.split("\n")
  entries.forEach(e => {
    let a = []
    e.split(':').forEach(x => a.push(x.trim()))
    map.set(a[0], a[1])
  })
  return Object.fromEntries(map)
}

// resources
app.get('/project', (req, res) => {
  const id = req.query.id;
  const target = path.join(dataDir, id);

  if (!existsSync(target) || !lstatSync(target).isDirectory()) {
    res.status(400).send('Project does not exist.');
    return;
  }

  const status = {
    status: undefined,
    ontology: [],
    names: {},
    explanation: { type: '' },
    reasoner: '',
    concreteDomainConstraints: '',
    concreteDomainName:'',
  };

  const files = readdirSync(target);

  const flags = {
    ontology: false,
    names: false,
    explanation: false,
  }

  const proof = { file: false, ad: false };
  const ce = { model: false, mapper: false };

  files.forEach(function (file) {
    if (file.endsWith('.t.xml')) {
      status.explanation.proof = file;
      proof.file = true;
    }

    if (file.endsWith('.xml') && file.startsWith('atomic ')) {
      status.explanation.ad = file;
      proof.ad = true;
    }

    if (file.endsWith('result.model.xml')) {
      status.explanation.model = file;
      ce.result = true;
    }

    if (file.endsWith('mapper.json')) {
      status.explanation.mapper = file;
      ce.mapper = true;
    }

    if (
      (file.endsWith('.xml') || file.endsWith('.owl'))
      && !file.startsWith('atomic ')
      && !file.startsWith('proof_')
      && !file.endsWith('.t.xml')
      && !file.endsWith('.model.xml')
    ) {
      status.ontology = owlFunctions.getOWlFileName(file); // there is more than one
      flags.ontology = true;
    }

    if (file.endsWith(constraintsFileName)){
      status.concreteDomainConstraints = file;
    }
  });

  if (proof.file && proof.ad) {
    status.explanation.type = 'pr';
    flags.explanation = true;
  }

  if (ce.mapper && ce.result) {
    status.explanation.type = 'ce';
    flags.explanation = true;
  }

  const namesPath = path.join(target, 'cnsOriginal.json');
  const hierarchyPath = path.join(target, 'cnsHierarchy.json');

  if (existsSync(namesPath) && existsSync(hierarchyPath)) {
    flags.names = true;
    const concepts = JSON.parse(readFileSync(namesPath));
    const hierarchy = JSON.parse(readFileSync(hierarchyPath));
    const encoded = {}
    const sc = Object.keys(concepts).sort(sortNames);

    function sortNames(c1, c2) {
      let arg1 = concepts[c1];
      let arg2 = concepts[c2];

      if (arg1 < arg2) {
        return -1;
      }
      if (arg1 > arg2) {
        return 1;
      }
      return 0;
    }

    sc.forEach((k, i) => {
      // send less data
      encoded[k] = i + 100;
    });

    sc.forEach((k, i) => {
      const ec = hierarchy[k]?.map(d => encoded[d]) || [];
      status.names[k] = {
        short: concepts[k],
        rhs: ec,
      };
    });
  }

  const pending = !flags.explanation;

  if (flags.explanation) {
    status.status = 'ready';
  } else if (pending) {
    status.status = 'pending';
  }

  if (sessions[id]) {
    status.status = 'busy';
  }

  if (!status.status) { // e.g. !flags.ontology || (pending && !flags.names) 
    status.status = 'custom';
  }

  const reasonerPath = path.join(target, 'reasoner.txt');
  status.reasoner = existsSync(reasonerPath) ? readFileSync(reasonerPath).toString() : "n/a";

  const cdNamePath = path.join(target, concreteDomainFileName);
  status.concreteDomainName = existsSync(cdNamePath) ? readFileSync(cdNamePath).toString() : "n/a";

  //Rule names can be replaced based on a map specified the "ruleNames.tmap" file
  const ruleNamesMapPath = './ruleNames.tmap';
  status.ruleNamesMap = parseMap(existsSync(ruleNamesMapPath) ? readFileSync(ruleNamesMapPath).toString() : "");

  res.status(200).send(status);
});

app.get('/projects', (req, res) => {
  const projects = readdirSync(dataDir).filter(
    f => lstatSync(path.join(dataDir, f)).isDirectory()
  );
  res.status(200).send({ projects });
});

app.post('/upload', (req, res) => {
  if (!req.files || Object.keys(req.files).length === 0) {
    return res.status(400).send('No files were uploaded.');
  }

  const id = req.body.id;
  const uploadsDir = path.join(dataDir, id);
  if (!existsSync(uploadsDir)) {
    mkdirSync(uploadsDir);
  }

  const file = req.files.file; // The name of the input field (i.e. "file") is used to retrieve the uploaded file
  const uploadPath = path.join(uploadsDir, file.name);

  file.mv(uploadPath, function (err) {
    if (err) {
      return res.status(500).send(err);
    }

    if (req.body.type === 'signature') {
      renameSync(uploadPath, path.join(uploadsDir, 'sig.txt'));
    }

    if (req.body.type === 'constraints') {
      renameSync(uploadPath, path.join(uploadsDir, constraintsFileName));
    }

    if (req.body.type === 'ontology') {
      //Try to translate the ontology file to OWL XML format.
      const owlFileName = convertOntology(file, uploadsDir)

      file.mv(owlFileName, function (err) {
        if (err) {
          return res.status(500).send(err);
        }
        //Delete the original ontology file
        if (owlFileName !== uploadPath)
          fs.unlink(uploadPath, function (err) {
            if (err) {
              console.error(err); 
            }
            console.log("Original ontology file was deleted successfully");
          });

        res.send('Ontology uploaded!');
      });
    } else {
      res.send('File uploaded!');
    }
  });
});

app.get('/create', (req, res) => {
  const id = req.query.id;
  const dest = path.join(dataDir, id);
  if (!existsSync(dest)) {
    mkdirSync(dest);
  } else {
    
    readdirSync(dest).forEach(function (file) {
      removeFile(path.join(dest, file));
    });

    // TODO: commented only for the study! Remove the `removeFile` above and uncomment the next lines afterwards 
    //res.status(400).send('Project already exists.');
    //return;
  }

  try {
    copyFolderRecursiveSync(examplesDir + req.query.example, dest);
  } catch (e) {
    console.log(e);
  }

  res.status(200).send("done");
});

app.get('/extract-names', (req, res) => {
  const id = req.query.id;

  if (sessions[id]) {
    return;
  } else {
    sessions[id] = true;
  }

  const projPath = path.join(dataDir, id);
  const ontPath = path.join(projPath, req.query.ontology);
  const  constraintsPath = path.join(projPath,constraintsFileName);

  //TODO: progress bar (consider spawnSync)
  const names = req.query.reasoner === ReasonerName.elkCD() ?
      spawn('java', [
          '-jar', 'externalTools/extractNames.jar',
          '-o', ontPath,
          '-od', projPath,
          '-r', 'elk',
          '-cdn', req.query.cd,
          '-c', constraintsPath
  ]) :
      spawn('java', [
          '-jar', 'externalTools/extractNames.jar',
          '-o', ontPath,
          '-od', projPath,
          '-r', req.query.reasoner
  ]);
  printOutput(names);

  names.on("exit", function () {
    console.log("done extracting names.");
    delete sessions[id];
    res.status(200).send("done");
  });

  names.on('close', (code) => {
    if (code !== 0) {
      console.log('failed extracting concepts: ' + code);
      res.status(200).send("failed extracting concepts.");
    }
  });
});

app.post('/explain', (req, res) => {
  const id = req.body.id;

  if (sessions[id]) {
    return;
  } else {
    sessions[id] = true;
  }

  const ontology = req.body.ontology;
  const projPath = path.join(dataDir, id);
  const axiom = req.body.lhs + " SubClassOf: " + req.body.rhs;
  const ontPath = path.join(projPath, ontology);

  const preserve = ['.owl', 'sig.txt', 'reasoner.txt', 'cnsHierarchy.json', 'cnsOriginal.json',
    externalProofFileName, constraintsFileName, concreteDomainFileName];

  readdirSync(projPath).forEach(function (file) {
    for (const p of preserve) {
      if (file.endsWith(p)) {
        return;
      }
    }
    removeFile(path.join(projPath, file));
  });

  const type = req.body.type;
  const cdName = req.body.concreteDomainName;
  // console.log(cdName)
  if (type === 'pr') { // expects a proof
    prove({ id, req, axiom, projPath, ontology, ontPath, cdName });
  }

  if (type === 'ce') { // expects a counterexample
    counter({ id, axiom, projPath, ontPath });
  }

  res.status(200).send({ msg: 'processing request..' });
});

// listening on the connection event for incoming sockets
io_.on('connection', function (socket) {

  console.log('a client connected');

  socket.on('disconnect', async function () {
    console.log('client disconnected');
  });

  socket.on('highlight in ontology', async function (data) {
    console.log("Received the following to highlight!");
    console.log(data);
    console.log("Broadcasting...");

    if (!sessions[data.id]) {
      sessions[data.id] = true;
      io_.sockets.emit('highlight axioms', data);
    }
    delete sessions[data.id];
  });

  socket.on('get ontology', async function (data) {
    console.log("Received the following asking for ontology name!");
    console.log(data);
    console.log("Broadcasting...");
    io_.sockets.emit('set ontology', data);
  });

  socket.on('get repairs', async function (data) {

    const id = data.id;
    const axiom = data.axiom;
    const ontologyFile = data.ontologyFile;
    const projectPath = path.join(dataDir, id);
    const ontologyPath = path.join(projectPath, ontologyFile);
    const reasoner = data.reasoner;

    if (sessions[id]) {
      return;
    } else {
      sessions[id] = true;
    }

    console.log("Received the following, generating repairs...");
    console.log(data);

    if (axiom !== "") {
      //Added this to make sure that previous result does not interfere with current computation
      clearFile(path.join(projectPath, "mDs_" + id + ".txt"));

      const repairs = spawn('java', [
        '-jar', 'externalTools/explain.jar',
        '-a', axiom,
        '-o', ontologyPath,
        '-mds', id, reasoner,
        '-od', projectPath,
      ]);
      printOutput(repairs);
      repairs.on("exit", () => {
        io_.sockets.emit('read repairs', { id, axiom: data.readableAxiom, msg: "mDs.txt is now available!" });
        //removeFile(path.join(projectPath, "pi.txt"));
        delete sessions[id];
      });
      repairs.on('close', (code) => {
        if (code !== 0) {
          //TODO code 4 means no justifications have been computed
          //TODO code 3 means axiom is not supported for this functionality
          io_.sockets.emit('read repairs', { id, msg: "computing diagnoses failed" });
        }
        delete sessions[id];
      });
    } else {
      io_.sockets.emit('read repairs', { id, msg: "axiom type not supported" });
      delete sessions[id];
    }
  });

  socket.on('euler view', async function (data) {
    console.log("Received the following for euler view!")
    console.log(data);
    console.log("Broadcasting...")

    io_.sockets.emit('euler view', data);
  });

  socket.on('inference view', async function (data) {
    console.log("Received the following for inference view!")
    console.log(data);
    console.log("Broadcasting...")

    io_.sockets.emit('inference view', data);
  });

});

// 141.76.67.176
http_.listen(PORT, function () {
  console.log(`Server is listening on port http://localhost:${PORT}`);
});

function printOutput(p) {
  p.stdout.on('data', (data) => {
    console.log(`stdout: ${data}`);
  });

  p.stderr.on('data', (data) => {
    console.error(`stderr: ${data}`);
  });

  p.on('close', (code) => {
    console.log(`child process exited with code ${code}`);
  });
}

function getExamples(req) {
  return `<< widgets/examples/examples-${req.query.examples ? req.query.examples : EXAMPLES} >>`;
}

function renderMain(req, res) {
  if (MODE === 'demo') {
    res.render('pages/demo.spy', {
      title,
      uuid: uuidv4(),
      examples: getExamples(req),
      other_examples: listExamples(),
    });
  } else {
    res.render('pages/welcome.spy', {
      title,
      uuid: uuidv4(),
      menu_specific: '<< widgets/menus/projects >>',
      examples: getExamples(req),
      other_examples: listExamples(),
    });
  }
}

function removeFile(filePath) {
  unlink(filePath, error => {
    if (error) {
      console.log("File was not deleted -> " + filePath);
    } else {
      console.log("File deleted -> " + filePath);
    }
  });
}

function clearFile(filePath) {
  fs.writeFile(filePath, '', function (err) {
    if (err) throw err;
    console.log('File cleared -> ' + filePath);
  });
}

function ensureIfExample(id, res) {
  if (!existsSync(dataDir + id)) {
    createExampleInData(id, res);
  }
}

function createExampleInData(id, res) {
  const exampleDir = examplesDir + id;
  if (!existsSync(exampleDir)) {
    res.status(400).send('Requested example does not exist.');
  }

  try {
    const dest = dataDir + id;
    mkdirSync(dest);
    copyFolderRecursiveSync(exampleDir, dest);
  } catch (e) {
    console.log(e);
  }
}

function copyFolderRecursiveSync(source, target) {
  if (lstatSync(source).isDirectory()) {
    const files = readdirSync(source);
    files.forEach(function (file) {
      if (!file.startsWith(".")) {
        copyFileSync(path.join(source, file), path.join(target, file));
      }
    });
  }
}

function convertOntology(ontFile, ontDir) {
  const owlFileName = owlFunctions.getOWlFileName(ontFile.name);
  const exitCode = spawn('java', [
    '-jar', 'externalTools/explain.jar',
    '-o', ontFile.name,
    '-od', ontDir,
    '-on', owlFileName,
  ], { encoding: 'utf-8' });

  if (exitCode === 5) {
    //TODO code 5 means that the translation failed (that is the uploaded ontology file uses unknown or nonstandard format)
    console.error("Could not convert the ontology file into OWL XML format!");
  } else {
    return path.join(ontDir, owlFileName);
  }
}

function prove({ id, req, axiom, projPath, ontology, ontPath, cdName } = {}) {
  console.log('computing proofs for ' + axiom);

  const genMethod = req.body.method;
  const sigPath = req.body.signaturePath;//TODO:we rename to sig.txt on upload, no need to send the name anymore
  const translate2NL = req.body.translate2NL === "true" ? "" : "-nt";
  const proofs = generateProofs({
    ontPath, axiom, projPath, sigPath, genMethod, translate2NL, cdName
  });

  printOutput(proofs);

  proofs.on("exit", function (code) {
    if (code !== 0) {
      console.error('failed computing proofs: ' + code);

      if (code === 333) {
        console.error("Proving the axiom is not supported by the selected method.")
        return;
      }

      return;
    }

    console.log("done computing proofs.");
    console.log('extracting module...');

    const outputLabel = "module_" + path.parse(ontology).name;
    const module = spawn('java', [
      '-jar', 'externalTools/explain.jar',
      '-o', ontPath,
      '-a', axiom,
      '-mod',
      '-ol', outputLabel,
      '-od', projPath,
    ], { encoding: 'utf-8' });

    printOutput(module);

    module.on("exit", function (code) {
      if (code !== 0) {
        console.error('failed extracting module: ' + code);
        return;
      }

      console.log("done extracting module.");
      console.log('computing atomic decomposition...');

      const ad = spawn('java', [
        '-cp', 'externalTools/AD/adStarGenerator.jar', 'EverythingForGivenOntology',
        path.join(projPath, outputLabel),
        projPath, //outDir
        'atomic ' + outputLabel
      ], { encoding: 'utf-8' });

      printOutput(ad);

      ad.on("exit", function () {
        if (code !== 0) {
          console.error('failed computing atomic decomposition: ' + code);
          return;
        }
        console.log("done computing atomic decomposition.");
        delete sessions[id];
      });
    });
  });

  function getProofType(genMethod, sigPath) {
    // For reference
    // minTreeOpts = ["1","4","6",/*"8",*/,"9","11"];

    let minWTreeOpts = ["3", "7", "12"];
    let minDepthOpts = ["2", "5", "10"];

    let proofType = ProofType.minimalTreeSize();
    // CONDENSED MINIMAL PROOF
    if (sigPath !== "NoSignature") {
      proofType = ProofType.condensedMinimalTreeSize();
      if (minDepthOpts.includes(genMethod))
        proofType = ProofType.condensedMinimalDepth();
      else if (minWTreeOpts.includes(genMethod))
        proofType = ProofType.condensedMinimalWeightedTreeSize();
    }
    // MINIMAL PROOF
    else {
      if (minDepthOpts.includes(genMethod))
        proofType = ProofType.minimalDepth();
      else if (minWTreeOpts.includes(genMethod))
        proofType = ProofType.minimalWeightedTreeSize();
    }
    return proofType;
  }

  function generateProofs(params) {

    const { ontPath, projPath, genMethod, translate2NL, cdName } = params;
    let { axiom, sigPath } = params;
    const constraintsPath = path.join(projPath, constraintsFileName);

    // console.log("***" + cdName + "***")

    //TODO use consts for the string values of the domains. Use them also in process-data.js, file-upload.spy
    if(["LinearConstraints", "DifferenceConstraints"].includes(cdName)){
      console.log("GENERATION METHOD -> Concrete Domain Proof!");

      return spawn('java', [
        '-jar', 'externalTools/explain.jar',
        '--ontology-path', ontPath,
        '--constraints-path', constraintsPath,
        '--concrete-domain-name', cdName,
        '--conclusion-axiom', axiom,
        '--output-type', 'graph',
        '--output-label', proofFileName,
        '--output-directory', projPath,
        // '--proof-type', proofType, TODO:adapt this once the CD proofs types are supported
        '--signature-file-path', sigPath,
        '-no-image',
        translate2NL
      ]);
    }

    console.log("GENERATION METHOD -> " + genMethod);

    const proofType = getProofType(genMethod, sigPath);
    console.log("proof type = " + proofType)

    //ELK PROOF
    const elkOpts = ["1", "2", "3"];
    if (elkOpts.includes(genMethod)) {
      return spawn('java', [
        '-jar', 'externalTools/explain.jar',
        '--ontology-path', ontPath,
        '--conclusion-axiom', axiom,
        '--output-type', 'graph',
        '--output-label', proofFileName,
        '--output-directory', projPath,
        '--proof-type', proofType,
        '--signature-file-path', sigPath,
        '-no-image',
        translate2NL
      ], { encoding: 'utf-8' });
    }

    //Parsing here is a bit different
    axiom = axiom.replace('SubClassOf:', '<=');
    if (axiom.endsWith("owl:Nothing"))
      axiom = axiom.replace("owl:Nothing", "BOTTOM")

    //LETHE Forgetting-Based Proof
    let generator = 'externalTools/evee-elimination-proofs-lethe.jar';
    let cls = 'de.tu_dresden.inf.lat.evee.eliminationProofs.LetheBasedHeuristicProofGenerator';

    //LETHE Forgetting-Based Symbol Minimal Proof
    if (genMethod === "5") {
      cls = 'de.tu_dresden.inf.lat.evee.eliminationProofs.LetheBasedSymbolMinimalProofGenerator';
    }

    //LETHE Forgetting-Based Size Minimal Proof
    if (genMethod === "6") {
      cls = 'de.tu_dresden.inf.lat.evee.eliminationProofs.LetheBasedSizeMinimalProofGenerator';
    }

    //LETHE Forgetting-Based Weighted Size Minimal Proof
    if (genMethod === "7") {
      cls = 'de.tu_dresden.inf.lat.evee.eliminationProofs.LetheBasedWeightedSizeMinimalProofGenerator';
    }

    //LETHE Proof
    if (genMethod === "8") {
      generator = 'externalTools/evee-lethe-proof-extractor.jar';
      cls = 'de.tu_dresden.inf.lat.evee.proofs.lethe.LetheProofGenerator';
    }

    //FAME Forgetting-Based Proof
    if (genMethod === "9") {
      generator = 'externalTools/evee-elimination-proofs-fame.jar';
      cls = 'de.tu_dresden.inf.lat.evee.eliminationProofs.FameBasedHeuristicProofGenerator';
    }

    //FAME Forgetting-Based Symbol Minimal Proof
    if (genMethod === "10") {
      generator = 'externalTools/evee-elimination-proofs-fame.jar';
      cls = 'de.tu_dresden.inf.lat.evee.eliminationProofs.FameBasedSymbolMinimalProofGenerator';
    }

    //FAME Forgetting-Based Size Minimal Proof
    if (genMethod === "11") {
      generator = 'externalTools/evee-elimination-proofs-fame.jar';
      cls = 'de.tu_dresden.inf.lat.evee.eliminationProofs.FameBasedSizeMinimalProofGenerator';
    }

    //FAME Forgetting-Based Weighted Size Minimal Proof
    if (genMethod === "12") {
      generator = 'externalTools/evee-elimination-proofs-fame.jar';
      cls = 'de.tu_dresden.inf.lat.evee.eliminationProofs.FameBasedWeightedSizeMinimalProofGenerator';
    }

    let processParams = ['-cp', generator, 'de.tu_dresden.inf.lat.evee.proofs.GenerateProof',
      cls, ontPath, axiom, projPath, proofFileName, sigPath];

    processParams = sigPath !== "NoSignature" ? processParams : processParams.slice(0,processParams.length-1);

    const process = spawn('java', processParams);

    return process.on("exit", function (exitCode) {
      if (exitCode === 3)
        return process;

      if(exitCode === 0){
        const draw = spawn('java', ['-cp', 'externalTools/explain.jar',
          'de.tu_dresden.lat.evonne.EvonneInputGenerator',
          '--proof-path', path.join(projPath, externalProofFileName),
          '--output-directory', projPath,
          '--output-label', proofFileName,
          '--proof-type', proofType,
          '--signature-file-path', sigPath,
          '--ontology-path', ontPath,
          translate2NL
        ]);

        printOutput(draw);

        return draw.on("exit", function () {
          console.log("Done generating GML Proofs");
        })
      }
    })
  }
}

function counter({ id, axiom, projPath, ontPath } = {}) {
  console.log('producing counterexample for' + axiom)

  const process = spawn('java', [
    '-jar', 'externalTools/explain.jar',
    '--ontology-path', ontPath,
    '--conclusion-axiom', axiom,
    '--output-directory', projPath,
    '-output-type', 'graph',
    '--export-mapper',
    '--no-image'
  ], { encoding: 'utf-8' });

  printOutput(process);

  process.on("exit", function (code) {
    if (code !== 0) {
      console.error('failed to create counterexample: ' + code);
    } else {
      console.log("done creating counterexample." + code);
    }
    delete sessions[id];
  });
}
