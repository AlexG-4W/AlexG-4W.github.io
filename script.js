const canvas = document.getElementById('pcb-canvas');
const ctx = canvas.getContext('2d');

let width, height;
let nodes = [];
let edges = [];
let electrons = [];

const config = {
    gridSize: 30, // Pixel size of the grid steps
    electronCount: 80,
    electronSpeed: 0.3, // Reduced speed for ambient effect
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

function initNetwork() {
    nodes = [];
    edges = [];
    electrons = [];
    
    let cols = Math.floor(width / config.gridSize);
    let rows = Math.floor(height / config.gridSize);
    
    let numTraces = Math.floor((width * height) / 20000); // Responsive trace density
    
    // Valid 45 and 90 degree movements on a grid
    const dirs = [
        {dx: 1, dy: 0}, {dx: 1, dy: 1}, {dx: 0, dy: 1}, {dx: -1, dy: 1},
        {dx: -1, dy: 0}, {dx: -1, dy: -1}, {dx: 0, dy: -1}, {dx: 1, dy: -1}
    ];
    
    let pointMap = new Map();
    const getKey = (x, y) => `${x},${y}`;
    
    function addNode(x, y, isPad) {
        let key = getKey(x, y);
        if (!pointMap.has(key)) {
            let node = { x, y, neighbors: [], isPad };
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
            edges.push({a: n1, b: n2});
        }
    }

    // Generate PCB traces
    for (let i = 0; i < numTraces; i++) {
        let x = Math.floor(Math.random() * cols);
        let y = Math.floor(Math.random() * rows);
        let dirIdx = Math.floor(Math.random() * 8);
        
        let length = Math.floor(Math.random() * 8) + 4; // Trace length in grid units
        let prevNode = addNode(x * config.gridSize, y * config.gridSize, true); // Root is always a pad
        
        for (let j = 0; j < length; j++) {
            // 30% chance to change direction by 45 degrees
            if (Math.random() < 0.3) {
                dirIdx = (dirIdx + (Math.random() > 0.5 ? 1 : -1) + 8) % 8;
            }
            
            x += dirs[dirIdx].dx;
            y += dirs[dirIdx].dy;
            
            if (x < 0 || x > cols || y < 0 || y > rows) break;
            
            // Nodes along the path, slight chance for intermediate pad, always pad at end
            let isPad = (j === length - 1) || (Math.random() < 0.15);
            let currNode = addNode(x * config.gridSize, y * config.gridSize, isPad);
            addEdge(prevNode, currNode);
            prevNode = currNode;
        }
    }
    
    // Spawn electrons on valid paths
    let validNodes = nodes.filter(n => n.neighbors.length > 0);
    for (let i = 0; i < config.electronCount; i++) {
        if (validNodes.length === 0) break;
        let startNode = validNodes[Math.floor(Math.random() * validNodes.length)];
        let targetNode = startNode.neighbors[Math.floor(Math.random() * startNode.neighbors.length)];
        
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
    
    // Draw copper traces
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = config.traceColor;
    
    // Volumetric shadow effect
    ctx.shadowBlur = 5;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;

    ctx.beginPath();
    for (let edge of edges) {
        ctx.moveTo(edge.a.x, edge.a.y);
        ctx.lineTo(edge.b.x, edge.b.y);
    }
    ctx.stroke();
    
    // Reset shadows for next elements
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    
    // Draw vias/pads with 3D appearance
    for (let node of nodes) {
        if (node.isPad) {
            let gradient = ctx.createRadialGradient(node.x - 1, node.y - 1, 0, node.x, node.y, 3.5);
            gradient.addColorStop(0, 'rgba(120, 140, 155, 0.7)'); // Lighter center for highlight
            gradient.addColorStop(1, config.padColor);
            
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(node.x, node.y, 3.5, 0, Math.PI * 2);
            ctx.fill();
            
            // Subtle edge stroke for depth
            ctx.strokeStyle = 'rgba(20, 30, 40, 0.6)';
            ctx.lineWidth = 0.5;
            ctx.stroke();
        }
    }
    
    // Update and draw traveling electrons
    for (let e of electrons) {
        let dx = e.target.x - e.source.x;
        let dy = e.target.y - e.source.y;
        let dist = Math.sqrt(dx*dx + dy*dy);
        
        if (dist === 0) {
            e.progress = 1;
        } else {
            e.progress += e.speed / dist;
        }
        
        // Target reached
        if (e.progress >= 1) {
            let temp = e.source;
            e.source = e.target;
            e.x = e.source.x;
            e.y = e.source.y;
            e.progress = 0;
            
            if (e.source.neighbors.length > 0) {
                // Prevent immediate U-turns unless it's a dead end
                let possible = e.source.neighbors;
                if (possible.length > 1) {
                    possible = possible.filter(n => n !== temp); 
                }
                if (possible.length === 0) possible = e.source.neighbors;
                
                e.target = possible[Math.floor(Math.random() * possible.length)];
            }
        } else {
            e.x = e.source.x + dx * e.progress;
            e.y = e.source.y + dy * e.progress;
        }
        
        // Render electron
        ctx.fillStyle = config.electronColor;
        ctx.shadowBlur = 12;
        ctx.shadowColor = config.electronColor;
        ctx.beginPath();
        ctx.arc(e.x, e.y, 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0; // Reset shadow for next draw operations
    }
    
    requestAnimationFrame(draw);
}

window.addEventListener('resize', resize);

// Initial setup
resize();
draw();

// --- 3D Cabinet & Filtering Logic ---
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
        category: "Windows Software",
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
        category: "Windows Software",
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
        title: "HFDM-THERMAL-SOLVER",
        category: "Simulators",
        badges: "Python / C++",
        desc: "A high-performance 2D Finite Difference Method (FDM) Thermal Solver designed to simulate transient and steady-state temperature distributions on Printed Circuit Boards (PCBs).",
        link: "https://github.com/AlexG-4W/HFDM-THERMAL-SOLVER",
        repo: "HFDM-THERMAL-SOLVER"
    },
    {
        title: "WMN-TOPOLOGY-METRIC-SIMULATOR",
        category: "Simulators",
        badges: "Python / NetworkX / Matplotlib",
        desc: "A specialized simulator for Wireless Mesh Networks (WMN) designed to evaluate routing metrics (ETX, ETT, etc.) across various network topologies.",
        link: "https://github.com/AlexG-4W/WMN-Topology-Metric-Simulator",     
        repo: "WMN-Topology-Metric-Simulator"
    }
    ];
const cabinet = document.getElementById('cabinet');
const filterBtns = document.querySelectorAll('.filter-btn');

function renderProjects(filter = "All") {
    cabinet.innerHTML = '';
    
    if (filter === "All") {
        cabinet.className = 'grid-container';
        projectsData.forEach((proj) => {
            const card = document.createElement('div');
            card.className = 'card';
            card.innerHTML = `
                <h4>${proj.title}</h4>
                <span class="badge lang-python">${proj.badges}</span>
                <p>${proj.desc}</p>
                <a href="${proj.link}" target="_blank" class="btn">View on GitHub</a>
            `;
            cabinet.appendChild(card);
        });
    } else {
        cabinet.className = 'cabinet';
        projectsData.forEach((proj, index) => {
            if (proj.category !== filter) return;
            
            const folder = document.createElement('div');
            folder.className = 'folder';
            folder.dataset.repo = proj.repo;
            folder.dataset.index = index;
            folder.innerHTML = `
                <div class="folder-back"></div>
                <div class="folder-inside">
                    <button class="close-btn" style="display: none;">Close</button>
                    <div class="readme-content">
                        <div class="loading-spinner" style="display: none;">Loading...</div>
                        <div class="content-body"></div>
                    </div>
                </div>
                <div class="folder-front">
                    <h4>${proj.title}</h4>
                    <span class="badge lang-python">${proj.badges}</span>
                    <p>${proj.desc}</p>
                    <a href="${proj.link}" target="_blank" class="btn">View on GitHub</a>
                </div>
            `;
            cabinet.appendChild(folder);
        });
        attachFolderEvents();
    }
}

function attachFolderEvents() {
    const folders = document.querySelectorAll('.folder');
    
    folders.forEach(folder => {
        const link = folder.querySelector('a.btn');
        if (link) {
            link.addEventListener('click', (e) => e.stopPropagation());
        }

        folder.addEventListener('click', function(e) {
            if (this.classList.contains('active')) return;
            
            folders.forEach(f => {
                if (f !== this) {
                    f.classList.remove('active');
                    f.classList.add('inactive');
                    const cb = f.querySelector('.close-btn');
                    if(cb) cb.style.display = 'none';
                }
            });
            
            this.classList.remove('inactive');
            this.classList.add('active');
            
            const closeBtn = this.querySelector('.close-btn');
            closeBtn.style.display = 'block';
            
            closeBtn.onclick = (ev) => {
                ev.stopPropagation();
                this.classList.remove('active');
                closeBtn.style.display = 'none';
                folders.forEach(f => {
                    f.classList.remove('inactive');
                });
            };
            
            const repo = this.dataset.repo;
            const contentBody = this.querySelector('.content-body');
            const spinner = this.querySelector('.loading-spinner');
            
            if (!contentBody.innerHTML.trim()) {
                spinner.style.display = 'flex';
                fetch(`https://api.github.com/repos/AlexG-4W/${repo}/readme`, {
                    headers: { "Accept": "application/vnd.github.html" }
                })
                .then(res => {
                    if (!res.ok) throw new Error("README not found");
                    return res.text();
                })
                .then(html => {
                    contentBody.innerHTML = html;
                })
                .catch(err => {
                    contentBody.innerHTML = '<p>Failed to load README. It might not exist.</p>';
                })
                .finally(() => {
                    spinner.style.display = 'none';
                });
            }
        });
    });
}

filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        filterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        renderProjects(btn.dataset.filter);
    });
});


// --- Modal Close Enhancements ---
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        const activeFolder = document.querySelector('.folder.active');
        if (activeFolder) {
            const closeBtn = activeFolder.querySelector('.close-btn');
            if (closeBtn) closeBtn.click();
        }
    }
});

document.addEventListener('click', (e) => {
    const activeFolder = document.querySelector('.folder.active');
    if (activeFolder && !activeFolder.contains(e.target)) {
        const closeBtn = activeFolder.querySelector('.close-btn');
        if (closeBtn) closeBtn.click();
    }
});

document.addEventListener('DOMContentLoaded', () => {
    renderProjects();
});





