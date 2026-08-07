// ================================================
// Landsat 8 - Collection 2, Tier 1, Level-2 (SR + ST)
// ================================================

// Collection: Landsat 8 - Surface Reflectance (SR) + Surface Temperature (ST)
var l8srCollection = ee.ImageCollection("LANDSAT/LC08/C02/T1_L2");

// Import geometry of Cusco Province
var cuscoProvince = cusco_prov_shapefile.geometry();

// =======================
// Natural RGB visualization parameters
// =======================
var visParamsRGB = {
    bands: ['SR_B4', 'SR_B3', 'SR_B2'],
    min: 8000,
    max: 13000
};

// =======================
// Helper function to add images to map
// =======================
function addImageToMap(imageFeature, customName) {
    var image = ee.Image(imageFeature.id);
    var date = image.get('DATE_ACQUIRED').getInfo();
    var layerName = customName + ' - ' + date;

    Map.addLayer(image.clip(cuscoProvince), visParamsRGB, layerName, false);
}

// =======================
// COLLECTION FILTERS
// =======================

// Dates: Austral Winter 2014
var startDate = '2014-06-20';
var endDate = '2014-09-24';

// 1. Date filter
var l8Filtered = l8srCollection.filter(ee.Filter.date(startDate, endDate));

// 2. Spatial filter (Cusco)
l8Filtered = l8Filtered.filter(ee.Filter.bounds(cuscoProvince));

// 3. Cloud cover filter
l8Filtered = l8Filtered.filter(ee.Filter.lt('CLOUD_COVER', 101));

print("Filtered Landsat 8 collection:", l8Filtered);

// Add all filtered images to the map
l8Filtered.evaluate(function (result) {
    result.features.forEach(function (feature, index) {
        var name = 'L8_SR_' + (index + 1);
        addImageToMap(feature, name);
    });
});

// =======================
// EXPORT TO GOOGLE DRIVE
// =======================

// Get current date in YYYYMMDD format
var today = ee.Date(Date.now()).format('yyyyMMdd').getInfo();

// Function to export images
function exportL8Image(imageFeature, index) {
    var image = ee.Image(imageFeature.id);
    var date = image.get('DATE_ACQUIRED').getInfo().replace(/-/g, '_');
    var cloud = image.get('CLOUD_COVER').getInfo();

    // Base name with index, date, cloud cover, and export date
    var exportNameBase = 'L8_SR_' + index + '_' + date + '_cc_' + Math.round(cloud) + '_exp_' + today;

    Export.image.toDrive({
        image: image.clip(cuscoProvince).select(['SR_B4', 'SR_B3', 'SR_B2']),
        description: exportNameBase + '_RGB',
        folder: 'L8_Images_Winter2014',
        fileNamePrefix: exportNameBase + '_RGB',
        region: cuscoProvince,
        scale: 30,
        crs: 'EPSG:32719',  // UTM zone 19S (Cusco)
        maxPixels: 1e13
    });
}

// Export all filtered images
l8Filtered.evaluate(function (result) {
    result.features.forEach(function (feature, index) {
        exportL8Image(feature, index + 1);
    });
});

// Center map on Cusco Province
Map.centerObject(cuscoProvince);

