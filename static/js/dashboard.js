// first function to fetch and update engine data
function updateEngineData(){
	fetch('/api/engine-data')
		.then(response => response.json())
		.then(data => {
			document.getElementById('rpm-display').tex
		})
}
