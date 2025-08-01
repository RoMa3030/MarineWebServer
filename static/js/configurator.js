let mappings;
let newConfig;

document.addEventListener('DOMContentLoaded', async () => {
    try {
        const response = await fetch('/api/DataTypeMappings');
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        mappings = await response.json();
        console.log('Data type mappings loaded:', mappings);
        
        // add parameters from JSON to DropDown select
        loadAdcParameterOptions("adc1-dd");
        loadAdcParameterOptions("adc2-dd");
        loadAdcParameterOptions("adc3-dd");
        loadAdcParameterOptions("adc4-dd");
    } catch (error) {
        console.log('Failed to initialize page layout');
        console.log(error);
        return;
    }
    //console.log("Parameters loaded")
    // add button listeners
    saveButton = document.getElementById("save-layout-btn");
    saveButton.addEventListener('click', savePageConfiguration);
    saveButton = document.getElementById("save-adc-btn");
    saveButton.addEventListener('click', saveAdcCofiguration);
    InitLayoutEditors();
    InitLineButtons("adc1-add-btn","adc1-rmv-btn","adc1-table");
    InitLineButtons("adc2-add-btn","adc2-rmv-btn","adc2-table");
    InitLineButtons("adc3-add-btn","adc3-rmv-btn","adc3-table");
    InitLineButtons("adc4-add-btn","adc4-rmv-btn","adc4-table");
});


function InitLayoutEditors() {
    for(let i=0; i<4; i++) {
        const dropdown = document.getElementById(`sel-layout${i}`);
        if (dropdown) {
            dropdown.addEventListener('change', function(event) {
                const layout = event.target.value;
                const editorId = `layout-editor-${i}`;
                const layoutEditor = document.getElementById(editorId);
                if(layoutEditor) {
                    layoutEditor.innerHTML = "";
                }
                renderLayoutEditor(layout, editorId, i);
            });
        }
    }
}

