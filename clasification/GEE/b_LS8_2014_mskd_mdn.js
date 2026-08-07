// =============================================================
// Landsat 8 - Collection 2, Tier 1, Level-2 (SR + ST)
// Cusco Province - Austral Winter 2014
// =============================================================

// -------------------------------
// STUDY AREA
// -------------------------------
var geomCusco = cusco_prov_shapefile;

// -------------------------------
// COLLECTION: Landsat 8 SR + ST
// -------------------------------
var l8sr = ee.ImageCollection("LANDSAT/LC08/C02/T1_L2");

// -------------------------------
// RGB VISUALIZATION
// -------------------------------
var visParamsRGB = {
    bands: ['SR_B4', 'SR_B3', 'SR_B2'],
    min: 7500,
    max: 12000
};
var visParamsRGBComposite = {
    bands: ['SR_B4', 'SR_B3', 'SR_B2'],
    min: 0.023,
    max: 0.155
};

// -------------------------------
// TEMPORAL AND SPATIAL FILTERS
// -------------------------------
var startDate = '2014-06-19';
var endDate = '2014-09-23';

var l8Filtered = l8sr
    .filterDate(startDate, endDate)
    .filterBounds(geomCusco)
    .filter(ee.Filter.lt('CLOUD_COVER', 101));

print("Filtered Landsat 8 Collection (2014 - winter):", l8Filtered);

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

l8Filtered.evaluate(function (result) {
    result.features.forEach(function (feature, index) {
        var name = 'L8_SR_' + (index + 1);
        addImageToMap(feature, name);
    });
});

// =============================================================
// CLOUD MASKING AND SCALING
// =============================================================
function maskL8SR(image) {
    // QA_PIXEL Bits
    // Bit 3: Cloud
    // Bit 4: Cloud Shadow
    var qaMask = image.select('QA_PIXEL').bitwiseAnd(parseInt('11000', 2)).eq(0);

    // Saturated pixels
    var satMask = image.select('QA_RADSAT').eq(0);

    // Optical reflectance scaling
    var opticalBands = image.select('SR_B.').multiply(0.0000275).add(-0.2);
    // Thermal scaling
    var thermalBand = image.select('ST_B10').multiply(0.00341802).add(149.0);

    return image.addBands(opticalBands, null, true)
        .addBands(thermalBand, null, true)
        .updateMask(qaMask)
        .updateMask(satMask);
}

// Apply cloud masking
var l8Masked = l8Filtered.map(maskL8SR);
print("Masked Collection:", l8Masked);

// =============================================================
// MEDIAN COMPOSITE
// =============================================================
var bandsToKeep = ['SR_B1', 'SR_B2', 'SR_B3', 'SR_B4', 'SR_B5', 'SR_B6', 'SR_B7'];
var l8MedianComposite = l8Masked.median().select(bandsToKeep);

Map.addLayer(l8MedianComposite.clip(geomCusco), visParamsRGBComposite, "L8 2014 Median Composite", true);

// =============================================================
// COMPOSITE EXPORT
// =============================================================

// Export to Asset
Export.image.toAsset({
    image: l8MedianComposite.clip(geomCusco),
    description: 'L8_median_composite_2014_asset',
    assetId: 'projects/ee-user/assets/L8_median_composite_2014',
    region: geomCusco,
    scale: 30,
    crs: 'EPSG:32719'
});

// Export to Drive (RGB)
Export.image.toDrive({
    image: l8MedianComposite.clip(geomCusco).select(['SR_B4', 'SR_B3', 'SR_B2']),
    description: 'L8_median_composite_rgb_2014_drive',
    folder: 'compuestas_medianas',
    fileNamePrefix: 'L8_composite_rgb_2014_RGB',
    region: geomCusco,
    scale: 30,
    crs: 'EPSG:32719',
    maxPixels: 1e13
});

// Export to Drive (Bands)
Export.image.toDrive({
    image: l8MedianComposite.clip(geomCusco).select(bandsToKeep),
    description: 'L8_median_composite_bands_2014_drive',
    folder: 'compuestas_medianas',
    fileNamePrefix: 'L8_median_composite_bands_2014_drive',
    region: geomCusco,
    scale: 30,
    crs: 'EPSG:32719',
    maxPixels: 1e13
});

// =============================================================
// INDIVIDUAL MASKED IMAGE EXPORT
// =============================================================
var listMasked = l8Masked.toList(l8Masked.size());
var count = listMasked.size().getInfo();

for (var i = 0; i < count; i++) {
    var img = ee.Image(listMasked.get(i));
    var date = img.get('DATE_ACQUIRED').getInfo();
    var cleanDate = date.replace(/-/g, '');
    var exportName = 'L8_masked_' + (i + 1) + '_' + cleanDate;

    // Visualize each masked image
    Map.addLayer(img.clip(geomCusco), visParamsRGBComposite, exportName, false);

    // Export to Drive
    Export.image.toDrive({
        image: img.clip(geomCusco).select(['SR_B4', 'SR_B3', 'SR_B2']),
        description: exportName,
        folder: 'GEE_L8_Enmascaradas',
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

