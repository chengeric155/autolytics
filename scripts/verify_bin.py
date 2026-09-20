"""Replicate the planned TS scorer in Python and check against LightGBM.

Reads lgbm.bin.gz + meta.json + verify.json, walks the preorder nodes with
the same branch rules the TS scorer will use, and compares each row's sum of
leaf values to the expected price written by export_model.py.
"""

import gzip
import io
import json
import math
import struct

import numpy as np

HERE = r"C:\Users\Eric\Hello Data\Used Cars Container\website\model-assets"
raw = gzip.open(HERE + r"\lgbm.bin.gz", "rb").read()
meta = json.load(open(HERE + r"\meta.json"))
verify = json.load(open(HERE + r"\verify.json"))

magic, version, n_trees, total_nodes, cat_count = struct.unpack("<IIIII", raw[:20])
assert magic == 0x4C47424D and version >= 3
off = 20
node_counts = np.frombuffer(raw, dtype="<i4", count=n_trees, offset=off)
off += 4 * n_trees
cat_codes = np.frombuffer(raw, dtype="<i4", count=cat_count, offset=off)
off += 4 * cat_count
flags = np.frombuffer(raw, dtype="u1", count=total_nodes, offset=off)
off += total_nodes
features = np.frombuffer(raw, dtype="<i2", count=total_nodes, offset=off)
off += 2 * total_nodes
values = np.frombuffer(raw, dtype="<f8", count=total_nodes, offset=off)
off += 8 * total_nodes
cat_starts = np.frombuffer(raw, dtype="<i4", count=total_nodes, offset=off)
off += 4 * total_nodes
cat_lens = np.frombuffer(raw, dtype="<i4", count=total_nodes, offset=off)
off += 4 * total_nodes
right_starts = np.frombuffer(raw, dtype="<i4", count=total_nodes, offset=off)
off += 4 * total_nodes
default_lefts = np.frombuffer(raw, dtype="u1", count=total_nodes, offset=off)

tree_lookup = {}

def score(x):
    total = 0.0
    start = 0
    for t in range(n_trees):
        end = start + int(node_counts[t])
        node = start
        while True:
            flag = flags[node]
            if flag == 0:
                total += values[node]
                break
            feat = int(features[node])
            v = x[feat]
            missing = v is None or (isinstance(v, float) and math.isnan(v))
            dl = int(default_lefts[node])
            if flag == 1:
                # numeric threshold; missing goes to default_left branch
                left = dl if missing else v <= values[node]
            else:
                lo = int(cat_starts[node])
                hi = lo + int(cat_lens[node])
                in_set = (not missing) and v in set(cat_codes[lo:hi].tolist())
                left = dl if missing else in_set
            node = node + 1 if left else int(right_starts[node])
        start = end
    return total

code_maps = meta["categorical"]
names = meta["features"]

def row_to_x(r):
    sets = {}
    x = [None] * len(names)
    for i, f in enumerate(names):
        if f in ("manufacturer", "base_model", "model", "transmission",
                 "drivetrain", "fuel_type"):
            cm = dict(code_maps[f])
            x[i] = float(cm.get(r[f], -1.0))
        elif f == "car_age":
            x[i] = float(meta["maxYear"] - r["year"])
        elif f in ("mpg_city", "mpg_highway"):
            if r.get(f) is not None:
                x[i] = float(r[f])
            else:
                x[i] = float("nan")
        else:
            x[i] = float(r[f])
    return x

ok = True
for r in verify:
    got = score(row_to_x(r))
    want = r["expected"]
    d = abs(got - want)
    ok &= d < 0.05
    print(("%-12s %-22s %10.2f vs %10.2f  (%.3f)"
           % (r["manufacturer"], r["model"], got, want, d)))
print("ALL MATCH" if ok else "MISMATCH")