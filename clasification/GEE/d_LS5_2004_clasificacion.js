//---------------------------------------------
// 1. Data Import & Visualization
//---------------------------------------------

// Visualization parameters (Landsat 5 natural RGB)
var visRGBL5 = {
    bands: ['SR_B3', 'SR_B2', 'SR_B1'],
    min: 0.004,
    max: 0.15
};

print("Normalized Image 2004:", normalizedImage);

// Display normalized composite image
Map.centerObject(normalizedImage, 12);
Map.addLayer(normalizedImage, visRGBL5, "Normalized Image 2004");


//---------------------------------------------
// 2. Ground Control Points (GCPs) & Sampling
//---------------------------------------------

// Merge training collections
var gcp = urbano.merge(vegetacion).merge(suelo);

Export.table.toDrive({
    collection: suelo,
    description: 'suelo_2004_gee_500',
    fileFormat: 'KML'
});

Export.table.toDrive({
    collection: urbano,
    description: 'urbano_2004_gee_500',
    fileFormat: 'KML'
});

Export.table.toDrive({
    collection: vegetacion,
    description: 'vegetacion_2004_500',
    fileFormat: 'KML'
});

// Generate random column to split training and validation
gcp = gcp.randomColumn();

var trainingGcp = gcp.filter(ee.Filter.lt('random', 0.7));
var validationGcp = gcp.filter(ee.Filter.gte('random', 0.7));

// Sample image regions for training and testing
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
            'accuracy': accuracy,
            'numberOfTrees': numTrees,
            'bagFraction': bagFraction
        });
    });
}).flatten();

var resultFc = ee.FeatureCollection(accuracies);

// Export hyperparameter table to Drive as CSV
Export.table.toDrive({
    collection: resultFc,
    description: 'tabla_hyper_2004',
    folder: 'clasificacion_final',
    fileNamePrefix: 'tabla_hyper_2004',
    fileFormat: 'CSV'
});

// Select optimal parameters
var resultFcSorted = resultFc.sort('accuracy', false);
var highestAccuracyFeature = resultFcSorted.first();

var highestAccuracy = highestAccuracyFeature.getNumber('accuracy');
var optimalNumTrees = highestAccuracyFeature.getNumber('numberOfTrees');
var optimalBagFraction = highestAccuracyFeature.getNumber('bagFraction');

print("===== BEST MODEL FOUND =====");
print("Best overall accuracy:", highestAccuracy);
print("Optimal number of trees:", optimalNumTrees);
print("Optimal bag fraction:", optimalBagFraction);


//---------------------------------------------
// 4. Optimal Classification
//---------------------------------------------

// Train optimal model
var optimalModel = ee.Classifier.smileRandomForest({
    numberOfTrees: optimalNumTrees,
    bagFraction: optimalBagFraction
}).train({
    features: training,
    classProperty: 'cobertura',
    inputProperties: normalizedImage.bandNames()
});

// Perform classification
var classifiedOptimal = normalizedImage.classify(optimalModel);
print("Optimal Classification 2004:", classifiedOptimal);

// Color palette: 0=water, 1=vegetation, 2=bare soil, 3=urban (kept 0=water to prevent GIS NoData/transparency conflicts)
var paletteColors = ['#1e88e5', '#cc6d8f', '#004d40', '#ffc107'];

// Add classified layer to map
Map.addLayer(classifiedOptimal, {
    min: 0,
    max: 3,
    palette: paletteColors
}, 'Optimal RF Classification 2004');


//---------------------------------------------
// 5. Detailed Model Validation
//---------------------------------------------

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

var importanceOptimal = ee.Dictionary(optimalModel.explain().get('importance'));
var sum = importanceOptimal.values().reduce(ee.Reducer.sum());

// Compute relative importance (%)
var relativeImportanceOptimal = importanceOptimal.map(function (key, val) {
    return ee.Number(val).multiply(100).divide(sum);
});

print("--- VARIABLE IMPORTANCE ANALYSIS ---");
print("Relative variable importance (%):", relativeImportanceOptimal);

// Create variable importance chart
var importanceOptimalFc = ee.FeatureCollection([
    ee.Feature(null, relativeImportanceOptimal)
]);

var chartOptimal = ui.Chart.feature.byProperty({
    features: importanceOptimalFc
}).setOptions({
    title: 'Variable Importance (Optimal Model 2004)',
    vAxis: { title: 'Importance (%)' },
    hAxis: { title: 'Bands' }
});

print(chartOptimal);


//---------------------------------------------
// 7. Exports
//---------------------------------------------

// Export optimal classification to GEE Asset
Export.image.toAsset({
    image: classifiedOptimal,
    description: 'clasif_optima_2004_asset',
    assetId: 'projects/ee-mfnh21/assets/clasif_optima_2004_2025_09_13',
    region: normalizedImage.geometry(),
    scale: 30,
    crs: 'EPSG:32719',
    pyramidingPolicy: { classification: 'mode' }
});

// Export optimal classification GeoTIFF to Google Drive
Export.image.toDrive({
    image: classifiedOptimal,
    description: 'clasif_optima_2004_drive',
    folder: 'clasificacion_final',
    fileNamePrefix: 'clasif_optima_2004_2025_09_13',
    region: normalizedImage.geometry(),
    scale: 30,
    crs: 'EPSG:32719',
    maxPixels: 1e13
});