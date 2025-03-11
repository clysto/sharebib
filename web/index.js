import m from "mithril"

import App from './app.jsx';
import Home from './home.jsx';

import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.min.css';
import "./style.css"

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
        '/':  Home,
        '/:id': App,
      });
    })
    .catch((error) => {
      console.error(error);
    });
}

init();

document.addEventListener('hide.bs.modal', function (event) {
  if (document.activeElement) {
    document.activeElement.blur();
  }
});
