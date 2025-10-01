import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, collection, addDoc, onSnapshot, orderBy, query, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { setLogLevel } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Log all debug messages to the console
setLogLevel('debug');

let db, auth, userId;

// Ensure firebase config and app ID are defined
const firebaseConfig = JSON.parse(typeof __firebase_config !== 'undefined' ? __firebase_config : '{}');
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

// Initialize Firebase App
const app = initializeApp(firebaseConfig);
db = getFirestore(app);
auth = getAuth(app);

// Example hardcoded data for initial display
const exampleThreads = [{
    title: "Best natural pesticide for aphids?",
    author: "Ramesh Sharma",
    userId: "s_148384-29938",
    body: "I'm having a problem with aphids on my rose plants. I'd prefer a natural solution instead of chemicals. Has anyone had success with neem oil or soap spray?",
    createdAt: new Date(Date.now() - 3600000).toLocaleString()
}, {
    title: "Irrigation techniques for dry weather",
    author: "Priya Singh",
    userId: "p_94751-28560",
    body: "The weather has been unusually dry this season. What are some effective irrigation techniques to conserve water while ensuring my crops get enough moisture? I'm growing maize.",
    createdAt: new Date(Date.now() - 7200000).toLocaleString()
}, {
    title: "Market price for tomatoes this month",
    author: "Anil Verma",
    userId: "a_72342-99881",
    body: "Hi everyone, I'm about to harvest my tomato crop and wanted to know the current market rates in the region. Any insights on pricing trends would be very helpful.",
    createdAt: new Date(Date.now() - 10800000).toLocaleString()
}];

// Function to render a single thread
const renderThread = (threadData, container, isFirestoreThread) => {
    const el = document.createElement('div');
    el.classList.add('thread-card', 'mb-4');
    if (isFirestoreThread) {
        el.classList.add('firestore-thread');
    }
    const formattedDate = threadData.createdAt ? 
                          (isFirestoreThread ? new Date(threadData.createdAt.toMillis()).toLocaleString() : threadData.createdAt) : 
                          'Just now';
    el.innerHTML = `
        <h4 class="text-xl font-semibold text-green-400 mb-1">${threadData.title}</h4>
        <p class="text-sm text-gray-400 mb-2">by ${threadData.author} <span class="text-xs text-gray-500">(${threadData.userId})</span> at ${formattedDate}</p>
        <p class="text-gray-300">${threadData.body}</p>
    `;
    container.appendChild(el);
};

// Function to load and display threads from Firestore and examples
window.loadThreads = function() {
    const threadsList = document.getElementById('threads');
    
    // Add the hardcoded example threads first, as they are static
    threadsList.innerHTML = '';
    exampleThreads.forEach(thread => {
        renderThread(thread, threadsList, false);
    });

    // Now, set up the real-time listener for Firestore data
    const threadsCol = collection(db, 'artifacts', appId, 'public', 'data', 'forum_threads');
    const q = query(threadsCol, orderBy("createdAt", "desc"));
    
    onSnapshot(q, (snapshot) => {
        // Clear only the Firestore-loaded threads before re-rendering
        const firestoreThreads = threadsList.querySelectorAll('.firestore-thread');
        firestoreThreads.forEach(el => el.remove());
        
        snapshot.forEach((doc) => {
            const thread = doc.data();
            renderThread(thread, threadsList, true);
        });
    });
};

// Function to post a new thread to Firestore
window.postThread = async function() {
    const title = document.getElementById('title').value.trim();
    const body = document.getElementById('body').value.trim();
    
    if (title === "" || body === "") {
        const messageBox = document.getElementById('messageBox');
        messageBox.innerHTML = `
            <div class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex justify-center items-center z-50">
                <div class="bg-red-800 text-white p-8 rounded-lg shadow-xl border-2 border-red-900 animate-fadeInUp">
                    <p class="text-xl font-semibold mb-4">Error</p>
                    <p>Title and body fields cannot be empty.</p>
                    <div class="flex justify-center mt-6">
                        <button class="bg-red-600 hover:bg-red-700 px-6 py-2 rounded-lg font-bold transition-colors" onclick="this.parentElement.parentElement.parentElement.remove()">Close</button>
                    </div>
                </div>
            </div>
        `;
        return;
    }

    const author = document.getElementById('author').value.trim() || 'Anonymous Farmer';

    try {
        const threadsCol = collection(db, 'artifacts', appId, 'public', 'data', 'forum_threads');
        await addDoc(threadsCol, {
            title: title,
            body: body,
            author: author,
            userId: userId,
            createdAt: serverTimestamp()
        });

        document.getElementById('title').value = '';
        document.getElementById('body').value = '';
    } catch (e) {
        console.error("Error adding document: ", e);
    }
};

// Sign in and load threads on page load
onAuthStateChanged(auth, user => {
    if (user) {
        userId = user.uid;
        document.getElementById('userIdDisplay').innerText = `Your User ID: ${userId}`;
        loadThreads();
    } else {
        signIn();
    }
});

// Initial sign-in call if not already signed in
signIn();
