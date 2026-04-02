import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { BrowserWindow, ipcMain } from 'electron'
import { serializeDiffSnapshot } from '#src/core/serialize-diff-snapshot.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

function createReviewHtml(payload) {
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Sync Review</title>
    <style>
      :root {
        --bg: #f7f3eb;
        --panel: rgba(255, 251, 245, 0.95);
        --line: #dacdbb;
        --text: #2f2418;
        --muted: #7f705f;
        --accent: #8c5e34;
        --added: #1f7a4d;
        --modified: #a36a1c;
        --deleted: #b23a3a;
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        font-family: "SF Mono", "Menlo", monospace;
        color: var(--text);
        background:
          radial-gradient(circle at top left, rgba(194, 145, 76, 0.16), transparent 25%),
          linear-gradient(180deg, #faf7f1 0%, var(--bg) 100%);
      }
      .layout {
        display: grid;
        grid-template-rows: auto 1fr auto;
        height: 100vh;
      }
      .header, .footer {
        padding: 18px 22px;
        background: var(--panel);
        border-bottom: 1px solid var(--line);
      }
      .footer {
        border-top: 1px solid var(--line);
        border-bottom: 0;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .content {
        overflow: auto;
        padding: 18px 22px 28px;
      }
      h1 {
        margin: 0 0 10px;
        font-size: 18px;
      }
      .roots, .selection, .empty {
        color: var(--muted);
        font-size: 12px;
        line-height: 1.6;
      }
      .summary {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
        margin-top: 10px;
      }
      .pill {
        border: 1px solid currentColor;
        border-radius: 999px;
        padding: 4px 10px;
        font-size: 11px;
        font-weight: 700;
      }
      .pill.added { color: var(--added); }
      .pill.modified { color: var(--modified); }
      .pill.deleted { color: var(--deleted); }
      ul {
        list-style: none;
        margin: 0;
        padding-left: 18px;
        border-left: 1px solid rgba(218, 205, 187, 0.8);
      }
      .tree-root {
        padding-left: 0;
        border-left: 0;
      }
      li {
        margin: 8px 0;
      }
      details > summary {
        list-style: none;
      }
      details > summary::-webkit-details-marker {
        display: none;
      }
      .row {
        display: flex;
        align-items: center;
        gap: 10px;
      }
      .name {
        font-size: 13px;
      }
      .meta {
        color: var(--muted);
        font-size: 11px;
      }
      .folder-badges {
        display: inline-flex;
        gap: 6px;
      }
      .folder-badge {
        font-size: 10px;
        border-radius: 999px;
        padding: 2px 6px;
        background: rgba(127, 112, 95, 0.08);
        color: var(--muted);
      }
      .state {
        font-size: 10px;
        font-weight: 700;
        text-transform: uppercase;
      }
      .state.added { color: var(--added); }
      .state.modified { color: var(--modified); }
      .state.deleted { color: var(--deleted); }
      button {
        border: 1px solid var(--accent);
        background: transparent;
        color: var(--accent);
        border-radius: 999px;
        padding: 8px 14px;
        font: inherit;
        cursor: pointer;
      }
      button.primary {
        background: var(--accent);
        color: white;
      }
      .actions {
        display: flex;
        gap: 10px;
      }
      label {
        cursor: pointer;
      }
    </style>
  </head>
  <body>
    <div class="layout">
      <div class="header">
        <h1>Review Sync Differences</h1>
        <div class="roots">Source: ${payload.srcRoot}<br>Destination: ${payload.dstRoot}</div>
        <div class="summary">
          <span class="pill modified">Modified ${payload.summary.modified}</span>
          <span class="pill added">Added ${payload.summary.added}</span>
          <span class="pill deleted">Deleted ${payload.summary.deleted}</span>
        </div>
      </div>
      <div class="content">
        <div id="tree"></div>
      </div>
      <div class="footer">
        <div class="selection" id="selection"></div>
        <div class="actions">
          <button id="cancel">Cancel</button>
          <button id="confirm" class="primary">Confirm</button>
        </div>
      </div>
    </div>
    <script>
      const payload = ${JSON.stringify(payload)};
      const selected = new Set();

      function formatBytes(bytes) {
        if (!bytes) return '0 B';
        const units = ['B', 'KB', 'MB', 'GB', 'TB'];
        let value = bytes;
        let index = 0;
        while (value >= 1024 && index < units.length - 1) {
          value /= 1024;
          index += 1;
        }
        return \`\${value.toFixed(value >= 10 || index === 0 ? 0 : 1)} \${units[index]}\`;
      }

      function updateSelectionLabel() {
        document.getElementById('selection').textContent = \`\${selected.size} file(s) selected\`;
      }

      function createCheckbox(path, checked = true) {
        const input = document.createElement('input');
        input.type = 'checkbox';
        input.checked = checked;
        if (checked)
          selected.add(path);
        input.addEventListener('change', () => {
          if (input.checked)
            selected.add(path);
          else
            selected.delete(path);
          updateSelectionLabel();
        });
        return input;
      }

      function renderNodes(nodes, isRoot = false) {
        if (!nodes.length) {
          const empty = document.createElement('div');
          empty.className = 'empty';
          empty.textContent = 'No differences found.';
          return empty;
        }

        const list = document.createElement('ul');
        if (isRoot)
          list.className = 'tree-root';

        for (const node of nodes) {
          const item = document.createElement('li');

          if (node.type === 'directory') {
            const details = document.createElement('details');
            details.open = true;

            const summary = document.createElement('summary');
            const row = document.createElement('div');
            row.className = 'row';

            const label = document.createElement('label');
            const checkbox = createCheckbox(node.path, true);
            checkbox.addEventListener('change', () => {
              const nested = details.querySelectorAll('input[type="checkbox"]');
              for (const input of nested) {
                input.checked = checkbox.checked;
                const value = input.dataset.path;
                if (checkbox.checked)
                  selected.add(value);
                else
                  selected.delete(value);
              }
              updateSelectionLabel();
            });
            checkbox.dataset.path = node.path;
            label.appendChild(checkbox);
            row.appendChild(label);

            const name = document.createElement('span');
            name.className = 'name';
            name.textContent = node.name + '/';
            row.appendChild(name);

            const badges = document.createElement('span');
            badges.className = 'folder-badges';
            for (const [key, count] of Object.entries(node.changes)) {
              if (!count) continue;
              const badge = document.createElement('span');
              badge.className = 'folder-badge';
              badge.textContent = \`\${key} \${count}\`;
              badges.appendChild(badge);
            }
            row.appendChild(badges);

            summary.appendChild(row);
            details.appendChild(summary);
            details.appendChild(renderNodes(node.children));
            item.appendChild(details);
          } else {
            const row = document.createElement('label');
            row.className = 'row';

            const checkbox = createCheckbox(node.path, true);
            checkbox.dataset.path = node.path;
            row.appendChild(checkbox);

            const name = document.createElement('span');
            name.className = 'name';
            name.textContent = node.name;
            row.appendChild(name);

            const state = document.createElement('span');
            state.className = 'state ' + node.state;
            state.textContent = node.state;
            row.appendChild(state);

            const meta = document.createElement('span');
            meta.className = 'meta';
            meta.textContent = formatBytes(node.size);
            row.appendChild(meta);

            item.appendChild(row);
          }

          list.appendChild(item);
        }

        return list;
      }

      document.getElementById('tree').appendChild(renderNodes(payload.tree, true));
      updateSelectionLabel();

      document.getElementById('cancel').addEventListener('click', () => {
        window.syncReview.cancel();
      });

      document.getElementById('confirm').addEventListener('click', () => {
        window.syncReview.submit({
          action: 'confirm',
          selectedPaths: [...selected],
        });
      });
    </script>
  </body>
</html>`
}

export async function reviewDiffInWindow(diffSnapshot) {
  const payload = serializeDiffSnapshot(diffSnapshot)
  const channelPrefix = `sync-review:${Date.now()}:${Math.random().toString(16).slice(2)}`
  const submitChannel = `${channelPrefix}:submit`
  const cancelChannel = `${channelPrefix}:cancel`

  return await new Promise((resolve, reject) => {
    let settled = false
    const reviewWindow = new BrowserWindow({
      width: 1100,
      height: 760,
      minWidth: 780,
      minHeight: 520,
      autoHideMenuBar: true,
      show: false,
      title: 'Sync Review',
      webPreferences: {
        contextIsolation: true,
        preload: path.join(__dirname, '../preload/review-preload.js'),
        additionalArguments: [JSON.stringify({ submitChannel, cancelChannel })],
      },
    })

    const cleanup = () => {
      ipcMain.removeHandler(submitChannel)
      ipcMain.removeHandler(cancelChannel)
    }

    ipcMain.handle(submitChannel, async (_, result) => {
      if (settled)
        return
      settled = true
      cleanup()
      resolve(result)
      reviewWindow.close()
    })

    ipcMain.handle(cancelChannel, async () => {
      if (settled)
        return
      settled = true
      cleanup()
      reject(new Error('Diff review cancelled by user'))
      reviewWindow.close()
    })

    reviewWindow.once('ready-to-show', () => {
      reviewWindow.show()
    })

    reviewWindow.on('closed', () => {
      if (settled)
        return
      settled = true
      cleanup()
      reject(new Error('Diff review window closed before confirmation'))
    })

    reviewWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(createReviewHtml(payload))}`)
      .catch((error) => {
        if (settled)
          return
        settled = true
        cleanup()
        reject(error)
      })
  })
}
