// =============================================================
// Landsat 5 - Collection 2, Tier 1, Level-2 (SR + ST)
// Cusco Province - Austral Winter 2004
// =============================================================

// -------------------------------
// STUDY AREA
// -------------------------------
var geomCusco = cusco_prov_shapefile;

// -------------------------------
// COLLECTION: Landsat 5 SR + ST
// -------------------------------
var l5sr = ee.ImageCollection("LANDSAT/LT05/C02/T1_L2");

// -------------------------------
// RGB VISUALIZATION
// -------------------------------
var visParamsRGB = {
    bands: ['SR_B3', 'SR_B2', 'SR_B1'],
    min: 8000,
    max: 12000
};
var visParamsRGBComposite = {
    bands: ['SR_B3', 'SR_B2', 'SR_B1'],
    min: 0.04,
    max: 0.146
};

// -------------------------------
// TEMPORAL AND SPATIAL FILTERS
// -------------------------------
var startDate = '2004-06-20';
var endDate = '2004-09-24';

var l5Filtered = l5sr
    .filterDate(startDate, endDate)
    .filterBounds(geomCusco)
    .filter(ee.Filter.lt('CLOUD_COVER', 101));

print("Filtered Landsat 5 Collection (2004 - winter):", l5Filtered);

// =============================================================
// INDIVIDUAL IMAGE VISUALIZATION
// =============================================================
function addImageToMap(imageFeature, customName) {
    var img = ee.Image(imageFeature.id);
    var date = img.get('DATE_ACQUIRED').getInfo();
    var cloud = img.get('CLOUD_COVER').getInfo();
    var layerName = customName + ' - ' + date + ' - ' + cloud + '% clouds';

    print("Image added:", layerName);
    Map.addLayer(img.clip(geomCusco), visParamsRGB, layerName, false);
}

l5Filtered.evaluate(function (result) {
    result.features.forEach(function (feature, index) {
        var name = 'L5_SR_' + (index + 1);
        addImageToMap(feature, name);
    });
});

// =============================================================
// CLOUD MASKING AND SCALING
// =============================================================
function maskL5SR(image) {
    // QA_PIXEL Bits
    // Bit 0: Fill
    // Bit 1: Dilated Cloud
    // Bit 3: Cloud
    // Bit 4: Cloud Shadow
    var qaMask = image.select('QA_PIXEL').bitwiseAnd(parseInt('11000', 2)).eq(0);

    // Saturated pixels
    var satMask = image.select('QA_RADSAT').eq(0);

    // Optical reflectance scaling
    var opticalBands = image.select('SR_B.').multiply(0.0000275).add(-0.2);
    // Thermal scaling
    var thermalBand = image.select('ST_B6').multiply(0.00341802).add(149.0);

    return image.addBands(opticalBands, null, true)
        .addBands(thermalBand, null, true)
        .updateMask(qaMask)
        .updateMask(satMask);
}

// Apply cloud masking
var l5Masked = l5Filtered.map(maskL5SR);
print("Masked collection:", l5Masked);

// =============================================================
// MEDIAN COMPOSITE
// =============================================================
var bandsToKeep = ['SR_B1', 'SR_B2', 'SR_B3', 'SR_B4', 'SR_B5', 'SR_B7'];
var l5MedianComposite = l5Masked.median().select(bandsToKeep);

Map.addLayer(l5MedianComposite.clip(geomCusco), visParamsRGBComposite, "Median Composite", true);

// =============================================================
// COMPOSITE EXPORT
// =============================================================

// Export to Asset
Export.image.toAsset({
    image: l5MedianComposite.clip(geomCusco),
    description: 'L5_median_composite_2004_asset_2025_10_03',
    assetId: 'projects/ee-user/assets/L5_median_composite_2004_2025_10_03',
    region: geomCusco,
    scale: 30,
    crs: 'EPSG:32719'
});

// Export to Drive (RGB)
Export.image.toDrive({
    image: l5MedianComposite.clip(geomCusco).select(['SR_B3', 'SR_B2', 'SR_B1']),
    description: 'L5_median_composite_rgb_2004_drive_2025_10_03',
    folder: 'compuestas_medianas',
    fileNamePrefix: 'L5_composite_rgb_2004_RGB_2025_10_03',
    region: geomCusco,
    scale: 30,
    crs: 'EPSG:32719',
    maxPixels: 1e13
});

// Export to Drive (Bands)
Export.image.toDrive({
    image: l5MedianComposite.clip(geomCusco).select(bandsToKeep),
    description: 'L5_median_composite_bands_2004_drive_2025_10_03',
    folder: 'compuestas_medianas',
    fileNamePrefix: 'L5_median_composite_bands_2004_drive_2025_10_03',
    region: geomCusco,
    scale: 30,
    crs: 'EPSG:32719',
    maxPixels: 1e13
});

// =============================================================
// INDIVIDUAL MASKED IMAGE EXPORT
// =============================================================
var listMasked = l5Masked.toList(l5Masked.size());
var count = listMasked.size().getInfo();

for (var i = 0; i < count; i++) {
    var img = ee.Image(listMasked.get(i));
    var date = img.get('DATE_ACQUIRED').getInfo();
    var cleanDate = date.replace(/-/g, '');
    var exportName = 'L5_masked_' + (i + 1) + '_' + cleanDate + '_2025_10_03';

    // Visualize each masked image
    Map.addLayer(img.clip(geomCusco), visParamsRGBComposite, exportName, false);

    // Export to Drive
    Export.image.toDrive({
        image: img.clip(geomCusco).select(['SR_B3', 'SR_B2', 'SR_B1']),
        description: exportName,
        folder: 'GEE_L5_Enmascaradas',
        fileNamePrefix: exportName,
        region: geomCusco,
        scale: 30,
        crs: 'EPSG:32719',
        maxPixels: 1e13
    });
}

// =============================================================
// CENTER MAP
// =============================================================
Map.centerObject(geomCusco, 12);

