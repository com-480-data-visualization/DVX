function getIso3(d) {
  return (
    d.properties.ISO_A3 ||
    d.properties.ISO3 ||
    d.properties.ADM0_A3 ||
    d.properties.SOV_A3 ||
    d.properties["ISO3166-1-Alpha-3"] ||
    d.id
  );
}

function getCountryName(d) {
  return (
    d.properties.ADMIN ||
    d.properties.NAME ||
    d.properties.name ||
    d.properties.NAME_EN ||
    "Unknown country"
  );
}

async function drawWorldMap() {
  const mapElement = document.querySelector("#world-map");
  if (!mapElement) return;

  const width = mapElement.clientWidth;
  const height = mapElement.clientHeight || 540;

  const svg = d3
    .select("#world-map")
    .append("svg")
    .attr("width", width)
    .attr("height", height)
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("preserveAspectRatio", "xMidYMid meet")
    .style("touch-action", "none");
  const mapLayer = svg.append("g").attr("class", "map-layer");
  svg.append("rect").attr("width", width).attr("height", height).attr("fill", "transparent").style("pointer-events", "none");
  const tooltip = d3.select("#world-map").append("div").attr("class", "map-tooltip");

  const projection = d3.geoNaturalEarth1().scale(width / 5.8).rotate([-100, 0]).translate([width / 2, height / 2]);
  const path = d3.geoPath().projection(projection);

  const zoom = d3
    .zoom()
    .scaleExtent([1, 7])
    .translateExtent([
      [0, 0],
      [width, height],
    ])
    .extent([
      [0, 0],
      [width, height],
    ])
    .on("zoom", function (event) {
      mapLayer.attr("transform", event.transform);
    });

  svg.call(zoom);
  const resetButton = d3.select("#map-reset-zoom");
  if (!resetButton.empty()) {
    resetButton.on("click", function () {
      svg.transition().duration(450).call(zoom.transform, d3.zoomIdentity);
    });
  }

  let world;
  let statusData;

  try {
    world = await d3.json("data/world.geojson");
    statusData = await d3.csv("data/bri_country_status.csv");
  } catch (error) {
    console.error("Failed to load map data:", error);
    d3.select("#country-info").html(
      "Map data failed to load. Check whether data/world.geojson and data/bri_country_status.csv exist."
    );
    return;
  }

  const statusByIso = new Map();
  statusData.forEach(function (d) {
    const iso3 = d.iso3.trim().toUpperCase();
    let status = "unknown";
    const text = `${d.group || ""} ${d.status || ""}`.toLowerCase();

    if (text.includes("china")) status = "china";
    else if (text.includes("non-bri") || text.includes("control")) status = "non_bri";
    else if (text.includes("bri")) status = "bri";

    statusByIso.set(iso3, {
      iso3,
      country: d.country,
      region: d.region,
      status,
    });
  });

  const colorScale = d3.scaleOrdinal()
    .domain(["china", "bri", "non_bri", "unknown"])
    .range(["#d9480f", "#2f9e44", "#adb5bd", "#e9ecef"]);

  mapLayer
    .selectAll("path")
    .data(world.features)
    .join("path")
    .attr("class", "country")
    .attr("d", path)
    .attr("fill", function (d) {
      const iso3 = getIso3(d);
      if (!iso3) return colorScale("unknown");
      const record = statusByIso.get(iso3.trim().toUpperCase());
      return record ? colorScale(record.status) : colorScale("unknown");
    })
    .on("mouseover", function (event, d) {
      const iso3 = getIso3(d);
      const countryName = getCountryName(d);
      const record = iso3 ? statusByIso.get(iso3.trim().toUpperCase()) : null;
      let statusText = "No data";
      if (record) {
        if (record.status === "china") statusText = "China";
        else if (record.status === "bri") statusText = "BRI country";
        else if (record.status === "non_bri") statusText = "Non-BRI country";
      }

      tooltip.style("opacity", 1).html(`<strong>${countryName}</strong><br>${statusText}`);
    })
    .on("mousemove", function (event) {
      tooltip.style("left", event.offsetX + 14 + "px").style("top", event.offsetY + 14 + "px");
    })
    .on("mouseout", function () {
      tooltip.style("opacity", 0);
    })
    .on("click", function (event, d) {
      const iso3 = getIso3(d);
      const countryName = getCountryName(d);

      if (!iso3) {
        d3.select("#country-info").html(`<strong>${countryName}</strong><br>No ISO3 code found for this country.`);
        return;
      }

      const record = statusByIso.get(iso3.trim().toUpperCase());
      if (!record) {
        d3.select("#country-info").html(`<strong>${countryName}</strong><br>ISO3: ${iso3}<br>No BRI classification available.`);
        return;
      }

      let statusLabel = record.status;
      if (record.status === "china") statusLabel = "China";
      else if (record.status === "bri") statusLabel = "BRI country";
      else if (record.status === "non_bri") statusLabel = "Non-BRI country";

      d3.select("#country-info").html(`
        <strong>${record.country}</strong><br>
        ISO3: ${record.iso3}<br>
        Status: ${statusLabel}<br>
        Region: ${record.region}
      `);
      drawRadarChart(record.iso3, record.country);
    });

  const legendData = [
    { label: "China", status: "china" },
    { label: "BRI countries", status: "bri" },
    { label: "Non-BRI countries", status: "non_bri" },
    { label: "No data", status: "unknown" },
  ];

  const legend = svg.append("g").attr("transform", "translate(24, 24)");
  legend.selectAll("rect")
    .data(legendData)
    .join("rect")
    .attr("x", 0)
    .attr("y", (d, i) => i * 28)
    .attr("width", 18)
    .attr("height", 18)
    .attr("fill", (d) => colorScale(d.status));

  legend.selectAll("text")
    .data(legendData)
    .join("text")
    .attr("x", 28)
    .attr("y", (d, i) => i * 28 + 14)
    .text((d) => d.label)
    .attr("font-size", "14px")
    .attr("fill", "#333");
}