function renderLayoutEditor(layout, editorId, lvl1_index) {
    const editorContainer = document.getElementById(editorId);
    switch(layout) {
        case("Empty"):
            editorContainer.innerHTML = '';
            showEditorDetails(false,editorContainer);
            break;

        case("Numeric Grid 3x2"):
            for(let lvl2_index=0; lvl2_index<6; lvl2_index++) {
                const Lvl2EditorField = document.createElement('div');
                Lvl2EditorField.className = 'Lvl2-Editor-Field';
                Lvl2EditorField.dataset.selectedLayout = 'SingleValue'; // predefine layout for case when nothing is changed by user.
                
            
                // Create Dropdown to select Level-2-Layout
                // Creates: "1. Card-Layout: "
                const lvl2TypeLabel = document.createElement('label');
                lvl2TypeLabel.textContent = `${lvl2_index+1}. Card-Layout: `;
                lvl2TypeLabel.setAttribute('for', `lvl2Type-${lvl1_index}-${lvl2_index}`);
                
                // Creates: Drop-Down ["Single","Triple","Gauge",...]
                const lvl2TypeSelect = document.createElement('select');
                lvl2TypeSelect.id = `lvl2Type-${lvl1_index}-${lvl2_index}`;
                lvl2TypeSelect.className = "lvl2_layout_select";
                const options = ["SingleValue","Gauge","TripleValue","Columns"];
                for(const opt of options)
                {
                    const optionElement = document.createElement('option');
                    optionElement.textContent = opt;
                    lvl2TypeSelect.appendChild(optionElement);
                }                
                Lvl2EditorField.appendChild(lvl2TypeLabel);
                Lvl2EditorField.appendChild(lvl2TypeSelect);
                

                // Create empty element to later dynamically add different numbers of DataField selectors
                const dfEditorCollection = document.createElement('div');
                dfEditorCollection.id = `dfEditorCollection-${lvl1_index}-${lvl2_index}`;
                dfEditorCollection.className = "dfEditorCollection";
                dfEditorCollection.dataset.level1_index = lvl1_index;
                dfEditorCollection.dataset.level2_index = lvl2_index;
                Lvl2EditorField.appendChild(dfEditorCollection);
                Lvl2EditorField.append(dfEditorCollection, document.createElement('br'));

                // add listener to automatically create the correct number of data-fields, when lvl2 layout is changed
                lvl2TypeSelect.addEventListener('change', function(event) {
                    const layout = event.target.value;      // "What layout (lvl2) has been selected in the dropdown"
                    Lvl2EditorField.dataset.selectedLayout = layout;
                    dfEditorCollection.innerHTML = "";         // Clear old content (in case it's not newly selected but the layout has changed)
                    RenderDataFieldEditorList(dfEditorCollection.id, layout);
                });
                editorContainer.appendChild(Lvl2EditorField);
            }

            //initial rendering of the default datafield editors:
            const dfEditorCollections = editorContainer.querySelectorAll('.dfEditorCollection');
            dfEditorCollections.forEach((lvl2_editor, index) => {
                lvl2_editor.dataset.selectedLayout = "SingleValue";
                lvl2_editor.innerHTML = "";
                RenderDataFieldEditorList(lvl2_editor.id, "SingleValue");
            });
            
            showEditorDetails(true, editorContainer);       // Automatically "un-collaps" details
            break;
            
        case 'Dash':
            // Add all the DF-Editors + a label for each field.
            const sectionLabels = ["Column 1", "Column 2", "Column 3", "Big Gauge", "Under Gauge", "Balancing Gauge", "Numeric 1", "Numeric 2", "Numeric 3"];
            for(let lvl2_index = 0; lvl2_index < sectionLabels.length; lvl2_index++) {
                // The level2-Editor has no purpose in the design but it's required for parsing the configuration
                //      (Even if it doesn't make much sense from a design persepctive:
                //      each datafield in the dash is considered an own lvl2-section (easier parsing/dfEditor-rendering))
                const Lvl2EditorField = document.createElement('div');
                Lvl2EditorField.className = 'Lvl2-Editor-Field';
                Lvl2EditorField.dataset.selectedLayout = "dashField";
                editorContainer.appendChild(Lvl2EditorField);
                // Create Label
                const dashDfeLabel = document.createElement('label');
                dashDfeLabel.textContent = sectionLabels[lvl2_index]; 
                dashDfeLabel.className = 'dash-dfeditor-label';
                Lvl2EditorField.appendChild(dashDfeLabel);
                Lvl2EditorField.appendChild(document.createElement('br'));
                /*
                // as the lvl2-type is predefined for dash - an invisble - replacment-element is required for the parser to be applicable to that layout too.
                const invisibleElement = document.createElement('p');
                Lvl2EditorField.appendChild(invisibleElement);
                invisibleElement.value = 'Dash_lvl2';
                invisibleElement.className = 'lvl2_layout_select';*/
                 
                // Add dfeCollection (Even though each collectionwill contain only one -> easier use of rendering function)
                // Create empty element to later dynamically add different numbers of DataField selectors
                const dfEditorCollection = document.createElement('div');
                dfEditorCollection.id = `dfEditorCollection-${lvl1_index}-${lvl2_index}`;
                dfEditorCollection.className = "dfEditorCollection";
                dfEditorCollection.dataset.level1_index = lvl1_index;
                dfEditorCollection.dataset.level2_index = lvl2_index;
                Lvl2EditorField.appendChild(dfEditorCollection);
                Lvl2EditorField.append(dfEditorCollection, document.createElement('br'));
                // append everything to parent
                //editorContainer.appendChild(Lvl2EditorField);
                RenderDataFieldEditorList(dfEditorCollection.id, "Dash");
            }            
            showEditorDetails(true, editorContainer);       // Automatically "un-collaps" details
            break;
            
        default:
            console.log("not supported yet!");
            break;
    }
}

