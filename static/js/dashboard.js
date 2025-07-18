document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Load both configuration files in parallel
        const [settings, dataTypeMappings] = await Promise.all([
            fetchSettings(),
            fetchDataTypeMappings()
        ]);
        
        // Store in application state
        appState.settings = settings;
        appState.dataTypeMappings = dataTypeMappings;

        renderLayout(appState.settings);
        initializeGauges(appState.settings);
    } catch (error) {
        console.log('Failed to initialize page layout');
        console.log(error)
    }
    console.log("initialiation completed")
    updateEngineData(); // make sure, the gauges are loaded from the init function first, before starting this loop
});


function updateEngineData() {
    fetch('/api/engine-data')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json();
        })
        .then(floatArray => {
            //console.log("Received data:", floatArray);
            //console.log("Type of data:", typeof floatArray);
            floatArray.forEach((value, datafield_index) => {
                if (!Number.isNaN(value) && value !== null && value !== -9999.99) {
                    //console.log(`Value at index ${index} is ${value}`);
                    updateDataField(datafield_index, value);
                }else{
                    clearDataField(datafield_index, value);
                }
            });
        })
        .catch(error => {
            console.error('Error fetching engine data:', error);
        })
        .finally(() => {
            setTimeout(updateEngineData, 1500);
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
            dataField.textContent = meas_value.toString() + getUnit(dataField.dataset.dataType);
            break;
        case 'TripleValue':
            dataField.textContent = meas_value.toString() + getUnit(dataField.dataset.dataType);
            break;
        case 'Column':
            updateColumn(dataField, meas_value);
            break;
        default:
            console.log("This level2layout-type is not supported yet")
    }
}


function getSectionType(dataField) {
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
    
    return 'Unknown';
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
        case 'SingleValue':
            dataField.textContent = '---';
            break;
        case 'TripleValue':
            dataField.textContent = '---';
            break;
        case 'Column':
            clearColumn(dataField);
            break;
        default:
            console.log("This level2layout-type is not supported yet")
    }
}

function updateColumn(dataField, value) {
    const valueDiv = dataField.querySelector('.grid-column-value');
    const meter = dataField.querySelector('.grid-meter');
    
    valueDiv.textContent = value.toString()+'%';
    meter.value = value; 
    updateMeterState(meter);    // required only for alarm function to also work on mozilla browsers   
}

function clearColumn(dataField) {
    const valueDiv = dataField.querySelector('.grid-column-value');
    const meter = dataField.querySelector('.grid-meter');
    
    valueDiv.textContent = '---%';
    meter.value = 0;
}

// Initialzation of Layout
let appState = {
    settings: null,
    dataTypeMappings: null
};

// ------------------------------------------------------------------------------------
//     Rendering website layout on startup
// ------------------------------------------------------------------------------------
async function fetchSettings() {
    try {
        const response = await fetch('/api/LayoutConfiguration');
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        const layoutConfig = await response.json();
        console.log('Settings loaded:', layoutConfig);
        return layoutConfig;
    } catch (error) {
        console.error('Error fetching layout configuration:', error);
        throw error;
    }
}

async function fetchDataTypeMappings() {
    try {
        const response = await fetch('/api/DataTypeMappings');
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        const mappings = await response.json();
        console.log('Data type mappings loaded:', mappings);
        return mappings;
    } catch (error) {
        console.error('Error fetching data type mappings:', error);
        throw error;
    }
}

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
            if (Lvl1Layout.level1Type == 'Grid_3_2') {
                const sections = Lvl1Layout.sections || [];
                
                // Create the fixed 3x2 grid
                const grid = document.createElement('div');
                grid.className = 'grid';
                console.log('Grid element created');

                //console.log('sections: ',sections)
                // Create exactly 6 cards (3x2 grid)
                let indexOffset = 0;
                for (let index = 0; index < 6; index++) {
                    //console.log('Added Card nr. ', index);
                    const section = sections[index] || {}; // Use empty object if section doesn't exist
                    const {card: card, additionalIndex: additionalOffset} = createCard(section, (index+1+indexOffset), layoutConfig);
                    indexOffset += additionalOffset;
                    grid.appendChild(card);
                }
                
                container.appendChild(grid);
            }else{
                console.error('The defined Level-1-Layout type is not supported yet.');
            }
        }else{
            console.log("Layouts with several pages are not supported yet");
        }
    });
}

function createCard(section, index, layoutConfig) {
    const card = document.createElement('div');
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
    let engineDesignation = dataField.instance !== undefined && 
                              layoutConfig.engineDesignations && 
                              layoutConfig.engineDesignations[dataField.instance] 
                              ? layoutConfig.engineDesignations[dataField.instance] 
                              : '';
    
    // Handle different section types
    let addIndex=0;
    switch (section.level2Type) {
        case 'Gauge':
            gaugeContainerId = `dtfld_${idIndex}`;
            const gaugeContainer = document.createElement('div');       //
            gaugeContainer.id = gaugeContainerId;                       // create and give standardized name
            gaugeContainer.className = 'gauge-container';               // define the type as named in the CSS
            gaugeContainer.dataset.dataType = dataField.dataType;       //  
            gaugeContainer.dataset.instance = engineDesignation;       //      Fill in the data
            gaugeContainer.dataset.min = dataField.range_min;           //
            gaugeContainer.dataset.max = dataField.range_max;           //
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
                columnMeter.min = 0;
                columnMeter.max = 100;
                columnMeter.value = 0;
                columnMeter.low = 10;       // evtl. adapt to custom alarm range
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

function setMeterColor(meter, dataType) {
    let normalColor = '#0D6431';
    switch (dataType){
        case 24:
            lnormalColor = '#0D6431';//"Fuel ";
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

function updateMeterState(meter) {
    // This is required only on Mozilla browsers (different styling of meter elements)
    const value = parseFloat(meter.value);
    const low = parseFloat(meter.low) || 0;
    
    if(value <= low) {
        meter.setAttribute('data-state','alarm');
    }else{
        meter.removeAttribute('data-state');
    }
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
        unitSelection = { length: 'm', temperature: 'C', pressure: 'bar', volume: 'L' };
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
        }
        
        return `--- ${unit}`.trim();
    }else{
        return "?"
    }
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
        createGauge(container.id, 66, min, max, unit, instance, dataTypeTitle);

    });
}
  
