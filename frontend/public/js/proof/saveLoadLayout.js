function saveLayout(xmlName) {
	let data = ["id,x,y"];
	d3.selectAll("g").each(({ id, x, y }) => {
		data.push([id, x, y]);
	});
	download(xmlName.substring(0, xmlName.indexOf(".")) + "_layout.txt", data.join("\n"));
}

function loadLayout(layoutFileName) {
	d3.csv(layoutFileName, function (error, csv) {
		if (error) throw error;
		d3.keys(csv).forEach(key => {
			const { id, x, y } = csv[key]
			if (x) {
				d3.select("#" + id).attr("cx", x);
				d3.select("#" + id).attr("cy", y);
			}
		});
	});
}

//There is a problem caused by this function, after it's been called, elements can not be inspected anymore
function download(filename, text) {
	var element = document.createElement('a');
	element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
	element.setAttribute('download', filename);
	element.style.display = 'none';

	document.body.appendChild(element);
	element.click();
	document.body.removeChild(element);
}