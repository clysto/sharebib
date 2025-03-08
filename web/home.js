function Home() {
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
    view: () =>
      m('div.container.py-5', [
        m('h1.text-center.py-4', 'ShareBib'),

        m('h5', '最近的文献列表'),

        m('div.list-group.list-group-flush.mb-4', [
          ...history.map((id) =>
            m(
              'button.list-group-item.list-group-item-action.font-monospace.px-0.d-flex.justify-content-between',
              {
                onclick: () => m.route.set(`/${id}`),
                style: { cursor: 'pointer' },
              },
              [
                m('div', id),
                m('a.btn.btn-close.me-2', {
                  ['aria-label']: 'Close',
                  onclick: (e) => {
                    e.stopPropagation();
                    history = history.filter((i) => i !== id);
                    localStorage.setItem('history', JSON.stringify(history));
                    m.redraw();
                  },
                }),
              ]
            )
          ),
        ]),
        m('div.text-center', [
          m(
            'button.btn.btn-primary.btn-lg.rounded-pill',
            { onclick: handleCreateSpace },
            [m('i.bi.bi-plus-circle-fill.me-2'), '创建新的文献列表']
          ),
        ]),

        m('footer.text-center.text-muted.py-4.mt-5', [
          m('hr'),
          m('p.mb-0', '© 2025 ShareBib. All rights reserved.'),
          m('p', 'Made by Yachen with ❤️.'),
        ]),
      ]),
  };
}
