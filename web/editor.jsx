import m from 'mithril';

export default function BibEditor(vnode) {
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
    const defaultCreatorType = itemSchema.creatorTypes.filter(
      (type) => type.primary
    )[0].creatorType;
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
    oncreate: () => {
      dom = document.querySelector('.bib-editor');
    },
    view: (vnode) => {
      bib = vnode.attrs.bib;
      const itemType = vnode.attrs.bib.itemType;
      const locales = zoteroSchema.locales['zh-CN'];
      itemSchema = zoteroSchema.itemTypes.filter(
        (item) => item.itemType === itemType
      );
      if (itemSchema.length === 0) {
        return <div class="bib-editor">Unknown item type</div>;
      }
      itemSchema = itemSchema[0];
      return (
        <div class="bib-editor">
          <div class="body">
            <div class="input-group mb-2">
              <span class="input-group-text">条目类型</span>
              <select
                class="form-control"
                name="itemType"
                onchange={handleItemTypeChange}
                value={itemType}
              >
                {zoteroSchema.itemTypes.map((type) => (
                  <option value={type.itemType}>
                    {locales.itemTypes[type.itemType]}
                  </option>
                ))}
              </select>
            </div>

            <div class="input-group mb-2">
              <span class="input-group-text" style={{ minWidth: '90px' }}>
                {locales.fields['title'] || 'title'}
              </span>
              <input
                class="form-control"
                value={bib['title']}
                onchange={handleChange}
                name="title"
              />
            </div>

            {itemSchema.creatorTypes.length > 0 && bib.creators && (
              <div class="creators">
                {bib.creators.map((creator, index) => (
                  <div
                    class="d-flex align-items-center mb-2"
                    key={`${creator.firstName}-${creator.lastName}-${creator.name}`}
                  >
                    <div class="input-group creator">
                      <select
                        class="form-control"
                        value={creator.creatorType}
                        onchange={handleChange}
                      >
                        {itemSchema.creatorTypes.map((type) => (
                          <option value={type.creatorType}>
                            {locales.creatorTypes[type.creatorType]}
                          </option>
                        ))}
                      </select>
                      {creator.name ? (
                        <input
                          class="form-control"
                          value={creator.name}
                          name="creator-name"
                          onchange={handleChange}
                        />
                      ) : (
                        <>
                          <input
                            class="form-control"
                            value={creator.firstName}
                            name="creator-firstname"
                            onchange={handleChange}
                          />
                          <input
                            class="form-control"
                            value={creator.lastName}
                            name="creator-lastname"
                            onchange={handleChange}
                          />
                        </>
                      )}
                    </div>
                    <button
                      class="btn px-1 ms-2"
                      onclick={() => handleNameMerge(index)}
                    >
                      <i class="bi bi-input-cursor"></i>
                    </button>
                    <button
                      class="btn px-1"
                      onclick={() => handleDeleteCreator(index)}
                    >
                      <i class="bi bi-dash-circle"></i>
                    </button>
                    <button
                      class="btn px-1"
                      onclick={() => handleAddCreator(index)}
                    >
                      <i class="bi bi-plus-circle"></i>
                    </button>
                  </div>
                ))}
              </div>
            )}

            {(!bib.creators || bib.creators.length === 0) && (
              <div class="mb-2 d-grid">
                <button
                  class="btn btn-outline-secondary"
                  onclick={() => handleAddCreator(-1)}
                >
                  <i class="bi bi-person-fill-add me-2"></i> 添加作者
                </button>
              </div>
            )}

            {itemSchema.fields
              .filter((field) => field.field !== 'title')
              .map((field) => (
                <div class="input-group mb-2" key={field.field}>
                  <span class="input-group-text" style={{ minWidth: '90px' }}>
                    {locales.fields[field.field] || field.field}
                  </span>
                  {field.field === 'abstractNote' ? (
                    <textarea
                      class="form-control"
                      value={bib[field.field]}
                      onchange={handleChange}
                      name={field.field}
                    />
                  ) : (
                    <input
                      class="form-control"
                      value={bib[field.field]}
                      onchange={handleChange}
                      name={field.field}
                    />
                  )}
                </div>
              ))}
          </div>
        </div>
      );
    },
  };
}
