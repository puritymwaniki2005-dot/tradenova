# TradeNovaX React

This is the initial React migration package for TradeNovaX.

## Included
- The complete current `TradeNovaX_FULLY_FIXED.html` preserved at `public/legacy/TradeNovaX_FULLY_FIXED.html`.
- The reference bot skeleton source from the supplied bot project under `src/reference-bot-engine/`.
- A Vite + React application shell.

## Run
```bash
npm install
npm run dev
```

## Build
```bash
npm run build
```

## Important
The reference bot source is preserved intact for integration; it is not falsely represented as already transpiled into the React UI. The next migration stage connects its trade engine and Deriv services to the React state/socket layer.
