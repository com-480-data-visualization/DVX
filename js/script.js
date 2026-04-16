"use strict";

///////////////////////////////////////////////////////////
// Mobile navigation

const btnNavEl = document.querySelector(".btn-mobile-nav");
const headerEl = document.querySelector(".header");

if (btnNavEl && headerEl) {
  btnNavEl.addEventListener("click", function () {
    headerEl.classList.toggle("nav-open");
  });
}

///////////////////////////////////////////////////////////
// Smooth scrolling

const allLinks = document.querySelectorAll("a:link");

allLinks.forEach(function (link) {
  link.addEventListener("click", function (e) {
    const href = link.getAttribute("href");
    if (!href) return;

    if (href.startsWith("#")) {
      e.preventDefault();

      if (href === "#") {
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        const sectionEl = document.querySelector(href);
        if (sectionEl) sectionEl.scrollIntoView({ behavior: "smooth" });
      }

      if (link.classList.contains("main-nav-link") && headerEl) {
        headerEl.classList.toggle("nav-open");
      }
    }
  });
});

///////////////////////////////////////////////////////////
// Sticky navigation

const sectionHeroEl = document.querySelector(".section-hero");

if (sectionHeroEl) {
  const obs = new IntersectionObserver(
    function (entries) {
      const ent = entries[0];
      if (!ent.isIntersecting) document.body.classList.add("sticky");
      else document.body.classList.remove("sticky");
    },
    {
      root: null,
      threshold: 0,
      rootMargin: "-80px",
    }
  );

  obs.observe(sectionHeroEl);
}

///////////////////////////////////////////////////////////
// Flex gap fix

function checkFlexGap() {
  const flex = document.createElement("div");
  flex.style.display = "flex";
  flex.style.flexDirection = "column";
  flex.style.rowGap = "1px";

  flex.appendChild(document.createElement("div"));
  flex.appendChild(document.createElement("div"));

  document.body.appendChild(flex);
  const isSupported = flex.scrollHeight === 1;
  flex.parentNode.removeChild(flex);

  if (!isSupported) document.body.classList.add("no-flexbox-gap");
}
checkFlexGap();

///////////////////////////////////////////////////////////
// D3 dashboard

