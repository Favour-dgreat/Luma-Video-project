// Array of API keys
const apiKeys = [
    '531c2711-c5a1-4613-8b20-5cdf407e0958-078ddbe-fe8f-498d-855f-32448cb32ae6',
    'another-api-key-here',
    'yet-another-api-key-here'
];
let currentKeyIndex = 0;
let keyUsageCount = new Array(apiKeys.length).fill(0); // Initialize usage count for each key

// Function to get the current API key and switch if exhausted
function getApiKey() {
    if (keyUsageCount[currentKeyIndex] >= 10) {
        currentKeyIndex = (currentKeyIndex + 1) % apiKeys.length;
    }
    return apiKeys[currentKeyIndex];
}

// Function to increment the usage count for the current key
function incrementApiKeyUsage() {
    keyUsageCount[currentKeyIndex]++;
}

let globalSlug; // Global variable to store the slug

document.getElementById('uploadForm').addEventListener('submit', async function(event) {
    event.preventDefault();
    
    const textTitle = document.getElementById('textTitle').value;
    const file = document.getElementById('file').files[0];
    const statusDiv = document.getElementById('status');
    const statusButton = document.getElementById('status_button');

    if (!textTitle && !file) {
        alert('Please enter text or select a file to upload.');
        return;
    }

    try {
        let slug;
        const apiKey = getApiKey(); // Get the current API key

        if (textTitle) {
            console.log("Creating capture from text...");
            const createResponse = await axios.post('https://webapp.engineeringlumalabs.com/api/v2/capture', { title: textTitle }, {
                headers: {
                    'Authorization': `luma-api-key=${apiKey}`,
                    'Content-Type': 'application/json'
                }
            });

            if (createResponse.status !== 200) {
                throw new Error(`Failed to create capture. Status code: ${createResponse.status}`);
            }

            incrementApiKeyUsage(); // Increment usage count

            const captureData = createResponse.data;
            slug = captureData.capture.slug;

            console.log("Triggering processing...");
            const triggerResponse = await fetch(`https://webapp.engineeringlumalabs.com/api/v2/capture/${slug}`, {
                method: 'GET',
                headers: {
                    'Authorization': `luma-api-key=${apiKey}`
                }
            });

            if (!triggerResponse.ok) {
                throw new Error('Failed to trigger processing.');
            }

        } else if (file) {
            console.log("Creating capture from image...");
            const createResponse = await axios.post('https://webapp.engineeringlumalabs.com/api/v2/capture', { title: "Image Upload" }, {
                headers: {
                    'Authorization': `luma-api-key=${apiKey}`,
                    'Content-Type': 'application/json'
                }
            });

            if (createResponse.status !== 200) {
                throw new Error(`Failed to create capture. Status code: ${createResponse.status}`);
            }

            incrementApiKeyUsage(); // Increment usage count

            const captureData = createResponse.data;
            const uploadUrl = captureData.signedUrls.source;
            slug = captureData.capture.slug;

            console.log("Uploading file...");
            const uploadResponse = await fetch(uploadUrl, {
                method: 'PUT',
                headers: {
                    'Content-Type': file.type // Use the correct MIME type of the file
                },
                body: file
            });

            if (!uploadResponse.ok) {
                throw new Error('Failed to upload file.');
            }

            console.log("Triggering processing...");
            const triggerResponse = await fetch(`https://webapp.engineeringlumalabs.com/api/v2/capture/${slug}`, {
                method: 'POST',
                headers: {
                    'Authorization': `luma-api-key=${apiKey}`
                }
            });

            if (!triggerResponse.ok) {
                throw new Error('Failed to trigger processing.');
            }
        }

        globalSlug = slug; // Store the slug in the global variable

        statusButton.innerHTML = `<p>Capture created successfully. Capture slug: ${slug}</p>
                                  <p><a href="#" onclick="checkStatus()">Check Status</a></p>`;
        
        // Start polling for status
        pollStatus(apiKey, slug, statusDiv);

    } catch (error) {
        console.error(error);
        statusDiv.textContent = `Error: ${error.message}`;
    }
});

async function checkStatus() {
    if (!globalSlug) {
        alert('No capture in progress.');
        return;
    }

    const apiKey = getApiKey(); // Get the current API key
    const statusDiv = document.getElementById('status');
    
    console.log("Checking status...");
    try {
        const response = await fetch(`https://webapp.engineeringlumalabs.com/api/v2/capture/${globalSlug}`, {
            method: 'GET',
            headers: {
                'Authorization': `luma-api-key=${apiKey}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to check status.');
        }

        const captureData = await response.json();
        statusDiv.innerHTML = `<pre>${JSON.stringify(captureData, null, 2)}</pre>`;

        if (captureData.latestRun && captureData.latestRun.status === 'complete') {
            renderVideo(captureData.latestRun.artifacts);
        } else {
            // Continue polling if not complete
            setTimeout(() => pollStatus(apiKey, globalSlug, statusDiv), 5000); // Poll every 5 seconds
        }
    } catch (error) {
        console.error(error);
        statusDiv.textContent = `Error: ${error.message}`;
    }
}

async function pollStatus(apiKey, slug, statusDiv) {
    try {
        const response = await fetch(`https://webapp.engineeringlumalabs.com/api/v2/capture/${slug}`, {
            method: 'GET',
            headers: {
                'Authorization': `luma-api-key=${apiKey}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to check status.');
        }

        const captureData = await response.json();
        statusDiv.innerHTML = `<pre>${JSON.stringify(captureData, null, 2)}</pre>`;

        if (captureData.latestRun && captureData.latestRun.status === 'complete') {
            // Render the video when the status is 'complete'
            renderVideo(captureData.latestRun.artifacts);
        } else {
            // Continue polling after a delay if still processing
            setTimeout(() => pollStatus(apiKey, slug, statusDiv), 5000); // Poll every 5 seconds
        }
    } catch (error) {
        console.error(error);
        statusDiv.textContent = `Error: ${error.message}`;
    }
}

function renderVideo(artifacts) {
    const statusDiv = document.getElementById('status');

    if (artifacts && artifacts.length > 0) {
        const videoArtifact = artifacts.find(artifact => artifact.type === 'video/mp4');
        if (videoArtifact && videoArtifact.url) {
            const videoElement = document.createElement('video');
            videoElement.controls = true;
            videoElement.src = videoArtifact.url;
            videoElement.width = 640; // Set the width as needed
            videoElement.height = 360; // Set the height as needed
            statusDiv.innerHTML = '';
            statusDiv.appendChild(videoElement);
        } else {
            statusDiv.textContent = 'No video URL found in artifacts.';
        }
    } else {
        statusDiv.textContent = 'No artifacts available.';
    }
}