function RenderDataFieldEditorList(dfEditorCollection_id, layout) {   
    // This function shall add the required number of dataFieldEditors (section to define ONE datafield[param, inst, range]) to the parent
    // (The parent is an empty Div of class "dfEditorCollection")
    numOfDatafields = 1;
    switch(layout){
        case "SingleValue":
            numOfDatafields = 1;
            break;
        case "Gauge":
            numOfDatafields = 1;
            break;
        case "TripleValue":
            numOfDatafields = 3;
            break;
        case "Columns":
            numOfDatafields = 3;
            break;
        case "Dash":
            numOfDatafields = 1;
            break;
    }
    console.log("DataFieldEditor-Collection ID:");
    console.log(dfEditorCollection_id);
    
    const dfecDiv = document.getElementById(dfEditorCollection_id);
    //dfecDiv.innerHTML = "";
    dfecDiv.style.paddingLeft = "20px";
    const level1_index = dfecDiv.dataset.level1_index;
    const level2_index = dfecDiv.dataset.level2_index;    

    for(let dfIndex=0; dfIndex<numOfDatafields; dfIndex++) {
        // create DataFieldEditor-Field
        const dfEditor = document.createElement('div');
        dfEditor.id = `dfEditor-${level1_index}-${level2_index}`;
        dfEditor.className = "datafield-editor";
        // Add dataset values - will probably allow to make for an easier parser (go through all datatypes and ignore the parent containers)
        dfEditor.dataset.level1_index = level1_index;
        dfEditor.dataset.level2_index = level2_index;
        dfecDiv.appendChild(dfEditor);
        
        // Create parameter label and select
        const paramLabel = document.createElement('label');
        paramLabel.textContent = 'Parameter:';
        paramLabel.setAttribute('for', `param-${level1_index}-${level2_index}-${dfIndex}`);

        const paramSelect = document.createElement('select');
        paramSelect.id = `param-${level1_index}-${level2_index}-${dfIndex}`;

        // Create instance label and select
        const instanceLabel = document.createElement('label');
        instanceLabel.textContent = 'Instance:';
        instanceLabel.setAttribute('for', `instance-${level1_index}-${level2_index}-${dfIndex}`);

        const instanceSelect = document.createElement('select');
        instanceSelect.id = `instance-${level1_index}-${level2_index}-${dfIndex}`;
        // Add options to instance select
        for(let i=0; i<4; i++) {
            const optionElement = document.createElement('option');
            optionElement.textContent = i;
            instanceSelect.appendChild(optionElement);
        }

        // Add fields for range selection
        const rangeField = document.createElement('div');
        rangeField.id = `range-${level1_index}-${level2_index}-${dfIndex}`;
        rangeField.className = "min-max-select";
        const rangeLabel = document.createElement('label');
        rangeLabel.textContent = "Range:";

        const rangeMin = document.createElement('input');
        rangeMin.type = "number";
        rangeMin.id = `range-min-${level1_index}-${level2_index}-${dfIndex}`;
        rangeMin.placeholder = "min";

        const spacer = document.createElement('span');
        spacer.style.width = "10px";
        spacer.style.display = "inline-block";

        const rangeMax = document.createElement('input');
        rangeMax.type = "number";
        rangeMax.id = `range-max-${level1_index}-${level2_index}-${dfIndex}`;
        rangeMax.placeholder = "max";

        rangeField.appendChild(rangeLabel);
        rangeField.appendChild(rangeMin);
        rangeField.appendChild(spacer);
        rangeField.appendChild(rangeMax);
        
        // Add fields for Alarm selection
        const alarmField = document.createElement('div');
        alarmField.id = `alarm-${level1_index}-${level2_index}-${dfIndex}`;
        alarmField.className = "min-max-select";                            // Check: required different class for parser?
        const alarmLowLabel = document.createElement('label');
        alarmLowLabel.textContent = "Alarm low:";

        const alarmLow = document.createElement('input');
        alarmLow.type = "number";
        alarmLow.id = `alarm-low-${level1_index}-${level2_index}-${dfIndex}`;
        alarmLow.placeholder = "none";

        const spacer2 = document.createElement('span');
        spacer2.style.width = "20px";
        spacer2.style.display = "inline-block";
        
        
        const alarmHighLabel = document.createElement('label');
        alarmHighLabel.textContent = "Alarm high:";

        const alarmHigh = document.createElement('input');
        alarmHigh.type = "number";
        alarmHigh.id = `alarm-high-${level1_index}-${level2_index}-${dfIndex}`;
        alarmHigh.placeholder = "none";

        alarmField.appendChild(alarmLowLabel);
        alarmField.appendChild(alarmLow);
        alarmField.appendChild(spacer2);
        alarmField.appendChild(alarmHighLabel);
        alarmField.appendChild(alarmHigh);

        // Add these elements to the parent
        dfEditor.appendChild(paramLabel);
        dfEditor.appendChild(paramSelect);
        dfEditor.appendChild(instanceLabel);
        dfEditor.appendChild(instanceSelect);
        dfEditor.append(instanceSelect, document.createElement('br'));
        dfEditor.appendChild(rangeField);
        dfEditor.appendChild(alarmField);
        dfEditor.append(alarmField, document.createElement('br'));

        //Define dropdown options only AFTER appending the element to the layout
        // First handles special cases for fields with limited parameter options.
        if(layout === "Columns") {
            // Special case columns: only available for tank levels
            loadTankParameterOptions(paramSelect.id);
        }else if(layout === "Dash" && level2_index == 3) {
            loadSingleParameterOption(paramSelect.id, 0);          // for central gauge in dash: RPM only     
        }else if(layout === "Dash" && level2_index == 4) {
            loadFewParameterOptions(paramSelect.id, [39,40]);      // for central gauge in dash: RPM only     
        }else if(layout === "Dash" && level2_index == 5) {
            loadSingleParameterOption(paramSelect.id, 9);          // for the balancing gauge (aka "rudder instrument")     
        }else{
            loadDfParameterOptions(paramSelect.id);
        }
    }
}

function showEditorDetails(OpenState, editorContainer) {
    //collaps details element
    const detailsElement = editorContainer.parentElement;
    if (detailsElement.tagName.toLowerCase() === 'details') {
        detailsElement.open = OpenState;
    }
}

function loadParameterOptions(select_id, parameters_to_ignore =[]) {
    const selectElement = document.getElementById(select_id);

    for (const key in mappings.dataTypes) {
        if (
            mappings.dataTypes.hasOwnProperty(key) &&
            !parameters_to_ignore.includes(key)
        ) {
            const label = mappings.dataTypes[key].label;
            const option = document.createElement("option");
            option.value = key;             // value = key: for easier parsing
            option.textContent = label;     // only "textContent" human readable -> not functional
            selectElement.appendChild(option);
        }
    }
}

