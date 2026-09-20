"""One-time exporter: LightGBM pickle + cleaned parquet -> web assets.

Outputs
  model-assets/lgbm.bin.gz   compact per-tree node arrays (see format below)
  model-assets/meta.json     feature maps, statistics, ablation baseline
  model-assets/verify.json   a few concrete rows + expected prices (dev check)
  public/data/predict-meta.json  UI option lists (no model weights)

Binary layout (little-endian), a single concatenation over trees in order:
  u32  magic  ('LGBM')
  u32  version (1)
  u32  nTrees
  u32  totalNodes
  u32  catCodeCount
  i32[nTrees]       nodeCounts
  i32[catCodeCount] catCodes
  u8[totalNodes]         flags   (0 leaf, 1 numeric split, 2 categorical split)
  i16[totalNodes]        features (split feature index; 0 for leaves)
  f64[totalNodes]        values  (leaf value, or numeric threshold; f64 for
                                  LightGBM's +/-1e300 sentinel thresholds)
  u8[totalNodes]         defaultLefts (missing/unknown value goes LEFT)
  i32[totalNodes]        catStarts (index into catCodes; -1 unless cat split)
  i32[totalNodes]        catLens
  i32[totalNodes]        rightStarts (absolute node index where the right
                                      subtree begins in the concatenation)

Nodes are preordered within each tree. A prediction starts at each tree's
first node (index k where sum(nodeCounts[0..t-1]) = k) and follows pointers.
"""

import gzip
import importlib.util
import io
import json
import os
import struct
import sys

import pandas as pd

# Paths are resolved relative to this file so the repo is relocatable:
#   <container>/used-cars/   source project (pickle + cleaned parquet)
#   <container>/website/     this site (outputs land under model-assets/ and public/)
SCRIPTS = os.path.dirname(os.path.abspath(__file__))
WEBSITE = os.path.dirname(SCRIPTS)
CONTAINER = os.path.dirname(WEBSITE)
MODEL_PATH = os.path.join(CONTAINER, "used-cars", "models", "lgbm_final_model.pkl")
PARQUET_PATH = os.path.join(CONTAINER, "used-cars", "data", "cars_cleaned.parquet")
OUT_DIR = os.path.join(WEBSITE, "model-assets")
PUBLIC_META = os.path.join(WEBSITE, "public", "data", "predict-meta.json")

FEATURES = [
    "manufacturer", "base_model", "model", "mileage", "transmission",
    "drivetrain", "fuel_type", "mpg_city", "mpg_highway",
    "accidents_or_damage", "one_owner", "car_age",
]
CAT_FEATURE_INDEX = [0, 1, 2, 4, 5, 6]  # 6 categoricals, sorted ascending

assert importlib.util.find_spec("lightgbm") is not None, "lightgbm missing in venv"
import joblib

# ---------------------------------------------------------------------------
# 1. Load model + parsed dump
# ---------------------------------------------------------------------------
print("loading model ...")
loaded = joblib.load(MODEL_PATH)
model = loaded.booster_
print("loading parquet ...")
df = pd.read_parquet(PARQUET_PATH)

d = model.dump_model()
trees = d["tree_info"]
n_trees = len(trees)
obj = d.get("objective")
assert obj == "regression", obj
feature_importances = d.get("feature_importances")
assert d["feature_names"] == FEATURES, (d["feature_names"], FEATURES)

pandas_cat = d["pandas_categorical"]
assert [len(pc) for pc in pandas_cat] == [30, 678, 10698, 994, 4, 8]
cat_names = {FEATURES[i]: pandas_cat[j] for j, i in enumerate(CAT_FEATURE_INDEX)}
code_maps = {}
for feat, names in cat_names.items():
    code_maps[feat] = {name: code for code, name in enumerate(names)}

# ---------------------------------------------------------------------------
# 2. Serialize trees
# ---------------------------------------------------------------------------
print("serializing trees ...")
node_counts = []
cat_codes = []
flags = bytearray()
features = []
values = []
cat_starts = []
cat_lens = []
right_starts = []
default_lefts = bytearray()
tree_start = 0

