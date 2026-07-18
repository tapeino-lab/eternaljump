import js from "@eslint/js";

export default [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        window: "readonly",
        document: "readonly",
        console: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        requestAnimationFrame: "readonly",
        cancelAnimationFrame: "readonly",
        performance: "readonly",
        Math: "readonly",
        localStorage: "readonly",
        navigator: "readonly",
        AudioContext: "readonly",
        webkitAudioContext: "readonly",
        AudioBufferSourceNode: "readonly",
        OscillatorNode: "readonly",
        GainNode: "readonly",
        BiquadFilterNode: "readonly",
        process: "readonly"
      }
    },
    rules: {
      "no-unused-vars": "off",
      "no-empty": "off"
    }
  }
];
