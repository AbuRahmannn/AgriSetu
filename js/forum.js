// ==========================================================================
// AgriSetu Community Forum Page Controller (Discussion Boards)
// ==========================================================================

import { profileName } from "./main.js";
import { API_BASE } from "./config.js";

let selectedCategory = "";

document.addEventListener("DOMContentLoaded", () => {
  initForum();
  fetchForumThreads();
  fetchRedditTrending();
});

function initForum() {
  const submitBtn = document.getElementById("submitPost");
  const authorInput = document.getElementById("postAuthor");

  // Default nickname from profile
  if (authorInput) {
    authorInput.value = profileName;
  }

  // Submit new discussion thread with optional crop image
  submitBtn.addEventListener("click", async () => {
    const title = document.getElementById("postTitle").value.trim();
    const author = authorInput.value.trim() || "Farmer";
    const category = document.getElementById("postCategory").value;
    const body = document.getElementById("postBody").value.trim();
    const imgInput = document.getElementById("postImage");

    if (!title || !body) {
      alert("Please fill out both the Title and Message details!");
      return;
    }

    submitBtn.innerText = "Publishing Topic...";
    submitBtn.disabled = true;

    // Use FormData to support file upload
    const fd = new FormData();
    fd.append("title", title);
    fd.append("author", author);
    fd.append("category", category);
    fd.append("body", body);
    if (imgInput && imgInput.files[0]) {
      fd.append("file", imgInput.files[0]);
    }

    try {
      const res = await fetch(API_BASE + "/api/forum/post", {
        method: "POST",
        body: fd
      });

      if (!res.ok) throw new Error("Could not post thread to server");
      
      // Clear inputs
      document.getElementById("postTitle").value = "";
      document.getElementById("postBody").value = "";
      if (imgInput) imgInput.value = "";

      alert("Topic published successfully to community board!");
      fetchForumThreads(); // Refresh feed

    } catch (error) {
      console.error("Forum post failed:", error);
      alert(`Publishing Failed: ${error.message}. Ensure backend FastAPI is running on port 8000.`);
    } finally {
      submitBtn.innerText = "Publish Thread";
      submitBtn.disabled = false;
    }
  });

  // Filter Buttons
  const filterBtns = document.querySelectorAll(".filter-btn");
  filterBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      // Styling active toggles
      filterBtns.forEach(b => {
        b.classList.remove("btn-primary");
        b.classList.add("btn-accent");
        b.style.color = "#000";
      });
      btn.classList.remove("btn-accent");
      btn.classList.add("btn-primary");
      btn.style.color = "#fff";

      selectedCategory = btn.getAttribute("data-category");
      fetchForumThreads();
    });
  });
}

