
//----------------------------------------------------------------------
//  Function for keeping page updated
//----------------------------------------------------------------------
function updateEngineData() {
    fetch('/api/engine-data')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json();
        })
        .then(engDataResponse => {   // Syntax explanation: floatArray is "initialized" with wathever previous .then() returns.
            if(Array.isArray(engDataResponse)) {
                // Normal case: returns array of floats: fill in values in HTML design
                engDataResponse.forEach((value, datafield_index) => 
                {
                    if (!Number.isNaN(value) && value !== null && value !== -9999.99) {
                        //console.log(`Value at index ${index} is ${value}`);
                        updateDataField(datafield_index, value);
                    }else{
                        clearDataField(datafield_index, value);
                    }
                });
            }else if(typeof engDataResponse === 'string') {
                // API can send strings for instructions in special cases:
                console.log("Received string response from EngineData-API: ", engDataResponse);
                if(engDataResponse === "UPDATING-PAGE-REQUIRED") {
                    console.log("Server requested the webpage to be rendered freshly");
                    initDashboardWebPage();
                }
            }else{
                console.error("Unexpected data type received from EngineData-API", typeof engDataResponse, engDataResponse);
            }
            
        })
        .catch(error => {
            console.error('Error fetching engine data:', error);
        })
        .finally(() => {
            setTimeout(updateEngineData, 1000);
            
        });
}

function updateDataField(datafield_index, meas_value) {
    const containerID = `dtfld_${(datafield_index+1).toString().padStart(2, '0')}`;
    const dataField = document.getElementById(containerID);
    
    if(!dataField)
    {
        console.warn(`Datafield with ID ${containerID} not found`);
        return;
    }
    
    const sectionType = getSectionType(dataField);
    switch(sectionType){
        case 'Gauge':
            updateGauge(containerID, meas_value);
            break;
        case 'SingleValue':
            updateGridNumericField(dataField, meas_value);
            break;
        case 'TripleValue':
            updateGridNumericField(dataField, meas_value);
            break;
        case 'Column':
            updateColumn(dataField, meas_value);
            break;
        case 'Dash-Columns':
            updateDashColumn(dataField, meas_value);
            break;
        case 'Dash-Subgauge':
            updateDashSubgauge(dataField, meas_value);
            break;            
        case 'Dash-Balancer':
            const gaugeContainer = document.getElementById(containerID);
            const gaugeElement = gaugeContainer.querySelector('.dash-balancer');
            updateBalancerGauge(gaugeElement, meas_value);
            break;
        default:
            console.log("This level2layout-type is not supported yet")
    }
}


function clearDataField(datafield_index) {
    const containerID = `dtfld_${(datafield_index+1).toString().padStart(2, '0')}`;
    const dataField = document.getElementById(containerID);
    
    if(!dataField) {
        console.warn(`Datafield with ID ${containerID} not found`);
        return;
    }
    
    const sectionType = getSectionType(dataField);
    switch(sectionType){
        case 'Gauge':
            clearGauge(containerID);
            break;
        case 'SingleValue': // + Dash Layout - Subgauge-Fiel
            dataField.textContent = '---';
            dataField.removeAttribute('data-state');
            break;
        case 'TripleValue':
            dataField.textContent = '---';
            dataField.removeAttribute('data-state');
            break;
        case 'Column':
            clearColumn(dataField);
            break;
        case 'Dash-Columns':
            clearDashColumn(dataField);
            break;
        case 'Dash-Subgauge':     
            dataField.textContent = "---";
            dataField.removeAttribute('data-state');
            break;
        case 'Dash-Balancer':
            const gaugeContainer = document.getElementById(containerID);
            const gaugeElement = gaugeContainer.querySelector('.dash-balancer');
            updateBalancerGauge(gaugeElement, 0);
            break;
        default:
            console.log("This level2layout-type is not supported yet")
    }
}


