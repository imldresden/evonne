import { mount } from 'svelte'
import './app.css'

import './../../src/public/style/proof.css';
import './../../src/public/style/widgets/general.css';
import App from './App.svelte';

const app = mount(App, {
  target: document.getElementById('evonnemo')!,
});

import { init_trace, proof } from "./../../src/public/js/proof/proof.js";

console.log(d3);

const compact = {
  isLinear: true,
  bottomRoot: false,

  isCompact: true,
  isZoomPan: false,
  compactInteraction: true,
};

const normal = {
  isLinear: false,
  bottomRoot: true,

  isMagic: false,
  isCompact: false,
  isZoomPan: true,
  compactInteraction: false,
};

const trace = {
    "responseType": "treeForTable",
    "payload": {
        "childInformation": {
            "rule": 1,
            "children": [
                {
                    "childInformation": {
                        "rule": 0,
                        "children": [
                            {
                                "predicate": "parent",
                                "tableEntries": {
                                    "entries": [
                                        {
                                            "entryId": 2,
                                            "termTuple": [
                                                "alice",
                                                "charlotte"
                                            ]
                                        }
                                    ],
                                    "pagination": {
                                        "start": 0,
                                        "moreEntriesExist": false
                                    }
                                },
                                "possibleRulesAbove": [
                                    1,
                                    0
                                ],
                                "possibleRulesBelow": []
                            }
                        ]
                    },
                    "predicate": "ancestor",
                    "tableEntries": {
                        "entries": [
                            {
                                "entryId": 1,
                                "termTuple": [
                                    "alice",
                                    "charlotte"
                                ]
                            }
                        ],
                        "pagination": {
                            "start": 0,
                            "moreEntriesExist": false
                        }
                    },
                    "possibleRulesAbove": [
                        1,
                        2
                    ],
                    "possibleRulesBelow": [
                        0,
                        1
                    ]
                },
                {
                    "predicate": "parent",
                    "tableEntries": {
                        "entries": [
                            {
                                "entryId": 3,
                                "termTuple": [
                                    "charlotte",
                                    "edward"
                                ]
                            }
                        ],
                        "pagination": {
                            "start": 0,
                            "moreEntriesExist": false
                        }
                    },
                    "possibleRulesAbove": [
                        1,
                        0
                    ],
                    "possibleRulesBelow": []
                }
            ]
        },
        "predicate": "ancestor",
        "tableEntries": {
            "entries": [
                {
                    "entryId": 0,
                    "termTuple": [
                        "alice",
                        "edward"
                    ]
                }
            ],
            "pagination": {
                "start": 0,
                "moreEntriesExist": false
            }
        },
        "possibleRulesAbove": [
            1,
            2
        ],
        "possibleRulesBelow": [
            0,
            1
        ]
    }
};


const params = {
  div: "my-reasoning-tree",
  trace,
  drawTime: 0,
  showRules: true,
  trays: { upper: false, lower: false },
  stepNavigator: false,
  ...compact,
};

init_trace(params);

let compactOrNormal = true;
const switchBtn = document.getElementById("change");
switchBtn.addEventListener("click", () => {
  const layout = compactOrNormal ? compact : normal;

  init_trace({
    ...params,
    ...layout,
  });

  if (compactOrNormal) {
    compactOrNormal = false;
  } else {
    compactOrNormal = true;
  }
});

const qt2 = document.getElementById("print-query-type2");
qt2.addEventListener("click", () => {
  console.log(proof.trace);
});

export default app