async function fetchForumThreads() {
  const container = document.getElementById("forumThreads");
  container.innerHTML = `<div style="text-align: center; color: var(--color-text-muted); padding: 3rem 0;">Fetching discussions...</div>`;

  let url = API_BASE + "/api/forum/threads";
  if (selectedCategory) {
    url += `?category=${encodeURIComponent(selectedCategory)}`;
  }

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error("Could not load threads");
    const threads = await res.json();

    container.innerHTML = "";
    if (threads.length === 0) {
      container.innerHTML = `<div style="text-align: center; color: var(--color-text-muted); padding: 3rem 0;">No active threads found in this category. Be the first to start a conversation!</div>`;
      return;
    }

    threads.forEach(thread => {
      const threadCard = document.createElement("div");
      threadCard.className = "elastic-node";
      threadCard.style.background = "rgba(255, 255, 255, 0.03)";
      threadCard.style.border = "1px solid var(--border-glass)";
      threadCard.style.padding = "1.25rem";
      threadCard.style.borderRadius = "0.75rem";
      threadCard.style.marginBottom = "0.25rem";
      
      // Calculate formatted time
      const d = new Date(thread.created_at);
      const timeStr = isNaN(d.getTime()) ? "Just now" : d.toLocaleDateString() + " " + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      // Image rendering
      let imgTag = "";
      if (thread.image_url) {
        imgTag = `<img src="${API_BASE}/${thread.image_url}" style="border-radius: 0.5rem; max-height: 220px; object-fit: cover; margin-bottom: 0.75rem; width: 100%; border: 1px solid var(--border-glass); display: block;" alt="Uploaded crop image" />`;
      }

      threadCard.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.5rem;">
          <h4 style="font-weight: 700; font-size: 1.05rem; color: var(--accent);">${thread.title}</h4>
          <span style="font-size: 0.75rem; background: rgba(16, 185, 129, 0.1); border: 1px solid var(--primary); padding: 0.2rem 0.5rem; border-radius: 0.25rem; color: var(--primary);">${thread.category}</span>
        </div>
        ${imgTag}
        <p style="font-size: 0.9rem; color: var(--color-text); margin-bottom: 0.75rem; white-space: pre-wrap;">${thread.body}</p>
        
        <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--border-glass); padding-top: 0.75rem; margin-bottom: 0.75rem; font-size: 0.75rem; color: var(--color-text-muted);">
          <span>By: <strong>${thread.author}</strong> <span style="color: var(--primary); font-weight: bold; margin-left: 0.25rem;" title="Verified Farmer Badge">✅ Verified Farmer</span> • ${timeStr}</span>
          <div style="display: flex; gap: 0.75rem;">
            <button class="like-btn" style="background: none; border: none; color: #ef4444; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 0.25rem;">
              👍 <span>${thread.likes}</span> Likes
            </button>
            <button class="comment-toggle-btn" style="background: none; border: none; color: var(--accent); font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 0.25rem;">
              💬 <span>${thread.comment_count || 0}</span> Comments
            </button>
          </div>
        </div>

        <div style="display: flex; justify-content: flex-end; gap: 0.5rem; font-size: 0.75rem; border-top: 1px dashed var(--border-glass); padding-top: 0.5rem;">
          <button class="share-wa-btn" style="background: none; border: none; color: #25d366; cursor: pointer; font-weight: 600;">🟢 Share to WhatsApp</button>
          <button class="share-reddit-btn" style="background: none; border: none; color: #ff4500; cursor: pointer; font-weight: 600;">🟠 Share to Reddit</button>
        </div>

        <!-- Comments Collapsible Panel -->
        <div class="comments-panel hidden" style="margin-top: 1rem; border-top: 1px solid var(--border-glass); padding-top: 0.75rem; font-size: 0.8rem;">
          <div class="comments-list" style="max-height: 150px; overflow-y: auto; display: flex; flex-direction: column; gap: 0.5rem; margin-bottom: 0.75rem;">
            <div style="color: var(--color-text-muted);">Loading comments...</div>
          </div>
          <div style="display: flex; gap: 0.5rem;">
            <input type="text" class="comment-input form-control" style="height: 32px; padding: 0.25rem 0.5rem; font-size: 0.8rem;" placeholder="Add comment...">
            <button class="comment-submit-btn btn-primary" style="padding: 0.25rem 0.75rem; font-size: 0.8rem; height: 32px;">Reply</button>
          </div>
        </div>
      `;

      // Bind like click handler
      threadCard.querySelector(".like-btn").addEventListener("click", async (e) => {
        const span = e.currentTarget.querySelector("span");
        const currentLikes = parseInt(span.innerText);
        span.innerText = currentLikes + 1; // Instant UI feedback

        try {
          await fetch(API_BASE + `/api/forum/like/${thread.id}`, { method: "POST" });
        } catch (err) {
          console.error("Like failed:", err);
        }
      });

      // Comments panel toggle & handler
      const commentsPanel = threadCard.querySelector(".comments-panel");
      const commentToggle = threadCard.querySelector(".comment-toggle-btn");
      commentToggle.addEventListener("click", () => {
        commentsPanel.classList.toggle("hidden");
        if (!commentsPanel.classList.contains("hidden")) {
          loadComments(thread.id, commentsPanel.querySelector(".comments-list"));
        }
      });

      // Submit comment listener
      const commentInput = threadCard.querySelector(".comment-input");
      const commentSubmit = threadCard.querySelector(".comment-submit-btn");
      commentSubmit.addEventListener("click", async () => {
        const bodyText = commentInput.value.trim();
        if (!bodyText) return;

        commentSubmit.disabled = true;
        const payload = {
          thread_id: thread.id,
          author: profileName || "Farmer",
          body: bodyText
        };

        try {
          const cRes = await fetch(API_BASE + "/api/forum/comment", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
          });
          if (!cRes.ok) throw new Error("Comment upload failed");
          commentInput.value = "";
          loadComments(thread.id, commentsPanel.querySelector(".comments-list"));
          
          // Increment comment count dynamically in the UI
          const countSpan = threadCard.querySelector(".comment-toggle-btn span");
          if (countSpan) {
            countSpan.innerText = parseInt(countSpan.innerText) + 1;
          }
        } catch (err) {
          console.error("Comment submit failed:", err);
        } finally {
          commentSubmit.disabled = false;
        }
      });

      // Share to WhatsApp
      threadCard.querySelector(".share-wa-btn").addEventListener("click", () => {
        const shareUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(thread.title + "\n" + thread.body + "\nShared via AgriSetu")}`;
        window.open(shareUrl, "_blank");
      });

      // Share to Reddit
      threadCard.querySelector(".share-reddit-btn").addEventListener("click", () => {
        const shareUrl = `https://www.reddit.com/submit?title=${encodeURIComponent(thread.title)}&text=${encodeURIComponent(thread.body + "\n\nShared via AgriSetu")}`;
        window.open(shareUrl, "_blank");
      });

      container.appendChild(threadCard);
    });

  } catch (error) {
    console.error("Error loading discussions:", error);
    container.innerHTML = `<div style="text-align: center; color: var(--danger); padding: 3rem 0;">Could not load community feed. Make sure backend FastAPI is running on port 8000.</div>`;
  }
}

