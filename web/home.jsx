import m from 'mithril';
import { Link } from 'mithril/route.js';
import { bibSpaceCreate } from './utils.js';

export default function Home() {
  const handleCreateSpace = async () => {
    const space = await bibSpaceCreate();
    m.route.set(`/${space.id}`);
  };

  let history = localStorage.getItem('history');
  try {
    history = JSON.parse(history);
    if (!Array.isArray(history)) {
      history = [];
    }
  } catch (e) {
    history = [];
  }

  return {
    view: () => (
      <div class="container py-5">
        <div class="text-center py-4 ">
          <Link class="logo-text" style={{ cursor: 'pointer' }} href="/">
            ShareBib
          </Link>
        </div>

        <h5>最近的文献列表</h5>

        <div class="list-group list-group-flush mb-4">
          {history.map((id) => (
            <button
              key={id}
              class="list-group-item list-group-item-action font-monospace px-0 d-flex justify-content-between"
              onclick={() => m.route.set(`/${id}`)}
              style={{ cursor: 'pointer' }}
            >
              <div>{id}</div>
              <a
                class="btn btn-close me-2"
                aria-label="Close"
                onclick={(e) => {
                  e.stopPropagation();
                  history = history.filter((i) => i !== id);
                  localStorage.setItem('history', JSON.stringify(history));
                  m.redraw();
                }}
              />
            </button>
          ))}
        </div>

        <div class="text-center">
          <button
            class="btn btn-primary btn-lg rounded-pill"
            onClick={handleCreateSpace}
          >
            <i class="bi bi-plus-circle-fill me-2"></i>
            创建新的文献列表
          </button>
        </div>

        <footer class="text-center text-muted py-4 mt-5">
          <hr />
          <p class="mb-0">© 2025 ShareBib. All rights reserved.</p>
          <p>Made by Yachen with ❤️.</p>
        </footer>
      </div>
    ),
  };
}
