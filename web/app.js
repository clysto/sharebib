function App() {
  let editItem = null;
  let searchInput = null;
  let searching = false;
  let searchResults = []; // 存储搜索结果
  let bibs = [];
  let searchModal = null;
  let editorModal = null;
  let pasteBibModal = null;

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

  return {
    oncreate: () => {
      searchModal = new bootstrap.Modal('#search-modal');
      editorModal = new bootstrap.Modal('#edit-modal');
      pasteBibModal = new bootstrap.Modal('#paste-bib-modal');
    },
    onremove: () => {
      console.log(editorModal);
      searchModal.dispose();
      editorModal.dispose();
      pasteBibModal.dispose();
    },
    view: () => {
      const zoteroSchema = window.zoteroSchema;
      const itemNames = zoteroSchema.locales['zh-CN'].itemTypes;
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
              readonly: searching,
              onkeydown: (e) => {
                if (e.key === 'Enter') {
                  handleSearch(searchInput.dom.value);
                }
              },
            })),
            m(
              'button.btn.btn-primary.btn-lg',
              {
                onclick: () => handleSearch(searchInput.dom.value),
                disabled: searching,
              },
              searching ? '搜索中...' : [m('i.bi.bi-search.me-2'), '引用']
            ),
          ]),

          // BibTeX 下载链接
          m('div.mb-4.d-flex', [
            m(
              'div.input-group.me-2',
              {
                style: { width: 'auto' },
              },
              [
                m('span.input-group-text', 'BibTeX'),
                m('input.form-control.font-monospace', {
                  readonly: true,
                  hidden: true,
                  value: `${protocol}//${url}/bibtex/${id}.bib`,
                }),

                m(
                  'a.btn.btn-secondary',
                  { href: `/bibtex/${id}.bib`, download: `${id}.bib` },
                  [m('i.bi.bi-download')]
                ),
              ]
            ),
            m(
              'button.btn.btn-secondary',
              {
                onclick: () =>
                  navigator.clipboard.writeText(
                    `${protocol}//${url}/bibtex/${id}.bib`
                  ),
              },
              [m('i.bi.bi-copy.me-2'), '复制 BibTeX 链接']
            ),
          ]),

          // 添加文献按钮
          m('div.text-center.mb-2', [
            m(
              'button.btn.btn-secondary.btn-lg.rounded-pill.me-4',
              { onclick: handleManualAdd },
              [m('i.bi.bi-plus-circle-fill.me-2'), '手动添加']
            ),
            m(
              'button.btn.btn-secondary.btn-lg.rounded-pill',
              {
                onclick: () => pasteBibModal.show(),
              },
              [m('i.bi.bi-clipboard-plus-fill.me-2'), '粘贴引用']
            ),
          ]),

          // 文献表格
          m('table.table.table-hover', [
            m('thead', [
              m('tr', [
                m('th', '类型'),
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
                    m(
                      'td',
                      bib.itemType
                        ? m(
                            'span.badge.rounded-pill.text-bg-secondary',
                            itemNames[bib.itemType]
                          )
                        : '未知类型'
                    ),
                    m('td', bib.title || '无标题'),
                    m('td', displayCreators(bib.creators)),
                    m('td', bib.date || '无日期'),
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
              bibs.length === 0 &&
                m('tr', [m('td', { colspan: 4 }, '您还没有添加文献')]),
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

          // 粘贴 BibTeX 的模态框
          m(
            'div.modal.fade',
            {
              id: 'paste-bib-modal',
              tabindex: '-1',
            },
            m('div.modal-dialog', [
              m('div.modal-content', [
                m('div.modal-header', [
                  m('h5.modal-title', '粘贴引用'),
                  m('button.btn-close', {
                    'data-bs-dismiss': 'modal',
                    'aria-label': 'Close',
                  }),
                ]),
                m('div.modal-body', [
                  m('textarea.form-control.font-monospace', {
                    placeholder:
                      '支持格式：BibTeX, RIS, BibLaTeX, Zotero以及更多',
                    rows: 10,
                  }),
                ]),
                m('div.modal-footer', [
                  m(
                    'button.btn.btn-secondary',
                    {
                      'data-bs-dismiss': 'modal',
                      'aria-label': 'Close',
                    },
                    '关闭'
                  ),
                  m(
                    'button.btn.btn-primary',
                    {
                      onclick: handleBibPaste,
                    },
                    '添加'
                  ),
                ]),
              ]),
            ])
          ),

          m('footer.text-center.text-muted.py-4.mt-5', [
            m('hr'),
            m('p.mb-0', '© 2025 ShareBib. All rights reserved.'),
            m('p', 'Made by Yachen with ❤️.'),
          ]),
        ]),
      ]);
    },
  };
}