function updateGridNumericField(dataField, meas_value) {
    dataField.textContent = meas_value.toString() + getUnit(dataField.dataset.dataType);
    
    //check alarm state
    if(dataField.dataset.alarm_low && meas_value <= dataField.dataset.alarm_low) {
        dataField.setAttribute('data-state', 'alarm');
    }else if(dataField.dataset.alarm_high && meas_value >= dataField.dataset.alarm_high) {
        dataField.setAttribute('data-state', 'alarm');
    }else{
        dataField.removeAttribute('data-state');
    }
}

function updateDashColumn(dataField, value) {
    const valueDiv = dataField.querySelector('.dash-column-number');
    const meter = dataField.querySelector('.dash-meter');
        
    if (meter.low && value <= meter.low) {
        valueDiv.setAttribute('data-state', 'alarm');
    }else if (meter.high && value >= meter.high) {
        valueDiv.setAttribute('data-state', 'alarm');
    }else{
        valueDiv.removeAttribute('data-state');
    }
    valueDiv.textContent = value.toString();
    meter.value = value; 
    updateMeterState(meter);    // required only for alarm function to also work on mozilla browsers   
}

function clearDashColumn(dataField) {
    const valueDiv = dataField.querySelector('.dash-column-number');
    const meter = dataField.querySelector('.dash-meter');
    
    valueDiv.textContent = '---';
    valueDiv.removeAttribute('data-state');
    meter.value = 0;
}


function updateDashSubgauge(dataField, meas_value) {
    dataField.textContent = meas_value.toString() + getUnit(dataField.dataset.dataType);
    
    if (dataField.dataset.alarm_low && meas_value <= dataField.dataset.alarm_low) {
        dataField.setAttribute('data-state', 'alarm');
    }else if (dataField.dataset.alarm_high && meas_value >= dataField.dataset.alarm_high) {
        dataField.setAttribute('data-state', 'alarm');
    }else{
        dataField.removeAttribute('data-state');
    }
}


function updateColumn(dataField, value) {
    const valueDiv = dataField.querySelector('.grid-column-value');
    const meter = dataField.querySelector('.grid-meter');
    
    if(meter.low && value <= meter.low) {
        valueDiv.setAttribute('data-state', 'alarm');
    }else if(meter.high && value >= meter.high) {
        valueDiv.setAttribute('data-state', 'alarm');
    }else{
        valueDiv.removeAttribute('data-state');
    }
       
    valueDiv.textContent = value.toString()+'%';
    meter.value = value; 
    updateMeterState(meter);    // required only for alarm function on mozilla browsers   
}

function clearColumn(dataField) {
    const valueDiv = dataField.querySelector('.grid-column-value');
    const meter = dataField.querySelector('.grid-meter');
    
    valueDiv.textContent = '---%';
    meter.value = 0;   
    valueDiv.removeAttribute('data-state');     // removes red coloring (when data is lost while alarm was active)
}

function updateMeterState(meter) {
    // This is required only on Mozilla browsers (different styling of meter elements)
    const value = parseFloat(meter.value);
    const low = parseFloat(meter.low) || 0;
    const high = parseFloat(meter.high) || 0;
    
    if(value <= low) {
        meter.setAttribute('data-state','alarm');
    }else if(value >= high) {
        meter.setAttribute('data-state','alarm');
    }else{
        meter.removeAttribute('data-state');
    }
}


function getSectionType(dataField) {
    
    if (dataField.classList.contains('dash-subgauge')) {        // this test must be placed before singleValue.
        return 'Dash-Subgauge';
    }
    if (dataField.classList.contains('gauge-container')) {
        return 'Gauge';
    }
    if (dataField.closest('.triple-value-line')) {
        return 'TripleValue';
    }
    if (dataField.classList.contains('sv_number')) {
        return 'SingleValue';
    }
    if (dataField.classList.contains('grid-column-content')) {
        return 'Column';
    }
    if (dataField.classList.contains('dash-column-content')) {
        return 'Dash-Columns';
    }   
    if (dataField.classList.contains('dash-balancer-container')) {
        return 'Dash-Balancer';
    }    
    console.log("Could not recognize any SectionType");
    return 'Unknown';
}



