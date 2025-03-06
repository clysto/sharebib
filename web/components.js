function BibEditor(vnode) {
  const zoteroSchema = vnode.attrs.zoteroSchema;
  let bib = vnode.attrs.bib;
  let dom = null;

  const handleChange = () => {
    const inputs = dom.dom.querySelectorAll('input');
    bib.creators = [];
    inputs.forEach((input) => {
      if (input.name !== 'creator') {
        bib[input.name] = input.value;
      }
    });
    const creatorInputs = dom.dom.querySelectorAll('.creator');
    creatorInputs.forEach((input) => {
      const [firstName, lastName] = input
        .querySelector('input')
        .value.split(', ');
      const creatorType = input.querySelector('select').value;
      bib.creators.push({ firstName, lastName, creatorType });
    });
    if (vnode.attrs.onchange) {
      vnode.attrs.onchange(bib);
    }
  };

  const handleItemTypeChange = (e) => {
    const itemType = e.target.value;
    bib.itemType = itemType;
  };

  const handleDeleteCreator = (e) => {
    const creatorIndex = e.target.dataset.index;
    bib.creators.splice(creatorIndex, 1);
    if (vnode.attrs.onchange) {
      vnode.attrs.onchange(bib);
    }
  };

  const handleAddCreator = (e) => {
    const addAfter = e.target.dataset.index;
    bib.creators.splice(addAfter + 1, 0, { firstName: '', lastName: '' });
    if (vnode.attrs.onchange) {
      vnode.attrs.onchange(bib);
    }
  };

  return {
    view: (vnode) => {
      bib = vnode.attrs.bib;
      const itemType = vnode.attrs.bib.itemType;
      const locales = zoteroSchema.locales['zh-CN'];
      let itemSchema = zoteroSchema.itemTypes.filter(
        (item) => item.itemType === itemType
      );
      if (itemSchema.length === 0) {
        return m('div', { class: 'bib-editor' }, 'Unknown item type');
      }
      itemSchema = itemSchema[0];
      return m('div', { class: 'bib-editor' }, [
        (dom = m('div', { class: 'body' }, [
          m('div.input-group.mb-2', [
            m('span.input-group-text', '条目类型'),
            m(
              'select.form-control',
              {
                name: 'itemType',
                onchange: handleItemTypeChange,
                value: itemType,
              },
              [
                ...zoteroSchema.itemTypes.map((type) =>
                  m(
                    'option',
                    {
                      value: type.itemType,
                    },
                    locales.itemTypes[type.itemType]
                  )
                ),
              ]
            ),
          ]),
          m('div.input-group.mb-2', [
            m('span.input-group-text', locales.fields['title'] || 'title'),
            m('input.form-control', {
              value: bib['title'],
              onchange: handleChange,
              name: 'title',
            }),
          ]),
          itemSchema.creatorTypes.length > 0 &&
            m('div.creators', [
              ...bib.creators.map((creator) =>
                m('div.input-group.mb-2', { class: 'creator' }, [
                  m(
                    'select.form-control',
                    {
                      value: creator.creatorType,
                      onchange: handleChange,
                    },
                    [
                      ...itemSchema.creatorTypes.map((type) =>
                        m(
                          'option',
                          {
                            value: type.creatorType,
                          },
                          locales.creatorTypes[type.creatorType]
                        )
                      ),
                    ]
                  ),
                  m('input.form-control', {
                    value: `${creator.firstName}, ${creator.lastName}`,
                    name: 'creator',
                    onchange: handleChange,
                  }),
                  m(
                    'button.btn.btn-outline-danger',
                    {
                      onclick: handleDeleteCreator,
                      'data-index': bib.creators.indexOf(creator),
                    },
                    '删除'
                  ),
                  m(
                    'button.btn.btn-outline-primary',
                    {
                      onclick: handleAddCreator,
                      'data-index': bib.creators.indexOf(creator),
                    },
                    '添加'
                  ),
                ])
              ),
            ]),
          ...itemSchema.fields
            .filter((field) => field.field !== 'title')
            .map((field) => {
              return m('div.input-group.mb-2', [
                m(
                  'span.input-group-text',
                  locales.fields[field.field] || field.field
                ),
                m('input.form-control', {
                  value: bib[field.field],
                  onchange: handleChange,
                  name: field.field,
                }),
              ]);
            }),
        ])),
      ]);
    },
  };
}

