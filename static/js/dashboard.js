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
            console.log("Received data:", floatArray);
            console.log("Type of data:", typeof floatArray);
            floatArray.forEach((value, index) => {
                if (!Number.isNaN(value) && value !== null && value !== -9999.99) {
                    console.log(`Value at index ${index} is ${value}`);
                    updateDataField(index, value);
                }
            });
        })
        .catch(error => {
            console.error('Error fetching engine data:', error);
        });


    /*fetch('/api/engine-data')
        .then(response => response.json())
        .then(data => {
			// Update numeric fields
			document.getElementById('dtfld_01').textContent = data.rpm + ' RPM';

            // Update/create gauges
            if (document.getElementById('dtfld_02').children.length === 0) {
                createGauge('dtfld_02', data.coolant_temp, 40, 120, '°C', 'Engine 1', "Coolant Temperature");
                // Create other gauges...
            } else {
                updateGauge('temp-gauge', data.coolant_temp, 40, 120, '°C');
                // Update other gauges...
            }
        })
        .catch(error => {
            console.error('Error fetching engine data:', error);
        })
        .finally(() => {
            setTimeout(updateEngineData, 1000);
        });*/
}

function updateDataField(numerator, value) {
    // Not suitable yet for layouts with more than 1 data pages
    const sectionType = appState.settings.layouts.sections[numerator].level2Type;
    const containerID = `dtfld_${(numerator+1).toString().padStart(2, '0')}`;
    switch(sectionType){
        case 'Gauge':
            updateGauge(containerID, value);
            break;
        case 'SingleValue':
            numberField = document.getElementById(containerID);
            numberField.textContent = value.toString() + getUnit(numberField.dataset.dataType);
            break;
        default:
            console.log("This level2layout-type is not supported yet")
    }
        
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
    if (!layoutConfig || !layoutConfig.layouts) {
        console.error('Invalid layout configuration');
        return;
    }

    if (layoutConfig.layouts.level1Type == 'Grid_3_2') {
        const sections = layoutConfig.layouts.sections || [];
        
        // Create the fixed 3x2 grid
        const grid = document.createElement('div');
        grid.className = 'grid';
        console.log('Grid element created');

        console.log('sections: ',sections)
        // Create exactly 6 cards (3x2 grid)
        for (let index = 0; index < 6; index++) {
            console.log('Added Card nr. ', index);
            const section = sections[index] || {}; // Use empty object if section doesn't exist
            const card = createCard(section, index + 1, layoutConfig);
            grid.appendChild(card);
        }
        
        container.appendChild(grid);
    }else{
        console.error('The defined Level-1-Layout type is not supported yet.')
    }
}

function createCard(section, index, layoutConfig) {
    const card = document.createElement('div');
    card.className = 'card';
    
    // Format index for IDs (01, 02, etc.)
    const idIndex = index.toString().padStart(2, '0');
    
    // Get the first data field (assuming one per section)
    const dataField = section.dataFields && section.dataFields.length > 0 ? section.dataFields[0] : null;
    
    if (!dataField) {
        return createEmptyCard(idIndex);
    }
    
    // Get engine designation based on instance if available
    const engineDesignation = dataField.instance !== undefined && 
                              layoutConfig.engineDesignations && 
                              layoutConfig.engineDesignations[dataField.instance] 
                              ? layoutConfig.engineDesignations[dataField.instance] 
                              : '';
    
    // Handle different section types
    switch (section.level2Type) {
        case 'Gauge':
            gaugeContainerId = `dtfld_${idIndex}`;
            console.log("Starting to create gauge");
            const gaugeContainer = document.createElement('div');       //
            gaugeContainer.id = gaugeContainerId;                       // create and give standardized name
            gaugeContainer.className = 'gauge-container';               // define the type as named in the CSS
            gaugeContainer.dataset.dataType = dataField.dataType;       //  
            gaugeContainer.dataset.instance = engineDesignation;       //      Fill in the data
            gaugeContainer.dataset.min = dataField.range_min;           //
            gaugeContainer.dataset.max = dataField.range_max;           //
            
            /*
            // Add instance designator if available
            if (engineDesignation) {
                const instanceElement = document.createElement('p');
                instanceElement.id = `instdes_${idIndex}`;
                instanceElement.className = 'instance_designator';
                instanceElement.textContent = engineDesignation;
                card.appendChild(instanceElement);
            }*/
            
            card.appendChild(gaugeContainer);
            /*
            // Add a label based on data type
            const gaugeLabel = document.createElement('p');
            gaugeLabel.id = `lbl_${idIndex}`;
            gaugeLabel.className = 'label';
            gaugeLabel.textContent = getLabelForDataType(dataField.dataType);
            card.appendChild(gaugeLabel);*/
            break;
            
        case 'SingleValue':
            // Add instance designator
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
            
        default:
            console.log('level2layout-type not supported yet. Created empty card instead.')
            return createEmptyCard(idIndex);
    }
    
    return card;
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
  