// ------------------------------------------------------------------------------------
//     Rendering website layout on startup
// ------------------------------------------------------------------------------------

function renderLayout(layoutConfig) {
    const container = document.querySelector('.container');
    
    // Clear existing content
    container.innerHTML = '';
    
    // Check if layoutConfig is valid
    /*if (!layoutConfig || !layoutConfig.layouts) {
        console.error('Invalid layout configuration');
        return;
    }*/
    // Check if layoutConfig is valid
    if (!layoutConfig || !Array.isArray(layoutConfig.layouts)) {
        console.error('Invalid layout configuration');
        return;
    } 

    layoutConfig.layouts.forEach((Lvl1Layout, layoutIndex) => {
        // code is currently not suitable for web-app that displays several pages -> layouts after page1 are ignored
        if(layoutIndex === 0) {
            const sections = Lvl1Layout.sections || [];
            switch (Lvl1Layout.level1Type) {
                case 'Grid_3_2':                    
                    // Create the fixed 3x2 grid
                    const grid = document.createElement('div');
                    grid.className = 'grid';
                    console.log('Grid element created');

                    //console.log('sections: ',sections)
                    // Create exactly 6 cards (3x2 grid)
                    let indexOffset = 0;    // offset to keep track about dataField-count relative to section-count
                                            // (if 1st section is triple: section2 doesnt start with 2nd df - instead: 2+offset(2) = 4th)
                    for (let index = 0; index < 6; index++) {
                        //console.log('Added Card nr. ', index);
                        const section = sections[index] || {}; // Use empty object if section doesn't exist
                        const {card: card, additionalIndex: additionalOffset} = createCard(section, (index+1+indexOffset), layoutConfig);
                        indexOffset += additionalOffset;
                        grid.appendChild(card);
                    }
                    
                    container.appendChild(grid);
                    break;
                case 'Dash':                    
                    // Adding a grid (3 cells horizontally) 
                    const dashGrid = document.createElement('Div');
                    dashGrid.className = 'dash-grid';
                    container.appendChild(dashGrid);
                    
                    // Adding three cards.
                    // 1st-card: ColumnCard
                    const columnSections = [sections[0],sections[1],sections[2]];
                    dashGrid.appendChild(createDashCard_Columns(columnSections)); 
                    
                    // 2nd-Card: MiddleCard
                    const MiddleSections = [sections[3],sections[4],sections[5]];
                    dashGrid.appendChild(createDashCard_MiddleCard(MiddleSections));  
                    
                    // 3rd-Card: Numerics 
                    const svCardsSections = [sections[6],sections[7],sections[8]];
                    dashGrid.appendChild(createDashCard_svCardsType(svCardsSections)); 
                    break;
                    
                default:
                    console.error('The defined Level-1-Layout type is not supported yet.');
                    break;
            }
        }else{
            console.log("Layouts with several pages are not supported yet");
        }
    });
}


