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
    { root: null, threshold: 0, rootMargin: "-80px" }
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
// Dashboard charts

document.addEventListener("DOMContentLoaded", function () {
  const indicatorSelect = document.getElementById("indicator-select");
  const regionSelect = document.getElementById("region-select");
  const snapshotYearInput = document.getElementById("snapshot-year");
  const snapshotYearValue = document.getElementById("snapshot-year-value");
  const snapshotRegionSelect = document.getElementById("snapshot-region");
  const changeIndicatorSelect = document.getElementById("change-indicator-select");
  const changeYearInput = document.getElementById("change-year");
  const changeYearValue = document.getElementById("change-year-value");

  const indicators = [
    {
      key: "gdp growth",
      label: "GDP growth",
      column: "GDP growth (annual %)",
      shortLabel: "GDP Growth",
    },
    {
      key: "gdp",
      label: "GDP per capita",
      column: "GDP per capita (current US$)",
      shortLabel: "GDP per capita",
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
    {
      key: "exports",
      label: "Exports of goods and services",
      column: "Exports of goods and services (current US$)",
      shortLabel: "Exports",
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
    if (text.includes("bri")) return "BRI";
    return "Other";
  }

  function getIndicatorLabel(key) {
    const found = indicators.find((d) => d.key === key);
    return found ? found.label : key;
  }

  function formatValue(v) {
    if (v == null || Number.isNaN(v)) return "NA";
    if (Math.abs(v) >= 1000000) return d3.format(".2s")(v);
    if (Math.abs(v) >= 1000) return d3.format(",.0f")(v);
    return d3.format(".2f")(v);
  }

  function niceGroupLabel(group) {
    return group === "NonBRI" ? "Non-BRI" : group;
  }

  indicatorSelect.innerHTML = "";
  changeIndicatorSelect.innerHTML = "";

  indicators.forEach((d) => {
    const optionA = document.createElement("option");
    optionA.value = d.key;
    optionA.textContent = d.label;
    indicatorSelect.appendChild(optionA);

    const optionB = document.createElement("option");
    optionB.value = d.key;
    optionB.textContent = d.label;
    changeIndicatorSelect.appendChild(optionB);
  });

  indicatorSelect.value = "gdp growth";
  changeIndicatorSelect.value = "internet";

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

  renderRegionPanel();
  renderTooltipPanel("Loading data...");

  d3.csv("data/Final_Imputed_Panel_Data.csv")
    .then((raw) => {
      const data = raw
        .map((d) => ({
          country: d["Country Name"],
          code: d["Country Code"],
          year: toNumber(d["Year"]),
          regionRaw: d["Region"],
          region: cleanRegion(d["Region"]),
          didGroupRaw: d["DID_Group"],
          group: cleanGroup(d["DID_Group"]),
          "gdp growth": toNumber(d["GDP growth (annual %)"]),
          gdp: toNumber(d["GDP per capita (current US$)"]),
          internet: toNumber(d["Individuals using the Internet (% of population)"]),
          electricity: toNumber(d["Access to electricity (% of population)"]),
          exports: toNumber(d["Exports of goods and services (current US$)"]),
        }))
        .filter((d) => d.year != null && d.country);

      const availableRegions = [
        "All",
        ...Array.from(new Set(data.map((d) => d.region).filter((r) => r !== "Other"))).sort(),
      ];

      regionSelect.innerHTML = "";
      snapshotRegionSelect.innerHTML = "";
      availableRegions.forEach((r) => {
        const optionA = document.createElement("option");
        optionA.value = r;
        optionA.textContent = r;
        regionSelect.appendChild(optionA);

        const optionB = document.createElement("option");
        optionB.value = r;
        optionB.textContent = r;
        snapshotRegionSelect.appendChild(optionB);
      });
      regionSelect.value = "All";
      snapshotRegionSelect.value = "All";

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

      if (snapshotYearInput) {
        snapshotYearInput.min = String(minYear);
        snapshotYearInput.max = String(maxYear);
        snapshotYearInput.value = String(Math.min(2019, maxYear));
      }
      if (snapshotYearValue && snapshotYearInput) snapshotYearValue.textContent = snapshotYearInput.value;

      if (changeYearInput) {
        changeYearInput.min = String(Math.max(2014, minYear));
        changeYearInput.max = String(maxYear);
        changeYearInput.value = String(Math.min(2019, maxYear));
      }
      if (changeYearValue && changeYearInput) changeYearValue.textContent = changeYearInput.value;

      function updateAll() {
        const indicator = indicatorSelect.value;
        const region = regionSelect.value;
        const country = countrySelect.value;
        renderLineChart(data, indicator, region, country);
        renderRegionPanel(region, country);
        renderTooltipPanel(
          `Indicator: ${getIndicatorLabel(indicator)}. Region: ${region}. Country overlay: ${country}. Dashed vertical lines mark 2013 (BRI launch) and 2019.`
        );
      }

      function updateSnapshot() {
        const year = +snapshotYearInput.value;
        const region = snapshotRegionSelect.value;
        snapshotYearValue.textContent = String(year);
        renderSnapshotScatter(data, year, region);
      }

      function updateChange() {
        const indicator = changeIndicatorSelect.value;
        const endYear = +changeYearInput.value;
        changeYearValue.textContent = String(endYear);
        renderChangeBars(data, indicator, endYear);
      }

      indicatorSelect.addEventListener("change", updateAll);
      regionSelect.addEventListener("change", updateAll);
      countrySelect.addEventListener("change", updateAll);
      snapshotYearInput.addEventListener("input", updateSnapshot);
      snapshotRegionSelect.addEventListener("change", updateSnapshot);
      changeIndicatorSelect.addEventListener("change", updateChange);
      changeYearInput.addEventListener("input", updateChange);

      updateAll();
      updateSnapshot();
      updateChange();
    })
    .catch((error) => {
      console.error("CSV load failed:", error);
      renderTooltipPanel(`Failed to load CSV: ${error.message}`);
    });

  function renderLineChart(data, indicator, region, country) {
    const container = d3.select("#line-chart");
    if (container.empty()) return;
    container.selectAll("*").remove();

    const width = container.node().clientWidth || 900;
    const height = 460;
    const margin = { top: 24, right: 40, bottom: 54, left: 80 };

    const svg = container.append("svg").attr("width", width).attr("height", height);

    let filtered = data.filter((d) => d[indicator] != null);
    if (region !== "All") filtered = filtered.filter((d) => d.region === region);

    const groupFiltered = filtered.filter((d) => d.group === "BRI" || d.group === "NonBRI");

    const grouped = d3.rollups(
      groupFiltered,
      (v) => d3.mean(v, (d) => d[indicator]),
      (d) => d.group,
      (d) => d.year
    );

    const series = grouped.map(([group, values]) => ({
      key: group,
      values: values.map(([year, value]) => ({ year, value })).sort((a, b) => a.year - b.year),
    })).filter((d) => d.values.length > 0);

    let selectedCountrySeries = null;
    if (country && country !== "All Countries") {
      const countryValues = filtered
        .filter((d) => d.country === country)
        .map((d) => ({ year: d.year, value: d[indicator] }))
        .filter((d) => d.value != null)
        .sort((a, b) => a.year - b.year);
      if (countryValues.length > 0) {
        selectedCountrySeries = { key: "Country", country, values: countryValues };
      }
    }

    const allPoints = [
      ...series.flatMap((s) => s.values),
      ...(selectedCountrySeries ? selectedCountrySeries.values : []),
    ];

    if (!allPoints.length) {
      svg.append("text")
        .attr("x", width / 2)
        .attr("y", height / 2)
        .attr("text-anchor", "middle")
        .attr("font-size", 14)
        .text("No data available for this selection.");
      return;
    }

    const x = d3.scaleLinear().domain(d3.extent(allPoints, (d) => d.year)).range([margin.left, width - margin.right]);
    const yMin = d3.min(allPoints, (d) => d.value);
    const yMax = d3.max(allPoints, (d) => d.value);
    const yPadding = (yMax - yMin) * 0.1 || 1;
    const y = d3.scaleLinear().domain([yMin < 0 ? yMin - yPadding : 0, yMax + yPadding]).nice().range([height - margin.bottom, margin.top]);

    svg.append("g")
      .attr("transform", `translate(0,${height - margin.bottom})`)
      .call(d3.axisBottom(x).tickFormat(d3.format("d")));

    svg.append("g")
      .attr("transform", `translate(${margin.left},0)`)
      .call(d3.axisLeft(y));

    const xDomain = x.domain();
    [2013, 2019].forEach((referenceYear) => {
      if (referenceYear >= xDomain[0] && referenceYear <= xDomain[1]) {
        svg.append("line")
          .attr("x1", x(referenceYear))
          .attr("x2", x(referenceYear))
          .attr("y1", margin.top)
          .attr("y2", height - margin.bottom)
          .attr("stroke", "#999")
          .attr("stroke-dasharray", "5 5");

        svg.append("text")
          .attr("x", x(referenceYear) + 6)
          .attr("y", margin.top + (referenceYear === 2013 ? 14 : 30))
          .attr("font-size", 12)
          .attr("fill", "#666")
          .text(String(referenceYear));
      }
    });

    const line = d3.line().defined((d) => d.value != null).x((d) => x(d.year)).y((d) => y(d.value));

    series.forEach((s) => {
      svg.append("path")
        .datum(s.values)
        .attr("fill", "none")
        .attr("stroke", colors[s.key])
        .attr("stroke-width", 3)
        .attr("stroke-dasharray", s.key === "NonBRI" ? "7 5" : null)
        .attr("d", line);

      svg.selectAll(`.dot-${s.key}`)
        .data(s.values)
        .enter()
        .append("circle")
        .attr("cx", (d) => x(d.year))
        .attr("cy", (d) => y(d.value))
        .attr("r", 3.5)
        .attr("fill", colors[s.key]);
    });

    if (selectedCountrySeries) {
      svg.append("path")
        .datum(selectedCountrySeries.values)
        .attr("fill", "none")
        .attr("stroke", colors.Country)
        .attr("stroke-width", 2.5)
        .attr("stroke-dasharray", "2 4")
        .attr("d", line);

      svg.selectAll(".dot-country")
        .data(selectedCountrySeries.values)
        .enter()
        .append("circle")
        .attr("cx", (d) => x(d.year))
        .attr("cy", (d) => y(d.value))
        .attr("r", 2.8)
        .attr("fill", colors.Country);
    }

    svg.append("text")
      .attr("x", width / 2)
      .attr("y", height - 10)
      .attr("text-anchor", "middle")
      .attr("font-size", 13)
      .text("Year");

    svg.append("text")
      .attr("x", -height / 2)
      .attr("y", 20)
      .attr("transform", "rotate(-90)")
      .attr("text-anchor", "middle")
      .attr("font-size", 13)
      .text(getIndicatorLabel(indicator));

    let title = `Average ${getIndicatorLabel(indicator)}: BRI vs Non-BRI`;
    if (region !== "All") title += ` in ${region}`;
    if (selectedCountrySeries) title += `, with ${selectedCountrySeries.country} overlay`;

    svg.append("text")
      .attr("x", margin.left)
      .attr("y", margin.top - 6)
      .attr("font-size", 13)
      .attr("fill", "#444")
      .text(title);
  }

  function renderSnapshotScatter(data, year, region) {
    const container = d3.select("#snapshot-chart");
    if (container.empty()) return;
    container.selectAll("*").remove();

    const width = container.node().clientWidth || 900;
    const height = 460;
    const margin = { top: 24, right: 30, bottom: 56, left: 80 };

    const svg = container.append("svg").attr("width", width).attr("height", height);

    let filtered = data.filter((d) => d.year === year && d.gdp != null && d.gdp > 0 && d.internet != null && (d.group === "BRI" || d.group === "NonBRI"));
    if (region !== "All") filtered = filtered.filter((d) => d.region === region);

    if (!filtered.length) {
      svg.append("text")
        .attr("x", width / 2)
        .attr("y", height / 2)
        .attr("text-anchor", "middle")
        .text("No snapshot data available for this selection.");
      return;
    }

    const x = d3.scaleLog()
      .domain(d3.extent(filtered, (d) => d.gdp))
      .range([margin.left, width - margin.right])
      .nice();

    const y = d3.scaleLinear()
      .domain([0, d3.max(filtered, (d) => d.internet) * 1.05])
      .nice()
      .range([height - margin.bottom, margin.top]);

    const tooltip = container.append("div")
      .style("position", "absolute")
      .style("opacity", 0)
      .style("pointer-events", "none")
      .style("background", "rgba(33,37,41,0.92)")
      .style("color", "#fff")
      .style("padding", "0.8rem 1.1rem")
      .style("border-radius", "6px")
      .style("font-size", "1.3rem");

    svg.append("g")
      .attr("transform", `translate(0,${height - margin.bottom})`)
      .call(d3.axisBottom(x).ticks(6, "~s"));

    svg.append("g")
      .attr("transform", `translate(${margin.left},0)`)
      .call(d3.axisLeft(y));

    svg.append("g")
      .selectAll("circle")
      .data(filtered)
      .enter()
      .append("circle")
      .attr("cx", (d) => x(d.gdp))
      .attr("cy", (d) => y(d.internet))
      .attr("r", 5.8)
      .attr("fill", (d) => colors[d.group])
      .attr("opacity", 0.75)
      .attr("stroke", "#fff")
      .attr("stroke-width", 1)
      .on("mousemove", function (event, d) {
        tooltip
          .style("opacity", 1)
          .style("left", `${event.offsetX + 20}px`)
          .style("top", `${event.offsetY + 12}px`)
          .html(`<strong>${d.country}</strong><br>${niceGroupLabel(d.group)}<br>GDP per capita: ${formatValue(d.gdp)}<br>Internet users: ${formatValue(d.internet)}%`);
      })
      .on("mouseout", function () {
        tooltip.style("opacity", 0);
      });

    const legend = svg.append("g").attr("transform", `translate(${width - 180},${margin.top + 4})`);
    ["BRI", "NonBRI"].forEach((group, i) => {
      legend.append("circle")
        .attr("cx", 0)
        .attr("cy", i * 22)
        .attr("r", 6)
        .attr("fill", colors[group]);
      legend.append("text")
        .attr("x", 14)
        .attr("y", i * 22 + 4)
        .attr("font-size", 12)
        .attr("fill", "#444")
        .text(niceGroupLabel(group));
    });

    svg.append("text")
      .attr("x", width / 2)
      .attr("y", height - 10)
      .attr("text-anchor", "middle")
      .attr("font-size", 13)
      .text("GDP per capita (log scale)");

    svg.append("text")
      .attr("x", -height / 2)
      .attr("y", 20)
      .attr("transform", "rotate(-90)")
      .attr("text-anchor", "middle")
      .attr("font-size", 13)
      .text("Individuals using the Internet (% of population)");

    let title = `Country snapshot for ${year}`;
    if (region !== "All") title += ` in ${region}`;
    svg.append("text")
      .attr("x", margin.left)
      .attr("y", margin.top - 6)
      .attr("font-size", 13)
      .attr("fill", "#444")
      .text(title);
  }

  function renderChangeBars(data, indicator, endYear) {
    const container = d3.select("#change-chart");
    if (container.empty()) return;
    container.selectAll("*").remove();

    const width = container.node().clientWidth || 900;
    const height = 430;
    const margin = { top: 24, right: 28, bottom: 44, left: 170 };
    const svg = container.append("svg").attr("width", width).attr("height", height);

    const baseYear = 2013;
    const regions = ["Africa", "Asia", "Europe"];
    const groups = ["BRI", "NonBRI"];

    const rows = [];
    regions.forEach((region) => {
      groups.forEach((group) => {
        const startVals = data.filter((d) => d.year === baseYear && d.region === region && d.group === group && d[indicator] != null).map((d) => d[indicator]);
        const endVals = data.filter((d) => d.year === endYear && d.region === region && d.group === group && d[indicator] != null).map((d) => d[indicator]);
        if (startVals.length && endVals.length) {
          rows.push({
            category: `${region} · ${niceGroupLabel(group)}`,
            region,
            group,
            start: d3.mean(startVals),
            end: d3.mean(endVals),
            delta: d3.mean(endVals) - d3.mean(startVals),
          });
        }
      });
    });

    if (!rows.length) {
      svg.append("text")
        .attr("x", width / 2)
        .attr("y", height / 2)
        .attr("text-anchor", "middle")
        .text("No data available for this change view.");
      return;
    }

    rows.sort((a, b) => d3.descending(a.delta, b.delta));

    const xExtent = d3.extent(rows, (d) => d.delta);
    const maxAbs = Math.max(Math.abs(xExtent[0] || 0), Math.abs(xExtent[1] || 0)) || 1;
    const x = d3.scaleLinear().domain([-maxAbs * 1.15, maxAbs * 1.15]).range([margin.left, width - margin.right]);
    const y = d3.scaleBand().domain(rows.map((d) => d.category)).range([margin.top, height - margin.bottom]).padding(0.24);

    svg.append("line")
      .attr("x1", x(0))
      .attr("x2", x(0))
      .attr("y1", margin.top)
      .attr("y2", height - margin.bottom)
      .attr("stroke", "#9aa1a8")
      .attr("stroke-dasharray", "4 4");

    svg.append("g")
      .attr("transform", `translate(0,${height - margin.bottom})`)
      .call(d3.axisBottom(x).ticks(6));

    svg.append("g")
      .attr("transform", `translate(${margin.left},0)`)
      .call(d3.axisLeft(y));

    svg.selectAll("rect.bar")
      .data(rows)
      .enter()
      .append("rect")
      .attr("class", "bar")
      .attr("x", (d) => Math.min(x(0), x(d.delta)))
      .attr("y", (d) => y(d.category))
      .attr("width", (d) => Math.abs(x(d.delta) - x(0)))
      .attr("height", y.bandwidth())
      .attr("fill", (d) => colors[d.group])
      .attr("opacity", 0.82);

    svg.selectAll("text.value")
      .data(rows)
      .enter()
      .append("text")
      .attr("class", "value")
      .attr("x", (d) => d.delta >= 0 ? x(d.delta) + 6 : x(d.delta) - 6)
      .attr("y", (d) => y(d.category) + y.bandwidth() / 2 + 4)
      .attr("text-anchor", (d) => d.delta >= 0 ? "start" : "end")
      .attr("font-size", 12)
      .attr("fill", "#333")
      .text((d) => d3.format(".2f")(d.delta));

    const legend = svg.append("g").attr("transform", `translate(${width - 180},${margin.top + 4})`);
    ["BRI", "NonBRI"].forEach((group, i) => {
      legend.append("rect")
        .attr("x", 0)
        .attr("y", i * 22 - 8)
        .attr("width", 12)
        .attr("height", 12)
        .attr("fill", colors[group]);
      legend.append("text")
        .attr("x", 18)
        .attr("y", i * 22 + 2)
        .attr("font-size", 12)
        .attr("fill", "#444")
        .text(niceGroupLabel(group));
    });

    svg.append("text")
      .attr("x", width / 2)
      .attr("y", height - 10)
      .attr("text-anchor", "middle")
      .attr("font-size", 13)
      .text(`Change in average ${getIndicatorLabel(indicator)} from ${baseYear} to ${endYear}`);

    svg.append("text")
      .attr("x", margin.left)
      .attr("y", margin.top - 6)
      .attr("font-size", 13)
      .attr("fill", "#444")
      .text(`Regional average change after the BRI launch (${baseYear} → ${endYear})`);
  }

  function renderRegionPanel(region = "All", country = "All Countries") {
    const panel = document.getElementById("region-filter-panel");
    if (!panel) return;
    panel.innerHTML = `
      <div class="filter-panel">
        <div class="insight-title">Current filters</div>
        <div>Region: <strong>${region}</strong></div>
        <div>Country overlay: <strong>${country}</strong></div>
        <div>The line chart compares aggregated BRI and non-BRI trajectories, while the dotted black line shows the selected country.</div>
      </div>
    `;
  }

  function renderTooltipPanel(text) {
    const panel = document.getElementById("tooltip-panel");
    if (!panel) return;
    panel.innerHTML = `
      <div class="tooltip-box">
        <div class="insight-title">How to read this view</div>
        <div>${text}</div>
      </div>
    `;
  }
});
