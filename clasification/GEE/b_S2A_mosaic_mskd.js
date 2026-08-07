// ===========================
// INITIAL CONFIGURATION
// ===========================

// Sentinel-2 TOA Collection
var s2 = ee.ImageCollection("COPERNICUS/S2_HARMONIZED");

// AOI: Cusco Province
var cuscoAOI = cusco_prov_shapefile;

// Reference points (North and South)
var pointNorth = ee.Geometry.Point([-71.94200055634651, -13.530832993526106]);
var pointSouth = ee.Geometry.Point([-72.08361984430255, -13.642940174223979]);

// Target dates
var dates = [
    '2024-06-22',
    '2024-06-27',
    '2024-07-02',
    '2024-07-07',
    '2024-07-12',
    '2024-07-17',
    '2024-07-22',
    '2024-07-27',
    '2024-08-01',
    '2024-08-06',
    '2024-08-11',
    '2024-08-16',
    '2024-08-21',
    '2024-08-26',
    '2024-08-31',
    '2024-09-05',
    '2024-09-10',
    '2024-09-15',
    '2024-09-20'
];

// RGB visualization parameters
var visRGB = { bands: ['B4', 'B3', 'B2'], min: 0, max: 2500 };

// ===========================
// FUNCTIONS
// ===========================

// Get best image for a date and location
function getImage(date, point) {
    var range = [date, ee.Date(date).advance(1, 'day')];
    return s2.filterBounds(point)
        .filterDate(range[0], range[1])
        .sort('CLOUDY_PIXEL_PERCENTAGE')
        .first();
}

// Apply Cloud Score+ cloud masking
var csPlus = ee.ImageCollection('GOOGLE/CLOUD_SCORE_PLUS/V1/S2_HARMONIZED');
var csBands = csPlus.first().bandNames();

function addCsBands(image) {
    return image.linkCollection(csPlus, csBands);
}

function maskClouds(image) {
    var clearThresh = 0.5; // Clear pixel threshold
    var mask = image.select('cs').gte(clearThresh);
    return image.updateMask(mask);
}

// ===========================
// DATE PROCESSING
// ===========================

dates.forEach(function (date) {
    // Unmasked mosaic (North + South)
    var north = getImage(date, pointNorth);
    var south = getImage(date, pointSouth);
    var imgUnmasked = ee.ImageCollection([north, south])
        .mosaic()
        .clip(cuscoAOI)
        .set('system:time_start', ee.Date(date).millis());

    // Cloud masked mosaic
    var northMasked = maskClouds(addCsBands(north));
    var southMasked = maskClouds(addCsBands(south));
    var imgMasked = ee.ImageCollection([northMasked, southMasked])
        .mosaic()
        .clip(cuscoAOI)
        .set('system:time_start', ee.Date(date).millis());

    // ===========================
    // VISUALIZATION
    // ===========================
    Map.addLayer(imgUnmasked, visRGB, 'Unmasked ' + date, false);
    Map.addLayer(imgMasked, visRGB, 'Masked ' + date, false);

    // ===========================
    // EXPORTS
    // ===========================

    // Export unmasked
    Export.image.toDrive({
        image: imgUnmasked.select(['B4', 'B3', 'B2']),
        description: 'S2_Cusco_unmasked_' + date.replace(/-/g, ''),
        folder: 'S2_2014_mosaic_mksd',
        fileNamePrefix: 'S2_Cusco_unmasked_' + date.replace(/-/g, ''),
        region: cuscoAOI,
        scale: 30,
        crs: 'EPSG:32719',
        maxPixels: 1e13
    });

    // Export masked
    Export.image.toDrive({
        image: imgMasked.select(['B4', 'B3', 'B2']),
        description: 'S2_Cusco_masked_' + date.replace(/-/g, ''),
        folder: 'S2_2014_mosaic_mksd',
        fileNamePrefix: 'S2_Cusco_masked_' + date.replace(/-/g, ''),
        region: cuscoAOI,
        scale: 30,
        crs: 'EPSG:32719',
        maxPixels: 1e13
    });
});

// ===========================
// CENTER MAP
// ===========================
Map.centerObject(cuscoAOI, 9);