drawWorldMap();

let selectedRadarCountry = null;
let selectedRadarYear = 2020;
let radarPlayTimer = null;
let radarIsPlaying = false;
let radarDataPromise = null;
let radarDataCache = null;

function getRadarData() {
  if (radarDataCache) return Promise.resolve(radarDataCache);
  if (!radarDataPromise) {
    radarDataPromise = d3.csv("data/Final_Imputed_Panel_Data.csv").then(function (data) {
      radarDataCache = data;
      return data;
    });
  }
  return radarDataPromise;
}

const radarIndicators = [
  { label: "GDP per capita", column: "GDP per capita (current US$)" },
  { label: "Electricity", column: "Access to electricity (% of population)" },
  { label: "Internet", column: "Individuals using the Internet (% of population)" },
  { label: "Exports", column: "Exports of goods and services (current US$)" },
  { label: "GNI per capita", column: "GNI per capita, Atlas method (current US$)" },
  { label: "GDP growth", column: "GDP growth (annual %)" },
];

function stopRadarYearAnimation() {
  if (radarPlayTimer !== null) clearInterval(radarPlayTimer);
  radarPlayTimer = null;
  radarIsPlaying = false;
  const playButton = d3.select("#radar-play-button");
  if (!playButton.empty()) playButton.text("▶ Play");
}

function toggleRadarYearAnimation(years) {
  const minYear = d3.min(years);
  const maxYear = d3.max(years);
  if (radarIsPlaying) {
    stopRadarYearAnimation();
    return;
  }
  if (selectedRadarYear >= maxYear) selectedRadarYear = minYear;
  radarIsPlaying = true;
  const playButton = d3.select("#radar-play-button");
  if (!playButton.empty()) playButton.text("⏸ Pause");

  radarPlayTimer = setInterval(function () {
    const currentCountry = selectedRadarCountry;
    if (!currentCountry) {
      stopRadarYearAnimation();
      return;
    }
    if (selectedRadarYear >= maxYear) {
      stopRadarYearAnimation();
      return;
    }
    selectedRadarYear += 1;
    drawRadarChart(currentCountry.iso3, currentCountry.countryName, true);
  }, 500);
}

