// first function to fetch and update engine data
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
