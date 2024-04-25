import express, {response} from 'express';
import sprightly from 'sprightly';
import http from 'http';
import { Server, Socket } from 'socket.io';
import { spawn } from 'child_process';
import {
  unlink,
  existsSync,
  mkdirSync,
  lstatSync,
  copyFileSync,
  readdirSync,
  readFileSync
} from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { createRequire } from "module";
import * as path from 'path';

const require = createRequire(import.meta.url);
require('dotenv').config();
const upload = require('express-fileupload');

const MODE = process.env.MODE || 'demo';
const PORT = process.env.PORT || 3000;
const EXAMPLES = process.env.EXAMPLES || 'ijcar';
console.log("Environment: " + MODE);

const app = express();
app.engine('spy', sprightly);
app.set('views', './frontend/views');
app.set('view engine', 'spy');
app.use(express.static('./frontend/public')); // serve the "public" directory
app.use('/libs', express.static('./node_modules'));
app.use(upload());

const http_ = http.createServer(app);
const io_ = new Server(http_);
const title = "evonne";
const sessions = {};
const dataDir = './frontend/public/data/';
const examplesDir = './frontend/public/examples/';
const fs = require('fs');

if (!existsSync(dataDir)) {
  mkdirSync(dataDir);
}

app.get('/test', (req, res) => {
  res.render('main/test.spy', { 
    title: "evonne lib",
    uuid: uuidv4(),
  });
});

// TODO: this is a workaround to avoid injecting the node_module into the browser 
app.get('/uuid', (req, res) => { 
  res.status(200).send(uuidv4());
});

// pages
app.get('/', (req, res) => {
  const id = req.query.id;
  if (!id) {
    renderMain(req, res);
  } else {
    ensureIfExample(id, res);
    res.render('main/split.spy', {
      title,
      uuid: id,
      settings_specific: '<< proof/settings >> << ontology/settings >>',
      advanced_settings_specific: '<< proof/advanced-settings >>',
      sidebars_specific: '<< ontology/repairs >>',
      menu_specific: `${MODE === 'demo' ? '' : '<< menus/projects >> << menus/compute >>'} << proof/menu >> << ontology/menu >>`,
      general_settings: '<< menus/shortening >>'
    });
  }
});

app.get('/ontology', (req, res) => {
  const id = req.query.id;
  if (!id) {
    renderMain(req, res);
  } else {
    ensureIfExample(id, res);
    res.render('ontology/ontology.spy', {
      title,
      uuid: id,
      settings_specific: '<< ontology/settings >>',
      sidebars_specific: '<< ontology/repairs >>',
      menu_specific: `${MODE === 'demo' ? '' : '<< menus/projects >> << menus/compute >>'} << ontology/menu >>`,
      general_settings: '<< menus/shortening >>'
    });
  }
});

app.get('/proof', (req, res) => {
  const id = req.query.id;
  if (!id) {
    renderMain(req, res);
  } else {
    ensureIfExample(id, res);
    res.render('proof/proof.spy', {
      title,
      uuid: id,
      settings_specific: '<< proof/settings >>',
      advanced_settings_specific: '<< proof/advanced-settings >>',
      menu_specific: `${MODE === 'demo' ? '' : '<< menus/projects >> << menus/compute >>'}  << proof/menu >>`,
      general_settings: '<< menus/shortening >>'
    });
  }
});

app.get('/euler', (request, response) => {
  response.render('euler/euler.spy')
});

app.get('/inference', (request, response) => {
  response.render('inference/inference.spy');
});

app.get("/counterexample", (request, response) => {
  response.render("counterexample/counterexample.spy", {settings_specific: '<< counterexample/settings >>'});
});

