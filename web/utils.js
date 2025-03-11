export async function bibSearch(query) {
  try {
    const response = await fetch('/api/zotero/search', {
      headers: {
        'Content-Type': 'text/plain',
      },
      method: 'POST',
      body: query,
    });
    return response.json();
  } catch (error) {
    return [];
  }
}

export async function bibTransform(text) {
  try {
    const response = await fetch('/api/zotero/import', {
      headers: {
        'Content-Type': 'text/plain',
      },
      method: 'POST',
      body: text,
    });
    return response.json();
  } catch (error) {
    return [];
  }
}

export async function bibSpaceFetch(id) {
  try {
    const response = await fetch(`/api/space/${id}`);
    if (!response.ok) {
      throw new Error('HTTP error ' + response.status);
    }
    return response.json();
  } catch (error) {
    throw error;
  }
}

export async function bibSpaceCreate() {
  try {
    const response = await fetch('/api/space', {
      method: 'POST',
    });
    if (!response.ok) {
      throw new Error('HTTP error ' + response.status);
    }
    return response.json();
  } catch (error) {
    throw error;
  }
}

export async function bibSpaceSync(id, bibs) {
  try {
    const response = await fetch(`/api/space/${id}`, {
      headers: {
        'Content-Type': 'text/plain',
      },
      method: 'POST',
      body: JSON.stringify(bibs),
    });
    if (!response.ok) {
      throw new Error('HTTP error ' + response.status);
    }
    return response.json();
  } catch (error) {
    throw error;
  }
}

export function addVisitHistory(id) {
  let history;
  try {
    history = JSON.parse(localStorage.getItem('history'));
    if (!Array.isArray(history)) {
      history = [];
    }
  } catch (e) {
    history = [];
  }
  let isVisited = false;
  history.forEach((h) => {
    if (h.id === id) {
      isVisited = true;
    }
  });
  if (!isVisited) {
    history.push({ id, name: '未命名', createdTime: Date.now() });
  }
  localStorage.setItem('history', JSON.stringify(history));
}