// Comments loader helper
async function loadComments(threadId, listContainer) {
  listContainer.innerHTML = '<div style="color: var(--color-text-muted);">Loading comments...</div>';
  try {
    const res = await fetch(API_BASE + `/api/forum/comments/${threadId}`);
    if (!res.ok) throw new Error();
    const comments = await res.json();
    
    listContainer.innerHTML = "";
    if (comments.length === 0) {
      listContainer.innerHTML = '<div style="color: var(--color-text-muted); font-style: italic;">No comments yet. Write one!</div>';
      return;
    }

    comments.forEach(comment => {
      const commentDiv = document.createElement("div");
      commentDiv.style.background = "rgba(0, 0, 0, 0.15)";
      commentDiv.style.padding = "0.5rem 0.75rem";
      commentDiv.style.borderRadius = "0.5rem";
      commentDiv.style.borderLeft = "3px solid var(--primary)";
      commentDiv.style.marginBottom = "0.35rem";
      
      const time = new Date(comment.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      commentDiv.innerHTML = `
        <div style="display:flex; justify-content:space-between; margin-bottom:0.15rem;">
          <strong>${comment.author}</strong>
          <span style="font-size:0.65rem; color:var(--color-text-muted);">${time}</span>
        </div>
        <div>${comment.body}</div>
      `;
      listContainer.appendChild(commentDiv);
    });
  } catch (err) {
    listContainer.innerHTML = '<div style="color: var(--danger);">Failed to load comments.</div>';
  }
}

// Reddit integration
async function fetchRedditTrending() {
  const feed = document.getElementById("redditTrendingFeed");
  if (!feed) return;

  try {
    const res = await fetch(API_BASE + "/api/forum/reddit");
    if (!res.ok) throw new Error();
    const data = await res.json();

    feed.innerHTML = "";
    data.trending.forEach(post => {
      const item = document.createElement("a");
      item.href = post.url;
      item.target = "_blank";
      item.style.textDecoration = "none";
      item.style.color = "inherit";
      item.className = "reddit-post-item";
      item.style.display = "block";
      item.style.background = "rgba(255, 69, 0, 0.03)";
      item.style.border = "1px solid rgba(255, 69, 0, 0.1)";
      item.style.borderRadius = "0.5rem";
      item.style.padding = "0.75rem";
      item.style.transition = "transform 0.2s ease, border-color 0.2s ease";
      
      // Hover scaling effect
      item.addEventListener("mouseenter", () => {
        item.style.transform = "translateX(4px)";
        item.style.borderColor = "rgba(255, 69, 0, 0.3)";
      });
      item.addEventListener("mouseleave", () => {
        item.style.transform = "translateX(0)";
        item.style.borderColor = "rgba(255, 69, 0, 0.1)";
      });

      item.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.25rem;">
          <span style="font-weight: 700; color: #ff4500; font-size: 0.75rem;">${post.subreddit}</span>
          <span style="font-size: 0.75rem; color: var(--color-text-muted); display:flex; align-items:center; gap:0.15rem;">🔥 ↑ ${post.score}</span>
        </div>
        <div style="font-weight: 500; font-size: 0.8rem; line-height: 1.35; color: var(--color-text);">${post.title}</div>
      `;
      feed.appendChild(item);
    });

  } catch (err) {
    console.error("Reddit fetch error:", err);
    feed.innerHTML = '<div style="color: var(--danger); font-size:0.8rem;">Failed to fetch trending topics.</div>';
  }
}