function loadSingleParameterOption(select_id, param) {
    const selectElement = document.getElementById(select_id);
    if (mappings.dataTypes.hasOwnProperty(param)) {
        const label = mappings.dataTypes[param].label;
        const option = document.createElement("option");
        option.value = param;             // value = key: for easier parsing
        option.textContent = label;     // only "textContent" human readable -> not functional
        selectElement.appendChild(option);
        selectElement.selectedIndex =0;
    }
    
}

function loadFewParameterOptions(select_id, params) {
    const selectElement = document.getElementById(select_id);

    for (const param of params) {
        if (
            mappings.dataTypes.hasOwnProperty(param)
        ) {
            const label = mappings.dataTypes[param].label;
            const option = document.createElement("option");
            option.value = param;             // value = key: for easier parsing
            option.textContent = label;     // only "textContent" human readable -> not functional
            selectElement.appendChild(option);
        }
    }    
}

// Wrappers for "loadParameterOptions" with pre-selected exception fields.
function loadAdcParameterOptions(select_id) {    
    const parametersToIgnore = ["10","13","14","15","16","21","22","23","30","31","32","33","34","35"];
    loadParameterOptions(select_id, parametersToIgnore);
}
function loadDfParameterOptions(select_id) {    
    const parametersToIgnore = ["13","14","30","31","32","33","34","35"];
    loadParameterOptions(select_id, parametersToIgnore);
}
function loadTankParameterOptions(select_id) {    
    const parametersToIgnore = ["0","1","2","3","4","5","6","7","8","9","10","11","12","13","14","15",
                                "16","17","18","19","20","21","22","23","30","31","32","33","34","35",
                                "36","37","38"];
    loadParameterOptions(select_id, parametersToIgnore);
}


function InitLineButtons(addButtonId, removeButtonId, tableId) {
    const addButton = document.getElementById(addButtonId);
    const removeButton = document.getElementById(removeButtonId);
    const table = document.getElementById(tableId);

    addButton.addEventListener('click', () => addRow(table));
    removeButton.addEventListener('click', () => removeRow(table));
}


function addRow(table) {
    // Get the tbody element
    const tbody = table.querySelector('tbody');
    
    // If tbody doesn't exist, create one
    if (!tbody) {
        const newTbody = document.createElement('tbody');
        table.appendChild(newTbody);
        tbody = newTbody;
    }
    
    // Get the current number of rows (excluding the header row)
    const rowCount = tbody.querySelectorAll('tr').length;
    
    // Create a new row
    const newRow = document.createElement('tr');
    
    // Create first cell (Volt/Ohm input)
    const cell1 = document.createElement('td');
    const input1 = document.createElement('input');
    input1.type = 'number';
    input1.name = `cell-${rowCount}-0`; // Fixed index to start at 0 for the first column
    cell1.appendChild(input1);
    
    // Create second cell (Sensor input)
    const cell2 = document.createElement('td');
    const input2 = document.createElement('input');
    input2.type = 'number';
    input2.name = `cell-${rowCount}-1`; // Fixed index to be 1 for the second column
    cell2.appendChild(input2);
    
    // Append cells to the row
    newRow.appendChild(cell1);
    newRow.appendChild(cell2);
    
    // Append the new row to tbody
    tbody.appendChild(newRow);
}

function removeRow(table) {
    const rows = table.querySelectorAll('tr');
    const rowCount = rows.length - 1; // Exclude header row

    if (rowCount > 2) {
        // Remove the last row - use the parentNode to ensure we're removing from the correct parent
        const lastRow = rows[rows.length - 1];
        lastRow.parentNode.removeChild(lastRow);
    }
}

/*
function storeCurrentConfig() {
    const selElem_UnitLength = document.getElementById("sel-unitLength");
    const LengthSelection = selElem_UnitLength.value;
    let unitLength;
    switch(LengthSelection){
        case "Metric":
            unitLength = "m";
            break;
        case "Imperial":
            unitLength = "imp";
            break;
        case "Nautic":
            unitLength = "naut";
    }
    const selElem_UnitTemp = document.getElementById("sel-unitTemperature");
    const TempSelection = selElem_UnitTemp.value;
    let unitTemp;
    switch(TempSelection){
        case "Celcius":
            unitLength = "C";
            break;
        case "Fahrenheit":
            unitLength = "F";
            break;
    }
    const selElem_UnitPres = document.getElementById("sel-unitPressure");
    const PresSelection = selElem_UnitPres.value;
    let unitPres;
    switch(PresSelection){
        case "bar":
            unitLength = "bar";
            break;
        case "psi":
            unitLength = "psi";
            break;
    }
    const selElem_UnitVol = document.getElementById("sel-unitVolume");
    const VolSelection = selElem_UnitVol.value;
    let unitVol;
    switch(VolSelection){
        case "Liter":
            unitLength = "L";
            break;
        case "Gallon":
            unitLength = "gal";
            break;
    }
    newConfig ={

    }
}*/
/**
 * Load existing configuration and update it with form values
 * @param {Object} existingConfig - The existing configuration (optional)
 * @returns {Object} Updated configuration object
 */
