# Hero slideshow update

The homepage hero shows the four supplied Bella by RT photos in attachment order: brown niqab, blue hijab, pink hijab with black niqab, then green hijab. Photos crossfade every 3 seconds and loop.

Desktop photos fill the right-hand hero area with a broad cream gradient that blends into the text area, matching the supplied original-hero screenshot. The photos are positioned to keep faces and lip gloss in view. Phones retain the original portrait proportions beneath the text. The exported lossless WebP assets retain the original image pixels.

## Run locally

```sh
npm ci
npm run dev
```

## Production

```sh
npm run build
```

The `dist` folder contains the production build.

Validation: production build succeeded. The desktop cover sizing and broad gradient are included in the rebuilt CSS. Slideshow timing remains 3 seconds. Browser visual verification was unavailable in this environment.
