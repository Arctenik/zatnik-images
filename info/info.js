

var hlColors = ["#ffd3d3", "#d3ffd3", "#d3d3ff"];

document.querySelectorAll(".hl").forEach(elem => {
	var hlSelector;
	for (let c of elem.classList) {
		if (c.substring(0, 2) === "ex") {
			hlSelector = `.${c.substring(0, 3)} .${c}`;
			break;
		}
	}
	if (hlSelector) {
		elem.addEventListener("mouseenter", () => {
			document.querySelectorAll(hlSelector).forEach((e, i) => {
				e.style.background = hlColors[i%hlColors.length];
			});			
		});
		
		elem.addEventListener("mouseleave", () => {
			document.querySelectorAll(hlSelector).forEach((e, i) => {
				e.style.background = "none";
			});			
		});
	}
});