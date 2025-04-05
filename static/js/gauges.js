function createGauge(containerId, value, min, max, title, unit) {
    // Calculate angle based on value
    const percentage = (value - min) / (max - min);
    const angle = percentage * 240 - 120; // 240 degree sweep, starting at -120

    // Create SVG elements
    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("viewBox", "0 0 100 100");
    svg.setAttribute("class", "gauge");

    // Background circle
    const bgCircle = document.createElementNS(svgNS, "circle");
    bgCircle.setAttribute("cx", "50");
    bgCircle.setAttribute("cy", "50");
    bgCircle.setAttribute("r", "45");
    bgCircle.setAttribute("fill", "none");
    bgCircle.setAttribute("stroke", "#ddd");
    bgCircle.setAttribute("stroke-width", "10");
    svg.appendChild(bgCircle);

    // Value arc
    const arcX = 50 + 45 * Math.cos(angle * Math.PI / 180);
    const arcY = 50 + 45 * Math.sin(angle * Math.PI / 180);
    const largeArcFlag = angle > 0 ? 1 : 0;
    const path = document.createElementNS(svgNS, "path");
    path.setAttribute("d", `M50,50 L50,5 A45,45 0 ${largeArcFlag},1 ${arcX},${arcY} L50,50`);
    path.setAttribute("fill", "#0077cc");
    path.setAttribute("id", `${containerId}-path`);
    svg.appendChild(path);

    // Center dot
    const centerDot = document.createElementNS(svgNS, "circle");
    centerDot.setAttribute("cx", "50");
    centerDot.setAttribute("cy", "50");
    centerDot.setAttribute("r", "5");
    centerDot.setAttribute("fill", "#333");
    svg.appendChild(centerDot);

    // Value text
    const valueText = document.createElementNS(svgNS, "text");
    valueText.setAttribute("x", "50");
    valueText.setAttribute("y", "65");
    valueText.setAttribute("text-anchor", "middle");
    valueText.setAttribute("font-size", "15");
    valueText.setAttribute("id", `${containerId}-value`);
    valueText.textContent = value + (unit ? ' ' + unit : '');
    svg.appendChild(valueText);

    // Title text
    const titleText = document.createElementNS(svgNS, "text");
    titleText.setAttribute("x", "50");
    titleText.setAttribute("y", "80");
    titleText.setAttribute("text-anchor", "middle");
    titleText.setAttribute("font-size", "8");
    titleText.textContent = title;
    svg.appendChild(titleText);

    // Clear and add to container
    const container = document.getElementById(containerId);
    container.innerHTML = '';
    container.appendChild(svg);
}
  
function updateGauge(containerId, value, min, max, unit) {
    // Update value text
    const valueText = document.getElementById(`${containerId}-value`);
    valueText.textContent = value + (unit ? ' ' + unit : '');

    // Update arc
    const percentage = (value - min) / (max - min);
    const angle = percentage * 240 - 120;
    const arcX = 50 + 45 * Math.cos(angle * Math.PI / 180);
    const arcY = 50 + 45 * Math.sin(angle * Math.PI / 180);
    const largeArcFlag = angle > 0 ? 1 : 0;
    const path = document.getElementById(`${containerId}-path`);
    path.setAttribute("d", `M50,50 L50,5 A45,45 0 ${largeArcFlag},1 ${arcX},${arcY} L50,50`);
}