async function parsePageConfigurationForm(existingConfig = null) {
    // Start with existing config or create new default structure
    let config = existingConfig || {
        unitSelection: {
            length: "m",
            temperature: "C",
            pressure: "bar",
            volume: "L",
            Speed: "km/h"
        },
        engineDesignations: ["Engine 1", "Engine 2", "Engine 3", "Engine 4"],
        layouts: []
    };
  
    // If no config was passed, try to load from localStorage or server
    if (!existingConfig) {
        try {
            // Try to load from localStorage first (for testing/development)
            const savedConfig = localStorage.getItem('mwsConfig');
            if (savedConfig) {
                config = JSON.parse(savedConfig);
                console.log('Loaded configuration from localStorage');
            } else {
                const response = await fetch('/api/get-config');
                if (response.ok) {
                    config = await response.json();
                    console.log('Loaded configuration from server');
                }
            }
        } catch (error) {
            console.error('Error loading configuration:', error);
            // Continue with default config
        }
    }
  
    // Parse unit selections
    const unitLengthSelect = document.getElementById('sel-unitLength');
    if (unitLengthSelect) {
        const lengthValue = unitLengthSelect.value;
        switch (lengthValue) {
            case 'Metric':
                config.unitSelection.length = 'm';
                break;
            case 'Imperial':
                config.unitSelection.length = 'ft';
                break;
            case 'Nautic':
                config.unitSelection.length = 'nm';
                break;
        }
    }
  
    const unitTempSelect = document.getElementById('sel-unitTemperature');
    if (unitTempSelect) {
        const tempValue = unitTempSelect.value;
        config.unitSelection.temperature = tempValue === 'Celcius' ? 'C' : 'F';
    }
  
    const unitPressureSelect = document.getElementById('sel-unitPressure');
    if (unitPressureSelect) {
        const pressureValue = unitPressureSelect.value;
        config.unitSelection.pressure = pressureValue.toLowerCase();
    }
  
    const unitVolumeSelect = document.getElementById('sel-unitVolume');
    if (unitVolumeSelect) {
        const volumeValue = unitVolumeSelect.value;
        config.unitSelection.volume = volumeValue === 'Liter' ? 'L' : 'gal';
    }
    
    const unitSpeedSelect = document.getElementById('sel-unitSpeed');
    if (unitSpeedSelect) {
        const speedValue = unitSpeedSelect.value;
        switch (speedValue) {
            case 'Metric':
                config.unitSelection.speed = 'km/h';
                break;
            case 'Imperial':
                config.unitSelection.speed = 'mph';
                break;
            case 'Nautic':
                config.unitSelection.speed = 'kn';
                break;
        }
    } 
  
  
    // Parse engine designations
    for (let i = 0; i < 4; i++) {
        const engineInput = document.getElementById(`des-engine${i}`);
        if (engineInput && engineInput.value.trim()) {
            console.log(`Storing Engine Designation: i=${i}, name=${engineInput.value.trim()}`)
            config.engineDesignations[i] = engineInput.value.trim();
        }
    }
  
    // Handle layouts - first clear existing layouts if form has values
    let hasLayoutSelections = false;
    for (let i = 0; i < 4; i++) {
        const layoutSelect = document.getElementById(`sel-layout${i}`);
        if (layoutSelect && layoutSelect.value !== 'Empty') {
            hasLayoutSelections = true;
            break;
        }
    }
    
    // Only reset layouts if we have new ones to add
    if (hasLayoutSelections) {
        config.layouts = [];
        
        // Parse layouts
        for (let pageIndex = 0; pageIndex < 4; pageIndex++) {
            const layoutSelect = document.getElementById(`sel-layout${pageIndex}`);
            if (layoutSelect && layoutSelect.value !== 'Empty') {
                // Map the layout type to the expected format
                let layoutType = "";
                switch (layoutSelect.value) {
                    case 'Numeric Grid 3x2':
                        layoutType = "Grid_3_2";
                        break;
                    case 'Dash':
                        layoutType = "Dash";
                        break;
                    case 'Columns':
                        layoutType = "Columns";
                        break;
                    default:
                        continue; // Skip if not a recognized layout type
                }

                // Create the layout object
                const layoutObj = {
                    level1Type: layoutType,
                    sections: []
                };
                
                // Get the layout editor for this page
                const layoutEditor = document.getElementById(`layout-editor-${pageIndex}`);
                
                if (layoutEditor) {
                    // Find all level 2 layout selectors within layoutEditor (=within page)
                    const level2Editors = layoutEditor.querySelectorAll('.Lvl2-Editor-Field');
                    for (let sectionIndex = 0; sectionIndex < level2Editors.length; sectionIndex++) {
                        // (a "section" describes the next smaller region below "page" -> in the grid laout: one of the cards
                        // Therefore: each section is represented by one lvl2-layout-entry)
                        /*const level2TypeDropDowns = level2Editors[sectionIndex].querySelectorAll('.lvl2_layout_select');*/
                        const level2Type = level2Editors[sectionIndex].dataset.selectedLayout;//level2TypeDropDowns[0].value;    // should in theory only ever find one. If not: default = take first
                        // Create the section object
                        if(!level2Type) {
                            console.error("Level-2-Layout not defined for a field - Configuration parsing aborted");
                            return;
                        }
                        
                        const section = {
                            level2Type: level2Type,
                            dataFields: []
                        };
                        
                        // Find the corresponding datafield-editor-collection
                        const dfeCollection = document.getElementById(`dfEditorCollection-${pageIndex}-${sectionIndex}`);
                        
                        if (dfeCollection) {
                            // The number of parameters depends on the level2Type
                            let paramCount = 1; // Default for SingleValue and Gauge
                            if (level2Type === 'TripleValue') {
                                paramCount = 3;
                            } else if (level2Type === 'Columns') {
                                paramCount = 3;
                            }
                            
                            // For each parameter in this datafield-editor-container
                            for (let dfIndex = 0; dfIndex < paramCount; dfIndex++) {
                                const paramSelect = document.getElementById(`param-${pageIndex}-${sectionIndex}-${dfIndex}`);
                                const instanceSelect = document.getElementById(`instance-${pageIndex}-${sectionIndex}-${dfIndex}`);
                                
                                if (paramSelect && instanceSelect) {
                                    // Get min and max values if they exist
                                    let rangeMin = null;
                                    let rangeMax = null;
                                    
                                    const minInput = document.getElementById(`range-min-${pageIndex}-${sectionIndex}-${dfIndex}`);
                                    const maxInput = document.getElementById(`range-max-${pageIndex}-${sectionIndex}-${dfIndex}`);
                                    
                                    if (minInput && minInput.value !== "") {
                                        rangeMin = parseFloat(minInput.value);
                                    }
                                    
                                    if (maxInput && maxInput.value !== "") {
                                        rangeMax = parseFloat(maxInput.value);
                                    }
                                    
                                    // Get alarm thresholds
                                    let alarmLow = null;
                                    let alarmHigh = null;
                                    
                                    const lowInput = document.getElementById(`alarm-low-${pageIndex}-${sectionIndex}-${dfIndex}`);
                                    const highInput = document.getElementById(`alarm-high-${pageIndex}-${sectionIndex}-${dfIndex}`);
                                    
                                    if (lowInput && lowInput.value !== "") {
                                        alarmLow = parseFloat(lowInput.value);
                                    }
                                    
                                    if (highInput && highInput.value !== "") {
                                        alarmHigh = parseFloat(highInput.value);
                                    }
                                    
                                    // Create the dataField object
                                    const dataField = {
                                        dataType: parseInt(paramSelect.value, 10),
                                        instance: parseInt(instanceSelect.value, 10),
                                        range_min: rangeMin,
                                        range_max: rangeMax,
                                        alarm_low: alarmLow,
                                        alarm_high: alarmHigh
                                    };
                                    // Add the dataField to the section
                                    section.dataFields.push(dataField);
                                }
                            }
                        }
                        
                        // Add the section to the layout
                        layoutObj.sections.push(section);
                    }
                }
                
                // Add the layout to the config
                config.layouts.push(layoutObj);

            }
            // Nothing to do on empty pages
            // -> so there will be no empty pages / instead they are moved together
        }
    }
    return config;
}
  
