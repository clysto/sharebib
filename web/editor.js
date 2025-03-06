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

  const handleDeleteCreator = (index) => {
    bib.creators.splice(index, 1);
    if (vnode.attrs.onchange) {
      vnode.attrs.onchange(bib);
    }
  };

  const handleAddCreator = (index) => {
    if (!bib.creators) {
      bib.creators = [];
    }
    bib.creators.splice(index + 1, 0, { firstName: '', lastName: '' });
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
            bib.creators &&
            m('div.creators', [
              ...bib.creators.map((creator, index) =>
                m(
                  'div.input-group.mb-2',
                  {
                    class: 'creator',
                    key: `${creator.firstName}-${creator.lastName}-${creator.name}`,
                  },
                  [
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
                        onclick: () => handleDeleteCreator(index),
                      },
                      '删除'
                    ),
                    m(
                      'button.btn.btn-outline-primary',
                      {
                        onclick: () => handleAddCreator(index),
                      },
                      '添加'
                    ),
                  ]
                )
              ),
            ]),
          (!bib.creators || bib.creators.length === 0) &&
            m('div.mb-2.d-grid', [
              m(
                'button.btn.btn-outline-secondary',
                {
                  onclick: () => handleAddCreator(-1),
                },
                '添加作者'
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
                m(
                  field.field === 'abstractNote'
                    ? 'textarea.form-control'
                    : 'input.form-control',
                  {
                    value: bib[field.field],
                    onchange: handleChange,
                    name: field.field,
                  }
                ),
              ]);
            }),
        ])),
      ]);
    },
  };
}