function App() {
  let editItem = null;
  let searchInput = null;
  let searching = false;
  let searchResults = []; // 存储搜索结果
  let bibs = [];
  let searchModal = null; // 控制模态框显示
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
    .catch((error) => {
      m.route.set('/');
    });

  const handleEdit = (bib) => {
    editItem = bib;
    editorModal.show();
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    const query = searchInput.dom.value.trim();
    if (!query) return;

    searchInput.dom.value = '';
    searching = true;
    searchResults = [];
    const result = await bibSearch(query);
    searching = false;
    searchResults = result;
    searchModal.show();
    m.redraw();
  };

  const handleSelectBib = (bib) => {
    bibs.push(bib);
    handleBibsChange();
    searchModal.hide();
    searchResults = [];
    m.redraw();
  };

  const handleBibsChange = () => {
    bibSpaceSync(id, bibs);
    m.redraw();
  };

  return {
    oncreate: () => {
      searchModal = new bootstrap.Modal('#search-modal');
      editorModal = new bootstrap.Modal('#edit-modal');
    },
    onremove: () => {
      searchModal.dispose();
      editorModal.dispose();
    },
    view: () => {
      const zoteroSchema = window.zoteroSchema;
      const url = document.location.host;

      return m('div.py-5', { id: 'app' }, [
        m('div.container', [
          m('h1.text-center.py-4', 'ShareBib'),
          // 搜索栏
          m('div.input-group.mb-2', [
            (searchInput = m('input.form-control', {
              placeholder: '输入 URL, ISBN, DOI, PMID, arXiv ID 或其他标识',
            })),
            m(
              'button.btn.btn-primary',
              { onclick: handleSearch, disabled: searching },
              searching ? '搜索中...' : '引用'
            ),
          ]),

          // BibTeX 下载链接
          m('div.input-group.mb-4', [
            m('span.input-group-text', 'BibTeX URL'),
            m('input.form-control.font-monospace', {
              readonly: true,
              value: `${url}/bibtex/${id}.bib`,
            }),
            m(
              'a.btn.btn-secondary',
              { href: `/bibtex/${id}.bib`, download: `${id}.bib` },
              '下载'
            ),
          ]),

          // 文献表格
          m('table.table.table-hover', [
            m('thead', [
              m('tr', [m('th', '标题'), m('th', '作者'), m('th', '日期')]),
            ]),
            m('tbody', [
              ...bibs.map((bib) =>
                m(
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
                        : '无作者'
                    ),
                    m('td', bib.date),
                  ]
                )
              ),
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
                        ...searchResults.map((bib) =>
                          m(
                            'li.list-group-item.list-group-item-action',
                            {
                              onclick: () => handleSelectBib(bib),
                              style: { cursor: 'pointer' },
                            },
                            [
                              m('strong', bib.title),
                              m(
                                'span.text-muted.ms-2',
                                bib.creators && bib.creators.length > 0
                                  ? bib.creators
                                      .map(
                                        (c) => `${c.firstName} ${c.lastName}`
                                      )
                                      .join(', ')
                                  : '无作者'
                              ),
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

function Home() {
  const handleCreateSpace = async () => {
    const space = await bibSpaceCreate();
    m.route.set(`/${space.id}`);
  };

  let history = localStorage.getItem('history');
  if (!history) {
    localStorage.setItem('history', JSON.stringify([]));
    history = [];
  }

  return {
    view: () =>
      m('div.container.py-5', [
        m('h1.text-center.py-4', 'ShareBib'),

        m('h3', '最近的文献列表'),

        m('ul.list-group.mb-2', [
          ...JSON.parse(history).map((id) =>
            m(
              'li.list-group-item.list-group-item-action.font-monospace',
              {
                onclick: () => m.route.set(`/${id}`),
                style: { cursor: 'pointer' },
              },
              id
            )
          ),
        ]),

        m(
          'button.btn.btn-primary.btn-lg',
          { onclick: handleCreateSpace },
          '创建新的文献列表'
        ),
      ]),
  };
}
