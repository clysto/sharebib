function BibEditor(vnode) {
  const zoteroSchema = vnode.attrs.zoteroSchema;
  let bib = vnode.attrs.bib;
  let dom = null;
  let itemSchema = null;

  const handleChange = () => {
    const inputs = dom.dom.querySelectorAll('.form-control');
    bib.creators = [];
    inputs.forEach((input) => {
      if (!input.name.startsWith('creator')) {
        bib[input.name] = input.value;
      }
    });
    const creatorInputs = dom.dom.querySelectorAll('.creator');
    creatorInputs.forEach((input) => {
      const creatorType = input.querySelector('select').value;
      const firstName = input.querySelector('input[name=creator-firstname]');
      const lastName = input.querySelector('input[name=creator-lastname]');
      const name = input.querySelector('input[name=creator-name]');
      if (name) {
        bib.creators.push({
          name: name.value,
          creatorType: creatorType,
        });
      } else {
        bib.creators.push({
          firstName: firstName.value,
          lastName: lastName.value,
          creatorType: creatorType,
        });
      }
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

  const handleNameMerge = (index) => {
    const creator = bib.creators[index];
    if (creator.name) {
      const [firstName, lastName] = creator.name.split(' ');
      creator.firstName = firstName;
      creator.lastName = lastName;
      creator.name = undefined;
    } else {
      creator.name = `${creator.firstName} ${creator.lastName}`;
      creator.firstName = undefined;
      creator.lastName = undefined;
    }
    if (vnode.attrs.onchange) {
      vnode.attrs.onchange;
    }
  };

  const handleAddCreator = (index) => {
    defaultCreatorType = itemSchema.creatorTypes.filter(
      (type) => type.primary
    )[0].creatorType;
    console.log(defaultCreatorType);
    if (!bib.creators) {
      bib.creators = [];
    }
    bib.creators.splice(index + 1, 0, {
      firstName: '',
      lastName: '',
      creatorType: defaultCreatorType,
    });
    if (vnode.attrs.onchange) {
      vnode.attrs.onchange(bib);
    }
  };

  return {
    view: (vnode) => {
      bib = vnode.attrs.bib;
      const itemType = vnode.attrs.bib.itemType;
      const locales = zoteroSchema.locales['zh-CN'];
      itemSchema = zoteroSchema.itemTypes.filter(
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
                  'div.d-flex.align-items-center.mb-2',
                  {
                    key: `${creator.firstName}-${creator.lastName}-${creator.name}`,
                  },
                  [
                    m(
                      'div.input-group',
                      {
                        class: 'creator',
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
                        creator.name
                          ? m('input.form-control', {
                              value: creator.name,
                              name: 'creator-name',
                              onchange: handleChange,
                            })
                          : [
                              m('input.form-control', {
                                value: creator.firstName,
                                name: 'creator-firstname',
                                onchange: handleChange,
                              }),
                              m('input.form-control', {
                                value: creator.lastName,
                                name: 'creator-lastname',
                                onchange: handleChange,
                              }),
                            ],
                      ]
                    ),
                    m(
                      'button.btn.px-1.ms-2',
                      {
                        onclick: () => handleNameMerge(index),
                      },
                      m('i.bi.bi-input-cursor')
                    ),
                    m(
                      'button.btn.px-1',
                      {
                        onclick: () => handleDeleteCreator(index),
                      },
                      m('i.bi.bi-dash-circle')
                    ),
                    m(
                      'button.btn.px-1',
                      {
                        onclick: () => handleAddCreator(index),
                      },
                      m('i.bi.bi-plus-circle')
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
                [m('i.bi.bi-person-fill-add.me-2'), '添加作者']
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