/**
 * Load configuration from file or server
 * @returns {Promise<Object>} The loaded configuration
 */
/*
async function loadConfiguration() {
    let config = null;
    
    try {
        // Try to fetch configuration from server
        const response = await fetch('/api/get-config');
        if (response.ok) {
            config = await response.json();
            console.log('Successfully loaded configuration from server');
            
            // Populate form with loaded values
            populateForm(config);
        } else {
            console.warn('Could not load configuration from server, using defaults');
        }
    } catch (error) {
        console.error('Error loading configuration:', error);
        // Continue with default config (will be created in parseConfigurationForm)
    }
    return config;
}*/
  
/**
 * Populate form fields with values from the loaded configuration
 * @param {Object} config - The configuration object
 */
/*
function populateForm(config) {
    if (!config) return;
    
    // Set unit selections
    const unitMap = {
        length: { 'm': 'Metric', 'ft': 'Imperial', 'nm': 'Nautic' },
        temperature: { 'C': 'Celcius', 'F': 'Fahrenheit' },
        pressure: { 'bar': 'bar', 'psi': 'psi' },
        volume: { 'L': 'Liter', 'gal': 'Gallon' }
    };
    
    // Set length dropdown
    const unitLengthSelect = document.getElementById('sel-unitLength');
    if (unitLengthSelect && config.unitSelection && config.unitSelection.length) {
        const lengthOption = unitMap.length[config.unitSelection.length];
        if (lengthOption) {
            unitLengthSelect.value = lengthOption;
        }
    }
    
    // Set temperature dropdown
    const unitTempSelect = document.getElementById('sel-unitTemperature');
    if (unitTempSelect && config.unitSelection && config.unitSelection.temperature) {
        const tempOption = unitMap.temperature[config.unitSelection.temperature];
        if (tempOption) {
            unitTempSelect.value = tempOption;
        }
    }
    
    // Set pressure dropdown
    const unitPressureSelect = document.getElementById('sel-unitPressure');
    if (unitPressureSelect && config.unitSelection && config.unitSelection.pressure) {
        const pressureOption = unitMap.pressure[config.unitSelection.pressure.toLowerCase()];
        if (pressureOption) {
            unitPressureSelect.value = pressureOption;
        }
    }
    
    // Set volume dropdown
    const unitVolumeSelect = document.getElementById('sel-unitVolume');
    if (unitVolumeSelect && config.unitSelection && config.unitSelection.volume) {
        const volumeOption = unitMap.volume[config.unitSelection.volume];
        if (volumeOption) {
            unitVolumeSelect.value = volumeOption;
        }
    }
    
    // Set engine designations
    if (config.engineDesignations) {
        for (let i = 1; i <= 4; i++) {
            if (config.engineDesignations[i-1]) {
                const engineInput = document.getElementById(`engine${i}`);
                if (engineInput) {
                    engineInput.value = config.engineDesignations[i-1];
                }
            }
        }
    }
    
    // Set layouts
    // This is a simplified version - you would need to expand this based on your UI
    if (config.layouts && config.layouts.length > 0) {
        const layoutTypeMap = {
            'Grid_3_2': 'Numeric Grid 3x2',
            'Dash': 'Dash',
            'Columns': 'Columns'
        };
        
        for (let i = 0; i < config.layouts.length && i < 4; i++) {
            const layoutSelect = document.getElementById(`layout${i+1}`);
            if (layoutSelect && config.layouts[i].level1Type) {
                const layoutOption = layoutTypeMap[config.layouts[i].level1Type];
                if (layoutOption) {
                    layoutSelect.value = layoutOption;
                }
            }
        }
    }
  }
  */

