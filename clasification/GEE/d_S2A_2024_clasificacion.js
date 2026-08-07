//---------------------------------------------
// 1. Data Import & Visualization
//---------------------------------------------

// Natural RGB visualization parameters
var visRGBS2 = {
    bands: ['B4', 'B3', 'B2'], // Sentinel-2 RGB
    min: 330,
    max: 2100
};

// Display normalized image
print("Normalized Image 2024:", normalizedImage);
Map.centerObject(normalizedImage, 12);
Map.addLayer(normalizedImage, visRGBS2, "Normalized Image 2024");


//---------------------------------------------
// 2. Ground Control Points (GCPs) & Sampling
//---------------------------------------------

// Merge training collections
var gcp = urbano.merge(vegetacion).merge(suelo);

Export.table.toDrive({
    collection: suelo,
    description: '2024_suelo',
    fileFormat: 'KML'
});

Export.table.toDrive({
    collection: urbano,
    description: '2024_urbano',
    fileFormat: 'KML'
});

Export.table.toDrive({
    collection: vegetacion,
    description: '2024_vegetacion',
    fileFormat: 'KML'
});

// Generate random column to split training and validation
gcp = gcp.randomColumn();

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
    description: 'hyperparameter_table_2024',
    folder: 'clasificacion_final',
    fileNamePrefix: 'hyperparameter_table_2024',
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

// Train model with optimal parameters
var optimalModel = ee.Classifier.smileRandomForest({
    numberOfTrees: bestNumTrees,
    bagFraction: bestBagFraction
}).train({
    features: training,
    classProperty: 'cobertura',
    inputProperties: normalizedImage.bandNames()
});

// Classify image
var classifiedOptimal = normalizedImage.classify(optimalModel);
print("Optimal Classification 2024:", classifiedOptimal);

// Color palette: 0=water, 1=vegetation, 2=bare soil, 3=urban (kept 0=water to prevent GIS NoData/transparency conflicts)
var palette = ['#1e88e5', '#cc6d8f', '#004d40', '#ffc107'];

// Add classified layer to map
Map.addLayer(classifiedOptimal, {
    min: 0,
    max: 3,
    palette: palette
}, "Optimal RF Classification 2024");


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
    title: "Variable Importance (Optimal Model 2024)",
    vAxis: { title: "Importance (%)" },
    hAxis: { title: "Bands" }
});

print(importanceChart);


//---------------------------------------------
// 7. Final Exports
//---------------------------------------------

// Export classification to GEE Asset
Export.image.toAsset({
    image: classifiedOptimal,
    description: 'optimal_classification_2024_asset',
    assetId: 'projects/ee-mfnh21/assets/optimal_classification_2024_2025_09_13',
    region: classifiedOptimal.geometry(),
    scale: 30,
    crs: 'EPSG:32719',
    pyramidingPolicy: { classification: 'mode' }
});

// Export classification GeoTIFF to Google Drive
Export.image.toDrive({
    image: classifiedOptimal,
    description: 'optimal_classification_2024_drive',
    folder: 'clasificacion_final',
    fileNamePrefix: 'optimal_classification_2024_2025_09_13',
    region: classifiedOptimal.geometry(),
    scale: 30,
    crs: 'EPSG:32719',
    maxPixels: 1e13
});



