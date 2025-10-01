document.addEventListener('DOMContentLoaded', () => {
    const fileInput = document.getElementById('img');
    const sendBtn = document.getElementById('send');
    const resultDiv = document.getElementById('result');
    const predictionText = document.getElementById('prediction');
    const rawDataPre = document.getElementById('rawData');
    const messageBox = document.getElementById('messageBox');
    const previewImage = document.getElementById('previewImage');
    const placeholder = document.getElementById('placeholder');

    // Function to show a custom modal alert
    const showAlert = (title, message, isError = false) => {
        messageBox.innerHTML = `
            <div class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex justify-center items-center z-50 animate-fadeIn">
                <div class="bg-gray-800 text-white p-8 rounded-lg shadow-xl border-2 ${isError ? 'border-red-600' : 'border-green-600'} animate-fadeInUp">
                    <p class="text-xl font-semibold mb-4">${title}</p>
                    <p>${message}</p>
                    <div class="flex justify-center mt-6">
                        <button class="bg-gray-700 hover:bg-gray-600 px-6 py-2 rounded-lg font-bold transition-colors" onclick="this.parentElement.parentElement.parentElement.remove()">Close</button>
                    </div>
                </div>
            </div>
        `;
    };

    // Image preview functionality
    fileInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                previewImage.src = e.target.result;
                previewImage.classList.remove('hidden');
                placeholder.classList.add('hidden');
            };
            reader.readAsDataURL(file);
        }
    });

    sendBtn.addEventListener('click', async () => {
        const file = fileInput.files[0];

        if (!file) {
            showAlert('No Image Selected', 'Please choose an image file to analyze.', true);
            return;
        }

        // Show loading state
        sendBtn.innerText = 'Analyzing...';
        sendBtn.disabled = true;
        resultDiv.classList.remove('hidden');
        predictionText.innerText = 'Analyzing image...';
        rawDataPre.innerText = 'Waiting for results from the server...';

        const fd = new FormData();
        fd.append('file', file, file.name);

        try {
            const res = await fetch('http://localhost:8000/api/predict_disease', {
                method: 'POST',
                body: fd
            });

            if (!res.ok) {
                throw new Error(`Server responded with status: ${res.status}`);
            }

            const data = await res.json();
            
            // Assuming the API returns a 'prediction' field in a JSON object
            if (data.prediction) {
                predictionText.innerText = `Prediction: ${data.prediction}`;
                rawDataPre.innerText = JSON.stringify(data, null, 2);
            } else {
                predictionText.innerText = 'No clear prediction found.';
                rawDataPre.innerText = JSON.stringify(data, null, 2);
            }

        } catch (error) {
            console.error('Error during analysis:', error);
            predictionText.innerText = 'Error: Analysis failed.';
            rawDataPre.innerText = `Sorry, something went wrong. This might be because the server is not running or the URL is incorrect. Please check the URL and try again.\n\nError: ${error.message}`;
            showAlert('Analysis Failed', `An error occurred while trying to analyze the image. Please check the server and try again.\n\nError: ${error.message}`, true);
        } finally {
            // Reset button state
            sendBtn.innerText = 'Analyze Image';
            sendBtn.disabled = false;
        }
    });
});
