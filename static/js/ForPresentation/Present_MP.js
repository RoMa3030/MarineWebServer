// Global storage of extracted JSON information
let appState = {
    settings: null,
    dataTypeMappings: null
};

//----------------------------------------------------------------------
//  Webpage Startup-Process
//----------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', async () => {
    initDashboardWebPage();
    updateEngineData(); 
});

async function initDashboardWebPage() {
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
    } catch (error) {
        console.log('Failed to initialize page layout');
        console.log(error)
    }
    console.log("initialiation completed")
}



async function fetchSettings() {
    try {
        const response = await fetch('/api/MPDefaultLayout');
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
