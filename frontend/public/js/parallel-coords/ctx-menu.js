import PureContextMenu from "/libs/pure-context-menu/pure-context-menu.js";

const makeCtxMenu = function (divID, pane, fns, { condition, extras }) {

    const items = [
        {
            label: "Sync Selection in Model View",
            preventCloseOnClick: true,
            callback: () => {
                dispatchEvent(new CustomEvent("linked-selection", {
                    detail: {
                        pane: pane.id,
                        selection: fns.getSelection(),
                    },
                }));

                const selection = fns.getSelection();
                pane.cy.nodes().unselect();
                pane.cy.$('#' + selection.map(n => n.id).join(', #')).select();
            },
        },
        {
            label: "New Pane from Selection...",
            callback: (e) => {
                dispatchEvent(new CustomEvent("pane-from-selection", {
                    detail: {
                        pane: pane.id,
                        selection: fns.getSelection(),
                    },
                }));

                if (pane.cy.pcp) {
                    pane.cy.paneFromPCP(pane);
                }
            },
        },
        ...extras
    ];


    return new PureContextMenu(document.querySelector('#' + divID), items, {
        show: condition
    });
}

export default makeCtxMenu;