// ===========================
// DATA INGESTION
// ===========================

// ALOS Surface Model (30 m)
var alos = ee.ImageCollection('JAXA/ALOS/AW3D30/V3_2');
var proj = alos.first().projection();
var elevation = alos.select('DSM').mosaic()
    .setDefaultProjection(proj)
    .rename('elevation');
var slope = ee.Terrain.slope(elevation).rename('slope');

// ===========================
// INDEX COMPUTATION FUNCTIONS
// ===========================

// Landsat 5 (2004)
function addIndicesL5(image) {
    var ndvi = image.normalizedDifference(['SR_B4', 'SR_B3']).rename('NDVI');
    var savi = image.expression(
        '((NIR - RED) * (1 + L)) / (NIR + RED + L)', {
        'NIR': image.select('SR_B4'),
        'RED': image.select('SR_B3'),
        'L': 0.5
    }).rename('SAVI');
    var ndbi = image.normalizedDifference(['SR_B5', 'SR_B4']).rename('NDBI');
    var ndmi = image.normalizedDifference(['SR_B4', 'SR_B5']).rename('NDMI');
    var bsi = image.expression(
        '((SWIR1 + RED) - (NIR + BLUE)) / ((SWIR1 + RED) + (NIR + BLUE))', {
        'SWIR1': image.select('SR_B5'),
        'RED': image.select('SR_B3'),
        'NIR': image.select('SR_B4'),
        'BLUE': image.select('SR_B1')
    }).rename('BSI');
    var ui = image.normalizedDifference(['SR_B7', 'SR_B4']).rename('UI');
    return image.addBands([ndvi, savi, ndbi, ndmi, bsi, ui]);
}

// Landsat 8 (2014)
function addIndicesL8(image) {
    var ndvi = image.normalizedDifference(['SR_B5', 'SR_B4']).rename('NDVI');
    var savi = image.expression(
        '((NIR - RED) * (1 + L)) / (NIR + RED + L)', {
        'NIR': image.select('SR_B5'),
        'RED': image.select('SR_B4'),
        'L': 0.5
    }).rename('SAVI');
    var ndbi = image.normalizedDifference(['SR_B6', 'SR_B5']).rename('NDBI');
    var ndmi = image.normalizedDifference(['SR_B5', 'SR_B6']).rename('NDMI');
    var bsi = image.expression(
        '((SWIR1 + RED) - (NIR + BLUE)) / ((SWIR1 + RED) + (NIR + BLUE))', {
        'SWIR1': image.select('SR_B6'),
        'RED': image.select('SR_B4'),
        'NIR': image.select('SR_B5'),
        'BLUE': image.select('SR_B2')
    }).rename('BSI');
    var ui = image.normalizedDifference(['SR_B7', 'SR_B5']).rename('UI');
    return image.addBands([ndvi, savi, ndbi, ndmi, bsi, ui]);
}

// Sentinel-2 (2024)
function addIndicesS2(image) {
    var b11 = image.select('B11').resample('bilinear').reproject({ crs: image.select('B8').projection() });
    var b12 = image.select('B12').resample('bilinear').reproject({ crs: image.select('B8').projection() });
    var ndvi = image.normalizedDifference(['B8', 'B4']).rename('NDVI');
    var savi = image.expression(
        '((NIR - RED) * (1 + L)) / (NIR + RED + L)', {
        'NIR': image.select('B8'),
        'RED': image.select('B4'),
        'L': 0.5
    }).rename('SAVI');
    var ndbi = b11.subtract(image.select('B8')).divide(b11.add(image.select('B8'))).rename('NDBI');
    var ndmi = image.select('B8').subtract(b11).divide(image.select('B8').add(b11)).rename('NDMI');
    var bsi = b11.add(image.select('B4'))
        .subtract(image.select('B8').add(image.select('B2')))
        .divide(b11.add(image.select('B4')).add(image.select('B8')).add(image.select('B2')))
        .rename('BSI');
    var ui = b12.subtract(image.select('B8')).divide(b12.add(image.select('B8'))).rename('UI');
    return image.addBands([ndvi, savi, ndbi, ndmi, bsi, ui]);
}

