'use strict';

(function () {
    // ==========================================
    // Canvas Animation — PCB Traces & Electrons
    // ==========================================
    const canvas = document.getElementById('pcb-canvas');
    const ctx = canvas.getContext('2d');

    let width, height;
    let nodes = [];
    let edges = [];
    let electrons = [];
    let animationId = null;

    const isMobile = window.matchMedia('(max-width: 768px)').matches;

    const config = {
        gridSize: 30,
        electronCount: isMobile ? 40 : 80,
        electronSpeed: 0.3,
        traceColor: 'rgba(40, 55, 65, 0.25)',
        padColor: 'rgba(50, 70, 85, 0.4)',
        glowColor: 'rgba(0, 200, 255, 0.4)',
        electronColor: 'rgba(40, 220, 40, 0.6)',
    };

    function resize() {
        width = window.innerWidth;
        height = window.innerHeight;
        canvas.width = width;
        canvas.height = height;
        initNetwork();
    }

    // Debounced resize — avoids recalculating on every pixel
    let resizeTimer;
    window.addEventListener('resize', function () {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(resize, 250);
    });

    function initNetwork() {
        nodes = [];
        edges = [];
        electrons = [];

        const cols = Math.floor(width / config.gridSize);
        const rows = Math.floor(height / config.gridSize);
        const numTraces = Math.floor((width * height) / 20000);

        const dirs = [
            { dx: 1, dy: 0 }, { dx: 1, dy: 1 }, { dx: 0, dy: 1 }, { dx: -1, dy: 1 },
            { dx: -1, dy: 0 }, { dx: -1, dy: -1 }, { dx: 0, dy: -1 }, { dx: 1, dy: -1 }
        ];

        const pointMap = new Map();
        const getKey = function (x, y) { return x + ',' + y; };

        function addNode(x, y, isPad) {
            const key = getKey(x, y);
            if (!pointMap.has(key)) {
                const node = { x: x, y: y, neighbors: [], isPad: isPad };
                nodes.push(node);
                pointMap.set(key, node);
            } else if (isPad) {
                pointMap.get(key).isPad = true;
            }
            return pointMap.get(key);
        }

        function addEdge(n1, n2) {
            if (!n1.neighbors.includes(n2)) {
                n1.neighbors.push(n2);
                n2.neighbors.push(n1);
                edges.push({ a: n1, b: n2 });
            }
        }

        for (let i = 0; i < numTraces; i++) {
            let x = Math.floor(Math.random() * cols);
            let y = Math.floor(Math.random() * rows);
            let dirIdx = Math.floor(Math.random() * 8);
            const length = Math.floor(Math.random() * 8) + 4;
            let prevNode = addNode(x * config.gridSize, y * config.gridSize, true);

            for (let j = 0; j < length; j++) {
                if (Math.random() < 0.3) {
                    dirIdx = (dirIdx + (Math.random() > 0.5 ? 1 : -1) + 8) % 8;
                }
                x += dirs[dirIdx].dx;
                y += dirs[dirIdx].dy;
                if (x < 0 || x > cols || y < 0 || y > rows) break;
                const isPad = (j === length - 1) || (Math.random() < 0.15);
                const currNode = addNode(x * config.gridSize, y * config.gridSize, isPad);
                addEdge(prevNode, currNode);
                prevNode = currNode;
            }
        }

        const validNodes = nodes.filter(function (n) { return n.neighbors.length > 0; });
        for (let i = 0; i < config.electronCount; i++) {
            if (validNodes.length === 0) break;
            const startNode = validNodes[Math.floor(Math.random() * validNodes.length)];
            const targetNode = startNode.neighbors[Math.floor(Math.random() * startNode.neighbors.length)];
            electrons.push({
                x: startNode.x,
                y: startNode.y,
                source: startNode,
                target: targetNode,
                progress: 0,
                speed: config.electronSpeed * (0.8 + Math.random() * 0.6)
            });
        }
    }

    function draw() {
        ctx.clearRect(0, 0, width, height);
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = config.traceColor;
        ctx.shadowBlur = 5;
        ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;
        ctx.beginPath();
        for (let i = 0; i < edges.length; i++) {
            ctx.moveTo(edges[i].a.x, edges[i].a.y);
            ctx.lineTo(edges[i].b.x, edges[i].b.y);
        }
        ctx.stroke();

        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;

        for (let i = 0; i < nodes.length; i++) {
            const node = nodes[i];
            if (node.isPad) {
                const gradient = ctx.createRadialGradient(node.x - 1, node.y - 1, 0, node.x, node.y, 3.5);
                gradient.addColorStop(0, 'rgba(120, 140, 155, 0.7)');
                gradient.addColorStop(1, config.padColor);
                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.arc(node.x, node.y, 3.5, 0, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = 'rgba(20, 30, 40, 0.6)';
                ctx.lineWidth = 0.5;
                ctx.stroke();
            }
        }

        for (let i = 0; i < electrons.length; i++) {
            const e = electrons[i];
            const dx = e.target.x - e.source.x;
            const dy = e.target.y - e.source.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist === 0) {
                e.progress = 1;
            } else {
                e.progress += e.speed / dist;
            }
            if (e.progress >= 1) {
                const temp = e.source;
                e.source = e.target;
                e.x = e.source.x;
                e.y = e.source.y;
                e.progress = 0;
                if (e.source.neighbors.length > 0) {
                    let possible = e.source.neighbors;
                    if (possible.length > 1) {
                        possible = possible.filter(function (n) { return n !== temp; });
                    }
                    if (possible.length === 0) possible = e.source.neighbors;
                    e.target = possible[Math.floor(Math.random() * possible.length)];
                }
            } else {
                e.x = e.source.x + dx * e.progress;
                e.y = e.source.y + dy * e.progress;
            }
            ctx.fillStyle = config.electronColor;
            ctx.shadowBlur = 12;
            ctx.shadowColor = config.electronColor;
            ctx.beginPath();
            ctx.arc(e.x, e.y, 2.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
        }

        animationId = requestAnimationFrame(draw);
    }

    // Page Visibility API — pause canvas when tab is hidden
    document.addEventListener('visibilitychange', function () {
        if (document.hidden) {
            if (animationId) {
                cancelAnimationFrame(animationId);
                animationId = null;
            }
        } else {
            if (!animationId) {
                animationId = requestAnimationFrame(draw);
            }
        }
    });

    resize();
    animationId = requestAnimationFrame(draw);

    // ==========================================
    // Project Data
    // ==========================================
    const projectsData = [
        {
            title: "AUTONOMOUS-ENGINEERING-COPILOT",
            category: "AI / Neural Networks",
            badges: "Python / PySide6 / LLM",
            desc: "A cross-platform local AI assistant for engineers, featuring RAG-based document Q&A and infrastructure-independent inference.",
            link: "https://github.com/AlexG-4W/autonomous-engineering-copilot",
            repo: "autonomous-engineering-copilot"
        },
        {
            title: "HMON-OVERLAY",
            category: "Windows Software",
            badges: "Windows / C++ / Python",
            desc: "Transparent hardware monitoring overlay for Windows (CPU, RAM, GPU).",
            link: "https://github.com/AlexG-4W/HMON-OVERLAY",
            repo: "HMON-OVERLAY"
        },
        {
            title: "WEFREE",
            category: "Networks",
            badges: "Python",
            desc: "Portable Secure File Server.",
            link: "https://github.com/AlexG-4W/WEFREE",
            repo: "WEFREE"
        },
        {
            title: "HOTSPOT-MANAGER",
            category: "Windows Software",
            badges: "Windows",
            desc: "A lightweight, modern desktop utility designed to manage the built-in Mobile Hotspot functionality in Windows 11.",
            link: "https://github.com/AlexG-4W/HOTSPOT-MANAGER",
            repo: "HOTSPOT-MANAGER"
        },
        {
            title: "HFPS",
            category: "Windows Software",
            badges: "Windows",
            desc: "Minimalist Hardware Overlay (NVIDIA).",
            link: "https://github.com/AlexG-4W/HFPS",
            repo: "HFPS"
        },
        {
            title: "SECUREMESSENGER-BOLTC",
            category: "Networks",
            badges: "Python / PyQt6",
            desc: "End-to-end encrypted messenger built with Python and PyQt6.",
            link: "https://github.com/AlexG-4W/SECUREMESSENGER-BOLTC",
            repo: "SECUREMESSENGER-BOLTC"
        },
        {
            title: "MOUSE-MONITOR-PRO",
            category: "Windows Software",
            badges: "Windows",
            desc: "A high-performance Windows utility designed for gamers, developers, and hardware enthusiasts to analyze mouse sensor behavior and cursor precision in real-time.",
            link: "https://github.com/AlexG-4W/MOUSE-MONITOR-PRO",
            repo: "MOUSE-MONITOR-PRO"
        },
        {
            title: "WINANCHOR",
            category: "System Utilities",
            badges: "Windows / Python",
            desc: "A lightweight Windows utility to save and restore multi-monitor window layouts with a 4-slot profile system, global hotkeys, and automatic display-change detection.",
            link: "https://github.com/AlexG-4W/WinAnchor",
            repo: "WinAnchor"
        },
        {
            title: "DISPEX",
            category: "System Utilities",
            badges: "Windows 11 / C# 12 / .NET 8 / WinUI 3",
            desc: "A driver-level display profile manager for Windows 11. Replaces the volatile Win+P menu with a deterministic, hardware-keyed configuration engine built on the CCD API and EDID correlation.",
            link: "https://github.com/AlexG-4W/DispEx",
            repo: "DispEx"
        },
        {
            title: "HFDM-THERMAL-SOLVER",
            category: "Simulators",
            badges: "Python / C++",
            desc: "A high-performance 2D Finite Difference Method (FDM) Thermal Solver designed to simulate transient and steady-state temperature distributions on Printed Circuit Boards (PCBs).",
            link: "https://github.com/AlexG-4W/HFDM-THERMAL-SOLVER",
            repo: "HFDM-THERMAL-SOLVER"
        },
        {
            title: "WMN-TOPOLOGY-METRIC-SIMULATOR",
            category: "Networks",
            badges: "Python / NetworkX / Matplotlib",
            desc: "A specialized simulator for Wireless Mesh Networks (WMN) designed to evaluate routing metrics (ETX, ETT, etc.) across various network topologies.",
            link: "https://github.com/AlexG-4W/WMN-Topology-Metric-Simulator",
            repo: "WMN-Topology-Metric-Simulator"
        }
    ];

    // ==========================================
    // DOM References & README Cache
    // ==========================================
    const cabinet = document.getElementById('cabinet');
    const filterBtns = document.querySelectorAll('.filter-btn');
    const readmeCache = new Map();

    // ==========================================
    // Safe DOM helpers — avoid innerHTML for XSS
    // ==========================================
    function createEl(tag, attrs, children) {
        const el = document.createElement(tag);
        if (attrs) {
            Object.keys(attrs).forEach(function (key) {
                if (key === 'textContent') {
                    el.textContent = attrs[key];
                } else if (key === 'className') {
                    el.className = attrs[key];
                } else if (key.startsWith('data-')) {
                    el.setAttribute(key, attrs[key]);
                } else {
                    el.setAttribute(key, attrs[key]);
                }
            });
        }
        if (children) {
            children.forEach(function (child) {
                if (typeof child === 'string') {
                    el.appendChild(document.createTextNode(child));
                } else if (child) {
                    el.appendChild(child);
                }
            });
        }
        return el;
    }

    // ==========================================
    // Render Projects
    // ==========================================
    function renderProjects(filter) {
        filter = filter || 'All';
        cabinet.innerHTML = '';

        if (filter === 'All') {
            cabinet.className = 'grid-container';
            projectsData.forEach(function (proj) {
                // Build card safely with createElement
                const heading = createEl('h3', { textContent: proj.title });
                const badge = createEl('div', { className: 'badge', textContent: proj.badges });
                const desc = createEl('p', { textContent: proj.desc });
                const link = createEl('a', {
                    href: proj.link,
                    target: '_blank',
                    rel: 'noopener noreferrer',
                    className: 'btn',
                    textContent: 'View on GitHub',
                    'aria-label': 'View ' + proj.title + ' on GitHub'
                });
                link.addEventListener('click', function (e) { e.stopPropagation(); });

                const card = createEl('div', { className: 'card' }, [heading, badge, desc, link]);
                cabinet.appendChild(card);
            });
        } else {
            cabinet.className = 'cabinet';
            projectsData.forEach(function (proj, index) {
                if (proj.category !== filter) return;

                // folder-back
                const folderBack = createEl('div', { className: 'folder-back' });

                // folder-inside controls
                const ghBtnInside = createEl('a', {
                    href: proj.link,
                    target: '_blank',
                    rel: 'noopener noreferrer',
                    className: 'github-btn-inside',
                    textContent: 'View on GitHub',
                    'aria-label': 'View ' + proj.title + ' on GitHub'
                });
                ghBtnInside.addEventListener('click', function (e) { e.stopPropagation(); });

                const closeBtn = createEl('button', { className: 'close-btn', textContent: 'Close' });
                const controls = createEl('div', { className: 'folder-controls' }, [ghBtnInside, closeBtn]);
                controls.style.display = 'none';

                // readme content
                const spinner = createEl('div', { className: 'loading-spinner', textContent: 'Loading...' });
                spinner.style.display = 'none';
                const contentBody = createEl('div', { className: 'content-body' });
                const readmeContent = createEl('div', { className: 'readme-content' }, [spinner, contentBody]);

                const folderInside = createEl('div', { className: 'folder-inside' }, [controls, readmeContent]);

                // folder-front
                const frontHeading = createEl('h3', { textContent: proj.title });
                const frontBadge = createEl('div', { className: 'badge', textContent: proj.badges });
                const frontDesc = createEl('p', { textContent: proj.desc });
                const folderFront = createEl('div', { className: 'folder-front' }, [frontHeading, frontBadge, frontDesc]);

                // folder wrapper
                const folder = createEl('div', {
                    className: 'folder',
                    'data-repo': proj.repo,
                    'data-index': String(index),
                    tabindex: '0',
                    role: 'button',
                    'aria-label': 'Open ' + proj.title + ' project details'
                }, [folderBack, folderInside, folderFront]);

                cabinet.appendChild(folder);
            });
            attachFolderEvents();
        }
    }

    // ==========================================
    // Folder Click Handling
    // ==========================================
    function attachFolderEvents() {
        const folders = document.querySelectorAll('.folder');
        folders.forEach(function (folder) {
            function openFolder(e) {
                if (folder.classList.contains('active')) return;

                folders.forEach(function (f) {
                    if (f !== folder) {
                        f.classList.remove('active');
                        f.classList.add('inactive');
                        const ctrl = f.querySelector('.folder-controls');
                        if (ctrl) ctrl.style.display = 'none';
                    }
                });

                folder.classList.remove('inactive');
                folder.classList.add('active');
                document.body.classList.add('modal-open');
                const controls = folder.querySelector('.folder-controls');
                if (controls) controls.style.display = 'flex';

                const closeBtn = folder.querySelector('.close-btn');
                if (closeBtn) {
                    closeBtn.onclick = function (ev) {
                        ev.stopPropagation();
                        folder.classList.remove('active');
                        document.body.classList.remove('modal-open');
                        if (controls) controls.style.display = 'none';
                        folders.forEach(function (f) { f.classList.remove('inactive'); });
                    };
                }

                const repo = folder.dataset.repo;
                const contentBody = folder.querySelector('.content-body');
                const spinner = folder.querySelector('.loading-spinner');

                // Check cache first, then fetch
                if (readmeCache.has(repo)) {
                    contentBody.innerHTML = readmeCache.get(repo);
                } else if (!contentBody.innerHTML.trim()) {
                    spinner.style.display = 'flex';
                    fetch('https://api.github.com/repos/AlexG-4W/' + repo + '/readme', {
                        headers: { 'Accept': 'application/vnd.github.html' }
                    })
                    .then(function (res) {
                        if (res.status === 403) {
                            throw new Error('GitHub API rate limit exceeded. Please try again later.');
                        }
                        if (!res.ok) throw new Error('README not found');
                        return res.text();
                    })
                    .then(function (html) {
                        readmeCache.set(repo, html);
                        contentBody.innerHTML = html;
                    })
                    .catch(function (err) {
                        contentBody.innerHTML = '';
                        const errMsg = createEl('p', { textContent: err.message });
                        errMsg.style.color = '#ff5555';
                        contentBody.appendChild(errMsg);
                    })
                    .finally(function () {
                        spinner.style.display = 'none';
                    });
                }
            }

            folder.addEventListener('click', openFolder);
            // Keyboard accessibility — Enter / Space
            folder.addEventListener('keydown', function (e) {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    openFolder(e);
                }
            });
        });
    }

    // ==========================================
    // Global Event Listeners
    // ==========================================

    // Close modal on Escape
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
            const activeFolder = document.querySelector('.folder.active');
            if (activeFolder) {
                const closeBtn = activeFolder.querySelector('.close-btn');
                if (closeBtn) closeBtn.click();
            }
        }
    });

    // Close modal on outside click
    document.addEventListener('click', function (e) {
        const activeFolder = document.querySelector('.folder.active');
        if (activeFolder && !activeFolder.contains(e.target)) {
            const closeBtn = activeFolder.querySelector('.close-btn');
            if (closeBtn) closeBtn.click();
        }
    });

    // Filter buttons
    filterBtns.forEach(function (btn) {
        btn.addEventListener('click', function () {
            filterBtns.forEach(function (b) { b.classList.remove('active'); });
            btn.classList.add('active');
            renderProjects(btn.dataset.filter);
        });
    });

    // Initial render
    document.addEventListener('DOMContentLoaded', function () {
        renderProjects();
    });
})();
