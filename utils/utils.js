

var pngInp = document.getElementById("pngInp"),
    pngConvertButton = document.getElementById("pngConvertButton"),
    zatnikOutContainer = document.getElementById("zatnikOutContainer"),
    zatnikOut = document.getElementById("zatnikOut"),
    zatnikInp = document.getElementById("zatnikInp"),
    zatnikConvertButton = document.getElementById("zatnikConvertButton"),
    zatnikViewButton = document.getElementById("zatnikViewButton"),
    pngScaleInp = document.getElementById("pngScaleInp"),
    zatnikErrorContainer = document.getElementById("zatnikErrorContainer"),
    zatnikErrorElem = document.getElementById("zatnikErrorElem"),
    pngOutContainer = document.getElementById("pngOutContainer"),
    pngOut = document.getElementById("pngOut"),
    pngViewContainer = document.getElementById("pngViewContainer"),
    pngView = document.getElementById("pngView"),
    commentsElem = document.getElementById("commentsElem"),
    commentsList = document.getElementById("commentsList");

var colorIdChars = "0123456789abcdefghijklmnopqrstuvwxyz~`!@#$%^&*()-_=+[{]}\\|;:'\",<.>?",
	multiSections = new Set(["comm"]);



pngConvertButton.onclick = () => {
	var canvas = document.createElement("canvas"),
		ctx = canvas.getContext("2d"),
		url = URL.createObjectURL(pngInp.files[0]);
	
	PNG.load(url, canvas, () => {
		URL.revokeObjectURL(url);
		zatnikOut.value = imageDataToZatnik(ctx.getImageData(0, 0, canvas.width, canvas.height));
		zatnikOutContainer.classList.remove("hidden");
	});
}

zatnikOut.onfocus = () => zatnikOut.select();