// ===========================
// APPLY INDICES AND ADD TOPOGRAPHY
// ===========================

var imgL5 = addIndicesL5(cmp_2004).addBands(elevation).addBands(slope).toFloat();
var imgL8 = addIndicesL8(cmp_2014).addBands(elevation).addBands(slope).toFloat();
var imgS2 = addIndicesS2(cmp_2024).addBands(elevation).addBands(slope).toFloat();


// ===========================
// SPECTRAL INDICES VISUALIZATION
// ===========================

// Landsat 5
Map.addLayer(imgL5, {bands: ['NDVI'], min: 0, max: 0.6, palette: ['white', 'green']}, 'L5 NDVI');
Map.addLayer(imgL5, {bands: ['SAVI'], min: 0, max: 0.6, palette: ['white', 'green']}, 'L5 SAVI');
Map.addLayer(imgL5, {bands: ['NDBI'], min: -0.3, max: 0.4, palette: ['white', 'red']}, 'L5 NDBI');
Map.addLayer(imgL5, {bands: ['NDMI'], min: -0.3, max: 0.4, palette: ['white', 'purple']}, 'L5 NDMI');
Map.addLayer(imgL5, {bands: ['BSI'], min: -0.3, max: 0.5, palette: ['white', 'orange']}, 'L5 BSI');
Map.addLayer(imgL5, {bands: ['UI'], min: -0.2, max: 0.5, palette: ['white', 'purple']}, 'L5 UI');

// Landsat 8
Map.addLayer(imgL8, {bands: ['NDVI'], min: 0, max: 0.6, palette: ['white', 'green']}, 'L8 NDVI');
Map.addLayer(imgL8, {bands: ['SAVI'], min: 0, max: 0.6, palette: ['white', 'green']}, 'L8 SAVI');
Map.addLayer(imgL8, {bands: ['NDBI'], min: -0.3, max: 0.4, palette: ['white', 'red']}, 'L8 NDBI');
Map.addLayer(imgL8, {bands: ['NDMI'], min: -0.3, max: 0.4, palette: ['white', 'purple']}, 'L8 NDMI');
Map.addLayer(imgL8, {bands: ['BSI'], min: -0.3, max: 0.5, palette: ['white', 'orange']}, 'L8 BSI');
Map.addLayer(imgL8, {bands: ['UI'], min: -0.2, max: 0.5, palette: ['white', 'purple']}, 'L8 UI');

// Sentinel-2
Map.addLayer(imgS2, {bands: ['NDVI'], min: 0, max: 0.6, palette: ['white', 'green']}, 'S2 NDVI');
Map.addLayer(imgS2, {bands: ['SAVI'], min: 0, max: 0.6, palette: ['white', 'green']}, 'S2 SAVI');
Map.addLayer(imgS2, {bands: ['NDBI'], min: -0.3, max: 0.4, palette: ['white', 'red']}, 'S2 NDBI');
Map.addLayer(imgS2, {bands: ['NDMI'], min: -0.3, max: 0.4, palette: ['white', 'purple']}, 'S2 NDMI');
Map.addLayer(imgS2, {bands: ['BSI'], min: -0.3, max: 0.5, palette: ['white', 'orange']}, 'S2 BSI');
Map.addLayer(imgS2, {bands: ['UI'], min: -0.2, max: 0.5, palette: ['white', 'purple']}, 'S2 UI');

// ===========================
// EXPORT TO ASSETS
// ===========================

Export.image.toAsset({
    image: imgL5,
    description: 'L5_all_2004',
    assetId: 'projects/ee-mfnh21/assets/L5_normalized_2004_2025_10_03',
    region: cmp_2004.geometry(),
    scale: 30,
    crs: 'EPSG:32719',
    maxPixels: 1e13
});

