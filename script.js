document.getElementById('uploadForm').addEventListener('submit', async function(event) {
    event.preventDefault();
    
    const title = document.getElementById('title').value;
    const file = document.getElementById('file').files[0];
    const statusDiv = document.getElementById('status');
    const apiKey = '124fcc35-582d-467e-9017-50962efd8ba8-89ab526-8a73-4ecf-a367-4037963b8962';


    // axios.get('https://jsonplaceholder.typicode.com/todos/1')
    //   .then(function (response) {
    //     console.log(response);
    //   })
    //   .catch(function (error) {
    //     console.log(error);
    //   })
    //   .finally(function () {
    //   });

    if (!file) {
        alert('Please select a file to upload.');
        return;
    }

    try {
       
        // const createResponse = await fetch('https://webapp.engineeringlumalabs.com/api/v2/capture', {
        //     method: 'POST',
        //     headers: {
        //         'Authorization': `luma-api-key=${apiKey}`,
        //         'Content-Type': 'application/json'
        //     },
        //     body: JSON.stringify({ title: title })
        // });

        const createResponse = await axios.post('https://webapp.engineeringlumalabs.com/api/v2/capture', {title}, {headers: {
            'Authorization': `luma-api-key=${apiKey}`,
            'Content-Type': 'application/json'
        }})
        .then((res)=>{
            console.log(res.data)
        })
        .catch((e)=> {
            console.log(e)
        })

        

        const captureData = await createResponse.json();
        const uploadUrl = captureData.signedUrls.source;
        const slug = captureData.capture.slug;

    
        const uploadResponse = await fetch(uploadUrl, {
            method: 'PUT',
            headers: {
                'Content-Type': 'text/plain'
            },
            body: file
        });

        if (!uploadResponse.ok) {
            throw new Error('Failed to upload file.');
        }

        // Step 3: Trigger Processing
        const triggerResponse = await fetch(`https://webapp.engineeringlumalabs.com/api/v2/capture/${slug}`, {
            method: 'POST',
            headers: {
                'Authorization': `luma-api-key=${apiKey}`
            }
        });

        if (!triggerResponse.ok) {
            throw new Error('Failed to trigger processing.');
        }

        statusDiv.innerHTML = `<p>Capture created and file uploaded successfully. Capture slug: ${slug}</p>
                               <p><a href="#" onclick="checkStatus('${slug}')">Check Status</a></p>`;
    } catch (error) {
        statusDiv.textContent = `Error: ${error.message}`;
    }
});

async function checkStatus(slug) {
    const statusDiv = document.getElementById('status');
    const apiKey = '124fcc35-582d-467e-9017-50962efd8ba8-89ab526-8a73-4ecf-a367-4037963b8962';
    try {
        // Step 4: Check Status
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
    } catch (error) {
        statusDiv.textContent = `Error: ${error.message}`;
    }
}
