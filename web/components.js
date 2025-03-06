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
  const bibs = [];

  const id = m.route.param('id');

  bibSpaceFetch(id).then((data) => {
    for (let bib of data.bibs) {
      bibs.push(bib);
    }
    m.redraw();
  });

  const handleEdit = (bib) => {
    editItem = bib;
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    const query = searchInput.dom.value;
    searchInput.dom.value = '';
    searching = true;
    const result = await bibSearch(query);
    searching = false;
    if (result.length == 1) {
      bibs.push(result[0]);
      m.redraw();
      handleBibsChange();
    }
  };

  const handleBibsChange = () => {
    bibSpaceSync(id, bibs);
  };

  return {
    view: (vnode) => {
      const zoteroSchema = window.zoteroSchema;
      const url = document.location.host;
      return m('div', { id: 'app' }, [
        m('div.container', [
          m('div.input-group.mb-2', [
            (searchInput = m('input.form-control', {
              placeholder: '输入 URL, ISBN, DOI, PMID, arXiv ID 或其他标识',
            })),
            m(
              'button.btn.btn-primary',
              {
                onclick: handleSearch,
              },
              '引用'
            ),
          ]),

          m('div.input-group', [
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
                    ['data-bs-toggle']: 'modal',
                    ['data-bs-target']: '#edit-modal',
                    onclick: () => handleEdit(bib),
                  },
                  [
                    m('td', bib.title),
                    m(
                      'td',
                      bib.creators.length > 0
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

          // 编辑弹窗
          m(
            'div.modal.fade',
            {
              id: 'edit-modal',
              tabindex: '-1',
            },
            m('div.modal-dialog', [
              m('div.modal-content', [
                m('div.modal-header', [
                  m('h5.modal-title', '编辑'),
                  m('button.btn-close', {
                    ['data-bs-dismiss']: 'modal',
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

  return {
    view: () =>
      m('div', [
        m(
          'button.btn.btn-primary',
          { onclick: handleCreateSpace },
          '创建文献列表'
        ),
      ]),
  };
}
