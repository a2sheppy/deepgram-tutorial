const kDeepgramURL = "https://brain.deepgram.com/v2/listen";

window.addEventListener("load", start);

function start() {
    document.getElementById("transcribe").addEventListener("click", transcribe);
}

async function transcribe() {
    console.log("Starting to transcribe...");
    let inUsername = document.getElementById("username").value;
    let inPassword = document.getElementById("password").value;
    let inPunctuate = document.getElementById("punctuate").checked;
    let inDiarize = document.getElementById("diarize").checked;
    let inModel = document.getElementById("model").value;
    let inLanguage = document.getElementById("language").value;

    let inURL = document.getElementById("url").value;
    let file = null;

    document.getElementById("transcription").innerText = "";
    document.querySelector("table#word-table tbody").innerHTML = "";

    // If the URL isn't specified, we need to use one of the file inputs

    if (inURL.length === 0) {
        let input = document.getElementById("mic-input");

        if (input.files) {
            file = input.files[0];
        }
        if (!file) {
            input = document.getElementById("file-input");
            console.log("INPUT:");
            console.dir("input")
    
            if (input.files) {
                file = input.files[0];
            }
        }
    }

    console.log("FILE:");
    console.dir(file);

    let options = {
        username: inUsername,
        password: inPassword,
        model: inModel,
        language: inLanguage
    };

    if (inPunctuate) {
        options.punctuate = "true";
    }

    if (inDiarize) {
        options.diarize = "true";
    }

    if (inURL) {
        options.url = inURL;
    }

    if (file) {
        let audioData = await file.arrayBuffer();
        
        if (audioData) {
            options.data = audioData;
        }
    }

    try {
        let result = await sendDeepgramRequest(options);
        document.getElementById("transcription").innerText = result.results.channels[0].alternatives[0].transcript;

        let words = result.results.channels[0].alternatives[0].words;
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
            speakerCell.innerText = word.speaker;
            row.appendChild(numCell);
            row.appendChild(wordCell);
            row.appendChild(startCell);
            row.appendChild(speakerCell);
            tbody.appendChild(row);
        });
    } catch(e) {
        document.getElementById("transcription").innerHTML = `<span style="color: red">${e}`;
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

        let requestUrl = `${kDeepgramURL}${paramString}`;

        request.open("POST", requestUrl);
        request.setRequestHeader("Authorization", "Basic " + btoa(`${username}:${password}`));
        request.withCredentials = true;
        request.responseType = "json";

        request.onload = () => {
            if (request.status >= 200 && request.status < 300) {
                resolve(request.response);
            } else {
                //if (request.status !== 400) {
                    reject(request.statusText);
                //}
            }
        };

        request.onerror = () => {
            //if (request.status !== 400) {
                reject(request.statusText);
            //}
        }

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