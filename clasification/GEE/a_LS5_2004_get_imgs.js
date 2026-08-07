// =======================
// Landsat 5 - TM Sensor
// =======================

// Collection: Landsat 5, Collection 2, Tier 1, L2 (Surface Reflectance)
var l5srCollection = ee.ImageCollection("LANDSAT/LT05/C02/T1_L2");

// Import geometry of Cusco Province
var cuscoProvince = cusco_prov_shapefile.geometry();

// Define date range -> Austral Winter 2004
var startDate = '2004-06-20';
var endDate = '2004-09-24';

// =======================
// COLLECTION FILTERS
// =======================

// 1. Date filter
var l5Filtered = l5srCollection.filter(ee.Filter.date(startDate, endDate));

// 2. Spatial filter (Cusco)
l5Filtered = l5Filtered.filter(ee.Filter.bounds(cuscoProvince));

// 3. Cloud cover filter
l5Filtered = l5Filtered.filter(ee.Filter.lt('CLOUD_COVER', 101));

print("Filtered Landsat 5 collection:", l5Filtered);

// =======================
// Visualization parameters (Natural RGB)
// =======================
var visParamsRGB = {
    bands: ['SR_B3', 'SR_B2', 'SR_B1'],
    min: 8000,
    max: 12000
};

// =======================
// Helper function to add images to map
// =======================
function addImageToMap(imageFeature, customName) {
    var image = ee.Image(imageFeature.id);
    var date = image.get('DATE_ACQUIRED').getInfo();
    var cloud = image.get('CLOUD_COVER').getInfo();
    var layerName = customName + ' - ' + date + ' - ' + cloud + ' % clouds';

    print("Layer added:", layerName);
    Map.addLayer(image.clip(cuscoProvince), visParamsRGB, layerName, false);
}

// Display all filtered images on the map
l5Filtered.evaluate(function (result) {
    result.features.forEach(function (feature, index) {
        var name = 'L5_SR_' + (index + 1);
        addImageToMap(feature, name);
    });
});

// =======================
// Export to Google Drive
// =======================

// Get current date in YYYYMMDD format
var today = ee.Date(Date.now()).format('yyyyMMdd').getInfo();

// Export function
function exportL5Image(image, index) {
    var id = image.id().getInfo();
    var date = image.get('DATE_ACQUIRED').getInfo().replace(/-/g, '_');
    var cloud = image.get('CLOUD_COVER').getInfo();

    // Base name with index, acquisition date, cloud cover, and export date
    var exportNameBase = 'L5_SR_' + index + '_' + date + '_cc_' + Math.round(cloud) + '_exp_' + today;

    Export.image.toDrive({
        image: image.clip(cuscoProvince).select(['SR_B3', 'SR_B2', 'SR_B1']),
        description: exportNameBase + '_RGB',
        folder: 'L5_Images_Winter2004',
        fileNamePrefix: exportNameBase + '_RGB',
        region: cuscoProvince,
        scale: 30,
        crs: 'EPSG:32719',  // UTM zone 19S (Peru)
        maxPixels: 1e13
    });
}

// Export all filtered images
l5Filtered.evaluate(function (result) {
    result.features.forEach(function (feature, index) {
        var image = ee.Image(feature.id);
        exportL5Image(image, index + 1);
    });
});