for idx, tree in enumerate(trees):
    root = tree["tree_structure"]

    # size of subtree in nodes, computed bottom-up
    size = {}

    def subtree_size(node):
        if "leaf_index" in node:
            size[id(node)] = 1
        else:
            size[id(node)] = 1 + subtree_size(node["left_child"]) + subtree_size(node["right_child"])
        return size[id(node)]

    subtree_size(root)

    # preorder placement; every node gets a slot index
    node_slots = {}
    counter = [0]

    def place(node, parent_is_right_of=None):
        s = counter[0]
        node_slots[id(node)] = s
        counter[0] += 1
        if "leaf_index" not in node:
            place(node["left_child"])
            s_right = counter[0]
            place(node["right_child"])
            if parent_is_right_of is not None:
                raise AssertionError
        return s

    place(root)
    node_count = counter[0]
    assert node_count == size[id(root)]
    node_counts.append(node_count)

    for name, node in [("root", root)]:
        pass

    # emit nodes in preorder (walk again, record metadata)
    def emit(node):
        if "leaf_index" in node:
            flags.append(0)
            features.append(0)
            values.append(float(node["leaf_value"]))
            cat_starts.append(-1)
            cat_lens.append(0)
            right_starts.append(-1)
            default_lefts.append(0)
            return

        feat = int(node["split_feature"])
        decision = node["decision_type"]
        node_slot = node_slots[id(node)]
        default_lefts.append(1 if node.get("default_left", False) else 0)

        if decision == "<=":
            flags.append(1)
            features.append(feat)
            values.append(float(node["threshold"]))
            cat_starts.append(-1)
            cat_lens.append(0)
        elif decision == "==":
            codes = [int(x) for x in str(node["threshold"]).split("||") if x != ""]
            flags.append(2)
            features.append(feat)
            values.append(0.0)
            cat_starts.append(len(cat_codes))
            cat_codes.extend(codes)
            cat_lens.append(len(codes))
        else:
            raise AssertionError(decision)

        # right subtree start = this slot + 1 + size(left subtree), absolute
        left_slot = node_slots[id(node["left_child"])]
        left_size = size[id(node["left_child"])]
        right_starts.append(tree_start + node_slot + 1 + left_size)

        emit(node["left_child"])
        emit(node["right_child"])

    emit(root)
    tree_start += node_count

assert len(flags) == sum(node_counts)
total_nodes = sum(node_counts)
assert len(features) == len(values) == len(cat_starts) == len(cat_lens)
assert len(features) == len(right_starts) == total_nodes
assert len(features) == len(flags) == len(default_lefts)

print(f"   {n_trees} trees, {total_nodes} nodes, {len(cat_codes)} cat codes")

# ---------------------------------------------------------------------------
# 3. Feature statistics + ablation baseline
# ---------------------------------------------------------------------------
print("statistics ...")
max_year = int(df["year"].max())
min_year = int(df["year"].min())
mpg_city_med = float(df["mpg_city"].median())
mpg_hwy_med = float(df["mpg_highway"].median())

mpg_by_model = {}
mpg_src = df.dropna(subset=["mpg_city", "mpg_highway"])
for g, sub in mpg_src.groupby("model"):
    mpg_by_model[g] = [float(sub["mpg_city"].median()), float(sub["mpg_highway"].median())]

baseline = {}
baseline_hints = {}
for feat in FEATURES:
    if feat in code_maps:
        mode_val = df[feat].mode().iloc[0]
        baseline[feat] = code_maps[feat][mode_val]
        baseline_hints[feat] = mode_val
    elif feat == "car_age":
        baseline[feat] = float(max_year - df["year"].median())
        baseline_hints[feat] = None
    else:
        baseline[feat] = float(df[feat].median())
        baseline_hints[feat] = None

# prediction-interval calibration on a fresh 20% holdout
print("calibrating interval ...")
holdout = df.sample(frac=0.2, random_state=42)


def make_X(src):
    """Build a predict-ready DataFrame (categorical columns as pd.Categorical)."""
    x = src.copy()
    for feat, names in code_maps.items():
        x[feat] = pd.Categorical(x[feat].astype(str), categories=names)
    x["car_age"] = (max_year - pd.to_numeric(src["year"])).astype("float64")
    for feat in ("mileage", "mpg_city", "mpg_highway",
                 "accidents_or_damage", "one_owner"):
        x[feat] = pd.to_numeric(src[feat]).astype("float64")
    return x[FEATURES]


X = make_X(holdout)
y = pd.to_numeric(holdout["price"]).astype("float64").values
pred = model.predict(X)
res = (y - pred)
import numpy as np
p10 = float(np.quantile(res, 0.10))
p90 = float(np.quantile(res, 0.90))
print(f"   residual p10={p10:.0f} p90={p90:.0f} (90% coverage)")

# ---------------------------------------------------------------------------
# 4. Verify rows (concrete strings -> expected price)
# ---------------------------------------------------------------------------
verify = []
rows = df.sample(6, random_state=7)
VX = make_X(rows)


def np_isnan(v):
    return isinstance(v, float) and np.isnan(v)