function createCard(section, index, layoutConfig) {
    let card = document.createElement('div');
    card.className = 'card';
    
    // Format index for IDs (01, 02, etc.)
    let idIndex = index.toString().padStart(2, '0');
    
    // Get the first data field (assuming one per section)
    let dataField = section.dataFields && section.dataFields.length > 0 ? section.dataFields[0] : null;
    
    if (!dataField) {
        card = createEmptyCard(idIndex);
        return //{card: card, additionalIndex: 0};
    }
    
    // Get engine designation based on instance if available
    let engineDesignation = getInstanceAlias(dataField.instance);
    
    // Handle different section types
    let addIndex=0;
    switch (section.level2Type) {
        case 'Gauge':
            gaugeContainerId = `dtfld_${idIndex}`;
            const gaugeContainer = document.createElement('div');       //
            gaugeContainer.id = gaugeContainerId;                       // create and give standardized name
            gaugeContainer.className = 'gauge-container';               // define the type as named in the CSS
            gaugeContainer.dataset.dataType = dataField.dataType;       //  
            gaugeContainer.dataset.instance = engineDesignation;        //      Fill in the data
            gaugeContainer.dataset.min = dataField.range_min;           //
            gaugeContainer.dataset.max = dataField.range_max;           //
            gaugeContainer.dataset.alarm_low = dataField.alarm_low;     //
            gaugeContainer.dataset.alarm_high = dataField.alarm_high;   //
            card.appendChild(gaugeContainer);
            break;
            
        case 'SingleValue':
            const instanceElement = document.createElement('p');
            instanceElement.id = `instdes_${idIndex}`;
            instanceElement.className = 'sv_instance_designator';
            instanceElement.textContent = engineDesignation;
            card.appendChild(instanceElement);
            // Add value element
            const valueElement = document.createElement('p');
            valueElement.id = `dtfld_${idIndex}`;
            valueElement.className = 'sv_number';
            valueElement.textContent = getDefaultValueForDataType(dataField.dataType, layoutConfig.unitSelection);
            valueElement.dataset.dataType = dataField.dataType;
            valueElement.dataset.instance = dataField.instance;
            valueElement.dataset.alarm_low = dataField.alarm_low;
            valueElement.dataset.alarm_high = dataField.alarm_high;
            card.appendChild(valueElement);
            // Add label
            const labelElement = document.createElement('p');
            labelElement.id = `lbl_${idIndex}`;
            labelElement.className = 'sv_label';
            labelElement.textContent = getLabelForDataType(dataField.dataType);
            card.appendChild(labelElement);
            break;
            
        case 'TripleValue':
            addIndex = 2;       // increase indexing for three data values rather than 1 only                        
            for(let i=0; i<3; i++) {
                const LineInTripleNumeric = document.createElement('div');
                LineInTripleNumeric.className = 'triple-value-line';
                dataField = section.dataFields && section.dataFields.length > 0 ? section.dataFields[i] : null;
                engineDesignation = dataField.instance !== undefined && 
                              layoutConfig.engineDesignations && 
                              layoutConfig.engineDesignations[dataField.instance] 
                              ? layoutConfig.engineDesignations[dataField.instance] 
                              : '';
                
                const dataDescriptorField = document.createElement('div');
                dataDescriptorField.className = 'tv_descriptor_field';
                
                const instanceElement = document.createElement('p');
                instanceElement.id = `instdes_${idIndex}`;
                instanceElement.className = 'tv_instance_designator';
                instanceElement.textContent = engineDesignation;
                dataDescriptorField.appendChild(instanceElement);
                // Add label
                const labelElement = document.createElement('p');
                labelElement.id = `lbl_${idIndex}`;
                labelElement.className = 'tv_label';
                labelElement.textContent = getLabelForDataType(dataField.dataType);             
                dataDescriptorField.appendChild(labelElement);
                LineInTripleNumeric.appendChild(dataDescriptorField);   
                // Add value element
                const valueElement = document.createElement('p');
                valueElement.id = `dtfld_${idIndex}`;
                valueElement.className = 'tv_number';
                valueElement.textContent = getDefaultValueForDataType(dataField.dataType, layoutConfig.unitSelection);
                valueElement.dataset.dataType = dataField.dataType;
                valueElement.dataset.instance = dataField.instance;
                valueElement.dataset.alarm_low = dataField.alarm_low;
                valueElement.dataset.alarm_high = dataField.alarm_high;
                LineInTripleNumeric.appendChild(valueElement);
    
                card.appendChild(LineInTripleNumeric);
                
                index +=1;
                idIndex = index.toString().padStart(2, '0');
            }
            break;
            
        case 'Columns':
            addIndex = 2;       // increase indexing for three data values rather than 1 only 
            const columnFlexElement = document.createElement('div');
            columnFlexElement.className = 'column-container';
            for(let i=0; i<3; i++) {
                const columnElement = document.createElement('div');
                columnElement.className = 'column-meter-item';
                dataField = section.dataFields && section.dataFields.length > 0 ? section.dataFields[i] : null;
                
                // Add Label
                const columnLabel = document.createElement('div');
                columnLabel.id = `lbl_${idIndex}`;
                columnLabel.className = 'grid-column-label';
                columnLabel.textContent = getTankLabelText((dataField.instance+1), dataField.dataType);                
                columnElement.appendChild(columnLabel);
                
                // Add Meter & Value
                const columnDfElement = document.createElement('div');
                columnDfElement.id = `dtfld_${idIndex}`;
                columnDfElement.className = 'grid-column-content';
                columnDfElement.dataset.dataType = dataField.dataType;
                columnDfElement.dataset.instance = dataField.instance;
                                
                const columnValue = document.createElement('div');
                columnValue.className = 'grid-column-value';
                columnValue.textContent = "--- %";
                const columnMeter = document.createElement('meter');
                columnMeter.className = 'grid-meter';
                const minMeterValue = 0;
                columnMeter.min = minMeterValue;
                columnMeter.max = 100;                  // hard coded: to be changed if other types than level gauges are added to selection
                columnMeter.value = minMeterValue;      // initialize empty gauge
                if(dataField.alarm_low) {
                    columnMeter.low = dataField.alarm_low;
                }
                if(dataField.alarm_high) {
                    columnMeter.high = dataField.alarm_high;
                }
                columnDfElement.appendChild(columnValue);
                columnDfElement.appendChild(columnMeter);
                columnElement.appendChild(columnDfElement);
                
                columnFlexElement.appendChild(columnElement);           
                
                // Customize meter color
                setMeterColor(columnMeter, dataField.dataType);
                
                index +=1;
                idIndex = index.toString().padStart(2, '0');
            }
            card.appendChild(columnFlexElement);
            break;
        default:
            console.log('level2layout-type not supported yet. Created empty card instead.')
            card = createEmptyCard(idIndex);
            return {card: card, additionalIndex: 0};
    }
    return {card: card, additionalIndex: addIndex};
}

