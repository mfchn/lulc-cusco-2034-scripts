// ================================================
// Sentinel-2 SR (BOA) - Cusco Province
// ================================================

// Area of interest: North and South reference points, and Cusco Province
var pointNorth = ee.Geometry.Point([-71.94200055634651, -13.530832993526106]);
var pointSouth = ee.Geometry.Point([-72.08361984430255, -13.642940174223979]);

var cuscoProvince = cusco_prov_shapefile.geometry();

// =======================
// Natural RGB visualization parameters
// =======================
var visParamsRGB = {
    bands: ['B4', 'B3', 'B2'],
    min: 0,
    max: 2500
};

// =======================
// Sentinel-2 SR Collection (Harmonized)
// =======================
var s2sr = ee.ImageCollection("COPERNICUS/S2_SR_HARMONIZED");

// =======================
// Helper function to add images to map
// =======================
function addImageToMap(imageFeature, customName) {
    var image = ee.Image(imageFeature.id);
    var date = ee.Date(image.get('system:time_start')).format('YYYY-MM-dd').getInfo();
    var layerName = customName + '_' + date;

    print("Image added:", layerName);
    Map.addLayer(image, visParamsRGB, layerName, true);
}

// =======================
// NORTH FILTER (Point 1)
// =======================
var s2North = s2sr
    .filterDate('2024-06-20', '2024-06-24')
    .filterBounds(pointNorth)
    .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 101));

print("Filtered images (North):", s2North);

// Map visualization (North)
s2North.evaluate(function (result) {
    result.features.forEach(function (feature, index) {
        var name = 'S2_SR_North_' + (index + 1);
        addImageToMap(feature, name);
    });
    Map.addLayer(cuscoProvince);
});

// Export (North)
function exportS2North(imageFeature, index) {
    var image = ee.Image(imageFeature.id);
    var date = ee.Date(image.get('system:time_start')).format('YYYY-MM-dd').getInfo();
    var exportNameBase = 'S2_BOA_North_' + index + '_' + date;

    Export.image.toDrive({
        image: image.select(['B4', 'B3', 'B2']),
        description: exportNameBase + '_natural',
        folder: 'GEE_S2_Export_BOA',
        fileNamePrefix: exportNameBase + '_exp',
        region: cuscoProvince,
        scale: 10,
        crs: 'EPSG:32719',
        maxPixels: 1e13
    });
}

s2North.evaluate(function (result) {
    result.features.forEach(function (feature, index) {
        exportS2North(feature, index + 1);
    });
});

// =======================
// SOUTH FILTER (Point 2)
// =======================
var s2South = s2sr
    .filterDate('2024-06-20', '2024-06-24')
    .filterBounds(pointSouth)
    .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 101));

print("Filtered images (South):", s2South);

// Map visualization (South)
s2South.evaluate(function (result) {
    result.features.forEach(function (feature, index) {
        var name = 'S2_SR_South_' + (index + 1);
        addImageToMap(feature, name);
    });
});

// Export (South)
function exportS2South(imageFeature, index) {
    var image = ee.Image(imageFeature.id);
    var date = ee.Date(image.get('system:time_start')).format('YYYY-MM-dd').getInfo();
    var exportNameBase = 'S2_BOA_South_' + index + '_' + date;

    Export.image.toDrive({
        image: image.select(['B4', 'B3', 'B2']),
        description: exportNameBase + '_natural',
        folder: 'GEE_S2_Export_BOA',
        fileNamePrefix: exportNameBase + '_exp',
        region: cuscoProvince,
        scale: 10,
        crs: 'EPSG:32719',
        maxPixels: 1e13
    });
}

s2South.evaluate(function (result) {
    result.features.forEach(function (feature, index) {
        exportS2South(feature, index + 1);
    });
});

// Center map on Cusco Province
Map.centerObject(cuscoProvince);
