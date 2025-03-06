function App() {
  let editItem = null;
  let searchInput = null;
  let searching = false;
  let searchResults = []; // 存储搜索结果
  let bibs = [];
  let searchModal = null;
  let editorModal = null;

  const id = m.route.param('id');

  // 获取已有的文献数据
  bibSpaceFetch(id)
    .then((data) => {
      bibs = data.bibs;
      const history = localStorage.getItem('history');
      if (history) {
        const parsedHistory = JSON.parse(history);
        if (!parsedHistory.includes(id)) {
          parsedHistory.push(id);
        }
        localStorage.setItem('history', JSON.stringify(parsedHistory));
      } else {
        localStorage.setItem('history', JSON.stringify([id]));
      }
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
    searchInput.dom.value = '';
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

  return {
    oncreate: () => {
      searchModal = new bootstrap.Modal('#search-modal');
      editorModal = new bootstrap.Modal('#edit-modal');
    },
    onremove: () => {
      console.log(editorModal);
      searchModal.dispose();
      editorModal.dispose();
    },
    view: () => {
      const zoteroSchema = window.zoteroSchema;
      const url = document.location.host;
      const protocol = document.location.protocol;

      return m('div.py-5', { id: 'app' }, [
        m('div.container', [
          m(
            'h1.text-center.py-4',
            {
              style: { cursor: 'pointer' },
              onclick: () => {
                m.route.set('/');
              },
            },
            'ShareBib'
          ),
          // 搜索栏
          m('div.input-group.mb-4', [
            (searchInput = m('input.form-control.form-control-lg', {
              placeholder: '输入 URL, ISBN, DOI, PMID, arXiv ID 或标题',
            })),
            m(
              'button.btn.btn-primary.btn-lg',
              {
                onclick: () => handleSearch(searchInput.dom.value),
                disabled: searching,
              },
              searching ? '搜索中...' : '引用'
            ),
          ]),

          // BibTeX 下载链接
          m('div.input-group.mb-4', [
            m('span.input-group-text', 'BibTeX URL'),
            m('input.form-control.font-monospace', {
              readonly: true,
              value: `${protocol}//${url}/bibtex/${id}.bib`,
            }),
            m(
              'a.btn.btn-secondary',
              { href: `/bibtex/${id}.bib`, download: `${id}.bib` },
              '下载'
            ),
          ]),
          m('div.text-center.mb-2', [
            m(
              'button.btn.btn-secondary.btn-lg',
              { onclick: handleManualAdd },
              '手动添加'
            ),
          ]),

          // 文献表格
          m('table.table.table-hover', [
            m('thead', [
              m('tr', [
                m('th', '标题'),
                m('th', '作者'),
                m('th', '日期'),
                m('th', ''),
              ]),
            ]),
            m('tbody', [
              ...bibs.map((bib) => {
                if (!bib) bib = {};
                return m(
                  'tr',
                  {
                    onclick: () => handleEdit(bib),
                  },
                  [
                    m('td', bib.title),
                    m(
                      'td',
                      bib.creators && bib.creators.length > 0
                        ? bib.creators
                            .map((c) => `${c.firstName} ${c.lastName}`)
                            .join(', ')
                        : ''
                    ),
                    m('td', bib.date),
                    m('td', [
                      m('button.btn.btn-close', {
                        ['aria-label']: 'Close',
                        onclick: (e) => {
                          e.stopPropagation();
                          bibs = bibs.filter((b) => b !== bib && b);
                          handleBibsChange();
                        },
                      }),
                    ]),
                  ]
                );
              }),
            ]),
          ]),

          // 统一搜索和未找到的模态框
          m(
            'div.modal.fade',
            {
              id: 'search-modal',
              tabindex: '-1',
            },
            m('div.modal-dialog', [
              m('div.modal-content', [
                m('div.modal-header', [
                  m(
                    'h5.modal-title',
                    searchResults.length === 0 ? '提示' : '请选择要添加的文献'
                  ),
                  m('button.btn-close', {
                    'data-bs-dismiss': 'modal',
                    'aria-label': 'Close',
                  }),
                ]),
                m(
                  'div.modal-body',
                  searchResults.length === 0
                    ? m('p.text-muted', '没有找到相关文献，请检查输入是否正确')
                    : m('ul.list-group', [
                        ...Object.entries(searchResults).map(
                          ([identifier, bib]) =>
                            m(
                              'li.list-group-item.list-group-item-action',
                              {
                                onclick: () => handleSelectBib(identifier),
                                style: { cursor: 'pointer' },
                              },
                              [
                                m('strong', bib.title),
                                m('span.text-muted.ms-2', bib.description),
                              ]
                            )
                        ),
                      ])
                ),
                m('div.modal-footer', [
                  m(
                    'button.btn.btn-secondary',
                    {
                      'data-bs-dismiss': 'modal',
                      'aria-label': 'Close',
                    },
                    '关闭'
                  ),
                ]),
              ]),
            ])
          ),

          // 编辑文献的模态框
          m(
            'div.modal.fade',
            {
              id: 'edit-modal',
              tabindex: '-1',
            },
            m('div.modal-dialog.modal-lg', [
              m('div.modal-content', [
                m('div.modal-header', [
                  m('h5.modal-title', '编辑'),
                  m('button.btn-close', {
                    'data-bs-dismiss': 'modal',
                    'aria-label': 'Close',
                  }),
                ]),
                m(
                  'div.modal-body',
                  editItem &&
                    m(BibEditor, {
                      zoteroSchema,
                      bib: editItem,
                      onchange: handleBibsChange,
                    })
                ),
              ]),
            ])
          ),
        ]),
      ]);
    },
  };
}
