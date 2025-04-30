let mappings;

document.addEventListener('DOMContentLoaded', async () => {
    try {
        const response = await fetch('/api/DataTypeMappings');
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        mappings = await response.json();
        console.log('Data type mappings loaded:', mappings);
        
        loadAdcParameterOptions("adc1-dd");
        loadAdcParameterOptions("adc2-dd");
        loadAdcParameterOptions("adc3-dd");
        loadAdcParameterOptions("adc4-dd");
    } catch (error) {
        console.log('Failed to initialize page layout');
        console.log(error);
        return;
    }
    console.log("Parameters loaded")
    saveButton = document.getElementById(save-btn);
    saveButton.addEventListener('click', storeCurrentConfig);
    
    InitLineButtons("adc1-add-btn","adc1-rmv-btn","adc1-table");
    InitLineButtons("adc2-add-btn","adc2-rmv-btn","adc2-table");
    InitLineButtons("adc3-add-btn","adc3-rmv-btn","adc3-table");
    InitLineButtons("adc4-add-btn","adc4-rmv-btn","adc4-table");
     
});


function loadAdcParameterOptions(select_id) {
    const selectElement = document.getElementById(select_id);
    const parametersToIgnore = ["10","13","14","15","16","21","22","23","30","31","32","33","34","35"];

    for (const key in mappings.dataTypes) {
        if (
            mappings.dataTypes.hasOwnProperty(key) &&
            !parametersToIgnore.includes(key)
        ) {
            const label = mappings.dataTypes[key].label;
            const option = document.createElement("option");
            option.value = key;
            option.textContent = label;
            selectElement.appendChild(option);
        }
    }
}

function InitLineButtons(addButtonId, removeButtonId, tableId) {
    const addButton = document.getElementById(addButtonId);
    const removeButton = document.getElementById(removeButtonId);
    const table = document.getElementById(tableId);

    addButton.addEventListener('click', () => addRow(table));
    removeButton.addEventListener('click', () => removeRow(table));
}


function addRow(table) {
    // Get the current number of rows (excluding the header row)
    const rowCount = table.querySelectorAll('tr').length - 1;

    // Create a new row
    const newRow = document.createElement('tr');

    // Create first cell (Volt input)
    const cell1 = document.createElement('td');
    const input1 = document.createElement('input');
    input1.type = 'text';
    input1.name = `cell-${rowCount}-1`;
    cell1.appendChild(input1);

    // Create second cell (Sensor input)
    const cell2 = document.createElement('td');
    const input2 = document.createElement('input');
    input2.type = 'text';
    input2.name = `cell-${rowCount}-2`;
    cell2.appendChild(input2);

    newRow.appendChild(cell1);
    newRow.appendChild(cell2);
    table.appendChild(newRow);
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

function storeCurrentConfig() {
    
}