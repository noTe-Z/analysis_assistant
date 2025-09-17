(function () {
  const canvas = document.getElementById('canvas');

  function createUserNodeAt(x, y) {
    const node = document.createElement('div');
    node.className = 'node user';
    node.style.left = x + 'px';
    node.style.top = y + 'px';

    const textarea = document.createElement('textarea');
    textarea.placeholder = '输入你的问题…';

    const row = document.createElement('div');
    row.className = 'row';

    const sendBtn = document.createElement('button');
    sendBtn.textContent = '发送';

    row.appendChild(sendBtn);

    node.appendChild(textarea);
    node.appendChild(row);
    canvas.appendChild(node);

    sendBtn.addEventListener('click', async () => {
      const question = textarea.value.trim();
      if (!question) return;
      sendBtn.disabled = true;
      try {
        const res = await fetch('/api/ask', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ question })
        });
        const data = await res.json();
        const answer = data && data.answer ? data.answer : String(data);
        createAiNodeNear(node, answer);
      } catch (e) {
        createAiNodeNear(node, '请求失败');
      } finally {
        sendBtn.disabled = false;
      }
    });
  }

  function createAiNodeNear(userNode, text) {
    const rect = userNode.getBoundingClientRect();
    const x = rect.left + rect.width + 40 + window.scrollX;
    const y = rect.top + window.scrollY;
    const node = document.createElement('div');
    node.className = 'node ai';
    node.style.left = x + 'px';
    node.style.top = y + 'px';
    node.textContent = text;
    canvas.appendChild(node);
  }

  canvas.addEventListener('dblclick', (ev) => {
    const rect = canvas.getBoundingClientRect();
    const x = ev.clientX - rect.left;
    const y = ev.clientY - rect.top;
    createUserNodeAt(x, y);
  });
})();


