// src/wasm.js
(async () => {
  if (typeof createDSAModule === 'undefined') {
    throw new Error('createDSAModule is not defined. Ensure /dsa.js is loaded via <script> tag.');
  }
  const Module = await createDSAModule();
  console.log("WASM Module loaded:", Module);
  
  // DEBUG: CHECK EXPORTS
  console.log("Available functions:", Object.keys(Module));
  
  const init = Module.cwrap('initEngine', null, []);
  if (init) init();
})();

// Export for App.jsx
export const loadWASM = async () => {
  if (typeof createDSAModule === 'undefined') {
    throw new Error('createDSAModule is not defined. Ensure /dsa.js is loaded via <script> tag.');
  }
  const Module = await createDSAModule();
  return Module;
};