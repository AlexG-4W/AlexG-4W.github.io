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