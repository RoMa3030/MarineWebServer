function createGauge(containerId, value, min, max, unit, instanceTitle, valueDescr) {
    
    // get required information about size
    const container = document.getElementById(containerId);
    const archThickness = 30;

    const [gaugeBaseHight, centerX, radius] = calculateGaugeDimensions(containerId);

    // prepare SVG object
    const svgns = "http://www.w3.org/2000/svg";
    const gaugeSvg = document.createElementNS(svgns, "svg");
    gaugeSvg.setAttribute("width", container.clientWidth);
    gaugeSvg.setAttribute("height", container.clientHeight);
    gaugeSvg.setAttribute("viewBox", `0 0 ${container.clientWidth} ${container.clientHeight}`);

    // draw background demi circle
    const bgDemiCircle = document.createElementNS(svgns, "path");
    gaugeSvg.appendChild(bgDemiCircle);
    drawGaugeArc(bgDemiCircle, gaugeBaseHight, centerX, radius, 100, "grey", archThickness);
    
    // draw indicator demi circle
    const indicator = document.createElementNS(svgns, "path");
    indicator.setAttribute("id", `${containerId}-indicator`);        // define id, so this element can be updated in other function
    const percentage = getIndicatorPercentage(value, min, max);
    /*console.log("Min / Max: ", min, " / ", max);
    console.log("value: ", value);
    console.log("percentage = ", percentage);*/
    gaugeSvg.appendChild(indicator);
    drawGaugeArc(indicator, gaugeBaseHight, centerX, radius, percentage, "blue", archThickness);

    // instance title
    const titleText = document.createElementNS(svgns, "text");
    const titleFontSize = "2rem";
    titleText.setAttribute("text-anchor", "middle");
    titleText.setAttribute("x", centerX);
    titleText.setAttribute("y", (gaugeBaseHight - radius - 18));
    titleText.setAttribute("font-size", titleFontSize);
    titleText.setAttribute("font-family", "Arial");
    titleText.setAttribute("fill", "#7f8c8d");
    titleText.textContent = instanceTitle;
    gaugeSvg.appendChild(titleText);


    // Value text
    const valueText = document.createElementNS(svgns, "text");
    const valueFontSize = "5rem";
    valueText.setAttribute("text-anchor", "middle");
    valueText.setAttribute("x", centerX);
    valueText.setAttribute("y", gaugeBaseHight-24);
    valueText.setAttribute("font-size", valueFontSize);
    valueText.setAttribute("fill", "#2c3e50");
    valueText.setAttribute("font-weight", "bold");
    valueText.setAttribute("id", `${containerId}-value`);
    valueText.textContent = value // + (unit ? ' ' + unit : '');   // add unit only, if valid string is defined
    gaugeSvg.appendChild(valueText);

    
    // Value desceription
    const valueTitleText = document.createElementNS(svgns, "text");
    const descrFontSize = "2.2rem";
    valueTitleText.setAttribute("text-anchor", "middle");
    valueTitleText.setAttribute("x", centerX);
    valueTitleText.setAttribute("y", (gaugeBaseHight + 30));
    valueTitleText.setAttribute("font-size", descrFontSize);
    valueTitleText.setAttribute("font-family", "Arial");
    valueTitleText.setAttribute("fill", "#7f8c8d");
    valueTitleText.textContent = valueDescr;
    gaugeSvg.appendChild(valueTitleText);

    // Clear and add to container
    container.innerHTML = '';
    container.appendChild(gaugeSvg);
}

function updateGauge(containerId, value) {
    // Update value text
    const valueText = document.getElementById(`${containerId}-value`);
    const container = document.getElementById(containerId);
    const dataType = container.dataset.dataType;
    const unit = getUnit(dataType);
    const min = container.dataset.min;
    const max = container.dataset.max;

    valueText.textContent = value //+ (unit ? unit : '');

    // Update indicator graphic
    const indicator = document.getElementById(`${containerId}-indicator`);
    const [gaugeBaseHight, centerX, radius] = calculateGaugeDimensions(containerId);
    const percentage = getIndicatorPercentage(value, min, max);
    drawGaugeArc(indicator, gaugeBaseHight, centerX, radius, percentage, "blue", 30);
}

function clearGauge(containerId) {
    // Update value text
    const valueText = document.getElementById(`${containerId}-value`);
    const container = document.getElementById(containerId);
    const min = container.dataset.min;
    const max = container.dataset.max;

    valueText.textContent = "---";

    // Update indicator graphic
    const indicator = document.getElementById(`${containerId}-indicator`);
    const [gaugeBaseHight, centerX, radius] = calculateGaugeDimensions(containerId);
    drawGaugeArc(indicator, gaugeBaseHight, centerX, radius, 0, "blue", 30);
}

function calculateGaugeDimensions(containerId){
    const container = document.getElementById(containerId);
    const containerW = container.clientWidth
    const containerH = container.clientHeight
    const gaugeSize = Math.min(containerW, containerH);
    const centerX = Math.round(containerW / 2);
    const centerY = Math.round(containerH / 2);

    const radius = Math.round(gaugeSize * 0.45);
    
    const gaugeBaseHight = centerY + radius/4

    return [gaugeBaseHight, centerX, radius];
}

function getIndicatorPercentage(value, min, max){
    perc = ((value - min) / (max - min)*100);
    if (perc > 100){
        perc = 100;
    }else if (perc < 0){
        perc = 0;
    }
    return perc;
}


function drawGaugeArc(arcElement, gaugeBaseHight, centerX, radius, percentage, color, archThickness){
    const endAngle = Math.PI - (percentage / 100) * Math.PI;
    const innerRadius = radius - archThickness;

    const endX = centerX + radius * Math.cos(endAngle);
    const endY = gaugeBaseHight - radius * Math.sin(endAngle);
    const endXInner = centerX + innerRadius * Math.cos(endAngle);
    const endYInner = gaugeBaseHight - innerRadius * Math.sin(endAngle);

    const d = `
        M ${centerX - radius} ${gaugeBaseHight}
        A ${radius} ${radius} 0 0 1 ${endX} ${endY}
        L ${endXInner} ${endYInner}
        A ${innerRadius} ${innerRadius} 0 0 0 ${centerX - innerRadius} ${gaugeBaseHight}
        Z
    `;

    arcElement.setAttribute("d", d);
    arcElement.setAttribute("fill", color);
    arcElement.setAttribute("stroke", "none");
}

function updateBalancerGauge(gaugeId, value) {
    const gauge = document.getElementById(gaugeId);
    const fill = gauge.querySelector('.dash-balancer-fill');
    
    const maxValue = gauge.dataset.range_max;
    const percentage = Math.abs(value)/maxValue * 50;
    const clampedPercentage = Math.min(percentage, 50);
    
    fill.style.width = clampedPercentage + '%';
    fill.className = 'dash-balancer-fill';
    if(value > 0) {
        fill.classList.add('positive');
        fill.style.left = '50%';
        fill.style.right = 'auto';
    }else if(value < 0) {
        fill.classList.add('negative');
        fill.style.left = 'auto';
        fill.style.right = '50%';
    }else{
        fill.style.width = '0%';
    }    
}