function createEmptyCard(idIndex) {
    const card = document.createElement('div');
    card.className = 'card empty-card';
    
    const valueElement = document.createElement('p');
    valueElement.id = `dtfld_${idIndex}`;
    valueElement.className = 'number';
    valueElement.textContent = '---';
    card.appendChild(valueElement);
    
    return card;
}

function setMeterColor(meter, dataType) {
    let normalColor = '#0D6431';
    switch (dataType){
        case 24:
            normalColor = '#0D6431';//"Fuel ";
            break;
        case 25:
            normalColor = '#0B06E4';//"Fresh Water";
            break;
        case 26:
            normalColor = '#9D4700';//Waste";
            break;
        case 27:
            normalColor = '#088070';//"Live Well";
            break;
        case 28:
            normalColor = '#6600B9';//"Oil Level";
            break;
        case 29:
            normalColor = '#4B2A0B';//"Black Water";
            break;
        default:
            console.log("This is not a tank-type parameter");
    }
    meter.style.setProperty('--meter-color', normalColor);
    meter.style.setProperty('--meter-alarm-color', '#E43806');
}

function initializeGauges() {
    // Find all gauge containers
    const gaugeContainers = document.querySelectorAll('.gauge-container');
    
    // Initialize each gauge
    gaugeContainers.forEach((container) => {
        const dataType = parseInt(container.dataset.dataType);
        const instance = container.dataset.instance;
        const min = parseFloat(container.dataset.min);
        const max = parseFloat(container.dataset.max);
        const unit = getUnit(dataType);

        console.log(`Initializing gauge: ${container.id}, dataType: ${dataType}, instance: ${instance}, range: ${min}-${max}`);
        const dataTypeTitle = getLabelForDataType(dataType);
        const initVal = min;
        createGauge(container.id, initVal, min, max, unit, instance, dataTypeTitle);

    });
}


