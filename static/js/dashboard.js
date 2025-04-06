
/*// first function to fetch and update engine data
console.log("javaScript file loaded");


function updateEngineData(){
	console.log("fetching data");
	fetch('/api/engine-data')
		.then(response => response.json())
		.then(data => {
			document.getElementById('dtfld_01').textContent = data.rpm + ' RPM';
		})
		.catch(error => console.eror('Error fetching engine data:', error));
}


// update data wehen page loads
document.addEventListener('DOMContentLoaded', function(){
	updateEngineData();
	setInterval(updateEngineData, 5000);	// call function every 5 seconds


});
*/
// dashboard.js - Contains the data fetching and dashboard logic
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

// Start the update cycle when the page loads
document.addEventListener('DOMContentLoaded', updateEngineData);