function parseAdcConfigurationForm() {
    // Initialize the array to hold our four ADC configurations
    const adcConfig = [];
    
    // Process each of the four ADC inputs
    for (let adcIndex = 1; adcIndex <= 4; adcIndex++) {
        // Get the parameter dropdown
        const parameterDropdown = document.getElementById(`adc${adcIndex}-dd`);
        
        // Get the instance dropdown
        const instanceDropdown = document.getElementById(`Instance-adc${adcIndex}`);
        
        // Get the table with the curve data
        const adcTable = document.getElementById(`adc${adcIndex}-table`);
        
        // Create the configuration object for this ADC
        const adcItem = {
            // ADC is activated if anything other than "Not used" is selected
            activated: parameterDropdown && parameterDropdown.value !== "Not used",
            
            // The dataType is the selected parameter value, or null if "Not used"
            dataType: parameterDropdown && parameterDropdown.value !== "Not used" 
                ? parseInt(parameterDropdown.value, 10) 
                : null,
            
            // Get the instance value (default to 0 if not found)
            instance: instanceDropdown 
                ? parseInt(instanceDropdown.value, 10) 
                : 0,
            
            // Initialize empty points array
            points: []
        };
        
        // Only process points if the table exists and ADC is activated
        if (adcTable && adcItem.activated) {
            // Get all rows from the table (skip the header row)
            const rows = adcTable.querySelectorAll('tbody tr');
            
            // Start from index 1 to skip the header row
            for (let rowIndex = 1; rowIndex < rows.length; rowIndex++) {
                const row = rows[rowIndex];
                
                // Get the two input cells in this row
                const inputs = row.querySelectorAll('input[type="number"]');
                
                // Only process valid rows with two numeric inputs
                if (inputs.length === 2 && 
                    inputs[0].value !== "" && 
                    inputs[1].value !== "") {
                    
                    // Get the input values and convert to numbers
                    const xValue = parseFloat(inputs[0].value);
                    const yValue = parseFloat(inputs[1].value);
                    
                    // Add the point to the points array
                    adcItem.points.push([xValue, yValue]);
                }
            }
        }
        // Add this ADC configuration to the array
        adcConfig.push(adcItem);
    }
    // Return the complete ADC configuration array
    return adcConfig;
}


