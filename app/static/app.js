/* React front-end for canvas nodes with locking, edit, drag, and non-overlap */
const { useEffect, useRef, useState, useCallback } = React;

function useDrag(initial, onChange) {
  const posRef = useRef(initial);
  const draggingRef = useRef(false);

  useEffect(() => { posRef.current = initial; }, [initial.x, initial.y]);

  const onPointerDown = useCallback((e) => {
    draggingRef.current = true;
    const start = { x: e.clientX, y: e.clientY };
    const startPos = { ...posRef.current };
    const move = (ev) => {
      if (!draggingRef.current) return;
      const nx = startPos.x + (ev.clientX - start.x);
      const ny = startPos.y + (ev.clientY - start.y);
      posRef.current = { x: nx, y: ny };
      onChange(posRef.current);
    };
    const up = () => { draggingRef.current = false; window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  }, [onChange]);

  return { onPointerDown };
}

function collide(a, b, pad = 24) {
  return !(a.x + a.w + pad < b.x || b.x + b.w + pad < a.x || a.y + a.h + pad < b.y || b.y + b.h + pad < a.y);
}

function placeNonOverlapping(nodes, desired) {
  // Greedy bumping to the right and down
  let pos = { ...desired };
  for (let i = 0; i < 200; i++) {
    let hasCollision = false;
    for (const n of nodes) {
      if (collide({ x: pos.x, y: pos.y, w: desired.w, h: desired.h }, n)) { hasCollision = true; break; }
    }
    if (!hasCollision) return pos;
    pos = { x: pos.x + 32, y: pos.y + 28 };
  }
  return pos;
}

function Node({ node, onDrag, onSubmit, onEdit }) {
  const ref = useRef(null);
  const [ctx, setCtx] = useState(null);
  const dragBind = useDrag({ x: node.x, y: node.y }, onDrag);

  useEffect(() => { if (ref.current) { ref.current.style.left = node.x + 'px'; ref.current.style.top = node.y + 'px'; } }, [node.x, node.y]);

  const onContextMenu = (e) => {
    e.preventDefault();
    if (node.type !== 'user') return;
    setCtx({ x: e.clientX, y: e.clientY });
  };

  const closeMenu = () => setCtx(null);

  return (
    React.createElement(React.Fragment, null,
      React.createElement('div', {
        ref,
        className: 'node ' + node.type,
        onContextMenu,
        style: { left: node.x, top: node.y }
      },
        React.createElement('div', { className: 'title', onPointerDown: dragBind.onPointerDown },
          React.createElement('span', null, node.type === 'user' ? '用户' : 'AI'),
          React.createElement('span', { style: { fontSize: 10, color: '#64748b' } }, node.locked ? '已提交' : '可编辑')
        ),
        node.type === 'user' ? (
          React.createElement('div', null,
            React.createElement('textarea', {
              value: node.text,
              placeholder: '输入你的问题…',
              disabled: node.locked,
              onChange: (e) => onEdit({ ...node, text: e.target.value })
            }),
            React.createElement('div', { className: 'row' },
              React.createElement('button', { disabled: node.locked || !node.text.trim(), onClick: () => onSubmit(node) }, '发送'),
              React.createElement('button', { className: 'secondary', onClick: () => onEdit({ ...node, text: '', locked: false }) }, '清空')
            )
          )
        ) : (
          React.createElement('div', null, node.text)
        )
      ),
      ctx ? React.createElement('div', { className: 'context-menu', style: { left: ctx.x, top: ctx.y }, onMouseLeave: closeMenu },
        React.createElement('button', { onClick: () => { closeMenu(); onEdit({ ...node, locked: false }); } }, '编辑'),
        React.createElement('button', { onClick: () => { closeMenu(); onSubmit({ ...node, locked: false }); } }, '重新提问')
      ) : null
    )
  );
}

function App() {
  const rootRef = useRef(null);
  const [nodes, setNodes] = useState([]);

  const addUserAt = (x, y) => {
    const id = 'u_' + Math.random().toString(36).slice(2, 9);
    const size = { w: 320, h: 180 };
    const placed = placeNonOverlapping(nodes.map(n => ({ x: n.x, y: n.y, w: 320, h: n.type === 'user' ? 180 : 120 })), { x, y, ...size });
    setNodes(prev => [...prev, { id, type: 'user', text: '', x: placed.x, y: placed.y, locked: false }]);
  };

  const onDblClick = (e) => {
    const rect = rootRef.current.getBoundingClientRect();
    addUserAt(e.clientX - rect.left, e.clientY - rect.top);
  };

  const updateNode = (updated) => setNodes(prev => prev.map(n => n.id === updated.id ? updated : n));

  const handleDrag = (id) => (pos) => updateNode({ ...nodes.find(n => n.id === id), ...pos });

  const submit = async (node) => {
    if (node.locked) return;
    if (!node.text.trim()) return;
    updateNode({ ...node, locked: true });
    try {
      const res = await fetch('/api/ask', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ question: node.text }) });
      const data = await res.json();
      const answer = data && data.answer ? data.answer : '请求失败';
      // Place AI node to the right of user, avoiding overlap
      const aiSize = { w: 320, h: 120 };
      const desired = { x: node.x + 360, y: node.y, ...aiSize };
      const placed = placeNonOverlapping(nodes.map(n => ({ x: n.x, y: n.y, w: 320, h: n.type === 'user' ? 180 : 120 })), desired);
      setNodes(prev => [...prev, { id: 'a_' + Math.random().toString(36).slice(2, 9), type: 'ai', text: answer, x: placed.x, y: placed.y, locked: true }]);
    } catch (e) {
      setNodes(prev => [...prev, { id: 'a_' + Math.random().toString(36).slice(2, 9), type: 'ai', text: '请求失败', x: node.x + 360, y: node.y, locked: true }]);
    }
  };

  useEffect(() => {
    console.log('[Canvas] App mounted');
    const dbg = (ev) => console.log('[Canvas] document dblclick at', ev.clientX, ev.clientY);
    document.addEventListener('dblclick', dbg, { once: true });
    return () => document.removeEventListener('dblclick', dbg);
  }, []);

  return (
    React.createElement('div', { className: 'canvas-root', ref: rootRef, onDoubleClick: onDblClick },
      React.createElement('div', { className: 'toolbar' },
        React.createElement('button', { onClick: () => { console.log('[Canvas] test add'); addUserAt(120, 120); } }, '测试添加节点'),
        React.createElement('span', { style: { color: '#94a3b8', fontSize: 12, paddingTop: 8 } }, '双击空白处创建用户节点')
      ),
      nodes.map(n => (
        React.createElement(Node, {
          key: n.id,
          node: n,
          onDrag: handleDrag(n.id),
          onSubmit: submit,
          onEdit: updateNode
        })
      ))
    )
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(App));


