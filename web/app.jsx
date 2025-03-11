import m from 'mithril';
import { Link } from 'mithril/route.js';
import { Modal, Popover } from 'bootstrap';
import BibEditor from './editor.jsx';
import {
  bibSearch,
  bibSpaceFetch,
  bibSpaceSync,
  bibTransform,
  addVisitHistory,
} from './utils.js';

export default function App() {
  let editItem = null;
  let searchInput = null;
  let searching = false;
  let searchResults = []; // 存储搜索结果
  let bibs = [];
  let selectedBibs = [];
  let searchModal = null;
  let editorModal = null;
  let pasteBibModal = null;
  let multipleSelect = false;
  let copySuccessPopover = null;

  const id = m.route.param('id');

  // 获取已有的文献数据
  bibSpaceFetch(id)
    .then((data) => {
      bibs = data.bibs;
      addVisitHistory(id);
      m.redraw();
    })
    .catch(() => {
      m.route.set('/');
    });

  const handleEdit = (bib) => {
    editItem = bib;
    editorModal.show();
  };

  const handleSearch = async (query) => {
    if (!query) return;
    searching = true;
    searchResults = [];
    const result = await bibSearch(query);
    searchInput.value = '';
    searching = false;

    if (Array.isArray(result)) {
      if (result.length === 0) {
        searchModal.show();
        m.redraw();
        return;
      }
      bibs.push(result[0]);
      handleBibsChange();
      m.redraw();
      return;
    }

    searchResults = result;
    searchModal.show();
    m.redraw();
  };

  const handleBibPaste = () => {
    const textarea = document.querySelector('#paste-bib-modal textarea');

    const text = textarea.value;
    if (!text) return;

    bibTransform(text).then((result) => {
      bibs.push(...result);
      handleBibsChange();
      textarea.value = '';
      pasteBibModal.hide();
    });
  };

  const handleSelectBib = async (identifier) => {
    searchModal.hide();
    await handleSearch(identifier);
  };

  const handleBibsChange = () => {
    bibSpaceSync(id, bibs);
    m.redraw();
  };

  const handleManualAdd = () => {
    bibs.push({
      itemType: 'journalArticle',
    });
    editItem = bibs[bibs.length - 1];
    handleBibsChange();
    editorModal.show();
  };

  const displayCreators = (creators) => {
    if (!creators || creators.length === 0) return '无作者';
    return `${
      creators[0].name
        ? creators[0].name
        : creators[0].firstName + ' ' + creators[0].lastName
    }${creators.length > 1 ? ' 等' : ''}`;
  };

  const handleBibSelect = (index) => {
    if (selectedBibs.length === 1 && selectedBibs.includes(index)) {
      handleEdit(bibs[index]);
    }
    if (multipleSelect) {
      selectedBibs.push(index);
    } else {
      selectedBibs = [index];
    }
    m.redraw();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Control' || e.key === 'Meta') {
      multipleSelect = true;
    } else if (e.key === 'Escape') {
      selectedBibs = [];
      m.redraw();
    }
  };

  const handleKeyUp = (e) => {
    multipleSelect = false;
  };

  return {
    oncreate: () => {
      searchModal = new Modal('#search-modal');
      editorModal = new Modal('#edit-modal');
      pasteBibModal = new Modal('#paste-bib-modal');
      copySuccessPopover = new Popover('#copy-btn', {
        content: '复制成功',
        trigger: 'manual',
      });
      searchInput = document.querySelector('#search-input');
      window.addEventListener('keydown', handleKeyDown);
      window.addEventListener('keyup', handleKeyUp);
    },
    onremove: () => {
      document.body.classList.remove('modal-open');
      document.body.style = '';
      searchModal.dispose();
      copySuccessPopover.dispose();
      editorModal.dispose();
      pasteBibModal.dispose();
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    },
    view: () => {
      const zoteroSchema = window.zoteroSchema;
      const itemNames = zoteroSchema.locales['zh-CN'].itemTypes;
      const url = document.location.host;
      const protocol = document.location.protocol;

      return (
        <div class="py-5" id="app">
          <div class="container">
            <div class="text-center py-4 ">
              <Link class="logo-text" style={{ cursor: 'pointer' }} href="/">
                ShareBib
              </Link>
            </div>

            <div class="input-group mb-4">
              <input
                id="search-input"
                class="form-control form-control-lg"
                placeholder="输入 URL, ISBN, DOI, PMID, arXiv ID 或标题"
                readonly={searching}
                onkeydown={(e) => {
                  if (e.key === 'Enter') {
                    handleSearch(e.target.value);
                  }
                }}
              />
              <button
                class="btn btn-primary btn-lg"
                onclick={() => handleSearch(searchInput.value)}
                disabled={searching}
              >
                {searching ? (
                  <>
                    <span
                      class="spinner-grow spinner-grow-sm me-2"
                      aria-hidden="true"
                    ></span>
                    搜索中...
                  </>
                ) : (
                  <>
                    <i class="bi bi-search me-2"></i>引用
                  </>
                )}
              </button>
            </div>

            <div class="mb-4 d-flex">
              <div class="input-group me-2" style={{ width: 'auto' }}>
                <span class="input-group-text">BibTeX</span>
                <input
                  class="form-control font-monospace"
                  readonly
                  hidden
                  value={`${protocol}//${url}/bibtex/${id}.bib`}
                />
                <a
                  class="btn btn-secondary"
                  href={`/bibtex/${id}.bib`}
                  download={`${id}.bib`}
                >
                  <i class="bi bi-download"></i>
                </a>
              </div>
              <button
                id="copy-btn"
                class="btn btn-secondary"
                onclick={() => {
                  if (navigator.clipboard) {
                    navigator.clipboard.writeText(
                      `${protocol}//${url}/bibtex/${id}.bib`
                    );
                    copySuccessPopover.show();
                    setTimeout(() => {
                      copySuccessPopover.hide();
                    }, 800);
                  }
                }}
              >
                <i class="bi bi-copy me-2"></i>复制 BibTeX 链接
              </button>
            </div>

            <div class="text-center mb-2">
              <button
                class="btn btn-secondary btn-lg rounded-pill me-4"
                onclick={handleManualAdd}
              >
                <i class="bi bi-plus-circle-fill me-2"></i>手动添加
              </button>
              <button
                class="btn btn-secondary btn-lg rounded-pill"
                onclick={() => pasteBibModal.show()}
              >
                <i class="bi bi-clipboard-plus-fill me-2"></i>粘贴引用
              </button>
            </div>

            <table class="bibs-table table table-hover">
              <thead>
                <tr>
                  <th>类型</th>
                  <th>标题</th>
                  <th>作者</th>
                  <th>日期</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {bibs.map((bib, index) => (
                  <tr
                    key={index}
                    ondblclick={() => handleEdit(bib)}
                    onclick={() => handleBibSelect(index)}
                    class={selectedBibs.includes(index) ? 'table-primary' : ''}
                  >
                    <td>
                      {bib.itemType ? (
                        <span class="badge rounded-pill text-bg-secondary">
                          {itemNames[bib.itemType]}
                        </span>
                      ) : (
                        '未知类型'
                      )}
                    </td>
                    <td>{bib.title || '无标题'}</td>
                    <td>{displayCreators(bib.creators)}</td>
                    <td>{bib.date || '无日期'}</td>
                    <td>
                      <button
                        class="btn btn-close"
                        aria-label="Close"
                        onclick={(e) => {
                          e.stopPropagation();
                          bibs = bibs.filter((b) => b !== bib && b);
                          handleBibsChange();
                        }}
                      ></button>
                    </td>
                  </tr>
                ))}
                {bibs.length === 0 && (
                  <tr>
                    <td colspan="5">您还没有添加文献</td>
                  </tr>
                )}
              </tbody>
            </table>

            <footer class="text-center text-muted py-4 mt-5">
              <hr />
              <p class="mb-0">© 2025 ShareBib. All rights reserved.</p>
              <p>Made by Yachen with ❤️.</p>
            </footer>
          </div>

          <div class="modal fade" id="search-modal" tabindex="-1">
            <div class="modal-dialog">
              <div class="modal-content">
                <div class="modal-header">
                  <h5 class="modal-title">
                    {searchResults.length === 0 ? '提示' : '请选择要添加的文献'}
                  </h5>
                  <button
                    class="btn-close"
                    data-bs-dismiss="modal"
                    aria-label="Close"
                  ></button>
                </div>
                <div class="modal-body">
                  {searchResults.length === 0 ? (
                    <p class="text-muted">
                      没有找到相关文献，请尝试其他关键词。
                    </p>
                  ) : (
                    <ul class="list-group">
                      {Object.entries(searchResults).map(
                        ([identifier, bib]) => (
                          <li
                            class="list-group-item list-group-item-action"
                            onclick={() => handleSelectBib(identifier)}
                            style={{ cursor: 'pointer' }}
                          >
                            <strong>{bib.title}</strong>
                            <span class="text-muted ms-2">
                              {bib.description}
                            </span>
                          </li>
                        )
                      )}
                    </ul>
                  )}
                </div>
                <div class="modal-footer">
                  <button
                    class="btn btn-secondary"
                    data-bs-dismiss="modal"
                    aria-label="Close"
                  >
                    关闭
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div class="modal fade" id="edit-modal" tabindex="-1">
            <div class="modal-dialog modal-lg">
              <div class="modal-content">
                <div class="modal-header">
                  <h5 class="modal-title">编辑</h5>
                  <button
                    class="btn-close"
                    data-bs-dismiss="modal"
                    aria-label="Close"
                  ></button>
                </div>
                <div class="modal-body">
                  {editItem && (
                    <BibEditor
                      zoteroSchema={zoteroSchema}
                      bib={editItem}
                      onchange={handleBibsChange}
                    />
                  )}
                </div>
              </div>
            </div>
          </div>
          <div class="modal fade" id="paste-bib-modal" tabindex="-1">
            <div class="modal-dialog">
              <div class="modal-content">
                <div class="modal-header">
                  <h5 class="modal-title">粘贴引用</h5>
                  <button
                    class="btn-close"
                    data-bs-dismiss="modal"
                    aria-label="Close"
                  ></button>
                </div>
                <div class="modal-body">
                  <textarea
                    class="form-control font-monospace"
                    placeholder="支持格式：BibTeX, RIS, BibLaTeX, Zotero以及更多"
                    rows="10"
                  ></textarea>
                </div>
                <div class="modal-footer">
                  <button
                    class="btn btn-secondary"
                    data-bs-dismiss="modal"
                    aria-label="Close"
                  >
                    关闭
                  </button>
                  <button class="btn btn-primary" onclick={handleBibPaste}>
                    添加
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    },
  };
}
