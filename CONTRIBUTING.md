# Contributing to BLE Demystified

Hey there! Thanks for helping make Bluetooth Low Energy clear and approachable for everyone.

## Core Philosophy
- Visual first: interactive diagrams and real telemetry plots beat dense specification PDFs.
- Zero friction: the default demo should run with zero hardware and zero native build toolchains.
- Casual & friendly: write for humans, explain concepts with analogies, avoid stuffy committee jargon.

## Local Development
1. Start the zero-dependency simulator:
   cd simulator
   node server.js
2. Open http://localhost:3333/web/ for the live client and http://localhost:3333/explainer/ for the interactive explainer.
3. Run unit tests: npm test (or node --test ../tests/*.test.js).
4. Regenerate plots: node scripts/generate-plots.js.