function createDashCard_Columns(columnSections) {
    const card = document.createElement('div');
    card.className = 'dash-card';
    
    // not sure, whether this element is required - check design and eventually insert directly in "card"
    const columnFlexElement = document.createElement('div');
    columnFlexElement.className = 'column-container';
    card.appendChild(columnFlexElement);
    
    for(let i=0; i<3; i++) {
        const section = columnSections[i];
        dataField = section.dataFields[0];// && section.dataFields.length > 0 ? section.dataFields[i] : null;
        let idIndex = i.toString().padStart(2, '0');
        
        // create containers for one column-diagram
            //element for entire data
        const columnElement = document.createElement('div');
        columnElement.className = 'dash-column-item';
        columnFlexElement.appendChild(columnElement);
            // nest in df-element for automated data insertion
        const columnDfElement = document.createElement('div');
        columnDfElement.id = `dtfld_${i}`;                      // Here something is not right: datafield description without leading zero!
                                                                // ToDo: can probably be removed / or better adapted cause currently it prbly works with the dtfl below
        columnDfElement.className = 'dash-column-content';
        columnDfElement.dataset.dataType = dataField.dataType;
        columnDfElement.dataset.instance = dataField.instance;
        columnDfElement.dataset.alarm_low = dataField.alarm_low;
        columnDfElement.dataset.alarm_high = dataField.alarm_high;       
        columnElement.appendChild(columnDfElement);
        
        // create header container (to add icon and instance-description) 
        const dashColumnHeader = document.createElement('div');
        dashColumnHeader.className = 'dash-column-header';
        columnDfElement.appendChild(dashColumnHeader);
        columnDfElement.id = `dtfld_${(i+1).toString().padStart(2, '0')}`;
        // Add Icon      
        const iconDiv = document.createElement('div');
        iconDiv.className = "dash-column-icon";
        dashColumnHeader.appendChild(iconDiv);   
        insertDataIcon(dataField.dataType, iconDiv);
        // Add instance description
        const columnInstance = document.createElement('div');
        columnInstance.className = 'dash-column-instance';
        columnInstance.textContent = dataField.instance+1;
        dashColumnHeader.appendChild(columnInstance); // use 1-based description: 0 -> "1st engine"
        
        // Insert Meter element
        const columnMeter = document.createElement('meter');
        columnMeter.className = 'dash-meter';
        columnMeter.min = dataField.range_min;
        columnMeter.max = dataField.range_max;
        columnMeter.value = dataField.range_min;
        if(dataField.alarm_low) {
            columnMeter.low = dataField.alarm_low;
        }
        if(dataField.alarm_high) {
            columnMeter.high = dataField.alarm_high;
        }
        columnDfElement.appendChild(columnMeter);
        
        // Insert numeric description
        const numericVal = document.createElement('p');
        numericVal.textContent = "- - -";
        numericVal.className = "dash-column-number";
        columnDfElement.appendChild(numericVal);
    }
    return card;
}