function imageDataToZatnik({width, height, data: pixels}) {
	var colors = new Set(),
		colorAmounts = {},
		hexPixels = [];
	
	for (let i = 0; i < pixels.length; i += 4) {
		let color = rgbToHex(pixels[i], pixels[i+1], pixels[i+2], pixels[i+3]);
		hexPixels.push(color);
		colors.add(color);
		colorAmounts[color] = (colorAmounts[color] || 0) + 1;
	}
	
	var ids = {},
		idLength = 1,
		idDefs = "",
		alphas = "";
	
	while (colors.size > colorIdChars.length ** idLength)
		idLength += 1;
	
	[...colors].sort((a, b) => {
		let aOpaque = a.substring(6, 8) === "ff",
			bOpaque = b.substring(6, 8) === "ff";
		
		if (!aOpaque && bOpaque) return -1;
		else if (!bOpaque && aOpaque) return 1;
		else return colorAmounts[b] - colorAmounts[a];
	}).forEach((color, i) => {
		var id = makeColorId(i, idLength),
			def = id + color.substring(0, 6),
			alpha = color.substring(6);
		
		ids[color] = id;
		idDefs += def;
		if (alpha !== "ff") {
			alphas += alpha;
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



zatnikConvertButton.addEventListener("click", () => {
	let c = convertZatnik();
	if (c) {
		pngOut.href = c[0];
		pngOutContainer.classList.remove("hidden");
	}
});

let viewingImageWidth, viewingImageHeight;

zatnikViewButton.addEventListener("click", () => {
	let c = convertZatnik();
	if (c) {
		let [url, {width, height, comments}] = c;
		viewingImageWidth = width;
		viewingImageHeight = height;
		pngView.src = url;
		pngView.width = width * pngScaleInp.value;
		pngView.height = height * pngScaleInp.value;
		if (comments.length) {
			commentsList.innerHTML = "";
			comments.forEach(c => {
				var elem = document.createElement("div");
				elem.textContent = c;
				commentsList.appendChild(elem);
			});
			commentsElem.classList.remove("hidden");
		} else commentsElem.classList.add("hidden");
		pngViewContainer.classList.remove("hidden");
	}
});

pngScaleInp.addEventListener("change", () => {
	pngView.width = viewingImageWidth * pngScaleInp.value;
	pngView.height = viewingImageHeight * pngScaleInp.value;
});

function convertZatnik(callback) {
	try {
		zatnikErrorContainer.classList.add("hidden");
		pngOutContainer.classList.add("hidden");
		pngOut.href = "";
		pngViewContainer.classList.add("hidden");
		pngView.src = "";
		
		var canvas = document.createElement("canvas"),
			ctx = canvas.getContext("2d"),
			image = parseZatnik(zatnikInp.value),
			data = zatnikToImageData(image);
		
		canvas.width = data.width;
		canvas.height = data.height;
		ctx.putImageData(data, 0, 0);
		
		return [canvas.toDataURL(), image];
	} catch(e) {
		console.log(e);
		zatnikErrorElem.textContent = e;
		zatnikErrorContainer.classList.remove("hidden");
		return false;
	}
}


function zatnikToImageData(image) {
	if (typeof image === "string") image = parseZatnik(image);
	
	return new ImageData(new Uint8ClampedArray(image.pixels), image.width, image.height);
}

function parseZatnik(code) {
	code = code.toLowerCase().replace(/^\s+|\s+$/g, "");
	
	let i = 0,
		sections = {},
		prevOrderedSection = -1;
	
	while (i < code.length) {
		let [name, ...sectionInfo] = parseSection();
		if (name) {
			if (multiSections.has(name)) {
				(sections[name] || (sections[name] = [])).push(sectionInfo);
			} else sections[name] = sectionInfo;
		} else sections[++prevOrderedSection] = sectionInfo;
	}
	
	let section, offset, j;
	
	if (!sections[0]) throw new Error("No unnamed sections found");
	loadSection(0);
	
	let width = parseNumber(n => n > 0);
	
	checkEnd();
	if (section[j] !== "*") throw new Error(`Expected asterisk at character ${j + 1 + offset}`);
	j++;
	
	let height = parseNumber(n => n > 0);
	
	if (!sections[1]) throw new Error("Only one unnamed section found");
	loadSection(1);
	
	let charsPerColor = parseNumber(n => n > 0, 1),
		colorDefs = [];
	
	while (j < section.length) {
		let code = parseString(charsPerColor);
		if (section[j] === "=") j++;
		let color = parseString(6, /[0-9a-f]/);
		
		colorDefs.push([code, color]);
	}
	
	let alphaDefs = [];
	
	if (sections.alph) {
		loadSection("alph");
		while (j < section.length) {
			alphaDefs.push(parseNumber(n => 0 <= n && n <= 255, 2, "0123456789abcdef"));
		}
	}
	
	let colors = {};
	
	colorDefs.forEach(([code, color], i) => {
		colors[code] = [
			parseInt(color.substring(0, 2), 16),
			parseInt(color.substring(2, 4), 16),
			parseInt(color.substring(4, 6), 16),
			alphaDefs[i] === undefined ? 255 : alphaDefs[i]
		];
	});
	
	if (!sections[2]) throw new Error("Only two unnamed sections found");
	loadSection(2);
	
	let numPixelValues = width * height * 4,
		pixels = [];
	
	while (j < section.length && pixels.length < numPixelValues) {
		let startJ = j,
			code = parseString(charsPerColor),
			color = colors[code];
		
		if (!color) throw new Error(`Unknown color code ${JSON.stringify(code)} at character ${startJ + 1 + offset}`);
		
		pixels.push(...color);
	}
	
	if (pixels.length < numPixelValues) throw new Error(`Image is missing ${(numPixelValues - pixels.length)/4} pixels`);
	
	let comments = [];
	
	if (sections.comm) {
		for (let i = 0; i < sections.comm.length; i++) {
			loadSection("comm", i);
			comments.push(parseText());
		}
	}
	
	return {width, height, pixels, comments}
	
	
	function loadSection(id, i) {
		let s = sections[id];
		if (i !== undefined) s = s[i];
		[section, offset] = s;
		j = 0;
	}
	
	function parseString(length, allowExpr) {
		checkEnd();
		let startJ = j,
			string = "";
		while (j < section.length && string.length < length) {
			if (allowExpr && !allowExpr.test(section[j])) throw new Error(`Unexpected character ${JSON.stringify(section[j])} at ${j + 1 + offset}`);
			string += section[j++];
		}
		if (string.length < length) throw sectionEndError();
		return string;
	}
	
	function parseNumber(validate, length, digits = "0123456789") {
		checkEnd();
		let maxLength = length || Infinity,
			startJ = j,
			string = "";
		while (j < section.length && digits.indexOf(section[j]) > -1 && string.length < maxLength) {
			string += section[j++];
		}
		if (length && string.length < length) throw new Error(`Expected ${length}-digit${digits.length === 10 ? "" : " base-" + digits.length} number at character ${startJ + 1 + offset}`);
		let num = parseInt(string, digits.length);
		if (validate && !validate(num)) throw new Error(`Invalid number at character ${startJ + 1 + offset}`);
		return num;
	}
	
	function parseText() {
		var result = "";
		while (j < section.length) {
			if (section[j] === "\\") {
				j++;
				let type = section[j++];
				if (type === "u") {
					let code = "";
					while (j < section.length && /[0-9a-f]/.test(section[j])) {
						code += section[j++];
					}
					if (section[j] === ";") j++;
					result += String.fromCodePoint(parseInt(code, 16));
				} else if (type === "c") {
					if (section[j]) result += section[j++].toUpperCase();
				} else {
					if (type === "l") result += "/";
					else if (type === "s") result += " ";
					else if (type === "t") result += "\t";
					else if (type === "n") result += "\n";
					else if (type === "r") result += "\r";
					else result += type || "";
				}
			} else {
				result += section[j++];
			}
		}
		return result;
	}
	
	function checkEnd() {
		if (j >= section.length) throw sectionEndError();
	}
	
	function sectionEndError() {
		return new Error(`Unexpected end of section after character ${j + offset}`);
	}
	
	function parseSection() {
		if (code[i] === "/") i++;
		if (i < code.length) {
			let name;
			if (code[i] === "/") {
				i++;
				name = "";
				while (name.length < 4 && i < code.length && code[i] !== "/") {
					name += code[i++];
				}
				if (name.length < 4) {
					if (code[i] === "/") throw slashError();
					else throw endError();
				}
			}
			let offset = i, content = "";
			while (i < code.length && code[i] !== "/") {
				content += code[i++];
			}
			return [name, content, offset];
		} else throw endError();
	}
	
	function endError() {
		return new Error(`Unexpected end of input after character ${i}`);
	}
	
	function slashError() {
		return new Error(`Unexpected slash at character ${i + 1}`);
	}
}