async function drawRadarChart(iso3, countryName, keepPlaying = false) {
  selectedRadarCountry = { iso3, countryName };
  if (!keepPlaying) stopRadarYearAnimation();

  const allData = await getRadarData();
  const years = Array.from(new Set(allData.map((d) => +d["Year"]).filter((d) => !isNaN(d)))).sort((a, b) => a - b);
  if (!years.includes(selectedRadarYear)) selectedRadarYear = d3.max(years);

  const yearData = allData.filter((d) => +d["Year"] === selectedRadarYear);
  const countryRow = yearData.find((d) => d["Country Code"] === iso3);

  d3.select("#country-info").html(`
    <div class="radar-header">
      <div>
        <h3 class="radar-title">${countryName} Development Profile</h3>
        <p class="radar-subtitle">Each axis is normalized to a 0–100 score relative to countries in the dataset.</p>
      </div>
      <div class="radar-year-control">
        <div class="radar-year-top">
          <span>Year: <strong id="radar-year-label">${selectedRadarYear}</strong></span>
          <button id="radar-play-button" class="radar-play-button" type="button">▶ Play</button>
        </div>
        <input id="radar-year-slider" class="radar-year-slider" type="range" min="${d3.min(years)}" max="${d3.max(years)}" step="1" value="${selectedRadarYear}" />
        <div class="radar-year-scale"><span>${d3.min(years)}-</span><span>${d3.max(years)}</span></div>
      </div>
    </div>
    <div id="radar-chart"></div>
  `);

  const yearSlider = d3.select("#radar-year-slider");
  const yearLabel = d3.select("#radar-year-label");
  const playButton = d3.select("#radar-play-button");

  yearSlider.on("input", function () {
    selectedRadarYear = +this.value;
    yearLabel.text(selectedRadarYear);
    drawRadarChart(selectedRadarCountry.iso3, selectedRadarCountry.countryName);
  });

  playButton.on("click", function () {
    toggleRadarYearAnimation(years);
  });
  d3.select("#radar-play-button").text(radarIsPlaying ? "⏸ Pause" : "▶ Play");

  if (!countryRow) {
    d3.select("#radar-chart").html(`<p class="radar-empty">No WDI data available for ${countryName} in ${selectedRadarYear}.</p>`);
    return;
  }

  const radarValues = radarIndicators.map((indicator) => {
    const values = yearData.map((d) => +d[indicator.column]).filter((v) => !isNaN(v));
    const minValue = d3.min(values);
    const maxValue = d3.max(values);
    const rawValue = +countryRow[indicator.column];
    let score = 0;
    if (!isNaN(rawValue) && maxValue !== minValue) score = ((rawValue - minValue) / (maxValue - minValue)) * 100;
    return { axis: indicator.label, value: score, rawValue };
  });

  const width = 600;
  const height = 600;
  const margin = 90;
  const radius = Math.min(width, height) / 2 - margin;
  const levels = 5;
  const angleSlice = (Math.PI * 2) / radarValues.length;

  const svg = d3.select("#radar-chart").append("svg").attr("viewBox", `0 0 ${width} ${height}`).attr("class", "radar-svg");
  const g = svg.append("g").attr("transform", `translate(${width / 2 + 13}, ${height / 2})`);
  const rScale = d3.scaleLinear().domain([0, 100]).range([0, radius]);

  for (let level = 1; level <= levels; level++) {
    const levelValue = (100 / levels) * level;
    const points = radarValues.map((d, i) => {
      const angle = angleSlice * i - Math.PI / 2;
      return [rScale(levelValue) * Math.cos(angle), rScale(levelValue) * Math.sin(angle)];
    });
    g.append("polygon").attr("points", points.map((d) => d.join(",")).join(" ")).attr("class", "radar-grid");
    g.append("text").attr("x", 4).attr("y", -rScale(levelValue)).attr("class", "radar-level-label").text(levelValue);
  }

  radarValues.forEach((d, i) => {
    const angle = angleSlice * i - Math.PI / 2;
    const x = radius * Math.cos(angle);
    const y = radius * Math.sin(angle);
    const isRightSide = Math.cos(angle) > 0.35;
    const isLeftSide = Math.cos(angle) < -0.35;
    const labelRadius = radius + 25;
    const verticalNudge = Math.sin(angle) > 0.35 ? 6 : Math.sin(angle) < -0.35 ? -6 : 0;
    g.append("line").attr("x1", 0).attr("y1", 0).attr("x2", x).attr("y2", y).attr("class", "radar-axis");
    g.append("text")
      .attr("x", labelRadius * Math.cos(angle) + (isRightSide ? 10 : isLeftSide ? -10 : 0))
      .attr("y", labelRadius * Math.sin(angle) + verticalNudge)
      .attr("class", "radar-axis-label")
      .attr("text-anchor", isRightSide ? "start" : isLeftSide ? "end" : "middle")
      .attr("dominant-baseline", "middle")
      .text(d.axis);
  });

  const radarLine = d3.lineRadial().radius((d) => rScale(d.value)).angle((d, i) => i * angleSlice).curve(d3.curveLinearClosed);
  g.append("path").datum(radarValues).attr("class", "radar-area").attr("d", radarLine);

  g.selectAll(".radar-dot")
    .data(radarValues)
    .join("circle")
    .attr("class", "radar-dot")
    .attr("r", 4)
    .attr("cx", (d, i) => {
      const angle = angleSlice * i - Math.PI / 2;
      return rScale(d.value) * Math.cos(angle);
    })
    .attr("cy", (d, i) => {
      const angle = angleSlice * i - Math.PI / 2;
      return rScale(d.value) * Math.sin(angle);
    });

  g.selectAll(".radar-score-label")
    .data(radarValues)
    .join("text")
    .attr("class", "radar-score-label")
    .attr("x", (d, i) => {
      const angle = angleSlice * i - Math.PI / 2;
      return (rScale(d.value) + 16) * Math.cos(angle);
    })
    .attr("y", (d, i) => {
      const angle = angleSlice * i - Math.PI / 2;
      return (rScale(d.value) + 16) * Math.sin(angle);
    })
    .attr("text-anchor", "middle")
    .attr("dominant-baseline", "middle")
    .text((d) => Math.round(d.value));
}
