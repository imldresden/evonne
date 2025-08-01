import { defineConfig } from "cypress";

export default defineConfig({
  e2e: {
    setupNodeEvents(on, config) {
      // implement node event listeners here
    },
    defaultCommandTimeout: 25000,
    experimentalMemoryManagement: true,
    numTestsKeptInMemory: 0
  },
});
