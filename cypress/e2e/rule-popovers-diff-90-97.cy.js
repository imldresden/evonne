const excl = new Set([
  30, // no CDPs
  41, 42, 43, 44, 46, 47, 48, 49, // timed out in proof generation
  45 // malformed proof
]);

describe("Open Concrete Domain rule popovers", () => {
  for (let i = 90; i <= 97; i++) {
    if (!excl.has(i)) {
      it(`open popovers in ${i}`, () => {
        cy.visit(
          `http://localhost:3000/proof?id=${i}`
          //  {
          //   onBeforeLoad(win) {
          //     cy.stub(win.console, 'log').as('consoleLog')
          //     cy.stub(win.console, 'error').as('consoleError')
          //   }
          // }
        );
        cy.wait(1500);

        cy.get("#proof-view").within((proof) => {
          cy.wrap(proof)
            .get(".CDRule")
            .each((cdp) => {
              cy.wrap(cdp).click({ force: true });
              cy.wait(100);
            });
        });

        
        cy.wait(500);
    });
    }
  }
});