Export.image.toAsset({
    image: imgL8,
    description: 'L8_all_2014',
    assetId: 'projects/ee-mfnh21/assets/L8_normalized_2014_2025_09_13',
    region: cmp_2014.geometry(),
    scale: 30,
    crs: 'EPSG:32719',
    maxPixels: 1e13
});

Export.image.toAsset({
    image: imgS2,
    description: 'S2_all_2024',
    assetId: 'projects/ee-mfnh21/assets/S2_normalized_2024_2025_09_13',
    region: cmp_2024.geometry(),
    scale: 30,
    crs: 'EPSG:32719',
    maxPixels: 1e13
});

// ===========================
// EXPORT TO DRIVE (SPECTRAL INDICES)
// ===========================

Export.image.toDrive({
    image: imgL5.select(['NDVI', 'SAVI', 'NDBI', 'NDMI', 'BSI', 'UI']),
    description: 'L5_indices_2004_2025_10_03',
    folder: 'lulc_cusco_indices',
    fileNamePrefix: 'L5_indices_2004_2025_10_03',
    region: cmp_2004.geometry(),
    scale: 30,
    crs: 'EPSG:32719',
    maxPixels: 1e13
});

Export.image.toDrive({
    image: imgL8.select(['NDVI', 'SAVI', 'NDBI', 'NDMI', 'BSI', 'UI']),
    description: 'L8_indices_2014',
    folder: 'lulc_cusco_indices',
    fileNamePrefix: 'L8_indices_2014',
    region: cmp_2014.geometry(),
    scale: 30,
    crs: 'EPSG:32719',
    maxPixels: 1e13
});

Export.image.toDrive({
    image: imgS2.select(['NDVI', 'SAVI', 'NDBI', 'NDMI', 'BSI', 'UI']),
    description: 'S2_indices_2024',
    folder: 'lulc_cusco_indices',
    fileNamePrefix: 'S2_indices_2024',
    region: cmp_2024.geometry(),
    scale: 30,
    crs: 'EPSG:32719',
    maxPixels: 1e13
});

// ===========================
// EXPORT TO DRIVE (DEM ELEVATION, SLOPE & ASPECT)
// ===========================

Export.image.toDrive({
    image: elevation,
    description: 'DEM_ALOS',
    folder: 'lulc_cusco_indices',
    fileNamePrefix: 'DEM_ALOS',
    region: cusco_prov,
    scale: 30,
    crs: 'EPSG:32719',
    maxPixels: 1e13
});

Export.image.toDrive({
    image: slope,
    description: 'Slope_ALOS',
    folder: 'lulc_cusco_indices',
    fileNamePrefix: 'Slope_ALOS',
    region: cusco_prov,
    scale: 30,
    crs: 'EPSG:32719',
    maxPixels: 1e13
});

var aspect = ee.Terrain.aspect(elevation).rename('aspect');

Map.addLayer(aspect.clip(cusco_prov),
    { min: 0, max: 360, palette: ['blue', 'cyan', 'green', 'yellow', 'orange', 'red', 'magenta'] },
    'Aspect (UTM 19S)'
);

Export.image.toDrive({
    image: aspect,
    description: 'Aspect_ALOS',
    folder: 'lulc_cusco_indices',
    fileNamePrefix: 'Aspect_ALOS',
    region: cusco_prov,
    scale: 30,
    crs: 'EPSG:32719',
    maxPixels: 1e13
});

Map.addLayer(
    elevation.clip(cusco_prov),
    { min: 2800, max: 5000, palette: ['blue', 'cyan', 'green', 'yellow', 'orange', 'brown', 'white'] },
    'Elevation (m)'
);

Map.addLayer(
    slope.clip(cusco_prov),
    { min: 0, max: 60, palette: ['white', 'yellow', 'orange', 'red', 'brown'] },
    'Slope (°)'
);