function createDashCard_MiddleCard(sections) {
    const card = document.createElement('div');
    card.className = 'dash-card';
    
    gaugeDataField = sections[0].dataFields[0];     
    subGaugeDataField = sections[1].dataFields[0];  
    balancerDataField = sections[2].dataFields[0];    
    
    // Create Gauge (classical half-round gauge)
    const gaugeContainer = document.createElement('div');
    gaugeContainer.id = "dtfld_04";
    gaugeContainer.className = 'gauge-container';  
    gaugeContainer.dataset.dataType = gaugeDataField.dataType;
    gaugeContainer.dataset.instance = getInstanceAlias(gaugeDataField.instance);
    gaugeContainer.dataset.min = gaugeDataField.range_min;
    gaugeContainer.dataset.max = gaugeDataField.range_max;
    gaugeContainer.dataset.alarm_low = gaugeDataField.alarm_low;
    gaugeContainer.dataset.alarm_high = gaugeDataField.alarm_high;
    card.appendChild(gaugeContainer);
    
    // Create sub-gauge data Field (standard numeric data field)
    const subGauge = document.createElement('div');
    subGauge.id = "dtfld_05";
    subGauge.className = 'dash-subgauge'; 
    subGauge.dataset.dataType = subGaugeDataField.dataType;
    subGauge.dataset.instance = getInstanceAlias(subGaugeDataField.instance);
    subGauge.dataset.min = subGaugeDataField.range_min;
    subGauge.dataset.max = subGaugeDataField.range_max;
    subGauge.dataset.alarm_low = subGaugeDataField.alarm_low;
    subGauge.dataset.alarm_high = subGaugeDataField.alarm_high;
    subGauge.textContent = "---";
    card.appendChild(subGauge);         
    
    // Create balancing gauge (typically for rudder position) (alias: "balancer")
    const balancerContainer = document.createElement('div');
    balancerContainer.id = "dtfld_06";    
    balancerContainer.className = 'dash-balancer-container';  
    balancerContainer.dataset.dataType = balancerDataField.dataType;
    balancerContainer.dataset.instance = getInstanceAlias(balancerDataField.instance);
    balancerContainer.dataset.min = balancerDataField.range_min;
    balancerContainer.dataset.max = balancerDataField.range_max;
    card.appendChild(balancerContainer);
    
    const balancer = document.createElement('div');
    balancer.className = 'dash-balancer';
    balancerContainer.appendChild(balancer);
    balancer.dataset.min = balancerDataField.range_min;
    balancer.dataset.max = balancerDataField.range_max;
    const balancerFill = document.createElement('div');
    balancerFill.className = 'dash-balancer-fill';
    balancer.appendChild(balancerFill);
    const balancerCenterLine = document.createElement('div');
    balancerCenterLine.className = 'dash-balancer-centerline';
    balancer.appendChild(balancerCenterLine); 
    
    const balancerDescriptor = document.createElement('p');
    balancerDescriptor.className = 'dash-balancer-descriptor';
    balancerDescriptor.textContent = getLabelForDataType(balancerDataField.dataType);
    balancerContainer.appendChild(balancerDescriptor);
              
    return card;
}


function createDashCard_svCardsType(sections) {
    const dashCard = document.createElement('div');
    dashCard.className = 'dash-card';
    
    for(let i=0; i<3; i++) {
        const svCard = document.createElement('div');
        svCard.className = 'card';  // same as cards in Grid3x2-layout
        dashCard.appendChild(svCard);
        
        const idIndex = (i+7).toString().padStart(2, '0');
        const dataField = sections[i].dataFields[0];
        const engineDesignation = getInstanceAlias(dataField.instance);
        
        const instanceElement = document.createElement('p');
        instanceElement.id = `instdes_${idIndex}`;
        instanceElement.className = 'sv_instance_designator';
        instanceElement.textContent = engineDesignation;
        svCard.appendChild(instanceElement);
        // Add value element
        const valueElement = document.createElement('p');
        valueElement.id = `dtfld_${idIndex}`;
        valueElement.className = 'sv_number';
        valueElement.textContent = getDefaultValueForDataType(dataField.dataType, appState.settings.unitSelection);
        valueElement.dataset.dataType = dataField.dataType;
        valueElement.dataset.instance = dataField.instance;
        valueElement.dataset.alarm_low = dataField.alarm_low;
        valueElement.dataset.alarm_high = dataField.alarm_high;
        svCard.appendChild(valueElement);
        // Add label
        const labelElement = document.createElement('p');
        labelElement.id = `lbl_${idIndex}`;
        labelElement.className = 'sv_label';
        labelElement.textContent = getLabelForDataType(dataField.dataType);
        svCard.appendChild(labelElement);
    }    
    return dashCard;
}

async function insertDataIcon(paramNr, iconDiv) {
    // inserts an img-element into the iconDiv-container
    // paramNr shall represent the parameter identiefier as speciefied in DataTypeMapping.json
    if(!iconDiv) {
        console.error("Couldnt find container element to insert data icon into.");
        return;
    }
    try {
        const response = await fetch(`/api/engine-icon/${paramNr}`);
        const data = await response.json();
        
        if(data.icon_url) {
            const img = document.createElement('img');
            img.src = data.icon_url;
            img.width = 64;
            img.height = 64;
            
            iconDiv.innerHTML = '';
            iconDiv.appendChild(img);
        }
    }catch (error) {
        console.error("Error while loading dash-column-icon", error);
    }
}




