# Ward map assets

The ward-map backgrounds are patch-specific reference layers inside a non-commercial analytical fan work. They are not offered as a standalone asset pack and are not relicensed under the dashboard's source-code terms.

The patch mapping is taken from [OpenDota `patch.json`](https://github.com/odota/dotaconstants/blob/master/build/patch.json): id 59 is Dota 2 7.40 and id 60 is 7.41. Valve's [7.41 patch notes](https://www.dota2.com/patches/7.41) list terrain changes, so the 7.40 and 7.41 images must not be treated as interchangeable.

## Patch 7.40 / OpenDota patch id 59

- Public source: OpenDota Web, commit [`301db741` (`7.40 minimap`)](https://github.com/odota/web/commit/301db7412410550476bc70e983fd91668a6b8e85), file `public/assets/images/dota2/map/detailed_740.webp`.
- OpenDota repository license: [MIT License](https://github.com/odota/web/blob/master/LICENSE), copyright The OpenDota Project.
- Local file: `assets/ward-map-740.webp`, 900 × 900 px.
- SHA-256: `cceee8cea4e7137a3274d89a443c1983d8c18261d6222f1bd4be7e9b125b11dc`.

The OpenDota license covers its repository contribution. Dota 2 visual content and trademarks remain the property of Valve Corporation and are not claimed to be MIT-licensed by this project.

## Patch 7.41 / OpenDota patch id 60

- Source: installed Dota 2 client, `game/dota/pak01_dir.vpk`, resource `panorama/images/minimap/dotamap_psd.vtex_c`.
- Reproducible extraction: [ValveResourceFormat](https://github.com/ValveResourceFormat/ValveResourceFormat) 20.0, `Source2Viewer-CLI.exe -i pak01_dir.vpk -o <output> -d -f panorama/images/minimap/dotamap_psd.vtex_c`.
- Local file: `assets/ward-map-741.png`, 320 × 320 px.
- SHA-256: `43eaebcfafa245c1581df0044c1dc8a3527a26390d6da9561503a455dc2c406e`.

## Rights and use restriction

Dota 2 and its visual content are © Valve Corporation. Section 2.D of the [Steam Subscriber Agreement](https://store.steampowered.com/subscriber_agreement/#2) permits Subscribers to incorporate Valve game content into Fan Art and publish/distribute that fan work solely on a non-commercial basis. This dashboard relies on that permission: the maps are incorporated as subdued coordinate reference layers beneath original statistical overlays.

The backgrounds must be removed or separately cleared with Valve before any commercial use. Do not extract or redistribute these two files as a standalone map/asset package. Dota, Dota 2, Steam and Valve names and marks belong to Valve Corporation. This project is unofficial and is not endorsed by Valve or OpenDota.

When a selection contains more than one patch geometry, the renderer intentionally disables the raster layer and shows only the normalized coordinate grid.
