// WebSocket connection
const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
const ws = new WebSocket(`${wsProtocol}//${window.location.host}`);

// DOM elements
const logEntries = document.getElementById('log-entries');
const statusEl = document.getElementById('status');
const markdownSource = document.getElementById('markdown-source');
const renderedContent = document.getElementById('rendered-content');
const metadataContent = document.getElementById('metadata-content');

// Request store
const requests = new Map();
let selectedRequestId = null;

// WebSocket handlers
ws.onopen = () => {
  statusEl.textContent = 'Connected';
  statusEl.className = 'status connected';
  console.log('Dashboard connected to proxy server');
};

ws.onclose = () => {
  statusEl.textContent = 'Disconnected';
  statusEl.className = 'status disconnected';
  console.log('Dashboard disconnected from proxy server');

  // Try to reconnect after 3 seconds
  setTimeout(() => {
    window.location.reload();
  }, 3000);
};

ws.onerror = (error) => {
  console.error('WebSocket error:', error);
};

ws.onmessage = (event) => {
  try {
    const message = JSON.parse(event.data);
    handleMessage(message);
  } catch (error) {
    console.error('Failed to parse message:', error);
  }
};

function handleMessage(message) {
  const { type, payload } = message;

  switch (type) {
    case 'request_started':
      addLogEntry(payload);
      break;
    case 'request_completed':
      updateLogEntry(payload);
      // Auto-select the completed request to show its content
      selectRequest(payload.id);
      break;
    case 'request_error':
      updateLogEntry(payload);
      break;
  }
}

function addLogEntry(data) {
  requests.set(data.id, data);

  const entry = document.createElement('div');
  entry.className = `log-entry new ${data.status}`;
  entry.id = `entry-${data.id}`;
  const typeLabel = data.isSearch ? 'search' : 'page';
  const displayPath = data.isSearch ? data.originalUrl : data.path;
  entry.innerHTML = `
    <div class="path"><span class="type-badge ${typeLabel}">${typeLabel}</span> ${escapeHtml(displayPath)}</div>
    <div class="meta">
      <span class="time">${formatTime(data.timestamp)}</span>
      <span class="status-badge">${data.status}</span>
    </div>
  `;

  entry.onclick = () => selectRequest(data.id);

  // Insert at the top
  logEntries.insertBefore(entry, logEntries.firstChild);

  // Remove 'new' class after animation
  setTimeout(() => {
    entry.classList.remove('new');
  }, 300);
}

function updateLogEntry(data) {
  requests.set(data.id, data);

  const entry = document.getElementById(`entry-${data.id}`);
  if (entry) {
    entry.className = `log-entry ${data.status}`;

    const meta = entry.querySelector('.meta');
    let timeText = formatTime(data.timestamp);
    if (data.processingTimeMs) {
      timeText += ` (${data.processingTimeMs}ms)`;
    }

    meta.innerHTML = `
      <span class="time">${timeText}</span>
      <span class="status-badge">${data.status}</span>
    `;

    // If this is the selected request, update the preview
    if (selectedRequestId === data.id) {
      showPreview(data);
    }
  }
}

function selectRequest(id) {
  // Update selection state
  selectedRequestId = id;

  // Update UI
  document.querySelectorAll('.log-entry').forEach(el => {
    el.classList.remove('selected');
  });

  const entry = document.getElementById(`entry-${id}`);
  if (entry) {
    entry.classList.add('selected');
  }

  // Show preview
  const data = requests.get(id);
  if (data) {
    showPreview(data);
  }
}

function showPreview(data) {
  // Handle search requests differently
  if (data.isSearch) {
    // Show JSON response in markdown source tab
    if (data.searchResponse) {
      markdownSource.textContent = JSON.stringify(data.searchResponse, null, 2);
    } else if (data.error) {
      markdownSource.textContent = `Error: ${data.error}`;
    } else {
      markdownSource.textContent = 'Searching...';
    }

    // Disable rendered and metadata tabs for search
    renderedContent.innerHTML = '<p class="placeholder">Search results are shown as JSON in the Source tab</p>';
    metadataContent.textContent = 'Not available for search requests';

    // Auto-switch to source tab for search results
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelector('.tab[data-tab="source"]').classList.add('active');
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.getElementById('source-view').classList.add('active');
    return;
  }

  // Handle regular page requests
  if (data.markdown) {
    markdownSource.textContent = data.markdown;

    // Strip YAML frontmatter for rendered preview (to feel like a real page view)
    let markdownForRender = data.markdown;
    if (markdownForRender.startsWith('---')) {
      // Find the closing --- and remove everything up to and including it
      const endIndex = markdownForRender.indexOf('---', 3);
      if (endIndex !== -1) {
        markdownForRender = markdownForRender.substring(endIndex + 3).trim();
      }
    }

    // Add H1 title at the top if we have metadata
    if (data.metadata && data.metadata.title) {
      markdownForRender = `# ${data.metadata.title}\n\n${markdownForRender}`;
    }

    // Render markdown
    try {
      renderedContent.innerHTML = marked.parse(markdownForRender);
    } catch (error) {
      renderedContent.innerHTML = `<p class="placeholder">Failed to render markdown: ${escapeHtml(error.message)}</p>`;
    }
  } else if (data.error) {
    markdownSource.textContent = `Error: ${data.error}`;
    renderedContent.innerHTML = `<p class="placeholder" style="color: var(--error);">Error: ${escapeHtml(data.error)}</p>`;
  } else {
    markdownSource.textContent = 'Loading...';
    renderedContent.innerHTML = '<p class="placeholder">Loading...</p>';
  }

  if (data.metadata) {
    metadataContent.textContent = JSON.stringify(data.metadata, null, 2);
  } else {
    metadataContent.textContent = data.error ? `Error: ${data.error}` : 'No metadata available';
  }
}

// Tab switching
document.querySelectorAll('.tab').forEach(tab => {
  tab.onclick = () => {
    // Update active tab
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');

    // Show corresponding content
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.getElementById(`${tab.dataset.tab}-view`).classList.add('active');
  };
});

// Utility functions
function formatTime(timestamp) {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Initial message
console.log('Learn4Agent Dashboard initialized');
console.log('Waiting for requests...');
