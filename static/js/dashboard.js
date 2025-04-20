
function updateEngineData() {
    fetch('/api/engine-data')
        .then(response => response.json())
        .then(data => {
			// Update numeric fields
			document.getElementById('dtfld_01').textContent = data.rpm + ' RPM';

            // Update/create gauges
            if (document.getElementById('temp-gauge').children.length === 0) {
                createGauge('temp-gauge', data.coolant_temp, 40, 120, '°C', 'Engine 1', "Coolant Temperature");
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
        });
}

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
  

function initializeApp(settings) {
    console.log('Initializing app with settings:', settings);

}






// Event Listeners

document.addEventListener('DOMContentLoaded', async () => {
    try {
        window.appSettings = await fetchSettings();
        initializeApp(settings);
    } catch (error) {
        console.log('Failed to load application settings');
    }
    updateEngineData(); // make sure, the gauges are loaded from the init function first, before starting this loop
  });
  
//document.addEventListener('DOMContentLoaded', updateEngineData);