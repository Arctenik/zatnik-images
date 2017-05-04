

var pngInp = document.getElementById("pngInp"),
    pngConvertButton = document.getElementById("pngConvertButton"),
    zatnikOutContainer = document.getElementById("zatnikOutContainer"),
    zatnikOut = document.getElementById("zatnikOut"),
    zatnikInp = document.getElementById("zatnikInp"),
    zatnikConvertButton = document.getElementById("zatnikConvertButton"),
    zatnikViewButton = document.getElementById("zatnikViewButton"),
    pngOutContainer = document.getElementById("pngOutContainer"),
    pngOut = document.getElementById("pngOut");
    pngViewContainer = document.getElementById("pngViewContainer"),
    pngView = document.getElementById("pngView");

var colorIdChars = "0123456789abcdefghijklmnopqrstuvwxyz~`!@#$%^&*()-_=+[{]}\\|;:'\",<.>?";



pngConvertButton.onclick = () => {
	var canvas = document.createElement("canvas"),
		ctx = canvas.getContext("2d"),
		url = URL.createObjectURL(pngInp.files[0]);
	
	PNG.load(url, canvas, () => {
		URL.revokeObjectURL(url);
		zatnikOut.value = imageDataToZatnik(ctx.getImageData(0, 0, canvas.width, canvas.height));
		zatnikOutContainer.style.display = "block";
	});
}

zatnikOut.onfocus = () => zatnikOut.select();


function imageDataToZatnik({width, height, data: pixels}) {
	var colors = new Set(),
		hexPixels = [];
	
	for (let i = 0; i < pixels.length; i += 4) {
		let color = rgbToHex(pixels[i], pixels[i+1], pixels[i+2], pixels[i+3]);
		hexPixels.push(color);
		colors.add(color);
	}
	
	var ids = {},
		idLength = 1,
		idDefs = "",
		alphas = "";
	
	while (colors.size > colorIdChars.length ** idLength)
		idLength += 1;
	
	[...colors].forEach((color, i) => {
		var id = makeColorId(i, idLength),
			def = id + color.substring(0, 6),
			alpha = color.substring(6);
		
		ids[color] = id;
		if (alpha === "ff") idDefs += def;
		else {
			idDefs = def + idDefs;
			alphas = alpha + alphas;
		}
	});
	
	return `${width}*${height}/${idLength}${idDefs}${alphas ? "//alph" + alphas : ""}/${hexPixels.map(c => ids[c]).join("")}`;
}

function makeColorId(i, length) {
	var result = "";
	do {
		let ones = i%colorIdChars.length;
		result = colorIdChars[ones] + result;
		i = (i - ones)/colorIdChars.length;
	} while (i > 0);
	while (result.length < length) result = colorIdChars[0] + result;
	return result;
}


function rgbToHex(r, g, b, a) {
	return hexByte(r) + hexByte(g) + hexByte(b) + (a === undefined ? "" : hexByte(a));
}

function hexByte(num) {
	num = num.toString(16);
	return num.length == 1 ? "0" + num : num.substring(num.length - 2);
}



zatnikConvertButton.onclick = () => convertZatnik(url => {
	pngOut.href = url;
	pngOutContainer.style.display = "block";
});

zatnikViewButton.onclick = () => convertZatnik(url => {
	pngView.src = url;
	pngViewContainer.style.display = "block";
});

function convertZatnik(urlCallback) {
	var canvas = document.createElement("canvas"),
		ctx = canvas.getContext("2d"),
		data = zatnikToImageData(zatnikInp.value);
	
	canvas.width = data.width;
	canvas.height = data.height;
	ctx.putImageData(data, 0, 0);
	
	urlCallback(canvas.toDataURL());
}


function zatnikToImageData(code) {
	var image = parseZatnik(code),
		data = new ImageData(image.width, image.height),
		pixels = data.data;
	
	image.pixels.forEach(([r, g, b, a], i) => {
		i *= 4;
		pixels[i] = r;
		pixels[i + 1] = g;
		pixels[i + 2] = b;
		pixels[i + 3] = a;
	});
	
	return data;
}

function parseZatnik(code) {
	code = code.toLowerCase();
	
	var sections = {},
		prevOrderedSection = -1;
		
	while (code) {
		let section, name;
		[code, section, name] = parseZatnikSection(code);
		sections[name || ++prevOrderedSection] = section;
	}
	
	var idLength = parseInt(sections[1][0]),
		colorDefs = [],
		alphas = [];
	
	for (let i = 1; i < sections[1].length; i += idLength + 6) {
		colorDefs.push([
			sections[1].substring(i, i + idLength),
			sections[1].substring(i + idLength, i + idLength + 6)
		]);
	}
	
	if (sections.alph) {
		for (let i = 0; i < sections.alph.length; i += 2)
			alphas.push(sections.alph.substring(i, i + 2));
	}
	
	var [width, height] = sections[0].split("*").map(n => parseInt(n)),
		colors = {},
		pixels = [];
	
	colorDefs.forEach(([id, color], i) => {
		colors[id] = [
			parseInt(color.substring(0, 2), 16),
			parseInt(color.substring(2, 4), 16),
			parseInt(color.substring(4, 6), 16),
			alphas[i] ? parseInt(alphas[i], 16) : 255
		];
	});
	
	for (let i = 0; i < sections[2].length; i += idLength)
		pixels.push(colors[sections[2].substring(i, i + idLength)]);
	
	return {
		width, height, pixels
	}
}

function parseZatnikSection(code) {
	var i = code[0] === "/" ? 1 : 0,
		name;
		
	if (code[i] === "/") {
		name = code.substring(i + 1, i + 5);
		i += 5;
	}
	
	var nextSlash = code.indexOf("/", i),
		sectionEnd = nextSlash === -1 ? code.length : nextSlash;
	
	return [code.substring(sectionEnd), code.substring(i, sectionEnd), name];
}