// resources
app.get('/project', (req, res) => {
  const id = req.query.id;
  const target = path.join(dataDir, id);

  if (!existsSync(target) || !lstatSync(target).isDirectory()) {
    res.status(400).send('Project does not exist.');
    return;
  }

  // check for existing processes running
  /* if (sessions[id]) {
    res.status(200).send({ status: 'busy' });
    return;
  } else {
    sessions[id] = true;
  }*/

  const status = {
    status: undefined,
    ontology: [],
    names: {},
    proofs: [],
    reasoner:'',
  };

  const files = readdirSync(target);

  const flags = {
    ontology: false,
    names: false,
    proofs: false,
    ad: false,
  }

  files.forEach(function (file) {
    if (file.endsWith('.t.xml')) {
      status.proofs.push(file);
      flags.proofs = true;
    }
    
    if (file.endsWith('.xml') && file.startsWith('atomic ')) {
      status.ad = file;
      flags.ad = true;
    }

    if ((file.endsWith('.xml') || file.endsWith('.owl')) 
    && !file.startsWith('atomic ') && !file.startsWith('proof_') && !file.endsWith('t.xml')) {
      status.ontology = file; // there is more than one
      flags.ontology = true;
    }
  });

  const namesPath = path.join(target, 'cnsOriginal.json');
  const hierarchyPath = path.join(target, 'cnsHierarchy.json');
  if (existsSync(namesPath) && existsSync(hierarchyPath)) {
    flags.names = true;

    const concepts = JSON.parse(readFileSync(namesPath));
    const hierarchy = JSON.parse(readFileSync(hierarchyPath));

    Object.keys(concepts).forEach(key => {
      status.names[key] = {
        conceptNameShort: concepts[key],
        rhs: hierarchy[key]
      };
    });
  }

  const pending = !flags.proofs || !flags.ad;
  if (flags.proofs && flags.ad) {
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
  status.reasoner = existsSync(reasonerPath) ? readFileSync(path.join(target, 'reasoner.txt')).toString() : "n/a";

  // delete sessions[id]
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

    res.send('File uploaded!');
  });
});