def no_nan(v):
    return None if np_isnan(v) else v


for i, (_, r) in enumerate(rows.iterrows()):
    price = float(model.predict(VX.iloc[[i]])[0])
    verify.append({
        "manufacturer": r["manufacturer"], "base_model": r["base_model"],
        "model": r["model"], "year": int(r["year"]),
        "mileage": float(r["mileage"]), "transmission": r["transmission"],
        "drivetrain": r["drivetrain"], "fuel_type": r["fuel_type"],
        "mpg_city": no_nan(r["mpg_city"]), "mpg_highway": no_nan(r["mpg_highway"]),
        "accidents_or_damage": int(r["accidents_or_damage"]),
        "one_owner": int(r["one_owner"]), "expected": round(price, 2),
    })
    print("   verify", verify[-1])

# ---------------------------------------------------------------------------
# 5. Write binary
# ---------------------------------------------------------------------------
buf = io.BytesIO()
buf.write(struct.pack("<IIIII", 0x4C47424D, 3, n_trees, total_nodes, len(cat_codes)))
buf.write(struct.pack(f"<{n_trees}i", *node_counts))
buf.write(struct.pack(f"<{len(cat_codes)}i", *cat_codes))
buf.write(bytes(flags))
buf.write(struct.pack(f"<{total_nodes}h", *features))
buf.write(struct.pack(f"<{total_nodes}d", *values))
buf.write(struct.pack(f"<{total_nodes}i", *cat_starts))
buf.write(struct.pack(f"<{total_nodes}i", *cat_lens))
buf.write(struct.pack(f"<{total_nodes}i", *right_starts))
buf.write(bytes(default_lefts))

import os
os.makedirs(OUT_DIR, exist_ok=True)
with gzip.open(OUT_DIR + r"\lgbm.bin.gz", "wb") as fh:
    fh.write(buf.getvalue())
print(f"   lgbm.bin.gz  {os.path.getsize(OUT_DIR + r'\lgbm.bin.gz')/1e6:.1f} MB")

# ---------------------------------------------------------------------------
# 6. Server metadata
# ---------------------------------------------------------------------------
meta = {
"version": 2,
  "features": FEATURES,
    "objective": obj,
    "nTrees": n_trees,
    "categorical": {feat: names for feat, names in code_maps.items()},
    "maxYear": max_year,
    "minYear": min_year,
    "mpgCityMedian": mpg_city_med,
    "mpgHighwayMedian": mpg_hwy_med,
    "mpgByModel": mpg_by_model,
    "baseline": {feat: baseline[feat] for feat in FEATURES},
    "baselineLabels": baseline_hints,
    "intervalQuantiles": [p10, p90],
    "featureImportanceGain": {
        feat: float(feature_importances.get(feat, 0.0)) for feat in FEATURES
    },
}
with open(OUT_DIR + r"\meta.json", "w") as fh:
    json.dump(meta, fh, separators=(",", ":"))
with open(OUT_DIR + r"\verify.json", "w") as fh:
    json.dump(verify, fh, indent=2)

# ---------------------------------------------------------------------------
# 7. Public UI option lists (no model weights)
# ---------------------------------------------------------------------------
os.makedirs(PUBLIC_META.rsplit(os.sep, 1)[0], exist_ok=True)

# make -> base_model -> models, sorted by popularity
mk_order = df.groupby("manufacturer", sort=False).size().sort_values(ascending=False)
makes = []
for mk in mk_order.index:
    sub = df[df["manufacturer"] == mk]
    bm_order = sub.groupby("base_model", sort=False).size().sort_values(ascending=False)
    bms = []
    for bm in bm_order.index:
        models = sorted(sub.loc[sub["base_model"] == bm, "model"].unique())
        bms.append({"name": bm, "models": models})
    makes.append({"name": str(mk), "baseModels": bms})

transmissions = sorted(df["transmission"].unique(), key=str.lower)
drivetrains = sorted(df["drivetrain"].dropna().unique(), key=str.lower)
fuel_types = sorted(df["fuel_type"].dropna().unique(), key=str.lower)

public_meta = {
    "makes": makes,
    "transmissions": transmissions,
    "drivetrains": drivetrains,
    "fuelTypes": fuel_types,
    "minYear": min_year,
    "maxYear": max_year,
    "priceP50": round(float(df["price"].median()), 2),
}
with open(PUBLIC_META, "w") as fh:
    json.dump(public_meta, fh, separators=(",", ":"))
print(f"   predict-meta.json  {os.path.getsize(PUBLIC_META)/1e6:.2f} MB")
print(f"   drivetrains {drivetrains}  fuel {fuel_types}")
print("done")