// ===========================
// INITIAL CONFIGURATION
// ===========================

// Sentinel-2 Harmonized Collection (TOA)
var s2 = ee.ImageCollection("COPERNICUS/S2_HARMONIZED");

// Area of Interest: Cusco Province
var cuscoAOI = cusco_prov_shapefile;

// Sampling Points (North and South Cusco)
var pointNorth = ee.Geometry.Point([-71.94200055634651, -13.530832993526106]);
var pointSouth = ee.Geometry.Point([-72.08361984430255, -13.642940174223979]);

// Visualization Parameters (Natural RGB)
var visRGB = {
    bands: ['B4', 'B3', 'B2'],
    min: 0,
    max: 2500
};

// ===========================
// FUNCTIONS
// ===========================

// Fetch image for a date and location
function getImage(date, point) {
    var range = [date, ee.Date(date).advance(1, 'day')];
    return s2
        .filterBounds(point)
        .filterDate(range[0], range[1])
        .sort('CLOUDY_PIXEL_PERCENTAGE')
        .first();
}

// ===========================
// LOAD IMAGES
// ===========================

// Austral Winter Dates 2024
var dates = [
    '2024-06-22', '2024-06-27', '2024-07-02', '2024-07-07', '2024-07-12',
    '2024-07-17', '2024-07-22', '2024-07-27', '2024-08-01', '2024-08-06',
    '2024-08-11', '2024-08-16', '2024-08-21', '2024-08-26', '2024-08-31',
    '2024-09-05', '2024-09-10', '2024-09-15', '2024-09-20'
];

// Fetch North and South images
var images = dates.map(function (date) {
    return getImage(date, pointNorth);
}).concat(dates.map(function (date) {
    return getImage(date, pointSouth);
}));

// Convert to ImageCollection
var s2Collection = ee.ImageCollection.fromImages(images);

// ===========================
// CLOUD MASKING (Cloud Score+)
// ===========================

// Cloud Score+ Collection
var csPlus = ee.ImageCollection('GOOGLE/CLOUD_SCORE_PLUS/V1/S2_HARMONIZED');
var csPlusBands = csPlus.first().bandNames();

// Link CS+ bands to Sentinel-2 images
var s2WithCs = s2Collection.linkCollection(csPlus, csPlusBands);

// Cloud masking function (threshold 0.5 = clear pixels)
function maskLowQuality(image) {
    var qaBand = 'cs';
    var clearThreshold = 0.5;
    var mask = image.select(qaBand).gte(clearThreshold);
    return image.updateMask(mask);
}

// Apply masking
var s2Masked = s2WithCs.map(maskLowQuality);

// ===========================
// MEDIAN COMPOSITE
// ===========================

var usefulBands = ['B2', 'B3', 'B4', 'B5', 'B6', 'B7', 'B8', 'B8A', 'B11', 'B12'];
var composite = s2Masked.median().select(usefulBands);
print("Median Composite", composite);

// ===========================
// VISUALIZATION
// ===========================

Map.addLayer(cuscoAOI, {}, "Cusco AOI");
Map.addLayer(composite.clip(cuscoAOI), visRGB, "RGB Median Composite", true);
Map.centerObject(cuscoAOI, 12);

// ===========================
// EXPORTS
// ===========================

// Export composite to Asset
Export.image.toAsset({
    image: composite.clip(cuscoAOI).select(usefulBands),
    description: 'S2_composite_2024_asset',
    assetId: 'projects/ee-mfnh21/assets/S2_composite_2024',
    region: cuscoAOI,
    scale: 10,
    crs: 'EPSG:32719',
    maxPixels: 1e13
});

// Export composite to Drive (Natural RGB)
Export.image.toDrive({
    image: composite.clip(cuscoAOI).select(['B4', 'B3', 'B2']),
    description: 'S2_composite_2024_RGB',
    folder: 'compuestas_medianas',
    fileNamePrefix: 'S2_composite_2024_RGB',
    region: cuscoAOI,
    scale: 10,
    crs: 'EPSG:32719',
    maxPixels: 1e13
});

// Export to Drive (Bands)
Export.image.toDrive({
    image: composite.clip(cuscoAOI).select(usefulBands),
    description: 'S2_composite_2024_bands',
    folder: 'compuestas_medianas',
    fileNamePrefix: 'S2_composite_2024_bands',
    region: cuscoAOI,
    scale: 30,
    crs: 'EPSG:32719',
    maxPixels: 1e13
});

