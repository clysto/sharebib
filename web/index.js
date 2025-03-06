async function bibSearch(query) {
  try {
    const response = await fetch('/zotero/search', {
      headers: {
        'Content-Type': 'text/plain',
      },
      method: 'POST',
      body: query,
    });
    if (!response.ok) {
      return [];
    }
    // return response.json().filter((item) => item.data.itemType !== 'note');
    return response.json();
  } catch (error) {
    return [];
  }
}

async function bibSpaceFetch(id) {
  try {
    const response = await fetch(`/space/${id}`);
    if (!response.ok) {
      throw new Error('HTTP error ' + response.status);
    }
    return response.json();
  } catch (error) {
    throw error;
  }
}

async function bibSpaceCreate() {
  try {
    const response = await fetch('/space', {
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

async function bibSpaceSync(id, bibs) {
  try {
    const response = await fetch(`/space/${id}`, {
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

function init() {
  fetch('https://api.zotero.org/schema')
    .then((response) => {
      if (!response.ok) {
        throw new Error('HTTP error ' + response.status);
      }
      return response.json();
    })
    .then((data) => {
      window.zoteroSchema = data;
      const root = document.body;
      m.route(root, '/', {
        '/': Home,
        '/:id': App,
      });
    })
    .catch((error) => {
      console.error(error);
    });
}

init();
