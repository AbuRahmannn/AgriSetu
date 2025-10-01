document.addEventListener('DOMContentLoaded', () => {
    const getRecBtn = document.getElementById('getRec');
    const resultDiv = document.getElementById('result');
    const resultPre = resultDiv.querySelector('pre');

    getRecBtn.addEventListener('click', async () => {
        // Show loading state and clear previous results
        getRecBtn.innerText = 'Analyzing...';
        getRecBtn.disabled = true;
        resultPre.innerText = 'Calculating the best crop for you...';
        resultDiv.classList.remove('hidden');

        const payload = {
            ph: parseFloat(document.getElementById('ph').value),
            nitrogen: parseFloat(document.getElementById('n').value),
            phosphorus: parseFloat(document.getElementById('p').value),
            potassium: parseFloat(document.getElementById('k').value),
            moisture: parseFloat(document.getElementById('moist').value),
            temperature: parseFloat(document.getElementById('temp').value),
            rainfall: parseFloat(document.getElementById('rain').value)
        };

        try {
            const res = await fetch('http://localhost:8000/api/recommend_crop', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                throw new Error(`Server responded with status: ${res.status}`);
            }
            
            const data = await res.json();
            
            // Format the result nicely
            resultPre.innerText = JSON.stringify(data, null, 2);

        } catch (error) {
            console.error('Error fetching recommendation:', error);
            // Display a user-friendly error message
            resultPre.innerText = `Sorry, something went wrong. This might be because the server is not running or the URL is incorrect. Please check the URL and try again.\n\nError: ${error.message}`;
        } finally {
            // Reset button state
            getRecBtn.innerText = 'Get Recommendation';
            getRecBtn.disabled = false;
        }
    });
});
