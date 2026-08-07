// Natural RGB visualization parameters
var visRGBL8Preview = {
    bands: ['SR_B4', 'SR_B3', 'SR_B2'],
    min: 0.004,
    max: 0.2
};


var paletteColors = ['#1e88e5', '#cc6d8f', '#004d40', '#ffc107'];
Map.addLayer(previousClassification, {
    min: 0, max: 3, palette: paletteColors
}, 'Previous Classification 2014');

// Visualization of normalized image preview
Map.centerObject(normalizedImage, 11);
Map.addLayer(normalizedImage, visRGBL8Preview, "Normalized Preview 2014");

//---------------------------------------------
// 1. Data Import & Visualization
//---------------------------------------------

// Visualization parameters (Landsat 8 natural RGB)
var visRGBL8 = {
    bands: ['SR_B4', 'SR_B3', 'SR_B2'],
    min: 0.001,
    max: 0.2
};

// Display image on map
print("Normalized Image 2014:", normalizedImage);
Map.centerObject(normalizedImage, 12);
Map.addLayer(normalizedImage, visRGBL8, "Normalized Image 2014");


//---------------------------------------------
// 2. Ground Control Points (GCPs) & Sampling
//---------------------------------------------

// Merge training collections
var gcp = urbano.merge(vegetacion).merge(suelo);

// Generate random column to split training and validation
gcp = gcp.randomColumn();

Export.table.toDrive({
    collection: suelo,
    description: '2014_suelo_2025_10_20_18_11',
    fileFormat: 'KML'
});

Export.table.toDrive({
    collection: urbano,
    description: '2024_urbano_2025_10_20_18_11',
    fileFormat: 'KML'
});

Export.table.toDrive({
    collection: vegetacion,
    description: '2024_vegetacion_2025_10_20_18_11',
    fileFormat: 'KML'
});

// Split GCPs into training and validation sets
var trainingGcp = gcp.filter(ee.Filter.lt('random', 0.7));
var validationGcp = gcp.filter(ee.Filter.gte('random', 0.7));

// Sample normalized image with GCPs
var training = normalizedImage.sampleRegions({
    collection: trainingGcp,
    properties: ['cobertura'],
    scale: 30,
    tileScale: 16
});

var test = normalizedImage.sampleRegions({
    collection: validationGcp,
    properties: ['cobertura'],
    scale: 30,
    tileScale: 16
});

print("Training Samples:", training);


//---------------------------------------------
// 3. Hyperparameter Tuning (Random Forest)
//---------------------------------------------

var numTreesList = ee.List.sequence(10, 150, 10);
var bagFractionList = ee.List.sequence(0.1, 0.9, 0.1);

// Evaluate accuracy across grid search parameter combinations
var accuracies = numTreesList.map(function (numTrees) {
    return bagFractionList.map(function (bagFraction) {

        var classifier = ee.Classifier.smileRandomForest({
            numberOfTrees: numTrees,
            bagFraction: bagFraction
        }).train({
            features: training,
            classProperty: 'cobertura',
            inputProperties: normalizedImage.bandNames()
        });

        var accuracy = test
            .classify(classifier)
            .errorMatrix('cobertura', 'classification')
            .accuracy();

        return ee.Feature(null, {
            accuracy: accuracy,
            numberOfTrees: numTrees,
            bagFraction: bagFraction
        });
    });
}).flatten();

var resultFc = ee.FeatureCollection(accuracies);

// Export hyperparameter tuning table as CSV
Export.table.toDrive({
    collection: resultFc,
    description: 'hyperparameter_table_2014',
    folder: 'clasificacion_final',
    fileNamePrefix: 'hyperparameter_table_2014',
    fileFormat: 'CSV'
});

// Select best parameters
var resultFcSorted = resultFc.sort('accuracy', false);
var bestParams = resultFcSorted.first();

var bestAccuracy = bestParams.getNumber('accuracy');
var bestNumTrees = bestParams.getNumber('numberOfTrees');
var bestBagFraction = bestParams.getNumber('bagFraction');

print("===== BEST MODEL FOUND =====");
print("Best overall accuracy:", bestAccuracy);
print("Optimal number of trees:", bestNumTrees);
print("Optimal bag fraction:", bestBagFraction);


//---------------------------------------------
// 4. Optimal Classification
//---------------------------------------------

// Train optimal model
var optimalModel = ee.Classifier.smileRandomForest({
    numberOfTrees: bestNumTrees,
    bagFraction: bestBagFraction
}).train({
    features: training,
    classProperty: 'cobertura',
    inputProperties: normalizedImage.bandNames()
});

// Classify image with optimal model
var classifiedOptimal = normalizedImage.classify(optimalModel);
print("Optimal Classification 2014:", classifiedOptimal);

// Color palette: 0=water, 1=vegetation, 2=bare soil, 3=urban (kept 0=water to prevent GIS NoData/transparency conflicts)
var palette = ['#1e88e5', '#cc6d8f', '#004d40', '#ffc107'];

// Add classification layer to map
Map.addLayer(classifiedOptimal, {
    min: 0,
    max: 3,
    palette: palette
}, 'Optimal RF Classification 2014');


//---------------------------------------------
// 5. Detailed Model Validation
//---------------------------------------------

// Validate with test set
var validated = test.classify(optimalModel);
var confMatrix = validated.errorMatrix('cobertura', 'classification');

print("--- DETAILED VALIDATION OF OPTIMAL MODEL ---");
print("Confusion Matrix:", confMatrix);
print("Overall Accuracy:", confMatrix.accuracy());
print("Kappa Coefficient:", confMatrix.kappa());
print("Producer's Accuracy (Recall):", confMatrix.producersAccuracy());
print("Consumer's Accuracy (Precision):", confMatrix.consumersAccuracy());


//---------------------------------------------
// 6. Variable Importance Analysis
//---------------------------------------------

// Calculate variable importance
var importance = ee.Dictionary(optimalModel.explain().get('importance'));
var sumImportance = importance.values().reduce(ee.Reducer.sum());

// Calculate relative importance (%)
var relativeImportance = importance.map(function (key, val) {
    return ee.Number(val).multiply(100).divide(sumImportance);
});

print("--- VARIABLE IMPORTANCE ANALYSIS ---");
print("Relative variable importance (%):", relativeImportance);

// Create variable importance chart
var importanceFc = ee.FeatureCollection([
    ee.Feature(null, relativeImportance)
]);

var importanceChart = ui.Chart.feature.byProperty({
    features: importanceFc
}).setOptions({
    title: "Variable Importance (Optimal Model 2014)",
    vAxis: { title: "Importance (%)" },
    hAxis: { title: "Bands" }
});

print(importanceChart);


//---------------------------------------------
// 7. Exports
//---------------------------------------------

// Export classification to GEE Asset
Export.image.toAsset({
    image: classifiedOptimal,
    description: 'optimal_classification_2014_asset',
    assetId: 'projects/ee-mfnh21/assets/optimal_classification_2014_2025_09_13',
    region: normalizedImage.geometry(),
    scale: 30,
    crs: 'EPSG:32719',
    pyramidingPolicy: { classification: 'mode' }
});

// Export classification GeoTIFF to Google Drive
Export.image.toDrive({
    image: classifiedOptimal,
    description: 'optimal_classification_2014_drive',
    folder: 'clasificacion_final',
    fileNamePrefix: 'optimal_classification_2014_2025_09_13',
    region: normalizedImage.geometry(),
    scale: 30,
    crs: 'EPSG:32719',
    maxPixels: 1e13
});
