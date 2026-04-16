document.addEventListener("DOMContentLoaded", function () {
  const lineChart = document.getElementById("line-chart");
  const heatmapChart = document.getElementById("heatmap-chart");
  const boxplotChart = document.getElementById("boxplot-chart");
  const regionFilterPanel = document.getElementById("region-filter-panel");
  const legendPanel = document.getElementById("legend-panel");

  if (lineChart) {
    lineChart.innerHTML = `
      <div style="font-size:1.8rem; text-align:center; padding:4rem;">
        Line chart will go here
      </div>
    `;
  }

  if (heatmapChart) {
    heatmapChart.innerHTML = `
      <div style="font-size:1.4rem; text-align:center; padding:2rem;">
        Heatmap will go here
      </div>
    `;
  }

  if (boxplotChart) {
    boxplotChart.innerHTML = `
      <div style="font-size:1.4rem; text-align:center; padding:2rem;">
        Boxplot will go here
      </div>
    `;
  }

  if (regionFilterPanel) {
    regionFilterPanel.innerHTML = `
      <div style="font-size:1.4rem; text-align:center; padding:2rem;">
        Region filter will go here
      </div>
    `;
  }

  if (legendPanel) {
    legendPanel.innerHTML = `
      <div style="font-size:1.4rem; text-align:center; padding:2rem;">
        Legend / tooltip info will go here
      </div>
    `;
  }
});