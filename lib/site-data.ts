/**
 * Static site content: dataset summary, schema and model metrics.
 * Values come from the analysis notebook and the tuned LightGBM model.
 */

export const datasetSummary = [
  { label: 'Listings', value: '711,486', hint: 'Rows after cleaning' },
  { label: 'Median price', value: '$27,886', hint: 'Across all listings' },
  { label: 'Makes covered', value: '30', hint: 'Distinct manufacturers' },
  { label: 'Year range', value: '1953–2023', hint: 'Oldest to newest model year' },
]

export const featureSchema = [
  { name: 'manufacturer', type: 'categorical', description: 'Manufacturer (brand)' },
  { name: 'model', type: 'categorical', description: 'Model name and trim' },
  { name: 'year', type: 'numeric', description: 'Model year' },
  { name: 'mileage', type: 'numeric', description: 'Odometer reading in miles' },
  { name: 'engine', type: 'categorical', description: 'Engine description (displacement, cylinders, induction)' },
  { name: 'transmission', type: 'categorical', description: 'Gearbox (manual, automatic, CVT)' },
  { name: 'drivetrain', type: 'categorical', description: 'Drive layout (FWD, RWD, AWD, 4WD)' },
  { name: 'fuel_type', type: 'categorical', description: 'Fuel used (gasoline, diesel, hybrid, electric…)' },
  { name: 'exterior_color', type: 'categorical', description: 'Exterior paint colour' },
  { name: 'interior_color', type: 'categorical', description: 'Interior upholstery colour' },
  { name: 'accidents_or_damage', type: 'boolean', description: 'Whether the vehicle has accidents or damage on record' },
  { name: 'one_owner', type: 'boolean', description: 'Whether the vehicle has had exactly one owner' },
  { name: 'personal_use_only', type: 'boolean', description: 'Whether the vehicle was used only personally' },
  { name: 'seller_name', type: 'categorical', description: 'Dealer or seller that listed the car' },
  { name: 'seller_rating', type: 'numeric', description: "Seller's average rating out of 5" },
  { name: 'driver_rating', type: 'numeric', description: "Driver's average rating out of 5" },
  { name: 'driver_reviews_num', type: 'numeric', description: 'Number of driver reviews on the listing' },
  { name: 'mpg_city', type: 'numeric', description: 'City fuel economy (MPG)' },
  { name: 'mpg_highway', type: 'numeric', description: 'Highway fuel economy (MPG)' },
  { name: 'price_drop', type: 'numeric', description: 'Price reduction from the original listing price' },
  { name: 'price', type: 'target', description: 'Sale price — prediction target' },
]

export const modelMetrics = [
  { label: 'R²', value: '0.9385', hint: 'Variance explained on the held-out test split' },
  { label: 'MAE', value: '$2,260', hint: 'Mean absolute error — $2,259.76' },
  { label: 'RMSE', value: '$5,639', hint: 'Root mean squared error — $5,639.33' },
  { label: 'MAPE', value: '8.3%', hint: 'Mean absolute percentage error — 8.28%' },
]

/** Split-gain importance from the tuned LightGBM, normalised to sum to 1. */
export const featureImportance = [
  { feature: 'base_model', weight: 0.278 },
  { feature: 'model', weight: 0.205 },
  { feature: 'mileage', weight: 0.172 },
  { feature: 'car_age', weight: 0.118 },
  { feature: 'mpg_highway', weight: 0.084 },
  { feature: 'mpg_city', weight: 0.067 },
  { feature: 'transmission', weight: 0.025 },
  { feature: 'manufacturer', weight: 0.024 },
  { feature: 'drivetrain', weight: 0.013 },
  { feature: 'one_owner', weight: 0.007 },
  { feature: 'fuel_type', weight: 0.004 },
  { feature: 'accidents_or_damage', weight: 0.002 },
]