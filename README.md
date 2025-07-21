# Interactive Flip Graph Visualizer

This project is a web-based tool for **visualizing and exploring plane almost perfect matchings and flip graphs**, developed as part of a bachelor thesis in computer science at Malmö University (2025).

The tool allows users to create matchings manually or automatically, perform flip operations, and inspect transformations between different configurations through an interactive graphical interface.

## 🧩 Features

- Manual and automatic creation of matchings  
- Flip operations between matchings  
- Canonical matching rendering  
- Zoom and pan support  
- Matching statistics (segment count, average distance, etc.)  
- Undo/Redo and editing  
- Export and import in CSV, JSON, and TXT formats  
- Flip graph generation and export  
- Tooltips and toast notifications for better usability

## 🔧 Technologies

Built with:

- [Next.js](https://nextjs.org/) (React framework)
- [TypeScript](https://www.typescriptlang.org/)
- [Konva.js](https://konvajs.org/) for 2D canvas rendering
- [Tailwind CSS](https://tailwindcss.com/) for styling
- [React Hot Toast](https://react-hot-toast.com/) and [React Tooltip](https://github.com/ReactTooltip/react-tooltip) for UI feedback

## 🚀 Getting Started

To run the project locally:

1. **Clone the repository:**

   ```bash
   git clone https://github.com/your-username/flipgraph-visualizer.git
   cd flipgraph-visualizer
   ```

2. **Install dependencies:**

   ```bash
   npm install
   # or
   yarn
   ```

3. **Start the development server:**

   ```bash
   npm run dev
   ```

4. Open your browser at [http://localhost:3000](http://localhost:3000) to use the tool.

## 📁 Project Structure

- `/components` – React components for the UI (Canvas, Sidebar, Header, etc.)
- `/utils` – Utility functions for geometry, flipping logic, and graph generation
- `/types` – TypeScript interfaces and type definitions
- `/public` – Static assets

## 📄 Thesis Reference

This project was developed as part of the thesis:  
**“Interactive Tool for Visualization of Edge Flips”**  
Malmö University, 2025

Authors: Tim Do & Anders Dahlheim  
Supervisor: Anna Brötzner  
👉 [Read the full thesis on DiVA](https://mau.diva-portal.org/smash/record.jsf?pid=diva2%3A1963912)

## 📦 Export Options

The tool supports exporting matchings and flip graphs in the following formats:

- `.csv` – segment data with coordinates
- `.json` – structured object representations
- `.txt` – readable segment listings
- Pretty TXT and named CSV for human-readable formats

## 🧪 Feedback and Contributions

This project was created for educational purposes and is not actively maintained. However, feel free to fork it or submit issues if you find bugs or want to build upon it.