app.get('/create', (req, res) => {
  const id = req.query.id;
  const dest = path.join(dataDir, id);
  if (!existsSync(dest)) {
    mkdirSync(dest);
  } else {
    res.status(400).send('Project already exists.');
    return;
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

  // TODO: progress bar (consider spawnSync)
  const names = spawn('java', [
    '-jar', 'externalTools/extractNames.jar',
    '-o', ontPath,
    '-od', projPath,
    '-r', req.query.reasoner,
  ], { encoding: 'utf-8' });
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

app.post('/axiom', (req, res) => {
  const id = req.body.id;
  const ontology = req.body.ontology;

  if (sessions[id]) {
    return;
  } else {
    sessions[id] = true;
  }

  const projPath = path.join(dataDir, id);
  const ontPath = path.join(projPath, ontology);
  const genMethod = req.body.method;
  const sigPath = req.body.signaturePath;
  const axiom = req.body.lhs + " SubClassOf: " + req.body.rhs;
  let translate2NL = req.body.translate2NL==="true"?"":"-nt";

  console.log('computing proofs...');

  let proofs = generateProofs(ontPath,axiom, projPath,sigPath,genMethod,translate2NL)

  printOutput(proofs);
  proofs.on("exit", function (exitCode) {
    if (exitCode === 333){
      console.log("Proving the axiom is not supported by the selected method")
      return;
      //TODO show the user that proof generation was not possible because
      // the method they chose can not generate a proof for the type of input axiom
    }
    console.log("done computing proofs.");
    console.log('extracting module...');

    const moduleName = 'module_'+ path.parse(ontology).name;
    const module = spawn('java',  [
      '-jar', 'externalTools/explain.jar',
      '-o', ontPath,
      '-a', axiom,
      '-mod', moduleName,
      '-od', projPath,
    ], { encoding: 'utf-8' });

    printOutput(module);

    module.on("exit", function () {
      console.log("done extracting module.");
      console.log('computing atomic decomposition...');
      const ad = spawn('java',  [
        '-cp', 'externalTools/AD/adStarGenerator.jar', 'EverythingForGivenOntology',
        path.join(projPath, moduleName) + '.owl', // module input 
        projPath, //outDir
        'atomic ' + path.parse(ontology).name //outFileName
      ], { encoding: 'utf-8' });

      printOutput(ad);
      ad.on("exit", function () {
        console.log("done computing atomic decomposition.");
        delete sessions[id];
      });

      ad.on('close', (code) => {
        if (code !== 0) {
          console.log('failed computing atomic decomposition: ' + code);
        }
      });
    });

    module.on('close', (code) => {
      if (code !== 0) {
        console.log('failed extracting module: ' + code);
      }
    });
  });

  proofs.on('close', (code) => {
    if (code !== 0) {
      console.log('failed extracting concepts: ' + code);
    }
  });

  res.status(200).send({ msg: 'processing request..' });
});

// listening on the connection event for incoming sockets
io_.on('connection', function (socket) {

  console.log('a client connected');

  socket.on('disconnect', function () {
    console.log('client disconnected');
  });

  socket.on('highlight in ontology', function (data) {
    console.log("Received the following to highlight!");
    console.log(data);
    console.log("Broadcasting...");

    if (!sessions[data.id]) {
      sessions[data.id] = true;
      io_.sockets.emit('highlight axioms', data);
    }
    delete sessions[data.id];
  });

  socket.on('get ontology', function (data) {
    console.log("Received the following asking for ontology name!");
    console.log(data);
    console.log("Broadcasting...");
    io_.sockets.emit('set ontology', data);
  });

  socket.on('get repairs', function (data) {

    const id = data.id;
    const axiom = data.axiom;
    console.log(axiom)
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

    console.log("java -jar externalTools/explain.jar -a "+ axiom + " -o "+ ontologyPath+
        " -mds "  + id, reasoner +  " -od " + projectPath);

    if (axiom !== "") {
      //Added this to make sure that previous result does not interfere with current computation
      clearFile(path.join(projectPath, "mDs_"+id+".txt"));

      const repairs = spawn('java', [
        '-jar', 'externalTools/explain.jar',
        '-a', axiom,
        '-o', ontologyPath,
        '-mds', id, reasoner,
        '-od', projectPath,
      ]);
      printOutput(repairs);
      repairs.on("exit", ()=> {
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

  socket.on('euler view', function (data) {
    console.log("Received the following for euler view!")
    console.log(data);
    console.log("Broadcasting...")
  
    io_.sockets.emit('euler view', data);
  });

  socket.on('inference view', function (data) {
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
  return `<< main/examples-${req.query.examples ? req.query.examples: EXAMPLES} >>`;
}

function renderMain(req, res) {
  if (MODE === 'demo') {
    res.render('main/demo.spy', { 
      title,
      uuid: uuidv4(),
      examples: getExamples(req), 
    });
  } else {
    res.render('main/main.spy', {
      title,
      uuid: uuidv4(),
      menu_specific: '<< menus/projects >>',
      examples: getExamples(req),
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

function getProofType(genMethod, sigPath) {
  // For reference
  // minTreeOpts = ["1","4","6",/*"8",*/,"9","11"];

  let minWTreeOpts = ["3","7","12"];
  let minDepthOpts = ["2","5","10"];

  let proofType = 'MinTreeSize';
  // CONDENSED MINIMAL PROOF
  if (sigPath!=="NoSignature"){
    proofType = 'ConMinTreeSize';
    if (minDepthOpts.includes(genMethod))
      proofType = 'ConMinDepth';
    else if (minWTreeOpts.includes(genMethod))
      proofType = 'ConMinWTreeSize';
  }
  // MINIMAL PROOF
  else {
    if (minDepthOpts.includes(genMethod))
      proofType = 'MinDepth';
    else if (minWTreeOpts.includes(genMethod))
      proofType = 'MinWTreeSize';
  }
  return proofType;
}

function generateProofs(ontPath,axiom, projPath,sigPath,genMethod,translate2NL) {
  console.log("GENERATION METHOD -> " + genMethod);

  const proofType = getProofType(genMethod,sigPath);
  console.log("proof type = "+proofType)

  //ELK PROOF
  let elkOpts = ["1","2","3"];
  if (elkOpts.includes(genMethod)){
    return spawn('java', [
      '-jar', 'externalTools/explain.jar',
      '--ontology-path', ontPath,
      '--conclusion-axiom', axiom,
      '--output-type', 'graph',
      '--output-name', 'proof',
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
    axiom = axiom.replace("owl:Nothing","BOTTOM")

  //LETHE Forgetting-Based Proof
  let generator = 'externalTools/evee-elimination-proofs-lethe.jar';
  let cls = 'de.tu_dresden.inf.lat.evee.eliminationProofs.LetheBasedHeuristicProofGenerator';

  //LETHE Forgetting-Based Symbol Minimal Proof
  if (genMethod === "5"){
    cls = 'de.tu_dresden.inf.lat.evee.eliminationProofs.LetheBasedSymbolMinimalProofGenerator';
  }

  //LETHE Forgetting-Based Size Minimal Proof
  if (genMethod === "6"){
    cls = 'de.tu_dresden.inf.lat.evee.eliminationProofs.LetheBasedSizeMinimalProofGenerator';
  }

  //LETHE Forgetting-Based Weighted Size Minimal Proof
  if (genMethod === "7"){
    cls = 'de.tu_dresden.inf.lat.evee.eliminationProofs.LetheBasedWeightedSizeMinimalProofGenerator';
  }

  //LETHE Proof
  if (genMethod === "8"){
    generator = 'externalTools/evee-lethe-proof-extractor.jar';
    cls = 'de.tu_dresden.inf.lat.evee.proofs.lethe.LetheProofGenerator';
  }

  //FAME Forgetting-Based Proof
  if(genMethod === "9") {
    generator = 'externalTools/evee-elimination-proofs-fame.jar';
    cls = 'de.tu_dresden.inf.lat.evee.eliminationProofs.FameBasedHeuristicProofGenerator';
  }

  //FAME Forgetting-Based Symbol Minimal Proof
  if (genMethod === "10"){
    generator = 'externalTools/evee-elimination-proofs-fame.jar';
    cls = 'de.tu_dresden.inf.lat.evee.eliminationProofs.FameBasedSymbolMinimalProofGenerator';
  }

  //FAME Forgetting-Based Size Minimal Proof
  if (genMethod === "11"){
    generator = 'externalTools/evee-elimination-proofs-fame.jar';
    cls = 'de.tu_dresden.inf.lat.evee.eliminationProofs.FameBasedSizeMinimalProofGenerator';
  }

  //FAME Forgetting-Based Weighted Size Minimal Proof
  if (genMethod === "12"){
    generator = 'externalTools/evee-elimination-proofs-fame.jar';
    cls = 'de.tu_dresden.inf.lat.evee.eliminationProofs.FameBasedWeightedSizeMinimalProofGenerator';
  }

  const process = sigPath !== "NoSignature" ? spawn('java', [
      '-cp', generator, 'de.tu_dresden.inf.lat.evee.proofs.GenerateProof',
      cls, ontPath, axiom, projPath, 'proof', sigPath
    ], { encoding: 'utf-8' })
    :  spawn('java', [
      '-cp', generator, 'de.tu_dresden.inf.lat.evee.proofs.GenerateProof',
      cls, ontPath, axiom, projPath, 'proof'
    ], { encoding: 'utf-8' });

  return process.on("exit", function (exitCode) {
    if (exitCode === 3)
      return process;

    console.log("Done computing JSON Proofs");
    const draw = spawn('java',['-cp','externalTools/explain.jar',
    'de.tu_dresden.lat.evonne.EvonneInputGenerator',
    '--proof-path', projPath+'/proof.json',
    '--output-directory', projPath,
    '--output-name', "proof",
    '--proof-type', proofType,
    '--signature-file-path', sigPath,
    '--ontology-path', ontPath,
    translate2NL
    ]);

    printOutput(draw);

    return draw.on("exit", function (){
      console.log("Done generating GML Proofs");
    })
  })

}
