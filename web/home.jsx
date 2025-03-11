import m from 'mithril';
import { Link } from 'mithril/route.js';
import { bibSpaceCreate } from './utils.js';

export default function Home() {
  let history = localStorage.getItem('history');
  try {
    history = JSON.parse(history);
    if (!Array.isArray(history)) {
      history = [];
    }
  } catch (e) {
    history = [];
  }

  const handleCreateSpace = async () => {
    const space = await bibSpaceCreate();
    m.route.set(`/${space.id}`);
  };

  const handleDeleteHistory = (id) => {
    history = history.filter((h) => h.id !== id);
    localStorage.setItem('history', JSON.stringify(history));
  };

  const handleRenameHistory = (id, newName) => {
    if (!newName) {
      return;
    }
    history = history.map((h) => {
      if (h.id === id) {
        h.name = newName;
      }
      return h;
    });
    localStorage.setItem('history', JSON.stringify(history));
  };

  return {
    view: () => {
      history.sort((a, b) => b.createdTime - a.createdTime);
      return (
        <div class="container py-5">
          <div class="text-center py-4 ">
            <Link class="logo-text" style={{ cursor: 'pointer' }} href="/">
              ShareBib
            </Link>
          </div>

          <h5 class="ps-3">最近的文献列表</h5>

          <hr class="mb-0" />

          <div class="list-group list-group-flush mb-4">
            {history.map((h) => (
              <button
                key={h.id}
                class="list-group-item list-group-item-action d-flex justify-content-between"
                onclick={() => m.route.set(`/${h.id}`)}
                style={{ cursor: 'pointer' }}
              >
                <div>
                  <span class="me-2">
                    <span class="me-1">{h.name}</span>
                    <button
                      className="btn btn-link px-0"
                      onclick={(e) => {
                        e.stopPropagation();
                        handleRenameHistory(h.id, prompt('请输入新的名称'));
                      }}
                    >
                      <i class="bi bi-pencil-square"></i>
                    </button>
                  </span>
                </div>
                <div class="me-2 d-flex align-items-center">
                  <span class="me-2 badge rounded-pill text-bg-secondary font-monospace">
                    {h.id}
                  </span>
                  <a
                    class="btn btn-close "
                    aria-label="Close"
                    onclick={(e) => {
                      e.stopPropagation();
                      handleDeleteHistory(h.id);
                    }}
                  />
                </div>
              </button>
            ))}
          </div>

          <div class="text-center">
            <button
              class="btn btn-primary btn-lg rounded-pill"
              onclick={handleCreateSpace}
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
      );
    },
  };
}
