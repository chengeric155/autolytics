import type { Metadata } from 'next'
import { PageHeader, SectionHeading } from '@/components/page-header'
import { ChartSlot } from '@/components/chart-slot'
import {
  ByMakeCountChart,
  FuelTypeCountChart,
  DrivetrainCountChart,
  PriceWindowChart,
  PriceByMakeBoxChart,
  PriceByFlagBoxChart,
  PriceByYearLineChart,
  MileageByYearLineChart,
  YearDistributionChart,
  MileageDistributionChart,
  MpgByDrivetrainChart,
  DrivetrainFuelHeatChart,
  AccidentsDonutChart,
  OneOwnerDonutChart,
  PersonalUseDonutChart,
  CorrelationHeatChart,
  PriceVsPriceDropChart,
  RatingHeatChart,
} from '@/components/charts/analytics'
import { HexbinChart } from '@/components/charts/hexbin-chart'
import { PriceDistributionChart } from '@/components/charts/price-distribution-chart'

export const metadata: Metadata = {
  title: 'Analytics',
  description:
    'Exploratory analysis of the used car dataset: price distributions, depreciation, mileage effects, brand comparisons and feature relationships.',
}

export default function AnalyticsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Exploratory analysis"
        title="Analytics"
        description="Real charts from the dataset's notebook analysis — market composition, price spreads, the odometer penalty, fuel economy, ownership history and feature correlations."
      />

      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-14">
          {/* 01 — Market composition */}
          <section aria-labelledby="s-01">
            <div id="s-01">
              <SectionHeading
                index="01"
                title="What's on the market"
                description="The supply side — which manufacturers, fuel types and drivetrains dominate the listings."
              />
            </div>
            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              <ChartSlot
                title="Listing volume by manufacturer"
                slotId="by_make_count"
                description="Number of listings per brand, colored by home country. Largest fleets come from the US and Japan."
                className="lg:col-span-2"
                height={360}
              >
                <ByMakeCountChart height={360} />
              </ChartSlot>
              <ChartSlot
                title="Market share by fuel type"
                slotId="fuel_type_count"
                description="Gasoline dominates; hybrids and electric remain a small share of the used market."
                height={280}
              >
                <FuelTypeCountChart height={280} />
              </ChartSlot>
              <ChartSlot
                title="Market share by drivetrain"
                slotId="drivetrain_count"
                description="AWD and 4WD make up most listings; RWD is the niche."
                height={280}
              >
                <DrivetrainCountChart height={280} />
              </ChartSlot>
            </div>
          </section>

          {/* 02 — Price spread */}
          <section aria-labelledby="s-02">
            <div id="s-02">
              <SectionHeading
                index="02"
                title="Where listed prices sit"
                description="How price is spread across the market, and the spread within each brand."
              />
            </div>
            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              <ChartSlot
                title="Full price distribution (log scale)"
                slotId="price_distribution"
                description="The whole logged distribution, from a few hundred dollars to seven figures — prices span more than three orders of magnitude."
                height={280}
              >
                <PriceDistributionChart height={280} />
              </ChartSlot>
              <ChartSlot
                title="Price distribution, $19k–$31k"
                slotId="price_window_distribution"
                description="Zoomed into the 20K-30K range. We see spikes in number of cars listed from XX000 to XX999"
                height={280}
              >
                <PriceWindowChart height={280} />
              </ChartSlot>
              <ChartSlot
                title="Price spread by manufacturer"
                slotId="price_by_make_box"
                description="Ridgeline of listed-price distributions for all 30 brands. The top band is the priciest marque and each curve down is one step cheaper."
                className="lg:col-span-2"
                height={560}
              >
                <PriceByMakeBoxChart height={560} />
              </ChartSlot>
            </div>
          </section>

          {/* 03 — Odometer */}
          <section aria-labelledby="s-03">
            <div id="s-03">
              <SectionHeading
                index="03"
                title="Price & the odometer"
                description="The mileage penalty, and how condition history is priced in."
              />
            </div>
            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              <ChartSlot
                title="Price vs. mileage density"
                slotId="price_vs_mileage_hex"
                description="Hexbin density of listings across mileage and price. The market fills a falling band, with high-mileage cars clustered near the bottom."
                className="lg:col-span-2"
                height={360}
              >
                <HexbinChart height={360} />
              </ChartSlot>
              <ChartSlot
                title="Price by history flags"
                slotId="price_by_vehicle_flag"
                description="Split violin graphs showing how accident history and multiple previous owners lower the price of the vehicle"
                height={320}
              >
                <PriceByFlagBoxChart height={320} />
              </ChartSlot>
            </div>
          </section>

          {/* 04 — Age & usage */}
          <section aria-labelledby="s-04">
            <div id="s-04">
              <SectionHeading
                index="04"
                title="Age & usage patterns"
                description="How price and accumulated mileage track the model year."
              />
            </div>
            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              <ChartSlot
                title="Average price by model year"
                slotId="price_by_year"
                description="The depreciation curve — value declines steadily from the newest models."
                height={280}
              >
                <PriceByYearLineChart height={280} />
              </ChartSlot>
              <ChartSlot
                title="Average odometer by model year"
                slotId="mileage_by_year"
                description="Older generations carry progressively more mileage on average."
                height={280}
              >
                <MileageByYearLineChart height={280} />
              </ChartSlot>
              <ChartSlot
                title="Model year distribution"
                slotId="year_distribution"
                description="The dataset skews toward recent models, with a notable older tail."
                height={280}
              >
                <YearDistributionChart height={280} />
              </ChartSlot>
              <ChartSlot
                title="Odometer distribution"
                slotId="mileage_distribution"
                description="KDE density of odometer readings — the curve bulges just under 30k miles and trails off as mileage climbs."
                height={280}
              >
                <MileageDistributionChart height={280} />
              </ChartSlot>
            </div>
          </section>

          {/* 05 — Fuel economy & drivetrain */}
          <section aria-labelledby="s-05">
            <div id="s-05">
              <SectionHeading
                index="05"
                title="Fuel economy & drivetrain"
                description="City vs. highway efficiency by drivetrain, and median price across the drive × fuel grid."
              />
            </div>
            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              <ChartSlot
                title="Fuel economy by drivetrain"
                slotId="mpg_by_drivetrain"
                description="FWD posts the best city and highway numbers; AWD/4WD trade economy for traction."
                height={280}
              >
                <MpgByDrivetrainChart height={280} />
              </ChartSlot>
              <ChartSlot
                title="Median price: drivetrain × fuel"
                slotId="price_drivetrain_fuel_heat"
                description="Diesel and hybrid drivelines command the highest median prices across drivetrains."
                className="lg:col-span-2"
                height={340}
              >
                <DrivetrainFuelHeatChart height={340} />
              </ChartSlot>
            </div>
          </section>

          {/* 06 — Ownership history */}
          <section aria-labelledby="s-06">
            <div id="s-06">
              <SectionHeading
                index="06"
                title="History & ownership"
                description="How common clean-title, single-owner and personal-use cars are on this market."
              />
            </div>
            <div className="mt-5 grid gap-4 lg:grid-cols-3">
              <ChartSlot
                title="Reported accidents"
                slotId="accidents_distribution"
                description="The majority of listings carry no accident record."
                height={280}
              >
                <AccidentsDonutChart height={280} />
              </ChartSlot>
              <ChartSlot
                title="Single-owner cars"
                slotId="one_owner_distribution"
                description="A minority of listings have been single-owner from new."
                height={280}
              >
                <OneOwnerDonutChart height={280} />
              </ChartSlot>
              <ChartSlot
                title="Personal-use only"
                slotId="personal_use_distribution"
                description="Most cars are flagged as personal use only."
                height={280}
              >
                <PersonalUseDonutChart height={280} />
              </ChartSlot>
            </div>
          </section>

          {/* 07 — Relationships */}
          <section aria-labelledby="s-07">
            <div id="s-07">
              <SectionHeading
                index="07"
                title="Relationships & correlations"
                description="Cross-feature structure: which numeric signals move together."
              />
            </div>
            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              <ChartSlot
                title="Feature correlation matrix"
                slotId="correlation_matrix"
                description="Weak-to-moderate correlations; year, mileage and price cluster as expected."
                className="lg:col-span-2"
                height={380}
              >
                <CorrelationHeatChart height={380} />
              </ChartSlot>
              <ChartSlot
                title="Listed price vs. price drop"
                slotId="price_vs_price_drop"
                description="Larger drops occur on pricier listings; the relationship fans out at the top."
                height={300}
              >
                <PriceVsPriceDropChart height={300} />
              </ChartSlot>
              <ChartSlot
                title="Seller vs. driver rating density"
                slotId="rating_2d"
                description="Ratings cluster strongly in the top-right corner — most listings are highly rated on both axes."
                height={300}
              >
                <RatingHeatChart height={300} />
              </ChartSlot>
            </div>
          </section>
        </div>
      </div>
    </>
  )
}