//----------------------------------------------------------------------------------
//      Helper functions for conversions
//----------------------------------------------------------------------------------

function getLabelForDataType(dataType) {
    if (appState.dataTypeMappings && 
        appState.dataTypeMappings.dataTypes && 
        appState.dataTypeMappings.dataTypes[dataType]) {
        return appState.dataTypeMappings.dataTypes[dataType].label;
    }else{
        console.log('Data Type Labels can\'t be accessed!');
        return "...";
    }
}

function getTankLabelText(instNr, dataType) {
    let label = "";
    switch (dataType){
        case 24:
            label = "Fuel ";
            break;
        case 25:
            label = "Fresh Water";
            break;
        case 26:
            label = "Waste";
            break;
        case 27:
            label = "Live Well";
            break;
        case 28:
            label = "Oil Level";
            break;
        case 29:
            label = "Black Water";
            break;
        default:
            console.log("This is not a tank-type parameter");
    }
    const instString = instNr.toString();
    label = `${label} ${instString}`;
    return label;
}


function getInstanceAlias(instanceNr) {
    if (appState.settings && 
        appState.settings.engineDesignations) 
    {
        const designations = appState.settings.engineDesignations
        if(instanceNr < designations.length) {
            return designations[instanceNr];
        }
    }
    return instanceNr.toString();
}


function getUnit(dataType) {
    let unit = "";
    if (appState.dataTypeMappings && 
        appState.dataTypeMappings.dataTypes && 
        appState.dataTypeMappings.dataTypes[dataType]) {
        
        const mapping = appState.dataTypeMappings.dataTypes[dataType];
        unit = mapping.unit || '';
        
        if(mapping.unitType !== "none")
        {
            if (appState.settings &&
                appState.settings.unitSelection) {
                switch (mapping.unitType) {
                    case 'temperature':
                        unit = "°" + appState.settings.unitSelection.temperature;
                        break;
                    case 'pressure':
                        unit = " " + appState.settings.unitSelection.pressure;
                        break;
                    case 'volume':
                        unit = " " + appState.settings.unitSelection.volume;
                        break;
                    case 'length':
                        unit = " " + appState.settings.unitSelection.length;
                        break;
                    case 'flow':
                        unit = " " + appState.settings.unitSelection.volume +'/h';
                        break;
                    case 'speed':
                        unit = " " + appState.settings.unitSelection.speed;
                        break;
                }
            }else{
                console.log("Settings not available to read units preference");
            }            
        }else{
            unit = " " + appState.dataTypeMappings.dataTypes[dataType].unit;
        }
    }
    return unit;
}

function getDefaultValueForDataType(dataType, unitSelection) {
    if (!unitSelection) {
        unitSelection = { length: 'm', temperature: 'C', pressure: 'bar', volume: 'L', speed: 'km/h' };
    }
    
    // Check if we have the data type mappings loaded
    if (appState.dataTypeMappings && 
        appState.dataTypeMappings.dataTypes && 
        appState.dataTypeMappings.dataTypes[dataType]) {
        
        const mapping = appState.dataTypeMappings.dataTypes[dataType];
        let unit = mapping.unit || '';
        
        // Add dynamic unit based on unitType and unitSelection
        switch (mapping.unitType) {
            case 'temperature':
                unit = unitSelection.temperature;
                break;
            case 'pressure':
                unit = unitSelection.pressure;
                break;
            case 'volume':
                unit = unitSelection.volume;
                break;
            case 'length':
                unit = unitSelection.length;
                break;
            case 'flow':
                // Replace L with selected volume unit if not L
                if (unitSelection.volume !== 'L') {
                    unit = unit.replace('L', unitSelection.volume) + '/h';
                }
                break;
            case 'speed':
                unit = unitSelection.speed;
        }
        
        return `--- ${unit}`.trim();
    }else{
        return "?"
    }
}
  