document.addEventListener("DOMContentLoaded", function () {
  const indicatorSelect = document.getElementById("indicator-select");
  const regionSelect = document.getElementById("region-select");

  const indicators = [
    {
      key: "gdp",
      label: "GDP per capita",
      column: "GDP per capita (current US$)",
      shortLabel: "GDP",
    },
    {
      key: "internet",
      label: "Internet users (%)",
      column: "Individuals using the Internet (% of population)",
      shortLabel: "Internet",
    },
    {
      key: "electricity",
      label: "Access to electricity (%)",
      column: "Access to electricity (% of population)",
      shortLabel: "Electricity",
    },
  ];

  const colors = {
    BRI: "#2f80ed",
    NonBRI: "#eb5757",
    Country: "#222222",
  };

  function toNumber(v) {
    return v === "" || v == null ? null : +v;
  }

  function cleanRegion(regionText) {
    if (!regionText) return "Other";
    if (regionText.includes("Africa")) return "Africa";
    if (regionText.includes("Asia")) return "Asia";
    if (regionText.includes("Europe")) return "Europe";
    return "Other";
  }

  function cleanGroup(groupText) {
    if (!groupText) return "Other";

    const text = groupText.toLowerCase();

    if (text.includes("non-bri") || text.includes("non bri") || text.includes("control")) {
      return "NonBRI";
    }
    if (text.includes("bri")) {
      return "BRI";
    }
    return "Other";
  }

  function meanIgnoreNull(values) {
    const clean = values.filter((v) => v != null && !Number.isNaN(v));
    return clean.length ? d3.mean(clean) : null;
  }

  function formatValue(v) {
    if (v == null || Number.isNaN(v)) return "NA";
    if (Math.abs(v) >= 1000) return d3.format(",.0f")(v);
    return d3.format(".2f")(v);
  }

  function getIndicatorLabel(key) {
    const found = indicators.find((d) => d.key === key);
    return found ? found.label : key;
  }

  function getIndicatorShortLabel(key) {
    const found = indicators.find((d) => d.key === key);
    return found ? found.shortLabel : key;
  }

  function correlation(arrX, arrY) {
    const paired = arrX
      .map((x, i) => [x, arrY[i]])
      .filter(([x, y]) => x != null && y != null);

    if (paired.length < 2) return null;

    const xs = paired.map((d) => d[0]);
    const ys = paired.map((d) => d[1]);

    const meanX = d3.mean(xs);
    const meanY = d3.mean(ys);

    let num = 0;
    let denX = 0;
    let denY = 0;

    for (let i = 0; i < paired.length; i++) {
      const dx = xs[i] - meanX;
      const dy = ys[i] - meanY;
      num += dx * dy;
      denX += dx * dx;
      denY += dy * dy;
    }

    const den = Math.sqrt(denX * denY);
    if (den === 0) return null;
    return num / den;
  }

  ///////////////////////////////////////////////////////////
  // Build controls already required by teammate spec

  indicatorSelect.innerHTML = "";
  indicators.forEach((d) => {
    const option = document.createElement("option");
    option.value = d.key;
    option.textContent = d.label;
    indicatorSelect.appendChild(option);
  });
  indicatorSelect.value = "gdp";

  // Add country selector next to current controls
  const controlsWrap = indicatorSelect.closest(".viz-controls");
  const countryLabel = document.createElement("label");
  countryLabel.setAttribute("for", "country-select");
  countryLabel.textContent = "Country";

  const countrySelect = document.createElement("select");
  countrySelect.id = "country-select";

  if (controlsWrap) {
    controlsWrap.appendChild(countryLabel);
    controlsWrap.appendChild(countrySelect);
  }

  // Add boxplot year slider under boxplot
  const boxplotContainer = document.getElementById("boxplot-chart");
  let boxplotControls = null;
  let yearSlider = null;
  let yearValue = null;

  if (boxplotContainer && boxplotContainer.parentNode) {
    boxplotControls = document.createElement("div");
    boxplotControls.className = "viz-controls";
    boxplotControls.style.marginBottom = "1rem";
    boxplotControls.style.marginTop = "0";

    const sliderLabel = document.createElement("label");
    sliderLabel.setAttribute("for", "boxplot-year");
    sliderLabel.textContent = "Comparison year";

    yearSlider = document.createElement("input");
    yearSlider.type = "range";
    yearSlider.id = "boxplot-year";
    yearSlider.min = "2000";
    yearSlider.max = "2020";
    yearSlider.step = "1";
    yearSlider.value = "2013";
    yearSlider.style.width = "24rem";

    yearValue = document.createElement("span");
    yearValue.id = "boxplot-year-value";
    yearValue.style.fontSize = "1.4rem";
    yearValue.style.fontWeight = "600";
    yearValue.textContent = "2013";

    boxplotContainer.parentNode.insertBefore(boxplotControls, boxplotContainer);
    boxplotControls.appendChild(sliderLabel);
    boxplotControls.appendChild(yearSlider);
    boxplotControls.appendChild(yearValue);
  }

  renderLegend();
  renderRegionPanel();
  renderTooltipPanel("Loading real data...");

  console.log("start loading csv");

  d3.csv("../data/Final_Imputed_Panel_Data.csv")
    .then((raw) => {
      console.log("csv loaded", raw.length);

      const data = raw
        .map((d) => ({
          country: d["Country Name"],
          code: d["Country Code"],
          year: toNumber(d["Year"]),
          regionRaw: d["Region"],
          region: cleanRegion(d["Region"]),
          didGroupRaw: d["DID_Group"],
          group: cleanGroup(d["DID_Group"]),
          gdp: toNumber(d["GDP per capita (current US$)"]),
          internet: toNumber(
            d["Individuals using the Internet (% of population)"]
          ),
          electricity: toNumber(
            d["Access to electricity (% of population)"]
          ),
        }))
        .filter((d) => d.year != null && d.country);

      const availableRegions = [
        "All",
        ...Array.from(
          new Set(
            data
              .map((d) => d.region)
              .filter((r) => r !== "Other")
          )
        ).sort(),
      ];

      regionSelect.innerHTML = "";
      availableRegions.forEach((r) => {
        const option = document.createElement("option");
        option.value = r;
        option.textContent = r;
        regionSelect.appendChild(option);
      });
      regionSelect.value = "All";

      const countries = [
        "All Countries",
        ...Array.from(new Set(data.map((d) => d.country))).sort(),
      ];

      countrySelect.innerHTML = "";
      countries.forEach((country) => {
        const option = document.createElement("option");
        option.value = country;
        option.textContent = country;
        countrySelect.appendChild(option);
      });
      countrySelect.value = "All Countries";

      const availableYears = Array.from(new Set(data.map((d) => d.year))).sort((a, b) => a - b);
      const minYear = d3.min(availableYears);
      const maxYear = d3.max(availableYears);

      if (yearSlider) {
        yearSlider.min = String(minYear);
        yearSlider.max = String(maxYear);
        yearSlider.value = "2013" >= minYear && "2013" <= maxYear ? "2013" : String(maxYear);
      }
      if (yearValue && yearSlider) {
        yearValue.textContent = yearSlider.value;
      }

      function updateAll() {
        const indicator = indicatorSelect.value;
        const region = regionSelect.value;
        const country = countrySelect.value;
        const compareYear = yearSlider ? +yearSlider.value : 2013;

        if (yearValue) yearValue.textContent = String(compareYear);

        renderLineChart(data, indicator, region, country);
        renderBoxplot(data, indicator, region, compareYear);
        renderHeatmap(data, region, country);
        renderRegionPanel(region, country);
        renderTooltipPanel(
          `Indicator: ${getIndicatorLabel(indicator)}. Region: ${region}. Country overlay: ${country}. Boxplot year: ${compareYear}. Dashed vertical lines mark 2013 (BRI announcement) and 2019 (COVID baseline).`
        );
      }

      indicatorSelect.addEventListener("change", updateAll);
      regionSelect.addEventListener("change", updateAll);
      countrySelect.addEventListener("change", updateAll);
      if (yearSlider) {
        yearSlider.addEventListener("input", updateAll);
      }

      updateAll();
    })
    .catch((error) => {
      console.error("CSV load failed:", error);
      renderTooltipPanel(
        `Failed to load CSV. Current path is ../data/Final_Imputed_Panel_Data.csv. Error: ${error.message}`
      );
    });

  ///////////////////////////////////////////////////////////
  // Main MVP line chart

  function renderLineChart(data, indicator, region, country) {
    const container = d3.select("#line-chart");
    container.selectAll("*").remove();

    const width = container.node().clientWidth || 900;
    const height = 460;
    const margin = { top: 24, right: 40, bottom: 54, left: 80 };

    const svg = container
      .append("svg")
      .attr("width", width)
      .attr("height", height);

    let filtered = data.filter((d) => d[indicator] != null);

    if (region !== "All") {
      filtered = filtered.filter((d) => d.region === region);
    }

    const groupFiltered = filtered.filter(
      (d) => d.group === "BRI" || d.group === "NonBRI"
    );

    const grouped = d3.rollups(
      groupFiltered,
      (v) => d3.mean(v, (d) => d[indicator]),
      (d) => d.group,
      (d) => d.year
    );

    const series = grouped
      .map(([group, values]) => ({
        key: group,
        values: values
          .map(([year, value]) => ({ year, value }))
          .sort((a, b) => a.year - b.year),
      }))
      .filter((d) => d.values.length > 0);

    let selectedCountrySeries = null;
    if (country && country !== "All Countries") {
      const countryValues = filtered
        .filter((d) => d.country === country)
        .map((d) => ({ year: d.year, value: d[indicator] }))
        .filter((d) => d.value != null)
        .sort((a, b) => a.year - b.year);

      if (countryValues.length > 0) {
        selectedCountrySeries = {
          key: "Country",
          country,
          values: countryValues,
        };
      }
    }

    const allPoints = [
      ...series.flatMap((s) => s.values),
      ...(selectedCountrySeries ? selectedCountrySeries.values : []),
    ];

    if (!allPoints.length) {
      svg
        .append("text")
        .attr("x", width / 2)
        .attr("y", height / 2)
        .attr("text-anchor", "middle")
        .attr("font-size", 14)
        .text("No data available for this selection.");
      return;
    }

    const x = d3
      .scaleLinear()
      .domain(d3.extent(allPoints, (d) => d.year))
      .range([margin.left, width - margin.right]);

    const y = d3
      .scaleLinear()
      .domain([
        0,
        d3.max(allPoints, (d) => d.value) * 1.1,
      ])
      .nice()
      .range([height - margin.bottom, margin.top]);

    svg
      .append("g")
      .attr("transform", `translate(0,${height - margin.bottom})`)
      .call(d3.axisBottom(x).tickFormat(d3.format("d")));

    svg
      .append("g")
      .attr("transform", `translate(${margin.left},0)`)
      .call(d3.axisLeft(y));

    // 2013 baseline
    const xDomain = x.domain();
    [2013, 2019].forEach((referenceYear) => {
      if (referenceYear >= xDomain[0] && referenceYear <= xDomain[1]) {
        svg
          .append("line")
          .attr("x1", x(referenceYear))
          .attr("x2", x(referenceYear))
          .attr("y1", margin.top)
          .attr("y2", height - margin.bottom)
          .attr("stroke", "#999")
          .attr("stroke-dasharray", "5 5");

        svg
          .append("text")
          .attr("x", x(referenceYear) + 6)
          .attr("y", margin.top + (referenceYear === 2013 ? 14 : 30))
          .attr("font-size", 12)
          .attr("fill", "#666")
          .text(String(referenceYear));
      }
    });

    const line = d3
      .line()
      .defined((d) => d.value != null)
      .x((d) => x(d.year))
      .y((d) => y(d.value));

    series.forEach((s) => {
      svg
        .append("path")
        .datum(s.values)
        .attr("fill", "none")
        .attr("stroke", colors[s.key])
        .attr("stroke-width", 3)
        .attr("stroke-dasharray", s.key === "NonBRI" ? "7 5" : null)
        .attr("d", line);

      svg
        .selectAll(`.dot-${s.key}`)
        .data(s.values)
        .enter()
        .append("circle")
        .attr("cx", (d) => x(d.year))
        .attr("cy", (d) => y(d.value))
        .attr("r", 3.5)
        .attr("fill", colors[s.key]);
    });

    if (selectedCountrySeries) {
      svg
        .append("path")
        .datum(selectedCountrySeries.values)
        .attr("fill", "none")
        .attr("stroke", colors.Country)
        .attr("stroke-width", 2.5)
        .attr("stroke-dasharray", "2 4")
        .attr("d", line);

      svg
        .selectAll(".dot-country")
        .data(selectedCountrySeries.values)
        .enter()
        .append("circle")
        .attr("cx", (d) => x(d.year))
        .attr("cy", (d) => y(d.value))
        .attr("r", 2.8)
        .attr("fill", colors.Country);
    }

    svg
      .append("text")
      .attr("x", width / 2)
      .attr("y", height - 10)
      .attr("text-anchor", "middle")
      .attr("font-size", 13)
      .text("Year");

    svg
      .append("text")
      .attr("x", -height / 2)
      .attr("y", 20)
      .attr("transform", "rotate(-90)")
      .attr("text-anchor", "middle")
      .attr("font-size", 13)
      .text(getIndicatorLabel(indicator));

    let title = `Average ${getIndicatorLabel(indicator)}: BRI vs Non-BRI`;
    if (region !== "All") title += ` in ${region}`;
    if (selectedCountrySeries) title += `, with ${selectedCountrySeries.country} overlay`;

    svg
      .append("text")
      .attr("x", margin.left)
      .attr("y", margin.top - 6)
      .attr("font-size", 13)
      .attr("fill", "#444")
      .text(title);
  }

  ///////////////////////////////////////////////////////////
  // Cross-sectional grouped boxplot at selected year

  function renderBoxplot(data, indicator, region, compareYear) {
    const container = d3.select("#boxplot-chart");
    container.selectAll("svg").remove();

    const width = container.node().clientWidth || 900;
    const height = 390;
    const margin = { top: 24, right: 24, bottom: 60, left: 72 };

    const svg = container
      .append("svg")
      .attr("width", width)
      .attr("height", height);

    let filtered = data.filter(
      (d) =>
        d.year === compareYear &&
        d[indicator] != null &&
        (d.group === "BRI" || d.group === "NonBRI")
    );

    if (region !== "All") {
      filtered = filtered.filter((d) => d.region === region);
    }

    const categories =
      region === "All"
        ? ["Africa-BRI", "Africa-NonBRI", "Asia-BRI", "Asia-NonBRI", "Europe-BRI", "Europe-NonBRI"]
        : [`${region}-BRI`, `${region}-NonBRI`];

    const grouped = categories
      .map((cat) => {
        const [catRegion, catGroup] = cat.split("-");
        const values = filtered
          .filter((d) => d.region === catRegion && d.group === catGroup)
          .map((d) => d[indicator])
          .sort(d3.ascending);

        return { category: cat, values };
      })
      .filter((d) => d.values.length > 0);

    if (!grouped.length) {
      svg
        .append("text")
        .attr("x", width / 2)
        .attr("y", height / 2)
        .attr("text-anchor", "middle")
        .attr("font-size", 14)
        .text("No cross-sectional data available for this year.");
      return;
    }

    const x = d3
      .scaleBand()
      .domain(grouped.map((d) => d.category))
      .range([margin.left, width - margin.right])
      .padding(0.3);

    const allValues = grouped.flatMap((d) => d.values);
    const y = d3
      .scaleLinear()
      .domain([0, d3.max(allValues) * 1.1])
      .nice()
      .range([height - margin.bottom, margin.top]);

    svg
      .append("g")
      .attr("transform", `translate(0,${height - margin.bottom})`)
      .call(d3.axisBottom(x))
      .selectAll("text")
      .attr("font-size", 11)
      .attr("transform", "rotate(-15)")
      .style("text-anchor", "end");

    svg
      .append("g")
      .attr("transform", `translate(${margin.left},0)`)
      .call(d3.axisLeft(y));

    grouped.forEach((d) => {
      const q1 = d3.quantile(d.values, 0.25);
      const median = d3.quantile(d.values, 0.5);
      const q3 = d3.quantile(d.values, 0.75);
      const min = d3.min(d.values);
      const max = d3.max(d.values);

      const boxWidth = x.bandwidth();
      const x0 = x(d.category);
      const groupColor = d.category.includes("NonBRI") ? colors.NonBRI : colors.BRI;

      svg
        .append("line")
        .attr("x1", x0 + boxWidth / 2)
        .attr("x2", x0 + boxWidth / 2)
        .attr("y1", y(min))
        .attr("y2", y(max))
        .attr("stroke", "#666");

      svg
        .append("line")
        .attr("x1", x0 + boxWidth * 0.25)
        .attr("x2", x0 + boxWidth * 0.75)
        .attr("y1", y(min))
        .attr("y2", y(min))
        .attr("stroke", "#666");

      svg
        .append("line")
        .attr("x1", x0 + boxWidth * 0.25)
        .attr("x2", x0 + boxWidth * 0.75)
        .attr("y1", y(max))
        .attr("y2", y(max))
        .attr("stroke", "#666");

      svg
        .append("rect")
        .attr("x", x0)
        .attr("y", y(q3))
        .attr("width", boxWidth)
        .attr("height", y(q1) - y(q3))
        .attr("fill", groupColor)
        .attr("opacity", 0.35)
        .attr("stroke", groupColor);

      svg
        .append("line")
        .attr("x1", x0)
        .attr("x2", x0 + boxWidth)
        .attr("y1", y(median))
        .attr("y2", y(median))
        .attr("stroke", "#333")
        .attr("stroke-width", 2);
    });

    svg
      .append("text")
      .attr("x", margin.left)
      .attr("y", margin.top - 6)
      .attr("font-size", 13)
      .attr("fill", "#444")
      .text(`Distribution of ${getIndicatorLabel(indicator)} in ${compareYear}`);
  }

  ///////////////////////////////////////////////////////////
  // Correlation heatmap on real data

  function renderHeatmap(data, region, country) {
    const container = d3.select("#heatmap-chart");
    container.selectAll("*").remove();

    const width = container.node().clientWidth || 360;
    const height = 300;
    const margin = { top: 54, right: 20, bottom: 30, left: 92 };

    const svg = container
      .append("svg")
      .attr("width", width)
      .attr("height", height);

    let filtered = data;

    if (region !== "All") {
      filtered = filtered.filter((d) => d.region === region);
    }
    if (country && country !== "All Countries") {
      filtered = filtered.filter((d) => d.country === country);
    }

    const vars = [
      { key: "gdp", label: "GDP" },
      { key: "internet", label: "Internet" },
      { key: "electricity", label: "Electricity" },
    ];

    const heatmapData = [];
    vars.forEach((rowVar) => {
      vars.forEach((colVar) => {
        const corr = correlation(
          filtered.map((d) => d[colVar.key]),
          filtered.map((d) => d[rowVar.key])
        );
        heatmapData.push({
          x: colVar.label,
          y: rowVar.label,
          value: corr,
        });
      });
    });

    const labels = vars.map((d) => d.label);

    const x = d3
      .scaleBand()
      .domain(labels)
      .range([margin.left, width - margin.right])
      .padding(0.05);

    const y = d3
      .scaleBand()
      .domain(labels)
      .range([margin.top, height - margin.bottom])
      .padding(0.05);

    const color = d3
      .scaleSequential()
      .domain([-1, 1])
      .interpolator(d3.interpolateBlues);

    svg
      .append("g")
      .attr("transform", `translate(0,${margin.top})`)
      .call(d3.axisTop(x));

    svg
      .append("g")
      .attr("transform", `translate(${margin.left},0)`)
      .call(d3.axisLeft(y));

    svg
      .selectAll("rect.cell")
      .data(heatmapData)
      .enter()
      .append("rect")
      .attr("x", (d) => x(d.x))
      .attr("y", (d) => y(d.y))
      .attr("width", x.bandwidth())
      .attr("height", y.bandwidth())
      .attr("fill", (d) => (d.value == null ? "#eee" : color(d.value)));

    svg
      .selectAll("text.cell-label")
      .data(heatmapData)
      .enter()
      .append("text")
      .attr("x", (d) => x(d.x) + x.bandwidth() / 2)
      .attr("y", (d) => y(d.y) + y.bandwidth() / 2 + 4)
      .attr("text-anchor", "middle")
      .attr("font-size", 11)
      .attr("fill", (d) =>
        d.value != null && Math.abs(d.value) > 0.55 ? "white" : "#222"
      )
      .text((d) => (d.value == null ? "NA" : d.value.toFixed(2)));

    let subtitle = "All data";
    if (region !== "All") subtitle = region;
    if (country && country !== "All Countries") subtitle += `, ${country}`;

    svg
      .append("text")
      .attr("x", margin.left)
      .attr("y", margin.top - 24)
      .attr("font-size", 13)
      .attr("fill", "#444")
      .text(`Correlation view (${subtitle})`);
  }

  ///////////////////////////////////////////////////////////
  // Panels

  function renderLegend() {
    const panel = document.getElementById("legend-panel");
    if (!panel) return;

    panel.innerHTML = `
      <div class="legend-list">
        <div class="legend-item">
          <span class="legend-color" style="background:${colors.BRI}"></span>
          <span>BRI group average</span>
        </div>
        <div class="legend-item">
          <span class="legend-color" style="background:${colors.NonBRI}"></span>
          <span>Non-BRI group average</span>
        </div>
        <div class="legend-item">
          <span class="legend-color" style="background:${colors.Country}"></span>
          <span>Selected country overlay</span>
        </div>
        <div style="font-size:1.25rem;color:#666;">
          Dashed colored line = Non-BRI. Black dotted line = selected country.
        </div>
      </div>
    `;
  }

  function renderRegionPanel(region = "All", country = "All Countries") {
    const panel = document.getElementById("region-filter-panel");
    if (!panel) return;

    panel.innerHTML = `
      <div class="filter-panel">
        <strong>Current filters</strong>
        <div>Region: ${region}</div>
        <div>Country: ${country}</div>
        <div>Main chart compares aggregated BRI and non-BRI trajectories.</div>
      </div>
    `;
  }

  function renderTooltipPanel(text) {
    const panel = document.getElementById("tooltip-panel");
    if (!panel) return;

    panel.innerHTML = `
      <div class="tooltip-box">
        <strong>Info panel</strong>
        <div>${text}</div>
      </div>
    `;
  }
});