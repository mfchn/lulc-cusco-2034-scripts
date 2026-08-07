
// Get band names
var bands = composite.bandNames();

// Average values per band for filling
var values = [
    0.236129,  // SR_B1
    0.289533,  // SR_B2
    0.331675,  // SR_B3
    0.383913,  // SR_B4
    0.462778,  // SR_B5
    0.443309   // SR_B7
];

// Create constant fill image
var fillImage = ee.Image.constant(valores)
    .rename(bands)
    .updateMask(ee.Image().paint(punto_vacio.buffer(30), 1));

// Fill composite where pixels are unmasked/missing
var filled = composite.unmask(fillImage);

Map.addLayer(composite, { bands: ['SR_B3', 'SR_B2', 'SR_B1'], min: 0.004, max: 0.15 }, 'Original Composite');
Map.addLayer(filled, { bands: ['SR_B3', 'SR_B2', 'SR_B1'], min: 0.004, max: 0.15 }, 'Filled Composite');

// Export to Asset
Export.image.toAsset({
    image: filled.clip(geomCusco),
    description: 'L5_median_composite_2004_2025_09_21_18_05',
    assetId: 'projects/ee-mfnh21/assets/L5_median_composite_2004_2025_09_21_18_05',
    region: geomCusco,
    scale: 30,
    crs: 'EPSG:32719',
    maxPixels: 1e13
});

// Export to Drive (RGB)
Export.image.toDrive({
    image: filled.clip(geomCusco).select(['SR_B3', 'SR_B2', 'SR_B1']),
    description: 'L5_median_composite_rgb_2004_2025_09_21_18_05',
    folder: 'compuestas_medianas',
    fileNamePrefix: 'L5_composite_rgb_2004_2025_09_21',
    region: geomCusco,
    scale: 30,
    crs: 'EPSG:32719',
    maxPixels: 1e13
});

var bandsToKeep = ['SR_B1', 'SR_B2', 'SR_B3', 'SR_B4', 'SR_B5', 'SR_B7'];

// Export to Drive (Bands)
Export.image.toDrive({
    image: filled.clip(geomCusco).select(bandsToKeep),
    description: 'L5_median_composite_bands_2004_2025_09_21_18_05',
    folder: 'compuestas_medianas',
    fileNamePrefix: 'L5_median_composite_bands_2004_2025_09_21_18_05',
    region: geomCusco,
    scale: 30,
    crs: 'EPSG:32719',
    maxPixels: 1e13
});