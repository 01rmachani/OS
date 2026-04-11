/* =========================================================
   BrowserOS — Knowledge Graph App (D3.js force-directed)
   ========================================================= */
import { FS } from '../core/fileSystem.js';
import { EventBus } from '../core/eventBus.js';

const FOLDER_COLORS = [
  '#7c6af7','#06b6d4','#10b981','#f59e0b',
  '#f43f5e','#a855f7','#3b82f6','#14b8a6',
];

export const GraphApp = {
  id: 'graph', name: 'Knowledge Graph', emoji: '🕸️',
  iconBg: 'icon-bg-purple', defaultWidth: 900, defaultHeight: 620,
  keywords: ['graph', 'knowledge', 'links', 'wikilinks', 'visualization', 'network'],
  description: 'D3 force-directed visualization of your note connections.',

  mount(container, args, winId) {
    container.innerHTML = `
      <div class="graph-app">
        <div class="graph-sidebar">
          <div class="graph-sidebar-header">Knowledge Graph</div>
          <input type="text" class="graph-search" placeholder="Search nodes..." id="graph-search">
          <div class="graph-sidebar-body">
            <div class="graph-filter-label">Folders</div>
            <div id="graph-folder-filters"></div>
            <div class="graph-filter-label" style="margin-top:12px;">Options</div>
            <label class="graph-filter-item">
              <input type="checkbox" id="graph-show-orphans" checked>
              <span class="graph-filter-text">Show orphan nodes</span>
            </label>
            <div class="graph-stats">
              <div class="graph-stat"><span class="graph-stat-label">Nodes</span><span class="graph-stat-value" id="g-nodes">0</span></div>
              <div class="graph-stat"><span class="graph-stat-label">Links</span><span class="graph-stat-value" id="g-links">0</span></div>
              <div class="graph-stat"><span class="graph-stat-label">Clusters</span><span class="graph-stat-value" id="g-clusters">0</span></div>
            </div>
          </div>
        </div>
        <div class="graph-canvas" id="graph-canvas">
          <div class="graph-loading" id="graph-loading"><div class="graph-spinner"></div><span>Building graph…</span></div>
          <svg id="graph-svg" style="display:none;width:100%;height:100%;"></svg>
          <div class="graph-tooltip hidden" id="graph-tooltip"></div>
          <div class="graph-controls">
            <button class="graph-ctrl-btn" id="g-zoom-in"  title="Zoom In">+</button>
            <button class="graph-ctrl-btn" id="g-zoom-out" title="Zoom Out">−</button>
            <button class="graph-ctrl-btn" id="g-reset"    title="Reset View">⌂</button>
            <button class="graph-ctrl-btn" id="g-refresh"  title="Refresh">↺</button>
          </div>
        </div>
      </div>`;

    let simulation, zoomBehavior, searchQuery = '';
    let showOrphans = true;
    let hiddenFolders = new Set();

    const buildAndRender = async () => {
      document.getElementById('graph-loading').style.display = 'flex';
      document.getElementById('graph-svg').style.display = 'none';

      const { nodes, links, folders } = await buildGraphData();
      renderGraph(nodes, links, folders);
    };

    const buildGraphData = async () => {
      const files = await FS.getAllFiles().catch(() => []);
      const mdFiles = files.filter(f => f.name.endsWith('.md'));

      const nameToPath = {};
      mdFiles.forEach(f => {
        nameToPath[f.name.replace(/\.md$/i, '').toLowerCase()] = f.path;
      });

      const nodes = mdFiles.map(f => ({
        id: f.path,
        name: f.name.replace(/\.md$/i, ''),
        folder: f.parentPath || '/',
        tags: f.tags || [],
        inDegree: 0,
      }));

      const links = [];
      const seen = new Set();
      for (const f of mdFiles) {
        const wikilinks = FS.extractWikilinks(f.content || '');
        for (const target of wikilinks) {
          const targetPath = nameToPath[target.toLowerCase()];
          if (targetPath && targetPath !== f.path) {
            const key = f.path + '→' + targetPath;
            if (!seen.has(key)) {
              seen.add(key);
              links.push({ source: f.path, target: targetPath });
              const targetNode = nodes.find(n => n.id === targetPath);
              if (targetNode) targetNode.inDegree++;
            }
          }
        }
      }

      const folders = [...new Set(nodes.map(n => n.folder))];
      return { nodes, links, folders };
    };

    const renderGraph = (allNodes, allLinks, folders) => {
      const canvasEl = document.getElementById('graph-canvas');
      const svgEl    = document.getElementById('graph-svg');
      const loading  = document.getElementById('graph-loading');

      // Folder color map
      const folderColor = {};
      folders.forEach((f, i) => { folderColor[f] = FOLDER_COLORS[i % FOLDER_COLORS.length]; });

      // Populate folder filters
      const filtersEl = document.getElementById('graph-folder-filters');
      filtersEl.innerHTML = folders.map(f => `
        <label class="graph-filter-item">
          <input type="checkbox" class="folder-filter" data-folder="${f}" checked>
          <span class="graph-filter-text">${f.split('/').pop() || 'Root'}</span>
          <span class="graph-node-count">${allNodes.filter(n => n.folder === f).length}</span>
        </label>`).join('');

      filtersEl.querySelectorAll('.folder-filter').forEach(cb => {
        cb.addEventListener('change', () => {
          if (cb.checked) hiddenFolders.delete(cb.dataset.folder);
          else hiddenFolders.add(cb.dataset.folder);
          updateVisibility();
        });
      });

      const W = canvasEl.offsetWidth - 220; // subtract sidebar
      const H = canvasEl.offsetHeight;

      // Clear SVG
      const svg = d3.select('#graph-svg');
      svg.selectAll('*').remove();
      svgEl.style.display = '';
      loading.style.display = 'none';

      // Zoom group
      const g = svg.append('g');
      zoomBehavior = d3.zoom()
        .scaleExtent([0.1, 4])
        .on('zoom', e => g.attr('transform', e.transform));
      svg.call(zoomBehavior);

      // Build simulation
      simulation = d3.forceSimulation(allNodes)
        .force('link', d3.forceLink(allLinks).id(d => d.id).distance(80))
        .force('charge', d3.forceManyBody().strength(-180))
        .force('center', d3.forceCenter(W / 2, H / 2))
        .force('collision', d3.forceCollide(d => nodeRadius(d) + 6));

      // Links
      const linkSel = g.append('g')
        .selectAll('line')
        .data(allLinks)
        .enter().append('line')
        .attr('class', 'graph-link')
        .attr('stroke', 'rgba(255,255,255,0.15)')
        .attr('stroke-width', 1.5);

      // Nodes
      const nodeG = g.append('g')
        .selectAll('g')
        .data(allNodes)
        .enter().append('g')
        .attr('class', 'graph-node')
        .call(d3.drag()
          .on('start', (e, d) => { if (!e.active) simulation.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; })
          .on('drag',  (e, d) => { d.fx = e.x; d.fy = e.y; })
          .on('end',   (e, d) => { if (!e.active) simulation.alphaTarget(0); d.fx = null; d.fy = null; }));

      nodeG.append('circle')
        .attr('r', d => nodeRadius(d))
        .attr('fill', d => folderColor[d.folder] || '#7c6af7')
        .attr('fill-opacity', 0.85)
        .attr('stroke', d => folderColor[d.folder] || '#7c6af7')
        .attr('stroke-width', 2)
        .attr('stroke-opacity', 0.4);

      nodeG.append('text')
        .attr('dy', d => nodeRadius(d) + 14)
        .attr('text-anchor', 'middle')
        .attr('font-size', 11)
        .attr('fill', 'rgba(255,255,255,0.75)')
        .text(d => d.name.length > 18 ? d.name.slice(0, 16) + '…' : d.name);

      // Tooltip
      const tooltip = document.getElementById('graph-tooltip');
      nodeG
        .on('mouseenter', (e, d) => {
          tooltip.innerHTML = `
            <div class="graph-tooltip-name">${d.name}</div>
            <div style="font-size:11px;color:var(--text-muted);">${d.folder} · ${d.inDegree} backlink${d.inDegree!==1?'s':''}</div>
            ${d.tags.length ? `<div class="graph-tooltip-tags">${d.tags.map(t=>`<span class="graph-tooltip-tag">#${t}</span>`).join('')}</div>` : ''}
          `;
          tooltip.style.left  = (e.offsetX + 12) + 'px';
          tooltip.style.top   = (e.offsetY - 10) + 'px';
          tooltip.classList.remove('hidden');

          // Highlight connected links
          linkSel.attr('stroke', l =>
            (l.source.id === d.id || l.target.id === d.id) ? 'var(--accent-primary)' : 'rgba(255,255,255,0.08)');
        })
        .on('mouseleave', () => {
          tooltip.classList.add('hidden');
          linkSel.attr('stroke', 'rgba(255,255,255,0.15)');
        })
        .on('click', (e, d) => {
          EventBus.emit('file:open', { path: d.id });
        });

      simulation.on('tick', () => {
        linkSel
          .attr('x1', d => d.source.x).attr('y1', d => d.source.y)
          .attr('x2', d => d.target.x).attr('y2', d => d.target.y);
        nodeG.attr('transform', d => `translate(${d.x},${d.y})`);
      });

      // Update stats
      document.getElementById('g-nodes').textContent   = allNodes.length;
      document.getElementById('g-links').textContent   = allLinks.length;
      document.getElementById('g-clusters').textContent = folders.length;

      // Search
      document.getElementById('graph-search').addEventListener('input', e => {
        searchQuery = e.target.value.toLowerCase();
        nodeG.style('opacity', d =>
          !searchQuery || d.name.toLowerCase().includes(searchQuery) ? 1 : 0.15);
      });

      // Orphans toggle
      document.getElementById('graph-show-orphans').addEventListener('change', e => {
        showOrphans = e.target.checked;
        updateVisibility();
      });

      const updateVisibility = () => {
        nodeG.style('display', d => {
          if (hiddenFolders.has(d.folder)) return 'none';
          if (!showOrphans && d.inDegree === 0 && !allLinks.some(l => l.source.id === d.id)) return 'none';
          return null;
        });
      };

      // Controls
      const btn = (id, fn) => document.getElementById(id)?.addEventListener('click', fn);
      btn('g-zoom-in',  () => svg.transition().call(zoomBehavior.scaleBy, 1.4));
      btn('g-zoom-out', () => svg.transition().call(zoomBehavior.scaleBy, 0.7));
      btn('g-reset',    () => svg.transition().call(zoomBehavior.transform, d3.zoomIdentity));
      btn('g-refresh',  () => buildAndRender());

      // Center graph initially
      svg.call(zoomBehavior.transform, d3.zoomIdentity.translate(W/4, H/4).scale(0.9));
    };

    const nodeRadius = d => Math.max(6, Math.min(18, 6 + d.inDegree * 2));

    // FS change → rebuild
    const onChange = () => buildAndRender();
    EventBus.on('fs:change', onChange);

    // Window resize
    const ro = new ResizeObserver(() => { if (simulation) simulation.alpha(0.1).restart(); });
    ro.observe(container);

    buildAndRender();
  }
};
