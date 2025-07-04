import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import { exec } from "child_process";

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [
    svelte(),
    {
      name: 'update docker',
      handleHotUpdate: async () => {        
        exec("npm run docker", (error, stdout, stderr) => {
            if (error) {
                console.log(`error: ${error.message}`);
                return;
            }
            if (stderr) {
                console.log(`stderr: ${stderr}`);
                return;
            }
            console.log(`stdout: ${stdout}`);
        });
      }
    },
  ],
})
