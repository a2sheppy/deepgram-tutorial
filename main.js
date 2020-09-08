const kDeepgramURL = "https://brain.deepgram.com/v2/listen";

window.addEventListener("load", start);

function start() {
    document.getElementById("transcribe").addEventListener("click", transcribe);
}

async function transcribe() {
    let inUsername = document.getElementById("username").value;
    let inPassword = document.getElementById("password").value;
    let inPunctuate = document.getElementById("punctuate").checked;
    let inDiarize = document.getElementById("diarize").checked;
    let inModel = document.getElementById("model").value;
    let inLanguage = document.getElementById("language").value;

    let inURL = document.getElementById("url").value;
    let inFile = null;

    document.getElementById("transcription").innerText = "";
    document.querySelector("table#word-table tbody").innerHTML = "";

    // If the URL isn't specified, we need to use one of the file inputs

    if (inURL.length === 0) {
        let input = document.getElementById("mic-input");

        if (input.files) {
            inFile = input.files[0];
        }
        if (!inFile) {
            input = document.getElementById("file-input");
    
            if (input.files) {
                inFile = input.files[0];
            }
        }
    }

    let options = {
        username: inUsername,
        password: inPassword,
        model: inModel,
        language: inLanguage,
        punctuate: inPunctuate ? "true" : "false",
        diarize: inDiarize ? "true" : "false",
        alternatives: 1         /* always only get one alternative */
    };

    if (inURL) {
        options.url = inURL;
    }

    if (inFile) {
        let audioData = await inFile.arrayBuffer();
        
        if (audioData) {
            options.data = audioData;
        }
    }

    let xhrResponse;

    try {
        xhrResponse = await sendDeepgramRequest(options);
    } catch(e) {
        document.getElementById("transcription").innerHTML = `<span style="color: red">${e}`;
    }

    if (xhrResponse) {
        document.getElementById("transcription").innerText = xhrResponse.results.channels[0].alternatives[0].transcript;

        let words = xhrResponse.results.channels[0].alternatives[0].words;
        let tbody = document.querySelector("table#word-table tbody");

        words.forEach((word, index) => {
            let row = document.createElement("tr");
            let numCell = document.createElement("td");
            let wordCell = document.createElement("td");
            let startCell = document.createElement("td");
            let speakerCell = document.createElement("td");

            numCell.innerText = index + 1;
            wordCell.innerText = word.word;
            startCell.innerText = word.start;
            speakerCell.innerText = (word.speaker + 1) || "n/a";
            row.appendChild(numCell);
            row.appendChild(wordCell);
            row.appendChild(startCell);
            row.appendChild(speakerCell);
            tbody.appendChild(row);
        });
    }
}

function sendDeepgramRequest(options) {
    return new Promise((resolve, reject) => {
        let request = new XMLHttpRequest();
        let url;
        let username;
        let password;
        let data;
        let paramString = "";

        // Pull the options out and set up our request input data

        for (const [key, value] of Object.entries(options)) {
            switch(key) {
                case "username":
                    username = encodeURI(value);
                    break;
                case "password":
                    password = encodeURI(value);
                    break;
                case "url":
                    url = value;
                    break;
                case "data":
                    data = value;
                    break;
                default: {
                    if (!paramString.length) {
                        paramString = "?";
                    } else {
                        paramString += "&";
                    }

                    paramString += key;
                    if (value) {
                        paramString += `=${encodeURI(value)}`;
                    }
                    break;
                }
            }
        }

        request.onload = () => {
            let progressElem = document.querySelector("progress");

            if (request.status >= 200 && request.status < 300) {
                resolve(request.response);
            } else {
                reject(request.statusText);
            }

            progressElem.max = 0;
            progressElem.value = 0;
        };

        request.onerror = () => {
            reject(request.statusText);
        }

        // Watch for upload progress events

        request.upload.addEventListener("loadstart", uploadProgress);
        request.upload.addEventListener("progress", uploadProgress);
        request.upload.addEventListener("loadend", uploadProgress);

        // Watch for download progress events

        request.addEventListener("loadstart", downloadProgress);
        request.addEventListener("progress", downloadProgress);
        request.addEventListener("loadend", downloadProgress);

        let requestUrl = `${kDeepgramURL}${paramString}`;

        request.open("POST", requestUrl);
        request.setRequestHeader("Authorization", "Basic " + btoa(`${username}:${password}`));
        request.withCredentials = true;
        request.responseType = "json";

        // If no data, use the URL field's value

        if (!data) {
            data = {
                "url": url
            };
            data = JSON.stringify(data);
            request.setRequestHeader("Content-Type", "application/json");
        }

        request.send(data);
    });
}

function downloadProgress(event) {
    let progressElem = document.querySelector("progress");
    let labelElem = document.getElementById("progress-label");

    switch(event.type) {
        case "loadstart":
            labelElem.innerText = "Receiving results...";
            break;
        case "loadend":
            labelElem.innerText = "Progress:";
            break;
    }
    progressElem.value = event.loaded;
    progressElem.max = event.total;
}

function uploadProgress(event) {
    let progressElem = document.querySelector("progress");
    let labelElem = document.getElementById("progress-label");

    switch(event.type) {
        case "loadstart":
            labelElem.innerText = "Sending request...";
            break;
        case "loadend":
            labelElem.innerText = "Letting the AI think about it...";
            break;
    }
    progressElem.value = event.loaded;
    progressElem.max = event.total;
}