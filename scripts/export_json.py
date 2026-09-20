"""
Generate aggregated JSON data files for the used-car analytics site.

Reads the cleaned parquet dataset and writes per-chart aggregate JSON files
to public/data/. Each file mirrors a chart from notebooks/02_analysis.ipynb
so the frontend can render them with Nivo without needing pandas/pyarrow.

Usage:
    python scripts/export_json.py
"""

import json
import os

import numpy as np
import pandas as pd
import pyarrow.parquet as pq

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))  # website/
CONTAINER = os.path.dirname(ROOT)
PARQUET_PATH = os.path.join(
    CONTAINER, "used-cars", "data", "cars_cleaned.parquet"
)
OUT_DIR = os.path.join(ROOT, "public", "data")

# Write JSON as compact but still readable (no huge floats)
def dump(name, obj):
    path = os.path.join(OUT_DIR, name)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(obj, f, separators=(",", ":"), allow_nan=False)
    print(f"wrote {name}")


def main():
    print(f"reading {PARQUET_PATH}")
    df = pd.read_parquet(PARQUET_PATH)

    # ---------- 1. Count by manufacturer (horizontal bar, by country) ----------
    manufacturer_to_country = {
        "Buick": "United States", "Cadillac": "United States",
        "Chevrolet": "United States", "Chrysler": "United States",
        "Dodge": "United States", "Ford": "United States", "GMC": "United States",
        "Jeep": "United States", "Lincoln": "United States", "RAM": "United States",
        "Tesla": "United States", "Audi": "Germany", "BMW": "Germany",
        "Mercedes-Benz": "Germany", "Porsche": "Germany", "Volkswagen": "Germany",
        "Acura": "Japan", "Honda": "Japan", "INFINITI": "Japan", "Lexus": "Japan",
        "Mazda": "Japan", "Mitsubishi": "Japan", "Nissan": "Japan", "Toyota": "Japan",
        "Subaru": "Japan", "Hyundai": "South Korea", "Kia": "South Korea",
        "Jaguar": "United Kingdom", "Land Rover": "United Kingdom", "Volvo": "Sweden",
    }
    counts = df["manufacturer"].value_counts()
    order = counts.index.tolist()
    by_make = [
        {
            "manufacturer": m,
            "count": int(counts[m]),
            "country": manufacturer_to_country.get(m, "Other"),
        }
        for m in order
    ]
    dump("by_make_count.json", by_make)

    # ---------- 2. Drivetrain frequency ----------
    drivetrain = (
        df["drivetrain"].value_counts()
        .rename_axis("drivetrain")
        .reset_index(name="count")
    )
    dump(
        "drivetrain_count.json",
        [
            {"drivetrain": row["drivetrain"], "count": int(row["count"])}
            for _, row in drivetrain.iterrows()
        ],
    )

    # ---------- 3. Fuel type frequency ----------
    fuel = (
        df["fuel_type"].value_counts()
        .rename_axis("fuel_type")
        .reset_index(name="count")
    )
    dump(
        "fuel_type_count.json",
        [
            {"fuel_type": row["fuel_type"], "count": int(row["count"])}
            for _, row in fuel.iterrows()
        ],
    )

    # ---------- 4. Mileage distribution (histogram bins) ----------
    mileage_hist, mileage_edges = np.histogram(
        df["mileage"].clip(upper=300000), bins=30, range=(0, 300000)
    )
    dump(
        "mileage_distribution.json",
        [
            {
                "binStart": float(mileage_edges[i]),
                "binEnd": float(mileage_edges[i + 1]),
                "count": int(mileage_hist[i]),
            }
            for i in range(len(mileage_hist))
        ],
    )

    # ---------- 5. Year histogram (binwidth 1) ----------
    year_hist, year_edges = np.histogram(df["year"], bins=range(int(df["year"].min()), int(df["year"].max()) + 2))
    dump(
        "year_distribution.json",
        [
            {"year": int(year_edges[i]), "count": int(year_hist[i])}
            for i in range(len(year_hist))
        ],
    )

    # ---------- 6. Price distribution (log-scaled x, histogram) ----------
    price = df["price"].clip(lower=1)
    log_bins = np.logspace(np.log10(price.min()), np.log10(price.max()), 50)
    price_hist, price_edges = np.histogram(price, bins=log_bins)
    dump(
        "price_distribution.json",
        [
            {
                "binStart": float(price_edges[i]),
                "binEnd": float(price_edges[i + 1]),
                "count": int(price_hist[i]),
            }
            for i in range(len(price_hist))
        ],
    )

    # ---------- 7. Price distribution window ($19k-$31k, binwidth 100) ----------
    twenty_k = df[(df["price"].between(19000, 31000))]
    w_hist, w_edges = np.histogram(twenty_k["price"], bins=np.arange(19000, 31001, 100))
    dump(
        "price_window_distribution.json",
        [
            {
                "binStart": float(w_edges[i]),
                "binEnd": float(w_edges[i + 1]),
                "count": int(w_hist[i]),
            }
            for i in range(len(w_hist))
        ],
    )

    # ---------- 8/9/10. Flag pies (personal_use, accidents, one_owner) ----------
    def flag_pie(col):
        vc = df[col].value_counts()
        return [
            {"label": str(idx), "count": int(val)}
            for idx, val in vc.items()
        ]

    dump("personal_use_distribution.json", flag_pie("personal_use_only"))
    dump("accidents_distribution.json", flag_pie("accidents_or_damage"))
    dump("one_owner_distribution.json", flag_pie("one_owner"))

    # ---------- 11. Correlation matrix ----------
    corr = df.corr(numeric_only=True)
    corr_cols = ["year", "mileage", "mpg_city", "mpg_highway", "price_drop", "price"]
    corr_cols = [c for c in corr_cols if c in corr.columns]
    corr_matrix = [
        {
            "feature": col,
            **{
                other: (
                    None
                    if pd.isna(corr.at[col, other])
                    else round(float(corr.at[col, other]), 3)
                )
                for other in corr_cols
            },
        }
        for col in corr_cols
    ]
    dump("correlation_matrix.json", corr_matrix)

    # ---------- 12. Average price by model year (line) ----------
    price_by_year = (
        df.groupby("year")["price"]
        .agg(price="mean", se="sem")
        .reset_index()
    )
    price_by_year["price"] = price_by_year["price"].round(0)
    price_by_year["se"] = price_by_year["se"].round(0)
    dump(
        "price_by_year.json",
        [
            {
                "year": int(row["year"]),
                "price": float(row["price"]),
                "se": 0 if pd.isna(row["se"]) else float(row["se"]),
            }
            for _, row in price_by_year.iterrows()
        ],
    )

    # ---------- 13. Average mileage by model year (line) ----------
    mileage_by_year = (
        df.groupby("year")["mileage"]
        .agg(mileage="mean", se="sem")
        .reset_index()
    )
    mileage_by_year["mileage"] = mileage_by_year["mileage"].round(0)
    mileage_by_year["se"] = mileage_by_year["se"].round(0)
    dump(
        "mileage_by_year.json",
        [
            {
                "year": int(row["year"]),
                "mileage": float(row["mileage"]),
                "se": 0 if pd.isna(row["se"]) else float(row["se"]),
            }
            for _, row in mileage_by_year.iterrows()
        ],
    )

    # ---------- 14. Price vs mileage hexbin (median year) ----------
    sample = df[(df["price"] < 150000) & (df["mileage"] < 450000)].copy()
    # Hexbin: bin mileage into hex-ish columns. We emulate with a 2D grid.
    x_edges = np.linspace(0, 450000, 51)
    y_edges = np.linspace(0, 150000, 51)
    x_idx = np.digitize(sample["mileage"], x_edges) - 1
    y_idx = np.digitize(sample["price"], y_edges) - 1
    valid = (x_idx >= 0) & (x_idx < len(x_edges) - 1) & (y_idx >= 0) & (y_idx < len(y_edges) - 1)
    hex_cells = []
    for xi in range(len(x_edges) - 1):
        for yi in range(len(y_edges) - 1):
            mask = valid & (x_idx == xi) & (y_idx == yi)
            n = int(mask.sum())
            if n == 0:
                continue
            median_year = float(np.median(sample.loc[mask, "year"]))
            hex_cells.append(
                {
                    "mileage": float(x_edges[xi]),
                    "price": float(y_edges[yi]),
                    "count": n,
                    "medianYear": median_year,
                }
            )
    dump("price_vs_mileage_hex.json", hex_cells)

    # ---------- 15. Price impact across vehicle flags (violin-ish) ----------
    # We emit percentiles per flag which the frontend can render as box/violin.
    flag_columns = ["accidents_or_damage", "one_owner", "personal_use_only"]
    flag_data = []
    for col in flag_columns:
        sub = df[df["price"] < 150000]
        for val in [False, True]:
            group = sub.loc[sub[col] == val, "price"]
            if len(group) == 0:
                continue
            pct = group.quantile([0.05, 0.25, 0.5, 0.75, 0.95])
            flag_data.append(
                {
                    "flag": col,
                    "value": str(val),
                    "p05": round(float(pct[0.05]), 0),
                    "p25": round(float(pct[0.25]), 0),
                    "median": round(float(pct[0.5]), 0),
                    "p75": round(float(pct[0.75]), 0),
                    "p95": round(float(pct[0.95]), 0),
                }
            )
    dump("price_by_vehicle_flag.json", flag_data)

    # ---------- 16. Boxplot of price by manufacturer ----------
    order = (
        df.groupby("manufacturer")["price"].median().sort_values(ascending=False)
    )
    box_data = []
    for m in order.index:
        group = df[df["manufacturer"] == m]["price"]
        pct = group.quantile([0.05, 0.25, 0.5, 0.75, 0.95])
        box_data.append(
            {
                "manufacturer": m,
                "p05": round(float(pct[0.05]), 0),
                "p25": round(float(pct[0.25]), 0),
                "median": round(float(pct[0.5]), 0),
                "p75": round(float(pct[0.75]), 0),
                "p95": round(float(pct[0.95]), 0),
                "mean": round(float(group.mean()), 0),
            }
        )
    dump("price_by_make_box.json", box_data)

    # ---------- 17. Price vs price drop (scatter, sampled) ----------
    scatter_ppd = (
        df[["price", "price_drop"]].sample(20000, random_state=42).dropna()
    )
    dump(
        "price_vs_price_drop.json",
        [
            {"price": float(r.price), "priceDrop": float(r.price_drop)}
            for _, r in scatter_ppd.iterrows()
        ],
    )

    # ---------- 18. Seller vs driver rating 2D histogram ----------
    sr_edges = np.linspace(df["seller_rating"].min(), df["seller_rating"].max(), 16)
    dr_edges = np.linspace(df["driver_rating"].min(), df["driver_rating"].max(), 16)
    rating_hist, sx, sy = np.histogram2d(
        df["seller_rating"], df["driver_rating"], bins=[sr_edges, dr_edges]
    )
    rating_cells = []
    for i in range(len(sx) - 1):
        for j in range(len(sy) - 1):
            rating_cells.append(
                {
                    "sellerRating": float(sx[i]),
                    "driverRating": float(sy[j]),
                    "count": int(rating_hist[i, j]),
                }
            )
    dump("rating_2d.json", rating_cells)

    # ---------- 19. Average MPG by drivetrain (grouped bar) ----------
    df_mpg = df.melt(
        id_vars=["drivetrain"],
        value_vars=["mpg_city", "mpg_highway"],
        var_name="mpg_type",
        value_name="mpg_value",
    )
    df_mpg["mpg_type"] = df_mpg["mpg_type"].map(
        {"mpg_city": "City", "mpg_highway": "Highway"}
    )
    mpg_grouped = (
        df_mpg.groupby(["drivetrain", "mpg_type"])["mpg_value"].mean().round(1)
    )
    drivetrains = sorted(df["drivetrain"].dropna().unique().tolist())
    mpg_data = [
        {
            "drivetrain": d,
            "City": float(mpg_grouped.get((d, "City"), 0)),
            "Highway": float(mpg_grouped.get((d, "Highway"), 0)),
        }
        for d in drivetrains
    ]
    dump("mpg_by_drivetrain.json", mpg_data)

    # ---------- 20. Median price by drivetrain x fuel type (heatmap) ----------
    price_matrix = df.pivot_table(
        index="drivetrain", columns="fuel_type", values="price", aggfunc="median"
    )
    heat_rows = []
    for d in price_matrix.index:
        row = {"drivetrain": str(d)}
        for f in price_matrix.columns:
            row[str(f)] = None if pd.isna(price_matrix.at[d, f]) else round(float(price_matrix.at[d, f]), 0)
        heat_rows.append(row)
    dump(
        "price_drivetrain_fuel_heat.json",
        {"drivetrains": [str(d) for d in price_matrix.index], "fuelTypes": [str(f) for f in price_matrix.columns], "rows": heat_rows},
    )

    # ---------- 21. Depreciation curves by fuel type (multi-line) ----------
    fuel_types = ["Diesel", "E85 Flex Fuel", "Electric", "Gasoline", "Hybrid"]
    df_filtered = df[df["fuel_type"].isin(fuel_types)].copy()
    df_filtered["mileage_bin"] = (df_filtered["mileage"] // 15000) * 15000
    dep_data = []
    for ft in fuel_types:
        sub = df_filtered[df_filtered["fuel_type"] == ft]
        grouped = (
            sub.groupby("mileage_bin")["price"].median()
            if len(sub) > 0
            else pd.Series(dtype=float)
        )
        dep_data.append(
            {
                "fuelType": ft,
                "data": [
                    {"mileage": int(bin_), "medianPrice": float(v)}
                    for bin_, v in grouped.items()
                    if bin_ <= 150000
                ],
            }
        )
    dump("depreciation_by_fuel.json", dep_data)

    # ---------- 22. Mileage vs price by fuel type (scatter, sampled) ----------
    scatter_mp = df[["mileage", "price", "fuel_type"]].sample(10000, random_state=42)
    dump(
        "price_vs_mileage_scatter.json",
        [
            {"mileage": float(r.mileage), "price": float(r.price), "fuelType": str(r.fuel_type)}
            for _, r in scatter_mp.iterrows()
        ],
    )

    # ---------- 23. Split-violin densities: price by vehicle flag ----------
    # For each flag we emit the full price distribution (density sampled on a
    # shared price grid) per value so the frontend can draw two mirrored
    # violins ("Yes" vs "No") sharing each flag's horizontal axis.
    def _kde(values, grid, sample=40000, bw=0.16, log=False):
        from scipy.stats import gaussian_kde
        rng = np.random.default_rng(7)
        v = np.asarray(values, dtype=float)
        v = v[np.isfinite(v) & (v > 0)]
        if len(v) > sample:
            v = rng.choice(v, size=sample, replace=False)
        if log:
            lv = np.log10(v)
            lg = np.log10(np.maximum(grid, 1))
        else:
            lv = v
            lg = grid
        if len(v) < 30 or lv.std() < 1e-6:
            return [0.0] * len(grid)
        try:
            k = gaussian_kde(lv, bw_method=bw)
            d = k(lg)
            if log:
                # back-transform to per-unit (linear) density
                d = d / (np.maximum(grid, 1) * np.log(10))
            return [float(x) for x in d]
        except Exception:
            return [0.0] * len(grid)

    PRICE_GRID = np.linspace(0, 150000, 100)
    flag_series = []
    for col in flag_columns:
        sub = df[df["price"] < 150000]
        yes = _kde(sub.loc[sub[col] == True, "price"], PRICE_GRID, log=False)  # noqa: E712
        no = _kde(sub.loc[sub[col] != True, "price"], PRICE_GRID, log=False)  # noqa: E712
        flag_series.append({"flag": col, "yes": yes, "no": no})
    dump(
        "price_by_vehicle_flag_density.json",
        {
            "priceGrid": [round(float(x), 0) for x in PRICE_GRID],
            "series": flag_series,
        },
    )

    # ---------- 24. Odometer KDE ----------
    mileage_grid = np.linspace(0, 300000, 160)
    mile_kde = _kde(df["mileage"].clip(lower=0), mileage_grid, sample=80000, bw=0.14)
    dump(
        "mileage_kde.json",
        {
            "grid": [round(float(x), 0) for x in mileage_grid],
            "density": [float(x) for x in mile_kde],
        },
    )

    # ---------- 25. Ridgeline densities: price by manufacturer ----------
    make_med = df.groupby("manufacturer")["price"].median().sort_values(ascending=False)
    rid_makes = list(make_med.index)  # all 30, top-mean first -> readable ridgeline
    rid_grid = np.linspace(0, 150000, 100)
    rid_density = []
    for m in rid_makes:
        group = df[df["manufacturer"] == m]["price"]
        rid_density.append(_kde(group, rid_grid))
    dump(
        "price_by_make_density.json",
        {
            "makes": rid_makes,
            "priceGrid": [round(float(x), 0) for x in rid_grid],
            "density": rid_density,
        },
    )

    # ---------- Summary stats for the site header/dataset card ----------
    summary = {
        "listings": int(len(df)),
        "medianPrice": round(float(df["price"].median()), 0),
        "makes": int(df["manufacturer"].nunique()),
        "minYear": int(df["year"].min()),
        "maxYear": int(df["year"].max()),
        "meanPrice": round(float(df["price"].mean()), 0),
        "meanMileage": round(float(df["mileage"].mean()), 0),
        "meanAge": round(float(df["year"].max() - df["year"].mean()), 2),
    }
    dump("dataset_summary.json", summary)

    print("done")


if __name__ == "__main__":
    main()
