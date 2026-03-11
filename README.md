# AlexG-4W.github.io
# Alex Glasov - Personal Portfolio Website

![HTML5](https://img.shields.io/badge/html5-%23E34F26.svg?style=for-the-badge&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/css3-%231572B6.svg?style=for-the-badge&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/javascript-%23323330.svg?style=for-the-badge&logo=javascript&logoColor=%23F7DF1E)
![GitHub Pages](https://img.shields.io/badge/github%20pages-121013?style=for-the-badge&logo=github&logoColor=white)

**Live Website:** [https://AlexG-4W.github.io/](https://AlexG-4W.github.io/)

---

## 👨‍💻 About

This repository contains the source code for my personal portfolio website. As an **Electrical & Electronics Engineer & Software Developer**, I focus on bridging the gap between hardware and software. My expertise spans Python development, PCB diagnostics, and industrial automation. This portfolio serves as a central hub for my open-source contributions and technical projects.

## ⚙️ Under the Hood (Technical Details)

This website was built from the ground up to be lightweight, performant, and completely dependency-free.

*   **Architecture:** 100% static site. No frontend frameworks (React, Vue, etc.), no build steps, and zero external dependencies.
*   **Styling:** Custom CSS utilizing native CSS variables, Flexbox, and CSS Grid to ensure full responsiveness across all mobile and desktop devices. The UI employs a "Glassmorphism" aesthetic with a deep dark theme.
*   **The PCB Canvas Animation:** The background features a custom-written HTML5 `<canvas>` animation.
    *   **Algorithmic Routing:** The JavaScript logic procedurally generates a Printed Circuit Board (PCB) schematic. Crucially, the pathfinding algorithm enforces strict 45-degree and 90-degree routing constraints to accurately mimic real-world hardware design.
    *   **Volumetric Rendering:** The traces and vias utilize radial gradients and drop shadows (`ctx.shadowBlur`, `ctx.shadowColor`) to create a subtle, 3D volumetric appearance.
    *   **Ambient Animation:** Glowing "electrons" traverse these valid paths. The animation loop is optimized using `requestAnimationFrame` and dynamically recalculates the grid and routing upon window resize events to maintain a smooth 60fps ambient effect without distracting from the core content.