function checkPageUserInputs() {
    let isValid = true;
    let ErrorMessage = "";

    /*// much can not be defined wrong, as the dropdowns always contain a valid value.
    // alarms must not be defined (anyways not implemented yet)
    // therfore only check if all ranges are defined
    const rangeElements = document.querySelectorAll('.min-max-select');
    for (let i = 0; i < rangeElements.length; i++) {
        const label = rangeElements[i].querySelector('label');
        
        if (label && label.textContent.trim() === "Range:") {
            const inputFields = element.querySelector('input[type="number"]');

            if(inputFields.length !== 2) {
                isValid == false;
                ErrorMessage = `Layout Definition / DataField Nr: ${i} - Error in page layout`;
                break;
            }
            if(inputFields[0] === "" || inputFields[1] === "" ) {
                isValid == false;
                ErrorMessage = `Layout Definition / DataField Nr: ${i} - Not all ranges are defined`;
                break;
            }
        }
    }*/
    return {isValid, ErrorMessage };
}

function checkAdcUserInputs() {
    let isValid = true;
    let ErrorMessage = "";
    outerLoop: for (let adcIndex = 1; adcIndex <= 4; adcIndex++) {
        const parameterDropdown = document.getElementById(`adc${adcIndex}-dd`);
        const adcTable = document.getElementById(`adc${adcIndex}-table`);
        
        // Only check inputs that are used
        if(parameterDropdown.value === "Not used") {
            continue;
        }
        
        if (adcTable) {
            const rows = adcTable.querySelectorAll('tbody tr');
            
            // Start from index 1 to skip the header row
            for (let rowIndex = 1; rowIndex < rows.length; rowIndex++) {
                const row = rows[rowIndex];
                const inputs = row.querySelectorAll('input[type="number"]');
                
                if (inputs.length !== 2) {
                    ErrorMessage = `ADC Input ${adcIndex}: Table formatting wrong`;
                    isValid = false;
                    break outerLoop;
                }

                if (inputs[0].value === "" || inputs[1].value === "") {
                    ErrorMessage = `ADC Input ${adcIndex}: Don't leafe any field empty`;
                    isValid = false;
                    break outerLoop;
                }

                const sensorValue = parseFloat(inputs[0].value);
                if(adcIndex <= 2 && sensorValue > 410){
                    ErrorMessage = `ADC Input ${adcIndex}: Ohm-values may not exceed 410 Ohm`;
                    isValid = false;
                    break outerLoop;
                }
                if(adcIndex > 2 && sensorValue > 5.1){
                    ErrorMessage = `ADC Input ${adcIndex}: Voltage-values may not exceed 5.1 Volt`;
                    isValid = false;
                    break outerLoop;
                }
            }
        }
    }
    return { isValid, ErrorMessage };
}


async function saveAdcCofiguration() {
    // Check user inputs
    const {isValid, message} = checkAdcUserInputs();
    if(!isValid)
    {
        alert(message);
        return;
    }

    // Parse config from user form
    const config = parseAdcConfigurationForm();

    // Post Config to server
    try {
        const response = await fetch('/api/save-adc-config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(config)
        });
        
        if (response.ok) {
            const result = await response.json();
            console.log('Successfully saved to server:', result);
        } else {
            console.error('Failed to save to server:', response.statusText);
        }
    } catch (error) {
        console.error('Error saving configuration to server:', error);
    }
}

async function savePageConfiguration() {
    // Check user inputs
    /*const {isValid, message} = checkPageUserInputs();
    if(!isValid)
    {
        alert(message);
        return;
    }*/

    try {
        // Get current configuration (possibly loaded earlier)
        let currentConfig = null;
        try {
            const response = await fetch('/api/LayoutConfiguration');
            if (response.ok) {
                currentConfig = await response.json();
            }
        } catch (error) {
            console.warn('Could not load existing configuration, creating new one');
        }
        
        // Parse form and update configuration
        const config = await parsePageConfigurationForm(currentConfig);
        
        // Save to localStorage
        /*localStorage.setItem('mwsConfig', JSON.stringify(config, null, 2));
        console.log('Configuration saved to localStorage:', config);*/
        
        // send to server
        try {
            const response = await fetch('/api/save-page-config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(config)
            });
            
            if (response.ok) {
                const result = await response.json();
                console.log('Successfully saved to server:', result);
            } else {
                console.error('Failed to save to server:', response.statusText);
            }
        } catch (error) {
            console.error('Error saving configuration to server:', error);
        }
        return config;
    } catch (error) {
        console.error('Error in save process:', error);
        return null;
    }
}

